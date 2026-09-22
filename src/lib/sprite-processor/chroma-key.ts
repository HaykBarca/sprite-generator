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

  for (let i = 0; i < data.length; i += 4) {
    const currentAlpha = data[i + 3];
    if (currentAlpha === 0) continue;

    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const dist = colorDistance(r, g, b, target.r, target.g, target.b);

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

  ctx.putImageData(imageData, 0, 0);
  return outputCanvas;
}
