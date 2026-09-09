// Focused browser QA for pagination and title/person discovery. Uses a fresh browser context.
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

const assert = (condition, message) => { if (!condition) throw new Error(message); };

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith('file:') || url.includes('cdn.jsdelivr.net')) return route.continue();
    if (url.includes('openlibrary.org/search.json')) return route.fulfill({ json: { docs: [] } });
    if (url.includes('api.tvmaze.com/')) return route.fulfill({ json: [] });
    if (url.includes('kitsu.io/')) return route.fulfill({ json: { data: [] } });
    if (url.includes('wikipedia.org/w/api.php')) return route.fulfill({ json: { query: { search: [] } } });
    return route.abort();
  });
  await page.goto(pathToFileURL(path.resolve(__dirname, '../reel.html')).href);
  await page.waitForSelector('#grid');
  await page.evaluate(() => {
    state.items = Array.from({ length: 61 }, (_, index) => {
      const item = makeItem(`Title ${index + 1}`, index % 5 === 0 ? 'book' : 'movie', 'want');
      item.updated = 1000 - index;
      item.year = 2025 - index % 20;
      return item;
    });
    Object.assign(state.items[0], { title: 'Director Match', creator: 'Christopher Nolan' });
    Object.assign(state.items[1], { title: 'Actor Match', cast: [{ name: 'Brad Pitt', role: 'Tyler Durden' }] });
    Object.assign(state.items[2], { title: 'Author Match', type: 'book', creator: 'حنان لاشين', seriesName: 'مملكة البلاغة' });
    filterType = 'all'; filterStatus.clear(); filterGenre = ''; query = ''; libraryPage = 1;
    state.ui.sort = 'updated'; render();
  });

  assert(await page.locator('#grid .card').count() === 24, 'First page should render 24 cards');
  assert(await page.locator('#libraryPagination').isVisible(), 'Pagination should be visible for 61 items');
  const firstRange = await page.locator('#libraryPagination .page-range').textContent();
  assert(/1\s*[-–]\s*24 of 61/.test(firstRange), `First range is incorrect: ${firstRange}`);
  await page.locator('[data-library-page="next"]').click();
  assert(/25\s*[-–]\s*48 of 61/.test(await page.locator('#libraryPagination .page-range').textContent()), 'Next range is incorrect');

  for (const [query, expected] of [
    ['Christopher Nolan', 'Director Match'],
    ['Brad Pitt', 'Actor Match'],
    ['Tyler Durden', 'Actor Match'],
    ['حنان لاشين', 'Author Match'],
    ['مملكه البلاغه', 'Author Match'],
  ]) {
    await page.locator('#q').fill(query);
    await page.waitForTimeout(30);
    assert(await page.locator('#grid .card').count() === 1, `Expected one local match for ${query}`);
    assert((await page.locator('#grid .card h3').textContent()) === expected, `Wrong local match for ${query}`);
  }

  const online = await page.evaluate(async () => {
    filterType = 'catalog'; query = 'مملكة البلاغة'; document.querySelector('#q').value = query;
    updateModeChrome(); await searchCatalog(query);
    return catalog.results.map(item => ({ title: item.title, series: item.seriesName, author: item.creator }));
  });
  assert(online.length === 7, `Expected seven مملكة البلاغة volumes, received ${online.length}`);
  assert(online.every(item => item.series === 'مملكة البلاغة' && item.author === 'حنان لاشين'), 'Series metadata is missing');
  assert(await page.locator('#grid .catalog-card').count() === 7, 'All seven online volume cards should render');

  const byAuthor = await page.evaluate(async () => {
    query = 'حنان محمود لاشين'; document.querySelector('#q').value = query; await searchCatalog(query);
    return catalog.results.filter(item => item.seriesName === 'مملكة البلاغة').length;
  });
  assert(byAuthor === 7, 'Arabic author alias should return the full series');
  assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`);

  console.log(JSON.stringify({ pagination: '24 per page', localPeopleSearch: 'passed', arabicSeries: online.map(item => item.title), browserErrors: errors }, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
