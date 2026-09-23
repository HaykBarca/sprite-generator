import { ChromaKeySettings, CropSettings, HaloRemoverSettings } from './types';
import { applyChromaKeyToCanvas } from './chroma-key';
import { applyHaloRemoverToCanvas } from './halo-remover';
import {
  BoundingBox,
  calculateCropParameters,
  applyCropToCanvas,
  getTargetDimensions,
  getNonTransparentBounds,
} from './auto-crop';

export interface PipelineSettings {
  chromaKey: ChromaKeySettings;
  haloRemover: HaloRemoverSettings;
  crop: CropSettings;
}

export interface PipelineResult {
  canvases: HTMLCanvasElement[];
  /** Union of the subject bounds across all frames, before cropping */
  unionBounds: BoundingBox;
}

/**
 * Single-entry caches keyed by input canvas. Stage outputs are never mutated,
 * so re-running a stage with unchanged settings is free, and tweaking a later
 * stage (e.g. crop) never re-runs an earlier one (e.g. chroma key).
 */
interface CacheEntry {
  key: string;
  result: HTMLCanvasElement;
}
const chromaCache = new WeakMap<HTMLCanvasElement, CacheEntry>();
const haloCache = new WeakMap<HTMLCanvasElement, CacheEntry>();
const boundsCache = new WeakMap<HTMLCanvasElement, BoundingBox>();

function isHaloActive(settings: HaloRemoverSettings): boolean {
  return settings.enabled && (settings.expandPixels > 0 || settings.pixelPerfect);
}

/**
 * Step 1: Chroma key (cached per source canvas)
 */
export function getChromaKeyedCanvas(
  canvas: HTMLCanvasElement,
  settings: ChromaKeySettings
): HTMLCanvasElement {
  if (!settings.enabled) return canvas;

  const key = [
    settings.targetColorHex.toUpperCase(),
    settings.tolerance,
    settings.feather,
    settings.despill,
  ].join('|');
  const hit = chromaCache.get(canvas);
  if (hit && hit.key === key) return hit.result;

  const result = applyChromaKeyToCanvas(canvas, settings);
  chromaCache.set(canvas, { key, result });
  return result;
}

/**
 * Step 3: Halo remover (cached per chroma-keyed canvas)
 */
export function getHaloRemovedCanvas(
  canvas: HTMLCanvasElement,
  settings: HaloRemoverSettings,
  chromaColorHex?: string
): HTMLCanvasElement {
  if (!isHaloActive(settings)) return canvas;

  const key = [
    settings.expandPixels,
    settings.pixelPerfect,
    settings.despillStrength,
    chromaColorHex?.toUpperCase() ?? '',
  ].join('|');
  const hit = haloCache.get(canvas);
  if (hit && hit.key === key) return hit.result;

  const result = applyHaloRemoverToCanvas(canvas, settings, chromaColorHex);
  haloCache.set(canvas, { key, result });
  return result;
}

/**
 * Non-transparent bounds of a stage output (cached; stage outputs are immutable)
 */
export function getCachedBounds(canvas: HTMLCanvasElement): BoundingBox {
  let bounds = boundsCache.get(canvas);
  if (!bounds) {
    bounds = getNonTransparentBounds(canvas);
    boundsCache.set(canvas, bounds);
  }
  return bounds;
}

function unionOfBounds(list: BoundingBox[], fallback: HTMLCanvasElement): BoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of list) {
    if (b.width > 0 && b.height > 0) {
      if (b.minX < minX) minX = b.minX;
      if (b.minY < minY) minY = b.minY;
      if (b.maxX > maxX) maxX = b.maxX;
      if (b.maxY > maxY) maxY = b.maxY;
    }
  }

  if (minX === Infinity) {
    return {
      minX: 0,
      minY: 0,
      maxX: fallback.width - 1,
      maxY: fallback.height - 1,
      width: fallback.width,
      height: fallback.height,
    };
  }

  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/**
 * Process a single canvas through Chroma Key and Halo Remover stages
 */
export function processStage1And3(
  canvas: HTMLCanvasElement,
  chromaSettings: ChromaKeySettings,
  haloSettings: HaloRemoverSettings
): HTMLCanvasElement {
  const keyed = getChromaKeyedCanvas(canvas, chromaSettings);
  return getHaloRemovedCanvas(
    keyed,
    haloSettings,
    chromaSettings.enabled ? chromaSettings.targetColorHex : undefined
  );
}

/**
 * Auto-Crop & Alignment on already keyed/defringed frames
 */
function cropFrames(stage1Results: HTMLCanvasElement[], settings: PipelineSettings): PipelineResult {
  const perFrameBounds = stage1Results.map(getCachedBounds);
  const unionBounds = unionOfBounds(perFrameBounds, stage1Results[0]);

  if (!settings.crop.enabled) {
    return { canvases: stage1Results, unionBounds };
  }

  const first = stage1Results[0];
  const targetDims = getTargetDimensions(first.width, first.height, settings.crop);
  const pixelPerfect = settings.haloRemover.pixelPerfect;

  if (settings.crop.mode === 'center-center') {
    // Each frame cropped and centered independently
    const canvases = stage1Results.map((c, i) => {
      const params = calculateCropParameters(
        perFrameBounds[i],
        targetDims.width,
        targetDims.height,
        settings.crop
      );
      return applyCropToCanvas(c, params, pixelPerfect);
    });
    return { canvases, unionBounds };
  }

  // Animation-Relative Mode (Ground / Baseline Anchored across entire cycle):
  // one crop derived from the union bounding box across ALL selected frames
  const cropParams = calculateCropParameters(
    unionBounds,
    targetDims.width,
    targetDims.height,
    settings.crop
  );
  const canvases = stage1Results.map((c) => applyCropToCanvas(c, cropParams, pixelPerfect));
  return { canvases, unionBounds };
}

const yieldToBrowser = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Executes the full pipeline for a list of frames:
 * 1. Chroma Key
 * 2. Halo Remover
 * 3. Auto-Crop & Alignment (animation-relative unified baseline or center-center)
 *
 * Time-sliced so the page stays responsive while large frames are processed.
 * Resolves to null if `isCancelled` flips to true mid-run (settings changed,
 * a newer run supersedes this one).
 */
export async function processFramesPipeline(
  sourceCanvases: HTMLCanvasElement[],
  settings: PipelineSettings,
  isCancelled: () => boolean
): Promise<PipelineResult | null> {
  if (sourceCanvases.length === 0) return null;

  const SLICE_MS = 12;
  let sliceStart = performance.now();
  const stage1Results: HTMLCanvasElement[] = [];

  for (const c of sourceCanvases) {
    stage1Results.push(processStage1And3(c, settings.chromaKey, settings.haloRemover));
    if (performance.now() - sliceStart > SLICE_MS) {
      await yieldToBrowser();
      if (isCancelled()) return null;
      sliceStart = performance.now();
    }
  }

  return cropFrames(stage1Results, settings);
}
