const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");

let win;

function createWindow() {
  // Cria a janela do navegador.
  win = new BrowserWindow({
    width: 600,
    height: 400,
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
}

app.whenReady().then(() => {
  createWindow();

  let statusTeste = "Online";
  setInterval(() => {
    if (win) {
      statusTeste = statusTeste === "Online" ? "Offline" : "Online";
      win.webContents.send("status-impressora", statusTeste);
    }
  }, 5000);
});

ipcMain.handle("ping", async () => {
  return "🏓 Pong! O processo Principal recebeu seu sinal.";
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
