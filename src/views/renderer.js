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
