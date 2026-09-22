'use client';

import React from 'react';
import { Check, CheckSquare, Square, RefreshCw, Eye } from 'lucide-react';
import { ExtractedFrame } from '../lib/sprite-processor/types';

interface FrameSelectorGridProps {
  frames: ExtractedFrame[];
  onToggleFrame: (index: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onInvertSelection: () => void;
  previewFrameIndex: number;
  onSetPreviewFrame: (index: number) => void;
}

export const FrameSelectorGrid: React.FC<FrameSelectorGridProps> = ({
  frames,
  onToggleFrame,
  onSelectAll,
  onDeselectAll,
  onInvertSelection,
  previewFrameIndex,
  onSetPreviewFrame,
}) => {
  const selectedCount = frames.filter((f) => f.selected).length;

  if (frames.length === 0) return null;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur shadow-xl space-y-4">
      {/* Header with Title and Batch Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            Select Frames to Export
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
              {selectedCount} / {frames.length} selected
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Click frames to include or exclude AI glitches and unwanted poses.
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={onSelectAll}
            className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700/60"
          >
            Select All
          </button>
          <button
            onClick={onDeselectAll}
            className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700/60"
          >
            Deselect All
          </button>
          <button
            onClick={onInvertSelection}
            className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors border border-slate-700/60 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Invert
          </button>
        </div>
      </div>

      {/* Grid of Frames */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 max-h-80 overflow-y-auto pr-1">
        {frames.map((frame, index) => {
          const isSelected = frame.selected;
          const isInspected = previewFrameIndex === index;

          return (
            <div
              key={frame.id}
              onClick={() => onToggleFrame(index)}
              className={`group relative rounded-xl overflow-hidden border cursor-pointer transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-slate-800/80 shadow-md shadow-indigo-500/10 scale-[1.0]'
                  : 'border-slate-800 bg-slate-950/50 opacity-40 hover:opacity-75'
              } ${isInspected ? 'ring-2 ring-purple-400' : ''}`}
            >
              {/* Thumbnail */}
              <div className="aspect-square w-full bg-transparency-grid flex items-center justify-center p-1 overflow-hidden">
                <img
                  src={frame.thumbnailUrl}
                  alt={`Frame ${frame.frameIndex}`}
                  className="w-full h-full object-contain pixelated transition-transform group-hover:scale-105"
                />
              </div>

              {/* Badges / Overlay */}
              <div className="p-1.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <span className="font-mono text-slate-300">#{index + 1}</span>
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                    isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-600'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </div>

              {/* Quick Inspect Preview button on hover */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetPreviewFrame(index);
                }}
                className="absolute top-1 right-1 p-1 bg-slate-900/80 hover:bg-purple-600 text-slate-300 hover:text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                title="Inspect in Steps preview"
              >
                <Eye className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
