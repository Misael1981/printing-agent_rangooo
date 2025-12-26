// 1️⃣ CARREGAR ENV ANTES DE QUALQUER COISA
const path = require("path");
require("dotenv").config({ path: path.join(process.cwd(), ".env") });

const wsClient = require("./ws-client");
const PrinterManager = require("./printer-manager");

const printerManager = new PrinterManager();

function iniciarAgente(win) {
  console.log("🚀 Motor do Agente iniciado!");

  wsClient.conectar((evento) => {
    // 🌐 STATUS DO WEBSOCKET
    if (evento.tipo === "status") {
      const statusFormatado =
        evento.valor === "Online" ? "conectado" : "desconectado";

      win.webContents.send("status-websocket", statusFormatado);
      win.webContents.send("novo-log", `🌐 Servidor WS: ${evento.valor}`);
    }

    // 📦 PEDIDO RECEBIDO (SÓ STATUS + LOG)
    if (evento.tipo === "pedido") {
      win.webContents.send(
        "novo-log",
        `📦 Pedido recebido: #${evento.dados.id}`
      );

      win.webContents.send("status-impressora", "🖨️ Imprimindo...");
    }

    // ✅ IMPRESSÃO OK (EVENTO OPCIONAL FUTURO)
    if (evento.tipo === "print_sucesso") {
      win.webContents.send("status-impressora", "Online");
      win.webContents.send(
        "novo-log",
        `✅ Pedido #${evento.orderId} impresso com sucesso`
      );
    }

    // ❌ ERRO NA IMPRESSÃO
    if (evento.tipo === "print_erro") {
      win.webContents.send("status-impressora", "Online");
      win.webContents.send(
        "novo-log",
        `❌ Erro ao imprimir pedido #${evento.orderId}: ${evento.erro}`
      );
    }
  });
}

module.exports = { iniciarAgente, printerManager };
