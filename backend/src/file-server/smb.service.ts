import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import SMB2 from '@marsaud/smb2';

export interface SmbFileInfo {
  name: string;
  isDirectory: boolean;
  size: number;
  createdAt: Date;
  modifiedAt: Date;
}

export interface SmbShareInfo {
  name: string;
  path: string;
}

@Injectable()
export class SmbService {
  private readonly logger = new Logger(SmbService.name);
  private readonly fileServerHost: string;
  private readonly domain: string;
  private readonly configuredShares: string[];

  constructor(private configService: ConfigService) {
    this.fileServerHost = this.configService.get<string>('fileServer.host') || 'dosya.mss.local';
    this.domain = this.configService.get<string>('fileServer.domain') || 'MSS';
    // Paylaşım listesi env'den okunur, yoksa varsayılan liste kullanılır
    const sharesEnv = this.configService.get<string>('fileServer.shares') || '';
    this.configuredShares = sharesEnv
      ? sharesEnv.split(',').map(s => s.trim()).filter(Boolean)
      : ['Public', 'Paylasim', 'Ortak', 'Documents', 'Users', 'Data'];
    this.logger.log(`Configured shares: ${this.configuredShares.join(', ')}`);
  }

  /**
   * Create SMB client for a specific share
   */
  private createClient(shareName: string, username: string, password: string): SMB2 {
    return new SMB2({
      share: `\\\\${this.fileServerHost}\\${shareName}`,
      domain: this.domain,
      username,
      password,
      autoCloseTimeout: 30000,
    });
  }

  /**
   * List all available shares on the server
   * Note: This requires listing the IPC$ share which may need admin rights
   * For simplicity, we'll return predefined shares or use a discovery method
   */
  async listShares(username: string, password: string): Promise<SmbShareInfo[]> {
    // SMB2 library doesn't support share enumeration directly
    // We'll try to connect to configured shares and return those that work
    const availableShares: SmbShareInfo[] = [];

    for (const shareName of this.configuredShares) {
      try {
        const client = this.createClient(shareName, username, password);
        // Try to read directory to verify access
        await new Promise<void>((resolve, reject) => {
          client.readdir('', (err) => {
            client.disconnect();
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });

        availableShares.push({
          name: shareName,
          path: `\\\\${this.fileServerHost}\\${shareName}`,
        });
      } catch {
        // Share doesn't exist or user doesn't have access
        this.logger.debug(`Share not accessible: ${shareName}`);
      }
    }

    return availableShares;
  }

  /**
   * List files and directories in a path
   */
  async listDirectory(
    shareName: string,
    path: string,
    username: string,
    password: string,
  ): Promise<SmbFileInfo[]> {
    const client = this.createClient(shareName, username, password);
    const normalizedPath = this.normalizePath(path);

    try {
      const files = await new Promise<SmbFileInfo[]>((resolve, reject) => {
        client.readdir(normalizedPath, (err, files) => {
          if (err) {
            reject(err);
            return;
          }

          // Get file stats for each file
          const filePromises = (files || []).map(
            (fileName) =>
              new Promise<SmbFileInfo | null>((resolveFile) => {
                const filePath = normalizedPath ? `${normalizedPath}\\${fileName}` : fileName;
                client.stat(filePath, (statErr, stats) => {
                  if (statErr || !stats) {
                    // If we can't stat the file, skip it
                    resolveFile(null);
                    return;
                  }
                  resolveFile({
                    name: fileName,
                    isDirectory: stats.isDirectory(),
                    size: (stats as unknown as { size?: number }).size || 0,
                    createdAt: stats.birthtime || new Date(),
                    modifiedAt: stats.mtime || new Date(),
                  });
                });
              }),
          );

          Promise.all(filePromises).then((results) => {
            resolve(results.filter((f): f is SmbFileInfo => f !== null));
          });
        });
      });

      return files;
    } finally {
      client.disconnect();
    }
  }

  /**
   * Read file content
   */
  async readFile(
    shareName: string,
    path: string,
    username: string,
    password: string,
  ): Promise<Buffer> {
    const client = this.createClient(shareName, username, password);
    const normalizedPath = this.normalizePath(path);

    try {
      return await new Promise<Buffer>((resolve, reject) => {
        client.readFile(normalizedPath, (err, data) => {
          if (err || !data) {
            reject(err || new Error('No data received'));
          } else {
            resolve(data);
          }
        });
      });
    } finally {
      client.disconnect();
    }
  }

  /**
   * Write file content
   * @param overwrite If true, deletes existing file before writing (for document save operations)
   */
  async writeFile(
    shareName: string,
    path: string,
    content: Buffer,
    username: string,
    password: string,
    overwrite: boolean = false,
  ): Promise<void> {
    const client = this.createClient(shareName, username, password);
    const normalizedPath = this.normalizePath(path);

    try {
      // If overwrite is enabled, try to delete existing file first
      if (overwrite) {
        try {
          await new Promise<void>((resolve, reject) => {
            client.unlink(normalizedPath, (err) => {
              // Ignore "file not found" errors - file may not exist
              if (err && !err.message?.includes('STATUS_OBJECT_NAME_NOT_FOUND')) {
                this.logger.warn(`Could not delete existing file for overwrite: ${err.message}`);
              }
              resolve();
            });
          });
        } catch {
          // Ignore deletion errors
        }
      }

      await new Promise<void>((resolve, reject) => {
        client.writeFile(normalizedPath, content, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } finally {
      client.disconnect();
    }
  }

  /**
   * Delete file
   */
  async deleteFile(
    shareName: string,
    path: string,
    username: string,
    password: string,
  ): Promise<void> {
    const client = this.createClient(shareName, username, password);
    const normalizedPath = this.normalizePath(path);

    try {
      await new Promise<void>((resolve, reject) => {
        client.unlink(normalizedPath, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } finally {
      client.disconnect();
    }
  }

  /**
   * Delete directory (must be empty)
   */
  async deleteDirectory(
    shareName: string,
    path: string,
    username: string,
    password: string,
  ): Promise<void> {
    const client = this.createClient(shareName, username, password);
    const normalizedPath = this.normalizePath(path);

    try {
      await new Promise<void>((resolve, reject) => {
        client.rmdir(normalizedPath, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } finally {
      client.disconnect();
    }
  }

  /**
   * Create directory
   */
  async createDirectory(
    shareName: string,
    path: string,
    username: string,
    password: string,
  ): Promise<void> {
    const client = this.createClient(shareName, username, password);
    const normalizedPath = this.normalizePath(path);

    try {
      await new Promise<void>((resolve, reject) => {
        client.mkdir(normalizedPath, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    } finally {
      client.disconnect();
    }
  }

  /**
   * Check if path exists
   */
  async exists(
    shareName: string,
    path: string,
    username: string,
    password: string,
  ): Promise<boolean> {
    const client = this.createClient(shareName, username, password);
    const normalizedPath = this.normalizePath(path);

    try {
      return await new Promise<boolean>((resolve) => {
        client.exists(normalizedPath, (err, exists) => {
          resolve(exists ?? false);
        });
      });
    } finally {
      client.disconnect();
    }
  }

  /**
   * Normalize path for SMB (convert forward slashes to backslashes, remove leading/trailing slashes)
   */
  private normalizePath(path: string): string {
    if (!path || path === '/' || path === '\\') {
      return '';
    }

    // Security: prevent path traversal
    if (path.includes('..')) {
      throw new Error('Path traversal detected');
    }

    return path
      .replace(/\//g, '\\')
      .replace(/^\\+/, '')
      .replace(/\\+$/, '');
  }
}
