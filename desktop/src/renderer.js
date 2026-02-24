const statusPill = document.getElementById("status-pill");
const lanUrlEl = document.getElementById("lan-url");
const logOutputEl = document.getElementById("log-output");
const consoleInputEl = document.getElementById("console-input");
const startButton = document.getElementById("start-server");
const stopButton = document.getElementById("stop-server");
const openButton = document.getElementById("open-dashboard");
const copyLanButton = document.getElementById("copy-lan");
const cardStep2 = document.getElementById("card-step2");
const cardStep3 = document.getElementById("card-step3");
const qrPanel = document.getElementById("qr-panel");
const qrInner = document.getElementById("qr-inner");
const qrCaption = document.getElementById("qr-caption");
const qrImage = document.getElementById("qr-image");
const errorBanner = document.getElementById("error-banner");
const btnLocal = document.getElementById("btn-local");
const btnLan = document.getElementById("btn-lan");
const btnExternalJoin = document.getElementById("btn-external-join");
const btnTestServer = document.getElementById("btn-test-server");
const setupView = document.getElementById("setup-view");

let lastTestOk = null;
const mainView = document.getElementById("main-view");
const setupMessage = document.getElementById("setup-message");
const setupLog = document.getElementById("setup-log");
const runSetupBtn = document.getElementById("run-setup-btn");

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
  if (consoleInputEl && document.activeElement !== consoleInputEl) {
    consoleInputEl.placeholder = isRunning ? "Type a command (e.g. clear)..." : "Start the server to use the console.";
  }

  let qrUrl = state?.externalUrl || (isRunning && state?.lanUrl ? state.lanUrl : "");
  if (qrUrl && !/^https?:\/\//i.test(qrUrl)) {
    qrUrl = "https://" + qrUrl.replace(/^\s*\/+/, "");
  }
  if (qrInner) qrInner.hidden = !qrUrl;
  if (qrImage) {
    if (qrUrl) {
      qrImage.hidden = false;
      qrImage.src = "https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=" + encodeURIComponent(qrUrl);
    } else {
      qrImage.hidden = true;
      qrImage.removeAttribute("src");
    }
  }
  if (qrCaption) {
    if (qrUrl) {
      qrCaption.hidden = false;
      qrCaption.textContent = "Scan the QR code to join the games.";
    } else {
      qrCaption.hidden = true;
      qrCaption.textContent = "";
    }
  }

  const externalUrlInput = document.getElementById("external-url-input");
  if (externalUrlInput && document.activeElement !== externalUrlInput) {
    externalUrlInput.value = state?.externalUrl || "";
  }

  if (btnExternalJoin) {
    btnExternalJoin.hidden = !state?.externalUrl;
    if (!btnExternalJoin.hidden) btnExternalJoin.disabled = !isRunning;
  }

  startButton.disabled = isRunning || isBusy;
  stopButton.disabled = !isRunning && status !== "starting";
  openButton.disabled = !isRunning;
  copyLanButton.disabled = !isRunning;
  if (btnLocal) btnLocal.disabled = !isRunning;
  if (btnLan) btnLan.disabled = !isRunning;

  if (btnTestServer) {
    if (isRunning && lastTestOk === null) lastTestOk = true;
    if (!isRunning) lastTestOk = false;
    btnTestServer.classList.remove("btn-test-ok", "btn-test-fail");
    if (lastTestOk === true) btnTestServer.classList.add("btn-test-ok");
    else if (lastTestOk === false) btnTestServer.classList.add("btn-test-fail");
  }

  cardStep2.classList.toggle("muted", !isRunning);
  cardStep3.classList.toggle("muted", !isRunning);
  if (qrPanel) qrPanel.classList.toggle("muted", !qrUrl);
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
  // Open the host admin dashboard inside the FunDeck desktop app
  window.hostDesktop.openDashboard(true);
});

copyLanButton.addEventListener("click", () => {
  const url = lanUrlEl.textContent || "";
  if (!url || url === "Start the server to get a link") return;
  window.hostDesktop.copyText(url);
  setCopyFeedback(copyLanButton, "Copied!");
});

btnLocal.addEventListener("click", async () => {
  const state = await window.hostDesktop.getState();
  const url = state?.localUrl || "";
  if (!url) return;
  window.hostDesktop.openUrl(url);
});

