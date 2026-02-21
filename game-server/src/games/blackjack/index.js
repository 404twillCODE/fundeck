function createDeck() {
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const values = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace"];
  const deck = [];

  suits.forEach((suit) => {
    values.forEach((value) => {
      deck.push({ suit, value });
    });
  });

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function scoreHand(cards) {
  let score = 0;
  let aces = 0;

  cards.forEach((card) => {
    if (card.value === "ace") {
      aces += 1;
      score += 11;
      return;
    }
    if (["jack", "queen", "king"].includes(card.value)) {
      score += 10;
      return;
    }
    score += Number(card.value);
  });

  while (score > 21 && aces > 0) {
    score -= 10;
    aces -= 1;
  }

  return score;
}

function isBlackjack(cards) {
  return cards.length === 2 && scoreHand(cards) === 21;
}

function getEligiblePlayers(room) {
  return room.players.filter((player) => player.connected && player.status !== "spectating");
}

function emitCompatibilityRoomUpdate(io, room) {
  io.to(room.roomCode).emit("room_update", {
    players: room.players,
    gameState: room.blackjack.state,
    dealer: room.blackjack.dealer,
  });
}

function startPlayingRound(io, helpers, room) {
  const bj = room.blackjack;
  bj.state = "playing";

  const activePlayers = getEligiblePlayers(room).filter((player) => player.bet > 0 && player.balance >= 0);
  activePlayers.forEach((player) => {
    player.cards = [bj.deck.pop(), bj.deck.pop()];
    player.score = scoreHand(player.cards);
    if (isBlackjack(player.cards)) {
      player.status = "blackjack";
    }
  });

  bj.dealer.cards = [bj.deck.pop(), bj.deck.pop()];
  bj.dealer.score = scoreHand(bj.dealer.cards);
  bj.currentTurnPlayerId = activePlayers.find((player) => !player.status)?.playerId || "dealer";

  io.to(room.roomCode).emit("betting_ended", { players: room.players });
  io.to(room.roomCode).emit("card_dealt", { to: "dealer", dealer: bj.dealer });

  if (bj.currentTurnPlayerId === "dealer") {
    runDealerTurn(io, helpers, room);
  } else {
    io.to(room.roomCode).emit("player_turn", {
      playerId: bj.currentTurnPlayerId,
      players: room.players,
    });
  }

  emitCompatibilityRoomUpdate(io, room);
  helpers.emitRoomState(room.roomCode);
}

function settleRound(io, helpers, room) {
  const bj = room.blackjack;
  const dealerScore = bj.dealer.score;
  const dealerBusted = dealerScore > 21;
  const dealerBlackjack = isBlackjack(bj.dealer.cards);

  const results = [];

  room.players.forEach((player) => {
    if (player.bet <= 0) return;

    let outcome = "lose";
    let amountChange = -player.bet;

    if (player.status === "busted") {
      outcome = "bust";
    } else if (player.status === "surrendered") {
      outcome = "surrender";
      amountChange = -Math.floor(player.bet / 2);
      player.balance += Math.floor(player.bet / 2);
    } else if (player.status === "blackjack" && !dealerBlackjack) {
      outcome = "blackjack";
      amountChange = Math.floor(player.bet * 1.5);
      player.balance += player.bet + amountChange;
    } else if (dealerBusted) {
      outcome = "win";
      amountChange = player.bet;
      player.balance += player.bet * 2;
    } else if (dealerBlackjack && player.status !== "blackjack") {
      outcome = "lose";
    } else if (player.score > dealerScore) {
      outcome = "win";
      amountChange = player.bet;
      player.balance += player.bet * 2;
    } else if (player.score === dealerScore) {
      outcome = "push";
      amountChange = 0;
      player.balance += player.bet;
    }

    results.push({
      playerId: player.playerId,
      username: player.name,
      outcome,
      amountChange,
      cards: player.cards,
      score: player.score,
    });
  });

  bj.state = "ended";
  bj.currentTurnPlayerId = null;

  if (helpers && typeof helpers.recordBlackjackRound === "function") {
    helpers.recordBlackjackRound(room, results);
  }

  io.to(room.roomCode).emit("game_ended", {
    dealer: bj.dealer,
    players: room.players,
    result: {
      dealerScore,
      dealerHasBlackjack: dealerBlackjack,
      dealerCards: bj.dealer.cards,
      results,
    },
  });

  emitCompatibilityRoomUpdate(io, room);
  helpers.emitRoomState(room.roomCode);
}

function runDealerTurn(io, helpers, room) {
  const bj = room.blackjack;
  bj.currentTurnPlayerId = "dealer";
  io.to(room.roomCode).emit("dealer_turn");

  while (bj.dealer.score < 17) {
    bj.dealer.cards.push(bj.deck.pop());
    bj.dealer.score = scoreHand(bj.dealer.cards);
    io.to(room.roomCode).emit("card_dealt", { to: "dealer", dealer: bj.dealer, isNewCard: true });
  }

  settleRound(io, helpers, room);
}

function moveToNextTurn(io, helpers, room) {
  const bj = room.blackjack;
  const active = room.players.filter((player) => {
    if (player.bet <= 0) return false;
    return !["busted", "stood", "surrendered", "blackjack"].includes(player.status);
  });

  const currentIndex = active.findIndex((player) => player.playerId === bj.currentTurnPlayerId);
  const next = active[currentIndex + 1] || null;

  if (!next) {
    runDealerTurn(io, helpers, room);
    return;
  }

  bj.currentTurnPlayerId = next.playerId;
  io.to(room.roomCode).emit("turn_ended", { nextTurn: bj.currentTurnPlayerId, players: room.players });
  io.to(room.roomCode).emit("player_turn", { playerId: bj.currentTurnPlayerId, players: room.players });
  helpers.emitRoomState(room.roomCode);
}

function createBlackjackState() {
  return {
    state: "waiting",
    dealer: { cards: [], score: 0, status: null },
    deck: [],
    currentTurnPlayerId: null,
    round: 0,
  };
}

function registerBlackjack(registerGame) {
  registerGame({
    id: "blackjack",
    name: "Blackjack",
    createInitialState: createBlackjackState,
    onRoomCreated(room) {
      room.blackjack = createBlackjackState();
    },
    onGameStarted({ io, room, helpers }) {
      if (!room.blackjack) room.blackjack = createBlackjackState();

      room.blackjack.round += 1;
      room.blackjack.state = "betting";
      room.blackjack.dealer = { cards: [], score: 0, status: null };
      room.blackjack.deck = createDeck();
      room.blackjack.currentTurnPlayerId = null;

      room.players.forEach((player) => {
        player.cards = [];
        player.bet = 0;
        player.status = null;
        player.score = 0;
        if (typeof player.balance !== "number") player.balance = 1000;
      });

      io.to(room.roomCode).emit("game_started", {
        gameId: `${room.roomCode}-${room.blackjack.round}`,
        players: room.players,
        dealer: room.blackjack.dealer,
        currentTurn: null,
      });

      emitCompatibilityRoomUpdate(io, room);
      helpers.emitRoomState(room.roomCode);
    },
    registerSocketHandlers({ io, socket, roomAccessor, helpers }) {
      function withRoom(action) {
        const room = roomAccessor(socket);
        if (!room) {
          socket.emit("error", { message: "Room not found" });
          return null;
        }
        action(room);
        helpers.persistRoom(room);
        return room;
      }

      const onPlaceBet = ({ amount } = {}) => {
        withRoom((room) => {
          if (!room.blackjack || room.blackjack.state !== "betting") return;

          const player = room.players.find((item) => item.playerId === socket.data.playerId);
          const bet = Math.floor(Number(amount));
          if (!player || !Number.isFinite(bet) || bet <= 0 || bet > player.balance) {
            socket.emit("error", { message: "Invalid bet amount" });
            return;
          }

          player.bet = bet;
          player.balance -= bet;

          socket.emit("bet_placed", { bet, balance: player.balance });
          io.to(room.roomCode).emit("player_bet_placed", {
            playerId: player.playerId,
            username: player.name,
            bet,
            balance: player.balance,
            players: room.players,
          });

          const eligiblePlayers = getEligiblePlayers(room);
          const allBetsPlaced = eligiblePlayers.length > 0 && eligiblePlayers.every((entry) => entry.bet > 0 || entry.balance <= 0);
          if (allBetsPlaced) {
            startPlayingRound(io, helpers, room);
          }

          emitCompatibilityRoomUpdate(io, room);
          helpers.emitRoomState(room.roomCode);
        });
      };

      const onHit = () => {
        withRoom((room) => {
          const bj = room.blackjack;
          if (!bj || bj.state !== "playing") return;

          const player = room.players.find((entry) => entry.playerId === socket.data.playerId);
          if (!player || bj.currentTurnPlayerId !== player.playerId) {
            socket.emit("error", { message: "Not your turn" });
            return;
          }

          player.cards.push(bj.deck.pop());
          player.score = scoreHand(player.cards);
          if (player.score > 21) player.status = "busted";

          io.to(room.roomCode).emit("card_dealt", {
            to: player.playerId,
            cards: player.cards,
            score: player.score,
            isNewCard: true,
          });

          if (player.status === "busted") moveToNextTurn(io, helpers, room);
          emitCompatibilityRoomUpdate(io, room);
          helpers.emitRoomState(room.roomCode);
        });
      };

      const onStand = () => {
        withRoom((room) => {
          const bj = room.blackjack;
          if (!bj || bj.state !== "playing") return;

          const player = room.players.find((entry) => entry.playerId === socket.data.playerId);
          if (!player || bj.currentTurnPlayerId !== player.playerId) {
            socket.emit("error", { message: "Not your turn" });
            return;
          }

          player.status = "stood";
          moveToNextTurn(io, helpers, room);
          emitCompatibilityRoomUpdate(io, room);
          helpers.emitRoomState(room.roomCode);
        });
      };

      const onDoubleDown = () => {
        withRoom((room) => {
          const bj = room.blackjack;
          const player = room.players.find((entry) => entry.playerId === socket.data.playerId);
          if (!bj || bj.state !== "playing" || !player || bj.currentTurnPlayerId !== player.playerId) {
            socket.emit("error", { message: "Cannot double down now" });
            return;
          }

          if (player.cards.length !== 2 || player.balance < player.bet) {
            socket.emit("error", { message: "Double down unavailable" });
            return;
          }

          player.balance -= player.bet;
          player.bet *= 2;
          player.cards.push(bj.deck.pop());
          player.score = scoreHand(player.cards);
          player.status = player.score > 21 ? "busted" : "stood";

          io.to(room.roomCode).emit("card_dealt", {
            to: player.playerId,
            cards: player.cards,
            score: player.score,
            isNewCard: true,
          });

          moveToNextTurn(io, helpers, room);
          emitCompatibilityRoomUpdate(io, room);
          helpers.emitRoomState(room.roomCode);
        });
      };

      const onSurrender = () => {
        withRoom((room) => {
          const bj = room.blackjack;
          const player = room.players.find((entry) => entry.playerId === socket.data.playerId);
          if (!bj || bj.state !== "playing" || !player || bj.currentTurnPlayerId !== player.playerId) {
            socket.emit("error", { message: "Cannot surrender now" });
            return;
          }

          if (player.cards.length !== 2) {
            socket.emit("error", { message: "Surrender only allowed on first action" });
            return;
          }

          player.status = "surrendered";
          moveToNextTurn(io, helpers, room);
          emitCompatibilityRoomUpdate(io, room);
          helpers.emitRoomState(room.roomCode);
        });
      };

      const onSplit = () => {
        socket.emit("error", { message: "Split is not available in this build." });
      };

      const onNewRound = () => {
        withRoom((room) => {
          if (room.hostPlayerId !== socket.data.playerId) {
            socket.emit("error", { message: "Only the host can start a new round" });
            return;
          }

          room.blackjack = createBlackjackState();
          room.blackjack.round += 1;
          room.blackjack.state = "betting";
          room.blackjack.deck = createDeck();

          room.players.forEach((player) => {
            player.cards = [];
            player.bet = 0;
            player.status = null;
            player.score = 0;
            if (player.balance <= 0) player.balance = 1000;
          });

          io.to(room.roomCode).emit("new_round", {
            players: room.players,
            dealer: room.blackjack.dealer,
            isAutoSkip: false,
          });

          emitCompatibilityRoomUpdate(io, room);
          helpers.emitRoomState(room.roomCode);
        });
      };

      socket.on("blackjack:place_bet", onPlaceBet);
      socket.on("blackjack:hit", onHit);
      socket.on("blackjack:stand", onStand);
      socket.on("blackjack:double_down", onDoubleDown);
      socket.on("blackjack:split", onSplit);
      socket.on("blackjack:surrender", onSurrender);
      socket.on("blackjack:new_round", onNewRound);

      socket.on("place_bet", onPlaceBet);
      socket.on("hit", onHit);
      socket.on("stand", onStand);
      socket.on("double_down", onDoubleDown);
      socket.on("split", onSplit);
      socket.on("surrender", onSurrender);
      socket.on("new_round", onNewRound);
    },
  });
}

module.exports = {
  registerBlackjack,
};
