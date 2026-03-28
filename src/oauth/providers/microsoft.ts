import type { OAuthProvider } from '../types';

export const MicrosoftProvider: OAuthProvider = {
  name: 'microsoft',
  displayName: 'Microsoft',
  authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  revokeUrl: undefined,
  defaultScopes: ['User.Read', 'Mail.Read', 'Calendars.Read'],
  supportsPKCE: true,
};
