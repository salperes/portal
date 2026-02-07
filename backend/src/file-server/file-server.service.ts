import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SmbService, SmbFileInfo } from './smb.service';
import { RedisService } from '../common/services';
import { FileItemDto, ShareItemDto } from './dto';
import * as path from 'path';
import * as mime from 'mime-types';

@Injectable()
export class FileServerService {
  private readonly logger = new Logger(FileServerService.name);

  constructor(
    private smbService: SmbService,
    private redisService: RedisService,
  ) {}

  /**
   * Get user credentials from Redis
   */
  private async getUserCredentials(
    userId: string,
    username: string,
  ): Promise<{ username: string; password: string }> {
    const password = await this.redisService.getUserCredentials(userId);

    if (!password) {
      throw new UnauthorizedException(
        'Dosya sunucusu kimlik bilgileri bulunamadı. Lütfen tekrar giriş yapın.',
      );
    }

    return { username, password };
  }

  /**
   * List available shares
   */
  async listShares(userId: string, username: string): Promise<ShareItemDto[]> {
    const creds = await this.getUserCredentials(userId, username);

    try {
      const shares = await this.smbService.listShares(creds.username, creds.password);
      return shares;
    } catch (error) {
      this.logger.error(`Failed to list shares for user ${username}: ${error.message}`);
      throw new BadRequestException('Paylaşımlar listelenirken hata oluştu');
    }
  }

