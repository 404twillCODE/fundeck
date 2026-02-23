export type RoomPhase = "lobby" | "in_game";

export type RoomPlayer = {
  playerId: string;
  name: string;
  connected: boolean;
  ready: boolean;
  joinedAt: string;
  balance: number;
  cards: Array<{ suit: string; value: string }>;
  bet: number;
  status: string | null;
  score: number;
};

export type RoomChat = {
  id: string;
  playerId: string;
  name: string;
  message: string;
  createdAt: string;
};

export type RoomSnapshot = {
  roomCode: string;
  gameId: string;
  phase: RoomPhase;
  hostPlayerId: string;
  players: RoomPlayer[];
  chat: RoomChat[];
  blackjack?: {
    state: "waiting" | "betting" | "playing" | "ended";
    dealer: {
      cards: Array<{ suit: string; value: string }>;
      score: number;
      status: string | null;
    };
    currentTurnPlayerId: string | null;
    round: number;
  };
  selfPlayerId: string;
};
