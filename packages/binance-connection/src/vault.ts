import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { BinanceConnectionError } from './errors.js';
import type { StoredCredentials } from './types.js';

const ALGORITHM = 'aes-256-gcm';

export class CredentialVault {
  private readonly key: Buffer;
  constructor(masterKey: Uint8Array) {
    if (masterKey.byteLength !== 32)
      throw new BinanceConnectionError('Credential master key must be exactly 32 bytes');
    this.key = Buffer.from(masterKey);
  }

  encrypt(apiKey: string, apiSecret: string, keyVersion = 1): StoredCredentials {
    if (!apiKey.trim() || !apiSecret.trim())
      throw new BinanceConnectionError('API credentials are required');
    return {
      apiKeyCiphertext: this.seal(apiKey),
      apiSecretCiphertext: this.seal(apiSecret),
      keyVersion,
      revokedAt: null,
    };
  }

  decrypt(stored: StoredCredentials): { apiKey: string; apiSecret: string } {
    if (stored.revokedAt) throw new BinanceConnectionError('Connection has been revoked');
    return {
      apiKey: this.open(stored.apiKeyCiphertext),
      apiSecret: this.open(stored.apiSecretCiphertext),
    };
  }

  revoke(stored: StoredCredentials): StoredCredentials {
    return {
      ...stored,
      apiKeyCiphertext: '',
      apiSecretCiphertext: '',
      revokedAt: new Date().toISOString(),
    };
  }

  private seal(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [iv, tag, ciphertext].map((part) => part.toString('base64url')).join('.');
  }

  private open(value: string): string {
    try {
      const [iv, tag, ciphertext] = value.split('.').map((part) => Buffer.from(part, 'base64url'));
      if (!iv || !tag || !ciphertext) throw new Error('invalid');
      const decipher = createDecipheriv(ALGORITHM, this.key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
    } catch {
      throw new BinanceConnectionError('Unable to decrypt exchange credentials');
    }
  }
}
