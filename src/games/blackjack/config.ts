/**
 * Blackjack socket server URL. Only NEXT_PUBLIC_BLACKJACK_SOCKET_SERVER is used.
 * - If set: use it (e.g. Playit.gg tunnel URL for production).
 * - If unset in development (localhost): fallback to http://localhost:5250.
 * - If unset in production: no URL → show "Server Offline" UI and do not attempt connect.
 */
export const SOCKET_SERVER_ENV =
  process.env.NEXT_PUBLIC_BLACKJACK_SOCKET_SERVER ?? "";

/** Effective URL for socket connection. Call at runtime; dev gets localhost fallback. */
export function getEffectiveSocketServer(): string | null {
  if (typeof window === "undefined") {
    return SOCKET_SERVER_ENV || "http://localhost:5250";
  }
  if (SOCKET_SERVER_ENV) return SOCKET_SERVER_ENV;
  if (window.location.hostname === "localhost") return "http://localhost:5250";
  return null;
}

/** @deprecated Use getEffectiveSocketServer() for runtime URL. Kept for GameContext when URL is already validated. */
export const SOCKET_SERVER = SOCKET_SERVER_ENV;

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.REACT_APP_SUPABASE_ANON_KEY;
