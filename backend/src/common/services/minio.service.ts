import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private bucket: string;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const endpoint = this.configService.get<string>('minio.endpoint') || 'localhost';
    const port = this.configService.get<number>('minio.port') || 9000;
    const accessKey = this.configService.get<string>('minio.accessKey') || 'minioadmin';
    const secretKey = this.configService.get<string>('minio.secretKey') || 'minioadmin123';
    this.bucket = this.configService.get<string>('minio.bucket') || 'portal-documents';

    this.client = new Minio.Client({
      endPoint: endpoint,
      port,
      useSSL: false,
      accessKey,
      secretKey,
    });

    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created bucket: ${this.bucket}`);
      }
      this.logger.log(`MinIO connected: ${endpoint}:${port}, bucket: ${this.bucket}`);
    } catch (error) {
      this.logger.error(`MinIO connection failed: ${error.message}`);
    }
  }

  async upload(storageKey: string, buffer: Buffer, mimeType: string): Promise<void> {
    await this.client.putObject(this.bucket, storageKey, buffer, buffer.length, {
      'Content-Type': mimeType,
    });
  }

  async getObject(storageKey: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, storageKey);
    return this.streamToBuffer(stream);
  }

  async deleteObject(storageKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, storageKey);
  }

  async deleteObjects(storageKeys: string[]): Promise<void> {
    if (storageKeys.length === 0) return;
    await this.client.removeObjects(this.bucket, storageKeys);
  }

  async getPresignedUrl(storageKey: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, storageKey, expirySeconds);
  }

  async getObjectStat(storageKey: string): Promise<Minio.BucketItemStat> {
    return this.client.statObject(this.bucket, storageKey);
  }

  private streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
