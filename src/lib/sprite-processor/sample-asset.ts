import { ExtractedFrame } from './types';

/**
 * Generates an 8-frame animated character walk-cycle on green screen (#00FF00)
 * with slight green edge fringe so users can immediately test:
 * - Frame selection
 * - Live walk preview
 * - Step 1: Chroma Key removal
 * - Step 2: Auto-Crop & baseline alignment
 * - Step 3: Halo Remover (fringe defringing)
 * - Step 4: Exporting
 */
export function generateSampleDemoFrames(): ExtractedFrame[] {
  const framesCount = 8;
  const width = 256;
  const height = 256;
  const frames: ExtractedFrame[] = [];

  for (let f = 0; f < framesCount; f++) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // Fill with green screen (#00FF00)
    ctx.fillStyle = '#00FF00';
    ctx.fillRect(0, 0, width, height);

    // Character motion parameters for 8-frame walk cycle
    const t = (f / framesCount) * Math.PI * 2;
    const bounce = Math.abs(Math.sin(t)) * 6; // bobbing up and down
    const legSwing = Math.sin(t) * 14;
    const armSwing = Math.cos(t) * 12;

    const centerX = 128;
    const groundY = 210;
    const bodyBaseY = groundY - 30 - bounce;

    // Shadow on green screen
    ctx.fillStyle = '#00B800';
    ctx.beginPath();
    ctx.ellipse(centerX, groundY + 4, 30 + Math.sin(t) * 2, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Simulated AI edge fringe / halo glow: a faint green aura around character
    ctx.strokeStyle = '#32CD32';
    ctx.lineWidth = 4;

    // Back leg
    ctx.fillStyle = '#1e3a8a'; // Dark blue pants
    ctx.beginPath();
    ctx.roundRect(centerX - 10 - legSwing * 0.7, bodyBaseY - 20, 10, 45, 4);
    ctx.fill();
    // Back boot
    ctx.fillStyle = '#78350f'; // Brown boot
    ctx.fillRect(centerX - 12 - legSwing * 0.7, bodyBaseY + 22, 16, 12);

    // Back Arm
    ctx.fillStyle = '#b91c1c'; // Red armor sleeve
    ctx.beginPath();
    ctx.roundRect(centerX - 18 - armSwing * 0.8, bodyBaseY - 70, 10, 32, 4);
    ctx.fill();

    // Body / Armor Torso
    ctx.fillStyle = '#dc2626'; // Bright red armor
    ctx.beginPath();
    ctx.roundRect(centerX - 18, bodyBaseY - 75, 36, 50, 6);
    ctx.fill();

    // Chest plate detail
    ctx.fillStyle = '#facc15'; // Gold crest
    ctx.beginPath();
    ctx.arc(centerX, bodyBaseY - 55, 8, 0, Math.PI * 2);
    ctx.fill();

    // Belt
    ctx.fillStyle = '#451a03';
    ctx.fillRect(centerX - 18, bodyBaseY - 28, 36, 8);
    ctx.fillStyle = '#fde047'; // Buckle
    ctx.fillRect(centerX - 4, bodyBaseY - 30, 8, 12);

    // Front Leg
    ctx.fillStyle = '#2563eb'; // Blue pants
    ctx.beginPath();
    ctx.roundRect(centerX + 2 + legSwing * 0.7, bodyBaseY - 20, 11, 45, 4);
    ctx.fill();
    // Front Boot
    ctx.fillStyle = '#92400e'; // Brown boot
    ctx.fillRect(centerX + legSwing * 0.7, bodyBaseY + 22, 16, 12);

    // Head / Helmet
    ctx.fillStyle = '#94a3b8'; // Silver steel helmet
    ctx.beginPath();
    ctx.arc(centerX, bodyBaseY - 95, 18, 0, Math.PI * 2);
    ctx.fill();

    // Helmet visor
    ctx.fillStyle = '#0f172a'; // Dark visor slot
    ctx.fillRect(centerX - 12, bodyBaseY - 98, 24, 7);
    ctx.fillStyle = '#38bdf8'; // Glowing blue eye glow
    ctx.fillRect(centerX + 2, bodyBaseY - 97, 6, 5);

    // Helmet Plume / Feather
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(centerX - 6, bodyBaseY - 112);
    ctx.quadraticCurveTo(centerX - 18, bodyBaseY - 125, centerX - 14, bodyBaseY - 105);
    ctx.fill();

    // Front Arm & Sword / Shield
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(centerX + 10 + armSwing * 0.8, bodyBaseY - 70, 11, 32, 4);
    ctx.fill();

    // Shield
    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.ellipse(centerX + 18 + armSwing * 0.8, bodyBaseY - 50, 10, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Add faint green bleed around boundary to simulate AI video chroma fringe
    const imgData = ctx.getImageData(0, 0, width, height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      // If pixel is foreground (not pure green) but touches green
      if (d[i + 1] !== 255 || d[i] > 10 || d[i + 2] > 10) {
        // Add 15% green spill to simulate AI video green bounce
        d[i + 1] = Math.min(255, d[i + 1] + 25);
      }
    }
    ctx.putImageData(imgData, 0, 0);

    frames.push({
      id: `sample_frame_${f}`,
      frameIndex: f,
      time: f / 12,
      canvas,
      thumbnailUrl: canvas.toDataURL('image/png'),
      selected: true,
      width,
      height,
    });
  }

  return frames;
}
