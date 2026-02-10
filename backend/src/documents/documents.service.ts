import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { Folder, Document, DocumentVersion, AccessRule, ResourceType, RuleType, User, UserRole, Group } from '../common/entities';
import { MinioService, RedisService } from '../common/services';
import { AccessService } from '../access/access.service';
import { CreateFolderDto, UpdateFolderDto, UploadDocumentDto, UpdateDocumentDto, CreateFolderPermissionDto, CreateNewDocumentDto } from './dto';
import { generateTemplate } from './document-templates';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly jwtSecret: string;
  private readonly internalApiUrl: string;

  private readonly documentTypes: Record<string, string> = {
    '.doc': 'word', '.docx': 'word', '.odt': 'word', '.rtf': 'word', '.txt': 'word',
    '.xls': 'cell', '.xlsx': 'cell', '.ods': 'cell', '.csv': 'cell',
    '.ppt': 'slide', '.pptx': 'slide', '.odp': 'slide',
    '.pdf': 'word',
  };

  private readonly editableTypes = ['.docx', '.xlsx', '.pptx', '.txt', '.csv'];

  constructor(
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(DocumentVersion)
    private readonly versionRepository: Repository<DocumentVersion>,
    @InjectRepository(AccessRule)
    private readonly accessRuleRepository: Repository<AccessRule>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    private readonly minioService: MinioService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly accessService: AccessService,
  ) {
    this.jwtSecret = this.configService.get<string>('onlyoffice.jwtSecret') || 'portal-onlyoffice-secret-key-2024';
    this.internalApiUrl = this.configService.get<string>('onlyoffice.internalApiUrl') || 'http://portal-test-api:3000';
  }

  // ─── Folder Operations ───────────────────────────────────────

  async createFolder(dto: CreateFolderDto, user: User): Promise<Folder> {
    // Validate parent exists
    if (dto.parentId) {
      const parent = await this.folderRepository.findOne({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException('Üst klasör bulunamadı');
      }
      // Check write permission on parent folder
      await this.enforceFolderPermission(user, dto.parentId, 'write', { ownerId: parent.ownerId });
    }

    const folder = this.folderRepository.create({
      name: dto.name,
      parentId: dto.parentId || null,
      projectId: dto.projectId || null,
      ownerId: user.id,
    });

    const saved = await this.folderRepository.save(folder);

    // Build materialized path
    saved.path = await this.buildPath(saved.id);
    await this.folderRepository.save(saved);

    this.logger.log(`Folder created: ${saved.name} (${saved.id})`);
    return saved;
  }

  async findFolders(options?: {
    parentId?: string;
    projectId?: string;
    all?: boolean;
    user?: User;
  }): Promise<Folder[]> {
    const { parentId, projectId, all, user } = options || {};

    const where: any = { isDeleted: false };
    if (all) {
      // Return all folders (no parentId filter)
    } else if (parentId) {
      where.parentId = parentId;
    } else if (!projectId) {
      where.parentId = IsNull();
    }
    if (projectId) {
      where.projectId = projectId;
    }

    const folders = await this.folderRepository.find({
      where,
      relations: ['owner'],
      order: { name: 'ASC' },
    });

    // Apply access control filtering
    if (!user || user.role === UserRole.ADMIN) return folders;
    if (folders.length === 0) return folders;

    // Collect folder IDs + ancestor IDs from paths for inheritance check
    const folderIdSet = new Set(folders.map(f => f.id));
    const allIdsToCheck = new Set(folderIdSet);
    for (const f of folders) {
      if (f.path) {
        for (const pid of f.path.split('/')) {
          if (pid) allIdsToCheck.add(pid);
        }
      }
    }

    const accessibleIds = await this.accessService.getAccessibleFolderIds(user, [...allIdsToCheck]);

    // A folder is visible if:
    // 1. User is the folder owner
    // 2. Folder has direct access
    // 3. Any ancestor has access (inherited permissions)
    return folders.filter(f => {
      if (f.ownerId === user.id) return true;
      if (accessibleIds.has(f.id)) return true;
      if (f.path) {
        const pathIds = f.path.split('/').filter(Boolean);
        for (const pid of pathIds) {
          if (pid !== f.id && accessibleIds.has(pid)) return true;
        }
      }
      return false;
    });
  }

  async findFolderById(id: string): Promise<Folder & { documents: Document[] }> {
    const folder = await this.folderRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['owner', 'children', 'project'],
    });

    if (!folder) {
      throw new NotFoundException('Klasör bulunamadı');
    }

    const documents = await this.documentRepository.find({
      where: { folderId: id, isDeleted: false },
      relations: ['creator'],
      order: { name: 'ASC' },
    });

    return { ...folder, documents };
  }

  async getFolderTree(rootId?: string): Promise<Folder[]> {
    if (rootId) {
      const root = await this.folderRepository.findOne({ where: { id: rootId } });
      if (!root) {
        throw new NotFoundException('Klasör bulunamadı');
      }
    }

    const allFolders = await this.folderRepository.find({
      where: { isDeleted: false },
      relations: ['owner'],
      order: { name: 'ASC' },
    });

    // Build tree
    const map = new Map<string, Folder & { children: Folder[] }>();
    for (const f of allFolders) {
      map.set(f.id, { ...f, children: [] });
    }

    const roots: Folder[] = [];
    for (const f of map.values()) {
      if (f.parentId && map.has(f.parentId)) {
        map.get(f.parentId)!.children.push(f);
      } else if (!f.parentId) {
        roots.push(f);
      }
    }

    if (rootId) {
      const target = map.get(rootId);
      return target ? [target] : [];
    }

    return roots;
  }

  async getFolderBreadcrumb(folderId: string): Promise<{ id: string; name: string }[]> {
    const breadcrumb: { id: string; name: string }[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      const folder = await this.folderRepository.findOne({ where: { id: currentId } });
      if (!folder) break;
      breadcrumb.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parentId;
    }

    return breadcrumb;
  }

  async updateFolder(id: string, dto: UpdateFolderDto, user: User): Promise<Folder> {
    const folder = await this.folderRepository.findOne({ where: { id } });
    if (!folder) {
      throw new NotFoundException('Klasör bulunamadı');
    }

    // Check write permission on folder
    await this.enforceFolderPermission(user, id, 'write', { ownerId: folder.ownerId });

    // Prevent moving to own subtree
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new BadRequestException('Klasör kendisinin alt klasörü olamaz');
      }
      const parent = await this.folderRepository.findOne({ where: { id: dto.parentId } });
      if (!parent) {
        throw new NotFoundException('Üst klasör bulunamadı');
      }
      // Check circular: walk up from parent to make sure we don't find `id`
      let checkId: string | null = dto.parentId;
      while (checkId) {
        if (checkId === id) {
          throw new BadRequestException('Döngüsel klasör yapısı oluşturulamaz');
        }
        const check = await this.folderRepository.findOne({ where: { id: checkId } });
        checkId = check?.parentId || null;
      }
    }

    if (dto.name !== undefined) folder.name = dto.name;
    if (dto.parentId !== undefined) folder.parentId = dto.parentId || null;

    const saved = await this.folderRepository.save(folder);

    // Rebuild path if parent changed
    if (dto.parentId !== undefined) {
      saved.path = await this.buildPath(saved.id);
      await this.folderRepository.save(saved);
    }

    this.logger.log(`Folder updated: ${saved.name} (${saved.id})`);
    return saved;
  }

  async removeFolder(id: string, user: User): Promise<void> {
    const folder = await this.folderRepository.findOne({ where: { id, isDeleted: false } });
    if (!folder) {
      throw new NotFoundException('Klasör bulunamadı');
    }

    // Check delete permission on folder
    await this.enforceFolderPermission(user, id, 'delete', { ownerId: folder.ownerId });

    // Soft delete: cascade to all descendants
    await this.softDeleteFolderCascade(id, user.id);
    this.logger.log(`Folder soft-deleted (cascade): ${folder.name} (${id})`);
  }

  private async softDeleteFolderCascade(folderId: string, userId: string): Promise<void> {
    const now = new Date();

    // Soft-delete documents in this folder
    await this.documentRepository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true, deletedAt: now, deletedBy: userId })
      .where('folder_id = :folderId AND is_deleted = false', { folderId })
      .execute();

    // Soft-delete child folders (recursively)
    const children = await this.folderRepository.find({
      where: { parentId: folderId, isDeleted: false },
    });
    for (const child of children) {
      await this.softDeleteFolderCascade(child.id, userId);
    }

    // Soft-delete the folder itself
    await this.folderRepository.update(folderId, {
      isDeleted: true,
      deletedAt: now,
      deletedBy: userId,
    });
  }

  // ─── Document Operations ─────────────────────────────────────

  async createEmptyDocument(dto: CreateNewDocumentDto, user: User): Promise<Document> {
    const folder = await this.folderRepository.findOne({ where: { id: dto.folderId } });
    if (!folder) {
      throw new NotFoundException('Klasör bulunamadı');
    }

    // Check write permission on folder
    await this.enforceFolderPermission(user, dto.folderId, 'write', { ownerId: folder.ownerId });

    const { buffer, mimeType } = await generateTemplate(dto.type);
    const filename = `${dto.name}.${dto.type}`;

    const doc = this.documentRepository.create({
      folderId: dto.folderId,
      name: filename,
      mimeType,
      sizeBytes: buffer.length,
      storageKey: '',
      currentVersion: 1,
      createdBy: user.id,
    });

    const saved = await this.documentRepository.save(doc);

    const storageKey = `${dto.folderId}/${saved.id}/v1/${filename}`;
    saved.storageKey = storageKey;
    await this.documentRepository.save(saved);

    await this.minioService.upload(storageKey, buffer, mimeType);

    const version = this.versionRepository.create({
      documentId: saved.id,
      versionNumber: 1,
      storageKey,
      sizeBytes: buffer.length,
      changeNote: 'Yeni dosya oluşturuldu',
      createdBy: user.id,
    });
    await this.versionRepository.save(version);

    this.logger.log(`Empty document created: ${filename} (${saved.id}) in folder ${dto.folderId}`);
    return saved;
  }

  async uploadDocument(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    user: User,
  ): Promise<Document> {
    // Validate folder
    const folder = await this.folderRepository.findOne({ where: { id: dto.folderId } });
    if (!folder) {
      throw new NotFoundException('Klasör bulunamadı');
    }

    // Check write permission on folder
    await this.enforceFolderPermission(user, dto.folderId, 'write', { ownerId: folder.ownerId });

    // Create document record
    const doc = this.documentRepository.create({
      folderId: dto.folderId,
      name: file.originalname,
      description: dto.description || null,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      storageKey: '', // will be set after save (need ID)
      currentVersion: 1,
      createdBy: user.id,
    });

    const saved = await this.documentRepository.save(doc);

    // Generate storage key and upload
    const storageKey = `${dto.folderId}/${saved.id}/v1/${file.originalname}`;
    saved.storageKey = storageKey;
    await this.documentRepository.save(saved);

    await this.minioService.upload(storageKey, file.buffer, file.mimetype);

    // Create version 1
    const version = this.versionRepository.create({
      documentId: saved.id,
      versionNumber: 1,
      storageKey,
      sizeBytes: file.size,
      changeNote: 'İlk yükleme',
      createdBy: user.id,
    });
    await this.versionRepository.save(version);

    this.logger.log(`Document uploaded: ${saved.name} (${saved.id}) to folder ${dto.folderId}`);
    return saved;
  }

  async findDocuments(options?: {
    folderId?: string;
    search?: string;
    page?: number;
    limit?: number;
    user?: User;
  }): Promise<{ documents: Document[]; total: number }> {
    const { folderId, search, page = 1, limit = 50, user } = options || {};

    const qb = this.documentRepository.createQueryBuilder('doc')
      .leftJoinAndSelect('doc.creator', 'creator')
      .leftJoinAndSelect('doc.folder', 'folder')
      .where('doc.is_deleted = :notDeleted', { notDeleted: false });

    if (folderId) {
      qb.andWhere('doc.folder_id = :folderId', { folderId });
    }

    if (search) {
      qb.andWhere(
        '(doc.name ILIKE :search OR doc.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);
    qb.orderBy('doc.name', 'ASC');

    let [documents, total] = await qb.getManyAndCount();

    // Filter by folder access (with inheritance from ancestor folders)
    if (user && user.role !== UserRole.ADMIN && documents.length > 0) {
      const folderIds = [...new Set(documents.map(d => d.folderId).filter(Boolean))];
      if (folderIds.length > 0) {
        // Collect folder IDs + ancestor IDs from folder paths for inheritance
        const allIdsToCheck = new Set(folderIds);
        for (const doc of documents) {
          if (doc.folder?.path) {
            for (const pid of doc.folder.path.split('/')) {
              if (pid) allIdsToCheck.add(pid);
            }
          }
        }
        const accessibleFolders = await this.accessService.getAccessibleFolderIds(user, [...allIdsToCheck]);
        // Creator always sees their own documents; others need folder access (direct or inherited)
        documents = documents.filter(d => {
          if (d.createdBy === user.id) return true;
          if (!d.folderId) return true;
          if (accessibleFolders.has(d.folderId)) return true;
          // Check ancestors for inherited access
          if (d.folder?.path) {
            const pathIds = d.folder.path.split('/').filter(Boolean);
            for (const pid of pathIds) {
              if (pid !== d.folderId && accessibleFolders.has(pid)) return true;
            }
          }
          return false;
        });
        total = documents.length;
      }
    }

    return { documents, total };
  }

  async findDocumentById(id: string, includeDeleted = false): Promise<Document> {
    const where: any = { id };
    if (!includeDeleted) where.isDeleted = false;
    const doc = await this.documentRepository.findOne({
      where,
      relations: ['creator', 'folder', 'lockedByUser'],
    });

    if (!doc) {
      throw new NotFoundException('Doküman bulunamadı');
    }

    return doc;
  }

  async downloadDocument(id: string, user?: User): Promise<{ buffer: Buffer; document: Document }> {
    const doc = await this.findDocumentById(id);
    // Check read permission on document's folder
    if (user && doc.folderId) {
      await this.enforceFolderPermission(user, doc.folderId, 'read', { creatorId: doc.createdBy });
    }
    const buffer = await this.minioService.getObject(doc.storageKey);
    return { buffer, document: doc };
  }

  async downloadVersion(
    documentId: string,
    versionNumber: number,
  ): Promise<{ buffer: Buffer; version: DocumentVersion; document: Document }> {
    const doc = await this.findDocumentById(documentId);
    const version = await this.versionRepository.findOne({
      where: { documentId, versionNumber },
    });

    if (!version) {
      throw new NotFoundException(`Versiyon ${versionNumber} bulunamadı`);
    }

    const buffer = await this.minioService.getObject(version.storageKey);
    return { buffer, version, document: doc };
  }

  async updateDocument(id: string, dto: UpdateDocumentDto, user: User): Promise<Document> {
    const doc = await this.documentRepository.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException('Doküman bulunamadı');
    }

    // Check write permission on document's folder
    await this.enforceFolderPermission(user, doc.folderId, 'write', { creatorId: doc.createdBy });

    // Validate target folder if moving
    if (dto.folderId && dto.folderId !== doc.folderId) {
      const folder = await this.folderRepository.findOne({ where: { id: dto.folderId } });
      if (!folder) {
        throw new NotFoundException('Hedef klasör bulunamadı');
      }
    }

    if (dto.name !== undefined) doc.name = dto.name;
    if (dto.description !== undefined) doc.description = dto.description;
    if (dto.folderId !== undefined) doc.folderId = dto.folderId;

    const saved = await this.documentRepository.save(doc);
    this.logger.log(`Document updated: ${saved.name} (${saved.id})`);
    return saved;
  }

  async uploadNewVersion(
    id: string,
    file: Express.Multer.File,
    user: User,
    changeNote?: string,
  ): Promise<DocumentVersion> {
    const doc = await this.documentRepository.findOne({ where: { id } });
    if (!doc) {
      throw new NotFoundException('Doküman bulunamadı');
    }

    // Check write permission on document's folder
    await this.enforceFolderPermission(user, doc.folderId, 'write', { creatorId: doc.createdBy });

    const newVersionNumber = doc.currentVersion + 1;
    const storageKey = `${doc.folderId}/${doc.id}/v${newVersionNumber}/${file.originalname}`;

    // Upload to MinIO
    await this.minioService.upload(storageKey, file.buffer, file.mimetype);

    // Create version record
    const version = this.versionRepository.create({
      documentId: id,
      versionNumber: newVersionNumber,
      storageKey,
      sizeBytes: file.size,
      changeNote: changeNote || null,
      createdBy: user.id,
    });
    const savedVersion = await this.versionRepository.save(version);

    // Update document
    doc.currentVersion = newVersionNumber;
    doc.storageKey = storageKey;
    doc.sizeBytes = file.size;
    doc.mimeType = file.mimetype;
    doc.name = file.originalname;
    await this.documentRepository.save(doc);

    this.logger.log(`New version uploaded: ${doc.name} v${newVersionNumber} (${id})`);
    return savedVersion;
  }

  async removeDocument(id: string, user: User): Promise<void> {
    const doc = await this.documentRepository.findOne({ where: { id, isDeleted: false } });
    if (!doc) {
      throw new NotFoundException('Doküman bulunamadı');
    }

    // Check delete permission on document's folder
    await this.enforceFolderPermission(user, doc.folderId, 'delete', { creatorId: doc.createdBy });

    // Soft delete: mark as deleted instead of removing
    doc.isDeleted = true;
    doc.deletedAt = new Date();
    doc.deletedBy = user.id;
    await this.documentRepository.save(doc);
    this.logger.log(`Document soft-deleted: ${doc.name} (${id})`);
  }

  async getVersions(documentId: string): Promise<DocumentVersion[]> {
    const doc = await this.documentRepository.findOne({ where: { id: documentId } });
    if (!doc) {
      throw new NotFoundException('Doküman bulunamadı');
    }

    return this.versionRepository.find({
      where: { documentId },
      relations: ['creator'],
      order: { versionNumber: 'DESC' },
    });
  }

  // ─── Recycle Bin Operations ──────────────────────────────────

  async getRecycleBin(user: User): Promise<{
    folders: Folder[];
    documents: Document[];
  }> {
    const isPrivileged = user.role === UserRole.ADMIN || user.role === 'supervisor';

    // Admin/supervisor sees all deleted items; regular user sees only their own
    const folderWhere: any = { isDeleted: true };
    const docWhere: any = { isDeleted: true };
    if (!isPrivileged) {
      folderWhere.ownerId = user.id;
      docWhere.deletedBy = user.id;
    }

    const folders = await this.folderRepository.find({
      where: folderWhere,
      relations: ['owner'],
      order: { deletedAt: 'DESC' },
    });

    const documents = await this.documentRepository.find({
      where: docWhere,
      relations: ['creator', 'folder'],
      order: { deletedAt: 'DESC' },
    });

    return { folders, documents };
  }

  async restoreDocument(id: string, user: User): Promise<Document> {
    const doc = await this.documentRepository.findOne({
      where: { id, isDeleted: true },
    });
    if (!doc) {
      throw new NotFoundException('Silinmiş doküman bulunamadı');
    }

    const isPrivileged = user.role === UserRole.ADMIN || user.role === 'supervisor';
    if (!isPrivileged && doc.deletedBy !== user.id) {
      throw new ForbiddenException('Bu dokümanı geri yükleme yetkiniz yok');
    }

    // Check if parent folder still exists and is not deleted
    const folder = await this.folderRepository.findOne({
      where: { id: doc.folderId },
    });
    if (!folder || folder.isDeleted) {
      throw new BadRequestException('Dokümanın bulunduğu klasör silinmiş. Önce klasörü geri yükleyin.');
    }

    doc.isDeleted = false;
    doc.deletedAt = null;
    doc.deletedBy = null;
    const saved = await this.documentRepository.save(doc);
    this.logger.log(`Document restored: ${doc.name} (${id})`);
    return saved;
  }

  async permanentDeleteDocument(id: string, user: User): Promise<void> {
    const isPrivileged = user.role === UserRole.ADMIN || user.role === 'supervisor';
    if (!isPrivileged) {
      throw new ForbiddenException('Kalıcı silme yetkisi sadece admin ve supervisor kullanıcılara aittir');
    }

    const doc = await this.documentRepository.findOne({
      where: { id, isDeleted: true },
    });
    if (!doc) {
      throw new NotFoundException('Silinmiş doküman bulunamadı');
    }

    // Permanently delete from MinIO
    const versions = await this.versionRepository.find({ where: { documentId: id } });
    const storageKeys = versions.map((v) => v.storageKey);
    if (storageKeys.length > 0) {
      await this.minioService.deleteObjects(storageKeys);
    }

    // Delete versions then document
    await this.versionRepository.delete({ documentId: id });
    await this.documentRepository.remove(doc);
    this.logger.log(`Document permanently deleted: ${doc.name} (${id})`);
  }

  async restoreFolder(id: string, user: User): Promise<Folder> {
    const folder = await this.folderRepository.findOne({
      where: { id, isDeleted: true },
    });
    if (!folder) {
      throw new NotFoundException('Silinmiş klasör bulunamadı');
    }

    const isPrivileged = user.role === UserRole.ADMIN || user.role === 'supervisor';
    if (!isPrivileged && folder.deletedBy !== user.id) {
      throw new ForbiddenException('Bu klasörü geri yükleme yetkiniz yok');
    }

    // If parent folder is deleted, move to root
    if (folder.parentId) {
      const parent = await this.folderRepository.findOne({ where: { id: folder.parentId } });
      if (!parent || parent.isDeleted) {
        folder.parentId = null;
      }
    }

    // Restore folder and all its children + documents recursively
    await this.restoreFolderCascade(id);

    // Rebuild path after restore
    folder.isDeleted = false;
    folder.deletedAt = null;
    folder.deletedBy = null;
    folder.path = await this.buildPath(id);
    const saved = await this.folderRepository.save(folder);
    this.logger.log(`Folder restored (cascade): ${folder.name} (${id})`);
    return saved;
  }

  private async restoreFolderCascade(folderId: string): Promise<void> {
    // Restore documents in this folder
    await this.documentRepository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: false, deletedAt: null, deletedBy: null })
      .where('folder_id = :folderId AND is_deleted = true', { folderId })
      .execute();

    // Restore child folders recursively
    const children = await this.folderRepository.find({
      where: { parentId: folderId, isDeleted: true },
    });
    for (const child of children) {
      await this.restoreFolderCascade(child.id);
    }

    // Restore the folder itself
    await this.folderRepository.update(folderId, {
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    });
  }

  async permanentDeleteFolder(id: string, user: User): Promise<void> {
    const isPrivileged = user.role === UserRole.ADMIN || user.role === 'supervisor';
    if (!isPrivileged) {
      throw new ForbiddenException('Kalıcı silme yetkisi sadece admin ve supervisor kullanıcılara aittir');
    }

    const folder = await this.folderRepository.findOne({
      where: { id, isDeleted: true },
    });
    if (!folder) {
      throw new NotFoundException('Silinmiş klasör bulunamadı');
    }

    // Permanently delete cascade: children folders + their docs, then self + its docs
    await this.permanentDeleteFolderCascade(id);
    this.logger.log(`Folder permanently deleted (cascade): ${folder.name} (${id})`);
  }

  private async permanentDeleteFolderCascade(folderId: string): Promise<void> {
    // Delete child folders recursively first
    const children = await this.folderRepository.find({
      where: { parentId: folderId },
    });
    for (const child of children) {
      await this.permanentDeleteFolderCascade(child.id);
    }

    // Delete documents in this folder (from MinIO + DB)
    const docs = await this.documentRepository.find({ where: { folderId } });
    for (const doc of docs) {
      const versions = await this.versionRepository.find({ where: { documentId: doc.id } });
      const storageKeys = versions.map((v) => v.storageKey);
      if (storageKeys.length > 0) {
        await this.minioService.deleteObjects(storageKeys);
      }
      await this.versionRepository.delete({ documentId: doc.id });
      await this.documentRepository.remove(doc);
    }

    // Delete access rules for this folder
    await this.accessRuleRepository.delete({
      resourceType: ResourceType.FOLDER,
      resourceId: folderId,
    });

    // Delete the folder
    await this.folderRepository.delete(folderId);
  }

  // ─── ONLYOFFICE Editor Operations ────────────────────────────

  async getEditorConfig(
    documentId: string,
    userId: string,
    displayName: string,
    mode: 'view' | 'edit' = 'view',
  ) {
    const doc = await this.findDocumentById(documentId);
    const ext = this.getFileExtension(doc.name).toLowerCase();

    if (!(ext in this.documentTypes)) {
      throw new BadRequestException(`Bu dosya türü desteklenmiyor: ${ext}`);
    }

    const canEdit = this.editableTypes.includes(ext) && mode === 'edit';
    const documentKey = await this.getOrCreateDocumentKey(documentId, canEdit);

    const documentUrl = `${this.internalApiUrl}/api/documents/editor/content?key=${documentKey}`;
    const callbackUrl = `${this.internalApiUrl}/api/documents/editor/callback`;

    const documentType = this.documentTypes[ext] || 'word';

    const configWithoutToken = {
      documentType,
      document: {
        fileType: ext.replace('.', ''),
        key: documentKey,
        title: doc.name,
        url: documentUrl,
        permissions: { edit: canEdit, download: true, print: true },
      },
      editorConfig: {
        mode: canEdit ? 'edit' : 'view',
        callbackUrl,
        lang: 'tr',
        user: { id: userId, name: displayName },
        customization: { autosave: true, forcesave: true },
      },
    };

    const token = jwt.sign(configWithoutToken, this.jwtSecret, { algorithm: 'HS256' });

    // Store access info for ONLYOFFICE content retrieval
    const accessInfo = JSON.stringify({ userId, documentId, storageKey: doc.storageKey });
    await this.redisService.set(`doc-access:minio:${documentKey}`, accessInfo, 3600);

    // Track active user
    await this.addActiveUser(documentKey, userId, displayName);

    this.logger.log(`Editor config generated for doc ${documentId}, mode=${canEdit ? 'edit' : 'view'}, key=${documentKey}`);
    return { ...configWithoutToken, token };
  }

  async getEditorContent(documentKey: string): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const accessInfo = await this.redisService.get(`doc-access:minio:${documentKey}`);
    if (!accessInfo) {
      throw new BadRequestException('Document access expired or invalid');
    }

    const { documentId, storageKey } = JSON.parse(accessInfo);
    const doc = await this.documentRepository.findOne({ where: { id: documentId } });
    if (!doc) {
      throw new NotFoundException('Doküman bulunamadı');
    }

    const buffer = await this.minioService.getObject(storageKey);
    return { buffer, filename: doc.name, mimeType: doc.mimeType };
  }

  async handleEditorCallback(documentKey: string, downloadUrl: string): Promise<void> {
    this.logger.log(`Processing editor callback save: key=${documentKey}`);

    const accessInfo = await this.redisService.get(`doc-access:minio:${documentKey}`);
    if (!accessInfo) {
      throw new BadRequestException('Document access expired or invalid');
    }

    const { userId, documentId } = JSON.parse(accessInfo);
    const doc = await this.documentRepository.findOne({ where: { id: documentId } });
    if (!doc) {
      throw new NotFoundException('Doküman bulunamadı');
    }

    // Download edited file from ONLYOFFICE
    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new BadRequestException(`Failed to download from ONLYOFFICE: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());

    // Create new version
    const newVersionNumber = doc.currentVersion + 1;
    const storageKey = `${doc.folderId}/${doc.id}/v${newVersionNumber}/${doc.name}`;

    await this.minioService.upload(storageKey, buffer, doc.mimeType);

    const version = this.versionRepository.create({
      documentId: doc.id,
      versionNumber: newVersionNumber,
      storageKey,
      sizeBytes: buffer.length,
      changeNote: 'ONLYOFFICE düzenleme',
      createdBy: userId,
    });
    await this.versionRepository.save(version);

    // Update document
    doc.currentVersion = newVersionNumber;
    doc.storageKey = storageKey;
    doc.sizeBytes = buffer.length;
    await this.documentRepository.save(doc);

    // Invalidate session
    await this.redisService.del(`doc-session:minio:${documentId}`);

    this.logger.log(`Document saved via ONLYOFFICE: ${doc.name} v${newVersionNumber}`);
  }

  async checkEditorSupport(documentId: string): Promise<{ canView: boolean; canEdit: boolean }> {
    const doc = await this.findDocumentById(documentId);
    const ext = this.getFileExtension(doc.name).toLowerCase();
    return {
      canView: ext in this.documentTypes,
      canEdit: this.editableTypes.includes(ext),
    };
  }

  async getActiveEditors(documentId: string): Promise<Array<{ id: string; name: string; joinedAt: string }>> {
    const sessionKey = `doc-session:minio:${documentId}`;
    const documentKey = await this.redisService.get(sessionKey);
    if (!documentKey) return [];

    const usersData = await this.redisService.get(`doc-users:minio:${documentKey}`);
    return usersData ? JSON.parse(usersData) : [];
  }

  async removeActiveUser(documentKey: string, userId: string): Promise<void> {
    const usersKey = `doc-users:minio:${documentKey}`;
    const data = await this.redisService.get(usersKey);
    if (data) {
      const users = JSON.parse(data).filter((u: { id: string }) => u.id !== userId);
      if (users.length > 0) {
        await this.redisService.set(usersKey, JSON.stringify(users), 3600);
      } else {
        await this.redisService.del(usersKey);
      }
    }
  }

  private async addActiveUser(documentKey: string, userId: string, displayName: string): Promise<void> {
    const usersKey = `doc-users:minio:${documentKey}`;
    const data = await this.redisService.get(usersKey);
    const users: Array<{ id: string; name: string; joinedAt: string }> = data ? JSON.parse(data) : [];

    if (!users.some(u => u.id === userId)) {
      users.push({ id: userId, name: displayName, joinedAt: new Date().toISOString() });
      await this.redisService.set(usersKey, JSON.stringify(users), 3600);
    }
  }

  private async getOrCreateDocumentKey(documentId: string, isEditMode: boolean): Promise<string> {
    const sessionKey = `doc-session:minio:${documentId}`;
    const existingKey = await this.redisService.get(sessionKey);

    if (existingKey) {
      await this.redisService.set(sessionKey, existingKey, 3600);
      return existingKey;
    }

    const randomPart = crypto.randomBytes(8).toString('hex');
    const hash = crypto.createHash('md5').update(`minio:${documentId}:${randomPart}`).digest('hex').substring(0, 20);
    const encoded = Buffer.from(JSON.stringify({ documentId })).toString('base64url');
    const newKey = `${hash}_${encoded}`;

    if (isEditMode) {
      await this.redisService.set(sessionKey, newKey, 3600);
    }

    return newKey;
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    if (lastDot === -1) return '';
    return filename.substring(lastDot);
  }

  // ─── My Permissions ──────────────────────────────────────────

  async getMyPermissions(
    folderId: string,
    user: User,
  ): Promise<{ read: boolean; write: boolean; delete: boolean; manage: boolean }> {
    if (user.role === UserRole.ADMIN) {
      return { read: true, write: true, delete: true, manage: true };
    }

    const folder = await this.folderRepository.findOne({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Klasör bulunamadı');

    if (folder.ownerId === user.id) {
      return { read: true, write: true, delete: true, manage: true };
    }

    const result = { read: false, write: false, delete: false, manage: false };
    const permTypes = ['read', 'write', 'delete', 'manage'] as const;

    for (const perm of permTypes) {
      const direct = await this.accessService.checkPermission(
        user.id, user, ResourceType.FOLDER, folderId, perm,
      );
      if (direct.allowed) {
        result[perm] = true;
        continue;
      }

      // Ancestor check (inheritance)
      if (folder.path) {
        const ancestorIds = folder.path.split('/').filter(id => id && id !== folderId);
        for (const ancestorId of ancestorIds) {
          const r = await this.accessService.checkPermission(
            user.id, user, ResourceType.FOLDER, ancestorId, perm,
          );
          if (r.allowed) {
            result[perm] = true;
            break;
          }
        }
      }
    }

    return result;
  }

  // ─── Helpers ─────────────────────────────────────────────────

  private async buildPath(folderId: string): Promise<string> {
    const parts: string[] = [];
    let currentId: string | null = folderId;

    while (currentId) {
      parts.unshift(currentId);
      const folder = await this.folderRepository.findOne({ where: { id: currentId } });
      currentId = folder?.parentId || null;
    }

    return parts.join('/');
  }

  // ─── Permission Enforcement ──────────────────────────────────

  private async enforceFolderPermission(
    user: User,
    folderId: string,
    permission: string,
    opts?: { creatorId?: string; ownerId?: string },
  ): Promise<void> {
    if (user.role === UserRole.ADMIN) return;
    // Document creator bypass
    if (opts?.creatorId && opts.creatorId === user.id) return;

    // Always load folder for owner check + path (needed for inheritance)
    const folder = await this.folderRepository.findOne({ where: { id: folderId } });
    if (folder && folder.ownerId === user.id) return;

    // Check direct permission on this folder
    const directResult = await this.accessService.checkPermission(
      user.id, user, ResourceType.FOLDER, folderId, permission,
    );
    if (directResult.allowed) return;

    // Check inherited permission from ancestor folders
    if (folder?.path) {
      const ancestorIds = folder.path.split('/').filter(id => id && id !== folderId);
      for (const ancestorId of ancestorIds) {
        const result = await this.accessService.checkPermission(
          user.id, user, ResourceType.FOLDER, ancestorId, permission,
        );
        if (result.allowed) return;
      }
    }

    throw new ForbiddenException('Bu işlem için yetkiniz yok');
  }

  // ─── Folder Permission Operations ─────────────────────────────

  async getFolderPermissions(folderId: string): Promise<any[]> {
    const folder = await this.folderRepository.findOne({ where: { id: folderId } });
    if (!folder) {
      throw new NotFoundException('Klasör bulunamadı');
    }

    const rules = await this.accessRuleRepository.find({
      where: { resourceType: ResourceType.FOLDER, resourceId: folderId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });

    // Enrich with target names
    const enriched = await Promise.all(
      rules.map(async (rule) => {
        let targetName = '';
        if (rule.targetType === 'user' && rule.targetId) {
          const user = await this.userRepository.findOne({ where: { id: rule.targetId } });
          targetName = user?.displayName || user?.adUsername || 'Bilinmeyen kullanıcı';
        } else if (rule.targetType === 'group' && rule.targetId) {
          const group = await this.groupRepository.findOne({ where: { id: rule.targetId } });
          targetName = group?.name || 'Bilinmeyen grup';
        } else if (rule.targetType === 'role') {
          targetName = rule.targetRole || '';
        }

        return {
          id: rule.id,
          targetType: rule.targetType,
          targetId: rule.targetId,
          targetName,
          targetRole: rule.targetRole,
          permissions: rule.permissions,
          ruleType: rule.ruleType,
          inherit: rule.inherit,
          createdBy: rule.createdBy?.displayName || rule.createdBy?.adUsername,
          createdAt: rule.createdAt,
        };
      }),
    );

    return enriched;
  }

  async addFolderPermission(
    folderId: string,
    dto: CreateFolderPermissionDto,
    userId: string,
    userRole: string,
  ): Promise<any> {
    const folder = await this.folderRepository.findOne({ where: { id: folderId } });
    if (!folder) {
      throw new NotFoundException('Klasör bulunamadı');
    }

    // Only owner or admin can manage permissions
    if (folder.ownerId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('Bu klasörün erişim izinlerini yönetme yetkiniz yok');
    }

    const rule = await this.accessService.createRule(
      {
        resourceType: ResourceType.FOLDER,
        resourceId: folderId,
        ruleType: RuleType.GRANT,
        targetType: dto.targetType,
        targetId: dto.targetId,
        permissions: dto.permissions,
        inherit: true,
      },
      userId,
    );

    this.logger.log(`Folder permission added: folder=${folderId}, target=${dto.targetType}:${dto.targetId}`);
    return rule;
  }

  async removeFolderPermission(
    folderId: string,
    ruleId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const folder = await this.folderRepository.findOne({ where: { id: folderId } });
    if (!folder) {
      throw new NotFoundException('Klasör bulunamadı');
    }

    // Only owner or admin can manage permissions
    if (folder.ownerId !== userId && userRole !== 'admin') {
      throw new ForbiddenException('Bu klasörün erişim izinlerini yönetme yetkiniz yok');
    }

    // Verify rule belongs to this folder
    const rule = await this.accessRuleRepository.findOne({ where: { id: ruleId } });
    if (!rule || rule.resourceId !== folderId || rule.resourceType !== ResourceType.FOLDER) {
      throw new NotFoundException('Erişim kuralı bulunamadı');
    }

    await this.accessService.removeRule(ruleId);
    this.logger.log(`Folder permission removed: folder=${folderId}, rule=${ruleId}`);
  }

  // ─── Document Permission Operations ───────────────────────────

  async getDocumentPermissions(docId: string): Promise<any[]> {
    const doc = await this.documentRepository.findOne({ where: { id: docId } });
    if (!doc) {
      throw new NotFoundException('Doküman bulunamadı');
    }

    // Document's own rules
    const docRules = await this.accessRuleRepository.find({
      where: { resourceType: ResourceType.DOCUMENT, resourceId: docId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });

    // Parent folder's rules (inherited)
    const folderRules = await this.accessRuleRepository.find({
      where: { resourceType: ResourceType.FOLDER, resourceId: doc.folderId },
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });

    const enrichRule = async (rule: AccessRule, source: 'self' | 'inherited') => {
      let targetName = '';
      if (rule.targetType === 'user' && rule.targetId) {
        const user = await this.userRepository.findOne({ where: { id: rule.targetId } });
        targetName = user?.displayName || user?.adUsername || 'Bilinmeyen kullanıcı';
      } else if (rule.targetType === 'group' && rule.targetId) {
        const group = await this.groupRepository.findOne({ where: { id: rule.targetId } });
        targetName = group?.name || 'Bilinmeyen grup';
      } else if (rule.targetType === 'role') {
        targetName = rule.targetRole || '';
      }

      return {
        id: rule.id,
        targetType: rule.targetType,
        targetId: rule.targetId,
        targetName,
        targetRole: rule.targetRole,
        permissions: rule.permissions,
        ruleType: rule.ruleType,
        inherit: rule.inherit,
        source,
        createdBy: rule.createdBy?.displayName || rule.createdBy?.adUsername,
        createdAt: rule.createdAt,
      };
    };

    const enrichedDoc = await Promise.all(docRules.map((r) => enrichRule(r, 'self')));
    const enrichedFolder = await Promise.all(folderRules.map((r) => enrichRule(r, 'inherited')));

    return [...enrichedDoc, ...enrichedFolder];
  }

  async addDocumentPermission(
    docId: string,
    dto: CreateFolderPermissionDto,
    userId: string,
    userRole: string,
  ): Promise<any> {
    const doc = await this.documentRepository.findOne({ where: { id: docId } });
    if (!doc) {
      throw new NotFoundException('Doküman bulunamadı');
    }

    if (doc.createdBy !== userId && userRole !== 'admin') {
      throw new ForbiddenException('Bu dokümanın erişim izinlerini yönetme yetkiniz yok');
    }

    const rule = await this.accessService.createRule(
      {
        resourceType: ResourceType.DOCUMENT,
        resourceId: docId,
        ruleType: RuleType.GRANT,
        targetType: dto.targetType,
        targetId: dto.targetId,
        permissions: dto.permissions,
        inherit: false,
      },
      userId,
    );

    this.logger.log(`Document permission added: doc=${docId}, target=${dto.targetType}:${dto.targetId}`);
    return rule;
  }

  async removeDocumentPermission(
    docId: string,
    ruleId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const doc = await this.documentRepository.findOne({ where: { id: docId } });
    if (!doc) {
      throw new NotFoundException('Doküman bulunamadı');
    }

    if (doc.createdBy !== userId && userRole !== 'admin') {
      throw new ForbiddenException('Bu dokümanın erişim izinlerini yönetme yetkiniz yok');
    }

    const rule = await this.accessRuleRepository.findOne({ where: { id: ruleId } });
    if (!rule || rule.resourceId !== docId || rule.resourceType !== ResourceType.DOCUMENT) {
      throw new NotFoundException('Erişim kuralı bulunamadı');
    }

    await this.accessService.removeRule(ruleId);
    this.logger.log(`Document permission removed: doc=${docId}, rule=${ruleId}`);
  }
}
