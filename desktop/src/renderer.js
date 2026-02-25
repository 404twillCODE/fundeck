/* ─── element refs ─── */
const $ = (id) => document.getElementById(id);

const statusPill = $("status-pill");
const lanUrlEl = $("lan-url");
const logOutputEl = $("log-output");
const consoleInputEl = $("console-input");
const startButton = $("start-server");
const stopButton = $("stop-server");
const copyLanButton = $("copy-lan");
const copyConsoleButton = $("copy-console");
const errorBanner = $("error-banner");
const setupView = $("setup-view");
const mainView = $("main-view");
const setupMessage = $("setup-message");
const setupLog = $("setup-log");
const runSetupBtn = $("run-setup-btn");
const sidebarUser = $("sidebar-user");
const sidebarUsername = $("sidebar-username");
const sidebarEmail = $("sidebar-email");

const STATUS_LABELS = { running: "Running", starting: "Starting…", stopping: "Stopping…", error: "Error", stopped: "Stopped" };

const GAMES = [
  { slug:"blackjack", name:"Blackjack", description:"Hit the sweet spot between skill and luck.", category:"Casino", status:"live", icon:"&#9824;" },
  { slug:"hot-potato", name:"Hot Potato", description:"Fast passes, faster reactions. Don't get stuck holding it.", category:"Party", status:"wip", icon:"&#128293;" },
  { slug:"roulette", name:"Roulette", description:"Drop a bet and watch the neon wheel spin.", category:"Casino", status:"wip", icon:"&#128178;" },
  { slug:"i-spy", name:"I Spy", description:"Clues, quick eyes, and instant callouts.", category:"Party", status:"wip", icon:"&#128065;" },
  { slug:"poker", name:"Poker", description:"High stakes hands with a premium table feel.", category:"Casino", status:"wip", icon:"&#9824;" },
  { slug:"hot-mic", name:"Hot Mic", description:"Unfiltered, fast, and hilarious. Stay on your toes.", category:"Party", status:"wip", icon:"&#127908;" },
  { slug:"charades-blitz", name:"Charades Blitz", description:"Act it out fast with quick team callouts.", category:"Party", status:"wip", icon:"&#128101;" },
  { slug:"sus-meter", name:"Sus Meter", description:"Call out the chaos and rate the vibes.", category:"Party", status:"wip", icon:"&#128128;" },
  { slug:"two-truths-one-lie", name:"Two Truths, One Lie", description:"Spot the bluff and defend your story.", category:"Debate", status:"wip", icon:"&#128172;" },
  { slug:"dealers-choice", name:"Dealer's Choice", description:"Let the host set the tone for the night.", category:"Casino", status:"wip", icon:"&#127942;" },
  { slug:"would-you-rather", name:"Would You Rather", description:"Pick a side and defend it with style.", category:"Debate", status:"wip", icon:"&#127881;" },
  { slug:"guess-the-ranking", name:"Guess the Ranking", description:"Rank the answers and reveal the surprise.", category:"Debate", status:"wip", icon:"&#127916;" },
  { slug:"pictionary", name:"Pictionary", description:"Sketch fast, guess faster, and rack up points.", category:"Party", status:"wip", icon:"&#9999;" },
  { slug:"music-guess", name:"Music Guess", description:"Name the track, call the artist, own the round.", category:"Party", status:"wip", icon:"&#127911;" },
  { slug:"rapid-trivia", name:"Rapid Trivia", description:"Quick-fire trivia rounds for teams or solo flex.", category:"Social", status:"wip", icon:"&#128172;" },
];

/* ─── state ─── */
let currentTab = "tab-server";
let authMode = "signup";
let currentUser = null;
let activeRoom = null;
let selectedGameForRoom = "blackjack";
let pollInterval = null;

/* ─── helpers ─── */
function setCopyFeedback(btn, label) {
  const orig = btn.textContent;
  btn.textContent = label;
  btn.classList.add("copied");
  setTimeout(() => { btn.textContent = orig; btn.classList.remove("copied"); }, 2000);
}

async function api(method, path, body) {
  return window.hostDesktop.hostApi(method, path, body);
}

/* ─── tab switching ─── */
document.querySelectorAll(".sidebar-btn[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => switchToTab(btn.dataset.tab));
});

