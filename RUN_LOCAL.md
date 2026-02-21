# Running FunDeck locally

FunDeck has two processes in development:
- Next.js frontend on `http://localhost:3000`
- Local game server on `http://localhost:5250`

## 1. One command (recommended)

From repo root:

```bash
npm run install:all
npm run dev:all
```

This installs root + `game-server` dependencies and starts both processes.

## 2. Two terminals (manual)

Terminal 1 (frontend):

```bash
npm install
npm run dev
```

Terminal 2 (game server):

```bash
cd game-server
npm install
npm run dev
```

## 3. Quick smoke test

1. Run `npm run dev:all`.
2. Open `http://localhost:3000/host`.
3. Create a room and copy the join link.
4. Open the link in another browser/incognito and join.
5. Open `http://localhost:3000/room/<CODE>` and confirm live room updates.

## 4. Production

From repo root:

```bash
npm run build
npm start
```

`npm start` runs only `game-server`, which serves the built Next app and Socket.IO.
