import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { FileServerService } from './file-server.service';
import { RedisService } from '../common/services';

interface DocumentConfig {
  document: {
    fileType: string;
    key: string;
    title: string;
    url: string;
    permissions: {
      edit: boolean;
      download: boolean;
      print: boolean;
    };
  };
  editorConfig: {
    mode: string;
    callbackUrl: string;
    lang: string;
    user: {
      id: string;
      name: string;
    };
    customization?: {
      autosave: boolean;
      forcesave: boolean;
    };
  };
  token: string;
}

interface CallbackData {
  key: string;
  status: number;
  url?: string;
  users?: string[];
}

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private readonly jwtSecret: string;
  private readonly onlyofficeUrl: string;

  // ONLYOFFICE supported file types
  private readonly documentTypes: Record<string, string> = {
    // Word processing
    '.doc': 'word',
    '.docx': 'word',
    '.odt': 'word',
    '.rtf': 'word',
    '.txt': 'word',
    // Spreadsheets
    '.xls': 'cell',
    '.xlsx': 'cell',
    '.ods': 'cell',
    '.csv': 'cell',
    // Presentations
    '.ppt': 'slide',
    '.pptx': 'slide',
    '.odp': 'slide',
    // PDF
    '.pdf': 'word',
  };

  private readonly editableTypes: string[] = [
    '.docx', '.xlsx', '.pptx', '.txt', '.csv',
  ];

  // Internal API URL for ONLYOFFICE to call back (container network)
  private readonly internalApiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly fileServerService: FileServerService,
    private readonly redisService: RedisService,
  ) {
    this.jwtSecret = this.configService.get<string>('onlyoffice.jwtSecret') || 'portal-onlyoffice-secret-key-2024';
    this.onlyofficeUrl = this.configService.get<string>('onlyoffice.serverUrl') || 'http://portal-test-onlyoffice';
    // ONLYOFFICE needs to reach the API through Docker network
    this.internalApiUrl = this.configService.get<string>('onlyoffice.internalApiUrl') || 'http://portal-test-api:3000';
    this.logger.log(`ONLYOFFICE server URL: ${this.onlyofficeUrl}`);
    this.logger.log(`Internal API URL for ONLYOFFICE: ${this.internalApiUrl}`);
  }

  /**
   * Check if a file can be opened with ONLYOFFICE
   */
  canOpenDocument(filename: string): boolean {
    const ext = this.getFileExtension(filename).toLowerCase();
    return ext in this.documentTypes;
  }

  /**
   * Check if a file can be edited (not just viewed)
   */
  canEditDocument(filename: string): boolean {
    const ext = this.getFileExtension(filename).toLowerCase();
    return this.editableTypes.includes(ext);
  }

  /**
   * Get document type for ONLYOFFICE
   */
  getDocumentType(filename: string): string {
    const ext = this.getFileExtension(filename).toLowerCase();
    return this.documentTypes[ext] || 'word';
  }

  /**
   * Generate ONLYOFFICE editor configuration
   * Supports collaborative editing - multiple users can edit the same document
   */
  async getDocumentConfig(
    userId: string,
    username: string,
    displayName: string,
    share: string,
    path: string,
    mode: 'view' | 'edit' = 'view',
    _apiBaseUrl: string, // Not used - we use internal Docker network URLs
  ): Promise<DocumentConfig> {
    const filename = path.split('/').pop() || path.split('\\').pop() || path;
    const ext = this.getFileExtension(filename).toLowerCase();

    if (!this.canOpenDocument(filename)) {
      throw new BadRequestException(`Bu dosya türü desteklenmiyor: ${ext}`);
    }

    const canEdit = this.canEditDocument(filename) && mode === 'edit';
    const documentType = this.getDocumentType(filename);

    // For collaborative editing: reuse existing session key or create new one
    // This allows multiple users to edit the same document simultaneously
    const documentKey = await this.getOrCreateDocumentKey(share, path, canEdit);

    // Build URLs for ONLYOFFICE - use internal Docker network URLs
    // ONLYOFFICE container needs to reach API through Docker network, not localhost
    const documentUrl = `${this.internalApiUrl}/api/file-server/document/content?key=${documentKey}`;
    const callbackUrl = `${this.internalApiUrl}/api/file-server/document/callback`;

    this.logger.debug(`Document URL for ONLYOFFICE: ${documentUrl}`);
    this.logger.debug(`Callback URL for ONLYOFFICE: ${callbackUrl}`);

    const configWithoutToken = {
      document: {
        fileType: ext.replace('.', ''),
        key: documentKey,
        title: filename,
        url: documentUrl,
        permissions: {
          edit: canEdit,
          download: true,
          print: true,
        },
      },
      editorConfig: {
        mode: canEdit ? 'edit' : 'view',
        callbackUrl: callbackUrl,
        lang: 'tr',
        user: {
          id: userId,
          name: displayName || username,
        },
        customization: {
          autosave: true,
          forcesave: true,
        },
      },
    };

    // Sign the config with JWT and return complete config
    const config: DocumentConfig = {
      ...configWithoutToken,
      token: this.signConfig(configWithoutToken),
    };

    // Store document access info in Redis for ONLYOFFICE to fetch content
    // TTL: 1 hour (document session timeout)
    await this.storeDocumentAccess(documentKey, userId, username, share, path, displayName);

    return config;
  }

  /**
   * Store temporary document access info for ONLYOFFICE
   */
  private async storeDocumentAccess(
    documentKey: string,
    userId: string,
    username: string,
    share: string,
    path: string,
    displayName: string,
  ): Promise<void> {
    const accessInfo = JSON.stringify({ userId, username, share, path });
    const redisKey = `doc-access:${documentKey}`;
    // Store for 1 hour
    await this.redisService.set(redisKey, accessInfo, 3600);

    // Track active users for this document session
    await this.addActiveUser(documentKey, userId, displayName);

    this.logger.debug(`Stored document access for key: ${documentKey}`);
  }

  /**
   * Add user to active editors list
   */
  private async addActiveUser(documentKey: string, userId: string, displayName: string): Promise<void> {
    const usersKey = `doc-users:${documentKey}`;
    const existingUsers = await this.redisService.get(usersKey);
    const users: Array<{ id: string; name: string; joinedAt: string }> = existingUsers ? JSON.parse(existingUsers) : [];

    // Check if user already in list
    if (!users.some(u => u.id === userId)) {
      users.push({ id: userId, name: displayName, joinedAt: new Date().toISOString() });
      await this.redisService.set(usersKey, JSON.stringify(users), 3600);
    }
  }

  /**
   * Remove user from active editors list
   */
  async removeActiveUser(documentKey: string, userId: string): Promise<void> {
    const usersKey = `doc-users:${documentKey}`;
    const existingUsers = await this.redisService.get(usersKey);

    if (existingUsers) {
      const users = JSON.parse(existingUsers).filter((u: { id: string }) => u.id !== userId);
      if (users.length > 0) {
        await this.redisService.set(usersKey, JSON.stringify(users), 3600);
      } else {
        await this.redisService.del(usersKey);
      }
    }
  }

  /**
   * Get list of users currently editing a document
   */
  async getActiveUsers(share: string, path: string): Promise<Array<{ id: string; name: string; joinedAt: string }>> {
    const sessionKey = `doc-session:${share}:${path}`;
    const documentKey = await this.redisService.get(sessionKey);

    if (!documentKey) {
      return [];
    }

    const usersKey = `doc-users:${documentKey}`;
    const existingUsers = await this.redisService.get(usersKey);

    return existingUsers ? JSON.parse(existingUsers) : [];
  }

  /**
   * Get document content for ONLYOFFICE (called from public endpoint)
   */
  async getDocumentContentForOnlyOffice(
    documentKey: string,
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const redisKey = `doc-access:${documentKey}`;
    const accessInfo = await this.redisService.get(redisKey);

    if (!accessInfo) {
      this.logger.warn(`Document access not found for key: ${documentKey}`);
      throw new BadRequestException('Document access expired or invalid');
    }

    const { userId, username, share, path } = JSON.parse(accessInfo);
    this.logger.debug(`Fetching document content for ONLYOFFICE: share=${share}, path=${path}`);

    return this.fileServerService.downloadFile(userId, username, share, path);
  }

  /**
   * Handle ONLYOFFICE callback save (called from controller)
   * This retrieves user info from Redis using the document key
   */
  async handleCallbackSave(documentKey: string, downloadUrl: string): Promise<void> {
    this.logger.log(`Processing document save: key=${documentKey}`);

    // Get stored access info from Redis
    const redisKey = `doc-access:${documentKey}`;
    const accessInfo = await this.redisService.get(redisKey);

    if (!accessInfo) {
      this.logger.error(`Document access not found for key: ${documentKey}`);
      throw new Error('Document access expired or invalid');
    }

    const { userId, username, share, path } = JSON.parse(accessInfo);
    this.logger.log(`Saving document for user ${username}: ${share}/${path}`);

    // Download the edited document from ONLYOFFICE
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Failed to download edited document: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = path.split('/').pop() || path.split('\\').pop() || 'document';
    const directory = path.substring(0, path.lastIndexOf('/')) || path.substring(0, path.lastIndexOf('\\')) || '';

    // Save back to file server (overwrite existing file)
    await this.fileServerService.uploadFile(
      userId,
      username,
      share,
      directory,
      filename,
      buffer,
      true, // overwrite = true for document save
    );

    // Invalidate session so next open gets fresh content with new key
    await this.invalidateDocumentSession(share, path);

    this.logger.log(`Document saved successfully: ${share}/${path}`);
  }

  /**
   * Get existing document session key or create a new one
   * This enables collaborative editing - multiple users share the same key
   */
  private async getOrCreateDocumentKey(share: string, path: string, isEditMode: boolean): Promise<string> {
    const sessionKey = `doc-session:${share}:${path}`;

    // Check for existing editing session
    const existingKey = await this.redisService.get(sessionKey);

    if (existingKey) {
      this.logger.log(`Joining existing document session: ${existingKey}`);
      // Extend session TTL when someone joins
      await this.redisService.set(sessionKey, existingKey, 3600);
      return existingKey;
    }

    // Create new session key
    const newKey = this.generateDocumentKey(share, path);

    // Only store session for edit mode (view mode doesn't need collaboration)
    if (isEditMode) {
      await this.redisService.set(sessionKey, newKey, 3600); // 1 hour TTL
      this.logger.log(`Created new document session: ${newKey}`);
    }

    return newKey;
  }

  /**
   * Generate a unique document key (without timestamp for collaborative editing)
   */
  private generateDocumentKey(share: string, path: string): string {
    // Use random component instead of timestamp to ensure uniqueness per session
    const randomPart = crypto.randomBytes(8).toString('hex');
    const data = `${share}:${path}:${randomPart}`;
    const hash = crypto.createHash('md5').update(data).digest('hex').substring(0, 20);
    // Encode share and path in the key for later retrieval
    const encoded = Buffer.from(JSON.stringify({ share, path })).toString('base64url');
    return `${hash}_${encoded}`;
  }

  /**
   * Invalidate document session after save (forces new session for fresh content)
   */
  private async invalidateDocumentSession(share: string, path: string): Promise<void> {
    const sessionKey = `doc-session:${share}:${path}`;
    await this.redisService.del(sessionKey);
    this.logger.log(`Invalidated document session: ${share}/${path}`);
  }

  /**
   * Parse document key to retrieve share and path
   */
  private parseDocumentKey(key: string): { share: string; path: string } {
    try {
      const parts = key.split('_');
      if (parts.length >= 2) {
        const encoded = parts.slice(1).join('_');
        const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString());
        return { share: decoded.share, path: decoded.path };
      }
    } catch {
      this.logger.warn(`Failed to parse document key: ${key}`);
    }
    throw new BadRequestException('Invalid document key');
  }

  /**
   * Sign configuration with JWT for ONLYOFFICE
   */
  private signConfig(config: Omit<DocumentConfig, 'token'>): string {
    return jwt.sign(config, this.jwtSecret, { algorithm: 'HS256' });
  }

  /**
   * Get file extension
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot);
  }
}
