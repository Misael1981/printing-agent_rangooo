const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  verElectron: () => process.versions.electron,
  sendPing: () => ipcRenderer.invoke("ping"), // Criando a ponte para o Ping
  aoReceberStatus: (callback) => ipcRenderer.on("status-impressora", callback),
  executarTeste: () => ipcRenderer.invoke("fazer-teste-impressao"),
  receberLog: (callback) =>
    ipcRenderer.on("novo-log", (event, msg) => callback(msg)),
});
