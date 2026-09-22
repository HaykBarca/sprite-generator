import { CropSettings, CropMode, AlignX, AlignY } from './types';

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface CropParameters {
  scale: number;
  offsetX: number;
  offsetY: number;
  bounds: BoundingBox;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Finds non-transparent bounding box for a canvas
 */
export function getNonTransparentBounds(
  canvas: HTMLCanvasElement,
  alphaThreshold: number = 10
): BoundingBox {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      minX: 0,
      minY: 0,
      maxX: canvas.width - 1,
      maxY: canvas.height - 1,
      width: canvas.width,
      height: canvas.height,
    };
  }

  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  let found = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > alphaThreshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found || minX > maxX || minY > maxY) {
    return {
      minX: 0,
      minY: 0,
      maxX: width - 1,
      maxY: height - 1,
      width,
      height,
    };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Computes union bounding box across multiple canvases
 */
export function getUnionBounds(
  canvases: HTMLCanvasElement[],
  alphaThreshold: number = 10
): BoundingBox {
  if (canvases.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const c of canvases) {
    const b = getNonTransparentBounds(c, alphaThreshold);
    if (b.width > 0 && b.height > 0) {
      if (b.minX < minX) minX = b.minX;
      if (b.minY < minY) minY = b.minY;
      if (b.maxX > maxX) maxX = b.maxX;
      if (b.maxY > maxY) maxY = b.maxY;
    }
  }

  if (minX === Infinity) {
    const first = canvases[0];
    return {
      minX: 0,
      minY: 0,
      maxX: first.width - 1,
      maxY: first.height - 1,
      width: first.width,
      height: first.height,
    };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function getAlignFactorX(align: AlignX): number {
  if (align === 'left') return 0;
  if (align === 'right') return 1;
  return 0.5;
}

function getAlignFactorY(align: AlignY): number {
  if (align === 'top') return 0;
  if (align === 'bottom') return 1;
  return 0.5;
}

/**
 * Parses target dimensions from settings
 */
export function getTargetDimensions(
  sourceWidth: number,
  sourceHeight: number,
  settings: CropSettings
): { width: number; height: number } {
  if (settings.preset === 'custom') {
    return {
      width: Math.max(8, settings.customWidth || 64),
      height: Math.max(8, settings.customHeight || 64),
    };
  }

  if (settings.preset === 'original') {
    return { width: sourceWidth, height: sourceHeight };
  }

  const size = parseInt(settings.preset.split('x')[0], 10) || 64;
  return { width: size, height: size };
}

/**
 * Calculates scaling and offsets for animation-relative or unified bounding box
 */
export function calculateCropParameters(
  bounds: BoundingBox,
  targetWidth: number,
  targetHeight: number,
  settings: CropSettings
): CropParameters {
  const pad = Math.max(0, settings.reductionPadding);
  const availW = Math.max(1, targetWidth - pad * 2);
  const availH = Math.max(1, targetHeight - pad * 2);

  const scaleX = availW / bounds.width;
  const scaleY = availH / bounds.height;
  // Uniform scale to preserve aspect ratio
  const scale = Math.min(scaleX, scaleY);

  const scaledW = bounds.width * scale;
  const scaledH = bounds.height * scale;

  const fx = getAlignFactorX(settings.alignX);
  const fy = getAlignFactorY(settings.alignY);

  const innerSpaceX = targetWidth - scaledW - pad * 2;
  const innerSpaceY = targetHeight - scaledH - pad * 2;

  const targetLeft = pad + Math.max(0, innerSpaceX) * fx;
  const targetTop = pad + Math.max(0, innerSpaceY) * fy;

  const offsetX = targetLeft - bounds.minX * scale;
  const offsetY = targetTop - bounds.minY * scale;

  return {
    scale,
    offsetX,
    offsetY,
    bounds,
    canvasWidth: targetWidth,
    canvasHeight: targetHeight,
  };
}

/**
 * Applies crop/scaling to a single canvas
 */
export function applyCropToCanvas(
  sourceCanvas: HTMLCanvasElement,
  params: CropParameters,
  pixelArtSmooth: boolean = false
): HTMLCanvasElement {
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = params.canvasWidth;
  outputCanvas.height = params.canvasHeight;
  const ctx = outputCanvas.getContext('2d');
  if (!ctx) return outputCanvas;

  ctx.imageSmoothingEnabled = !pixelArtSmooth;
  if (!pixelArtSmooth) {
    ctx.imageSmoothingQuality = 'high';
  }

  ctx.drawImage(
    sourceCanvas,
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
    params.offsetX,
    params.offsetY,
    sourceCanvas.width * params.scale,
    sourceCanvas.height * params.scale
  );

  return outputCanvas;
}
