const { app, BrowserWindow, clipboard, ipcMain, shell } = require("electron");
const http = require("http");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");
const fs = require("fs");

const DEFAULT_PORT = 5250;
const HEALTH_CHECK_INTERVAL_MS = 500;
const HEALTH_CHECK_TIMEOUT_MS = 30000;
const MAX_LOG_LINES = 500;

let serverProcess = null;
let intentionallyStopping = false;
let mainWindow = null;
let dashboardWindow = null;

/** @type {{
 *  status: "stopped"|"starting"|"running"|"stopping"|"error";
 *  port: number | null;
 *  localUrl: string;
 *  lanUrl: string;
 *  logs: string[];
 *  error: string | null;
 *  pid: number | null;
 * }} */
let state = {
  status: "stopped",
  port: null,
  localUrl: "",
  lanUrl: "",
  logs: [],
  error: null,
  pid: null,
};

function normalizeLine(line) {
  return String(line || "").replace(/\r/g, "").trimEnd();
}

function appendLogs(rawChunk) {
  const lines = String(rawChunk || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean);
  if (!lines.length) return;
  state.logs = [...state.logs, ...lines].slice(-MAX_LOG_LINES);
  broadcastState();
}

function updateState(patch) {
  state = { ...state, ...patch };
  broadcastState();
}

function broadcastState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("host:state", state);
}

function getLanHost() {
  const interfaces = os.networkInterfaces();
  const preferredNamePattern = /(wi-?fi|wlan|ethernet|en\d|eth\d|lan)/i;
  const privateIpPattern = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;

  const candidates = [];
  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries || []) {
      if (!entry || entry.family !== "IPv4" || entry.internal || !entry.address) continue;
      let score = privateIpPattern.test(entry.address) ? 50 : 0;
      if (preferredNamePattern.test(name)) score += 20;
      candidates.push({ address: entry.address, score });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates.length > 0 ? candidates[0].address : "127.0.0.1";
}

function buildUrls(port) {
  return {
    localUrl: `http://localhost:${port}`,
    lanUrl: `http://${getLanHost()}:${port}`,
  };
}

function checkHealth(port) {
  return new Promise((resolve) => {
    const request = http.get(`http://127.0.0.1:${port}/health`, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    request.on("error", () => resolve(false));
    request.setTimeout(1500, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForHealthy(port, timeoutMs = HEALTH_CHECK_TIMEOUT_MS) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (await checkHealth(port)) return true;
    await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_INTERVAL_MS));
  }
  return false;
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function findAvailablePort(startPort = DEFAULT_PORT) {
  let candidate = startPort;
  while (!(await isPortFree(candidate))) candidate += 1;
  return candidate;
}

function resolveRuntimePaths() {
  if (app.isPackaged) {
    const bundleRoot = path.join(process.resourcesPath, "bundle");
    return {
      serverEntry: path.join(bundleRoot, "server", "src", "server.js"),
      nextAppDir: path.join(bundleRoot, "web"),
    };
  }
  const rootDir = path.resolve(__dirname, "..", "..");
  return {
    serverEntry: path.join(rootDir, "server", "src", "server.js"),
    nextAppDir: path.join(rootDir, "join-website"),
  };
}

function ensureRuntimeFilesExist(serverEntry, nextAppDir) {
  const nextBuildDir = path.join(nextAppDir, ".next");
  if (!fs.existsSync(serverEntry)) {
    throw new Error(
      `Server not found at ${serverEntry}. Run the app from the repo (desktop/ must be next to server/ and join-website/).`
    );
  }
  if (!fs.existsSync(nextBuildDir)) {
    throw new Error(
      "Join-website not built. From repo root run: cd join-website && npm install && npm run build"
    );
  }
  if (!app.isPackaged) {
    const serverDir = path.resolve(path.dirname(serverEntry), "..");
    const serverNodeModules = path.join(serverDir, "node_modules");
    if (!fs.existsSync(serverNodeModules)) {
      throw new Error(
        "Server dependencies missing. From repo root run: cd server && npm install"
      );
    }
  }
}

function stopServerProcessTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    spawnSync(`taskkill /PID ${pid} /T /F`, { shell: true, stdio: "ignore" });
    return;
  }
  try {
    process.kill(pid, "SIGTERM");
  } catch {}
}

