export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const cleanHex = hex.replace(/^#/, '');
  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16),
      g: parseInt(cleanHex[1] + cleanHex[1], 16),
      b: parseInt(cleanHex[2] + cleanHex[2], 16),
    };
  }
  return {
    r: parseInt(cleanHex.substring(0, 2), 16) || 0,
    g: parseInt(cleanHex.substring(2, 4), 16) || 0,
    b: parseInt(cleanHex.substring(4, 6), 16) || 0,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Calculates Euclidean distance in RGB color space
 */
export function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Removes color spill (like green bounce) from edges
 */
export function despillPixel(
  r: number,
  g: number,
  b: number,
  targetColor: RGB,
  strength: number = 0.5
): { r: number; g: number; b: number } {
  // Check if dominant color is green
  if (targetColor.g > targetColor.r && targetColor.g > targetColor.b) {
    // Green spill reduction
    const maxOther = Math.max(r, b);
    if (g > maxOther) {
      const excess = g - maxOther;
      const newG = g - excess * strength;
      return { r, g: Math.round(newG), b };
    }
  } else if (targetColor.b > targetColor.r && targetColor.b > targetColor.g) {
    // Blue spill reduction
    const maxOther = Math.max(r, g);
    if (b > maxOther) {
      const excess = b - maxOther;
      const newB = b - excess * strength;
      return { r, g, b: Math.round(newB) };
    }
  } else if (targetColor.r > targetColor.g && targetColor.r > targetColor.b) {
    // Red/Magenta spill reduction
    const maxOther = Math.max(g, b);
    if (r > maxOther) {
      const excess = r - maxOther;
      const newR = r - excess * strength;
      return { r: Math.round(newR), g, b };
    }
  }
  return { r, g, b };
}
