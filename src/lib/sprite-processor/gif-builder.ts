/**
 * Pure TypeScript in-browser GIF89a encoder
 * Supports 256-color palette quantization, transparency, and looping
 */

export interface GifFrameOptions {
  delayMs: number;
}

export function createGif(
  canvases: HTMLCanvasElement[],
  fps: number = 12
): Blob {
  const width = canvases[0].width;
  const height = canvases[0].height;
  const delayHundredths = Math.max(2, Math.round(100 / fps));

  const bytes: number[] = [];

  // Helper to write bytes
  const writeByte = (b: number) => bytes.push(b & 0xff);
  const writeWord = (w: number) => {
    bytes.push(w & 0xff);
    bytes.push((w >> 8) & 0xff);
  };
  const writeString = (s: string) => {
    for (let i = 0; i < s.length; i++) writeByte(s.charCodeAt(i));
  };

  // 1. GIF Header
  writeString('GIF89a');

  // 2. Logical Screen Descriptor
  writeWord(width);
  writeWord(height);
  // Add a dummy Global Color Table (GCT) to fix compatibility with strict parsers
  writeByte(0xf7); // 1 111 0 111 -> GCT present, 8bpp, 256 colors
  writeByte(0);    // Background color index
  writeByte(0);    // Pixel aspect ratio

  // 3. Global Color Table (dummy black)
  for (let i = 0; i < 256 * 3; i++) writeByte(0);

  // 4. Netscape 2.0 Application Extension (Looping)
  writeByte(0x21); // Extension Introducer
  writeByte(0xff); // Application Extension Label
  writeByte(11);   // Block Size
  writeString('NETSCAPE2.0');
  writeByte(3);    // Sub-block size
  writeByte(1);    // Loop sub-block ID
  writeWord(0);    // Repeat count (0 = infinite)
  writeByte(0);    // Block Terminator

  // 5. Encode each frame
  for (const canvas of canvases) {
    encodeFrame(canvas, delayHundredths, bytes, writeByte, writeWord, writeString);
  }

  // 6. Trailer
  writeByte(0x3b);

  return new Blob([new Uint8Array(bytes)], { type: 'image/gif' });
}

function encodeFrame(
  canvas: HTMLCanvasElement,
  delay: number,
  bytes: number[],
  writeByte: (b: number) => void,
  writeWord: (w: number) => void,
  writeString: (s: string) => void
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Frequency-weighted median-cut quantization to 255 colors + 1 transparent.
  // Building the palette globally (rather than greedily assigning slots in
  // scan order) avoids scan-order-dependent color drift on frames with more
  // than 255 distinct colors (gradients, anti-aliasing, shading).
  const transparentIndex = 0;
  const { palette, colorToIndex } = buildPalette(data);

  const indexedPixels = new Uint8Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    const pixelIdx = i / 4;
    const a = data[i + 3];

    if (a < 128) {
      indexedPixels[pixelIdx] = transparentIndex;
      continue;
    }

    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    indexedPixels[pixelIdx] = colorToIndex.get(key)!;
  }

  // Pad palette to power of 2 (up to 256)
  let paletteSize = 2;
  while (paletteSize < palette.length && paletteSize < 256) paletteSize <<= 1;
  while (palette.length < paletteSize) palette.push([0, 0, 0]);

  const colorTableBits = Math.max(1, Math.ceil(Math.log2(paletteSize)));

  // Graphic Control Extension
  writeByte(0x21); // Extension Introducer
  writeByte(0xf9); // Graphic Control Label
  writeByte(4);    // Byte size
  writeByte(0x09); // Disposal Method = 2 (Restore to background), Transparent color flag = 1
  writeWord(delay);
  writeByte(transparentIndex);
  writeByte(0);    // Block terminator

  // Image Descriptor
  writeByte(0x2c); // Image Separator
  writeWord(0);    // Left
  writeWord(0);    // Top
  writeWord(width);
  writeWord(height);
  // Local Color Table Flag (1), Interlace (0), Sort (0), Size (colorTableBits - 1)
  writeByte(0x80 | (colorTableBits - 1));

  // Local Color Table
  for (let i = 0; i < paletteSize; i++) {
    const col = palette[i];
    writeByte(col[0]);
    writeByte(col[1]);
    writeByte(col[2]);
  }

  // LZW Compression
  const minCodeSize = Math.max(2, colorTableBits);
  writeByte(minCodeSize);

  lzwEncode(indexedPixels, minCodeSize, writeByte);
  writeByte(0); // Sub-block terminator
}

interface ColorBox {
  r: number;
  g: number;
  b: number;
  count: number;
}

/**
 * Builds a 255-color palette (index 0 reserved for transparency) from the
 * frame's opaque pixels using frequency-weighted median-cut quantization,
 * and a lookup from exact RGB key to palette index for every color present.
 */
