# Portal Test Environment

Development ve test için Docker container'ları.

> **ÖNEMLİ:** Uygulama bu container'lar içinde test edilir.
> Kod değişikliklerinin yansıması için ilgili container'ın rebuild edilmesi gerekir.

## Servisler

| Servis | Container Adı | Port (Dış:İç) | Açıklama |
|--------|---------------|---------------|----------|
| PostgreSQL | portal-test-db | 5434:5432 | Ana veritabanı |
| Redis | portal-test-redis | 6380:6379 | Cache & Session |
| MinIO API | portal-test-minio | 9002:9000 | Object Storage |
| MinIO Console | portal-test-minio | 9003:9001 | MinIO Yönetim UI |
| Backend API | portal-test-api | 3001:3000 | NestJS API |
| Frontend | portal-test-frontend | 5173:5173 | React/Vite |
| Nginx | portal-test-nginx | 80:80 | Reverse Proxy |
| ONLYOFFICE | portal-test-onlyoffice | 8088:80 | Document Editor |

## Hızlı Başlangıç

```bash
cd testenv
docker-compose up -d
```

Tarayıcıda aç: http://localhost:5173 veya http://localhost (nginx)

## Kullanım

### Container'ları Başlat
```bash
docker-compose up -d
```

### Container Durumunu Kontrol Et
```bash
docker-compose ps
```

### Logları İzle
```bash
# Tüm loglar
docker-compose logs -f

# Sadece belirli servis
docker-compose logs -f portal-test-api
docker-compose logs -f portal-test-frontend
```

### Container'ları Durdur
```bash
docker-compose down
```

### Verileri Sil ve Sıfırdan Başla
```bash
docker-compose down -v
docker-compose up -d
```

## Kod Değişikliklerini Test Etme

### Backend Değişikliği Yaptıktan Sonra
```bash
docker-compose up -d --build portal-test-api
docker-compose logs -f portal-test-api
```

### Frontend Değişikliği Yaptıktan Sonra
```bash
docker-compose up -d --build portal-test-frontend
```

### Tüm Servisleri Rebuild Et
```bash
docker-compose up -d --build
```

### Cache Olmadan Rebuild (Temiz Build)
```bash
# Tek servis
docker-compose build --no-cache portal-test-api
docker-compose up -d portal-test-api

# Tüm servisler
docker-compose build --no-cache
docker-compose up -d
```

> **Not:** Hot reload YOKTUR. Her kod değişikliğinde `--build` flag'i ile rebuild gerekir.
> Bağımlılık değişikliklerinde (package.json, pnpm-lock.yaml) `--no-cache` kullanın.

## Monorepo Yapısı (pnpm)

Docker container'ları pnpm workspace yapısını kullanır:

```
portal/
├── packages/
│   ├── core/              # @portal/core - Shared types & entities
│   └── modules/
│       ├── announcements/ # @portal/announcements
│       ├── file-server/   # @portal/file-server
│       └── users/         # @portal/users
├── backend/               # NestJS API
└── frontend/              # React SPA
```

### Paket Değişikliklerinden Sonra

```bash
# @portal/core değişikliği sonrası
cd packages/core && pnpm build
cd testenv && docker-compose up -d --build portal-test-api portal-test-frontend
```

## Bağlantı Bilgileri

### PostgreSQL
- **Host:** localhost
- **Port:** 5434
- **Database:** portal
- **User:** portal
- **Password:** portal123
- **Connection String:** `postgresql://portal:portal123@localhost:5434/portal`

### Redis
- **Host:** localhost
- **Port:** 6380

### MinIO
- **Endpoint:** http://localhost:9002
- **Console:** http://localhost:9003
- **Access Key:** minioadmin
- **Secret Key:** minioadmin123

### API
- **URL:** http://localhost:3001/api

### Frontend
- **URL:** http://localhost:5173

## Test Kullanıcıları

| Username | Şifre | Rol | Açıklama |
|----------|-------|-----|----------|
| admin | Ankara12!mss | Admin | Local admin (LDAP bypass) |
| [AD kullanıcıları] | [AD şifresi] | User/Admin | Active Directory'den doğrulanır |

## Troubleshooting

### Port Çakışması
Eğer portlar kullanılıyorsa, `docker-compose.yml` dosyasında veya `.env` dosyasında portları değiştirin.

### Backend Başlamıyor
```bash
# Logları kontrol et
docker-compose logs portal-test-api

# DB ve Redis'in hazır olduğundan emin ol
docker-compose ps
```

### Veritabanı Bağlantı Hatası
```bash
# DB container'ın çalıştığını kontrol et
docker-compose ps portal-test-db

# DB loglarını kontrol et
docker-compose logs portal-test-db
```

### LDAP Bağlantı Hatası
- `.env` dosyasında LDAP ayarlarını kontrol et
- LDAP sunucusunun container'dan erişilebilir olduğundan emin ol

### Volume Temizliği
```bash
# Named volumes'ları listele
docker volume ls | grep portal-test

# Tüm portal-test volume'larını sil
docker-compose down -v
```

## Environment Variables

`.env` dosyasında tanımlanan değişkenler `docker-compose.yml` tarafından kullanılır.
Detaylar için ana `CLAUDE.md` dosyasına bakın.
