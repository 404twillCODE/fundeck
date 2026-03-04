"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Container from "@/components/Container";
import GradientText from "@/components/GradientText";
import { RoomProvider, useRoom } from "@/contexts/RoomContext";
import { useAuth } from "@/games/blackjack/contexts/AuthContext";

const DISPLAY_NAME_KEY = "fundeck:displayName";

const cardClass =
  "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(5,6,10,0.65)] backdrop-blur-xl transition-[border-color,box-shadow] duration-300 hover:border-white/20 hover:shadow-[0_24px_80px_rgba(5,6,10,0.65),0_0_0_1px_rgba(255,255,255,0.06)]";

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

  const roomCode = String(code ?? "").toUpperCase();
  const displayName = name || username;

  if (authLoading) {
    return (
      <main className="flex-1 py-16">
        <Container className="max-w-2xl">
          <div className={`${cardClass} p-8 text-white/70`}>Loading account...</div>
        </Container>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex-1 py-16">
        <Container className="max-w-2xl">
          <div className={`${cardClass} space-y-3 p-8 text-white/80`}>
            <h1 className="text-3xl font-semibold text-white">Join Room {roomCode}</h1>
            <p className="text-white/60">Sign in with a local account before joining rooms.</p>
            <a
              href={`/account?next=/join/${roomCode}`}
              className="inline-flex rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80 transition-all duration-200 hover:border-cyan-400/50 hover:bg-white/10 hover:text-white hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]"
            >
              Open Account
            </a>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main className="flex-1 py-16">
      <Container className="max-w-2xl">
        <div className={`${cardClass} p-8 space-y-5`}>
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
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-300 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black transition-all duration-200 hover:shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:brightness-110 active:scale-[0.97] disabled:opacity-50 disabled:hover:shadow-none disabled:hover:brightness-100"
          >
            Join Room
          </button>
          {localError ? <p className="text-sm text-rose-300">{localError}</p> : null}
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>
      </Container>
    </main>
  );
}

export default function JoinClient({ code }: JoinClientProps) {
  const { sessionToken } = useAuth();
  return (
    <RoomProvider authToken={sessionToken}>
      <JoinContent code={code} />
    </RoomProvider>
  );
}