function buildPalette(data: Uint8ClampedArray): {
  palette: [number, number, number][];
  colorToIndex: Map<number, number>;
} {
  const maxColors = 255;

  const freq = new Map<number, number>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const key = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
    freq.set(key, (freq.get(key) || 0) + 1);
  }

  const colors: ColorBox[] = [];
  freq.forEach((count, key) => {
    colors.push({ r: (key >> 16) & 0xff, g: (key >> 8) & 0xff, b: key & 0xff, count });
  });

  const boxes: ColorBox[][] =
    colors.length <= maxColors ? colors.map((c) => [c]) : medianCut(colors, maxColors);

  const palette: [number, number, number][] = [[0, 0, 0]]; // index 0 = transparent placeholder
  const colorToIndex = new Map<number, number>();

  for (const box of boxes) {
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let totalCount = 0;
    for (const c of box) {
      totalR += c.r * c.count;
      totalG += c.g * c.count;
      totalB += c.b * c.count;
      totalCount += c.count;
    }
    const avgR = Math.round(totalR / totalCount);
    const avgG = Math.round(totalG / totalCount);
    const avgB = Math.round(totalB / totalCount);

    const index = palette.length;
    palette.push([avgR, avgG, avgB]);
    for (const c of box) {
      colorToIndex.set((c.r << 16) | (c.g << 8) | c.b, index);
    }
  }

  return { palette, colorToIndex };
}

/** Recursively splits color boxes along their widest channel until maxBoxes is reached. */
function medianCut(colors: ColorBox[], maxBoxes: number): ColorBox[][] {
  const boxes: ColorBox[][] = [colors];

  while (boxes.length < maxBoxes) {
    let splitIdx = -1;
    let splitPopulation = -1;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length <= 1) continue;
      const population = boxes[i].reduce((s, c) => s + c.count, 0);
      if (population > splitPopulation) {
        splitPopulation = population;
        splitIdx = i;
      }
    }
    if (splitIdx === -1) break;

    const box = boxes[splitIdx];
    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0;
    for (const c of box) {
      if (c.r < rMin) rMin = c.r;
      if (c.r > rMax) rMax = c.r;
      if (c.g < gMin) gMin = c.g;
      if (c.g > gMax) gMax = c.g;
      if (c.b < bMin) bMin = c.b;
      if (c.b > bMax) bMax = c.b;
    }
    const rRange = rMax - rMin;
    const gRange = gMax - gMin;
    const bRange = bMax - bMin;

    let channel: 'r' | 'g' | 'b' = 'r';
    if (gRange >= rRange && gRange >= bRange) channel = 'g';
    else if (bRange >= rRange && bRange >= gRange) channel = 'b';

    box.sort((a, b) => a[channel] - b[channel]);

    const totalCount = box.reduce((s, c) => s + c.count, 0);
    let acc = 0;
    let cut = 1;
    for (let i = 0; i < box.length; i++) {
      acc += box[i].count;
      if (acc >= totalCount / 2) {
        cut = i + 1;
        break;
      }
    }
    cut = Math.max(1, Math.min(box.length - 1, cut));

    boxes.splice(splitIdx, 1, box.slice(0, cut), box.slice(cut));
  }

  return boxes;
}

function lzwEncode(
  pixels: Uint8Array,
  minCodeSize: number,
  writeByte: (b: number) => void
) {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let maxCode = (1 << codeSize) - 1;
  let nextCode = eoiCode + 1;

  // Use a fast Int32Array dictionary instead of Map<string, number>
  // Keys are (currentCode << 8) | pixel
  const dict = new Int32Array(4096 * 256);
  dict.fill(-1);

  // GIF LZW requires the encoder to increase code size at the same point
  // as the decoder. The encoder's table is one entry ahead of the decoder's,
  // so we defer the code size bump by one emitCode call.
  let pendingIncrease = false;

  const resetDict = () => {
    dict.fill(-1);
    codeSize = minCodeSize + 1;
    maxCode = (1 << codeSize) - 1;
    nextCode = eoiCode + 1;
    pendingIncrease = false;
  };

  let curAccum = 0;
  let curBits = 0;
  const subBlock: number[] = [];

  const emitCode = (code: number) => {
    curAccum |= code << curBits;
    curBits += codeSize;
    while (curBits >= 8) {
      subBlock.push(curAccum & 0xff);
      if (subBlock.length === 255) {
        writeByte(255);
        for (let i = 0; i < 255; i++) writeByte(subBlock[i]);
        subBlock.length = 0;
      }
      curAccum >>>= 8;
      curBits -= 8;
    }
    // Apply deferred code size increase after emitting the code
    if (pendingIncrease) {
      codeSize++;
      maxCode = (1 << codeSize) - 1;
      pendingIncrease = false;
    }
  };

  emitCode(clearCode);

  let currentCode = -1;
  for (let i = 0; i < pixels.length; i++) {
    const pixel = pixels[i];
    if (currentCode === -1) {
      currentCode = pixel;
      continue;
    }

    const key = (currentCode << 8) | pixel;
    const dictCode = dict[key];

    if (dictCode !== -1) {
      currentCode = dictCode;
    } else {
      emitCode(currentCode);
      
      if (nextCode === 4096) {
        emitCode(clearCode);
        resetDict();
      } else {
        dict[key] = nextCode;
        nextCode++;
        if (nextCode === maxCode + 1 && codeSize < 12) {
          pendingIncrease = true;
        }
      }
      currentCode = pixel;
    }
  }

  if (currentCode !== -1) {
    emitCode(currentCode);
  }
  emitCode(eoiCode);

  if (curBits > 0) {
    subBlock.push(curAccum & 0xff);
  }
  if (subBlock.length > 0) {
    writeByte(subBlock.length);
    for (let i = 0; i < subBlock.length; i++) writeByte(subBlock[i]);
  }
}
