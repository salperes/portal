# Production Deployment - MSS Portal

## Sunucu Bilgileri

| Bilgi | Deger |
|-------|-------|
| IP | 192.168.88.111 |
| DNS | portal.mss.local |
| Kullanici | mssadmin |
| SSH | Key-based (sifresiz) |
| Docker | sudo gereksiz (mssadmin docker grubunda) |
| Portal port | 80 |
| ONLYOFFICE port | 18088 |

## Konteynerler

| Konteyner | Aciklama |
|-----------|----------|
| portal-db | PostgreSQL 15 (internal) |
| portal-redis | Redis 7 (internal) |
| portal-minio | MinIO - dosya deposu (internal) |
| portal-onlyoffice | ONLYOFFICE Document Server (:18088) |
| portal-api | NestJS Backend (internal) |
| portal-frontend | Nginx + React SPA (internal) |
| portal-nginx | Reverse proxy - giris noktasi (:80) |

**DIKKAT:** Sunucuda `rms-*` ve `taskmgmt-*` konteynerleri de calisir. Bunlara DOKUNMA!

---

## Rutin Deploy (Kod Guncelleme)

Sadece kod degisikliklerini production'a yansitmak icin:

### 1. Lokal: Arsiv olustur

```bash
cd portal/
tar czf /tmp/portal_deploy.tgz \
  --exclude=node_modules --exclude=.git --exclude='*.tgz' \
  --exclude=testenv --exclude=temp --exclude='portal.bak*' \
  package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json \
  backend/ frontend/ packages/ prodenv/ CLAUDE.md
```

### 2. Sunucuya gonder

```bash
scp /tmp/portal_deploy.tgz mssadmin@192.168.88.111:~/portal_deploy.tgz
```

### 3. Sunucuda: Kodu guncelle (.env.prod korunur)

```bash
ssh mssadmin@192.168.88.111

# .env.prod yedekle
cp ~/portal/prodenv/.env.prod /tmp/env.prod.backup

# Eski kodu yedekle ve yeniyi ac
mv ~/portal ~/portal.bak.$(date +%Y%m%d%H%M%S)
mkdir ~/portal && cd ~/portal
tar xzf ~/portal_deploy.tgz

# .env.prod geri yukle
cp /tmp/env.prod.backup ~/portal/prodenv/.env.prod
```

### 4. Sadece degisen servisleri rebuild et

```bash
cd ~/portal/prodenv

# Sadece backend degistiyse:
docker compose --env-file .env.prod build --no-cache portal-api
docker compose --env-file .env.prod up -d portal-api

# Sadece frontend degistiyse:
docker compose --env-file .env.prod build --no-cache portal-frontend
docker compose --env-file .env.prod up -d portal-frontend

# Ikisi de degistiyse:
docker compose --env-file .env.prod build --no-cache portal-api portal-frontend
docker compose --env-file .env.prod up -d portal-api portal-frontend

# nginx config degistiyse:
docker compose --env-file .env.prod up -d portal-nginx
```

### 5. Dogrula

```bash
curl http://localhost/health          # "healthy"
curl -s -o /dev/null -w '%{http_code}' http://localhost/api/auth/me  # 401
docker ps --filter name=portal-      # 7 konteyner calisir
docker ps --filter name=rms          # rms ayakta mi kontrol
docker ps --filter name=taskmgmt     # taskmgmt ayakta mi kontrol
```

---

## Tam Rebuild (Tum Servisleri Yeniden Olustur)

Database ve diger volume'lara dokunmadan tum imajlari yeniden olusturur:

```bash
cd ~/portal/prodenv
docker compose --env-file .env.prod build --no-cache
docker compose --env-file .env.prod up -d
```

---

## Database Sifirlama (DIKKAT!)

**Bu islem tum portal verisini siler!** Sadece gerektiginde yapin.

```bash
cd ~/portal/prodenv

# 1. Portal konteynerlerini durdur (rms/taskmgmt etkilenmez)
docker compose --env-file .env.prod down -v

# 2. Gecici olarak development mode (tablolari yeniden olusturur)
sed -i 's/NODE_ENV=production/NODE_ENV=development/' .env.prod

# 3. Rebuild + baslat
docker compose --env-file .env.prod build --no-cache
docker compose --env-file .env.prod up -d

# 4. API loglarinda "Nest application successfully started" bekle
docker compose --env-file .env.prod logs -f portal-api

# 5. Production mode'a geri don
sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env.prod
docker compose --env-file .env.prod up -d portal-api
```

---

## Log Kontrol

```bash
cd ~/portal/prodenv

# API loglari
docker compose --env-file .env.prod logs --tail 50 portal-api

# Nginx loglari
docker compose --env-file .env.prod logs --tail 50 portal-nginx

# Tum portal loglari
docker compose --env-file .env.prod logs --tail 20

# Canli log takibi
docker compose --env-file .env.prod logs -f portal-api
```

---

## Sorun Giderme

| Sorun | Cozum |
|-------|-------|
| Login basarisiz | `docker compose logs portal-api \| grep -i ldap` |
| 502 Bad Gateway | `docker compose up -d portal-api` (API down olabilir) |
| Dosya yuklenmiyor | nginx `client_max_body_size` kontrol (simdi 100M) |
| ONLYOFFICE acilamiyor | `curl http://localhost:18088/healthcheck` |
| Sayfa yuklenmiyor | `docker compose up -d portal-frontend portal-nginx` |
| DB baglanti hatasi | `docker compose up -d portal-db` + bekle (healthy) |

## Dosya Konumlari

| Dosya | Konum |
|-------|-------|
| Proje kodu | `~/portal/` |
| Environment | `~/portal/prodenv/.env.prod` |
| Docker Compose | `~/portal/prodenv/docker-compose.yml` |
| Nginx config | `~/portal/prodenv/nginx.portal.conf` |
| DB volume | `portal_portal-db-data` (Docker volume) |
| MinIO volume | `portal_portal-minio-data` (Docker volume) |
