"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import Container from "@/components/Container";
import GradientText from "@/components/GradientText";
import NeonCard from "@/components/NeonCard";
import { RoomProvider, useRoom } from "@/contexts/RoomContext";
import { useAuth } from "@/games/blackjack/contexts/AuthContext";

const DISPLAY_NAME_KEY = "fundeck:displayName";

type JoinClientProps = {
  code: string;
};

function JoinContent({ code }: JoinClientProps) {
  const router = useRouter();
  const { connected, serverUrl, joinRoom, error } = useRoom();
  const { loading: authLoading, user, username } = useAuth();
  const [name, setName] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem(DISPLAY_NAME_KEY) || "" : "",
  );
  const [localError, setLocalError] = useState<string | null>(null);

  const roomCode = code.toUpperCase();
  const displayName = name || username;

  if (authLoading) {
    return (
      <main className="flex-1 py-16">
        <Container className="max-w-2xl">
          <NeonCard className="p-8 text-white/70">Loading account...</NeonCard>
        </Container>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex-1 py-16">
        <Container className="max-w-2xl">
          <NeonCard className="space-y-3 p-8 text-white/80">
            <h1 className="text-3xl font-semibold text-white">Join Room {roomCode}</h1>
            <p className="text-white/60">Sign in with a local account before joining rooms.</p>
            <Link
              href={`/account?next=/join/${roomCode}`}
              className="inline-flex rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
            >
              Open Account
            </Link>
          </NeonCard>
        </Container>
      </main>
    );
  }

  return (
    <main className="flex-1 py-16">
      <Container className="max-w-2xl">
        <NeonCard className="p-8 space-y-5">
          <GradientText className="text-xs uppercase tracking-[0.35em]">Join Room</GradientText>
          <h1 className="text-3xl font-semibold text-white">Room {roomCode}</h1>
          <div className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm">
            <p className="text-white/60">
              Server status:{" "}
              <span className={connected ? "text-emerald-300" : "text-rose-300"}>
                {connected ? "Connected" : "Disconnected"}
              </span>
            </p>
            <p className="mt-1 text-xs text-white/50">Socket: {serverUrl}</p>
          </div>
          <input
            value={displayName}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your display name"
            className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-white"
          />
          <button
            type="button"
            disabled={!connected}
            onClick={async () => {
              const cleaned = displayName.trim();
              if (!cleaned) {
                setLocalError("Please enter a name");
                return;
              }
              localStorage.setItem(DISPLAY_NAME_KEY, cleaned);
              const token = localStorage.getItem(`fundeck:reconnect:${roomCode}`);
              const result = await joinRoom(roomCode, cleaned, token);
              if (result.error) {
                setLocalError(result.error);
                return;
              }
              if (result.reconnectToken) {
                localStorage.setItem(`fundeck:reconnect:${roomCode}`, result.reconnectToken);
              }
              router.push(`/room/${roomCode}`);
            }}
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-300 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black disabled:opacity-50"
          >
            Join Room
          </button>
          {localError ? <p className="text-sm text-rose-300">{localError}</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </NeonCard>
      </Container>
    </main>
  );
}

export default function JoinClient({ code }: JoinClientProps) {
  return (
    <RoomProvider>
      <JoinContent code={code} />
    </RoomProvider>
  );
}
