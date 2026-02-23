class MemoryStore {
  constructor() {
    this.rooms = new Map();
  }

  loadRooms() {
    return [...this.rooms.values()];
  }

  saveRoom(room) {
    this.rooms.set(room.roomCode, room);
  }

  deleteRoom(roomCode) {
    this.rooms.delete(roomCode);
  }
}

module.exports = { MemoryStore };
