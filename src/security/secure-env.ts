/**
 * Secure Environment Variables Handler
 * Prevents accidental exposure of secrets in open-source projects
 */

import { loadEncryptedCredentials } from './encryption';

/**
 * Safely loads environment variables with fallback to encrypted storage
 */
export function getSecureEnv(key: string): string | undefined {
  // First try environment variable
  const envValue = process.env[key];
  if (envValue && envValue !== 'your_' && !envValue.includes('your_')) {
    return envValue;
  }

  // Map env keys to service names
  const serviceMap: Record<string, { service: string; field: string }> = {
    GOOGLE_CLIENT_ID: { service: 'google', field: 'clientId' },
    GOOGLE_CLIENT_SECRET: { service: 'google', field: 'clientSecret' },
    GITHUB_CLIENT_ID: { service: 'github', field: 'clientId' },
    GITHUB_CLIENT_SECRET: { service: 'github', field: 'clientSecret' },
    SLACK_CLIENT_ID: { service: 'slack', field: 'clientId' },
    SLACK_CLIENT_SECRET: { service: 'slack', field: 'clientSecret' },
    SLACK_SIGNING_SECRET: { service: 'slack', field: 'signingSecret' },
    NOTION_INTEGRATION_SECRET: { service: 'notion', field: 'clientSecret' },
  };

  const mapping = serviceMap[key];
  if (mapping) {
    const credentials = loadEncryptedCredentials(mapping.service);
    if (credentials) {
      if (mapping.field === 'signingSecret' && credentials.additionalData) {
        const additional = JSON.parse(credentials.additionalData);
        return additional.signingSecret;
      }
      return credentials[mapping.field as keyof typeof credentials];
    }
  }

  return undefined;
}

/**
 * Validates that no secrets are exposed in environment
 */
export function validateSecureEnvironment(): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  const sensitiveKeys = [
    'GOOGLE_CLIENT_SECRET',
    'GITHUB_CLIENT_SECRET',
    'SLACK_CLIENT_SECRET',
    'NOTION_INTEGRATION_SECRET',
  ];

  for (const key of sensitiveKeys) {
    const value = process.env[key];
    if (value && value !== 'your_' && !value.includes('your_')) {
      warnings.push(`⚠️  ${key} is exposed in environment variables. Consider using encrypted storage.`);
    }
  }

  return {
    valid: warnings.length === 0,
    warnings,
  };
}

/**
 * Sanitizes environment object for logging (removes secrets)
 */
export function sanitizeEnv(env: Record<string, any>): Record<string, any> {
  const sanitized = { ...env };
  const secretKeys = [
    'CLIENT_SECRET',
    'SECRET_KEY',
    'API_KEY',
    'TOKEN',
    'PASSWORD',
    'PRIVATE_KEY',
  ];

  for (const key in sanitized) {
    if (secretKeys.some(secret => key.includes(secret))) {
      sanitized[key] = '***REDACTED***';
    }
  }

  return sanitized;
}
