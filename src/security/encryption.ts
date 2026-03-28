/**
 * Encryption utilities for securing OAuth credentials
 * Uses AES-256-GCM for encryption with a user-specific key
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Derives a key from a password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Generates a machine-specific key based on hardware identifiers
 * This ensures credentials are tied to the specific machine
 */
export function getMachineKey(): string {
  const os = require('os');
  const machineId = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()[0]?.model || 'unknown',
  ].join('-');
  
  // Hash the machine ID to create a consistent key
  return crypto.createHash('sha256').update(machineId).digest('hex');
}

/**
 * Encrypts sensitive data using AES-256-GCM
 */
export function encrypt(plaintext: string, masterPassword?: string): string {
  try {
    // Use machine key + optional user password
    const password = masterPassword || getMachineKey();
    
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive encryption key
    const key = deriveKey(password, salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine: salt + iv + authTag + encrypted
    const combined = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]);
    
    return combined.toString('base64');
  } catch (error) {
    console.error('[Encryption] Failed to encrypt:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypts data encrypted with encrypt()
 */
export function decrypt(encryptedData: string, masterPassword?: string): string {
  try {
    // Use machine key + optional user password
    const password = masterPassword || getMachineKey();
    
    // Decode from base64
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    
    // Derive decryption key
    const key = deriveKey(password, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('[Encryption] Failed to decrypt:', error);
    throw new Error('Decryption failed - invalid password or corrupted data');
  }
}

/**
 * Securely stores encrypted credentials in a local file
 */
export function storeEncryptedCredentials(
  service: string,
  credentials: Record<string, string>,
  masterPassword?: string
): void {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  // Store in user's home directory
  const credentialsDir = path.join(os.homedir(), '.ultron', 'credentials');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(credentialsDir)) {
    fs.mkdirSync(credentialsDir, { recursive: true, mode: 0o700 });
  }
  
  const credentialsFile = path.join(credentialsDir, `${service}.enc`);
  
  // Encrypt credentials
  const encrypted = encrypt(JSON.stringify(credentials), masterPassword);
  
  // Write to file with restricted permissions
  fs.writeFileSync(credentialsFile, encrypted, { mode: 0o600 });
  
  console.log(`[Security] Credentials for ${service} stored securely`);
}

/**
 * Loads and decrypts credentials from local storage
 */
export function loadEncryptedCredentials(
  service: string,
  masterPassword?: string
): Record<string, string> | null {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  const credentialsFile = path.join(
    os.homedir(),
    '.ultron',
    'credentials',
    `${service}.enc`
  );
  
  if (!fs.existsSync(credentialsFile)) {
    return null;
  }
  
  try {
    const encrypted = fs.readFileSync(credentialsFile, 'utf8');
    const decrypted = decrypt(encrypted, masterPassword);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error(`[Security] Failed to load credentials for ${service}:`, error);
    return null;
  }
}

/**
 * Deletes stored credentials for a service
 */
export function deleteCredentials(service: string): void {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  const credentialsFile = path.join(
    os.homedir(),
    '.ultron',
    'credentials',
    `${service}.enc`
  );
  
  if (fs.existsSync(credentialsFile)) {
    fs.unlinkSync(credentialsFile);
    console.log(`[Security] Credentials for ${service} deleted`);
  }
}

/**
 * Lists all services with stored credentials
 */
export function listStoredServices(): string[] {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  
  const credentialsDir = path.join(os.homedir(), '.ultron', 'credentials');
  
  if (!fs.existsSync(credentialsDir)) {
    return [];
  }
  
  return fs.readdirSync(credentialsDir)
    .filter((file: string) => file.endsWith('.enc'))
    .map((file: string) => file.replace('.enc', ''));
}
