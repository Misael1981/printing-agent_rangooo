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
  refreshPrintersBtn: document.getElementById("refresh-printers"),
  savePrinterBtn: document.getElementById("save-printer"),
  printTestBtn: document.getElementById("print-test"),
  simulateOrderBtn: document.getElementById("simulate-order"),
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

    // Remover todas as classes de status
    els.badge.classList.remove(
      "badge-secondary",
      "badge-success",
      "badge-warning",
      "badge-danger",
      "badge-info",
    );

    // Aplicar classe baseada no status
    if (
      status.includes("🟢") ||
      status.includes("Pronta") ||
      status.includes("Conectada")
    ) {
      els.badge.classList.add("badge-success");
    } else if (status.includes("🟡") || status.includes("Fallback")) {
      els.badge.classList.add("badge-warning");
    } else if (status.includes("🔴") || status.includes("Erro")) {
      els.badge.classList.add("badge-danger");
    } else if (status.includes("🖨️") || status.includes("Imprimindo")) {
      els.badge.classList.add("badge-info");
    } else if (status.includes("⚪") || status.includes("Não configurada")) {
      els.badge.classList.add("badge-secondary");
    } else {
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
async function carregarImpressoras(forceRefresh = false) {
  if (!els.printerSelect) return;

  try {
    // Mostra loading
    els.printerSelect.innerHTML =
      '<option value="">🔍 Buscando impressoras...</option>';
    if (els.refreshPrintersBtn) els.refreshPrintersBtn.disabled = true;

    // Busca impressoras (do cache ou força refresh)
    const printers = forceRefresh
      ? await window.api.refreshPrinters()
      : await window.api.getPrinters();

    els.printerSelect.innerHTML = "";

    if (printers.length === 0) {
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "Nenhuma impressora encontrada";
      els.printerSelect.appendChild(emptyOption);
    } else {
      printers.forEach((p) => {
        const option = document.createElement("option");
        option.value = p.ip;
        option.textContent = `${p.label || p.ip}`;
        els.printerSelect.appendChild(option);
      });
      addLog(`📋 ${printers.length} impressora(s) encontrada(s)`);
    }

    // Opção para IP manual
    const customOption = document.createElement("option");
    customOption.value = "__custom__";
    customOption.textContent = "➕ Inserir IP manualmente...";
    els.printerSelect.appendChild(customOption);
  } catch (err) {
    els.printerSelect.innerHTML = '<option value="">❌ Erro ao buscar</option>';
    if (els.feedback)
      els.feedback.textContent = "❌ Erro ao listar impressoras.";
    console.error(err);
  } finally {
    if (els.refreshPrintersBtn) els.refreshPrintersBtn.disabled = false;
  }
}

function bindPrinterEvents() {
  if (!els.printerSelect) return;

  // Botão de refresh
  if (els.refreshPrintersBtn) {
    els.refreshPrintersBtn.addEventListener("click", async () => {
      addLog("🔄 Buscando impressoras na rede...");
      await carregarImpressoras(true);
    });
  }

  // Mostrar/ocultar campo de IP manual
  els.printerSelect.addEventListener("change", () => {
    if (els.printerSelect.value === "__custom__") {
      if (els.customWrapper) els.customWrapper.style.display = "block";
    } else {
      if (els.customWrapper) els.customWrapper.style.display = "none";
    }
  });

  // Salvar impressora
  if (els.savePrinterBtn) {
    els.savePrinterBtn.addEventListener("click", async () => {
      let printerIP = els.printerSelect.value;

      if (printerIP === "__custom__") {
        printerIP = ((els.customInput && els.customInput.value) || "").trim();
      }

      if (!printerIP) {
        if (els.feedback) {
          els.feedback.textContent = "❌ Selecione uma impressora válida.";
          els.feedback.style.color = "#e74c3c";
        }
        return;
      }

      try {
        if (els.feedback) {
          els.feedback.textContent = "🔄 Conectando...";
          els.feedback.style.color = "#3498db";
        }

        const isConnected = await window.api.salvarImpressora(printerIP);
        if (isConnected) {
          if (els.feedback) {
            els.feedback.textContent = "✅ Impressora conectada e salva.";
            els.feedback.style.color = "#2ecc71";
          }
          addLog(`✅ Impressora salva: ${printerIP}`);
        } else {
          if (els.feedback) {
            els.feedback.textContent = "❌ Falha ao conectar.";
            els.feedback.style.color = "#e74c3c";
          }
          addLog(`❌ Falha ao conectar à impressora: ${printerIP}`);
        }
      } catch (err) {
        if (els.feedback) {
          els.feedback.textContent = `❌ Erro ao conectar.`;
          els.feedback.style.color = "#e74c3c";
        }
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

  if (els.simulateOrderBtn) {
    els.simulateOrderBtn.addEventListener("click", async () => {
      if (els.feedback) {
        els.feedback.textContent = "🧪 Simulando pedido...";
        els.feedback.style.color = "#3498db";
      }
      addLog("🧪 Iniciando simulação de pedido...");

      try {
        const result = await window.api.simularPedido();
        if (result && result.success) {
          addLog(
            `✅ Pedido simulado impresso${
              result.simulated ? " (modo simulação)" : ""
            }!`,
          );
          if (els.feedback) {
            els.feedback.textContent = `✅ Pedido simulado impresso${
              result.simulated ? " (modo simulação)" : ""
            }!`;
            els.feedback.style.color = "#2ecc71";
          }
        } else {
          const errMsg = (result && result.error) || "Falha desconhecida";
          addLog(`❌ Falha ao simular: ${errMsg}`);
          if (els.feedback) {
            els.feedback.textContent = `❌ Falha: ${errMsg}`;
            els.feedback.style.color = "#e74c3c";
          }
        }
      } catch (err) {
        addLog(`💥 Erro ao simular pedido: ${err.message || err}`);
        if (els.feedback) {
          els.feedback.textContent = "❌ Erro inesperado.";
          els.feedback.style.color = "#e74c3c";
        }
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
