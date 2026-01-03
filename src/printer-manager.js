const { ThermalPrinter, PrinterTypes } = require("node-thermal-printer");
const winston = require("winston");
const path = require("path");
const fs = require("fs");
const formatOrderPrint = require("./services/format-order-print.js");

// Configurar logs
const logDir = path.join(process.cwd(), "logs");

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
    this.printQueue = [];
    this.isPrinting = false;
    this.init();
  }

  async init() {
    try {
      const type = process.env.PRINTER_TYPE || "EPSON";
      const interfaceParam = process.env.PRINTER_INTERFACE || "AUTO";

      this.printer = new ThermalPrinter({
        type: PrinterTypes[type] || PrinterTypes.EPSON,
        interface: interfaceParam,
        characterSet: "PC860_PORTUGUESE",
        removeSpecialCharacters: false,
        lineCharacter: "=",
        options: {
          timeout: 5000,
        },
      });

      // Tenta detectar automaticamente a interface
      if (interfaceParam === "AUTO") {
        await this.autoDetectInterface();
      } else {
        this.isConnected = await this.printer.isPrinterConnected();
      }

      if (this.isConnected) {
        logger.info(`Impressora conectada via ${this.printer.interface}`);
      } else {
        logger.warn("Impressora não detectada. Usando modo simulação.");
      }
    } catch (error) {
      logger.error("Erro ao inicializar impressora:", error);
    }
  }

  async autoDetectInterface() {
    logger.info("🕵️ Iniciando Varredura Universal de Impressoras...");

    // 1. Tentar detectar via Spooler do Windows (Para USB Plug&Play)
    try {
      const printer = require("node-printer");
      const printers = printer.getPrinters();

      // Procura por nomes comuns de impressoras térmicas
      const thermal = printers.find(
        (p) =>
          p.name.toUpperCase().includes("POS") ||
          p.name.toUpperCase().includes("PRINTER") ||
          p.name.toUpperCase().includes("XPRINTER")
      );

      if (thermal) {
        this.printer.interface = `printer:${thermal.name}`;
        this.isConnected = await this.printer.isPrinterConnected();
        if (this.isConnected) {
          logger.info(`✅ Detectada via Spooler: ${thermal.name}`);
          return;
        }
      }
    } catch (e) {
      logger.warn("Spooler indisponível, tentando portas seriais...");
    }

    // 2. Tentar detectar via Portas Seriais (USB-Serial e COM)
    const interfaces = [
      "USB001",
      "USB002",
      "COM1",
      "COM2",
      "COM3",
      "COM4",
      "LPT1",
    ];

    for (const iface of interfaces) {
      try {
        this.printer.interface = iface;
        // Pequeno hack: algumas impressoras precisam de um "ping" real
        const connected = await this.printer.isPrinterConnected();

        if (connected) {
          this.isConnected = true;
          logger.info(`✅ Detectada via Porta Física: ${iface}`);
          return;
        }
      } catch (err) {
        continue;
      }
    }

    // 3. Fallback: Se nada funcionar, avisar o usuário
    this.isConnected = false;
    logger.error("❌ Nenhuma impressora encontrada automaticamente.");
  }

  async processQueue() {
    if (this.printQueue.length === 0) {
      this.isPrinting = false;
      return;
    }

    this.isPrinting = true;
    const order = this.printQueue.shift();

    try {
      // 🚨 CORREÇÃO CRÍTICA: Removida impressão duplicada
      // Chamamos apenas doPrint() que contém toda lógica
      const result = await this.doPrint(order);

      // 🔹 ACK mais rico (melhoria implementada)
      const ack = {
        success: true,
        orderId: order.id,
        printedAt: new Date().toISOString(),
        printerInterface: this.printer?.interface || "simulated",
        simulated: result.simulated || false,
      };

      logger.info(`✅ Pedido #${order.id} finalizado`, ack);
      this.lastResult = ack;
    } catch (err) {
      logger.error(`❌ Erro na impressão #${order.id}:`, err);
      return {
        success: false,
        orderId: order.id,
        error: err.message,
      };
    } finally {
      // Processa próximo item com delay para "respirar"
      if (this.printQueue.length > 0) {
        setTimeout(() => this.processQueue(), 1000);
      } else {
        this.isPrinting = false;
      }
    }
  }

  async doPrint(order) {
    if (!this.isConnected) {
      logger.warn(`📋 Modo simulação - Pedido #${order.id} não impresso`);
      return { success: true, simulated: true };
    }

    logger.info(`🖨️ Imprimindo pedido #${order.id}`);

    try {
      const printPromise = (async () => {
        formatOrderPrint(this.printer, order);
        return this.printer.execute();
      })();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Timeout de impressão (5s)")), 5000);
      });

      await Promise.race([printPromise, timeoutPromise]);

      return { success: true };
    } catch (error) {
      if (error.message.includes("Timeout")) {
        logger.error(`⏰ Timeout na impressão #${order.id}`);
      }
      throw error;
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      interface: this.printer?.interface,
      queueLength: this.printQueue.length,
      isPrinting: this.isPrinting,
      lastUpdate: new Date().toISOString(),
    };
  }

  // 🔹 MÉTODO ADICIONAL: Limpar fila
  clearQueue() {
    const cleared = this.printQueue.length;
    this.printQueue = [];
    logger.info(`🧹 Fila limpa: ${cleared} pedidos removidos`);
    return { cleared };
  }

  // 🔹 MÉTODO ADICIONAL: Testar impressora
  async testPrint() {
    try {
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

      logger.info("🧪 Iniciando teste de impressão...");
      const result = await this.doPrint(testOrder);

      return {
        success: true,
        testId: testOrder.id,
        printerInterface: this.printer?.interface,
        simulated: result.simulated || false,
      };
    } catch (error) {
      logger.error("❌ Teste de impressão falhou:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = PrinterManager;
