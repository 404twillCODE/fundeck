const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hostDesktop", {
  getState: () => ipcRenderer.invoke("host:get-state"),
  startServer: () => ipcRenderer.invoke("host:start-server"),
  stopServer: () => ipcRenderer.invoke("host:stop-server"),
  openDashboard: (embedded = false) => ipcRenderer.invoke("host:open-dashboard", embedded),
  copyText: (text) => ipcRenderer.invoke("host:copy-text", text),
  onState: (handler) => {
    const wrapped = (_event, state) => handler(state);
    ipcRenderer.on("host:state", wrapped);
    return () => ipcRenderer.off("host:state", wrapped);
  },
  windowClose: () => ipcRenderer.send("window:close"),
  windowMinimize: () => ipcRenderer.send("window:minimize"),
  windowMaximize: () => ipcRenderer.send("window:maximize"),
  windowIsMaximized: () => ipcRenderer.invoke("window:is-maximized"),
});
