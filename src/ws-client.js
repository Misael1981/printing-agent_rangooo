require("dotenv").config();
const WebSocket = require("ws");
const PrinterManager = require("./printer-manager");
const logger = require("./utils/logger");

const printer = new PrinterManager();
let ws = null;

function conectar({ restaurantId, onEvento }) {
  if (!restaurantId) {
    console.error("❌ restaurantId não informado ao WS client");
    return;
  }

  if (!process.env.WS_URL || !process.env.WS_SECRET) {
    console.error("❌ WS_URL ou WS_SECRET não definidos no .env");
    return;
  }

  const url = `${process.env.WS_URL}?token=${process.env.WS_SECRET}&restaurantId=${restaurantId}&role=agent`;

  ws = new WebSocket(url);

  ws.on("open", () => {
    console.log("🟢 Agente conectado ao servidor WS");
    onEvento?.({ tipo: "status", valor: "Online" });

    ws.send(
      JSON.stringify({
        type: "agent_hello",
        restaurantId,
        agentName: process.env.AGENT_NAME || "rangooo-agent",
        capabilities: ["print"],
      }),
    );
  });

  ws.on("message", async (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      // Log básico para diagnóstico
      console.log("📨 Mensagem WS recebida:", message.type || "<sem tipo>");

      if (message.type === "print_order") {
        console.log(" Pedido recebido:", message.order.id);
        console.log(
          " Pedido completo:",
          JSON.stringify(message.order, null, 2),
        );
        logger.info(`📦 Pedido recebido via WS: #${message.order.id}`);
        // Apagar depois
        logger.debug(
          `📄 Payload completo do pedido: ${JSON.stringify(message.order)}`,
        );

        onEvento?.({
          tipo: "print_order",
          dados: {
            order: message.order,
            requestId: message.requestId,
          },
        });
      }

      if (message.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
      }

      // Se chegar mensagem desconhecida, repassar para diagnóstico
      if (!message.type) {
        console.warn("Mensagem WS sem campo type:", raw.toString());
      }
    } catch (err) {
      console.error("❌ Erro ao processar mensagem WS:", err);
    }
  });

  ws.on("close", () => {
    console.log("🔴 Conexão WS encerrada");
    onEvento?.({ tipo: "status", valor: "Offline" });

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

function enviarACK(payload) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

module.exports = { conectar, enviarACK };
