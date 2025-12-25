require("dotenv").config();
const WebSocket = require("ws");
const PrinterManager = require("./printer-manager");

const printer = new PrinterManager();

function conectar(callback) {
  const ws = new WebSocket(
    `${process.env.WS_URL}?token=${process.env.WS_SECRET}&restaurantId=${process.env.RESTAURANT_ID}&role=agent`
  );

  ws.on("open", () => {
    console.log("🟢 Agente conectado ao servidor WS");

    if (callback) callback({ tipo: "status", valor: "Online" });

    // Identificação inicial
    ws.send(
      JSON.stringify({
        type: "agent_hello",
        restaurantId: process.env.RESTAURANT_ID,
        agentName: process.env.AGENT_NAME || "default-agent",
        capabilities: ["print"],
      })
    );
  });

  ws.on("message", async (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      // 📥 Pedido vindo do SaaS
      if (message.type === "print_order") {
        if (callback) callback({ tipo: "pedido", dados: message.order });

        try {
          const result = await printer.printOrder(message.order);

          // 📤 ACK sucesso
          ws.send(
            JSON.stringify({
              type: "print_done",
              requestId: message.requestId, // 🔑 ID DO ENVELOPE
              orderId: message.order.id,
              success: true,
              simulated: result.simulated || false,
            })
          );
        } catch (printError) {
          console.error("🖨️ Erro na impressão:", printError);

          // 📤 ACK erro (EVITA TIMEOUT NO SERVIDOR)
          ws.send(
            JSON.stringify({
              type: "print_done",
              requestId: message.requestId,
              orderId: message.order.id,
              success: false,
              error: printError.message,
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
    if (callback) callback({ tipo: "status", valor: "Desconectado" });
  });

  ws.on("error", (err) => {
    console.error("💥 Erro WS:", err);
    if (callback) callback({ tipo: "status", valor: "Erro de Conexão" });
  });
}

module.exports = { conectar };
