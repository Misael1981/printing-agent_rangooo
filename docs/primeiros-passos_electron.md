# Electron.js

Este documento serve como guia de referência para a criação de aplicações desktop utilizando tecnologias web (HTML, CSS e JavaScript).

## 1. O que é o Electron?

O Electron é um framework que permite criar aplicativos desktop cross-platform. Ele combina o motor do **Chromium** (para a interface) com o **Node.js** (para acessar recursos do sistema operacional).

## 2. Pré-requisitos

Antes de começar, é necessário ter o Node.js e o NPM instalados.

- Verifique a versão do Node: node -v

- Verifique a versão do NPM: npm -v

## 3. Inicializando o Projeto

Existem duas formas de começar o arquivo de configuração `package.json`:

1. **Automática**: Execute `npm init -y` para gerar um arquivo padrão.

2. **Instalação do Electron**: Execute o comando abaixo para baixar o framework como dependência:

```
npm install electron
```

## 4. Estrutura do `package.json`

Para o projeto rodar, o arquivo `package.json` precisa ter a chave `main` (apontando para o arquivo principal) e o script de `start`.

### Exemplo ideal:

```
{
  "name": "meu-app-electron",
  "version": "1.0.0",
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  },
  "dependencies": {
    "electron": "^33.0.0"
  }
}
```

## 5. O Arquivo Principal (`main.js`)

Este é o "cérebro" do app. Ele controla o ciclo de vida da aplicação e cria as janelas.

### Estrutura básica:

```
const { app, BrowserWindow } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
  });

  // Para carregar um site externo:
  // win.loadURL('https://google.com');

  // Para carregar um arquivo local:
  win.loadFile('index.html');
}

// Inicializa a janela quando o Electron estiver pronto
app.whenReady().then(createWindow);
```

## 6. A Interface (`index.html`)

O Electron renderiza arquivos HTML comuns. Você pode estilizar com CSS normalmente.

```
<!DOCTYPE html>
<html>
<head>
    <title>Meu App</title>
</head>
<body>
    <h1>Olá Mundo!</h1>
</body>
</html>
```

## 7. Comandos Úteis

- `npm start`: Inicia a aplicação.

- `Ctrl + R` (com a janela aberta): Atualiza a interface (Refresh) sem precisar reiniciar o terminal.

- `Flag -g`: Significa "Global". Evitamos usar no Electron para que cada projeto tenha sua própria versão independente.

## `npx electron .`
