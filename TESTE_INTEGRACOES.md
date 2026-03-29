# 🧪 Teste do Sistema de Integrações

## Status Atual

✅ Sistema implementado e conectado ao Supabase
✅ Edge Functions configuradas
✅ Credenciais OAuth armazenadas no Supabase
✅ Interface funcional

## Como Testar Agora

### 1. Verificar se o servidor está rodando

O servidor já está rodando em `http://localhost:3000`

### 2. Abrir a aplicação

Abra o navegador e acesse: `http://localhost:3000`

### 3. Testar o fluxo

1. **Clique no botão de puzzle (🧩)** no input de prompts
2. **Selecione uma integração** (ex: Gmail, GitHub, Outlook)
3. **Clique em "Conectar"**
4. **Aguarde o popup** abrir com a página de autenticação
5. **Autorize o acesso** no provedor OAuth
6. **Aguarde o callback** processar e fechar automaticamente
7. **Verifique o status** - a integração deve aparecer como "Conectada"

## O que acontece nos bastidores

```
1. Clique em "Conectar"
   ↓
2. Frontend chama Edge Function oauth-start
   ↓
3. Edge Function retorna URL de autorização
   ↓
4. Popup abre com URL do provedor (Google, GitHub, etc)
   ↓
5. Usuário autoriza
   ↓
6. Provedor redireciona para /oauth-callback.html
   ↓
7. Callback chama Edge Function oauth-callback
   ↓
8. Edge Function troca código por token
   ↓
9. Token é salvo no localStorage
   ↓
10. Popup fecha e integração fica conectada
```

## Verificar Logs

### No Console do Navegador (F12)

Procure por mensagens como:
```
[OAuth] Starting flow: { provider: 'google', ... }
[OAuth] Got authorization URL
[OAuth Callback] Received: { code: true, ... }
[OAuth Callback] Token received
[OAuth Callback] Token stored and event dispatched
```

### No Supabase (Edge Functions Logs)

1. Acesse: https://app.supabase.com/project/iskzruvdeqegerhphyec/logs/edge-functions
2. Procure por logs das funções `oauth-start` e `oauth-callback`

## Troubleshooting

### Popup não abre
- Verifique se popups estão permitidos no navegador
- Permita popups para `localhost:3000`

### Erro "Failed to start OAuth"
- Verifique se as Edge Functions estão deployadas
- Verifique se as credenciais OAuth estão configuradas no Supabase

### Erro "Estado inválido"
- Limpe o sessionStorage e tente novamente
- Verifique se o state está sendo passado corretamente

### Erro "Token exchange failed"
- Verifique se as credenciais OAuth no Supabase estão corretas
- Verifique se a redirect_uri está configurada no console do provedor

## Verificar Credenciais no Supabase

### Via CLI

```bash
# Listar secrets das Edge Functions
supabase secrets list

# Verificar se existem:
# - GOOGLE_CLIENT_ID
# - GOOGLE_CLIENT_SECRET
# - GITHUB_CLIENT_ID
# - GITHUB_CLIENT_SECRET
# - MICROSOFT_CLIENT_ID
# - MICROSOFT_CLIENT_SECRET
```

### Via Dashboard

1. Acesse: https://app.supabase.com/project/iskzruvdeqegerhphyec/settings/functions
2. Vá para "Edge Functions" > "Secrets"
3. Verifique se as variáveis estão configuradas

## Testar Edge Functions Diretamente

### Testar oauth-start

```bash
curl -X POST https://iskzruvdeqegerhphyec.supabase.co/functions/v1/oauth-start \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlza3pydXZkZXFlZ2VyaHBoeWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTAxMjUsImV4cCI6MjA5MDIyNjEyNX0.K2qNsZAV97qwYDq9HfufTrFZDcX-fSnPGjIf4oCkqw8" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "service": "gmail",
    "scopes": ["https://www.googleapis.com/auth/gmail.readonly"],
    "redirect_uri": "http://localhost:5173/oauth-callback.html"
  }'
```

Deve retornar algo como:
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?...",
  "state": "...",
  "code_verifier": "..."
}
```

## Próximos Passos

Se tudo funcionar:
1. ✅ O popup abre
2. ✅ Você consegue autorizar
3. ✅ O callback processa
4. ✅ A integração fica conectada

Então o sistema está 100% funcional! 🎉

## Comandos Úteis

```bash
# Ver logs das Edge Functions em tempo real
supabase functions logs oauth-start --follow
supabase functions logs oauth-callback --follow

# Redeploy das Edge Functions (se necessário)
supabase functions deploy oauth-start
supabase functions deploy oauth-callback

# Verificar status do projeto
supabase status
```

## Suporte

Se encontrar problemas:
1. Verifique os logs do console do navegador
2. Verifique os logs das Edge Functions no Supabase
3. Verifique se as credenciais OAuth estão configuradas
4. Verifique se as redirect URIs estão corretas nos consoles dos provedores
