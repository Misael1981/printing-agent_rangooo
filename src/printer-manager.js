const {
  printer: ThermalPrinter,
  types: PrinterTypes,
} = require("node-thermal-printer");
const winston = require("winston");
const path = require("path");
const fs = require("fs");
const formatOrderPrint = require("./services/format-order-print.js");
const scanNetwork = require("./services/networkScanner.js");
const Store = require("electron-store");
const { app } = require("electron");
const appStore = new Store();

// Configurar logs - usar userData do Electron
const logDir = app ? path.join(app.getPath("userData"), "logs") : path.join(process.cwd(), "logs");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
    }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

class PrinterManager {
  constructor() {
    this.printer = null;
    this.isConnected = false;
    this.currentPrinterIP = null;
    this.availablePrinters = [];
    this.printQueue = [];
    this.isPrinting = false;
    this.init();
  }

  async init() {
    try {
      this.printerConfig = {
        type: PrinterTypes.EPSON,
        removeSpecialCharacters: false,
        characterSet: "PC860_PORTUGUESE",
        lineCharacter: "-",
        options: {
          timeout: 5000,
        },
      };

      // Buscar impressoras disponíveis na rede
      logger.info("🔍 Buscando impressoras na rede...");
      this.availablePrinters = await this.scanForPrinters();
      logger.info(
        `📋 ${this.availablePrinters.length} impressora(s) encontrada(s)`
      );

      // Verificar se há uma impressora salva
      const savedIP = appStore.get("printerIP");

      if (savedIP) {
        // Verificar se a impressora salva está entre as disponíveis
        const savedPrinterAvailable = this.availablePrinters.some(
          (p) => p.ip === savedIP
        );

        if (savedPrinterAvailable) {
          logger.info(`✅ Impressora salva encontrada na rede: ${savedIP}`);
          await this.connectToPrinter(savedIP);
        } else {
          logger.warn(
            `⚠️ Impressora salva (${savedIP}) não encontrada na rede`
          );
        }
      }

      if (this.isConnected) {
        logger.info(`🖨️ Impressora conectada: ${this.currentPrinterIP}`);
      } else {
        logger.warn(
          "⚠️ Nenhuma impressora conectada. Selecione uma das disponíveis."
        );
      }
    } catch (error) {
      logger.error("Erro ao inicializar PrinterManager:", error);
    }
  }

  async scanForPrinters() {
    try {
      const printers = await scanNetwork();
      this.availablePrinters = printers;
      return printers;
    } catch (error) {
      logger.error("Erro ao escanear rede:", error);
      return [];
    }
  }

  async connectToPrinter(ip) {
    try {
      const tcpInterface = `tcp://${ip}:9100`;

      this.printer = new ThermalPrinter({
        ...this.printerConfig,
        interface: tcpInterface,
      });

      this.isConnected = await this.printer.isPrinterConnected();

      if (this.isConnected) {
        this.currentPrinterIP = ip;
        appStore.set("printerIP", ip);
        logger.info(`✅ Conectado à impressora: ${ip}`);
      } else {
        logger.warn(`❌ Falha ao conectar em: ${ip}`);
      }

      return this.isConnected;
    } catch (error) {
      logger.error(`Erro ao conectar em ${ip}:`, error.message);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    this.printer = null;
    this.isConnected = false;
    this.currentPrinterIP = null;
    logger.info("🔌 Impressora desconectada");
  }

  async processQueue() {
    if (this.isPrinting) {
      logger.debug("⏭️ processQueue ignorado (já em execução)");
      return;
    }

    this.isPrinting = true;
    logger.info("🌀 Iniciando processamento da fila de impressão");

    try {
      while (this.printQueue.length > 0) {
        // items in the queue may include resolvers: {_resolve, _reject}
        const queued = this.printQueue.shift();

        logger.info(`🖨️ Processando pedido #${queued.id}`);

        try {
          const result = await this.doPrint(queued);

          logger.info(
            `✅ Pedido #${queued.id} finalizado | simulated=${result.simulated}`
          );

          if (typeof this.onResult === "function") {
            this.onResult(result);
          }

          // Notify the caller awaiting this specific order
          if (typeof queued._resolve === "function") queued._resolve(result);
        } catch (err) {
          logger.error(
            `❌ Erro no pedido #${queued.id}: ${err.message || err}`
          );

          if (typeof this.onError === "function") {
            this.onError({
              orderId: queued.id,
              error: err.message || String(err),
            });
          }

          // Reject the caller promise if present
          if (typeof queued._reject === "function") queued._reject(err);
        }
      }
    } finally {
      this.isPrinting = false;
      logger.info("⏹️ Fila de impressão finalizada");
    }
  }

  async printOrder(order) {
    if (!order || !order.id) {
      logger.warn("⚠️ printOrder chamado sem pedido válido");
      return Promise.reject(new Error("Pedido inválido"));
    }

    logger.info(`📥 Pedido enfileirado: #${order.id}`);

    return new Promise((resolve, reject) => {
      // we store resolvers in the queued item so processQueue can settle them
      const queued = { ...order, _resolve: resolve, _reject: reject };

      this.printQueue.push(queued);

      if (!this.isPrinting) {
        logger.info("▶️ Disparando processamento da fila");
        this.processQueue();
      }
    });
  }

  async doPrint(order) {
    const orderId = order?.id || "unknown";

    if (!this.printer || !this.isConnected) {
      logger.warn(`⚠️ Impressora não conectada. Simulando pedido #${orderId}`);

      const ack = {
        success: true,
        simulated: true,
        orderId,
        printedAt: new Date().toISOString(),
        printerIP: null,
      };

      this.lastResult = ack;
      return ack;
    }

    logger.info(`🖨️ Imprimindo pedido #${orderId}`);

    // Normalizações defensivas
    if (!Array.isArray(order.items)) order.items = [];
    if (typeof order.subtotal !== "number") order.subtotal = 0;
    if (typeof order.deliveryFee !== "number") order.deliveryFee = 0;
    if (typeof order.total !== "number") order.total = 0;

    try {
      formatOrderPrint(this.printer, order);

      await this.printer.execute();

      const ack = {
        success: true,
        simulated: false,
        orderId,
        printedAt: new Date().toISOString(),
        printerIP: this.currentPrinterIP,
      };

      this.lastResult = ack;
      logger.info(`✅ Pedido #${orderId} impresso com sucesso`);
      return ack;
    } catch (err) {
      logger.error(`❌ Falha ao imprimir pedido #${orderId}: ${err.message}`);

      if (err.message?.includes("Timeout")) {
        this.isConnected = false;
        logger.warn("⛔ Impressora desconectada após timeout");
      }

      throw err;
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      printerIP: this.currentPrinterIP,
      availablePrinters: this.availablePrinters,
      queueLength: this.printQueue.length,
      isPrinting: this.isPrinting,
      lastResult: this.lastResult || null,
    };
  }

  clearQueue() {
    const cleared = this.printQueue.length;
    this.printQueue = [];
    logger.info(`🧹 Fila limpa: ${cleared} pedidos removidos`);
    return { cleared };
  }

  async testPrint() {
    try {
      const testOrder = {
        id: "TEST-" + Date.now(),
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

      logger.info("🧪 Iniciando teste de impressão...");
      const result = await this.doPrint(testOrder);

      return {
        success: true,
        testId: testOrder.id,
        printerIP: this.currentPrinterIP,
        simulated: result.simulated,
      };
    } catch (error) {
      logger.error("❌ Teste de impressão falhou:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PrinterManager;
