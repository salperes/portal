# MSS Portal - Modüler Mimari Geçiş Planı

## Mevcut Durum

| Faz | Durum | Notlar |
|-----|-------|--------|
| Faz 1: Altyapı | ✅ Tamamlandı | pnpm workspace, Turborepo |
| Faz 2: Core | ✅ Tamamlandı | @portal/core types |
| Faz 3: Modüller | ✅ Tamamlandı | 3 modül CLAUDE.md oluşturuldu |
| Faz 4: UI Kit | ✅ Tamamlandı | 8 component (@portal/ui) |
| Faz 5: App Shell | ✅ Tamamlandı | apps/api, apps/web, lazy loading |
| Faz 6: Tam Ayrım | ✅ Tamamlandı | Entity'ler, tipler ve modül paketleri hazır |

### Faz 6 İlerleme Detayı

#### ✅ Tamamlanan
- **Shared Entities**: TypeORM entity'leri `@portal/core/entities`'e taşındı
  - User, Announcement, Application entity'leri
  - Enum'lar (UserRole, AnnouncementCategory, Priority)
  - Package.json exports yapılandırması (`./entities` subpath)
- **Backend Integration**: Backend artık `@portal/core/entities`'den import ediyor
  - `backend/src/common/entities/index.ts` re-export yapıyor (geriye uyumluluk)
- **Docker pnpm**: Monorepo yapısı için Docker yapılandırıldı
  - `pnpm --shamefully-hoist` ile flat node_modules
  - Dockerfile.backend pnpm workspace desteği
- **Frontend Modül Paketleri**:
  - `@portal/announcements` - Pages: Announcements, AnnouncementDetail, AnnouncementsAdmin
  - `@portal/file-server` - Types ve utilities (canOpenWithOnlyOffice, formatFileSize)
  - `@portal/users` - Types ve re-exports
- **Frontend Types**: `frontend/src/types/` artık `@portal/core`'dan re-export ediyor

#### 📋 Sonraki Adımlar (Opsiyonel)
- Frontend sayfalarını `packages/modules/*/frontend/`'e fiziksel taşıma
- `apps/api` ve `apps/web` tam aktivasyonu (backend/ ve frontend/ yerine)

---

## Problem

- **Toplam LOC:** ~7,300+ satır (büyümeye devam ediyor)
- **Context Sorunu:** Claude Code ile çalışırken tüm kod context'e sığmıyor
- **Monolitik Yapı:** Tüm modüller birbirine bağımlı
- **Ölçeklenebilirlik:** Yeni özellikler eklemek giderek zorlaşıyor

---

## Hedef Mimari

```
portal/
├── packages/                    # Monorepo yapısı
│   ├── core/                   # Ortak altyapı (auth, db, redis)
│   ├── modules/                # Feature modülleri
│   │   ├── announcements/      # Duyurular modülü
│   │   ├── file-server/        # Dosya sunucusu modülü
│   │   ├── users/              # Kullanıcı yönetimi
│   │   ├── calendar/           # [YENİ] Takvim modülü
│   │   ├── whatsapp/           # [YENİ] WhatsApp entegrasyonu
│   │   └── ...
│   └── ui/                     # Paylaşılan UI bileşenleri
├── apps/
│   ├── api/                    # Ana API (NestJS gateway)
│   └── web/                    # Ana Frontend (React shell)
├── docs/                       # Modül dokümantasyonları
│   ├── core.md
│   ├── announcements.md
│   └── ...
└── CLAUDE.md                   # Ana Claude talimatları
```

---

## Strateji: Her Modül Bağımsız Bir Birim

### 1. Backend Modül Yapısı

Her modül kendi içinde tam bir NestJS modülü olacak:

```
packages/modules/announcements/
├── CLAUDE.md                   # Modül-spesifik Claude talimatları
├── package.json                # Modül bağımlılıkları
├── src/
│   ├── index.ts               # Public exports
│   ├── announcements.module.ts
│   ├── announcements.controller.ts
│   ├── announcements.service.ts
│   ├── entities/
│   │   └── announcement.entity.ts
│   ├── dto/
│   │   ├── create-announcement.dto.ts
│   │   └── update-announcement.dto.ts
│   └── __tests__/
│       └── announcements.service.spec.ts
└── README.md
```

