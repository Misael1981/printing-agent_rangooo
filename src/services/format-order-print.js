module.exports = function formatOrderPrint(printer, order) {
  printer.clear();
  printer.raw(Buffer.from([0x1d, 0x57, 0x40, 0x02])); // Largura 80mm
  printer.setTextSize(0, 0);

  // ===== CABEÇALHO =====
  printer.alignCenter();
  printer.bold(true);
  printer.setTextSize(1, 1);
  printer.println(order.restaurantName || "RESTAURANTE");
  printer.setTextSize(0, 0);
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
    const quantity = item.quantity || 1;

    printer.setTextSize(0, 0);
    if (item.category) {
      printer.bold(true);
      printer.println(item.category.toUpperCase());
      printer.bold(false);
    }

    // --- LÓGICA PARA MEIO A MEIO (Sabor 1 e Sabor 2) ---
    if (item.isDouble) {
      if (item.flavor1) {
        printer.setTextSize(1, 0);
        printer.bold(true);
        printer.println(`  1/2 ${item.flavor1?.name || "Sabor 1"}`);
        printer.bold(false);
        printer.setTextNormal();

        if (item.flavor1?.extras?.length > 0) {
          item.flavor1.extras.forEach((ex) => printer.println(`      + ${ex}`));
        }
        if (item.flavor1?.removed?.length > 0) {
          item.flavor1.removed.forEach((rm) =>
            printer.println(`      - SEM ${rm}`),
          );
        }
      }

      // Metade 2
      if (item.flavor2) {
        printer.setTextSize(1, 0);
        printer.bold(true);
        printer.println(`  1/2 ${item.flavor2?.name || "Sabor 2"}`);
        printer.bold(false);
        printer.setTextNormal();

        if (item.flavor2?.extras?.length > 0) {
          item.flavor2.extras.forEach((ex) => printer.println(`      + ${ex}`));
        }
        if (item.flavor2?.removed?.length > 0) {
          item.flavor2.removed.forEach((rm) =>
            printer.println(`      - SEM ${rm}`),
          );
        }
      }
    } else {
      // --- LÓGICA PARA ITEM SIMPLES ---
      printer.setTextSize(1, 0);
      printer.tableCustom([
        { text: `${quantity}x`, align: "LEFT", width: 0.1 },
        { text: item.name, align: "LEFT", width: 0.9 },
      ]);
      printer.setTextNormal();
      const simpleExtras = item.flavor1?.extras || item.extras || [];
      const simpleRemoved =
        item.flavor1?.removed || item.removedIngredients || [];

      if (simpleExtras.length > 0) {
        simpleExtras.forEach((extra) => printer.println(`   + ${extra}`));
      }
      if (simpleRemoved.length > 0) {
        simpleRemoved.forEach((rm) => printer.println(`   - SEM ${rm}`));
      }
    }

    if (item.notes) {
      printer.bold(true);
      printer.println(`   Obs: ${item.notes}`);
      printer.bold(false);
    }
    printer.newLine();
  });

  printer.drawLine();

  // ===== TOTAIS E PAGAMENTO =====
  const deliveryFee = order.deliveryFee || 0;
  const total = order.total || 0;

  printer.tableCustom([
    { text: "TOTAL", align: "LEFT", width: 0.5 },
    { text: `R$ ${total.toFixed(2)}`, align: "RIGHT", width: 0.5 },
  ]);

  printer.drawLine();
  const methodConsumptionMap = {
    DELIVERY: "Delivery",
    PICKUP: "Retirada",
    DINE_IN: "Mesa",
  };
  printer.alignCenter();
  printer.bold(true);
  printer.println(
    `METODO: ${methodConsumptionMap[order.method] || order.method}`,
  );
  printer.bold(false);

  // ===== ENDEREÇO (Apenas se for Delivery) =====
  if (order.method === "DELIVERY" && order.details) {
    const addr = order.details;
    printer.drawLine();
    printer.println("DADOS DE ENTREGA");
    printer.setTextSize(1, 0);
    printer.println(`${addr.street}, ${addr.number}`);
    printer.println(`${addr.neighborhood}`);
    if (addr.complement) printer.println(`Comp: ${addr.complement}`);
    if (addr.reference) printer.println(`Ref: ${addr.reference}`);
    printer.setTextNormal();
  }

  printer.newLine();
  printer.alignCenter();
  printer.println("Sistema Rangooo!");
  printer.cut();
};
