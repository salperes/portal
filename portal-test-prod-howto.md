# Portal - Development'tan Container'a Geçiş Kılavuzu

## Genel Bakış

Bu doküman, yerel geliştirme ortamındaki değişikliklerin Docker container'larına nasıl aktarılacağını açıklar.

---

## 1. Geliştirme Ortamı (Local)

### Dosya Konumları
```
portal/
├── backend/          # NestJS API
├── frontend/         # React SPA
└── testenv/          # Docker yapılandırmaları
```

### Local Çalıştırma (Docker'sız)
```bash
# Terminal 1 - Backend
cd backend
npm run start:dev
# API: http://localhost:3000/api

# Terminal 2 - Frontend
cd frontend
npm run dev
# UI: http://localhost:5173
```

---

## 2. Test Container Ortamı (portal-test-*)

### Container Listesi
| Container | Port | Açıklama |
|-----------|------|----------|
| portal-test-frontend | 5173 | React SPA (Vite dev server) |
| portal-test-api | 3001 | NestJS API |
| portal-test-db | 5434 | PostgreSQL |
| portal-test-redis | 6380 | Redis |
| portal-test-minio | 9002/9003 | MinIO |
| portal-test-nginx | 80 | Reverse Proxy |
| portal-test-onlyoffice | 8088 | ONLYOFFICE Document Server |

### Container'ları Başlatma
```bash
cd testenv
docker-compose up -d
```

### Container'ları Durdurma
```bash
cd testenv
docker-compose down
```

---

## 3. Kod Değişikliklerini Container'a Aktarma

### ⚠️ ÖNEMLİ: Volume Mount Yok!
Frontend ve backend container'larında kaynak kod volume olarak mount EDİLMEMİŞ. Kod, build sırasında container'a kopyalanıyor. Bu nedenle:

- **Yerel dosya değişiklikleri otomatik olarak container'a YANSIMAZ**
- Her kod değişikliğinde container'ı yeniden BUILD etmeniz gerekir

### Frontend Değişikliklerini Aktarma
```bash
cd testenv

# Sadece frontend'i rebuild et
docker-compose build --no-cache portal-test-frontend
docker-compose up -d portal-test-frontend

# Veya tek satırda
docker-compose up -d --build portal-test-frontend
```

### Backend Değişikliklerini Aktarma
```bash
cd testenv

# Sadece backend'i rebuild et
docker-compose build --no-cache portal-test-api
docker-compose up -d portal-test-api

# Veya tek satırda
docker-compose up -d --build portal-test-api
```

### Tüm Servisleri Rebuild Etme
```bash
cd testenv
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 4. Container İçeriğini Doğrulama

### Dosya İçeriğini Kontrol Etme
```bash
# Frontend dosyası kontrol
docker exec portal-test-frontend cat src/pages/FileServer.tsx | head -20

# Backend dosyası kontrol
docker exec portal-test-api cat dist/file-server/smb.service.js | head -20
```

### Container Loglarını İzleme
```bash
# Tüm loglar
docker-compose logs -f

# Sadece frontend
docker-compose logs -f portal-test-frontend

# Sadece backend
docker-compose logs -f portal-test-api

# Son 50 satır
docker-compose logs --tail=50 portal-test-api
```

### Container Durumunu Kontrol Etme
```bash
docker-compose ps
```

---

## 5. Sorun Giderme

### Değişiklikler Yansımıyorsa

1. **Container'ı yeniden başlat** (build yoksa işe yaramaz):
   ```bash
   docker-compose restart portal-test-frontend
   ```

2. **Container'ı rebuild et** (doğru yöntem):
   ```bash
   docker-compose build --no-cache portal-test-frontend
   docker-compose up -d portal-test-frontend
   ```

3. **Docker cache'i temizle** (son çare):
   ```bash
   docker-compose down
   docker system prune -f
   docker-compose build --no-cache
   docker-compose up -d
   ```

### OneDrive Senkronizasyon Sorunları
OneDrive klasöründe çalışırken dosya değişiklikleri gecikebilir:
- Dosyayı kaydetmeden önce OneDrive senkronizasyonunun tamamlandığından emin olun
- `docker-compose build` çalıştırmadan önce birkaç saniye bekleyin

### Port Çakışması
```bash
# Hangi process portu kullanıyor?
netstat -ano | findstr :5173

# Container'ları durdur ve portları serbest bırak
docker-compose down
```

---

## 6. Hızlı Referans Komutları

```bash
# Durum kontrolü
docker-compose ps

# Tüm loglar
docker-compose logs -f

# Frontend rebuild + start
docker-compose up -d --build portal-test-frontend

# Backend rebuild + start
docker-compose up -d --build portal-test-api

# Her şeyi sıfırdan başlat
docker-compose down && docker-compose build --no-cache && docker-compose up -d

