module.exports = function formatOrderPrint(printer, order) {
  printer.clear();

  // Comando raw para garantir largura total do papel 80mm
  printer.raw(Buffer.from([0x1d, 0x57, 0x40, 0x02]));

  // COMENTEI A FONT B: Usar a fonte padrão (Font A) permite que o setTextSize funcione melhor
  // printer.setTypeFontB();
  printer.setTextSize(0, 0);

  // ===== CABEÇALHO =====
  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(1, 1);
  // Gemini: Acho que estou pegando o nome do restaurante errado ainda
  printer.println(order.restaurantName || "RESTAURANTE");
  printer.setTextSize(0, 0); // Volta ao normal
  printer.bold(false);

  printer.bold(true);
  // Gemini:  Aqui, ao invés de pegar o order.id, pegar order.orderNumber
  printer.println(`Pedido #${order.number || "N/A"}`);
  printer.bold(false);
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
    const price = item.price || 0;
    const quantity = item.quantity || 1;
    const totalItem = quantity * price;

    // Destacando os itens para a cozinha ler de longe
    printer.bold(true);
    if (item.category) {
      // printer.setTextDoubleHeight(); // Use com moderação se o nome for longo
      printer.println(item.category.toUpperCase());
    }
    printer.tableCustom([
      { text: `${quantity}x`, align: "LEFT", width: 0.15 },
      { text: item.name, align: "LEFT", width: 0.55 },
      { text: `R$ ${totalItem.toFixed(2)}`, align: "RIGHT", width: 0.3 },
    ]);
    printer.setTextNormal();
    printer.bold(false);

    if (item.extras && item.extras.length > 0) {
      item.extras.forEach((extraName) => {
        printer.println(`   + ${extraName}`);
      });
    }

    if (item.notes) {
      printer.bold(true);
      printer.println(`   Obs: ${item.notes}`);
      printer.bold(false);
    }
  });

  printer.drawLine();

  // ===== TOTAIS =====
  const deliveryFee = order.deliveryFee || 0;
  const total = order.total || 0;
  const subtotal = order.subtotal || total - deliveryFee; // Fallback se não vier subtotal

  printer.tableCustom([
    { text: "Subtotal", align: "LEFT", width: 0.5 },
    { text: `R$ ${subtotal.toFixed(2)}`, align: "RIGHT", width: 0.5 },
  ]);

  if (deliveryFee > 0) {
    printer.tableCustom([
      { text: "Taxa entrega", align: "LEFT", width: 0.5 },
      { text: `R$ ${deliveryFee.toFixed(2)}`, align: "RIGHT", width: 0.5 },
    ]);
  }

  // TOTAL destacado (GIGANTE)
  printer.drawLine();
  printer.bold(true);
  printer.setTextSize(1, 1); // Quad Area (2x2)
  printer.tableCustom([
    { text: "TOTAL", align: "LEFT", width: 0.5 },
    { text: `R$ ${order.total.toFixed(2)}`, align: "RIGHT", width: 0.5 },
  ]);
  printer.setTextNormal();
  printer.bold(false);
  printer.drawLine();

  // ===== PAGAMENTO =====
  printer.println(`Pagamento: ${order.payment}`);
  if (order.changeFor) {
    printer.println(`Troco para: R$ ${order.changeFor.toFixed(2)}`);
  }

  // ===== ENTREGA =====
  if (order.details) {
    printer.newLine();
    printer.bold(true);
    printer.setTextDoubleHeight();
    printer.println("Entrega:");
    printer.setTextNormal();
    printer.bold(false);
    const addr = order.details;
    printer.println(`${addr.areaType}`);
    printer.println(`${addr.street}, ${addr.number} - ${addr.neighborhood}`);
    printer.println(`${addr.complement}`);
    printer.println(`${addr.reference}`);
  }

  // ===== RODAPÉ =====
  printer.newLine();
  printer.alignCenter();
  printer.bold(true);
  printer.println("Sistema Rangooo!");
  printer.bold(false);
  printer.cut();
};
