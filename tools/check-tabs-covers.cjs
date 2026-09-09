// Focused offline check for tab customization, verified covers, and Settings layout.
const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const output = process.env.REEL_QA_OUTPUT || path.join(os.tmpdir(), 'reel-tabs-covers-qa');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => {
    const url = route.request().url();
    return url.startsWith('file:') || url.includes('cdn.jsdelivr.net') ? route.continue() : route.abort();
  });
  await page.goto(pathToFileURL(path.resolve(__dirname, '../reel.html')).href);
  await page.waitForSelector('#typeTabs button');

  const coverCheck = await page.evaluate(async () => {
    const candidates = verifiedBookSeries('مملكة البلاغة');
    const migrated = migrate({ title: 'إيكادولي', type: 'book', genres: [] });
    const loaded = await Promise.all(candidates.map(candidate => new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(image.naturalWidth >= 500 && image.naturalHeight >= 700);
      image.onerror = () => resolve(false);
      image.src = candidate.cover;
    })));
    catalog.results = candidates;
    catalog.query = 'مملكة البلاغة';
    query = 'مملكة البلاغة';
    document.querySelector('#q').value = query;
    filterType = 'catalog';
    render();
    return {
      count: candidates.length,
      unique: new Set(candidates.map(candidate => candidate.cover)).size,
      allLocal: candidates.every(candidate => candidate.cover.startsWith('assets/covers/mamlakat-al-balagha/')),
      allLoaded: loaded.every(Boolean),
      migrationCover: migrated.cover
    };
  });
  const movieArtworkCheck = await page.evaluate(async () => {
    const oldWideArtwork = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="navy"/></svg>';
    const posters = HARRY_POTTER_ARTWORK.map(entry => entry.poster);
    const loaded = await Promise.all(posters.map(src => new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve({src,width:image.naturalWidth,height:image.naturalHeight});
      image.onerror = () => resolve({src,width:0,height:0});
      image.src = src;
    })));
    const titles = [
      "Harry Potter and the Philosopher's Stone", 'Harry Potter and the Chamber of Secrets',
      'Harry Potter and the Prisoner of Azkaban', 'Harry Potter and the Goblet of Fire',
      'Harry Potter and the Order of the Phoenix', 'Harry Potter and the Half-Blood Prince',
      'Harry Potter and the Deathly Hallows - Part 1', 'Harry Potter and the Deathly Hallows - Part 2'
    ];
    const items = titles.map((title,index)=>migrate({
      id:`artwork-check-${index}`, title, year:HARRY_POTTER_ARTWORK[index].year,
      type:'movie', status:'done', cover:index===2?oldWideArtwork:HARRY_POTTER_ARTWORK[index].banner,
      genres:['Fantasy'], added:Date.now(), updated:Date.now()-index
    }));
    const item=items[2];
    state.items=items; state.seeded=true; filterType='all'; query=''; render(); openItem(item.id);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    return {
      count:posters.length,
      allPortrait:loaded.every(image=>image.width>=900 && image.height/image.width>=1.4),
      migratedCover:item.cover,
      migratedBanner:item.banner,
      cardCover:document.querySelector('.card[data-id="artwork-check-2"] .poster img')?.getAttribute('src')||'',
      detailCover:document.querySelector('#drawerContent .hero .front .p img')?.getAttribute('src')||'',
      detailBanner:document.querySelector('#drawerContent .hero-banner img')?.getAttribute('src')||''
    };
  });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(output, 'harry-potter-detail-mobile.png'), fullPage: true });
  await page.evaluate(() => closeSheets());
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: path.join(output, 'harry-potter-grid-desktop.png'), fullPage: true });
  const fitCheck = await page.evaluate(async () => {
    const existing=[...document.querySelectorAll('.card .poster img')].map(image=>{
      const style=getComputedStyle(image);
      return {fit:style.objectFit,padding:style.padding,filter:style.filter};
    });
    const probe=document.createElement('div');
    probe.className='poster';
    probe.style.cssText='position:fixed;left:-1000px;width:180px';
    const image=new Image();
    probe.append(image); document.body.append(probe);
    await new Promise(resolve=>{ image.onload=resolve; image.src='data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600"><rect width="1200" height="600" fill="navy"/></svg>'; });
    posterFit(image);
    const style=getComputedStyle(image);
    const landscape={fit:style.objectFit,padding:style.padding,filter:style.filter,orientation:probe.dataset.artOrientation};
    probe.remove();
    return {existing,landscape};
  });
  await page.screenshot({ path: path.join(output, 'mamlakat-al-balagha-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: path.join(output, 'mamlakat-al-balagha-desktop.png') });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { filterType = 'all'; state.ui.tabs = [...BUILTIN_TAB_KEYS]; render(); modalSettings(); });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(output, 'settings-tabs-mobile.png'), fullPage: true });
  const mobileSettings = await page.evaluate(() => ({
    overflow: document.querySelector('#modalContent').scrollWidth > document.querySelector('#modalContent').clientWidth + 1,
    rows: document.querySelectorAll('.tab-manager-row').length,
    mainTabRows: new Set([...document.querySelectorAll('#typeTabs button')].map(tab => Math.round(tab.offsetTop))).size
  }));

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => modalSettings());
  await page.waitForTimeout(200);
  await page.screenshot({ path: path.join(output, 'settings-tabs-desktop.png') });

  if (coverCheck.count !== 7 || coverCheck.unique !== 7 || !coverCheck.allLocal || !coverCheck.allLoaded || !coverCheck.migrationCover) {
    errors.push(`Cover check failed: ${JSON.stringify(coverCheck)}`);
  }
  if (movieArtworkCheck.count !== 8 || !movieArtworkCheck.allPortrait
    || !movieArtworkCheck.cardCover.includes('assets/posters/harry-potter/03-prisoner-of-azkaban.jpg')
    || movieArtworkCheck.cardCover !== movieArtworkCheck.detailCover
    || movieArtworkCheck.migratedBanner !== movieArtworkCheck.detailBanner
    || !movieArtworkCheck.detailBanner.startsWith('data:image/svg+xml')) {
    errors.push(`Movie artwork split failed: ${JSON.stringify(movieArtworkCheck)}`);
  }
  const cleanFit = [...fitCheck.existing,fitCheck.landscape].every(fit => fit.fit === 'cover' && fit.padding === '0px' && fit.filter === 'none');
  if (!cleanFit || fitCheck.landscape.orientation !== 'landscape') errors.push(`Global image fit failed: ${JSON.stringify(fitCheck)}`);
  if (mobileSettings.overflow || mobileSettings.rows !== 8 || mobileSettings.mainTabRows !== 1) {
    errors.push(`Settings layout failed: ${JSON.stringify(mobileSettings)}`);
  }

  console.log(JSON.stringify({ coverCheck, movieArtworkCheck, fitCheck, mobileSettings, errors, output }, null, 2));
  await browser.close();
  if (errors.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
