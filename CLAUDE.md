# MSS Portal - Claude Code Instructions

## Overview
Corporate intranet portal with AD integration. SSO, file server, announcements, document management.

## Tech Stack
- **Backend:** NestJS 11, PostgreSQL, Redis, TypeORM, LDAP
- **Frontend:** React 19, Vite, Zustand, TanStack Query, Tailwind
- **Infra:** Docker Compose, Nginx, MinIO, ONLYOFFICE

## Project Structure (Monorepo - pnpm)

```
portal/
├── packages/
│   ├── core/              # @portal/core - Shared types & entities
│   ├── ui/                # @portal/ui - UI components
│   └── modules/
│       ├── announcements/ # Duyuru modülü
│       ├── users/         # Kullanıcı yönetimi
│       ├── file-server/   # Dosya sunucusu + ONLYOFFICE
│       ├── groups/        # Grup yönetimi (Faz 1)
│       ├── projects/      # Proje yönetimi (Faz 1)
│       └── documents/     # Doküman yönetimi (Faz 2)
├── apps/
│   ├── api/               # @portal/api - Gateway (hazırlanıyor)
│   └── web/               # @portal/web - React shell (hazırlanıyor)
├── backend/               # NestJS API (aktif)
├── frontend/              # React SPA (aktif)
└── testenv/               # Docker dev environment
```

## Module References

| Module | Docs |
|--------|------|
| **Announcements** | [packages/modules/announcements/CLAUDE.md](packages/modules/announcements/CLAUDE.md) |
| **Users** | [packages/modules/users/CLAUDE.md](packages/modules/users/CLAUDE.md) |
| **File Server** | [packages/modules/file-server/CLAUDE.md](packages/modules/file-server/CLAUDE.md) |
| **Groups** | [packages/modules/groups/CLAUDE.md](packages/modules/groups/CLAUDE.md) |
| **Projects** | [packages/modules/projects/CLAUDE.md](packages/modules/projects/CLAUDE.md) |
| **Documents** | [packages/modules/documents/CLAUDE.md](packages/modules/documents/CLAUDE.md) |
| Core Types | [packages/core/CLAUDE.md](packages/core/CLAUDE.md) |
| UI Kit | [packages/ui/CLAUDE.md](packages/ui/CLAUDE.md) |
| API Gateway | [apps/api/CLAUDE.md](apps/api/CLAUDE.md) |
| Web Shell | [apps/web/CLAUDE.md](apps/web/CLAUDE.md) |
| Docker | [testenv/README.md](testenv/README.md) |
| UI Design | [UI_TEMPLATE.md](UI_TEMPLATE.md) |
| Architecture | [MODULAR_ARCHITECTURE_PLAN.md](MODULAR_ARCHITECTURE_PLAN.md) |
| **Changelog** | [CHANGELOG.md](CHANGELOG.md) |

> **Context Tip:** Modül üzerinde çalışırken ilgili CLAUDE.md'yi oku.

## Changelog & Versiyon Kuralları

- Her yapılan değişiklik `CHANGELOG.md`'ye kaydedilir
- Max 11 kayıt tutulur aktif dosyada
- 11 kayıt dolunca: eski 1-10 arşive (`temp/changelog{NNN}-{NNN}.md`), yeni dosya son kaydın kopyasıyla başlar
- Format: Rev. ID (counter), Rev. Date (DD.MM.YYYY), Rev. Time (HH:MM:SS), Rev. Prompt, Rev. Report

### Versiyon Sistemi

- **Format:** `MAJOR.MINOR.RevID` (ör. `1.0.014`)
  - `MAJOR`: Ana sürüm (büyük mimari değişiklikler)
  - `MINOR`: Küçük sürüm (yeni özellik/modül eklemeleri)
  - `RevID`: CHANGELOG.md'deki son Rev. ID (3 haneli, zero-padded)
- **Versiyon dosyası:** `frontend/src/version.ts` → `APP_VERSION` sabiti
- **Gösterim:** Header'da "MSS Portal" yanında (`Layout.tsx`)

### Her Prompt Sonrası İş Akışı

1. Geliştirmeleri yap
2. `CHANGELOG.md`'ye yeni kayıt ekle (yeni Rev. ID al)
3. `frontend/src/version.ts` dosyasındaki `APP_VERSION`'ı yeni `1.0.{RevID}` ile güncelle
4. `cd testenv && docker-compose build --no-cache portal-test-frontend && docker-compose up -d portal-test-frontend` ile deploy et

## Quick Commands

