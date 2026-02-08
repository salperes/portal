# @portal/core Module

## Modül Hakkında
Backend ve frontend arasında paylaşılan ortak tipler, interface'ler, entity'ler ve yardımcı fonksiyonlar.

## Dosya Yapısı
```
packages/core/
├── src/
│   ├── index.ts              # Ana export (types)
│   ├── types/
│   │   ├── index.ts          # Type exports
│   │   ├── user.types.ts     # Kullanıcı tipleri ve roller
│   │   ├── announcement.types.ts  # Duyuru tipleri
│   │   ├── auth.types.ts     # Kimlik doğrulama tipleri
│   │   ├── api.types.ts      # API response tipleri
│   │   ├── group.types.ts    # Grup tipleri ve roller
│   │   ├── project.types.ts  # Proje tipleri ve roller
│   │   ├── access.types.ts   # Erişim kontrol tipleri
│   │   └── document.types.ts # Doküman tipleri ve yardımcılar
│   └── entities/
│       ├── index.ts          # Entity exports
│       ├── user.entity.ts    # User entity (TypeORM)
│       ├── announcement.entity.ts  # Announcement entity
│       ├── application.entity.ts   # Application entity
│       ├── group.entity.ts         # Group entity (hiyerarşik)
│       ├── user-group.entity.ts    # UserGroup entity (M:N + rol)
│       ├── project.entity.ts       # Project entity
│       ├── project-assignment.entity.ts  # ProjectAssignment entity
│       ├── access-rule.entity.ts   # AccessRule entity
│       ├── folder.entity.ts        # Folder entity (hiyerarşik)
│       ├── document.entity.ts      # Document entity
│       └── document-version.entity.ts  # DocumentVersion entity
├── package.json
└── tsconfig.json
```

## Kullanım

### Types (Frontend & Backend)
```typescript
import { UserRole, hasMinimumRole, Announcement } from '@portal/core';
import { GroupRoleLabels, ProjectStatusColors, formatFileSize } from '@portal/core';
```

### Entities (Backend Only)
```typescript
import { User, Group, Project, AccessRule, Folder, Document, DocumentVersion } from '@portal/core/entities';
```

## Package Exports

```json
{
  "exports": {
    ".": "./dist/index.js",           // Types
    "./types": "./dist/types/index.js",
    "./entities": "./dist/entities/index.js"  // TypeORM entities
  }
}
```

## Dışa Aktarılan Tipler

### User Types
- `UserRole` - 'viewer' | 'user' | 'supervisor' | 'admin'
- `User` - Kullanıcı interface
- `AuthUser` - Login response'taki kullanıcı
- `UserStats` - Kullanıcı istatistikleri
- `RoleLevel`, `RoleLabels`, `RoleColors` - UI yardımcıları
- `hasMinimumRole()` - Yetki kontrol fonksiyonu

### Announcement Types
- `AnnouncementCategory` - 'general' | 'hr' | 'it' | 'finance'
- `AnnouncementPriority` - 'critical' | 'important' | 'info'
- `Announcement` - Duyuru interface
- `CreateAnnouncementDto`, `UpdateAnnouncementDto` - DTO'lar
- `CategoryLabels`, `CategoryColors` - UI yardımcıları
- `PriorityLabels`, `PriorityColors` - UI yardımcıları

### Group Types
- `GroupRole` - 'member' | 'lead' | 'manager'
- `Group` - Grup interface (hiyerarşik, parent/children)
- `UserGroup` - Kullanıcı-grup ilişkisi
- `GroupRoleLabels`, `GroupRoleColors` - UI yardımcıları
- `CreateGroupDto`, `UpdateGroupDto`, `AddGroupMemberDto`, `UpdateGroupMemberDto`

### Project Types
- `ProjectStatus` - 'draft' | 'active' | 'archived'
- `ProjectRole` - 'viewer' | 'member' | 'lead' | 'pm'
- `Project` - Proje interface
- `ProjectAssignment` - Proje-kullanıcı atama interface
- `ProjectStatusLabels`, `ProjectStatusColors` - UI yardımcıları
- `ProjectRoleLabels`, `ProjectRoleColors` - UI yardımcıları
- `CreateProjectDto`, `UpdateProjectDto`, `AssignProjectMemberDto`, `UpdateProjectAssignmentDto`

### Access Types
- `ResourceType` - 'folder' | 'document' | 'project'
- `RuleType` - 'grant' | 'deny'
- `TargetType` - 'user' | 'group' | 'role' | 'project_role'
- `PermissionType` - 'read' | 'write' | 'delete' | 'manage'
- `AccessRule` - Erişim kuralı interface
- `CreateAccessRuleDto`, `CheckPermissionDto`, `PermissionCheckResult`

