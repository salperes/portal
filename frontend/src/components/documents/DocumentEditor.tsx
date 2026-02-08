import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal, flushSync } from 'react-dom';
import { X, Loader2, Edit, Eye, Download, Maximize2, Minimize2, Users } from 'lucide-react';
import { documentsApi, canEditWithOnlyOffice } from '../../services/documentsApi';
import type { DocumentEditorConfig, ActiveUser } from '../../services/documentsApi';

interface DocumentEditorProps {
  documentId: string;
  filename: string;
  initialMode: 'view' | 'edit';
  onClose: () => void;
}

// ONLYOFFICE Document Server URL (external access)
const ONLYOFFICE_URL = import.meta.env.VITE_ONLYOFFICE_URL || 'http://localhost:8080';

// Unique container ID - separate from DocumentViewer to avoid conflicts
const EDITOR_CONTAINER_ID = 'onlyoffice-doc-editor-root';

// Global script loading state to prevent duplicate loads
let scriptLoadingPromise: Promise<void> | null = null;

export function DocumentEditor({ documentId, filename, initialMode, onClose }: DocumentEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const initializingRef = useRef(false);
  const mountedRef = useRef(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<DocumentEditorConfig | null>(null);
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wrapperKey, setWrapperKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [showUsersList, setShowUsersList] = useState(false);

  const canEdit = canEditWithOnlyOffice(filename);

  // Fetch active users periodically when in edit mode
  useEffect(() => {
    if (mode !== 'edit') {
      setActiveUsers([]);
      return;
    }

    const fetchActiveUsers = async () => {
      try {
        const users = await documentsApi.getActiveUsers(documentId);
        setActiveUsers(users);
      } catch (err) {
        console.error('Failed to fetch active users:', err);
      }
    };

    fetchActiveUsers();
    const interval = setInterval(fetchActiveUsers, 10000);
    return () => clearInterval(interval);
  }, [mode, documentId]);

  // Close users dropdown when clicking outside
  useEffect(() => {
    if (!showUsersList) return;
    const handleClickOutside = () => setShowUsersList(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showUsersList]);

  // Create editor container outside React's tree
  const createEditorContainer = useCallback((): HTMLDivElement | null => {
    const existing = document.getElementById(EDITOR_CONTAINER_ID);
    if (existing) existing.remove();

    const wrapper = document.getElementById('onlyoffice-doc-wrapper');
    if (!wrapper) {
      console.warn('[DocumentEditor] Wrapper element not found in DOM');
      return null;
    }

    const container = document.createElement('div');
    container.id = EDITOR_CONTAINER_ID;
    container.style.width = '100%';
    container.style.height = '100%';
    wrapper.appendChild(container);

    return container;
  }, []);

  // Destroy editor and remove container from DOM
  const destroyEditor = useCallback(() => {
    if (editorRef.current) {
      try {
        editorRef.current.destroyEditor();
      } catch (e) {
        console.warn('Error destroying editor:', e);
      }
      editorRef.current = null;
    }

    const container = document.getElementById(EDITOR_CONTAINER_ID);
    if (container) {
      container.innerHTML = '';
      container.remove();
    }

    const wrapper = document.getElementById('onlyoffice-doc-wrapper');
    if (wrapper) wrapper.innerHTML = '';
  }, []);

  // Load document config when documentId or mode changes
  useEffect(() => {
    mountedRef.current = true;

    const loadConfig = async () => {
      if (initializingRef.current) return;
      initializingRef.current = true;

      try {
        setLoading(true);
        setError(null);
        destroyEditor();

        const docConfig = await documentsApi.getEditorConfig(documentId, mode);
        if (mountedRef.current) setConfig(docConfig);
      } catch (err: unknown) {
        if (mountedRef.current) {
          const errorMessage = err instanceof Error ? err.message : 'Döküman yüklenirken hata oluştu';
          setError(errorMessage);
          setLoading(false);
        }
      } finally {
        initializingRef.current = false;
      }
    };

    loadConfig();

    return () => {
      mountedRef.current = false;
      destroyEditor();
    };
  }, [documentId, mode, destroyEditor]);

  // Initialize ONLYOFFICE when config is ready
  useEffect(() => {
    if (!config) return;
    if (editorRef.current) return;

    const scriptId = 'onlyoffice-api-script';
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    const initEditor = (retryCount = 0) => {
      if (editorRef.current || !mountedRef.current) return;

      const container = createEditorContainer();
      if (!container) {
        // Wrapper not in DOM yet (React portal timing) - retry up to 10 times
        if (retryCount < 10 && mountedRef.current) {
          retryTimer = setTimeout(() => initEditor(retryCount + 1), 100);
          return;
        }
        if (mountedRef.current) {
          setError('Editor container oluşturulamadı');
          setLoading(false);
        }
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const DocsAPI = (window as any).DocsAPI;
      if (!DocsAPI) {
        if (mountedRef.current) {
          setError('ONLYOFFICE API yüklenemedi. Lütfen sayfayı yenileyin.');
          setLoading(false);
        }
        return;
      }

      // Force canvas repaint - multiple strategies to fix black canvas
      const forceCanvasRepaint = () => {
        // Strategy 1: Dispatch resize to trigger ONLYOFFICE layout recalculation
        window.dispatchEvent(new Event('resize'));

        // Strategy 2: Find the ONLYOFFICE iframe and toggle its display
        // This forces browser to tear down and recreate compositing layers
        const iframe = document.querySelector('[name="frameEditor"]') as HTMLIFrameElement;
        if (iframe) {
          // Toggle display forces full recomposite
          const origDisplay = iframe.style.display;
          iframe.style.display = 'none';
          // Use double-rAF to ensure the browser has processed the display:none
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              iframe.style.display = origDisplay || '';
              // After restoring display, dispatch another resize
              window.dispatchEvent(new Event('resize'));
            });
          });
        }
      };

      // Lighter repaint - just resize without display toggle
      const lightRepaint = () => {
        window.dispatchEvent(new Event('resize'));
      };

      try {
        const editor = new DocsAPI.DocEditor(EDITOR_CONTAINER_ID, {
          documentType: config.documentType,
          document: config.document,
          editorConfig: config.editorConfig,
          token: config.token,
          type: 'desktop',
          width: '100%',
          height: '100%',
          events: {
            onAppReady: () => {
              if (mountedRef.current) {
                setLoading(false);
                // Light repaints during initial load
                setTimeout(lightRepaint, 100);
                setTimeout(lightRepaint, 500);
              }
            },
            onError: (event: { data: string }) => {
              console.error('ONLYOFFICE error:', event);
              if (mountedRef.current) {
                setError(`Editör hatası: ${event.data}`);
                setLoading(false);
              }
            },
            onDocumentReady: () => {
              console.log('Document loaded successfully');
              // Light repaints first
              setTimeout(lightRepaint, 100);
              setTimeout(lightRepaint, 300);
              // Aggressive display-toggle repaint after content is loaded
              setTimeout(forceCanvasRepaint, 800);
              setTimeout(forceCanvasRepaint, 2000);
            },
          },
        });
        editorRef.current = editor;
      } catch (err) {
        console.error('Failed to initialize ONLYOFFICE:', err);
        if (mountedRef.current) {
          setError('ONLYOFFICE başlatılamadı');
          setLoading(false);
        }
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).DocsAPI) {
      initEditor();
      return () => { if (retryTimer) clearTimeout(retryTimer); };
    }

    const loadScript = (): Promise<void> => {
      if (scriptLoadingPromise) return scriptLoadingPromise;

      const existingScript = document.getElementById(scriptId) as HTMLScriptElement;
      if (existingScript) {
        scriptLoadingPromise = new Promise((resolve, reject) => {
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', () => reject(new Error('Script load failed')));
          setTimeout(resolve, 500);
        });
        return scriptLoadingPromise;
      }

      scriptLoadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = `${ONLYOFFICE_URL}/web-apps/apps/api/documents/api.js`;
        script.async = true;
        script.onload = () => setTimeout(resolve, 100);
        script.onerror = () => {
          scriptLoadingPromise = null;
          reject(new Error('Script load failed'));
        };
        document.body.appendChild(script);
      });

      return scriptLoadingPromise;
    };

    loadScript()
      .then(() => {
        if (mountedRef.current && !editorRef.current) initEditor();
      })
      .catch(() => {
        if (mountedRef.current) {
          setError(`ONLYOFFICE API yüklenemedi. URL: ${ONLYOFFICE_URL}`);
          setLoading(false);
        }
      });

    return () => { if (retryTimer) clearTimeout(retryTimer); };
  }, [config, createEditorContainer]);

  const handleDownload = async () => {
    try {
      await documentsApi.downloadDocument(documentId, filename);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const toggleFullscreen = () => setIsFullscreen(!isFullscreen);

  const handleModeChange = async (newMode: 'view' | 'edit') => {
    if (newMode === mode) return;

    flushSync(() => {
      setIsTransitioning(true);
    });

    destroyEditor();

    flushSync(() => {
      setLoading(true);
      setConfig(null);
    });

    await new Promise(resolve => setTimeout(resolve, 300));
    initializingRef.current = false;

    flushSync(() => {
      setWrapperKey(prev => prev + 1);
      setMode(newMode);
      setIsTransitioning(false);
    });
  };

  return createPortal(
    <div className={`fixed inset-0 z-50 flex flex-col bg-gray-900 ${isFullscreen ? '' : 'p-4 md:p-8'}`}>
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 rounded-t-lg">
        <div className="flex items-center gap-3">
          <span className="text-white font-medium truncate max-w-md">{filename}</span>
          {canEdit && (
            <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => handleModeChange('view')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                  mode === 'view' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Eye className="w-4 h-4" />
                Görüntüle
              </button>
              <button
                onClick={() => handleModeChange('edit')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                  mode === 'edit' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
                }`}
              >
                <Edit className="w-4 h-4" />
                Düzenle
              </button>
            </div>
          )}
          {/* Active users indicator */}
          {mode === 'edit' && activeUsers.length > 0 && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUsersList(!showUsersList);
                }}
                className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                title={`${activeUsers.length} kullanıcı düzenliyor`}
              >
                <Users className="w-4 h-4" />
                <span>{activeUsers.length}</span>
              </button>
              {showUsersList && (
                <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg py-2 min-w-[200px] z-50">
                  <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-600 mb-1">
                    Dökümanı düzenleyenler:
                  </div>
                  {activeUsers.map((user) => (
                    <div key={user.id} className="px-3 py-1.5 text-sm text-white flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      {user.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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

      {/* Editor Container - minimal CSS to avoid canvas compositing issues */}
      <div className="flex-1 bg-white relative" style={{ minHeight: 0 }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Döküman yükleniyor...</span>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  destroyEditor();
                  initializingRef.current = false;
                  documentsApi.getEditorConfig(documentId, mode)
                    .then(setConfig)
                    .catch((err) => {
                      setError(err instanceof Error ? err.message : 'Döküman yüklenirken hata oluştu');
                      setLoading(false);
                    });
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Tekrar Dene
              </button>
            </div>
          </div>
        )}

        {/* Static wrapper for ONLYOFFICE - absolute positioning for reliable sizing */}
        {!isTransitioning && (
          <div key={wrapperKey} id="onlyoffice-doc-wrapper" className="absolute inset-0" />
        )}
      </div>
    </div>,
    document.body
  );
}

export default DocumentEditor;
