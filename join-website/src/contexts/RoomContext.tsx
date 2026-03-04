"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { getSocketServerUrl } from "@/lib/socket";
import type { RoomSnapshot } from "@/types/room";

type RoomContextValue = {
  socket: Socket | null;
  serverUrl: string;
  connected: boolean;
  error: string | null;
  room: RoomSnapshot | null;
  reconnectToken: string | null;
  setReconnectToken: (token: string | null) => void;
  createRoom: (gameId: string, name?: string) => Promise<{ roomCode: string | null; error?: string }>;
  joinRoom: (roomCode: string, name: string, reconnectToken?: string | null) => Promise<{ playerId: string | null; reconnectToken: string | null; error?: string }>;
  leaveRoom: () => Promise<void>;
  setName: (name: string) => Promise<void>;
  setReady: (ready: boolean) => Promise<void>;
  sendChat: (message: string) => Promise<void>;
  setGame: (gameId: string) => Promise<void>;
  startGame: () => Promise<void>;
};

const RoomContext = createContext<RoomContextValue | null>(null);
const ACK_TIMEOUT_MS = 8000;
const DEV_LOGGING = process.env.NODE_ENV !== "production";

export function useRoom() {
  const value = useContext(RoomContext);
  if (!value) {
    throw new Error("useRoom must be used inside RoomProvider");
  }
  return value;
}

function emitWithAck<TResponse>(socket: Socket, event: string, payload?: unknown): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(`Server timed out (${event})`));
    }, ACK_TIMEOUT_MS);

    socket.emit(event, payload, (response: TResponse) => {
      window.clearTimeout(timeoutId);
      resolve(response);
    });
  });
}

function extractAckError(response: unknown): string | null {
  if (!response || typeof response !== "object") return null;
  const maybeError = (response as { error?: unknown }).error;
  if (typeof maybeError === "string" && maybeError.trim()) {
    return maybeError;
  }
  return null;
}

function devLog(message: string, details?: unknown) {
  if (!DEV_LOGGING) return;
  if (details === undefined) {
    console.log(`[room] ${message}`);
    return;
  }
  console.log(`[room] ${message}`, details);
}

