const DEFAULT_LOCAL_SERVER_URL = "http://localhost:5250";

export function getSocketServerUrl(): string {
  const configured = process.env.NEXT_PUBLIC_GAME_SERVER_URL?.trim();
  if (configured) {
    return configured;
  }

  if (typeof window === "undefined") {
    return DEFAULT_LOCAL_SERVER_URL;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEFAULT_LOCAL_SERVER_URL;
  }

  return window.location.origin;
}
