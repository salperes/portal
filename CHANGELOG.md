# MSS Portal - Changelog

> Max 11 kayıt tutulur. 11 kayıt dolunca eski 1-10 arşivlenir (`temp/changelog{NNN}-{NNN}.md`),
> yeni dosya eski dosyanın son kaydıyla başlar (bağlam referansı olarak).
> Arşiv: temp/changelog001-010.md, temp/changelog011-020.md, temp/changelog021-030.md, temp/changelog031-040.md

---------------------------------------------------------
Rev. ID    : 041
Rev. Date  : 10.02.2026
Rev. Time  : 03:30:00
Rev. Prompt: X-Ray TIR tarama goruntusu viewer + analiz araclari

Rev. Report: (
  XTIF/TIFF dosyalari icin X-Ray goruntu analiz viewer'i eklendi.
  Multi-layer TIFF dosyalarini client-side parse edip Canvas 2D
  uzerinde render ediyor. Tamamen frontend - backend degisiklik yok.

  Yeni paket: geotiff (MIT, ~50KB gzipped, pure JS)

  XRayViewer bilesenleri (frontend/src/components/documents/):
  - XRayViewer.tsx: Ana viewer (portal overlay, dark theme)
  - xray/TiffParser.ts: geotiff.js wrapper, multi-layer/multi-band parse
  - xray/ImageProcessor.ts: Pure JS goruntu isleme:
    * normalizeToImageData: 16-bit raw → 8-bit RGBA
    * adjustBrightnessContrast: parlaklik/kontrast ayari
    * invertImage: renk tersleme
    * computeHistogram: 256-bin histogram
    * equalizeHistogram: CDF-bazli histogram esitleme
    * sobelEdgeDetection: 3x3 Sobel kernel kenar tespiti
    * cannyEdgeDetection: Gaussian blur + Sobel + NMS + hysteresis
  - xray/CanvasRenderer.ts: Canvas 2D rendering + zoom/pan transform
  - xray/useCanvasInteraction.ts: Mouse wheel zoom (cursor-centered),
    drag pan, pixel info hover
  - xray/HistogramPanel.tsx: Canli histogram grafigi (mini canvas)
  - xray/ToolPanel.tsx: Parlaklik/Kontrast slider, Histogram Esitle,
    Tersle, Sobel/Canny kenar tespiti toggle, Sifirla butonu
  - xray/LayerPanel.tsx: Katman listesi (radio button), metadata
  - xray/types.ts: Shared interface'ler

  UI: 3 panelli layout (sol: katmanlar, orta: canvas, sag: araclar)
  Klavye: ESC kapat, +/- zoom, 0 ekrana sigdir

  Entegrasyon:
  - documentsApi.ts: canOpenWithXRayViewer() helper (tif/tiff/xtif)
  - Documents.tsx: cift-tikla + context menu + XRayViewer render

  Yeni dosyalar: 10 (XRayViewer.tsx + xray/ altinda 8 dosya)
  Degisen dosyalar: 2 (documentsApi.ts, Documents.tsx)

  CHANGELOG arsivleme: 031-040 → temp/changelog031-040.md
)
---------------------------------------------------------
Rev. ID    : 042
Rev. Date  : 10.02.2026
Rev. Time  : 04:30:00
Rev. Prompt: X-Ray Viewer hata duzeltme + yeni ozellikler (pan fix, rotate, clip, deinterlace)

