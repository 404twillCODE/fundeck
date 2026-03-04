"use client";

import { useEffect, useMemo, useState } from "react";

import Container from "@/components/Container";
import GradientText from "@/components/GradientText";
import NeonCard from "@/components/NeonCard";
import { useAuth } from "@/games/blackjack/contexts/AuthContext";
import { getSocketServerUrl } from "@/lib/socket";

type LeaderboardEntry = {
  rank: number;
  userId: string;
  email: string;
  displayName: string | null;
  gamesPlayed: number;
  blackjackWins: number;
  blackjackLosses: number;
  chips: number;
};

type LeaderboardResponse = {
  leaderboard: LeaderboardEntry[];
  yourRank: LeaderboardEntry | null;
};

function fallbackDisplayName(email: string): string {
  const localPart = String(email || "").toLowerCase().split("@")[0] || "player";
  return localPart.slice(0, 24);
}

function entryName(entry: LeaderboardEntry): string {
  const fromDisplay = String(entry.displayName || "").trim();
  if (fromDisplay) return fromDisplay.slice(0, 24);
  return fallbackDisplayName(entry.email);
}

export default function LeaderboardsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [yourRank, setYourRank] = useState<LeaderboardEntry | null>(null);
  const baseUrl = useMemo(() => getSocketServerUrl().replace(/\/$/, ""), []);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaderboard() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`${baseUrl}/api/leaderboard/blackjack?limit=50`, {
          method: "GET",
          credentials: "include",
        });
        const payload = (await response.json().catch(() => null)) as LeaderboardResponse & {
          error?: string;
        } | null;

        if (!response.ok) {
          if (!cancelled) {
            setError(payload?.error || `Failed to load leaderboard (${response.status})`);
          }
          return;
        }

        if (!cancelled) {
          setEntries(payload?.leaderboard || []);
          setYourRank(payload?.yourRank || null);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError instanceof Error ? requestError.message : "Failed to load leaderboard");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  return (
    <main className="flex-1 py-16">
      <Container className="space-y-6">
        <div className="space-y-2">
          <GradientText className="text-xs uppercase tracking-[0.35em]">Leaderboards</GradientText>
          <h1 className="text-4xl font-semibold text-white">Blackjack</h1>
        </div>

        {loading ? <NeonCard className="p-6 text-white/70">Loading leaderboard...</NeonCard> : null}
        {error ? <NeonCard className="p-6 text-rose-300">{error}</NeonCard> : null}

        {!loading && !error && user && yourRank ? (
          <NeonCard className="p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-white/50">Your Rank</p>
            <p className="mt-2 text-xl font-semibold text-white">
              #{yourRank.rank} - {entryName(yourRank)} ({yourRank.blackjackWins} wins, {yourRank.chips} chips)
            </p>
          </NeonCard>
        ) : null}

        {!loading && !error ? (
          <NeonCard className="overflow-hidden p-0">
            {entries.length === 0 ? (
              <div className="p-6 text-white/70">No ranked players yet. Play a blackjack round to populate the board.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm text-white/80">
                  <thead className="bg-white/5 text-xs uppercase tracking-[0.2em] text-white/50">
                    <tr>
                      <th className="px-4 py-3">Rank</th>
                      <th className="px-4 py-3">Player</th>
                      <th className="px-4 py-3">Wins</th>
                      <th className="px-4 py-3">Losses</th>
                      <th className="px-4 py-3">Games</th>
                      <th className="px-4 py-3">Chips</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.userId} className="border-t border-white/10">
                        <td className="px-4 py-3 font-semibold text-cyan-300">#{entry.rank}</td>
                        <td className="px-4 py-3">{entryName(entry)}</td>
                        <td className="px-4 py-3">{entry.blackjackWins}</td>
                        <td className="px-4 py-3">{entry.blackjackLosses}</td>
                        <td className="px-4 py-3">{entry.gamesPlayed}</td>
                        <td className="px-4 py-3">{entry.chips}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </NeonCard>
        ) : null}
      </Container>
    </main>
  );
}