/* ─── titlebar ─── */
$("btn-minimize").addEventListener("click", () => window.hostDesktop.windowMinimize());
$("btn-maximize").addEventListener("click", () => window.hostDesktop.windowMaximize());
$("btn-close").addEventListener("click", () => window.hostDesktop.windowClose());

/* ─── server tab ─── */
function renderServerState(state) {
  const status = state?.status || "stopped";
  const isRunning = status === "running";
  const isBusy = status === "starting" || status === "stopping";
  const err = state?.error || "";

  statusPill.textContent = STATUS_LABELS[status] || "Stopped";
  statusPill.className = "status-pill " + status;

  if (errorBanner) { errorBanner.hidden = !err; errorBanner.textContent = err; }
  lanUrlEl.textContent = isRunning && state?.lanUrl ? state.lanUrl : "Start the server to get a link";

  const logs = state?.logs?.length ? state.logs.join("\n") : "Start the server to see activity.";
  logOutputEl.textContent = logs + (err ? "\n\n" + err : "");
  const logContainer = logOutputEl.parentElement;
  if (logContainer) {
    const scroll = () => { logContainer.scrollTop = logContainer.scrollHeight; };
    scroll();
    requestAnimationFrame(scroll);
  }

  startButton.disabled = isRunning || isBusy;
  stopButton.disabled = !isRunning && status !== "starting";
  copyLanButton.disabled = !isRunning;

  const extInput = $("external-url-input");
  if (extInput && document.activeElement !== extInput) extInput.value = state?.externalUrl || "";
}

startButton.addEventListener("click", async () => {
  await window.hostDesktop.startServer();
  renderServerState(await window.hostDesktop.getState());
});

stopButton.addEventListener("click", async () => {
  await window.hostDesktop.stopServer();
  renderServerState(await window.hostDesktop.getState());
});

copyLanButton.addEventListener("click", () => {
  const url = lanUrlEl.textContent;
  if (!url || url.startsWith("Start")) return;
  window.hostDesktop.copyText(url);
  setCopyFeedback(copyLanButton, "Copied!");
});

if (copyConsoleButton) {
  copyConsoleButton.addEventListener("click", () => {
    window.hostDesktop.copyText(logOutputEl.textContent || "");
    setCopyFeedback(copyConsoleButton, "Copied!");
  });
}

const extSave = $("external-url-save");
const extInput = $("external-url-input");
if (extSave && extInput) {
  extSave.addEventListener("click", async () => {
    await window.hostDesktop.setExternalUrl(extInput.value.trim());
    setCopyFeedback(extSave, "Saved!");
  });
}

consoleInputEl.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const line = consoleInputEl.value.trim();
  if (!line) return;
  consoleInputEl.value = "";
  await window.hostDesktop.sendConsoleInput(line);
  renderServerState(await window.hostDesktop.getState());
});

window.hostDesktop.onState((s) => renderServerState(s));

/* ─── auth (host tab) ─── */
const authTabSignin = $("auth-tab-signin");
const authTabSignup = $("auth-tab-signup");
const authNameRow = $("auth-name-row");
const authSubmit = $("auth-submit");
const authError = $("auth-error");
const hostAuth = $("host-auth");
const hostPanel = $("host-panel");

function setAuthMode(mode) {
  authMode = mode;
  authTabSignin.style.opacity = mode === "signin" ? "1" : "0.5";
  authTabSignup.style.opacity = mode === "signup" ? "1" : "0.5";
  authNameRow.hidden = mode !== "signup";
  authSubmit.textContent = mode === "signup" ? "Create Account" : "Sign In";
}

authTabSignin.addEventListener("click", () => setAuthMode("signin"));
authTabSignup.addEventListener("click", () => setAuthMode("signup"));
setAuthMode("signup");

