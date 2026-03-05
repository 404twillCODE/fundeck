"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { getSocketServerUrl } from "@/lib/socket";
import { useAuth } from "@/games/blackjack/contexts/AuthContext";
import type { Dealer, GameState, Message, Player } from "@/games/blackjack/types";

type VoteStatus = {
  votesReceived: number;
  totalPlayers: number;
};

type GameContextValue = {
  connected: boolean;
  reconnecting: boolean;
  username: string;
  balance: number;
  roomId: string | null;
  selfPlayerId: string | null;
  players: Player[];
  dealer: Dealer;
  gameState: GameState;
  currentTurn: string | null;
  messages: Message[];
  error: string | null;
  gameHistory: Array<Record<string, unknown>>;
  leaderboard: Array<Record<string, unknown>>;
  lastBet: number;
  hintsEnabled: boolean;
  autoSkipNewRound: boolean;
  createRoom: (usernameOverride?: string | null) => void;
  joinRoom: (roomCode: string, usernameOverride?: string | null) => void;
  startGame: () => void;
  placeBet: (amount: number) => void;
  hit: () => void;
  stand: () => void;
  doubleDown: () => void;
  split: () => void;
  surrender: () => void;
  startNewRound: () => void;
  sendMessage: (message: string) => void;
  leaveRoom: () => void;
  kickPlayer: (playerId: string) => void;
  restartGame: () => void;
  isPlayerTurn: () => boolean;
  getCurrentPlayer: () => Player | null;
  toggleHints: () => void;
  setAutoSkipNewRound: (value: boolean) => void;
  socket: Socket | null;
  isPickingUpCards: boolean;
  showVotePrompt: boolean;
  voteStatus: VoteStatus | null;
  hasVoted: boolean;
  voteReset: (vote: string) => void;
};

const GameContext = createContext<GameContextValue | null>(null);

export const useGame = () => {
  const value = useContext(GameContext);
  if (!value) {
    throw new Error("useGame must be used within GameProvider");
  }
  return value;
};

type GameProviderProps = {
  children: React.ReactNode;
  serverUrl?: string;
  onReconnectFailed?: () => void;
  initialRoomCode?: string;
  initialName?: string;
  initialReconnectToken?: string | null;
};

function emitWithAck<TResponse>(socket: Socket, event: string, payload?: unknown): Promise<TResponse> {
  return new Promise((resolve) => {
    socket.emit(event, payload, (response: TResponse) => {
      resolve(response);
    });
  });
}

function mapPlayers(rawPlayers: Array<Record<string, unknown>>): Player[] {
  return rawPlayers.map((player) => ({
    id: String(player.playerId || ""),
    username: String(player.name || "Player"),
    balance: Number(player.balance || 0),
    cards: Array.isArray(player.cards) ? (player.cards as Player["cards"]) : [],
    bet: Number(player.bet || 0),
    status: (player.status as string | null) || null,
    score: Number(player.score || 0),
    originalPlayer: undefined,
  }));
}