# Container'a shell bağlantısı
docker exec -it portal-test-frontend sh
docker exec -it portal-test-api sh
```

---

## 7. Ortam Değişkenleri (Environment Variables)

Yapılandırma değişiklikleri için `testenv/.env` dosyasını düzenleyin. Değişiklikler sonrası backend container'ını yeniden başlatın:

```bash
docker-compose up -d portal-test-api
```

### Önemli Değişkenler

| Değişken | Açıklama | Örnek |
|----------|----------|-------|
| `FILE_SERVER_HOST` | SMB sunucu IP adresi | `192.168.88.113` |
| `FILE_SERVER_DOMAIN` | AD domain adı | `MSS` |
| `FILE_SERVER_SHARES` | Paylaşım listesi (virgülle ayrılmış) | `IT,HR,Finans,Public` |
| `LDAP_URL` | AD sunucu adresi | `ldap://192.168.88.200:389` |
| `JWT_SECRET` | JWT şifreleme anahtarı | `güçlü-rastgele-key` |
| `ONLYOFFICE_PORT` | ONLYOFFICE port | `8088` |
| `ONLYOFFICE_JWT_SECRET` | ONLYOFFICE JWT anahtarı | `güçlü-secret-key` |

### File Server Paylaşımları

Yeni paylaşım eklemek için:
1. `testenv/.env` dosyasında `FILE_SERVER_SHARES` satırını düzenleyin
2. Backend'i yeniden başlatın: `docker-compose up -d portal-test-api`

### ONLYOFFICE Yapılandırması

ONLYOFFICE döküman düzenleyici için:
1. `ONLYOFFICE_PORT` - Dış port (varsayılan: 8088)
2. `ONLYOFFICE_JWT_SECRET` - Güvenlik için JWT anahtarı

---

## 8. ONLYOFFICE Döküman Düzenleyici

### Erişim Adresleri
| Servis | URL |
|--------|-----|
| ONLYOFFICE Server | http://localhost:8088 |
| Health Check | http://localhost:8088/healthcheck |

### Desteklenen Dosya Formatları

| Tür | Görüntüleme | Düzenleme |
|-----|-------------|-----------|
| Word | .doc, .docx, .odt, .rtf, .txt | .docx, .txt |
| Excel | .xls, .xlsx, .ods, .csv | .xlsx, .csv |
| PowerPoint | .ppt, .pptx, .odp | .pptx |
| PDF | .pdf | - |

### ONLYOFFICE Container Başlatma

ONLYOFFICE ilk başlatmada biraz zaman alabilir (1-2 dakika):

```bash
# Sadece ONLYOFFICE başlat
docker-compose up -d portal-test-onlyoffice

# Logları izle
docker-compose logs -f portal-test-onlyoffice

# Hazır olduğunu kontrol et
curl http://localhost:8088/healthcheck
```

### Kullanım

1. Dosya Sunucusu sayfasına gidin
2. Desteklenen formattaki dosyalarda göz ikonu (👁) görünür
3. İkona tıklayın veya dosyaya çift tıklayın
4. Döküman görüntüleyicide açılır
5. Düzenlenebilir formatlarda "Görüntüle/Düzenle" modları arasında geçiş yapabilirsiniz

### Sorun Giderme

**ONLYOFFICE açılmıyorsa:**
```bash
# Container durumunu kontrol et
docker-compose ps portal-test-onlyoffice

# Logları kontrol et
docker-compose logs portal-test-onlyoffice

# Yeniden başlat
docker-compose restart portal-test-onlyoffice
```

**"ONLYOFFICE API yüklenemedi" hatası:**
- ONLYOFFICE container'ının tamamen başladığından emin olun
- Frontend'in ONLYOFFICE URL'sine erişebildiğini kontrol edin
- `VITE_ONLYOFFICE_URL` environment variable'ını kontrol edin

---

## 9. Production Deployment

> **NOT:** Production sunucu detayları eklenecek.

### OpenSSL Legacy Provider
Node.js 20+ ile SMB/NTLM uyumluluğu için Dockerfile'da `NODE_OPTIONS=--openssl-legacy-provider` kullanılmaktadır.

### Production Dockerfile'lar
- `testenv/Dockerfile.backend.prod` - Multi-stage build, optimized
- `testenv/Dockerfile.frontend.prod` - Nginx ile static serve

### Production Compose
- `testenv/docker-compose.prod.yml`

### Production Ortam Değişkenleri
```env
# Değiştirilmesi gereken değerler:
NODE_ENV=production
JWT_SECRET=<güçlü-secret>
LDAP_BIND_PASSWORD=<gerçek-şifre>
FILE_SERVER_ENCRYPTION_KEY=<güçlü-key>
ONLYOFFICE_JWT_SECRET=<güçlü-secret>
```

---

## 10. Erişim URL'leri Özeti

| Servis | URL | Açıklama |
|--------|-----|----------|
| Frontend (Vite) | http://localhost:5173 | React SPA |
| Frontend (Nginx) | http://localhost | Production-like |
| Backend API | http://localhost:3001/api | NestJS API |
| Swagger Docs | http://localhost:3001/api/docs | API Dokümantasyonu |
| MinIO Console | http://localhost:9003 | Dosya depolama yönetimi |
| ONLYOFFICE | http://localhost:8088 | Döküman düzenleyici |

---

*Son Güncelleme: 2026-02-02*
