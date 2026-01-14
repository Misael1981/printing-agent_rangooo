// networkScanner.js
const net = require("net");
const os = require("os");

function getSubnet() {
  const ifaces = os.networkInterfaces();
  for (const i of Object.values(ifaces)) {
    for (const iface of i) {
      if (iface.family === "IPv4" && !iface.internal)
        return iface.address.split(".").slice(0, 3).join(".");
    }
  }
}

async function scanNetwork() {
  const subnet = getSubnet();
  const results = [];

  await Promise.all(
    Array.from({ length: 254 }, (_, i) =>
      scanPrinter(`${subnet}.${i + 1}`).then((p) => p && results.push(p))
    )
  );

  return results;
}

function scanPrinter(ip) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(300);

    socket.connect(9100, ip, () => {
      socket.destroy();
      resolve({
        type: "network",
        ip,
        label: `Impressora térmica (${ip})`,
      });
    });

    socket.on("error", () => resolve(null));
    socket.on("timeout", () => resolve(null));
  });
}

module.exports = scanNetwork;
