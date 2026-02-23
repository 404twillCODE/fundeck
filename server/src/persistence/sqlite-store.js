const path = require("path");

class SqliteStore {
  constructor({ dbPath }) {
    const Database = require("better-sqlite3");
    const resolvedPath = path.resolve(dbPath || "./game-server-data.sqlite");
    this.db = new Database(resolvedPath);

    this.db
      .prepare(
        `
        CREATE TABLE IF NOT EXISTS rooms (
          room_code TEXT PRIMARY KEY,
          room_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `,
      )
      .run();

    this.selectAll = this.db.prepare("SELECT room_json FROM rooms");
    this.upsertRoom = this.db.prepare(
      "INSERT INTO rooms (room_code, room_json, updated_at) VALUES (@roomCode, @roomJson, @updatedAt) ON CONFLICT(room_code) DO UPDATE SET room_json=excluded.room_json, updated_at=excluded.updated_at",
    );
    this.deleteStmt = this.db.prepare("DELETE FROM rooms WHERE room_code = ?");
  }

  loadRooms() {
    return this.selectAll
      .all()
      .map((row) => {
        try {
          return JSON.parse(row.room_json);
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }

  saveRoom(room) {
    this.upsertRoom.run({
      roomCode: room.roomCode,
      roomJson: JSON.stringify(room),
      updatedAt: Date.now(),
    });
  }

  deleteRoom(roomCode) {
    this.deleteStmt.run(roomCode);
  }
}

module.exports = { SqliteStore };
