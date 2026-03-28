import type { OAuthProvider, OAuthProviderName } from '../types';
import { GoogleProvider, GMAIL_SCOPES, DRIVE_SCOPES, CALENDAR_SCOPES } from './google';
import { GitHubProvider } from './github';
import { SlackProvider } from './slack';
import { NotionProvider } from './notion';
import { MicrosoftProvider } from './microsoft';

export const PROVIDERS: Record<OAuthProviderName, OAuthProvider> = {
  google: GoogleProvider,
  github: GitHubProvider,
  slack: SlackProvider,
  notion: NotionProvider,
  microsoft: MicrosoftProvider,
  custom: {
    name: 'custom',
    displayName: 'Custom OAuth Provider',
    authUrl: '',
    tokenUrl: '',
    defaultScopes: [],
    supportsPKCE: false,
  },
};

export function getProvider(name: OAuthProviderName): OAuthProvider {
  return PROVIDERS[name];
}

export { GMAIL_SCOPES, DRIVE_SCOPES, CALENDAR_SCOPES };
