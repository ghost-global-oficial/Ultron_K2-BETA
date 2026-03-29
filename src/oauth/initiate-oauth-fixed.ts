/**
 * OAuth initiation using Supabase Edge Functions
 */

import { OAuthProviderName } from './types';

const SUPABASE_URL = 'https://iskzruvdeqegerhphyec.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlza3pydXZkZXFlZ2VyaHBoeWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NTAxMjUsImV4cCI6MjA5MDIyNjEyNX0.K2qNsZAV97qwYDq9HfufTrFZDcX-fSnPGjIf4oCkqw8';
const EDGE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

export async function initiateOAuth(
  provider: OAuthProviderName,
  service?: string,
  scopes?: string[],
  callbackUri?: string
): Promise<void> {
  try {
    const serviceName = service || provider;
    const defaultScopes = getDefaultScopes(provider);
    const scopesToUse = scopes || defaultScopes;
    const redirectUrl = callbackUri || `${window.location.origin}/oauth-callback.html`;

    const state = generateRandomString(32);
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_provider', provider);
    sessionStorage.setItem('oauth_service', serviceName);

    console.log('[OAuth] Starting flow:', { provider, service: serviceName, redirectUrl });

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/oauth-start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        provider,
        service: serviceName,
        scopes: scopesToUse,
        redirect_uri: redirectUrl,
        state
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OAuth] Edge Function error:', errorText);
      throw new Error(`Falha ao iniciar OAuth: ${response.status}`);
    }

    const data = await response.json();
    console.log('[OAuth] Got authorization URL');

    if (!data.url) {
      throw new Error('URL de autorização não retornada');
    }

    if (data.code_verifier) {
      sessionStorage.setItem('oauth_code_verifier', data.code_verifier);
    }

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      data.url,
      'oauth-popup',
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );

    if (!popup) {
      throw new Error('Popup bloqueado. Permita popups para este site.');
    }

    return new Promise<void>((resolve, reject) => {
      let resolved = false;

      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'oauth:success') {
          console.log('[OAuth] Token received via message');
          resolved = true;
          window.removeEventListener('message', handleMessage);
          resolve();
        } else if (event.data.type === 'oauth:error') {
          console.error('[OAuth] Error from popup:', event.data.error);
          resolved = true;
          window.removeEventListener('message', handleMessage);
          reject(new Error(event.data.error));
        }
      };

      window.addEventListener('message', handleMessage);

      const checkPopup = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(checkPopup);
            if (!resolved) {
              window.removeEventListener('message', handleMessage);
              const token = sessionStorage.getItem('oauth_token_temp');
              if (token) {
                console.log('[OAuth] Token received');
                sessionStorage.removeItem('oauth_token_temp');
                resolve();
              } else {
                console.log('[OAuth] Popup closed without token');
                resolve();
              }
            }
          }
        } catch (e) {
          // COOP error - ignore
        }
      }, 1000);

      setTimeout(() => {
        clearInterval(checkPopup);
        window.removeEventListener('message', handleMessage);
        if (!resolved) {
          try {
            if (popup && !popup.closed) popup.close();
          } catch (e) {}
          reject(new Error('OAuth timeout'));
        }
      }, 300000);
    });
  } catch (error) {
    console.error('[OAuth] Initiation failed:', error);
    throw error;
  }
}

function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function getDefaultScopes(provider: OAuthProviderName): string[] {
  const scopes: Record<OAuthProviderName, string[]> = {
    google: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/calendar.readonly'
    ],
    github: ['read:user', 'user:email', 'repo'],
    microsoft: ['User.Read', 'Mail.Read', 'Calendars.Read', 'Files.Read'],
    slack: ['channels:read', 'chat:write', 'users:read'],
    notion: [],
    custom: []
  };
  return scopes[provider] || [];
}

export function isAuthenticated(): boolean {
  const token = localStorage.getItem('oauth_token');
  if (!token) return false;
  try {
    const tokenData = JSON.parse(token);
    if (tokenData.expires_at && tokenData.expires_at < Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getAccessToken(): string | null {
  const tokenData = localStorage.getItem('oauth_token');
  if (!tokenData) return null;
  try {
    const parsed = JSON.parse(tokenData);
    return parsed.access_token || null;
  } catch {
    return null;
  }
}

export function logout(): void {
  localStorage.removeItem('oauth_token');
  sessionStorage.removeItem('oauth_state');
  sessionStorage.removeItem('oauth_code_verifier');
  sessionStorage.removeItem('oauth_provider');
  sessionStorage.removeItem('oauth_service');
}

export default initiateOAuth;
