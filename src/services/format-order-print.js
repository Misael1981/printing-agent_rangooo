// src/services/format-order-print.js

const ThermalPrinter = require("node-thermal-printer").printer;
const Types = require("node-thermal-printer").types;

module.exports = function formatOrderPrint(printer, order) {
  // Reset básico
  printer.clear();
  printer.setTypeFontB();

  // ===== CABEÇALHO =====
  printer.alignCenter();
  printer.bold(true);
  printer.println(process.env.STORE_NAME || "RESTAURANTE");
  printer.bold(false);
  printer.drawLine();
  printer.newLine();

  // ===== INFO DO PEDIDO =====
  printer.alignLeft();
  printer.println(`PEDIDO: #${order.id}`);
  printer.println(`DATA: ${new Date().toLocaleString("pt-BR")}`);
  printer.println(`CLIENTE: ${order.customerName || "Não informado"}`);
  printer.println(`TELEFONE: ${order.customerPhone || "-"}`);
  printer.drawLine();

  // ===== ITENS =====
  printer.bold(true);
  printer.println("ITENS:");
  printer.bold(false);

  order.items.forEach((item) => {
    printer.tableCustom([
      { text: `${item.quantity}x`, align: "LEFT", width: 0.1 },
      { text: item.name, align: "LEFT", width: 0.6 },
      {
        text: `R$ ${item.price.toFixed(2)}`,
        align: "RIGHT",
        width: 0.3,
      },
    ]);

    if (item.notes) {
      printer.println(`  Obs: ${item.notes}`);
    }
  });

  printer.drawLine();

  // ===== TOTAIS =====
  printer.tableCustom([
    { text: "SUBTOTAL:", align: "LEFT", width: 0.5 },
    {
      text: `R$ ${order.subtotal.toFixed(2)}`,
      align: "RIGHT",
      width: 0.5,
    },
  ]);

  printer.tableCustom([
    { text: "TAXA:", align: "LEFT", width: 0.5 },
    {
      text: `R$ ${order.deliveryFee.toFixed(2)}`,
      align: "RIGHT",
      width: 0.5,
    },
  ]);

  printer.bold(true);
  printer.tableCustom([
    { text: "TOTAL:", align: "LEFT", width: 0.5 },
    {
      text: `R$ ${order.total.toFixed(2)}`,
      align: "RIGHT",
      width: 0.5,
    },
  ]);
  printer.bold(false);

  printer.drawLine();

  // ===== PAGAMENTO =====
  printer.println(`PAGAMENTO: ${order.paymentMethod}`);

  if (order.changeFor) {
    printer.println(`TROCO PARA: R$ ${order.changeFor.toFixed(2)}`);
  }

  // ===== ENTREGA =====
  if (order.deliveryAddress) {
    printer.newLine();
    printer.bold(true);
    printer.println("ENTREGA:");
    printer.bold(false);
    printer.println(order.deliveryAddress);
  }

  // ===== RODAPÉ =====
  printer.newLine();
  printer.alignCenter();
  printer.println("Obrigado pela preferência!");
  printer.println("Volte sempre :)");

  printer.cut();
};
