# FunDeck (Local-First)

FunDeck is a local-first multiplayer party/casino game hub.
The host runs one local server (`game-server`) that provides:

- Player website UI
- Host dashboard
- Real-time Socket.IO multiplayer backend

No cloud backend is required.

## Local Development

1. Install dependencies:

```bash
npm run install:all
```

2. Start everything (Next + game-server):

```bash
npm run dev:all
```

3. Open:

- Frontend: `http://localhost:3000`
- Game server: `http://localhost:5250`

## Production Build

1. Install dependencies:

```bash
npm run install:all
```

2. Build:

```bash
npm run build
```

3. Start production server (single command):

```bash
npm start
```

This starts only `game-server`, which serves the built Next app and Socket.IO from one process.

## LOCAL HOSTING

1. Dev mode (two processes):

```bash
npm run dev:all
```

2. Production mode (single local server):

```bash
npm run build
npm start
```

3. Share with friends:

- LAN: use the LAN URL printed by `game-server` on startup.
- Internet: run your own tunnel (for example Cloudflare Tunnel, Tailscale Funnel, or playit) and share `http(s)://<your-host>/join/<ROOM_CODE>`.
