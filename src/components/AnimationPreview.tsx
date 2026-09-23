'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, ZoomIn, Grid, Sparkles, Loader2 } from 'lucide-react';
import { ZoomViewport } from './ZoomViewport';

interface AnimationPreviewProps {
  frames: HTMLCanvasElement[];
  fps: number;
  onFpsChange: (fps: number) => void;
  selectedCount: number;
  isProcessing?: boolean;
}

const ZOOM_LEVELS = [1, 2, 3, 4];

export const AnimationPreview: React.FC<AnimationPreviewProps> = ({
  frames,
  fps,
  onFpsChange,
  selectedCount,
  isProcessing = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1); // 1 = fit whole frame
  const [bgStyle, setBgStyle] = useState<'checker' | 'dark' | 'light' | 'green' | 'magenta'>('checker');
  const [showGuides, setShowGuides] = useState<boolean>(true);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;

    const interval = 1000 / fps;
    const timer = setInterval(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % frames.length);
    }, interval);

    return () => clearInterval(timer);
  }, [isPlaying, fps, frames.length]);

  // Ensure currentFrameIdx is valid
  useEffect(() => {
    if (frames.length === 0) return;
    if (currentFrameIdx >= frames.length) {
      setCurrentFrameIdx(0);
    }
  }, [frames.length, currentFrameIdx]);

  // Render active frame to the preview canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;

    const frame = frames[currentFrameIdx % frames.length];
    if (!frame) return;

    // Resizing a canvas reallocates it, so only do it when the size changes
    if (canvas.width !== frame.width) canvas.width = frame.width;
    if (canvas.height !== frame.height) canvas.height = frame.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(frame, 0, 0);
  }, [frames, currentFrameIdx]);

  const stepBackward = () => {
    if (frames.length === 0) return;
    setIsPlaying(false);
    setCurrentFrameIdx((prev) => (prev === 0 ? frames.length - 1 : prev - 1));
  };

  const stepForward = () => {
    if (frames.length === 0) return;
    setIsPlaying(false);
    setCurrentFrameIdx((prev) => (prev + 1) % frames.length);
  };

  const bgClasses = {
    checker: 'bg-transparency-grid',
    dark: 'bg-slate-950',
    light: 'bg-white',
    green: 'bg-[#00FF00]',
    magenta: 'bg-[#FF00FF]',
  };

  // Keep the panel mounted while the first batch of frames is being processed
  if (frames.length === 0 && !isProcessing) return null;

  const activeFrame = frames.length > 0 ? frames[currentFrameIdx % frames.length] : undefined;

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 backdrop-blur shadow-xl space-y-4">
      {/* Title & Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Live Animation Preview
          </h3>
          <p className="text-xs text-slate-400">
            Real-time looping preview of your processed sprite sequence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isProcessing && (
            <span className="text-xs text-indigo-300 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Updating…
            </span>
          )}
          <span className="text-xs font-mono text-slate-400">
            Frame <strong className="text-indigo-400">{frames.length > 0 ? currentFrameIdx + 1 : 0}</strong> / {frames.length}
          </span>
        </div>
      </div>

      {/* Main Canvas Display: 1x fits the whole frame, higher zoom levels drag to pan */}
      <ZoomViewport
        canvasRef={canvasRef}
        contentWidth={activeFrame?.width ?? 0}
        contentHeight={activeFrame?.height ?? 0}
        zoom={zoom}
        className="w-full h-72 sm:h-96 rounded-xl border border-slate-800"
        backgroundClassName={`${bgClasses[bgStyle]} transition-colors`}
        canvasClassName="shadow-2xl"
        canvasOverlay={
          showGuides && (
            <div className="absolute inset-0 pointer-events-none">
              {/* Center vertical */}
              <div className="absolute top-0 bottom-0 left-1/2 border-l border-dashed border-indigo-500/60" />
              {/* Baseline (bottom 10%) */}
              <div className="absolute left-0 right-0 top-[90%] border-t border-dashed border-red-500/70" />
            </div>
          )
        }
      >
        {/* Top-Right Background and Guide Toggles */}
        <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800/90 rounded-lg p-1 shadow-lg backdrop-blur">
          <button
            onClick={() => setBgStyle('checker')}
            className={`w-5 h-5 rounded border ${
              bgStyle === 'checker' ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-700'
            } bg-transparency-grid`}
            title="Transparent Checkerboard"
          />
          <button
            onClick={() => setBgStyle('dark')}
            className={`w-5 h-5 rounded border ${
              bgStyle === 'dark' ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-700'
            } bg-slate-950`}
            title="Dark Background"
          />
          <button
            onClick={() => setBgStyle('light')}
            className={`w-5 h-5 rounded border ${
              bgStyle === 'light' ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-700'
            } bg-white`}
            title="Light Background"
          />
          <button
            onClick={() => setBgStyle('green')}
            className={`w-5 h-5 rounded border ${
              bgStyle === 'green' ? 'border-indigo-400 ring-1 ring-indigo-400' : 'border-slate-700'
            } bg-[#00FF00]`}
            title="Green Screen Check"
          />

          <div className="w-[1px] h-4 bg-slate-700 mx-1" />

          <button
            onClick={() => setShowGuides(!showGuides)}
            className={`p-1 rounded text-xs transition-colors ${
              showGuides ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Baseline and Center Guides"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>
        </div>
      </ZoomViewport>

      {/* Playback Controls & Settings Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        {/* Play / Step Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={stepBackward}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
            title="Previous Frame"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-1.5 transition-colors shadow-sm active:scale-95"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Play
              </>
            )}
          </button>

          <button
            onClick={stepForward}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/60"
            title="Next Frame"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* FPS Control */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Speed:</span>
          <div className="flex items-center gap-1">
            {[8, 12, 16, 24].map((preset) => (
              <button
                key={preset}
                onClick={() => onFpsChange(preset)}
                className={`px-2 py-1 rounded-lg text-xs font-mono transition-colors ${
                  fps === preset
                    ? 'bg-indigo-600 text-white font-bold shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 ml-1">
            <input
              type="range"
              min={1}
              max={60}
              value={fps}
              onChange={(e) => onFpsChange(parseInt(e.target.value))}
              className="w-20 accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="text-xs font-mono text-indigo-400 w-10 text-right">{fps} FPS</span>
          </div>
        </div>

        {/* Zoom Slider */}
        <div className="flex items-center gap-2">
          <ZoomIn className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400">Zoom:</span>
          <div className="flex items-center gap-1">
            {ZOOM_LEVELS.map((z) => (
              <button
                key={z}
                onClick={() => setZoom(z)}
                className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                  zoom === z ? 'bg-purple-600 text-white font-bold' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {z === 1 ? 'Fit' : `${z}x`}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