btnLan.addEventListener("click", async () => {
  const state = await window.hostDesktop.getState();
  const lanUrl = state?.lanUrl || "";
  if (!lanUrl) return;
  try {
    const host = new URL(lanUrl).hostname;
    window.hostDesktop.copyText(host);
    setCopyFeedback(btnLan, "Copied!");
  } catch (e) {
    window.hostDesktop.copyText(lanUrl);
    setCopyFeedback(btnLan, "Copied!");
  }
});

btnExternalJoin.addEventListener("click", async () => {
  const state = await window.hostDesktop.getState();
  const base = state?.externalUrl || state?.lanUrl || state?.localUrl || "";
  if (!base) return;
  const joinUrl = base.replace(/\/$/, "") + "/join";
  window.hostDesktop.copyText(joinUrl);
  setCopyFeedback(btnExternalJoin, "Copied!");
});

const externalUrlInput = document.getElementById("external-url-input");
const externalUrlSaveBtn = document.getElementById("external-url-save");
if (externalUrlInput && externalUrlSaveBtn) {
  externalUrlSaveBtn.addEventListener("click", async () => {
    const url = externalUrlInput.value.trim();
    await window.hostDesktop.setExternalUrl(url);
    setCopyFeedback(externalUrlSaveBtn, "Saved!");
  });
  externalUrlInput.addEventListener("blur", async () => {
    const url = externalUrlInput.value.trim();
    await window.hostDesktop.setExternalUrl(url);
  });
}

document.querySelectorAll(".setup-instructions a[href]").forEach((a) => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    window.hostDesktop.openUrl(a.href);
  });
});

btnTestServer.addEventListener("click", async () => {
  try {
    const result = await window.hostDesktop.checkServer();
    lastTestOk = result?.ok ?? false;
  } catch (e) {
    lastTestOk = false;
  }
  await refreshState();
});

consoleInputEl.addEventListener("keydown", async (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const line = (consoleInputEl.value || "").trim();
  if (!line) return;
  consoleInputEl.value = "";
  try {
    await window.hostDesktop.sendConsoleInput(line);
  } catch (err) {
    console.error("Console input failed", err);
  }
  await refreshState();
});

if (typeof window.hostDesktop === "undefined") {
  console.error("hostDesktop API not available. Preload may have failed.");
}

function showSetupView(message) {
  setupView.classList.add("active");
  setupView.setAttribute("aria-hidden", "false");
  mainView.classList.add("hidden");
  if (setupMessage) setupMessage.textContent = message || "Run setup to install dependencies and build the join-website. This may take a few minutes. You need Node.js installed.";
  if (setupLog) setupLog.textContent = "";
  if (runSetupBtn) {
    runSetupBtn.disabled = false;
    runSetupBtn.textContent = "Run setup";
    const isReinstall = message && message.toLowerCase().includes("reinstall");
    runSetupBtn.style.display = isReinstall ? "none" : "";
  }
}

function showMainView() {
  setupView.classList.remove("active");
  setupView.setAttribute("aria-hidden", "true");
  mainView.classList.remove("hidden");
}

async function initView() {
  const status = await window.hostDesktop.getSetupStatus();
  if (status.setupNeeded) {
    showSetupView(status.message);
    return;
  }
  showMainView();
  await refreshState();
}

runSetupBtn.addEventListener("click", async () => {
  if (!runSetupBtn || runSetupBtn.disabled) return;
  runSetupBtn.disabled = true;
  runSetupBtn.textContent = "Running…";
  if (setupLog) setupLog.textContent = "";
  await window.hostDesktop.runSetup();
});

window.hostDesktop.onSetupLog((line) => {
  if (setupLog) {
    setupLog.textContent += (setupLog.textContent ? "\n" : "") + line;
    setupLog.scrollTop = setupLog.scrollHeight;
  }
});

window.hostDesktop.onSetupComplete(async (result) => {
  if (runSetupBtn) {
    runSetupBtn.disabled = false;
    runSetupBtn.textContent = "Run setup";
  }
  if (result.success) {
    const status = await window.hostDesktop.getSetupStatus();
    if (!status.setupNeeded) {
      showMainView();
      try {
        await window.hostDesktop.startServer();
      } catch (e) {
        console.error("Start server failed", e);
      }
      await refreshState();
    }
  }
});

window.hostDesktop.onState((nextState) => {
  render(nextState);
});

initView();
