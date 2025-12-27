const winston = require("winston");
const path = require("path");
const { app } = require("electron");

// No Windows instalado, isso aponta para: C:\Users\Nome\AppData\Roaming\Agente Rangooo\logs
const logDir = app.isPackaged
  ? path.join(app.getPath("userData"), "logs")
  : path.join(__dirname, "../../logs");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(
      ({ timestamp, level, message }) => `[${timestamp}] ${message}`
    )
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
    }),
    new winston.transports.Console(),
  ],
});

// Essa parte é vital para manter sua telinha atualizada!
logger.on("data", (log) => {
  if (global.mainWindow) {
    global.mainWindow.webContents.send("log-update", log.message);
  }
});

module.exports = logger;
