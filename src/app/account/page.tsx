"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import Container from "@/components/Container";
import Auth from "@/games/blackjack/components/Auth";
import { useAuth } from "@/games/blackjack/contexts/AuthContext";

export default function AccountPage() {
  const prefersReducedMotion = useReducedMotion();
  const { loading, user, username, email, signOut, updateUsername, updateEmail, updatePassword } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [editUsername, setEditUsername] = useState(username);
  const [editEmail, setEditEmail] = useState(email || "");
  const [editPassword, setEditPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveInfo, setSaveInfo] = useState("");

  useEffect(() => {
    setEditUsername(username);
  }, [username]);

  useEffect(() => {
    setEditEmail(email || "");
  }, [email]);

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

  if (!user && (showAuth || !username)) {
    return (
      <main className="flex-1">
        <section className="py-20 sm:py-28">
          <Auth onAuthComplete={() => setShowAuth(false)} />
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
            {user ? (
              <>
                <h1 className="text-2xl font-semibold text-white">Account</h1>
                <p className="mt-2 text-white/60">
                  Signed in as <span className="font-semibold text-white">{username || "Player"}</span>.
                </p>
                {email ? (
                  <p className="mt-1 text-sm text-white/50">Email: {email}</p>
                ) : null}
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/60">
                    Account Settings
                  </h2>
                  <label className="mt-4 block text-xs uppercase tracking-[0.25em] text-white/40">
                    Username
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(event) => setEditUsername(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 outline-none transition focus:border-white/30"
                    placeholder="Your username"
                  />
                  <label className="mt-4 block text-xs uppercase tracking-[0.25em] text-white/40">
                    Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(event) => setEditEmail(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 outline-none transition focus:border-white/30"
                    placeholder="name@email.com"
                  />
                  <label className="mt-4 block text-xs uppercase tracking-[0.25em] text-white/40">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(event) => setEditPassword(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 outline-none transition focus:border-white/30"
                    placeholder="••••••••"
                  />
                  {saveError ? (
                    <p className="mt-2 text-sm text-red-300">{saveError}</p>
                  ) : null}
                  {saveInfo ? (
                    <p className="mt-2 text-sm text-emerald-300">{saveInfo}</p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        setSaving(true);
                        setSaveError("");
                        setSaveInfo("");
                        const [nameResult, emailResult, passwordResult] = await Promise.all([
                          updateUsername(editUsername),
                          editEmail.trim() && editEmail.trim() !== (email || "")
                            ? updateEmail(editEmail)
                            : Promise.resolve({ error: null }),
                          editPassword.trim()
                            ? updatePassword(editPassword)
                            : Promise.resolve({ error: null }),
                        ]);
                        const errorMessage =
                          nameResult.error || emailResult.error || passwordResult.error;
                        if (errorMessage) {
                          setSaveError(errorMessage);
                        } else {
                          setSaveInfo("Account settings updated.");
                          setEditPassword("");
                        }
                        setSaving(false);
                      }}
                      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditUsername(username);
                        setEditEmail(email || "");
                        setEditPassword("");
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
              </>
            ) : (
              <>
                <h1 className="text-2xl font-semibold text-white">Guest Mode</h1>
                <p className="mt-2 text-white/60">
                  You&apos;re playing as <span className="font-semibold text-white">{username}</span>. Guest
                  sessions don&apos;t save progress.
                </p>
                <button
                  type="button"
                  onClick={() => setShowAuth(true)}
                  className="mt-6 inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:text-white"
                >
                  Create Account
                </button>
              </>
            )}
          </motion.div>
        </Container>
      </section>
    </main>
  );
}
