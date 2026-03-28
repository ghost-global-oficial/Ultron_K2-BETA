/**
 * ULTRON OAuth Manager
 * Core OAuth 2.0 flow: authorize, exchange code, refresh, revoke.
 */

import type { OAuthConfig, OAuthToken, OAuthAuthorizationRequest, OAuthProviderName } from './types';
import { getProvider } from './providers';
import { saveConnection, getConnectionByService, updateToken, updateUserInfo } from './token-store';
import { GMAIL_SCOPES, DRIVE_SCOPES, CALENDAR_SCOPES } from './providers';

const PENDING_KEY = 'ultron:oauth:pending';

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateCodeVerifier(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array.buffer);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(hash);
}

function generateState(): string {
  return Math.random().toString(36).slice(2, 12);
}

// ── Authorization flow ────────────────────────────────────────────────────────

/**
 * Step 1: Start OAuth flow — opens browser to provider's auth page.
 * Returns the authorization URL to open.
 */
export async function startAuthorization(config: OAuthConfig, service: string): Promise<string> {
  const provider = getProvider(config.provider);
  const state = generateState();
  let codeVerifier: string | undefined;
  let codeChallenge: string | undefined;

  if (provider.supportsPKCE) {
    codeVerifier = await generateCodeVerifier();
    codeChallenge = await generateCodeChallenge(codeVerifier);
  }

  const request: OAuthAuthorizationRequest = {
    provider: config.provider,
    service,
    config,
    codeVerifier,
    state,
  };

  // Store pending request (will be retrieved in callback)
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(request));

  const params = new URLSearchParams({
    client_id: config.client_id,
    redirect_uri: config.redirect_uri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
    ...(codeChallenge ? { code_challenge: codeChallenge, code_challenge_method: 'S256' } : {}),
  });

  const authUrl = config.auth_url || provider.authUrl;
  return `${authUrl}?${params.toString()}`;
}

/**
 * Step 2: Handle callback — exchange authorization code for access token.
 * Called by the /oauth/callback route with code and state from query params.
 */
