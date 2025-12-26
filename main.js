const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { iniciarAgente, printerManager } = require("./src/server");

let win;

ipcMain.handle("fazer-teste-impressao", async () => {
  console.log("Handle: Solicitando teste de impressão...");
  try {
    const resultado = await printerManager.testPrint();
    return resultado;
  } catch (error) {
    return { success: false, error: error.message };
  }
});

function createWindow() {
  win = new BrowserWindow({
    width: 600,
    height: 500,
    autoHideMenuBar: true,
    // frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  global.mainWindow = win;

  win.loadFile("./src/views/index.html");

  win.webContents.on("did-finish-load", () => {
    console.log("Página carregada! 🚀");
    win.webContents.send("novo-log", "📡 Sistema Rangooo pronto para operar!");
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
