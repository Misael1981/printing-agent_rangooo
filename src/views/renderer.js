async function testarPonte() {
  const versao = window.api.verElectron();
  document.getElementById("versao-electron").innerText = versao;

  // Testando o Invoke
  console.log("📡 Enviando Ping para o Main...");
  const resposta = await window.api.sendPing();
  console.log("✅ Resposta recebida:", resposta);
}

testarPonte();

const badge = document.getElementById("status-badge");

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
