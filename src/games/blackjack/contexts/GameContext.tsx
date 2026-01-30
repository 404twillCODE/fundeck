"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";

import { useAuth } from "@/games/blackjack/contexts/AuthContext";
import type { Dealer, GameState, Message, Player } from "@/games/blackjack/types";

 type VoteStatus = {
   votesReceived: number;
   totalPlayers: number;
 };

 type GameContextValue = {
   connected: boolean;
   username: string;
   balance: number;
   roomId: string | null;
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
   createRoom: (usernameOverride?: string | null, initialBalance?: number | null) => void;
   joinRoom: (roomId: string, usernameOverride?: string | null, initialBalance?: number | null) => void;
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
  /** True when socket disconnected and is attempting to reconnect (show toast). */
  reconnecting: boolean;
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
  serverUrl: string;
  onReconnectFailed?: () => void;
};

export const GameProvider = ({ children, serverUrl, onReconnectFailed }: GameProviderProps) => {
   const { username: authUsername, balance: authBalance, setBalance: updateAuthBalance } = useAuth();
   const [socket, setSocket] = useState<Socket | null>(null);
   const [connected, setConnected] = useState(false);
   const [reconnecting, setReconnecting] = useState(false);
   const [username, setUsername] = useState(authUsername || "");
   const [balance, setBalance] = useState(authBalance || 1000);
   const [roomId, setRoomId] = useState<string | null>(null);
   const [players, setPlayers] = useState<Player[]>([]);
   const [dealer, setDealer] = useState<Dealer>({ cards: [], score: 0 });
   const [gameState, setGameState] = useState<GameState>("waiting");
   const [currentTurn, setCurrentTurn] = useState<string | null>(null);
   const [messages, setMessages] = useState<Message[]>([]);
   const [error, setError] = useState<string | null>(null);
   const [gameHistory, setGameHistory] = useState<Array<Record<string, unknown>>>([]);
   const [leaderboard, setLeaderboard] = useState<Array<Record<string, unknown>>>([]);
   const [lastBet, setLastBet] = useState(0);
   const [hintsEnabled, setHintsEnabled] = useState(true);
   const [autoSkipNewRound, setAutoSkipNewRound] = useState(true);
   const [isPickingUpCards, setIsPickingUpCards] = useState(false);
   const [showVotePrompt, setShowVotePrompt] = useState(false);
   const [voteStatus, setVoteStatus] = useState<VoteStatus | null>(null);
   const [hasVoted, setHasVoted] = useState(false);

   useEffect(() => {
     if (authUsername) {
       setUsername(authUsername);
     }
     if (authBalance !== undefined) {
       setBalance(authBalance);
     }
   }, [authUsername, authBalance]);

   const addMessage = (message: Message) => {
     setMessages((prevMessages) => [...prevMessages, message]);
   };

   const startNewRound = useCallback(() => {
     if (!connected || !roomId || !socket) return;
     socket.emit("new_round", { roomId });
   }, [connected, roomId, socket]);

   useEffect(() => {
     if (!serverUrl) return;
     const newSocket = io(serverUrl, {
       transports: ["polling", "websocket"],
       reconnection: true,
       reconnectionDelay: 2000,
       reconnectionAttempts: 10,
       timeout: 30000,
       forceNew: true,
       upgrade: true,
       rememberUpgrade: false,
     });

     setSocket(newSocket);

     newSocket.on("connect", () => {
       setConnected(true);
       setReconnecting(false);
       setError(null);
     });

     newSocket.on("connect_error", (socketError) => {
       setConnected(false);
       const errorMsg = socketError.message || "Connection refused";
       setError(
         `Could not reach the blackjack server: ${errorMsg}. The host PC may be offline or the Playit tunnel may be down. Check the server URL and try again.`,
       );
     });

     newSocket.on("reconnect", () => {
       setConnected(true);
       setReconnecting(false);
       setError(null);
     });

     newSocket.on("reconnect_failed", () => {
       setReconnecting(false);
       setError("Reconnection failed. Use Retry or refresh the page.");
       onReconnectFailed?.();
     });

     newSocket.on("disconnect", (reason) => {
       setConnected(false);
       setReconnecting(true);
       if (reason === "io server disconnect") {
         setError("Disconnected by server. Attempting to reconnect…");
       }
     });

     newSocket.on("error", (data: { message?: string }) => {
       setError(data.message || "An error occurred");
       setTimeout(() => setError(null), 5000);
     });

     return () => {
       newSocket.disconnect();
     };
   }, [serverUrl, onReconnectFailed]);

   useEffect(() => {
     if (!socket) return;

     socket.on("room_joined", (data) => {
       if (!data) return;
       setRoomId(data.roomId);
       setPlayers(data.players || []);
       setGameState(data.gameState || "waiting");
       setError(null);

       const playerNames = data.players ? data.players.map((p: Player) => p.username).join(", ") : "";
       addMessage({
         content: `Room joined. Current players: ${playerNames}`,
         type: "system",
         timestamp: Date.now(),
       });
     });

     socket.on("player_joined", (data) => {
       if (!data || !data.players) return;
       setPlayers(data.players);

       const newPlayer = data.players[data.players.length - 1];
       if (newPlayer) {
         addMessage({
           content: `${newPlayer.username} joined the room`,
           type: "system",
           timestamp: Date.now(),
         });
       }
     });

     socket.on("player_left", (data) => {
       if (!data) return;
       setPlayers(data.players || []);

       if (data.leftPlayer) {
         const message = data.wasHost
           ? `${data.leftPlayer} (host) disconnected from the room`
           : `${data.leftPlayer} disconnected from the room`;
         addMessage({
           content: message,
           type: "system",
           timestamp: Date.now(),
         });
       }
     });

     socket.on("room_update", (data) => {
       if (!data) return;
       if (data.players) setPlayers(data.players);
       if (data.gameState) setGameState(data.gameState);
       if (data.dealer) setDealer(data.dealer);
     });

     socket.on("game_state_update", (data) => {
       if (!data) return;
       if (data.gameState) setGameState(data.gameState);
       if (data.players) setPlayers(data.players);
       if (data.dealer) setDealer(data.dealer);

       if (data.gameState === "waiting") {
         addMessage({
           content: "Game reset to waiting state - all players disconnected",
           type: "system",
           timestamp: Date.now(),
         });
       }
     });

     socket.on("player_kicked", (data) => {
       if (!data) return;
       setPlayers(data.players || []);

       if (data.kickedPlayer) {
         addMessage({
           content: `${data.kickedPlayer} was kicked from the room`,
           type: "system",
           timestamp: Date.now(),
         });
       }
     });

     return () => {
       socket.off("room_joined");
       socket.off("player_joined");
       socket.off("player_left");
       socket.off("player_kicked");
       socket.off("room_update");
       socket.off("game_state_update");
     };
   }, [socket]);

   useEffect(() => {
     if (!socket) return;

     const handleKicked = (data: { message?: string }) => {
       setError(data.message || "You have been kicked from the room");
       setRoomId(null);
       setPlayers([]);
       setDealer({ cards: [], score: 0 });
       setGameState("waiting");
       setCurrentTurn(null);
       setMessages([]);
     };

     socket.on("kicked", handleKicked);

     return () => {
       socket.off("kicked", handleKicked);
     };
   }, [socket]);

   useEffect(() => {
     if (!socket) return;

     socket.on("game_started", (data) => {
       if (!data) return;
       setGameState("betting");
       setDealer(data.dealer || { cards: [], score: 0 });
       setPlayers(data.players || []);

       addMessage({
         content: "Game started! Place your bets.",
         type: "system",
         timestamp: Date.now(),
       });
     });

     socket.on("betting_ended", (data) => {
       if (!data) return;
       setPlayers(data.players || []);
       setGameState("playing");

       addMessage({
         content: "All bets placed. Game is starting...",
         type: "system",
         timestamp: Date.now(),
       });
     });

     socket.on("player_bet_placed", (data) => {
       if (!data) return;

       if (data.players && Array.isArray(data.players)) {
         setPlayers([...data.players]);
       }

       if (data.playerId === socket.id && data.balance !== undefined) {
         const newBalance = data.balance;
         setBalance(newBalance);
         updateAuthBalance(newBalance);
       }
     });

     socket.on("bet_placed", (data) => {
       if (!data) return;
       if (data.balance !== undefined) {
         const newBalance = data.balance;
         setBalance(newBalance);
         updateAuthBalance(newBalance);
       }
     });

     socket.on("player_turn", (data) => {
       setCurrentTurn(data.playerId);
       setPlayers(data.players || players);

       const player = data.players && data.players.find((p: Player) => p.id === data.playerId);

       addMessage({
         content: `It's ${player ? player.username : "unknown player"}'s turn`,
         type: "system",
         timestamp: Date.now(),
       });
     });

     let lastAutoSkipKey: string | null = null;

     const handlePlayerAutoSkipped = (data: { playerId: string; players: Player[]; timestamp?: number; username?: string }) => {
       if (!data) return;

       const skipKey = `${data.playerId}-${data.timestamp || Date.now()}`;
       if (lastAutoSkipKey === skipKey) {
         return;
       }

       lastAutoSkipKey = skipKey;

       setPlayers(data.players || players);
       setCurrentTurn(null);

       const playerName = data.username || (data.players && data.players.find((p) => p.id === data.playerId)?.username) || "A player";

       addMessage({
         content: `${playerName} was automatically skipped (30 seconds elapsed)`,
         type: "system",
         timestamp: Date.now(),
       });
     };

     socket.on("player_auto_skipped", handlePlayerAutoSkipped);

     socket.on("card_dealt", (data) => {
       if (!data) return;
       if (data.to === "dealer") {
         setDealer(data.dealer || { cards: [], score: 0 });
       } else if (data.to && data.cards) {
         setPlayers((prev) =>
           prev.map((player) =>
             player.id === data.to ? { ...player, cards: data.cards, score: data.score || 0 } : player,
           ),
         );
       }
     });

     socket.on("turn_ended", (data) => {
       if (!data) return;
       setCurrentTurn(data.nextTurn);
       setPlayers(data.players || []);
     });

     socket.on("dealer_turn", () => {
       setCurrentTurn("dealer");
       addMessage({
         content: "Dealer's turn",
         type: "system",
         timestamp: Date.now(),
       });
     });

     socket.on("game_reset", (data) => {
       if (!data) return;

       setShowVotePrompt(false);
       setVoteStatus(null);
       setHasVoted(false);
       setGameState("waiting");
       setDealer({ cards: [], score: 0 });
       setCurrentTurn(null);
       setPlayers(data.players || []);
       setGameHistory([]);

       const currentPlayer = data.players?.find((player: Player) => player.id === socket.id);
       if (currentPlayer) {
         const newBalance = currentPlayer.balance;
         setBalance(newBalance);
         updateAuthBalance(newBalance);
       }

       addMessage({
         content: data.message || "Game has been reset! Everyone starts with $1000 again.",
         type: "system",
         timestamp: Date.now(),
       });
     });

     socket.on("game_ended", (data) => {
       if (!data) return;

       const finalData = data;

       setIsPickingUpCards(true);

       setTimeout(() => {
         setGameState("ended");
         setDealer(finalData.dealer || { cards: [], score: 0 });
         setPlayers(finalData.players || []);
         setCurrentTurn(null);
         setIsPickingUpCards(false);

         const historyEntry = {
           id: Date.now(),
           dealer: finalData.dealer,
           players: finalData.players,
           results: finalData.result?.results || [],
           timestamp: Date.now(),
           allPlayersLost: finalData.allPlayersLost || false,
         };
         setGameHistory((prev) => [historyEntry, ...prev].slice(0, 10));

         let resultMessage = "Round ended. Check your results!";
         if (finalData.allPlayersLost) {
           resultMessage = "All players ran out of money!";
         } else if (finalData.result && finalData.result.results) {
           const resultSummary = finalData.result.results
             .map((result: { username: string; outcome: string; amountChange: number }) => `${result.username}: ${result.outcome} (${result.amountChange >= 0 ? "+" : ""}${result.amountChange})`)
             .join(", ");
           resultMessage = `Round ended. Results: ${resultSummary}`;
         }

         addMessage({
           content: resultMessage,
           type: "system",
           timestamp: Date.now(),
         });

         if (finalData.allPlayersLost) {
           return;
         }

         if (autoSkipNewRound && socket.id === players[0]?.id) {
           setTimeout(() => {
             startNewRound();
           }, 500);
         }
       }, 2000);
     });

     socket.on("vote_to_continue", (data) => {
       if (!data) return;
       setShowVotePrompt(true);
       setHasVoted(false);
       setVoteStatus(null);
       addMessage({
         content: data.message || "All players ran out of money! Vote to continue and reset the game.",
         type: "system",
         timestamp: Date.now(),
       });
     });

     socket.on("vote_status", (data) => {
       if (!data) return;
       setVoteStatus(data);
     });

     socket.on("new_round", (data) => {
       if (!data) return;

       setGameState("betting");
       if (data.players && Array.isArray(data.players)) {
         setPlayers(data.players);
       }
       setDealer(data.dealer || { cards: [], score: 0 });

       const manualStartMessage = data.isAutoSkip === false ? " (Manual start by host)" : "";
       addMessage({
         content: `New round started${manualStartMessage}. Place your bets!`,
         type: "system",
         timestamp: Date.now(),
       });
     });

     socket.on("message", (data) => {
       addMessage(data);
     });

     socket.on("leaderboard_updated", (data) => {
       setLeaderboard(data.leaderboard);
     });

     socket.on("player_split", (data) => {
       if (!data) return;
       setPlayers(data.players || []);

       addMessage({
         content: `${data.players.find((p: Player) => p.id === data.playerId)?.username || "Player"} split their hand`,
         type: "system",
         timestamp: Date.now(),
       });
     });

     socket.on("player_spectating", (data) => {
       if (!data) return;

       setPlayers((prev) =>
         prev.map((player) =>
           player.id === data.playerId ? { ...player, status: "spectating" } : player,
         ),
       );

       addMessage({
         content: `${data.username} is now spectating the game`,
         type: "system",
         timestamp: Date.now(),
       });
     });

     return () => {
       socket.off("game_started");
       socket.off("betting_ended");
       socket.off("player_bet_placed");
       socket.off("bet_placed");
       socket.off("card_dealt");
       socket.off("player_turn");
       socket.off("turn_ended");
       socket.off("dealer_turn");
       socket.off("game_ended");
       socket.off("game_reset");
       socket.off("new_round");
       socket.off("message");
       socket.off("leaderboard_updated");
       socket.off("player_split");
       socket.off("player_spectating");
       socket.off("player_auto_skipped");
       socket.off("vote_to_continue");
       socket.off("vote_status");
     };
   }, [socket, autoSkipNewRound, players, startNewRound]);

   const createRoom = (usernameOverride: string | null = null, initialBalanceOverride: number | null = null) => {
     if (!connected || !socket) {
       setError("Not connected to server. Please wait a moment and try again.");
       return;
     }

     if (!socket.connected) {
       setError("Connection lost. Please refresh the page.");
       return;
     }

     const finalUsername = usernameOverride || authUsername || username;
     const finalBalance = initialBalanceOverride !== null ? initialBalanceOverride : authBalance || balance || 1000;

     if (!finalUsername) {
       setError("Username is required. Please sign in or continue as guest.");
       return;
     }

     setUsername(finalUsername);
     setBalance(finalBalance);
     socket.emit("create_room", { username: finalUsername, balance: finalBalance });
   };

   const joinRoom = (roomCode: string, usernameOverride: string | null = null, initialBalanceOverride: number | null = null) => {
     if (!connected || !socket) return;

     const finalUsername = usernameOverride || authUsername || username;
     const finalBalance = initialBalanceOverride !== null ? initialBalanceOverride : authBalance || balance || 1000;

     if (!finalUsername) {
       setError("Username is required. Please sign in or continue as guest.");
       return;
     }

     setUsername(finalUsername);
     setBalance(finalBalance);
     socket.emit("join_room", { roomId: roomCode, username: finalUsername, balance: finalBalance });
   };

   const startGame = () => {
     if (!connected || !roomId || !socket) return;
     socket.emit("start_game", { roomId });
   };

   const placeBet = (amount: number) => {
     if (!connected || !roomId || !socket) return;

     setPlayers((prevPlayers) =>
       prevPlayers.map((player) =>
         player.id === socket.id
           ? { ...player, bet: amount, balance: player.balance - amount }
           : player,
       ),
     );

     socket.emit("place_bet", { roomId, amount });
     setLastBet(amount);
   };

   const hit = () => {
     if (!connected || !roomId || !socket) return;

     if (currentTurn && currentTurn.includes("-split")) {
       const originalPlayerId = currentTurn.split("-")[0];
       if (originalPlayerId === socket.id) {
         socket.emit("hit", { roomId, handId: currentTurn });
       }
     } else if (currentTurn === socket.id) {
       socket.emit("hit", { roomId });
     }
   };

   const stand = () => {
     if (!connected || !roomId || !socket) return;

     if (currentTurn && currentTurn.includes("-split")) {
       const originalPlayerId = currentTurn.split("-")[0];
       if (originalPlayerId === socket.id) {
         socket.emit("stand", { roomId, handId: currentTurn });
       }
     } else if (currentTurn === socket.id) {
       socket.emit("stand", { roomId });
     }
   };

   const doubleDown = () => {
     if (!connected || !roomId || !socket) return;

     if (currentTurn && currentTurn.includes("-split")) {
       const originalPlayerId = currentTurn.split("-")[0];
       if (originalPlayerId === socket.id) {
         socket.emit("double_down", { roomId, handId: currentTurn });
       }
     } else if (currentTurn === socket.id) {
       socket.emit("double_down", { roomId });
     }
   };

   const split = () => {
     if (!connected || !roomId || !socket || currentTurn !== socket.id) return;
     if (currentTurn.includes("-split")) return;
     socket.emit("split", { roomId });
   };

   const surrender = () => {
     if (!connected || !roomId || !socket) return;

     if (currentTurn && currentTurn.includes("-split")) {
       const originalPlayerId = currentTurn.split("-")[0];
       if (originalPlayerId === socket.id) {
         socket.emit("surrender", { roomId, handId: currentTurn });
       }
     } else if (currentTurn === socket.id) {
       socket.emit("surrender", { roomId });
     }
   };

   const sendMessage = (message: string) => {
     if (!connected || !roomId || !socket) return;
     socket.emit("send_message", { roomId, message, sender: username });
   };

   const leaveRoom = () => {
     if (!connected || !roomId || !socket) return;
     socket.emit("leave_room", { roomId });
     setRoomId(null);
     setPlayers([]);
     setDealer({ cards: [], score: 0 });
     setGameState("waiting");
     setCurrentTurn(null);
     setMessages([]);
   };

   const kickPlayer = (playerId: string) => {
     if (!connected || !roomId || !socket || !socket.connected) return;
     socket.emit("kick_player", { roomId, playerId });
   };

   const restartGame = () => {
     if (!connected || !roomId || !socket || !socket.connected) {
       alert("Error: Not connected or no room ID. Please refresh the page.");
       return;
     }

     socket.emit("restart_game", { roomId });

     socket.once("error", (err: { message?: string }) => {
       if (err?.message) {
         alert(`Error: ${err.message}`);
       }
     });
   };

   const isPlayerTurn = () => {
     if (!socket || !currentTurn) return false;
     if (currentTurn === socket.id) return true;
     if (currentTurn.includes("-split")) {
       const originalPlayerId = currentTurn.split("-")[0];
       return originalPlayerId === socket.id;
     }
     return false;
   };

   const getCurrentPlayer = () => {
     if (!socket || !players) return null;

     const player = players.find((p) => p.id === socket.id) || null;

     if (currentTurn && currentTurn.includes("-split")) {
       const splitHand = players.find((p) => p.id === currentTurn);
       if (splitHand && splitHand.originalPlayer === socket.id) {
         return splitHand;
       }
     }

     return player;
   };

   const toggleHints = () => {
     setHintsEnabled((prev) => !prev);
   };

   const value: GameContextValue = {
     connected,
     username,
     balance,
     roomId,
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
     voteReset: (vote: string) => {
       if (!socket || !roomId) return;
       socket.emit("vote_reset", { roomId, vote });
       setHasVoted(true);
     },
     reconnecting,
   };

   return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
 };
