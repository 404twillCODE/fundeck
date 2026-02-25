"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import Container from "@/components/Container";
import GradientText from "@/components/GradientText";
import NeonCard from "@/components/NeonCard";
import { RoomProvider, useRoom } from "@/contexts/RoomContext";
import { games } from "@/data/games";
import { useAuth } from "@/games/blackjack/contexts/AuthContext";
import BlackjackInRoom from "@/games/blackjack/BlackjackInRoom";

const DISPLAY_NAME_KEY = "fundeck:displayName";

type RoomClientProps = {
  code: string;
};

function RoomLobby({ code }: RoomClientProps) {
  const router = useRouter();
  const { room, connected, serverUrl, error, joinRoom, setReady, sendChat, setGame, startGame, leaveRoom } = useRoom();
  const { loading: authLoading, user, username } = useAuth();
  const [chatInput, setChatInput] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const autoJoinAttemptedRef = useRef(false);

  const roomCode = String(code ?? "").toUpperCase();
  const localName = typeof window !== "undefined" ? localStorage.getItem(DISPLAY_NAME_KEY) || username || "" : username || "";
  const localToken = typeof window !== "undefined" ? localStorage.getItem(`fundeck:reconnect:${roomCode}`) : null;
  const liveGames = useMemo(() => games.filter((game) => game.status === "live"), []);

  useEffect(() => {
    if (authLoading || !user) return;
    if (!connected || autoJoinAttemptedRef.current || room) return;

    const activeName = localName || username;
    if (!activeName) {
      router.replace(`/join/${roomCode}`);
      return;
    }

    autoJoinAttemptedRef.current = true;

    joinRoom(roomCode, activeName, localToken).then((result) => {
      if (result.reconnectToken) {
        localStorage.setItem(`fundeck:reconnect:${roomCode}`, result.reconnectToken);
      }
      if (result.error) {
        setJoinError(result.error);
      }
    });
  }, [authLoading, connected, joinRoom, localName, localToken, room, roomCode, router, user, username]);

  if (authLoading) {
    return (
      <main className="flex-1 py-16">
        <Container>
          <NeonCard className="space-y-3 p-6 text-white/70">
            <p>Room {roomCode}: Loading account...</p>
          </NeonCard>
        </Container>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex-1 py-16">
        <Container>
          <NeonCard className="space-y-3 p-6 text-white/80">
            <h1 className="text-2xl font-semibold text-white">Room {roomCode}</h1>
            <p className="text-white/60">Sign in with a local account before joining this room.</p>
            <Link
              href={`/account?next=/room/${roomCode}`}
              className="inline-flex rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
            >
              Open Account
            </Link>
          </NeonCard>
        </Container>
      </main>
    );
  }

  const isHost = room?.selfPlayerId && room.hostPlayerId === room.selfPlayerId;
  const self = room?.players.find((player) => player.playerId === room?.selfPlayerId);

  if (!room) {
    return (
      <main className="flex-1 py-16">
        <Container>
          <NeonCard className="space-y-3 p-6 text-white/70">
            <p>
              Room {roomCode}: Waiting for room state...
            </p>
            <p className="text-sm text-white/60">
              Server:{" "}
              <span className={connected ? "text-emerald-300" : "text-rose-300"}>
                {connected ? "Connected" : "Disconnected"}
              </span>
            </p>
            <p className="text-xs text-white/50">Socket: {serverUrl}</p>
            {joinError ? <p className="text-sm text-rose-300">{joinError}</p> : null}
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            {joinError ? (
              <button
                type="button"
                onClick={() => router.replace(`/join/${roomCode}`)}
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
              >
                Go To Join
              </button>
            ) : null}
          </NeonCard>
        </Container>
      </main>
    );
  }

  if (room.phase === "in_game" && room.gameId === "blackjack") {
    return <BlackjackInRoom roomCode={roomCode} name={localName || username} reconnectToken={localToken} />;
  }

  return (
    <main className="flex-1 py-12">
      <Container className="space-y-6">
        <div className="space-y-2">
          <GradientText className="text-xs uppercase tracking-[0.35em]">Room {room.roomCode}</GradientText>
          <h1 className="text-4xl font-semibold text-white">Lobby</h1>
        </div>

        <NeonCard className="p-6 space-y-4">
          <p className="text-sm text-white/60">Game: <span className="text-white">{games.find((item) => item.slug === room.gameId)?.name || room.gameId}</span></p>
          {isHost ? (
            <div className="flex flex-wrap gap-3">
              <select
                value={room.gameId}
                onChange={(event) => setGame(event.target.value)}
                className="h-10 rounded-xl border border-white/10 bg-black/40 px-3 text-white"
              >
                {liveGames.map((game) => (
                  <option key={game.slug} value={game.slug}>{game.name}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => startGame()}
                className="rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-black"
              >
                Start Game
              </button>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setReady(!self?.ready)}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/80"
            >
              {self?.ready ? "Set Not Ready" : "Set Ready"}
            </button>
            <button
              type="button"
              onClick={async () => {
                await leaveRoom();
                router.push("/");
              }}
              className="rounded-xl border border-rose-400/40 bg-rose-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-rose-100"
            >
              Leave Room
            </button>
          </div>
        </NeonCard>

        <NeonCard className="p-6">
          <h2 className="mb-3 text-sm uppercase tracking-[0.25em] text-white/60">Players</h2>
          <div className="space-y-2">
            {room.players.map((player) => (
              <div key={player.playerId} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                <span>{player.name}{player.playerId === room.hostPlayerId ? " (Host)" : ""}</span>
                <span className={player.ready ? "text-emerald-300" : "text-white/50"}>{player.ready ? "Ready" : "Not Ready"}</span>
              </div>
            ))}
          </div>
        </NeonCard>

        <NeonCard className="p-6 space-y-3">
          <h2 className="text-sm uppercase tracking-[0.25em] text-white/60">Lobby Chat</h2>
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {room.chat.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                <span className="font-semibold text-cyan-300">{entry.name}: </span>
                <span>{entry.message}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              className="h-10 flex-1 rounded-xl border border-white/10 bg-black/40 px-3 text-white"
              placeholder="Type a message"
            />
            <button
              type="button"
              onClick={async () => {
                if (!chatInput.trim()) return;
                await sendChat(chatInput);
                setChatInput("");
              }}
              className="rounded-xl bg-gradient-to-r from-cyan-400 to-emerald-300 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-black"
            >
              Send
            </button>
          </div>
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        </NeonCard>
      </Container>
    </main>
  );
}

export default function RoomClient({ code }: RoomClientProps) {
  return (
    <RoomProvider>
      <RoomLobby code={code} />
    </RoomProvider>
  );
}
