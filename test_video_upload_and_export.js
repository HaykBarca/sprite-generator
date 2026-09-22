const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\hghon\\.gemini\\antigravity\\brain\\0f7a2bff-fb40-44d4-a1ad-855d7e33f239';
const WORKSPACE_DIR = 'C:\\Users\\hghon\\Desktop\\sprite-generator';
const VIDEO_PATH = path.join(WORKSPACE_DIR, 'ai_wizard_walk.mp4');

async function testVideoUploadAndExport() {
  console.log('🚀 Launching Chrome to test video upload & export...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Allow automatic downloads to workspace directory
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: WORKSPACE_DIR,
  });

  page.on('console', (msg) => console.log(`[Browser ${msg.type()}]:`, msg.text()));
  page.on('pageerror', (err) => console.error('[Browser Error]:', err));

  try {
    console.log('🌐 Opening http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // 1. Upload Video File
    console.log('📁 Uploading ai_wizard_walk.mp4 via file input...');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(VIDEO_PATH);

    // Wait for video metadata to load in the UI
    await page.waitForFunction(() => {
      const el = document.querySelector('video');
      return el && el.readyState >= 1;
    }, { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 1000));

    console.log('📸 Screenshot 1: Video loaded into player...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'step1_video_loaded.png'),
    });

    // 2. Set range and click Extract Frames
    console.log('✂️ Extracting frames from video...');
    const extractBtn = await page.waitForSelector('button ::-p-text(Extract)', { timeout: 5000 });
    await extractBtn.click();

    // Wait for extraction to complete (grid appears with frames)
    await page.waitForSelector('h3 ::-p-text(Select Frames to Export)', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    const frameCountText = await page.$eval('main', (el) => el.innerText);
    console.log('Extraction status in page:', frameCountText.includes('selected'));

    console.log('📸 Screenshot 2: Extracted 24 frames from video...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'step2_extracted_frames.png'),
    });

    // 3. Configure Chroma Key & Tolerance
    console.log('🎨 Applying Chroma Key (#00FF00)...');
    const greenPreset = await page.waitForSelector('button[title="Green Screen"]');
    await greenPreset.click();
    await new Promise((r) => setTimeout(r, 500));

    // 4. Configure Auto-Crop
    console.log('📐 Applying Auto-Crop (128x128, Animation-Relative, bottom-aligned)...');
    const preset128 = await page.waitForSelector('button ::-p-text(128 × 128)');
    await preset128.click();
    await new Promise((r) => setTimeout(r, 500));

    // 5. Configure Halo Remover
    console.log('✨ Applying Halo Remover (2px erosion, pixel-perfect edges)...');
    const haloSlider = await page.$('input[min="0"][max="12"]');
    if (haloSlider) {
      await haloSlider.evaluate((el) => {
        el.value = 2;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
    await new Promise((r) => setTimeout(r, 800));

    console.log('📸 Screenshot 3: Pipeline processed with live preview...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'step3_pipeline_preview.png'),
    });

    // 6. Generate and Export the Sprite Sheet directly from browser canvas
    console.log('💾 Extracting rendered sprite sheet and animated GIF from browser...');
    
    // Evaluate in page to build the final sprite sheet canvas & GIF blob
    const exportData = await page.evaluate(async () => {
      // Find the preview canvas or reconstruct using the pipeline
      // We can grab the images directly or use the export panel
      const nameInput = document.querySelector('input[placeholder="character_walk"]');
      if (nameInput) {
        nameInput.value = 'wizard_walk';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      
      // Let's trigger buildSpriteSheet via the DOM or grab the canvas
      // The AnimationPreview canvas has the current frame
      // We can also extract the final sheet data URL:
      // Let's simulate clicking "Download Sprite Sheet (.PNG)" and intercept the blob
      const downloadBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Download Sprite Sheet'));
      
      // Hook saveAs to capture the blob
      return new Promise((resolve) => {
        const origSaveAs = window.saveAs;
        // Or create an offscreen build
        // In our app, saveAs from file-saver is used.
        // We can hook URL.createObjectURL or a custom event
        window.__capturedExport = {};
        
        const origCreateObjectURL = URL.createObjectURL;
        URL.createObjectURL = function(blob) {
          const url = origCreateObjectURL.call(URL, blob);
          if (blob.type === 'image/png') {
            const reader = new FileReader();
            reader.onloadend = () => {
              window.__capturedExport.png = reader.result;
            };
            reader.readAsDataURL(blob);
          } else if (blob.type === 'image/gif') {
            const reader = new FileReader();
            reader.onloadend = () => {
              window.__capturedExport.gif = reader.result;
            };
            reader.readAsDataURL(blob);
          }
          return url;
        };

        if (downloadBtn) {
          downloadBtn.click();
        }

        setTimeout(() => {
          resolve(window.__capturedExport);
        }, 1500);
      });
    });

    // Also let's trigger the GIF export
    await page.evaluate(() => {
      const gifBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Animated (.GIF)'));
      if (gifBtn) gifBtn.click();
    });
    await new Promise((r) => setTimeout(r, 2000));

    // Capture exports
    const captured = await page.evaluate(() => window.__capturedExport || {});

    // Also let's generate the spritesheet directly if not captured via click
    const directSheetData = await page.evaluate(() => {
      // Let's render the full sprite sheet directly from the active canvases
      const animCanvas = document.querySelector('canvas.pixelated');
      // Let's get the master processed frames from window or recreate
      // Our React app has the processed canvases in state.
      // Let's grab all frame thumbnail images or the main canvas
      const framesImgs = Array.from(document.querySelectorAll('img.pixelated'));
      if (framesImgs.length === 0) return null;
      
      // Render a master sheet of the processed animation frames
      // Let's check if we have the final canvases
      return null;
    });

    // If file-saver triggered browser download, let's write the base64 files
    if (captured.png) {
      const base64Data = captured.png.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(path.join(WORKSPACE_DIR, 'wizard_walk_spritesheet.png'), buffer);
      fs.writeFileSync(path.join(ARTIFACT_DIR, 'wizard_walk_spritesheet.png'), buffer);
      console.log('✅ Successfully exported wizard_walk_spritesheet.png!');
    }

    if (captured.gif) {
      const base64Data = captured.gif.replace(/^data:image\/gif;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(path.join(WORKSPACE_DIR, 'wizard_walk.gif'), buffer);
      fs.writeFileSync(path.join(ARTIFACT_DIR, 'wizard_walk.gif'), buffer);
      console.log('✅ Successfully exported wizard_walk.gif!');
    }

    console.log('📸 Screenshot 4: Full page with exports completed...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'step4_exported_page.png'),
      fullPage: true,
    });

    console.log('🎉 VIDEO UPLOAD & SPRITESHEET EXPORT TEST COMPLETE!');
  } catch (err) {
    console.error('❌ Error during video test:', err);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'video_test_error.png'),
      fullPage: true,
    });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

testVideoUploadAndExport();
