# 🖨️ Agente de Impressão Rangooo

<img src="./src/public/img/tamplate.PNG">

O **Agente de Impressão Rangooo** é um serviço responsável por receber pedidos em tempo real via **WebSocket** e enviá-los automaticamente para impressão local, integrando o **SaaS Rangooo** com impressoras térmicas utilizadas em pizzarias, lanchonetes, restaurantes...

Esse agente resolve um problema clássico do food service:  
👉 **pedido confirmado = impressão imediata**, sem depender de navegador aberto ou ação manual.

---

## 🚀 Visão Geral

- Comunicação em tempo real via **WebSocket**
- Arquitetura simples e desacoplada
- Pensado para rodar localmente no estabelecimento
- Seguro, usando **token de autenticação**
- Base para expansão futura (fila, retry, logs, multi-impressoras)

---

## 🧠 Arquitetura

```
   [SaaS Rangooo]
         |
 WebSocket (pedido)
         ↓
[Agente de Impressão]
         |
 Comando de impressão
         ↓
[Impressora Térmica]
```

---

## 🛠️ Tecnologias Utilizadas

- **Node.js 20+**
- **WebSocket (ws)**
- **JavaScript**
- **dotenv**
- **Impressão térmica (dependente do SO / driver)**

---

## 📦 Estrutura do Projeto

```
├── websocket-server.js # Servidor WebSocket (core do agente)
├── client/ # Lib cliente para envio de pedidos
├── .env.example # Exemplo de variáveis de ambiente
├── package.json
└── README.md
```

---

## 🔐 Autenticação

A conexão é autenticada via **token**, enviado como query string:

```
txt
wss://seu-servidor?token=SEU_TOKEN&saas=true
```

Esse token identifica o restaurante e garante que apenas pedidos autorizados sejam processados.

## 🔁 Fluxo de Impressão

1. **Pedido criado no SaaS**

2. **SaaS envia pedido via WebSocket**

3. **Agente recebe o pedido**

4. **Pedido é enviado para a impressora**

5. **Agente responde com ACK**

6. **SaaS confirma impressão com printId**

### Em caso de falha:

- Timeout controlado

- Retentativas podem ser implementadas

## Autor

Desenvolvido por **Misael Borges**

Fullstack Developer • SaaS • Automação • Tempo Real

```
Projeto criado como parte do ecossistema Rangooo, com foco em soluções reais para o mercado de food service.
```

## 📄 Licença

Este projeto está sob a licença MIT.
id_teste=b7a8ae0d-df91-4037-822a-a43ecac1c993

```
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

    printer.setTextSize(0, 0);
    printer.bold(true);
    if (item.category) {
      printer.println(item.category.toUpperCase());
    }

    printer.setTextSize(1, 0);
    printer.tableCustom([
      { text: `${quantity}x`, align: "LEFT", width: 0.1 },
      { text: item.name, align: "LEFT", width: 0.65 },
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
  const subtotal = order.subtotal || total - deliveryFee;

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
  printer.setTextSize(0, 0);
  printer.tableCustom([
    { text: "TOTAL", align: "LEFT", width: 0.5 },
    { text: `R$ ${order.total.toFixed(2)}`, align: "RIGHT", width: 0.5 },
  ]);
  printer.setTextNormal();
  printer.bold(false);
  printer.drawLine();

  // ===== PAGAMENTO =====
  if (order.method === "DELIVERY") {
    const paymentMethodsMap = {
      cash: "Dinheiro",
      card: "Cartão",
      pix: "PIX",
    };
    printer.alignCenter();
    printer.bold(true);
    printer.println(
      `Pagamento: ${paymentMethodsMap[order.payment] || order.payment}`,
    );
    if (order.changeFor) {
      printer.println(`Troco para: R$ ${order.changeFor.toFixed(2)}`);
    }
  }

  printer.bold(true);
  const methodConsumptionMap = {
    DELIVERY: "Delivery",
    PICKUP: "Retirada",
    DINE_IN: "Consumo no local",
  };
  printer.println(
    `Método de consumo: ${methodConsumptionMap[order.method] || order.method}`,
  );

  printer.drawLine();
  printer.drawLine();
  printer.setTextNormal();

  // ===== ENTREGA =====
  if (order.method === "DELIVERY") {
    if (order.details || order.address) {
      const addr = order.details || order.address;
      const area = addr.areaType === "URBAN" ? "Zona Urbana" : "Zona Rural";

      printer.newLine();
      printer.drawLine();

      // Título da Seção
      printer.alignCenter();
      printer.bold(true);
      printer.println("DADOS DE ENTREGA");
      printer.bold(false);
      printer.newLine();

      printer.alignLeft();
      printer.setTextSize(0, 0);
      printer.bold(true);
      printer.tableCustom([
        { text: "LOCAL:", align: "LEFT", width: 0.4 },
        { text: area, align: "RIGHT", width: 0.6 },
      ]);
      printer.setTextNormal();
      printer.bold(false);

      printer.newLine();
      printer.setTextSize(1, 0);
      printer.bold(true);

      printer.println(`${addr.street}, ${addr.number}`);

      printer.println(`${addr.neighborhood}`);

      printer.setTextNormal();
      printer.bold(false);

      if (addr.complement) {
        printer.println(`Comp: ${addr.complement}`);
      }

      if (addr.reference) {
        printer.bold(true);
        printer.println(`REF: ${addr.reference}`);
        printer.bold(false);
      }

      printer.drawLine();
    }
  }

  // ===== RETIRADA =====
  if (order.method === "PICKUP") {
    const estimatedTime = order.details?.estimatedPickupTime;

    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 0);
    printer.println(`Cliente: ${order.customerName || "Não informado"}`);
    printer.println(`Telefone: ${order.customerPhone || "-"}`);
    printer.println(
      `Tempo estimado: ${order.details?.estimatedTime || "Não informado"} minutos`,
    );
    printer.bold(false);
    printer.drawLine();
  }

  // ===== RODAPÉ =====
  printer.newLine();
  printer.alignCenter();
  printer.bold(true);
  printer.println("Sistema Rangooo!");
  printer.bold(false);
  printer.cut();
};

```
