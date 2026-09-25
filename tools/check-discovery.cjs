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
    if (url.includes('query.wikidata.org/sparql')) return route.fulfill({ json: { results: { bindings: Array.from({ length: 105 }, (_, index) => ({
      work: { value: `http://www.wikidata.org/entity/Q${100001 + index}` },
      workLabel: { value: `Remote Work ${index + 1}` },
      date: { value: `${2025 - index % 40}-01-01T00:00:00Z` },
      instanceLabel: { value: index % 4 ? 'film' : 'television series' },
      sitelinks: { value: String(500 - index) }, creditRole: { value: index % 5 ? 'Acting' : 'Directing' }
    })) } } });
    if (url.includes('wikidata.org/w/api.php')) {
      const ids = new URL(url).searchParams.get('ids') || '';
      if (ids.split('|').some(id=>/^Q10\d{4}$/.test(id))) return route.fulfill({ json: { entities: Object.fromEntries(ids.split('|').map((id,index)=>[id,{ id, sitelinks:{ enwiki:{ title:`Remote Work ${index+1}` } } }])) } });
      if (ids.includes('Q99999')) return route.fulfill({ json: { entities: { Q99999: {
        id: 'Q99999', labels: { en: { value: 'Remote Actor' } }, descriptions: { en: { value: 'award-winning actor and director' } },
        aliases: { en: [{ value: 'R. Actor' }] }, sitelinks: { enwiki: { title: 'Remote Actor' }, frwiki: { title: 'Remote Actor' } },
        claims: { P31: [{ mainsnak: { datavalue: { value: { id: 'Q5' } } } }], P106: [{ mainsnak: { datavalue: { value: { id: 'Q33999' } } } }], P18: [{ mainsnak: { datavalue: { value: 'Missing portrait.jpg' } } }], P569: [{ mainsnak: { datavalue: { value: { time: '+1974-11-11T00:00:00Z' } } } }], P19: [{ mainsnak: { datavalue: { value: { id: 'QCITY' } } } }] }
      } } } });
      return route.fulfill({ json: { entities: { Q33999: { labels: { en: { value: 'actor' } } }, QCITY: { labels: { en: { value: 'Test City' } } } } } });
    }
    if (url.includes('/api/rest_v1/page/summary/Remote_Actor')) return route.fulfill({ json: { title: 'Remote Actor', wikibase_item: 'Q99999', description: 'award-winning actor and director', extract: 'Remote Actor has a long documented career across film and television. '.repeat(12), content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Remote_Actor' } } } });
    if (url.includes('/api/rest_v1/page/summary/Remote_Work_')) return route.fulfill({ json: { thumbnail: { source: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="navy"/></svg>' } } });
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
    Object.assign(state.items[3], { title: 'Interstellar', key: norm('Interstellar'), creator: 'Christopher Nolan' });
    Object.assign(state.items[4], { title: 'The Dark Knight', key: norm('The Dark Knight'), creator: 'Christopher Nolan' });
    Object.assign(state.items[5], { title: 'Leonardo Film', key: norm('Leonardo Film'), cast: [{ name: 'Leonardo DiCaprio', role: 'Actor' }] });
    Object.assign(state.items[6], { title: 'Johnny Film', key: norm('Johnny Film'), cast: [{ name: 'Johnny Depp', role: 'Actor' }] });
    Object.assign(state.items[7], { title: 'Batman Returns', key: norm('Batman Returns') });
    filterType = 'all'; filterStatus.clear(); filterGenre = ''; query = ''; libraryPage = 1;
    state.ui.sort = 'updated'; render();
  });

  const pageSize=await page.evaluate(()=>libraryPageSize());
  assert(pageSize === 30, `1440px grid should render five balanced rows, received ${pageSize}`);
  assert(await page.locator('#grid .card').count() === pageSize, 'First page should render one responsive page');
  assert(await page.locator('#libraryPagination').isVisible(), 'Pagination should be visible for 61 items');
  const firstRange = await page.locator('#libraryPagination .page-range').textContent();
  assert(new RegExp(`1\\s*[-–]\\s*${pageSize} of 61`).test(firstRange), `First range is incorrect: ${firstRange}`);
  assert(await page.locator('[data-library-page="1"]').getAttribute('aria-current') === 'page', 'Current page must be exposed');
  await page.locator('[data-library-page="next"]').click();
  assert(new RegExp(`${pageSize+1}\\s*[-–]\\s*${pageSize*2} of 61`).test(await page.locator('#libraryPagination .page-range').textContent()), 'Next range is incorrect');
  await page.evaluate(()=>{libraryPage=20;renderLibraryPagination(1000,570,600,34);});
  assert(await page.locator('#libraryPagination .page-button').count()<=7,'Large pagination should stay condensed');
  assert(await page.locator('#libraryPagination .page-ellipsis').count()===2,'Large pagination should use ellipses');
  assert(await page.locator('[data-library-page="20"]').getAttribute('aria-current')==='page','Condensed pagination should expose the current page');
  await page.evaluate(()=>{libraryPage=1;renderGrid();});

  for (const [query, expected] of [
    ['Christopher Nolan', 'Director Match'],
    ['Brad Pitt', 'Actor Match'],
    ['Tyler Durden', 'Actor Match'],
    ['حنان لاشين', 'Author Match'],
    ['مملكه البلاغه', 'Author Match'],
  ]) {
    await page.locator('#q').fill(query);
    await page.waitForTimeout(30);
    assert(await page.locator('#grid .card').count() >= 1, `Expected a local match for ${query}`);
    assert((await page.locator('#grid .card h3').allTextContents()).includes(expected), `Missing local match for ${query}`);
  }

  for (const [query, expected] of [['interstelar','Interstellar'],['dark kn','The Dark Knight']]) {
    await page.locator('#q').fill(query);
    await page.waitForTimeout(40);
    assert((await page.locator('#grid .card h3').first().textContent()) === expected, `Fuzzy/partial match failed for ${query}`);
  }
  await page.locator('#q').fill('interstelar');
  assert(await page.locator('#searchCorrection').isVisible(), 'Did you mean should be visible for a strong typo');
  assert(/Interstellar/.test(await page.locator('#searchCorrection').innerText()),'Correction should name Interstellar');
  await page.locator('#searchCorrection button').click();
  assert((await page.locator('#q').inputValue())==='Interstellar','Correction should update the query');

  await page.locator('#q').fill('christoper nolan');
  await page.waitForTimeout(40);
  assert(await page.locator('#searchSuggestions .suggestion-label').filter({hasText:'People'}).count()===1,'People group should appear in autocomplete');
  await page.locator('#q').press('ArrowDown');
  assert(await page.locator('#q').getAttribute('aria-activedescendant'),'Arrow navigation should activate a suggestion');
  await page.locator('#q').press('Escape');
  assert(await page.locator('#searchSuggestions').isHidden(),'Escape should close autocomplete');

  await page.evaluate(()=>openPerson(localPeople().find(person=>person.name==='Christopher Nolan')));
  await page.waitForSelector('.person-known-for');
  assert(/Known For/.test(await page.locator('#personCard').innerText()),'Person profile should group known works');
  assert(!/\nActing\n|\nDirected\n/.test(await page.locator('#personCard').innerText()),'Default person profile should not duplicate Known For with role sections');
  await page.locator('[data-person-work-index]').first().click();
  assert(await page.locator('#drawer').isVisible(),'Person works should navigate to title details');
  await page.goBack();
  await page.waitForSelector('#personViewer:not([hidden]) .person-known-for');
  assert(await page.locator('#personViewer').evaluate(el=>el.scrollTop)===0,'Back from a title should restore the person profile at the top');
  await page.evaluate(()=>{closePerson();history.replaceState(null,'',location.pathname+location.search);});

  for (const [term, expectedFirst] of [
    ['leonar', 'People'], ['leo dicap', 'People'], ['brad', 'People'], ['brad pitt', 'People'],
    ['christ nolan', 'People'], ['johnny dep', 'People'], ['batman', 'Titles'], ['interstellar', 'Titles'], ['dark kn', 'Titles']
  ]) {
    await page.locator('#q').fill(term); await page.waitForTimeout(30);
    const heading = await page.locator('#grid .search-result-section h2').first().textContent();
    assert(heading === expectedFirst, `${term} should rank ${expectedFirst} first, received ${heading}`);
  }

  await page.evaluate(async () => {
    PERSON_PROFILE_CACHE.clear(); PERSON_CACHE.clear(); catalog.results = []; catalog.people = [];
    await openPerson({ name: 'Remote Actor', wd: 'Q99999', role: 'Actor' });
  });
  assert(await page.locator('.person-known-for .related-card').count() === 12, 'Clean-cache Known For should show twelve directly fetched credits');
  const knownForImages=await page.locator('.person-known-for .related-card img').count();
  assert(knownForImages === 12, `Known For should enrich missing provider art with stable title-page thumbnails, received ${knownForImages}`);
  assert(await page.locator('[data-person-filmography-toggle]').isVisible(), 'Dense credits should offer progressive full filmography');
  assert(await page.locator('.person-biography').evaluate(el=>el.classList.contains('is-collapsed')), 'Long biography should start collapsed');
  assert(await page.evaluate(()=>ageOnDate('1974-11-11',new Date('2026-09-23T00:00:00Z'))) === 51, 'Age should account for whether the birthday has occurred');
  assert(/Age \d+/.test(await page.locator('.person-facts').innerText()), 'Living person profile should surface a calculated age');
  await page.locator('[data-person-filmography-toggle]').click();
  assert(await page.locator('#personFilmography .related-card').count() === 105, 'Full filmography should reveal all deduplicated credits');
  await page.waitForTimeout(30);
  assert(await page.locator('.person-card-media [data-person-fallback]').isVisible(), 'Broken portrait should settle on a stable fallback');
  await page.evaluate(()=>closePerson());

  const relatedScenarios=await page.evaluate(async()=>{
    const mk=(title,type='movie')=>Object.assign(makeItem(title,type),{genres:['Drama','Thriller'],castTried:true,castHydrated:true});
    const a=mk('Connected A'),b=mk('Connected B'),c=mk('Connected C');a.relations={next:b};b.relations={next:c};
    const quartet=[1,2,3,4].map(number=>Object.assign(mk(`Quartet ${number}`),{seriesName:'Verified Quartet',seriesNumber:number}));
    const sequel=mk('Follow-up Series','series'),series=mk('Original Series','series');series.relations={next:sequel};
    const remake=mk('Modern Version');const original=mk('Original Version');original.relations={versions:[Object.assign(remake,{relationLabel:'Remake'})]};
    const franchise=[1,2,3].map(number=>Object.assign(mk(`Collection ${number}`),{seriesName:'Unordered Collection'}));
    const standalone=mk('Standalone');const similar=mk('Similar Candidate');
    state.items.push(a,b,c,...quartet,series,sequel,original,remake,...franchise,standalone,similar);
    const summarize=async record=>(await relatedSections(record)).map(section=>section.title);
    return {ids:[a.id,b.id,c.id],direct:await summarize(a),quartet:await summarize(quartet[1]),series:await summarize(series),versions:await summarize(original),collection:await summarize(franchise[1]),standalone:await summarize(standalone)};
  });
  assert(relatedScenarios.direct.includes('Next Movie'),'Direct sequel should outrank similar titles');
  assert(relatedScenarios.quartet.includes('More From This Collection'),'Ordered multi-part series should render a collection strip');
  assert(relatedScenarios.series.includes('Continue With'),'Series sequel should be labelled as a continuation');
  assert(relatedScenarios.versions.includes('Other Versions'),'Adaptations/remakes should have a labelled section');
  assert(relatedScenarios.collection.includes('More From This Collection')&&!relatedScenarios.collection.includes('Next Movie'),'Unordered collections must not claim a next movie');
  assert(relatedScenarios.standalone.includes('Similar Titles'),'Standalone records should fall back to similarity');

  await page.evaluate(id=>openItem(id),relatedScenarios.ids[0]);
  await page.waitForSelector('[data-related-index]');
  await page.locator('#drawer').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await page.locator('[data-related-index]').first().click();
  await page.waitForFunction(id=>openId===id,relatedScenarios.ids[1]);
  assert((await page.locator('#drawer').evaluate(el=>el.scrollTop))===0,'New related item should start at the top');
  await page.waitForSelector('[data-related-index]');
  await page.locator('#drawer').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await page.locator('[data-related-index]').first().click();
  await page.waitForFunction(id=>openId===id,relatedScenarios.ids[2]);
  assert((await page.locator('#drawer').evaluate(el=>el.scrollTop))===0,'Third item should also start at the top');
  await page.goBack();
  await page.waitForFunction(id=>openId===id,relatedScenarios.ids[1]);
  assert((await page.locator('#drawer').evaluate(el=>el.scrollTop))===0,'Back to the prior detail should restore the item at its own top');
  await page.evaluate(()=>closeSheets());

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

  console.log(JSON.stringify({ pagination: `${pageSize} at 1440px`, fuzzyPartialSearch: 'passed', localPeopleSearch: 'passed', arabicSeries: online.map(item => item.title), browserErrors: errors }, null, 2));
  await browser.close();
})().catch(error => { console.error(error); process.exitCode = 1; });