authSubmit.addEventListener("click", async () => {
  const email = $("auth-email").value.trim();
  const password = $("auth-password").value;
  const name = $("auth-name").value.trim();
  authError.hidden = true;

  if (!email) { authError.textContent = "Email is required."; authError.hidden = false; return; }
  if (password.length < 8) { authError.textContent = "Password must be at least 8 characters."; authError.hidden = false; return; }
  if (authMode === "signup" && !name) { authError.textContent = "Display name is required."; authError.hidden = false; return; }

  authSubmit.disabled = true;
  authSubmit.textContent = "Working...";

  const endpoint = authMode === "signup" ? "/api/auth/register" : "/api/auth/login";
  const body = { email, password };
  const result = await api("POST", endpoint, body);

  authSubmit.disabled = false;
  setAuthMode(authMode);

  if (result.error) {
    authError.textContent = result.error;
    authError.hidden = false;
    return;
  }

  currentUser = result.user || null;
  if (name && currentUser) localStorage.setItem("fundeck:displayName", name);
  showHostPanel();
});

$("host-signout").addEventListener("click", async () => {
  await api("POST", "/api/auth/logout");
  currentUser = null;
  showAuthPanel();
});

function showAuthPanel() {
  hostAuth.hidden = false;
  hostPanel.hidden = true;
  sidebarUser.hidden = true;
}

function showHostPanel() {
  hostAuth.hidden = true;
  hostPanel.hidden = false;
  if (currentUser) {
    sidebarUser.hidden = false;
    sidebarUsername.textContent = localStorage.getItem("fundeck:displayName") || currentUser.defaultName || "Host";
    sidebarEmail.textContent = currentUser.email || "";
  }
  refreshHostPanel();
}

async function checkAuth() {
  const result = await api("GET", "/api/me");
  if (result.user) {
    currentUser = result.user;
    showHostPanel();
  } else {
    showAuthPanel();
  }
}

/* ─── host dashboard ─── */
const hostNoRoom = $("host-no-room");
const hostActiveRoom = $("host-active-room");
const hostPlayersSection = $("host-players-section");
const hostPlayersList = $("host-players-list");
const hostRoomCode = $("host-room-code");
const hostRoomPhase = $("host-room-phase");
const hostJoinUrl = $("host-join-url");
const hostGameSelect = $("host-game-select");
const hostCreateError = $("host-create-error");

function populateGameSelect() {
  hostGameSelect.innerHTML = "";
  GAMES.filter((g) => g.status === "live").forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g.slug;
    opt.textContent = g.name;
    hostGameSelect.appendChild(opt);
  });
  hostGameSelect.value = selectedGameForRoom;
}

$("host-go-games").addEventListener("click", () => switchToTab("tab-games"));

$("host-copy-join").addEventListener("click", () => {
  const url = hostJoinUrl.textContent;
  if (url) { window.hostDesktop.copyText(url); setCopyFeedback($("host-copy-join"), "Copied!"); }
});

$("host-set-game").addEventListener("click", async () => {
  if (!activeRoom) return;
  const result = await api("POST", "/api/host/set-game", { roomCode: activeRoom.roomCode, gameId: hostGameSelect.value });
  if (result.error) { hostCreateError.textContent = result.error; hostCreateError.hidden = false; return; }
  hostCreateError.hidden = true;
  refreshHostPanel();
});

$("host-start-game").addEventListener("click", async () => {
  if (!activeRoom) return;
  const result = await api("POST", "/api/host/start-game", { roomCode: activeRoom.roomCode });
  if (result.error) { hostCreateError.textContent = result.error; hostCreateError.hidden = false; return; }
  hostCreateError.hidden = true;
  refreshHostPanel();
});

