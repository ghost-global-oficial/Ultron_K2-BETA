# Keyboard Key Mapping

Este documento descreve o mapeamento de teclas usado pelo sistema Computer Use.

## Teclas Suportadas

### Letras
- `a` a `z` (minúsculas são automaticamente convertidas)

### Números
- `0` a `9`

### Teclas Especiais
- `Enter` / `Return` → Enter
- `Tab` → Tab
- `Space` / `Spacebar` → Espaço
- `Backspace` / `Back` → Backspace
- `Delete` / `Del` → Delete
- `Escape` / `Esc` → Escape

### Setas
- `Up` / `ArrowUp` → Seta para cima
- `Down` / `ArrowDown` → Seta para baixo
- `Left` / `ArrowLeft` → Seta para esquerda
- `Right` / `ArrowRight` → Seta para direita

### Modificadores
- `Shift` / `LeftShift` / `RightShift`
- `Control` / `Ctrl` / `LeftControl` / `RightControl`
- `Alt` / `LeftAlt` / `RightAlt`
- `Command` / `Cmd` / `Meta` (macOS)
- `Win` / `Windows` (Windows)

### Teclas de Função
- `F1` a `F12`

### Navegação
- `Home` → Início
- `End` → Fim
- `PageUp` / `PgUp` → Page Up
- `PageDown` / `PgDown` → Page Down
- `Insert` / `Ins` → Insert

### Outras
- `CapsLock` / `Caps` → Caps Lock
- `NumLock` → Num Lock
- `ScrollLock` → Scroll Lock
- `Pause` → Pause
- `PrintScreen` / `Print` / `PrtSc` → Print Screen

## Uso na IA

A IA deve usar os nomes das teclas conforme listado acima. O sistema automaticamente normaliza e mapeia variações comuns.

### Exemplos

```json
{ "type": "key", "key": "Enter" }
{ "type": "key", "key": "Tab" }
{ "type": "key", "key": "Escape" }
{ "type": "key", "key": "a" }
```

## Implementação

O mapeamento é feito no `InputController.mapKeyName()` que:
1. Normaliza o nome da tecla (lowercase, trim)
2. Busca no mapa de aliases
3. Tenta lookup direto no enum Key do nut-js
4. Retorna a string original como fallback
