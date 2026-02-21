const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hostDesktop", {
  getState: () => ipcRenderer.invoke("host:get-state"),
  startServer: () => ipcRenderer.invoke("host:start-server"),
  stopServer: () => ipcRenderer.invoke("host:stop-server"),
  openDashboard: (embedded = false) =>
    ipcRenderer.invoke("host:open-dashboard", embedded),
  copyText: (text) => ipcRenderer.invoke("host:copy-text", text),
  openPlayitSetup: () => ipcRenderer.invoke("host:playit-open-setup"),
  pickPlayitExecutable: () => ipcRenderer.invoke("host:playit-pick-executable"),
  clearPlayitExecutable: () => ipcRenderer.invoke("host:playit-clear-executable"),
  launchPlayit: () => ipcRenderer.invoke("host:playit-launch"),
  onState: (handler) => {
    const wrapped = (_event, state) => handler(state);
    ipcRenderer.on("host:state", wrapped);
    return () => ipcRenderer.off("host:state", wrapped);
  },
});
