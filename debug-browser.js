const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => errors.push({ type: 'console', msg: msg.type(), text: msg.text() }));
  page.on('pageerror', err => errors.push({ type: 'pageerror', text: err.message }));
  page.on('requestfailed', req => errors.push({ type: 'requestfailed', url: req.url(), text: req.failure()?.errorText || 'unknown' }));
  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    const bodyText = await page.locator('body').innerText();
    const html = await page.locator('body').innerHTML();
    console.log('URL=' + page.url());
    console.log('TITLE=' + await page.title());
    console.log('BODY=' + bodyText);
    console.log('HTML=' + html.slice(0, 800));
    console.log('ERRORS=' + JSON.stringify(errors, null, 2));
  } catch (err) {
    console.log('GOTO_ERR=' + err.message);
    console.log('ERRORS=' + JSON.stringify(errors, null, 2));
  }
  await browser.close();
})();
