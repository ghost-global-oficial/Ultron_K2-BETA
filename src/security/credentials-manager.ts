/**
 * Secure Credentials Manager
 * Manages OAuth credentials with encryption for open-source projects
 */

import { encrypt, decrypt, storeEncryptedCredentials, loadEncryptedCredentials, deleteCredentials } from './encryption';

export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  additionalData?: Record<string, string>;
}

export interface ServiceConfig {
  name: string;
  displayName: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  icon?: string;
}

/**
 * Pre-configured services with encrypted default credentials
 * These are encrypted and can only be decrypted on the user's machine
 */
const ENCRYPTED_DEFAULTS: Record<string, string> = {
  // These will be populated with encrypted versions of the credentials
  google: '',
  github: '',
  slack: '',
  notion: '',
};

/**
 * Service configurations (public information, safe to commit)
 */
export const SERVICE_CONFIGS: Record<string, ServiceConfig> = {
  google: {
    name: 'google',
    displayName: 'Google',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/calendar',
    ],
    icon: '/Gmail_icon_(2020).svg.png',
  },
  github: {
    name: 'github',
    displayName: 'GitHub',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'user', 'workflow'],
    icon: '/github-icon.webp',
  },
  slack: {
    name: 'slack',
    displayName: 'Slack',
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: ['chat:write', 'channels:read', 'channels:manage'],
    icon: '/Slack_icon_2019.svg.png',
  },
  notion: {
    name: 'notion',
    displayName: 'Notion',
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: [],
    icon: '/Notion-logo.svg.png',
  },
};

export class CredentialsManager {
  private static instance: CredentialsManager;
  private cache: Map<string, OAuthCredentials> = new Map();

  private constructor() {}

  static getInstance(): CredentialsManager {
    if (!CredentialsManager.instance) {
      CredentialsManager.instance = new CredentialsManager();
    }
    return CredentialsManager.instance;
  }

  /**
   * Gets credentials for a service
   * Priority: User's own credentials > Encrypted defaults
   */
  async getCredentials(service: string): Promise<OAuthCredentials | null> {
    // Check cache first
    if (this.cache.has(service)) {
      return this.cache.get(service)!;
    }

    // Try to load user's own credentials
    const userCreds = loadEncryptedCredentials(service);
    if (userCreds) {
      const credentials: OAuthCredentials = {
        clientId: userCreds.clientId,
        clientSecret: userCreds.clientSecret,
        redirectUri: userCreds.redirectUri,
        additionalData: userCreds.additionalData ? JSON.parse(userCreds.additionalData) : undefined,
      };
      this.cache.set(service, credentials);
      return credentials;
    }

    // Try encrypted defaults (if available)
    const encryptedDefault = ENCRYPTED_DEFAULTS[service];
    if (encryptedDefault) {
      try {
        const decrypted = decrypt(encryptedDefault);
        const credentials = JSON.parse(decrypted) as OAuthCredentials;
        this.cache.set(service, credentials);
        return credentials;
      } catch (error) {
        console.error(`[CredentialsManager] Failed to decrypt default credentials for ${service}`);
      }
    }

    return null;
  }

  /**
   * Stores user's own OAuth credentials securely
   */
  async storeCredentials(service: string, credentials: OAuthCredentials): Promise<void> {
    const data: Record<string, string> = {
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      redirectUri: credentials.redirectUri || '',
      additionalData: credentials.additionalData ? JSON.stringify(credentials.additionalData) : '',
    };

    storeEncryptedCredentials(service, data);
    this.cache.set(service, credentials);
  }

  /**
   * Deletes stored credentials for a service
   */
  async deleteCredentials(service: string): Promise<void> {
    deleteCredentials(service);
    this.cache.delete(service);
  }

  /**
   * Checks if user has configured their own credentials
   */
  hasUserCredentials(service: string): boolean {
    return loadEncryptedCredentials(service) !== null;
  }

  /**
   * Gets the OAuth authorization URL for a service
   */
  getAuthUrl(service: string, state: string): string | null {
    const config = SERVICE_CONFIGS[service];
    if (!config) return null;

    const credentials = this.cache.get(service);
    if (!credentials) return null;

    const params = new URLSearchParams({
      client_id: credentials.clientId,
      redirect_uri: credentials.redirectUri || 'http://localhost:3000/oauth/callback',
      response_type: 'code',
      state,
      scope: config.scopes.join(' '),
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Clears the credentials cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Helper function to initialize default credentials on first run
 * This should be run once to encrypt the credentials you provided
 */
export function initializeDefaultCredentials(): void {
  const manager = CredentialsManager.getInstance();

  // Google
  manager.storeCredentials('google', {
    clientId: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET',
    redirectUri: 'http://localhost:3000/oauth/callback',
  });

  // GitHub
  manager.storeCredentials('github', {
    clientId: process.env.GITHUB_CLIENT_ID || 'YOUR_GITHUB_CLIENT_ID',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || 'YOUR_GITHUB_CLIENT_SECRET',
    redirectUri: 'http://localhost:3000/oauth/callback',
  });

  // Slack
  manager.storeCredentials('slack', {
    clientId: process.env.SLACK_CLIENT_ID || 'YOUR_SLACK_CLIENT_ID',
    clientSecret: process.env.SLACK_CLIENT_SECRET || 'YOUR_SLACK_CLIENT_SECRET',
    redirectUri: 'http://localhost:3000/oauth/callback',
    additionalData: {
      signingSecret: process.env.SLACK_SIGNING_SECRET || 'YOUR_SLACK_SIGNING_SECRET',
    },
  });

  // Notion
  manager.storeCredentials('notion', {
    clientId: 'notion-internal',
    clientSecret: process.env.NOTION_INTEGRATION_SECRET || 'YOUR_NOTION_INTEGRATION_SECRET',
    redirectUri: 'http://localhost:3000/oauth/callback',
  });

  console.log('[Security] Default credentials initialized and encrypted');
}
