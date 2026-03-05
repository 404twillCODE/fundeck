"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Container from "@/components/Container";
import GradientText from "@/components/GradientText";
import { RoomProvider, useRoom } from "@/contexts/RoomContext";
import { useAuth } from "@/games/blackjack/contexts/AuthContext";

const cardClass =
  "relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_24px_80px_rgba(5,6,10,0.65)] backdrop-blur-xl transition-[border-color,box-shadow] duration-300 hover:border-white/20 hover:shadow-[0_24px_80px_rgba(5,6,10,0.65),0_0_0_1px_rgba(255,255,255,0.06)]";

type JoinClientProps = {
  code: string;
};

function JoinContent({ code }: JoinClientProps) {
  const router = useRouter();
  const { connected, serverUrl, joinRoom, error } = useRoom();
  const { username, setUsername } = useAuth();
  const [nameInput, setNameInput] = useState(username || "");
  const [localError, setLocalError] = useState<string | null>(null);

  const roomCode = String(code ?? "").toUpperCase();

  const handleJoin = async () => {
    const name = nameInput.trim();
    if (!name) {
      setLocalError("Please enter a username.");
      return;
    }
    setUsername(name);

    const reconnectKey = `fundeck:reconnect:${roomCode}`;
    const token = localStorage.getItem(reconnectKey);
    const result = await joinRoom(roomCode, name, token);
    if (result.error) {
      if (result.error.includes("Reconnect token")) {
        localStorage.removeItem(reconnectKey);
      }
      setLocalError(result.error);
      return;
    }
    if (result.reconnectToken) {
      localStorage.setItem(reconnectKey, result.reconnectToken);
    }
    router.push(`/room/${roomCode}`);
  };

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
          <div>
            <label className="block text-xs uppercase tracking-[0.25em] text-white/40">
              Your Name
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                setLocalError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && connected) handleJoin();
              }}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white/80 outline-none transition focus:border-white/30"
              placeholder="Enter your username"
              maxLength={24}
              autoFocus
            />
          </div>
          <button
            type="button"
            disabled={!connected || !nameInput.trim()}
            onClick={handleJoin}
            className="rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-300 px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-black transition-all duration-200 hover:shadow-[0_0_24px_rgba(34,211,238,0.35)] hover:brightness-110 active:scale-[0.97] disabled:opacity-50 disabled:hover:shadow-none disabled:hover:brightness-100"
          >
            Join Room
          </button>
          {localError ? <p className="text-sm text-rose-300">{localError}</p> : null}
          {error && error !== localError ? <p className="text-sm text-rose-300">{error}</p> : null}
        </div>
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
