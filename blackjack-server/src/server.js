const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('./supabase');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Game state
const rooms = {};
const leaderboard = [];
const turnTimers = {}; // Store timers for auto-skipping players after 30 seconds
const autoSkippedPlayers = {}; // Track which players have been auto-skipped to prevent duplicate messages
const resetVotes = {}; // Track votes for game reset: { roomId: { playerId: 'continue' | 'reset' } }
const pendingNextTurnTimers = {}; // Store pending nextPlayerTurn timeouts to prevent race conditions

// Card deck utilities
const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king', 'ace'];

// Create a new deck of cards
const createDeck = () => {
  const deck = [];
  for (const suit of suits) {
    for (const value of values) {
      deck.push({ suit, value });
    }
  }
  return deck;
};

// Shuffle a deck of cards
const shuffleDeck = (deck) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};

// Calculate the best score for a hand (handling aces)
// In blackjack, aces can be worth 11 or 1, and we always choose the best value
// This function returns the highest possible score without busting (over 21)
const calculateHandValue = (cards) => {
  if (!cards || cards.length === 0) return 0;
  
  let score = 0;
  let aces = 0;
  
  // First pass: Count all non-ace cards and count aces
  for (const card of cards) {
    if (card.value === 'ace') {
      aces++;
      // Start with ace as 11 (best case scenario)
      score += 11;
    } else if (['king', 'queen', 'jack'].includes(card.value)) {
      score += 10;
    } else {
      score += parseInt(card.value);
    }
  }
  
  // Second pass: If we bust, convert aces from 11 to 1 (subtract 10 per ace)
  // This ensures we always get the best possible score without busting
  // Example: A, A, 9 = 11+11+9 = 31, then convert: 21+9 = 30, then 11+9 = 20 ✓
  while (score > 21 && aces > 0) {
    score -= 10; // Convert one ace from 11 to 1
    aces--;
  }
  
  return score;
};

