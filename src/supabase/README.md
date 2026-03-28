# Supabase Integration

Este diretório contém a integração completa do ULTRON com Supabase para armazenamento seguro de dados.

## 📁 Estrutura

```
src/supabase/
├── supabase-client.ts           # Cliente Supabase configurado
├── oauth-store-supabase.ts      # Store para tokens OAuth
├── credentials-store-supabase.ts # Store para credenciais de serviços
├── webhook-store-supabase.ts    # Store para webhooks
└── index.ts                     # Exportações centralizadas
```

## 🚀 Uso Rápido

### Importar

```typescript
import {
  getSupabaseClient,
  saveConnection,
  listConnections,
  createOrUpdateCredentials,
  readCredentials,
  saveWebhook,
  listWebhooks
} from './supabase';
```

### OAuth Tokens

```typescript
// Salvar token OAuth
await saveConnection({
  service: 'github-main',
  provider: 'github',
  token: {
    access_token: 'ghp_...',
    refresh_token: 'ghr_...',
    expires_at: Date.now() + 3600000,
    token_type: 'Bearer',
    scope: 'repo user'
  },
  config: {
    client_id: 'your-client-id'
  }
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

### Credenciais de Serviços

```typescript
// Salvar credenciais
await createOrUpdateCredentials(
  'instagram',
  'user@example.com',
  'password123',
  { extra: 'data' }
);

// Ler credenciais
const creds = await readCredentials('instagram');
console.log(creds.email); // user@example.com
console.log(creds.password); // password123 (desencriptado)

// Verificar se existem credenciais
const exists = await hasCredentials('instagram');

// Deletar credenciais
await deleteCredentials('instagram');

// Listar serviços
const services = await listServices();
```

### Webhooks

```typescript
// Criar webhook
const webhookId = await saveWebhook({
  name: 'Task Completed',
  url: 'https://api.example.com/webhook',
  method: 'POST',
  service: 'tasks',
  events: ['task.completed', 'task.failed'],
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  enabled: true
});

// Listar webhooks
const webhooks = await listWebhooks();

// Listar por serviço
const taskWebhooks = await listWebhooksByService('tasks');

// Obter webhook específico
const webhook = await getWebhook(webhookId);

// Atualizar webhook
await saveWebhook({
  id: webhookId,
  name: 'Task Completed (Updated)',
  // ... outros campos
});

// Deletar webhook
await deleteWebhook(webhookId);

// Incrementar contador de triggers
await incrementTriggerCount(webhookId);
```

## 🔐 Segurança

### Encriptação

Todos os dados sensíveis são encriptados antes de serem enviados ao Supabase:

- **Tokens OAuth**: `access_token` e `refresh_token`
- **Credenciais**: `password`
- **API Keys**: `key`

A encriptação usa:
- **Algoritmo**: AES-256-GCM
- **Derivação de chave**: PBKDF2
- **Salt**: Único por instalação
- **IV**: Único por encriptação

### Row Level Security (RLS)

Todas as tabelas têm RLS habilitado:

```sql
-- Exemplo de política
CREATE POLICY "Users can only access their own data"
ON oauth_tokens
FOR ALL
USING (user_id = current_user_id());
```

### User ID

Cada instalação do ULTRON tem um `user_id` único:

```typescript
const userId = getCurrentUserId();
// Retorna: "ultron-user-{hostname}"
```

## 📊 Tabelas

### oauth_tokens

Armazena tokens OAuth de integrações.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| user_id | TEXT | ID do usuário |
| service | TEXT | Nome do serviço |
| provider | TEXT | Provider OAuth |
| access_token | TEXT | Token de acesso (encriptado) |
| refresh_token | TEXT | Token de refresh (encriptado) |
| expires_at | BIGINT | Timestamp de expiração |
| token_type | TEXT | Tipo do token |
| scope | TEXT | Escopos autorizados |
| config | JSONB | Configurações |
| user_info | JSONB | Informações do usuário |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

### service_credentials

Armazena credenciais de serviços (Computer Use).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| user_id | TEXT | ID do usuário |
| service | TEXT | Nome do serviço |
| email | TEXT | Email/username |
| password_encrypted | TEXT | Senha encriptada |
| extra | JSONB | Dados extras |
| session_id | TEXT | ID da sessão |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

### webhooks

Configurações de webhooks.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| user_id | TEXT | ID do usuário |
| name | TEXT | Nome do webhook |
| url | TEXT | URL de destino |
| method | TEXT | Método HTTP |
| service | TEXT | Serviço associado |
| events | TEXT[] | Eventos que disparam |
| headers | JSONB | Headers HTTP |
| enabled | BOOLEAN | Ativo/inativo |
| last_triggered | TIMESTAMP | Último disparo |
| trigger_count | INTEGER | Contador de disparos |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

### api_keys

API keys encriptadas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | UUID | ID único |
| user_id | TEXT | ID do usuário |
| service | TEXT | Nome do serviço |
| key_encrypted | TEXT | Chave encriptada |
| metadata | JSONB | Metadados |
| created_at | TIMESTAMP | Data de criação |
| updated_at | TIMESTAMP | Data de atualização |

## 🛠️ Desenvolvimento

### Adicionar Nova Tabela

1. Adicionar SQL em `supabase-setup.sql`
2. Criar tipo em `supabase-client.ts`
3. Criar store em `src/supabase/{nome}-store-supabase.ts`
4. Exportar em `index.ts`

### Testar Localmente

```bash
# Testar conexão
npm run test-supabase

# Migrar dados
npm run migrate-to-supabase
```

## 📚 Recursos

- [Supabase Docs](https://supabase.com/docs)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## 🐛 Troubleshooting

Consulte `SUPABASE_INTEGRATION.md` na raiz do projeto para troubleshooting detalhado.
