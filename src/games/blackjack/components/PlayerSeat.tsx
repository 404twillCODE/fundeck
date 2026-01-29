"use client";

import React from "react";
import styled, { css, keyframes } from "styled-components";

import Card from "@/games/blackjack/components/Card";
import type { Player } from "@/games/blackjack/types";

const glow = keyframes`
  0%, 100% {
    box-shadow: 0 0 10px rgba(46, 242, 162, 0.25),
                0 0 20px rgba(56, 189, 248, 0.15);
  }
  50% {
    box-shadow: 0 0 18px rgba(46, 242, 162, 0.4),
                0 0 30px rgba(56, 189, 248, 0.25);
  }
`;

const borderGlow = keyframes`
  0%, 100% {
    border-color: rgba(46, 242, 162, 0.4);
  }
  50% {
    border-color: rgba(56, 189, 248, 0.7);
  }
`;

const SeatContainer = styled.div<{ $isPlayerTurn?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: clamp(150px, 18vw, 200px);
  position: relative;
  margin: 0 clamp(8px, 2vw, 15px) clamp(12px, 2vw, 20px);
  padding: clamp(10px, 2vw, 15px);
  border-radius: 20px;
  border: ${(props) =>
    props.$isPlayerTurn ? "2px solid rgba(46, 242, 162, 0.4)" : "2px solid transparent"};
  transition: all 0.3s ease;
  ${(props) =>
    props.$isPlayerTurn &&
    css`
      animation: ${glow} 3s ease-in-out infinite, ${borderGlow} 3s ease-in-out infinite;
      background: linear-gradient(
        135deg,
        rgba(46, 242, 162, 0.08) 0%,
        rgba(5, 6, 10, 0.2) 100%
      );
    `}
`;

const UsernameDisplay = styled.div<{ $isCurrentPlayer?: boolean }>`
  font-size: clamp(0.8rem, 1.4vw, 0.95rem);
  font-weight: 700;
  padding: clamp(6px, 1.2vw, 8px) clamp(10px, 2vw, 16px);
  margin-bottom: 8px;
  background: ${(props) =>
    props.$isCurrentPlayer
      ? "linear-gradient(135deg, rgba(46, 242, 162, 0.8) 0%, rgba(56, 189, 248, 0.8) 100%)"
      : "linear-gradient(135deg, rgba(5, 6, 10, 0.8) 0%, rgba(0, 0, 0, 0.85) 100%)"};
  color: ${(props) => (props.$isCurrentPlayer ? "#05060a" : "white")};
  border: 1px solid
    ${(props) => (props.$isCurrentPlayer ? "rgba(46, 242, 162, 0.8)" : "rgba(255, 255, 255, 0.2)")};
  border-radius: 20px;
  text-align: center;
  min-width: 100px;
  z-index: 5;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  box-shadow: 0 4px 15px rgba(5, 6, 10, 0.3);
`;

const BalanceDisplay = styled.div`
  font-size: clamp(0.75rem, 1.2vw, 0.85rem);
  padding: clamp(4px, 1vw, 6px) clamp(8px, 1.8vw, 12px);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  margin-bottom: 10px;
  z-index: 5;
  font-weight: 600;
`;

const CardArea = styled.div`
  display: flex;
  justify-content: center;
  min-height: clamp(96px, 12vw, 130px);
  margin-bottom: 10px;
  position: relative;
`;

const BetCircle = styled.div<{ $active?: boolean }>`
  width: clamp(52px, 7vw, 70px);
  height: clamp(52px, 7vw, 70px);
  border-radius: 50%;
  background: ${(props) =>
    props.$active
      ? "linear-gradient(135deg, rgba(46, 242, 162, 0.3) 0%, rgba(56, 189, 248, 0.2) 100%)"
      : "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(5, 6, 10, 0.3) 100%)"};
  border: 1px solid ${(props) => (props.$active ? "rgba(46, 242, 162, 0.7)" : "rgba(255, 255, 255, 0.2)")};
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  margin-top: 10px;
  z-index: 1;
`;

const BetAmount = styled.div`
  background: linear-gradient(90deg, #38bdf8, #2ef2a2);
  color: #05060a;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: clamp(0.7rem, 1.2vw, 0.85rem);
  position: absolute;
  top: -15px;
  z-index: 6;
  box-shadow: 0 4px 15px rgba(46, 242, 162, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const ScoreChip = styled.div<{ $score: number }>`
  position: absolute;
  top: 45px;
  right: -15px;
  background: ${(props) =>
    props.$score > 21
      ? "linear-gradient(135deg, #f87171 0%, #fb7185 100%)"
      : props.$score === 21
      ? "linear-gradient(135deg, #38bdf8 0%, #2ef2a2 100%)"
      : "linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.08) 100%)"};
  color: ${(props) => (props.$score > 21 ? "white" : "#05060a")};
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  width: clamp(24px, 3.6vw, 30px);
  height: clamp(24px, 3.6vw, 30px);
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: clamp(0.7rem, 1.2vw, 0.85rem);
  box-shadow: 0 2px 5px rgba(5, 6, 10, 0.2);
  z-index: 10;
`;

const StatusBadge = styled.div<{ $status?: string | null }>`
  position: absolute;
  top: 95px;
  right: 20px;
  background-color: ${(props) => {
    if (props.$status === "busted") return "#f87171";
    if (props.$status === "blackjack") return "#2ef2a2";
    if (props.$status === "stood") return "#38bdf8";
    if (props.$status === "surrendered") return "#94a3b8";
    return "transparent";
  }};
  color: #05060a;
  padding: clamp(2px, 0.6vw, 3px) clamp(6px, 1.2vw, 8px);
  border-radius: 4px;
  font-size: clamp(0.6rem, 1.1vw, 0.7rem);
  font-weight: bold;
  text-transform: uppercase;
  z-index: 10;
`;

const getStatusLabel = (status?: string | null) => {
  switch (status) {
    case "busted":
      return "Busted!";
    case "blackjack":
      return "Blackjack!";
    case "stood":
      return "Stand";
    case "surrendered":
      return "Fold";
    case "spectating":
      return "Spectating";
    default:
      return "";
  }
};

const KickButton = styled.button`
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: #fb7185;
  color: white;
  border: none;
  border-radius: 50%;
  width: clamp(22px, 3.6vw, 28px);
  height: clamp(22px, 3.6vw, 28px);
  font-size: clamp(12px, 2vw, 16px);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 30;
  opacity: 0;

  &:hover {
    background-color: #f43f5e;
    transform: scale(1.1);
  }
`;

type PlayerSeatProps = {
  player: Player;
  isCurrentPlayer: boolean;
  isPlayerTurn: boolean;
  gameState: string;
  isHost: boolean;
  onKick?: (playerId: string) => void;
  isPickingUpCards?: boolean;
  playerIndex?: number;
};

export default function PlayerSeat({
  player,
  isCurrentPlayer,
  isPlayerTurn,
  gameState,
  isHost,
  onKick,
  isPickingUpCards = false,
  playerIndex = 0,
}: PlayerSeatProps) {
  if (!player) return <SeatContainer />;

  const { username, balance, cards, bet, status, score } = player;

  const isSplitHand = player.id.includes("-split");
  const isSplitHandOfCurrentPlayer = isSplitHand && isCurrentPlayer;
  const effectivePlayerIndex = playerIndex;

  const showKickButton =
    isHost && !isCurrentPlayer && gameState === "waiting" && !player.id.includes("-split") && onKick;

  const handleKick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (window.confirm(`Are you sure you want to kick ${username}?`)) {
      onKick?.(player.id);
    }
  };

  return (
    <SeatContainer
      $isPlayerTurn={isPlayerTurn}
      onMouseEnter={(event) => {
        if (showKickButton) {
          event.currentTarget.querySelector("button")?.style.setProperty("opacity", "1");
        }
      }}
      onMouseLeave={(event) => {
        if (showKickButton) {
          event.currentTarget.querySelector("button")?.style.setProperty("opacity", "0");
        }
      }}
    >
      {showKickButton && (
        <KickButton onClick={handleKick} title={`Kick ${username}`}>
          ✕
        </KickButton>
      )}

      <UsernameDisplay $isCurrentPlayer={isCurrentPlayer || isSplitHandOfCurrentPlayer}>
        {username}
      </UsernameDisplay>

      <BalanceDisplay>${balance.toLocaleString()}</BalanceDisplay>

      <CardArea>
        {cards &&
          cards.map((card, index) => {
            const isNewCard = index === cards.length - 1 && !isPickingUpCards;
            const pickupDelay = isPickingUpCards ? effectivePlayerIndex * 300 : 0;
            return (
              <Card
                key={`${card.suit}-${card.value}-${index}`}
                card={card}
                isNewCard={isNewCard}
                isPickedUp={isPickingUpCards}
                pickupDelay={pickupDelay}
              />
            );
          })}
      </CardArea>

      {score > 0 && <ScoreChip $score={score}>{score}</ScoreChip>}

      {status && <StatusBadge $status={status}>{getStatusLabel(status)}</StatusBadge>}

      <BetCircle $active={bet > 0}>{bet > 0 && <BetAmount>${bet}</BetAmount>}</BetCircle>
    </SeatContainer>
  );
}
