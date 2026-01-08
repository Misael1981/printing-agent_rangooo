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

  listarImpressoras: () => ipcRenderer.invoke("listar-impressoras"),
  testarImpressora: () => ipcRenderer.invoke("fazer-teste-impressao"),
  salvarImpressora: (name) => ipcRenderer.invoke("salvar-impressora", name),
  getImpressoraSalva: () => ipcRenderer.invoke("get-impressora-salva"),
  imprimirComImpressoraSalva: () =>
    ipcRenderer.invoke("imprimir-com-impressora-salva"),
});
