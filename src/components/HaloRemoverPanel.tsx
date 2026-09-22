'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Sparkles, Wand2, Eye, ShieldAlert, Check } from 'lucide-react';
import { HaloRemoverSettings } from '../lib/sprite-processor/types';
import { applyHaloRemoverToCanvas } from '../lib/sprite-processor/halo-remover';

interface HaloRemoverPanelProps {
  settings: HaloRemoverSettings;
  onChange: (settings: HaloRemoverSettings) => void;
  previewCanvas: HTMLCanvasElement | null;
  chromaColorHex?: string;
}

export const HaloRemoverPanel: React.FC<HaloRemoverPanelProps> = ({
  settings,
  onChange,
  previewCanvas,
  chromaColorHex,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showBefore, setShowBefore] = useState<boolean>(false);
  const [zoomEdge, setZoomEdge] = useState<boolean>(false);

  useEffect(() => {
    if (!canvasRef.current || !previewCanvas) return;
    const canvas = canvasRef.current;
    canvas.width = previewCanvas.width;
    canvas.height = previewCanvas.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showBefore || !settings.enabled) {
      ctx.drawImage(previewCanvas, 0, 0);
    } else {
      const processed = applyHaloRemoverToCanvas(previewCanvas, settings, chromaColorHex);
      ctx.drawImage(processed, 0, 0);
    }
  }, [previewCanvas, settings, chromaColorHex, showBefore]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur shadow-xl space-y-5">
      {/* Header with Enable Switch */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/20">
            3
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              ✨ Halo Remover (Final Polish)
            </h3>
            <p className="text-xs text-slate-400">
              Erode edge fringing and remove green halos left behind by AI video compression.
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => onChange({ ...settings, enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls */}
        <div className="lg:col-span-7 space-y-4">
          {/* Halo Expansion / Erosion Slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Halo Erosion Radius</span>
              <span className="text-indigo-400 font-mono font-semibold">
                {settings.expandPixels} px
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={12}
              value={settings.expandPixels}
              onChange={(e) => onChange({ ...settings, expandPixels: parseInt(e.target.value) })}
              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0 (Off)</span>
              <span>1-2px (Light Fringes)</span>
              <span>4-6px (Heavy AI Compression Halo)</span>
            </div>
          </div>

          {/* Pixel-Perfect Hard Edge Toggle */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">
                Pixel-Perfect Hard Edges
              </span>
              <span className="text-[11px] text-slate-400">
                Snaps fuzzy semi-transparent pixels to 100% binary opacity & eliminates noise
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.pixelPerfect}
                onChange={(e) => onChange({ ...settings, pixelPerfect: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {/* Despill Strength Slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Edge De-Spill Intensity</span>
              <span className="text-indigo-400 font-mono font-semibold">
                {settings.despillStrength}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.despillStrength}
              onChange={(e) =>
                onChange({ ...settings, despillStrength: parseInt(e.target.value) })
              }
              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="p-3 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
            💡 <strong>Pro-Tip:</strong> Set Halo Erosion to <strong>1px or 2px</strong> and enable{' '}
            <strong>Pixel-Perfect Hard Edges</strong> for the cleanest retro game-ready look!
          </div>
        </div>

        {/* Zoomed Edge Preview */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div
            className={`w-full aspect-square max-h-56 rounded-xl overflow-hidden border border-slate-800 relative bg-transparency-grid flex items-center justify-center`}
          >
            <div
              className={`w-full h-full flex items-center justify-center transition-transform ${
                zoomEdge ? 'scale-150' : 'scale-100'
              }`}
            >
              <canvas ref={canvasRef} className="w-full h-full object-contain pixelated" />
            </div>
          </div>

          {/* Preview helpers */}
          <div className="w-full flex items-center justify-between mt-2 px-1 text-[11px]">
            <button
              type="button"
              onClick={() => setZoomEdge(!zoomEdge)}
              className="text-slate-400 hover:text-slate-200 transition-colors"
            >
              {zoomEdge ? 'Reset Zoom' : '🔍 1.5x Edge Zoom'}
            </button>

            <button
              type="button"
              onMouseDown={() => setShowBefore(true)}
              onMouseUp={() => setShowBefore(false)}
              onMouseLeave={() => setShowBefore(false)}
              className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <Eye className="w-3 h-3" />
              Hold to see Before
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