async function refreshHostPanel() {
  if (!currentUser) return;
  populateGameSelect();
  const result = await api("GET", "/api/host/rooms");
  const rooms = result?.rooms || [];
  const room = rooms.length > 0 ? rooms[0] : null;
  activeRoom = room;

  if (!room) {
    hostNoRoom.hidden = false;
    hostActiveRoom.hidden = true;
    hostPlayersSection.hidden = true;
    const qrEl = $("host-join-qr");
    const qrImg = $("host-join-qr-img");
    if (qrEl && qrImg) { qrImg.src = ""; qrImg.alt = ""; qrEl.classList.add("empty"); }
    return;
  }

  hostNoRoom.hidden = true;
  hostActiveRoom.hidden = false;
  hostPlayersSection.hidden = false;

  hostRoomCode.textContent = room.roomCode;
  hostRoomPhase.textContent = room.phase;
  hostRoomPhase.className = "status-pill " + (room.phase === "lobby" ? "running" : room.phase === "in_game" ? "starting" : "stopped");

  const state = await window.hostDesktop.getState();
  const ext = state?.externalUrl || "";
  let joinUrl = "";

  if (ext) {
    let trimmed = ext.trim();

    // Ensure custom URL has a scheme so QR scanners treat it as a proper link.
    if (!/^https?:\/\//i.test(trimmed)) {
      trimmed = "https://" + trimmed.replace(/^\/+/, "");
    }

    if (/\/join\/[^/]+$/i.test(trimmed)) {
      // Looks like a full join URL with a room code already; replace the code.
      joinUrl = trimmed.replace(/(\/join\/)[^/]*$/i, `$1${room.roomCode}`);
    } else if (/\/join\/?$/i.test(trimmed)) {
      // Ends with /join or /join/ – just append the code.
      joinUrl = trimmed.replace(/\/$/, "") + "/" + room.roomCode;
    } else {
      // Treat as base URL; append /join/{code}.
      joinUrl = trimmed.replace(/\/$/, "") + "/join/" + room.roomCode;
    }
  } else {
    const base = state?.lanUrl || state?.localUrl || "";
    joinUrl = base ? base.replace(/\/$/, "") + "/join/" + room.roomCode : "";
  }
  hostJoinUrl.textContent = joinUrl;

  const qrEl = $("host-join-qr");
  const qrImg = $("host-join-qr-img");
  if (qrEl && qrImg) {
    if (joinUrl) {
      qrImg.src = "https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=" + encodeURIComponent(joinUrl);
      qrImg.alt = "QR code to join room";
      qrEl.classList.remove("empty");
    } else {
      qrImg.src = "";
      qrImg.alt = "";
      qrEl.classList.add("empty");
    }
  }
  hostGameSelect.value = room.gameId;

  $("host-start-game").disabled = room.phase !== "lobby";

  renderPlayers(room);
}

function renderPlayers(room) {
  hostPlayersList.innerHTML = "";
  if (!room.players || room.players.length === 0) {
    hostPlayersList.innerHTML = '<p style="font-size:0.8rem;color:var(--color-muted);">No players yet. Share the join link!</p>';
    return;
  }

  room.players.forEach((p) => {
    const row = document.createElement("div");
    row.className = "player-row";
    row.innerHTML = `
      <span class="player-name">${escapeHtml(p.name)}</span>
      <span class="player-balance">$${(p.balance || 0).toLocaleString()}</span>
      <span class="player-status ${p.connected ? "connected" : "disconnected"}">${p.connected ? "Online" : "Offline"}</span>
      <div class="player-actions">
        <input type="number" class="input balance-input" value="${p.balance || 0}" min="0" data-pid="${p.playerId}" title="Set balance" />
        <button class="btn btn-sm" data-action="set-balance" data-pid="${p.playerId}" title="Set balance">Set $</button>
        <button class="btn btn-sm btn-warn" data-action="kick" data-pid="${p.playerId}" title="Kick">Kick</button>
        <button class="btn btn-sm btn-danger" data-action="ban" data-pid="${p.playerId}" title="Ban">Ban</button>
      </div>
    `;
    hostPlayersList.appendChild(row);
  });

  hostPlayersList.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn || !activeRoom) return;
    const action = btn.dataset.action;
    const playerId = btn.dataset.pid;

    if (action === "kick") {
      if (!confirm("Kick this player?")) return;
      await api("POST", "/api/host/kick", { roomCode: activeRoom.roomCode, playerId });
    } else if (action === "ban") {
      if (!confirm("Ban this player? They won't be able to rejoin.")) return;
      await api("POST", "/api/host/ban", { roomCode: activeRoom.roomCode, playerId });
    } else if (action === "set-balance") {
      const input = hostPlayersList.querySelector(`input[data-pid="${playerId}"]`);
      const balance = Number(input?.value);
      if (!Number.isFinite(balance) || balance < 0) return;
      await api("POST", "/api/host/set-balance", { roomCode: activeRoom.roomCode, playerId, balance });
    }
    refreshHostPanel();
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* ─── helpers ─── */
function switchToTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll(".sidebar-btn[data-tab]").forEach((b) => b.classList.toggle("active", b.dataset.tab === tabId));
  document.querySelectorAll(".tab-content").forEach((t) => t.classList.toggle("active", t.id === tabId));
  if (tabId === "tab-host") refreshHostPanel();
  if (tabId === "tab-games") renderGames();
}

