"use client";

import React, { useEffect, useState } from "react";
import styled from "styled-components";

import { useGame } from "@/games/blackjack/contexts/GameContext";
import type { Player } from "@/games/blackjack/types";

const ControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  box-shadow: 0 10px 40px rgba(5, 6, 10, 0.6);
  backdrop-filter: blur(12px);
`;

const ActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  width: 100%;
  margin-bottom: 1rem;

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const ActionButton = styled.button`
  padding: 1rem 0;
  border-radius: 12px;
  border: 1px solid transparent;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-transform: uppercase;
  letter-spacing: 0.12em;

  &:hover:not(:disabled) {
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(5, 6, 10, 0.45);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const HitButton = styled(ActionButton)`
  background: linear-gradient(135deg, #2ef2a2 0%, #38bdf8 100%);
  color: #05060a;
`;

const StandButton = styled(ActionButton)`
  background: linear-gradient(135deg, #fb7185 0%, #f87171 100%);
  color: white;
`;

const DoubleButton = styled(ActionButton)`
  background: linear-gradient(135deg, #38bdf8 0%, #60a5fa 100%);
  color: #05060a;
`;

const SplitButton = styled(ActionButton)`
  background: linear-gradient(135deg, #a78bfa 0%, #38bdf8 100%);
  color: #05060a;
`;

const SurrenderButton = styled(ActionButton)`
  background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%);
  color: #05060a;
`;

const NewRoundButton = styled(ActionButton)`
  background: linear-gradient(135deg, #a78bfa 0%, #2ef2a2 100%);
  color: #05060a;
  grid-column: span 2;
`;

const Icon = styled.span`
  font-size: 1.4rem;
  margin-bottom: 5px;
`;

const ButtonText = styled.span`
  font-size: 0.8rem;
`;

const HintContainer = styled.div`
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.9) 0%, rgba(46, 242, 162, 0.9) 100%);
  color: #05060a;
  padding: 14px;
  border-radius: 10px;
  margin-bottom: 15px;
  font-weight: 600;
  text-align: center;
  position: relative;
  box-shadow: 0 6px 20px rgba(5, 6, 10, 0.3);
  max-width: 90%;
  margin-left: auto;
  margin-right: auto;
`;

const CloseHintButton = styled.button`
  position: absolute;
  top: 5px;
  right: 5px;
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  color: #05060a;
`;

type PlayerControlsProps = {
  currentPlayer: Player | null;
  canSplit: boolean;
};

export default function PlayerControls({ currentPlayer, canSplit }: PlayerControlsProps) {
  const {
    hit,
    stand,
    doubleDown,
    split,
    surrender,
    startNewRound,
    gameState,
    isPlayerTurn,
    hintsEnabled,
    dealer,
    currentTurn,
    autoSkipNewRound,
  } = useGame();

  const [showHint, setShowHint] = useState(false);
  const [hint, setHint] = useState("");
  const [showHintButton, setShowHintButton] = useState(false);

  useEffect(() => {
    if (!hintsEnabled || !isPlayerTurn()) {
      setShowHintButton(false);
      return;
    }

    setShowHint(false);

    const timer = setTimeout(() => {
      if (currentPlayer && isPlayerTurn()) {
        setShowHintButton(true);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [currentPlayer, isPlayerTurn, hintsEnabled, currentTurn]);

  const handleAction = (action: () => void) => {
    setShowHint(false);
    setShowHintButton(false);
    action();
  };

  const handleShowHint = () => {
    if (currentPlayer && isPlayerTurn()) {
      let hintText = getStrategyHint(currentPlayer);

      if (!hintText || hintText.trim() === "") {
        const total = currentPlayer.score || 0;
        if (total >= 17) {
          hintText = "With a high total, standing is usually best.";
        } else if (total <= 8) {
          hintText = "With a low total, hitting is usually best.";
        } else {
          hintText = `With a total of ${total}, consider the dealer's upcard.`;
        }
      }

      setHint(hintText);
      setShowHint(true);
    }
  };

  const getValue = (card: { value: string }) => {
    if (!card || !card.value) return 0;
    if (card.value === "ace") return 11;
    if (["king", "queen", "jack"].includes(card.value)) return 10;
    return parseInt(card.value, 10) || 0;
  };

  const getDealerUpcard = () => {
    if (!dealer || !dealer.cards || dealer.cards.length === 0) return null;
    const upcard = dealer.cards[0];
    return getValue(upcard);
  };

  const getStrategyHint = (player: Player) => {
    if (!player || !player.cards || player.cards.length === 0) return "Wait for cards to be dealt.";

    const dealerUpcard = getDealerUpcard();
    if (!dealerUpcard) return "Basic strategy: consider your total against dealer upcard.";

    const isPair = player.cards.length === 2 && getValue(player.cards[0]) === getValue(player.cards[1]);
    const hasSoftHand = player.cards.some((card) => card.value === "ace") && player.score <= 21;

    if (isPair) {
      return getPairHint(getValue(player.cards[0]), dealerUpcard);
    }
    if (hasSoftHand) {
      return getSoftTotalHint(player.score, dealerUpcard);
    }
    return getHardTotalHint(player.score, dealerUpcard);
  };

  const getPairHint = (pairValue: number, dealerUpcard: number) => {
    if (pairValue === 11) return "Always split Aces.";
    if (pairValue === 10) return "Never split Tens. Stand with this strong hand.";

    if (pairValue === 9) {
      if ([2, 3, 4, 5, 6, 8, 9].includes(dealerUpcard)) return "Split 9s against dealer.";
      return "Stand with 9s against dealer.";
    }

    if (pairValue === 8) return "Always split 8s.";

    if (pairValue === 7) {
      if (dealerUpcard >= 2 && dealerUpcard <= 7) return "Split 7s against dealer.";
      return "Hit with 7s against dealer.";
    }

    if (pairValue === 6) {
      if (dealerUpcard >= 2 && dealerUpcard <= 6) return "Split 6s against dealer.";
      return "Hit with 6s against dealer.";
    }

    if (pairValue === 5) {
      if (dealerUpcard >= 2 && dealerUpcard <= 9) return "Double with 5s against dealer.";
      return "Hit with 5s against dealer.";
    }

    if (pairValue === 4) {
      if (dealerUpcard === 5 || dealerUpcard === 6) return "Split 4s against dealer.";
      return "Hit with 4s against dealer.";
    }

    if (pairValue === 3 || pairValue === 2) {
      if (dealerUpcard >= 2 && dealerUpcard <= 7) return `Split ${pairValue}s against dealer.`;
      return `Hit with ${pairValue}s against dealer.`;
    }

    return `With a pair of ${pairValue}s, consider hitting.`;
  };

  const getSoftTotalHint = (total: number, dealerUpcard: number) => {
    if (total >= 20) return "Stand with Soft 20 or higher.";
    if (total === 19) {
      if (dealerUpcard === 6) return "Double with Soft 19 against dealer.";
      return "Stand with Soft 19.";
    }
    if (total === 18) {
      if (dealerUpcard >= 2 && dealerUpcard <= 6) return "Double with Soft 18 against dealer.";
      if (dealerUpcard >= 9 || dealerUpcard === 11) return "Hit with Soft 18 against dealer.";
      return "Stand with Soft 18 against dealer.";
    }
    if (total === 17) {
      if (dealerUpcard >= 3 && dealerUpcard <= 6) return "Double with Soft 17 against dealer.";
      return "Hit with Soft 17 against dealer.";
    }
    if (total === 16) {
      if (dealerUpcard >= 4 && dealerUpcard <= 6) return "Double with Soft 16 against dealer.";
      return "Hit with Soft 16 against dealer.";
    }
    if (total === 15) {
      if (dealerUpcard >= 4 && dealerUpcard <= 6) return "Double with Soft 15 against dealer.";
      return "Hit with Soft 15 against dealer.";
    }
    if (total === 14) {
      if (dealerUpcard === 5 || dealerUpcard === 6) return "Double with Soft 14 against dealer.";
      return "Hit with Soft 14 against dealer.";
    }
    if (total === 13) {
      if (dealerUpcard === 5 || dealerUpcard === 6) return "Double with Soft 13 against dealer.";
      return "Hit with Soft 13 against dealer.";
    }
    return `With Soft ${total}, hit to improve your hand.`;
  };

  const getHardTotalHint = (total: number, dealerUpcard: number) => {
    if (total >= 17) return "Stand with 17 or higher.";
    if (total >= 13 && total <= 16) {
      if (dealerUpcard >= 2 && dealerUpcard <= 6) return `Stand with ${total} against dealer.`;
      return `Hit with ${total} against dealer.`;
    }
    if (total === 12) {
      if (dealerUpcard >= 4 && dealerUpcard <= 6) return "Stand with 12 against dealer.";
      return "Hit with 12 against dealer.";
    }
    if (total === 11) return "Always double with 11.";
    if (total === 10) {
      if (dealerUpcard >= 2 && dealerUpcard <= 9) return "Double with 10 against dealer.";
      return "Hit with 10 against dealer.";
    }
    if (total === 9) {
      if (dealerUpcard >= 3 && dealerUpcard <= 6) return "Double with 9 against dealer.";
      return "Hit with 9 against dealer.";
    }
    if (total <= 8) return "Always hit with 8 or lower.";
    return `With a hard total of ${total}, the best play is usually to hit.`;
  };

  const playerTurn = isPlayerTurn();
  const isSplitHand = currentPlayer?.id?.includes("-split");
  const isFirstAction = currentPlayer?.cards?.length === 2;
  const isGameEnded = gameState === "ended";

  const canDoubleDown = playerTurn && isFirstAction;
  const canSurrender = playerTurn && isFirstAction;
  const canSplitHand = canSplit && !isSplitHand;

  return (
    <ControlsContainer>
      {showHint && hint && (
        <HintContainer>
          <span role="img" aria-label="hint">
            💡
          </span>{" "}
          {hint}
          <CloseHintButton onClick={() => setShowHint(false)}>✖</CloseHintButton>
        </HintContainer>
      )}

      <ActionsGrid>
        {isGameEnded && !autoSkipNewRound ? (
          <NewRoundButton onClick={startNewRound} style={{ gridColumn: "1 / span 3", margin: "0 auto", width: "50%" }}>
            <Icon>🔄</Icon>
            <ButtonText>New Round</ButtonText>
          </NewRoundButton>
        ) : (
          <>
            <HitButton onClick={() => handleAction(hit)} disabled={!playerTurn} title="Draw another card">
              <Icon>👆</Icon>
              <ButtonText>Hit</ButtonText>
            </HitButton>

            <StandButton onClick={() => handleAction(stand)} disabled={!playerTurn} title="End your turn">
              <Icon>✋</Icon>
              <ButtonText>Stand</ButtonText>
            </StandButton>

            <DoubleButton
              onClick={() => handleAction(doubleDown)}
              disabled={!playerTurn || !canDoubleDown}
              title="Double your bet and receive one more card"
            >
              <Icon>💰</Icon>
              <ButtonText>Double</ButtonText>
            </DoubleButton>

            <SplitButton
              onClick={() => handleAction(split)}
              disabled={!playerTurn || !canSplitHand}
              title="Split your pair into two hands"
            >
              <Icon>✂️</Icon>
              <ButtonText>Split</ButtonText>
            </SplitButton>

            <SurrenderButton
              onClick={() => handleAction(surrender)}
              disabled={!playerTurn || !canSurrender}
              title="Forfeit half your bet and end your hand"
            >
              <Icon>🏳️</Icon>
              <ButtonText>Surrender</ButtonText>
            </SurrenderButton>

            {hintsEnabled && playerTurn && showHintButton && (
              <ActionButton
                onClick={handleShowHint}
                style={{
                  backgroundColor: "#2ef2a2",
                  color: "#05060a",
                }}
                title="Get strategy advice"
              >
                <Icon>💡</Icon>
                <ButtonText>Show Hint</ButtonText>
              </ActionButton>
            )}
          </>
        )}
      </ActionsGrid>
    </ControlsContainer>
  );
}
