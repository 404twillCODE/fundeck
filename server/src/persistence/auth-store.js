const crypto = require("crypto");
const path = require("path");

class AuthStore {
  constructor({ dbPath }) {
    const Database = require("better-sqlite3");
    const resolvedPath = path.resolve(dbPath || "./game-server-auth.sqlite");
    this.db = new Database(resolvedPath);

    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");

    this.db
      .prepare(
        `
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL
        )
      `,
      )
      .run();

    this.db
      .prepare(
        `
        CREATE TABLE IF NOT EXISTS sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL,
          expires_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `,
      )
      .run();

    this.db
      .prepare(
        `
        CREATE TABLE IF NOT EXISTS stats (
          user_id TEXT PRIMARY KEY,
          games_played INTEGER NOT NULL DEFAULT 0,
          blackjack_wins INTEGER NOT NULL DEFAULT 0,
          blackjack_losses INTEGER NOT NULL DEFAULT 0,
          chips INTEGER NOT NULL DEFAULT 1000,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `,
      )
      .run();

    this.createUserStmt = this.db.prepare(
      "INSERT INTO users (id, email, password_hash, created_at) VALUES (@id, @email, @passwordHash, @createdAt)",
    );
    this.findUserByEmailStmt = this.db.prepare(
      "SELECT id, email, password_hash, created_at FROM users WHERE email = ?",
    );
    this.findUserByIdStmt = this.db.prepare(
      "SELECT id, email, password_hash, created_at FROM users WHERE id = ?",
    );

    this.createSessionStmt = this.db.prepare(
      "INSERT INTO sessions (id, user_id, token, created_at, expires_at) VALUES (@id, @userId, @token, @createdAt, @expiresAt)",
    );
    this.findSessionByTokenStmt = this.db.prepare(
      `
        SELECT s.id, s.user_id, s.token, s.created_at, s.expires_at, u.email
        FROM sessions s
        INNER JOIN users u ON u.id = s.user_id
        WHERE s.token = ?
      `,
    );
    this.deleteSessionByTokenStmt = this.db.prepare("DELETE FROM sessions WHERE token = ?");
    this.deleteExpiredSessionsStmt = this.db.prepare(
      "DELETE FROM sessions WHERE datetime(expires_at) <= datetime('now')",
    );

    this.ensureStatsStmt = this.db.prepare(
      `
        INSERT INTO stats (user_id, games_played, blackjack_wins, blackjack_losses, chips, updated_at)
        VALUES (@userId, 0, 0, 0, @chips, @updatedAt)
        ON CONFLICT(user_id) DO NOTHING
      `,
    );
    this.getStatsStmt = this.db.prepare(
      `
        SELECT user_id, games_played, blackjack_wins, blackjack_losses, chips, updated_at
        FROM stats
        WHERE user_id = ?
      `,
    );
    this.updateStatsStmt = this.db.prepare(
      `
        UPDATE stats
        SET
          games_played = games_played + @gamesPlayedDelta,
          blackjack_wins = blackjack_wins + @winsDelta,
          blackjack_losses = blackjack_losses + @lossesDelta,
          chips = @chips,
          updated_at = @updatedAt
        WHERE user_id = @userId
      `,
    );

    this.topLeaderboardStmt = this.db.prepare(
      `
        SELECT
          u.id AS user_id,
          u.email,
          s.games_played,
          s.blackjack_wins,
          s.blackjack_losses,
          s.chips
        FROM stats s
        INNER JOIN users u ON u.id = s.user_id
        ORDER BY s.blackjack_wins DESC, s.chips DESC, s.games_played DESC, u.created_at ASC
        LIMIT ?
      `,
    );
    this.fullLeaderboardStmt = this.db.prepare(
      `
        SELECT
          u.id AS user_id,
          u.email,
          s.games_played,
          s.blackjack_wins,
          s.blackjack_losses,
          s.chips
        FROM stats s
        INNER JOIN users u ON u.id = s.user_id
        ORDER BY s.blackjack_wins DESC, s.chips DESC, s.games_played DESC, u.created_at ASC
      `,
    );
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
    const normalizedEmail = AuthStore.normalizeEmail(email);
    const createdAt = AuthStore.nowIso();
    const userId = AuthStore.generateId();

    this.createUserStmt.run({
      id: userId,
      email: normalizedEmail,
      passwordHash,
      createdAt,
    });

    this.ensureStats(userId, 1000);
    return this.findUserById(userId);
  }

  findUserByEmail(email) {
    const normalizedEmail = AuthStore.normalizeEmail(email);
    return this.findUserByEmailStmt.get(normalizedEmail) || null;
  }

  findUserById(userId) {
    return this.findUserByIdStmt.get(userId) || null;
  }

  createSession(userId, expiresAtIso) {
    const session = {
      id: AuthStore.generateId(),
      userId,
      token: AuthStore.makeSessionToken(),
      createdAt: AuthStore.nowIso(),
      expiresAt: expiresAtIso,
    };

    this.createSessionStmt.run(session);
    return session;
  }

  deleteSessionByToken(token) {
    if (!token) return;
    this.deleteSessionByTokenStmt.run(token);
  }

  deleteExpiredSessions() {
    this.deleteExpiredSessionsStmt.run();
  }

  getSessionByToken(token) {
    if (!token) return null;
    this.deleteExpiredSessions();
    const session = this.findSessionByTokenStmt.get(token);
    if (!session) return null;

    const expiresAt = Date.parse(session.expires_at);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      this.deleteSessionByToken(token);
      return null;
    }

    return session;
  }

  ensureStats(userId, chips = 1000) {
    this.ensureStatsStmt.run({
      userId,
      chips,
      updatedAt: AuthStore.nowIso(),
    });
  }

  getStats(userId) {
    this.ensureStats(userId);
    const stats = this.getStatsStmt.get(userId);
    if (!stats) {
      return {
        user_id: userId,
        games_played: 0,
        blackjack_wins: 0,
        blackjack_losses: 0,
        chips: 1000,
      };
    }
    return stats;
  }

  updateBlackjackStats({ userId, winsDelta = 0, lossesDelta = 0, gamesPlayedDelta = 1, chips }) {
    const nextChips = Number.isFinite(chips) ? Math.max(0, Math.floor(chips)) : 1000;
    this.ensureStats(userId, nextChips);
    this.updateStatsStmt.run({
      userId,
      winsDelta,
      lossesDelta,
      gamesPlayedDelta,
      chips: nextChips,
      updatedAt: AuthStore.nowIso(),
    });
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
    const rows = this.topLeaderboardStmt.all(safeLimit);
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
    const rows = this.fullLeaderboardStmt.all();
    const index = rows.findIndex((row) => row.user_id === userId);
    if (index === -1) return null;
    const row = rows[index];
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

module.exports = { AuthStore };
