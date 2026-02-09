# MSS Portal Production Environment (prodenv)

Bu klasor production deploy icin ayridir. `testenv/` dosyalarina dokunmadan production'a yonelik compose/Dockerfile/nginx config buradan yonetilir.

## Sunucu Durumu (192.168.88.111)

Cakismamasi gereken host portlari:
- `8080` (rms-client)
- `5000` (taskmgmt-timesheet)

Bu nedenle portal icin varsayilan olarak su portlari kullanin:
- `PORTAL_HTTP_PORT=80` (eger sunucuda 80 bossa)
- 80 doluysa: `PORTAL_HTTP_PORT=18080` ve mevcut reverse proxy uzerinden 18080'e route edin
- `PORTAL_ONLYOFFICE_PORT=18088`

## Hizli Baslatma

1) `prodenv/.env.prod` olusturun (ornek: `.env.prod.example`)
2) Production stack'i kaldirin:

```bash
cd /opt/mss/portal/prodenv
sudo docker compose --env-file ./.env.prod up -d --build
```

Log:

```bash
sudo docker compose --env-file ./.env.prod logs -f --tail=200
```

Health:

```bash
curl -i http://localhost/health
```
