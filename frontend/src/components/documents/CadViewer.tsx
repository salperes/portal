import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Download, Maximize2, Minimize2, AlertTriangle } from 'lucide-react';
import { AcApDocManager } from '@mlightcad/cad-simple-viewer';
import { AcDbDatabaseConverterManager } from '@mlightcad/data-model';
import { documentsApi } from '../../services/documentsApi';

interface CadViewerProps {
  documentId: string;
  filename: string;
  onClose: () => void;
}

/**
 * Monkey-patch the DWG converter's processObjects/processLayouts/processImageDefs
 * to handle missing dictionaries gracefully. The LibreDWG parser sometimes produces
 * DWG data without a valid dictionaries object, causing processLayouts to crash with
 * "Cannot read properties of undefined (reading 'layouts')".
 *
 * The entity data (actual drawing) is already parsed by this point, so we can safely
 * skip the OBJECT stage and still render the drawing.
 */
let converterPatched = false;
function patchDwgConverter() {
  if (converterPatched) return;
  try {
    const dwgConverter = AcDbDatabaseConverterManager.instance.get('dwg');
    if (!dwgConverter) {
      console.warn('[CadViewer] DWG converter not registered yet, will patch after createInstance');
      return;
    }

    const proto = Object.getPrototypeOf(dwgConverter);
    if (!proto) return;

    // Patch processObjects to wrap processLayouts and processImageDefs in try-catch
    const origProcessObjects = proto.processObjects;
    if (origProcessObjects) {
      proto.processObjects = function (parsedData: unknown, database: unknown) {
        try {
          origProcessObjects.call(this, parsedData, database);
        } catch (err) {
          console.warn('[CadViewer] processObjects error (bypassed):', err);
        }
      };
      console.log('[CadViewer] DWG converter processObjects patched');
    }

    converterPatched = true;
  } catch (err) {
    console.warn('[CadViewer] Failed to patch DWG converter:', err);
  }
}

/**
 * Thoroughly clean up AcApDocManager resources.
 * The library's destroy() only clears the singleton reference (_instance = void 0)
 * but does NOT stop the animation loop, dispose the Three.js renderer, remove
 * event listeners, or disconnect the ResizeObserver. We must do this manually.
 */
function cleanupDocManager(manager: AcApDocManager, container: HTMLDivElement | null) {
  const view = manager.curView;

  // 1. Override onWindowResize to no-op (prevents debounced ResizeObserver crash)
  if (view) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (view as any).onWindowResize = () => {};
    } catch (_) { /* ignore */ }
  }

  // 2. Stop animation loop
  try { view?.stopAnimationLoop(); } catch (_) { /* ignore */ }

  // 3. Remove canvas from DOM (severs ResizeObserver link)
  if (container) container.innerHTML = '';

  // 4. Dispose Three.js renderer and scene
  try { view?.clear(); } catch (_) { /* ignore */ }

  // 5. Clear singleton reference
  try { manager.destroy(); } catch (_) { /* ignore */ }
}

/**
 * Remove <style> elements injected by @mlightcad/cad-simple-viewer.
 * The library injects 4-5 style tags into <head> during initialization
 * but never removes them on destroy(). These orphaned tags corrupt
 * Vite dev server's CSS injection system, causing Tailwind media queries
 * to stop working (sidebar display:none despite viewport > 1024px).
 */
function cleanupLibraryStyles() {
  // ID-based style tags (marker + loader)
  ['ml-marker-style', 'ml-ccl-loader-styles'].forEach(id => {
    document.getElementById(id)?.remove();
  });
  // Content-based style tags without IDs (CLI, floating input, jig preview)
  document.querySelectorAll('style').forEach(el => {
    const text = el.textContent || '';
    if (
      text.includes('.ml-cli-') ||
      text.includes('.ml-floating-input') ||
      text.includes('.ml-jig-preview-rect')
    ) {
      el.remove();
    }
  });
}

