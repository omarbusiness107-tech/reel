// Browser contract for the split Pick 4 me workspace. Test data stays inside isolated pages.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const output = path.resolve(__dirname, '../.impeccable/review');
const url = pathToFileURL(path.resolve(__dirname, '../reel.html')).href;

const fixtureScript = () => {
  const cover = 'assets/posters/harry-potter/01-philosophers-stone.jpg';
  const records = [
    { title: 'Spider-Verse', type: 'movie', year: 2018, runtime: 117, genres: ['Animation', 'Comedy', 'Action'], country: 'United States of America', creator: 'Bob Persichetti', synopsis: 'An American animated family adventure with humor and energetic action.', score: 8.4, cover },
    { title: 'The Mitchells vs. the Machines', type: 'movie', year: 2021, runtime: 113, genres: ['Animation', 'Comedy', 'Family'], country: 'United States', creator: 'Mike Rianda', synopsis: 'An American animated family comedy about a strange road trip.', score: 7.6, cover },
    { title: 'Ratatouille', type: 'movie', year: 2007, runtime: 111, genres: ['Animation', 'Comedy', 'Family'], country: 'United States', creator: 'Brad Bird', synopsis: 'An American animated comedy for families.', score: 8.1, cover },
    { title: 'The Prestige', type: 'movie', year: 2006, runtime: 130, genres: ['Drama', 'Mystery'], country: 'United States', creator: 'Christopher Nolan', synopsis: 'Christopher Nolan directs rival magicians in a tense mystery.', score: 8.5, cover },
    { title: 'Inception', type: 'movie', year: 2010, runtime: 148, genres: ['Science Fiction', 'Action'], country: 'United States', creator: 'Christopher Nolan', synopsis: 'Christopher Nolan directs a layered science fiction heist.', score: 8.8, cover },
    { title: 'Dunkirk', type: 'movie', year: 2017, runtime: 106, genres: ['War', 'Drama'], country: 'United Kingdom', creator: 'Christopher Nolan', synopsis: 'Christopher Nolan directs a tense wartime survival story.', score: 7.8, cover },
    { title: 'Memento', type: 'movie', year: 2000, runtime: 113, genres: ['Thriller', 'Mystery'], country: 'United States', creator: 'Christopher Nolan', synopsis: 'Christopher Nolan directs a psychological mystery.', score: 8.4, cover },
    { title: 'Oppenheimer', type: 'movie', year: 2023, runtime: 180, genres: ['Drama', 'History'], country: 'United States', creator: 'Christopher Nolan', synopsis: 'Christopher Nolan directs a historical drama.', score: 8.6, cover },
    { title: 'The Dark Knight', type: 'movie', year: 2008, runtime: 152, genres: ['Action', 'Crime'], country: 'United States', creator: 'Christopher Nolan', synopsis: 'Christopher Nolan directs a crime action story.', score: 9, cover }
  ];
  reelRecommendationBridge.library = () => [];
  reelRecommendationBridge.find = () => null;
  reelRecommendationBridge.search = async (_title, type) => records.filter(item => item.type === type);
  reelRecommendationBridge.enrich = async candidate => candidate;
};

async function pageAt(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.request().url().startsWith('file:') ? route.continue() : route.abort());
  await page.goto(url); await page.waitForLoadState('networkidle'); await page.evaluate(fixtureScript);
  if(await page.locator('#btnPick').isVisible()) await page.click('#btnPick');
  else { await page.click('#btnMobileMenu'); await page.click('#navDrawer [data-nav-action="pick"]'); }
  await page.waitForSelector('.rec-shell');
  return { page, errors };
}

