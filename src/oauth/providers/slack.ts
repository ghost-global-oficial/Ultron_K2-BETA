import type { OAuthProvider } from '../types';

export const SlackProvider: OAuthProvider = {
  name: 'slack',
  displayName: 'Slack',
  authUrl: 'https://slack.com/oauth/v2/authorize',
  tokenUrl: 'https://slack.com/api/oauth.v2.access',
  revokeUrl: 'https://slack.com/api/auth.revoke',
  defaultScopes: ['chat:write', 'channels:read', 'users:read'],
  supportsPKCE: false,
};
