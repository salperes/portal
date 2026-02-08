# Projects Module

## Modül Hakkında
Proje tanımlama, üye atama ve proje durumu yönetimi.

## Dosya Yapısı
```
packages/modules/projects/
├── src/
│   ├── index.ts                     # Type re-exports + frontend exports
│   └── frontend/
│       ├── index.ts                 # Frontend exports
│       ├── pages/
│       │   ├── index.ts
│       │   └── ProjectsAdmin.tsx    # Admin proje yönetimi sayfası
│       └── services/
│           └── projectsApi.ts       # API client
├── package.json
└── CLAUDE.md
```

Backend kodu: `backend/src/projects/`

## API Endpoints
| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| GET | `/api/projects` | JWT | Projeleri listele (filtreleme + sayfalama) |
| GET | `/api/projects/:id` | JWT | Proje detayı + atamalar |
| POST | `/api/projects` | Admin | Yeni proje oluştur |
| PATCH | `/api/projects/:id` | Admin | Proje güncelle |
| DELETE | `/api/projects/:id` | Admin | Proje sil/arşivle |
| GET | `/api/projects/:id/members` | JWT | Proje üyelerini listele |
| POST | `/api/projects/:id/assignments` | Admin | Projeye üye ata |
| PATCH | `/api/projects/:id/assignments/:userId` | Admin | Atamayı güncelle |
| DELETE | `/api/projects/:id/assignments/:userId` | Admin | Atamayı kaldır |

## Veritabanı Şeması
- **projects**: id, code (unique), name, description, status (draft/active/archived), owner_id, start_date, end_date
- **project_assignments**: id, project_id, user_id, group_id (nullable), project_role (viewer/member/lead/pm)

## Bağımlılıklar
- @portal/core (types, entities)

## Önemli Notlar
- Proje kodu (code) benzersizdir ve kısa tanımlayıcı olarak kullanılır
- Proje durumları: draft → active → archived
- Her kullanıcı bir projede yalnızca bir atamaya sahip olabilir (UNIQUE constraint)
- Proje sahibi (owner) otomatik PM rolünde atanır
