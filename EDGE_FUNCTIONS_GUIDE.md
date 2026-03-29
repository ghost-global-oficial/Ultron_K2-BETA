# Guia Completo: Edge Functions para OAuth com Supabase

## Visão Geral

Este guia descreve como usar as Edge Functions do Supabase para implementar fluxos OAuth seguros no projeto ULTRON.

## Estrutura Criada

### 1. Edge Functions Implementadas

#### 1.1 oauth-start
- **Propósito**: Inicia o fluxo OAuth
- **Endpoint**: `POST /functions/v1/oauth-start`
- **Entrada**: 
  ```json
  {
    "provider": "google|github|microsoft|slack",
    "service": "nome-do-servico",
    "scopes": ["scope1", "scope2"],
    "redirect_uri": "http://localhost:3000/callback"
  }
  ```
- **Saída**: URL de autorização, state, code_verifier

#### 1.2 oauth-callback
- **Propósito**: Processa callback OAuth
- **Endpoint**: `POST /functions/v1/oauth-callback`
- **Entrada**: 
  ```json
  {
    "code": "authorization_code",
    "state": "state_value",
    "code_verifier": "verifier_string"
  }
  ```
- **Saída**: Access token, refresh token, user info

#### 1.3 oauth-refresh
- **Propósito**: Atualizar tokens expirados
- **Endpoint**: `POST /functions/v1/oauth-refresh`
- **Entrada**:
  ```json
  {
    "refresh_token": "refresh_token",
    "provider": "google"
  }
  ```

#### 1.4 oauth-proxy
- **Propósito**: Proxy para APIs de terceiros
- **Endpoint**: `POST /functions/v1/oauth-proxy`
- **Entrada**:
  ```json
  {
    "method": "GET|POST|PUT|DELETE",
    "url": "https://api.example.com/endpoint",
    "access_token": "access_token",
    "body": {}
  }
  ```

#### 1.5 google-api-proxy
- **Propósito**: Proxy específico para APIs do Google
- **Endpoint**: `POST /functions/v1/google-api-proxy`
- **Entrada**:
  ```json
  {
    "endpoint": "/gmail/v1/users/me/messages",
    "method": "GET",
    "access_token": "access_token",
    "params": {}
  }
  ```

## Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Edge Functions
EDGE_FUNCTIONS_BASE_URL=https://seu-projeto.supabase.co/functions/v1
SUPABASE_ANON_KEY=sua-chave-anon

# OAuth Providers
GOOGLE_CLIENT_ID=seu-client-id
GOOGLE_CLIENT_SECRET=seu-client-secret
GITHUB_CLIENT_ID=seu-client-id
GITHUB_CLIENT_SECRET=seu-client-secret
# ... outros provedores
```

### 2. Deploy das Funções

```bash
# Instalar CLI do Supabase
npm install -g supabase

# Fazer login
supabase login

# Deploy das funções
supabase functions deploy oauth-start
supabase functions deploy oauth-callback
supabase functions deploy oauth-refresh
supabase functions deploy oauth-proxy
supabase functions deploy google-api-proxy
```

### 3. Configuração no Dashboard do Supabase

1. Acesse o [Dashboard do Supabase](https://app.supabase.com)
2. Vá para **Authentication > URL Configuration**
3. Adicione URLs de callback:
   - `http://localhost:3000/oauth/callback`
   - `http://localhost:3000/auth/callback`
   - Seu domínio de produção

## Uso no Código

### 1. Inicialização

```typescript
import { initEdgeFunctions } from './src/oauth/edge-functions-adapter';

// Configurar
initEdgeFunctions({
  baseUrl: process.env.EDGE_FUNCTIONS_BASE_URL,
  apiKey: process.env.SUPABASE_ANON_KEY
});
```

### 2. Iniciar Fluxo OAuth

```typescript
import { startOAuthFlow } from './src/oauth/edge-functions-adapter';

async function loginWithGoogle() {
  const result = await startOAuthFlow({
    provider: 'google',
    scopes: ['email', 'profile', 'gmail.readonly'],
    redirectUri: 'http://localhost:3000/oauth/callback'
  });
  
  // Redirecionar para URL de autorização
  window.location.href = result.authUrl;
}
```

