# Supabase Edge Functions for ULTRON OAuth

Este diretório contém as Edge Functions do Supabase para gerenciamento de OAuth.

## Funções Disponíveis

### 1. oauth-start
Inicia o fluxo OAuth, gerando a URL de autorização.

### 2. oauth-callback
Processa o callback do OAuth e troca o código de autorização por um token de acesso.

### 3. oauth-refresh
Atualiza tokens de acesso expirados usando o refresh token.

### 4. oauth-proxy
Proxy para fazer requisições autenticadas para APIs de terceiros.

### 5. google-api-proxy
Proxy específico para APIs do Google (Gmail, Drive, Calendar, etc.)

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=seu_client_id_aqui
GOOGLE_CLIENT_SECRET=seu_client_secret_aqui

# GitHub OAuth
GITHUB_CLIENT_ID=seu_client_id_aqui
GITHUB_CLIENT_SECRET=seu_client_secret_aqui

# Microsoft OAuth
MICROSOFT_CLIENT_ID=seu_client_id_aqui
MICROSOFT_CLIENT_SECRET=seu_client_secret_aqui

# Slack OAuth
SLACK_CLIENT_ID=seu_client_id_aqui
SLACK_CLIENT_SECRET=seu_client_secret_aqui

# Supabase
SUPABASE_URL=sua_url_do_supabase
SUPABASE_ANON_KEY=seu_anon_key
SUPABASE_SERVICE_ROLE_KEY=seu_service_role_key
```

### Deploy das Funções

1. Instale a CLI do Supabase:
```bash
npm install -g supabase
```

2. Faça login:
```bash
supabase login
```

3. Deploy das funções:
```bash
# Navegue até o diretório da função
cd supabase/functions/oauth-start
supabase functions deploy oauth-start --project-ref seu-project-ref

# Repita para cada função
```

## Uso

### 1. Iniciar Fluxo OAuth
```javascript
// Iniciar fluxo OAuth
const response = await fetch('https://seu-projeto.supabase.co/functions/v1/oauth-start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'google',
    service: 'gmail',
    scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
    redirect_uri: 'http://localhost:3000/oauth/callback'
  })
});
```

### 2. Callback OAuth
```javascript
// O navegador redireciona para:
// https://seu-projeto.supabase.co/functions/v1/oauth-callback?code=CODE&state=STATE
```

### 3. Refresh Token
```javascript
const response = await fetch('https://seu-projeto.supabase.co/functions/v1/oauth-refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'google',
    refresh_token: 'seu_refresh_token'
  })
});
```

## Desenvolvimento Local

1. Instale o Supabase CLI
2. Configure as variáveis de ambiente
3. Execute localmente:
```bash
supabase functions serve --no-verify-jwt
```

## Segurança

- Todas as funções validam tokens JWT
- Validação de origens CORS
- Rate limiting implementado
- Logs de auditoria

## Monitoramento

- Logs disponíveis no Supabase Dashboard
- Métricas de uso disponíveis
- Alertas configuráveis