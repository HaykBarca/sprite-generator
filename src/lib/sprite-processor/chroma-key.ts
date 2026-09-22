import { ChromaKeySettings } from './types';
import { hexToRgb, colorDistance, despillPixel } from './color-utils';

/**
 * Applies chroma key background removal to a canvas
 */
export function applyChromaKeyToCanvas(
  sourceCanvas: HTMLCanvasElement,
  settings: ChromaKeySettings
): HTMLCanvasElement {
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = sourceCanvas.width;
  outputCanvas.height = sourceCanvas.height;
  const ctx = outputCanvas.getContext('2d');
  if (!ctx) return outputCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);

  if (!settings.enabled) {
    return outputCanvas;
  }

  const imageData = ctx.getImageData(0, 0, outputCanvas.width, outputCanvas.height);
  const data = imageData.data;
  const target = hexToRgb(settings.targetColorHex);
  const tolerance = settings.tolerance;
  const feather = Math.max(0, settings.feather);

  const innerTol = Math.max(0, tolerance - feather);
  const outerTol = tolerance + feather;
  const tolRange = outerTol - innerTol;

  const width = outputCanvas.width;
  const height = outputCanvas.height;

  // 1. Calculate distance for all pixels and identify border seeds
  const distances = new Float32Array(width * height);
  const reachable = new Uint8Array(width * height);
  const queue: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const dist = colorDistance(r, g, b, target.r, target.g, target.b);
      distances[y * width + x] = dist;

      // Add to queue if it's on the border and matches our loose tolerance
      if ((x === 0 || x === width - 1 || y === 0 || y === height - 1) && dist <= outerTol + 40) {
        queue.push(y * width + x);
        reachable[y * width + x] = 1;
      }
    }
  }

  // 2. Flood fill (BFS)
  let head = 0;
  const neighbors = [-1, 1, -width, width];
  while (head < queue.length) {
    const idx = queue[head++];
    const x = idx % width;
    const y = Math.floor(idx / width);

    for (const offset of neighbors) {
      const nIdx = idx + offset;
      // Bounds check
      if (
        nIdx >= 0 &&
        nIdx < width * height &&
        reachable[nIdx] === 0 &&
        distances[nIdx] <= outerTol + 40
      ) {
        // Prevent wrapping around the edges
        const nx = nIdx % width;
        if (Math.abs(nx - x) > 1) continue; 

        reachable[nIdx] = 1;
        queue.push(nIdx);
      }
    }
  }

  // 3. Apply chroma key only to reachable pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (reachable[idx] === 0) continue;

      const i = idx * 4;
      const currentAlpha = data[i + 3];
      if (currentAlpha === 0) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const dist = distances[idx];

      if (dist <= innerTol) {
        // Completely within tolerance -> fully transparent
        data[i + 3] = 0;
      } else if (dist < outerTol && tolRange > 0) {
        // Soft falloff / feather range
        const ratio = (dist - innerTol) / tolRange;
        data[i + 3] = Math.round(currentAlpha * ratio);

        if (settings.despill) {
          const cleaned = despillPixel(r, g, b, target, 0.7);
          data[i] = cleaned.r;
          data[i + 1] = cleaned.g;
          data[i + 2] = cleaned.b;
        }
      } else if (settings.despill && dist < outerTol + 40) {
        // Close to edge -> despill color bounce
        const cleaned = despillPixel(r, g, b, target, 0.5);
        data[i] = cleaned.r;
        data[i + 1] = cleaned.g;
        data[i + 2] = cleaned.b;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return outputCanvas;
}
