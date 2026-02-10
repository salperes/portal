import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2, Download, Maximize2, Minimize2, AlertTriangle, ZoomIn, ZoomOut, Scan } from 'lucide-react';
import { documentsApi } from '../../services/documentsApi';
import { parseTiff } from './xray/TiffParser';
import {
  normalizeToImageData,
  adjustBrightnessContrast,
  invertImage,
  computeHistogram,
  equalizeHistogram,
  sobelEdgeDetection,
  cannyEdgeDetection,
  clipHistogram,
  rotateImage,
  deinterlace,
} from './xray/ImageProcessor';
import { CanvasRenderer } from './xray/CanvasRenderer';
import { useCanvasInteraction } from './xray/useCanvasInteraction';
import { LayerPanel } from './xray/LayerPanel';
import { ToolPanel } from './xray/ToolPanel';
import type { ParsedTiff, ViewerState } from './xray/types';
import { DEFAULT_VIEWER_STATE } from './xray/types';

interface XRayViewerProps {
  documentId?: string;
  filename: string;
  onClose: () => void;
  /** Custom buffer provider (for file-server module). If not provided, uses documentsApi. */
  getBuffer?: () => Promise<ArrayBuffer>;
  /** Custom download handler (for file-server module). If not provided, uses documentsApi. */
  onDownload?: () => void;
}

