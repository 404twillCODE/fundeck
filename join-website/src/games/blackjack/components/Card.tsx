"use client";

import React, { useEffect, useState } from "react";
import styled, { css, keyframes } from "styled-components";

import type { Card as CardType } from "@/games/blackjack/types";

const dealCard = keyframes`
  from {
    transform: translateY(-50vh) rotate(180deg) scale(0.4);
    opacity: 0;
  }
  to {
    transform: translateY(0) rotate(0deg) scale(1);
    opacity: 1;
  }
`;

const pickupCard = keyframes`
  from {
    transform: translate(0, 0) rotate(0deg) scale(1);
    opacity: 1;
  }
  to {
    transform: translate(0, -50vh) rotate(180deg) scale(0.3);
    opacity: 0;
  }
`;

const CardContainer = styled.div<{
  $hidden?: boolean;
  $color?: "red" | "black";
  $isNewCard?: boolean;
  $isPickedUp?: boolean;
}>`
  position: relative;
  width: 80px;
  height: 120px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  background-color: ${(props) => (props.$hidden ? "#0b1020" : "white")};
  color: ${(props) => (props.$color === "red" ? "#d32f2f" : "#111827")};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 5px;
  margin: 0 -15px;
  transform-origin: center center;
  user-select: none;
  backface-visibility: hidden;
  perspective: 1000px;
  animation: ${(props) => {
    if (props.$isPickedUp) {
      return css`
        ${pickupCard} 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards
      `;
    }
    if (props.$isNewCard) {
      return css`
        ${dealCard} 0.4s ease-out forwards
      `;
    }
    return "none";
  }};
  opacity: ${(props) => {
    if (props.$isPickedUp) return 1;
    if (props.$isNewCard) return 0;
    return 1;
  }};
  ${(props) =>
    props.$isNewCard || props.$isPickedUp
      ? css`
          will-change: transform, opacity;
          transition: transform 0.1s ease-out, opacity 0.1s ease-out;
        `
      : ""}

  &:hover {
    transform: translateY(-10px);
    z-index: 10;
    transition: transform 0.2s ease;
  }
`;

const CardPattern = styled.div<{ $hidden?: boolean }>`
  position: absolute;
  inset: 0;
  border-radius: 6px;
  background-color: #0b1020;
  display: ${(props) => (props.$hidden ? "block" : "none")};
  background-image: linear-gradient(45deg, #111a35 25%, transparent 25%),
    linear-gradient(-45deg, #111a35 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #111a35 75%),
    linear-gradient(-45deg, transparent 75%, #111a35 75%);
  background-size: 10px 10px;
  background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
`;

const CardBack = styled.div<{ $hidden?: boolean }>`
  position: absolute;
  top: 10%;
  left: 10%;
  width: 80%;
  height: 80%;
  border-radius: 3px;
  background-color: #0a0f1a;
  display: ${(props) => (props.$hidden ? "block" : "none")};
  border: 2px solid rgba(56, 189, 248, 0.6);
`;

const CardTop = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`;

const CardBottom = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  transform: rotate(180deg);
`;

const CardCenter = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 2rem;
  font-weight: bold;
`;

const CardValue = styled.div`
  font-size: 1.1rem;
  font-weight: bold;
  line-height: 1;
`;

const CardSuit = styled.div`
  font-size: 1.1rem;
  line-height: 1;
`;

const getSuitSymbol = (suit: string) => {
  switch (suit) {
    case "hearts":
      return "♥";
    case "diamonds":
      return "♦";
    case "clubs":
      return "♣";
    case "spades":
      return "♠";
    default:
      return "";
  }
};

const getCardColor = (suit: string) => {
  return suit === "hearts" || suit === "diamonds" ? "red" : "black";
};

const getCardValue = (value: string) => {
  switch (value) {
    case "ace":
      return "A";
    case "king":
      return "K";
    case "queen":
      return "Q";
    case "jack":
      return "J";
    default:
      return value;
  }
};

type CardProps = {
  card?: CardType | null;
  hidden?: boolean;
  isNewCard?: boolean;
  isPickedUp?: boolean;
  pickupDelay?: number;
};

export default function Card({
  card,
  hidden = false,
  isNewCard = false,
  isPickedUp = false,
  pickupDelay = 0,
}: CardProps) {
  const [shouldAnimate, setShouldAnimate] = useState(isNewCard);
  const [shouldPickup, setShouldPickup] = useState(false);

  useEffect(() => {
    if (isNewCard) {
      setShouldAnimate(true);
      const timer = setTimeout(() => {
        setShouldAnimate(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isNewCard]);

  useEffect(() => {
    if (isPickedUp && pickupDelay >= 0) {
      const timer = setTimeout(() => {
        setShouldPickup(true);
      }, pickupDelay);
      return () => clearTimeout(timer);
    }
  }, [isPickedUp, pickupDelay]);

  if (!card && !hidden) return null;

  if (hidden) {
    return (
      <CardContainer $hidden $isNewCard={shouldAnimate} $isPickedUp={shouldPickup}>
        <CardPattern $hidden />
        <CardBack $hidden />
      </CardContainer>
    );
  }

  const { suit, value } = card ?? { suit: "spades", value: "ace" };
  const color = getCardColor(suit);
  const suitSymbol = getSuitSymbol(suit);
  const displayValue = getCardValue(value);

  return (
    <CardContainer $color={color} $isNewCard={shouldAnimate} $isPickedUp={shouldPickup}>
      <CardTop>
        <CardValue>{displayValue}</CardValue>
        <CardSuit>{suitSymbol}</CardSuit>
      </CardTop>
      <CardCenter>{suitSymbol}</CardCenter>
      <CardBottom>
        <CardValue>{displayValue}</CardValue>
        <CardSuit>{suitSymbol}</CardSuit>
      </CardBottom>
    </CardContainer>
  );
}
