import { ChromaKeySettings, CropSettings, HaloRemoverSettings } from './types';
import { applyChromaKeyToCanvas } from './chroma-key';
import { applyHaloRemoverToCanvas } from './halo-remover';
import {
  BoundingBox,
  calculateCropParameters,
  applyCropToCanvas,
  getUnionBounds,
  getTargetDimensions,
  getNonTransparentBounds,
} from './auto-crop';

export interface PipelineSettings {
  chromaKey: ChromaKeySettings;
  haloRemover: HaloRemoverSettings;
  crop: CropSettings;
}

/**
 * Process a single canvas through Chroma Key and Halo Remover stages
 */
export function processStage1And3(
  canvas: HTMLCanvasElement,
  chromaSettings: ChromaKeySettings,
  haloSettings: HaloRemoverSettings
): HTMLCanvasElement {
  let result = canvas;

  // Step 1: Chroma Key
  if (chromaSettings.enabled) {
    result = applyChromaKeyToCanvas(result, chromaSettings);
  }

  // Step 3: Halo Remover (applied to transparent cutout)
  if (haloSettings.enabled && (haloSettings.expandPixels > 0 || haloSettings.pixelPerfect)) {
    result = applyHaloRemoverToCanvas(
      result,
      haloSettings,
      chromaSettings.enabled ? chromaSettings.targetColorHex : undefined
    );
  }

  return result;
}

/**
 * Executes the full pipeline for a list of frames:
 * 1. Chroma Key
 * 2. Halo Remover
 * 3. Auto-Crop & Alignment (animation-relative unified baseline or center-center)
 */
export function processFramesPipeline(
  sourceCanvases: HTMLCanvasElement[],
  settings: PipelineSettings
): HTMLCanvasElement[] {
  if (sourceCanvases.length === 0) return [];

  // 1. Run chroma key and halo remover on all frames
  const stage1Results = sourceCanvases.map((c) =>
    processStage1And3(c, settings.chromaKey, settings.haloRemover)
  );

  // 2. If crop is disabled, return stage 1 results directly
  if (!settings.crop.enabled) {
    return stage1Results;
  }

  // 3. Auto-crop sizing
  const first = stage1Results[0];
  const targetDims = getTargetDimensions(first.width, first.height, settings.crop);

  if (settings.crop.mode === 'center-center') {
    // Each frame cropped and centered independently
    return stage1Results.map((c) => {
      const bounds = getNonTransparentBounds(c);
      const params = calculateCropParameters(bounds, targetDims.width, targetDims.height, settings.crop);
      return applyCropToCanvas(c, params, settings.haloRemover.pixelPerfect);
    });
  }

  // Animation-Relative Mode (Ground / Baseline Anchored across entire cycle):
  // Calculate union bounding box across ALL selected animation frames
  const unionBounds = getUnionBounds(stage1Results);
  const cropParams = calculateCropParameters(
    unionBounds,
    targetDims.width,
    targetDims.height,
    settings.crop
  );

  return stage1Results.map((c) =>
    applyCropToCanvas(c, cropParams, settings.haloRemover.pixelPerfect)
  );
}
