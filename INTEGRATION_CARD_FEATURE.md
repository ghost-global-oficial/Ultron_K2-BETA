# Funcionalidade de Card de Integração

## Visão Geral

Esta funcionalidade adiciona um card interativo que é exibido quando o usuário clica em uma integração no menu de integrações (botão com ícone de puzzle).

## Componentes

### 1. Integration Card Component (`src/components/integration-card.ts`)

Componente Lit que exibe os detalhes de uma integração e permite ao usuário conectar ou desconectar.

**Propriedades:**
- `integration`: Objeto com informações da integração (nome, descrição, ícone, status, etc.)
- `isConnecting`: Estado de carregamento durante a conexão

**Eventos:**
- `close`: Disparado quando o usuário fecha o card
- `integration-connected`: Disparado quando a integração é conectada com sucesso
- `integration-disconnected`: Disparado quando a integração é desconectada

**Funcionalidades:**
- Exibe informações detalhadas da integração
- Mostra lista de recursos disponíveis
- Botão de conectar que inicia o fluxo OAuth (se aplicável)
- Botão de desconectar para integrações já conectadas
- Animações suaves de entrada/saída

### 2. Modificações no App Root (`src/app-root.ts`)

**Novos Estados:**
- `selectedIntegration`: Armazena a integração selecionada para exibir no card

**Novos Métodos:**
- `openIntegrationCard(integration)`: Abre o card com a integração selecionada
- `closeIntegrationCard()`: Fecha o card de integração
- `handleIntegrationConnected(e)`: Manipula o evento de conexão bem-sucedida
- `handleIntegrationDisconnected(e)`: Manipula o evento de desconexão

**Modificações no Menu de Integrações:**
- Cada item do menu agora tem um evento `@click` que abre o card
- As integrações foram expandidas com informações adicionais (descrição, recursos, provider OAuth)

## Fluxo de Uso

1. Usuário clica no botão de puzzle na barra de input
2. Menu de integrações é exibido
3. Usuário clica em uma integração
4. Card de integração é exibido com detalhes
5. Usuário clica em "Conectar"
6. Se for uma integração OAuth:
   - O método `initiateOAuth()` é chamado
   - Uma janela popup é aberta com a URL de autorização do provider
   - Após autorização, o callback é processado
7. Se não for OAuth:
   - Simula uma conexão (pode ser expandido conforme necessário)
8. Card é fechado e integração é marcada como conectada

## Integrações Suportadas

### Com OAuth:
- **GitHub** (`provider: 'github'`)
- **Gmail** (`provider: 'google'`)
- **Outlook Mail** (`provider: 'microsoft'`)

### Sem OAuth (customizáveis):
- **O Meu Navegador** - Controle do navegador
- **Supabase** - Backend como serviço
- **Instagram** (Beta) - Gestão de redes sociais

## Próximos Passos

1. Implementar persistência do estado de conexão das integrações
2. Adicionar mais providers OAuth (Slack, Notion, etc.)
3. Implementar funcionalidades específicas para cada integração
4. Adicionar testes de configuração de OAuth
5. Melhorar feedback visual durante o processo de conexão
6. Adicionar opção de reconexão para tokens expirados

## Estrutura de Dados

```typescript
interface IntegrationInfo {
  id: string;                    // Identificador único
  name: string;                  // Nome da integração
  description: string;           // Descrição detalhada
  icon: any;                     // Ícone Lucide
  iconColor?: string;            // Cor do ícone (classe Tailwind)
  connected: boolean;            // Status de conexão
  hasToggle?: boolean;           // Se tem toggle no menu
  badge?: string;                // Badge (ex: "Beta")
  features?: string[];           // Lista de recursos
  provider?: OAuthProviderName;  // Provider OAuth (se aplicável)
}
```

## Notas Técnicas

- O componente usa Lit Element para reatividade
- Estilos são definidos com CSS-in-JS
- Animações são feitas com CSS animations
- O card é renderizado como um overlay modal
- Eventos são propagados usando Custom Events do DOM
