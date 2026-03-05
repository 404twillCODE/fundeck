const express = require("express");
const http = require("http");
const path = require("path");
const next = require("next");
const { Server } = require("socket.io");
const { v4: uuidv4 } = require("uuid");

const {
  DEFAULT_GAME_ID,
  RECONNECT_GRACE_MS,
  ROOM_CREATION_GRACE_MS,
  generateRoomCode,
  sanitizeChatMessage,
  sanitizeName,
  isValidRoomCode,
  publicRoomSnapshot,
  buildLocalUrls,
} = require("./utils");
const { MemoryStore } = require("./persistence/memory-store");
const { SqliteStore } = require("./persistence/sqlite-store");
const { registerGame, getGame, getGames } = require("./games");
const { registerBlackjack } = require("./games/blackjack");

const PORT = Number(process.env.PORT || 5250);
const HOST = "0.0.0.0";
const NODE_ENV = process.env.NODE_ENV || "development";
const FORCE_SERVE_NEXT = process.argv.includes("--serve-next");
const IS_DEV = NODE_ENV !== "production" && !FORCE_SERVE_NEXT;
const NEXT_APP_DIR = process.env.NEXT_APP_DIR
  ? path.resolve(process.env.NEXT_APP_DIR)
  : path.resolve(__dirname, "..", "..", "join-website");

const JOIN_LIMIT_WINDOW_MS = 60 * 1000;
const JOIN_LIMIT_MAX = Number(process.env.JOIN_RATE_LIMIT_PER_IP || 20);

const ENABLE_SQLITE_PERSISTENCE = String(process.env.ENABLE_SQLITE_PERSISTENCE || "false").toLowerCase() === "true";
const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || path.resolve(process.cwd(), "game-server-data.sqlite");
const DEV_ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

function devLog(message, details) {
  if (!IS_DEV) return;
  if (details === undefined) {
    console.log(`[game-server:dev] ${message}`);
    return;
  }
  console.log(`[game-server:dev] ${message}`, details);
}

function createStore() {
  if (!ENABLE_SQLITE_PERSISTENCE) {
    return { store: new MemoryStore(), mode: "memory", sqliteAvailable: false };
  }

  try {
    const store = new SqliteStore({ dbPath: SQLITE_DB_PATH });
    return { store, mode: `sqlite:${SQLITE_DB_PATH}`, sqliteAvailable: true };
  } catch (error) {
    console.error("[persistence] SQLite unavailable, falling back to memory:", error.message);
    return { store: new MemoryStore(), mode: "memory", sqliteAvailable: false };
  }
}

function nowIso() {
  return new Date().toISOString();
}

