const ROOM_CODE_REGEX = /^[A-Z0-9]{6}$/;
const MAX_CHAT_LENGTH = 240;
const RECONNECT_GRACE_MS = 1000 * 60 * 30;
const ROOM_CREATION_GRACE_MS = 1000 * 60 * 5;
const DEFAULT_GAME_ID = "blackjack";

function generateRoomCode(existingRooms) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempts = 0; attempts < 1000; attempts += 1) {
    let code = "";
    for (let i = 0; i < 6; i += 1) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!existingRooms.has(code)) {
      return code;
    }
  }
  throw new Error("Unable to generate unique room code");
}

function sanitizeChatMessage(raw) {
  const value = String(raw ?? "").replace(/\s+/g, " ").trim();
  if (!value) return "";
  return value.slice(0, MAX_CHAT_LENGTH);
}

function sanitizeName(raw) {
  const value = String(raw ?? "").trim().replace(/\s+/g, " ");
  return value.slice(0, 24);
}

function isValidRoomCode(code) {
  return ROOM_CODE_REGEX.test(String(code ?? "").toUpperCase());
}

function publicRoomSnapshot(room, playerId) {
  return {
    roomCode: room.roomCode,
    gameId: room.gameId,
    phase: room.phase,
    hostPlayerId: room.hostPlayerId,
    players: room.players.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      connected: player.connected,
      ready: player.ready,
      joinedAt: player.joinedAt,
      balance: player.balance,
      cards: player.cards,
      bet: player.bet,
      status: player.status,
      score: player.score,
    })),
    chat: room.chat,
    blackjack: room.blackjack,
    selfPlayerId: playerId,
  };
}

function buildLocalUrls(port) {
  const os = require("os");
  const interfaces = os.networkInterfaces();

  const vpnNamePattern = /(tailscale|zerotier|hamachi|wireguard|openvpn|proton|nord|expressvpn|tunnel|vpn)/i;
  const virtualNamePattern = /(vmware|virtualbox|vbox|hyper-v|vethernet|docker|wsl|loopback|bridge|tap|tun|npf|utun|host-only)/i;
  const preferredNamePattern = /(wi-?fi|wlan|ethernet|en\d|eth\d|lan)/i;

  const privateIpPattern = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;
  const linkLocalPattern = /^169\.254\./;

  const candidates = [];

  Object.entries(interfaces).forEach(([name, entries]) => {
    (entries || []).forEach((entry) => {
      if (!entry || entry.family !== "IPv4" || entry.internal || !entry.address) {
        return;
      }

      const address = String(entry.address);
      let score = 0;

      if (privateIpPattern.test(address)) score += 50;
      if (preferredNamePattern.test(name)) score += 20;
      if (vpnNamePattern.test(name)) score -= 40;
      if (virtualNamePattern.test(name)) score -= 80;
      if (linkLocalPattern.test(address)) score -= 30;

      candidates.push({
        address,
        score,
        name,
      });
    });
  });

  candidates.sort((a, b) => b.score - a.score);
  const lanIp = candidates[0]?.address || "127.0.0.1";
  const playitHost = String(process.env.PLAYIT_HOSTNAME || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");

  return {
    localUrl: `http://localhost:${port}`,
    lanUrl: `http://${lanIp}:${port}`,
    lanIp,
    publicUrl: playitHost ? `https://${playitHost}` : null,
  };
}

module.exports = {
  DEFAULT_GAME_ID,
  RECONNECT_GRACE_MS,
  ROOM_CREATION_GRACE_MS,
  generateRoomCode,
  sanitizeChatMessage,
  sanitizeName,
  isValidRoomCode,
  publicRoomSnapshot,
  buildLocalUrls,
};