### 2. Frontend Modül Yapısı

Her modül kendi sayfaları, bileşenleri ve store'u ile gelecek:

```
packages/modules/announcements/
├── CLAUDE.md
├── package.json
├── src/
│   ├── index.ts               # Public exports
│   ├── pages/
│   │   ├── AnnouncementsList.tsx
│   │   └── AnnouncementsAdmin.tsx
│   ├── components/
│   │   ├── AnnouncementCard.tsx
│   │   └── AnnouncementForm.tsx
│   ├── hooks/
│   │   └── useAnnouncements.ts
│   ├── services/
│   │   └── announcementsApi.ts
│   ├── store/
│   │   └── announcementsStore.ts
│   └── types/
│       └── announcement.types.ts
└── README.md
```

---

## Modül CLAUDE.md Yapısı

Her modül kendi `CLAUDE.md` dosyasına sahip olacak:

```markdown
# Announcements Module

## Modül Hakkında
Şirket içi duyuruları yönetir. CRUD operasyonları, öncelik ve kategori sistemi.

## Dosya Yapısı
- `announcements.service.ts` - İş mantığı
- `announcements.controller.ts` - API endpoints
- `entities/announcement.entity.ts` - Veritabanı şeması

## API Endpoints
- GET /api/announcements - Liste
- POST /api/announcements - Oluştur (admin)
- PATCH /api/announcements/:id - Güncelle (admin)
- DELETE /api/announcements/:id - Sil (admin)

## Bağımlılıklar
- @portal/core (auth, database)

## Önemli Notlar
- Duyurular soft-delete kullanmaz
- Priority: critical > important > info
- Category: general, hr, it, finance
```

---

## Context Yönetimi Stratejisi

### 1. Modül Başına Çalışma

```
# Sadece announcements modülü üzerinde çalış
cd packages/modules/announcements
claude .
```

Claude, sadece o modülün `CLAUDE.md` dosyasını ve kodunu görecek.

### 2. Ana CLAUDE.md'de Yönlendirme

```markdown
# MSS Portal

## Modül Listesi
| Modül | Konum | CLAUDE.md |
|-------|-------|-----------|
| Core | packages/core | [Link](packages/core/CLAUDE.md) |
| Announcements | packages/modules/announcements | [Link](...) |
| File Server | packages/modules/file-server | [Link](...) |

## Hangi Modülde Çalışmalı?
- Duyuru işlemleri → `packages/modules/announcements`
- Dosya sunucusu → `packages/modules/file-server`
- Auth/Login → `packages/core`
```

### 3. Cross-Module İşlemler

Birden fazla modülü etkileyen işlemler için:
1. Ana `CLAUDE.md` üzerinden başla
2. İlgili modüllerin `CLAUDE.md` dosyalarını oku
3. Değişiklikleri modül bazında yap

---

## Geçiş Planı

### Faz 1: Altyapı Hazırlığı (1-2 gün) ✅

- [x] pnpm workspace yapılandırması
- [x] packages/ klasör yapısı oluşturma
- [x] Shared types ve interfaces ayırma
- [x] Build pipeline kurulumu (Turborepo)

### Faz 2: Core Modül Ayırma (2-3 gün) ✅

- [x] `packages/core/` oluştur
  - [x] Shared types (user.types.ts, announcement.types.ts)
  - [x] Type exports ve helpers
- [x] Core CLAUDE.md yaz

### Faz 3: Feature Modülleri Ayırma (her biri ~1 gün) ✅

1. **Announcements**
   - [x] CLAUDE.md yaz (packages/modules/announcements/CLAUDE.md)

2. **Users**
   - [x] CLAUDE.md yaz (packages/modules/users/CLAUDE.md)

3. **File Server**
   - [x] CLAUDE.md yaz (packages/modules/file-server/CLAUDE.md)

4. **Integrations (RMS)**
   - [ ] Backend modül ayır
   - [ ] CLAUDE.md yaz

### Faz 4: UI Kit Oluşturma (1-2 gün) ✅

