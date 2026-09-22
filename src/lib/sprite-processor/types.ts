export interface ExtractedFrame {
  id: string;
  frameIndex: number;
  time: number;
  canvas: HTMLCanvasElement;
  thumbnailUrl: string;
  selected: boolean;
  width: number;
  height: number;
}

export interface ChromaKeySettings {
  enabled: boolean;
  targetColorHex: string;
  tolerance: number; // 0 to 150
  feather: number; // 0 to 10
  despill: boolean; // removes color spill on foreground edges
}

export type CropMode = 'animation-relative' | 'center-center';
export type AlignX = 'left' | 'center' | 'right';
export type AlignY = 'top' | 'center' | 'bottom';

export interface CropSettings {
  enabled: boolean;
  mode: CropMode;
  preset: 'original' | '32x32' | '48x48' | '64x64' | '128x128' | '256x256' | 'custom';
  customWidth: number;
  customHeight: number;
  reductionPadding: number; // in pixels
  alignX: AlignX;
  alignY: AlignY;
}

export interface HaloRemoverSettings {
  enabled: boolean;
  expandPixels: number; // 0 to 15 pixels erosion of edge halo
  pixelPerfect: boolean; // binary alpha thresholding
  despillStrength: number; // 0 to 100%
}

export interface SpriteSheetMetadata {
  texture: string;
  meta: {
    app: string;
    version: string;
    image: string;
    format: string;
    size: { w: number; h: number };
    scale: number;
    frameRate: number;
  };
  frames: {
    [name: string]: {
      frame: { x: number; y: number; w: number; h: number };
      rotated: boolean;
      trimmed: boolean;
      spriteSourceSize: { x: number; y: number; w: number; h: number };
      sourceSize: { w: number; h: number };
      duration?: number;
    };
  };
}

export interface VideoInfo {
  name: string;
  duration: number;
  videoWidth: number;
  videoHeight: number;
  estimatedFps: number;
  totalFrames: number;
}
