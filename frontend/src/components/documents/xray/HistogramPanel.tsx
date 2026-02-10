import { useEffect, useRef } from 'react';

interface HistogramPanelProps {
  histogram: number[];
  clipLow?: number;
  clipHigh?: number;
  className?: string;
}

export function HistogramPanel({ histogram, clipLow = 0, clipHigh = 255, className = '' }: HistogramPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !histogram.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const maxVal = Math.max(...histogram);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    if (maxVal === 0) return;

    const barWidth = w / 256;

    // Draw clipped region overlay (dimmed)
    if (clipLow > 0 || clipHigh < 255) {
      ctx.fillStyle = 'rgba(255, 100, 50, 0.08)';
      ctx.fillRect(0, 0, clipLow * barWidth, h);
      ctx.fillRect(clipHigh * barWidth, 0, w - clipHigh * barWidth, h);
    }

    // Draw histogram bars
    for (let i = 0; i < 256; i++) {
      const barHeight = (histogram[i] / maxVal) * (h - 4);
      const x = i * barWidth;

      const isClipped = i < clipLow || i > clipHigh;
      if (isClipped) {
        ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
      } else {
        const intensity = i / 255;
        const r = Math.round(30 + intensity * 100);
        const g = Math.round(80 + intensity * 140);
        const b = Math.round(180 + intensity * 75);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
      }

      ctx.fillRect(x, h - barHeight, barWidth + 0.5, barHeight);
    }

    // Draw clip markers
    if (clipLow > 0) {
      const x = clipLow * barWidth;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    if (clipHigh < 255) {
      const x = clipHigh * barWidth;
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Draw axis lines
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for (const frac of [0.25, 0.5, 0.75]) {
      const y = h - h * frac;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }, [histogram, clipLow, clipHigh]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        width={240}
        height={80}
        className="w-full rounded border border-gray-600"
      />
      <div className="flex justify-between text-[10px] text-gray-500 mt-0.5 px-0.5">
        <span>0</span>
        <span>128</span>
        <span>255</span>
      </div>
    </div>
  );
}
