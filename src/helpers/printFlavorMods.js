function printFlavorMods(printer, flavor, indent = "   ") {
  const extras = flavor?.extras ?? [];
  const removed = flavor?.removed ?? [];

  if (extras.length > 0) {
    printer.bold(true);
    printer.println("Acrescentar");
    printer.bold(false);
    printer.setTextNormal();
    extras.forEach((ex) => printer.println(`${indent}+ ${ex}`));
  }

  if (removed.length > 0) {
    printer.bold(true);
    printer.println("Retirar");
    printer.bold(false);
    printer.setTextNormal();
    removed.forEach((rm) => printer.println(`${indent}- SEM ${rm}`));
  }

  if (extras.length > 0 || removed.length > 0) printer.newLine();
}

module.exports = { printFlavorMods };
