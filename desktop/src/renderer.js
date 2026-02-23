const statusPill = document.getElementById("status-pill");
const lanUrlEl = document.getElementById("lan-url");
const logOutputEl = document.getElementById("log-output");
const startButton = document.getElementById("start-server");
const stopButton = document.getElementById("stop-server");
const openButton = document.getElementById("open-dashboard");
const copyLanButton = document.getElementById("copy-lan");
const cardStep2 = document.getElementById("card-step2");
const cardStep3 = document.getElementById("card-step3");
const errorBanner = document.getElementById("error-banner");

const STATUS_LABELS = {
  running: "Running",
  starting: "Starting…",
  stopping: "Stopping…",
  error: "Something went wrong",
  stopped: "Stopped",
};

function setCopyFeedback(btn, label) {
  const originalText = btn.textContent;
  btn.textContent = label;
  btn.classList.add("copied");
  setTimeout(() => {
    btn.textContent = originalText;
    btn.classList.remove("copied");
  }, 2000);
}

function render(state) {
  const status = state?.status || "stopped";
  const isRunning = status === "running";
  const isBusy = status === "starting" || status === "stopping";
  const err = state?.error || "";

  statusPill.textContent = STATUS_LABELS[status] || STATUS_LABELS.stopped;
  statusPill.className = "status-pill " + status;

  if (errorBanner) {
    errorBanner.hidden = !err;
    errorBanner.textContent = err;
  }

  if (isRunning && state?.lanUrl) {
    lanUrlEl.textContent = state.lanUrl;
    lanUrlEl.title = state.lanUrl;
  } else {
    lanUrlEl.textContent = "Start the server to get a link";
    lanUrlEl.title = "";
  }

  const logs = state?.logs?.length ? state.logs.join("\n") : "Start the server to see activity.";
  const errorLine = err ? "\n\n" + err : "";
  logOutputEl.textContent = logs + errorLine;
  logOutputEl.scrollTop = logOutputEl.scrollHeight;

  startButton.disabled = isRunning || isBusy;
  stopButton.disabled = !isRunning && status !== "starting";
  openButton.disabled = !isRunning;
  copyLanButton.disabled = !isRunning;

  cardStep2.classList.toggle("muted", !isRunning);
  cardStep3.classList.toggle("muted", !isRunning);
}

async function refreshState() {
  const nextState = await window.hostDesktop.getState();
  render(nextState);
}

// Title bar
document.getElementById("btn-minimize").addEventListener("click", () => window.hostDesktop.windowMinimize());
document.getElementById("btn-maximize").addEventListener("click", () => window.hostDesktop.windowMaximize());
document.getElementById("btn-close").addEventListener("click", () => window.hostDesktop.windowClose());

startButton.addEventListener("click", async () => {
  try {
    await window.hostDesktop.startServer();
  } catch (e) {
    console.error("Start server failed", e);
  }
  await refreshState();
});

stopButton.addEventListener("click", async () => {
  try {
    await window.hostDesktop.stopServer();
  } catch (e) {
    console.error("Stop server failed", e);
  }
  await refreshState();
});

openButton.addEventListener("click", () => {
  window.hostDesktop.openDashboard(false);
});

copyLanButton.addEventListener("click", () => {
  const url = lanUrlEl.textContent || "";
  if (!url || url === "Start the server to get a link") return;
  window.hostDesktop.copyText(url);
  setCopyFeedback(copyLanButton, "Copied!");
});

if (typeof window.hostDesktop === "undefined") {
  console.error("hostDesktop API not available. Preload may have failed.");
}

window.hostDesktop.onState((nextState) => {
  render(nextState);
});

refreshState();