async function assertDesktopContainment(page, width, height) {
  const metrics = await page.evaluate(() => {
    const modal = document.querySelector('#modal'), shell = document.querySelector('.rec-shell');
    const composer = document.querySelector('.rec-composer'), left = document.querySelector('.rec-left'), right = document.querySelector('.rec-right');
    const mb = modal.getBoundingClientRect(), cb = composer.getBoundingClientRect();
    return { shellOverflow: shell.scrollHeight - shell.clientHeight, modalBottom: mb.bottom, composerVisible: cb.top >= mb.top && cb.bottom <= mb.bottom, leftWidth: left.getBoundingClientRect().width, rightWidth: right.getBoundingClientRect().width };
  });
  assert.equal(metrics.shellOverflow, 0, `${width}x${height}: outer workspace must not scroll`);
  assert.ok(metrics.modalBottom <= height + 1, `${width}x${height}: modal extends beyond viewport`);
  assert.equal(metrics.composerVisible, true, `${width}x${height}: composer is clipped`);
  assert.ok(metrics.leftWidth > width * .32 && metrics.rightWidth > width * .4, `${width}x${height}: split panels are too narrow`);
  return metrics;
}

async function exerciseDesktop(browser, width, height, name) {
  const { page, errors } = await pageAt(browser, width, height);
  const metrics = await assertDesktopContainment(page, width, height);
  assert.equal(await page.locator('[data-mode]').count(), 2, 'Only Pick 4 me and Surprise me should remain');
  assert.equal(await page.locator('[data-source][aria-pressed="true"]').textContent(), 'Mix', 'Mix is the fresh default');
  assert.ok(await page.locator('.rec-left').isVisible() && await page.locator('.rec-right').isVisible(), 'Both workspaces must be visible');

  await page.fill('#recInput', 'American animation'); await page.click('.rec-form button[type="submit"]');
  await page.waitForSelector('.rec-result');
  assert.match(await page.locator('.rec-context').textContent(), /American/);
  assert.match(await page.locator('.rec-context').textContent(), /animated/);
  assert.equal(await page.locator('.rec-history-item').count(), 1);
  assert.equal(await page.locator('.rec-turn.user[data-message]').count(), 1);
  await page.click('.rec-turn.user[data-message]');
  assert.equal(await page.locator('.rec-turn.user.selected').count(), 1, 'Chat request selects its recommendation group');

  await page.fill('#recInput', 'Actually give me 3 Christopher Nolan movies'); await page.click('.rec-form button[type="submit"]');
  await page.waitForFunction(() => document.querySelectorAll('.rec-list button').length === 3);
  const listTitles = await page.locator('.rec-list b').allTextContents();
  assert.equal(new Set(listTitles).size, 3, 'List recommendations must be distinct');
  assert.equal(await page.locator('.rec-history-item').count(), 4, 'History keeps all picks from both requests');

  await page.fill('#recInput', 'Keep this draft');
  await page.locator('.rec-list').evaluate(element => { element.scrollLeft = 60; });
  const listScroll = await page.locator('.rec-list').evaluate(element => element.scrollLeft);
  await page.click('[data-rec="details"]'); await page.waitForSelector('#modal.on [data-picker-back]');
  await page.click('#modal [data-picker-back]'); await page.waitForSelector('#modal.on .rec-list');
  assert.equal(await page.locator('.rec-list button').count(), 3, 'Details return restores the exact list');
  assert.equal(await page.locator('.rec-turn.user[data-message]').count(), 2, 'Details return restores chat');
  assert.equal(await page.inputValue('#recInput'), 'Keep this draft', 'Details return preserves an unsent message');
  assert.equal(await page.locator('.rec-list').evaluate(element => element.scrollLeft), listScroll, 'Details return preserves list scroll');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => { document.documentElement.dataset.theme = value; }, theme);
    await assertDesktopContainment(page, width, height);
    assert.equal(await page.locator('.rec-art img').evaluate(image => image.complete && image.naturalWidth > 0), true, 'Fixture cover must load');
    assert.equal(await page.locator('.rec-art img').evaluate(image => getComputedStyle(image).objectFit), 'contain', 'Full cover must not crop');
  }
  if (process.env.REEL_QA_SCREENSHOTS !== '0') await page.screenshot({ path: path.join(output, name), fullPage: false });

  await page.click('[data-source="discover"]'); await page.click('[data-mode="surprise"]');
  assert.equal(await page.locator('[data-source="discover"]').getAttribute('aria-pressed'), 'true', 'Mode switch preserves source');
  assert.equal(await page.locator('.rec-form').isVisible(), false, 'Surprise me has no composer');
  assert.match(await page.locator('.rec-surprise-chat').textContent(), /Feeling lucky/);
  await page.click('[data-mode="pick"]');
  assert.equal(await page.locator('.rec-history-item').count(), 0, 'Mode content does not leak');
  assert.ok(await page.locator('#recInput').isVisible());
  await page.click('[data-rec="reset"]');
  assert.equal(await page.locator('[data-mode="pick"]').getAttribute('aria-selected'), 'true', 'Start over stays in the current mode');
  assert.equal(await page.locator('[data-source="mix"]').getAttribute('aria-pressed'), 'true', 'Start over returns to Mix');
  await page.locator('[data-mode="pick"]').focus(); await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('[data-mode="surprise"]').getAttribute('aria-selected'), 'true', 'Mode tabs support arrow keys');
  await page.keyboard.press('ArrowLeft');
  assert.equal(await page.locator('[data-mode="pick"]').getAttribute('aria-selected'), 'true');

  assert.deepEqual(errors, []); await page.close(); return metrics;
}

