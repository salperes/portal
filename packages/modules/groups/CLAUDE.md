# Groups Module

## Modül Hakkında
Departman ve disiplin gruplarını yönetir. Hiyerarşik grup yapısı, üye yönetimi ve rol atamaları.

## Dosya Yapısı
```
packages/modules/groups/
├── src/
│   ├── index.ts                    # Type re-exports + frontend exports
│   └── frontend/
│       ├── index.ts                # Frontend exports
│       ├── pages/
│       │   ├── index.ts
│       │   └── GroupsAdmin.tsx     # Admin grup yönetimi sayfası
│       └── services/
│           └── groupsApi.ts        # API client
├── package.json
└── CLAUDE.md
```

Backend kodu: `backend/src/groups/`

## API Endpoints
| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| GET | `/api/groups` | JWT | Tüm grupları listele (ağaç yapısı) |
| GET | `/api/groups/:id` | JWT | Grup detayı + üyeler |
| POST | `/api/groups` | Admin | Yeni grup oluştur |
| PATCH | `/api/groups/:id` | Admin | Grup güncelle |
| DELETE | `/api/groups/:id` | Admin | Grup sil |
| POST | `/api/groups/:id/members` | Admin | Gruba üye ekle |
| PATCH | `/api/groups/:id/members/:userId` | Admin | Üye rolünü değiştir |
| DELETE | `/api/groups/:id/members/:userId` | Admin | Üyeyi çıkar |

## Veritabanı Şeması
- **groups**: id, name (unique), description, parent_id (self-ref), is_active
- **user_groups**: id, user_id, group_id, role (member/lead/manager), joined_at

## Bağımlılıklar
- @portal/core (types, entities)

## Önemli Notlar
- Gruplar hiyerarşik yapıdadır (parent_id ile)
- Her kullanıcı birden fazla grupta olabilir
- Bir kullanıcı her grupta farklı role sahip olabilir (member, lead, manager)
- Grup silme: önce üyeleri kontrol et
