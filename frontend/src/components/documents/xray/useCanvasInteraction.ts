import { useEffect, useRef, useCallback } from 'react';
import type { CanvasRenderer } from './CanvasRenderer';

interface InteractionState {
  zoom: number;
  panX: number;
  panY: number;
}

interface UseCanvasInteractionOptions {
  renderer: CanvasRenderer | null;
  onPixelHover?: (x: number, y: number, value: number | null) => void;
}

export function useCanvasInteraction(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  { renderer, onPixelHover }: UseCanvasInteractionOptions,
) {
  const stateRef = useRef<InteractionState>({ zoom: 1, panX: 0, panY: 0 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const syncState = useCallback((zoom: number, panX: number, panY: number) => {
    stateRef.current = { zoom, panX, panY };
    renderer?.setTransform(zoom, panX, panY);
  }, [renderer]);

  const fitToView = useCallback(() => {
    if (!renderer) return;
    const result = renderer.fitToView();
    stateRef.current = result;
  }, [renderer]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !renderer) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { zoom, panX, panY } = stateRef.current;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Zoom factor
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.05, Math.min(50, zoom * delta));

      // Zoom centered on cursor
      const newPanX = mouseX - (mouseX - panX) * (newZoom / zoom);
      const newPanY = mouseY - (mouseY - panY) * (newZoom / zoom);

      syncState(newZoom, newPanX, newPanY);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) { // left button
        isDragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Pixel info on hover
      if (onPixelHover) {
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const imgCoords = renderer.canvasToImage(canvasX, canvasY);
        const value = renderer.getPixelValue(imgCoords.x, imgCoords.y);
        onPixelHover(imgCoords.x, imgCoords.y, value);
      }

      if (!isDragging.current) return;

      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };

      const { zoom, panX, panY } = stateRef.current;
      syncState(zoom, panX + dx, panY + dy);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      canvas.style.cursor = 'crosshair';
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [canvasRef, renderer, syncState, onPixelHover]);

  return { stateRef, fitToView };
}
