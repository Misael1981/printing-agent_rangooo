```
async executePrint(order) {
    // Configuração inicial
    this.printer.clear();
    this.printer.setTypeFontB();

    // Cabeçalho
    this.printer.alignCenter();
    this.printer.bold(true);
    this.printer.println(process.env.STORE_NAME || "RESTAURANTE");
    this.printer.bold(false);
    this.printer.drawLine();
    this.printer.newLine();

    // Informações do pedido
    this.printer.alignLeft();
    this.printer.println(`PEDIDO: #${order.id}`);
    this.printer.println(`DATA: ${new Date().toLocaleString("pt-BR")}`);
    this.printer.println(`CLIENTE: ${order.customerName || "Não informado"}`);
    this.printer.println(`TELEFONE: ${order.customerPhone || ""}`);
    this.printer.drawLine();

    // Itens
    this.printer.bold(true);
    this.printer.println("ITENS:");
    this.printer.bold(false);

    order.items.forEach((item) => {
      this.printer.tableCustom([
        { text: `${item.quantity}x`, align: "LEFT", width: 0.1 },
        { text: item.name, align: "LEFT", width: 0.6 },
        { text: `R$ ${item.price.toFixed(2)}`, align: "RIGHT", width: 0.3 },
      ]);

      if (item.notes) {
        this.printer.println(`  Obs: ${item.notes}`);
      }
    });

    this.printer.drawLine();

    // Totais
    this.printer.tableCustom([
      { text: "SUBTOTAL:", align: "LEFT", width: 0.5 },
      {
        text: `R$ ${order.subtotal.toFixed(2)}`,
        align: "RIGHT",
        width: 0.5,
      },
    ]);

    this.printer.tableCustom([
      { text: "TAXA:", align: "LEFT", width: 0.5 },
      {
        text: `R$ ${order.deliveryFee.toFixed(2)}`,
        align: "RIGHT",
        width: 0.5,
      },
    ]);

    this.printer.bold(true);
    this.printer.tableCustom([
      { text: "TOTAL:", align: "LEFT", width: 0.5 },
      { text: `R$ ${order.total.toFixed(2)}`, align: "RIGHT", width: 0.5 },
    ]);
    this.printer.bold(false);

    this.printer.drawLine();

    // Forma de pagamento
    this.printer.println(`PAGAMENTO: ${order.paymentMethod}`);

    if (order.changeFor) {
      this.printer.println(`TROCO PARA: R$ ${order.changeFor.toFixed(2)}`);
    }

    // Endereço de entrega
    if (order.deliveryAddress) {
      this.printer.newLine();
      this.printer.bold(true);
      this.printer.println("ENTREGA:");
      this.printer.bold(false);
      this.printer.println(order.deliveryAddress);
    }

    // Rodapé
    this.printer.newLine();
    this.printer.alignCenter();
    this.printer.println("Obrigado pela preferência!");
    this.printer.println("Volte sempre :)");

    // Cortar papel
    this.printer.cut();

    // Executar impressão
    return this.printer.execute();
  }
```
