"use client";

import Container from "@/components/Container";
import NeonCard from "@/components/NeonCard";
import GameRoom from "@/games/blackjack/components/GameRoom";
import { GameProvider } from "@/games/blackjack/contexts/GameContext";
import { getSocketServerUrl } from "@/lib/socket";

type BlackjackInRoomProps = {
  roomCode: string;
  name: string;
  reconnectToken?: string | null;
};

export default function BlackjackInRoom({ roomCode, name, reconnectToken }: BlackjackInRoomProps) {
  return (
    <GameProvider
      serverUrl={getSocketServerUrl()}
      initialRoomCode={roomCode}
      initialName={name}
      initialReconnectToken={reconnectToken}
    >
      <Container className="max-w-none px-0 h-[calc(100vh-4rem)] min-h-0 flex flex-col overflow-hidden">
        <NeonCard className="rounded-none border-x-0 p-0 sm:rounded-2xl sm:border-x flex-1 min-h-0 flex flex-col overflow-hidden">
          <GameRoom />
        </NeonCard>
      </Container>
    </GameProvider>
  );
}
