# Portal Projesi - İlerleme Raporu

## Tamamlanan Adımlar

### 1. Proje Planlaması ✅
- [PORTAL_PLAN.md](PORTAL_PLAN.md) oluşturuldu
- Teknoloji stack belirlendi
- Veritabanı şeması tasarlandı

### 2. Test Ortamı (testenv) ✅
- Docker Compose ile servisler kuruldu:

| Servis | Port | Durum |
|--------|------|-------|
| PostgreSQL | 5433 | ✅ |
| Redis | 6379 | ✅ |
| Adminer | 8082 | ✅ |
| Redis Commander | 8081 | ✅ |
| MinIO | 9000/9001 | ✅ |
| MailHog | 1025/8025 | ✅ |

### 3. Backend (NestJS) ✅
- Auth modülü (JWT + LDAP)
- User, Announcement, Application entity'leri
- Swagger API dokümantasyonu
- Global JWT guard
- SSO token generation (RMS entegrasyonu)

### 4. Frontend (React) ✅
- Vite + React + TypeScript
- Tailwind CSS
- Zustand state management
- SharePoint/Microsoft 365 tarzı UI tasarımı
- Responsive layout

### 5. Active Directory Entegrasyonu ✅
- LDAP authentication çalışıyor
- Service account ile kullanıcı arama
- Kullanıcı şifresi doğrulama
- AD bilgilerini otomatik çekme (displayName, email, department)
- Admin yetkisi AD grubundan veya veritabanından

### 6. Duyuru Modülü ✅
- Backend CRUD API (NestJS)
  - GET /api/announcements - Aktif duyuruları listele
  - GET /api/announcements/latest - Son duyuruları getir
  - GET /api/announcements/:id - Duyuru detayı
  - POST /api/announcements - Yeni duyuru (Admin)
  - PATCH /api/announcements/:id - Güncelle (Admin)
  - DELETE /api/announcements/:id - Sil (Admin)
- Frontend UI
  - Dashboard'da son duyurular widget'ı
  - Duyuru listesi sayfası (filtreleme + arama)
  - Duyuru detay sayfası
  - Admin duyuru yönetim sayfası (CRUD)
- Özellikler: Kategori, öncelik, yayın/bitiş tarihi, aktif/pasif

### 7. SSO Entegrasyonu ✅
- RMS (Requirements Management System) entegrasyonu
- JWT tabanlı SSO token üretimi
- Uygulama launcher'dan SSO ile yönlendirme
- Endpoint: GET /api/integrations/rms/launch

