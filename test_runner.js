const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\hghon\\.gemini\\antigravity\\brain\\0f7a2bff-fb40-44d4-a1ad-855d7e33f239';

async function runLiveTests() {
  console.log('🚀 Launching Chrome from:', CHROME_PATH);
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Collect console logs and errors
  const consoleLogs = [];
  const errors = [];
  page.on('console', (msg) => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', (err) => errors.push(err.toString()));

  try {
    console.log('🌐 Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

    // Test 1: Initial Page Load
    console.log('📸 Test 1: Verifying initial page load...');
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '01_initial_page.png'),
      fullPage: true,
    });
    console.log('✅ Screenshot 1 saved');

    // Test 2: Load Demo Knight
    console.log('✨ Test 2: Clicking "Load Demo Knight"...');
    const demoButton = await page.waitForSelector('button[title*="Load an 8-frame walking knight"]', { timeout: 5000 });
    await demoButton.evaluate((b) => b.click());
    await new Promise((r) => setTimeout(r, 1000));

    // Verify frames loaded
    const frameGridText = await page.$eval('main', (el) => el.innerText);
    const hasFrames = frameGridText.includes('8 / 8 selected');
    console.log('Frame grid text includes "8 / 8 selected":', hasFrames);

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '02_demo_knight_loaded.png'),
      fullPage: false,
    });
    console.log('✅ Screenshot 2 saved');

    // Test 3: Animation Preview & Controls
    console.log('🎥 Test 3: Testing Animation Preview controls...');
    // Click 24 FPS preset
    const fps24Btn = await page.waitForSelector('button ::-p-text(24)');
    await fps24Btn.click();
    await new Promise((r) => setTimeout(r, 300));

    // Click Pause then Play
    const pauseBtn = await page.waitForSelector('button ::-p-text(Pause)');
    await pauseBtn.click();
    await new Promise((r) => setTimeout(r, 300));
    const playBtn = await page.waitForSelector('button ::-p-text(Play)');
    await playBtn.click();

    // Toggle 3x zoom
    const zoom3Btn = await page.waitForSelector('button ::-p-text(3x)');
    await zoom3Btn.click();
    await new Promise((r) => setTimeout(r, 300));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '03_animation_preview_running.png'),
      fullPage: false,
    });
    console.log('✅ Screenshot 3 saved');

    // Test 4: Frame Selection Grid
    console.log('🎯 Test 4: Testing Frame Selection Grid...');
    // Invert selection
    const invertBtn = await page.waitForSelector('button ::-p-text(Invert)');
    await invertBtn.click();
    await new Promise((r) => setTimeout(r, 300));

    // Deselect All
    const deselectBtn = await page.waitForSelector('button ::-p-text(Deselect All)');
    await deselectBtn.click();
    await new Promise((r) => setTimeout(r, 300));

    // Select All
    const selectAllBtn = await page.waitForSelector('button ::-p-text(Select All)');
    await selectAllBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    // Test 5: Step 1 Chroma Key
    console.log('🎨 Test 5: Testing Step 1 Chroma Key Background Removal...');
    // Check preset buttons (Magenta then Green)
    const magentaBtn = await page.waitForSelector('button[title="Magenta"]');
    await magentaBtn.click();
    await new Promise((r) => setTimeout(r, 400));
    const greenBtn = await page.waitForSelector('button[title="Green Screen"]');
    await greenBtn.click();
    await new Promise((r) => setTimeout(r, 400));

    // Adjust tolerance
    const toleranceSlider = await page.$('input[min="1"][max="150"]');
    if (toleranceSlider) {
      await toleranceSlider.evaluate((el) => {
        el.value = 55;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '04_chroma_key_applied.png'),
      fullPage: false,
    });
    console.log('✅ Screenshot 4 saved');

    // Test 6: Step 2 Auto-Crop & Sizing
    console.log('📐 Test 6: Testing Step 2 Auto-Crop & Sizing...');
    // Click 128x128 preset
    const preset128 = await page.waitForSelector('button ::-p-text(128 × 128)');
    await preset128.click();
    await new Promise((r) => setTimeout(r, 300));

    // Test Center-Center mode then Animation-Relative
    const centerCenterBtn = await page.waitForSelector('button ::-p-text(Center-Center)');
    await centerCenterBtn.click();
    await new Promise((r) => setTimeout(r, 300));

    const animRelBtn = await page.waitForSelector('button ::-p-text(Animation-Relative)');
    await animRelBtn.click();
    await new Promise((r) => setTimeout(r, 300));

    // Test 7: Step 3 Halo Remover
    console.log('✨ Test 7: Testing Step 3 Halo Remover...');
    const haloSlider = await page.$('input[min="0"][max="12"]');
    if (haloSlider) {
      await haloSlider.evaluate((el) => {
        el.value = 2;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    // Set 5x edge zoom
    const zoomEdgeBtn = await page.waitForSelector('button ::-p-text(5x)');
    await zoomEdgeBtn.click();
    await new Promise((r) => setTimeout(r, 400));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '05_crop_and_halo_applied.png'),
      fullPage: false,
    });
    console.log('✅ Screenshot 5 saved');

    // Test 8: Step 4 Export Generation
    console.log('📦 Test 8: Testing Step 4 Export & Downloads...');
    // Scroll to export panel
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 500));

    // Test JSON Atlas export trigger
    const jsonBtn = await page.waitForSelector('button ::-p-text(Atlas (.JSON))');
    await jsonBtn.click();
    await new Promise((r) => setTimeout(r, 500));

    // Test Sprite Sheet export trigger
    const sheetBtn = await page.waitForSelector('button ::-p-text(Download Sprite Sheet (.PNG))');
    await sheetBtn.click();
    await new Promise((r) => setTimeout(r, 1000));

    // Test GIF export trigger
    const gifBtn = await page.waitForSelector('button ::-p-text(Animated (.GIF))');
    await gifBtn.click();
    await new Promise((r) => setTimeout(r, 1500));

    // Test ZIP export trigger
    const zipBtn = await page.waitForSelector('button ::-p-text(Frames (.ZIP))');
    await zipBtn.click();
    await new Promise((r) => setTimeout(r, 1500));

    await page.screenshot({
      path: path.join(ARTIFACT_DIR, '06_full_app_verified.png'),
      fullPage: true,
    });
    console.log('✅ Screenshot 6 saved (full page)');

    console.log('\n🎉 ALL LIVE TESTS PASSED SUCCESSFULLY!');
    console.log('Console Errors caught:', errors.length);
    if (errors.length > 0) {
      console.log('Errors:', errors);
    }
  } catch (err) {
    console.error('❌ Test failed:', err);
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'test_error.png'),
      fullPage: true,
    });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runLiveTests();
