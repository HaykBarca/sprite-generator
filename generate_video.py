import os
import math
import subprocess
from PIL import Image, ImageDraw, ImageFilter

output_dir = "temp_video_frames"
os.makedirs(output_dir, exist_ok=True)

width, height = 512, 512
num_frames = 24
fps = 24

print(f"Generating {num_frames} frames of animated character...")

for f in range(num_frames):
    # Phase 0 to 2*pi
    t = (f / num_frames) * 2 * math.pi
    
    # 1. Background: Chroma Green (#00FF00)
    img = Image.new("RGB", (width, height), (0, 255, 0))
    draw = ImageDraw.Draw(img)
    
    # Motion parameters
    centerX = 256
    groundY = 430
    bobbing = math.sin(t * 2) * 8  # 2 bobs per walk cycle
    baseY = groundY - 80 + bobbing
    
    leg1_swing = math.sin(t) * 28
    leg2_swing = -math.sin(t) * 28
    arm1_swing = -math.sin(t) * 22
    arm2_swing = math.sin(t) * 22
    staff_wave = math.cos(t) * 12
    orb_float = math.sin(t * 2) * 10
    
    # Ground shadow (slightly darker green)
    shadow_w = 70 + math.cos(t * 2) * 10
    draw.ellipse([centerX - shadow_w, groundY - 6, centerX + shadow_w, groundY + 12], fill=(0, 180, 0))
    
    # Back Leg
    draw.rounded_rectangle([centerX - 18 + leg2_swing, baseY - 20, centerX - 2 + leg2_swing, baseY + 60], radius=8, fill=(30, 41, 59))
    draw.rectangle([centerX - 22 + leg2_swing, baseY + 55, centerX + 4 + leg2_swing, baseY + 75], fill=(15, 23, 42)) # Boot
    
    # Back Arm & Magic Wand / Staff
    staff_x = centerX - 55 + arm2_swing
    staff_y = baseY - 120 + staff_wave
    draw.line([staff_x, staff_y, staff_x + 15, baseY + 45], fill=(120, 53, 15), width=8) # Wooden staff
    # Staff golden head
    draw.ellipse([staff_x - 12, staff_y - 25, staff_x + 12, staff_y], fill=(234, 179, 8))
    # Magic Cyan Orb glowing
    draw.ellipse([staff_x - 18, staff_y - 45 + orb_float, staff_x + 18, staff_y - 10 + orb_float], fill=(6, 182, 212))
    draw.ellipse([staff_x - 10, staff_y - 37 + orb_float, staff_x + 10, staff_y - 17 + orb_float], fill=(224, 242, 254))
    
    # Back Arm sleeve
    draw.rounded_rectangle([centerX - 35 + arm2_swing, baseY - 90, centerX - 15 + arm2_swing, baseY - 30], radius=8, fill=(59, 130, 246))
    
    # Wizard Robe / Body
    # Flowing robe bottom
    robe_sway = math.sin(t) * 12
    draw.polygon([
        (centerX - 35, baseY - 90),
        (centerX + 35, baseY - 90),
        (centerX + 48 + robe_sway, baseY + 45),
        (centerX - 48 + robe_sway, baseY + 45),
    ], fill=(37, 99, 235))
    
    # Robe Gold Trim
    draw.line([(centerX - 48 + robe_sway, baseY + 42), (centerX + 48 + robe_sway, baseY + 42)], fill=(250, 204, 21), width=6)
    
    # Robe Torso / Belt
    draw.rounded_rectangle([centerX - 28, baseY - 95, centerX + 28, baseY - 20], radius=10, fill=(29, 78, 216))
    draw.rectangle([centerX - 28, baseY - 30, centerX + 28, baseY - 18], fill=(180, 83, 9)) # Leather belt
    draw.rectangle([centerX - 8, baseY - 33, centerX + 8, baseY - 15], fill=(253, 224, 71)) # Gold buckle
    
    # Front Leg
    draw.rounded_rectangle([centerX + 2 + leg1_swing, baseY - 20, centerX + 18 + leg1_swing, baseY + 60], radius=8, fill=(30, 41, 59))
    draw.rectangle([centerX - 2 + leg1_swing, baseY + 55, centerX + 24 + leg1_swing, baseY + 75], fill=(15, 23, 42)) # Boot
    
    # Wizard Head / Beard
    draw.ellipse([centerX - 20, baseY - 140, centerX + 20, baseY - 100], fill=(254, 215, 170)) # Face
    draw.polygon([(centerX - 16, baseY - 115), (centerX + 16, baseY - 115), (centerX, baseY - 85)], fill=(241, 245, 249)) # White Beard
    
    # Wizard Hat
    draw.ellipse([centerX - 45, baseY - 145, centerX + 45, baseY - 128], fill=(30, 58, 138)) # Hat brim
    draw.polygon([(centerX - 32, baseY - 138), (centerX + 32, baseY - 138), (centerX - 10, baseY - 220)], fill=(37, 99, 235)) # Hat cone
    draw.rectangle([centerX - 32, baseY - 144, centerX + 32, baseY - 136], fill=(234, 179, 8)) # Hat gold band
    # Star on hat
    draw.ellipse([centerX - 14, baseY - 185, centerX - 4, baseY - 175], fill=(253, 224, 71))
    
    # Front Arm casting rune
    draw.rounded_rectangle([centerX + 15 + arm1_swing, baseY - 90, centerX + 35 + arm1_swing, baseY - 30], radius=8, fill=(59, 130, 246))
    draw.ellipse([centerX + 25 + arm1_swing, baseY - 35, centerX + 45 + arm1_swing, baseY - 15], fill=(254, 215, 170)) # Hand
    # Glowing hand spark
    draw.ellipse([centerX + 35 + arm1_swing, baseY - 28, centerX + 52 + arm1_swing, baseY - 10], fill=(56, 189, 248))
    
    # 2. Simulate AI edge artifacts & slight chroma bleed
    # We apply a slight 1-pixel blur only along edges to mimic video compression/AI halos
    frame_path = os.path.join(output_dir, f"frame_{f:03d}.png")
    img.save(frame_path)

print("Frames generated successfully!")

# Use ffmpeg to encode MP4 video
video_output = "ai_wizard_walk.mp4"
if os.path.exists(video_output):
    os.remove(video_output)

cmd = [
    "ffmpeg", "-y",
    "-framerate", str(fps),
    "-i", os.path.join(output_dir, "frame_%03d.png"),
    "-c:v", "libx264",
    "-pix_fmt", "yuv420p",
    "-crf", "18",
    video_output
]

print("Running ffmpeg to create MP4 video...")
subprocess.run(cmd, check=True)
print(f"Generated {video_output}, size: {os.path.getsize(video_output)} bytes")
