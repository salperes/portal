# MSS Portal - Changelog

> Max 11 kayıt tutulur. 11 kayıt dolunca eski 1-10 arşivlenir (`temp/changelog{NNN}-{NNN}.md`),
> yeni dosya eski dosyanın son kaydıyla başlar (bağlam referansı olarak).
> Arşiv: temp/changelog001-010.md, temp/changelog011-020.md, temp/changelog021-030.md, temp/changelog031-040.md, temp/changelog041-050.md

---------------------------------------------------------
Rev. ID    : 051
Rev. Date  : 11.02.2026
Rev. Time  : 14:00:00
Rev. Prompt: Kullanici ayarlarini DB'de sakla (favoriler), sidebar agac yatay scroll

Rev. Report: (
  Kullanici ayarlari (favoriler vb.) artik DB'de saklanir, farkli
  tarayici/bilgisayardan girildiginde de eriselebilir. Sidebar agac
  yapisina yatay scroll eklendi.

  Backend - User entity degisikligi:
  - User entity'ye settings kolonu eklendi (jsonb, default: {})
  - Dual-location: hem backend hem core package guncellendi
  - UsersService: getMySettings() + updateMySettings() metodlari
  - UsersController: GET/PUT /users/me/settings endpoint'leri
    (AdminGuard yok, her kullanici kendi ayarlarina erisir)
  - :id route'larindan once tanimli (NestJS route conflict onlemi)

  Frontend - API entegrasyonu:
  - userSettingsApi.ts (YENI): getSettings() + saveSettings()
  - fileServerStore.ts: localStorage → API gecisi
    * loadFavorites(): API'den ceker, localStorage migrasyonu yapar
    * addFavorite/removeFavorite: lokal state + fire-and-forget API save
    * Fallback: API hatalarinda localStorage'a duser
  - FileServer.tsx: loadFavorites() cagirisi useEffect'e eklendi

  Sidebar yatay scroll:
  - FileServerSidebar.tsx: overflow-y-auto → overflow-auto,
    min-w-fit wrapper, truncate → whitespace-nowrap
  - DocumentsSidebar.tsx: ayni degisiklikler

  Yeni dosyalar: 1 (userSettingsApi.ts)
  Degisen dosyalar: 7 (user.entity.ts x2, users.service.ts,
  users.controller.ts, fileServerStore.ts, FileServer.tsx,
  FileServerSidebar.tsx, DocumentsSidebar.tsx)
)
---------------------------------------------------------
Rev. ID    : 052
Rev. Date  : 11.02.2026
Rev. Time  : 15:00:00
Rev. Prompt: Dokumanlar ve Ortak Alan sidebar/icerik panelleri arasi slider (boyut degistirme)

Rev. Report: (
  Dokumanlar ve Ortak Alan sayfalarindaki sol panel (agac) ile sag panel
  (icerik) arasina suruklenebilir slider eklendi. Kullanici panellerin
  genisligini mouse ile ayarlayabiliyor.

  ResizablePanels.tsx (YENI - components/):
  - Reusable flex layout bileseni: left + divider + right
  - Mouse drag ile sol panel genisligi ayarlanir (% bazli)
  - Min %15, max %50, varsayilan %25
  - Genislik localStorage'da saklanir (sayfa basi ayri key)
  - Mobilde sidebar gizli (hidden lg:block), icerik tam genislik
  - Dark mode destegi, hover/active renk gecisleri
  - leftRef prop: Documents.tsx CadViewer CSS cleanup workaround icin

  Documents.tsx:
  - grid grid-cols-12 gap-4 → ResizablePanels storageKey="documents"
  - col-span-3/col-span-9 sabitleri kaldirildi
  - sidebarRef leftRef prop'u ile iletilir

  FileServer.tsx:
  - grid grid-cols-12 gap-4 → ResizablePanels storageKey="fileserver"
  - col-span-3/col-span-9 sabitleri kaldirildi

  Yeni dosyalar: 1 (ResizablePanels.tsx)
  Degisen dosyalar: 2 (Documents.tsx, FileServer.tsx)

  CHANGELOG arsivleme: 041-050 → temp/changelog041-050.md
)
---------------------------------------------------------
