# 📖 Documentação Técnica: Agente de Impressão Rangooo

Este projeto é um agente local desenvolvido em Electron que atua como ponte entre o servidor SaaS (via WebSockets) e as impressoras térmicas locais do restaurante (via Driver de Windows).

## 🛠️ Tecnologias Utilizadas

- **Runtime**: Node.js + Electron (Framework para apps desktop).

- **Comunicação**: `ws` (WebSockets) para receber pedidos em tempo real.

- **Persistência**: `electron-store` (Para salvar o ID do restaurante e o nome da impressora).

- **Logs**: `winston` (Gerenciamento de logs em arquivo e console).

- **Fallback**: `node-thermal-printer` (Utilizado para comandos ESC/POS diretos, porém o foco atual é o Driver nativo).

## 🏗️ Estrutura de Arquivos

### 1. Processo Principal (Backend / Main)

Gerencia o ciclo de vida do app e tem acesso direto ao hardware e SO.

- `main.js`: O coração do app. Gerencia janelas, atalhos, auto-update e as APIs de impressão do Electron (`webContents.print`).

- `server.js`: O "orquestrador". Ele inicia o motor do agente, recebe o ID do restaurante e gerencia a lógica de quando um pedido chega.

- `printer-manager.js`: Gerencia a fila de impressão. Tenta detectar impressoras e contém a lógica para decidir se imprime via biblioteca térmica ou se pede ajuda ao `main.js` (fallback).

- `ws-client.js`: Cliente WebSocket. Mantém a conexão viva com o SaaS, envia o "Hello" do agente e recebe os eventos de `print_order`.

### 2. Interface (Frontend / Renderer)

O que o usuário vê e onde as configurações são feitas.

- `index.html`: Interface principal onde o log aparece e onde o dono do restaurante seleciona a impressora e insere o Token.

- `renderer.js`: Lógica da interface. Captura cliques, atualiza os badges de status (Online/Offline) e exibe os logs em tempo real.

- `preload.js`: A ponte de segurança. Expõe funções específicas do Node/Electron para o Frontend de forma segura (Context Isolation).

### 3. Templates e Serviços

- `print.html`: O arquivo mais importante agora. É o template do cupom. Ele recebe os dados do pedido via URL, monta a tabela de itens em HTML e é "fotografado" pelo Electron para ser enviado à impressora.

- `format-order-print.js`: Serviço auxiliar que formata o texto bruto para a biblioteca de impressão térmica (ESC/POS).

## 🔄 Fluxo de um Pedido (Lifecycle)

1. **Conexão**: O `ws-client.js` conecta no servidor com o `restaurantId`.

2. **Recebimento**: O servidor SaaS envia um JSON via WebSocket.

3. **Processamento**: O `server.js` captura esse JSON e envia para o `printer-manager.js`.

4. **Renderização**: O app abre o `print.html` em uma janela invisível, injetando os dados do pedido.

5. **Impressão**: O `main.js` comanda o driver do Windows para imprimir aquela janela na impressora selecionada.

6. **Confirmação**: O `ws-client.js` envia um ACK (`print_done`) de volta para o SaaS para marcar o pedido como impresso.

## ⚠️ Regras implícitas

- **Tratamento de Números**: Sempre usar `Number(valor).toFixed(2)` no template de impressão. O JSON pode vir com strings.

- **Impressão Silenciosa**: O comando de impressão deve ser sempre `{ silent: true }` para não abrir o diálogo do Windows no meio da cozinha.

- **Portas USB**: Evite pacotes nativos que exigem compilação (C++). Prefira a API de impressão do Electron que usa o Spooler do Windows, pois é compatível com qualquer marca de impressora (GoldenSky, Elgin, Bematech).
