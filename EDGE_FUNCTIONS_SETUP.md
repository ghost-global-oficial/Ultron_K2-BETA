# Configuração das Edge Functions do Supabase para OAuth

## Visão Geral

As Edge Functions do Supabase permitem executar código serverless na borda da rede, ideal para fluxos OAuth onde você precisa manter segredos (client secrets) seguros.

## Funções Implementadas

### 1. oauth-start
- **Propósito**: Inicia o fluxo OAuth
- **Entrada**: Provider, service, scopes, redirect_uri
- **Saída**: URL de autorização, state, code_verifier
- **Endpoint**: `POST /functions/v1/oauth-start`

### 2. oauth-callback
- **Propósito**: Processa o callback OAuth
- **Entrada**: code, state, provider, redirect_uri, code_verifier
- **Saída**: access_token, refresh_token, expires_in, user_info
- **Endpoint**: `POST /functions/v1/oauth-callback`

### 3. oauth-refresh
- **Propósito**: Atualiza tokens expirados
- **Entrada**: provider, refresh_token
- **Saída**: Novo access_token e refresh_token
- **Endpoint**: `POST /functions/v1/oauth-refresh`

### 4. oauth-proxy
- **Propósito**: Proxy para APIs de terceiros
- **Entrada**: method, url, access_token, body, headers
- **Saída**: Resposta da API
- **Endpoint**: `POST /functions/v1/oauth-proxy`

### 5. google-api-proxy
- **Propósito**: Proxy específico para APIs do Google
- **Entrada**: endpoint, method, access_token, params, body
- **Saída**: Resposta da API do Google
- **Endpoint**: `POST /functions/v1/google-api-proxy`

## Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```bash
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=seu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=seu_service_role_key_aqui

# Edge Functions
EDGE_FUNCTIONS_BASE_URL=https://seu-projeto.supabase.co/functions/v1
EDGE_FUNCTIONS_ENABLED=true

# OAuth Providers
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret
GITHUB_CLIENT_ID=seu_github_client_id
GITHUB_CLIENT_SECRET=seu_github_client_secret
MICROSOFT_CLIENT_ID=seu_microsoft_client_id
MICROSOFT_CLIENT_SECRET=seu_microsoft_client_secret
SLACK_CLIENT_ID=seu_slack_client_id
SLACK_CLIENT_SECRET=seu_slack_client_secret
```

### 2. Deploy das Funções

```bash
# Instale a CLI do Supabase
npm install -g supabase

# Faça login
supabase login

# Deploy de cada função
supabase functions deploy oauth-start --project-ref seu-project-ref
supabase functions deploy oauth-callback --project-ref seu-project-ref
supabase functions deploy oauth-refresh --project-ref seu-project-ref
supabase functions deploy oauth-proxy --project-ref seu-project-ref
supabase functions deploy google-api-proxy --project-ref seu-project-ref
```

### 3. Configuração das Secrets

No Supabase Dashboard, vá para **Settings > Secrets** e adicione:

```bash
GOOGLE_CLIENT_ID=seu_google_client_id
GOOGLE_CLIENT_SECRET=seu_google_client_secret
GITHUB_CLIENT_ID=seu_github_client_id
GITHUB_CLIENT_SECRET=seu_github_client_secret
MICROSOFT_CLIENT_ID=seu_microsoft_client_id
MICROSOFT_CLIENT_SECRET=seu_microsoft_client_secret
SLACK_CLIENT_ID=seu_slack_client_id
SLACK_CLIENT_SECRET=seu_slack_client_secret
```

## Uso no Código

### 1. Usando o Adaptador

```typescript
import { initEdgeFunctionsAdapter, getEdgeFunctionsAdapter } from './src/oauth/edge-functions-adapter';

// Inicializar
initEdgeFunctionsAdapter({
  baseUrl: 'https://seu-projeto.supabase.co/functions/v1',
  apiKey: 'seu_anon_key'
});

// Usar
const adapter = getEdgeFunctionsAdapter();

// Iniciar fluxo OAuth
const { url, state, codeVerifier } = await adapter.startOAuthFlow(
  'google',
  'gmail',
  ['https://www.googleapis.com/auth/gmail.readonly'],
  'http://localhost:3000/oauth/callback'
);

// Redirecionar usuário
window.location.href = url;
```

### 2. Usando o Cliente

```typescript
import { edgeFunctions } from './src/supabase/edge-functions-client';

// Iniciar OAuth
const response = await edgeFunctions.startOAuth({
  provider: 'google',
  service: 'gmail',
  scopes: ['https://www.googleapis.com/auth/gmail.readonly'],
  redirectUri: 'http://localhost:3000/oauth/callback'
});

// Processar callback
const token = await edgeFunctions.handleCallback(
  code,
  state,
  'google'
);

