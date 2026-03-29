const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nexaDesktop", {
  getInfo: () => ipcRenderer.invoke("desktop:get-info")
});
