const {
  printer: ThermalPrinter,
  types: PrinterTypes,
} = require("node-thermal-printer");

async function test() {
  const printer = new ThermalPrinter({
    type: PrinterTypes.EPSON,
    interface: "tcp://10.0.0.250:9100", // <-- IP da sua Goldensky
    // interface: "\\\\.\\COM1",
    characterSet: "PC860_PORTUGUESE",
    options: { timeout: 5000 },
    removeSpecialCharacters: false,
    lineCharacter: "-",
  });

  const isConnected = await printer.isPrinterConnected();
  if (!isConnected) {
    console.error("Impressora não encontrada");
    return;
  }

  // printer.println("TESTE DE ACENTOS");
  // printer.println("Açaí, Coração, Açúcar, Pão, Maçã, Çedilha");
  // printer.drawLine();
  // printer.println("Impressão OK!");
  // printer.cut();
  const testOrder = {
    id: "1010",
    customerName: "Teste Impressora",
    customerPhone: "11 99999-9999",
    items: [
      {
        quantity: 1,
        name: "Pizza de Calabresa",
        price: 45.0,
        notes: "Sem cebola",
      },
      { quantity: 2, name: "Coca-Cola 2L", price: 12.0 },
    ],
    subtotal: 69.0,
    deliveryFee: 5.0,
    total: 74.0,
    paymentMethod: "Cartão de Crédito",
    deliveryAddress: "Rua dos Devs, 128, Bairro Binário",
  };
  formatPrint(printer, testOrder);

  try {
    await printer.execute();
    console.log("Impresso com sucesso!");
  } catch (e) {
    console.error("Erro ao imprimir:", e);
  }
}

function formatPrint(printer, order) {
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

  // ===== ITENS  =====
  printer.bold(true);
  printer.setTextSize(2, 2); // Aumenta tamanho 2x
  printer.println("ITENS:");
  printer.setTextSize(1, 1); // Volta ao normal
  printer.bold(false);

  order.items.forEach((item) => {
    // Aumenta tamanho da fonte para os itens
    printer.tableCustom([
      { text: `${item.quantity}x`, align: "LEFT", width: 0.1 },
      { text: item.name, align: "LEFT", width: 0.6 },
      {
        text: `R$ ${item.price.toFixed(2)}`,
        align: "RIGHT",
        width: 0.3,
      },
    ]);
    printer.executeRaw(Buffer.from([0x1d, 0x21, 0x11])); // Aumenta tamanho x2 DEPOIS da tabela

    if (item.notes) {
      printer.executeRaw(Buffer.from([0x1d, 0x21, 0x00])); // Volta ao normal pra notas
      printer.bold(true);
      printer.println(`   Obs: ${item.notes}`); // Observação em negrito para não passar batido
      printer.bold(false);
    }
  });

  printer.drawLine();

  // ===== TOTAIS (Subtotal normal, mas vamos deixar o TOTAL final gigante abaixo) =====
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
  printer.setTextQuadArea(); // Letra MUITO grande para o valor final
  printer.tableCustom([
    { text: "TOTAL:", align: "LEFT", width: 0.5 },
    {
      text: `R$ ${order.total.toFixed(2)}`,
      align: "RIGHT",
      width: 0.5,
    },
  ]);
  printer.setTextNormal();
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
  printer.println("Thermal!");
  printer.println("Volte sempre :)");

  printer.cut();
}

test();
