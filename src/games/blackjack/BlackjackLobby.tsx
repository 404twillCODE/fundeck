"use client";

import { motion, useReducedMotion } from "framer-motion";

import Container from "@/components/Container";
import GradientText from "@/components/GradientText";
import JoinRoom from "@/games/blackjack/components/JoinRoom";

export default function BlackjackLobby() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="py-16">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 18 }}
            className="space-y-6"
          >
            <GradientText className="text-xs uppercase tracking-[0.4em]">
              Multiplayer blackjack
            </GradientText>
            <h1 className="text-4xl font-semibold text-white sm:text-5xl">
              Run a private table, invite friends, and keep the streak alive.
            </h1>
            <p className="text-white/60">
              The real-time table is live, with chat, bet pacing, and turn timers
              already synced to the multiplayer server.
            </p>
            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.3em] text-white/50">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Live rooms
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Auto turn timers
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Neon tables
              </span>
            </div>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 18, delay: 0.1 }}
          >
            <JoinRoom />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
