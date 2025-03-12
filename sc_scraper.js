const puppeteer = require('puppeteer');

const videoUrl = 'https://www.youtube.com/watch?v=kOZWQgtqps4'; // replace with your youtube video link

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  console.log(`Opening video: ${videoUrl}`);
  await page.goto(videoUrl, { waitUntil: 'networkidle2' });

  console.log('Scrolling to load all comments...');
  let previousHeight;
  let scrollCount = 0;
  while (true) {
    previousHeight = await page.evaluate('document.documentElement.scrollHeight');
    await page.evaluate('window.scrollTo(0, document.documentElement.scrollHeight)');
    await new Promise(resolve => setTimeout(resolve, 1000));
    let newHeight = await page.evaluate('document.documentElement.scrollHeight');
    scrollCount++;
    console.log(`Scroll attempt #${scrollCount} - Height: ${newHeight}`);

    if (newHeight === previousHeight) break;
  }

  console.log('Finished scrolling. Extracting Super Thanks data...');
  const amounts = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll('span#comment-chip-price'));
    return elements
      .map(el => el.textContent?.trim())
      .filter(Boolean);
  });

  let totalAmountByCurrency = {};
  let superThanksCount = amounts.length;

  console.log(`Found ${superThanksCount} Super Thanks entries.`);
  amounts.forEach((amount, index) => {
    // Capture currency symbol and value
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
