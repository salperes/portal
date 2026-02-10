import { RotateCcw, RotateCw, Sun, Contrast, BarChart3, Scan, Grid3X3, CircleDot, Layers } from 'lucide-react';
import type { ViewerState } from './types';
import { DEFAULT_VIEWER_STATE } from './types';
import { HistogramPanel } from './HistogramPanel';

interface ToolPanelProps {
  state: ViewerState;
  histogram: number[];
  onStateChange: (partial: Partial<ViewerState>) => void;
  pixelInfo: { x: number; y: number; value: number | null } | null;
  zoomLevel: number;
}

function Slider({
  label,
  icon,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-300">
          {icon}
          {label}
        </div>
        <span className="text-xs text-gray-500 tabular-nums w-8 text-right">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  );
}

function ToggleButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs transition-colors ${
        active
          ? 'bg-blue-600/30 text-blue-300 border border-blue-500/40'
          : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-transparent'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function ToolPanel({ state, histogram, onStateChange, pixelInfo, zoomLevel }: ToolPanelProps) {
  const handleReset = () => {
    onStateChange({ ...DEFAULT_VIEWER_STATE, activeLayer: state.activeLayer });
  };

  const handleRotate90 = () => {
    const next = ((state.rotation + 90) % 360) as 0 | 90 | 180 | 270;
    onStateChange({ rotation: next });
  };

  return (
    <div className="flex flex-col h-full bg-gray-800/50 border-l border-gray-700">
      <div className="px-3 py-2 border-b border-gray-700">
        <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Araclar</div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {/* Brightness & Contrast */}
        <div className="space-y-2.5">
          <Slider
            label="Parlaklik"
            icon={<Sun className="w-3.5 h-3.5" />}
            value={state.brightness}
            min={-100}
            max={100}
            onChange={(v) => onStateChange({ brightness: v })}
          />
          <Slider
            label="Kontrast"
            icon={<Contrast className="w-3.5 h-3.5" />}
            value={state.contrast}
            min={-100}
            max={100}
            onChange={(v) => onStateChange({ contrast: v })}
          />
        </div>

        {/* Histogram clipping */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-300">
            <BarChart3 className="w-3.5 h-3.5" />
            Histogram Kirpma
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-gray-500">Sol</span>
                <span className="text-[10px] text-gray-500 tabular-nums">{state.clipLow}</span>
              </div>
              <input
                type="range"
                min={0}
                max={254}
                value={state.clipLow}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  onStateChange({ clipLow: Math.min(v, state.clipHigh - 1) });
                }}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-gray-500">Sag</span>
                <span className="text-[10px] text-gray-500 tabular-nums">{state.clipHigh}</span>
              </div>
              <input
                type="range"
                min={1}
                max={255}
                value={state.clipHigh}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  onStateChange({ clipHigh: Math.max(v, state.clipLow + 1) });
                }}
                className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Histogram display */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-gray-300 mb-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Histogram
          </div>
          <HistogramPanel histogram={histogram} clipLow={state.clipLow} clipHigh={state.clipHigh} />
        </div>

        {/* Rotate */}
        <button
          onClick={handleRotate90}
          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-transparent transition-colors"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Dondur 90° ({state.rotation}°)
        </button>

        {/* Toggle buttons */}
        <div className="space-y-1.5">
          <ToggleButton
            label="Histogram Esitle"
            icon={<BarChart3 className="w-3.5 h-3.5" />}
            active={state.histogramEqualized}
            onClick={() => onStateChange({ histogramEqualized: !state.histogramEqualized })}
          />
          <ToggleButton
            label="Tersle (Invert)"
            icon={<CircleDot className="w-3.5 h-3.5" />}
            active={state.invert}
            onClick={() => onStateChange({ invert: !state.invert })}
          />
          <ToggleButton
            label="Deinterlace"
            icon={<Layers className="w-3.5 h-3.5" />}
            active={state.deinterlace}
            onClick={() => onStateChange({ deinterlace: !state.deinterlace })}
          />
          <ToggleButton
            label="Sobel Kenar"
            icon={<Grid3X3 className="w-3.5 h-3.5" />}
            active={state.edgeDetection === 'sobel'}
            onClick={() =>
              onStateChange({
                edgeDetection: state.edgeDetection === 'sobel' ? 'none' : 'sobel',
              })
            }
          />
          <ToggleButton
            label="Canny Kenar"
            icon={<Scan className="w-3.5 h-3.5" />}
            active={state.edgeDetection === 'canny'}
            onClick={() =>
              onStateChange({
                edgeDetection: state.edgeDetection === 'canny' ? 'none' : 'canny',
              })
            }
          />
        </div>

        {/* Reset */}
        <button
          onClick={handleReset}
          className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded text-xs text-gray-400 hover:bg-gray-700 hover:text-gray-200 border border-gray-600 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Sifirla
        </button>
      </div>

      {/* Status bar */}
      <div className="px-3 py-1.5 border-t border-gray-700 text-[10px] text-gray-500 space-y-0.5">
        <div>Zoom: {(zoomLevel * 100).toFixed(0)}%</div>
        {pixelInfo && pixelInfo.value !== null && (
          <div>
            Piksel: ({pixelInfo.x}, {pixelInfo.y}) = {pixelInfo.value}
          </div>
        )}
      </div>
    </div>
  );
}
