// Run with Playwright on NODE_PATH. Uses a fresh browser context, never your library.
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const output = process.env.REEL_QA_OUTPUT || path.join(require('node:os').tmpdir(), 'reel-responsive-qa');
const widths = [320, 390, 520, 640, 768, 1024, 1120, 1280, 1440, 1920, 2560];

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Keep public catalogs offline so layout verification is deterministic.
  await page.route('**/*', route => {
    const url = route.request().url();
    return url.startsWith('file:') || url.includes('cdn.jsdelivr.net') ? route.continue() : route.abort();
  });
  await page.goto(pathToFileURL(path.resolve(__dirname, '../reel.html')).href);
  await page.waitForSelector('#typeTabs button');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    // Representative local fixtures keep this layout sweep quick and offline.
    state.items = state.items.filter((item, index) => index < 8 || ['series', 'anime', 'book'].includes(item.type)).slice(0, 14);
    state.items.forEach(item => { item.castTried = true; item.castHydrated = true; });
    state.items[0].status = 'going';
  });
  const results = [];
  const inspect = async (name, width, lang, theme) => {
    const result = await page.evaluate(() => {
      const root = document.querySelector('.modal.on,.drawer.on') || document.documentElement;
      const tabs = [...document.querySelectorAll('#typeTabs button')];
      const tabRail = document.querySelector('#typeTabs');
      const clipped = [...document.querySelectorAll('#typeTabs .tab-label,.catalog-type-filters button span')]
        .filter(el => el.getClientRects().length && el.scrollWidth > el.clientWidth + 1)
        .map(el => el.textContent);
      return { overflow: root.scrollWidth > root.clientWidth + 1, scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth, clipped,
        tabRows: new Set(tabs.map(el => Math.round(el.offsetTop))).size,
        tabScrollable: tabRail.scrollWidth > tabRail.clientWidth + 1 };
    });
    results.push({ name, width, lang, theme, ...result });
  };
  for (const lang of ['en', 'fr', 'ar']) {
    for (const theme of ['dark', 'light']) {
      for (const width of widths) {
        await page.setViewportSize({ width, height: width === 768 ? 480 : 900 });
        await page.evaluate(({ lang, theme }) => {
          closeSheets(); filterType = 'all'; query = ''; filterStatus.clear(); filterGenre = '';
          state.ui.language = lang; state.ui.theme = theme; state.ui.view = 'grid'; render();
        }, { lang, theme });
        await page.waitForTimeout(320);
        await inspect('library', width, lang, theme);
        if (lang === 'en' && [390, 1440].includes(width)) {
          await page.screenshot({ path: path.join(output, `library-${theme}-${width}.png`) });
        }
        await page.evaluate(() => { filterStatus.add('done'); updateModeChrome(); renderGrid(); });
        await inspect('filtered', width, lang, theme);
        await page.evaluate(() => { state.ui.view = 'list'; updateModeChrome(); renderGrid(); });
        await inspect('list', width, lang, theme);
        await page.evaluate(() => { filterType = 'catalog'; updateModeChrome(); renderGrid(); });
        await page.waitForTimeout(320);
        await inspect('online', width, lang, theme);
        if (lang === 'en' && theme === 'dark' && [390, 1440].includes(width)) {
          await page.screenshot({ path: path.join(output, `online-${width}.png`) });
        }
        await page.evaluate(() => { openItem(state.items.find(item => item.type === 'series').id); });
        await page.waitForTimeout(300);
        await inspect('details', width, lang, theme);
        if (lang === 'en' && theme === 'dark' && width === 390) await page.screenshot({ path: path.join(output, 'details-390.png') });
        await page.evaluate(() => { closeSheets(); modalAdd(); });
        await page.waitForTimeout(80);
        await inspect('add', width, lang, theme);
        await page.evaluate(() => { closeSheets(); modalSettings(); });
        await inspect('settings', width, lang, theme);
        await page.evaluate(() => closeSheets());
      }
    }
  }
  // Exercise actual controls, including menus in narrow and RTL layouts.
  for (const lang of ['en', 'ar']) {
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(lang => {
        state.ui.language = lang; state.ui.theme = 'dark'; filterType = 'all';
        filterStatus.clear(); state.ui.view = 'grid'; render(); window.scrollTo(0, 0);
      }, lang);
      const droppedBefore = await page.locator('#statusChips [data-status="dropped"]').evaluate(el => el.offsetTop);
      await page.locator('#statusChips [data-status="want"]').click();
      const droppedAfter = await page.locator('#statusChips [data-status="dropped"]').evaluate(el => el.offsetTop);
      if (droppedBefore !== droppedAfter) errors.push(`Status row moved at ${width}, ${lang}`);
      const trigger = page.locator('.mini-select-host').filter({ has: page.locator('#sort') }).locator('.smart-select-trigger');
      await trigger.click();
      await page.waitForTimeout(320);
      const selectFits = await page.evaluate(() => {
        const { menu, trigger } = openSmart;
        const m = menu.getBoundingClientRect(), t = trigger.getBoundingClientRect();
        return Math.abs(m.width - t.width) < 2 && m.left >= -1 && m.right <= innerWidth + 1;
      });
      if (!selectFits) errors.push(`Dropdown detached/overflow at ${width}, ${lang}`);
      await page.keyboard.press('Escape');
      if (width < 1281) {
        await page.locator('#btnMobileMenu').click();
        if (!(await page.locator('#mobileMenu').isVisible())) errors.push(`Menu inaccessible at ${width}`);
        await page.keyboard.press('Escape');
      }
      await page.evaluate(() => modalPick());
      await page.waitForTimeout(80);
      await inspect('pick', width, lang, 'dark');
      await page.evaluate(() => closeSheets());
    }
  }
  // Settings can hide a media tab and restore it without touching library data.
  await page.setViewportSize({ width: 390, height: 900 });
  const tabManager = await page.evaluate(() => {
    state.ui.tabs = [...BUILTIN_TAB_KEYS]; filterType = 'anime'; render();
    const itemCount = state.items.length;
    modalSettings();
    document.querySelector('[data-remove-tab="anime"]').click();
    const removed = !document.querySelector('#typeTabs [data-type="anime"]') && filterType === 'all';
    const selector = document.querySelector('#sTabAdd');
    selector.value = 'anime';
    document.querySelector('#sTabAddBtn').click();
    return {
      removed,
      restored: !!document.querySelector('#typeTabs [data-type="anime"]'),
      itemsPreserved: state.items.length === itemCount,
      tabRows: new Set([...document.querySelectorAll('#typeTabs button')].map(el => Math.round(el.offsetTop))).size
    };
  });
  if (!tabManager.removed || !tabManager.restored || !tabManager.itemsPreserved || tabManager.tabRows !== 1) {
    errors.push(`Tab manager failed: ${JSON.stringify(tabManager)}`);
  }
  await page.evaluate(() => closeSheets());

  // The menu must remain present while it reverses, then finish fully closed.
  await page.evaluate(() => { filterType = 'all'; render(); window.scrollTo(0, 0); });
  const sortTrigger = page.locator('.mini-select-host').filter({ has: page.locator('#sort') }).locator('.smart-select-trigger');
  await sortTrigger.click();
  await page.waitForTimeout(240);
  const openedMenu = await page.evaluate(() => ({
    open: openSmart?.menu.dataset.open === 'true',
    joined: openSmart?.host.dataset.menuOpen === 'true',
    duration: getComputedStyle(openSmart.menu).transitionDuration
  }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  const reversingMenu = await page.evaluate(() => {
    const menu = document.querySelector('.smart-select-menu[data-closing="true"]');
    return { present: !!menu && !menu.hidden, opacity: menu ? +getComputedStyle(menu).opacity : 0 };
  });
  await page.waitForTimeout(180);
  const closedMenu = await page.evaluate(() => !document.querySelector('.smart-select-menu[data-closing="true"]'));
  if (!openedMenu.open || !openedMenu.joined || !openedMenu.duration.includes('0.22s')) errors.push(`Dropdown open animation failed: ${JSON.stringify(openedMenu)}`);
  if (!reversingMenu.present || reversingMenu.opacity <= 0 || reversingMenu.opacity >= 1) errors.push(`Dropdown reverse animation failed: ${JSON.stringify(reversingMenu)}`);
  if (!closedMenu) errors.push('Dropdown did not finish closing');

  const failures = results.filter(r => r.overflow || r.clipped.length || r.tabRows !== 1);
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ results, errors }, null, 2));
  console.log(JSON.stringify({ checked: results.length, failures: failures.slice(0, 30), failureCount: failures.length, errors: [...new Set(errors)], output }, null, 2));
  await browser.close();
  if (failures.length || errors.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
