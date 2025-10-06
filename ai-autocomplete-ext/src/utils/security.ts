/**
 * Security Module for API Key Encryption
 * 
 * This module provides encryption and decryption functionality for sensitive data
 * like API keys using the Web Crypto API. This ensures that even if someone gains
 * access to the extension's storage, they cannot read the API keys without the
 * encryption key.
 * 
 * Uses AES-GCM (Galois/Counter Mode) for authenticated encryption.
 */

import { logger } from './logger';

/**
 * Generate a cryptographic key for encryption/decryption
 * This key is derived from a combination of factors unique to the user/extension
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  try {
    // Create a seed based on extension ID and a fixed salt
    // In production, you might want to use additional entropy sources
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(chrome.runtime.id + 'ai-autocomplete-salt-v1'),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive a key using PBKDF2
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('ai-autocomplete-fixed-salt'),
        iterations: 100000, // High iteration count for security
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    return key;
  } catch (error) {
    logger.error('Failed to generate encryption key:', error);
    throw new Error('Failed to generate encryption key');
  }
}

/**
 * Encrypt a string value using AES-GCM
 * 
 * @param plaintext - The plain text to encrypt
 * @returns Encrypted data as a base64 string
 */
export async function encryptData(plaintext: string): Promise<string> {
  try {
    if (!plaintext) {
      return '';
    }

    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);

    // Generate a random initialization vector
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the data
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64 for storage
    const base64 = btoa(String.fromCharCode(...combined));
    
    logger.log('Data encrypted successfully');
    return base64;
  } catch (error) {
    logger.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt a string value that was encrypted with encryptData
 * 
 * @param encryptedBase64 - The encrypted data as a base64 string
 * @returns Decrypted plain text
 */
export async function decryptData(encryptedBase64: string): Promise<string> {
  try {
    if (!encryptedBase64) {
      return '';
    }

    const key = await getEncryptionKey();

    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedData = combined.slice(12);

    // Decrypt the data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedData
    );

    // Convert back to string
    const decoder = new TextDecoder();
    const plaintext = decoder.decode(decryptedData);
    
    logger.log('Data decrypted successfully');
    return plaintext;
  } catch (error) {
    logger.error('Decryption failed:', error);
    // Return empty string on decryption failure to avoid breaking the extension
    // This can happen if the encryption key changes or data is corrupted
    return '';
  }
}

/**
 * Securely store an API key in Chrome storage
 * 
 * @param apiKey - The API key to store
 */
export async function storeApiKey(apiKey: string): Promise<void> {
  try {
    if (!apiKey) {
      // Clear the stored key if empty
      await chrome.storage.sync.remove(['encryptedApiKey']);
      logger.log('API key cleared');
      return;
    }

    // Encrypt the API key
    const encrypted = await encryptData(apiKey);

    // Store the encrypted key
    await chrome.storage.sync.set({ encryptedApiKey: encrypted });
    
    // Remove any old unencrypted key (migration)
    await chrome.storage.sync.remove(['apiKey']);
    
    logger.log('API key stored securely');
  } catch (error) {
    logger.error('Failed to store API key:', error);
    throw error;
  }
}

/**
 * Retrieve and decrypt the stored API key
 * 
 * @returns The decrypted API key or empty string if not found
 */
export async function retrieveApiKey(): Promise<string> {
  try {
    const result = await chrome.storage.sync.get(['encryptedApiKey', 'apiKey']);
    
    // Check for encrypted key first
    if (result.encryptedApiKey) {
      const decrypted = await decryptData(result.encryptedApiKey);
      return decrypted;
    }
    
    // Fall back to unencrypted key (for migration)
    if (result.apiKey) {
      logger.log('Migrating unencrypted API key to encrypted storage');
      // Migrate to encrypted storage
      await storeApiKey(result.apiKey);
      return result.apiKey;
    }
    
    return '';
  } catch (error) {
    logger.error('Failed to retrieve API key:', error);
    return '';
  }
}

/**
 * Check if an API key is stored (encrypted or not)
 * 
 * @returns True if an API key exists
 */
export async function hasApiKey(): Promise<boolean> {
  try {
    const result = await chrome.storage.sync.get(['encryptedApiKey', 'apiKey']);
    return !!(result.encryptedApiKey || result.apiKey);
  } catch (error) {
    logger.error('Failed to check API key existence:', error);
    return false;
  }
}

/**
 * Migrate unencrypted data to encrypted storage
 * This function should be called on extension update
 */
export async function migrateToEncryptedStorage(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get(['apiKey']);
    
    if (result.apiKey && typeof result.apiKey === 'string') {
      logger.log('Migrating API key to encrypted storage');
      await storeApiKey(result.apiKey);
      logger.log('Migration completed successfully');
    }
  } catch (error) {
    logger.error('Migration failed:', error);
  }
}

/**
 * Validate that an API key can be decrypted
 * Useful for checking if encryption is working properly
 * 
 * @returns True if encryption/decryption is working
 */
export async function validateEncryption(): Promise<boolean> {
  try {
    const testString = 'test-encryption-' + Date.now();
    const encrypted = await encryptData(testString);
    const decrypted = await decryptData(encrypted);
    return decrypted === testString;
  } catch (error) {
    logger.error('Encryption validation failed:', error);
    return false;
  }
}

/**
 * Clear all encrypted data
 * Used when user wants to reset the extension
 */
export async function clearEncryptedData(): Promise<void> {
  try {
    await chrome.storage.sync.remove(['encryptedApiKey']);
    logger.log('Encrypted data cleared');
  } catch (error) {
    logger.error('Failed to clear encrypted data:', error);
    throw error;
  }
}