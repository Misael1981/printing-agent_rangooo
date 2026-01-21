const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Invoke
  sendPing: () => ipcRenderer.invoke("ping"),
  executarTeste: () => ipcRenderer.invoke("fazer-teste-impressao"),

  // Eventos
  aoReceberStatus: (callback) =>
    ipcRenderer.on("status-impressora", (_, status) => callback(status)),

  aoReceberStatusWS: (callback) =>
    ipcRenderer.on("status-websocket", (_, status) => callback(status)),

  receberLog: (callback) =>
    ipcRenderer.on("novo-log", (_, msg) => callback(msg)),

  // Tela Config
  getRestaurantId: () => ipcRenderer.invoke("get-restaurant-id"),
  saveRestaurantId: (id) => ipcRenderer.invoke("save-restaurant-id", id),

  // Versão do app
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // Impressoras
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  refreshPrinters: () => ipcRenderer.invoke("refresh-printers"),
  getPrinterStatus: () => ipcRenderer.invoke("get-printer-status"),
  testarImpressora: () => ipcRenderer.invoke("fazer-teste-impressao"),
  salvarImpressora: (ip) => ipcRenderer.invoke("salvar-impressora", ip),
  simularPedido: () => ipcRenderer.invoke("simular-pedido"),
});