export const GameProvider = ({
  children,
  serverUrl,
  onReconnectFailed,
  initialRoomCode,
  initialName,
  initialReconnectToken,
}: GameProviderProps) => {
  const { username: authUsername } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [username, setUsername] = useState(authUsername || initialName || "");
  const [balance, setBalance] = useState(1000);
  const [roomId, setRoomId] = useState<string | null>(initialRoomCode || null);
  const [selfPlayerId, setSelfPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [dealer, setDealer] = useState<Dealer>({ cards: [], score: 0 });
  const [gameState, setGameState] = useState<GameState>("waiting");
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [gameHistory, setGameHistory] = useState<Array<Record<string, unknown>>>([]);
  const [leaderboard] = useState<Array<Record<string, unknown>>>([]);
  const [lastBet, setLastBet] = useState(0);
  const [hintsEnabled, setHintsEnabled] = useState(true);
  const [autoSkipNewRound, setAutoSkipNewRound] = useState(true);
  const [isPickingUpCards] = useState(false);
  const [showVotePrompt] = useState(false);
  const [voteStatus] = useState<VoteStatus | null>(null);
  const [hasVoted] = useState(false);
  const autoJoinRef = useRef(false);
  const selfPlayerIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (authUsername) {
      setUsername(authUsername);
    }
  }, [authUsername]);

  useEffect(() => {
    selfPlayerIdRef.current = selfPlayerId;
  }, [selfPlayerId]);

  useEffect(() => {
    const socketUrl = serverUrl || getSocketServerUrl();
    const newSocket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 15,
      timeout: 10000,
      withCredentials: true,
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      setConnected(true);
      setReconnecting(false);
      setError(null);
    });

    newSocket.on("disconnect", () => {
      setConnected(false);
      setReconnecting(true);
    });

    newSocket.on("reconnect_failed", () => {
      setReconnecting(false);
      setError("Reconnection failed.");
      onReconnectFailed?.();
    });

    newSocket.on("connect_error", (socketError) => {
      setConnected(false);
      setError(socketError.message || "Connection refused");
    });

    newSocket.on("error", (data: { message?: string }) => {
      setError(data.message || "An error occurred");
      setTimeout(() => setError(null), 3000);
    });

    newSocket.on("room:state", (snapshot) => {
      if (!snapshot) return;

      setRoomId(snapshot.roomCode || null);
      setSelfPlayerId(snapshot.selfPlayerId || null);

      const mappedPlayers = mapPlayers(snapshot.players || []);
      setPlayers(mappedPlayers);

      const me = mappedPlayers.find((player) => player.id === snapshot.selfPlayerId);
      if (me) {
        setBalance(me.balance);
      }

      const blackjack = snapshot.blackjack;
      if (blackjack) {
        setGameState(blackjack.state || "waiting");
        setDealer(blackjack.dealer || { cards: [], score: 0 });
        setCurrentTurn(blackjack.currentTurnPlayerId || null);
      }
    });

    newSocket.on("message", (data: Message) => {
      setMessages((prev) => [...prev, data]);
    });

    newSocket.on("game_started", (data) => {
      setGameState("betting");
      setDealer(data.dealer || { cards: [], score: 0 });
      setPlayers(mapPlayers((data.players || []).map((p: Record<string, unknown>) => ({ ...p, playerId: p.id || p.playerId, name: p.username || p.name }))));
      setMessages((prev) => [
        ...prev,
        { content: "Game started! Place your bets.", type: "system", timestamp: Date.now() },
      ]);
    });

    newSocket.on("betting_ended", (data) => {
      setGameState("playing");
      setPlayers(mapPlayers((data.players || []).map((p: Record<string, unknown>) => ({ ...p, playerId: p.id || p.playerId, name: p.username || p.name }))));
    });

    newSocket.on("player_bet_placed", (data) => {
      setPlayers(mapPlayers((data.players || []).map((p: Record<string, unknown>) => ({ ...p, playerId: p.id || p.playerId, name: p.username || p.name }))));
      if (data.playerId === selfPlayerIdRef.current && data.balance !== undefined) {
        setBalance(Number(data.balance));
      }
    });

    newSocket.on("bet_placed", (data) => {
      if (data.balance !== undefined) {
        setBalance(Number(data.balance));
      }
    });

    newSocket.on("player_turn", (data) => {
      setCurrentTurn(data.playerId || null);
      setPlayers(mapPlayers((data.players || []).map((p: Record<string, unknown>) => ({ ...p, playerId: p.id || p.playerId, name: p.username || p.name }))));
    });

    newSocket.on("card_dealt", (data) => {
      if (data.to === "dealer") {
        setDealer(data.dealer || { cards: [], score: 0 });
        return;
      }

      if (data.to && data.cards) {
        setPlayers((prev) =>
          prev.map((player) =>
            player.id === data.to
              ? { ...player, cards: data.cards, score: data.score || 0 }
              : player,
          ),
        );
      }
    });

    newSocket.on("turn_ended", (data) => {
      setCurrentTurn(data.nextTurn || null);
      setPlayers(mapPlayers((data.players || []).map((p: Record<string, unknown>) => ({ ...p, playerId: p.id || p.playerId, name: p.username || p.name }))));
    });

    newSocket.on("dealer_turn", () => {
      setCurrentTurn("dealer");
    });

    newSocket.on("game_ended", (data) => {
      setGameState("ended");
      setDealer(data.dealer || { cards: [], score: 0 });
      setPlayers(mapPlayers((data.players || []).map((p: Record<string, unknown>) => ({ ...p, playerId: p.id || p.playerId, name: p.username || p.name }))));
      setCurrentTurn(null);
      setGameHistory((prev) => [
        {
          id: Date.now(),
          dealer: data.dealer,
          players: data.players,
          results: data.result?.results || [],
          timestamp: Date.now(),
        },
        ...prev,
      ].slice(0, 10));
    });

    newSocket.on("new_round", (data) => {
      setGameState("betting");
      setPlayers(mapPlayers((data.players || []).map((p: Record<string, unknown>) => ({ ...p, playerId: p.id || p.playerId, name: p.username || p.name }))));
      setDealer(data.dealer || { cards: [], score: 0 });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [serverUrl, onReconnectFailed]);

  useEffect(() => {
    if (!socket || !connected || autoJoinRef.current) return;
    if (!initialRoomCode || !(initialName || username)) return;

    autoJoinRef.current = true;
    emitWithAck<{ playerId?: string; reconnectToken?: string; error?: string }>(socket, "lobby:join_room", {
      roomCode: initialRoomCode,
      name: initialName || username,
      reconnectToken: initialReconnectToken || undefined,
    }).then((response) => {
      if (response?.error) {
        setError(response.error);
        return;
      }
      setSelfPlayerId(response.playerId || null);
      if (response?.reconnectToken) {
        localStorage.setItem(`fundeck:reconnect:${initialRoomCode}`, response.reconnectToken);
      }
      localStorage.setItem("fundeck:displayName", initialName || username);
    });
  }, [socket, connected, initialRoomCode, initialName, initialReconnectToken, username]);

  const createRoom = useCallback(
    (usernameOverride: string | null = null) => {
      if (!socket || !socket.connected) {
        setError("Not connected to server.");
        return;
      }

      const name = usernameOverride || username || authUsername || "Player";
      setUsername(name);

      emitWithAck<{ roomCode?: string; playerId?: string; reconnectToken?: string; error?: string }>(socket, "lobby:create_room", {
        gameId: "blackjack",
        name,
      }).then((response) => {
        if (response.error) {
          setError(response.error);
          return;
        }
        setRoomId(response.roomCode || null);
        setSelfPlayerId(response.playerId || null);
        if (response.reconnectToken && response.roomCode) {
          localStorage.setItem(`fundeck:reconnect:${response.roomCode}`, response.reconnectToken);
        }
      });
    },
    [socket, username, authUsername],
  );

  const joinRoom = useCallback(
    (targetRoomCode: string, usernameOverride: string | null = null) => {
      if (!socket || !socket.connected) {
        setError("Not connected to server.");
        return;
      }

      const name = usernameOverride || username || authUsername;
      if (!name) {
        setError("Username is required.");
        return;
      }

      const code = targetRoomCode.trim().toUpperCase();
      const reconnectToken = localStorage.getItem(`fundeck:reconnect:${code}`);

      emitWithAck<{ playerId?: string; reconnectToken?: string; error?: string }>(socket, "lobby:join_room", {
        roomCode: code,
        name,
        reconnectToken: reconnectToken || undefined,
      }).then((response) => {
        if (response.error) {
          setError(response.error);
          return;
        }
        setRoomId(code);
        setSelfPlayerId(response.playerId || null);
        if (response.reconnectToken) {
          localStorage.setItem(`fundeck:reconnect:${code}`, response.reconnectToken);
        }
      });
    },
    [socket, username, authUsername],
  );

  const startGame = useCallback(() => {
    if (!socket) return;
    socket.emit("lobby:start_game", {});
  }, [socket]);

  const placeBet = useCallback(
    (amount: number) => {
      if (!socket) return;
      socket.emit("blackjack:place_bet", { amount });
      setLastBet(amount);
    },
    [socket],
  );

  const hit = useCallback(() => socket?.emit("blackjack:hit"), [socket]);
  const stand = useCallback(() => socket?.emit("blackjack:stand"), [socket]);
  const doubleDown = useCallback(() => socket?.emit("blackjack:double_down"), [socket]);
  const split = useCallback(() => socket?.emit("blackjack:split"), [socket]);
  const surrender = useCallback(() => socket?.emit("blackjack:surrender"), [socket]);
  const startNewRound = useCallback(() => socket?.emit("blackjack:new_round"), [socket]);

  const sendMessage = useCallback(
    (message: string) => {
      if (!socket) return;
      socket.emit("lobby:chat", { message });
    },
    [socket],
  );

  const leaveRoom = useCallback(() => {
    socket?.emit("lobby:leave_room", {});
    setRoomId(null);
    setPlayers([]);
    setDealer({ cards: [], score: 0 });
    setGameState("waiting");
    setCurrentTurn(null);
    setMessages([]);
  }, [socket]);

  const kickPlayer = useCallback(() => {
    setError("Kick player is not available in this build.");
  }, []);

  const restartGame = useCallback(() => {
    startNewRound();
  }, [startNewRound]);

  const isPlayerTurn = useCallback(() => {
    if (!selfPlayerId || !currentTurn) return false;
    if (currentTurn === selfPlayerId) return true;
    if (currentTurn.includes("-split")) {
      const original = currentTurn.split("-split")[0];
      return original === selfPlayerId;
    }
    return false;
  }, [selfPlayerId, currentTurn]);

  const getCurrentPlayer = useCallback(() => {
    if (!selfPlayerId) return null;
    const ownPlayer = players.find((player) => player.id === selfPlayerId) || null;

    if (currentTurn && currentTurn.includes("-split")) {
      const splitHand = players.find((player) => player.id === currentTurn);
      if (splitHand && splitHand.originalPlayer === selfPlayerId) {
        return splitHand;
      }
    }

    return ownPlayer;
  }, [selfPlayerId, players, currentTurn]);

  const toggleHints = useCallback(() => {
    setHintsEnabled((prev) => !prev);
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      connected,
      reconnecting,
      username,
      balance,
      roomId,
      selfPlayerId,
      players,
      dealer,
      gameState,
      currentTurn,
      messages,
      error,
      gameHistory,
      leaderboard,
      lastBet,
      hintsEnabled,
      autoSkipNewRound,
      createRoom,
      joinRoom,
      startGame,
      placeBet,
      hit,
      stand,
      doubleDown,
      split,
      surrender,
      startNewRound,
      sendMessage,
      leaveRoom,
      kickPlayer,
      restartGame,
      isPlayerTurn,
      getCurrentPlayer,
      toggleHints,
      setAutoSkipNewRound,
      socket,
      isPickingUpCards,
      showVotePrompt,
      voteStatus,
      hasVoted,
      voteReset: () => undefined,
    }),
    [
      connected,
      reconnecting,
      username,
      balance,
      roomId,
      selfPlayerId,
      players,
      dealer,
      gameState,
      currentTurn,
      messages,
      error,
      gameHistory,
      leaderboard,
      lastBet,
      hintsEnabled,
      autoSkipNewRound,
      createRoom,
      joinRoom,
      startGame,
      placeBet,
      hit,
      stand,
      doubleDown,
      split,
      surrender,
      startNewRound,
      sendMessage,
      leaveRoom,
      kickPlayer,
      restartGame,
      isPlayerTurn,
      getCurrentPlayer,
      toggleHints,
      socket,
      isPickingUpCards,
      showVotePrompt,
      voteStatus,
      hasVoted,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
