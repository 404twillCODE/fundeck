"use client";

import { motion } from "framer-motion";

import Container from "@/components/Container";
import GradientText from "@/components/GradientText";
import NeonCard from "@/components/NeonCard";

export default function Games() {
  return (
    <main className="flex-1">
      <section className="py-20 sm:py-28">
        <Container>
          <div className="max-w-3xl space-y-6">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              <GradientText>Games</GradientText>
            </h1>
            <p className="text-lg text-white/60">
              FunDeck includes party games, casino classics, and more. All run
              locally when you host from the desktop app.
            </p>
          </div>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.08 },
              },
            }}
            className="mt-12 grid gap-6 md:grid-cols-2"
          >
            <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
              <NeonCard className="p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/50">
                  Casino
                </h2>
                <p className="mt-2 text-white/80">Blackjack, Roulette, Poker, and more.</p>
              </NeonCard>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
              <NeonCard className="p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/50">
                  Party
                </h2>
                <p className="mt-2 text-white/80">Hot Potato, I Spy, Charades, Pictionary, and more.</p>
              </NeonCard>
            </motion.div>
            <motion.div variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}>
              <NeonCard className="p-6">
                <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/50">
                  Debate & Social
                </h2>
                <p className="mt-2 text-white/80">Two Truths One Lie, Would You Rather, Trivia, and more.</p>
              </NeonCard>
            </motion.div>
          </motion.div>
        </Container>
      </section>
    </main>
  );
}
