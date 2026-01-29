"use client";

import React from "react";
import styled from "styled-components";

import Card from "@/games/blackjack/components/Card";
import type { Dealer, Player } from "@/games/blackjack/types";

const DealerContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: clamp(220px, 28vw, 320px);
`;

const DealerTitle = styled.div`
  font-size: clamp(0.95rem, 1.8vw, 1.1rem);
  font-weight: 700;
  padding: clamp(8px, 1.6vw, 10px) clamp(14px, 2.4vw, 20px);
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #38bdf8;
  border-radius: 20px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  box-shadow: 0 4px 15px rgba(5, 6, 10, 0.3);
`;

const DealerScore = styled.span<{ $score: number }>`
  margin-left: 12px;
  background: ${(props) =>
    props.$score > 21
      ? "linear-gradient(135deg, #f87171 0%, #fb7185 100%)"
      : props.$score >= 17
      ? "linear-gradient(135deg, #2ef2a2 0%, #38bdf8 100%)"
      : "linear-gradient(135deg, rgba(56, 189, 248, 0.8) 0%, rgba(46, 242, 162, 0.8) 100%)"};
  color: #05060a;
  padding: clamp(3px, 0.8vw, 4px) clamp(8px, 1.6vw, 12px);
  border-radius: 12px;
  font-size: clamp(0.7rem, 1.2vw, 0.85rem);
  font-weight: 700;
  box-shadow: 0 2px 10px rgba(5, 6, 10, 0.3);
`;

const CardArea = styled.div`
  display: flex;
  justify-content: center;
  min-height: clamp(96px, 12vw, 130px);
  position: relative;
`;

const DealerStatus = styled.div`
  margin-top: 8px;
  font-size: clamp(0.7rem, 1.2vw, 0.85rem);
  color: rgba(255, 255, 255, 0.7);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
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
      : "linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%)"};
  color: ${(props) => (props.$score > 21 ? "white" : "#05060a")};
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  width: clamp(24px, 3.6vw, 30px);
  height: clamp(24px, 3.6vw, 30px);
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  font-size: clamp(0.7rem, 1.2vw, 0.85rem);
  box-shadow: 0 4px 10px rgba(5, 6, 10, 0.3);
  z-index: 10;
`;

type DealerAreaProps = {
  dealer: Dealer;
  gameState: string;
  currentTurn: string | null;
  isPickingUpCards?: boolean;
  players?: Player[];
};

export default function DealerArea({
  dealer,
  gameState,
  currentTurn,
  isPickingUpCards = false,
  players = [],
}: DealerAreaProps) {
  const { cards, score } = dealer;
  const isDealerTurn = currentTurn === "dealer";
  const showAllCards = gameState === "ended" || isDealerTurn || isPickingUpCards;

  const visibleScore = showAllCards
    ? score
    : cards && cards.length > 0
    ? calculateVisibleScore(cards, showAllCards)
    : 0;

  const getDealerStatus = () => {
    if (showAllCards) {
      if (score > 21) return "Dealer busts";
      if (score >= 17) return `Dealer stands on ${score}`;
      return "Dealer hits";
    }
    return "Dealer stands on 17";
  };

  function calculateVisibleScore(cardsToScore: Dealer["cards"], showAll: boolean) {
    if (!cardsToScore || cardsToScore.length === 0) return 0;

    const visibleCards = showAll ? cardsToScore : [cardsToScore[0]];

    let total = 0;
    let aces = 0;

    for (const card of visibleCards) {
      if (card.value === "ace") {
        aces += 1;
        total += 11;
      } else if (["king", "queen", "jack"].includes(card.value)) {
        total += 10;
      } else {
        total += parseInt(card.value, 10);
      }
    }

    while (total > 21 && aces > 0) {
      total -= 10;
      aces -= 1;
    }

    return total;
  }

  return (
    <DealerContainer>
      <DealerTitle>
        Dealer
        {cards && cards.length > 0 && <DealerScore $score={visibleScore}>{visibleScore}</DealerScore>}
      </DealerTitle>

      <CardArea>
        {cards &&
          cards.map((card, index) => {
            const isHidden = index === 1 && !showAllCards;
            const isNewCard = index === cards.length - 1 && !isPickingUpCards;
            const activePlayerCount = players?.filter((player) => !player.id.includes("-split")).length || 0;
            const pickupDelay = isPickingUpCards ? activePlayerCount * 300 + index * 100 : 0;
            return (
              <Card
                key={`${card.suit}-${card.value}-${index}`}
                card={card}
                hidden={isHidden}
                isNewCard={isNewCard}
                isPickedUp={isPickingUpCards}
                pickupDelay={pickupDelay}
              />
            );
          })}

        {cards && cards.length > 0 && showAllCards && <ScoreChip $score={score}>{score}</ScoreChip>}
      </CardArea>

      <DealerStatus>{getDealerStatus()}</DealerStatus>
    </DealerContainer>
  );
}