  /**
   * Browse directory contents
   */
  async browseDirectory(
    userId: string,
    username: string,
    share: string,
    dirPath: string = '',
  ): Promise<{ path: string; share: string; items: FileItemDto[] }> {
    this.validatePath(dirPath);
    const creds = await this.getUserCredentials(userId, username);

    try {
      const files = await this.smbService.listDirectory(share, dirPath, creds.username, creds.password);

      const items = files.map((file) => this.mapToFileItem(file));

      // Sort: directories first, then by name
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name, 'tr');
      });

      return {
        path: dirPath,
        share,
        items,
      };
    } catch (error) {
      this.logger.error(`Failed to browse ${share}/${dirPath} for user ${username}: ${error.message}`);

      if (error.message?.includes('STATUS_ACCESS_DENIED')) {
        throw new UnauthorizedException('Bu klasöre erişim yetkiniz yok');
      }
      if (error.message?.includes('STATUS_OBJECT_NAME_NOT_FOUND')) {
        throw new NotFoundException('Klasör bulunamadı');
      }

      throw new BadRequestException('Klasör içeriği alınırken hata oluştu');
    }
  }

  /**
   * Download a file
   */
  async downloadFile(
    userId: string,
    username: string,
    share: string,
    filePath: string,
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    this.validatePath(filePath);
    const creds = await this.getUserCredentials(userId, username);

    try {
      const buffer = await this.smbService.readFile(share, filePath, creds.username, creds.password);
      const filename = path.basename(filePath);
      const mimeType = mime.lookup(filename) || 'application/octet-stream';

      return { buffer, filename, mimeType };
    } catch (error) {
      this.logger.error(`Failed to download ${share}/${filePath} for user ${username}: ${error.message}`);

      if (error.message?.includes('STATUS_ACCESS_DENIED')) {
        throw new UnauthorizedException('Bu dosyaya erişim yetkiniz yok');
      }
      if (error.message?.includes('STATUS_OBJECT_NAME_NOT_FOUND')) {
        throw new NotFoundException('Dosya bulunamadı');
      }

      throw new BadRequestException('Dosya indirilirken hata oluştu');
    }
  }

  /**
   * Upload a file
   * @param overwrite If true, overwrites existing file (used for document save operations)
   */
  async uploadFile(
    userId: string,
    username: string,
    share: string,
    dirPath: string,
    filename: string,
    content: Buffer,
    overwrite: boolean = false,
  ): Promise<void> {
    this.validatePath(dirPath);
    this.validateFilename(filename);
    const creds = await this.getUserCredentials(userId, username);

    const fullPath = dirPath ? `${dirPath}\\${filename}` : filename;

    try {
      await this.smbService.writeFile(share, fullPath, content, creds.username, creds.password, overwrite);
      this.logger.log(`File uploaded: ${share}/${fullPath} by ${username}`);
    } catch (error) {
      this.logger.error(`Failed to upload to ${share}/${fullPath} for user ${username}: ${error.message}`);

      if (error.message?.includes('STATUS_ACCESS_DENIED')) {
        throw new UnauthorizedException('Bu klasöre dosya yükleme yetkiniz yok');
      }

      throw new BadRequestException('Dosya yüklenirken hata oluştu');
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(
    userId: string,
    username: string,
    share: string,
    filePath: string,
  ): Promise<void> {
    this.validatePath(filePath);
    const creds = await this.getUserCredentials(userId, username);

    try {
      await this.smbService.deleteFile(share, filePath, creds.username, creds.password);
      this.logger.log(`File deleted: ${share}/${filePath} by ${username}`);
    } catch (error) {
      this.logger.error(`Failed to delete ${share}/${filePath} for user ${username}: ${error.message}`);

      if (error.message?.includes('STATUS_ACCESS_DENIED')) {
        throw new UnauthorizedException('Bu dosyayı silme yetkiniz yok');
      }
      if (error.message?.includes('STATUS_OBJECT_NAME_NOT_FOUND')) {
        throw new NotFoundException('Dosya bulunamadı');
      }

      throw new BadRequestException('Dosya silinirken hata oluştu');
    }
  }

  /**
   * Delete a directory (must be empty)
   */
  async deleteDirectory(
    userId: string,
    username: string,
    share: string,
    dirPath: string,
  ): Promise<void> {
    this.validatePath(dirPath);
    const creds = await this.getUserCredentials(userId, username);

    try {
      await this.smbService.deleteDirectory(share, dirPath, creds.username, creds.password);
      this.logger.log(`Directory deleted: ${share}/${dirPath} by ${username}`);
    } catch (error) {
      this.logger.error(`Failed to delete directory ${share}/${dirPath} for user ${username}: ${error.message}`);

      if (error.message?.includes('STATUS_ACCESS_DENIED')) {
        throw new UnauthorizedException('Bu klasörü silme yetkiniz yok');
      }
      if (error.message?.includes('STATUS_DIRECTORY_NOT_EMPTY')) {
        throw new BadRequestException('Klasör boş değil');
      }

      throw new BadRequestException('Klasör silinirken hata oluştu');
    }
  }

  /**
   * Create a new directory
   */
  async createDirectory(
    userId: string,
    username: string,
    share: string,
    dirPath: string,
  ): Promise<void> {
    this.validatePath(dirPath);
    const creds = await this.getUserCredentials(userId, username);

    try {
      await this.smbService.createDirectory(share, dirPath, creds.username, creds.password);
      this.logger.log(`Directory created: ${share}/${dirPath} by ${username}`);
    } catch (error) {
      this.logger.error(`Failed to create directory ${share}/${dirPath} for user ${username}: ${error.message}`);

      if (error.message?.includes('STATUS_ACCESS_DENIED')) {
        throw new UnauthorizedException('Bu konumda klasör oluşturma yetkiniz yok');
      }
      if (error.message?.includes('STATUS_OBJECT_NAME_COLLISION')) {
        throw new BadRequestException('Bu isimde bir klasör zaten var');
      }

      throw new BadRequestException('Klasör oluşturulurken hata oluştu');
    }
  }

  /**
   * Validate path for security (prevent path traversal)
   */
  private validatePath(pathStr: string): void {
    if (pathStr && pathStr.includes('..')) {
      throw new BadRequestException('Geçersiz yol');
    }
  }

  /**
   * Validate filename for security
   */
  private validateFilename(filename: string): void {
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(filename)) {
      throw new BadRequestException('Geçersiz dosya adı');
    }
  }

  /**
   * Map SMB file info to DTO
   */
  private mapToFileItem(file: SmbFileInfo): FileItemDto {
    const ext = file.isDirectory ? undefined : path.extname(file.name).toLowerCase().replace('.', '');

    return {
      name: file.name,
      isDirectory: file.isDirectory,
      size: file.size,
      createdAt: file.createdAt,
      modifiedAt: file.modifiedAt,
      extension: ext,
      mimeType: file.isDirectory ? undefined : (mime.lookup(file.name) || undefined),
    };
  }
}
