# Running FunDeck locally

FunDeck has two parts: the **Next.js frontend** and the **blackjack Node server**. Run them in two terminals.

---

## 1. Frontend (Next.js)

From the **repo root**:

```bash
npm install
npm run dev
```

- App runs at [http://localhost:3000](http://localhost:3000).
- For blackjack to connect to a local server, either:
  - Leave `NEXT_PUBLIC_BLACKJACK_SOCKET_SERVER` unset — the app will use `http://localhost:5000` when you’re on localhost, or
  - Set `NEXT_PUBLIC_BLACKJACK_SOCKET_SERVER=http://localhost:5250` in `.env.local`.

---

## 2. Blackjack server (Node)

In a **second terminal**, from the **repo root**:

```bash
cd blackjack-server
npm install
npm run start
```

- Server listens on **http://127.0.0.1:5250** (localhost only).
- For local dev, set CORS to allow the frontend, e.g. in `blackjack-server/.env` (or in the shell):

  ```bash
  ALLOWED_ORIGINS=http://localhost:3000
  ```

- Optional: Supabase for rooms/leaderboard — set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `blackjack-server/.env`. If unset, the server still runs but leaderboard/rooms are in-memory only.

**Dev with auto-reload:**

```bash
cd blackjack-server
npm run dev
```

(Uses nodemon to restart on file changes.)

---

## 3. Quick test

1. Terminal 1: `npm run dev` (frontend).
2. Terminal 2: `cd blackjack-server && npm run start` (server).
3. Open [http://localhost:3000/games/blackjack](http://localhost:3000/games/blackjack).
4. You should see the lobby; create a room and (in another browser/incognito) join with a second “player”.

---

## 4. Optional: run both with one command

From the repo root you can use **concurrently** to run frontend and server in one terminal:

```bash
npm install concurrently --save-dev
```

Add to root `package.json` under `"scripts"`:

```json
"dev:all": "concurrently \"npm run dev\" \"npm run dev:server\"",
"dev:server": "cd blackjack-server && npm run dev"
```

Then:

```bash
npm run dev:all
```

(Stop with Ctrl+C.)
