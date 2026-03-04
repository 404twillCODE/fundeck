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
    const { origin, hostname } = window.location;
    // When developing on the same machine, talk to localhost:5250 as before.
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return DEFAULT_LOCAL_SERVER_URL;
    }
    // When the site is opened from another device via LAN (e.g. 192.168.x.x),
    // use that origin so sockets/API point at the host machine, not the viewer's localhost.
    return origin;
  }

  return window.location.origin;
}
