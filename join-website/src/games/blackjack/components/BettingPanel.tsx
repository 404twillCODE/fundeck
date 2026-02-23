"use client";

import React, { useState } from "react";
import styled from "styled-components";

import { useGame } from "@/games/blackjack/contexts/GameContext";

const BettingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 1rem 1.5rem;
  border-radius: 16px;
  z-index: 100;
  box-shadow: 0 10px 40px rgba(5, 6, 10, 0.6);
  backdrop-filter: blur(12px);
  width: clamp(280px, 42vw, 380px);
  max-width: 100%;

  @media (max-width: 640px) {
    width: min(92vw, 340px);
    padding: 0.75rem 1rem;
  }
`;

const Title = styled.h3`
  margin-bottom: 0.75rem;
  color: #38bdf8;
  text-align: center;
  font-size: clamp(0.9rem, 1.8vw, 1.1rem);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
`;

const CustomBetContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0.75rem;
  width: min(90%, 320px);
`;

const CustomBetInput = styled.input`
  padding: 0.7rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background-color: rgba(5, 6, 10, 0.7);
  color: white;
  font-size: clamp(0.8rem, 1.6vw, 0.9rem);
  width: 65%;
  text-align: center;
  font-weight: 600;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: rgba(46, 242, 162, 0.8);
    box-shadow: 0 0 15px rgba(46, 242, 162, 0.2);
    background-color: rgba(5, 6, 10, 0.9);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const Button = styled.button`
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  border: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    &:hover {
      transform: none;
    }
  }
