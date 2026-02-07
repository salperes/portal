import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Res,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  Headers,
  ValidationPipe,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import type { Response, Request } from 'express';
import { FileServerService } from './file-server.service';
import { DocumentService } from './document.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User } from '../common/entities';
import {
  ListSharesResponseDto,
  ListFilesResponseDto,
  BrowseFilesDto,
  DownloadFileDto,
  DeleteFileDto,
  CreateFolderDto,
  UploadFileDto,
  OpenDocumentDto,
  DocumentConfigDto,
  DocumentCallbackDto,
} from './dto';

@ApiTags('File Server')
@Controller('file-server')
export class FileServerController {
  constructor(
    private readonly fileServerService: FileServerService,
    private readonly documentService: DocumentService,
  ) {}

  @Get('shares')
  @ApiOperation({ summary: 'Kullanılabilir paylaşımları listele' })
  @ApiResponse({ status: 200, type: ListSharesResponseDto })
  async listShares(@CurrentUser() user: User): Promise<ListSharesResponseDto> {
    const shares = await this.fileServerService.listShares(user.id, user.adUsername);
    return { shares };
  }

  @Get('browse')
  @ApiOperation({ summary: 'Klasör içeriğini listele' })
  @ApiResponse({ status: 200, type: ListFilesResponseDto })
  async browseFiles(
    @CurrentUser() user: User,
    @Query() query: BrowseFilesDto,
  ): Promise<ListFilesResponseDto> {
    return this.fileServerService.browseDirectory(
      user.id,
      user.adUsername,
      query.share,
      query.path || '',
    );
  }

  @Get('download')
  @ApiOperation({ summary: 'Dosya indir' })
  async downloadFile(
    @CurrentUser() user: User,
    @Query() query: DownloadFileDto,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, filename, mimeType } = await this.fileServerService.downloadFile(
      user.id,
      user.adUsername,
      query.share,
      query.path,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Dosya yükle' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        share: { type: 'string' },
        path: { type: 'string' },
      },
    },
  })
  async uploadFile(
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100MB
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() body: UploadFileDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.fileServerService.uploadFile(
      user.id,
      user.adUsername,
      body.share,
      body.path || '',
      file.originalname,
      file.buffer,
    );

    return { success: true, message: 'Dosya başarıyla yüklendi' };
  }

  @Delete('delete')
  @ApiOperation({ summary: 'Dosya veya klasör sil' })
  async deleteFile(
    @CurrentUser() user: User,
    @Query() query: DeleteFileDto,
    @Query('isDirectory') isDirectory?: string,
  ): Promise<{ success: boolean; message: string }> {
    if (isDirectory === 'true') {
      await this.fileServerService.deleteDirectory(
        user.id,
        user.adUsername,
        query.share,
        query.path,
      );
      return { success: true, message: 'Klasör başarıyla silindi' };
    } else {
      await this.fileServerService.deleteFile(
        user.id,
        user.adUsername,
        query.share,
        query.path,
      );
      return { success: true, message: 'Dosya başarıyla silindi' };
    }
  }

  @Post('create-folder')
  @ApiOperation({ summary: 'Yeni klasör oluştur' })
  async createFolder(
    @CurrentUser() user: User,
    @Body() body: CreateFolderDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.fileServerService.createDirectory(
      user.id,
      user.adUsername,
      body.share,
      body.path,
    );

    return { success: true, message: 'Klasör başarıyla oluşturuldu' };
  }

  // ==========================================
  // Document Editor Endpoints (ONLYOFFICE)
  // ==========================================

  @Get('document/config')
  @ApiOperation({ summary: 'ONLYOFFICE editör konfigürasyonu al' })
  @ApiResponse({ status: 200, type: DocumentConfigDto })
  async getDocumentConfig(
    @CurrentUser() user: User,
    @Query() query: OpenDocumentDto,
    @Req() req: Request,
  ): Promise<DocumentConfigDto> {
    // Build base URL for callbacks
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
    const apiBaseUrl = `${protocol}://${host}`;

    return this.documentService.getDocumentConfig(
      user.id,
      user.adUsername,
      user.displayName || user.adUsername,
      query.share,
      query.path,
      query.mode || 'view',
      apiBaseUrl,
    );
  }

  @Get('document/content')
  @Public()
  @ApiOperation({ summary: 'ONLYOFFICE için döküman içeriği (public endpoint)' })
  async getDocumentContent(
    @Query('key') key: string,
    @Res() res: Response,
  ): Promise<void> {
    // This endpoint is called by ONLYOFFICE server to fetch document content
    // It uses the document key to verify access and retrieve stored credentials
    const { buffer, filename, mimeType } = await this.documentService.getDocumentContentForOnlyOffice(key);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Post('document/callback')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'ONLYOFFICE callback endpoint' })
  async handleDocumentCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Body(new ValidationPipe({ transform: true, whitelist: false, forbidNonWhitelisted: false })) body: any,
    @Headers('authorization') authHeader: string,
  ): Promise<{ error: number }> {
    // ONLYOFFICE callback is called by the document server
    // Status codes:
    // 0 - no document with the key
    // 1 - document being edited
    // 2 - document ready for saving (all users closed)
    // 3 - document saving error
    // 4 - document closed with no changes
    // 6 - document being edited, but current state saved (forcesave)
    // 7 - error force saving document
    console.log('ONLYOFFICE callback received:', JSON.stringify(body, null, 2));

    // Handle user disconnect (action type 1 = disconnect)
    if (body.actions && Array.isArray(body.actions)) {
      for (const action of body.actions) {
        if (action.type === 1 && action.userid) {
          // User disconnected
          await this.documentService.removeActiveUser(body.key, action.userid);
          console.log(`User ${action.userid} disconnected from document ${body.key}`);
        }
      }
    }

    // For status 1 (editing) and 4 (closed without changes), just acknowledge
    if (body.status === 1 || body.status === 4) {
      return { error: 0 };
    }

    // For status 2 (ready to save) and 6 (forcesave), handle the save
    if ((body.status === 2 || body.status === 6) && body.url) {
      try {
        await this.documentService.handleCallbackSave(body.key, body.url);
        return { error: 0 };
      } catch (error) {
        console.error('Failed to save document from callback:', error);
        return { error: 1 };
      }
    }

    return { error: 0 };
  }

  @Get('document/check')
  @ApiOperation({ summary: 'Dosyanın ONLYOFFICE ile açılıp açılamayacağını kontrol et' })
  async checkDocumentSupport(
    @Query('filename') filename: string,
  ): Promise<{ canOpen: boolean; canEdit: boolean; documentType: string | null }> {
    const canOpen = this.documentService.canOpenDocument(filename);
    const canEdit = this.documentService.canEditDocument(filename);
    const documentType = canOpen ? this.documentService.getDocumentType(filename) : null;

    return { canOpen, canEdit, documentType };
  }

  @Get('document/active-users')
  @ApiOperation({ summary: 'Dökümanı düzenleyen aktif kullanıcıları listele' })
  async getActiveDocumentUsers(
    @Query('share') share: string,
    @Query('path') path: string,
  ): Promise<{ users: Array<{ id: string; name: string; joinedAt: string }> }> {
    const users = await this.documentService.getActiveUsers(share, path);
    return { users };
  }
}
