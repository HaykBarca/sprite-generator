'use client';

import React from 'react';
import { Crop, Maximize, Move, HelpCircle, Sparkles } from 'lucide-react';
import { CropSettings, CropMode, AlignX, AlignY } from '../lib/sprite-processor/types';

interface AutoCropPanelProps {
  settings: CropSettings;
  onChange: (settings: CropSettings) => void;
  detectedBoundsText?: string;
}

const PRESETS: Array<{ id: CropSettings['preset']; label: string }> = [
  { id: 'original', label: 'Original' },
  { id: '32x32', label: '32 × 32' },
  { id: '48x48', label: '48 × 48' },
  { id: '64x64', label: '64 × 64' },
  { id: '128x128', label: '128 × 128' },
  { id: '256x256', label: '256 × 256' },
  { id: '512x512', label: '512 × 512' },
  { id: 'custom', label: 'Custom' },
];

export const AutoCropPanel: React.FC<AutoCropPanelProps> = ({
  settings,
  onChange,
  detectedBoundsText,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur shadow-xl space-y-5">
      {/* Header with Enable Switch */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/20">
            2
          </div>
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              📐 Auto-Crop & Sizing
            </h3>
            <p className="text-xs text-slate-400">
              Crop bounding box and normalize frame dimensions for uniform game grids.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Mode and Presets */}
        <div className="space-y-4">
          {/* Crop Mode Switcher */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              Crop Mode
              <span className="text-[10px] text-indigo-400 font-normal">
                (Recommended: Animation-Relative)
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange({ ...settings, mode: 'animation-relative' })}
                className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                  settings.mode === 'animation-relative'
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="font-semibold block text-white mb-0.5">
                  Animation-Relative
                </span>
                <span className="text-[11px] text-slate-400 leading-tight block">
                  Ground-anchored. Prevents character jitter & jumping.
                </span>
              </button>

              <button
                type="button"
                onClick={() => onChange({ ...settings, mode: 'center-center' })}
                className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                  settings.mode === 'center-center'
                    ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200 shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="font-semibold block text-white mb-0.5">
                  Center-Center
                </span>
                <span className="text-[11px] text-slate-400 leading-tight block">
                  Centers each frame individually (coins, projectiles).
                </span>
              </button>
            </div>
          </div>

          {/* Size Presets */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Frame Cell Size Preset
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange({ ...settings, preset: p.id })}
                  className={`py-2 px-2 text-xs font-medium rounded-lg border transition-colors text-center ${
                    settings.preset === p.id
                      ? 'bg-indigo-600 text-white border-indigo-500 font-semibold shadow-sm'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {settings.preset === 'custom' && (
              <div className="flex items-center gap-3 mt-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Width (px)</span>
                  <input
                    type="number"
                    min={8}
                    max={2048}
                    value={settings.customWidth}
                    onChange={(e) =>
                      onChange({ ...settings, customWidth: parseInt(e.target.value) || 64 })
                    }
                    className="w-20 px-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
                <span className="text-slate-500 mt-4">×</span>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Height (px)</span>
                  <input
                    type="number"
                    min={8}
                    max={2048}
                    value={settings.customHeight}
                    onChange={(e) =>
                      onChange({ ...settings, customHeight: parseInt(e.target.value) || 64 })
                    }
                    className="w-20 px-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Alignment and Padding */}
        <div className="space-y-4">
          {/* Alignment X and Y */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Horizontal Align (X)
              </label>
              <div className="flex rounded-lg bg-slate-950/80 p-1 border border-slate-800">
                {(['left', 'center', 'right'] as AlignX[]).map((ax) => (
                  <button
                    key={ax}
                    type="button"
                    onClick={() => onChange({ ...settings, alignX: ax })}
                    className={`flex-1 py-1 text-xs capitalize rounded-md transition-colors ${
                      settings.alignX === ax
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {ax}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Vertical Align (Y)
              </label>
              <div className="flex rounded-lg bg-slate-950/80 p-1 border border-slate-800">
                {(['top', 'center', 'bottom'] as AlignY[]).map((ay) => (
                  <button
                    key={ay}
                    type="button"
                    onClick={() => onChange({ ...settings, alignY: ay })}
                    className={`flex-1 py-1 text-xs capitalize rounded-md transition-colors ${
                      settings.alignY === ay
                        ? 'bg-indigo-600 text-white font-medium'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {ay}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reduction / Padding Slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Padding / Edge Reduction</span>
              <span className="text-indigo-400 font-mono font-semibold">
                {settings.reductionPadding}px
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={32}
              value={settings.reductionPadding}
              onChange={(e) =>
                onChange({ ...settings, reductionPadding: parseInt(e.target.value) })
              }
              className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Inset margin from the cell edges so character limbs never touch the borders.
            </p>
          </div>

          {/* Detected Bounds Stat */}
          {detectedBoundsText && (
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-400">Detected Subject Envelope:</span>
              <span className="font-mono text-indigo-300 font-semibold">{detectedBoundsText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
