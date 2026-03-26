const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nexusDesktop", {
  getInfo: () => ipcRenderer.invoke("desktop:get-info")
});
