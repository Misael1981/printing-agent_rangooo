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

      // 📦 PEDIDO RECEBIDO (suporta 'pedido' e 'print_order')
      if (evento.tipo === "pedido" || evento.tipo === "print_order") {
        // Normalizar payloads
        const order =
          evento.tipo === "pedido" ? evento.dados : evento.dados.order;
        const requestId =
          evento.tipo === "pedido" ? evento.requestId : evento.dados.requestId;

        win.webContents.send("novo-log", `📦 Pedido recebido: #${order.id}`);
        win.webContents.send(
          "novo-log",
          `📄 Pedido completo: ${JSON.stringify(order, null, 2)}`,
        );

        win.webContents.send("status-impressora", "🖨️ Imprimindo...");

        (async () => {
          try {
            const result = await printerManager.printOrder(order);

            // Log detalhado do resultado
            win.webContents.send(
              "novo-log",
              `📝 Resultado de impressão: ${JSON.stringify(result)}`,
            );

            if (result.simulated) {
              win.webContents.send(
                "novo-log",
                `⚠️ Pedido #${order.id} em modo simulação (não foi impresso fisicamente)`,
              );
            } else {
              win.webContents.send(
                "novo-log",
                `✅ Pedido #${order.id} impresso com sucesso`,
              );
            }

            win.webContents.send("status-impressora", "🟢 Pronta");

            // ⚠️ IMPORTANTE: responder o WS AQUI
            wsClient.enviarACK({
              type: "print_done",
              requestId,
              orderId: order.id,
              success: true,
              simulated: result?.simulated || false,
            });
          } catch (err) {
            win.webContents.send(
              "novo-log",
              `❌ Erro ao imprimir pedido #${order.id}: ${err.message}`,
            );

            win.webContents.send("status-impressora", "🔴 Erro");

            wsClient.enviarACK({
              type: "print_done",
              requestId,
              orderId: order.id,
              success: false,
              error: err.message,
            });
          }
        })();
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
