const crypto = require("crypto");

/** In-memory auth store when better-sqlite3 is unavailable (e.g. no Python for node-gyp). Same API as AuthStore. */
class MemoryAuthStore {
  constructor() {
    this.users = new Map();
    this.sessionsByToken = new Map();
    this.statsByUserId = new Map();
  }

  static generateId() {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return crypto.randomBytes(16).toString("hex");
  }

  static nowIso() {
    return new Date().toISOString();
  }

  static normalizeEmail(raw) {
    return String(raw || "").trim().toLowerCase();
  }

  static makeSessionToken() {
    return crypto.randomBytes(32).toString("hex");
  }

  createUser({ email, passwordHash }) {
    const normalizedEmail = MemoryAuthStore.normalizeEmail(email);
    if (this.users.has(normalizedEmail)) throw new Error("Email already registered");
    const userId = MemoryAuthStore.generateId();
    const createdAt = MemoryAuthStore.nowIso();
    const user = { id: userId, email: normalizedEmail, password_hash: passwordHash, created_at: createdAt };
    this.users.set(normalizedEmail, user);
    this.ensureStats(userId, 1000);
    return this.findUserById(userId);
  }

  findUserByEmail(email) {
    const normalizedEmail = MemoryAuthStore.normalizeEmail(email);
    return this.users.get(normalizedEmail) || null;
  }

  findUserById(userId) {
    for (const u of this.users.values()) {
      if (u.id === userId) return u;
    }
    return null;
  }

  createSession(userId, expiresAtIso) {
    const session = {
      id: MemoryAuthStore.generateId(),
      user_id: userId,
      token: MemoryAuthStore.makeSessionToken(),
      created_at: MemoryAuthStore.nowIso(),
      expires_at: expiresAtIso,
    };
    this.sessionsByToken.set(session.token, session);
    return session;
  }

  deleteSessionByToken(token) {
    if (token) this.sessionsByToken.delete(token);
  }

  getSessionByToken(token) {
    if (!token) return null;
    this.deleteExpiredSessions();
    const session = this.sessionsByToken.get(token);
    if (!session) return null;
    const expiresAt = Date.parse(session.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      this.deleteSessionByToken(token);
      return null;
    }
    const user = this.findUserById(session.user_id);
    if (user) session.email = user.email;
    return session;
  }

  deleteExpiredSessions() {
    const now = Date.now();
    for (const [token, s] of this.sessionsByToken.entries()) {
      const expiresAt = Date.parse(s.expires_at);
      if (Number.isFinite(expiresAt) && expiresAt <= now) this.sessionsByToken.delete(token);
    }
  }

  ensureStats(userId, chips = 1000) {
    if (!this.statsByUserId.has(userId)) {
      this.statsByUserId.set(userId, {
        user_id: userId,
        games_played: 0,
        blackjack_wins: 0,
        blackjack_losses: 0,
        chips: Number.isFinite(chips) ? Math.max(0, Math.floor(chips)) : 1000,
        updated_at: MemoryAuthStore.nowIso(),
      });
    }
  }

  getStats(userId) {
    this.ensureStats(userId);
    const stats = this.statsByUserId.get(userId);
    if (!stats)
      return { user_id: userId, games_played: 0, blackjack_wins: 0, blackjack_losses: 0, chips: 1000 };
    return stats;
  }

  updateBlackjackStats({ userId, winsDelta = 0, lossesDelta = 0, gamesPlayedDelta = 1, chips }) {
    const nextChips = Number.isFinite(chips) ? Math.max(0, Math.floor(chips)) : 1000;
    this.ensureStats(userId, nextChips);
    const s = this.statsByUserId.get(userId);
    s.games_played += gamesPlayedDelta;
    s.blackjack_wins += winsDelta;
    s.blackjack_losses += lossesDelta;
    s.chips = nextChips;
    s.updated_at = MemoryAuthStore.nowIso();
    return this.getStats(userId);
  }

  getUserAndStatsBySessionToken(token) {
    const session = this.getSessionByToken(token);
    if (!session) return null;
    const user = this.findUserById(session.user_id);
    if (!user) return null;
    const stats = this.getStats(user.id);
    return { user, stats, session };
  }

  getBlackjackLeaderboard(limit = 25) {
    const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(200, Math.floor(limit))) : 25;
    const rows = [...this.statsByUserId.values()]
      .map((s) => {
        const user = this.findUserById(s.user_id);
        return user
          ? {
              user_id: user.id,
              email: user.email,
              games_played: s.games_played,
              blackjack_wins: s.blackjack_wins,
              blackjack_losses: s.blackjack_losses,
              chips: s.chips,
            }
          : null;
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.blackjack_wins - a.blackjack_wins ||
          b.chips - a.chips ||
          b.games_played - a.games_played
      )
      .slice(0, safeLimit);
    return rows.map((row, index) => ({
      rank: index + 1,
      userId: row.user_id,
      email: row.email,
      gamesPlayed: row.games_played,
      blackjackWins: row.blackjack_wins,
      blackjackLosses: row.blackjack_losses,
      chips: row.chips,
    }));
  }

  getBlackjackRank(userId) {
    if (!userId) return null;
    const all = [...this.statsByUserId.values()]
      .map((s) => {
        const user = this.findUserById(s.user_id);
        return user
          ? {
              user_id: user.id,
              email: user.email,
              games_played: s.games_played,
              blackjack_wins: s.blackjack_wins,
              blackjack_losses: s.blackjack_losses,
              chips: s.chips,
            }
          : null;
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.blackjack_wins - a.blackjack_wins ||
          b.chips - a.chips ||
          b.games_played - a.games_played
      );
    const index = all.findIndex((row) => row.user_id === userId);
    if (index === -1) return null;
    const row = all[index];
    return {
      rank: index + 1,
      userId: row.user_id,
      email: row.email,
      gamesPlayed: row.games_played,
      blackjackWins: row.blackjack_wins,
      blackjackLosses: row.blackjack_losses,
      chips: row.chips,
    };
  }
}

module.exports = { MemoryAuthStore };
