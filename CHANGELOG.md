# MSS Portal - Changelog

> Max 11 kayıt tutulur. 11 kayıt dolunca eski 1-10 arşivlenir (`temp/changelog{NNN}-{NNN}.md`),
> yeni dosya eski dosyanın son kaydıyla başlar (bağlam referansı olarak).
> Arşiv: temp/changelog001-010.md, temp/changelog011-020.md

---------------------------------------------------------
Rev. ID    : 021
Rev. Date  : 07.02.2026
Rev. Time  : 23:30:00
Rev. Prompt: Proje yonetim sayfasinda alt grup olusturma ve uye atama

Rev. Report: (
  ProjectsAdmin.tsx proje detay paneli genisletildi:

  Yeni tab sistemi: "Uyeler" | "Alt Gruplar" sekmeleri
  - Uyeler sekmesi: mevcut uye listesi + rol yonetimi (degisiklik yok)
  - Alt Gruplar sekmesi: tamamen yeni

  Alt Gruplar sekmesi ozellikleri:
  - Proje alt gruplarini listeleme (groupsApi.getAll({ projectId }))
  - "Yeni Alt Grup" butonu + modal (isim, aciklama, projectId ile grup olusturma)
  - Her grup karti: isim, uye sayisi, expand/collapse
  - Expand edildiginde: grup uyeleri listesi
  - UserPlus butonu: proje uyelerinden gruba uye ekleme (inline picker)
    - Zaten grupta olan uyeler "Mevcut" olarak isaretli
  - Grup uyesini cikarma (X butonu)
  - Grubu silme (Trash2 butonu, onay ile)

  Yeni importlar: groupsApi, Group tipi, Users/ChevronDown/ChevronUp ikonlari
  Yeni state: detailTab, showCreateGroupModal, groupName, groupDescription,
    expandedGroup, showGroupMemberPicker
  Yeni queryler: project-groups, group-detail
  Yeni mutasyonlar: createGroupMutation, deleteGroupMutation,
    addGroupMemberMutation, removeGroupMemberMutation

  Degisen dosya: 1 (ProjectsAdmin.tsx)
)
---------------------------------------------------------
Rev. ID    : 022
Rev. Date  : 07.02.2026
Rev. Time  : 23:55:00
Rev. Prompt: Proje yaratilirken default alt gruplari otomatik olustur

Rev. Report: (
  Proje olusturulurken 8 default alt grup otomatik yaratiliyor.

  Default alt gruplar (alfabetik):
  Elektronik, Kalite, Mekanik, Optik, Otomasyon, Proje Yonetim, Test, Yazilim

  Backend degisiklikleri:
  - projects.service.ts: DEFAULT_SUBGROUPS static dizisi eklendi
  - create() metodu: proje + owner atamasindan sonra 8 grup otomatik olusturulur
    (groupRepository.create + save ile toplu insert)
  - projects.module.ts: Group entity TypeOrmModule.forFeature'a eklendi
  - ProjectsService constructor: Group repository inject edildi

  Davranis: Yeni proje olusturulunca Alt Gruplar sekmesinde
  8 hazir grup gorunur, hemen uye atanabilir.

  Degisen dosyalar: 2 (projects.service.ts, projects.module.ts)

  CHANGELOG arsivleme: 011-020 → temp/changelog011-020.md
)
---------------------------------------------------------
Rev. ID    : 023
Rev. Date  : 08.02.2026
Rev. Time  : 00:10:00
Rev. Prompt: Sidebar klasor agacinda sag tik ile erisim yonetimi

Rev. Report: (
  DocumentsSidebar'a sag tik context menu destegi eklendi.

  DocumentsSidebar.tsx:
  - onFolderContextMenu optional prop eklendi (e: MouseEvent, folderId: string)
  - Her klasor satirina onContextMenu handler eklendi
  - preventDefault + stopPropagation ile browser default menu engellendi

  Documents.tsx:
  - Sidebar'a onFolderContextMenu={(e, folderId) => handleContextMenu(e, folderId, 'folder')} gecirildi
  - Mevcut context menu (Ac, Yeni Alt Klasor, Yeniden Adlandir, Erisim Yonetimi, Sil)
    artik sidebar'daki klasorlerde de calisir

  Degisen dosyalar: 2 (DocumentsSidebar.tsx, Documents.tsx)
)
---------------------------------------------------------
Rev. ID    : 024
Rev. Date  : 08.02.2026
Rev. Time  : 00:45:00
Rev. Prompt: Dosya sag tik erisim yonetimi + bos alana sag tik yeni dosya olusturma

