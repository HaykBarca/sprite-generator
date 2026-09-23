'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Header } from '../components/Header';
import { VideoUploadSection } from '../components/VideoUploadSection';
import { FrameSelectorGrid } from '../components/FrameSelectorGrid';
import { AnimationPreview } from '../components/AnimationPreview';
import { ChromaKeyPanel } from '../components/ChromaKeyPanel';
import { AutoCropPanel } from '../components/AutoCropPanel';
import { HaloRemoverPanel } from '../components/HaloRemoverPanel';
import { ExportPanel } from '../components/ExportPanel';
import {
  ExtractedFrame,
  ChromaKeySettings,
  CropSettings,
  HaloRemoverSettings,
} from '../lib/sprite-processor/types';
import {
  getChromaKeyedCanvas,
  processFramesPipeline,
  PipelineResult,
} from '../lib/sprite-processor/pipeline';
import { generateSampleDemoFrames } from '../lib/sprite-processor/sample-asset';

// Wait for slider drags to settle before reprocessing every selected frame
const PIPELINE_DEBOUNCE_MS = 150;
const EMPTY_CANVASES: HTMLCanvasElement[] = [];

export default function Home() {
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [sourceName, setSourceName] = useState<string>('character');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(12);
  const [previewFrameIndex, setPreviewFrameIndex] = useState<number>(0);
  const [pipelineResult, setPipelineResult] = useState<PipelineResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Step 1: Chroma Key Settings
  const [chromaKeySettings, setChromaKeySettings] = useState<ChromaKeySettings>({
    enabled: true,
    targetColorHex: '#00FF00',
    tolerance: 45,
    feather: 1,
    despill: true,
  });

  // Step 2: Auto-Crop & Sizing Settings
  const [cropSettings, setCropSettings] = useState<CropSettings>({
    enabled: true,
    mode: 'animation-relative',
    preset: 'original',
    customWidth: 128,
    customHeight: 128,
    reductionPadding: 4,
    alignX: 'center',
    alignY: 'bottom', // Game standard: anchor feet to baseline
  });

  // Step 3: Halo Remover Settings
  const [haloSettings, setHaloSettings] = useState<HaloRemoverSettings>({
    enabled: true,
    expandPixels: 1,
    pixelPerfect: true,
    despillStrength: 70,
  });

  // Load Demo Knight
  const handleLoadDemo = useCallback(() => {
    const demo = generateSampleDemoFrames();
    setFrames(demo);
    setPipelineResult(null);
    setSourceName('knight_walk');
    setPreviewFrameIndex(0);
    setFps(12);
    setChromaKeySettings({
      enabled: true,
      targetColorHex: '#00FF00',
      tolerance: 45,
      feather: 1,
      despill: true,
    });
    setHaloSettings({
      enabled: true,
      expandPixels: 2,
      pixelPerfect: true,
      despillStrength: 80,
    });
    setCropSettings({
      enabled: true,
      mode: 'animation-relative',
      preset: 'original',
      customWidth: 128,
      customHeight: 128,
      reductionPadding: 8,
      alignX: 'center',
      alignY: 'bottom',
    });
  }, []);

  // Reset
  const handleReset = useCallback(() => {
    setFrames([]);
    setPipelineResult(null);
    setSourceName('character');
    setPreviewFrameIndex(0);
  }, []);

  // Frame selection handlers
  const handleToggleFrame = useCallback((index: number) => {
    setFrames((prev) =>
      prev.map((f, i) => (i === index ? { ...f, selected: !f.selected } : f))
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    setFrames((prev) => prev.map((f) => ({ ...f, selected: true })));
  }, []);

  const handleDeselectAll = useCallback(() => {
    setFrames((prev) => prev.map((f) => ({ ...f, selected: false })));
  }, []);

  const handleInvertSelection = useCallback(() => {
    setFrames((prev) => prev.map((f) => ({ ...f, selected: !f.selected })));
  }, []);

  // Handle newly extracted frames
  const handleFramesExtracted = useCallback(
    (newFrames: ExtractedFrame[], name: string) => {
      setFrames(newFrames);
      setPipelineResult(null);
      setSourceName(name);
      setPreviewFrameIndex(0);
    },
    []
  );

  // Selected source canvases
  const selectedFrames = useMemo(() => {
    return frames.filter((f) => f.selected);
  }, [frames]);

  // Active frame inspected in step panels
  const inspectedCanvas = useMemo(() => {
    if (frames.length === 0) return null;
    const idx = Math.min(previewFrameIndex, frames.length - 1);
    return frames[idx]?.canvas || null;
  }, [frames, previewFrameIndex]);

  // Inspected frame with chroma key applied (feeds into Halo Remover preview).
  // Cached per frame, so the Chroma Key panel and the pipeline reuse this work.
  const chromaProcessedInspectedCanvas = useMemo(() => {
    if (!inspectedCanvas) return null;
    return getChromaKeyedCanvas(inspectedCanvas, chromaKeySettings);
  }, [inspectedCanvas, chromaKeySettings]);

  // Fully processed canvases for Animation Preview & Export. Runs debounced and
  // time-sliced outside of render so sliders stay responsive on large videos;
  // a newer run cancels any run still in progress.
  useEffect(() => {
    if (selectedFrames.length === 0) {
      setPipelineResult(null);
      setIsProcessing(false);
      return;
    }

    let cancelled = false;
    setIsProcessing(true);
    const timer = setTimeout(async () => {
      const result = await processFramesPipeline(
        selectedFrames.map((f) => f.canvas),
        {
          chromaKey: chromaKeySettings,
          haloRemover: haloSettings,
          crop: cropSettings,
        },
        () => cancelled
      );
      if (cancelled) return;
      setPipelineResult(result);
      setIsProcessing(false);
    }, PIPELINE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedFrames, chromaKeySettings, haloSettings, cropSettings]);

  const fullyProcessedCanvases = pipelineResult?.canvases ?? EMPTY_CANVASES;

  // Detected Union Bounds summary text
  const detectedBoundsText = useMemo(() => {
    if (!pipelineResult) return undefined;
    const b = pipelineResult.unionBounds;
    return `${b.width} × ${b.height} px (minX:${b.minX}, minY:${b.minY})`;
  }, [pipelineResult]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Header
        onLoadDemo={handleLoadDemo}
        onReset={handleReset}
        hasFrames={frames.length > 0}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Upload & Video Range Trimming Section */}
        <section>
          <VideoUploadSection
            onFramesExtracted={handleFramesExtracted}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        </section>

        {frames.length > 0 && (
          <>
            {/* Step 0: Frame Selection Grid */}
            <section>
              <FrameSelectorGrid
                frames={frames}
                onToggleFrame={handleToggleFrame}
                onSelectAll={handleSelectAll}
                onDeselectAll={handleDeselectAll}
                onInvertSelection={handleInvertSelection}
                previewFrameIndex={previewFrameIndex}
                onSetPreviewFrame={setPreviewFrameIndex}
              />
            </section>

            {/* Live Looping Animation Preview */}
            <section>
              <AnimationPreview
                frames={fullyProcessedCanvases}
                fps={fps}
                onFpsChange={setFps}
                selectedCount={selectedFrames.length}
                isProcessing={isProcessing}
              />
            </section>

            {/* Step 1: Chroma Key Background Removal */}
            <section>
              <ChromaKeyPanel
                settings={chromaKeySettings}
                onChange={setChromaKeySettings}
                previewCanvas={inspectedCanvas}
              />
            </section>

            {/* Step 2: Auto-Crop & Sizing */}
            <section>
              <AutoCropPanel
                settings={cropSettings}
                onChange={setCropSettings}
                detectedBoundsText={detectedBoundsText}
              />
            </section>

            {/* Step 3: Halo Remover (Final Polish) */}
            <section>
              <HaloRemoverPanel
                settings={haloSettings}
                onChange={setHaloSettings}
                previewCanvas={chromaProcessedInspectedCanvas}
                chromaColorHex={
                  chromaKeySettings.enabled
                    ? chromaKeySettings.targetColorHex
                    : undefined
                }
              />
            </section>

            {/* Step 4: Game-Ready Export & Downloads */}
            <section>
              <ExportPanel
                processedCanvases={fullyProcessedCanvases}
                sourceName={sourceName}
                fps={fps}
                isProcessing={isProcessing}
              />
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        <p>
          Spritely — AI Video to Game-Ready Sprite Generator • 100% Client-Side In-Browser Processing
        </p>
      </footer>
    </div>
  );
}