// Fazer requisição autenticada
const emails = await edgeFunctions.googleApiRequest(
  '/gmail/v1/users/me/messages',
  {
    accessToken: token.access_token,
    params: { maxResults: '10' }
  }
);
```

### 3. Integração com o OAuth Manager Existente

```typescript
import { getEdgeFunctionsAdapter } from './src/oauth/edge-functions-adapter';
import { startAuthorization, handleCallback } from './src/oauth/oauth-manager';

// Sobrescrever funções para usar Edge Functions
const originalStartAuthorization = startAuthorization;
const originalHandleCallback = handleCallback;

// Usar Edge Functions para OAuth
export async function startAuthorizationWithEdgeFunctions(config, service) {
  const adapter = getEdgeFunctionsAdapter();
  
  const { url, state, codeVerifier } = await adapter.startOAuthFlow(
    config.provider,
    service,
    config.scopes,
    config.redirect_uri
  );

  // Armazenar state e codeVerifier para uso no callback
  sessionStorage.setItem('oauth:state', state);
  sessionStorage.setItem('oauth:codeVerifier', codeVerifier);
  sessionStorage.setItem('oauth:service', service);
  sessionStorage.setItem('oauth:provider', config.provider);

  return url;
}

export async function handleCallbackWithEdgeFunctions(code, state) {
  const adapter = getEdgeFunctionsAdapter();
  
  const storedState = sessionStorage.getItem('oauth:state');
  const codeVerifier = sessionStorage.getItem('oauth:codeVerifier');
  const service = sessionStorage.getItem('oauth:service');
  const provider = sessionStorage.getItem('oauth:provider');

  if (storedState !== state) {
    throw new Error('State mismatch');
  }

  const token = await adapter.exchangeCodeForToken(
    code,
    codeVerifier,
    'http://localhost:3000/oauth/callback'
  );

  // Limpar storage
  sessionStorage.removeItem('oauth:state');
  sessionStorage.removeItem('oauth:codeVerifier');
  sessionStorage.removeItem('oauth:service');
  sessionStorage.removeItem('oauth:provider');

  return { success: true, service, token };
}
```

## Fluxo Completo

### 1. Início do Fluxo
```typescript
// Frontend
const authUrl = await startAuthorizationWithEdgeFunctions(config, 'gmail');
window.open(authUrl, 'oauth-popup');
```

### 2. Callback
```typescript
// Edge Function (oauth-callback)
// 1. Recebe code do provedor
// 2. Troca code por token usando client secret
// 3. Retorna token para frontend
```

### 3. Armazenamento
```typescript
// Frontend
const { token } = await handleCallbackWithEdgeFunctions(code, state);
await saveConnection({
  service: 'gmail',
  provider: 'google',
  token
});
```

### 4. Uso
```typescript
// Fazer requisições através do proxy
const emails = await edgeFunctions.googleApiRequest(
  '/gmail/v1/users/me/messages',
  {
    accessToken: token.access_token,
    params: { maxResults: '10' }
  }
);
```

## Segurança

### 1. Secrets Seguros
- Client secrets nunca são expostos no frontend
- Armazenados apenas nas Edge Functions
- Gerenciados via Supabase Secrets

### 2. Validação
- State validation para prevenir CSRF
- PKCE (Proof Key for Code Exchange)
- Rate limiting nas Edge Functions

### 3. Logs
- Todas as operações são logadas
- Logs disponíveis no Supabase Dashboard
- Auditoria de acesso

## Troubleshooting

### Erro: "Function not found"
- Verifique se as funções foram deployadas
- Confirme o nome correto da função
- Verifique permissões de acesso

### Erro: "Missing environment variables"
- Configure as secrets no Supabase Dashboard
- Verifique se as variáveis estão definidas
- Reinicie as funções após configurar secrets

### Erro: "Invalid redirect_uri"
- Configure redirect URIs no console do provedor OAuth
- Use URLs exatas (incluindo http/https)
- Adicione localhost para desenvolvimento

### Erro: "State mismatch"
- Verifique se o state está sendo armazenado corretamente
- Confirme que o mesmo state é usado no início e callback
- Verifique se há múltiplas abas/instâncias

## Monitoramento

### 1. Logs
- Acesse **Supabase Dashboard > Functions > Logs**
- Filtre por função específica
- Verifique erros e tempo de execução

### 2. Métricas
- Número de execuções
- Tempo médio de execução
- Taxa de erro

### 3. Alertas
- Configure alertas para erros
- Monitorar uso de recursos
- Alertas de rate limiting

## Próximos Passos

1. ✅ Criar Edge Functions
2. ✅ Configurar variáveis de ambiente
3. ✅ Deploy das funções
4. ⏳ Testar fluxo OAuth completo
5. ⏳ Implementar rate limiting
6. ⏳ Adicionar mais provedores
7. ⏳ Implementar cache de tokens
8. ⏳ Adicionar logs detalhados

## Recursos

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [GitHub OAuth](https://docs.github.com/en/apps/oauth-apps)