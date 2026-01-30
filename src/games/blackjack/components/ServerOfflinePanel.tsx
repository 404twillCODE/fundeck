"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

type ServerOfflinePanelProps = {
  socketUrl: string;
  lastChecked: string;
  onRetry: () => void;
  retrying?: boolean;
  notConfigured?: boolean;
};

export default function ServerOfflinePanel({
  socketUrl,
  lastChecked,
  onRetry,
  retrying = false,
  notConfigured = false,
}: ServerOfflinePanelProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
        className="relative w-full max-w-md rounded-2xl border-2 border-cyan-500/40 bg-black/80 p-8 shadow-[0_0_40px_rgba(6,182,212,0.15)] backdrop-blur"
      >
        <h1 className="text-xl font-semibold text-white">
          {notConfigured
            ? "Blackjack server not configured"
            : "Blackjack server is offline"}
        </h1>
        <p className="mt-3 text-sm text-white/70">
          {notConfigured
            ? "Set NEXT_PUBLIC_BLACKJACK_SOCKET_SERVER to your Playit.gg URL (or run the server locally and use this page from localhost)."
            : "The host PC might be updating, rebooting, or offline. Try again in a minute."}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying}
            className="rounded-full border border-cyan-400/50 bg-cyan-500/20 px-5 py-2.5 text-sm font-semibold text-cyan-200 transition hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {retrying ? "Checking…" : "Retry"}
          </button>
          <Link
            href="/games"
            className="rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
          >
            Back to Games
          </Link>
        </div>
        <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/50">
          <p>
            <span className="text-white/60">Socket URL:</span>{" "}
            {socketUrl || "(none)"}
          </p>
          <p className="mt-1">
            <span className="text-white/60">Last checked:</span> {lastChecked}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