### Document Types
- `FolderInfo` - Klasör bilgisi interface
- `DocumentInfo` - Doküman bilgisi interface
- `DocumentVersionInfo` - Versiyon bilgisi interface
- `FolderBreadcrumb` - Breadcrumb item (id, name)
- `CreateFolderDto`, `UpdateFolderDto` - Klasör DTO'ları
- `UploadDocumentDto`, `UpdateDocumentDto` - Doküman DTO'ları
- `formatFileSize()` - Dosya boyutu formatlama (1024 → "1 KB")
- `getFileIcon()` - MIME type'a göre ikon adı

### Auth Types
- `LoginDto` - Login isteği
- `LoginResponse` - Login yanıtı
- `RefreshTokenResponse` - Token yenileme yanıtı
- `JwtPayload` - JWT içeriği

### API Types
- `PaginationParams` - Sayfalama parametreleri
- `PaginatedResponse<T>` - Sayfalı yanıt
- `ApiError` - Hata yanıtı
- `ApiResponse<T>` - Generic yanıt

## TypeORM Entities

### User Entity
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ unique: true }) adUsername: string;
  @Column({ type: 'enum', enum: UserRole }) role: UserRole;
  // ... diğer alanlar
}
```

### Group Entity (Hiyerarşik)
```typescript
@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 100, unique: true }) name: string;
  @Column({ name: 'parent_id', nullable: true }) parentId: string;
  @ManyToOne(() => Group) parent: Group;      // Self-ref
  @OneToMany(() => Group, g => g.parent) children: Group[];
  @Column({ default: true }) isActive: boolean;
}
```

### Project Entity
```typescript
@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 20, unique: true }) code: string;
  @Column({ type: 'enum', enum: ProjectStatus }) status: ProjectStatus;
  @ManyToOne(() => User) owner: User;
  @Column({ type: 'date', nullable: true }) startDate: Date;
  @Column({ type: 'date', nullable: true }) endDate: Date;
}
```

### AccessRule Entity
```typescript
@Entity('access_rules')
export class AccessRule {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'enum', enum: ResourceType }) resourceType: ResourceType;
  @Column({ type: 'enum', enum: RuleType }) ruleType: RuleType;
  @Column({ type: 'enum', enum: TargetType }) targetType: TargetType;
  @Column({ type: 'simple-array' }) permissions: string[];
  @Column({ default: true }) inherit: boolean;
}
```

### Folder Entity (Hiyerarşik)
```typescript
@Entity('folders')
export class Folder {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 255 }) name: string;
  @Column({ name: 'parent_id', nullable: true }) parentId: string | null;
  @ManyToOne(() => Folder) parent: Folder;       // Self-ref
  @OneToMany(() => Folder, f => f.parent) children: Folder[];
  @Column({ name: 'project_id', nullable: true }) projectId: string | null;
  @Column({ name: 'owner_id' }) ownerId: string;
}
```

### Document Entity
```typescript
@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'folder_id' }) folderId: string;
  @Column({ length: 255 }) name: string;
  @Column({ name: 'mime_type' }) mimeType: string;
  @Column({ name: 'size_bytes', type: 'bigint' }) sizeBytes: number;
  @Column({ name: 'storage_key' }) storageKey: string;
  @Column({ name: 'current_version', default: 1 }) currentVersion: number;
  @Column({ name: 'is_locked', default: false }) isLocked: boolean;
}
```

### DocumentVersion Entity
```typescript
@Entity('document_versions')
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'document_id' }) documentId: string;
  @Column({ name: 'version_number' }) versionNumber: number;
  @Column({ name: 'storage_key' }) storageKey: string;
  @Column({ name: 'size_bytes', type: 'bigint' }) sizeBytes: number;
  @Column({ name: 'change_note', nullable: true }) changeNote: string | null;
}
```

## Build

```bash
cd packages/core
pnpm build    # TypeScript compile
pnpm dev      # Watch mode
```

## Önemli Notlar

- **Types**: Framework bağımsız, frontend ve backend'de kullanılabilir
- **Entities**: TypeORM bağımlı, sadece backend'de kullanılır
- Değişiklik yapılınca hem backend hem frontend etkilenir
- Entity değişikliklerinde backend rebuild gerekir:
  ```bash
  cd testenv && docker-compose up -d --build portal-test-api
  ```
- **CJS output**: `tsconfig.base.json` → `"module": "NodeNext"`. Frontend Vite için `optimizeDeps.include` gerekli.

## Backend Integration

Entity'ler hem `@portal/core/entities` hem de `backend/src/common/entities/` altında bulunmalı (dual-location pattern). Backend entity'leri lokal dosyalardan import eder, `@portal/core`'dan DEĞİL.

## Peer Dependencies

```json
{
  "peerDependencies": {
    "typeorm": "^0.3.0"  // Entities için gerekli
  }
}
```
