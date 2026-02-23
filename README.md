# FunDeck

Local-first multiplayer game hub. Four parts:

- **website** — Main site (download, games, contribute). `cd website` → `npm install` → `npm run dev`
- **desktop** — Electron app that runs the server on your PC. **End users:** download the built installer and run it; the app starts the game server and serves the join site by itself. **Developers:** see below.
- **server** — Game server (Express + Socket.IO). Serves the join-website. `cd server` → `npm install` → `npm start` (or run via desktop)
- **join-website** — Next.js app players see when they open the host’s URL. `cd join-website` → `npm install` → `npm run build` (then server or desktop serves it)

## Building the desktop app for distribution

The desktop app is self-contained: once built, users only need to run the installer. The app bundles the server and the built join-website.

From the **desktop** folder, run:

```bash
cd desktop
npm install
npm run build-all
```

That will: install and build **join-website**, bundle the **server** (with its dependencies), then run **electron-builder** to produce the Windows installer and portable exe in `desktop/dist/`. Users run the exe and use “Start server” in the app; no separate setup.

## Development (desktop)

To run the desktop app in dev, from the **desktop** folder:

```bash
cd desktop
npm install
npm run setup-dev
npm run dev
```

`setup-dev` installs server dependencies and builds join-website so the app can start the server. After that, `npm run dev` works. You only need to run `setup-dev` once (or after pulling changes to server/join-website).
