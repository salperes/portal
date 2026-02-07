# Announcements Module

## Overview
Şirket içi duyuruları yönetir. CRUD, öncelik ve kategori sistemi.

## Module Package

```
packages/modules/announcements/
├── src/
│   ├── index.ts                    # Type re-exports + frontend exports
│   └── frontend/
│       ├── index.ts                # Frontend exports
│       ├── pages/
│       │   ├── index.ts
│       │   ├── Announcements.tsx       # Public list page
│       │   ├── AnnouncementDetail.tsx  # Detail page
│       │   └── AnnouncementsAdmin.tsx  # Admin CRUD page
│       └── services/
│           └── announcementsApi.ts     # API client
├── package.json                    # @portal/announcements
└── CLAUDE.md
```

## Usage

```typescript
// Types
import { Announcement, CategoryLabels, PriorityColors } from '@portal/announcements';

// Frontend pages (dependency injection pattern)
import { AnnouncementsPage, AnnouncementDetailPage, AnnouncementsAdminPage } from '@portal/announcements/pages';
```

---

## Code Locations

### Backend (Mevcut)
```
backend/src/announcements/
├── announcements.module.ts
├── announcements.controller.ts
├── announcements.service.ts
└── dto/
    ├── create-announcement.dto.ts
    └── update-announcement.dto.ts
```

### Shared Types
```
packages/core/src/types/announcement.types.ts
```

### Shared Entity
```
packages/core/src/entities/announcement.entity.ts
```

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/announcements` | Public | List active |
| GET | `/api/announcements/latest` | Public | Latest 5 |
| GET | `/api/announcements/:id` | Public | Single |
| POST | `/api/announcements` | Admin | Create |
| PATCH | `/api/announcements/:id` | Admin | Update |
| DELETE | `/api/announcements/:id` | Admin | Delete |

## Data Model

```typescript
interface Announcement {
  id: string;
  title: string;
  content: string;
  category: 'general' | 'hr' | 'it' | 'finance';
  priority: 'critical' | 'important' | 'info';
  isActive: boolean;
  publishDate: Date;
  expireDate: Date | null;
  createdBy: User;
  createdAt: Date;
  updatedAt: Date;
}
```

## Category & Priority

### Categories
| Key | Label | Color |
|-----|-------|-------|
| general | Genel | gray |
| hr | İK | purple |
| it | BT | cyan |
| finance | Finans | emerald |

### Priorities
| Key | Label | Color |
|-----|-------|-------|
| critical | Kritik | red |
| important | Önemli | amber |
| info | Bilgi | blue |

## Frontend Pages

### AnnouncementsPage
- Duyuru listesi (filtreli)
- Props: `{ getAll: (includeInactive?) => Promise<Announcement[]> }`

### AnnouncementDetailPage
- Tek duyuru detayı
- Props: `{ getById: (id: string) => Promise<Announcement> }`

### AnnouncementsAdminPage
- Admin CRUD interface
- Props: `{ api: { getAll, create, update, delete } }`

## Business Rules

1. `publishDate` gelecekte ise duyuru görünmez
2. `expireDate` geçmişte ise duyuru görünmez
3. `isActive: false` ise sadece admin görür
4. Sıralama: priority (critical > important > info), sonra publishDate DESC

## Testing

```bash
# Backend rebuild after changes
cd testenv && docker-compose up -d --build portal-test-api

# Check logs
docker-compose logs -f portal-test-api | grep -i announcement
```

## Related Files

- Entity: `packages/core/src/entities/announcement.entity.ts`
- Types: `packages/core/src/types/announcement.types.ts`
- Backend Service: `backend/src/announcements/announcements.service.ts`
- Backend Controller: `backend/src/announcements/announcements.controller.ts`
- Module Pages: `packages/modules/announcements/src/frontend/pages/`
