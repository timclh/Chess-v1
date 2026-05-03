// UX flow walker — clicks through the chess flow and captures each step.
// Usage: node flow.js <baseUrl> <outDir>
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const base = process.argv[2] || 'http://localhost:3000';
  const outDir = path.resolve(process.argv[3] || './flow-shots');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const steps = [];
  const snap = async (name, note) => {
    const file = path.join(outDir, `${String(steps.length + 1).padStart(2, '0')}-${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    steps.push({ step: steps.length + 1, name, note, file });
    console.log(`  ${steps.length}. ${name} — ${note}`);
  };

  console.log('→ 1. Cold load');
  const t0 = Date.now();
  await page.goto(`${base}/#/chess`, { waitUntil: 'networkidle', timeout: 30000 });
  const loadMs = Date.now() - t0;
  await snap('landing', `cold load ${loadMs}ms`);

  console.log('→ 2. Wait for board');
  try { await page.waitForSelector('[data-boardid], .chess-game-layout, .chess-fullscreen-mode', { timeout: 10000 }); } catch {}
  await snap('board-ready', 'board mounted');

  // Detect if fullscreen or desktop layout
  const isFullscreen = await page.$('.chess-fullscreen-mode');
  console.log(`  layout: ${isFullscreen ? 'fullscreen' : 'desktop'}`);

  // Try clicking a square to see selection feedback
  console.log('→ 3. Select a pawn (e2)');
  try {
    const sq = await page.$('[data-squareid="e2"]');
    if (sq) { await sq.click(); await page.waitForTimeout(300); }
  } catch {}
  await snap('pawn-selected', 'after clicking e2');

  console.log('→ 4. Make move e2→e4');
  try {
    const sq = await page.$('[data-squareid="e4"]');
    if (sq) { await sq.click(); await page.waitForTimeout(500); }
  } catch {}
  await snap('move-made', 'after e4');

  console.log('→ 5. AI thinking');
  await page.waitForTimeout(1500);
  await snap('ai-thinking', 'while AI computes');

  console.log('→ 6. Try Hint button');
  try {
    const btn = await page.$('button[title*="Hint" i], .fs-action-btn.hint, .tb-btn.hint');
    if (btn) { await btn.click(); await page.waitForTimeout(500); }
  } catch {}
  await snap('hint-clicked', 'after Hint press');

  console.log('→ 7. Check error/empty states (offline WS)');
  // Simulate console errors surfacing
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await page.waitForTimeout(500);
  await snap('steady-state', 'after interactions');

  // Inspect affordances
  const affordances = await page.evaluate(() => {
    const q = s => Array.from(document.querySelectorAll(s));
    const iconBtns = q('button').filter(b => b.textContent.trim().length <= 2 && !b.getAttribute('aria-label'));
    const primaryCount = q('[class*="primary"]').length;
    const touchSmall = q('button, a').filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && (r.width < 44 || r.height < 44);
    }).map(el => ({ tag: el.tagName, cls: el.className, w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height), text: el.textContent.trim().slice(0, 20) }));
    const focusable = q('[tabindex], button, a, input, select').length;
    const ariaLabels = q('[aria-label]').length;
    return {
      iconButtonsWithoutAriaLabel: iconBtns.length,
      iconButtonsWithoutAriaLabelExamples: iconBtns.slice(0, 5).map(b => ({ text: b.textContent.trim(), cls: b.className })),
      primaryButtons: primaryCount,
      smallTouchTargets: touchSmall.length,
      smallTouchExamples: touchSmall.slice(0, 8),
      focusable,
      ariaLabels
    };
  });

  fs.writeFileSync(path.join(outDir, 'flow.json'), JSON.stringify({
    base, loadMs, layout: isFullscreen ? 'fullscreen' : 'desktop', steps, affordances, consoleErrors
  }, null, 2));
  console.log(`\n✓ flow.json → ${outDir}`);

  await browser.close();
})();
