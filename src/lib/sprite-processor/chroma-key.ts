import { ChromaKeySettings } from './types';
import { hexToRgb, despillPixel } from './color-utils';

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
  // willReadFrequently keeps the backing store on the CPU so getImageData
  // doesn't force a slow GPU readback on every frame.
  const ctx = outputCanvas.getContext('2d', { willReadFrequently: true });
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
  const floodTol = outerTol + 40;

  const width = outputCanvas.width;
  const height = outputCanvas.height;
  const n = width * height;

  // 1. Calculate distance for all pixels
  const distances = new Float32Array(n);
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const dr = data[i] - target.r;
    const dg = data[i + 1] - target.g;
    const db = data[i + 2] - target.b;
    distances[p] = Math.sqrt(dr * dr + dg * dg + db * db);
  }

  // 2. Seed flood fill from border pixels that match our loose tolerance
  const reachable = new Uint8Array(n);
  const queue = new Int32Array(n);
  let tail = 0;
  const seed = (idx: number) => {
    if (reachable[idx] === 0 && distances[idx] <= floodTol) {
      reachable[idx] = 1;
      queue[tail++] = idx;
    }
  };
  for (let x = 0; x < width; x++) {
    seed(x);
    seed((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    seed(y * width);
    seed(y * width + width - 1);
  }

  // 3. Flood fill (BFS), 4-connected
  let head = 0;
  while (head < tail) {
    const idx = queue[head++];
    const x = idx % width;
    if (x > 0) seed(idx - 1);
    if (x < width - 1) seed(idx + 1);
    if (idx >= width) seed(idx - width);
    if (idx < n - width) seed(idx + width);
  }

  // 4. Apply chroma key only to reachable pixels
  for (let idx = 0; idx < n; idx++) {
    if (reachable[idx] === 0) continue;

    const i = idx * 4;
    const currentAlpha = data[i + 3];
    if (currentAlpha === 0) continue;

    const dist = distances[idx];

    if (dist <= innerTol) {
      // Completely within tolerance -> fully transparent
      data[i + 3] = 0;
    } else if (dist < outerTol && tolRange > 0) {
      // Soft falloff / feather range
      const ratio = (dist - innerTol) / tolRange;
      data[i + 3] = Math.round(currentAlpha * ratio);

      if (settings.despill) {
        const cleaned = despillPixel(data[i], data[i + 1], data[i + 2], target, 0.7);
        data[i] = cleaned.r;
        data[i + 1] = cleaned.g;
        data[i + 2] = cleaned.b;
      }
    } else if (settings.despill && dist < floodTol) {
      // Close to edge -> despill color bounce
      const cleaned = despillPixel(data[i], data[i + 1], data[i + 2], target, 0.5);
      data[i] = cleaned.r;
      data[i + 1] = cleaned.g;
      data[i + 2] = cleaned.b;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return outputCanvas;
}