### 3. Processar Callback

```typescript
import { handleOAuthCallback } from './src/oauth/edge-functions-adapter';

async function handleCallback(code, state) {
  const tokens = await handleOAuthCallback(code, state);
  
  // Salvar tokens
  localStorage.setItem('access_token', tokens.access_token);
  localStorage.setItem('refresh_token', tokens.refresh_token);
}
```

### 4. Fazer Requisições Autenticadas

```typescript
import { makeAuthenticatedRequest } from './src/oauth/edge-functions-adapter';

async function getGmailMessages() {
  const accessToken = localStorage.getItem('access_token');
  
  const messages = await makeAuthenticatedRequest({
    method: 'GET',
    url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages',
    accessToken: accessToken
  });
  
  return messages;
}
```

## Exemplo Completo

```typescript
import { 
  initEdgeFunctions, 
  startOAuthFlow, 
  handleOAuthCallback,
  makeAuthenticatedRequest 
} from './src/oauth/edge-functions-adapter';

// 1. Inicializar
initEdgeFunctions({
  baseUrl: process.env.EDGE_FUNCTIONS_BASE_URL,
  apiKey: process.env.SUPABASE_ANON_KEY
});

// 2. Iniciar fluxo OAuth
async function startGoogleOAuth() {
  const result = await startOAuthFlow({
    provider: 'google',
    scopes: ['email', 'profile', 'gmail.readonly'],
    redirectUri: 'http://localhost:3000/oauth/callback'
  });
  
  // Redirecionar usuário
  window.location.href = result.authUrl;
}

// 3. Processar callback
async function handleOAuthRedirect() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const state = urlParams.get('state');
  
  if (code) {
    const tokens = await handleOAuthCallback(code, state);
    localStorage.setItem('access_token', tokens.access_token);
    localStorage.setItem('refresh_token', tokens.refresh_token);
  }
}

// 4. Usar token para fazer requisições
async function getUserEmails() {
  const accessToken = localStorage.getItem('access_token');
  
  const emails = await makeAuthenticatedRequest({
    method: 'GET',
    url: 'https://gmail.googleapis.com/gmail/v1/users/me/messages',
    accessToken: accessToken
  });
  
  return emails;
}
```

## Segurança

### 1. Validação de State
- Gere um state único para cada requisição
- Valide o state no callback
- Prevenção de CSRF

### 2. PKCE (Proof Key for Code Exchange)
- Code Verifier (gerado no cliente)
- Code Challenge (hash do verifier)
- Previne ataques de interceptação

### 3. Token Storage
- Armazene tokens em HttpOnly cookies
- Use refresh tokens com expiração curta
- Implemente rotação de tokens

### 4. Rate Limiting
- Limite de requisições por usuário/IP
- Prevenção de brute force
- Logs de auditoria

## Monitoramento

### Logs
```bash
# Ver logs das funções
supabase functions logs oauth-start
supabase functions logs oauth-callback
```

### Métricas
- Tempo de execução
- Taxa de erro
- Uso de memória
- Latência

## Troubleshooting

### Problemas Comuns

1. **Erro: "Invalid redirect_uri"**
   - Verifique URLs no dashboard do provedor OAuth
   - Certifique-se de usar HTTPS em produção

2. **Erro: "State mismatch"**
   - Verifique armazenamento de state
   - Valide cookies/session storage

3. **Erro: "Invalid grant"**
   - Token expirado
   - Refresh token inválido
   - Escopos insuficientes

### Debug
```javascript
// Habilitar logs detalhados
localStorage.setItem('debug', 'edge-functions:*');
```

## Próximos Passos

1. ✅ Criar funções Edge
2. ✅ Configurar variáveis de ambiente
3. ✅ Implementar adaptador no frontend
4. ✅ Testar fluxo completo
5. ✅ Adicionar rate limiting
6. ✅ Implementar refresh tokens
7. ✅ Adicionar logs e métricas
8. ✅ Documentação

## Recursos

- [Documentação Supabase Functions](https://supabase.com/docs/guides/functions)
- [OAuth 2.0 Spec](https://oauth.net/2/)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [Supabase Dashboard](https://app.supabase.com)