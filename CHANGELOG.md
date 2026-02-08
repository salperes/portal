# MSS Portal - Changelog

> Max 11 kayıt tutulur. 11 kayıt dolunca eski 1-10 arşivlenir (`temp/changelog{NNN}-{NNN}.md`),
> yeni dosya eski dosyanın son kaydıyla başlar (bağlam referansı olarak).
> Arşiv: temp/changelog001-010.md, temp/changelog011-020.md, temp/changelog021-030.md

---------------------------------------------------------
Rev. ID    : 031
Rev. Date  : 08.02.2026
Rev. Time  : 23:30:00
Rev. Prompt: CadViewer sidebar kaybolma - debounced ResizeObserver fix

Rev. Report: (
  CadViewer kapatildiginda sidebar kaybolma hatasi GERCEK kok nedeni
  bulundu ve duzeltildi.

  Kok neden: Kutuphanenin ResizeObserver callback'i DEBOUNCED
  (trailing: true, delay: 0). Cleanup sirasinda:
  1. clear() renderer'i dispose eder
  2. React portal'i unmount eder (container DOM'dan cikar)
  3. ResizeObserver ates eder → debounced callback ASENKRON calisir
  4. onWindowResize() → _renderer.setSize() dispose edilmis renderer
     uzerinde → uncaught error → React render tree kirilir

  Onceki fix (cleanup siralamasi) yetersiz cunku debounced callback
  HER TURLU cleanup'tan sonra ates ediyor.

  Cozum: cleanupDocManager() icinde ilk adim olarak
  view.onWindowResize = () => {} ile metodu no-op ile override et.
  Arrow function closure () => this.onWindowResize() bizim no-op'u
  cagirir. Debounced callback artik zararsiz.

  Degisen dosyalar: 1 (CadViewer.tsx)
)
---------------------------------------------------------
Rev. ID    : 032
Rev. Date  : 09.02.2026
Rev. Time  : 00:30:00
Rev. Prompt: CadViewer sidebar kaybolma - kutuphane style tag temizligi

Rev. Report: (
  CadViewer kapatildiginda sidebar kaybolma hatasinin GERCEK kok nedeni
  nihayet bulundu: @mlightcad/cad-simple-viewer kutuphanesi <head>'e
  4-5 adet <style> tag'i enjekte ediyor (CLI bar, marker, floating input,
  jig preview, loader) ancak destroy() sirasinda bunlari ASLA temizlemiyor.
  Bu orphaned style tag'ler Vite dev server'in CSS injection sistemini
  bozarak Tailwind media query'lerinin (hidden lg:block) calismamasi
  neden oluyor - sidebar display:none kaliyordu viewport > 1024px olmasina
  ragmen.

  CadViewer.tsx:
  - cleanupLibraryStyles() fonksiyonu eklendi: useEffect cleanup'ta
    kutuphane tarafindan enjekte edilen tum <style> elementlerini temizler
    (ID bazli: ml-marker-style, ml-ccl-loader-styles;
     icerik bazli: .ml-cli-*, .ml-floating-input, .ml-jig-preview-rect)
  - Debug console.log'lar temizlendi (cleanupDocManager, useEffect cleanup)
  - Global error handler kaldirildi (artik gerekli degil)

  Documents.tsx:
  - Debug useEffect → safety net useEffect'e donusturuldu
  - CadViewer kapatildiktan sonra sidebar display:none kalirsa
    inline style ile zorla block yapar, 200ms sonra Tailwind'e birakir
  - Debug console.log/warn'lar temizlendi

  Degisen dosyalar: 2 (CadViewer.tsx, Documents.tsx)

  CHANGELOG arsivleme: 021-030 → temp/changelog021-030.md
)
---------------------------------------------------------