// Check for blackjack (21 with exactly 2 cards)
const isBlackjack = (cards) => {
  return cards.length === 2 && calculateHandValue(cards) === 21;
};

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Test event to verify connection
  socket.on('ping', (data) => {
    console.log(`Ping received from ${socket.id}:`, data);
    socket.emit('pong', { message: 'Server is alive', timestamp: Date.now() });
  });
  
  // Get leaderboard
  socket.on('get_leaderboard', async () => {
    try {
      const leaderboardData = await fetchLeaderboardFromSupabase(10);
      socket.emit('leaderboard_updated', {
        leaderboard: leaderboardData
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      socket.emit('leaderboard_updated', {
        leaderboard: leaderboard.slice(0, 10)
      });
    }
  });
  
  // Vote to continue after all players lose
  socket.on('vote_reset', ({ roomId, vote }) => {
    if (!rooms[roomId] || !rooms[roomId].players.find(p => p.id === socket.id)) {
      socket.emit('error', { message: 'Room not found or you are not in this room' });
      return;
    }
    
    // Initialize votes for this room if needed
    if (!resetVotes[roomId]) {
      resetVotes[roomId] = {};
    }
    
    // Record the vote (only 'continue' is valid now)
    resetVotes[roomId][socket.id] = 'continue';
    
    const room = rooms[roomId];
    const activePlayers = room.players.filter(p => !p.originalPlayer);
    const votes = resetVotes[roomId];
    const voteCount = Object.keys(votes).length;
    
    // Notify all players of current vote status
    io.to(roomId).emit('vote_status', {
      votes: votes,
      totalPlayers: activePlayers.length,
      votesReceived: voteCount
    });
    
    // Check if all players have voted
    if (voteCount >= activePlayers.length) {
      // All players have voted - reset the game
      resetGameAfterVote(roomId);
    }
  });
  
  // Log all events for debugging
  const originalEmit = socket.emit.bind(socket);
  socket.emit = function(event, ...args) {
    if (event === 'restart_game' || event === 'game_reset') {
      console.log(`[DEBUG] Emitting ${event} to ${socket.id}:`, args);
    }
    return originalEmit(event, ...args);
  };
  
  // Create a new room
  socket.on('create_room', ({ username, balance }) => {
    try {
      if (!username) {
        socket.emit('error', { message: 'Username is required' });
        return;
      }
      
      const roomId = uuidv4().substring(0, 6).toUpperCase();
    
    rooms[roomId] = {
      id: roomId,
      players: [{
        id: socket.id,
        username,
        balance,
        cards: [],
        bet: 0,
        status: null,
        score: 0,
        hasCrown: false
      }],
      dealer: {
        cards: [],
        score: 0
      },
      gameState: 'waiting',
      deck: [],
      currentTurn: null
    };
    
    socket.join(roomId);
      socket.emit('room_joined', {
        roomId,
        players: rooms[roomId].players,
        gameState: 'waiting'
      });
      
      console.log(`Room created: ${roomId} by ${username}`);
    } catch (error) {
      console.error('❌ Error creating room:', error);
      socket.emit('error', { message: 'Failed to create room' });
    }
  });
  
  // Join an existing room
  socket.on('join_room', ({ roomId, username, balance }) => {
    try {
      if (!roomId || !username) {
        socket.emit('error', { message: 'Room ID and username are required' });
        return;
      }
      
      // Check if room exists
      if (!rooms[roomId]) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }
    
    // Check if game is in progress
    if (rooms[roomId].gameState !== 'waiting') {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }
    
    // Add player to room
    const player = {
      id: socket.id,
      username,
      balance,
      cards: [],
      bet: 0,
      status: null,
      score: 0
    };
    
    rooms[roomId].players.push(player);
    
    socket.join(roomId);
    
    // Notify player they've joined
    socket.emit('room_joined', {
      roomId,
      players: rooms[roomId].players,
      gameState: 'waiting'
    });
    
    // Notify others in the room
    socket.to(roomId).emit('player_joined', {
      players: rooms[roomId].players
    });
    
      console.log(`Player ${username} joined room ${roomId}`);
    } catch (error) {
      console.error('❌ Error joining room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  });
  
  // Start the game
  socket.on('start_game', ({ roomId }) => {
    if (!rooms[roomId]) return;
    
    // Check if player is the host (first player)
    if (rooms[roomId].players[0].id !== socket.id) {
      socket.emit('error', { message: 'Only the host can start the game' });
      return;
    }
    
    // Need at least 2 players
    if (rooms[roomId].players.length < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }
    
    // Create and shuffle deck
    rooms[roomId].deck = shuffleDeck(createDeck());
    rooms[roomId].gameState = 'betting';
    
    // Emit game started event to all players in room
    io.to(roomId).emit('game_started', {
      gameId: uuidv4(),
      players: rooms[roomId].players,
      dealer: rooms[roomId].dealer,
      currentTurn: null
    });
    
    console.log(`Game started in room ${roomId}`);
  });
  
  // Place a bet
  socket.on('place_bet', ({ roomId, amount }) => {
    if (!rooms[roomId] || rooms[roomId].gameState !== 'betting') return;
    
    // Find the player
    const playerIndex = rooms[roomId].players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;
    
    const player = rooms[roomId].players[playerIndex];
    
    // Validate bet amount
    if (amount <= 0 || amount > player.balance) {
      socket.emit('error', { message: 'Invalid bet amount' });
      return;
    }
    
    // Update player's bet
    player.bet = amount;
    player.balance -= amount;
    rooms[roomId].players[playerIndex] = player;
    
    console.log(`💰 [place_bet] Player ${player.username} placed bet of $${amount} in room ${roomId}`);
    console.log(`💰 [place_bet] Updated players:`, rooms[roomId].players.map(p => ({
      username: p.username,
      bet: p.bet,
      balance: p.balance
    })));
    
    // Emit to the player that their bet was placed successfully
    socket.emit('bet_placed', {
      bet: amount,
      balance: player.balance
    });
    
    // Emit to all players in the room that a bet was placed (for real-time betting status updates)
    io.to(roomId).emit('player_bet_placed', {
      playerId: socket.id,
      username: player.username,
      bet: amount,
      players: rooms[roomId].players
    });
    
    console.log(`💰 [place_bet] Emitted player_bet_placed to room ${roomId}`);
    
    // Check if all players have placed bets or have zero balance
    const allPlayersReady = rooms[roomId].players.every(p => 
      p.bet > 0 || p.balance === 0
    );
    
    if (allPlayersReady) {
      // Deal initial cards
      dealInitialCards(roomId);
      
      // Update game state
      rooms[roomId].gameState = 'playing';
      
      // Emit betting ended event
      io.to(roomId).emit('betting_ended', {
        players: rooms[roomId].players
      });
      
      // Emit dealer cards
      io.to(roomId).emit('card_dealt', {
        to: 'dealer',
        dealer: rooms[roomId].dealer
      });
    }
  });
  
  // Hit (draw a card)
  socket.on('hit', ({ roomId, handId }) => {
    if (!rooms[roomId] || rooms[roomId].gameState !== 'playing') return;
    
    // Determine which hand ID to use
    const targetHandId = handId || socket.id;
    
    // Check if it's player's turn
    if (rooms[roomId].currentTurn !== targetHandId) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    // Clear the turn timer since player is taking action
    clearTurnTimer(roomId);
    
    // Find the player or split hand
    const playerIndex = rooms[roomId].players.findIndex(p => p.id === targetHandId);
    if (playerIndex === -1) return;
    
    const player = rooms[roomId].players[playerIndex];
    
    // Deal a card to the player
    const card = rooms[roomId].deck.pop();
    player.cards.push(card);
    
    // Calculate new score
    player.score = calculateHandValue(player.cards);
    
    // Check if player busted
    if (player.score > 21) {
      player.status = 'busted';
    }
    
    // Update player in room
    rooms[roomId].players[playerIndex] = player;
    
    // Emit card dealt event immediately (animation is handled client-side)
    io.to(roomId).emit('card_dealt', {
      to: targetHandId,
      cards: [...player.cards],
      score: player.score,
      isNewCard: true
    });
    
    // Move to next player's turn if busted (with small delay for bust animation)
    if (player.score > 21) {
      // Clear any existing pending nextPlayerTurn
      clearPendingNextTurn(roomId);
      // Set a new timeout to move to next player
      pendingNextTurnTimers[roomId] = setTimeout(() => {
        delete pendingNextTurnTimers[roomId];
        nextPlayerTurn(roomId);
      }, 500);
    } else {
      // Restart the timer since player is still in their turn
      startTurnTimer(roomId);
    }
  });
  
  // Stand (end turn)
  socket.on('stand', ({ roomId, handId }) => {
    if (!rooms[roomId] || rooms[roomId].gameState !== 'playing') return;
    
    // Determine which hand ID to use
    const targetHandId = handId || socket.id;
    
    // Check if it's player's turn
    if (rooms[roomId].currentTurn !== targetHandId) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    // Clear the turn timer since player is taking action
    clearTurnTimer(roomId);
    
    // Find the player or split hand
    const playerIndex = rooms[roomId].players.findIndex(p => p.id === targetHandId);
    if (playerIndex === -1) return;
    
    const player = rooms[roomId].players[playerIndex];
    
    // Recalculate score from cards to catch any race conditions (e.g., hit then stand quickly)
    player.score = calculateHandValue(player.cards);
    
    // Check if player busted - if so, they can't stand, they're already busted
    if (player.score > 21) {
      player.status = 'busted';
      rooms[roomId].players[playerIndex] = player;
      
      // Clear any pending nextPlayerTurn from hit handler to prevent race conditions
      clearPendingNextTurn(roomId);
      
      // Emit updated player state
      io.to(roomId).emit('card_dealt', {
        to: targetHandId,
        cards: [...player.cards],
        score: player.score,
        isNewCard: false
      });
      
      // Move to next player's turn immediately (no delay needed since we already detected bust)
      // Use a very short delay just to ensure state is propagated
      pendingNextTurnTimers[roomId] = setTimeout(() => {
        delete pendingNextTurnTimers[roomId];
        nextPlayerTurn(roomId);
      }, 100);
      return;
    }
    
    // Player is not busted, they can stand
    player.status = 'stood';
    
    // Update player in room
    rooms[roomId].players[playerIndex] = player;
    
    // Move to next player's turn
    nextPlayerTurn(roomId);
  });
  
  // Double down
  socket.on('double_down', ({ roomId, handId }) => {
    if (!rooms[roomId] || rooms[roomId].gameState !== 'playing') return;
    
    // Determine which hand ID to use
    const targetHandId = handId || socket.id;
    
    // Check if it's player's turn
    if (rooms[roomId].currentTurn !== targetHandId) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    // Clear the turn timer since player is taking action
    clearTurnTimer(roomId);
    
    // Find the player or split hand
    const playerIndex = rooms[roomId].players.findIndex(p => p.id === targetHandId);
    if (playerIndex === -1) return;
    
    const player = rooms[roomId].players[playerIndex];
    
    // Check if player has only 2 cards (first action)
    if (player.cards.length !== 2) {
      socket.emit('error', { message: 'Can only double down on first action' });
      return;
    }
    
    // For split hands, use the original player's balance
    let originalPlayer = player;
    if (player.originalPlayer) {
      const originalPlayerIndex = rooms[roomId].players.findIndex(p => p.id === player.originalPlayer);
      if (originalPlayerIndex !== -1) {
        originalPlayer = rooms[roomId].players[originalPlayerIndex];
      }
    }
    
    // Check if player has enough balance
    if (originalPlayer.balance < player.bet) {
      socket.emit('error', { message: 'Not enough balance to double down' });
      return;
    }
    
    // Double the bet
    originalPlayer.balance -= player.bet;
    player.bet *= 2;
    
    // Deal one more card
    const card = rooms[roomId].deck.pop();
    player.cards.push(card);
    
    // Calculate new score
    player.score = calculateHandValue(player.cards);
    
    // Set status based on score
    if (player.score > 21) {
      player.status = 'busted';
    } else {
      player.status = 'stood';
    }
    
    // Update player in room
    rooms[roomId].players[playerIndex] = player;
    
    // If we updated the original player's balance, update that too
    if (player.originalPlayer) {
      const originalPlayerIndex = rooms[roomId].players.findIndex(p => p.id === player.originalPlayer);
      if (originalPlayerIndex !== -1) {
        rooms[roomId].players[originalPlayerIndex] = originalPlayer;
      }
    }
    
    // Emit card dealt event
    io.to(roomId).emit('card_dealt', {
      to: player.id,
      cards: player.cards,
      score: player.score
    });
    
    // Move to next player's turn
    nextPlayerTurn(roomId);
  });
  
  // Split
  socket.on('split', ({ roomId }) => {
    if (!rooms[roomId] || rooms[roomId].gameState !== 'playing') return;
    
    // Check if it's player's turn
    if (rooms[roomId].currentTurn !== socket.id) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    // Clear the turn timer since player is taking action
    clearTurnTimer(roomId);
    
    // Find the player
    const playerIndex = rooms[roomId].players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;
    
    const player = rooms[roomId].players[playerIndex];
    
    // Check if player has exactly 2 cards
    if (player.cards.length !== 2) {
      socket.emit('error', { message: 'Can only split with 2 cards' });
      return;
    }
    
    // Check if cards have the same value
    if (player.cards[0].value !== player.cards[1].value) {
      socket.emit('error', { message: 'Can only split matching cards' });
      return;
    }
    
    // Check if player has enough balance for the additional bet
    if (player.balance < player.bet) {
      socket.emit('error', { message: 'Not enough balance to split' });
      return;
    }
    
    // Create a new hand for the player
    const newHand = {
      id: `${player.id}-split`,
      username: `${player.username} (Split)`,
      balance: player.balance - player.bet,
      cards: [player.cards[1], rooms[roomId].deck.pop()],
      bet: player.bet,
      status: null,
      score: 0,
      originalPlayer: player.id
    };
    
    // Update the original hand
    player.cards = [player.cards[0], rooms[roomId].deck.pop()];
    player.balance -= player.bet;
    
    // Calculate scores for both hands
    player.score = calculateHandValue(player.cards);
    newHand.score = calculateHandValue(newHand.cards);
    
    // Check for blackjack in either hand
    if (isBlackjack(player.cards)) {
      player.status = 'blackjack';
    }
    
    if (isBlackjack(newHand.cards)) {
      newHand.status = 'blackjack';
    }
    
    // Update player in room
    rooms[roomId].players[playerIndex] = player;
    
    // Add the new hand to the players array
    rooms[roomId].players.push(newHand);
    
    // Emit card dealt events for both hands
    io.to(roomId).emit('card_dealt', {
      to: player.id,
      cards: player.cards,
      score: player.score
    });
    
    io.to(roomId).emit('card_dealt', {
      to: newHand.id,
      cards: newHand.cards,
      score: newHand.score
    });
    
    // Emit player split event
    io.to(roomId).emit('player_split', {
      playerId: player.id,
      newHandId: newHand.id,
      players: rooms[roomId].players
    });
    
    // If the first hand has blackjack, move to the split hand (or next player if split also has blackjack)
    if (player.status === 'blackjack') {
      // Check if split hand also has blackjack
      if (newHand.status === 'blackjack') {
        // Both hands have blackjack, move to next player
        nextPlayerTurn(roomId);
      } else {
        // Split hand doesn't have blackjack, move to it
        rooms[roomId].currentTurn = newHand.id;
        io.to(roomId).emit('player_turn', {
          playerId: newHand.id,
          players: rooms[roomId].players
        });
        setTimeout(() => {
          startTurnTimer(roomId);
        }, 100);
      }
    } else {
      // First hand doesn't have blackjack, player continues playing the first hand
      // The turn stays with the original hand (currentTurn is already set to player.id)
      // When they finish the first hand, nextPlayerTurn will automatically move to the split hand
      // Just make sure the turn timer is restarted
      setTimeout(() => {
        startTurnTimer(roomId);
      }, 100);
    }
  });
  
  // Surrender
  socket.on('surrender', ({ roomId, handId }) => {
    if (!rooms[roomId] || rooms[roomId].gameState !== 'playing') return;
    
    // Determine which hand ID to use
    const targetHandId = handId || socket.id;
    
    // Check if it's player's turn
    if (rooms[roomId].currentTurn !== targetHandId) {
      socket.emit('error', { message: 'Not your turn' });
      return;
    }
    
    // Find the player or split hand
    const playerIndex = rooms[roomId].players.findIndex(p => p.id === targetHandId);
    if (playerIndex === -1) return;
    
    const player = rooms[roomId].players[playerIndex];
    
    // Check if player has only 2 cards (first action)
    if (player.cards.length !== 2) {
      socket.emit('error', { message: 'Can only surrender on first action' });
      return;
    }
    
    // Player gets half their bet back
    // For split hands, update the original player's balance
    if (player.originalPlayer) {
      const originalPlayerIndex = rooms[roomId].players.findIndex(p => p.id === player.originalPlayer);
      if (originalPlayerIndex !== -1) {
        rooms[roomId].players[originalPlayerIndex].balance += player.bet / 2;
      }
    } else {
      player.balance += player.bet / 2;
    }
    
    player.bet /= 2;
    player.status = 'surrendered';
    
    // Update player in room
    rooms[roomId].players[playerIndex] = player;
    
    // Move to next player's turn
    nextPlayerTurn(roomId);
  });
  
  // Start a new round
  socket.on('new_round', ({ roomId }) => {
    console.log(`\n📥 Received new_round event for room ${roomId} from socket ${socket.id}`);
    console.log(`   Current game state: ${rooms[roomId]?.gameState || 'ROOM NOT FOUND'}`);
    
    if (!rooms[roomId]) {
      console.log(`❌ Room ${roomId} not found for new_round event`);
      return;
    }
    
    // FIRST: Check if all players are spectating BEFORE checking game state
    // This allows reset even if gameState is 'waiting' (from a previous reset attempt)
    const activePlayers = rooms[roomId].players.filter(p => !p.originalPlayer);
    
    console.log(`\n🔍 [new_round] Checking reset condition at START for room ${roomId}:`);
    console.log(`   Active players (excluding splits): ${activePlayers.length}`);
    activePlayers.forEach(p => {
      const isSpectating = p.status === 'spectating' || (p.balance <= 0 && p.bet === 0);
      console.log(`     - ${p.username}: balance=${p.balance}, bet=${p.bet}, status=${p.status}, isSpectating=${isSpectating}`);
    });
    
    const allPlayersSpectating = activePlayers.length > 0 && activePlayers.every(p => {
      // A player is spectating if they have no balance AND no bet
      return p.status === 'spectating' || (p.balance <= 0 && p.bet === 0);
    });
    
    console.log(`   ✅ All players spectating: ${allPlayersSpectating}`);
    
    if (allPlayersSpectating && activePlayers.length > 0) {
      console.log(`\n🎮🎮🎮 [new_round] RESETTING GAME - All players in room ${roomId} are spectating! 🎮🎮🎮`);
      
      const startingBalance = 1000;
      
      // Reset all players' balances and status
      for (const player of rooms[roomId].players) {
        if (player.originalPlayer) continue;
        
        player.balance = startingBalance;
        player.status = null;
        player.cards = [];
        player.bet = 0;
        player.score = 0;
      }
      
      // Reset dealer
      rooms[roomId].dealer = {
        cards: [],
        score: 0,
        status: null
      };
      
      // Reset game state to waiting
      rooms[roomId].gameState = 'waiting';
      rooms[roomId].currentTurn = null;
      rooms[roomId].deck = [];
      
      // Clear any turn timers
      clearTurnTimer(roomId);
      
      // Notify all players that the game has been reset
      io.to(roomId).emit('game_reset', {
        message: 'All players ran out of money! Game has been reset. Everyone starts with $1000 again.',
        players: rooms[roomId].players,
        gameState: 'waiting'
      });
      
      console.log(`Game reset in room ${roomId}. All players now have $${startingBalance}`);
      return; // Don't continue with new round, since we reset instead
    }
    
    // Only check game state if we're not resetting
    if (rooms[roomId].gameState !== 'ended') {
      console.log(`Cannot start new round in room ${roomId} - game state is ${rooms[roomId].gameState}`);
      return;
    }
    
    // Check if the request is from the host (first player)
    const isHost = rooms[roomId].players.length > 0 && rooms[roomId].players[0].id === socket.id;
    console.log(`New round requested by ${socket.id}, isHost: ${isHost}, first player: ${rooms[roomId].players[0]?.id}`);
    
    // Check if the host has zero balance
    const hostHasZeroBalance = rooms[roomId].players.length > 0 && 
                              rooms[roomId].players[0].balance <= 0;
    
    if (hostHasZeroBalance) {
      console.log(`Host ${rooms[roomId].players[0].username} has zero balance and will be marked as spectating`);
    }
    
    // Reset game state
    rooms[roomId].deck = shuffleDeck(createDeck());
    rooms[roomId].dealer = {
      cards: [],
      score: 0,
      status: null
    };
    
    // Reset player cards, bets, status
    for (let i = 0; i < rooms[roomId].players.length; i++) {
      // Remove split hands
      if (rooms[roomId].players[i].originalPlayer) {
        rooms[roomId].players.splice(i, 1);
        i--; // Adjust index after removal
        continue;
      }
      
      // Mark players with zero balance as spectators
      // BUT: If they have a bet placed, they're still playing (all-in scenario)
      const wasSpectating = rooms[roomId].players[i].status === 'spectating';
      const hasBet = rooms[roomId].players[i].bet > 0;
      
      if (rooms[roomId].players[i].balance <= 0 && !hasBet) {
        // Only mark as spectating if they have no balance AND no bet
        rooms[roomId].players[i].status = 'spectating';
        rooms[roomId].players[i].balance = 0; // Ensure balance is exactly 0
        rooms[roomId].players[i].cards = [];
        rooms[roomId].players[i].bet = 0;
        rooms[roomId].players[i].score = 0;
        
        // Only emit if they weren't already spectating (to avoid duplicate messages)
        if (!wasSpectating) {
          io.to(roomId).emit('player_spectating', {
            playerId: rooms[roomId].players[i].id,
            username: rooms[roomId].players[i].username
          });
        }
      } else {
        // Reset active players
        rooms[roomId].players[i].cards = [];
        rooms[roomId].players[i].bet = 0;
        rooms[roomId].players[i].status = null; // Reset status
        rooms[roomId].players[i].score = 0;
      }
    }
    
    // Check again if all players are spectating (after marking them)
    // A player is spectating if they have no balance AND no bet
    const activePlayersAfterMarking = rooms[roomId].players.filter(p => !p.originalPlayer);
    const allPlayersSpectatingAfter = activePlayersAfterMarking.length > 0 && activePlayersAfterMarking.every(p => {
      return p.status === 'spectating' || (p.balance <= 0 && p.bet === 0);
    });
    
    console.log(`\n🔍 [new_round] Checking reset condition AFTER marking players for room ${roomId}:`);
    console.log(`  Active players (excluding splits): ${activePlayersAfterMarking.length}`);
    activePlayersAfterMarking.forEach(p => {
      const isSpectating = p.status === 'spectating' || (p.balance <= 0 && p.bet === 0);
      console.log(`    - ${p.username}: balance=${p.balance}, bet=${p.bet}, status=${p.status}, isSpectating=${isSpectating}`);
    });
    console.log(`  ✅ All players spectating: ${allPlayersSpectatingAfter}`);
    
    // If everyone is spectating, reset the game (give everyone starting balance back)
    if (allPlayersSpectatingAfter && activePlayersAfterMarking.length > 0) {
      console.log(`\n🎮 [new_round] RESETTING GAME - All players in room ${roomId} are spectating!`);
      
      const startingBalance = 1000;
      
      // Reset all players' balances and status
      for (const player of rooms[roomId].players) {
        // Skip split hands
        if (player.originalPlayer) continue;
        
        player.balance = startingBalance;
        player.status = null;
        player.cards = [];
        player.bet = 0;
        player.score = 0;
      }
      
      // Reset dealer
      rooms[roomId].dealer = {
        cards: [],
        score: 0,
        status: null
      };
      
      // Reset game state to waiting
      rooms[roomId].gameState = 'waiting';
      rooms[roomId].currentTurn = null;
      rooms[roomId].deck = [];
      
      // Clear any turn timers
      clearTurnTimer(roomId);
      
      // Notify all players that the game has been reset
      io.to(roomId).emit('game_reset', {
        message: 'All players ran out of money! Game has been reset. Everyone starts with $1000 again.',
        players: rooms[roomId].players,
        gameState: 'waiting'
      });
      
      console.log(`Game reset in room ${roomId}. All players now have $${startingBalance}`);
      return; // Don't continue with new round, since we reset instead
    }
    
    // Update game state
    rooms[roomId].gameState = 'betting';
    rooms[roomId].currentTurn = null;
    
    // Emit new round event
    io.to(roomId).emit('new_round', {
      players: rooms[roomId].players,
      gameState: 'betting',
      dealer: rooms[roomId].dealer,
      isAutoSkip: true // Always set to true when triggered by the host
    });
    
    // Log the new round
    console.log(`New round started in room ${roomId}, auto-skip: true`);
  });
  
  // Send chat message
  socket.on('send_message', ({ roomId, message, sender }) => {
    if (!rooms[roomId]) return;
    
    // Create message object
    const messageObj = {
      sender,
      content: message,
      timestamp: Date.now(),
      type: 'message'
    };
    
    // Emit message to all players in room
    io.to(roomId).emit('message', messageObj);
  });
  
  // Restart game - reset all players' balances to 1000
  socket.on('restart_game', (data) => {
    console.log(`\n=== RESTART GAME REQUEST ===`);
    console.log(`Raw data received:`, data);
    console.log(`RoomId: ${data?.roomId}`);
    console.log(`SocketId (requester): ${socket.id}`);
    console.log(`Available rooms:`, Object.keys(rooms));
    
    const { roomId } = data || {};
    
    if (!roomId) {
      console.error(`❌ No roomId provided in restart_game event`);
      socket.emit('error', { message: 'Room ID is required' });
      return;
    }
    
    if (!rooms[roomId]) {
      console.log(`❌ Room ${roomId} not found`);
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    console.log(`Room ${roomId} exists. Players in room:`, rooms[roomId].players.map(p => ({ id: p.id, username: p.username })));
    
    // Check if player is the host (first player)
    const hostId = rooms[roomId].players[0]?.id;
    console.log(`Host check: hostId=${hostId}, socketId=${socket.id}, match=${hostId === socket.id}`);
    
    if (!hostId) {
      console.log(`❌ No host found in room ${roomId}`);
      socket.emit('error', { message: 'No host found in room' });
      return;
    }
    
    if (hostId !== socket.id) {
      console.log(`❌ Only host can restart game. Host: ${hostId}, Requester: ${socket.id}`);
      socket.emit('error', { message: 'Only the host can restart the game' });
      return;
    }
    
    console.log(`✅ Host ${rooms[roomId].players[0].username} is restarting the game`);
    
    const startingBalance = 1000;
    
    // Reset all players' balances and status
    for (const player of rooms[roomId].players) {
      // Skip split hands
      if (player.originalPlayer) continue;
      
      console.log(`Resetting player ${player.username}: balance ${player.balance} -> ${startingBalance}`);
      player.balance = startingBalance;
      player.status = null;
      player.cards = [];
      player.bet = 0;
      player.score = 0;
    }
    
    // Reset dealer
    rooms[roomId].dealer = {
      cards: [],
      score: 0,
      status: null
    };
    
    // Reset game state to waiting
    rooms[roomId].gameState = 'waiting';
    rooms[roomId].currentTurn = null;
    rooms[roomId].deck = [];
    
    // Clear any turn timers
    clearTurnTimer(roomId);
    
    console.log(`Emitting game_reset event to room ${roomId}...`);
    
    // Notify all players that the game has been reset
    io.to(roomId).emit('game_reset', {
      message: 'Game has been restarted by the host! Everyone starts with $1000 again.',
      players: rooms[roomId].players,
      gameState: 'waiting'
    });
    
    console.log(`✅ Game restarted in room ${roomId}. All players now have $${startingBalance}`);
  });
  
  // Kick a player from the room
  socket.on('kick_player', ({ roomId, playerId }) => {
    console.log(`\n=== KICK REQUEST ===`);
    console.log(`RoomId: ${roomId}`);
    console.log(`PlayerId to kick: ${playerId}`);
    console.log(`SocketId (requester): ${socket.id}`);
    console.log(`Available rooms:`, Object.keys(rooms));
    console.log(`Room ${roomId} exists:`, !!rooms[roomId]);
    
    if (!rooms[roomId]) {
      console.log(`❌ Room ${roomId} not found`);
      console.log(`Available rooms:`, Object.keys(rooms));
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    // Check if player is the host (first player)
    const hostId = rooms[roomId].players[0]?.id;
    console.log(`Host check: hostId=${hostId}, socketId=${socket.id}, match=${hostId === socket.id}`);
    
    if (hostId !== socket.id) {
      console.log(`Kick denied: Only host can kick. Host: ${hostId}, Requester: ${socket.id}`);
      socket.emit('error', { message: 'Only the host can kick players' });
      return;
    }
    
    // Can't kick during active gameplay (playing state)
    if (rooms[roomId].gameState === 'playing') {
      socket.emit('error', { message: 'Cannot kick players during active gameplay' });
      return;
    }
    
    // Can't kick yourself
    if (playerId === socket.id) {
      socket.emit('error', { message: 'Cannot kick yourself' });
      return;
    }
    
    // Find the player to kick
    const playerIndex = rooms[roomId].players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) {
      socket.emit('error', { message: 'Player not found' });
      return;
    }
    
    const kickedPlayer = rooms[roomId].players[playerIndex];
    
    // Remove player from room
    rooms[roomId].players.splice(playerIndex, 1);
    
    // Notify the kicked player
    io.to(playerId).emit('kicked', {
      message: 'You have been kicked from the room by the host'
    });
    
    // Remove kicked player from socket room
    io.sockets.sockets.get(playerId)?.leave(roomId);
    
    // Notify remaining players
    io.to(roomId).emit('player_kicked', {
      players: rooms[roomId].players,
      kickedPlayer: kickedPlayer.username
    });
    
    console.log(`Player ${kickedPlayer.username} (${playerId}) was kicked from room ${roomId} by host ${rooms[roomId].players[0].username}`);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Find all rooms the user is in
    for (const roomId in rooms) {
      const room = rooms[roomId];
      const playerIndex = room.players.findIndex(p => p.id === socket.id && !p.originalPlayer);
      
      if (playerIndex !== -1) {
        // Remove player from room (and all their split hands)
        const disconnectedPlayer = room.players[playerIndex];
        const wasHost = playerIndex === 0;
        
        // Remove the player and all their split hands
        room.players = room.players.filter(p => 
          p.id !== socket.id && p.originalPlayer !== socket.id
        );
        
        // Clear any turn timers for this room
        clearTurnTimer(roomId);
        
        // If room is empty, delete it
        if (room.players.length === 0) {
          delete rooms[roomId];
          delete resetVotes[roomId];
          console.log(`Room ${roomId} deleted after all players disconnected`);
          continue;
        }
        
        // If the disconnected player was the host, assign a new host (first remaining player)
        if (wasHost && room.players.length > 0) {
          console.log(`Host ${disconnectedPlayer.username} disconnected. New host: ${room.players[0].username}`);
        }
        
        // Handle game state based on when player disconnected
        if (room.gameState === 'playing') {
          // Clear any pending timers for this room
          clearPendingNextTurn(roomId);
          // If it was their turn, move to next player
          if (room.currentTurn === socket.id) {
            nextPlayerTurn(roomId);
          }
          // If no active players left, end the game
          const activePlayers = room.players.filter(p => 
            !p.originalPlayer && 
            p.status !== 'spectating' && 
            p.bet > 0
          );
          if (activePlayers.length === 0) {
            // No active players, reset to waiting state
            room.gameState = 'waiting';
            room.currentTurn = null;
            // Clear all player bets and statuses
            room.players.forEach(p => {
              if (!p.originalPlayer) {
                p.bet = 0;
                p.cards = [];
                p.score = 0;
                p.status = null;
              }
            });
            room.dealer = { cards: [], score: 0, status: null };
            io.to(roomId).emit('game_state_update', {
              gameState: 'waiting',
              players: room.players,
              dealer: room.dealer
            });
          }
        } else if (room.gameState === 'betting') {
          // If in betting phase, check if all remaining players have bet
          const playersWithBets = room.players.filter(p => 
            !p.originalPlayer && 
            p.bet > 0 && 
            p.balance > 0
          );
          const playersNeedingBets = room.players.filter(p => 
            !p.originalPlayer && 
            p.bet === 0 && 
            p.balance > 0 &&
            p.status !== 'spectating'
          );
          
          // If all remaining players have bet, start the game
          if (playersNeedingBets.length === 0 && playersWithBets.length > 0) {
            room.gameState = 'playing';
            dealInitialCards(roomId);
          }
        }
        
        // Notify remaining players
        io.to(roomId).emit('player_left', {
          players: room.players,
          leftPlayer: disconnectedPlayer.username,
          wasHost: wasHost
        });
        
        // Also emit updated room state
        io.to(roomId).emit('room_update', {
          players: room.players,
          gameState: room.gameState,
          dealer: room.dealer
        });
        
        console.log(`Player ${disconnectedPlayer.username} (${socket.id}) disconnected from room ${roomId}`);
      }
    }
  });
});

// Deal initial cards to all players and dealer
function dealInitialCards(roomId) {
  if (!rooms[roomId]) return;
  
  let cardIndex = 0;
  const dealDelay = 650; // 650ms delay between each card for realistic dealing pace
  
  // First, initialize card arrays and reset status for active players
  // Don't emit player_spectating here - it's already been emitted in new_round
  for (let i = 0; i < rooms[roomId].players.length; i++) {
    const player = rooms[roomId].players[i];
    
    // Only mark as spectating if they have no bet AND no balance
    if (player.bet === 0 && (player.balance <= 0 || player.status === 'spectating')) {
      player.status = 'spectating';
      player.cards = [];
      player.score = 0;
      rooms[roomId].players[i] = player;
    } else {
      // Active player - reset status (will be set to 'blackjack' if they get it)
      // Clear any previous status except keep 'spectating' if they were already spectating
      if (player.status !== 'spectating') {
        player.status = null; // Clear status so they can play
      }
      player.cards = [];
      player.score = 0;
      rooms[roomId].players[i] = player;
    }
  }
  
  // Deal first round: one card to each player, then dealer
  for (let i = 0; i < rooms[roomId].players.length; i++) {
    const player = rooms[roomId].players[i];
    
    if (player.bet === 0) continue;
    
    setTimeout(() => {
      const card = rooms[roomId].deck.pop();
      player.cards.push(card);
      player.score = calculateHandValue(player.cards);
      rooms[roomId].players[i] = player;
      
      console.log(`[Deal] Dealing card ${player.cards.length} to ${player.username} at ${Date.now()}`);
      
      io.to(roomId).emit('card_dealt', {
        to: player.id,
        cards: [...player.cards],
        score: player.score,
        isNewCard: true
      });
    }, cardIndex * dealDelay);
    
    cardIndex++;
  }
  
  // Deal first card to dealer
  setTimeout(() => {
    const card = rooms[roomId].deck.pop();
    rooms[roomId].dealer.cards = [card];
    rooms[roomId].dealer.score = calculateHandValue(rooms[roomId].dealer.cards);
    
    console.log(`[Deal] Dealing card 1 to dealer at ${Date.now()}`);
    
    io.to(roomId).emit('card_dealt', {
      to: 'dealer',
      dealer: { ...rooms[roomId].dealer },
      isNewCard: true
    });
  }, cardIndex * dealDelay);
  
  cardIndex++;
  
  // Deal second round: one card to each player, then dealer
  for (let i = 0; i < rooms[roomId].players.length; i++) {
    const player = rooms[roomId].players[i];
    
    if (player.bet === 0) continue;
    
    setTimeout(() => {
      const card = rooms[roomId].deck.pop();
      player.cards.push(card);
      player.score = calculateHandValue(player.cards);
      
      // Check for blackjack
      if (isBlackjack(player.cards)) {
        player.status = 'blackjack';
      }
      
      rooms[roomId].players[i] = player;
      
      console.log(`[Deal] Dealing card ${player.cards.length} to ${player.username} at ${Date.now()}`);
      
      io.to(roomId).emit('card_dealt', {
        to: player.id,
        cards: [...player.cards],
        score: player.score,
        isNewCard: true
      });
    }, cardIndex * dealDelay);
    
    cardIndex++;
  }
  
  // Deal second card to dealer and start game
  setTimeout(() => {
    const card = rooms[roomId].deck.pop();
    rooms[roomId].dealer.cards.push(card);
    rooms[roomId].dealer.score = calculateHandValue(rooms[roomId].dealer.cards);
    
    console.log(`[Deal] Dealing card 2 to dealer at ${Date.now()}`);
    
    // Check if dealer has blackjack
    const dealerHasBlackjack = isBlackjack(rooms[roomId].dealer.cards);
    if (dealerHasBlackjack) {
      rooms[roomId].dealer.status = 'blackjack';
      console.log(`[Deal] Dealer has blackjack! Ending game immediately.`);
    }
    
    // Reveal dealer's cards (show both cards)
    io.to(roomId).emit('card_dealt', {
      to: 'dealer',
      dealer: { ...rooms[roomId].dealer },
      isNewCard: true
    });
    
    // If dealer has blackjack, end the game immediately
    if (dealerHasBlackjack) {
      setTimeout(async () => {
        await settleGame(roomId);
      }, 1000); // Small delay to show the dealer's blackjack
      return; // Don't continue with player turns
    }
    
    // After all initial cards are dealt, set up the game
    setTimeout(() => {
      // Find first active player (not spectating, has bet, has balance, not a split hand)
      // Include players with blackjack - we'll skip them after finding them
      // A player is active if they have a bet and are not spectating
      const firstActivePlayerIndex = rooms[roomId].players.findIndex(p => 
        !p.originalPlayer && 
        p.status !== 'spectating' && 
        p.bet > 0
      );
      
      console.log(`[Deal] Looking for first active player. Found index: ${firstActivePlayerIndex}, Total players: ${rooms[roomId].players.length}`);
      console.log(`[Deal] All players:`, rooms[roomId].players.map(p => ({
        username: p.username,
        id: p.id,
        bet: p.bet,
        balance: p.balance,
        status: p.status,
        originalPlayer: p.originalPlayer,
        isActive: !p.originalPlayer && p.status !== 'spectating' && p.bet > 0
      })));
      
      if (firstActivePlayerIndex !== -1) {
        const firstPlayer = rooms[roomId].players[firstActivePlayerIndex];
        console.log(`[Deal] First active player: ${firstPlayer.username} (${firstPlayer.id}), Status: ${firstPlayer.status}, Has blackjack: ${firstPlayer.status === 'blackjack'}`);
        
        // If the first player has blackjack, skip to next player
        if (firstPlayer.status === 'blackjack') {
          console.log(`[Deal] First player has blackjack, moving to next player`);
          rooms[roomId].currentTurn = firstPlayer.id;
          nextPlayerTurn(roomId);
        } else {
          // Give the first player their turn
          rooms[roomId].currentTurn = firstPlayer.id;
          console.log(`[Deal] ✅ Starting turn for player: ${firstPlayer.username} (${firstPlayer.id}), currentTurn set to: ${rooms[roomId].currentTurn}`);
          
          // Make sure game state is playing
          rooms[roomId].gameState = 'playing';
          
          io.to(roomId).emit('player_turn', {
            playerId: rooms[roomId].currentTurn,
            players: rooms[roomId].players
          });
          
          console.log(`[Deal] ✅ Emitted player_turn event for ${firstPlayer.username}`);
          
          setTimeout(() => {
            startTurnTimer(roomId);
          }, 100);
        }
      } else {
        // No active players found - this shouldn't happen if players have bets
        console.log(`[Deal] ❌ WARNING: No active players found! Going straight to dealer.`);
        console.log(`[Deal] Players in room:`, rooms[roomId].players.map(p => ({
          username: p.username,
          bet: p.bet,
          balance: p.balance,
          status: p.status,
          originalPlayer: p.originalPlayer
        })));
        
        // No active players, go straight to dealer
        rooms[roomId].currentTurn = 'dealer';
        io.to(roomId).emit('dealer_turn');
        
        setTimeout(() => {
          dealerTurn(roomId);
        }, 1000);
      }
    }, dealDelay);
  }, cardIndex * dealDelay);
}

// Clear the turn timer for a room
function clearTurnTimer(roomId) {
  if (turnTimers[roomId]) {
    console.log(`[Timer] Clearing timer for room ${roomId}`);
    clearTimeout(turnTimers[roomId]);
    delete turnTimers[roomId];
  }
  // Clear auto-skipped flags for this room when clearing the timer (new turn starting)
  Object.keys(autoSkippedPlayers).forEach(key => {
    if (key.startsWith(`${roomId}-`)) {
      delete autoSkippedPlayers[key];
    }
  });
}

// Clear any pending nextPlayerTurn timeouts for a room
function clearPendingNextTurn(roomId) {
  if (pendingNextTurnTimers[roomId]) {
    console.log(`[Timer] Clearing pending nextPlayerTurn for room ${roomId}`);
    clearTimeout(pendingNextTurnTimers[roomId]);
    delete pendingNextTurnTimers[roomId];
  }
}

// Start a timer to auto-skip a player after 60 seconds
function startTurnTimer(roomId) {
  // Clear any existing timer first
  clearTurnTimer(roomId);
  
  if (!rooms[roomId] || rooms[roomId].gameState !== 'playing') {
    console.log(`[Timer] Not starting timer for room ${roomId}: gameState=${rooms[roomId]?.gameState}`);
    return;
  }
  
  const currentTurn = rooms[roomId].currentTurn;
  if (!currentTurn || currentTurn === 'dealer') {
    console.log(`[Timer] Not starting timer for room ${roomId}: currentTurn=${currentTurn}`);
    return;
  }
  
  const player = rooms[roomId].players.find(p => p.id === currentTurn);
  const playerName = player?.username || currentTurn;
  
  // Don't start timer if player already has a status (already played)
  if (player && player.status && player.status !== 'playing') {
    console.log(`[Timer] Player ${playerName} already has status ${player.status}, not starting timer`);
    return;
  }
  
  console.log(`[Timer] Starting 60-second timer for player ${playerName} (${currentTurn}) in room ${roomId}`);
  
  // Set a 60-second timer to automatically stand the player (increased from 30 seconds)
  turnTimers[roomId] = setTimeout(() => {
    console.log(`[Timer] 60 seconds elapsed for room ${roomId}, checking if auto-skip needed...`);
    
    if (!rooms[roomId] || rooms[roomId].gameState !== 'playing') {
      console.log(`[Timer] Game state changed, not auto-skipping. gameState=${rooms[roomId]?.gameState}`);
      return;
    }
    
    if (rooms[roomId].currentTurn !== currentTurn) {
      console.log(`[Timer] Turn changed from ${currentTurn} to ${rooms[roomId].currentTurn}, not auto-skipping`);
      return; // Turn has changed
    }
    
    // Find the player
    const playerIndex = rooms[roomId].players.findIndex(p => p.id === currentTurn);
    if (playerIndex === -1) {
      console.log(`[Timer] Player ${currentTurn} not found, not auto-skipping`);
      return;
    }
    
    const player = rooms[roomId].players[playerIndex];
    const playerName = player?.username || currentTurn;
    
    // Check if player already has a status (already played)
    if (player.status && player.status !== 'playing') {
      console.log(`[Timer] Player ${playerName} already has status ${player.status}, not auto-skipping`);
      delete turnTimers[roomId];
      return;
    }
    
    // Check if we've already auto-skipped this player for this turn
    const skipKey = `${roomId}-${currentTurn}`;
    if (autoSkippedPlayers[skipKey]) {
      console.log(`[Timer] Player ${playerName} already auto-skipped, skipping duplicate`);
      delete turnTimers[roomId];
      return;
    }
    
    console.log(`[Timer] ⏰ Auto-skipping player ${playerName} (${currentTurn}) in room ${roomId} - 60 seconds elapsed`);
    
    // Mark this player as auto-skipped
    autoSkippedPlayers[skipKey] = true;
    
    // Auto-stand the player
    player.status = 'stood';
    rooms[roomId].players[playerIndex] = player;
    
    // Notify all players (only once)
    io.to(roomId).emit('player_auto_skipped', {
      playerId: currentTurn,
      username: playerName,
      players: rooms[roomId].players,
      timestamp: Date.now() // Add timestamp to help client-side deduplication
    });
    
    // Clear the timer
    delete turnTimers[roomId];
    
    // Move to next player's turn
    nextPlayerTurn(roomId);
  }, 60000); // 60 seconds (increased from 30)
}

// Move to the next player's turn
function nextPlayerTurn(roomId) {
  // Clear any existing turn timer and pending next turn timers
  clearTurnTimer(roomId);
  clearPendingNextTurn(roomId);
  if (!rooms[roomId]) return;
  
  const currentTurnIndex = rooms[roomId].players.findIndex(p => p.id === rooms[roomId].currentTurn);
  if (currentTurnIndex === -1) return;
  
  // Check if the current player has a split hand that needs to be played
  const currentPlayer = rooms[roomId].players[currentTurnIndex];
  
  // Only check for split hands if the current player is NOT a split hand themselves
  // (i.e., they are the original hand)
  if (!currentPlayer.originalPlayer) {
    // Find any split hands for this original player that haven't been played yet
    const splitHandIndex = rooms[roomId].players.findIndex(p => 
      p.originalPlayer === currentPlayer.id && (!p.status || p.status === null || p.status === undefined)
    );
  
    // If there's a split hand that hasn't been played yet, move to that hand
    if (splitHandIndex !== -1) {
      rooms[roomId].currentTurn = rooms[roomId].players[splitHandIndex].id;
      
      // Emit turn ended event
      io.to(roomId).emit('turn_ended', {
        nextTurn: rooms[roomId].currentTurn,
        players: rooms[roomId].players
      });
      
      // Emit player turn event
      io.to(roomId).emit('player_turn', {
        playerId: rooms[roomId].currentTurn,
        players: rooms[roomId].players
      });
      
      // Start the 60-second auto-skip timer for the split hand
      // Add a small delay to ensure the turn is fully set
      setTimeout(() => {
        startTurnTimer(roomId);
      }, 100);
      
      return;
    }
  }
  
  // Find the next player who hasn't played yet and is not spectating
  let nextPlayerIndex = -1;
  for (let i = 1; i < rooms[roomId].players.length; i++) {
    const idx = (currentTurnIndex + i) % rooms[roomId].players.length;
    const player = rooms[roomId].players[idx];
    
    // Skip split hands that aren't the current player's turn
    if (player.originalPlayer) continue;
    // Skip players who are spectating
    if (player.status === 'spectating') continue;
    // Skip players with no bet
    if (player.bet === 0) continue;
    // Skip players who have already played (have a status like 'stood', 'bust', 'blackjack')
    // But allow players with null/undefined status (haven't played yet)
    if (player.status && player.status !== null && player.status !== undefined) continue;
    
    nextPlayerIndex = idx;
    break;
  }
  
  if (nextPlayerIndex === -1) {
    // All players have played, move to dealer's turn
    rooms[roomId].currentTurn = 'dealer';
    io.to(roomId).emit('dealer_turn');
    
    // Start dealer's turn after a short delay
    setTimeout(() => {
      dealerTurn(roomId);
    }, 1000);
  } else {
    // Set next player's turn
    rooms[roomId].currentTurn = rooms[roomId].players[nextPlayerIndex].id;
    
    // Check if the next player has blackjack
    const nextPlayer = rooms[roomId].players[nextPlayerIndex];
    if (nextPlayer.status === 'blackjack') {
      // If the next player has blackjack, immediately move to the next player
      io.to(roomId).emit('turn_ended', {
        nextTurn: rooms[roomId].currentTurn,
        players: rooms[roomId].players
      });
      
      // Emit player turn event
      io.to(roomId).emit('player_turn', {
        playerId: rooms[roomId].currentTurn,
        players: rooms[roomId].players
      });
      
      // Recursively move to the next player (timer will be started in nextPlayerTurn)
      setTimeout(() => {
        nextPlayerTurn(roomId);
      }, 1000);
    } else {
      // Emit turn ended event
      io.to(roomId).emit('turn_ended', {
        nextTurn: rooms[roomId].currentTurn,
        players: rooms[roomId].players
      });
      
      // Emit player turn event
      io.to(roomId).emit('player_turn', {
        playerId: rooms[roomId].currentTurn,
        players: rooms[roomId].players
      });
      
      // Start the 60-second auto-skip timer for the new player
      // Add a small delay to ensure the turn is fully set
      setTimeout(() => {
        startTurnTimer(roomId);
      }, 100);
    }
  }
}

// Dealer's turn
function dealerTurn(roomId) {
  if (!rooms[roomId]) return;
  
  // Clear any turn timers since dealer's turn is starting
  clearTurnTimer(roomId);
  
  // Reveal dealer's cards (first emit to show hidden card)
  io.to(roomId).emit('card_dealt', {
    to: 'dealer',
    dealer: { ...rooms[roomId].dealer },
    isNewCard: false // Not a new card, just revealing
  });
  
  // Dealer draws cards until score is 17 or higher
  // Use a recursive function to handle sequential card dealing with delays
  const dealDealerCard = async (delay = 600) => {
    // Check if room still exists and game hasn't ended
    if (!rooms[roomId] || rooms[roomId].gameState === 'ended') {
      return; // Stop if room doesn't exist or game has ended
    }
    
    // Check if dealer needs more cards
    if (rooms[roomId].dealer.score >= 17) {
      // Dealer is done, set status and settle
      if (rooms[roomId].dealer.score > 21) {
        rooms[roomId].dealer.status = 'busted';
      } else if (isBlackjack(rooms[roomId].dealer.cards)) {
        rooms[roomId].dealer.status = 'blackjack';
      } else {
        rooms[roomId].dealer.status = 'stood';
      }
      
      // Determine winners and settle bets
      settleGame(roomId).catch(err => console.error('Error settling game:', err));
      return;
    }
    
    // Deal one card
    const card = rooms[roomId].deck.pop();
    rooms[roomId].dealer.cards.push(card);
    rooms[roomId].dealer.score = calculateHandValue(rooms[roomId].dealer.cards);
    
    // Emit card dealt event with delay for animation
    setTimeout(() => {
      // Check again before emitting (game might have ended)
      if (!rooms[roomId] || rooms[roomId].gameState === 'ended') {
        return; // Stop if room doesn't exist or game has ended
      }
      
      io.to(roomId).emit('card_dealt', {
        to: 'dealer',
        dealer: { ...rooms[roomId].dealer },
        isNewCard: true
      });
      
      // After animation delay, deal next card if needed
      setTimeout(() => {
        // Final check before recursive call
        if (!rooms[roomId] || rooms[roomId].gameState === 'ended') {
          return; // Stop if room doesn't exist or game has ended
        }
        
        dealDealerCard(600);
      }, 600);
    }, delay);
  };
  
  // Start dealing dealer cards
  dealDealerCard(600);
}

// Reset game after vote
function resetGameAfterVote(roomId) {
  if (!rooms[roomId]) return;
  
  const room = rooms[roomId];
  const startingBalance = 1000;
  
  // Reset all players' balances and status
  for (const player of room.players) {
    // Skip split hands
    if (player.originalPlayer) continue;
    
    player.balance = startingBalance;
    player.status = null;
    player.cards = [];
    player.bet = 0;
    player.score = 0;
  }
  
  // Reset dealer
  room.dealer = {
    cards: [],
    score: 0,
    status: null
  };
  
  // Reset game state to waiting
  room.gameState = 'waiting';
  room.currentTurn = null;
  room.deck = [];
  
  // Clear any turn timers
  clearTurnTimer(roomId);
  
  // Clear votes
  delete resetVotes[roomId];
  
  // Notify all players that the game has been reset
  io.to(roomId).emit('game_reset', {
    message: 'Game has been reset. Everyone starts with $1000 again.',
    players: room.players,
    gameState: 'waiting'
  });
  
  console.log(`Game reset in room ${roomId}. All players now have $${startingBalance}`);
}

// Determine winners and settle bets
async function settleGame(roomId) {
  if (!rooms[roomId]) return;
  
  const room = rooms[roomId];
  const dealer = room.dealer;
  const dealerScore = dealer.score;
  const dealerHasBlackjack = isBlackjack(dealer.cards);
  
  // Calculate results for each player
  const results = [];
  
  for (const player of room.players) {
    // Skip split hands for results calculation (they're handled with their original player)
    if (player.originalPlayer) continue;
    
    // Capture player cards and score before any modifications
    const playerCards = player.cards ? [...player.cards] : [];
    const playerScore = player.score || 0;
    
    let outcome = '';
    let amountChange = 0;
    
    // Skip players who were spectating this round
    if (player.status === 'spectating') {
      outcome = 'spectating';
      // Capture cards for spectating players too
      const spectatingCards = player.cards ? [...player.cards] : [];
      const spectatingScore = player.score || 0;
      results.push({
        playerId: player.id,
        username: player.username,
        outcome,
        amountChange,
        cards: spectatingCards,
        score: spectatingScore
      });
      continue;
    }
    
    // Handle different outcomes
    if (player.status === 'blackjack') {
      if (dealerHasBlackjack) {
        outcome = 'push';
        amountChange = 0;
      } else {
        outcome = 'blackjack';
        amountChange = Math.floor(player.bet * 1.5);
        player.balance += player.bet + amountChange;
      }
    } else if (player.status === 'busted') {
      outcome = 'bust';
      amountChange = -player.bet;
      // Balance already deducted when betting
    } else if (player.status === 'surrender') {
      outcome = 'surrender';
      amountChange = -Math.floor(player.bet / 2);
      player.balance += Math.floor(player.bet / 2); // Return half the bet
    } else if (dealerHasBlackjack) {
      outcome = 'lose';
      amountChange = -player.bet;
      // Balance already deducted when betting
    } else if (dealer.status === 'busted') {
      outcome = 'win';
      amountChange = player.bet;
      player.balance += player.bet * 2; // Original bet + winnings
    } else if (player.score > dealerScore) {
      outcome = 'win';
      amountChange = player.bet;
      player.balance += player.bet * 2; // Original bet + winnings
    } else if (player.score < dealerScore) {
      outcome = 'lose';
      amountChange = -player.bet;
      // Balance already deducted when betting
    } else {
      outcome = 'push';
      amountChange = 0;
      player.balance += player.bet; // Return the original bet
    }
    
    // Add to results with cards (use captured cards to ensure they're preserved)
    results.push({
      playerId: player.id,
      username: player.username,
      outcome,
      amountChange,
      cards: playerCards,
      score: playerScore
    });
    
    // Update leaderboard with current player balance and username
    await updateLeaderboard(player);
    
    // Mark players with zero balance as spectators for the next round
    // BUT: Don't mark them if they have a bet (all-in scenario - they're still in the current round)
    // After the round ends and bets are settled, if they still have no balance, they'll be marked as spectating
    if (player.balance <= 0 && player.bet === 0) {
      player.status = 'spectating';
      console.log(`Player ${player.username} marked as spectator due to zero balance (isHost: ${player.id === room.players[0]?.id})`);
      
      // If this is the host, make sure they're properly marked as spectating
      if (player.id === room.players[0]?.id) {
        console.log(`Host ${player.username} has zero balance and is marked as spectating`);
      }
    }
  }
  
  // Check if all players are spectating (everyone ran out of money)
  const activePlayers = room.players.filter(p => !p.originalPlayer); // Exclude split hands
  
  console.log(`\n🔍 [settleGame] Checking reset condition for room ${roomId}:`);
  console.log(`  Active players (excluding splits): ${activePlayers.length}`);
  activePlayers.forEach(p => {
    const isSpectating = p.status === 'spectating' || (p.balance <= 0 && p.bet === 0);
    console.log(`    - ${p.username}: balance=${p.balance}, bet=${p.bet}, status=${p.status}, isSpectating=${isSpectating}`);
  });
  
  const allPlayersSpectating = activePlayers.length > 0 && activePlayers.every(p => {
    // A player is spectating if they have no balance AND no bet
    return p.status === 'spectating' || (p.balance <= 0 && p.bet === 0);
  });
  
  console.log(`  ✅ [settleGame] All players spectating: ${allPlayersSpectating}`);
  
  // If everyone is spectating, show results in history and start voting for reset
  if (allPlayersSpectating && activePlayers.length > 0) {
    console.log(`\n🎮 [settleGame] All players in room ${roomId} are spectating! Starting vote to continue.`);
    
    // First, emit game_ended with results so it shows in history
    // Add a special result entry for "all players lost"
    const allLostResult = {
      playerId: 'all',
      username: 'All Players',
      outcome: 'all_lost',
      amountChange: 0,
      message: 'All players ran out of money!'
    };
    
    // Update game state to ended first
    room.gameState = 'ended';
    room.currentTurn = null;
    
    // Emit game ended with all lost message
    io.to(roomId).emit('game_ended', {
      dealer,
      players: room.players,
      result: {
        results: [...results, allLostResult]
      },
      allPlayersLost: true
    });
    
    // Clear any existing votes for this room
    resetVotes[roomId] = {};
    
    // After a short delay, show the vote prompt
    setTimeout(() => {
      if (!rooms[roomId] || rooms[roomId].gameState !== 'ended') return;
      
      io.to(roomId).emit('vote_to_continue', {
        message: 'All players ran out of money! Vote to continue and reset the game.',
        roomId: roomId
      });
    }, 2000);
    
    return; // Don't continue with normal game_ended flow
  }
  
  // Update game state
  room.gameState = 'ended';
  room.currentTurn = null;
  
  // Emit game ended event with results (including dealer cards)
  io.to(roomId).emit('game_ended', {
    dealer: {
      ...dealer,
      cards: dealer.cards || [],
      score: dealerScore
    },
    players: room.players,
    result: {
      dealerScore,
      dealerHasBlackjack,
      dealerCards: dealer.cards || [],
      results
    }
  });
}

// Update leaderboard with player info
async function updateLeaderboard(player) {
  // Validate player data
  if (!player || !player.username || player.balance === undefined) {
    console.error('Invalid player data for leaderboard:', player);
    return;
  }
  
  console.log(`[Leaderboard] Updating for player: ${player.username}, balance: ${player.balance}`);
  
  // Update in-memory leaderboard for immediate access
  const existingIndex = leaderboard.findIndex(p => p.id === player.id || p.username === player.username);
  
  if (existingIndex !== -1) {
    // Update existing player - always update to keep current balance
    // But only store the highest balance they've achieved
    if (player.balance > leaderboard[existingIndex].balance) {
      leaderboard[existingIndex].balance = player.balance;
      leaderboard[existingIndex].username = player.username; // Update username in case it changed
    }
  } else {
    // Add new player
    leaderboard.push({
      id: player.id,
      username: player.username,
      balance: player.balance
    });
  }
  
  // Sort leaderboard by balance
  leaderboard.sort((a, b) => b.balance - a.balance);
  
  // Update Supabase leaderboard if configured
  if (supabase) {
    try {
      // Use username as identifier (since we don't have user_id in game state)
      // If player has user_id, we should use that instead
      const userId = player.userId || null; // userId would come from client if available
      
      console.log(`[Leaderboard] Updating Supabase: username=${player.username}, balance=${player.balance}, userId=${userId || 'null'}`);
      
      // Call the Supabase function to update leaderboard
      const { data, error } = await supabase.rpc('update_leaderboard', {
        p_user_id: userId,
        p_username: player.username,
        p_balance: player.balance
      });
      
      if (error) {
        console.error('❌ Error updating leaderboard in Supabase:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log(`✅ Successfully updated leaderboard in Supabase for ${player.username}`);
      }
    } catch (error) {
      console.error('❌ Exception updating leaderboard:', error);
    }
  } else {
    console.warn('⚠️ Supabase not configured, leaderboard only stored in memory');
  }
  
  // Emit updated leaderboard to all clients
  io.emit('leaderboard_updated', {
    leaderboard: leaderboard.slice(0, 10) // Top 10
  });
}

// Fetch leaderboard from Supabase
async function fetchLeaderboardFromSupabase(limit = 10) {
  if (!supabase) {
    // Return in-memory leaderboard if Supabase not configured
    return leaderboard.slice(0, limit);
  }
  
  try {
    const { data, error } = await supabase.rpc('get_leaderboard', {
      limit_count: limit
    });
    
    if (error) {
      console.error('Error fetching leaderboard from Supabase:', error);
      return leaderboard.slice(0, limit);
    }
    
    // Update in-memory leaderboard with Supabase data
    if (data && data.length > 0) {
      leaderboard.length = 0; // Clear existing
      data.forEach(entry => {
        leaderboard.push({
          id: entry.user_id || `user_${entry.username}`, // Use user_id if available, otherwise generate id
          username: entry.username,
          balance: entry.balance
        });
      });
    }
    
    return leaderboard.slice(0, limit);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return leaderboard.slice(0, limit);
  }
}

// Default route
app.get('/', (req, res) => {
  res.send('Blackjack Multiplayer Server is running');
});

// Get leaderboard endpoint
app.get('/leaderboard', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const leaderboardData = await fetchLeaderboardFromSupabase(limit);
    res.json({ leaderboard: leaderboardData });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

// Load leaderboard from Supabase on server start
async function initializeLeaderboard() {
  try {
    await fetchLeaderboardFromSupabase(10);
    console.log('✅ Leaderboard initialized from Supabase');
  } catch (error) {
    console.error('⚠️ Error initializing leaderboard:', error);
    console.log('📊 Using in-memory leaderboard only');
  }
}

// Initialize leaderboard when server starts
initializeLeaderboard();

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  // Don't exit immediately, let the server try to recover
});

// Error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // Don't exit immediately, let the server try to recover
});

// Handle server errors
server.on('error', (error) => {
  if (error.syscall !== 'listen') {
    throw error;
  }
  
  const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;
  
  switch (error.code) {
    case 'EACCES':
      console.error(`❌ ${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(`❌ ${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ Health check available at http://0.0.0.0:${PORT}/health`);
});
