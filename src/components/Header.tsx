'use client';

import React from 'react';
import { Sparkles, RotateCcw, HelpCircle, Film, Layers, Scissors, Wand2, Download } from 'lucide-react';

interface HeaderProps {
  onLoadDemo: () => void;
  onReset: () => void;
  hasFrames: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onLoadDemo, onReset, hasFrames }) => {
  const [showHelp, setShowHelp] = React.useState(false);

  return (
    <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Film className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white via-indigo-200 to-purple-300 bg-clip-text text-transparent">
                Spritely
              </h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Game Ready
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              AI Character Video → Game-Ready Sprite Sheets & Animations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onLoadDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 text-indigo-300 border border-indigo-500/30 transition-all shadow-sm active:scale-95"
            title="Load an 8-frame walking knight on green screen to test the tool instantly"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Load Demo Knight</span>
            <span className="sm:hidden">Demo</span>
          </button>

          {hasFrames && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
              title="Clear all frames and start over"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <button
            onClick={() => setShowHelp(true)}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 rounded-lg transition-colors"
            title="Workflow Guide"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Film className="w-5 h-5 text-indigo-400" />
              Spritely 5-Minute Workflow
            </h3>
            <p className="text-sm text-slate-400 mb-4">
              Turn any AI animation video (Grok Imagine, Runway, Midjourney, Kling, Sora) into game engine-ready sprites:
            </p>

            <div className="space-y-3 mb-6">
              <div className="flex gap-3 text-sm">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-500/20">
                  1
                </div>
                <div>
                  <span className="font-semibold text-slate-200">Ingest & Trim:</span>
                  <p className="text-xs text-slate-400">
                    Upload your video, scrub to find the walk/idle loop start and end, choose sample interval, and extract frames.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 text-sm">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-500/20">
                  2
                </div>
                <div>
                  <span className="font-semibold text-slate-200">Cull Bad Frames:</span>
                  <p className="text-xs text-slate-400">
                    Uncheck glitchy or hallucinated AI frames in the grid while watching the live looping preview.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 text-sm">
                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold shrink-0 border border-purple-500/20">
                  3
                </div>
                <div>
                  <span className="font-semibold text-slate-200">Chroma Key & Halo Remover:</span>
                  <p className="text-xs text-slate-400">
                    Pick background color with the Eyedropper. Use the Halo Remover to strip green edges and AI fringing.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 text-sm">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-emerald-500/20">
                  4
                </div>
                <div>
                  <span className="font-semibold text-slate-200">Auto-Crop & Export:</span>
                  <p className="text-xs text-slate-400">
                    Use Animation-Relative mode to anchor feet to the baseline without jittering. Export PNG sprite sheet, ZIP, or GIF!
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowHelp(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Got It!
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
