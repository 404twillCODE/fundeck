"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

import Container from "@/components/Container";
import { useAuth } from "@/games/blackjack/contexts/AuthContext";

function AccountPageContent() {
  const prefersReducedMotion = useReducedMotion();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const hasNext = !!nextParam;
  const { loading, user, username, email, stats, signIn, signUp, signOut, updateUsername } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">(nextParam ? "signup" : "signin");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formDisplayName, setFormDisplayName] = useState("");
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveName, setSaveName] = useState(username);
  const [saveInfo, setSaveInfo] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    setSaveName(username);
  }, [username]);

  if (loading) {
    return (
      <main className="flex-1">
        <section className="py-20 sm:py-28">
          <Container>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-white/70">
              Loading account...
            </div>
          </Container>
        </section>
      </main>
    );
  }

  if (!user) {
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
              <h1 className="text-2xl font-semibold text-white">Local Account</h1>
              <p className="mt-2 text-white/60">
                {hasNext
                  ? "Sign in or create an account to continue to the game."
                  : "Create an account on this host machine to play and persist stats."}
              </p>
              <div className="mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                    mode === "signin" ? "border-white/20 bg-white/10 text-white" : "border-white/10 bg-white/5 text-white/60"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                    mode === "signup" ? "border-white/20 bg-white/10 text-white" : "border-white/10 bg-white/5 text-white/60"
                  }`}
                >
                  Register
                </button>
              </div>
              <form
                className="mt-6 space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setBusy(true);
                  setFormError("");

                  try {
                    if (mode === "signup") {
                      if (!formDisplayName.trim()) {
                        setFormError("Display name is required.");
                        setBusy(false);
                        return;
                      }
                      const result = await signUp(formEmail, formPassword, formDisplayName);
                      if (result.error) {
                        setFormError((result.error as { message?: string }).message || "Unable to register");
                        setBusy(false);
                        return;
                      }
                    } else {
                      const result = await signIn(formEmail, formPassword);
                      if (result.error) {
                        setFormError((result.error as { message?: string }).message || "Unable to sign in");
                        setBusy(false);
                        return;
                      }
                    }

                    setFormPassword("");
                    const nextPath =
                      typeof window !== "undefined"
                        ? new URLSearchParams(window.location.search).get("next")
                        : null;
                    if (nextPath && nextPath.startsWith("/")) {
                      router.push(nextPath);
                    }
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <div>
                  <label className="block text-xs uppercase tracking-[0.25em] text-white/40">Email</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(event) => setFormEmail(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 outline-none transition focus:border-white/30"
                    placeholder="you@example.com"
                  />
                </div>
                {mode === "signup" ? (
                  <div>
                    <label className="block text-xs uppercase tracking-[0.25em] text-white/40">Display Name</label>
                    <input
                      type="text"
                      required
                      value={formDisplayName}
                      onChange={(event) => setFormDisplayName(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 outline-none transition focus:border-white/30"
                      placeholder="Player name"
                    />
                  </div>
                ) : null}
                <div>
                  <label className="block text-xs uppercase tracking-[0.25em] text-white/40">Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formPassword}
                    onChange={(event) => setFormPassword(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 outline-none transition focus:border-white/30"
                    placeholder="At least 8 characters"
                  />
                </div>
                {formError ? <p className="text-sm text-rose-300">{formError}</p> : null}
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 transition hover:text-white disabled:opacity-60"
                >
                  {busy ? "Working..." : mode === "signup" ? "Create Account" : "Sign In"}
                </button>
              </form>
            </motion.div>
          </Container>
        </section>
      </main>
    );
  }

  return (
    <main className="flex-1">
      <section className="py-20 sm:py-28">
        <Container className="max-w-2xl">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
            className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white/80"
          >
            <h1 className="text-2xl font-semibold text-white">Account</h1>
            <p className="mt-2 text-white/60">
              Signed in as <span className="font-semibold text-white">{username || "Player"}</span>
            </p>
            <p className="mt-1 text-sm text-white/50">Email: {email}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Games Played</p>
                <p className="mt-1 text-xl font-semibold text-white">{stats?.gamesPlayed ?? 0}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Blackjack Wins</p>
                <p className="mt-1 text-xl font-semibold text-white">{stats?.blackjackWins ?? 0}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Blackjack Losses</p>
                <p className="mt-1 text-xl font-semibold text-white">{stats?.blackjackLosses ?? 0}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Chips</p>
                <p className="mt-1 text-xl font-semibold text-white">{stats?.chips ?? 1000}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">Display Name</h2>
              <input
                type="text"
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                className="mt-3 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 outline-none transition focus:border-white/30"
                placeholder="Your display name"
              />
              {saveError ? <p className="mt-2 text-sm text-rose-300">{saveError}</p> : null}
              {saveInfo ? <p className="mt-2 text-sm text-emerald-300">{saveInfo}</p> : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    setSaveError("");
                    setSaveInfo("");
                    const result = await updateUsername(saveName);
                    if (result.error) {
                      setSaveError(result.error);
                      return;
                    }
                    setSaveInfo("Display name updated.");
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
                >
                  Save Name
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSaveName(username);
                    setSaveError("");
                    setSaveInfo("");
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-transparent px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/50 transition hover:text-white"
                >
                  Reset
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => signOut()}
              className="mt-6 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
            >
              Sign Out
            </button>
          </motion.div>
        </Container>
      </section>
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <main className="flex-1">
          <section className="py-20 sm:py-28">
            <Container>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-white/70">
                Loading account...
              </div>
            </Container>
          </section>
        </main>
      }
    >
      <AccountPageContent />
    </Suspense>
  );
}