function createPlayer(name, socket, reconnectToken, balance = 1000) {
  return {
    playerId: uuidv4(),
    name,
    reconnectToken,
    connected: true,
    ready: false,
    joinedAt: nowIso(),
    lastSeenAt: Date.now(),
    socketId: socket.id,
    balance: Number.isFinite(balance) ? balance : 1000,
    cards: [],
    bet: 0,
    status: null,
    score: 0,
  };
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function resolveUniquePlayerName(room, requestedName, excludePlayerId = null) {
  const baseName = sanitizeName(requestedName) || "Player";
  const normalizedBase = baseName.toLowerCase();
  const existingNames = new Set(
    room.players
      .filter((player) => player.playerId !== excludePlayerId)
      .map((player) => String(player.name || "").toLowerCase()),
  );

  if (!existingNames.has(normalizedBase)) {
    return baseName;
  }

  for (let index = 2; index < 1000; index += 1) {
    const candidate = sanitizeName(`${baseName} ${index}`);
    if (!candidate) continue;
    if (!existingNames.has(candidate.toLowerCase())) {
      return candidate;
    }
  }

  return sanitizeName(`${baseName}-${Math.floor(Math.random() * 900 + 100)}`) || "Player";
}

async function bootstrap() {
  registerBlackjack(registerGame);

  const { store, mode, sqliteAvailable } = createStore();
  const rooms = new Map();
  const joinAttempts = new Map();

  store.loadRooms().forEach((room) => {
    if (room && room.roomCode) {
      rooms.set(room.roomCode, room);
    }
  });

  const expressApp = express();
  expressApp.set("trust proxy", true);

  expressApp.use((req, res, nextMiddleware) => {
    if (!IS_DEV) {
      nextMiddleware();
      return;
    }

    const origin = String(req.headers.origin || "");
    if (origin && DEV_ALLOWED_ORIGINS.has(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }

    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }

    nextMiddleware();
  });

  expressApp.use(express.json({ limit: "200kb" }));

  expressApp.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      mode,
      rooms: rooms.size,
      games: getGames(),
      sqliteAvailable: !!sqliteAvailable,
    });
  });

  expressApp.get("/api/network-info", (_req, res) => {
    const urls = buildLocalUrls(PORT);
    res.json({
      port: PORT,
      localUrl: urls.localUrl,
      lanUrl: urls.lanUrl,
      publicUrl: urls.publicUrl,
    });
  });

  expressApp.get("/api/games", (_req, res) => {
    res.json({ games: getGames() });
  });

  function isRequestFromLocalhost(req) {
    const ip = String(req.ip || req.connection?.remoteAddress || "").toLowerCase();
    return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  }

  function requireLocalhost(req, res) {
    if (!isRequestFromLocalhost(req)) {
      res.status(403).json({ error: "Host admin endpoints are only accessible from localhost." });
      return false;
    }
    return true;
  }

  expressApp.get("/api/host/rooms", (req, res) => {
    if (!requireLocalhost(req, res)) return;
    const result = [];
    rooms.forEach((room) => {
      result.push({
        roomCode: room.roomCode,
        gameId: room.gameId,
        phase: room.phase,
        hostPlayerId: room.hostPlayerId,
        createdAt: room.createdAt,
        players: room.players.map((p) => ({
          playerId: p.playerId,
          name: p.name,
          connected: p.connected,
          balance: p.balance,
          ready: p.ready,
          status: p.status,
        })),
      });
    });
    res.json({ rooms: result });
  });

  expressApp.post("/api/host/kick", express.json(), (req, res) => {
    if (!requireLocalhost(req, res)) return;
    const { roomCode, playerId } = req.body || {};
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room) { res.status(404).json({ error: "Room not found" }); return; }
    const playerIndex = room.players.findIndex((p) => p.playerId === playerId);
    if (playerIndex === -1) { res.status(404).json({ error: "Player not found" }); return; }
    const player = room.players[playerIndex];
    if (player.socketId) {
      const targetSocket = io.sockets.sockets.get(player.socketId);
      if (targetSocket) {
        targetSocket.emit("error", { message: "You have been kicked by the host." });
        targetSocket.data.roomCode = null;
        targetSocket.data.playerId = null;
        targetSocket.leave(room.roomCode);
      }
    }
    room.players.splice(playerIndex, 1);
    if (!room.players.length) { destroyRoom(room.roomCode); res.json({ ok: true }); return; }
    if (room.hostPlayerId === playerId) { room.hostPlayerId = room.players[0].playerId; }
    persistRoom(room);
    emitRoomState(room.roomCode);
    res.json({ ok: true });
  });

  expressApp.post("/api/host/ban", express.json(), (req, res) => {
    if (!requireLocalhost(req, res)) return;
    const { roomCode, playerId } = req.body || {};
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room) { res.status(404).json({ error: "Room not found" }); return; }
    const playerIndex = room.players.findIndex((p) => p.playerId === playerId);
    if (playerIndex === -1) { res.status(404).json({ error: "Player not found" }); return; }
    const player = room.players[playerIndex];
    if (player.socketId) {
      const targetSocket = io.sockets.sockets.get(player.socketId);
      if (targetSocket) {
        targetSocket.emit("error", { message: "You have been banned by the host." });
        targetSocket.data.roomCode = null;
        targetSocket.data.playerId = null;
        targetSocket.leave(room.roomCode);
      }
    }
    room.players.splice(playerIndex, 1);
    if (!room.players.length) { destroyRoom(room.roomCode); res.json({ ok: true }); return; }
    if (room.hostPlayerId === playerId) { room.hostPlayerId = room.players[0].playerId; }
    persistRoom(room);
    emitRoomState(room.roomCode);
    res.json({ ok: true });
  });

  expressApp.post("/api/host/set-balance", express.json(), (req, res) => {
    if (!requireLocalhost(req, res)) return;
    const { roomCode, playerId, balance } = req.body || {};
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room) { res.status(404).json({ error: "Room not found" }); return; }
    const player = room.players.find((p) => p.playerId === playerId);
    if (!player) { res.status(404).json({ error: "Player not found" }); return; }
    const newBalance = Number(balance);
    if (!Number.isFinite(newBalance) || newBalance < 0) { res.status(400).json({ error: "Invalid balance" }); return; }
    player.balance = Math.floor(newBalance);
    persistRoom(room);
    emitRoomState(room.roomCode);
    res.json({ ok: true, balance: player.balance });
  });

  expressApp.post("/api/host/create-room", express.json(), (req, res) => {
    if (!requireLocalhost(req, res)) return;
    const { gameId } = req.body || {};
    const targetGameId = typeof gameId === "string" && getGame(gameId) ? gameId : DEFAULT_GAME_ID;
    const game = getGame(targetGameId);
    if (!game) { res.status(400).json({ error: "Unknown game" }); return; }
    const roomCode = generateRoomCode(rooms);
    const room = {
      roomCode,
      gameId: targetGameId,
      phase: "lobby",
      hostPlayerId: null,
      players: [],
      chat: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    if (typeof game.onRoomCreated === "function") { game.onRoomCreated(room); }
    rooms.set(roomCode, room);
    persistRoom(room);
    res.json({ roomCode, gameId: targetGameId });
  });

  expressApp.post("/api/host/start-game", express.json(), (req, res) => {
    if (!requireLocalhost(req, res)) return;
    const { roomCode } = req.body || {};
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room) { res.status(404).json({ error: "Room not found" }); return; }
    room.phase = "in_game";
    room.players.forEach((p) => { p.ready = false; });
    const game = getGame(room.gameId);
    if (game && typeof game.onGameStarted === "function") {
      game.onGameStarted({ io, room, helpers: gameHelpers });
    }
    persistRoom(room);
    emitRoomState(room.roomCode);
    res.json({ ok: true });
  });

  expressApp.post("/api/host/set-game", express.json(), (req, res) => {
    if (!requireLocalhost(req, res)) return;
    const { roomCode, gameId } = req.body || {};
    const room = rooms.get(String(roomCode || "").toUpperCase());
    if (!room) { res.status(404).json({ error: "Room not found" }); return; }
    if (room.phase !== "lobby") { res.status(400).json({ error: "Cannot change game after start" }); return; }
    const game = getGame(gameId);
    if (!game) { res.status(400).json({ error: "Unknown game" }); return; }
    room.gameId = gameId;
    if (typeof game.onRoomCreated === "function") { game.onRoomCreated(room); }
    persistRoom(room);
    emitRoomState(room.roomCode);
    res.json({ ok: true });
  });

  const server = http.createServer(expressApp);
  const io = new Server(server, {
    cors: {
      origin: IS_DEV ? [...DEV_ALLOWED_ORIGINS] : true,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  const persistRoom = (room) => {
    room.updatedAt = nowIso();
    store.saveRoom(room);
  };

  const destroyRoom = (roomCode) => {
    rooms.delete(roomCode);
    store.deleteRoom(roomCode);
  };

  const emitRoomState = (roomCode) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    room.players.forEach((player) => {
      if (!player.socketId) return;
      io.to(player.socketId).emit("room:state", publicRoomSnapshot(room, player.playerId));
    });

    devLog("room:state", {
      roomCode: room.roomCode,
      phase: room.phase,
      gameId: room.gameId,
      players: room.players.length,
      chat: room.chat.length,
    });
  };

  const roomAccessor = (socket) => {
    if (!socket.data.roomCode) return null;
    return rooms.get(socket.data.roomCode) || null;
  };

  const recordBlackjackRound = () => {};

  const gameHelpers = {
    emitRoomState,
    persistRoom,
    recordBlackjackRound,
  };

  getGames().forEach(({ id }) => {
    const game = getGame(id);
    if (game && typeof game.registerSocketHandlers === "function") {
      io.on("connection", (socket) => {
        game.registerSocketHandlers({
          io,
          socket,
          roomAccessor,
          helpers: gameHelpers,
        });
      });
    }
  });

  function getClientIp(socket) {
    return socket.handshake.headers["x-forwarded-for"]?.split(",")[0]?.trim() || socket.handshake.address || "unknown";
  }

  function isLocalIp(ip) {
    if (!ip) return false;
    const value = String(ip).toLowerCase();
    if (value === "127.0.0.1" || value === "::1") return true;
    if (value === "::ffff:127.0.0.1") return true;
    if (value.startsWith("::ffff:")) {
      const embedded = value.slice("::ffff:".length);
      if (embedded === "127.0.0.1") return true;
    }
    return false;
  }

  function isJoinRateLimited(ip) {
    const now = Date.now();
    const history = joinAttempts.get(ip) || [];
    const active = history.filter((stamp) => now - stamp < JOIN_LIMIT_WINDOW_MS);
    if (active.length >= JOIN_LIMIT_MAX) {
      joinAttempts.set(ip, active);
      return true;
    }
    active.push(now);
    joinAttempts.set(ip, active);
    return false;
  }

  function leaveRoom(socket, explicitLeave = false) {
    const roomCode = socket.data.roomCode;
    const playerId = socket.data.playerId;
    if (!roomCode || !playerId) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find((entry) => entry.playerId === playerId);
    if (!player) return;

    if (explicitLeave) {
      room.players = room.players.filter((entry) => entry.playerId !== playerId);
    } else {
      player.connected = false;
      player.lastSeenAt = Date.now();
      player.socketId = null;
    }

    if (!room.players.length) {
      destroyRoom(roomCode);
      return;
    }

    if (!room.players.some((entry) => entry.playerId === room.hostPlayerId)) {
      room.hostPlayerId = room.players[0].playerId;
    }

    socket.leave(roomCode);
    socket.data.roomCode = null;
    socket.data.playerId = null;

    persistRoom(room);
    emitRoomState(room.roomCode);
  }

  io.on("connection", (socket) => {
    const ip = getClientIp(socket);
    devLog("socket:connected", { socketId: socket.id, ip });

    socket.on("lobby:create_room", ({ gameId, name } = {}, callback) => {
      if (!isLocalIp(ip)) {
        callback?.({ error: "Only the host machine (localhost) can create rooms on this server." });
        return;
      }

      const requestedName = sanitizeName(name) || "Host";
      const targetGameId = typeof gameId === "string" && getGame(gameId) ? gameId : DEFAULT_GAME_ID;
      const game = getGame(targetGameId);
      if (!game) {
        callback?.({ error: "Unknown game" });
        return;
      }

      const roomCode = generateRoomCode(rooms);
      const reconnectToken = uuidv4();
      const player = createPlayer(requestedName, socket, reconnectToken);

      const room = {
        roomCode,
        gameId: targetGameId,
        phase: "lobby",
        hostPlayerId: player.playerId,
        players: [player],
        chat: [],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      if (typeof game.onRoomCreated === "function") {
        game.onRoomCreated(room);
      }

      rooms.set(roomCode, room);
      persistRoom(room);

      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.playerId = player.playerId;

      emitRoomState(roomCode);
      devLog("lobby:create_room", { roomCode, hostPlayerId: player.playerId, gameId: targetGameId, ip });
      callback?.({ roomCode, playerId: player.playerId, reconnectToken });
    });

    socket.on("lobby:join_room", ({ roomCode, name, reconnectToken } = {}, callback) => {
      const requestedName = sanitizeName(name) || "Player";

      const normalizedCode = String(roomCode || "").toUpperCase();
      if (!isValidRoomCode(normalizedCode)) {
        callback?.({ error: "Invalid room code" });
        return;
      }
      if (isJoinRateLimited(ip)) {
        callback?.({ error: "Too many join attempts. Try again shortly." });
        return;
      }

      const room = rooms.get(normalizedCode);
      if (!room) {
        callback?.({ error: "Room not found" });
        return;
      }

      let player = null;
      if (reconnectToken) {
        player = room.players.find((entry) => entry.reconnectToken === reconnectToken) || null;
      }

      if (!player) {
        const uniqueName = resolveUniquePlayerName(room, requestedName);
        player = createPlayer(uniqueName, socket, uuidv4());
        room.players.push(player);
      } else {
        player.name = resolveUniquePlayerName(room, requestedName, player.playerId);
        player.connected = true;
        player.socketId = socket.id;
        player.lastSeenAt = Date.now();
      }

      socket.join(room.roomCode);
      socket.data.roomCode = room.roomCode;
      socket.data.playerId = player.playerId;

      persistRoom(room);
      emitRoomState(room.roomCode);
      devLog("lobby:join_room", { roomCode: room.roomCode, playerId: player.playerId, reconnect: Boolean(reconnectToken), ip });
      callback?.({ playerId: player.playerId, reconnectToken: player.reconnectToken });
    });

    socket.on("lobby:leave_room", (_payload, callback) => {
      devLog("lobby:leave_room", { roomCode: socket.data.roomCode, playerId: socket.data.playerId, ip });
      leaveRoom(socket, true);
      callback?.({ ok: true });
    });

    socket.on("lobby:set_name", ({ name } = {}, callback) => {
      const room = roomAccessor(socket);
      if (!room) {
        callback?.({ error: "Room not found" });
        return;
      }
      const player = room.players.find((entry) => entry.playerId === socket.data.playerId);
      if (!player) {
        callback?.({ error: "Player not found" });
        return;
      }
      const cleaned = sanitizeName(name);
      if (!cleaned) {
        callback?.({ error: "Name cannot be empty" });
        return;
      }
      player.name = resolveUniquePlayerName(room, cleaned, player.playerId);
      persistRoom(room);
      emitRoomState(room.roomCode);
      callback?.({ ok: true, name: player.name });
    });

    socket.on("lobby:player_ready", ({ ready } = {}, callback) => {
      const room = roomAccessor(socket);
      if (!room) {
        callback?.({ error: "Room not found" });
        return;
      }
      const player = room.players.find((entry) => entry.playerId === socket.data.playerId);
      if (!player) {
        callback?.({ error: "Player not found" });
        return;
      }

      player.ready = Boolean(ready);
      persistRoom(room);
      emitRoomState(room.roomCode);
      devLog("lobby:player_ready", { roomCode: room.roomCode, playerId: player.playerId, ready: player.ready });
      callback?.({ ok: true });
    });

    socket.on("lobby:chat", ({ message } = {}, callback) => {
      const room = roomAccessor(socket);
      if (!room) {
        callback?.({ error: "Room not found" });
        return;
      }
      const player = room.players.find((entry) => entry.playerId === socket.data.playerId);
      if (!player) {
        callback?.({ error: "Player not found" });
        return;
      }

      const sanitized = sanitizeChatMessage(message);
      if (!sanitized) {
        callback?.({ error: "Message is empty" });
        return;
      }

      const entry = {
        id: uuidv4(),
        playerId: player.playerId,
        name: player.name,
        message: sanitized,
        createdAt: nowIso(),
      };

      room.chat.push(entry);
      room.chat = room.chat.slice(-100);

      io.to(room.roomCode).emit("message", {
        sender: player.name,
        content: sanitized,
        timestamp: Date.now(),
        type: "message",
      });

      persistRoom(room);
      emitRoomState(room.roomCode);
      devLog("lobby:chat", { roomCode: room.roomCode, playerId: player.playerId, messageLength: sanitized.length });
      callback?.({ ok: true });
    });

    socket.on("lobby:set_game", ({ gameId } = {}, callback) => {
      const room = roomAccessor(socket);
      if (!room) {
        callback?.({ error: "Room not found" });
        return;
      }
      if (room.hostPlayerId !== socket.data.playerId) {
        callback?.({ error: "Only host can change game" });
        return;
      }
      if (room.phase !== "lobby") {
        callback?.({ error: "Cannot change game after start" });
        return;
      }

      const game = getGame(gameId);
      if (!game) {
        callback?.({ error: "Unknown game" });
        return;
      }

      room.gameId = gameId;
      if (typeof game.onRoomCreated === "function") {
        game.onRoomCreated(room);
      }
      persistRoom(room);
      emitRoomState(room.roomCode);
      devLog("lobby:set_game", { roomCode: room.roomCode, gameId });
      callback?.({ ok: true });
    });

    socket.on("lobby:start_game", (_payload, callback) => {
      const room = roomAccessor(socket);
      if (!room) {
        callback?.({ error: "Room not found" });
        return;
      }
      if (room.hostPlayerId !== socket.data.playerId) {
        callback?.({ error: "Only host can start" });
        return;
      }

      room.phase = "in_game";
      room.players.forEach((player) => {
        player.ready = false;
      });

      const game = getGame(room.gameId);
      if (game && typeof game.onGameStarted === "function") {
        game.onGameStarted({ io, room, helpers: gameHelpers });
      }

      persistRoom(room);
      emitRoomState(room.roomCode);
      devLog("lobby:start_game", { roomCode: room.roomCode, gameId: room.gameId });
      callback?.({ ok: true });
    });

    socket.on("leave_room", ({ roomId } = {}) => {
      const normalized = String(roomId || socket.data.roomCode || "").toUpperCase();
      if (normalized && socket.data.roomCode && normalized !== socket.data.roomCode) return;
      devLog("leave_room", { roomCode: normalized || socket.data.roomCode, playerId: socket.data.playerId });
      leaveRoom(socket, true);
    });

    socket.on("send_message", ({ message } = {}) => {
      const room = roomAccessor(socket);
      if (!room) return;
      const player = room.players.find((entry) => entry.playerId === socket.data.playerId);
      const sanitized = sanitizeChatMessage(message);
      if (!player || !sanitized) return;
      room.chat.push({
        id: uuidv4(),
        playerId: player.playerId,
        name: player.name,
        message: sanitized,
        createdAt: nowIso(),
      });
      room.chat = room.chat.slice(-100);
      io.to(room.roomCode).emit("message", {
        sender: player.name,
        content: sanitized,
        timestamp: Date.now(),
        type: "message",
      });
      persistRoom(room);
      emitRoomState(room.roomCode);
    });

    socket.on("disconnect", () => {
      devLog("socket:disconnect", { socketId: socket.id, roomCode: socket.data.roomCode, playerId: socket.data.playerId });
      leaveRoom(socket, false);
    });
  });

  setInterval(() => {
    const now = Date.now();
    rooms.forEach((room) => {
      const beforeCount = room.players.length;
      const previousHostId = room.hostPlayerId;

      room.players = room.players.filter((player) => player.connected || now - player.lastSeenAt < RECONNECT_GRACE_MS);
      if (!room.players.length) {
        const roomAge = now - new Date(room.createdAt).getTime();
        if (roomAge < ROOM_CREATION_GRACE_MS) return;
        devLog("room:destroy", { roomCode: room.roomCode, reason: "empty_after_reconnect_grace" });
        destroyRoom(room.roomCode);
        return;
      }

      if (!room.players.some((player) => player.playerId === room.hostPlayerId)) {
        room.hostPlayerId = room.players[0].playerId;
      }

      const didChange = beforeCount !== room.players.length || previousHostId !== room.hostPlayerId;
      if (!didChange) return;

      persistRoom(room);
      emitRoomState(room.roomCode);
      devLog("room:sweep_update", {
        roomCode: room.roomCode,
        playersBefore: beforeCount,
        playersAfter: room.players.length,
        hostPlayerId: room.hostPlayerId,
      });
    });
  }, 30 * 1000);

  let nextRequestHandler = null;
  if (!IS_DEV) {
    expressApp.all("*", (req, res) => {
      if (!nextRequestHandler) {
        res.status(503).setHeader("Retry-After", "5").json({ error: "Server is starting…" });
        return;
      }
      nextRequestHandler(req, res);
    });
  }

  server.listen(PORT, HOST, () => {
    const { localUrl, lanUrl, publicUrl } = buildLocalUrls(PORT);
    console.log(`[game-server] mode: ${mode}`);
    console.log(`[game-server] listening on ${HOST}:${PORT}`);
    console.log(`[game-server] Local: ${localUrl}`);
    console.log(`[game-server] LAN: ${lanUrl}`);
    if (publicUrl) {
      console.log(`[game-server] Public: ${publicUrl}`);
    }
    console.log(`[game-server] Join example: ${lanUrl}/join/ABC123`);

    if (!IS_DEV) {
      const nextApp = next({ dev: false, dir: NEXT_APP_DIR });
      nextRequestHandler = nextApp.getRequestHandler();
      nextApp.prepare().then(() => {
        console.log("[game-server] Next.js app ready.");
      }).catch((err) => {
        console.error("[game-server] Next.js prepare failed:", err);
      });
    }
  });
}

bootstrap().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});
