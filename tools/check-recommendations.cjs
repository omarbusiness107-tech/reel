// Uses the existing project's Playwright runtime; all library writes are in an isolated test browser.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const output = path.resolve(__dirname, '../.impeccable/review');
const url = pathToFileURL(path.resolve(__dirname, '../reel.html')).href;
(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.route('**/*', route => route.request().url().startsWith('file:') ? route.continue() : route.abort());
    await page.goto(url); await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      const titles = [
        ['Harry Potter and the Chamber of Secrets', 2002, 161, '02-chamber-of-secrets'],
        ["Harry Potter and the Philosopher's Stone", 2001, 152, '01-philosophers-stone'],
        ['Harry Potter and the Prisoner of Azkaban', 2004, 142, '03-prisoner-of-azkaban']
      ];
      state.items = titles.map(([title, year, runtime, cover]) => ({ ...makeItem(title, 'movie', 'want'), year, runtime,
        cover: `assets/posters/harry-potter/${cover}.jpg`, genres: ['Fantasy', 'Adventure'], synopsis: 'A young wizard and his friends encounter mysteries at Hogwarts.', ageRating: 'PG' }));
      render(); window.recSearchCalls = 0;
      reelRecommendationBridge.search = async (title, type) => { window.recSearchCalls++; return [{ title: 'Catalog test title', type, year: 2020, runtime: 80, genres: ['Comedy'], synopsis: 'A comedy about friendship.', catalogId: 'qa:external', sourceName: 'Test fixture' }]; };
      reelRecommendationBridge.enrich = async c => c;
    });
    await page.click('#btnPick'); await page.waitForSelector('.rec-shell');
    assert.equal(await page.locator('[data-source][aria-pressed="true"]').textContent(), 'My List');
    await page.fill('#recInput', 'I want a fantasy movie under 170 minutes'); await page.click('.rec-form button[type="submit"]');
    await page.waitForSelector('.rec-result');
    const first = await page.locator('.rec-result h2').textContent();
    assert.equal(await page.evaluate(() => window.recSearchCalls), 0, 'My List must make zero catalog searches');
    await page.screenshot({ path: path.join(output, 'recommendations-desktop.png'), fullPage: true });
    await page.fill('#recInput', 'Another but shorter'); await page.click('.rec-form button[type="submit"]');
    await page.waitForFunction(first => document.querySelector('.rec-result h2')?.textContent !== first && !!document.querySelector('.rec-result'), first);
    assert.ok((await page.locator('.rec-context').textContent()).includes('160 min'));
    assert.ok((await page.locator('.rec-context').textContent()).includes('fantasy'));
    await page.click('[data-rec="reject"]'); await page.waitForSelector('[data-answer="Wrong mood"]');
    assert.equal(await page.locator('.rec-main [data-answer]').count(), 7);
    await page.fill('#recInput', 'Keep the fantasy, just another one'); await page.click('.rec-form button[type="submit"]');
    await page.waitForSelector('.rec-result');
    await page.click('[data-rec="another"]'); await page.waitForSelector('.rec-error');
    assert.match(await page.locator('.rec-error').textContent(), /haven’t searched outside your library/);
    assert.equal(await page.evaluate(() => window.recSearchCalls), 0);
    await page.click('[data-rec="reset"]'); await page.click('[data-mode="ask"]');
    await page.waitForSelector('.rec-question');
    assert.ok(await page.locator('.rec-main [data-answer]').count() >= 3);
    assert.ok(await page.locator('#recInput').isVisible());
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#modal').getAttribute('aria-hidden'), 'true');
    await page.click('#btnPick'); assert.match(await page.locator('.rec-main').textContent(), /What would feel good/);
    // The UI remains within the viewport in both themes, at desktop and narrow widths.
    for (const theme of ['dark', 'light']) for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 });
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      const overflow = await page.evaluate(() => {
        const box = document.querySelector('.rec-shell').getBoundingClientRect();
        return box.left < 0 || box.right > innerWidth + 1 || document.querySelector('#modal').scrollWidth > document.querySelector('#modal').clientWidth + 1;
      });
      assert.equal(overflow, false, `${theme} at ${width}px overflows`);
      const composerOnscreen = await page.locator('#recInput').evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
      assert.equal(composerOnscreen, true, `Reply input must stay visible at ${width}px`);
      if (width === 390) await page.screenshot({ path: path.join(output, `recommendations-mobile-${theme}.png`), fullPage: true });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.rec-question').evaluate(el => getComputedStyle(el).animationName), 'none');
    await page.click('[data-rec="reset"]'); await page.click('[data-source="discover"]');
    await page.fill('#recInput', 'A funny movie under 100 minutes'); await page.click('.rec-form button[type="submit"]');
    await page.waitForSelector('.rec-result'); assert.ok(await page.evaluate(() => window.recSearchCalls) > 0);
    const count = await page.evaluate(() => state.items.length);
    await page.click('[data-rec="add"]'); assert.equal(await page.evaluate(() => state.items.length), count + 1);
    assert.equal(await page.locator('[data-rec="add"]').textContent(), 'In my library');
    // Account/provider failures are tested by API contracts; network cancellation is exercised here.
    await page.click('[data-rec="reset"]');
    await page.evaluate(() => { reelRecommendationBridge.search = () => new Promise(resolve => setTimeout(() => resolve([]), 250)); });
    await page.fill('#recInput', 'A funny movie'); await page.click('.rec-form button[type="submit"]');
    await page.click('[data-source="library"]');
    await page.waitForTimeout(400);
    assert.equal(await page.locator('[data-source="library"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('.rec-result').count(), 0, 'Stale external response cannot replace the new source');
    // Hosted-mode contract test: AI interpretation + real-record selection through the browser.
    const hosted = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    let aiInterpretCalls = 0, aiRankCalls = 0;
    await hosted.route('**/*', async route => {
      const request = route.request(), u = new URL(request.url());
      if (u.origin !== 'http://reel.test') return route.abort();
      if (u.pathname === '/api/recommend') {
        if (request.method() === 'GET') return route.fulfill({ json: { configured: true } });
        const body = request.postDataJSON();
        if (body.action === 'interpret') { aiInterpretCalls++; return route.fulfill({ json: { update: { themes: ['isolation'], maxRuntime: 999, mediaType: 'book' }, question: null, suggestions: [], searchHints: [] } }); }
        aiRankCalls++;
        return route.fulfill({ json: { choices: [{ id: body.candidates[0].id, why: 'Its catalog description explores isolation, matching your request.' }] } });
      }
      const relative = u.pathname === '/' ? 'reel.html' : u.pathname.slice(1);
      const file = path.resolve(__dirname, '..', relative);
      if (!file.startsWith(path.resolve(__dirname, '..') + path.sep) || !fs.existsSync(file)) return route.abort();
      return route.fulfill({ path: file, contentType: relative.endsWith('.js') ? 'application/javascript' : relative.endsWith('.css') ? 'text/css' : relative.endsWith('.html') ? 'text/html' : undefined });
    });
    await hosted.goto('http://reel.test'); await hosted.waitForLoadState('networkidle');
    await hosted.evaluate(() => {
      state.items = ['First', 'Second'].map(title => ({ ...makeItem(title, 'movie', 'want'), runtime: 80, synopsis: 'An intimate story about isolation.', genres: ['Drama'] }));
      reelRecommendationBridge.signedIn = () => true; reelRecommendationBridge.token = async () => 'test-token';
      reelRecommendationBridge.search = () => { throw new Error('My List must not search externally'); };
    });
    await hosted.click('#btnPick');
    await hosted.waitForFunction(() => document.querySelector('#recEngine')?.textContent.includes('AI matching:'));
    await hosted.fill('#recInput', 'A movie under 90 minutes about loneliness'); await hosted.click('.rec-form button[type="submit"]');
    await hosted.waitForSelector('.rec-result');
    assert.match(await hosted.locator('.rec-context').textContent(), /90 min/);
    assert.match(await hosted.locator('.rec-meta').textContent(), /Movie/);
    assert.equal(aiInterpretCalls, 1); assert.equal(aiRankCalls, 1);
    await hosted.click('[data-rec="another"]');
    await hosted.waitForFunction(() => document.querySelector('.rec-result h2')?.textContent === 'Second');
    assert.equal(await hosted.evaluate(() => document.activeElement?.dataset.rec), 'another', 'Another retains keyboard focus through async loading');
    assert.equal(aiInterpretCalls, 1, 'Plain Another must not reinterpret or loosen constraints');
    assert.equal(aiRankCalls, 2);
    await hosted.close();
    assert.deepEqual(errors, []);
    console.log('PASS: My List isolation, preserved constraints, no repeats, feedback, empty state, Ask Me chips/free text, session reopening, add, cancellation, reduced motion, 8 theme/viewport layouts, always-visible reply field, hosted AI pipeline and hard-constraint preservation.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
