# ULTRON OAuth Configuration Guide

Complete OAuth 2.0 infrastructure with PKCE support, no external servers required.

## How to Configure OAuth with Third-Party Services

### 1. Google (Gmail, Drive, Calendar)

**Create OAuth Client:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable APIs: Gmail API, Google Drive API, Google Calendar API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: **Web application**
6. Authorized redirect URIs: `http://localhost:3000/oauth/callback`
7. Copy **Client ID** and **Client Secret**

**In ULTRON:**
- Provider: Google
- Client ID: `your-client-id.apps.googleusercontent.com`
- Client Secret: `your-client-secret` (optional with PKCE)
- Scopes: Leave empty for defaults (email, profile, gmail, drive, calendar)

---

### 2. GitHub

**Create OAuth App:**
1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Application name: `ULTRON AI Agent`
4. Homepage URL: `http://localhost:3000`
5. Authorization callback URL: `http://localhost:3000/oauth/callback`
6. Copy **Client ID** and **Client Secret**

**In ULTRON:**
- Provider: GitHub
- Client ID: `your-github-client-id`
- Client Secret: `your-github-client-secret`
- Scopes: Leave empty for defaults (user, repo, gist)

---

### 3. Slack

**Create Slack App:**
1. Go to [Slack API](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. App Name: `ULTRON AI Agent`
4. Pick a workspace
5. Go to "OAuth & Permissions"
6. Add Redirect URL: `http://localhost:3000/oauth/callback`
7. Add Bot Token Scopes: `chat:write`, `channels:read`, `users:read`
8. Copy **Client ID** and **Client Secret**

**In ULTRON:**
- Provider: Slack
- Client ID: `your-slack-client-id`
- Client Secret: `your-slack-client-secret`
- Scopes: Leave empty for defaults

---

### 4. Notion

**Create Notion Integration:**
1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name: `ULTRON AI Agent`
4. Associated workspace: Select your workspace
5. Capabilities: Read content, Update content, Insert content
6. Copy **OAuth client ID** and **OAuth client secret**
7. Add Redirect URI: `http://localhost:3000/oauth/callback`

**In ULTRON:**
- Provider: Notion
- Client ID: `your-notion-client-id`
- Client Secret: `your-notion-client-secret`
- Scopes: Leave empty for defaults

---

### 5. Microsoft (Outlook, OneDrive)

**Create Azure App:**
1. Go to [Azure Portal → App registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click "New registration"
3. Name: `ULTRON AI Agent`
4. Supported account types: Personal Microsoft accounts only
5. Redirect URI: Web → `http://localhost:3000/oauth/callback`
6. Copy **Application (client) ID**
7. Go to "Certificates & secrets" → "New client secret"
8. Copy the secret value

**In ULTRON:**
- Provider: Microsoft
- Client ID: `your-azure-client-id`
- Client Secret: `your-azure-client-secret`
- Scopes: Leave empty for defaults (User.Read, Mail.Read, Files.Read)

---

## Usage in Skills

```typescript
import { getAccessToken } from '../../oauth/oauth-manager';

// In your skill:
const token = await getAccessToken('gmail');
if (token) {
  // Use Gmail API
  const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
}
```

## Security Notes

- Tokens are stored in localStorage (consider encryption for production)
- PKCE flow is supported (no client_secret needed for public clients)
- Automatic token refresh with 5-minute buffer
- State parameter for CSRF protection
- All OAuth flows happen on localhost (no external servers)

## Troubleshooting

**"Redirect URI mismatch"**
- Ensure `http://localhost:3000/oauth/callback` is added to provider's allowed redirect URIs
- Check for trailing slashes (some providers are strict)

**"Token expired"**
- ULTRON automatically refreshes tokens
- If refresh fails, disconnect and reconnect

**"Popup blocked"**
- Allow popups for localhost in browser settings
- Or manually open the authorization URL

## Architecture

```
┌─────────────┐
│   ULTRON    │
│   (Client)  │
└──────┬──────┘
       │ 1. startAuthorization()
       │    Opens browser popup
       ▼
┌─────────────┐
│  Provider   │
│  Auth Page  │
└──────┬──────┘
       │ 2. User authorizes
       │    Redirects to callback
       ▼
┌─────────────┐
│  localhost  │
│  :3000      │
│  /oauth/    │
│  callback   │
└──────┬──────┘
       │ 3. handleCallback()
       │    Exchanges code for token
       │    Stores in localStorage
       ▼
┌─────────────┐
│   Skills    │
│   Use API   │
└─────────────┘
```
