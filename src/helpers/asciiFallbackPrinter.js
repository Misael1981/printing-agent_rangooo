function stripAccents(str) {
  if (typeof str !== "string") return str;
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "C");
}

function wrapPrinterWithAsciiFallback(printer, enabled) {
  if (!enabled) return printer;

  return new Proxy(printer, {
    get(target, prop) {
      const original = target[prop];
      if (typeof original !== "function") return original;

      if (prop === "println") {
        return (text) => original.call(target, stripAccents(text));
      }

      if (prop === "tableCustom") {
        return (columns) =>
          original.call(
            target,
            columns.map((col) => ({ ...col, text: stripAccents(col.text) })),
          );
      }

      return original.bind(target);
    },
  });
}

module.exports = { wrapPrinterWithAsciiFallback };
