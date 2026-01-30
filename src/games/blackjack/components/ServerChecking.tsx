"use client";

import { motion, useReducedMotion } from "framer-motion";

export default function ServerChecking() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center gap-6"
      >
        <motion.div
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  rotate: 360,
                  transition: { duration: 1.5, repeat: Infinity, ease: "linear" },
                }
          }
          className="h-12 w-12 rounded-full border-2 border-cyan-400/50 border-t-cyan-400"
        />
        <p className="text-sm font-medium text-white/80">
          Checking blackjack server…
        </p>
      </motion.div>
    </div>
  );
}
