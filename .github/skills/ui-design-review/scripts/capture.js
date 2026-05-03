// UI Design Review — capture script
// Usage: node capture.js <url> [outDir]
//   node capture.js http://localhost:3000/#/chess ./out
//
// Produces screenshots at desktop / tablet / mobile viewports and a JSON
// dump of computed styles for a configurable list of selectors.
//
// Requires: playwright (installed globally or in nearest node_modules).

const path = require('path');
const fs = require('fs');

async function main() {
  const url = process.argv[2] || 'http://localhost:3000';
  const outDir = path.resolve(process.argv[3] || './ui-review');
  fs.mkdirSync(outDir, { recursive: true });

  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (e) {
    console.error('playwright not found. Install with: npm install --no-save playwright && npx playwright install chromium');
    process.exit(1);
  }

  const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 1024, height: 768 },
    { name: 'mobile', width: 390, height: 844 },
  ];

  // Selectors whose computed styles will be dumped to styles.json.
  // Override by passing a JSON file path as the 4th argv.
  const selectors = [
    'body',
    'h1', 'h2', 'h3',
    'button',
    'input',
    '[class*="panel"]',
    '[class*="card"]',
    '[class*="btn"]',
    '[class*="title"]',
    '[class*="status"]',
  ];

  const browser = await chromium.launch();
  const styleReport = {};

  for (const vp of viewports) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.warn(`[${vp.name}] pageerror:`, e.message));
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    } catch (e) {
      console.warn(`[${vp.name}] goto soft-failed: ${e.message}`);
    }
    await page.waitForTimeout(2000);

    const shotPath = path.join(outDir, `${vp.name}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`✓ ${vp.name} → ${shotPath}`);

    // Capture computed styles for the first match of each selector
    styleReport[vp.name] = await page.evaluate((sels) => {
      const props = [
        'background-color', 'color', 'font-size', 'font-weight', 'line-height',
        'padding', 'margin', 'border', 'border-radius', 'box-shadow',
        'width', 'height', 'min-height', 'display', 'gap',
      ];
      const report = {};
      for (const sel of sels) {
        const els = document.querySelectorAll(sel);
        if (!els.length) continue;
        const el = els[0];
        const cs = getComputedStyle(el);
        const entry = { count: els.length, styles: {} };
        for (const p of props) entry.styles[p] = cs.getPropertyValue(p);
        entry.rect = (() => { const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })();
        report[sel] = entry;
      }
      return report;
    }, selectors);

    await ctx.close();
  }

  fs.writeFileSync(
    path.join(outDir, 'styles.json'),
    JSON.stringify(styleReport, null, 2)
  );
  console.log(`✓ styles.json written to ${outDir}`);

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
