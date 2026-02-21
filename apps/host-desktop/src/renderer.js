const statusEl = document.getElementById("status");
const localUrlEl = document.getElementById("local-url");
const lanUrlEl = document.getElementById("lan-url");
const publicUrlEl = document.getElementById("public-url");
const logOutputEl = document.getElementById("log-output");
const playitConfiguredEl = document.getElementById("playit-configured");
const playitDetectedEl = document.getElementById("playit-detected");
const playitMessageEl = document.getElementById("playit-message");

const startButton = document.getElementById("start-server");
const stopButton = document.getElementById("stop-server");
const openButton = document.getElementById("open-dashboard");
const openEmbeddedButton = document.getElementById("open-embedded");
const copyLocalButton = document.getElementById("copy-local");
const copyLanButton = document.getElementById("copy-lan");
const copyPublicButton = document.getElementById("copy-public");
const playitSetupButton = document.getElementById("playit-setup");
const playitPickButton = document.getElementById("playit-pick");
const playitLaunchButton = document.getElementById("playit-launch");
const playitClearButton = document.getElementById("playit-clear");

let playitStatusMessage = "";

function statusText(status) {
  switch (status) {
    case "running":
      return "Running";
    case "starting":
      return "Starting";
    case "stopping":
      return "Stopping";
    case "error":
      return "Error";
    default:
      return "Stopped";
  }
}

function render(state) {
  const status = state?.status || "stopped";
  statusEl.textContent = `Status: ${statusText(status)}`;
  statusEl.className = `status ${status}`;

  const localUrl = state?.localUrl || "-";
  const lanUrl = state?.lanUrl || "-";
  const publicUrl = state?.publicUrl || "-";
  const playitConfiguredPath = state?.playitConfiguredPath || "";
  const playitDetectedFolder = state?.playitDetectedFolder || "";
  const playitLaunchReady = Boolean(state?.playitLaunchReady);
  localUrlEl.textContent = localUrl;
  lanUrlEl.textContent = lanUrl;
  publicUrlEl.textContent = publicUrl;
  playitConfiguredEl.textContent = playitConfiguredPath || "Not configured";
  playitDetectedEl.textContent = playitDetectedFolder || "Not detected";
  playitMessageEl.textContent = playitStatusMessage;

  const logs = state?.logs?.length
    ? state.logs.join("\n")
    : "Waiting for logs...";
  const errorLine = state?.error ? `\n[error] ${state.error}` : "";
  logOutputEl.textContent = `${logs}${errorLine}`;
  logOutputEl.scrollTop = logOutputEl.scrollHeight;

  const isRunning = status === "running";
  const isTransition = status === "starting" || status === "stopping";
  startButton.disabled = isRunning || isTransition;
  stopButton.disabled = !isRunning && status !== "starting";
  openButton.disabled = !isRunning;
  openEmbeddedButton.disabled = !isRunning;
  copyLocalButton.disabled = localUrl === "-";
  copyLanButton.disabled = lanUrl === "-";
  copyPublicButton.disabled = publicUrl === "-";
  playitLaunchButton.disabled = !playitLaunchReady;
  playitClearButton.disabled = !playitConfiguredPath;
}

async function refreshState() {
  const nextState = await window.hostDesktop.getState();
  render(nextState);
}

startButton.addEventListener("click", async () => {
  await window.hostDesktop.startServer();
  await refreshState();
});

stopButton.addEventListener("click", async () => {
  await window.hostDesktop.stopServer();
  await refreshState();
});

openButton.addEventListener("click", async () => {
  await window.hostDesktop.openDashboard(false);
});

openEmbeddedButton.addEventListener("click", async () => {
  await window.hostDesktop.openDashboard(true);
});

copyLocalButton.addEventListener("click", async () => {
  await window.hostDesktop.copyText(localUrlEl.textContent || "");
});

copyLanButton.addEventListener("click", async () => {
  await window.hostDesktop.copyText(lanUrlEl.textContent || "");
});

copyPublicButton.addEventListener("click", async () => {
  await window.hostDesktop.copyText(publicUrlEl.textContent || "");
});

playitSetupButton.addEventListener("click", async () => {
  const result = await window.hostDesktop.openPlayitSetup();
  if (result?.mode === "folder") {
    playitStatusMessage = "Opened local Playit folder.";
  } else {
    playitStatusMessage = "Opened Playit download page in browser.";
  }
  await refreshState();
});

playitPickButton.addEventListener("click", async () => {
  const result = await window.hostDesktop.pickPlayitExecutable();
  if (result?.canceled) {
    playitStatusMessage = "Playit executable selection canceled.";
  } else if (result?.path) {
    playitStatusMessage = `Configured Playit executable: ${result.path}`;
  } else {
    playitStatusMessage = "Unable to configure Playit executable.";
  }
  await refreshState();
});

playitLaunchButton.addEventListener("click", async () => {
  const result = await window.hostDesktop.launchPlayit();
  if (result?.ok) {
    playitStatusMessage = "Playit launched.";
  } else {
    playitStatusMessage = result?.error || "Failed to launch Playit.";
  }
  await refreshState();
});

playitClearButton.addEventListener("click", async () => {
  await window.hostDesktop.clearPlayitExecutable();
  playitStatusMessage = "Cleared configured Playit executable path.";
  await refreshState();
});

window.hostDesktop.onState((nextState) => {
  render(nextState);
});

refreshState();
