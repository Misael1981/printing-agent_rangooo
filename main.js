const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { iniciarAgente, printerManager } = require("./src/server");

let win;

// 🖨️ Teste de impressão vindo da UI
ipcMain.handle("fazer-teste-impressao", async () => {
  console.log("🧪 Handle: teste de impressão solicitado");

  try {
    return await printerManager.testPrint();
  } catch (error) {
    return { success: false, error: error.message };
  }
});

function createWindow() {
  win = new BrowserWindow({
    width: 600,
    height: 500,
    autoHideMenuBar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  global.mainWindow = win;

  win.loadFile(path.join(__dirname, "src/views/index.html"));

  win.webContents.on("did-finish-load", () => {
    console.log("🪟 Janela carregada");

    iniciarAgente(win);
  });

  win.on("closed", () => {
    win = null;
  });
}

// 🏓 Ping de debug
ipcMain.handle("ping", async () => {
  return "🏓 Pong do processo principal";
});

// 🚪 Fechamento correto
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.whenReady().then(createWindow);

// 🍎 MacOS: recriar janela
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
