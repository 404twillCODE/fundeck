# FunDeck Project Summary

## Overview

FunDeck is a local-first multiplayer game hub built with:
- Next.js 16 + React 19 frontend
- `game-server` (Express + Socket.IO) backend
- SQLite persistence for local accounts, sessions, stats, and leaderboard
- Optional Electron desktop host app in `apps/host-desktop`

No cloud backend is required.

## Current Gameplay Scope

- Main games hub: `/`
- Host flow: `/host`
- Join flow: `/join/[code]`
- Room flow: `/room/[code]`
- Local account UI: `/account`
- Leaderboard: `/leaderboards`

Blackjack is the only live game currently implemented end-to-end.

## Key Paths

- `src/app/` - Next app routes and pages
- `src/data/games.ts` - source of truth for game catalog
- `src/contexts/RoomContext.tsx` - room/lobby socket state
- `src/games/blackjack/` - blackjack room UI and game state wiring
- `game-server/src/server.js` - API + Socket.IO + Next serving in production
- `game-server/src/persistence/` - memory/sqlite/auth stores
- `apps/host-desktop/` - Electron host packaging and runtime launcher

## Run Commands

- Dev all: `npm run dev:all`
- Build: `npm run build`
- Start production server: `npm run start`
- Desktop dev: `npm run desktop:dev`
- Desktop package build: `npm run desktop:build`
- Desktop distributables (`.exe`): `npm run desktop:dist`
