import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as crypto from 'crypto';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;
  private encryptionKey: Buffer;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('fileServer.encryptionKey') || 'default-key-32-characters-here!!';
    // SHA-256 hash to ensure 32 bytes for AES-256
    this.encryptionKey = crypto.createHash('sha256').update(key).digest();
  }

  async onModuleInit() {
    const host = this.configService.get<string>('redis.host') || 'localhost';
    const port = this.configService.get<number>('redis.port') || 6379;

    this.client = new Redis({
      host,
      port,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    this.client.on('connect', () => {
      this.logger.log(`Connected to Redis at ${host}:${port}`);
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   */
  private encrypt(data: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private decrypt(encryptedData: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Store user's SMB credentials (encrypted)
   */
  async storeUserCredentials(userId: string, password: string, ttlSeconds: number = 604800): Promise<void> {
    const key = `user-smb-cred:${userId}`;
    const encryptedPassword = this.encrypt(password);
    await this.client.setex(key, ttlSeconds, encryptedPassword);
    this.logger.debug(`Stored credentials for user: ${userId}`);
  }

  /**
   * Get user's SMB credentials (decrypted)
   */
  async getUserCredentials(userId: string): Promise<string | null> {
    const key = `user-smb-cred:${userId}`;
    const encryptedPassword = await this.client.get(key);

    if (!encryptedPassword) {
      return null;
    }

    try {
      return this.decrypt(encryptedPassword);
    } catch (error) {
      this.logger.error(`Failed to decrypt credentials for user: ${userId}`);
      return null;
    }
  }

  /**
   * Delete user's SMB credentials
   */
  async deleteUserCredentials(userId: string): Promise<void> {
    const key = `user-smb-cred:${userId}`;
    await this.client.del(key);
    this.logger.debug(`Deleted credentials for user: ${userId}`);
  }

  /**
   * Check if credentials exist for user
   */
  async hasUserCredentials(userId: string): Promise<boolean> {
    const key = `user-smb-cred:${userId}`;
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  /**
   * Generic get operation
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Generic set operation with optional TTL
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Generic delete operation
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Delete keys matching a pattern using SCAN
   */
  async deleteByPattern(pattern: string): Promise<void> {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } while (cursor !== '0');
  }
}