`;

const ApplyCustomBetButton = styled(Button)`
  background: linear-gradient(90deg, #2ef2a2 0%, #38bdf8 100%);
  color: #05060a;
  padding: 0.6rem;
  width: 35%;
  font-size: clamp(0.75rem, 1.4vw, 0.85rem);
  font-weight: 700;
`;

const ChipsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
`;

const Chip = styled.div<{ $selected?: boolean; $disabled?: boolean }>`
  width: clamp(44px, 7vw, 55px);
  height: clamp(44px, 7vw, 55px);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  box-shadow: 0 4px 15px rgba(5, 6, 10, 0.35);

  &:hover {
    transform: translateY(-5px) scale(1.1);
  }

  ${(props) =>
    props.$selected &&
    `
    border: 2px solid #38bdf8;
    transform: translateY(-5px) scale(1.12);
    box-shadow: 0 0 20px rgba(56, 189, 248, 0.5);
  `}

  ${(props) =>
    props.$disabled &&
    `
    opacity: 0.4;
    cursor: not-allowed;
    &:hover {
      transform: none;
    }
  `}
`;

const RedChip = styled(Chip)`
  background: linear-gradient(135deg, #fb7185 0%, #f87171 100%);
  color: white;
`;

const BlueChip = styled(Chip)`
  background: linear-gradient(135deg, #38bdf8 0%, #60a5fa 100%);
  color: #05060a;
`;

const GreenChip = styled(Chip)`
  background: linear-gradient(135deg, #2ef2a2 0%, #38bdf8 100%);
  color: #05060a;
`;

const PurpleChip = styled(Chip)`
  background: linear-gradient(135deg, #a78bfa 0%, #6366f1 100%);
  color: #05060a;
`;

const BlackChip = styled(Chip)`
  background: linear-gradient(135deg, #1f2937 0%, #0f172a 100%);
  color: #38bdf8;
  border: 2px solid rgba(56, 189, 248, 0.6);
`;

const GoldChip = styled(Chip)`
  background: linear-gradient(135deg, #fef9c3 0%, #fde047 100%);
  color: #0f172a;
  font-size: 0.85rem;
  border: 2px solid rgba(253, 224, 71, 0.8);
`;

const BetDisplay = styled.div`
  font-size: clamp(1.1rem, 2vw, 1.4rem);
  margin-bottom: 0.75rem;
  font-weight: 700;
  color: #38bdf8;
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;

const ButtonsContainer = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
`;

const PlaceBetButton = styled(Button)`
  background: linear-gradient(135deg, #2ef2a2 0%, #38bdf8 100%);
  color: #05060a;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;

const ClearButton = styled(Button)`
  background: linear-gradient(135deg, #fb7185 0%, #f87171 100%);
  color: white;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;

const RepeatBetButton = styled(Button)`
  background: linear-gradient(135deg, #a78bfa 0%, #38bdf8 100%);
  color: #05060a;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.12em;
`;

type BettingPanelProps = {
  onBetComplete?: () => void;
  playerBalance: number;
};

export default function BettingPanel({ onBetComplete, playerBalance }: BettingPanelProps) {
  const { placeBet, lastBet } = useGame();
  const [currentBet, setCurrentBet] = useState(0);
  const [selectedChip, setSelectedChip] = useState<number | null>(null);
  const [betPlaced, setBetPlaced] = useState(false);
  const [customBetValue, setCustomBetValue] = useState("");

  const handleChipClick = (value: number) => {
    if (playerBalance < value || playerBalance < currentBet + value) return;

    setCurrentBet((prev) => prev + value);
    setSelectedChip(value);
  };

  const handleClearBet = () => {
    setCurrentBet(0);
    setSelectedChip(null);
  };

  const handlePlaceBet = () => {
    if (currentBet <= 0) return;

    placeBet(currentBet);
    setBetPlaced(true);

    if (onBetComplete && typeof onBetComplete === "function") {
      onBetComplete();
    }
  };

  const handleRepeatBet = () => {
    if (lastBet <= 0 || lastBet > playerBalance) return;

    setCurrentBet(lastBet);
    placeBet(lastBet);
    setBetPlaced(true);

    if (onBetComplete && typeof onBetComplete === "function") {
      onBetComplete();
    }
  };

  const handleCustomBetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/[^0-9.]/g, "");
    const parts = value.split(".");
    if (parts.length > 2) return;
    if (parts.length === 2 && parts[1].length > 2) return;

    setCustomBetValue(value);
  };

  const handleApplyCustomBet = () => {
    const betValue = parseFloat(customBetValue);
    if (Number.isNaN(betValue) || betValue <= 0 || betValue > playerBalance) return;

    const roundedBet = Math.round(betValue * 100) / 100;
    setCurrentBet(roundedBet);
    setSelectedChip(null);
    setCustomBetValue("");
  };

  const handleCustomBetKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleApplyCustomBet();
    }
  };

  const isChipDisabled = (value: number) => {
    return playerBalance < value || playerBalance < currentBet + value;
  };

  if (betPlaced) {
    return (
      <BettingContainer>
        <Title style={{ color: "#2ef2a2" }}>✓ Bet Placed!</Title>
        <div
          style={{
            textAlign: "center",
            padding: "20px",
            color: "rgba(255, 255, 255, 0.7)",
            fontSize: "1rem",
          }}
        >
          Waiting for other players to place their bets...
        </div>
      </BettingContainer>
    );
  }

  return (
    <BettingContainer>
      <Title>Place Your Bet</Title>

      <CustomBetContainer>
        <CustomBetInput
          type="text"
          placeholder="Custom Bet"
          value={customBetValue}
          onChange={handleCustomBetChange}
          onKeyPress={handleCustomBetKeyPress}
        />
        <ApplyCustomBetButton onClick={handleApplyCustomBet}>Apply</ApplyCustomBetButton>
      </CustomBetContainer>

      <ChipsContainer>
        <RedChip onClick={() => handleChipClick(5)} $selected={selectedChip === 5} $disabled={isChipDisabled(5)}>
          $5
        </RedChip>
        <BlueChip onClick={() => handleChipClick(10)} $selected={selectedChip === 10} $disabled={isChipDisabled(10)}>
          $10
        </BlueChip>
        <GreenChip onClick={() => handleChipClick(25)} $selected={selectedChip === 25} $disabled={isChipDisabled(25)}>
          $25
        </GreenChip>
        <PurpleChip onClick={() => handleChipClick(50)} $selected={selectedChip === 50} $disabled={isChipDisabled(50)}>
          $50
        </PurpleChip>
        <BlackChip onClick={() => handleChipClick(100)} $selected={selectedChip === 100} $disabled={isChipDisabled(100)}>
          $100
        </BlackChip>
        <GoldChip
          onClick={() => handleChipClick(playerBalance)}
          $selected={currentBet === playerBalance}
          $disabled={playerBalance <= 0}
        >
          ALL IN
        </GoldChip>
      </ChipsContainer>

      <BetDisplay>${currentBet}</BetDisplay>

      <ButtonsContainer>
        <ClearButton onClick={handleClearBet} disabled={currentBet === 0}>
          Clear
        </ClearButton>
        <PlaceBetButton onClick={handlePlaceBet} disabled={currentBet === 0}>
          Place Bet
        </PlaceBetButton>
        {lastBet > 0 && (
          <RepeatBetButton onClick={handleRepeatBet} disabled={lastBet > playerBalance}>
            Repeat ${lastBet}
          </RepeatBetButton>
        )}
      </ButtonsContainer>
    </BettingContainer>
  );
}
