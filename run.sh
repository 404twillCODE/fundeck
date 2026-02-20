#!/usr/bin/env bash
# FunDeck — run everything (frontend + blackjack server)
# From repo root: ./run.sh

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "FunDeck: installing dependencies..."
cd "$ROOT"
npm install

cd "$ROOT/blackjack-server"
npm install

cd "$ROOT"
echo "FunDeck: starting Next.js + blackjack server (Ctrl+C to stop)..."
npm run dev:all
