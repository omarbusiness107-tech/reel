const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const assert=require('node:assert/strict');
const image=(width,height)=>`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"></svg>`)}`;
const portrait=image(1000,1500),landscape=image(3840,2160),panorama=image(1500,500);
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const width of [375,430,768,1024,1440]){
      const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',route=>route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{}}})}}}}'}));
      await page.route('https://cdn.jsdelivr.net/npm/lucide/**',route=>route.fulfill({contentType:'application/javascript',body:'window.lucide={createIcons(){}}'}));
      await page.route('https://api.tvmaze.com/**',route=>route.fulfill({json:[]}));
      await page.route('https://www.wikidata.org/**',route=>route.fulfill({json:{claims:{}}}));
      await page.route('https://query.wikidata.org/**',route=>route.fulfill({json:{results:{bindings:[]}}}));
      // Test URLs are HTTPS provider records; their image responses use deterministic SVGs.
      await page.route('https://art.test/**',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="3840" height="2160"></svg>'}));
      await page.route('https://api.tvmaze.com/shows/54723/images',route=>route.fulfill({json:[{type:'background',resolutions:{original:{url:'https://art.test/from.jpg',width:3840,height:2160}}}]}));
      await page.goto(pathToFileURL(path.resolve(__dirname,'../reel.html')).href,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>!cloud.loading);
      await page.evaluate(({portrait,landscape})=>{
        state.items=[];state.events=[];lookupMovie=async()=>[];
        const item=makeItem('Layout test with a longer title','movie','going');item.cover=portrait;item.banner=landscape;item.castTried=true;item.cast=[];state.items.push(item);openItem(item.id);
      },{portrait,landscape});
      await page.waitForSelector('.detail-landscape[data-banner-ready="true"]');
      const check=async scope=>{
        assert.ok(await page.locator(scope).evaluate(hero=>{
          const frame=hero.querySelector('.detail-banner-frame').getBoundingClientRect();
          const cover=hero.querySelector('.p,.catalog-detail-cover').getBoundingClientRect();
          const title=hero.querySelector('h2').getBoundingClientRect();
          return cover.top<frame.bottom-20&&cover.bottom>frame.bottom+20&&cover.left-frame.left>=15&&cover.left-frame.left<=21&&title.top>=frame.bottom&&title.left>=cover.right+12;
        }),`${width}: cover overlaps the banner bottom-left while the title stays below it`);
        assert.ok(await page.locator(scope+' .detail-landscape img').evaluate(img=>{
          const css=getComputedStyle(img);
          return Math.abs(img.clientWidth/img.clientHeight-img.naturalWidth/img.naturalHeight)<.03&&css.objectFit==='contain'&&css.filter==='none'&&css.transform==='none'&&css.opacity==='1';
        }),`${width}: full image composition is clear and uncropped`);
      };
      for(const theme of ['dark','light']){await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);await check('.detail-hero');}
      await page.locator('.detail-landscape').focus();await page.keyboard.press('Enter');
      assert.equal(await page.locator('#mediaViewer').isVisible(),true,'banner is keyboard-expandable');
      await page.evaluate(()=>closeMedia());
      await page.evaluate(panorama=>{state.items[0].banner=panorama;openItem(state.items[0].id);},panorama);
      await page.waitForSelector('.detail-landscape[data-banner-ready="true"]');await check('.detail-hero');
      await page.evaluate(portrait=>{
        const item=makeItem('From','series','done');item.tvmaze=54723;item.cover=portrait;item.banner=portrait;item.castTried=true;item.seasonGuide=[];item.progressCheckedAt=Date.now();state.items.push(item);openItem(item.id);
      },portrait);
      await page.waitForSelector('.detail-landscape[data-banner-ready="true"]');
      assert.equal(await page.locator('.detail-landscape img').getAttribute('src'),'https://art.test/from.jpg','missing banner recovers from exact provider ID, not the poster');
      assert.equal(await page.evaluate(()=>state.items.at(-1).status),'done','artwork recovery preserves personal status');
      await check('.detail-hero');
      await page.evaluate(({portrait,landscape})=>{
        closeSheets();catalog.results=[{title:'Online title',type:'movie',cover:portrait,banner:landscape,genres:['Drama'],runtime:120,cast:[]}];
      },{portrait,landscape});
      await page.evaluate(()=>openCatalogItem(0));
      await page.waitForSelector('.detail-landscape[data-banner-ready="true"]');await check('.detail-hero-catalog');
      await page.evaluate(portrait=>{
        closeSheets();const item=makeItem('Book with no landscape source','book','want');item.cover=portrait;item.banner=portrait;item.castTried=true;state.items.push(item);openItem(item.id);
      },portrait);
      await page.waitForFunction(()=>document.querySelector('.detail-banner-frame')?.dataset.bannerState==='unavailable');
      assert.equal(await page.locator('.detail-landscape:not([hidden])').count(),0,'unavailable artwork never magnifies the portrait');
      assert.equal(await page.locator('.detail-hero .p').isVisible(),true,'cover remains visible when no banner is available');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page overflow');
      assert.ok(await page.locator('#drawer').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'no drawer overflow');
      assert.deepEqual(errors,[]);
      if(process.argv.includes('--live')&&[375,1440].includes(width)){
        await page.unroute('https://api.tvmaze.com/shows/54723/images');
        await page.route('https://api.tvmaze.com/shows/54723/images',route=>route.fulfill({json:[{type:'background',resolutions:{original:{url:'https://static.tvmaze.com/uploads/images/original_untouched/623/1558297.jpg',width:3840,height:2160}}}]}));
        await page.evaluate(()=>{
          detailArtworkCache.clear();closeSheets();const item=makeItem('From','series','done');item.tvmaze=54723;item.year=2022;item.genres=['Drama','Horror','Mystery'];item.cover='https://static.tvmaze.com/uploads/images/original_untouched/621/1554646.jpg';item.castTried=true;item.seasonGuide=[];item.progressCheckedAt=Date.now();state.items.push(item);openItem(item.id);
        });
        await page.waitForSelector('.detail-landscape[data-banner-ready="true"]', {timeout:45000});
        await page.locator('.detail-hero .p img').evaluate(img=>img.decode());
        await check('.detail-hero');
        for(const theme of ['dark','light']){
          await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
          await page.locator('.detail-hero').screenshot({path:path.resolve(__dirname,`../.impeccable/review/detail-overlap-${theme}-${width}.png`)});
        }
        console.log('Verified native From banner:',await page.locator('.detail-landscape img').evaluate(img=>[img.naturalWidth,img.naturalHeight]));
        if(width===1440){
          await page.evaluate(async()=>{
            closeSheets();const {meta}=await getJSON('https://v3-cinemeta.strem.io/meta/movie/tt0330373.json');
            const item=makeItem('Harry Potter and the Goblet of Fire','movie','want');item.year=2005;item.imdb='tt0330373';item.cover=meta.poster;item.genres=['Adventure','Fantasy'];item.castTried=true;state.items.push(item);openItem(item.id);
          });
          await page.waitForSelector('.detail-landscape[data-banner-ready="true"]',{timeout:45000});
          await check('.detail-hero');
          assert.ok(await page.locator('.detail-landscape img').evaluate(img=>img.naturalWidth>=1280&&img.naturalHeight>=360),'movie background is genuinely high resolution');
          console.log('Verified native movie banner:',await page.locator('.detail-landscape img').evaluate(img=>[img.naturalWidth,img.naturalHeight]));
        }
      }
      await page.close();
    }
    console.log('PASS: overlapping library/catalog covers, HD panoramic banners, missing-art recovery, keyboard expansion, both themes, five responsive widths');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
