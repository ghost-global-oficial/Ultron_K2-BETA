import type { OAuthProvider } from '../types';

export const GitHubProvider: OAuthProvider = {
  name: 'github',
  displayName: 'GitHub',
  authUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  revokeUrl: undefined, // GitHub uses DELETE to /applications/{client_id}/token
  defaultScopes: ['user', 'repo'],
  supportsPKCE: false, // GitHub requires client_secret
};
