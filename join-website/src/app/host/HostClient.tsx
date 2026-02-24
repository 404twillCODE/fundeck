"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

import Container from "@/components/Container";
import GradientText from "@/components/GradientText";
import NeonCard from "@/components/NeonCard";
import { RoomProvider, useRoom } from "@/contexts/RoomContext";
import { games } from "@/data/games";
import { useAuth } from "@/games/blackjack/contexts/AuthContext";

const DISPLAY_NAME_KEY = "fundeck:displayName";

type NetworkInfo = {
  port: number;
  localUrl: string;
  lanUrl: string;
  publicUrl: string | null;
};

function fallbackLocalUrl(serverUrl: string): string {
  try {
    const parsed = new URL(serverUrl);
    const port = parsed.port || (parsed.protocol === "https:" ? "443" : "80");
    return `http://localhost:${port}`;
  } catch {
    return "http://localhost:5250";
  }
}

function HostContent() {
  const router = useRouter();
  const { connected, serverUrl, error, createRoom, room, setGame, startGame } = useRoom();
  const { loading: authLoading, user, username } = useAuth();
  const [name, setName] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem(DISPLAY_NAME_KEY) || "" : "",
  );
  const [selectedGame, setSelectedGame] = useState("blackjack");
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [networkInfoError, setNetworkInfoError] = useState<string | null>(null);
  const [isLocalHost, setIsLocalHost] = useState<boolean | null>(null);

  const liveGames = useMemo(() => games.filter((game) => game.status === "live"), []);
  const code = room?.roomCode || createdCode;
  const joinUrl = typeof window !== "undefined" && code ? `${window.location.origin}/join/${code}` : "";
  const displayName = name || username;
  const localHostUrl = networkInfo?.localUrl || fallbackLocalUrl(serverUrl);
  const lanHostUrl = networkInfo?.lanUrl || "";
  const publicHostUrl = networkInfo?.publicUrl || "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hostname = window.location.hostname;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1";
    setIsLocalHost(isLocal);
  }, []);

  if (isLocalHost === false) {
    return (
      <main className="flex-1 py-16">
        <Container>
          <NeonCard className="space-y-3 p-6 text-white/80">
            <h1 className="text-2xl font-semibold text-white">Host Dashboard</h1>
            <p className="text-white/60">
              This host dashboard can only be used from the host machine (localhost).
            </p>
            <Link
              href="/"
              className="inline-flex rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
            >
              Back to Home
            </Link>
          </NeonCard>
        </Container>
      </main>
    );
  }

  if (isLocalHost === null) {
    return (
      <main className="flex-1 py-16">
        <Container>
          <NeonCard className="p-6 text-white/70">Loading host dashboard...</NeonCard>
        </Container>
      </main>
    );
  }

  useEffect(() => {
    let cancelled = false;

    async function loadNetworkInfo() {
      try {
        const baseUrl = serverUrl.replace(/\/$/, "");
        const response = await fetch(`${baseUrl}/api/network-info`, {
          method: "GET",
          credentials: "include",
        });

        const payload = (await response.json().catch(() => null)) as
          | (NetworkInfo & { error?: string })
          | null;

        if (!response.ok) {
          if (!cancelled) {
            setNetworkInfoError(payload?.error || "Unable to load share links from server.");
          }
          return;
        }

        if (!cancelled) {
          setNetworkInfo(payload);
          setNetworkInfoError(null);
        }
      } catch {
        if (!cancelled) {
          setNetworkInfoError("Unable to load share links from server.");
        }
      }
    }

    if (connected) {
      loadNetworkInfo();
    }

    return () => {
      cancelled = true;
    };
  }, [connected, serverUrl]);

  if (authLoading) {
    return (
      <main className="flex-1 py-16">
        <Container>
          <NeonCard className="p-6 text-white/70">Loading account...</NeonCard>
        </Container>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex-1 py-16">
        <Container>
          <NeonCard className="space-y-3 p-6 text-white/80">
            <h1 className="text-2xl font-semibold text-white">Host Dashboard</h1>
            <p className="text-white/60">Sign in with a local account before creating rooms.</p>
            <a
              href="/account?next=/host"
              className="inline-flex rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
            >
              Open account
            </a>
          </NeonCard>
        </Container>
      </main>
    );
  }

  return (
    <main className="flex-1 py-16">
      <Container className="space-y-6">
        <div className="space-y-2">
          <GradientText className="text-xs uppercase tracking-[0.35em]">Host Dashboard</GradientText>
          <h1 className="text-4xl font-semibold text-white">Create a room on your local server</h1>
        </div>

        <NeonCard className="p-6 space-y-4">
          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm">
            <p className="text-white/60">
              Server status:{" "}
              <span className={connected ? "text-emerald-300" : "text-rose-300"}>
                {connected ? "Connected" : "Disconnected"}
              </span>
            </p>
            <p className="mt-1 text-xs text-white/50">Socket: {serverUrl}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Share Links</p>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-white/60">Local</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/80">{localHostUrl}</span>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(localHostUrl)}
                  className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-white/60">LAN</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/80">{lanHostUrl || "Unavailable"}</span>
                <button
                  type="button"
                  disabled={!lanHostUrl}
                  onClick={() => lanHostUrl && navigator.clipboard.writeText(lanHostUrl)}
                  className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 disabled:opacity-50"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <span className="text-white/60">Public</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/80">{publicHostUrl || "Not configured"}</span>
                <button
                  type="button"
                  disabled={!publicHostUrl}
                  onClick={() => publicHostUrl && navigator.clipboard.writeText(publicHostUrl)}
                  className="rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/80 disabled:opacity-50"
                >
                  Copy
                </button>
              </div>
            </div>
            {networkInfoError ? (
              <p className="text-xs text-rose-300">{networkInfoError}</p>
            ) : null}
          </div>

          <label className="block text-xs uppercase tracking-[0.2em] text-white/60">Host Name</label>
          <input
            value={displayName}
            onChange={(event) => setName(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white"
            placeholder="Your display name"
          />

          <label className="block text-xs uppercase tracking-[0.2em] text-white/60">Game</label>
          <select
            value={selectedGame}
            onChange={(event) => setSelectedGame(event.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white"
          >
            {liveGames.map((game) => (
              <option key={game.slug} value={game.slug}>
                {game.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            disabled={!connected}
            onClick={async () => {
              setLocalError(null);
              const cleanedName = displayName.trim() || username || "Host";
              localStorage.setItem(DISPLAY_NAME_KEY, cleanedName);
              const result = await createRoom(selectedGame, cleanedName);
              if (result.roomCode) {
                setCreatedCode(result.roomCode);
                return;
              }
              setLocalError(result.error || "Unable to create room");
            }}
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-300 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black disabled:opacity-50"
          >
            Create Room
          </button>

          {localError ? <p className="text-sm text-rose-300">{localError}</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </NeonCard>

        {code && joinUrl ? (
          <NeonCard className="p-6 space-y-4">
            <p className="text-sm uppercase tracking-[0.3em] text-white/50">Room Code</p>
            <p className="text-4xl font-semibold tracking-[0.3em] text-cyan-300">{code}</p>
            {room ? <p className="text-sm text-white/60">Phase: <span className="text-white">{room.phase}</span></p> : null}
            <p className="text-sm text-white/60">{joinUrl}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(joinUrl)}
                className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
              >
                Copy Join Link
              </button>
              <button
                type="button"
                onClick={() => router.push(`/room/${code}`)}
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-300 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-black"
              >
                Open Room
              </button>
            </div>
            <div className="inline-block rounded-xl bg-white p-3">
              <QRCodeSVG value={joinUrl} size={160} />
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Players</p>
              {(room?.players || []).map((player) => (
                <div
                  key={player.playerId}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80"
                >
                  {player.name}
                  {player.playerId === room?.hostPlayerId ? " (Host)" : ""}
                </div>
              ))}
            </div>
            {room ? (
              <div className="flex flex-wrap gap-2">
                <select
                  value={room.gameId}
                  onChange={(event) => setGame(event.target.value)}
                  className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-white"
                >
                  {liveGames.map((game) => (
                    <option key={game.slug} value={game.slug}>
                      {game.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => startGame()}
                  disabled={!connected || room.phase !== "lobby"}
                  className="rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-300 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-black disabled:opacity-50"
                >
                  Start Game
                </button>
              </div>
            ) : null}
          </NeonCard>
        ) : null}
      </Container>
    </main>
  );
}

export default function HostClient() {
  return (
    <RoomProvider>
      <HostContent />
    </RoomProvider>
  );
}
