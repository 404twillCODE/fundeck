#!/usr/bin/env bash
# FunDeck - run everything (frontend + game server)
# From repo root: ./run.sh

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "FunDeck: installing dependencies..."
cd "$ROOT"
npm install

cd "$ROOT/game-server"
npm install

cd "$ROOT"
echo "FunDeck: starting Next.js + game server (Ctrl+C to stop)..."
npm run dev:all