Rev. Report: (
  X-Ray Viewer'daki hatalar duzeltildi ve yeni ozellikler eklendi.

  BUG FIX - Pan calismiyordu:
  - Kok neden: rendererRef.current component render sirasinda null
    olarak yakalaniyor, ref degisiklikleri re-render tetiklemediginden
    useCanvasInteraction hook'u hic gercek renderer almiyordu.
  - Fix: rendererReady state degiskeni eklendi. Renderer olusturuldugunda
    true, cleanup'ta false. Hook'a renderer: rendererReady ? ref.current : null
    seklinde geciriliyor.
  - interactionState.current artik fitToView/resize sonrasi sync ediliyor.

  YENI - Dondurme (Rotate 90):
  - ImageProcessor.ts: rotateImage() fonksiyonu (90/180/270 derece)
  - 90/270'de width-height swap, pixel koordinat donusumu
  - ToolPanel: "Dondur 90°" butonu, mevcut aci gosterimi
  - Klavye kisayolu: R tusu

  YENI - Histogram Kirpma (Window/Level):
  - ImageProcessor.ts: clipHistogram() fonksiyonu
  - [clipLow, clipHigh] araligini [0, 255]'e remap eder
  - ToolPanel: Sol/Sag cift slider (0-254 / 1-255, birbirini asamaz)
  - HistogramPanel: Kirpma isaretcileri (turuncu cizgi) + soluk bolge

  YENI - Deinterlace:
  - ImageProcessor.ts: deinterlace() fonksiyonu
  - X-Ray TIR taramadaki satir-satir parlaklik farkini normalize eder
  - Algoritma: satir bazli ortalama hesapla → global ortalamaya normalize
    et → 3-tap dikey smoothing ([0.25, 0.5, 0.25])
  - ToolPanel: "Deinterlace" toggle butonu

  Pipeline sirasi: deinterlace → clipHistogram → brightness/contrast
  → equalize → invert → edge detection → rotation

  Degisen dosyalar: 5 (XRayViewer.tsx, ImageProcessor.ts, types.ts,
  ToolPanel.tsx, HistogramPanel.tsx)
)
---------------------------------------------------------
Rev. ID    : 043
Rev. Date  : 10.02.2026
Rev. Time  : 05:00:00
Rev. Prompt: X-Ray Viewer dosya sunucusu (file-server) modulunde de calissin

Rev. Report: (
  X-Ray TIR Viewer artik hem Documents modulu hem de File Server
  modulunde calisiyor. TIFF/XTIF dosyalari dosya sunucusundan da
  goruntulenebilir.

  XRayViewer.tsx - Generic buffer/download props:
  - documentId artik optional (Documents modulu icin)
  - getBuffer prop: custom ArrayBuffer saglayici (file-server icin
    fileServerApi.download() kullanir)
  - onDownload prop: custom download handler (file-server icin
    blob indirme)

  fileServerApi.ts:
  - canOpenWithXRayViewer(extension) helper eklendi (tif/tiff/xtif)

  FileServer.tsx:
  - XRayViewer import + xrayDocToView state eklendi
  - Double-click: X-Ray kontrolu ONLYOFFICE'den once
  - Liste gorunumu: Scan ikonu (cyan) + ayri buton XTIF dosyalari icin
  - Grid gorunumu: Scan ikonu + cyan preview butonu
  - XRayViewer modal: getBuffer ile fileServerApi.download() kullanir,
    onDownload ile blob indirme saglar

  Degisen dosyalar: 3 (XRayViewer.tsx, fileServerApi.ts, FileServer.tsx)
)
---------------------------------------------------------
Rev. ID    : 044
Rev. Date  : 10.02.2026
Rev. Time  : 21:00:00
Rev. Prompt: FileServer: CAD viewer + context menu + preview/download ikonlari

Rev. Report: (
  Dosya sunucusu (FileServer) modulune CAD viewer destegi, sag tik
  context menu ve eksik ikon butonlari eklendi.

  fileServerApi.ts:
  - canOpenWithCadViewer(extension) helper eklendi (dwg/dxf)
  - canEditWithOnlyOffice import'u FileServer'a eklendi

  CadViewer.tsx - Generic buffer/download props (XRayViewer gibi):
  - documentId artik optional
  - getBuffer prop: custom ArrayBuffer saglayici (file-server icin)
  - onDownload prop: custom download handler (file-server icin)

  FileServer.tsx:
  - CadViewer import + cadDocToView state eklendi
  - DWG/DXF dosyalari icin Pen ikonu (mor renk) gosteriliyor
  - Double-click: X-Ray → CAD → ONLYOFFICE → download sirasi
  - Liste gorunumu: CAD preview butonu (Eye, mor) eklendi
  - Grid gorunumu: Preview + Download butonlari yan yana hover'da
  - Sag tik context menu (tum dosya/klasor tipleri icin):
    * Klasor: Ac, Sil
    * Dosya: Goruntule (X-Ray/CAD/ONLYOFFICE), Duzenle (ONLYOFFICE
      editable), Indir, Sil
  - Context menu disariya tiklaninca kapaniyor
  - CadViewer modal: getBuffer ile fileServerApi.download() kullanir

  Degisen dosyalar: 3 (fileServerApi.ts, CadViewer.tsx, FileServer.tsx)
)
---------------------------------------------------------
Rev. ID    : 045
Rev. Date  : 10.02.2026
Rev. Time  : 23:30:00
Rev. Prompt: FileServer: sol panel agac yapisi (folder tree sidebar)

