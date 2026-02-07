# MSS Kurumsal Portal - Proje Planı

## 1. Proje Özeti

### 1.1 Amaç
Şirket içi tüm bilgilendirme ve uygulamalara tek bir noktadan erişim sağlayan kurumsal portal.

### 1.2 Kapsam Kararları

| Konu | Karar | Notlar |
|------|-------|--------|
| Erişim | Sadece Intranet | VPN veya şirket ağı |
| AD Altyapısı | Lokal AD | ADFS/Azure AD yok |
| Geliştirici | Tek kişi | Basitlik öncelikli |
| Mevcut uygulamalar | Web tabanlı | Link ile entegrasyon kolay |
| Deployment | Linux Container | Docker Compose |

---

## 2. Teknoloji Kararları ve Gerekçeleri

### 2.1 Nihai Öneri

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ÖNERİLEN TEKNOLOJİ STACK                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │  FRONTEND: React + TypeScript + Tailwind CSS                    │  │
│   │  • Aynı dil ekosistemi (JS/TS)                                  │  │
│   │  • En fazla öğrenme kaynağı                                     │  │
│   │  • Component kütüphaneleri zengin                               │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │  BACKEND: Node.js + TypeScript + NestJS                         │  │
│   │  • Frontend ile aynı dil                                        │  │
│   │  • Structured framework (Spring Boot benzeri)                   │  │
│   │  • LDAP auth için hazır kütüphaneler                           │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│           ┌──────────────────┼──────────────────┐                      │
│           ▼                  ▼                  ▼                      │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │
│   │ PostgreSQL  │    │    Redis    │    │   Active    │               │
│   │  Database   │    │    Cache    │    │  Directory  │               │
│   └─────────────┘    └─────────────┘    └─────────────┘               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Neden Bu Stack?

#### Backend: Node.js + NestJS (✅ Önerilen)

