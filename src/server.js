const path = require("path");
const fs = require("fs");
const wsClient = require("./ws-client");
const printerManager = require("./printer-manager");

// Carregar o .env antes de tudo
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  require("dotenv").config({ path: envPath });
}

function iniciarAgente(win) {
  console.log("🚀 Motor do Agente iniciado!");

  // Inicia a conexão com o Render
  wsClient.conectar((evento) => {
    // Aqui a mágica acontece: o WS avisa o Server, e o Server avisa a TELA
    if (evento.tipo === "status") {
      win.webContents.send("status-impressora", evento.valor);
    }

    if (evento.tipo === "pedido") {
      win.webContents.send("status-impressora", "🖨️ Imprimindo...");

      // Manda para a impressora física
      printerManager.imprimir(evento.dados).then((sucesso) => {
        if (sucesso) {
          win.webContents.send("status-impressora", "Online");
          console.log("✅ Pedido impresso e status atualizado na tela");
        }
      });
    }
  });
}

module.exports = { iniciarAgente };
