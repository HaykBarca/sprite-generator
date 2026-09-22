import { SpriteSheetMetadata } from './types';

export interface SheetBuildOptions {
  columns?: number; // 0 or undefined for auto sqrt
  padding?: number; // spacing between frames
  baseName?: string;
  fps?: number;
}

export interface SheetBuildResult {
  canvas: HTMLCanvasElement;
  metadata: SpriteSheetMetadata;
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
}

export function buildSpriteSheet(
  frames: HTMLCanvasElement[],
  options: SheetBuildOptions = {}
): SheetBuildResult {
  if (frames.length === 0) {
    throw new Error('No frames provided for sprite sheet');
  }

  const padding = Math.max(0, options.padding || 0);
  const baseName = options.baseName || 'sprite';
  const fps = options.fps || 12;

  const cellWidth = Math.max(...frames.map((f) => f.width));
  const cellHeight = Math.max(...frames.map((f) => f.height));

  const total = frames.length;
  let cols = options.columns && options.columns > 0 ? options.columns : Math.ceil(Math.sqrt(total));
  cols = Math.max(1, cols);
  const rows = Math.ceil(total / cols);

  const sheetWidth = cols * cellWidth + (cols + 1) * padding;
  const sheetHeight = rows * cellHeight + (rows + 1) * padding;

  const sheetCanvas = document.createElement('canvas');
  sheetCanvas.width = sheetWidth;
  sheetCanvas.height = sheetHeight;
  const ctx = sheetCanvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d context for sprite sheet');

  const metadata: SpriteSheetMetadata = {
    texture: `${baseName}_sheet.png`,
    meta: {
      app: 'Spritely Game-Ready Sprite Generator',
      version: '1.0.0',
      image: `${baseName}_sheet.png`,
      format: 'RGBA8888',
      size: { w: sheetWidth, h: sheetHeight },
      scale: 1,
      frameRate: fps,
    },
    frames: {},
  };

  frames.forEach((frameCanvas, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);

    const x = padding + col * (cellWidth + padding) + Math.floor((cellWidth - frameCanvas.width) / 2);
    const y = padding + row * (cellHeight + padding) + Math.floor((cellHeight - frameCanvas.height) / 2);

    ctx.drawImage(frameCanvas, x, y);

    const frameName = `${baseName}_${String(index).padStart(3, '0')}.png`;
    metadata.frames[frameName] = {
      frame: { x, y, w: cellWidth, h: cellHeight },
      rotated: false,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: cellWidth, h: cellHeight },
      sourceSize: { w: cellWidth, h: cellHeight },
      duration: Math.round(1000 / fps),
    };
  });

  return {
    canvas: sheetCanvas,
    metadata,
    cols,
    rows,
    cellWidth,
    cellHeight,
  };
}
