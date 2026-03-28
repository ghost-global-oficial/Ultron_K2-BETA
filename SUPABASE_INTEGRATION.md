# Integração Supabase - ULTRON

## Visão Geral

O ULTRON agora utiliza Supabase como backend seguro para armazenar:
- Tokens OAuth (GitHub, Google, Microsoft, etc.)
- Credenciais de serviços (Computer Use)
- Configurações de Webhooks
- API Keys (Gemini, OpenAI, etc.)

## Configuração

### 1. Executar Script SQL no Supabase

1. Acesse o [Supabase Dashboard](https://app.supabase.com)
2. Selecione seu projeto: `iskzruvdeqegerhphyec`
3. Vá em **SQL Editor**
4. Copie e cole o conteúdo do arquivo `supabase-setup.sql`
5. Execute o script (botão "Run")

### 2. Instalar Dependências

```bash
npm install
```

Isso instalará o `@supabase/supabase-js` necessário.

### 3. Migrar Dados Existentes (Opcional)

Se você já tem dados no localStorage, execute:

```bash
npm run migrate-to-supabase
```

Este script irá:
- Ler dados do localStorage
- Encriptar informações sensíveis
- Enviar para o Supabase
- Limpar localStorage após sucesso

## Estrutura de Dados

### Tabela: oauth_tokens
Armazena tokens OAuth de integrações.

```typescript
{
  id: UUID,
  user_id: string,
  service: string,
  provider: string,
  access_token: string (encrypted),
  refresh_token: string (encrypted),
  expires_at: number,
  token_type: string,
  scope: string,
  config: JSON,
  user_info: JSON,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Tabela: service_credentials
Armazena credenciais de serviços (Computer Use).

```typescript
{
  id: UUID,
  user_id: string,
  service: string,
  email: string,
  password_encrypted: string,
  extra: JSON,
  session_id: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Tabela: webhooks
Configurações de webhooks.

```typescript
{
  id: UUID,
  user_id: string,
  name: string,
  url: string,
  method: string,
  service: string,
  events: string[],
  headers: JSON,
  enabled: boolean,
  last_triggered: timestamp,
  trigger_count: number,
  created_at: timestamp,
  updated_at: timestamp
}
```

### Tabela: api_keys
API keys encriptadas.

```typescript
{
  id: UUID,
  user_id: string,
  service: string,
  key_encrypted: string,
  metadata: JSON,
  created_at: timestamp,
  updated_at: timestamp
}
```

## Segurança

### Encriptação
- Todos os tokens e senhas são encriptados antes de serem enviados ao Supabase
- Utiliza AES-256-GCM com chaves derivadas via PBKDF2
- A chave de encriptação é armazenada localmente (nunca enviada ao Supabase)

### Row Level Security (RLS)
- Todas as tabelas têm RLS habilitado
- Políticas configuradas para permitir acesso apenas aos dados do próprio usuário
- Para desenvolvimento, as políticas estão abertas (ajuste para produção)

### User ID
- Cada instalação do ULTRON tem um `user_id` único
- Baseado no hostname da máquina
- Pode ser customizado conforme necessário

## MCP Server

O arquivo `.kiro/settings/mcp.json` contém as credenciais do Supabase e está protegido:
- Adicionado ao `.gitignore`
- Nunca será commitado ao repositório
- Permite interação direta com o Supabase via MCP

### Comandos MCP Disponíveis
- `supabase_query`: Consultar dados
- `supabase_insert`: Inserir dados
- `supabase_update`: Atualizar dados
- `supabase_delete`: Deletar dados

## Uso no Código

### OAuth Store

```typescript
import { 
  saveConnection, 
  listConnections, 
  getConnectionByService,
  updateToken,
  deleteConnection 
} from './supabase/oauth-store-supabase';

// Salvar conexão OAuth
await saveConnection({
  service: 'github-main',
  provider: 'github',
  token: { access_token: '...', ... },
  config: { client_id: '...' }
});

// Listar conexões
const connections = await listConnections();

// Obter conexão específica
const conn = await getConnectionByService('github-main');

// Atualizar token
await updateToken('github-main', newToken);

// Deletar conexão
await deleteConnection(connectionId);
```

### Credentials Store

```typescript
import {
  createOrUpdateCredentials,
  readCredentials,
  deleteCredentials,
  hasCredentials
} from './supabase/credentials-store-supabase';

// Salvar credenciais
await createOrUpdateCredentials(
  'instagram',
  'user@example.com',
  'password123',
  { extra: 'data' }
);

// Ler credenciais
const creds = await readCredentials('instagram');

// Verificar se existem credenciais
const exists = await hasCredentials('instagram');

// Deletar credenciais
await deleteCredentials('instagram');
```

### Webhook Store

```typescript
import {
  saveWebhook,
  listWebhooks,
  getWebhook,
  deleteWebhook,
  listWebhooksByService
} from './supabase/webhook-store-supabase';

// Salvar webhook
const webhookId = await saveWebhook({
  name: 'Task Completed',
  url: 'https://api.example.com/webhook',
  method: 'POST',
  service: 'tasks',
  events: ['task.completed'],
  enabled: true
});

// Listar webhooks
const webhooks = await listWebhooks();

// Listar por serviço
const taskWebhooks = await listWebhooksByService('tasks');
```

## Manutenção

### Limpar Tokens Expirados

Execute no Supabase SQL Editor:

```sql
SELECT cleanup_expired_tokens();
```

### Backup

O Supabase faz backups automáticos, mas você pode exportar dados:

```sql
-- Exportar oauth_tokens
COPY (SELECT * FROM oauth_tokens) TO '/tmp/oauth_tokens_backup.csv' CSV HEADER;
```

## Troubleshooting

### Erro: "Failed to save connection"
- Verifique se o script SQL foi executado
- Confirme que as credenciais do Supabase estão corretas
- Verifique logs no Supabase Dashboard > Logs

### Erro: "Encryption failed"
- Verifique se a chave de encriptação está configurada
- Execute `npm run init-credentials` se necessário

### Dados não aparecem no Supabase
- Verifique se o `user_id` está correto
- Confirme que as políticas RLS estão configuradas
- Use o SQL Editor para consultar diretamente: `SELECT * FROM oauth_tokens;`

## Próximos Passos

1. ✅ Executar script SQL no Supabase
2. ✅ Instalar dependências (`npm install`)
3. ⏳ Migrar dados existentes (`npm run migrate-to-supabase`)
4. ⏳ Testar funcionalidades OAuth
5. ⏳ Configurar políticas RLS para produção
6. ⏳ Implementar backup automático

## Recursos

- [Supabase Dashboard](https://app.supabase.com/project/iskzruvdeqegerhphyec)
- [Supabase Docs](https://supabase.com/docs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/introduction)
