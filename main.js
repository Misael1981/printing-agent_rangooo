const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { iniciarAgente, printerManager } = require("./src/server");
const fs = require("fs");
const AutoLaunch = require("auto-launch");

// Descobre se o app está rodando instalado ou em desenvolvimento
const isDev = !app.isPackaged;

const envPath = isDev
  ? path.join(__dirname, ".env") // Em desenvolvimento, usa a pasta atual
  : path.join(process.resourcesPath, ".env"); // Instalado, usa a pasta de recursos do Windows

if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
}

// Configuração do Auto-Launch
const rangoooAutoLauncher = new AutoLaunch({
  name: "Agente de Impressao Rangooo",
  path: process.execPath,
  extraArgs: ["--hidden"],
});

// Não ativa se tiver em modo de desenvolvimento
if (!app.isPackaged) {
  console.log("🚀 Auto-launch ignorado em modo DEV");
} else {
  rangoooAutoLauncher
    .isEnabled()
    .then((isEnabled) => {
      if (!isEnabled) {
        rangoooAutoLauncher.enable();
        console.log("✅ Auto-launch ativado com sucesso");
      }
    })
    .catch((err) => {
      console.error("❌ Erro ao configurar Auto-launch:", err);
    });
}

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
    icon: path.join(__dirname, "assets/logo.ico"),
    autoHideMenuBar: true,
    show: false,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!process.argv.includes("--hidden")) {
    win.show();
  }

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
