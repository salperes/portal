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
│   ├── core/              # @portal/core - Shared types
│   ├── ui/                # @portal/ui - UI components
│   └── modules/
│       ├── announcements/ # Duyuru modülü
│       ├── users/         # Kullanıcı yönetimi
│       └── file-server/   # Dosya sunucusu + ONLYOFFICE
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
| Core Types | [packages/core/CLAUDE.md](packages/core/CLAUDE.md) |
| UI Kit | [packages/ui/CLAUDE.md](packages/ui/CLAUDE.md) |
| API Gateway | [apps/api/CLAUDE.md](apps/api/CLAUDE.md) |
| Web Shell | [apps/web/CLAUDE.md](apps/web/CLAUDE.md) |
| Docker | [testenv/README.md](testenv/README.md) |
| UI Design | [UI_TEMPLATE.md](UI_TEMPLATE.md) |
| Architecture | [MODULAR_ARCHITECTURE_PLAN.md](MODULAR_ARCHITECTURE_PLAN.md) |

> **Context Tip:** Modül üzerinde çalışırken ilgili CLAUDE.md'yi oku.

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
| Layout | `frontend/src/components/Layout.tsx` |
| Dashboard | `frontend/src/pages/Dashboard.tsx` |
| Stores | `frontend/src/store/*.ts` |

## API Endpoints (Summary)

- **Auth:** POST `/api/auth/login`, `/refresh`, GET `/me`, POST `/logout`
- **Announcements:** GET/POST/PATCH/DELETE `/api/announcements`
- **File Server:** GET `/api/file-server/shares`, `/browse`, `/download`
- **Documents:** GET `/api/file-server/document/config`, POST `/callback`
- **Users:** GET `/api/users`, PATCH `/users/:id/role`

## Docker Ports

| Service | Port |
|---------|------|
| API | 3001 |
| Frontend | 5173 |
| Nginx | 80 |
| PostgreSQL | 5434 |
| Redis | 6380 |
| ONLYOFFICE | 8088 |

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
