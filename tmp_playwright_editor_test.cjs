const { chromium } = require('playwright');
(async () => {
  for (const port of [5173, 5174]) {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log(`${port} console ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`${port} pageerror: ${err.message}`));
    page.on('requestfailed', req => console.log(`${port} reqfailed: ${req.url()} ${req.failure()?.errorText}`));
    try {
      const resp = await page.goto(`http://[::1]:${port}/editor`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      console.log(`${port} status`, resp.status());
      const html = await page.content();
      console.log(`${port} html len`, html.length);
      const root = await page.$('#root');
      console.log(`${port} root exists`, !!root);
      const bodyText = await page.textContent('body');
      console.log(`${port} body text snippet:`, bodyText.slice(0, 200));
    } catch (err) {
      console.log(`${port} error`, err.message);
    }
    await browser.close();
  }
  process.exit(0);
})();
