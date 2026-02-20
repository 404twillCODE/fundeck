# FunDeck — Project Summary

## What this is

**FunDeck** is a game-hub web app for playing mini-games with friends: party games, debate-style games, and casino-style games. It’s built for “game night” use (Discord, voice chat, in-person). The stack is **Next.js** (frontend) and a **Node/Express + Socket.IO** backend used by the first real game, **Blackjack**.

- **Frontend**: Next.js 16, React 19, Tailwind, Framer Motion, Supabase (optional auth/data).
- **Backend (so far)**: One server in `blackjack-server/` — Node, Express, Socket.IO, optional Supabase for rooms/leaderboard.

---

## How it works

1. **Run everything**
   - **Option A**: From repo root run `npm run run:all` — installs root + blackjack-server deps, then starts Next.js and the blackjack server in one terminal (via `concurrently`).
   - **Option B**: PowerShell: `.\run.ps1` (same behavior).
   - **Option C**: Bash: `./run.sh` (same behavior).
   - **Option D**: Manual: `npm run dev` (frontend) in one terminal; in another, `cd blackjack-server && npm run dev` (server).

2. **Sites**
   - **Next.js**: [http://localhost:3000](http://localhost:3000) — home, game list, account, and all game pages.
   - **Blackjack server**: `http://127.0.0.1:5250` (Socket.IO + HTTP). The frontend connects to it when you’re on localhost (or when `NEXT_PUBLIC_BLACKJACK_SOCKET_SERVER` is set).

3. **Flow**
   - Home shows an optional auth gate (Supabase) and then a list of games by category (Casino, Party, Social, Debate).
   - Each game has a slug and a status: **live** or **wip**. Only **Blackjack** is live; the rest are “Coming Soon” and show placeholder pages.
   - **Live game**: `/games/blackjack` renders the full Blackjack app (lobby, create/join room, real-time multiplayer via Socket.IO, betting, chat). Other live games would be similar (their own route + backend if needed).
   - **WIP games**: `/games/[slug]` (e.g. `/games/poker`) shows a generic “Work in Progress” page with placeholder content; no game logic.

4. **Blackjack specifics**
   - Auth is optional (Supabase). If enabled, you must sign in to see the home game list.
   - Blackjack uses `AuthContext` and `GameContext`, and talks to `blackjack-server` over Socket.IO (create/join room, bets, hits, etc.). Rooms can be stored in Supabase or in-memory.

---

## Files and folders (used vs not used)

### Used (core app)

| Path | Purpose |
|------|--------|
| `package.json` | Root scripts: `dev`, `build`, `start`, `lint`, `dev:server`, `dev:all`, `install:all`, `run:all`. |
| `run.ps1` / `run.sh` | One-command “install + run everything” from repo root. |
| `next.config.ts`, `postcss.config.mjs`, `tsconfig.json` | Next + Tailwind + TypeScript config. |
| `src/app/` | App router: `layout.tsx`, `page.tsx` (home), `providers.tsx`, `globals.css`, `account/page.tsx`, `games/page.tsx`, `games/[slug]/page.tsx`, `games/blackjack/page.tsx`. |
| `src/components/` | Shared UI: `AnimatedBackground`, `Badge`, `Container`, `GameCard`, `GradientText`, `Navbar`, `NeonCard`. |
| `src/data/games.ts` | **Single source of truth** for game list (slug, name, description, category, icon, status). Used by home, games list, and `[slug]` page. |
| `src/games/blackjack/` | Entire Blackjack game: `BlackjackApp`, `BlackjackLobby`, `index.tsx`, `config.ts`, `types.ts`, components (Auth, BettingPanel, Card, Chat, DealerArea, GameHistory, GameRoom, JoinRoom, PlayerControls, PlayerSeat, ServerChecking, ServerOfflinePanel), contexts (AuthContext, GameContext), `lib/supabase.ts`. |
| `src/lib/utils.ts` | Shared utilities (if used by components). |
| `blackjack-server/` | Node server: `src/server.js`, `src/supabase.js` (or similar), `package.json`. Used only by Blackjack. |
| `.env`, `.env.example` | Env for Next and blackjack-server (Supabase, socket URL, CORS, etc.). |

### Used (support / docs)

| Path | Purpose |
|------|--------|
| `.github/` | CI/workflows (if any). |
| `README.md`, `RUN_LOCAL.md`, `SETUP_PLAYIT.md` | Docs. |
| `public/` | Static assets. |

### Build / tooling (used)

| Path | Purpose |
|------|--------|
| `node_modules/`, `blackjack-server/node_modules/` | Dependencies. |
| `.next/` | Next build output (when you run `npm run build` or `npm run dev`). |
| `out/` | Static export output (if you use `next export` / static export). |
| `eslint.config.mjs`, `prettier.config.cjs` | Lint/format. |

### Not used for any game (yet)

- No other game-specific folders under `src/games/` (e.g. no `src/games/poker/`, `src/games/roulette/`). Only `blackjack` is implemented.
- No other servers besides `blackjack-server/`. Roulette, Poker, Hot Potato, etc. have no backend or frontend game code yet.

---

## Games: built vs not built

- **Built and live**
  - **Blackjack** — Full multiplayer game: lobby, rooms, betting, hit/stand, dealer logic, chat, optional Supabase auth and room persistence. Uses `blackjack-server` and all of `src/games/blackjack/`.

- **Not built (WIP / placeholders only)**
  - All other entries in `src/data/games.ts` are `status: "wip"` and only have:
    - A card on the home page and games list.
    - A generic `/games/[slug]` page (“Work in Progress”, placeholder features list).
  - No dedicated components, no backends, no real gameplay.

  List: **Hot Potato**, **Roulette**, **I Spy**, **Poker**, **Hot Mic**, **Charades Blitz**, **Sus Meter**, **Two Truths One Lie**, **Dealer's Choice**, **Would You Rather**, **Guess the Ranking**, **Pictionary**, **Music Guess**, **Rapid Trivia**.

---

## Quick reference

| Goal | Command |
|------|--------|
| Run everything (install + frontend + server) | `npm run run:all` or `.\run.ps1` or `./run.sh` |
| Frontend only | `npm run dev` |
| Blackjack server only | `cd blackjack-server && npm run dev` |
| Frontend + server (no install) | `npm run dev:all` |
| Build for production | `npm run build` then `npm run start` |