Rev. Report: (
  FileServer sayfasina Documents sayfasindaki gibi iki panelli layout
  eklendi. Sol tarafta klasor agaci, sag tarafta klasor icerigi.

  fileServerStore.ts - Tree state management:
  - treeData: Record<string, FileItem[]> (share:path key, directory-only)
  - expandedNodes: Set<string>, treeLoading: Set<string>
  - expandNode/collapseNode/toggleNode action'lari
  - selectShare: browse sonucu directory'leri tree cache'e yazar
  - navigateTo: tum ancestor path'leri auto-expand eder
  - refresh: current path'in tree cache'ini temizler

  FileServerSidebar.tsx (YENI):
  - Recursive renderShareNode + renderFolderNode fonksiyonlari
  - Share'ler root dugum (Server ikonu, indigo renk)
  - Lazy-loading: expand edilince browse() ile alt klasorler yuklenir
  - Per-node loading spinner (Loader2)
  - Selection highlight (mavi), hover state, dark mode
  - Stil: DocumentsSidebar ile tutarli (card, overflow-y-auto)

  FileServer.tsx - Two-panel layout:
  - Share secim gorunumu (grid kartlari) kaldirildi
  - grid grid-cols-12 gap-4 layout (sidebar 3col, content 9col)
  - Sidebar: hidden lg:block (mobilde gizli)
  - Content panel: breadcrumb + toolbar + dosya listesi/grid
  - Share secili degilken: "Sol panelden bir paylasim secin" bos durum
  - Toolbar content panel header'ina tasindi (kompakt)

  Yeni dosyalar: 1 (FileServerSidebar.tsx)
  Degisen dosyalar: 2 (fileServerStore.ts, FileServer.tsx)
)
---------------------------------------------------------
Rev. ID    : 046
Rev. Date  : 10.02.2026
Rev. Time  : 23:50:00
Rev. Prompt: FileServer ve Documents two-panel layoutlarda dikey/yatay scroll desteği

Rev. Report: (
  FileServer ve Documents sayfalarina bagimsiz panel scroll desteği
  eklendi. Icerik viewport'a sigmadigi durumda her panel kendi
  icinde dikey ve yatay scroll yapabiliyor.

  Sorun: Her iki sayfa space-y-4 wrapper ile unbounded yukseklik
  kullaniyordu. Grid container'da minHeight: 500px vardi ama max-h
  yoktu. Panellerde overflow kontrolu yoktu.

  Cozum:
  - Sayfa wrapper: flex flex-col + height: calc(100vh - 96px)
    (viewport - 48px header - 48px main padding)
  - Grid: flex-1 min-h-0 (kalan alani doldurur, shrink edebilir)
  - Sidebar: min-h-0 overflow-hidden (ic bilesenler kendi scroll'u)
  - Content panel: min-h-0 overflow-hidden + ic alan overflow-auto
  - Documents.tsx ic content alanina overflow-auto eklendi

  FileServer.tsx:
  - Wrapper: space-y-4 → flex flex-col + height constraint
  - Grid: minHeight: 500px → flex-1 min-h-0
  - Sidebar wrapper: min-h-0 overflow-hidden
  - Content panel: min-h-0 overflow-hidden eklendi

  Documents.tsx:
  - Wrapper: space-y-4 → flex flex-col + height constraint
  - Grid: minHeight: 500px → flex-1 min-h-0
  - Sidebar wrapper: min-h-0 overflow-hidden
  - Content panel: min-h-0 overflow-hidden eklendi
  - Ic content alan: overflow-auto eklendi (flex-1 p-4 → flex-1
    overflow-auto p-4)

  Degisen dosyalar: 2 (FileServer.tsx, Documents.tsx)
)
---------------------------------------------------------
Rev. ID    : 047
Rev. Date  : 10.02.2026
Rev. Time  : 23:55:00
Rev. Prompt: FileServer adini "Ortak Alan" olarak degistir, sidebar'a ekle

Rev. Report: (
  FileServer sayfasinin adi "Dosya Sunucusu"ndan "Ortak Alan"a degistirildi
  ve sol navigasyon menusune eklendi.

  Layout.tsx:
  - Server ikonu import eklendi
  - navItems'a { path: '/file-server', icon: Server, label: 'Ortak Alan' }
    eklendi (Uygulamalar'dan sonra)

  FileServer.tsx:
  - Sayfa basligi: "Dosya Sunucusu" → "Ortak Alan"
  - Bos durum metni: "Dosya Sunucusu" → "Ortak Alan"

  Degisen dosyalar: 2 (Layout.tsx, FileServer.tsx)
)
---------------------------------------------------------
