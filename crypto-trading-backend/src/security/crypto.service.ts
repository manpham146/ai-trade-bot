import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class CryptoService implements OnModuleInit {
  private algorithm = 'aes-256-cbc';
  private key: Buffer;
  private ivLength = 16;
  private readonly logger = new Logger(CryptoService.name);

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const masterKey = this.configService.get<string>('MASTER_ENCRYPTION_KEY');
    
    if (!masterKey) {
      throw new Error('MASTER_ENCRYPTION_KEY is not defined in environment variables');
    }

    // Validate key length - AES-256 requires 32 bytes (256 bits)
    if (masterKey.length !== 32) {
      throw new Error(`MASTER_ENCRYPTION_KEY must be exactly 32 characters (256 bits) for AES-256. Current length: ${masterKey.length}`);
    }

    this.key = Buffer.from(masterKey, 'utf8');
    this.logger.log('CryptoService initialized with AES-256-CBC encryption', 'CryptoService', {
      algorithm: this.algorithm,
      keyLength: masterKey.length,
    });
  }

  encrypt(text: string): string {
    if (!text) {
      throw new Error('Cannot encrypt empty text');
    }

    if (!this.key) {
      throw new Error('Encryption key not initialized');
    }

    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine IV and encrypted data for storage
      const result = iv.toString('hex') + ':' + encrypted;
      
      return result;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  decrypt(encryptedText: string): string {
    if (!encryptedText) {
      throw new Error('Cannot decrypt empty text');
    }

    if (!this.key) {
      throw new Error('Encryption key not initialized');
    }

    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted text format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  // Utility method to generate a secure 32-character key
  static generateSecureKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}