export function XRayViewer({ documentId, filename, onClose, getBuffer, onDownload }: XRayViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const mountedRef = useRef(true);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Dosya indiriliyor...');
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tiffData, setTiffData] = useState<ParsedTiff | null>(null);
  const [viewerState, setViewerState] = useState<ViewerState>(DEFAULT_VIEWER_STATE);
  const [histogram, setHistogram] = useState<number[]>([]);
  const [pixelInfo, setPixelInfo] = useState<{ x: number; y: number; value: number | null } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Track when renderer is ready so useCanvasInteraction can bind events
  const [rendererReady, setRendererReady] = useState(false);

  // Normalized layer cache (avoids re-normalizing on every slider change)
  const normalizedCache = useRef<Map<number, ImageData>>(new Map());

  // Canvas interaction (zoom/pan) - pass actual renderer only when ready
  const { stateRef: interactionState, fitToView } = useCanvasInteraction(canvasRef, {
    renderer: rendererReady ? rendererRef.current : null,
    onPixelHover: useCallback((x: number, y: number, value: number | null) => {
      setPixelInfo({ x, y, value });
    }, []),
  });

  // Initialize: download + parse TIFF
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      try {
        setLoadingMessage('Dosya indiriliyor...');
        const buffer = getBuffer
          ? await getBuffer()
          : await documentsApi.downloadDocumentBuffer(documentId!);
        if (!mountedRef.current) return;

        if (!buffer.byteLength) {
          setError('Dosya icerigi bos');
          setLoading(false);
          return;
        }

        setLoadingMessage('TIFF ayristiriliyor...');
        const parsed = await parseTiff(buffer);
        if (!mountedRef.current) return;

        if (!parsed.layers.length) {
          setError('TIFF dosyasinda katman bulunamadi');
          setLoading(false);
          return;
        }

        setTiffData(parsed);
        setLoading(false);
      } catch (err) {
        if (!mountedRef.current) return;
        console.error('[XRayViewer] Init error:', err);
        setError(err instanceof Error ? err.message : 'TIFF dosyasi yuklenirken hata olustu');
        setLoading(false);
      }
    };

    init();

    return () => {
      mountedRef.current = false;
      normalizedCache.current.clear();
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
      setRendererReady(false);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [documentId, getBuffer]);

  // Setup canvas renderer + ResizeObserver when tiffData is ready
  useEffect(() => {
    if (!tiffData || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    // Initialize renderer
    const r = new CanvasRenderer(canvas);
    rendererRef.current = r;
    setRendererReady(true);

    // Size canvas to container
    const resize = () => {
      const rect = container.getBoundingClientRect();
      r.resize(rect.width, rect.height);
      const result = r.fitToView();
      // Sync interaction state with renderer's actual zoom/pan
      interactionState.current = result;
      setZoomLevel(r.zoom);
    };

    resize();

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resizeObserverRef.current = observer;

    return () => {
      observer.disconnect();
      resizeObserverRef.current = null;
      setRendererReady(false);
    };
  }, [tiffData, interactionState]);

  // Get normalized ImageData for active layer (cached)
  const getNormalizedImage = useCallback(
    (layerIndex: number): ImageData | null => {
      if (!tiffData) return null;
      const layer = tiffData.layers[layerIndex];
      if (!layer) return null;

      const cached = normalizedCache.current.get(layerIndex);
      if (cached) return cached;

      const normalized = normalizeToImageData(layer);
      normalizedCache.current.set(layerIndex, normalized);
      return normalized;
    },
    [tiffData],
  );

  // Process and render image whenever state changes
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!tiffData || !renderer) return;

    const baseImage = getNormalizedImage(viewerState.activeLayer);
    if (!baseImage) return;

    let processed = baseImage;

    // 1. Deinterlace (normalize interlaced scan lines)
    if (viewerState.deinterlace) {
      processed = deinterlace(processed);
    }

    // 2. Histogram clipping (window/level)
    if (viewerState.clipLow > 0 || viewerState.clipHigh < 255) {
      processed = clipHistogram(processed, viewerState.clipLow, viewerState.clipHigh);
    }

    // 3. Brightness/Contrast
    if (viewerState.brightness !== 0 || viewerState.contrast !== 0) {
      processed = adjustBrightnessContrast(processed, viewerState.brightness, viewerState.contrast);
    }

    // 4. Histogram equalization
    if (viewerState.histogramEqualized) {
      processed = equalizeHistogram(processed);
    }

    // 5. Invert
    if (viewerState.invert) {
      processed = invertImage(processed);
    }

    // 6. Edge detection
    if (viewerState.edgeDetection === 'sobel') {
      processed = sobelEdgeDetection(processed);
    } else if (viewerState.edgeDetection === 'canny') {
      processed = cannyEdgeDetection(processed);
    }

    // 7. Rotation
    if (viewerState.rotation !== 0) {
      processed = rotateImage(processed, viewerState.rotation);
    }

    // Render
    renderer.setImage(processed);
    renderer.draw();

    // Update histogram (compute from pre-rotation image for meaningful display)
    // We compute histogram before rotation so it reflects the actual pixel values
    let histSource = baseImage;
    if (viewerState.deinterlace) histSource = deinterlace(histSource);
    if (viewerState.clipLow > 0 || viewerState.clipHigh < 255) {
      histSource = clipHistogram(histSource, viewerState.clipLow, viewerState.clipHigh);
    }
    if (viewerState.brightness !== 0 || viewerState.contrast !== 0) {
      histSource = adjustBrightnessContrast(histSource, viewerState.brightness, viewerState.contrast);
    }
    setHistogram(computeHistogram(histSource));
    setZoomLevel(renderer.zoom);
  }, [tiffData, viewerState, getNormalizedImage]);

  // Handle state changes from tool panel
  const handleStateChange = useCallback((partial: Partial<ViewerState>) => {
    setViewerState((prev) => ({ ...prev, ...partial }));
  }, []);

  // Handle layer change
  const handleLayerChange = useCallback((index: number) => {
    setViewerState((prev) => ({ ...prev, activeLayer: index }));
  }, []);

  // Download original file
  const handleDownload = async () => {
    if (onDownload) {
      onDownload();
      return;
    }
    try {
      await documentsApi.downloadDocument(documentId!, filename);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '0') {
        fitToView();
        if (rendererRef.current) {
          interactionState.current = {
            zoom: rendererRef.current.zoom,
            panX: interactionState.current.panX,
            panY: interactionState.current.panY,
          };
          setZoomLevel(rendererRef.current.zoom);
        }
      } else if (e.key === '+' || e.key === '=') {
        const { zoom, panX, panY } = interactionState.current;
        const newZoom = Math.min(50, zoom * 1.2);
        rendererRef.current?.setTransform(newZoom, panX, panY);
        interactionState.current.zoom = newZoom;
        setZoomLevel(newZoom);
      } else if (e.key === '-') {
        const { zoom, panX, panY } = interactionState.current;
        const newZoom = Math.max(0.05, zoom * 0.8);
        rendererRef.current?.setTransform(newZoom, panX, panY);
        interactionState.current.zoom = newZoom;
        setZoomLevel(newZoom);
      } else if (e.key === 'r' || e.key === 'R') {
        setViewerState((prev) => ({
          ...prev,
          rotation: ((prev.rotation + 90) % 360) as 0 | 90 | 180 | 270,
        }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, fitToView, interactionState]);

  const handleFitToView = () => {
    fitToView();
    if (rendererRef.current) {
      interactionState.current = {
        zoom: rendererRef.current.zoom,
        panX: interactionState.current.panX,
        panY: interactionState.current.panY,
      };
      setZoomLevel(rendererRef.current.zoom);
    }
  };

  // Memoize layers for LayerPanel
  const layers = useMemo(() => tiffData?.layers ?? [], [tiffData]);

  return createPortal(
    <div className={`fixed inset-0 z-50 flex flex-col bg-gray-900 ${isFullscreen ? '' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Scan className="w-5 h-5 text-cyan-400" />
          <span className="text-white font-medium truncate max-w-md">{filename}</span>
          <span className="text-xs text-cyan-300 bg-cyan-900/40 px-2 py-0.5 rounded">
            X-Ray Viewer
          </span>
          {tiffData && (
            <span className="text-xs text-gray-400">
              {tiffData.width}x{tiffData.height} | {tiffData.layers.length} katman |{' '}
              {(tiffData.fileSize / (1024 * 1024)).toFixed(1)} MB
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleFitToView}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title="Ekrana Sigdir (0)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400 w-12 text-center tabular-nums">
            {(zoomLevel * 100).toFixed(0)}%
          </span>
          <button
            onClick={() => {
              const { zoom, panX, panY } = interactionState.current;
              const newZoom = Math.min(50, zoom * 1.3);
              rendererRef.current?.setTransform(newZoom, panX, panY);
              interactionState.current.zoom = newZoom;
              setZoomLevel(newZoom);
            }}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title="Yakinlastir (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-5 bg-gray-600 mx-1" />
          <button
            onClick={handleDownload}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title="Indir"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title={isFullscreen ? 'Kucult' : 'Tam Ekran'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded"
            title="Kapat (ESC)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex min-h-0">
        {/* Loading */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
              <p className="mt-2 text-gray-400 text-sm">{loadingMessage}</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
              <p className="text-red-400 mb-4">{error}</p>
              <p className="text-sm text-gray-500 mb-4">
                TIFF/XTIF dosyasi desteklenmiyor veya bozuk olabilir.
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

        {/* Viewer content */}
        {tiffData && !loading && !error && (
          <>
            {/* Left panel - Layers */}
            <div className="w-48 flex-shrink-0">
              <LayerPanel
                layers={layers}
                activeLayer={viewerState.activeLayer}
                onLayerChange={handleLayerChange}
              />
            </div>

            {/* Center - Canvas */}
            <div ref={containerRef} className="flex-1 relative bg-gray-900 min-w-0">
              <canvas
                ref={canvasRef}
                className="absolute inset-0 cursor-crosshair"
              />
            </div>

            {/* Right panel - Tools */}
            <div className="w-56 flex-shrink-0">
              <ToolPanel
                state={viewerState}
                histogram={histogram}
                onStateChange={handleStateChange}
                pixelInfo={pixelInfo}
                zoomLevel={zoomLevel}
              />
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default XRayViewer;
