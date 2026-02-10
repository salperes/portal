# MSS Portal Production Deploy Kilavuzu

Bu dokuman, MSS Portal uygulamasini production sunucuya (192.168.88.111 / portal.mss.local) ilk kez deploy etmek ve sonraki surumleri canli veriyi bozmadan guncellemek icin adim adim runbook'tur.

Bu repo icinde production icin yeni bir klasor kullanilir:
- `prodenv/` (production)
- `testenv/` (test/dev, production'da kullanilmayacak)

## 1) Production Sunucudaki Mevcut Container/Portlar

Sunucuda calisan compose projeleri:
- `rms` (3 container)
- `taskmgmt` (1 container)

Disariya acik portlar:
- `0.0.0.0:8080->80/tcp` (rms-client)
- `0.0.0.0:5000->5000/tcp` (taskmgmt-timesheet)

Bu nedenle MSS Portal icin 8080 ve 5000 kullanilmayacak.

## 2) Port Plani (Portal)

Hedef: uygulamaya `http://portal.mss.local/` ile (port 80) erismek.

Once port 80'in bos oldugunu kontrol edin:

```bash
sudo ss -ltnp | grep ':80 '
```

Onerilen host portlari:
- Portal HTTP: `80` (portal-nginx)
- OnlyOffice: `18088` (portal-onlyoffice)

DB/Redis/MinIO host portlarina varsayilan olarak publish edilmez (hem guvenlik hem cakisma riskini azaltir).

## 3) Ilk Kurulum (Production)

### 3.1 Sunucuda Dizin

Ornek dizin:
- `/opt/mss/portal` (repo)
- `/opt/mss/portal/prodenv` (compose burada)

### 3.2 Env Dosyasi

Sunucuda `prodenv/.env.prod` olusturun:

```bash
cd /opt/mss/portal/prodenv
cp .env.prod.example .env.prod
nano .env.prod
```

Degistirilmesi gereken kritik alanlar:
- `DB_PASSWORD`
- `JWT_SECRET`
- `LDAP_BIND_PASSWORD`
- `FILE_SERVER_ENCRYPTION_KEY`
- `ONLYOFFICE_JWT_SECRET`
- `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`
- `RMS_SSO_SECRET_KEY`

Not: Bu sunucuda `sudo -n` aktif degil (sudo parola istiyor). Komutlari `sudo` ile calistiracaksiniz.

### 3.3 Build + Up

```bash
cd /opt/mss/portal/prodenv
sudo docker compose --env-file ./.env.prod up -d --build
```

## 4) Smoke Test

```bash
curl -i http://localhost/health
```

Portal:
- `http://portal.mss.local/`

OnlyOffice:
- `http://portal.mss.local:18088/healthcheck`

Log:

```bash
cd /opt/mss/portal/prodenv
sudo docker compose --env-file ./.env.prod logs -f --tail=200
```

## 5) Yeni Versiyon Deploy (Canli Veriyi Bozmadan)

Altin kurallar:
- `docker compose down -v` KULLANMAYIN (volume'lari siler).
- `docker system prune -f` dikkatli (baska projeleri etkileyebilir).

Standart guncelleme:

```bash
cd /opt/mss/portal
sudo git fetch --all --prune
sudo git checkout main
sudo git pull

cd prodenv
sudo docker compose --env-file ./.env.prod build portal-api portal-frontend
sudo docker compose --env-file ./.env.prod up -d portal-api portal-frontend portal-nginx

curl -i http://localhost/health
```

## 5.1) Eger Port 80 Doluysa (Kirmadan Entegrasyon)

Port 80/443 baska bir servis tarafindan kullaniliyorsa `PORTAL_HTTP_PORT=18080` yapin ve mevcut reverse proxy'de `portal.mss.local` icin `127.0.0.1:18080`'e yonlendirin.

Ornek (host Nginx):

```nginx
server {
  listen 80;
  server_name portal.mss.local;
  location / {
    proxy_pass http://127.0.0.1:18080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Rollback (basit):
- `git checkout <onceki_sha>`
- ayni `build` + `up -d` adimlarini tekrarla

## 6) DB Schema Notu (TypeORM)

Backend kodunda `synchronize` sadece `NODE_ENV=development` iken true.
Production'da `NODE_ENV=production` ile tablolar otomatik olusmayabilir.

Ilk kurulumda bos DB icin iki yol:
1) Kisa sureligine `.env.prod` icinde `NODE_ENV=development` ile ilk boot (schema olussun), sonra `NODE_ENV=production` geri al.
2) Orta vadede: TypeORM migrations ekleyip production deploy'a migration adimi koy.

Son guncelleme: 2026-02-09
