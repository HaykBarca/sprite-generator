'use client';

import React, { useState, useMemo, useCallback } from 'react';
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
  processStage1And3,
  processFramesPipeline,
} from '../lib/sprite-processor/pipeline';
import { generateSampleDemoFrames } from '../lib/sprite-processor/sample-asset';
import { getUnionBounds } from '../lib/sprite-processor/auto-crop';

export default function Home() {
  const [frames, setFrames] = useState<ExtractedFrame[]>([]);
  const [sourceName, setSourceName] = useState<string>('character');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(12);
  const [previewFrameIndex, setPreviewFrameIndex] = useState<number>(0);

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

  // Inspected frame with chroma key applied (feeds into Halo Remover preview)
  const chromaProcessedInspectedCanvas = useMemo(() => {
    if (!inspectedCanvas) return null;
    return processStage1And3(inspectedCanvas, chromaKeySettings, {
      enabled: false,
      expandPixels: 0,
      pixelPerfect: false,
      despillStrength: 0,
    });
  }, [inspectedCanvas, chromaKeySettings]);

  // Fully processed canvases for Animation Preview & Export
  const fullyProcessedCanvases = useMemo(() => {
    if (selectedFrames.length === 0) return [];
    return processFramesPipeline(
      selectedFrames.map((f) => f.canvas),
      {
        chromaKey: chromaKeySettings,
        haloRemover: haloSettings,
        crop: cropSettings,
      }
    );
  }, [selectedFrames, chromaKeySettings, haloSettings, cropSettings]);

  // Detected Union Bounds summary text
  const detectedBoundsText = useMemo(() => {
    if (selectedFrames.length === 0) return undefined;
    const stage1Canvases = selectedFrames.map((f) =>
      processStage1And3(f.canvas, chromaKeySettings, haloSettings)
    );
    const b = getUnionBounds(stage1Canvases);
    return `${b.width} × ${b.height} px (minX:${b.minX}, minY:${b.minY})`;
  }, [selectedFrames, chromaKeySettings, haloSettings]);

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
