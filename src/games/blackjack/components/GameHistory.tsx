"use client";

import React from "react";
import styled from "styled-components";

import { useGame } from "@/games/blackjack/contexts/GameContext";
import type { Card } from "@/games/blackjack/types";

 const HistoryContainer = styled.div`
   width: 100%;
   height: 100%;
   display: flex;
   flex-direction: column;
   background: rgba(255, 255, 255, 0.04);
   border-left: 1px solid rgba(255, 255, 255, 0.1);
   overflow: hidden;
   box-shadow: -4px 0 20px rgba(5, 6, 10, 0.4);
   backdrop-filter: blur(12px);
 `;

 const HistoryHeader = styled.div`
   padding: clamp(10px, 1.6vw, 15px);
   background: rgba(5, 6, 10, 0.5);
   font-weight: 700;
   color: #38bdf8;
   border-bottom: 1px solid rgba(255, 255, 255, 0.1);
   display: flex;
   align-items: center;
   text-transform: uppercase;
   letter-spacing: 0.1em;
 `;

 const HistoryList = styled.div`
   flex: 1;
   overflow-y: auto;
   background: rgba(5, 6, 10, 0.35);

   &::-webkit-scrollbar {
     width: 8px;
   }

   &::-webkit-scrollbar-track {
     background: rgba(5, 6, 10, 0.5);
   }

   &::-webkit-scrollbar-thumb {
     background: linear-gradient(135deg, #38bdf8, #2ef2a2);
     border-radius: 4px;
   }
 `;

 const HistoryItem = styled.div`
   padding: clamp(10px, 1.4vw, 12px);
   border-bottom: 1px solid rgba(255, 255, 255, 0.08);
   transition: all 0.3s ease;

   &:hover {
     background: rgba(56, 189, 248, 0.08);
     border-left: 2px solid #38bdf8;
   }

   &:last-child {
     border-bottom: none;
   }
 `;

 const RoundHeader = styled.div`
   display: flex;
   justify-content: space-between;
   margin-bottom: 10px;
   font-size: clamp(0.7rem, 1.1vw, 0.8rem);
   color: rgba(255, 255, 255, 0.6);
 `;

 const ResultGrid = styled.div`
   display: flex;
   flex-direction: column;
   gap: 12px;
 `;

 const PlayerSection = styled.div`
   padding: clamp(10px, 1.6vw, 14px);
   background: rgba(255, 255, 255, 0.04);
   border-radius: 10px;
   border: 1px solid rgba(255, 255, 255, 0.12);
   margin-bottom: 10px;
 `;

 const PlayerHeader = styled.div`
   display: flex;
   justify-content: space-between;
   align-items: center;
   margin-bottom: 12px;
   flex-wrap: wrap;
   gap: 8px;
 `;

 const PlayerName = styled.div`
   font-weight: 700;
   color: #38bdf8;
   font-size: clamp(0.85rem, 1.3vw, 1rem);
   text-transform: uppercase;
   letter-spacing: 0.08em;
 `;

 const PlayerInfoRow = styled.div`
   display: flex;
   align-items: center;
   gap: 10px;
   flex-wrap: wrap;
 `;

 const ScoreDisplay = styled.div`
   padding: clamp(4px, 1vw, 6px) clamp(8px, 1.6vw, 12px);
   background: rgba(56, 189, 248, 0.1);
   border: 1px solid rgba(56, 189, 248, 0.3);
   border-radius: 8px;
   color: #38bdf8;
   font-size: clamp(0.75rem, 1.2vw, 0.85rem);
   font-weight: 700;
 `;

 const PlayerResultBadge = styled.div<{ $result: string }>`
   padding: 4px 12px;
   border-radius: 12px;
   font-size: 0.7rem;
   font-weight: 700;
   text-transform: uppercase;
   background: ${(props) => {
     if (props.$result === "win") return "rgba(46, 242, 162, 0.2)";
     if (props.$result === "lose") return "rgba(248, 113, 113, 0.2)";
     if (props.$result === "push") return "rgba(167, 139, 250, 0.2)";
     if (props.$result === "blackjack") return "rgba(56, 189, 248, 0.2)";
     return "rgba(255, 255, 255, 0.1)";
   }};
   color: ${(props) => {
     if (props.$result === "win") return "#2ef2a2";
     if (props.$result === "lose") return "#f87171";
     if (props.$result === "push") return "#a78bfa";
     if (props.$result === "blackjack") return "#38bdf8";
     return "#f5f5f5";
   }};
   border: 1px solid rgba(255, 255, 255, 0.2);
 `;

 const CardsContainer = styled.div`
   display: flex;
   gap: 6px;
   margin-top: 10px;
   flex-wrap: wrap;
   align-items: center;
   padding: 8px;
   background: rgba(5, 6, 10, 0.3);
   border-radius: 8px;
 `;

 const HistoryCard = styled.div<{ $color: "red" | "black" }>`
   position: relative;
   width: 40px;
   height: 60px;
   border-radius: 4px;
   box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
   background-color: white;
   color: ${(props) => (props.$color === "red" ? "#d32f2f" : "#111827")};
   display: flex;
   flex-direction: column;
   justify-content: space-between;
   padding: 3px;
   font-size: 0.7rem;
   font-weight: 700;
 `;

 const CardValueSmall = styled.div`
   font-size: 0.7rem;
   line-height: 1;
 `;

 const CardSuitSmall = styled.div`
   font-size: 0.7rem;
   line-height: 1;
 `;

 const CardCenterSmall = styled.div`
   position: absolute;
   top: 50%;
   left: 50%;
   transform: translate(-50%, -50%);
   font-size: 1rem;
 `;

 const DealerSection = styled.div`
   padding: 14px;
   background: rgba(56, 189, 248, 0.08);
   border-radius: 10px;
   border: 1px solid rgba(56, 189, 248, 0.3);
   margin-bottom: 16px;
 `;

 const DealerHeader = styled.div`
   display: flex;
   justify-content: space-between;
   align-items: center;
   margin-bottom: 12px;
   flex-wrap: wrap;
   gap: 8px;
 `;

 const DealerLabel = styled.div`
   font-weight: 700;
   color: #38bdf8;
   font-size: 1rem;
   text-transform: uppercase;
   letter-spacing: 0.1em;
 `;

 const DealerScore = styled.div`
   padding: 6px 12px;
   background: rgba(56, 189, 248, 0.2);
   border: 1px solid rgba(56, 189, 248, 0.4);
   border-radius: 8px;
   color: #38bdf8;
   font-weight: 700;
   font-size: 0.85rem;
 `;

 const EmptyState = styled.div`
   padding: 20px;
   text-align: center;
   color: rgba(255, 255, 255, 0.5);
   font-style: italic;
 `;

 const AllLostMessage = styled.div`
   padding: 20px;
   text-align: center;
   background: rgba(248, 113, 113, 0.1);
   border: 1px solid rgba(248, 113, 113, 0.4);
   border-radius: 12px;
   margin: 10px 0;
 `;

 const AllLostText = styled.div`
   font-size: 1rem;
   font-weight: 700;
   color: #fb7185;
   text-transform: uppercase;
   letter-spacing: 0.08em;
   margin-bottom: 5px;
 `;

 const AllLostSubtext = styled.div`
   font-size: 0.85rem;
   color: rgba(255, 255, 255, 0.8);
 `;

 const formatTime = (timestamp: number) => {
   const date = new Date(timestamp);
   return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
 };

 const getResultLabel = (result: string) => {
   switch (result) {
     case "win":
       return "WIN";
     case "lose":
       return "LOSE";
     case "push":
       return "PUSH";
     case "blackjack":
       return "BLACKJACK";
     case "bust":
       return "BUST";
     case "all_lost":
       return "ALL LOST";
     default:
       return "";
   }
 };

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
   if (value === "ace") return "A";
   if (value === "jack") return "J";
   if (value === "queen") return "Q";
   if (value === "king") return "K";
   return value;
 };

 export default function GameHistory() {
   const { gameHistory = [] } = useGame();

   return (
     <HistoryContainer>
       <HistoryHeader>Game History</HistoryHeader>

       <HistoryList>
         {gameHistory && gameHistory.length > 0 ? (
           gameHistory.map((round, index) => (
             <HistoryItem key={index}>
               <RoundHeader>
                 <div>Round {round.roundNumber || gameHistory.length - index}</div>
                 <div>{formatTime(round.timestamp || Date.now())}</div>
               </RoundHeader>

               {round.allPlayersLost ? (
                 <AllLostMessage>
                   <div style={{ fontSize: "32px", marginBottom: "10px" }}>💸</div>
                   <AllLostText>All Players Lost</AllLostText>
                   <AllLostSubtext>Everyone ran out of money!</AllLostSubtext>
                 </AllLostMessage>
               ) : (
                 <ResultGrid>
                   {round.dealer && round.dealer.cards && round.dealer.cards.length > 0 && (
                     <DealerSection>
                       <DealerHeader>
                         <DealerLabel>Dealer</DealerLabel>
                         {round.dealer.score > 0 && <DealerScore>Score: {round.dealer.score}</DealerScore>}
                       </DealerHeader>
                       <CardsContainer>
                         {round.dealer.cards.map((card: Card, idx: number) => (
                           <HistoryCard key={idx} $color={getCardColor(card.suit)}>
                             <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                               <CardValueSmall>{getCardValue(card.value)}</CardValueSmall>
                               <CardSuitSmall>{getSuitSymbol(card.suit)}</CardSuitSmall>
                             </div>
                             <CardCenterSmall>{getSuitSymbol(card.suit)}</CardCenterSmall>
                             <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", transform: "rotate(180deg)" }}>
                               <CardValueSmall>{getCardValue(card.value)}</CardValueSmall>
                               <CardSuitSmall>{getSuitSymbol(card.suit)}</CardSuitSmall>
                             </div>
                           </HistoryCard>
                         ))}
                       </CardsContainer>
                     </DealerSection>
                   )}

                   {round.results &&
                     round.results
                       .filter((result: { outcome: string; amountChange: number }) => {
                         if (result.outcome === "spectating") {
                           return false;
                         }
                         if (result.amountChange === 0 && (!result.outcome || result.outcome === "")) {
                           return false;
                         }
                         return true;
                       })
                       .map((result: { username: string; outcome: string; amountChange: number; score: number; cards: Card[] }, playerIndex: number) => (
                         <PlayerSection key={playerIndex}>
                           <PlayerHeader>
                             <PlayerName>{result.username}</PlayerName>
                             <PlayerInfoRow>
                               {result.score > 0 && <ScoreDisplay>Score: {result.score}</ScoreDisplay>}
                               <PlayerResultBadge $result={result.outcome}>{getResultLabel(result.outcome)}</PlayerResultBadge>
                               <div
                                 style={{
                                   padding: "6px 12px",
                                   background:
                                     result.amountChange > 0
                                       ? "rgba(46, 242, 162, 0.2)"
                                       : result.amountChange < 0
                                       ? "rgba(248, 113, 113, 0.2)"
                                       : "rgba(255, 255, 255, 0.08)",
                                   border: "1px solid rgba(255, 255, 255, 0.2)",
                                   borderRadius: "8px",
                                   color: result.amountChange > 0 ? "#2ef2a2" : result.amountChange < 0 ? "#f87171" : "#f5f5f5",
                                   fontSize: "0.85rem",
                                   fontWeight: 700,
                                   whiteSpace: "nowrap",
                                 }}
                               >
                                 {result.amountChange > 0 ? "+" : ""}
                                 {result.amountChange}
                               </div>
                             </PlayerInfoRow>
                           </PlayerHeader>
                           {result.cards && result.cards.length > 0 ? (
                             <CardsContainer>
                               {result.cards.map((card: Card, idx: number) => (
                                 <HistoryCard key={idx} $color={getCardColor(card.suit)}>
                                   <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                                     <CardValueSmall>{getCardValue(card.value)}</CardValueSmall>
                                     <CardSuitSmall>{getSuitSymbol(card.suit)}</CardSuitSmall>
                                   </div>
                                   <CardCenterSmall>{getSuitSymbol(card.suit)}</CardCenterSmall>
                                   <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", transform: "rotate(180deg)" }}>
                                     <CardValueSmall>{getCardValue(card.value)}</CardValueSmall>
                                     <CardSuitSmall>{getSuitSymbol(card.suit)}</CardSuitSmall>
                                   </div>
                                 </HistoryCard>
                               ))}
                             </CardsContainer>
                           ) : (
                             <div style={{ padding: "8px", color: "rgba(255, 255, 255, 0.5)", fontStyle: "italic", fontSize: "0.85rem" }}>
                               No cards
                             </div>
                           )}
                         </PlayerSection>
                       ))}
                 </ResultGrid>
               )}
             </HistoryItem>
           ))
         ) : (
           <EmptyState>No game history yet.</EmptyState>
         )}
       </HistoryList>
     </HistoryContainer>
   );
 }
