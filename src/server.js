const wsClient = require("./ws-client");
const PrinterManager = require("./printer-manager");
const logger = require("./utils/logger");

const printerManager = new PrinterManager();

function iniciarAgente({ restaurantId, win }) {
  console.log("🚀 Motor do Agente iniciado!");
  logger.info(`🔌 Conectando agente para restaurante ${restaurantId}`);

  wsClient.conectar({
    restaurantId,
    onEvento: (evento) => {
      // 🌐 STATUS DO WEBSOCKET
      if (evento.tipo === "status") {
        const statusFormatado =
          evento.valor === "Online" ? "conectado" : "desconectado";

        win.webContents.send("status-websocket", statusFormatado);
        win.webContents.send("novo-log", `🌐 Servidor WS: ${evento.valor}`);
      }

      // 📦 PEDIDO RECEBIDO
      if (evento.tipo === "pedido") {
        win.webContents.send(
          "novo-log",
          `📦 Pedido recebido: #${evento.dados.id}`
        );

        win.webContents.send("status-impressora", "🖨️ Imprimindo...");
      }

      // ❌ ERRO DE CONEXÃO
      if (evento.tipo === "erro") {
        win.webContents.send("status-websocket", "erro");
        win.webContents.send("novo-log", `❌ Erro WS: ${evento.mensagem}`);
      }
    },
  });
}

module.exports = { iniciarAgente, printerManager };
