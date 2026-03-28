# OAuth Setup - Authorization Callback URLs

Este documento lista as URLs de callback necessárias para configurar as integrações OAuth do ULTRON.

## URL Base de Callback
```
http://localhost:3000/oauth/callback
```

Para produção, substitua por:
```
https://seu-dominio.com/oauth/callback
```

---

## Integrações Implementadas

### 1. **Gmail** (Google)
- **Provider**: Google OAuth 2.0
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Scopes necessários**:
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/gmail.send`
  - `https://www.googleapis.com/auth/gmail.modify`
- **Console**: https://console.cloud.google.com/apis/credentials

### 2. **Google Drive**
- **Provider**: Google OAuth 2.0
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Scopes necessários**:
  - `https://www.googleapis.com/auth/drive.file`
  - `https://www.googleapis.com/auth/drive.readonly`
- **Console**: https://console.cloud.google.com/apis/credentials

### 3. **Google Calendar**
- **Provider**: Google OAuth 2.0
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Scopes necessários**:
  - `https://www.googleapis.com/auth/calendar`
  - `https://www.googleapis.com/auth/calendar.events`
- **Console**: https://console.cloud.google.com/apis/credentials

### 4. **GitHub**
- **Provider**: GitHub OAuth
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Scopes necessários**:
  - `repo` (acesso a repositórios)
  - `user` (informações do usuário)
  - `workflow` (GitHub Actions)
- **Console**: https://github.com/settings/developers

### 5. **Slack**
- **Provider**: Slack OAuth 2.0
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Scopes necessários**:
  - `chat:write` (enviar mensagens)
  - `channels:read` (ler canais)
  - `channels:manage` (gerenciar canais)
- **Console**: https://api.slack.com/apps

### 6. **Notion**
- **Provider**: Notion OAuth
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Scopes necessários**:
  - `read_content`
  - `update_content`
  - `insert_content`
- **Console**: https://www.notion.so/my-integrations

### 7. **Linear**
- **Provider**: Linear OAuth 2.0
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Scopes necessários**:
  - `read` (ler issues)
  - `write` (criar/editar issues)
- **Console**: https://linear.app/settings/api

### 8. **Asana**
- **Provider**: Asana OAuth 2.0
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Scopes necessários**:
  - `default` (acesso básico)
- **Console**: https://app.asana.com/0/developer-console

### 9. **Stripe**
- **Provider**: Stripe OAuth (Connect)
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Scopes necessários**:
  - `read_write` (acesso completo)
- **Console**: https://dashboard.stripe.com/settings/applications

### 10. **Vercel**
- **Provider**: Vercel OAuth
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Scopes necessários**:
  - Acesso a deployments e projetos
- **Console**: https://vercel.com/account/tokens

### 11. **Supabase**
- **Provider**: API Key (não usa OAuth)
- **Configuração**: API Key + Project URL
- **Console**: https://app.supabase.com/project/_/settings/api

---

## Integrações Planejadas (Futuras)

### 12. **ClickUp**
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Console**: https://app.clickup.com/settings/apps

### 13. **Monday.com**
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Console**: https://monday.com/developers/apps

### 14. **Outlook** (Microsoft)
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Console**: https://portal.azure.com/

### 15. **PayPal**
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Console**: https://developer.paypal.com/dashboard/applications

### 16. **Zapier**
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Console**: https://zapier.com/app/developer

### 17. **Make** (Integromat)
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Console**: https://www.make.com/en/integrations

### 18. **Instagram** (Meta)
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Console**: https://developers.facebook.com/apps/

### 19. **Intercom**
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Console**: https://app.intercom.com/a/apps/_/developer-hub

### 20. **JotForm**
- **Callback URL**: `http://localhost:3000/oauth/callback`
- **Console**: https://www.jotform.com/myaccount/api

---

## Configuração Geral

### Variáveis de Ambiente (.env)

```env
# Google (Gmail, Drive, Calendar)
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret

# GitHub
GITHUB_CLIENT_ID=seu_client_id
GITHUB_CLIENT_SECRET=seu_client_secret

# Slack
SLACK_CLIENT_ID=seu_client_id
SLACK_CLIENT_SECRET=seu_client_secret

# Notion
NOTION_CLIENT_ID=seu_client_id
NOTION_CLIENT_SECRET=seu_client_secret

# Linear
LINEAR_CLIENT_ID=seu_client_id
LINEAR_CLIENT_SECRET=seu_client_secret

# Asana
ASANA_CLIENT_ID=seu_client_id
ASANA_CLIENT_SECRET=seu_client_secret

# Stripe
STRIPE_CLIENT_ID=seu_client_id
STRIPE_SECRET_KEY=seu_secret_key

# Vercel
VERCEL_TOKEN=seu_token

# Supabase
SUPABASE_URL=sua_url
SUPABASE_KEY=sua_key
```

---

## Notas Importantes

1. **Localhost vs Produção**: Lembre-se de adicionar ambas as URLs (localhost e produção) nas configurações OAuth de cada serviço

2. **HTTPS Obrigatório**: Alguns serviços (como Stripe) exigem HTTPS mesmo em desenvolvimento. Use ngrok ou similar para testar

3. **Redirect URI Exato**: A URL de callback deve corresponder EXATAMENTE ao configurado no console do provedor (incluindo trailing slash)

4. **Scopes Mínimos**: Sempre solicite apenas os scopes necessários para a funcionalidade desejada

5. **Tokens de Refresh**: Implemente refresh tokens para manter as sessões ativas sem re-autenticação

---

## Testando OAuth

Para testar uma integração:

1. Configure as credenciais no `.env`
2. Inicie o servidor: `npm run dev`
3. Acesse: `http://localhost:3000`
4. Clique em "Conectar [Serviço]" nas configurações
5. Autorize o acesso
6. Verifique se o callback foi recebido corretamente

---

## Suporte

Para problemas com OAuth, verifique:
- Console do navegador para erros
- Logs do servidor (`server.ts`)
- Configurações do provedor OAuth
- Validade dos tokens e credenciais
