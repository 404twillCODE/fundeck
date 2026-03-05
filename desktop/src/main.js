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

const EXTERNAL_URL_FILE = "fundeck-external-url.txt";

function getExternalUrlPath() {
  return path.join(app.getPath("userData"), EXTERNAL_URL_FILE);
}

function loadExternalUrl() {
  try {
    const p = getExternalUrlPath();
    if (fs.existsSync(p)) {
      const s = fs.readFileSync(p, "utf8").trim();
      if (s) return s;
    }
  } catch (e) {
    /* ignore */
  }
  return "";
}

function saveExternalUrl(url) {
  const u = String(url || "").trim();
  try {
    const p = getExternalUrlPath();
    if (u) fs.writeFileSync(p, u, "utf8");
    else if (fs.existsSync(p)) fs.unlinkSync(p);
  } catch (e) {
    /* ignore */
  }
}

/** @type {{
 *  status: "stopped"|"starting"|"running"|"stopping"|"error";
 *  port: number | null;
 *  localUrl: string;
 *  lanUrl: string;
 *  externalUrl: string;
 *  logs: string[];
 *  error: string | null;
 *  pid: number | null;
 * }} */
let state = {
  status: "stopped",
  port: null,
  localUrl: "",
  lanUrl: "",
  externalUrl: "",
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
      serverDir: path.join(bundleRoot, "server"),
      nextAppDir: path.join(bundleRoot, "web"),
    };
  }
  const rootDir = path.resolve(__dirname, "..", "..");
  return {
    serverEntry: path.join(rootDir, "server", "src", "server.js"),
    serverDir: path.join(rootDir, "server"),
    nextAppDir: path.join(rootDir, "join-website"),
    rootDir,
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
      "Join-website not built. Run Setup from this app (see left panel) or from repo root: cd join-website && npm install && npm run build"
    );
  }
  if (!app.isPackaged) {
    const serverDir = path.resolve(path.dirname(serverEntry), "..");
    const serverNodeModules = path.join(serverDir, "node_modules");
    if (!fs.existsSync(serverNodeModules)) {
      throw new Error(
        "Server dependencies missing. Run Setup from this app or from repo root: cd server && npm install"
      );
    }
  }
}

/** @returns {{ setupNeeded: boolean; message?: string }} */
function getSetupStatus() {
  if (app.isPackaged) {
    const paths = resolveRuntimePaths();
    const bundleServer = path.join(process.resourcesPath, "bundle", "server", "src", "server.js");
    const bundleWeb = path.join(process.resourcesPath, "bundle", "web", ".next");
    const serverOk = fs.existsSync(bundleServer);
    const webOk = fs.existsSync(bundleWeb);
    if (!serverOk || !webOk) {
      return {
        setupNeeded: true,
        message: "App bundle is missing. Please reinstall the app from the website.",
      };
    }
    return { setupNeeded: false };
  }
  const rootDir = path.resolve(__dirname, "..", "..");
  const serverDir = path.join(rootDir, "server");
  const joinWebsiteDir = path.join(rootDir, "join-website");
  const serverEntry = path.join(serverDir, "src", "server.js");
  const serverNodeModules = path.join(serverDir, "node_modules");
  const nextBuild = path.join(joinWebsiteDir, ".next");
  if (!fs.existsSync(serverEntry)) {
    return {
      setupNeeded: true,
      message: "Repo incomplete. Run this app from the FunDeck repo (desktop/ next to server/ and join-website/).",
    };
  }
  if (!fs.existsSync(serverNodeModules)) {
    return {
      setupNeeded: true,
      message:
        "Server dependencies not installed (includes optional better-sqlite3 for saved data). Click Run setup below.",
    };
  }
  if (!fs.existsSync(nextBuild)) {
    return {
      setupNeeded: true,
      message: "Join-website not built. Click Run setup below.",
    };
  }
  return { setupNeeded: false };
}

function sendSetupLog(line) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("host:setup-log", String(line || ""));
  }
}

function sendSetupComplete(success, errorMessage) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("host:setup-complete", { success, error: errorMessage || null });
  }
}

