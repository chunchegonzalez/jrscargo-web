const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

    console.log('Navigating to http://localhost:3000 ...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
    console.log('Page loaded!');
    
    // Find QuoteCalculator inputs
    const originButtons = await page.$$('button');
    console.log(`Found ${originButtons.length} buttons on the page.`);
    
    // try to find the 'EE. UU.' button
    const usaBtn = await page.$x("//button[contains(., 'EE. UU.')]");
    if (usaBtn.length > 0) {
      console.log('Found EE. UU. button. Clicking it...');
      await usaBtn[0].click();
    } else {
      console.log('Could not find EE. UU. button!');
    }

    // Try to type weight
    const input = await page.$('input[placeholder="Ej. 10"]');
    if (input) {
      console.log('Found weight input. Typing 15...');
      await input.type('15');
      
      // wait a bit for React to update
      await new Promise(r => setTimeout(r, 500));
      
      const total = await page.$eval('.text-4xl.font-black', el => el.innerText);
      console.log('Total Estimated:', total);
    } else {
      console.log('Could not find weight input!');
    }

    await browser.close();
  } catch (err) {
    console.error('SCRIPT ERROR:', err);
  }
})();
