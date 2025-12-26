const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { iniciarAgente } = require("./src/server");

let win;

function createWindow() {
  // Cria a janela do navegador.
  win = new BrowserWindow({
    width: 600,
    height: 500,
    // autoHideMenuBar: true,
    //frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile("./src/views/index.html");

  win.webContents.on("did-finish-load", () => {
    console.log("Página carregada, iniciando envios de status...");
  });

  // Assim que a janela estiver pronta, liga o motor do agente!
  win.webContents.on("did-finish-load", () => {
    console.log("Página carregada! 🚀");
    iniciarAgente(win); // Liga o motor do agente aqui dentro
  });
}

ipcMain.handle("ping", async () => {
  return "🏓 Pong! O processo Principal recebeu seu sinal.";
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.whenReady().then(() => {
  createWindow();
});
