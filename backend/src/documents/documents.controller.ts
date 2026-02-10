import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  ParseIntPipe,
  ParseFilePipe,
  MaxFileSizeValidator,
  Res,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { DocumentsService } from './documents.service';
import { CreateFolderDto, UpdateFolderDto, UploadDocumentDto, UpdateDocumentDto, CreateFolderPermissionDto, CreateNewDocumentDto } from './dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { User } from '../common/entities';

@ApiTags('Documents')
@ApiBearerAuth()
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ─── Folder Endpoints ────────────────────────────────────────

  @Post('folders')
  @ApiOperation({ summary: 'Klasör oluştur' })
  createFolder(
    @Body() dto: CreateFolderDto,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.createFolder(dto, user);
  }

  @Get('folders')
  @ApiOperation({ summary: 'Klasörleri listele' })
  @ApiQuery({ name: 'parentId', required: false, type: String })
  @ApiQuery({ name: 'projectId', required: false, type: String })
  @ApiQuery({ name: 'all', required: false, type: String, description: 'true = tüm klasörleri döndür' })
  findFolders(
    @Query('parentId') parentId?: string,
    @Query('projectId') projectId?: string,
    @Query('all') all?: string,
    @CurrentUser() user?: User,
  ) {
    return this.documentsService.findFolders({ parentId, projectId, all: all === 'true', user });
  }

  @Get('folders/:id')
  @ApiOperation({ summary: 'Klasör detayı + dokümanlar' })
  findFolder(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.findFolderById(id);
  }

  @Get('folders/:id/tree')
  @ApiOperation({ summary: 'Alt klasör ağacı' })
  getFolderTree(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.getFolderTree(id);
  }

  @Get('folders/:id/breadcrumb')
  @ApiOperation({ summary: 'Klasör ekmek kırıntısı' })
  getFolderBreadcrumb(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.getFolderBreadcrumb(id);
  }

  @Get('folders/:id/my-permissions')
  @ApiOperation({ summary: 'Kullanıcının klasör üzerindeki etkin izinleri' })
  getMyPermissions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.getMyPermissions(id, user);
  }

  @Patch('folders/:id')
  @ApiOperation({ summary: 'Klasör güncelle' })
  updateFolder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFolderDto,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.updateFolder(id, dto, user);
  }

  @Delete('folders/:id')
  @ApiOperation({ summary: 'Klasör sil' })
  removeFolder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.removeFolder(id, user);
  }

  // ─── Folder Permission Endpoints ───────────────────────────────

  @Get('folders/:id/permissions')
  @ApiOperation({ summary: 'Klasör erişim kurallarını listele' })
  getFolderPermissions(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.getFolderPermissions(id);
  }

  @Post('folders/:id/permissions')
  @ApiOperation({ summary: 'Klasöre erişim kuralı ekle' })
  addFolderPermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFolderPermissionDto,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.addFolderPermission(id, dto, user.id, user.role);
  }

  @Delete('folders/:id/permissions/:ruleId')
  @ApiOperation({ summary: 'Klasör erişim kuralını sil' })
  removeFolderPermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.removeFolderPermission(id, ruleId, user.id, user.role);
  }

  // ─── Folder Restore / Permanent Delete ─────────────────────

  @Post('folders/:id/restore')
  @ApiOperation({ summary: 'Silinmiş klasörü geri yükle' })
  restoreFolder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.restoreFolder(id, user);
  }

  @Delete('folders/:id/permanent')
  @ApiOperation({ summary: 'Silinmiş klasörü kalıcı olarak sil (admin/supervisor)' })
  permanentDeleteFolder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.permanentDeleteFolder(id, user);
  }

  // ─── Recycle Bin ──────────────────────────────────────────────

  @Get('recycle-bin')
  @ApiOperation({ summary: 'Çöp kutusundaki öğeleri listele' })
  getRecycleBin(@CurrentUser() user: User) {
    return this.documentsService.getRecycleBin(user);
  }

  // ─── Document Endpoints ──────────────────────────────────────

  @Post('create-new')
  @ApiOperation({ summary: 'Yeni boş dosya oluştur (Word, Excel, PowerPoint, Text)' })
  createNewDocument(
    @Body() dto: CreateNewDocumentDto,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.createEmptyDocument(dto, user);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Doküman yükle' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        folderId: { type: 'string', description: 'Hedef klasör UUID' },
        description: { type: 'string', description: 'Açıklama (opsiyonel)' },
      },
      required: ['file', 'folderId'],
    },
  })
  uploadDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100MB
        ],
      }),
    )
    file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.uploadDocument(file, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Dokümanları listele' })
  @ApiQuery({ name: 'folderId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findDocuments(
    @Query('folderId') folderId?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser() user?: User,
  ) {
    return this.documentsService.findDocuments({
      folderId,
      search,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      user,
    });
  }

  // ─── ONLYOFFICE Editor Endpoints (static routes BEFORE :id) ──

  @Get('editor/content')
  @Public()
  @ApiOperation({ summary: 'ONLYOFFICE için doküman içeriği' })
  async getEditorContent(
    @Query('key') key: string,
    @Res() res: Response,
  ) {
    const { buffer, filename, mimeType } = await this.documentsService.getEditorContent(key);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Post('editor/callback')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'ONLYOFFICE callback endpoint' })
  async handleEditorCallback(@Body() body: any): Promise<{ error: number }> {
    if (body.actions && Array.isArray(body.actions)) {
      for (const action of body.actions) {
        if (action.type === 1 && action.userid) {
          await this.documentsService.removeActiveUser(body.key, action.userid);
        }
      }
    }

    if (body.status === 1 || body.status === 4) {
      return { error: 0 };
    }

    if ((body.status === 2 || body.status === 6) && body.url) {
      try {
        await this.documentsService.handleEditorCallback(body.key, body.url);
        return { error: 0 };
      } catch (error) {
        return { error: 1 };
      }
    }

    return { error: 0 };
  }

  // ─── Document Restore / Permanent Delete ───────────────────

  @Post(':id/restore')
  @ApiOperation({ summary: 'Silinmiş dokümanı geri yükle' })
  restoreDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.restoreDocument(id, user);
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Silinmiş dokümanı kalıcı olarak sil (admin/supervisor)' })
  permanentDeleteDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.permanentDeleteDocument(id, user);
  }

  // ─── Document Detail & CRUD ─────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Doküman detayı' })
  findDocument(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.findDocumentById(id);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Doküman indir' })
  async downloadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    const { buffer, document } = await this.documentsService.downloadDocument(id, user);

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(document.name)}"`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Doküman metadata güncelle' })
  updateDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDocumentDto,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.updateDocument(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Doküman sil' })
  removeDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.removeDocument(id, user);
  }

  // ─── Version Endpoints ───────────────────────────────────────

  @Post(':id/versions')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Yeni versiyon yükle' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        changeNote: { type: 'string', description: 'Değişiklik notu (opsiyonel)' },
      },
      required: ['file'],
    },
  })
  uploadNewVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100MB
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: User,
    @Body('changeNote') changeNote?: string,
  ) {
    return this.documentsService.uploadNewVersion(id, file, user, changeNote);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Versiyonları listele' })
  getVersions(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.getVersions(id);
  }

  @Get(':id/versions/:versionNumber/download')
  @ApiOperation({ summary: 'Belirli versiyonu indir' })
  async downloadVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('versionNumber', ParseIntPipe) versionNumber: number,
    @Res() res: Response,
  ) {
    const { buffer, version, document } =
      await this.documentsService.downloadVersion(id, versionNumber);

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(document.name)}"`,
    );
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  // ─── Document Permission Endpoints ────────────────────────

  @Get(':id/permissions')
  @ApiOperation({ summary: 'Doküman erişim kurallarını listele (kendi + inherited)' })
  getDocumentPermissions(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.getDocumentPermissions(id);
  }

  @Post(':id/permissions')
  @ApiOperation({ summary: 'Dokümana erişim kuralı ekle' })
  addDocumentPermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFolderPermissionDto,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.addDocumentPermission(id, dto, user.id, user.role);
  }

  @Delete(':id/permissions/:ruleId')
  @ApiOperation({ summary: 'Doküman erişim kuralını sil' })
  removeDocumentPermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @CurrentUser() user: User,
  ) {
    return this.documentsService.removeDocumentPermission(id, ruleId, user.id, user.role);
  }

  // ─── Editor Config Endpoints (parametric) ──────────────────

  @Get(':id/editor-config')
  @ApiOperation({ summary: 'ONLYOFFICE editor konfigürasyonu' })
  @ApiQuery({ name: 'mode', required: false, enum: ['view', 'edit'] })
  getEditorConfig(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @Query('mode') mode?: 'view' | 'edit',
  ) {
    return this.documentsService.getEditorConfig(
      id,
      user.id,
      user.displayName || user.adUsername,
      mode || 'view',
    );
  }

  @Get(':id/editor-check')
  @ApiOperation({ summary: 'ONLYOFFICE desteği kontrol' })
  checkEditorSupport(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.checkEditorSupport(id);
  }

  @Get(':id/active-users')
  @ApiOperation({ summary: 'Aktif düzenleyiciler' })
  getActiveUsers(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentsService.getActiveEditors(id);
  }
}
