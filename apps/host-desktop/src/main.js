const { app, BrowserWindow, clipboard, dialog, ipcMain, shell } = require("electron");
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
const PLAYIT_DOWNLOAD_URL = "https://playit.gg/download";
const DESKTOP_CONFIG_FILENAME = "host-desktop-config.json";

/** @type {import('child_process').ChildProcessWithoutNullStreams | null} */
let serverProcess = null;
let intentionallyStopping = false;
/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {BrowserWindow | null} */
let dashboardWindow = null;

/** @type {{
 *  status: "stopped"|"starting"|"running"|"stopping"|"error";
 *  port: number | null;
 *  localUrl: string;
 *  lanUrl: string;
 *  publicUrl: string;
 *  logs: string[];
 *  error: string | null;
 *  pid: number | null;
 *  playitDownloadUrl: string;
 *  playitConfiguredPath: string;
 *  playitDetectedFolder: string;
 *  playitLaunchReady: boolean;
 * }} */
let state = {
  status: "stopped",
  port: null,
  localUrl: "",
  lanUrl: "",
  publicUrl: "",
  logs: [],
  error: null,
  pid: null,
  playitDownloadUrl: PLAYIT_DOWNLOAD_URL,
  playitConfiguredPath: "",
  playitDetectedFolder: "",
  playitLaunchReady: false,
};

