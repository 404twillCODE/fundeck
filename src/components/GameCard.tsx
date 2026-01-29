"use client";

import Link from "next/link";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";

import Badge from "@/components/Badge";
import { cn } from "@/lib/utils";
import type { Game } from "@/data/games";

type GameCardProps = {
  game: Game;
};

export default function GameCard({ game }: GameCardProps) {
  const prefersReducedMotion = useReducedMotion();
  const motionX = useMotionValue(0);
  const motionY = useMotionValue(0);
  const rotateX = useSpring(motionY, { stiffness: 200, damping: 20 });
  const rotateY = useSpring(motionX, { stiffness: 200, damping: 20 });
  const isWip = game.status === "wip";

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    motionX.set(x * 12);
    motionY.set(-y * 12);
  };

  const handlePointerLeave = () => {
    motionX.set(0);
    motionY.set(0);
  };

  const playHref =
    game.slug === "blackjack" ? "/games/blackjack" : `/games/${game.slug}`;
  const wipLabel = game.wipLabel ?? "WIP";

  return (
    <motion.div
      className={cn(
        "neon-card group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(5,6,10,0.65)] backdrop-blur-xl transition",
        isWip && "saturate-75 opacity-90",
      )}
      style={{
        perspective: 1000,
        rotateX: prefersReducedMotion ? 0 : rotateX,
        rotateY: prefersReducedMotion ? 0 : rotateY,
        transformStyle: "preserve-3d",
      }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      whileHover={prefersReducedMotion ? undefined : { y: -4 }}
    >
      <span aria-hidden="true" className="neon-border pointer-events-none" />
      <span aria-hidden="true" className="shine-sweep pointer-events-none" />
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <motion.div
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-primary"
            whileHover={
              prefersReducedMotion ? undefined : { rotate: 8, scale: 1.05 }
            }
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
          >
            <game.icon className="h-6 w-6" />
          </motion.div>
          <div className="flex items-center gap-2">
            {isWip ? (
              <motion.span
                className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white/70"
                animate={
                  prefersReducedMotion
                    ? undefined
                    : { boxShadow: "0 0 12px rgba(56, 189, 248, 0.35)" }
                }
                transition={
                  prefersReducedMotion
                    ? undefined
                    : {
                        duration: 1.8,
                        repeat: Infinity,
                        repeatType: "mirror",
                      }
                }
              >
                {wipLabel}
              </motion.span>
            ) : null}
            <Badge label={game.category} />
          </div>
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white">{game.name}</h3>
          <p className="mt-2 text-sm text-white/60">{game.description}</p>
        </div>
      </div>
      <div className="mt-6 flex items-center justify-between">
        <span className="text-xs uppercase tracking-[0.3em] text-white/40">
          {isWip ? "Work in progress" : "Ready to play"}
        </span>
        {isWip ? (
          <div className="group/play relative inline-flex">
            <motion.span
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white/40"
              whileHover={prefersReducedMotion ? undefined : { y: -1 }}
              transition={{ type: "spring", stiffness: 220, damping: 16 }}
            >
              Soon
            </motion.span>
            <span className="pointer-events-none absolute -top-7 right-0 whitespace-nowrap text-[0.65rem] uppercase tracking-[0.3em] text-white/40 opacity-0 transition group-hover/play:opacity-100">
              Not shipped yet
            </span>
          </div>
        ) : (
          <Link href={playHref} className="inline-flex">
            <motion.span
              className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-white animate-[glow-pulse_3s_ease-in-out_infinite]"
              whileHover={
                prefersReducedMotion ? undefined : { y: -2, scale: 1.02 }
              }
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
            >
              Play
            </motion.span>
          </Link>
        )}
      </div>
    </motion.div>
  );
}
