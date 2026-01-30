# Setting up Playit.gg for the Blackjack server

The blackjack realtime server runs on your PC and listens only on **127.0.0.1** (localhost). Playit.gg creates a tunnel so friends can reach it from the internet.

---

## 1. Install the Playit.gg agent (Windows)

1. Go to [https://playit.gg](https://playit.gg) and sign up or log in.
2. Download the **Windows** agent and run the installer.
3. Log in with your Playit.gg account when prompted.
4. Keep the agent running (it can run in the background or system tray).

---

## 2. Create a tunnel for the blackjack server

1. In the Playit.gg agent, add a **new tunnel**.
2. Choose **TCP** or **HTTP** (TCP is enough for Socket.IO; HTTP works too if the agent offers it).
3. Set **local address** to `127.0.0.1` and **local port** to `5250` (or whatever you set in `PORT` in blackjack-server).
4. Save the tunnel. Playit will give you a **public URL**, e.g.:
   - `https://something-random.playit.gg`  
   - or a custom subdomain if you have a Playit.gg domain.

5. Note this URL — you will use it as the **socket server URL** in the frontend.

---

## 3. Confirm the Playit URL

- The URL Playit shows is the one that forwards to your PC’s `127.0.0.1:5250`.
- You do **not** need to add `/health` or any path to this base URL; the frontend will call `{URL}/health` for the health check and connect to the same origin for Socket.IO.

---

## 4. Put the URL into the frontend

1. For **local testing** with the tunnel:
   - In the repo root, create or edit `.env.local`.
   - Set:
     ```bash
     NEXT_PUBLIC_BLACKJACK_SOCKET_SERVER=https://your-playit-url.playit.gg
     ```
   - Restart `npm run dev` so Next.js picks up the variable.

2. For **GitHub Pages** (production):
   - In your GitHub repo: **Settings → Environments** (or **Secrets and variables → Actions**).
   - Add a **variable** (or secret) named `NEXT_PUBLIC_BLACKJACK_SOCKET_SERVER` with the Playit URL.
   - Re-run the Pages workflow so the next build uses this value.

---

## 5. Allow the frontend origin on the server

The blackjack server uses **CORS** and only accepts origins you list.

1. In `blackjack-server`, set `ALLOWED_ORIGINS` when starting the server (e.g. in `.env` in that folder or in the shell):
   ```bash
   ALLOWED_ORIGINS=http://localhost:3000,https://your-username.github.io
   ```
   - Use your real GitHub Pages URL (e.g. `https://your-username.github.io` or `https://your-username.github.io/fundeck` if you use a project path).
   - Include `http://localhost:3000` so local dev still works.

2. Restart the blackjack server so it picks up the new value.

---

## 6. Test checklist

- **Local health**
  - Start the blackjack server: `cd blackjack-server && npm run start`.
  - Open [http://localhost:5250/health](http://localhost:5250/health) in a browser. You should see JSON with `status: "ok"`, `version`, and `uptimeSeconds`.

- **Local frontend**
  - Start the frontend: `npm run dev`.
  - Set `NEXT_PUBLIC_BLACKJACK_SOCKET_SERVER=http://localhost:5250` in `.env.local` (or leave it unset to use the dev fallback).
  - Open [http://localhost:3000/games/blackjack](http://localhost:3000/games/blackjack). You should see the lobby and be able to create/join a room.

- **Remote friend (Playit)**
  - Ensure the Playit.gg agent is running and the tunnel is active.
  - Set `NEXT_PUBLIC_BLACKJACK_SOCKET_SERVER` to your Playit URL (in build/env for Pages, or in `.env.local` for local).
  - Have a friend open your GitHub Pages site (or your local URL if you share it) and go to Blackjack. They should connect via the Playit URL and be able to create/join a room with you.

If the server is stopped or the tunnel is down, the Blackjack page will show **“Blackjack server is offline”** with a Retry button and the socket URL in the details.
