/**
 * ULTRON OAuth System — Types
 * Infraestrutura completa de OAuth 2.0 sem servidor externo.
 */

export type OAuthProviderName = 'google' | 'github' | 'slack' | 'notion' | 'microsoft' | 'custom';

export interface OAuthToken {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;      // Unix timestamp (ms)
  token_type: string;       // "Bearer"
  scope?: string;
}

export interface OAuthConfig {
  provider: OAuthProviderName;
  client_id: string;
  client_secret?: string;   // Optional for PKCE flow
  redirect_uri: string;     // http://localhost:3000/oauth/callback
  scopes: string[];
  /** Custom authorization endpoint (for 'custom' provider) */
  auth_url?: string;
  /** Custom token endpoint (for 'custom' provider) */
  token_url?: string;
  /** Custom revoke endpoint (optional) */
  revoke_url?: string;
}

export interface OAuthProvider {
  name: OAuthProviderName;
  displayName: string;
  authUrl: string;
  tokenUrl: string;
  revokeUrl?: string;
  /** Default scopes if none provided */
  defaultScopes: string[];
  /** Whether this provider supports PKCE (no client_secret needed) */
  supportsPKCE: boolean;
}

export interface StoredOAuthConnection {
  id: string;
  provider: OAuthProviderName;
  service: string;          // e.g. "gmail", "github", "slack-workspace-123"
  token: OAuthToken;
  config?: {
    client_id: string;
    client_secret?: string;
  };
  userInfo?: {
    email?: string;
    name?: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OAuthAuthorizationRequest {
  provider: OAuthProviderName;
  service: string;
  config: OAuthConfig;
  /** PKCE code verifier (generated client-side, stored temporarily) */
  codeVerifier?: string;
  /** State parameter for CSRF protection */
  state: string;
}