/**
 * Intercept the document-level keydown listener that AcApDocManager adds
 * during construction. After destroy(), pressing Delete would crash.
 */
function createKeydownBlocker() {
  const handler = (e: KeyboardEvent) => {
    if (e.code === 'Escape' || e.code === 'Delete') {
      e.stopImmediatePropagation();
    }
  };
  document.addEventListener('keydown', handler, true);
  return () => document.removeEventListener('keydown', handler, true);
}

export function CadViewer({ documentId, filename, onClose }: CadViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const docManagerRef = useRef<AcApDocManager | null>(null);
  const mountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    mountedRef.current = true;

    const initViewer = async () => {
      try {
        // 1. Download file content as ArrayBuffer
        const content = await documentsApi.downloadDocumentBuffer(documentId);
        if (!mountedRef.current) return;

        if (!content.byteLength) {
          setError('Dosya içeriği boş');
          setLoading(false);
          return;
        }

        // 2. Wait for container to be in DOM
        const container = containerRef.current;
        if (!container) {
          setError('Viewer container bulunamadı');
          setLoading(false);
          return;
        }

        // 3. Worker file paths
        const workerPaths = {
          dxfParser: '/assets/dxf-parser-worker.js',
          dwgParser: '/assets/libredwg-parser-worker.js',
          mtextRender: '/assets/mtext-renderer-worker.js',
        };

        // 4. Initialize AcApDocManager with container
        const manager = AcApDocManager.createInstance({
          container,
          autoResize: true,
          webworkerFileUrls: workerPaths,
        });

        if (!manager) {
          setError('CAD viewer başlatılamadı');
          setLoading(false);
          return;
        }

        docManagerRef.current = manager;

        // 5. Patch DWG converter AFTER createInstance (converters registered in constructor)
        patchDwgConverter();

        // 6. Open the document
        const success = await manager.openDocument(filename, content, {
          readOnly: true,
        });

        if (!mountedRef.current) return;

        if (!success) {
          setError('Dosya açılamadı. Desteklenmeyen format veya bozuk dosya olabilir.');
        }

        setLoading(false);
      } catch (err) {
        if (!mountedRef.current) return;
        console.error('[CadViewer] Init error:', err);
        setError(err instanceof Error ? err.message : 'CAD dosyası yüklenirken hata oluştu');
        setLoading(false);
      }
    };

    const timer = setTimeout(initViewer, 150);
    const removeKeydownBlocker = createKeydownBlocker();

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);

      if (docManagerRef.current) {
        cleanupDocManager(docManagerRef.current, containerRef.current);
        docManagerRef.current = null;
      }

      // Remove style tags injected by the library to prevent CSS corruption
      cleanupLibraryStyles();

      // Remove keydown blocker after a delay (library's stale listener persists)
      setTimeout(removeKeydownBlocker, 2000);
    };
  }, [documentId, filename]);

  const handleDownload = async () => {
    try {
      await documentsApi.downloadDocument(documentId, filename);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  return createPortal(
    <div className={`fixed inset-0 z-50 flex flex-col bg-gray-900 ${isFullscreen ? '' : 'p-4 md:p-8'}`}>
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium truncate max-w-md">{filename}</span>
          <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">CAD Viewer</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title="İndir"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title={isFullscreen ? 'Küçült' : 'Tam Ekran'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title="Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Viewer Container */}
      <div className="flex-1 bg-white relative" style={{ minHeight: 0 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">CAD dosyası yükleniyor...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="text-center max-w-md">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
              <p className="text-red-600 mb-4">{error}</p>
              <p className="text-sm text-gray-500 mb-4">
                DWG/DXF dosyalarının tamamı desteklenmeyebilir. Table entity&apos;leri ve XRef&apos;ler gösterilmez.
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Kapat
              </button>
            </div>
          </div>
        )}

        {/* CAD rendering container */}
        <div ref={containerRef} className="absolute inset-0" />
      </div>
    </div>,
    document.body,
  );
}

export default CadViewer;