- [x] `packages/ui/` oluştur
- [x] Ortak bileşenleri taşı:
  - Button, Card, Modal, Avatar, Badge, Alert
  - Input, SearchInput
  - Loading, PageLoading
- [x] UI CLAUDE.md yaz
- [ ] Storybook kurulumu (opsiyonel)

### Faz 5: App Shell (1 gün) ✅

- [x] `apps/api/` - Gateway API (NestJS shell)
- [x] `apps/web/` - React shell (routing, lazy loading)
- [x] Module lazy loading pattern
- [ ] Modül lazy loading

---

## Yeni Modül Ekleme Template

Yeni bir modül (örn: Calendar) eklerken:

```bash
# 1. Modül klasörü oluştur
mkdir -p packages/modules/calendar/src/{pages,components,hooks,services,store,types}

# 2. package.json oluştur
# 3. CLAUDE.md oluştur
# 4. Modülü apps/api ve apps/web'e kaydet
```

### Yeni Modül CLAUDE.md Template

```markdown
# [Modül Adı] Module

## Modül Hakkında
[Kısa açıklama]

## Dosya Yapısı
[Dosya listesi ve açıklamaları]

## API Endpoints
[Endpoint listesi]

## Frontend Sayfalar
[Sayfa listesi ve rotalar]

## Bağımlılıklar
[Kullandığı diğer modüller]

## Veritabanı Şeması
[Entity yapıları]

## Önemli Notlar
[Dikkat edilmesi gerekenler]
```

---

## Monorepo Araçları

### pnpm Workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'packages/modules/*'
  - 'apps/*'
```

### Turborepo (Build Optimization)

```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

---

## Örnek: Takvim Modülü Ekleme

```
packages/modules/calendar/
├── CLAUDE.md
├── package.json
├── src/
│   ├── backend/
│   │   ├── calendar.module.ts
│   │   ├── calendar.controller.ts
│   │   ├── calendar.service.ts
│   │   ├── entities/
│   │   │   ├── event.entity.ts
│   │   │   └── reminder.entity.ts
│   │   └── dto/
│   │       ├── create-event.dto.ts
│   │       └── update-event.dto.ts
│   └── frontend/
│       ├── pages/
│       │   └── CalendarPage.tsx
│       ├── components/
│       │   ├── CalendarView.tsx
│       │   ├── EventModal.tsx
│       │   └── MiniCalendar.tsx
│       ├── hooks/
│       │   └── useCalendar.ts
│       └── services/
│           └── calendarApi.ts
```

**calendar/CLAUDE.md:**
```markdown
# Calendar Module

## Modül Hakkında
Şirket takvimi ve etkinlik yönetimi.

## Özellikler
- Aylık/haftalık/günlük görünüm
- Etkinlik CRUD
- Hatırlatıcılar
- Departman takvimi

## API Endpoints
- GET /api/calendar/events
- POST /api/calendar/events
- PATCH /api/calendar/events/:id
- DELETE /api/calendar/events/:id

## Bağımlılıklar
- @portal/core (auth, database)
- @portal/ui (components)
```

---

## Avantajlar

1. **Context Optimizasyonu**
   - Her modül ~500-1000 LOC
   - Claude sadece ilgili kodu görür
   - Daha hızlı ve doğru yanıtlar

2. **Bağımsız Geliştirme**
   - Modüller ayrı test edilebilir
   - Farklı kişiler farklı modüllerde çalışabilir
   - Breaking change riski azalır

3. **Kolay Bakım**
   - Modül başına CLAUDE.md
   - Her modül kendi dokümantasyonuna sahip
   - Yeni geliştirici onboarding kolaylaşır

4. **Ölçeklenebilirlik**
   - Yeni modül eklemek kolay
   - Modüller ayrı deploy edilebilir (gelecekte)
   - Microservice'e geçiş kapısı açık

---

## Öneri: İlk Adım

En düşük riskli modül olan **Announcements** ile başla:
1. Bağımsız çalışıyor
2. Az bağımlılık
3. Küçük kod tabanı (~400 LOC)

Başarılı olduktan sonra diğer modüllere geç.

---

## Zamanlama Tahmini

