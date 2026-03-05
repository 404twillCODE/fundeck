"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import Container from "@/components/Container";
import { useAuth } from "@/games/blackjack/contexts/AuthContext";

export default function AccountPage() {
  const prefersReducedMotion = useReducedMotion();
  const { username, setUsername } = useAuth();
  const [input, setInput] = useState(username);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setUsername(trimmed);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="flex-1">
      <section className="py-20 sm:py-28">
        <Container className="max-w-xl">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white/80"
          >
            <h1 className="text-2xl font-semibold text-white">Your Username</h1>
            <p className="mt-2 text-white/60">
              Set your display name. This is how other players will see you in games.
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.25em] text-white/40">
                  Display Name
                </label>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setSaved(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                  }}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 outline-none transition focus:border-white/30"
                  placeholder="Enter your name"
                  maxLength={24}
                />
              </div>
              <button
                type="button"
                onClick={handleSave}
                disabled={!input.trim()}
                className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:text-white disabled:opacity-60"
              >
                {saved ? "Saved!" : "Save Username"}
              </button>
              {username && (
                <p className="text-center text-sm text-white/50">
                  Current name: <span className="font-semibold text-white">{username}</span>
                </p>
              )}
            </div>
          </motion.div>
        </Container>
      </section>
    </main>
  );
}
