export type Suit = "hearts" | "diamonds" | "clubs" | "spades";

export type Card = {
  suit: Suit;
  value: string;
};

export type Player = {
  id: string;
  username: string;
  balance: number;
  cards: Card[];
  bet: number;
  status: string | null;
  score: number;
  originalPlayer?: string;
};

export type Dealer = {
  cards: Card[];
  score: number;
  status?: string | null;
};

export type Message = {
  sender?: string;
  content: string;
  timestamp: number;
  type: "system" | "message";
};

export type GameState = "waiting" | "betting" | "playing" | "ended";
