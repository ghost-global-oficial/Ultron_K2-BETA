import type { OAuthProvider } from '../types';

export const NotionProvider: OAuthProvider = {
  name: 'notion',
  displayName: 'Notion',
  authUrl: 'https://api.notion.com/v1/oauth/authorize',
  tokenUrl: 'https://api.notion.com/v1/oauth/token',
  revokeUrl: undefined,
  defaultScopes: [], // Notion uses workspace-level permissions, not scopes
  supportsPKCE: true,
};
