## Passo 1: Builder

```
npm install electron-builder --save-dev
```

## Passo 2: Configure oupackage.json

```
"scripts": {
  "start": "electron .",
  "dist": "electron-builder"
},
"build": {
  "appId": "com.rangooo.agente",
  "productName": "Agente de Impressao Rangooo",
  "win": {
    "target": "nsis",
    "icon": "assets/icon.ico"
  }
}
```

## Passo 3: Gerar o novovel Basta rodar:

```
npm run dist
```
