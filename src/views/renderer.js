// Badges
const badge = document.getElementById("status-badge");
const badgeServer = document.getElementById("status-server");

window.api.aoReceberStatus((event, status) => {
  console.log(status);

  badge.textContent = status;

  if (status === "Online") {
    badge.classList.remove("badge-secondary");
    badge.classList.add("badge-success");
  } else {
    badge.classList.remove("badge-success");
    badge.classList.add("badge-secondary");
  }
});

window.api.aoReceberStatusWS((status) => {
  console.log("🌐 STATUS WS:", status);

  if (status === "conectado") {
    badgeServer.textContent = "Conectado";
    badgeServer.style.backgroundColor = "#2ecc71";
    addLog("🌐 Conectado ao servidor");
  } else {
    badgeServer.textContent = "Desconectado";
    badgeServer.style.backgroundColor = "#e74c3c";
    addLog("🚫 Servidor desconectado");
  }
});

// Logs
const logElement = document.getElementById("log");

function addLog(message) {
  const now = new Date();
  const time = now.toLocaleTimeString("pt-BR");

  const logEntry = document.createElement("div");
  logEntry.className = "log-entry";
  logEntry.innerHTML = `
                <span class="log-time">[${time}]</span>
                <span class="log-message"> ${message}</span>
            `;

  logElement.appendChild(logEntry);
  logElement.scrollTop = logElement.scrollHeight;
}

window.api.receberLog((mensagem) => {
  addLog(mensagem);
});

// Botão Teste da Impressora
const btnTeste = document.getElementById("print-test");

btnTeste.addEventListener("click", async () => {
  addLog("🧪 Iniciando teste de impressora...");

  try {
    const res = await window.api.executarTeste();

    if (res.success) {
      if (res.simulated) {
        addLog("⚠️ Teste concluído (MODO SIMULAÇÃO).");
      } else {
        addLog("✅ Teste enviado para a impressora física!");
      }
    } else {
      addLog(`❌ Falha no teste: ${res.error}`);
    }
  } catch (err) {
    addLog(`💥 Erro fatal: ${err.message}`);
  }
});

// Telinha Config

async function checarConfiguracao() {
  const idSalvo = await window.electron.getRestaurantId();
  console.log(window.electron);

  if (!idSalvo) {
    document.getElementById("config-screen").style.display = "block";
  } else {
    iniciarAgente(idSalvo);
  }
}

const mainScreen = document.getElementById("main-screen");
const configScreen = document.getElementById("config-screen");
const inputId = document.getElementById("restaurant-id-input");
const btnSalvar = document.getElementById("btn-salvar-config");
const btnSettings = document.querySelector(".settings");

window.addEventListener("DOMContentLoaded", async () => {
  // 1. Checa se já existe um ID salvo
  const idSalvo = await window.api.getRestaurantId();

  if (!idSalvo) {
    // Se não tem ID, esconde os logs e mostra a config
    mainScreen.style.display = "none";
    configScreen.style.display = "block";
  }

  // 2. Lógica do botão Salvar
  btnSalvar.addEventListener("click", async () => {
    const novoId = inputId.value.trim();
    if (novoId) {
      await window.api.saveRestaurantId(novoId);

      alert("ID Salvo! Reiniciando agente...");
      location.reload(); // Recarrega para iniciar o servidor com o novo ID
    } else {
      alert("Por favor, insira um ID válido.");
    }
  });
});

btnSettings.addEventListener("click", () => {
  // Alterna a visibilidade: esconde os logs e mostra a config
  mainScreen.style.display = "none";
  configScreen.style.display = "block";

  // Preenche o input com o ID atual para ele ver qual está usando
  window.api.getRestaurantId().then((id) => {
    document.getElementById("restaurant-id-input").value = id || "";
  });
});
