'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Pipette, Palette, Eye, RotateCcw, Check, Sparkles } from 'lucide-react';
import { ChromaKeySettings } from '../lib/sprite-processor/types';
import { applyChromaKeyToCanvas } from '../lib/sprite-processor/chroma-key';

interface ChromaKeyPanelProps {
  settings: ChromaKeySettings;
  onChange: (settings: ChromaKeySettings) => void;
  previewCanvas: HTMLCanvasElement | null;
}

const PRESET_COLORS = [
  { name: 'Green', hex: '#00FF00', label: 'Green Screen' },
  { name: 'Magenta', hex: '#FF00FF', label: 'Magenta' },
  { name: 'Blue', hex: '#0000FF', label: 'Blue Screen' },
  { name: 'Black', hex: '#000000', label: 'Pure Black' },
  { name: 'White', hex: '#FFFFFF', label: 'Pure White' },
];

export const ChromaKeyPanel: React.FC<ChromaKeyPanelProps> = ({
  settings,
  onChange,
  previewCanvas,
}) => {
  const [isPicking, setIsPicking] = useState<boolean>(false);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Render preview canvas
  useEffect(() => {
    if (!canvasRef.current || !previewCanvas) return;
    const canvas = canvasRef.current;
    canvas.width = previewCanvas.width;
    canvas.height = previewCanvas.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showOriginal || !settings.enabled) {
      ctx.drawImage(previewCanvas, 0, 0);
    } else {
      const processed = applyChromaKeyToCanvas(previewCanvas, settings);
      ctx.drawImage(processed, 0, 0);
    }
  }, [previewCanvas, settings, showOriginal]);

  // Eyedropper click handler on canvas
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPicking || !previewCanvas) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = previewCanvas.width / rect.width;
    const scaleY = previewCanvas.height / rect.height;

    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex =
      '#' +
      [pixel[0], pixel[1], pixel[2]]
        .map((c) => c.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();

    onChange({
      ...settings,
      enabled: true,
      targetColorHex: hex,
    });
    setIsPicking(false);
  };

  // Try native EyeDropper API if available
  const triggerNativeEyeDropper = async () => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result?.sRGBHex) {
          onChange({
            ...settings,
            enabled: true,
            targetColorHex: result.sRGBHex.toUpperCase(),
          });
          return;
        }
      } catch (e) {
        // user cancelled or failed, fall back to canvas click
      }
    }
    setIsPicking(true);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur shadow-xl space-y-5">
      {/* Header with Enable Switch */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/20">
            1
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              🎨 Chroma Key Background Removal
            </h3>
            <p className="text-xs text-slate-400">
              Remove solid or green-screen backgrounds with color tolerance.
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
          {/* Key Color Picker & Presets */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Chroma Key Color
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {/* Color picker box */}
              <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-1.5 px-3">
                <input
                  type="color"
                  value={settings.targetColorHex}
                  onChange={(e) =>
                    onChange({ ...settings, targetColorHex: e.target.value.toUpperCase() })
                  }
                  className="w-7 h-7 rounded-lg border-0 cursor-pointer bg-transparent"
                />
                <input
                  type="text"
                  value={settings.targetColorHex}
                  onChange={(e) =>
                    onChange({ ...settings, targetColorHex: e.target.value.toUpperCase() })
                  }
                  className="w-20 bg-transparent text-xs font-mono text-white focus:outline-none uppercase"
                  maxLength={7}
                />
              </div>

              {/* Eyedropper Button */}
              <button
                type="button"
                onClick={triggerNativeEyeDropper}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  isPicking
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title="Click any pixel on the preview frame to pick color"
              >
                <Pipette className="w-3.5 h-3.5 text-indigo-400" />
                <span>{isPicking ? 'Click Canvas to Pick' : 'Eyedropper'}</span>
              </button>

              {/* Quick Presets */}
              <div className="flex items-center gap-1 ml-auto">
                {PRESET_COLORS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...settings,
                        enabled: true,
                        targetColorHex: p.hex,
                      })
                    }
                    className="w-6 h-6 rounded-md border border-slate-700 hover:scale-110 transition-transform relative group"
                    style={{ backgroundColor: p.hex }}
                    title={p.label}
                  >
                    {settings.targetColorHex.toUpperCase() === p.hex && (
                      <span className="absolute inset-0 flex items-center justify-center text-white mix-blend-difference">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tolerance Slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Color Tolerance</span>
              <span className="text-indigo-400 font-mono font-semibold">{settings.tolerance}</span>
            </div>
            <input
              type="range"
              min={1}
              max={150}
              value={settings.tolerance}
              onChange={(e) => onChange({ ...settings, tolerance: parseInt(e.target.value) })}
              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>Strict (1)</span>
              <span>Default (45)</span>
              <span>Aggressive (150)</span>
            </div>
          </div>

          {/* Feather / Edge Softness Slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Edge Feathering</span>
              <span className="text-indigo-400 font-mono font-semibold">{settings.feather}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={settings.feather}
              onChange={(e) => onChange({ ...settings, feather: parseInt(e.target.value) })}
              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* De-spill Toggle */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">Remove Color Spill (De-spill)</span>
              <span className="text-[11px] text-slate-400">
                Neutralizes colored reflections bounced onto character edges
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.despill}
                onChange={(e) => onChange({ ...settings, despill: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>

        {/* Live Step Preview Canvas */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="w-full aspect-square max-h-56 rounded-xl overflow-hidden border border-slate-800 relative bg-transparency-grid flex items-center justify-center">
            {isPicking && (
              <div className="absolute inset-0 bg-indigo-500/10 backdrop-blur-[1px] z-20 flex items-center justify-center pointer-events-none">
                <span className="bg-slate-900/90 text-indigo-300 text-xs px-3 py-1.5 rounded-full border border-indigo-500/30 shadow-lg font-medium animate-bounce">
                  🎯 Click pixel to sample color
                </span>
              </div>
            )}
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              className={`w-full h-full object-contain pixelated ${
                isPicking ? 'cursor-crosshair ring-2 ring-amber-400' : ''
              }`}
            />
          </div>

          {/* Compare Toggle */}
          <div className="w-full flex items-center justify-between mt-2 px-1">
            <span className="text-[11px] text-slate-400">Inspected Frame Preview</span>
            <button
              type="button"
              onMouseDown={() => setShowOriginal(true)}
              onMouseUp={() => setShowOriginal(false)}
              onMouseLeave={() => setShowOriginal(false)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              <Eye className="w-3 h-3" />
              Hold to see Original
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
