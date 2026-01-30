"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";

import BettingPanel from "@/games/blackjack/components/BettingPanel";
import Chat from "@/games/blackjack/components/Chat";
import DealerArea from "@/games/blackjack/components/DealerArea";
import GameHistory from "@/games/blackjack/components/GameHistory";
import PlayerControls from "@/games/blackjack/components/PlayerControls";
import PlayerSeat from "@/games/blackjack/components/PlayerSeat";
import { useGame } from "@/games/blackjack/contexts/GameContext";
import type { Player } from "@/games/blackjack/types";

const GameRoomContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: calc(100vh - 64px);
  height: calc(100vh - 64px);
  background: rgba(5, 6, 10, 0.4);
  color: white;
  overflow: hidden;
  position: relative;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(5, 6, 10, 0.5);

  @media (max-width: 1024px) {
    min-height: calc(100vh - 64px);
    height: auto;
  }

  @media (max-width: 640px) {
    border-radius: 18px;
  }

  @media (prefers-reduced-motion: reduce) {
    * {
      animation: none !important;
      transition: none !important;
    }
  }
`;

const GameHeader = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 28px;
  background: rgba(5, 6, 10, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 10;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 20px;
  }
`;

const RoomInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;

  @media (max-width: 768px) {
    flex-wrap: wrap;
    gap: 12px;
  }
`;

const RoomTitle = styled.h1`
  font-size: clamp(16px, 2vw, 20px);
  color: #38bdf8;
  margin: 0;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;

  @media (max-width: 768px) {
    font-size: 16px;
    letter-spacing: 0.16em;
  }
`;

const RoomCode = styled.div`
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.4);
  color: #38bdf8;
  padding: 6px 14px;
  border-radius: 10px;
  font-size: clamp(12px, 1.4vw, 14px);
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;

  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

const PlayerCount = styled.div`
  display: flex;
  align-items: center;
  color: rgba(255, 255, 255, 0.7);
  font-size: clamp(11px, 1.2vw, 13px);
  font-weight: 500;

  svg {
    margin-right: 5px;
    color: #2ef2a2;
  }
`;

const LeaveButton = styled.button`
  background: linear-gradient(135deg, #fb7185 0%, #f87171 100%);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  box-shadow: 0 4px 15px rgba(251, 113, 133, 0.4);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(251, 113, 133, 0.6);
  }

  &:active {
    transform: translateY(0);
  }
`;

const GameContent = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;

  @media (max-width: 1024px) {
    flex-direction: column;
    min-height: 0;
  }
`;

const GameTable = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  padding: 20px;
  overflow: hidden;

  @media (max-width: 768px) {
    padding: 14px;
  }

  @media (max-width: 480px) {
    padding: 12px;
  }
`;

const DealerSection = styled.div`
  height: 30%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  margin-bottom: 20px;
`;

const PlayersSection = styled.div`
  height: 50%;
  display: flex;
  justify-content: space-around;
  align-items: center;
  flex-wrap: wrap;
`;

const ControlsSection = styled.div`
  height: 20%;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding-bottom: 20px;
`;

const SidebarContainer = styled.div`
  width: clamp(240px, 28vw, 360px);
  background: rgba(5, 6, 10, 0.65);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
  position: relative;
  z-index: 5;

  @media (max-width: 1024px) {
    width: 100%;
    border-left: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const ChatButton = styled.button`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: clamp(48px, 6vw, 60px);
  height: clamp(48px, 6vw, 60px);
  border-radius: 50%;
  background: linear-gradient(135deg, #38bdf8 0%, #2ef2a2 100%);
  border: 2px solid rgba(255, 255, 255, 0.2);
  color: #05060a;
  font-size: clamp(18px, 2.4vw, 24px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 10px 30px rgba(56, 189, 248, 0.4);
  z-index: 200;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-3px) scale(1.1);
    box-shadow: 0 12px 35px rgba(46, 242, 162, 0.45);
  }
