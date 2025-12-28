require("dotenv").config();
const WebSocket = require("ws");
const PrinterManager = require("./printer-manager");

const printer = new PrinterManager();
let ws = null;

/**
 * Conecta o agente ao WebSocket
 * @param {Object} params
 * @param {string} params.restaurantId
 * @param {Function} [onEvento]
 */
function conectar({ restaurantId, onEvento }) {
  // 🔒 Validação obrigatória
  if (!restaurantId) {
    console.error("❌ restaurantId não informado ao WS client");
    return;
  }

  if (!process.env.WS_URL || !process.env.WS_SECRET) {
    console.error("❌ WS_URL ou WS_SECRET não definidos no .env");
    return;
  }

  const url = `${process.env.WS_URL}?token=${process.env.WS_SECRET}&restaurantId=${restaurantId}&role=agent`;

  console.log("🔁 Tentando conectar ao WS...");
  console.log("🔌 URL:", process.env.WS_URL);

  ws = new WebSocket(url);

  ws.on("open", () => {
    console.log("🟢 Agente conectado ao servidor WS");
    onEvento?.({ tipo: "status", valor: "Online" });

    // 👋 Handshake do agente
    ws.send(
      JSON.stringify({
        type: "agent_hello",
        restaurantId, // 👈 SEMPRE o dinâmico
        agentName: process.env.AGENT_NAME || "rangooo-agent",
        capabilities: ["print"],
      })
    );
  });

  ws.on("message", async (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      // 📥 Pedido vindo do SaaS
      if (message.type === "print_order") {
        onEvento?.({ tipo: "pedido", dados: message.order });

        try {
          const result = await printer.printOrder(message.order);

          // 📤 ACK sucesso (EVITA TIMEOUT)
          ws.send(
            JSON.stringify({
              type: "print_done",
              requestId: message.requestId,
              orderId: message.order.id,
              success: true,
              simulated: result?.simulated || false,
            })
          );
        } catch (err) {
          console.error("🖨️ Erro na impressão:", err.message);

          // 📤 ACK erro
          ws.send(
            JSON.stringify({
              type: "print_done",
              requestId: message.requestId,
              orderId: message.order.id,
              success: false,
              error: err.message,
            })
          );
        }
      }

      // ❤️ Ping/Pong
      if (message.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }
    } catch (err) {
      console.error("❌ Erro ao processar mensagem WS:", err);
    }
  });

  ws.on("close", () => {
    console.log("🔴 Conexão WS encerrada");
    onEvento?.({ tipo: "status", valor: "Offline" });

    // 🔁 Reconexão automática
    setTimeout(() => {
      conectar({ restaurantId, onEvento });
    }, 5000);
  });

  ws.on("error", (err) => {
    console.error("💥 Erro WS:", err.message);
    onEvento?.({ tipo: "status", valor: "Erro de Conexão" });
  });

  return ws;
}

module.exports = { conectar };
