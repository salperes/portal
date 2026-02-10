import { Layers } from 'lucide-react';
import type { TiffLayer } from './types';

interface LayerPanelProps {
  layers: TiffLayer[];
  activeLayer: number;
  onLayerChange: (index: number) => void;
}

export function LayerPanel({ layers, activeLayer, onLayerChange }: LayerPanelProps) {
  const active = layers[activeLayer];

  return (
    <div className="flex flex-col h-full bg-gray-800/50 border-r border-gray-700">
      <div className="px-3 py-2 border-b border-gray-700">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 uppercase tracking-wider">
          <Layers className="w-3.5 h-3.5" />
          Katmanlar ({layers.length})
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {layers.map((layer) => (
          <button
            key={layer.index}
            onClick={() => onLayerChange(layer.index)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
              layer.index === activeLayer
                ? 'bg-blue-600/30 text-blue-300 border-l-2 border-blue-400'
                : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200 border-l-2 border-transparent'
            }`}
          >
            <div
              className={`w-2.5 h-2.5 rounded-full border-2 flex-shrink-0 ${
                layer.index === activeLayer
                  ? 'border-blue-400 bg-blue-400'
                  : 'border-gray-500'
              }`}
            />
            <span className="truncate">{layer.name}</span>
          </button>
        ))}
      </div>

      {active && (
        <div className="px-3 py-2 border-t border-gray-700 space-y-1">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">Bilgi</div>
          <div className="text-xs text-gray-400 space-y-0.5">
            <div>{active.width} x {active.height} px</div>
            <div>{active.bitsPerSample}-bit</div>
            <div>Min: {active.min.toFixed(1)} / Max: {active.max.toFixed(1)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
