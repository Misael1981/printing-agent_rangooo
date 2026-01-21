// src/services/format-order-print.js

module.exports = function formatOrderPrint(printer, order) {
  printer.clear();
  printer.raw(Buffer.from([0x1D, 0x57, 0x40, 0x02]));

  printer.setTypeFontB();
  printer.setTextSize(0, 0); // fonte pequena padrão

  // ===== CABEÇALHO =====
  printer.alignCenter();
  printer.bold(true);
  printer.println(process.env.STORE_NAME || "RESTAURANTE");
  printer.bold(false);
  printer.println(`Pedido #${order.id}`);
  printer.drawLine();

  // ===== INFO DO PEDIDO =====
  printer.alignLeft();
  printer.println(`Data: ${new Date().toLocaleString("pt-BR")}`);
  printer.println(`Cliente: ${order.customerName || "Não informado"}`);
  printer.println(`Telefone: ${order.customerPhone || "-"}`);
  printer.drawLine();

  // ===== ITENS =====
  printer.bold(true);
  printer.println("ITENS");
  printer.bold(false);

  order.items.forEach((item) => {
    const totalItem = item.quantity * item.price;

    printer.tableCustom([
      { text: `${item.quantity}x`, align: "LEFT", width: 0.1 },
      { text: item.name, align: "LEFT", width: 0.6 },
      {
        text: `R$ ${totalItem.toFixed(2)}`,
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
    { text: "Subtotal", align: "LEFT", width: 0.5 },
    { text: `R$ ${order.subtotal.toFixed(2)}`, align: "RIGHT", width: 0.5 },
  ]);

  printer.tableCustom([
    { text: "Taxa entrega", align: "LEFT", width: 0.5 },
    { text: `R$ ${order.deliveryFee.toFixed(2)}`, align: "RIGHT", width: 0.5 },
  ]);

  // TOTAL destacado sem aumentar fonte
  printer.drawLine();
  printer.bold(true);
  printer.tableCustom([
    { text: "TOTAL", align: "LEFT", width: 0.5 },
    { text: `R$ ${order.total.toFixed(2)}`, align: "RIGHT", width: 0.5 },
  ]);
  printer.bold(false);
  printer.drawLine();

  // ===== PAGAMENTO =====
  printer.println(`Pagamento: ${order.paymentMethod}`);
  if (order.changeFor) {
    printer.println(`Troco para: R$ ${order.changeFor.toFixed(2)}`);
  }

  // ===== ENTREGA =====
  if (order.deliveryAddress) {
    printer.newLine();
    printer.bold(true);
    printer.println("Entrega:");
    printer.bold(false);
    printer.println(order.deliveryAddress);
  }

  // ===== RODAPÉ =====
  printer.newLine();
  printer.alignCenter();
  printer.println("Obrigado pela preferência!");

  printer.cut();
};
