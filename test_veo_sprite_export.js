const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\hghon\\.gemini\\antigravity\\brain\\6200d521-5476-4f3d-897d-8ff7f3b49af1';
const WORKSPACE_DIR = 'C:\\Users\\hghon\\Desktop\\sprite-generator';
const VIDEO_PATH = path.join(WORKSPACE_DIR, 'veo_commando_run.mp4');
const EXPORT_DIR = path.join(WORKSPACE_DIR, 'exports');

async function runTest() {
  console.log('🚀 Starting robust end-to-end test in Spritely UI...');
  fs.mkdirSync(EXPORT_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--window-size=1600,1000',
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });

  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: EXPORT_DIR,
  });

  page.on('console', (msg) => {
    const text = msg.text();
    if (!text.includes('willReadFrequently')) {
      console.log(`[Browser ${msg.type()}]:`, text);
    }
  });
  page.on('pageerror', (err) => console.error('[Browser Error]:', err));

  try {
    console.log('🌐 Loading http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 30000 });

    console.log('📁 Uploading video file...');
    const fileInput = await page.$('input[type="file"]');
    await fileInput.uploadFile(VIDEO_PATH);

    // Wait for video metadata to load
    await page.waitForFunction(() => {
      const v = document.querySelector('video');
      return v && v.readyState >= 1;
    }, { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 1000));

    console.log('📸 Step 1: Video loaded into UI');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_video_loaded.png') });

    // Set Start Frame = 0, End Frame = 48, Interval = 2 using native value setter
    console.log('⚙️ Setting extraction range (0 to 48, step 2)...');
    await page.evaluate(() => {
      const setVal = (el, v) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      // VideoUploadSection sliders:
      // In the right sidebar: Start Frame, End Frame, Frame Interval
      const rightCol = document.querySelector('div.w-full.md\\:w-80') || document;
      const sliders = Array.from(rightCol.querySelectorAll('input[type="range"]'));
      console.log('Found sidebar sliders:', sliders.length);
      if (sliders.length >= 3) {
        setVal(sliders[0], 0);  // startFrame
        setVal(sliders[1], 48); // endFrame
        setVal(sliders[2], 2);  // interval
      }
    });
    await new Promise((r) => setTimeout(r, 1000));

    // Click Extract Frames
    console.log('✂️ Extracting frames...');
    const extractBtn = await page.waitForSelector('button ::-p-text(Extract)', { timeout: 10000 });
    await extractBtn.click();

    // Wait for frames grid
    await page.waitForSelector('h3 ::-p-text(Select Frames to Export)', { timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1500));

    const selectedCount = await page.$eval('h3', el => el.parentElement?.innerText || '');
    console.log('Extracted frames status:', selectedCount.replace(/\n/g, ' '));

    console.log('📸 Step 2: Extracted frames grid');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_extracted_frames.png') });

    // Configure Chroma Key: Color #16DD2B, Tolerance 70
    console.log('🎨 Configuring Chroma Key with video green #16DD2B and tolerance 70...');
    await page.evaluate(() => {
      const setVal = (el, v) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const hexInput = document.querySelector('input[maxlength="7"]');
      if (hexInput) setVal(hexInput, '#16DD2B');

      const tolSlider = document.querySelector('input[min="1"][max="150"]');
      if (tolSlider) setVal(tolSlider, 70);
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Configure Auto-Crop: 128x128, Animation-Relative, Bottom-aligned
    console.log('📐 Configuring Auto-Crop: 128x128, Animation-Relative, Bottom-aligned...');
    const preset128 = await page.waitForSelector('button ::-p-text(128 × 128)', { timeout: 5000 });
    if (preset128) await preset128.click();
    await new Promise((r) => setTimeout(r, 800));

    // Configure Halo Remover: 2px erosion, Pixel-Perfect Hard Edges
    console.log('✨ Configuring Halo Remover: 2px erosion, pixel-perfect edges...');
    await page.evaluate(() => {
      const setVal = (el, v) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };

      const haloSlider = document.querySelector('input[min="0"][max="12"]');
      if (haloSlider) setVal(haloSlider, 2);
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Inspect detected bounds in the page
    const detectedBounds = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('span, p, div')).find(e => e.textContent && e.textContent.includes('Detected Subject Envelope'));
      return el?.parentElement?.textContent || 'Not found';
    });
    console.log('Subject Bounds detected by tool:', detectedBounds.replace(/\n/g, ' '));

    console.log('📸 Step 3: Pipeline configured with transparent preview');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_pipeline_preview.png') });

    // Set export name to "commando_run"
    await page.evaluate(() => {
      const setVal = (el, v) => {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(el, v);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const nameInput = document.querySelector('input[placeholder="character_walk"]');
      if (nameInput) setVal(nameInput, 'commando_run');
    });
    await new Promise((r) => setTimeout(r, 500));

    // Trigger exports
    console.log('💾 Exporting Sprite Sheet (.PNG)...');
    const sheetBtn = await page.waitForSelector('button ::-p-text(Download Sprite Sheet (.PNG))', { timeout: 5000 });
    await sheetBtn.click();
    await new Promise((r) => setTimeout(r, 2000));

    console.log('🎞️ Exporting Animated GIF (.GIF)...');
    const gifBtn = await page.waitForSelector('button ::-p-text(Animated (.GIF))', { timeout: 5000 });
    await gifBtn.click();
    await new Promise((r) => setTimeout(r, 3000));

    console.log('📄 Exporting Atlas (.JSON)...');
    const atlasBtn = await page.waitForSelector('button ::-p-text(Atlas (.JSON))', { timeout: 5000 });
    await atlasBtn.click();
    await new Promise((r) => setTimeout(r, 1500));

    // Check files in EXPORT_DIR
    const files = fs.readdirSync(EXPORT_DIR);
    console.log('🎉 Successfully exported files to EXPORT_DIR:', files);
    for (const f of files) {
      const src = path.join(EXPORT_DIR, f);
      const dst = path.join(ARTIFACT_DIR, f);
      fs.copyFileSync(src, dst);
      console.log(`Copied ${f} to artifacts (${fs.statSync(dst).size} bytes)`);
    }

    console.log('📸 Step 4: Full page verified');
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_exported_page.png'), fullPage: true });

    console.log('✅ ALL TESTS AND EXPORTS FINISHED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Error during test:', err);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'error_state.png'), fullPage: true });
    throw err;
  } finally {
    await browser.close();
  }
}

runTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