let desktopConfig = {
  playitExecutablePath: "",
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

function getPublicUrlFromEnv() {
  const rawHost = String(process.env.PLAYIT_HOSTNAME || process.env.NEXT_PUBLIC_PLAYIT_HOSTNAME || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");
  return rawHost ? `https://${rawHost}` : "";
}

function getDesktopConfigPath() {
  return path.join(app.getPath("userData"), DESKTOP_CONFIG_FILENAME);
}

function fileExists(filePath) {
  if (!filePath) return false;
  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function directoryExists(folderPath) {
  if (!folderPath) return false;
  try {
    return fs.statSync(folderPath).isDirectory();
  } catch {
    return false;
  }
}

function uniqueNonEmpty(values) {
  return [...new Set(values.filter(Boolean))];
}

function getPlayitCandidateExecutablePaths() {
  const localAppData = process.env.LOCALAPPDATA || "";
  const programFiles = process.env.ProgramFiles || "";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "";

  return uniqueNonEmpty([
    path.join(localAppData, "playit_gg", "bin", "playit.exe"),
    path.join(localAppData, "playit_gg", "playit.exe"),
    path.join(programFiles, "playit_gg", "playit.exe"),
    path.join(programFiles, "playit", "playit.exe"),
    path.join(programFilesX86, "playit_gg", "playit.exe"),
    path.join(programFilesX86, "playit", "playit.exe"),
  ]);
}

function getPlayitCandidateFolders() {
  const localAppData = process.env.LOCALAPPDATA || "";
  const programFiles = process.env.ProgramFiles || "";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "";

  return uniqueNonEmpty([
    path.join(localAppData, "playit_gg"),
    path.join(programFiles, "playit_gg"),
    path.join(programFiles, "playit"),
    path.join(programFilesX86, "playit_gg"),
    path.join(programFilesX86, "playit"),
  ]);
}

function loadDesktopConfig() {
  const configPath = getDesktopConfigPath();
  try {
    if (!fs.existsSync(configPath)) return;
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
    desktopConfig = {
      playitExecutablePath: String(parsed?.playitExecutablePath || "").trim(),
    };
  } catch {
    desktopConfig = { playitExecutablePath: "" };
  }
}

function saveDesktopConfig() {
  const configPath = getDesktopConfigPath();
  const payload = JSON.stringify(desktopConfig, null, 2);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, payload, "utf8");
}

function resolvePlayitInfo() {
  const configuredPath = String(desktopConfig.playitExecutablePath || "").trim();
  const configuredValid = fileExists(configuredPath);

  const detectedFolders = [];
  if (configuredValid) {
    detectedFolders.push(path.dirname(configuredPath));
  }

  getPlayitCandidateExecutablePaths().forEach((candidatePath) => {
    if (fileExists(candidatePath)) {
      detectedFolders.push(path.dirname(candidatePath));
    }
  });

  getPlayitCandidateFolders().forEach((candidateFolder) => {
    if (directoryExists(candidateFolder)) {
      detectedFolders.push(candidateFolder);
    }
  });

  return {
    configuredPath,
    configuredValid,
    launchPath: configuredValid ? configuredPath : "",
    detectedFolder: uniqueNonEmpty(detectedFolders)[0] || "",
  };
}

function refreshPlayitState() {
  const info = resolvePlayitInfo();
  updateState({
    playitDownloadUrl: PLAYIT_DOWNLOAD_URL,
    playitConfiguredPath: info.configuredPath,
    playitDetectedFolder: info.detectedFolder,
    playitLaunchReady: Boolean(info.launchPath),
  });
}

function setPlayitExecutablePath(nextPath) {
  desktopConfig.playitExecutablePath = String(nextPath || "").trim();
  saveDesktopConfig();
  refreshPlayitState();
}

function getLanHost() {
  const interfaces = os.networkInterfaces();
  const vpnNamePattern = /(tailscale|zerotier|hamachi|wireguard|openvpn|proton|nord|expressvpn|tunnel|vpn)/i;
  const virtualNamePattern = /(vmware|virtualbox|vbox|hyper-v|vethernet|docker|wsl|loopback|bridge|tap|tun|npf|utun|host-only)/i;
  const preferredNamePattern = /(wi-?fi|wlan|ethernet|en\d|eth\d|lan)/i;
  const privateIpPattern = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/;
  const linkLocalPattern = /^169\.254\./;

  const candidates = [];

  for (const [name, entries] of Object.entries(interfaces)) {
    for (const entry of entries || []) {
      if (!entry || entry.family !== "IPv4" || entry.internal || !entry.address) {
        continue;
      }

      let score = 0;
      if (privateIpPattern.test(entry.address)) score += 50;
      if (preferredNamePattern.test(name)) score += 20;
      if (vpnNamePattern.test(name)) score -= 40;
      if (virtualNamePattern.test(name)) score -= 80;
      if (linkLocalPattern.test(entry.address)) score -= 30;

      candidates.push({
        address: entry.address,
        score,
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  if (candidates.length > 0) {
    return candidates[0].address;
  }

  return "127.0.0.1";
}

function buildUrls(port) {
  return {
    localUrl: `http://localhost:${port}`,
    lanUrl: `http://${getLanHost()}:${port}`,
    publicUrl: getPublicUrlFromEnv(),
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
    const isHealthy = await checkHealth(port);
    if (isHealthy) return true;
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
  while (!(await isPortFree(candidate))) {
    candidate += 1;
  }
  return candidate;
}

function resolveRuntimePaths() {
  if (app.isPackaged) {
    const bundleRoot = path.join(process.resourcesPath, "bundle");
    const serverEntry = path.join(bundleRoot, "server", "src", "server.js");
    const nextAppDir = path.join(bundleRoot, "web");
    return { serverEntry, nextAppDir };
  }

  const rootDir = path.resolve(__dirname, "..", "..", "..");
  return {
    serverEntry: path.join(rootDir, "game-server", "src", "server.js"),
    nextAppDir: rootDir,
  };
}

function ensureRuntimeFilesExist(serverEntry, nextAppDir) {
  const nextBuildDir = path.join(nextAppDir, ".next");
  if (!fs.existsSync(serverEntry)) {
    throw new Error(`Server entry not found: ${serverEntry}`);
  }
  if (!fs.existsSync(nextBuildDir)) {
    throw new Error(`Next build output missing: ${nextBuildDir}`);
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
  if (serverProcess || state.status === "starting" || state.status === "running") {
    return state;
  }

  const port = await findAvailablePort(DEFAULT_PORT);
  const { serverEntry, nextAppDir } = resolveRuntimePaths();
  ensureRuntimeFilesExist(serverEntry, nextAppDir);

  const urls = buildUrls(port);
  intentionallyStopping = false;
  updateState({
    status: "starting",
    port,
    localUrl: urls.localUrl,
    lanUrl: urls.lanUrl,
    publicUrl: urls.publicUrl,
    error: null,
    logs: [...state.logs, `[desktop] starting server on port ${port}`].slice(-MAX_LOG_LINES),
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
      updateState({
        status: "stopped",
        pid: null,
        error: null,
      });
      return;
    }

    updateState({
      status: "error",
      pid: null,
      error: `Server exited unexpectedly (${code ?? "null"}${signal ? `, ${signal}` : ""})`,
      logs: [...state.logs, `[desktop] server exited unexpectedly`].slice(-MAX_LOG_LINES),
    });
  });

  const healthy = await waitForHealthy(port);
  if (!healthy) {
    updateState({
      status: "error",
      error: "Server failed health check in time.",
      logs: [...state.logs, "[desktop] health check timed out"].slice(-MAX_LOG_LINES),
    });
    await stopServer();
    return state;
  }

  updateState({
    status: "running",
    error: null,
    logs: [...state.logs, `[desktop] server running: ${urls.localUrl}`].slice(-MAX_LOG_LINES),
  });

  return state;
}

async function stopServer() {
  if (!serverProcess) {
    updateState({
      status: "stopped",
      pid: null,
      error: null,
    });
    return state;
  }

  intentionallyStopping = true;
  updateState({
    status: "stopping",
    logs: [...state.logs, "[desktop] stopping server..."].slice(-MAX_LOG_LINES),
  });
  stopServerProcessTree(serverProcess.pid);
  return state;
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 700,
    minWidth: 800,
    minHeight: 580,
    title: "FunDeck Host",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
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
    dashboardWindow.on("closed", () => {
      dashboardWindow = null;
    });
  }
  dashboardWindow.loadURL(targetUrl);
  dashboardWindow.show();
}

app.whenReady().then(async () => {
  createMainWindow();
  loadDesktopConfig();
  updateState({
    port: DEFAULT_PORT,
    ...buildUrls(DEFAULT_PORT),
  });
  refreshPlayitState();

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
  ipcMain.handle("host:playit-open-setup", async () => {
    const info = resolvePlayitInfo();
    if (info.detectedFolder) {
      const openError = await shell.openPath(info.detectedFolder);
      if (!openError) {
        return { mode: "folder", path: info.detectedFolder };
      }
    }

    await shell.openExternal(PLAYIT_DOWNLOAD_URL);
    return { mode: "download", url: PLAYIT_DOWNLOAD_URL };
  });
  ipcMain.handle("host:playit-pick-executable", async () => {
    const result = await dialog.showOpenDialog(mainWindow ?? undefined, {
      title: "Select Playit executable",
      properties: ["openFile"],
      filters: [{ name: "Executable", extensions: ["exe"] }],
    });

    if (result.canceled || !result.filePaths.length) {
      return { canceled: true };
    }

    const selectedPath = result.filePaths[0];
    setPlayitExecutablePath(selectedPath);
    return { canceled: false, path: selectedPath };
  });
  ipcMain.handle("host:playit-clear-executable", async () => {
    setPlayitExecutablePath("");
    return { ok: true };
  });
  ipcMain.handle("host:playit-launch", async () => {
    const info = resolvePlayitInfo();
    if (!info.launchPath) {
      return { ok: false, error: "Configure a valid Playit executable path first." };
    }

    try {
      const child = spawn(info.launchPath, [], {
        detached: true,
        stdio: "ignore",
        windowsHide: true,
      });
      child.unref();
      return { ok: true, path: info.launchPath };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to launch Playit.",
      };
    }
  });

  await startServer();
});

app.on("before-quit", () => {
  intentionallyStopping = true;
  if (serverProcess?.pid) {
    stopServerProcessTree(serverProcess.pid);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