### 8. SharePoint Tarzı UI ✅
- Microsoft 365 benzeri üst bar (mavi tema #0078d4)
- Waffle menü (uygulama başlatıcı)
- Sol navigasyon paneli
- Command bar ve breadcrumb
- Temiz, düz (flat) tasarım
- Microsoft giriş ekranı

### 9. Şirket Logoları ✅
- Login sayfasına logo.svg eklendi
- Sidebar'a mss-eye.png logosu eklendi (40x40px)
- Logolar frontend/public/ klasöründe

### 10. Dark Mode ✅
- Zustand ile tema state yönetimi (themeStore.ts)
- localStorage ile kalıcılık
- Topbar'da Sun/Moon toggle butonu
- Tüm sayfalarda dark mode desteği (Layout, Dashboard, Login)

### 11. Drag & Drop Sıralama ✅
- Dashboard'daki uygulama sıralaması drag & drop ile değiştirilebilir
- Sıralama localStorage'da saklanıyor
- Sayfa değişimlerinde korunuyor

### 12. Docker Container Ortamı (portal-test-*) ✅
- Tam Docker Compose ortamı oluşturuldu
- Production-ready Dockerfile'lar (multi-stage build)
- Nginx reverse proxy yapılandırması
- Mevcut container'larla çakışmayan portlar:

| Servis | Container | İç Port | Dış Port |
|--------|-----------|---------|----------|
| API | portal-test-api | 3000 | 3001 |
| Frontend | portal-test-frontend | 5173 | 5173 |
| Nginx | portal-test-nginx | 80 | 80 |
| PostgreSQL | portal-test-db | 5432 | 5434 |
| Redis | portal-test-redis | 6379 | 6380 |
| MinIO | portal-test-minio | 9000/9001 | 9002/9003 |
| ONLYOFFICE | portal-test-onlyoffice | 80 | 8088 |

### 13. Windows File Server (SMB) Entegrasyonu ✅
- Backend SMB client (@marsaud/smb2)
- Kullanıcının AD yetkileriyle dosya erişimi
- Redis'te şifrelenmiş şifre saklama (AES-256-GCM)
- API Endpoints:
  - `GET /api/file-server/shares` - Paylaşımları listele
  - `GET /api/file-server/browse` - Klasör içeriği
  - `GET /api/file-server/download` - Dosya indir
  - `POST /api/file-server/upload` - Dosya yükle
  - `DELETE /api/file-server/delete` - Sil
  - `POST /api/file-server/create-folder` - Klasör oluştur
- Frontend dosya yöneticisi (FileServer.tsx)
  - Share listesi görünümü
  - Tablo/Grid görünüm modları
  - Breadcrumb navigasyon
  - Drag & drop yükleme
  - Çoklu seçim ve toplu işlem

### 14. Redis Entegrasyonu ✅
- RedisService (common/services/redis.service.ts)
- AES-256-GCM şifreleme
- Kullanıcı kimlik bilgileri saklama (7 gün TTL)
- Login'de otomatik kayıt, logout'ta silme

### 15. Proje Dokümantasyonu ✅
- CLAUDE.md oluşturuldu
- Tüm mimari ve paternler belgelendi

### 16. ONLYOFFICE Döküman Düzenleyici ✅
- ONLYOFFICE Document Server Docker entegrasyonu
- PDF, Word, Excel, PowerPoint dosya desteği
- Görüntüleme ve düzenleme modları
- JWT tabanlı güvenlik
- Desteklenen formatlar:
  - Word: .doc, .docx, .odt, .rtf, .txt
  - Excel: .xls, .xlsx, .ods, .csv
  - PowerPoint: .ppt, .pptx, .odp
  - PDF: .pdf (sadece görüntüleme)
- Düzenlenebilir formatlar: .docx, .xlsx, .pptx, .txt, .csv
- Frontend DocumentViewer komponenti
- Dosya sunucusu sayfasına entegrasyon
- **Döküman Kaydetme:**
  - ONLYOFFICE callback endpoint (POST /api/file-server/document/callback)
  - Status 2 (document ready) ve 6 (forcesave) desteği
  - Redis'te geçici döküman erişim bilgisi saklama
  - SMB üzerinden dosya kaydetme (overwrite modu)
- **Mod Geçişi (View/Edit):**
  - React flushSync ile güvenli DOM güncellemesi
  - ONLYOFFICE editor tamamen destroy edilip yeniden oluşturuluyor
  - Geçiş sırasında loading state gösterimi
- **Docker Network İletişimi:**
  - ONLYOFFICE container'ı backend'e internal URL üzerinden erişiyor
  - `http://portal-test-api:3000` (localhost değil)
  - Document URL ve callback URL bu format ile oluşturuluyor
- **Collaborative Editing (Çoklu Kullanıcı Düzenleme):**
  - Aynı dosyayı aynı anda birden fazla kullanıcı düzenleyebilir
  - Gerçek zamanlı senkronizasyon (ONLYOFFICE yönetiyor)
  - Aktif kullanıcılar listesi (yeşil badge ile gösterim)
  - Session key paylaşımı (Redis üzerinden)
  - Kullanıcı bağlantı/ayrılma takibi

---

## Mevcut Durum

### Çalışan Özellikler
- ✅ AD kullanıcıları ile giriş
- ✅ JWT token authentication
- ✅ Kullanıcı bilgilerini AD'den çekme
- ✅ Oturum yönetimi
- ✅ Duyuru CRUD (API + UI)
- ✅ Admin panel (duyuru yönetimi)
- ✅ RMS SSO entegrasyonu
- ✅ SharePoint tarzı modern UI
- ✅ Dark/Light mode toggle
- ✅ Şirket logoları
- ✅ Docker container ortamı
- ✅ Windows File Server (SMB) entegrasyonu
- ✅ Redis şifre yönetimi
- ✅ ONLYOFFICE döküman görüntüleme ve düzenleme

### Yapılacaklar
- [ ] Döküman modülü (MinIO entegrasyonu)
- [ ] Uygulama launcher (tam CRUD + UI)
- [ ] Admin paneli (diğer modüller)
- [ ] Kerberos SSO (opsiyonel)
- [ ] Production deployment

---

## Klasör Yapısı

```
portal/
├── CLAUDE.md                  # Claude Code talimatları
├── PORTAL_PLAN.md
├── progress_report.md
├── dev.bat                    # Development sunucu yönetim scripti
├── testenv/                   # Docker geliştirme ortamı
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── Dockerfile.backend
│   ├── Dockerfile.backend.prod
│   ├── Dockerfile.frontend
│   ├── Dockerfile.frontend.prod
│   ├── nginx.conf
│   ├── nginx.prod.conf
│   ├── nginx.frontend.conf
│   ├── .env
│   ├── .env.example
│   ├── start.bat / start.sh
│   └── stop.bat
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   │   ├── ldap.service.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   └── jwt.strategy.ts
│   │   ├── announcements/
│   │   │   ├── announcements.controller.ts
│   │   │   ├── announcements.service.ts
│   │   │   ├── announcements.module.ts
│   │   │   └── dto/
│   │   ├── integrations/       # SSO entegrasyonları
│   │   │   ├── integrations.controller.ts
│   │   │   ├── integrations.module.ts
│   │   │   └── sso.service.ts
│   │   ├── file-server/        # SMB dosya sunucusu
│   │   │   ├── file-server.module.ts
│   │   │   ├── file-server.controller.ts
│   │   │   ├── file-server.service.ts
│   │   │   ├── smb.service.ts
│   │   │   ├── document.service.ts  # ONLYOFFICE entegrasyonu
│   │   │   └── dto/
│   │   ├── common/
│   │   │   ├── entities/
│   │   │   ├── services/
│   │   │   │   └── redis.service.ts
│   │   │   └── common.module.ts
│   │   ├── config/
│   │   └── main.ts
│   └── .env
└── frontend/
    ├── public/
    │   ├── logo.svg           # Şirket logosu (login)
    │   └── mss-eye.png        # Sidebar logosu
    ├── src/
    │   ├── components/
    │   │   ├── Layout.tsx           # SharePoint tarzı layout + dark mode
    │   │   └── DocumentViewer.tsx   # ONLYOFFICE döküman görüntüleyici
    │   ├── pages/
    │   │   ├── Dashboard.tsx   # SharePoint style + drag-drop
    │   │   ├── Login.tsx       # Microsoft style + logo
    │   │   ├── FileServer.tsx  # Dosya yöneticisi
    │   │   ├── Announcements.tsx
    │   │   ├── AnnouncementDetail.tsx
    │   │   ├── Applications.tsx
    │   │   └── admin/
    │   │       └── AnnouncementsAdmin.tsx
    │   ├── services/
    │   │   ├── api.ts
    │   │   ├── announcements.ts
    │   │   ├── integrations.ts
    │   │   └── fileServerApi.ts
    │   ├── store/
    │   │   ├── authStore.ts
    │   │   ├── themeStore.ts
    │   │   └── fileServerStore.ts
    │   └── types/
    └── .env
```

---

## Çalıştırma

### Docker ile (Önerilen)
```bash
cd testenv
./start.bat          # Windows
./start.sh           # Linux/Mac

# Logları izle
docker-compose logs -f

# Durdur
docker-compose down
```

**Erişim Adresleri:**
| Servis | URL |
|--------|-----|
| Frontend (Vite) | http://localhost:5173 |
| Frontend (Nginx) | http://localhost |
| Backend API | http://localhost:3001/api |
| Swagger Docs | http://localhost:3001/api/docs |
| MinIO Console | http://localhost:9003 |
| ONLYOFFICE | http://localhost:8088 |

### Local Development (Docker'sız)
```bash
# 1. Test ortamı (sadece DB, Redis, MinIO)
cd testenv && docker-compose up -d portal-test-db portal-test-redis portal-test-minio

# 2. Backend
cd backend && npm run start:dev
# API: http://localhost:3000/api

# 3. Frontend
cd frontend && npm run dev
# UI: http://localhost:5173
```

---

## AD Yapılandırması

```env
# backend/.env
LDAP_URL=ldap://192.168.88.200:389
LDAP_BASE_DN=DC=mss,DC=local
LDAP_BIND_DN=CN=portalservice,OU=MSSUsers,DC=mss,DC=local
LDAP_BIND_PASSWORD=****
```

## SSO Yapılandırması

```env
# backend/.env
RMS_URL=http://localhost:8080
RMS_SSO_SECRET_KEY=wn2ma6gV4GudPcZ6hWP27IX5spSal1KZCHEBl2IJuu8
```

## File Server Yapılandırması

```env
# testenv/.env
FILE_SERVER_HOST=192.168.88.113
FILE_SERVER_DOMAIN=MSS
FILE_SERVER_ENCRYPTION_KEY=portal-file-server-encryption-key-2024!
# Virgülle ayrılmış paylaşım isimleri
FILE_SERVER_SHARES=IT,Finans,HR,Kurumsal,Public,...
```

**Özellikler:**
- Kullanıcı AD yetkileriyle SMB paylaşımlarına erişim
- Şifreler AES-256-GCM ile şifrelenerek Redis'te saklanır
- 7 gün TTL (refresh token ile aynı)
- Login'de otomatik kayıt, logout'ta silme
- Paylaşım listesi environment variable ile yapılandırılabilir

## UI Tasarımı

SharePoint/Microsoft 365 tarzında modern arayüz:

| Bileşen | Özellik |
|---------|---------|
| Üst Bar | Microsoft mavi (#0078d4), waffle menü, arama, kullanıcı profili |
| Sol Panel | Site başlığı, navigasyon linkleri, admin bölümü |
| Command Bar | Breadcrumb, işlem butonları |
| Sayfalar | Düz tasarım, border-l ile öncelik gösterimi |
| Kartlar | Beyaz arka plan, gri border, hover efektleri |
| Butonlar | Microsoft mavi, düz kenarlar |

---

## ONLYOFFICE Yapılandırması

```env
# testenv/.env
ONLYOFFICE_PORT=8088
ONLYOFFICE_JWT_SECRET=portal-onlyoffice-secret-key-2024
# Docker internal network URL (ONLYOFFICE'in API'ye callback yapması için)
ONLYOFFICE_INTERNAL_API_URL=http://portal-test-api:3000
```

**ONLYOFFICE Callback Akışı:**
1. Kullanıcı dökümanı açar → Frontend config ister → Backend Redis'e erişim bilgisi kaydeder
2. ONLYOFFICE editör yüklenir → Document URL'den içerik alır (internal network)
3. Kullanıcı düzenler → ONLYOFFICE callback yapar (status: 1, 2, 4, 6)
4. Status 2 veya 6 → Backend dosyayı indirir → SMB'ye kaydeder (overwrite)
5. Backend { error: 0 } döner → ONLYOFFICE başarılı kabul eder

---

*Son Güncelleme: 2026-02-03*