Rev. Report: (
  Iki yeni ozellik eklendi:
  1. Dosya sag tik menusune "Erisim Yonetimi" eklendi (klasorun izinlerini acar)
  2. Bos alana sag tikla yeni dosya olusturma (Word, Excel, PowerPoint, Text)

  Backend (3 yeni/degisen dosya):
  - jszip paketi yuklendi (OOXML sablon uretimi icin)
  - document-templates.ts: generateTemplate() fonksiyonu - minimal valid
    .docx, .xlsx, .pptx, .txt dosyalari uretir (JSZip ile)
  - create-new-document.dto.ts: CreateNewDocumentDto (name, type, folderId)
  - dto/index.ts: yeni DTO export eklendi
  - documents.service.ts: createEmptyDocument() metodu - sablon uretir,
    MinIO'ya yukler, Document + DocumentVersion olusturur
  - documents.controller.ts: POST /documents/create-new endpoint

  Frontend (2 degisen dosya):
  - documentsApi.ts: createDocument() metodu eklendi
  - Documents.tsx:
    - Context menu tipi 'empty' destegi (folder/document/empty)
    - createDocumentMutation eklendi
    - Icerik alaninda onContextMenu: data-ctx-item olmayan yere tiklaninca
      bos alan menusu acilir (Yeni Word/Excel/PowerPoint/Text, Klasor, Yukle, Erisim)
    - Dosya context menusune "Erisim Yonetimi" butonu eklendi
    - data-ctx-item attribute tum interaktif elemanlar icin eklendi
      (kok klasorler, alt klasorler, liste ve grid dokuman kartlari)

  Degisen dosyalar: 6
  (document-templates.ts, create-new-document.dto.ts, dto/index.ts,
   documents.service.ts, documents.controller.ts, documentsApi.ts, Documents.tsx)
)
---------------------------------------------------------
Rev. ID    : 025
Rev. Date  : 08.02.2026
Rev. Time  : 09:30:00
Rev. Prompt: Dokuman bazli erisim yonetimi (document-level permissions)

Rev. Report: (
  Dosya bazinda erisim izni tanimlama ozelligi eklendi.
  Hiyerarsi: parent folder → subfolder → document (top-down inheritance).

  Backend (2 degisen dosya):
  - documents.service.ts: 3 yeni metot
    - getDocumentPermissions(docId): dokuman + parent folder kurallarini
      birlikte dondurur (source: 'self' | 'inherited' alani ile)
    - addDocumentPermission(docId, dto, userId, userRole):
      ResourceType.DOCUMENT ile kural olusturur, sahip/admin kontrolu
    - removeDocumentPermission(docId, ruleId, userId, userRole):
      sadece document-level kurallar silinebilir
  - documents.controller.ts: 3 yeni endpoint
    - GET /documents/:id/permissions
    - POST /documents/:id/permissions
    - DELETE /documents/:id/permissions/:ruleId

  Frontend (3 degisen/yeni dosya):
  - documentsApi.ts: 3 yeni API metot + PermissionRule tipi (source alani)
  - PermissionsModal.tsx (YENI): FolderPermissionsModal genellestirildi
    - resourceType prop: 'folder' | 'document'
    - Dokuman modunda: kendi kurallari (silinebilir) + miras alinan
      klasor kurallari (read-only, 'Miras' badge, silinemez)
    - Klasor modunda: mevcut davranis aynen korunur
  - Documents.tsx: permissionsFolder → permissionsTarget state
    - Klasor sag tik → type:'folder', Dosya sag tik → type:'document'
    - PermissionsModal import ve render guncellendi

  Degisen dosyalar: 4 (documents.service.ts, documents.controller.ts,
   documentsApi.ts, Documents.tsx) + 1 yeni (PermissionsModal.tsx)
)
---------------------------------------------------------
Rev. ID    : 026
Rev. Date  : 08.02.2026
Rev. Time  : 10:00:00
Rev. Prompt: Top bar ve sidebar temizligi + Settings sayfasi

