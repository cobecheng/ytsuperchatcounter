const puppeteer = require('puppeteer');

const videoUrl = 'https://www.youtube.com/watch?v=kOZWQgtqps4'; // Replace with your video link

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: false, args: ['--window-size=1920,1080'] });
  const page = await browser.newPage();

  // Also set the viewport to match the window size
  await page.setViewport({ width: 1920, height: 1080 });

  console.log(`Opening video: ${videoUrl}`);
  await page.goto(videoUrl, { waitUntil: 'networkidle2' });

  console.log('Scrolling to load all comments...');
  
  let previousHeight = 0;
  let scrollCount = 0;
  let unchangedScrollCount = 0;
  const maxUnchangedScrolls = 3; // Try up to 3 times even if height is unchanged

  while (unchangedScrollCount < maxUnchangedScrolls) {
    previousHeight = await page.evaluate('document.documentElement.scrollHeight');
    
    await page.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay to allow loading

    let newHeight = await page.evaluate('document.documentElement.scrollHeight');
    scrollCount++;

    console.log(`Scroll attempt #${scrollCount} - Height: ${newHeight}`);

    if (newHeight === previousHeight) {
      // If height is unchanged, wait a bit and try again
      console.log(`No new content. Waiting... (${unchangedScrollCount + 1}/${maxUnchangedScrolls})`);
      unchangedScrollCount++;
      await new Promise(resolve => setTimeout(resolve, 1500)); // Wait longer to allow more loading
    } else {
      unchangedScrollCount = 0; // Reset counter if height changes
    }
  }

  console.log('Finished scrolling. Extracting Super Thanks data...');
  const amounts = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('span#comment-chip-price'));
    return elements.map(el => el.textContent?.trim()).filter(Boolean);
  });

  let totalAmountByCurrency = {};
  let superThanksCount = amounts.length;

  console.log(`Found ${superThanksCount} Super Thanks entries.`);
  amounts.forEach((amount, index) => {
    const match = amount.match(/([^\d.,]+)?([\d.,]+)/);
    if (match) {
      const currency = match[1]?.trim() || 'UNKNOWN';
      const value = parseFloat(match[2].replace(',', ''));

      if (!isNaN(value)) {
        if (!totalAmountByCurrency[currency]) {
          totalAmountByCurrency[currency] = 0;
        }
        totalAmountByCurrency[currency] += value;
        console.log(`Super Thanks #${index + 1}: ${amount} -> ${currency} ${value}`);
      } else {
        console.log(`⚠️ Invalid numeric value: ${amount}`);
      }
    } else {
      console.log(`⚠️ Skipped invalid value: ${amount}`);
    }
  });

  console.log(`\n=== TOTAL BY CURRENCY ===`);
  for (const [currency, amount] of Object.entries(totalAmountByCurrency)) {
    console.log(`${currency}: ${amount.toFixed(2)}`);
  }

  console.log(`\n=== FINAL RESULTS ===`);
  console.log(`Total Super Thanks Count: ${superThanksCount}`);

  console.log('Closing browser...');
  await browser.close();
  console.log('Script finished.');
})();