async function runSetup() {
  if (app.isPackaged) {
    sendSetupComplete(false, "Setup is not available in the installed app. Reinstall from the website.");
    return;
  }
  const rootDir = path.resolve(__dirname, "..", "..");
  const serverDir = path.join(rootDir, "server");
  const joinWebsiteDir = path.join(rootDir, "join-website");
  if (!fs.existsSync(path.join(serverDir, "package.json")) || !fs.existsSync(path.join(joinWebsiteDir, "package.json"))) {
    sendSetupComplete(false, "Repo layout invalid: server/ and join-website/ must exist with package.json.");
    return;
  }
  sendSetupLog("Starting setup…");
  const run = (cmd, args, cwd, label) => {
    return new Promise((resolve, reject) => {
      sendSetupLog("");
      sendSetupLog(`>>> ${label}`);
      const child = spawn(cmd, args, {
        cwd,
        shell: process.platform === "win32",
        stdio: ["ignore", "pipe", "pipe"],
      });
      let hadError = false;
      child.stdout.on("data", (chunk) => {
        String(chunk || "")
          .replace(/\r/g, "")
          .split("\n")
          .forEach((line) => {
            const t = line.trimEnd();
            if (t) sendSetupLog(t);
          });
      });
      child.stderr.on("data", (chunk) => {
        hadError = true;
        String(chunk || "")
          .replace(/\r/g, "")
          .split("\n")
          .forEach((line) => {
            const t = line.trimEnd();
            if (t) sendSetupLog(t);
          });
      });
      child.on("exit", (code) => {
        if (code !== 0) reject(new Error(`${label} exited with code ${code}`));
        else resolve();
      });
      child.on("error", (err) => reject(err));
    });
  };
  try {
    await run("npm", ["install"], serverDir, "server: npm install");
    await run("npm", ["install"], joinWebsiteDir, "join-website: npm install");
    await run("npm", ["run", "build"], joinWebsiteDir, "join-website: npm run build");
    sendSetupLog("");
    sendSetupLog("Setup finished successfully.");
    sendSetupComplete(true);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    sendSetupLog("");
    sendSetupLog(`Setup failed: ${msg}`);
    sendSetupComplete(false, msg);
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

function runJoinWebsiteBuild(nextAppDir) {
  return new Promise((resolve, reject) => {
    updateState({
      status: "starting",
      logs: [...state.logs, "Building join-website…"].slice(-MAX_LOG_LINES),
    });
    const child = spawn("npm", ["run", "build"], {
      cwd: nextAppDir,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => appendLogs(normalizeLine(chunk)));
    child.stderr.on("data", (chunk) => appendLogs(normalizeLine(chunk)));
    child.on("exit", (code) => {
      if (code !== 0) reject(new Error(`join-website build exited with code ${code}`));
      else resolve();
    });
    child.on("error", (err) => reject(err));
  });
}

async function startServer() {
  if (serverProcess || state.status === "starting" || state.status === "running") return state;

  let port;
  let serverEntry;
  let serverDir;
  let nextAppDir;
  try {
    port = await findAvailablePort(DEFAULT_PORT);
    const paths = resolveRuntimePaths();
    serverEntry = paths.serverEntry;
    serverDir = paths.serverDir;
    nextAppDir = paths.nextAppDir;

    if (!app.isPackaged) {
      try {
        await runJoinWebsiteBuild(nextAppDir);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        updateState({
          status: "error",
          error: `Website build failed: ${message}`,
          logs: [...state.logs, `Build failed: ${message}`].slice(-MAX_LOG_LINES),
        });
        return state;
      }
    }

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
    cwd: serverDir,
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
    const hint =
      "If the log above mentions 'SQLite' or 'better-sqlite3', run Setup to install optional dependencies (server folder: npm install better-sqlite3), then start again.";
    updateState({
      status: "error",
      error: "Server did not become ready in time.",
      logs: [...state.logs, "Health check timed out.", hint].slice(-MAX_LOG_LINES),
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


app.whenReady().then(async () => {
  state.externalUrl = loadExternalUrl();
  updateState({
    port: DEFAULT_PORT,
    ...buildUrls(DEFAULT_PORT),
  });

  ipcMain.handle("host:get-state", () => state);
  ipcMain.handle("host:get-setup-status", () => getSetupStatus());
  ipcMain.handle("host:run-setup", async () => runSetup());
  ipcMain.handle("host:check-server", async () => {
    const port = state?.port;
    if (port == null) return { ok: false };
    return { ok: await checkHealth(port) };
  });
  ipcMain.handle("host:console-input", async (_event, line) => {
    const text = String(line ?? "").trim();
    if (!text) return;
    const lower = text.toLowerCase();
    if (lower === "clear" || lower === "cls") {
      updateState({ logs: [] });
      return;
    }
    updateState({
      logs: [...state.logs, `> ${text}`].slice(-MAX_LOG_LINES),
    });
  });
  ipcMain.handle("host:start-server", async () => startServer());
  ipcMain.handle("host:stop-server", async () => stopServer());
  ipcMain.handle("host:api", async (_event, method, apiPath, body) => {
    const port = state?.port || DEFAULT_PORT;
    const url = `http://127.0.0.1:${port}${apiPath}`;
    return new Promise((resolve) => {
      const req = http.request(url, { method: method || "GET" }, (res) => {
        let data = "";
        res.on("data", (chunk) => { data += chunk; });
        res.on("end", () => {
          try { resolve(JSON.parse(data)); } catch { resolve({ error: data }); }
        });
      });
      req.on("error", (err) => resolve({ error: err.message }));
      req.setTimeout(8000, () => { req.destroy(); resolve({ error: "Request timed out" }); });
      req.setHeader("Content-Type", "application/json");
      if (body && method !== "GET") {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  });
  ipcMain.handle("host:copy-text", async (_event, text) => {
    clipboard.writeText(String(text || ""));
    return true;
  });
  ipcMain.handle("host:open-url", async (_event, url) => {
    if (url) shell.openExternal(String(url));
    return true;
  });
  ipcMain.handle("host:set-external-url", async (_event, url) => {
    const u = String(url ?? "").trim();
    saveExternalUrl(u);
    state.externalUrl = u;
    broadcastState();
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

  createMainWindow();

  const setupStatus = getSetupStatus();
  if (!setupStatus.setupNeeded) {
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
  }
});

app.on("before-quit", () => {
  intentionallyStopping = true;
  if (serverProcess?.pid) stopServerProcessTree(serverProcess.pid);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
