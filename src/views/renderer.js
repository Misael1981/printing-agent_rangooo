/* renderer.js — refatorado: separa responsabilidades (status, logs, impressoras, configurações, init) */

// ----- Elementos do DOM -----
const els = {
  badge: document.getElementById("status-badge"),
  badgeServer: document.getElementById("status-server"),
  log: document.getElementById("log"),
  mainScreen: document.getElementById("main-screen"),
  configScreen: document.getElementById("config-screen"),
  inputId: document.getElementById("restaurant-id-input"),
  btnSalvar: document.getElementById("btn-salvar-config"),
  btnSettings: document.querySelector(".settings"),
  versao: document.getElementById("versao-electron"),
  customWrapper: document.getElementById("custom-printer-wrapper"),
  customInput: document.getElementById("custom-printer-input"),
  feedback: document.getElementById("printer-feedback"),
  printerSelect: document.getElementById("printer-select"),
  savePrinterBtn: document.getElementById("save-printer"),
  printTestBtn: document.getElementById("print-test"),
  printSavedBtn: document.getElementById("print-saved"),
};

// ----- Logger -----
function addLog(message) {
  if (!els.log) return;
  const now = new Date();
  const time = now.toLocaleTimeString("pt-BR");
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-message"> ${message}</span>`;
  els.log.appendChild(entry);
  els.log.scrollTop = els.log.scrollHeight;
}

// Recebe logs do main process
window.api.receberLog((msg) => addLog(msg));

// ----- Status (badges) -----
function setupStatusListeners() {
  window.api.aoReceberStatus((status) => {
    console.log("STATUS:", status);
    if (!els.badge) return;
    els.badge.textContent = status;
    if (status === "Online") {
      els.badge.classList.remove("badge-secondary");
      els.badge.classList.add("badge-success");
    } else {
      els.badge.classList.remove("badge-success");
      els.badge.classList.add("badge-secondary");
    }
  });

  window.api.aoReceberStatusWS((status) => {
    console.log("🌐 STATUS WS:", status);
    if (!els.badgeServer) return;
    if (status === "conectado") {
      els.badgeServer.textContent = "Conectado";
      els.badgeServer.style.backgroundColor = "#2ecc71";
      addLog("🌐 Conectado ao servidor");
    } else {
      els.badgeServer.textContent = "Desconectado";
      els.badgeServer.style.backgroundColor = "#e74c3c";
      addLog("🚫 Servidor desconectado");
    }
  });
}

// ----- Impressoras -----
async function carregarImpressoras() {
  if (!els.printerSelect) return;
  try {
    const printers = await window.api.listarImpressoras();
    els.printerSelect.innerHTML = "";

    printers.forEach((p) => {
      const option = document.createElement("option");
      option.value = p.name;
      option.textContent = p.name;
      els.printerSelect.appendChild(option);
    });

    const customOption = document.createElement("option");
    customOption.value = "__custom__";
    customOption.textContent = "Outra impressora...";
    els.printerSelect.appendChild(customOption);
  } catch (err) {
    if (els.feedback)
      els.feedback.textContent = "❌ Erro ao listar impressoras.";
    console.error(err);
  }
}

function bindPrinterEvents() {
  if (!els.printerSelect) return;

  els.printerSelect.addEventListener("change", () => {
    if (els.printerSelect.value === "__custom__") {
      if (els.customWrapper) els.customWrapper.style.display = "block";
    } else {
      if (els.customWrapper) els.customWrapper.style.display = "none";
    }
  });

  if (els.savePrinterBtn) {
    els.savePrinterBtn.addEventListener("click", async () => {
      let printerName = els.printerSelect.value;
      if (printerName === "__custom__")
        printerName = ((els.customInput && els.customInput.value) || "").trim();
      if (!printerName) {
        if (els.feedback)
          els.feedback.textContent = "❌ Selecione uma impressora válida.";
        return;
      }

      try {
        await window.api.salvarImpressora(printerName);
        if (els.feedback)
          els.feedback.textContent = `✅ Impressora "${printerName}" salva com sucesso.`;
        addLog(`✅ Impressora "${printerName}" salva.`);
      } catch (err) {
        if (els.feedback)
          els.feedback.textContent = `❌ Erro ao salvar impressora.`;
        addLog(`❌ Erro ao salvar impressora: ${err.message || err}`);
      }
    });
  }

  if (els.printTestBtn) {
    els.printTestBtn.addEventListener("click", async () => {
      if (els.feedback) els.feedback.textContent = "🧪 Testando impressão...";
      addLog("🧪 Iniciando teste de impressora...");

      try {
        const result = await window.api.testarImpressora();
        if (result && result.success) {
          addLog("✅ Teste enviado para a impressora!");
          if (els.feedback)
            els.feedback.textContent = "✅ Teste enviado com sucesso.";
        } else {
          const errMsg = (result && result.error) || "Falha desconhecida";
          addLog(`❌ Falha no teste: ${errMsg}`);
          if (els.feedback)
            els.feedback.textContent = `❌ Falha no teste: ${errMsg}`;
        }
      } catch (err) {
        addLog(`💥 Erro fatal: ${err.message || err}`);
        if (els.feedback) els.feedback.textContent = "❌ Erro inesperado.";
      }
    });
  }
}

// ----- Configurações / Settings -----
function bindSettingsEvents() {
  if (els.btnSettings) {
    els.btnSettings.addEventListener("click", async () => {
      if (els.mainScreen) els.mainScreen.style.display = "none";
      if (els.configScreen) els.configScreen.style.display = "block";
      const id = await window.api.getRestaurantId();
      if (els.inputId) els.inputId.value = id || "";
    });
  }

  if (els.btnSalvar) {
    els.btnSalvar.addEventListener("click", async () => {
      const id = ((els.inputId && els.inputId.value) || "").trim();
      if (!id) return;
      try {
        await window.api.saveRestaurantId(id);
        addLog(`🔑 ID salvo: ${id}`);
        // após salvar, inicia agente
        iniciarAgente(id);
        if (els.configScreen) els.configScreen.style.display = "none";
        if (els.mainScreen) els.mainScreen.style.display = "block";
      } catch (err) {
        addLog(`❌ Erro ao salvar ID: ${err.message || err}`);
      }
    });
  }
}

// ----- Agente (início) -----
async function iniciarAgente(restaurantId) {
  addLog(`🔑 Iniciando agente com ID: ${restaurantId}...`);
  // Aqui pode iniciar outras rotinas (conexão WS, sincronização, etc.)
}

// ----- Inicialização -----
async function init() {
  setupStatusListeners();
  bindSettingsEvents();
  bindPrinterEvents();
  await carregarImpressoras();

  const idSalvo = await window.api.getRestaurantId();
  if (!idSalvo) {
    if (els.mainScreen) els.mainScreen.style.display = "none";
    if (els.configScreen) els.configScreen.style.display = "block";
  } else {
    iniciarAgente(idSalvo);
  }

  const versao = await window.api.getAppVersion();
  if (els.versao) els.versao.innerText = `v${versao}`;
}

window.addEventListener("DOMContentLoaded", init);