async function startServer() {
  if (serverProcess || state.status === "starting" || state.status === "running") return state;

  let port;
  let serverEntry;
  let nextAppDir;
  try {
    port = await findAvailablePort(DEFAULT_PORT);
    const paths = resolveRuntimePaths();
    serverEntry = paths.serverEntry;
    nextAppDir = paths.nextAppDir;
    ensureRuntimeFilesExist(serverEntry, nextAppDir);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateState({
      status: "error",
      error: message,
      logs: [...state.logs, `Error: ${message}`].slice(-MAX_LOG_LINES),
    });
    return state;
  }

  const urls = buildUrls(port);
  intentionallyStopping = false;
  updateState({
    status: "starting",
    port,
    localUrl: urls.localUrl,
    lanUrl: urls.lanUrl,
    error: null,
    logs: [...state.logs, `Starting server on port ${port}…`].slice(-MAX_LOG_LINES),
    pid: null,
  });

  const sqlitePath = path.join(app.getPath("userData"), "fundeck-host.sqlite");
  const child = spawn(process.execPath, [serverEntry, "--serve-next"], {
    cwd: nextAppDir,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      NEXT_APP_DIR: nextAppDir,
      SQLITE_DB_PATH: sqlitePath,
      ENABLE_SQLITE_PERSISTENCE: "true",
    },
  });

  serverProcess = child;
  updateState({ pid: child.pid ?? null });

  child.stdout.on("data", (chunk) => appendLogs(normalizeLine(chunk)));
  child.stderr.on("data", (chunk) => appendLogs(normalizeLine(chunk)));
  child.on("exit", (code, signal) => {
    const wasIntentional = intentionallyStopping;
    serverProcess = null;
    intentionallyStopping = false;
    if (wasIntentional) {
      updateState({ status: "stopped", pid: null, error: null });
      return;
    }
    updateState({
      status: "error",
      pid: null,
      error: `Server exited (${code ?? "null"}${signal ? `, ${signal}` : ""})`,
      logs: [...state.logs, "Server exited unexpectedly."].slice(-MAX_LOG_LINES),
    });
  });

  const healthy = await waitForHealthy(port);
  if (!healthy) {
    updateState({
      status: "error",
      error: "Server did not become ready in time.",
      logs: [...state.logs, "Health check timed out."].slice(-MAX_LOG_LINES),
    });
    await stopServer();
    return state;
  }

  updateState({
    status: "running",
    error: null,
    logs: [...state.logs, `Server running at ${urls.localUrl}`].slice(-MAX_LOG_LINES),
  });
  return state;
}

async function stopServer() {
  if (!serverProcess) {
    updateState({ status: "stopped", pid: null, error: null });
    return state;
  }
  intentionallyStopping = true;
  updateState({
    status: "stopping",
    logs: [...state.logs, "Stopping server…"].slice(-MAX_LOG_LINES),
  });
  stopServerProcessTree(serverProcess.pid);
  return state;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "FunDeck Host",
    frame: false,
    titleBarStyle: "hidden",
    backgroundColor: "#05060a",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, "renderer.html"));
  mainWindow.on("closed", () => { mainWindow = null; });
  mainWindow.maximize();
}

function openDashboard(embedded = false) {
  if (!state.localUrl) return;
  const targetUrl = `${state.localUrl}/host`;
  if (!embedded) {
    shell.openExternal(targetUrl);
    return;
  }
  if (!dashboardWindow || dashboardWindow.isDestroyed()) {
    dashboardWindow = new BrowserWindow({
      width: 1280,
      height: 800,
      title: "FunDeck Host Dashboard",
      autoHideMenuBar: true,
    });
    dashboardWindow.on("closed", () => { dashboardWindow = null; });
  }
  dashboardWindow.loadURL(targetUrl);
  dashboardWindow.show();
}

app.whenReady().then(async () => {
  createMainWindow();
  updateState({
    port: DEFAULT_PORT,
    ...buildUrls(DEFAULT_PORT),
  });

  ipcMain.handle("host:get-state", () => state);
  ipcMain.handle("host:start-server", async () => startServer());
  ipcMain.handle("host:stop-server", async () => stopServer());
  ipcMain.handle("host:open-dashboard", async (_event, embedded = false) => {
    openDashboard(Boolean(embedded));
    return true;
  });
  ipcMain.handle("host:copy-text", async (_event, text) => {
    clipboard.writeText(String(text || ""));
    return true;
  });
  ipcMain.on("window:close", () => mainWindow?.close());
  ipcMain.on("window:minimize", () => mainWindow?.minimize());
  ipcMain.on("window:maximize", () => {
    if (!mainWindow) return;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  });
  ipcMain.handle("window:is-maximized", () => mainWindow?.isMaximized() ?? false);

  try {
    await startServer();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    updateState({
      status: "error",
      error: message,
      logs: [...state.logs, `Error: ${message}`].slice(-MAX_LOG_LINES),
    });
  }
});

app.on("before-quit", () => {
  intentionallyStopping = true;
  if (serverProcess?.pid) stopServerProcessTree(serverProcess.pid);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
