# Configuração de Credenciais OAuth

## Como Configurar

Para que o sistema de integrações funcione, você precisa configurar as credenciais OAuth para cada provedor que deseja usar.

### 1. Google OAuth

1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá para "APIs & Services" > "Credentials"
4. Clique em "Create Credentials" > "OAuth client ID"
5. Selecione "Web application"
6. Adicione as URIs de redirecionamento:
   - `http://localhost:5173/oauth-callback.html`
   - `http://localhost:3000/oauth-callback.html`
7. Copie o Client ID gerado
8. Cole no arquivo `src/oauth/initiate-oauth-fixed.ts` na configuração do Google

### 2. GitHub OAuth

1. Acesse [GitHub Developer Settings](https://github.com/settings/developers)
2. Clique em "New OAuth App"
3. Preencha:
   - Application name: ULTRON
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:5173/oauth-callback.html`
4. Copie o Client ID
5. Cole no arquivo `src/oauth/initiate-oauth-fixed.ts` na configuração do GitHub

### 3. Microsoft OAuth

1. Acesse o [Azure Portal](https://portal.azure.com/)
2. Vá para "Azure Active Directory" > "App registrations"
3. Clique em "New registration"
4. Preencha:
   - Name: ULTRON
   - Supported account types: Accounts in any organizational directory and personal Microsoft accounts
   - Redirect URI: Web - `http://localhost:5173/oauth-callback.html`
5. Copie o Application (client) ID
6. Cole no arquivo `src/oauth/initiate-oauth-fixed.ts` na configuração do Microsoft

### 4. Slack OAuth

1. Acesse [Slack API](https://api.slack.com/apps)
2. Clique em "Create New App" > "From scratch"
3. Preencha o nome e selecione o workspace
4. Vá para "OAuth & Permissions"
5. Adicione Redirect URL: `http://localhost:5173/oauth-callback.html`
6. Copie o Client ID
7. Cole no arquivo `src/oauth/initiate-oauth-fixed.ts` na configuração do Slack

## Arquivo de Configuração

Edite o arquivo `src/oauth/initiate-oauth-fixed.ts`:

```typescript
const OAUTH_CONFIGS = {
  google: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientId: 'SEU_GOOGLE_CLIENT_ID_AQUI', // ← Cole aqui
    redirectUri: 'http://localhost:5173/oauth-callback.html'
  },
  github: {
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    clientId: 'SEU_GITHUB_CLIENT_ID_AQUI', // ← Cole aqui
    redirectUri: 'http://localhost:5173/oauth-callback.html'
  },
  // ... outros provedores
};
```

## Testando

1. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Clique no botão de puzzle (🧩) no input de prompts

3. Selecione uma integração (ex: Gmail, GitHub, Outlook)

4. Clique em "Conectar"

5. Uma janela popup será aberta para autenticação

6. Após autorizar, a janela fechará automaticamente e a integração estará conectada

## Troubleshooting

### Popup bloqueado
- Permita popups para `localhost:5173` no seu navegador

### Erro "Client ID inválido"
- Verifique se copiou o Client ID corretamente
- Verifique se a URI de redirecionamento está configurada corretamente no console do provedor

### Erro "Redirect URI mismatch"
- Certifique-se de que a URI de redirecionamento no código corresponde exatamente à configurada no console do provedor
- Verifique se está usando a porta correta (5173 ou 3000)

## Segurança

- NUNCA commite as credenciais OAuth no Git
- Use variáveis de ambiente em produção
- As credenciais devem ser mantidas em segredo

## Próximos Passos

Após configurar as credenciais, o sistema de integrações estará funcional e você poderá:

- Conectar serviços OAuth
- Gerenciar tokens de acesso
- Usar as integrações nas skills do ULTRON
