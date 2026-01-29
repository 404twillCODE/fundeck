"use client";

import { motion, useReducedMotion } from "framer-motion";

import Container from "@/components/Container";
import NeonCard from "@/components/NeonCard";
import Auth from "@/games/blackjack/components/Auth";
import GameRoom from "@/games/blackjack/components/GameRoom";
import { AuthProvider, useAuth } from "@/games/blackjack/contexts/AuthContext";
import { GameProvider, useGame } from "@/games/blackjack/contexts/GameContext";
import BlackjackLobby from "@/games/blackjack/BlackjackLobby";

function BlackjackShell() {
  const prefersReducedMotion = useReducedMotion();
  const { loading, username, authEnabled } = useAuth();
  const { roomId } = useGame();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-white/70">
          Loading table...
        </div>
      </div>
    );
  }

  if (authEnabled && !username) {
    return <Auth />;
  }

  if (!roomId) {
    return <BlackjackLobby />;
  }

  return (
    <Container className="max-w-none px-0">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 120, damping: 18 }}
        className="pb-0"
      >
        <NeonCard className="rounded-none border-x-0 p-0 sm:rounded-2xl sm:border-x">
          <GameRoom />
        </NeonCard>
      </motion.div>
    </Container>
  );
}

export default function BlackjackApp() {
  return (
    <AuthProvider>
      <GameProvider>
        <BlackjackShell />
      </GameProvider>
    </AuthProvider>
  );
}