`;

const ChatModal = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: clamp(320px, 70vw, 500px);
  max-width: 90vw;
  max-height: 80vh;
  background: rgba(5, 6, 10, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  box-shadow: 0 10px 40px rgba(5, 6, 10, 0.8);
  backdrop-filter: blur(14px);
  z-index: 400;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ChatModalHeader = styled.div`
  padding: 16px;
  background: rgba(5, 6, 10, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ChatModalTitle = styled.h2`
  color: #38bdf8;
  font-size: clamp(1rem, 2vw, 1.2rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 28px;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    transform: rotate(90deg);
  }
`;

const ChatModalContent = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(5, 6, 10, 0.7);
  z-index: 399;
  backdrop-filter: blur(2px);
`;

const StartGameButton = styled.button`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, #38bdf8 0%, #2ef2a2 100%);
  color: #05060a;
  border: none;
  padding: 18px 40px;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 30px rgba(56, 189, 248, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  z-index: 20;

  &:hover {
    transform: translate(-50%, -52%);
    box-shadow: 0 12px 40px rgba(46, 242, 162, 0.5);
  }

  &:active {
    transform: translate(-50%, -50%);
  }
`;

const WaitingMessage = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: #38bdf8;
  z-index: 15;

  h2 {
    font-size: 28px;
    margin-bottom: 15px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.2em;
  }

  p {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.8);
    max-width: 400px;
    font-weight: 300;
  }
`;

const ErrorMessage = styled.div`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(248, 113, 113, 0.95);
  color: white;
  padding: 14px 24px;
  border-radius: 8px;
  z-index: 1000;
  box-shadow: 0 4px 20px rgba(248, 113, 113, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-weight: 600;
`;

const RoundEndedMessage = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 200;
  background: rgba(5, 6, 10, 0.9);
  border: 1px solid rgba(56, 189, 248, 0.4);
  border-radius: 20px;
  padding: 30px 50px;
  box-shadow: 0 10px 40px rgba(5, 6, 10, 0.7);
  backdrop-filter: blur(10px);

  h2 {
    font-size: 28px;
    margin-bottom: 10px;
    font-weight: 700;
    color: #38bdf8;
    text-transform: uppercase;
    letter-spacing: 0.18em;
  }

  p {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.9);
    font-weight: 400;
  }
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  @media (max-width: 1024px) {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
`;

const ToggleButton = styled.button<{ $active?: boolean }>`
  background: ${(props) =>
    props.$active
      ? "linear-gradient(135deg, #2ef2a2 0%, #38bdf8 100%)"
      : "rgba(255, 255, 255, 0.08)"};
  color: ${(props) => (props.$active ? "#05060a" : "rgba(255, 255, 255, 0.7)")};
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  padding: clamp(6px, 1.2vw, 8px) clamp(12px, 2vw, 16px);
  font-size: clamp(10px, 1.2vw, 12px);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const SpectatorsContainer = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background: rgba(5, 6, 10, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 12px 16px;
  max-width: 200px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(5, 6, 10, 0.5);
  z-index: 15;
`;

const SpectatorsTitle = styled.div`
  font-size: 12px;
  color: #a78bfa;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const SpectatorsList = styled.div`
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
`;

const SpectatorItem = styled.div`
  margin: 4px 0;
  padding: 4px 0;
`;

const BettingStatusContainer = styled.div`
  position: absolute;
  bottom: 600px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(5, 6, 10, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 20px 30px;
  z-index: 110;
  text-align: center;
  min-width: 300px;
  box-shadow: 0 10px 40px rgba(5, 6, 10, 0.7);
  backdrop-filter: blur(10px);
`;

const BettingStatusTitle = styled.h2`
  color: #38bdf8;
  margin: 0 0 15px 0;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const BettingStatusList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 15px;
`;

const BettingStatusItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 15px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: white;
`;

const BettingStatusBadge = styled.span<{ $hasBet?: boolean }>`
  padding: 6px 14px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  ${(props) =>
    props.$hasBet
      ? `
    background: linear-gradient(135deg, #2ef2a2 0%, #38bdf8 100%);
    color: #05060a;
  `
      : `
    background: rgba(255, 255, 255, 0.1);
    color: white;
  `}
`;

const VotePromptContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(5, 6, 10, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 20px;
  padding: 40px;
  z-index: 300;
  text-align: center;
  min-width: 400px;
  box-shadow: 0 10px 40px rgba(5, 6, 10, 0.8);
  backdrop-filter: blur(10px);
`;

const VoteTitle = styled.h2`
  color: #38bdf8;
  font-size: 24px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  margin-bottom: 15px;
`;

const VoteMessage = styled.p`
  color: rgba(255, 255, 255, 0.9);
  font-size: 15px;
  margin-bottom: 30px;
  line-height: 1.5;
`;

const VoteButtons = styled.div`
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-bottom: 20px;
`;

const VoteButton = styled.button<{ $selected?: boolean }>`
  padding: 15px 30px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: linear-gradient(135deg, #2ef2a2 0%, #38bdf8 100%);
  color: #05060a;
  font-size: 15px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(56, 189, 248, 0.4);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${(props) =>
    props.$selected
      ? `
    border-color: rgba(255, 255, 255, 0.6);
    box-shadow: 0 0 20px rgba(56, 189, 248, 0.4);
  `
      : ""}
`;

const VoteStatus = styled.div`
  margin-top: 20px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #38bdf8;
  font-size: 13px;
  font-weight: 600;
`;

export default function GameRoom() {
  const [showChat, setShowChat] = useState(false);
  const {
    connected,
    roomId,
    players,
    dealer,
    gameState,
    error,
    startGame,
    leaveRoom,
    getCurrentPlayer,
    isPlayerTurn,
    currentTurn,
    hintsEnabled,
    toggleHints,
    autoSkipNewRound,
    setAutoSkipNewRound,
    startNewRound,
    kickPlayer,
    socket,
    isPickingUpCards,
    showVotePrompt,
    voteStatus,
    hasVoted,
    voteReset,
  } = useGame();

  useEffect(() => {
    if (connected && !roomId) {
      leaveRoom();
    }
  }, [connected, roomId, leaveRoom]);

  const currentPlayer = getCurrentPlayer();

  const handleLeaveRoom = () => {
    leaveRoom();
  };

  const isHost = players.length > 0 && socket?.id === players[0]?.id;

  const handleAutoSkipToggle = () => {
    setAutoSkipNewRound(!autoSkipNewRound);
  };

  const handleKickPlayer = (playerId: string) => {
    if (!roomId) {
      alert("Error: No room ID found. Please refresh the page.");
      return;
    }
    kickPlayer(playerId);
  };

  const getBettingStatus = () => {
    if (gameState !== "betting") return null;

    const activePlayers = players.filter(
      (player) =>
        (player.balance > 0 || player.bet > 0) &&
        player.status !== "spectating" &&
        !player.id.includes("-split"),
    );

    const playersWithBets = activePlayers.filter((player) => player.bet > 0);
    const playersWithoutBets = activePlayers.filter((player) => player.bet === 0 || !player.bet);

    return {
      total: activePlayers.length,
      withBets: playersWithBets.length,
      withoutBets: playersWithoutBets.length,
      players: activePlayers.map((player) => ({
        username: player.username,
        hasBet: player.bet > 0,
        bet: player.bet || 0,
      })),
    };
  };

  const renderPlayerSeats = () => {
    const activePlayers = players.filter((player) => {
      if (gameState === "betting" && player.balance <= 0 && player.bet === 0) return false;
      return player.status !== "spectating";
    });

    return activePlayers.map((player, index) => {
      const isMainPlayer = player.id === currentPlayer?.id;
      const isSplitHandOfCurrentPlayer = player.originalPlayer === currentPlayer?.id;
      const isThisCurrentPlayer = isMainPlayer || isSplitHandOfCurrentPlayer;

      let animationPlayerIndex = index;
      if (player.id.includes("-split") && player.originalPlayer) {
        const parentPlayerIndex = activePlayers.findIndex((p) => p.id === player.originalPlayer);
        if (parentPlayerIndex !== -1) {
          animationPlayerIndex = parentPlayerIndex;
        }
      }

      return (
        <PlayerSeat
          key={player.id}
          player={player}
          isCurrentPlayer={isThisCurrentPlayer}
          isPlayerTurn={player.id === currentTurn}
          gameState={gameState}
          isHost={isHost}
          onKick={handleKickPlayer}
          isPickingUpCards={isPickingUpCards}
          playerIndex={animationPlayerIndex}
        />
      );
    });
  };

  const getSpectators = () => {
    const spectators = players.filter((player) => {
      if (player.status === "spectating") return true;
      if (gameState === "betting" && player.balance <= 0 && player.bet === 0) return true;
      return false;
    });

    return spectators;
  };

  const renderControls = () => {
    const activePlayer = getCurrentPlayer();

    const hasBlackjack = activePlayer?.status === "blackjack";

    const canSplit =
      activePlayer?.cards?.length === 2 &&
      activePlayer.cards[0].value === activePlayer.cards[1].value &&
      activePlayer.balance >= activePlayer.bet &&
      !activePlayer.id.includes("-split");

    if (gameState === "betting") {
      const currentBalance = currentPlayer?.balance ?? 0;
      const currentBet = currentPlayer?.bet ?? 0;
      if (
        (currentBalance <= 0 && currentBet === 0) ||
        currentPlayer?.status === "spectating"
      ) {
        return (
          <div
            style={{
              textAlign: "center",
              padding: "15px",
              backgroundColor: "rgba(5,6,10,0.7)",
              borderRadius: "10px",
              color: "#a78bfa",
            }}
          >
            You are out of funds and will spectate this round
          </div>
        );
      }

      return <BettingPanel playerBalance={currentPlayer?.balance || 0} />;
    }

    if (gameState === "playing" && isPlayerTurn() && !hasBlackjack) {
      return <PlayerControls currentPlayer={activePlayer} canSplit={Boolean(canSplit)} />;
    }

    return null;
  };

  return (
    <GameRoomContainer>
      {error && <ErrorMessage>{error}</ErrorMessage>}

      <GameHeader>
        <RoomInfo>
          <RoomTitle>Blackjack Table</RoomTitle>
          {roomId && <RoomCode>Room: {roomId}</RoomCode>}
          <PlayerCount>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16,21H8A1,1 0 0,1 7,20V12.07L5.7,13.07C5.31,13.46 4.68,13.46 4.29,13.07L1.46,10.29C1.07,9.9 1.07,9.27 1.46,8.88L7.34,3H9C9,4.1 10.34,5 12,5C13.66,5 15,4.1 15,3H16.66L22.54,8.88C22.93,9.27 22.93,9.9 22.54,10.29L19.71,13.12C19.32,13.5 18.69,13.5 18.3,13.12L17,12.12V20A1,1 0 0,1 16,21"></path>
            </svg>
            {players.length} Player{players.length !== 1 ? "s" : ""}
          </PlayerCount>
        </RoomInfo>

        <HeaderControls>
          {isHost && (
            <ToggleButton $active={autoSkipNewRound} onClick={handleAutoSkipToggle} title={autoSkipNewRound ? "Auto Next Round" : "Manual Next Round"}>
              <span role="img" aria-label="auto-next">
                🔄
              </span>
              {autoSkipNewRound ? "Auto Next Round: On" : "Auto Next Round: Off"}
            </ToggleButton>
          )}

          <ToggleButton $active={hintsEnabled} onClick={toggleHints} title={hintsEnabled ? "Disable strategy hints" : "Enable strategy hints"}>
            <span role="img" aria-label="hint">
              💡
            </span>
            {hintsEnabled ? "Strategy Help: On" : "Strategy Help: Off"}
          </ToggleButton>

          <LeaveButton onClick={handleLeaveRoom}>Leave Table</LeaveButton>
        </HeaderControls>
      </GameHeader>

      <GameContent>
        <GameTable>
          <DealerSection>
            {(gameState === "playing" || gameState === "ended" || isPickingUpCards) && (
              <DealerArea
                dealer={dealer}
                gameState={gameState}
                currentTurn={currentTurn}
                isPickingUpCards={isPickingUpCards}
                players={players}
              />
            )}
          </DealerSection>

          <PlayersSection>{renderPlayerSeats()}</PlayersSection>

          {isPickingUpCards && (
            <RoundEndedMessage>
              <h2>🎴 Round Ended</h2>
              <p>Dealer is collecting cards...</p>
            </RoundEndedMessage>
          )}

          {showVotePrompt && (
            <VotePromptContainer>
              <VoteTitle>💸 All Players Lost!</VoteTitle>
              <VoteMessage>
                Everyone ran out of money! Click continue to reset the game and start fresh.
              </VoteMessage>
              <VoteButtons>
                <VoteButton $selected={hasVoted} onClick={() => voteReset("continue")} disabled={hasVoted}>
                  ✅ Continue
                </VoteButton>
              </VoteButtons>
              {voteStatus && (
                <VoteStatus>
                  Votes: {voteStatus.votesReceived}/{voteStatus.totalPlayers}{" "}
                  {voteStatus.votesReceived < voteStatus.totalPlayers && " - Waiting for other players..."}
                </VoteStatus>
              )}
            </VotePromptContainer>
          )}

          <ControlsSection>{renderControls()}</ControlsSection>

          {gameState === "waiting" && (
            <>
              {isHost && players.length >= 2 ? (
                <StartGameButton onClick={startGame}>Start Game</StartGameButton>
              ) : (
                <WaitingMessage>
                  <h2>Waiting for players...</h2>
                  <p>
                    {isHost
                      ? "You need at least one more player to start the game."
                      : "Waiting for the host to start the game."}
                  </p>
                </WaitingMessage>
              )}
            </>
          )}

          {getSpectators().length > 0 && (
            <SpectatorsContainer>
              <SpectatorsTitle>
                <span role="img" aria-label="spectators">
                  👁️
                </span>{" "}
                Spectators
              </SpectatorsTitle>
              <SpectatorsList>
                {getSpectators().map((spectator: Player) => (
                  <SpectatorItem key={spectator.id}>{spectator.username}</SpectatorItem>
                ))}
              </SpectatorsList>
            </SpectatorsContainer>
          )}

          {gameState === "betting" &&
            (() => {
              const bettingStatus = getBettingStatus();
              if (!bettingStatus || bettingStatus.total === 0) return null;

              return (
                <BettingStatusContainer key={`betting-status-${bettingStatus.withBets}-${bettingStatus.total}`}>
                  <BettingStatusTitle>
                    <span role="img" aria-label="betting">
                      💰
                    </span>
                    Betting Phase
                  </BettingStatusTitle>
                  <div style={{ color: "rgba(255,255,255,0.7)", marginBottom: "10px" }}>
                    {bettingStatus.withBets} of {bettingStatus.total} players have placed bets
                  </div>
                  <BettingStatusList>
                    {bettingStatus.players.map((player: { username: string; hasBet: boolean; bet: number }) => (
                      <BettingStatusItem key={`${player.username}-${player.hasBet}-${player.bet}`}>
                        <span>{player.username}</span>
                        <BettingStatusBadge $hasBet={player.hasBet}>
                          {player.hasBet ? `✓ Bet: $${player.bet}` : "Waiting..."}
                        </BettingStatusBadge>
                      </BettingStatusItem>
                    ))}
                  </BettingStatusList>
                </BettingStatusContainer>
              );
            })()}
        </GameTable>

        <SidebarContainer>
          <GameHistory />
        </SidebarContainer>

        <ChatButton onClick={() => setShowChat(true)} title="Open Chat">
          💬
        </ChatButton>

        {showChat && (
          <>
            <ModalOverlay onClick={() => setShowChat(false)} />
            <ChatModal>
              <ChatModalHeader>
                <ChatModalTitle>💬 Chat</ChatModalTitle>
                <CloseButton onClick={() => setShowChat(false)}>×</CloseButton>
              </ChatModalHeader>
              <ChatModalContent>
                <Chat />
              </ChatModalContent>
            </ChatModal>
          </>
        )}
      </GameContent>
    </GameRoomContainer>
  );
}