export async function handleCallback(code: string, state: string): Promise<{ success: boolean; service?: string; error?: string }> {
  const pendingStr = sessionStorage.getItem(PENDING_KEY);
  if (!pendingStr) return { success: false, error: 'No pending OAuth request found' };

  const pending: OAuthAuthorizationRequest = JSON.parse(pendingStr);
  sessionStorage.removeItem(PENDING_KEY);

  if (pending.state !== state) {
    return { success: false, error: 'State mismatch — possible CSRF attack' };
  }

  const provider = getProvider(pending.provider);
  const tokenUrl = pending.config.token_url || provider.tokenUrl;

  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: pending.config.redirect_uri,
    client_id: pending.config.client_id,
  };

  if (pending.codeVerifier) {
    body.code_verifier = pending.codeVerifier;
  } else if (pending.config.client_secret) {
    body.client_secret = pending.config.client_secret;
  }

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Token exchange failed: ${res.status} ${errText}` };
    }

    const data = await res.json();
    const token: OAuthToken = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
      token_type: data.token_type || 'Bearer',
      scope: data.scope,
    };

    // Save connection
    saveConnection({
      provider: pending.provider,
      service: pending.service,
      token,
      config: {
        client_id: pending.config.client_id,
        client_secret: pending.config.client_secret,
      },
    });

    // Fetch user info asynchronously (don't block callback)
    fetchUserInfo(pending.service).then(userInfo => {
      if (userInfo) updateUserInfo(pending.service, userInfo);
    });

    return { success: true, service: pending.service };
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Token exchange failed' };
  }
}

/**
 * Get a valid access token for a service — refreshes if expired.
 */
export async function getAccessToken(service: string): Promise<string | null> {
  const conn = getConnectionByService(service);
  if (!conn) return null;

  // Check if token is expired (with 5min buffer)
  if (conn.token.expires_at && conn.token.expires_at < Date.now() + 5 * 60 * 1000) {
    if (!conn.token.refresh_token) {
      console.warn(`[OAuth] Token expired for ${service} and no refresh_token available`);
      return null;
    }
    const refreshed = await refreshToken(service);
    if (!refreshed) return null;
    return refreshed.access_token;
  }

  return conn.token.access_token;
}

/**
 * Refresh an access token using the refresh_token.
 */
export async function refreshToken(service: string): Promise<OAuthToken | null> {
  const conn = getConnectionByService(service);
  if (!conn || !conn.token.refresh_token) return null;

  const provider = getProvider(conn.provider);
  const tokenUrl = provider.tokenUrl;

  const body: Record<string, string> = {
    grant_type: 'refresh_token',
    refresh_token: conn.token.refresh_token,
    client_id: conn.config?.client_id || '',
  };

  if (conn.config?.client_secret) {
    body.client_secret = conn.config.client_secret;
  }

  try {
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const newToken: OAuthToken = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || conn.token.refresh_token,
      expires_at: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
      token_type: data.token_type || 'Bearer',
      scope: data.scope || conn.token.scope,
    };

    updateToken(service, newToken);
    return newToken;
  } catch {
    return null;
  }
}

/**
 * Revoke a token (logout).
 */
export async function revokeToken(service: string): Promise<boolean> {
  const conn = getConnectionByService(service);
  if (!conn) return false;

  const provider = getProvider(conn.provider);
  if (!provider.revokeUrl) return true; // Some providers don't support revoke

  try {
    await fetch(provider.revokeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: conn.token.access_token }),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch user info from provider after successful OAuth.
 */
export async function fetchUserInfo(service: string): Promise<{ email?: string; name?: string; avatar?: string } | null> {
  const conn = getConnectionByService(service);
  if (!conn) return null;

  const token = await getAccessToken(service);
  if (!token) return null;

  try {
    let url = '';
    switch (conn.provider) {
      case 'google':
        url = 'https://www.googleapis.com/oauth2/v2/userinfo';
        break;
      case 'github':
        url = 'https://api.github.com/user';
        break;
      case 'microsoft':
        url = 'https://graph.microsoft.com/v1.0/me';
        break;
      case 'slack':
        url = 'https://slack.com/api/users.identity';
        break;
      case 'notion':
        url = 'https://api.notion.com/v1/users/me';
        break;
      default:
        return null;
    }

    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(conn.provider === 'notion' ? { 'Notion-Version': '2022-06-28' } : {}),
      },
    });

    if (!res.ok) return null;

    const data = await res.json();

    // Map provider-specific response to common format
    switch (conn.provider) {
      case 'google':
        return {
          email: data.email,
          name: data.name,
          avatar: data.picture,
        };
      case 'github':
        return {
          email: data.email,
          name: data.name || data.login,
          avatar: data.avatar_url,
        };
      case 'microsoft':
        return {
          email: data.mail || data.userPrincipalName,
          name: data.displayName,
          avatar: undefined,
        };
      case 'slack':
        return {
          email: data.user?.email,
          name: data.user?.name,
          avatar: data.user?.image_192,
        };
      case 'notion':
        return {
          email: data.person?.email,
          name: data.name,
          avatar: data.avatar_url,
        };
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Convenience function to initiate OAuth flow for a service.
 * Loads OAuth config from environment variables and opens authorization URL.
 * 
 * @param providerName - The OAuth provider (e.g., 'google', 'github', 'slack')
 * @param serviceName - Optional custom service name (defaults to provider name)
 */
export async function initiateOAuth(providerName: OAuthProviderName, serviceName?: string): Promise<void> {
  const provider = getProvider(providerName);
  
  // Load OAuth credentials from environment variables
  const getEnvVar = (key: string): string => {
    // In Electron, environment variables are accessed via process.env
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || '';
    }
    // Fallback for browser context (though OAuth should run in Electron)
    return '';
  };

  let config: OAuthConfig;
  let scopes: string[];
  const service = serviceName || providerName;

  switch (providerName) {
    case 'google':
      // Determine scopes based on service name
      if (serviceName?.toLowerCase().includes('gmail')) {
        scopes = GMAIL_SCOPES;
      } else if (serviceName?.toLowerCase().includes('drive')) {
        scopes = DRIVE_SCOPES;
      } else if (serviceName?.toLowerCase().includes('calendar')) {
        scopes = CALENDAR_SCOPES;
      } else {
        // Default to all Google scopes
        scopes = [...GMAIL_SCOPES, ...DRIVE_SCOPES, ...CALENDAR_SCOPES];
      }
      
      config = {
        provider: 'google',
        client_id: getEnvVar('GOOGLE_CLIENT_ID'),
        client_secret: getEnvVar('GOOGLE_CLIENT_SECRET'),
        redirect_uri: getEnvVar('GOOGLE_REDIRECT_URI') || 'http://localhost:3000/oauth/callback',
        scopes,
      };
      break;

    case 'github':
      config = {
        provider: 'github',
        client_id: getEnvVar('GITHUB_CLIENT_ID'),
        client_secret: getEnvVar('GITHUB_CLIENT_SECRET'),
        redirect_uri: getEnvVar('GITHUB_REDIRECT_URI') || 'http://localhost:3000/oauth/callback',
        scopes: provider.defaultScopes,
      };
      break;

    case 'slack':
      config = {
        provider: 'slack',
        client_id: getEnvVar('SLACK_CLIENT_ID'),
        client_secret: getEnvVar('SLACK_CLIENT_SECRET'),
        redirect_uri: getEnvVar('SLACK_REDIRECT_URI') || 'http://localhost:3000/oauth/callback',
        scopes: provider.defaultScopes,
      };
      break;

    case 'notion':
      config = {
        provider: 'notion',
        client_id: getEnvVar('NOTION_CLIENT_ID'),
        client_secret: getEnvVar('NOTION_INTEGRATION_SECRET'),
        redirect_uri: 'http://localhost:3000/oauth/callback',
        scopes: provider.defaultScopes,
      };
      break;

    case 'microsoft':
      config = {
        provider: 'microsoft',
        client_id: getEnvVar('MICROSOFT_CLIENT_ID'),
        client_secret: getEnvVar('MICROSOFT_CLIENT_SECRET'),
        redirect_uri: 'http://localhost:3000/oauth/callback',
        scopes: provider.defaultScopes,
      };
      break;

    default:
      throw new Error(`OAuth provider "${providerName}" is not configured`);
  }

  // Validate that client_id is present
  if (!config.client_id) {
    throw new Error(`Missing OAuth credentials for ${providerName}. Please configure environment variables.`);
  }

  // Start authorization and get the auth URL
  const authUrl = await startAuthorization(config, service);

  // Open authorization URL in a popup window
  const width = 600;
  const height = 700;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  window.open(
    authUrl,
    'oauth-popup',
    `width=${width},height=${height},left=${left},top=${top}`
  );

  console.log(`[OAuth] Initiated OAuth flow for ${service} (${providerName})`);
}

/**
 * Convenience function to revoke OAuth access for a service.
 * 
 * @param providerName - The OAuth provider (e.g., 'google', 'github', 'slack')
 * @param serviceName - Optional custom service name (defaults to provider name)
 */
export async function revokeOAuth(providerName: OAuthProviderName, serviceName?: string): Promise<boolean> {
  const service = serviceName || providerName;
  return await revokeToken(service);
}
