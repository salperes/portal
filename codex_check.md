# Kod Inceleme Bulgulari (testenv)

Kapsam: Bu klasorde uygulama kaynak kodu yok. Bulgular `docker-compose*.yml`, `Dockerfile.*`, `nginx*.conf`, `init-db/*.sql`, `start.*`, `README.md` uzerinden cikarilmistir.

## Kritik

- Varsayilan secret/sifre fallback'lari prod icin riskli:
  - `docker-compose.yml:16` `DB_PASSWORD` fallback (`portal123`)
  - `docker-compose.yml:90` `JWT_SECRET` fallback
  - `docker-compose.yml:97` `LDAP_BIND_PASSWORD` fallback
  - `docker-compose.yml:102` `MINIO_SECRET_KEY` fallback
  - `docker-compose.yml:106` `RMS_SSO_SECRET_KEY` fallback
  - `docker-compose.yml:110` `FILE_SERVER_ENCRYPTION_KEY` fallback
  - `docker-compose.yml:114` `ONLYOFFICE_JWT_SECRET` fallback
  - `README.md:121` ve devaminda default credential'lar dokumante edilmis.

- "latest" image tag kullanimi (reproducibility + supply-chain riski):
  - `docker-compose.yml:51` `minio/minio:latest`
  - `docker-compose.yml:160` `onlyoffice/documentserver:latest`

- Nginx prod config parse riski (nested `location`):
  - `nginx.prod.conf:52` icinde `location / { ... location ~* ... }` yapisi var; Nginx'te `location` bloklari bu sekilde ic ice kullanilmaz.

- Prod frontend build arg/port override eksikligi:
  - `Dockerfile.frontend.prod:14` `ARG VITE_API_URL` var; `docker-compose.prod.yml` bu build arg'i saglamiyor.
  - `docker-compose.yml:135` frontend port mapping `5173:5173`; prod'da container portu `80` (bkz. `Dockerfile.frontend.prod:20`), override yok.

- Prod Dockerfile'lar monorepo/pnpm ile uyumsuz olma riski:
  - Dev Dockerfile'lar workspace/pnpm kurgusunu kullaniyor (`Dockerfile.backend:13`, `Dockerfile.frontend:10`).
  - Prod Dockerfile'lar sadece `backend/` veya `frontend/` icinde `npm ci` yapiyor (`Dockerfile.backend.prod:7`, `Dockerfile.frontend.prod:7`) ve `packages/*` kopyalamiyor.

## Orta Seviye

- MinIO healthcheck `curl` varsayimina bagli:
  - `docker-compose.yml:62` `curl` ile healthcheck var; imajda `curl` yoksa servis unhealthy kalabilir.

- `init-db/*.sql` dosyalari DB container'ina baglanmamis:
  - `init-db/01-schema.sql`, `init-db/02-seed-data.sql` mevcut; `docker-compose.yml` icinde `portal-test-db` icin `docker-entrypoint-initdb.d` mount yok.

- `depends_on: condition: service_healthy` uyumluluk riski:
  - `docker-compose.yml:117` `condition: service_healthy` her compose surumunde ayni sekilde desteklenmeyebilir/ignore edilebilir.

## Dusuk Seviye / Tutarlilik

- `start.sh` MinIO console portunu yanlis yaziyor:
  - Compose default'u `docker-compose.yml:61` ile `9003`, ama `start.sh:29` `http://localhost:9001` diyor.

- `container_name` kullanimi coklu stack calistirmayi zorlastirir (isim cakismasi):
  - Ornek: `docker-compose.yml:13`, `docker-compose.yml:34`, `docker-compose.yml:52` vb.

