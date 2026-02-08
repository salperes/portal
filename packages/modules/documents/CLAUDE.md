# Documents Module

## Modül Hakkında
MinIO tabanlı doküman yönetimi. Klasör yapısı, doküman yükleme/indirme, versiyon yönetimi.

## Dosya Yapısı
```
packages/modules/documents/
├── src/
│   ├── index.ts                     # Type re-exports + frontend exports
│   └── frontend/
│       ├── index.ts                 # Frontend exports
│       ├── pages/
│       │   └── index.ts            # Page re-exports
│       └── services/
│           └── documentsApi.ts      # API client (module package, setApiInstance pattern)
├── package.json
└── CLAUDE.md
```

Backend kodu: `backend/src/documents/`

## Frontend Sayfaları (Faz 2b)

Frontend kodu doğrudan `frontend/` altındadır (lokal API pattern):

```
frontend/src/
├── services/
│   └── documentsApi.ts              # API client (lokal, ./api import)
├── store/
│   └── documentsStore.ts            # Zustand UI-only state
├── components/documents/
│   ├── DocumentsSidebar.tsx          # Klasör ağacı sidebar bileşeni
│   └── DocumentModals.tsx           # 5 modal: Create, Upload, Detail, Rename, Delete
└── pages/
    └── Documents.tsx                 # Ana sayfa (~420 satır)
```

### State Yönetimi
- **Zustand** (`documentsStore.ts`): Sadece UI state — `currentFolderId`, `viewMode`, `selectedDocIds`, `searchQuery`
- **React Query**: Tüm sunucu verisi — `useQuery`/`useMutation` ile CRUD

### React Query Keys
| Query Key | API | Kullanım |
|-----------|-----|----------|
| `['folders']` | `getFolders()` | Sidebar klasör listesi |
| `['folder', id]` | `getFolderById(id)` | Klasör içeriği + dokümanlar |
| `['folder-breadcrumb', id]` | `getFolderBreadcrumb(id)` | Breadcrumb navigasyon |
| `['documents-search', q]` | `getDocuments({search})` | Arama sonuçları |
| `['document-versions', id]` | `getVersions(id)` | Versiyon geçmişi |

### Özellikler
- İki panelli layout: sol klasör ağacı + sağ içerik alanı
- Breadcrumb navigasyon
- Liste ve Grid görünüm modları
- Klasör CRUD (oluştur, yeniden adlandır, sil)
- Doküman yükleme (drag-drop + modal), indirme, silme
- Versiyon geçmişi ve yeni versiyon yükleme
- Doküman detay paneli (boyut, tür, versiyon, tarih)
- Sağ-tık context menü
- Arama fonksiyonu
- Responsive: sidebar `hidden lg:block`, mobile'da tam genişlik
- Dark mode tam destek

## API Endpoints
| Method | Path | Guard | Açıklama |
|--------|------|-------|----------|
| POST | `/api/documents/folders` | JWT | Klasör oluştur |
| GET | `/api/documents/folders` | JWT | Klasörleri listele (?parentId, ?projectId) |
| GET | `/api/documents/folders/:id` | JWT | Klasör detayı + dokümanlar |
| GET | `/api/documents/folders/:id/tree` | JWT | Alt klasör ağacı |
| GET | `/api/documents/folders/:id/breadcrumb` | JWT | Ekmek kırıntısı |
| PATCH | `/api/documents/folders/:id` | JWT | Klasör güncelle |
| DELETE | `/api/documents/folders/:id` | JWT | Klasör sil |
| POST | `/api/documents/upload` | JWT | Doküman yükle (multipart) |
| GET | `/api/documents` | JWT | Dokümanları listele (?folderId, ?search) |
| GET | `/api/documents/:id` | JWT | Doküman detayı |
| GET | `/api/documents/:id/download` | JWT | Doküman indir |
| PATCH | `/api/documents/:id` | JWT | Metadata güncelle |
| DELETE | `/api/documents/:id` | JWT | Doküman sil |
| POST | `/api/documents/:id/versions` | JWT | Yeni versiyon yükle (multipart) |
| GET | `/api/documents/:id/versions` | JWT | Versiyonları listele |
| GET | `/api/documents/:id/versions/:vn/download` | JWT | Versiyon indir |

## Veritabanı Şeması
- **folders**: id, name, parent_id (self-ref), project_id (nullable), owner_id, path (materialized), created_at, updated_at
- **documents**: id, folder_id, name, description, mime_type, size_bytes, storage_key, current_version, is_locked, locked_by, locked_at, created_by, created_at, updated_at
- **document_versions**: id, document_id, version_number, storage_key, size_bytes, change_note, created_by, created_at

## Storage
- MinIO bucket: `portal-documents`
- Key format: `{folderId}/{documentId}/v{version}/{filename}`

## Bağımlılıklar
- @portal/core (types, entities)
- MinioService (backend, global)

## Önemli Notlar
- Klasörler hiyerarşik yapıdadır (parent_id ile self-referencing)
- Klasör silme: alt klasör veya doküman varsa engellenir
- Her doküman yükleme otomatik v1 oluşturur
- Versiyon yükleme: yeni versiyon numarası artırılır, eski versiyonlar korunur
- Doküman silme: tüm versiyonlar MinIO'dan da silinir
- 100MB max dosya boyutu
