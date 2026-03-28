/**
 * Initialization script to encrypt and store OAuth credentials
 * Run this once to set up secure credential storage
 */

import { initializeDefaultCredentials } from '../src/security/credentials-manager';
import { validateSecureEnvironment } from '../src/security/secure-env';

console.log('🔐 ULTRON Credentials Initialization\n');

// Validate environment
const validation = validateSecureEnvironment();
if (!validation.valid) {
  console.log('⚠️  Security Warnings:');
  validation.warnings.forEach(warning => console.log(warning));
  console.log('');
}

// Initialize encrypted credentials
try {
  initializeDefaultCredentials();
  console.log('✅ Credentials encrypted and stored securely');
  console.log('📁 Location: ~/.ultron/credentials/');
  console.log('');
  console.log('🔒 Your credentials are now encrypted with machine-specific keys');
  console.log('   They can only be decrypted on this machine.');
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Remove secrets from .env file');
  console.log('   2. Commit the cleaned .env to git');
  console.log('   3. Users can add their own credentials via the UI');
} catch (error) {
  console.error('❌ Failed to initialize credentials:', error);
  process.exit(1);
}
