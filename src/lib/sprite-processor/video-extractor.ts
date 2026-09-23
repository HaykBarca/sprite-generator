import { ExtractedFrame, VideoInfo } from './types';

const THUMBNAIL_MAX_SIZE = 192;

/**
 * Encodes a small preview image for the frame grid. Encoding full-resolution
 * frames is slow and holds a lot of memory for images shown at ~100px.
 */
function createThumbnailUrl(source: HTMLCanvasElement, type: 'image/jpeg' | 'image/png'): string {
  const scale = Math.min(1, THUMBNAIL_MAX_SIZE / Math.max(source.width, source.height));
  const thumb = document.createElement('canvas');
  thumb.width = Math.max(1, Math.round(source.width * scale));
  thumb.height = Math.max(1, Math.round(source.height * scale));
  const ctx = thumb.getContext('2d');
  if (ctx) {
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, thumb.width, thumb.height);
  }
  return thumb.toDataURL(type, 0.85);
}

/**
 * Loads video element and extracts metadata
 */
export function loadVideoMetadata(file: File): Promise<{ video: HTMLVideoElement; info: VideoInfo }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(file);
    video.src = url;

    video.onloadedmetadata = () => {
      const fps = 30; // standard default video FPS
      const totalFrames = Math.floor(video.duration * fps);
      resolve({
        video,
        info: {
          name: file.name,
          duration: video.duration,
          videoWidth: video.videoWidth || 512,
          videoHeight: video.videoHeight || 512,
          estimatedFps: fps,
          totalFrames: Math.max(1, totalFrames),
        },
      });
    };

    video.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video file: ' + (e as any)?.message));
    };
  });
}

/**
 * Extracts frames from a video between startFrame and endFrame at a given interval
 */
export async function extractVideoFrames(
  video: HTMLVideoElement,
  startFrame: number,
  endFrame: number,
  interval: number = 1,
  fps: number = 30,
  onProgress?: (progress: number, current: number, total: number) => void
): Promise<ExtractedFrame[]> {
  const frames: ExtractedFrame[] = [];
  const totalFramesToExtract = Math.max(1, Math.floor((endFrame - startFrame) / interval));

  let extractedCount = 0;

  for (let f = startFrame; f <= endFrame; f += interval) {
    const targetTime = Math.min(video.duration, Math.max(0, f / fps));

    // Seek video to exact time
    await new Promise<void>((resolve) => {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        resolve();
      };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = targetTime;
    });

    // Copy to frame canvas
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = video.videoWidth;
    frameCanvas.height = video.videoHeight;
    const frameCtx = frameCanvas.getContext('2d', { willReadFrequently: true });
    if (!frameCtx) throw new Error('Could not create frame canvas context');
    frameCtx.drawImage(video, 0, 0);

    const thumbUrl = createThumbnailUrl(frameCanvas, 'image/jpeg');

    frames.push({
      id: `frame_${f}_${Date.now()}`,
      frameIndex: f,
      time: targetTime,
      canvas: frameCanvas,
      thumbnailUrl: thumbUrl,
      selected: true,
      width: frameCanvas.width,
      height: frameCanvas.height,
    });

    extractedCount++;
    if (onProgress) {
      const pct = Math.round((extractedCount / totalFramesToExtract) * 100);
      onProgress(Math.min(100, pct), extractedCount, totalFramesToExtract);
    }
  }

  return frames;
}

/**
 * Loads batch images as extracted frames
 */
export async function loadImagesAsFrames(
  files: File[],
  onProgress?: (progress: number, current: number, total: number) => void
): Promise<ExtractedFrame[]> {
  const frames: ExtractedFrame[] = [];

  // Sort files naturally by filename
  const sortedFiles = Array.from(files).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );

  for (let i = 0; i < sortedFiles.length; i++) {
    const file = sortedFiles[i];
    const img = new Image();
    const url = URL.createObjectURL(file);

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load ${file.name}`));
      img.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(img, 0, 0);
    }
    URL.revokeObjectURL(url);

    frames.push({
      id: `img_${i}_${Date.now()}`,
      frameIndex: i,
      time: i / 12,
      canvas,
      thumbnailUrl: createThumbnailUrl(canvas, 'image/png'),
      selected: true,
      width: canvas.width,
      height: canvas.height,
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / sortedFiles.length) * 100), i + 1, sortedFiles.length);
    }
  }

  return frames;
}
