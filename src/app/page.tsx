"use client";

import { motion, useReducedMotion } from "framer-motion";

import Container from "@/components/Container";
import GameCard from "@/components/GameCard";
import GradientText from "@/components/GradientText";
import { games, type GameCategory } from "@/data/games";
import Auth from "@/games/blackjack/components/Auth";
import { useAuth } from "@/games/blackjack/contexts/AuthContext";

const headline = "Pick a game. Jump in. Have fun.";

export default function Home() {
  const prefersReducedMotion = useReducedMotion();
  const { loading, username, authEnabled } = useAuth();

  const categoryOrder: GameCategory[] = ["Casino", "Party", "Social", "Debate"];
  const gamesByCategory = categoryOrder
    .map((category) => ({
      category,
      games: games.filter((game) => game.category === category),
    }))
    .filter((group) => group.games.length > 0);

  if (loading) {
    return (
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 sm:py-28">
          <Container>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-white/70">
              Loading FunDeck...
            </div>
          </Container>
        </section>
      </main>
    );
  }

  if (authEnabled && !username) {
    return (
      <main className="flex-1">
        <section className="relative overflow-hidden py-20 sm:py-28">
          <Auth />
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <section className="relative overflow-hidden py-20 sm:py-28">
        <Container>
          <div className="max-w-3xl space-y-6">
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
              className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/60"
            >
              GAME NIGHT, BUT CLEAN.
            </motion.div>
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
              <GradientText className="bg-[length:200%_200%] animate-[text-shimmer_8s_linear_infinite]">
                {prefersReducedMotion
                  ? headline
                  : headline.split("").map((letter, index) => (
                      letter === " " ? (
                        <span key={`space-${index}`} className="inline-block w-3" />
                      ) : (
                        <motion.span
                          key={`${letter}-${index}`}
                          className="inline-block"
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 200,
                            damping: 18,
                            delay: index * 0.03,
                          }}
                        >
                          {letter}
                        </motion.span>
                      )
                    ))}
              </GradientText>
            </h1>
            <p className="text-lg text-white/60">
              FunDeck is your private game hub — quick party games, debate
              chaos, and casino classics built for Discord nights and game
              nights.
            </p>
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-4 text-sm text-white/60"
            >
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Fast rounds
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                Built for voice chat
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 animate-[micro-glitch_0.2s_ease-in-out_1]">
                Instant rematches
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                In-person play
              </span>
            </motion.div>
          </div>
        </Container>
      </section>

      <section className="pb-24">
        <Container>
          <div className="space-y-12">
            {gamesByCategory.map(({ category, games: categoryGames }) => (
              <div key={category} className="space-y-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.4em] text-white/50">
                  {category}
                </h2>
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
                  className="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
                >
                  {categoryGames.map((game) => (
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
              </div>
            ))}
          </div>
        </Container>
      </section>
    </main>
  );
}
