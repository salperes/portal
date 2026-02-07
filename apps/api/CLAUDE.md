# @portal/api - Gateway API

## Overview
NestJS gateway application. Tüm backend modüllerini birleştirir.

## Status
⏳ **Hazırlanıyor** - Şu anda `backend/` klasörü ana API olarak kullanılıyor.

## Structure

```
apps/api/
├── src/
│   ├── main.ts        # Entry point
│   └── app.module.ts  # Root module (imports all feature modules)
├── package.json
└── CLAUDE.md
```

## Aktif Yapı vs Hedef Yapı

| Şu An | Hedef |
|-------|-------|
| `backend/src/auth/` | `@portal/core` |
| `backend/src/announcements/` | `@portal/modules-announcements` |
| `backend/src/users/` | `@portal/modules-users` |
| `backend/src/file-server/` | `@portal/modules-file-server` |
| `backend/src/app.module.ts` | `apps/api/src/app.module.ts` |

## Aktivasyon Adımları

1. **Modülleri packages/'a taşı**
   ```bash
   # Her modül için entity, service, controller, dto taşınacak
   backend/src/announcements/ → packages/modules/announcements/src/backend/
   ```

2. **app.module.ts'i güncelle**
   ```typescript
   import { AnnouncementsModule } from '@portal/modules-announcements';
   import { UsersModule } from '@portal/modules-users';
   import { FileServerModule } from '@portal/modules-file-server';

   @Module({
     imports: [AnnouncementsModule, UsersModule, FileServerModule],
   })
   export class AppModule {}
   ```

3. **Docker config güncelle**
   ```yaml
   portal-test-api:
     build:
       context: ..
       dockerfile: testenv/Dockerfile.api  # apps/api'yi build et
   ```

4. **Test et ve backend/ klasörünü archive'la**

## Dependencies
- `@portal/core` - Shared types, auth
- `@portal/modules-*` - Feature modules (aktivasyon sonrası)

## İlgili Dosyalar
- Detaylı plan: [MODULAR_ARCHITECTURE_PLAN.md](../../MODULAR_ARCHITECTURE_PLAN.md)
- Mevcut API: [backend/](../../backend/)
