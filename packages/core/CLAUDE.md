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
│   │   └── api.types.ts      # API response tipleri
│   └── entities/
│       ├── index.ts          # Entity exports
│       ├── user.entity.ts    # User entity (TypeORM)
│       ├── announcement.entity.ts  # Announcement entity
│       └── application.entity.ts   # Application entity
├── package.json
└── tsconfig.json
```

## Kullanım

### Types (Frontend & Backend)
```typescript
import { UserRole, hasMinimumRole, Announcement } from '@portal/core';
```

### Entities (Backend Only)
```typescript
import { User, Announcement, Application } from '@portal/core/entities';
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
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  adUsername: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.USER })
  role: UserRole;

  // ... diğer alanlar
}
```

### Announcement Entity
```typescript
@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'enum', enum: AnnouncementCategory })
  category: AnnouncementCategory;

  @ManyToOne(() => User)
  createdBy: User;

  // ... diğer alanlar
}
```

### Application Entity
```typescript
@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  url: string;

  // ... diğer alanlar
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

## Backend Integration

Backend artık entity'leri `@portal/core/entities`'den import eder:

```typescript
// backend/src/common/entities/index.ts
export * from '@portal/core/entities';
```

Bu sayede:
- Tek kaynak gerçeği (single source of truth)
- Frontend/backend tip uyumsuzlukları önlenir
- Modüller arası entity paylaşımı kolaylaşır

## Peer Dependencies

```json
{
  "peerDependencies": {
    "typeorm": "^0.3.0"  // Entities için gerekli
  }
}
```
