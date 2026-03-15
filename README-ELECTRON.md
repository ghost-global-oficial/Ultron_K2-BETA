# ULTRON AI Agent - Aplicação Desktop com Electron

Esta aplicação foi convertida para rodar como aplicação desktop usando Electron.

## 🚀 Como Executar

### Modo Desenvolvimento

```bash
npm run electron:dev
```

Este comando irá:
1. Iniciar o servidor Express com Vite
2. Aguardar o servidor estar pronto
3. Abrir a aplicação Electron

### Build para Produção

```bash
npm run electron:build
```

Isso irá gerar os instaladores na pasta `release/` para o seu sistema operacional.

## 📦 Estrutura do Projeto

```
.
├── electron/
│   ├── main.ts       # Processo principal do Electron
│   └── preload.ts    # Script de preload (bridge segura)
├── src/              # Código fonte da UI
├── server.ts         # Servidor Express backend
├── assets/           # Ícones da aplicação
└── dist-electron/    # Build do Electron (gerado)
```

## 🔧 Configuração

### Ícones da Aplicação

Coloque os ícones na pasta `assets/`:
- `icon.png` - 512x512px para Linux
- `icon.ico` - Para Windows
- `icon.icns` - Para macOS

### Variáveis de Ambiente

Crie um arquivo `.env` baseado no `.env.example`:

```bash
GEMINI_API_KEY=sua_chave_aqui
```

## 📝 Scripts Disponíveis

- `npm run dev` - Apenas servidor (modo web)
- `npm run electron:dev` - Aplicação Electron em desenvolvimento
- `npm run build` - Build da UI (Vite)
- `npm run build:electron` - Build do código Electron
- `npm run electron:build` - Build completo + geração de instaladores
- `npm run clean` - Limpar pastas de build

## 🎯 Targets de Build

O electron-builder está configurado para gerar:

- Windows: NSIS installer + versão portable
- macOS: DMG + ZIP
- Linux: AppImage + DEB

## 🔒 Segurança

A aplicação usa:
- `contextIsolation: true` - Isolamento de contexto
- `nodeIntegration: false` - Node.js desabilitado no renderer
- Preload script para expor APIs de forma segura

## 🐛 Troubleshooting

Se o Electron não abrir:
1. Verifique se a porta 3000 está livre
2. Aguarde alguns segundos para o servidor iniciar
3. Verifique os logs no terminal

Se o build falhar:
1. Execute `npm run clean`
2. Reinstale as dependências: `npm install`
3. Tente novamente