/* ─── games tab ─── */
function renderGames() {
  const grid = $("games-grid");
  grid.innerHTML = "";

  GAMES.forEach((game) => {
    const isLive = game.status === "live";
    const card = document.createElement("div");
    card.className = "game-card" + (isLive ? "" : " wip");
    card.innerHTML = `
      <div>
        <div class="game-card-icon">${game.icon || "&#127918;"}</div>
        <div class="game-card-header">
          <div class="game-card-name">${escapeHtml(game.name)}</div>
          <span class="game-card-status ${game.status}">${isLive ? "Live" : "Coming Soon"}</span>
        </div>
        <div class="game-card-desc">${escapeHtml(game.description)}</div>
      </div>
      <div class="game-card-footer">
        <span class="game-card-cat">${game.category}</span>
        ${isLive
          ? `<button class="btn-play btn-play-primary" data-create-game="${game.slug}">Play</button>`
          : `<button class="btn-play" disabled>Coming Soon</button>`}
      </div>
    `;
    grid.appendChild(card);
  });
}

$("games-grid").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-create-game]");
  if (!btn) return;
  selectedGameForRoom = btn.dataset.createGame;

  if (!currentUser) {
    switchToTab("tab-host");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Creating…";
  const name = localStorage.getItem("fundeck:displayName") || "Host";
  const result = await api("POST", "/api/host/create-room", { gameId: selectedGameForRoom, name });
  btn.disabled = false;
  btn.textContent = "Play";

  if (result.error) { alert(result.error); return; }
  activeRoom = { roomCode: result.roomCode, gameId: selectedGameForRoom, phase: "lobby", players: [] };
  switchToTab("tab-host");
});

/* ─── room polling ─── */
function startRoomPolling() {
  if (pollInterval) return;
  pollInterval = setInterval(async () => {
    if (currentTab === "tab-host" && currentUser && activeRoom) {
      const result = await api("GET", "/api/host/rooms");
      const rooms = result?.rooms || [];
      const room = rooms.find((r) => r.roomCode === activeRoom?.roomCode) || rooms[0] || null;
      if (room) {
        activeRoom = room;
        hostRoomCode.textContent = room.roomCode;
        hostRoomPhase.textContent = room.phase;
        renderPlayers(room);
      } else {
        activeRoom = null;
        refreshHostPanel();
      }
    }
  }, 3000);
}

/* ─── setup flow ─── */
function showSetupView(message) {
  setupView.classList.add("active");
  mainView.classList.add("hidden");
  if (setupMessage) setupMessage.textContent = message || "Run setup to install dependencies.";
  if (setupLog) setupLog.textContent = "";
}

function showMainView() {
  setupView.classList.remove("active");
  mainView.classList.remove("hidden");
}

runSetupBtn.addEventListener("click", async () => {
  runSetupBtn.disabled = true;
  runSetupBtn.textContent = "Running…";
  if (setupLog) setupLog.textContent = "";
  await window.hostDesktop.runSetup();
});

window.hostDesktop.onSetupLog((line) => {
  if (setupLog) { setupLog.textContent += (setupLog.textContent ? "\n" : "") + line; setupLog.scrollTop = setupLog.scrollHeight; }
});

window.hostDesktop.onSetupComplete(async (result) => {
  runSetupBtn.disabled = false;
  runSetupBtn.textContent = "Run setup";
  if (result.success) {
    const status = await window.hostDesktop.getSetupStatus();
    if (!status.setupNeeded) {
      showMainView();
      await window.hostDesktop.startServer();
      renderServerState(await window.hostDesktop.getState());
    }
  }
});

/* ─── init ─── */
async function init() {
  const status = await window.hostDesktop.getSetupStatus();
  if (status.setupNeeded) { showSetupView(status.message); return; }
  showMainView();
  renderServerState(await window.hostDesktop.getState());
  renderGames();

  setTimeout(async () => {
    await checkAuth();
    startRoomPolling();
  }, 1500);
}

init();
