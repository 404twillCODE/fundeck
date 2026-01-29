"use client";

import { motion } from "framer-motion";

import Container from "@/components/Container";
import GameCard from "@/components/GameCard";
import GradientText from "@/components/GradientText";
import { games } from "@/data/games";

const categories = ["All", "Casino", "Party", "Social", "Debate"];

export default function GamesPage() {
  return (
    <main className="flex-1 pb-24 pt-16">
      <Container>
        <div className="flex flex-col gap-8">
          <div className="space-y-4">
            <GradientText className="text-sm uppercase tracking-[0.4em]">
              Game library
            </GradientText>
            <h1 className="text-3xl font-semibold text-white sm:text-5xl">
              Browse every neon-ready mini-game.
            </h1>
            <p className="text-white/60">
              Search and filters are placeholders for future experiences.
            </p>
          </div>
          <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <input
              placeholder="Search games"
              className="h-12 w-full rounded-full border border-white/10 bg-black/30 px-5 text-sm text-white placeholder:text-white/30"
            />
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/60 transition hover:text-white"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Container>

      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.08 },
            },
          }}
          className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3"
        >
          {games.map((game) => (
            <motion.div
              key={game.slug}
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ type: "spring", stiffness: 140, damping: 16 }}
            >
              <GameCard game={game} />
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </main>
  );
}