Rev. Report: (
  Layout.tsx temizlendi, gereksiz ikonlar kaldirildi, Settings sayfasi eklendi.

  Kaldirilanlar:
  - Top bar: Cog (Settings) ikonu kaldirildi
  - Top bar: HelpCircle (?) ikonu kaldirildi
  - Sidebar: "Cikis Yap" butonu kaldirildi (user dropdown'da zaten var)
  - Kullanilmayan importlar temizlendi (Cog, HelpCircle)

  Eklenenler:
  - User dropdown "Hesap ayarlari" → /settings sayfasina yonlendirme
  - Settings.tsx (YENI): Placeholder sayfa ("Yapim Asamasinda" mesaji)
  - App.tsx: /settings route eklendi

  Bell (bildirim) ikonu korundu (ileride bildirim sistemi icin).

  Degisen dosyalar: 2 (Layout.tsx, App.tsx) + 1 yeni (Settings.tsx)
)
---------------------------------------------------------
Rev. ID    : 027
Rev. Date  : 08.02.2026
Rev. Time  : 11:00:00
Rev. Prompt: DWG/DXF dosya goruntuleme (CAD Viewer entegrasyonu)

Rev. Report: (
  @mlightcad/cad-simple-viewer ile DWG/DXF dosya goruntuleme eklendi.
  Tamamen client-side calisir, backend degisikligi yok.

  Yuklenen paketler:
  - @mlightcad/cad-simple-viewer (MIT, framework-agnostic)
  - @mlightcad/data-model (DXF/DWG data model)
  - three, lodash-es (peer dependencies)

  Worker dosyalari (DXF/DWG parser + mtext renderer):
  - public/assets/ altina kopyalandi (Vite static serve)
  - Dockerfile.frontend: pnpm install sonrasi node_modules'dan public/assets/'e cp

  CadViewer.tsx (YENI):
  - DocumentEditor pattern'ini takip eder (createPortal, fullscreen)
  - downloadDocumentBuffer() ile dosya ArrayBuffer olarak indirilir
  - AcApDocManager.createInstance() ile canvas viewer baslatilir
  - openDocument(filename, content, {readOnly: true}) ile dosya acilir
  - Header: dosya adi, CAD Viewer badge, indir, tam ekran, kapat butonlari
  - Hata durumunda bilgilendirme (desteklenmeyen format uyarisi)

  documentsApi.ts:
  - downloadDocumentBuffer(docId): dosya icerigini ArrayBuffer olarak indirir
  - canOpenWithCadViewer(filename): dwg/dxf uzantisi kontrolu

  Documents.tsx:
  - cadDocToView state eklendi
  - Cift tik: canOpenWithCadViewer -> CadViewer, canOpenWithOnlyOffice -> ONLYOFFICE
  - Sag tik context menu: "Goruntule (CAD)" butonu DWG/DXF icin
  - CadViewer render (portal ile tam ekran)

  DocumentModals.tsx:
  - onViewCad prop + canOpenWithCadViewer kontrolu
  - Detay panelinde "Goruntule (CAD)" butonu

  Degisen dosyalar: 3 (documentsApi.ts, Documents.tsx, DocumentModals.tsx)
  + 1 yeni (CadViewer.tsx)
  + Dockerfile.frontend guncellendi (worker dosya kopyalama adimi)
)
---------------------------------------------------------
Rev. ID    : 028
Rev. Date  : 08.02.2026
Rev. Time  : 13:00:00
Rev. Prompt: CadViewer bug fix - sidebar kayboluyor + DWG hata loglama

Rev. Report: (
  CadViewer kapatildiginda sidebar'in kaybolma hatasi duzeltildi.
  DWG dosya acma hatasi icin detayli loglama eklendi.

  Sorun analizi:
  - AcApDocManager.destroy() sadece singleton referansini temizliyor
  - Three.js animation loop (requestAnimationFrame) durmuyor
  - document keydown listener (Escape/Delete) kaldirilmiyor
  - ResizeObserver disconnect edilmiyor (referans kayip)
  - WebGLRenderer dispose edilmiyor

  CadViewer.tsx degisiklikleri:
  - cleanupDocManager() fonksiyonu: destroy() oncesi
    curView.stopAnimationLoop() + curView.clear() cagirir,
    container innerHTML temizler (canvas + ResizeObserver koparir)
  - createKeydownBlocker(): document keydown capture listener ile
    Escape/Delete tuslari AcApDocManager'in stale listener'ina
    ulasmadan engellenir (post-destroy crash onleme)
  - Worker dosya erisim kontrolu: HEAD request ile worker URL
    dogrulamasi (404 durumunda aciklayici hata mesaji)
  - Detayli console.log: dosya boyutu, worker verify, her adim

  Degisen dosyalar: 1 (CadViewer.tsx)
)
---------------------------------------------------------
Rev. ID    : 029
Rev. Date  : 08.02.2026
Rev. Time  : 14:00:00
Rev. Prompt: DWG processLayouts hatasi monkey-patch ile bypass

Rev. Report: (
  DWG dosya acma hatasinin kok nedeni: LibreDWG parser'in urettigi
  veri yapisinda dictionaries objesi eksik, processLayouts()
  "Cannot read properties of undefined (reading 'layouts')" hatasi
  veriyor. Entity'ler (cizim) zaten basariyla parse ediliyor, sadece
  layout metadata asamasi cokuyor.

  Cozum: AcDbDatabaseConverterManager (data-model export) uzerinden
  DWG converter'a erisip processObjects metodunu try-catch wrapper
  ile monkey-patch ettik. Hata bypass ediliyor, cizim render edilir.

  CadViewer.tsx degisiklikleri:
  - AcDbDatabaseConverterManager import (from @mlightcad/data-model)
  - patchDwgConverter(): createInstance() sonrasi converter prototype
    processObjects metodunu try-catch ile sarir
  - converterPatched flag ile tekrar patch onlenir
  - Gereksiz HEAD worker check ve fazla console.log kaldirildi

  Degisen dosyalar: 1 (CadViewer.tsx)
)
---------------------------------------------------------