export function RoomProvider({ children, authToken }: { children: React.ReactNode; authToken?: string | null }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomSnapshot | null>(null);
  const [reconnectToken, setReconnectTokenState] = useState<string | null>(null);
  const reconnectTokenRef = useRef<string | null>(null);
  const serverUrl = useMemo(() => getSocketServerUrl(), []);
  const stableAuthToken = authToken ?? null;

  const setReconnectToken = useCallback((token: string | null) => {
    reconnectTokenRef.current = token;
    setReconnectTokenState(token);
  }, []);

  useEffect(() => {
    devLog("connecting", { serverUrl, hasAuthToken: !!stableAuthToken });
    const socketOptions: Parameters<typeof io>[1] = {
      transports: ["websocket", "polling"],
      reconnection: true,
      timeout: 10000,
      withCredentials: true,
    };
    if (stableAuthToken) {
      socketOptions.auth = { token: stableAuthToken };
    }
    const nextSocket = io(serverUrl, socketOptions);

    nextSocket.on("connect", () => {
      setSocket(nextSocket);
      setConnected(true);
      setError(null);
      devLog("connected", { id: nextSocket.id });
    });

    nextSocket.on("disconnect", (reason) => {
      setSocket((current) => (current === nextSocket ? null : current));
      setConnected(false);
      devLog("disconnected", { reason });
    });

    nextSocket.on("connect_error", (err) => {
      setSocket((current) => (current === nextSocket ? null : current));
      setConnected(false);
      setError(err.message || "Unable to connect to host server");
      devLog("connect_error", err.message || err);
    });

    nextSocket.on("error", (data: { message?: string }) => {
      setError(data.message || "Server error");
      devLog("server_error", data);
    });

    nextSocket.on("room:state", (snapshot: RoomSnapshot) => {
      setRoom(snapshot);
      devLog("room:state", {
        roomCode: snapshot.roomCode,
        players: snapshot.players?.length ?? 0,
        phase: snapshot.phase,
      });
    });

    return () => {
      devLog("socket_cleanup");
      nextSocket.disconnect();
    };
  }, [serverUrl, stableAuthToken]);

  const requireSocket = useCallback(() => {
    if (!socket || !socket.connected) {
      throw new Error("Not connected to host server");
    }
    return socket;
  }, [socket]);

  const createRoom = useCallback(
    async (gameId: string, name?: string) => {
      try {
        const s = requireSocket();
        const response = await emitWithAck<{ roomCode?: string; playerId?: string; reconnectToken?: string; error?: string }>(s, "lobby:create_room", {
          gameId,
          name,
        });
        const responseError = extractAckError(response);
        if (responseError) {
          setError(responseError);
          return { roomCode: null, error: responseError };
        }

        setError(null);
        setReconnectToken(response.reconnectToken || null);
        devLog("create_room:ok", response);
        return { roomCode: response.roomCode || null };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create room";
        setError(message);
        devLog("create_room:error", message);
        return { roomCode: null, error: err instanceof Error ? err.message : "Failed to create room" };
      }
    },
    [requireSocket, setReconnectToken],
  );

  const joinRoom = useCallback(
    async (roomCode: string, name: string, token?: string | null) => {
      try {
        const s = requireSocket();
        const response = await emitWithAck<{ playerId?: string; reconnectToken?: string; error?: string }>(s, "lobby:join_room", {
          roomCode,
          name,
          reconnectToken: token || reconnectTokenRef.current || undefined,
        });
        const responseError = extractAckError(response);
        if (responseError) {
          setError(responseError);
          return { playerId: null, reconnectToken: null, error: responseError };
        }

        setError(null);
        const finalToken = response.reconnectToken || null;
        setReconnectToken(finalToken);
        devLog("join_room:ok", { roomCode, playerId: response.playerId });

        return {
          playerId: response.playerId || null,
          reconnectToken: finalToken,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to join room";
        setError(message);
        devLog("join_room:error", { roomCode, message });
        return {
          playerId: null,
          reconnectToken: null,
          error: err instanceof Error ? err.message : "Failed to join room",
        };
      }
    },
    [requireSocket, setReconnectToken],
  );

  const leaveRoom = useCallback(async () => {
    if (!socket) return;
    try {
      const response = await emitWithAck<{ ok?: boolean; error?: string }>(socket, "lobby:leave_room");
      const responseError = extractAckError(response);
      if (responseError) {
        setError(responseError);
        return;
      }
      setError(null);
      setRoom(null);
      devLog("leave_room:ok");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to leave room";
      setError(message);
      devLog("leave_room:error", message);
    }
  }, [socket]);

  const setName = useCallback(
    async (name: string) => {
      try {
        const s = requireSocket();
        const response = await emitWithAck<{ ok?: boolean; error?: string }>(s, "lobby:set_name", { name });
        const responseError = extractAckError(response);
        if (responseError) {
          setError(responseError);
          return;
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update name");
      }
    },
    [requireSocket],
  );

  const setReady = useCallback(
    async (ready: boolean) => {
      try {
        const s = requireSocket();
        const response = await emitWithAck<{ ok?: boolean; error?: string }>(s, "lobby:player_ready", { ready });
        const responseError = extractAckError(response);
        if (responseError) {
          setError(responseError);
          return;
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update readiness");
      }
    },
    [requireSocket],
  );

  const sendChat = useCallback(
    async (message: string) => {
      try {
        const s = requireSocket();
        const response = await emitWithAck<{ ok?: boolean; error?: string }>(s, "lobby:chat", { message });
        const responseError = extractAckError(response);
        if (responseError) {
          setError(responseError);
          return;
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send chat");
      }
    },
    [requireSocket],
  );

  const setGame = useCallback(
    async (gameId: string) => {
      try {
        const s = requireSocket();
        const response = await emitWithAck<{ ok?: boolean; error?: string }>(s, "lobby:set_game", { gameId });
        const responseError = extractAckError(response);
        if (responseError) {
          setError(responseError);
          return;
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set game");
      }
    },
    [requireSocket],
  );

  const startGame = useCallback(async () => {
    try {
      const s = requireSocket();
      const response = await emitWithAck<{ ok?: boolean; error?: string }>(s, "lobby:start_game", {});
      const responseError = extractAckError(response);
      if (responseError) {
        setError(responseError);
        return;
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game");
    }
  }, [requireSocket]);

  const value = useMemo<RoomContextValue>(
    () => ({
      socket,
      serverUrl,
      connected,
      error,
      room,
      reconnectToken,
      setReconnectToken,
      createRoom,
      joinRoom,
      leaveRoom,
      setName,
      setReady,
      sendChat,
      setGame,
      startGame,
    }),
    [socket, serverUrl, connected, error, room, reconnectToken, setReconnectToken, createRoom, joinRoom, leaveRoom, setName, setReady, sendChat, setGame, startGame],
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}
