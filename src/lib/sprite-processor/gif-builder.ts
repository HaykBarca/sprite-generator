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

  // Simple median cut or frequency color quantization to 255 colors + 1 transparent
  const palette: [number, number, number][] = [];
  const colorMap = new Map<number, number>();
  const transparentIndex = 0;
  palette.push([0, 0, 0]); // transparent placeholder

  const indexedPixels = new Uint8Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    const pixelIdx = i / 4;
    const a = data[i + 3];

    if (a < 128) {
      indexedPixels[pixelIdx] = transparentIndex;
      continue;
    }

    // Quantize 8-bit to 5-bit for palette reduction (32 levels per channel)
    const r = data[i] & 0xf8;
    const g = data[i + 1] & 0xf8;
    const b = data[i + 2] & 0xf8;
    const key = (r << 16) | (g << 8) | b;

    let index = colorMap.get(key);
    if (index === undefined) {
      if (palette.length < 256) {
        index = palette.length;
        palette.push([data[i], data[i + 1], data[i + 2]]);
        colorMap.set(key, index);
      } else {
        // Find nearest color in existing palette
        let minDist = Infinity;
        let bestIdx = 1;
        for (let p = 1; p < palette.length; p++) {
          const dr = data[i] - palette[p][0];
          const dg = data[i + 1] - palette[p][1];
          const db = data[i + 2] - palette[p][2];
          const dist = dr * dr + dg * dg + db * db;
          if (dist < minDist) {
            minDist = dist;
            bestIdx = p;
          }
        }
        index = bestIdx;
      }
    }
    indexedPixels[pixelIdx] = index;
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

  const resetDict = () => {
    dict.fill(-1);
    codeSize = minCodeSize + 1;
    maxCode = (1 << codeSize) - 1;
    nextCode = eoiCode + 1;
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
      curAccum >>= 8;
      curBits -= 8;
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
          codeSize++;
          maxCode = (1 << codeSize) - 1;
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
