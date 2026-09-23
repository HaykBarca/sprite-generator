'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Eye, ZoomIn } from 'lucide-react';
import { HaloRemoverSettings } from '../lib/sprite-processor/types';
import { getCachedBounds, getHaloRemovedCanvas } from '../lib/sprite-processor/pipeline';
import { ZoomViewport } from './ZoomViewport';

interface HaloRemoverPanelProps {
  settings: HaloRemoverSettings;
  onChange: (settings: HaloRemoverSettings) => void;
  previewCanvas: HTMLCanvasElement | null;
  chromaColorHex?: string;
}

const EDGE_ZOOM_PRESETS = [1, 2, 3, 5, 8];
const MAX_EDGE_ZOOM = 10;

export const HaloRemoverPanel: React.FC<HaloRemoverPanelProps> = ({
  settings,
  onChange,
  previewCanvas,
  chromaColorHex,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showBefore, setShowBefore] = useState<boolean>(false);
  const [edgeZoom, setEdgeZoom] = useState<number>(1); // 1 = whole frame fits

  // Zooming centres on the subject rather than the (often empty) frame centre.
  // Rounded so small tolerance tweaks don't yank the view after the user pans.
  const subjectCenter = useMemo(() => {
    if (!previewCanvas) return undefined;
    const b = getCachedBounds(previewCanvas);
    const round = (v: number) => Math.round(v * 50) / 50;
    return {
      x: round((b.minX + b.width / 2) / previewCanvas.width),
      y: round((b.minY + b.height / 2) / previewCanvas.height),
    };
  }, [previewCanvas]);

  useEffect(() => {
    if (!canvasRef.current || !previewCanvas) return;
    const canvas = canvasRef.current;
    if (canvas.width !== previewCanvas.width) canvas.width = previewCanvas.width;
    if (canvas.height !== previewCanvas.height) canvas.height = previewCanvas.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Cached: shares work with the animation pipeline for the same frame & settings
    const source = showBefore
      ? previewCanvas
      : getHaloRemovedCanvas(previewCanvas, settings, chromaColorHex);
    ctx.drawImage(source, 0, 0);
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
          <ZoomViewport
            canvasRef={canvasRef}
            contentWidth={previewCanvas?.width ?? 0}
            contentHeight={previewCanvas?.height ?? 0}
            zoom={edgeZoom}
            focusX={subjectCenter?.x}
            focusY={subjectCenter?.y}
            padding={8}
            className="w-full h-56 rounded-xl border border-slate-800"
          />

          {/* Edge zoom: presets + fine slider. Drag the preview to pan when zoomed. */}
          <div className="w-full mt-2 px-1 space-y-1.5 text-[11px]">
            <div className="flex items-center gap-2">
              <ZoomIn className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-400 shrink-0">Edge Zoom</span>
              <input
                type="range"
                min={1}
                max={MAX_EDGE_ZOOM}
                step={0.5}
                value={edgeZoom}
                onChange={(e) => setEdgeZoom(parseFloat(e.target.value))}
                className="flex-1 min-w-0 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                aria-label="Edge zoom"
              />
              <span className="text-indigo-400 font-mono font-semibold w-10 text-right shrink-0">
                {edgeZoom}x
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {EDGE_ZOOM_PRESETS.map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setEdgeZoom(z)}
                    className={`px-1.5 py-0.5 rounded font-mono transition-colors ${
                      edgeZoom === z
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {z === 1 ? 'Fit' : `${z}x`}
                  </button>
                ))}
              </div>

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
    </div>
  );
};
