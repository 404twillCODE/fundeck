"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getSocketServerUrl } from "@/lib/socket";

type LocalUser = {
  id: string;
  email: string;
  defaultName: string;
  displayName?: string | null;
  createdAt?: string | null;
};

type LocalStats = {
  gamesPlayed: number;
  blackjackWins: number;
  blackjackLosses: number;
  chips: number;
  updatedAt?: string | null;
};

type AuthContextValue = {
  user: LocalUser | null;
  loading: boolean;
  username: string;
  email: string | null;
  stats: LocalStats | null;
  sessionToken: string | null;
  signUp: (email: string, password: string, username?: string) => Promise<{ data: unknown; error: unknown; requiresConfirmation?: boolean }>;
  signIn: (emailOrUsername: string, password: string) => Promise<{ data: unknown; error: unknown }>;
  signOut: () => Promise<void>;
  updateUsername: (nextUsername: string) => Promise<{ error: string | null }>;
};

type MeResponse = {
  user: LocalUser;
  stats: LocalStats;
  sessionToken?: string;
};

const DEV_LOGGING = process.env.NODE_ENV !== "production";

const AuthContext = createContext<AuthContextValue | null>(null);

function devLog(message: string, details?: unknown) {
  if (!DEV_LOGGING) return;
  if (details === undefined) {
    console.log(`[auth] ${message}`);
    return;
  }
  console.log(`[auth] ${message}`, details);
}

function normalizeDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 24);
}

function defaultNameFromEmail(email: string): string {
  const localPart = String(email || "").trim().toLowerCase().split("@")[0] || "player";
  return normalizeDisplayName(localPart) || "player";
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<LocalUser | null>(null);
  const [stats, setStats] = useState<LocalStats | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const baseUrl = useMemo(() => getSocketServerUrl().replace(/\/$/, ""), []);

  const request = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<{ data: T | null; error: string | null }> => {
      try {
        const headers = new Headers(init?.headers);
        if (!headers.has("Content-Type")) {
          headers.set("Content-Type", "application/json");
        }

        const response = await fetch(`${baseUrl}${path}`, {
          credentials: "include",
          headers,
          ...init,
        });

        const payload = (await response.json().catch(() => null)) as { error?: string } & T | null;
        if (!response.ok) {
          return { data: null, error: payload?.error || `Request failed (${response.status})` };
        }

        return { data: payload as T, error: null };
      } catch (error) {
        return {
          data: null,
          error: error instanceof Error ? error.message : "Network request failed",
        };
      }
    },
    [baseUrl],
  );

  const applyMePayload = useCallback((payload: MeResponse | null) => {
    if (!payload || !payload.user) {
      setUser(null);
      setStats(null);
      setSessionToken(null);
      return;
    }

    setUser(payload.user);
    setStats(payload.stats);
    if (payload.sessionToken) {
      setSessionToken(payload.sessionToken);
    }
  }, []);

  const refreshMe = useCallback(async () => {
    const response = await request<MeResponse>("/api/me", { method: "GET" });
    if (response.error) {
      applyMePayload(null);
      devLog("refresh_me:unauthenticated", response.error);
      return;
    }

    applyMePayload(response.data);
    devLog("refresh_me:ok", { userId: response.data?.user.id });
  }, [applyMePayload, request]);

  useEffect(() => {
    refreshMe().finally(() => setLoading(false));
  }, [refreshMe]);

  const register = useCallback(
    async (email: string, password: string) => {
      const response = await request<MeResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (response.error) {
        devLog("register:error", response.error);
        return { error: response.error };
      }
      applyMePayload(response.data);
      devLog("register:ok", { userId: response.data?.user.id });
      return { error: null };
    },
    [applyMePayload, request],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await request<MeResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (response.error) {
        devLog("login:error", response.error);
        return { error: response.error };
      }
      applyMePayload(response.data);
      devLog("login:ok", { userId: response.data?.user.id });
      return { error: null };
    },
    [applyMePayload, request],
  );

  const signOut = useCallback(async () => {
    await request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    setUser(null);
    setStats(null);
    setSessionToken(null);
    devLog("logout:ok");
  }, [request]);

  const updateUsername = useCallback(
    async (nextUsername: string) => {
      const normalized = normalizeDisplayName(nextUsername);
      if (!normalized) {
        return { error: "Display name cannot be empty." };
      }

      const response = await request<MeResponse>("/api/account/display-name", {
        method: "POST",
        body: JSON.stringify({ displayName: normalized }),
      });
      if (response.error) {
        devLog("update_username:error", response.error);
        return { error: response.error };
      }

      applyMePayload(response.data);
      devLog("update_username:ok", { userId: response.data?.user.id });
      return { error: null };
    },
    [applyMePayload, request],
  );

  const username = useMemo(() => {
    if (!user) return "";
    const fromUser = (user.displayName && normalizeDisplayName(user.displayName)) || user.defaultName || defaultNameFromEmail(user.email);
    return normalizeDisplayName(fromUser);
  }, [user]);

  const signUp = useCallback<AuthContextValue["signUp"]>(
    async (email, password, usernameInput) => {
      const response = await register(email, password);
      if (response.error) {
        return { data: null, error: { message: response.error } };
      }
      if (usernameInput && usernameInput.trim()) {
        await updateUsername(usernameInput);
      }
      return { data: { ok: true }, error: null, requiresConfirmation: false };
    },
    [register, updateUsername],
  );

  const signIn = useCallback<AuthContextValue["signIn"]>(
    async (emailOrUsername, password) => {
      const normalized = String(emailOrUsername || "").trim().toLowerCase();
      if (!normalized.includes("@")) {
        return { data: null, error: { message: "Use your account email to sign in." } };
      }
      const response = await login(normalized, password);
      if (response.error) {
        return { data: null, error: { message: response.error } };
      }
      return { data: { ok: true }, error: null };
    },
    [login],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      username,
      email: user?.email ?? null,
      stats,
      sessionToken,
      signUp,
      signIn,
      signOut,
      updateUsername,
    }),
    [
      user,
      loading,
      stats,
      username,
      sessionToken,
      signUp,
      signIn,
      signOut,
      updateUsername,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
