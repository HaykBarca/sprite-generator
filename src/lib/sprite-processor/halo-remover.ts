import { HaloRemoverSettings } from './types';
import { hexToRgb, despillPixel } from './color-utils';

/**
 * Fast Euclidean Distance Transform (1D squared distance)
 * Felzenszwalb / Huttenlocher algorithm, linear time O(N)
 */
function edt1d(
  f: Float64Array,
  d: Float64Array,
  v: Int32Array,
  z: Float64Array,
  n: number
) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;

  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }

  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const dx = q - v[k];
    d[q] = dx * dx + f[v[k]];
  }
}

/**
 * 2D Euclidean Distance Transform
 * Computes distance from each pixel to the nearest transparent pixel
 */
function computeDistanceToTransparency(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number = 128
): Float32Array {
  const INF = 1e9;
  const grid = new Float64Array(width * height);

  // Initialize: 0 for transparent pixels, INF for opaque
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      grid[idx] = alpha[idx * 4 + 3] < threshold ? 0 : INF;
    }
  }

  // Transform along columns
  const colF = new Float64Array(height);
  const colD = new Float64Array(height);
  const colV = new Int32Array(height);
  const colZ = new Float64Array(height + 1);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      colF[y] = grid[y * width + x];
    }
    edt1d(colF, colD, colV, colZ, height);
    for (let y = 0; y < height; y++) {
      grid[y * width + x] = colD[y];
    }
  }

  // Transform along rows
  const rowF = new Float64Array(width);
  const rowD = new Float64Array(width);
  const rowV = new Int32Array(width);
  const rowZ = new Float64Array(width + 1);

  const dist = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      rowF[x] = grid[y * width + x];
    }
    edt1d(rowF, rowD, rowV, rowZ, width);
    for (let x = 0; x < width; x++) {
      dist[y * width + x] = Math.sqrt(rowD[x]);
    }
  }

  return dist;
}

/**
 * Applies Halo Remover: erodes foreground edges by expanding transparency
 * into the fringe area, removes color cast, and optionally enforces pixel-perfect edges.
 */
export function applyHaloRemoverToCanvas(
  sourceCanvas: HTMLCanvasElement,
  settings: HaloRemoverSettings,
  chromaColorHex?: string
): HTMLCanvasElement {
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = sourceCanvas.width;
  outputCanvas.height = sourceCanvas.height;
  const ctx = outputCanvas.getContext('2d');
  if (!ctx) return outputCanvas;

  ctx.drawImage(sourceCanvas, 0, 0);

  if (!settings.enabled || settings.expandPixels <= 0) {
    // If only pixel-perfect is enabled without expansion
    if (settings.pixelPerfect) {
      applyPixelPerfectOnly(ctx, sourceCanvas.width, sourceCanvas.height);
    }
    return outputCanvas;
  }

  const { width, height } = sourceCanvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // 1. Calculate distance from every pixel to nearest transparent pixel
  const distances = computeDistanceToTransparency(data, width, height, 128);
  const expandRadius = settings.expandPixels;
  const targetColor = chromaColorHex ? hexToRgb(chromaColorHex) : { r: 0, g: 255, b: 0 };

  // 2. Expand transparency: any pixel within `expandRadius` of transparency becomes transparent
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const pixelIdx = idx * 4;
      const dist = distances[idx];

      if (dist <= expandRadius) {
        data[pixelIdx + 3] = 0; // Erase halo pixel
      } else if (settings.pixelPerfect) {
        // Snap to opaque
        data[pixelIdx + 3] = 255;
      } else if (dist < expandRadius + 1.5) {
        // Soft edge anti-aliasing if not in pixel-perfect mode
        const edgeRatio = dist - expandRadius;
        data[pixelIdx + 3] = Math.round(data[pixelIdx + 3] * Math.min(1, edgeRatio));
      }

      // Color despill on boundary
      if (
        data[pixelIdx + 3] > 0 &&
        dist < expandRadius + 3 &&
        settings.despillStrength > 0
      ) {
        const cleaned = despillPixel(
          data[pixelIdx],
          data[pixelIdx + 1],
          data[pixelIdx + 2],
          targetColor,
          settings.despillStrength / 100
        );
        data[pixelIdx] = cleaned.r;
        data[pixelIdx + 1] = cleaned.g;
        data[pixelIdx + 2] = cleaned.b;
      }
    }
  }

  // 3. Remove isolated single-pixel noise if pixel-perfect is turned on
  if (settings.pixelPerfect) {
    cleanIsolatedPixels(data, width, height);
  }

  ctx.putImageData(imageData, 0, 0);
  return outputCanvas;
}

function applyPixelPerfectOnly(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const imgData = ctx.getImageData(0, 0, width, height);
  const d = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) {
      d[i + 3] = 0;
    } else {
      d[i + 3] = 255;
    }
  }

  cleanIsolatedPixels(d, width, height);
  ctx.putImageData(imgData, 0, 0);
}

function cleanIsolatedPixels(data: Uint8ClampedArray, width: number, height: number) {
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      if (data[idx + 3] > 0) {
        let opaqueNeighbors = 0;
        const neighbors = [
          [-1, -1], [0, -1], [1, -1],
          [-1, 0],           [1, 0],
          [-1, 1],  [0, 1],  [1, 1],
        ];
        for (const [dx, dy] of neighbors) {
          const nIdx = ((y + dy) * width + (x + dx)) * 4;
          if (data[nIdx + 3] === 255) opaqueNeighbors++;
        }
        if (opaqueNeighbors < 2) {
          data[idx + 3] = 0;
        }
      }
    }
  }
}
