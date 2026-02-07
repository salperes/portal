# @portal/web - Web Shell

## Overview
React shell application. Routing, layout ve lazy loading yönetir.

## Status
⏳ **Hazırlanıyor** - Şu anda `frontend/` klasörü ana uygulama olarak kullanılıyor.

## Structure

```
apps/web/
├── src/
│   ├── main.tsx       # Entry point
│   ├── App.tsx        # Shell component (routing, lazy loading)
│   └── index.css      # Global styles
├── vite.config.ts
├── package.json
└── CLAUDE.md
```

## Aktif Yapı vs Hedef Yapı

| Şu An | Hedef |
|-------|-------|
| `frontend/src/pages/Announcements*.tsx` | `@portal/modules-announcements/pages` |
| `frontend/src/pages/FileServer*.tsx` | `@portal/modules-file-server/pages` |
| `frontend/src/pages/Users*.tsx` | `@portal/modules-users/pages` |
| `frontend/src/components/` | `@portal/ui` (ortak) + modül-spesifik |
| `frontend/src/App.tsx` | `apps/web/src/App.tsx` |

## Lazy Loading Pattern

```tsx
// Modüller lazy loading ile yüklenir
const AnnouncementsPage = lazy(() => import('@portal/modules-announcements/pages'));
const FileServerPage = lazy(() => import('@portal/modules-file-server/pages'));
const UsersPage = lazy(() => import('@portal/modules-users/pages'));

// Routes
<Suspense fallback={<PageLoading />}>
  <Routes>
    <Route path="/announcements/*" element={<AnnouncementsPage />} />
    <Route path="/files/*" element={<FileServerPage />} />
    <Route path="/admin/users/*" element={<UsersPage />} />
  </Routes>
</Suspense>
```

## Aktivasyon Adımları

1. **Sayfa component'lerini taşı**
   ```bash
   frontend/src/pages/Announcements*.tsx → packages/modules/announcements/src/frontend/pages/
   frontend/src/pages/FileServer*.tsx → packages/modules/file-server/src/frontend/pages/
   ```

2. **Ortak component'leri @portal/ui'a taşı**
   - Layout, Sidebar, Header → `@portal/ui`
   - Modül-spesifik component'ler → ilgili modüle

3. **Store ve hooks'ları taşı**
   ```bash
   frontend/src/store/announcementStore.ts → packages/modules/announcements/src/frontend/store/
   ```

4. **App.tsx'i güncelle** (lazy import'lar)

5. **Docker config güncelle**

## Dependencies

- `@portal/core` - Shared types
- `@portal/ui` - UI components
- `@portal/modules-*` - Feature modules (aktivasyon sonrası)

## Build Optimization

Vite otomatik code splitting yapar:
- Vendor chunk: react, react-dom, react-router-dom
- Module chunks: Her modül ayrı chunk olarak yüklenir

## İlgili Dosyalar
- Detaylı plan: [MODULAR_ARCHITECTURE_PLAN.md](../../MODULAR_ARCHITECTURE_PLAN.md)
- Mevcut Frontend: [frontend/](../../frontend/)
