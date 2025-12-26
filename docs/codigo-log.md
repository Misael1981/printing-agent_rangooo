```
// Exemplo de como alimentar esse Log
window.api.aoReceberStatus((event, status) => {
  const logContainer = document.querySelector('.log-container'); // ajuste a classe
  const novaLinha = document.createElement('p');
  novaLinha.innerText = `[${new Date().toLocaleTimeString()}] - ${status}`;
  logContainer.appendChild(novaLinha);

  // Auto-scroll para o final
  logContainer.scrollTop = logContainer.scrollHeight;
});
```