| Faz | Süre |
|-----|------|
| Altyapı | 1-2 gün |
| Core | 2-3 gün |
| Announcements | 1 gün |
| Users | 1 gün |
| File Server | 2 gün |
| UI Kit | 1-2 gün |
| App Shell | 1 gün |
| **Toplam** | **~10-12 gün** |

---

## Apps Aktivasyonu İçin Gerekli Adımlar

> **Mevcut Durum:** `backend/` ve `frontend/` aktif. `apps/` shell olarak hazır, modüller taşındığında aktifleştirilecek.

### Faz 6: Tam Modül Ayrımı (Opsiyonel)

Bu adımlar `apps/` yapısını tam aktif hale getirir:

#### 1. Backend Modüllerini Taşı
```
backend/src/announcements/ → packages/modules/announcements/src/backend/
backend/src/users/         → packages/modules/users/src/backend/
backend/src/file-server/   → packages/modules/file-server/src/backend/
backend/src/auth/          → packages/core/src/auth/
```

Her modül için:
- [ ] Entity'leri taşı
- [ ] Service'leri taşı
- [ ] Controller'ları taşı
- [ ] DTO'ları taşı
- [ ] Module dosyasını güncelle
- [ ] Package.json bağımlılıklarını ekle

#### 2. Frontend Modüllerini Taşı
```
frontend/src/pages/Announcements*.tsx → packages/modules/announcements/src/frontend/pages/
frontend/src/pages/FileServer*.tsx    → packages/modules/file-server/src/frontend/pages/
frontend/src/pages/Users*.tsx         → packages/modules/users/src/frontend/pages/
frontend/src/components/              → packages/ui/src/components/ (ortak olanlar)
```

Her modül için:
- [ ] Page component'leri taşı
- [ ] Modül-spesifik component'leri taşı
- [ ] Hooks'ları taşı
- [ ] API service'leri taşı
- [ ] Store'ları taşı

#### 3. apps/api Aktivasyonu
```typescript
// apps/api/src/app.module.ts
import { AnnouncementsModule } from '@portal/modules-announcements';
import { UsersModule } from '@portal/modules-users';
import { FileServerModule } from '@portal/modules-file-server';
import { AuthModule } from '@portal/core';

@Module({
  imports: [
    AuthModule,
    AnnouncementsModule,
    UsersModule,
    FileServerModule,
  ],
})
export class AppModule {}
```

#### 4. apps/web Aktivasyonu
```typescript
// apps/web/src/App.tsx
const AnnouncementsPage = lazy(() => import('@portal/modules-announcements/pages'));
const FileServerPage = lazy(() => import('@portal/modules-file-server/pages'));
const UsersPage = lazy(() => import('@portal/modules-users/pages'));

<Routes>
  <Route path="/announcements/*" element={<AnnouncementsPage />} />
  <Route path="/files/*" element={<FileServerPage />} />
  <Route path="/admin/users/*" element={<UsersPage />} />
</Routes>
```

#### 5. Docker Config Güncelle
```yaml
# testenv/docker-compose.yml
portal-test-api:
  build:
    context: ..
    dockerfile: testenv/Dockerfile.api
  # working_dir değişir: /app/apps/api
```

#### 6. Eski Yapıyı Kaldır
- [ ] `backend/` klasörünü sil (veya archive)
- [ ] `frontend/` klasörünü sil (veya archive)
- [ ] pnpm-workspace.yaml'dan kaldır

### Ne Zaman Yapılmalı?

| Senaryo | Öneri |
|---------|-------|
| Tek geliştirici, küçük ekip | Mevcut yapı yeterli, Faz 6 opsiyonel |
| Ekip büyüyor, paralel geliştirme | Faz 6'yı uygula |
| Yeni büyük modül ekleniyor | Yeni modülü direkt packages/modules/'a ekle |
| Microservice'e geçiş planı | Faz 6 zorunlu |

---

## Sonuç

Bu plan ile:
- ✅ Context sorunu çözülür
- ✅ Kod revizyonu kolaylaşır
- ✅ Yeni modüller izole kalır
- ✅ Monolitik yapıdan uzaklaşılır
- ✅ Ekip büyümesine hazır olunur