```bash
# Docker (primary dev method)
cd testenv && docker-compose up -d              # Start
docker-compose up -d --build portal-test-api    # Rebuild backend
docker-compose up -d --build portal-test-frontend # Rebuild frontend
docker-compose build --no-cache portal-test-api && docker-compose up -d portal-test-api  # Clean rebuild
docker-compose logs -f portal-test-api          # Logs
docker-compose down -v                          # Reset (clears DB)

# Monorepo
pnpm install              # Install all
pnpm build                # Build all packages
cd packages/core && pnpm build  # Build core only
```

## Test Workflow

> **IMPORTANT:** App runs in `portal-test` containers. Code changes require `--build`.

1. Make code changes
2. `docker-compose up -d --build <container-name>`
3. Check logs: `docker-compose logs -f <container-name>`

## Key Files

| Area | File |
|------|------|
| Auth | `backend/src/auth/auth.service.ts` |
| File Server | `backend/src/file-server/file-server.service.ts` |
| Users | `backend/src/users/users.service.ts` |
| Groups | `backend/src/groups/groups.service.ts` |
| Projects | `backend/src/projects/projects.service.ts` |
| Access Control | `backend/src/access/access.service.ts` |
| Documents | `backend/src/documents/documents.service.ts` |
| Documents Page | `frontend/src/pages/Documents.tsx` |
| Layout | `frontend/src/components/Layout.tsx` |
| Dashboard | `frontend/src/pages/Dashboard.tsx` |
| Stores | `frontend/src/store/*.ts` |
| Entities | `backend/src/common/entities/index.ts` |
| Vite Config | `frontend/vite.config.ts` |

## API Endpoints (Summary)

- **Auth:** POST `/api/auth/login`, `/refresh`, GET `/me`, POST `/logout`
- **Announcements:** GET/POST/PATCH/DELETE `/api/announcements`
- **File Server:** GET `/api/file-server/shares`, `/browse`, `/download`
- **ONLYOFFICE:** GET `/api/file-server/document/config`, POST `/callback`
- **Documents (Folders):** POST/GET `/api/documents/folders`, GET/PATCH/DELETE `/documents/folders/:id`, GET `/documents/folders/:id/tree`, GET `/documents/folders/:id/breadcrumb`
- **Documents (Files):** POST `/api/documents/upload`, GET `/api/documents`, GET/PATCH/DELETE `/documents/:id`, GET `/documents/:id/download`
- **Documents (Versions):** POST `/api/documents/:id/versions`, GET `/documents/:id/versions`, GET `/documents/:id/versions/:vn/download`
- **Users:** GET `/api/users`, PATCH `/users/:id/role`
- **Groups:** GET/POST `/api/groups`, GET/PATCH/DELETE `/groups/:id`, POST/PATCH/DELETE `/groups/:id/members`
- **Projects:** GET/POST `/api/projects`, GET/PATCH/DELETE `/projects/:id`, GET `/projects/:id/members`, POST/PATCH/DELETE `/projects/:id/assignments`
- **Access:** POST `/api/access/check`, GET/POST/DELETE `/access/rules`, GET `/access/user/:id/permissions`, GET `/access/resource/:type/:id`

## Database Tables

| Table | Module | Description |
|-------|--------|-------------|
| users | Auth/Users | Kullanıcılar (AD sync) |
| announcements | Announcements | Duyurular |
| applications | Dashboard | Uygulama kısayolları |
| groups | Groups | Departman/disiplin grupları |
| user_groups | Groups | Kullanıcı-grup ilişkisi + rol |
| projects | Projects | Projeler |
| project_assignments | Projects | Proje-kullanıcı atamaları |
| access_rules | Access | Erişim kuralları |
| folders | Documents | Hiyerarşik klasör yapısı |
| documents | Documents | Dokümanlar (MinIO storage) |
| document_versions | Documents | Doküman versiyonları |

## Docker Ports

| Service | Port |
|---------|------|
| API | 3001 |
| Frontend | 5173 |
| Nginx | 80 |
| PostgreSQL | 5434 |
| Redis | 6380 |
| ONLYOFFICE | 8088 |
| MinIO | 9002 |
| MinIO Console | 9003 |

## Guards & Decorators

- `@Public()` - Skip auth
- `@CurrentUser()` - Get user from request
- `JwtAuthGuard` - Global (auto)
- `AdminGuard` - Admin only

## Troubleshooting

- **Login fails:** Check LDAP in `.env`, API logs
- **File Server empty:** Check FILE_SERVER_HOST accessibility
- **Redis errors:** Ensure container running
- **ONLYOFFICE save fails:** Check callback returns 200, JWT secret match
- **CJS/ESM error in Vite:** Add package to `optimizeDeps.include` in vite.config.ts
- **Docker cache stale:** Use `docker-compose build --no-cache <service>`
- **EntityMetadataNotFoundError:** Entity must be in BOTH `packages/core/src/entities/` AND `backend/src/common/entities/`
