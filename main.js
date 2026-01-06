const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const { iniciarAgente, printerManager } = require("./src/server");
const fs = require("fs");
const AutoLaunch = require("auto-launch");
const Store = require("electron-store");
const { autoUpdater } = require("electron-updater");

const store = new Store();
const isDev = !app.isPackaged;

// ================================
// 🔐 Configuração segura do .env
// ================================

let envPath;

if (isDev) {
  envPath = path.join(__dirname, ".env");
  console.log("🧪 DEV: lendo .env local:", envPath);
} else {
  const userDataPath = app.getPath("userData");
  envPath = path.join(userDataPath, ".env");

  // Se não existir .env no userData, copia do resources
  if (!fs.existsSync(envPath)) {
    const bundledEnvPath = path.join(process.resourcesPath, ".env");

    if (fs.existsSync(bundledEnvPath)) {
      fs.copyFileSync(bundledEnvPath, envPath);
      console.log("📦 .env copiado para userData");
    } else {
      console.warn("⚠️ .env não encontrado em resources");
    }
  }

  console.log("🔐 PROD: lendo .env de:", envPath);
}

// Carrega o env definitivo
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
} else {
  console.warn("⚠️ Nenhum .env carregado");
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

// Telinha de config
ipcMain.handle("get-restaurant-id", () => store.get("restaurantId"));
ipcMain.handle("save-restaurant-id", (event, id) => {
  store.set("restaurantId", id);
  return { success: true };
});

function createWindow() {
  win = new BrowserWindow({
    width: 650,
    height: 680,
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

  //win.webContents.openDevTools({ mode: "detach" });

  if (!process.argv.includes("--hidden")) {
    win.show();
  }

  global.mainWindow = win;

  win.loadFile(path.join(__dirname, "src/views/index.html"));

  function iniciarAgenteSeConfigurado(win) {
    const restaurantId = store.get("restaurantId");

    if (!restaurantId) {
      console.log("⚠️ Restaurante não configurado ainda");
      return;
    }

    console.log("🚀 Iniciando agente para:", restaurantId);

    iniciarAgente({
      win,
      restaurantId,
    });
  }

  win.webContents.on("did-finish-load", () => {
    console.log("🪟 Janela carregada");

    iniciarAgenteSeConfigurado(win);
  });

  win.on("closed", () => {
    win = null;
  });
}

// 🏓 Ping de debug
ipcMain.handle("ping", async () => {
  return "🏓 Pong do processo principal";
});

// Versão do app
ipcMain.handle("get-app-version", () => {
  return app.getVersion();
});

// Listar Impressoras

ipcMain.handle("listar-impressoras", async () => {
  const win = global.mainWindow;
  if (!win) return [];
  return win.webContents.getPrintersAsync();
});

ipcMain.handle("salvar-impressora", async (_, printerName) => {
  store.set("printerName", printerName);
  console.log("🖨️ Impressora salva:", printerName);
  return { success: true };
});

ipcMain.handle("get-impressora-salva", async () => {
  return store.get("printerName") || null;
});

// 🖨️ Teste de impressão vindo da UI
ipcMain.handle("fazer-teste-impressao", async () => {
  const win = global.mainWindow;

  if (!win) {
    return { success: false, error: "Janela principal não encontrada" };
  }

  win.webContents.print({
    silent: false,
    printBackground: true,
  });

  return { success: true };
});

ipcMain.handle("imprimir-com-impressora-salva", async () => {
  const win = global.mainWindow;
  const printerName = store.get("printerName");

  if (!win || !printerName) {
    console.warn("⚠️ Impressão cancelada: janela ou impressora inexistente");
    return { success: false };
  }

  win.webContents.print({
    silent: true,
    deviceName: printerName,
    printBackground: true,
  });

  return { success: true };
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

// Quando o app estiver pronto, checa se tem atualização
app.on("ready", () => {
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

console.log("🔎 Store agora:", store.store);

// Opcional: Avisar o usuário pelo log quando estiver baixando
autoUpdater.on("update-available", () => {
  console.log("Mano, tem versão nova! Baixando...");
});

autoUpdater.on("update-downloaded", () => {
  console.log("⬆️ Atualização disponível");
});
