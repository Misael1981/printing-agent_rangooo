const { ThermalPrinter, PrinterTypes } = require("node-thermal-printer");
const winston = require("winston");
const path = require("path");
const fs = require("fs");
const formatOrderPrint = require("./services/format-order-print.js");
const Store = require("electron-store");
const appStore = new Store();

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

      // Guardar configuração para podermos reinstanciar com a interface correta
      this.printerConfig = {
        type: PrinterTypes[type] || PrinterTypes.EPSON,
        interface: interfaceParam,
        characterSet: "PC860_PORTUGUESE",
        removeSpecialCharacters: false,
        lineCharacter: "=",
        options: {
          timeout: 5000,
        },
      };

      // Instancia a impressora com a config atual
      this.printer = new ThermalPrinter(this.printerConfig);

      // Tenta detectar automaticamente a interface (reinstancia se encontrar)
      if (interfaceParam === "AUTO") {
        // Se existe uma impressora salva na configuração, tente aplicá-la primeiro
        try {
          const saved = appStore.get("printerName");
          if (saved) {
            const iface = `printer:${saved}`;
            this.printer = new ThermalPrinter({
              ...this.printerConfig,
              interface: iface,
            });
            try {
              this.isConnected = await this.printer.isPrinterConnected();
            } catch (e) {
              this.isConnected = false;
            }

            if (this.isConnected) {
              logger.info(`✅ Impressora salva detectada: ${saved}`);
              return;
            } else {
              logger.warn(
                `Impressora salva "${saved}" não respondeu. Prosseguindo com detecção automática.`
              );
            }
          }
        } catch (e) {
          logger.debug("Erro ao verificar impressora salva:", e.message || e);
        }

        await this.autoDetectInterface();
      } else {
        try {
          this.isConnected = await this.printer.isPrinterConnected();
        } catch (e) {
          logger.warn("Falha ao checar conexão da impressora:", e.message || e);
          this.isConnected = false;
        }
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
      // Suporte a dois módulos populares: 'printer' e 'node-printer'
      let spoolerModule = null;
      let printers = [];

      try {
        spoolerModule = require("printer");
      } catch (firstErr) {
        try {
          spoolerModule = require("node-printer");
        } catch (secondErr) {
          throw secondErr;
        }
      }

      // Alguns módulos expõem getPrinters, outros listPrinters
      if (typeof spoolerModule.getPrinters === "function") {
        printers = spoolerModule.getPrinters();
      } else if (typeof spoolerModule.listPrinters === "function") {
        printers = spoolerModule.listPrinters();
      }

      if (!Array.isArray(printers)) printers = [];

      logger.info(
        `Spooler disponível: ${printers.length} impressora(s) listadas`
      );
      logger.debug(
        `Lista de impressoras do sistema: ${JSON.stringify(printers)}`
      );

      // Procura por nomes comuns de impressoras térmicas
      const thermal = printers.find((p) => {
        const name = (p.name || p.PrinterName || p.name || "")
          .toString()
          .toUpperCase();
        return (
          name.includes("POS") ||
          name.includes("PRINTER") ||
          name.includes("XPRINTER")
        );
      });

      if (thermal) {
        const thermalName = thermal.name || thermal.PrinterName || thermal;
        const iface = `printer:${thermalName}`;
        // Reinstancia para garantir que a interface seja aplicada corretamente
        this.printer = new ThermalPrinter({
          ...this.printerConfig,
          interface: iface,
        });
        try {
          this.isConnected = await this.printer.isPrinterConnected();
        } catch (e) {
          this.isConnected = false;
        }
        if (this.isConnected) {
          logger.info(`✅ Detectada via Spooler: ${thermalName}`);
          return;
        }
      }
    } catch (e) {
      logger.warn(
        "Spooler indisponível ou falha ao listar impressoras, tentando portas seriais..."
      );
      logger.debug(`Erro ao acessar o spooler: ${e.message || e}`);
    }

    // 2. Fallback: tentar listar impressoras via API do Electron (se estivermos no processo principal)
    try {
      const { BrowserWindow } = require("electron");
      const wins = BrowserWindow.getAllWindows();

      if (wins && wins.length > 0) {
        const printers = await wins[0].webContents.getPrintersAsync();
        logger.info(
          `Electron API: ${printers.length} impressora(s) listadas via webContents.getPrintersAsync()`
        );
        logger.debug(
          `Lista de impressoras (Electron): ${JSON.stringify(printers)}`
        );

        const thermal = printers.find((p) => {
          const name = (p.name || p.displayName || "").toString().toUpperCase();
          return (
            name.includes("POS") ||
            name.includes("PRINTER") ||
            name.includes("XPRINTER")
          );
        });

        if (thermal) {
          const thermalName = thermal.name || thermal.displayName || thermal;
          const iface = `printer:${thermalName}`;
          this.printer = new ThermalPrinter({
            ...this.printerConfig,
            interface: iface,
          });
          try {
            this.isConnected = await this.printer.isPrinterConnected();
          } catch (e) {
            this.isConnected = false;
          }

          if (this.isConnected) {
            logger.info(`✅ Detectada via Electron Print API: ${thermalName}`);
            return;
          }
        }
      } else {
        logger.debug(
          "Nenhuma janela do BrowserWindow disponível para listar impressoras via Electron."
        );
      }
    } catch (err) {
      logger.debug(
        `Erro ao listar impressoras via Electron: ${err.message || err}`
      );
    }

    // 3.  Tentar detectar via Portas Seriais (USB-Serial e COM)
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
        // Reinstancia a impressora usando a interface candidata
        this.printer = new ThermalPrinter({
          ...this.printerConfig,
          interface: iface,
        });
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
      // Se não houver conexão, tentar fallback via Electron (se configurado) antes de simular
      logger.warn(
        `⚠️ Impressora não conectada. Tentando fallback via Electron para pedido #${orderId}`
      );

      if (this.electronPrinterName) {
        try {
          logger.info(
            `🔁 Tentando imprimir via Electron: ${this.electronPrinterName}`
          );
          const electronResult = await this.printViaElectron(
            order,
            this.electronPrinterName
          );

          // Enriquecer resultado com metadados esperados
          const res = Object.assign({}, electronResult, {
            orderId,
            printedAt: new Date().toISOString(),
            printerInterface: this.electronPrinterName,
            via: "electron",
          });

          this.lastResult = res;
          logger.info(`✅ Pedido #${orderId} impresso via Electron`);
          return res;
        } catch (e) {
          logger.warn(
            `❌ Falha ao imprimir via Electron: ${
              e.message || e
            }. Caindo para modo simulação.`
          );
        }
      }

      logger.warn(
        `⚠️ Impressora não conectada. Simulando impressão do pedido #${orderId}`
      );

      const ack = {
        success: true,
        simulated: true,
        orderId,
        printedAt: new Date().toISOString(),
        printerInterface: this.printer?.interface || null,
        via: "simulated",
      };

      this.lastResult = ack;
      logger.info(`⚠️ Pedido #${orderId} simulado (não impresso fisicamente)`);
      return ack;
    }

    logger.info(`🖨️ Iniciando impressão do pedido #${orderId}`);

    // Normalizações defensivas
    if (!Array.isArray(order.items)) order.items = [];
    if (typeof order.subtotal !== "number") order.subtotal = 0;
    if (typeof order.deliveryFee !== "number") order.deliveryFee = 0;
    if (typeof order.total !== "number") order.total = 0;

    try {
      formatOrderPrint(this.printer, order);

      const execPromise = this.printer.execute();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout de impressão (5s)")), 5000)
      );

      const execResult = await Promise.race([execPromise, timeoutPromise]);

      if (execResult === false) {
        throw new Error("Execução da impressora retornou false");
      }

      const ack = {
        success: true,
        simulated: false,
        orderId,
        printedAt: new Date().toISOString(),
        printerInterface: this.printer.interface,
        via: "escpos",
      };

      this.lastResult = ack;

      logger.info(`✅ Pedido #${orderId} impresso com sucesso`);
      return ack;
    } catch (err) {
      logger.error(
        `❌ Falha ao imprimir pedido #${orderId}: ${err.message || err}`
      );

      if (err.message?.includes("Timeout")) {
        this.isConnected = false;
        logger.warn("⛔ Impressora marcada como desconectada após timeout");
      }

      throw err;
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      interface: this.printer?.interface,
      queueLength: this.printQueue.length,
      isPrinting: this.isPrinting,
      lastResult: this.lastResult || null,
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

  async printViaElectron(order, printerName) {
    return new Promise(async (resolve, reject) => {
      try {
        let BrowserWindow;
        try {
          ({ BrowserWindow } = require("electron"));
        } catch (e) {
          return reject(new Error("Electron não disponível no contexto atual"));
        }

        const printWindow = new BrowserWindow({
          show: false,
          webPreferences: {
            sandbox: true,
          },
        });

        await printWindow.loadFile(path.join(__dirname, "views/print.html"), {
          query: {
            order: JSON.stringify(order),
          },
        });

        // Garantir que a janela seja fechada em qualquer caso
        const onDone = (result) => {
          try {
            if (!printWindow.isDestroyed()) printWindow.close();
          } catch (e) {}
          return result;
        };

        printWindow.webContents.print(
          {
            silent: true,
            deviceName: printerName,
            printBackground: true,
          },
          (success, errorType) => {
            onDone();

            if (!success) {
              return reject(new Error(errorType || "Falha ao imprimir"));
            }

            resolve({ success: true, simulated: false });
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  // Aplicar impressora salva (usada ao salvar via UI)
  async applySavedPrinter() {
    try {
      const saved = appStore.get("printerName");
      if (!saved) {
        logger.warn("Nenhuma impressora salva encontrada para aplicar.");
        return { success: false, message: "Nenhuma impressora salva" };
      }

      const candidates = [`printer:${saved}`, saved];
      let lastErr = null;

      for (const iface of candidates) {
        try {
          this.printer = new ThermalPrinter({
            ...this.printerConfig,
            interface: iface,
          });
          try {
            this.isConnected = await this.printer.isPrinterConnected();
          } catch (e) {
            this.isConnected = false;
          }

          if (this.isConnected) {
            logger.info(
              `🔧 Aplicada impressora salva com sucesso: ${saved} via interface '${iface}'`
            );
            return {
              success: true,
              printer: saved,
              connected: true,
              interface: iface,
            };
          } else {
            logger.warn(`Tentativa com interface '${iface}' não respondeu.`);
          }
        } catch (e) {
          lastErr = e;
          logger.debug(
            `Falha ao tentar interface '${iface}': ${e.message || e}`
          );
          // Continua para próximo candidato
        }
      }

      // Se chegou aqui, nenhuma tentativa com ThermalPrinter funcionou
      logger.error(
        "Erro ao aplicar impressora salva:",
        lastErr ? lastErr.message || lastErr : "unk"
      );

      // Retornar informação útil: sugerir fallback para impressão via Electron
      // Também armazenar a informação na instância para que possamos tentar imprimir via Electron
      this.electronPrinterName = saved;
      this.fallbackElectron = true;

      return {
        success: false,
        error: lastErr
          ? lastErr.message || String(lastErr)
          : "Nenhuma interface funcionou",
        fallbackElectron: true,
        printer: saved,
      };
    } catch (err) {
      logger.error("Erro inesperado ao aplicar impressora salva:", err);
      return { success: false, error: err.message };
    }
  }
}

module.exports = PrinterManager;
