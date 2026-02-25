const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hostDesktop", {
  getState: () => ipcRenderer.invoke("host:get-state"),
  getSetupStatus: () => ipcRenderer.invoke("host:get-setup-status"),
  runSetup: () => ipcRenderer.invoke("host:run-setup"),
  checkServer: () => ipcRenderer.invoke("host:check-server"),
  sendConsoleInput: (line) => ipcRenderer.invoke("host:console-input", line),
  startServer: () => ipcRenderer.invoke("host:start-server"),
  stopServer: () => ipcRenderer.invoke("host:stop-server"),
  copyText: (text) => ipcRenderer.invoke("host:copy-text", text),
  openUrl: (url) => ipcRenderer.invoke("host:open-url", url),
  setExternalUrl: (url) => ipcRenderer.invoke("host:set-external-url", url),

  hostApi: (method, path, body) => ipcRenderer.invoke("host:api", method, path, body),

  onState: (handler) => {
    const wrapped = (_event, state) => handler(state);
    ipcRenderer.on("host:state", wrapped);
    return () => ipcRenderer.off("host:state", wrapped);
  },
  onSetupLog: (handler) => {
    const wrapped = (_event, line) => handler(line);
    ipcRenderer.on("host:setup-log", wrapped);
    return () => ipcRenderer.off("host:setup-log", wrapped);
  },
  onSetupComplete: (handler) => {
    const wrapped = (_event, result) => handler(result);
    ipcRenderer.on("host:setup-complete", wrapped);
    return () => ipcRenderer.off("host:setup-complete", wrapped);
  },
  windowClose: () => ipcRenderer.send("window:close"),
  windowMinimize: () => ipcRenderer.send("window:minimize"),
  windowMaximize: () => ipcRenderer.send("window:maximize"),
  windowIsMaximized: () => ipcRenderer.invoke("window:is-maximized"),
});
