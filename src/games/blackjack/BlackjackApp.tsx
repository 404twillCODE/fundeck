"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import Container from "@/components/Container";
import NeonCard from "@/components/NeonCard";
import Auth from "@/games/blackjack/components/Auth";
import GameRoom from "@/games/blackjack/components/GameRoom";
import ServerChecking from "@/games/blackjack/components/ServerChecking";
import ServerOfflinePanel from "@/games/blackjack/components/ServerOfflinePanel";
import { useAuth } from "@/games/blackjack/contexts/AuthContext";
import { GameProvider, useGame } from "@/games/blackjack/contexts/GameContext";
import { getEffectiveSocketServer } from "@/games/blackjack/config";
import BlackjackLobby from "@/games/blackjack/BlackjackLobby";

const HEALTH_CHECK_TIMEOUT_MS = 2000;
const OFFLINE_AUTO_RETRY_MS = 15000;

function formatLastChecked(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function BlackjackShell() {
  const prefersReducedMotion = useReducedMotion();
  const { loading, username, authEnabled } = useAuth();
  const { roomId, reconnecting } = useGame();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-white/70">
          Loading table...
        </div>
      </div>
    );
  }

  if (authEnabled && !username) {
    return (
      <Auth
        title="Blackjack Lounge"
        subtitle="Sign in to keep your balance, or jump in as a guest."
      />
    );
  }

  if (!roomId) {
    return <BlackjackLobby />;
  }

  return (
    <>
      {reconnecting && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="fixed left-4 right-4 top-20 z-40 mx-auto max-w-md rounded-xl border border-amber-400/40 bg-amber-500/20 px-4 py-3 text-center text-sm font-medium text-amber-200 shadow-lg"
        >
          Connection lost — attempting to reconnect…
        </motion.div>
      )}
      <Container className="max-w-none px-0 h-[calc(100vh-4rem)] min-h-0 flex flex-col overflow-hidden">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className="flex-1 min-h-0 flex flex-col pb-0"
        >
          <NeonCard className="rounded-none border-x-0 p-0 sm:rounded-2xl sm:border-x flex-1 min-h-0 flex flex-col overflow-hidden">
            <GameRoom />
          </NeonCard>
        </motion.div>
      </Container>
    </>
  );
}

type ServerStatus = "checking" | "online" | "offline" | "not_configured";

export default function BlackjackApp() {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<ServerStatus>("checking");
  const [lastChecked, setLastChecked] = useState<Date>(new Date(0));
  const [retrying, setRetrying] = useState(false);
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkHealth = useCallback(async (url: string): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
      const res = await fetch(`${url.replace(/\/$/, "")}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) return false;
      const data = (await res.json()) as { status?: string };
      return data.status === "ok";
    } catch {
      return false;
    }
  }, []);

  const runHealthCheck = useCallback(
    async (url: string) => {
      setLastChecked(new Date());
      const ok = await checkHealth(url);
      setStatus(ok ? "online" : "offline");
      setRetrying(false);
      return ok;
    },
    [checkHealth],
  );

  const handleRetry = useCallback(() => {
    if (!serverUrl) return;
    setRetrying(true);
    runHealthCheck(serverUrl);
  }, [serverUrl, runHealthCheck]);

  const handleReconnectFailed = useCallback(() => {
    setStatus("offline");
  }, []);

  // Resolve effective URL once on mount (client-side)
  useEffect(() => {
    const url = getEffectiveSocketServer();
    setServerUrl(url);
    if (url === null) {
      setStatus("not_configured");
      setLastChecked(new Date());
      return;
    }
    setStatus("checking");
    runHealthCheck(url);
  }, [runHealthCheck]);

  // Auto-retry when offline every 15s
  useEffect(() => {
    if (status !== "offline" || !serverUrl) return;
    retryIntervalRef.current = setInterval(() => {
      runHealthCheck(serverUrl);
    }, OFFLINE_AUTO_RETRY_MS);
    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current);
        retryIntervalRef.current = null;
      }
    };
  }, [status, serverUrl, runHealthCheck]);

  if (status === "not_configured") {
    return (
      <ServerOfflinePanel
        socketUrl=""
        lastChecked={formatLastChecked(lastChecked)}
        onRetry={() => {}}
        notConfigured
      />
    );
  }

  if (status === "checking") {
    return <ServerChecking />;
  }

  if (status === "offline") {
    return (
      <ServerOfflinePanel
        socketUrl={serverUrl ?? ""}
        lastChecked={formatLastChecked(lastChecked)}
        onRetry={handleRetry}
        retrying={retrying}
      />
    );
  }

  // status === "online" and serverUrl is set
  return (
    <GameProvider
      serverUrl={serverUrl!}
      onReconnectFailed={handleReconnectFailed}
    >
      <BlackjackShell />
    </GameProvider>
  );
}