async function exerciseMobile(browser) {
  const { page, errors } = await pageAt(browser, 390, 844);
  assert.equal(await page.locator('[data-pane="chat"]').getAttribute('aria-selected'), 'true');
  assert.ok(await page.locator('.rec-composer').isVisible());
  const composer = await page.locator('.rec-composer').boundingBox();
  assert.ok(composer && composer.y + composer.height <= 844, 'Mobile composer must remain onscreen');
  await page.fill('#recInput', 'American animation'); await page.click('.rec-form button[type="submit"]');
  await page.waitForSelector('.rec-result');
  assert.equal(await page.locator('[data-pane="pick"]').getAttribute('aria-selected'), 'true', 'A result opens the Pick panel on mobile');
  await page.click('[data-pane="chat"]'); assert.ok(await page.locator('.rec-composer').isVisible());
  if (process.env.REEL_QA_SCREENSHOTS !== '0') await page.screenshot({ path: path.join(output, 'recommendations-mobile.png'), fullPage: false });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.ok(await page.locator('.rec-turn').first().evaluate(element => parseFloat(getComputedStyle(element).animationDuration) <= .001));
  assert.deepEqual(errors, []); await page.close();
}

async function exerciseHostedAIContract(browser) {
  // Hosted transport is mocked: this verifies client behavior, not model quality or production auth.
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [], requests = [], aiChoices = [];
  let failRanking = false;
  page.on('pageerror', error => errors.push(error.message));
  const workspace = path.resolve(__dirname, '..');
  const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
  await page.route('**/*', async route => {
    const target = new URL(route.request().url());
    if (target.origin !== 'https://reel.test') return route.abort();
    if (target.pathname === '/api/recommend') {
      if (route.request().method() === 'GET') return route.fulfill({ json: { configured: true } });
      const body = route.request().postDataJSON(); requests.push(body);
      if (body.action === 'interpret') return route.fulfill({ json: { update: { origins: [], semanticTraits: [], resultCount: 1 }, question: null, suggestions: [], searchHints: [] } });
      if (failRanking) return route.fulfill({ status: 503, json: { error: 'Test-only ranking outage' } });
      const choices = body.candidates.slice(-body.count).reverse().map(candidate => ({ id: candidate.id, why: 'Mock AI chose this supplied catalog record.' }));
      aiChoices.push(choices.map(choice => choice.id)); return route.fulfill({ json: { choices } });
    }
    const filename = path.resolve(workspace, `.${decodeURIComponent(target.pathname)}`);
    if (!filename.startsWith(`${workspace}${path.sep}`) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ body: fs.readFileSync(filename), contentType: contentTypes[path.extname(filename)] || 'application/octet-stream' });
  });
  await page.goto('https://reel.test/reel.html'); await page.waitForLoadState('networkidle');
  await page.evaluate(fixtureScript);
  await page.evaluate(() => { reelRecommendationBridge.signedIn = () => true; reelRecommendationBridge.token = async () => 'mock-session-token'; });
  await page.click('#btnPick');
  await page.waitForFunction(() => document.querySelector('#recEngine')?.textContent === 'Live AI');
  await page.fill('#recInput', 'Give me a few American animated movies'); await page.click('.rec-form button[type="submit"]');
  await page.waitForSelector('.rec-result');
  const first = await page.evaluate(() => ReelRecommendationUI.state());
  assert.equal(first.session.intent.resultCount, 5, 'AI must not erase locally parsed list count');
  assert.ok(first.session.intent.origins.includes('American') && first.session.intent.semanticTraits.includes('animated'), 'AI must not drop either half of a multi-concept request');
  assert.deepEqual(first.history.at(-1).items.map(item => item.candidate.recId), aiChoices.at(-1), 'Validated AI choices must be displayed without local rerandomization');
  await page.fill('#recInput', 'Actually forget animation, give me 3 Christopher Nolan movies'); await page.click('.rec-form button[type="submit"]');
  await page.waitForFunction(() => document.querySelectorAll('.rec-list button').length === 3 && document.querySelector('.rec-context')?.textContent.includes('Christopher Nolan'));
  const resetRequest = requests.filter(request => request.action === 'interpret').at(-1);
  assert.deepEqual(resetRequest.intent.origins, []); assert.deepEqual(resetRequest.intent.semanticTraits, []);
  assert.deepEqual(resetRequest.answers, []); assert.deepEqual(resetRequest.questions, []); assert.equal(resetRequest.previous, null, 'Direction reset must not leak the previous result into live AI context');
  const second = await page.evaluate(() => ReelRecommendationUI.state());
  assert.equal(second.session.intent.resultCount, 3);
  assert.deepEqual(second.history.at(-1).items.map(item => item.candidate.recId), aiChoices.at(-1));
  await page.locator('.rec-list').evaluate(element => { element.scrollLeft = 60; });
  const beforeRefresh = await page.locator('.rec-list').evaluate(element => element.scrollLeft);
  await page.click('.rec-preferences summary'); await page.check('#recRatings');
  assert.equal(await page.locator('.rec-list').evaluate(element => element.scrollLeft), beforeRefresh, 'Preference rerender preserves horizontal list scroll');
  await page.click('.rec-preferences summary');
  failRanking = true;
  await page.click('[data-rec="another"]');
  await page.waitForFunction(() => document.querySelector('.rec-why')?.textContent.includes('used local matching'));
  assert.equal(await page.locator('.rec-list button').count(), 3, 'Ranking failure retains a usable local list');
  await page.evaluate(() => { reelRecommendationBridge.search = async () => { await new Promise(resolve => setTimeout(resolve, 200)); return []; }; });
  await page.fill('#recInput', 'Actually give me a gun movie'); await page.click('.rec-form button[type="submit"]'); await page.waitForSelector('.rec-loading');
  await page.click('[data-source="library"]'); await page.waitForTimeout(350);
  assert.equal(await page.locator('.rec-result').count(), 0, 'Cancelled retrieval must not commit a stale result');
  assert.ok(await page.locator('#recInput').isEnabled(), 'Filter changes cancel loading without leaving a disabled composer');
  assert.equal(await page.locator('[data-source="library"]').getAttribute('aria-pressed'), 'true');
  assert.deepEqual(errors, []); await page.close();
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const laptop = await exerciseDesktop(browser, 1366, 768, 'recommendations-1366.png');
    const desktop = await exerciseDesktop(browser, 1440, 900, 'recommendations-1440.png');
    await exerciseMobile(browser);
    await exerciseHostedAIContract(browser);
    console.log('PASS: split workspace, viewport containment, combined chat, semantic chips, list mode, unique results, history linkage, Details restore, mode isolation, source preservation, Start over, mobile Chat/Pick, reduced motion, mocked hosted AI choice order, multi-concept protection, direction reset and explicit local fallback.');
    console.log(JSON.stringify({ laptop, desktop }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
