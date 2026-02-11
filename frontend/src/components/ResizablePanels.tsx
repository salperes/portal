import React, { useState, useRef, useCallback } from 'react';

interface ResizablePanelsProps {
  left: React.ReactNode;
  right: React.ReactNode;
  storageKey: string;
  defaultLeftWidth?: number;
  minLeftWidth?: number;
  maxLeftWidth?: number;
  leftRef?: React.Ref<HTMLDivElement>;
  className?: string;
}

export function ResizablePanels({
  left,
  right,
  storageKey,
  defaultLeftWidth = 25,
  minLeftWidth = 15,
  maxLeftWidth = 50,
  leftRef,
  className = '',
}: ResizablePanelsProps) {
  const [leftWidth, setLeftWidth] = useState(() => {
    try {
      const saved = localStorage.getItem(`panel-width-${storageKey}`);
      if (saved) {
        const val = parseFloat(saved);
        if (val >= minLeftWidth && val <= maxLeftWidth) return val;
      }
    } catch {}
    return defaultLeftWidth;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const widthRef = useRef(leftWidth);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const onMove = (ev: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      const clamped = Math.min(maxLeftWidth, Math.max(minLeftWidth, pct));
      widthRef.current = clamped;
      setLeftWidth(clamped);
    };

    const onUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try {
        localStorage.setItem(`panel-width-${storageKey}`, String(Math.round(widthRef.current)));
      } catch {}
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [storageKey, minLeftWidth, maxLeftWidth]);

  return (
    <div ref={containerRef} className={`flex-1 min-h-0 flex mt-4 ${className}`}>
      {/* Left panel - hidden on mobile */}
      <div
        ref={leftRef}
        className="hidden lg:block min-h-0 overflow-hidden flex-shrink-0"
        style={{ width: `${leftWidth}%` }}
      >
        {left}
      </div>

      {/* Draggable divider */}
      <div
        className="hidden lg:flex items-center justify-center flex-shrink-0 cursor-col-resize group px-1"
        onMouseDown={handleMouseDown}
      >
        <div className="w-0.5 h-8 rounded-full bg-gray-300 dark:bg-gray-600 transition-colors group-hover:bg-blue-400 group-active:bg-blue-500" />
      </div>

      {/* Right panel - full width on mobile */}
      <div className="flex-1 min-h-0 min-w-0">
        {right}
      </div>
    </div>
  );
}