| Kriter | Node.js + NestJS | ASP.NET Core |
|--------|------------------|--------------|
| Öğrenme eğrisi | ⭐⭐ Kolay | ⭐⭐⭐ Orta |
| Online kaynak | ⭐⭐⭐⭐⭐ Çok fazla | ⭐⭐⭐⭐ Fazla |
| Frontend ile dil birliği | ✅ Aynı (TypeScript) | ❌ Farklı (C#) |
| AD/LDAP desteği | ✅ passport-ldapauth | ✅ Native |
| Container boyutu | ~150MB | ~200MB |
| Tek geliştirici için | ⭐⭐⭐⭐⭐ İdeal | ⭐⭐⭐ İyi |

**NestJS Neden?**
- Express.js üzerine kurulu ama yapılandırılmış (structured)
- Dependency Injection, Modüller, Guards (Spring Boot gibi)
- TypeScript native
- Swagger/OpenAPI otomatik dokümantasyon
- Tek başına büyük proje yönetmek için ideal

#### Frontend: React + TypeScript (✅ Önerilen)

| Kriter | React | Vue.js |
|--------|-------|--------|
| İş ilanlarında talep | ⭐⭐⭐⭐⭐ En yüksek | ⭐⭐⭐⭐ Yüksek |
| Öğrenme kaynağı | ⭐⭐⭐⭐⭐ Çok fazla | ⭐⭐⭐⭐ Fazla |
| Component kütüphanesi | MUI, Ant Design, shadcn | Vuetify, PrimeVue |
| Topluluk desteği | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

#### SSO Stratejisi: Aşamalı Yaklaşım (✅ Önerilen)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AŞAMALI SSO STRATEJİSİ                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Aşama 1: LDAP Authentication (Başlangıç)                              │
│  ─────────────────────────────────────────                              │
│  • Kullanıcı: AD kullanıcı adı + şifre girer                           │
│  • Backend: LDAPS ile AD'ye sorgu yapar                                │
│  • Sonuç: JWT token döner                                              │
│  • Karmaşıklık: ⭐ Düşük                                                │
│  • Süre: 1-2 gün                                                       │
│                                                                         │
│           ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│           │  Login   │───▶│  LDAPS   │───▶│   JWT    │                 │
│           │   Form   │    │  Verify  │    │  Token   │                 │
│           └──────────┘    └──────────┘    └──────────┘                 │
│                                                                         │
│                              ║                                          │
│                              ║ Portal çalışır hale geldikten sonra     │
│                              ▼                                          │
│                                                                         │
│  Aşama 2: Kerberos SSO (İsteğe Bağlı - İleri Seviye)                   │
│  ────────────────────────────────────────────────────                   │
│  • Domain PC'lerde şifresiz otomatik giriş                             │
│  • Apache reverse proxy + mod_auth_kerb                                │
│  • Keytab dosyası yönetimi                                             │
│  • Karmaşıklık: ⭐⭐⭐ Yüksek                                            │
│  • Süre: 3-5 gün (test dahil)                                          │
│                                                                         │
│           ┌──────────┐    ┌──────────┐    ┌──────────┐                 │
│           │ Browser  │───▶│  Apache  │───▶│ Backend  │                 │
│           │(Kerberos)│    │ (SPNEGO) │    │   API    │                 │
│           └──────────┘    └──────────┘    └──────────┘                 │
│                                                                         │
│  ÖNERİ: Aşama 1 ile başla, portal stabil olduktan sonra Aşama 2'ye    │
│         geç. Kullanıcılar zaten AD şifrelerini biliyorlar.             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Proje Mimarisi

### 3.1 Klasör Yapısı

```
portal/
├── docker-compose.yml          # Container orchestration
├── docker-compose.dev.yml      # Development overrides
├── .env.example                 # Environment variables template
│
├── backend/                     # NestJS API
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── main.ts
│   │   ├── app.module.ts
│   │   ├── auth/               # Authentication module
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── ldap.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── guards/
│   │   ├── users/              # User management
│   │   ├── announcements/      # Duyurular
│   │   ├── documents/          # Dökümanlar
│   │   ├── applications/       # Uygulama launcher
│   │   └── common/             # Shared utilities
│   └── test/
│
├── frontend/                    # React SPA
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── components/         # Reusable components
│   │   ├── pages/              # Page components
│   │   │   ├── Dashboard/
│   │   │   ├── Announcements/
│   │   │   ├── Documents/
│   │   │   ├── Applications/
│   │   │   └── Profile/
│   │   ├── hooks/              # Custom hooks
│   │   ├── services/           # API calls
│   │   ├── store/              # State management
│   │   └── types/              # TypeScript types
│   └── public/
│
├── proxy/                       # Nginx config (later Apache for Kerberos)
│   ├── Dockerfile
│   └── nginx.conf
│
└── docs/                        # Documentation
    ├── PORTAL_PLAN.md
    ├── API.md
    └── DEPLOYMENT.md
```

### 3.2 Container Mimarisi

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Reverse Proxy & Static Files
  proxy:
    build: ./proxy
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
      - frontend

  # Backend API (NestJS)
  backend:
    build: ./backend
    environment:
      - NODE_ENV=production
      - LDAP_URL=ldaps://dc.sirket.local:636
      - LDAP_BASE_DN=DC=sirket,DC=local
      - LDAP_BIND_DN=CN=svc_portal,OU=ServiceAccounts,DC=sirket,DC=local
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_URL=postgresql://portal:${DB_PASSWORD}@db:5432/portal
      - REDIS_URL=redis://cache:6379
    depends_on:
      - db
      - cache

  # Frontend (React - build artifacts served by proxy)
  frontend:
    build: ./frontend
    # Static build, served by proxy

  # Database
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=portal
      - POSTGRES_USER=portal
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Cache & Session Store
  cache:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 3.3 Network Diyagramı

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           NETWORK DIAGRAM                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   Şirket Ağı (Intranet)                                                │
│   ━━━━━━━━━━━━━━━━━━━━━                                                │
│                                                                         │
│   ┌──────────────┐         ┌─────────────────────────────────────────┐ │
│   │   Kullanıcı  │────────▶│          Linux Server (Docker)          │ │
│   │   Browser    │  :443   │  ┌─────────────────────────────────┐    │ │
│   └──────────────┘         │  │      Nginx Reverse Proxy        │    │ │
│                            │  │  • SSL Termination              │    │ │
│                            │  │  • /api/* → backend:3000        │    │ │
│                            │  │  • /* → frontend static         │    │ │
│                            │  └───────────────┬─────────────────┘    │ │
│                            │                  │                       │ │
│                            │         ┌────────┴────────┐             │ │
│                            │         ▼                 ▼             │ │
│                            │  ┌─────────────┐   ┌─────────────┐      │ │
│                            │  │   Backend   │   │  Frontend   │      │ │
│                            │  │   NestJS    │   │   (React)   │      │ │
│                            │  │   :3000     │   │   static    │      │ │
│                            │  └──────┬──────┘   └─────────────┘      │ │
│                            │         │                               │ │
│                            │    ┌────┴────┬─────────────┐            │ │
│                            │    ▼         ▼             ▼            │ │
│                            │ ┌──────┐ ┌───────┐ ┌────────────┐       │ │
│                            │ │Postgre│ │ Redis │ │    AD      │       │ │
│                            │ │ SQL   │ │ Cache │ │  (LDAPS)   │       │ │
│                            │ │:5432  │ │:6379  │ │   :636     │       │ │
│                            │ └──────┘ └───────┘ └────────────┘       │ │
│                            └─────────────────────────────────────────┘ │
│                                                      │                 │
│                                                      ▼                 │
│                                           ┌──────────────────┐        │
│                                           │ Active Directory │        │
│                                           │     Server       │        │
│                                           └──────────────────┘        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Portal Modülleri

### 4.1 Ana Sayfa (Dashboard)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏢 MSS Portal                              👤 Ahmet Yılmaz ▾   🔔 3    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────┐ │
│  │  📢 Son Duyurular               │  │  ⭐ Favori Uygulamalar       │ │
│  │  ─────────────────────────────  │  │  ────────────────────────    │ │
│  │  🔴 Sistem bakımı - 01.02.2026  │  │  ┌────┐ ┌────┐ ┌────┐       │ │
│  │  🟡 Yeni izin politikası        │  │  │ERP │ │Help│ │HR  │       │ │
│  │  🟢 Doğum günü kutlaması        │  │  │    │ │Desk│ │    │       │ │
│  │  [Tümünü Gör →]                 │  │  └────┘ └────┘ └────┘       │ │
│  └─────────────────────────────────┘  └──────────────────────────────┘ │
│                                                                         │
│  ┌─────────────────────────────────┐  ┌──────────────────────────────┐ │
│  │  📄 Son Eklenen Dökümanlar      │  │  🕐 Son Kullanılan           │ │
│  │  ─────────────────────────────  │  │  ────────────────────────    │ │
│  │  📋 2026 İzin Prosedürü         │  │  • ERP - 5 dk önce          │ │
│  │  📋 IT Güvenlik Politikası      │  │  • Helpdesk - 1 saat önce   │ │
│  │  📋 Oryantasyon Rehberi v2      │  │  • Change Mgmt - dün        │ │
│  │  [Tümünü Gör →]                 │  │                              │ │
│  └─────────────────────────────────┘  └──────────────────────────────┘ │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  🚀 Tüm Uygulamalar                                              │  │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐         │  │
│  │  │  ERP   │ │Helpdesk│ │  HR    │ │ Change │ │  Req   │         │  │
│  │  │ Sistemi│ │        │ │ Portal │ │  Mgmt  │ │  Mgmt  │         │  │
│  │  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Duyuru Modülü
- Kategori: Genel, HR, IT, Finans, Acil
- Önem seviyesi: Kritik (🔴), Önemli (🟡), Bilgi (🟢)
- Okundu/okunmadı takibi
- Admin panel: Duyuru ekleme/düzenleme/silme
- Bildirim: Yeni duyuru geldiğinde badge

### 4.3 Döküman Modülü
- Kategori ağacı (klasör yapısı)
- PDF/Word/Excel önizleme
- Arama (başlık ve içerik)
- İndirme sayacı
- Versiyon geçmişi (basit)
- Admin panel: Döküman yükleme/düzenleme

### 4.4 Uygulama Launcher
- Uygulama kartları (ikon, isim, açıklama)
- Favori ekleme/çıkarma
- Son kullanılan sıralama
- Kategorileme
- Admin panel: Uygulama ekleme/düzenleme

### 4.5 Kullanıcı Profili
- AD'den otomatik bilgi çekme:
  - Ad Soyad (displayName)
  - E-posta (mail)
  - Departman (department)
  - Unvan (title)
  - Telefon (telephoneNumber)
  - Yönetici (manager)
- Profil fotoğrafı (AD thumbnailPhoto)
- Tema seçimi (açık/koyu)

---

## 5. Veritabanı Şeması

```sql
-- Users (AD'den sync + lokal veriler)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ad_username VARCHAR(100) UNIQUE NOT NULL,  -- sAMAccountName
    email VARCHAR(255),
    display_name VARCHAR(255),
    department VARCHAR(100),
    title VARCHAR(100),
    phone VARCHAR(50),
    manager_id UUID REFERENCES users(id),
    avatar_url VARCHAR(500),
    theme VARCHAR(20) DEFAULT 'light',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Announcements (Duyurular)
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,        -- general, hr, it, finance
    priority VARCHAR(20) DEFAULT 'info',  -- critical, important, info
    is_active BOOLEAN DEFAULT true,
    publish_date TIMESTAMP DEFAULT NOW(),
    expire_date TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Announcement Read Status
CREATE TABLE announcement_reads (
    user_id UUID REFERENCES users(id),
    announcement_id UUID REFERENCES announcements(id),
    read_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, announcement_id)
);

-- Document Categories
CREATE TABLE document_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    parent_id UUID REFERENCES document_categories(id),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    category_id UUID REFERENCES document_categories(id),
    version INT DEFAULT 1,
    download_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Applications (Launcher)
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    url VARCHAR(500) NOT NULL,
    icon_url VARCHAR(500),
    category VARCHAR(50),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    open_in_new_tab BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- User Favorite Applications
CREATE TABLE user_favorite_apps (
    user_id UUID REFERENCES users(id),
    app_id UUID REFERENCES applications(id),
    sort_order INT DEFAULT 0,
    added_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, app_id)
);

-- User Recent Applications
CREATE TABLE user_recent_apps (
    user_id UUID REFERENCES users(id),
    app_id UUID REFERENCES applications(id),
    last_accessed TIMESTAMP DEFAULT NOW(),
    access_count INT DEFAULT 1,
    PRIMARY KEY (user_id, app_id)
);

-- Indexes
CREATE INDEX idx_announcements_active ON announcements(is_active, publish_date);
CREATE INDEX idx_documents_category ON documents(category_id, is_active);
CREATE INDEX idx_user_recent_apps_accessed ON user_recent_apps(user_id, last_accessed DESC);
```

---

## 6. API Endpoints

### 6.1 Authentication

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/login` | LDAP ile login, JWT döner |
| POST | `/api/auth/refresh` | Token yenileme |
| POST | `/api/auth/logout` | Logout (token invalidate) |
| GET | `/api/auth/me` | Mevcut kullanıcı bilgisi |

### 6.2 Announcements

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/announcements` | Liste (paginated, filtered) |
| GET | `/api/announcements/:id` | Detay |
| POST | `/api/announcements` | Yeni duyuru (admin) |
| PUT | `/api/announcements/:id` | Güncelle (admin) |
| DELETE | `/api/announcements/:id` | Sil (admin) |
| POST | `/api/announcements/:id/read` | Okundu işaretle |

### 6.3 Documents

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/documents` | Liste (paginated, filtered) |
| GET | `/api/documents/:id` | Detay |
| GET | `/api/documents/:id/download` | İndir |
| GET | `/api/documents/categories` | Kategori ağacı |
| POST | `/api/documents` | Yükle (admin) |
| PUT | `/api/documents/:id` | Güncelle (admin) |
| DELETE | `/api/documents/:id` | Sil (admin) |

### 6.4 Applications

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/applications` | Tüm uygulamalar |
| GET | `/api/applications/favorites` | Kullanıcı favorileri |
| POST | `/api/applications/favorites/:id` | Favoriye ekle |
| DELETE | `/api/applications/favorites/:id` | Favoriden çıkar |
| GET | `/api/applications/recent` | Son kullanılanlar |
| POST | `/api/applications/:id/access` | Erişim kaydet |

### 6.5 Users

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/users/profile` | Kendi profili |
| PUT | `/api/users/profile` | Profil güncelle (tema vb.) |
| GET | `/api/users/:id` | Kullanıcı bilgisi (admin) |

---

## 7. Güvenlik

### 7.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       AUTHENTICATION FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. Login Request                                                       │
│  ┌──────────┐    POST /api/auth/login     ┌──────────────┐             │
│  │ Frontend │ ─────────────────────────▶  │   Backend    │             │
│  │          │   { username, password }    │              │             │
│  └──────────┘                             └──────┬───────┘             │
│                                                  │                      │
│  2. LDAP Verification                            │                      │
│                                                  ▼                      │
│                                           ┌──────────────┐             │
│                                           │   LDAPS      │             │
│                                           │   :636       │             │
│                                           └──────┬───────┘             │
│                                                  │                      │
│  3. User Info from AD                            │                      │
│     • displayName                                │                      │
│     • mail                                       │                      │
│     • department                                 │                      │
│     • memberOf (groups)                          │                      │
│                                                  ▼                      │
│  4. JWT Token Generation                  ┌──────────────┐             │
│                                           │   Backend    │             │
│                                           │ JWT + Refresh│             │
│                                           └──────┬───────┘             │
│                                                  │                      │
│  5. Response                                     │                      │
│  ┌──────────┐    { accessToken, user }    ┌─────┴────────┐             │
│  │ Frontend │ ◀───────────────────────────│              │             │
│  │          │                             └──────────────┘             │
│  └──────────┘                                                          │
│                                                                         │
│  6. Subsequent Requests                                                │
│  ┌──────────┐    Authorization: Bearer {token}                         │
│  │ Frontend │ ─────────────────────────────────▶ API                   │
│  └──────────┘                                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Güvenlik Checklist

- [ ] HTTPS zorunlu (TLS 1.2+)
- [ ] JWT token expiry (15 dk access, 7 gün refresh)
- [ ] Refresh token rotation
- [ ] Rate limiting (login: 5/dk, API: 100/dk)
- [ ] CORS sadece portal domain'i
- [ ] Helmet.js (security headers)
- [ ] Input validation (class-validator)
- [ ] SQL injection koruması (TypeORM parameterized)
- [ ] XSS koruması (React default escape)
- [ ] CSRF token (SameSite cookie)
- [ ] Password hiçbir yerde loglanmaz
- [ ] Audit log (login başarılı/başarısız)

---

## 8. Geliştirme Fazları

### Faz 1: Proje Kurulumu ✅ TAMAMLANDI
- [x] Git repository
- [x] Backend projesi (NestJS)
- [x] Frontend projesi (React + Vite)
- [x] Docker Compose development setup
- [x] PostgreSQL + Redis containers
- [ ] CI/CD pipeline (basit)

### Faz 2: Authentication ✅ TAMAMLANDI
- [x] LDAP service (ldapjs)
- [x] JWT authentication
- [x] Login/Logout endpoints
- [x] Auth guard (protected routes)
- [x] User sync from AD
- [x] Login sayfası UI

### Faz 3: Temel UI ✅ TAMAMLANDI
- [x] Layout (header, sidebar, main)
- [x] Routing setup
- [x] Auth context/store (Zustand)
- [x] API client (axios)
- [x] Loading/Error states
- [x] SharePoint/Microsoft 365 tarzı UI tasarımı

### Faz 4: Duyuru Modülü ✅ TAMAMLANDI
- [x] Duyuru CRUD API
- [x] Duyuru listesi sayfası (filtreleme + arama)
- [x] Duyuru detay sayfası
- [x] Dashboard'da son duyurular widget'ı
- [x] Admin: Duyuru yönetim sayfası (ekleme/düzenleme/silme)
- [ ] Okundu işaretleme (opsiyonel)

### Faz 4.5: SSO Entegrasyonu ✅ TAMAMLANDI
- [x] RMS (Requirements Management System) SSO entegrasyonu
- [x] JWT tabanlı SSO token üretimi
- [x] Uygulama launcher'dan SSO ile yönlendirme
- [x] Yapılandırma (RMS_URL, RMS_SSO_SECRET_KEY)

### Faz 5: Dosya Sunucusu & Döküman Düzenleme ✅ TAMAMLANDI
- [x] Windows File Server (SMB) entegrasyonu
- [x] Dosya browse/upload/download/delete API
- [x] ONLYOFFICE Document Server entegrasyonu
- [x] Döküman görüntüleme (PDF, Word, Excel, PowerPoint)
- [x] Döküman düzenleme (.docx, .xlsx, .pptx, .txt, .csv)
- [x] Görüntüleme/Düzenleme mod geçişi
- [x] Otomatik kaydetme (forcesave) desteği
- [x] JWT tabanlı güvenlik
- [x] Docker internal network callback iletişimi
- [x] Collaborative editing (çoklu kullanıcı düzenleme)
- [x] Aktif kullanıcı takibi ve gösterimi

### Faz 5b: Döküman Modülü (MinIO) 🔄 SIRADA
- [ ] MinIO dosya upload API
- [ ] Kategori yönetimi
- [ ] Döküman listesi (tree view)
- [ ] Admin: Döküman yükleme

### Faz 6: Uygulama Launcher
- [ ] Uygulama CRUD API
- [ ] Uygulama grid/liste
- [ ] Favori yönetimi
- [ ] Son kullanılan tracking
- [ ] Admin: Uygulama yönetimi

### Faz 7: Dashboard & Polish
- [ ] Dashboard sayfası
- [ ] Widget'lar (son duyurular, dökümanlar)
- [ ] Profil sayfası
- [ ] Bildirimler (badge)
- [ ] Responsive design
- [ ] Performance optimizasyonu

### Faz 8: Deployment
- [ ] Production Docker images
- [ ] SSL sertifikası
- [ ] Nginx production config
- [ ] Environment variables
- [ ] Backup scripti
- [ ] Monitoring (basit healthcheck)

### Faz 9 (Opsiyonel): Kerberos SSO
- [ ] Apache mod_auth_kerb setup
- [ ] Keytab oluşturma
- [ ] SPNEGO configuration
- [ ] Fallback to form login
- [ ] Browser ayarları (GPO)

---

## 9. Öğrenme Kaynakları

### Node.js & TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)

### NestJS
- [NestJS Official Docs](https://docs.nestjs.com/)
- [NestJS Crash Course (YouTube)](https://www.youtube.com/watch?v=GHTA143_b-s)

### React
- [React Official Docs](https://react.dev/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

### Docker
- [Docker Compose Tutorial](https://docs.docker.com/compose/gettingstarted/)

### LDAP Authentication
- [passport-ldapauth](https://github.com/vesse/passport-ldapauth)
- [NestJS + LDAP örneği](https://github.com/nestjs/passport)

---

## 10. Mevcut Durum

### Tamamlanan
- ✅ Proje altyapısı (Backend + Frontend + Docker)
- ✅ Active Directory entegrasyonu (LDAP)
- ✅ JWT authentication
- ✅ Temel UI (Login, Dashboard, Layout)
- ✅ Duyuru modülü (API + UI + Admin)
- ✅ SSO entegrasyonu (RMS sistemi)
- ✅ SharePoint/Microsoft 365 tarzı UI tasarımı
- ✅ Windows File Server (SMB) entegrasyonu
- ✅ ONLYOFFICE döküman görüntüleme ve düzenleme

### UI Tasarımı
- SharePoint Online benzeri arayüz
- Microsoft mavi tema (#0078d4)
- Waffle menü (uygulama başlatıcı)
- Sol navigasyon paneli
- Command bar ve breadcrumb
- Temiz, düz (flat) tasarım

### AD Yapılandırması
```
Sunucu: 192.168.88.200:389
Domain: mss.local
Base DN: DC=mss,DC=local
Service Account: CN=portalservice,OU=MSSUsers,DC=mss,DC=local
```

### SSO Yapılandırması
```
RMS_URL=http://localhost:8080
RMS_SSO_SECRET_KEY=wn2ma6gV4GudPcZ6hWP27IX5spSal1KZCHEBl2IJuu8
```

### Sonraki Adımlar
1. ~~**Duyuru modülü** - CRUD API + UI~~ ✅
2. ~~**SSO entegrasyonu** - RMS sistemi~~ ✅
3. ~~**UI iyileştirmesi** - SharePoint tarzı~~ ✅
4. ~~**Dosya Sunucusu** - SMB entegrasyonu~~ ✅
5. ~~**Döküman düzenleme** - ONLYOFFICE entegrasyonu~~ ✅
6. **Döküman modülü** - Upload/Download + UI (MinIO)
7. **Uygulama launcher** - CRUD + Favoriler
8. **Admin paneli** - Diğer modüller için yönetim arayüzü

---

*Son Güncelleme: 2026-02-03*

---

*Doküman Versiyonu: 5.0*
*Son Güncelleme: 2026-02-03*
*Değişiklik: ONLYOFFICE döküman düzenleme ve SMB entegrasyonu tamamlandı*
