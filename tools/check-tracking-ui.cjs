const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');

const url=pathToFileURL(path.resolve(__dirname,'../reel.html')).href;
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const width of [375,430,768,1024,1440]){
      const page=await browser.newPage({viewport:{width,height:850}}),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',route=>route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{}}})}}}}'}));
      await page.route('https://cdn.jsdelivr.net/npm/lucide/**',route=>route.fulfill({contentType:'application/javascript',body:'window.lucide={createIcons(){}}'}));
      await page.route('https://api.tvmaze.com/search/shows**',route=>route.fulfill({json:[]}));
      await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>!cloud.loading);
      assert.equal(await page.evaluate(()=>{const item={};setEpisodeGuide(item,[{season:1,number:1,name:'Pilot',airdate:'2024-01-01',image:{original:'https://example.com/full.jpg',medium:'https://example.com/thumb.jpg'}}]);return item.episodeCatalog[0].image;}),'https://example.com/full.jpg','episode guides keep the full-resolution still');
      await page.evaluate(()=>{
        state.items=[];state.events=[];
        const item=makeItem('Test Series','series','going');item.seasonGuide=[{number:1,episodes:[1,2,3]},{number:2,episodes:[1,2]}];
        item.episodeCatalog=[1,2,3].map(number=>({season:1,number,title:`Chapter ${number}`,airdate:'2024-01-01',runtime:42})).concat([1,2].map(number=>({season:2,number,title:`Return ${number}`,airdate:'2025-01-01',runtime:45})));
        item.progressCheckedAt=Date.now();item.season=1;item.episode=0;item.genres=['Drama'];item.cast=[{name:'Example Actor'}];state.items.push(item);render();
        window.ReelTrackingUI.navigate('home',{historyMode:'none'});
      });
      assert.equal(await page.locator('#trackingView h1').textContent(),'Keep the story going.');
      assert.match(await page.locator('.tracking-title-row').first().textContent(),/S1 E1/);
      await page.locator('[data-track-watch]').first().click();
      assert.deepEqual(await page.evaluate(()=>({events:state.events.length,watched:window.ReelTrackingCore.progress(state.items[0]).watched,next:window.ReelTrackingCore.progress(state.items[0]).next.number})),{events:1,watched:1,next:2});
      await page.evaluate(()=>window.ReelTrackingUI.navigate('home'));
      await page.locator('#trackingView [data-track-detail]').first().click();
      assert.match(page.url(),/#title=/);
      await page.goBack();
      await page.waitForFunction(()=>window.ReelTrackingUI.page==='home'&&!document.querySelector('#drawer').classList.contains('on'));
      await page.locator('#q').fill('Test Series');
      assert.equal(await page.evaluate(()=>window.ReelTrackingUI.page),'library','global search leaves personal pages to show results');
      await page.locator('#clearSearch').click();
      await page.evaluate(()=>{state.items[0].episodeCatalog[0].image='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"/%3E';});
      await page.evaluate(()=>window.ReelTrackingUI.navigate('activity',{historyMode:'none'}));
      assert.match(await page.locator('#trackingView').textContent(),/Test Series/);
      assert.equal(await page.locator('.tracking-history-day').count(),1,'watch history groups entries by local day');
      assert.equal(await page.locator('.tracking-history-card').count(),1,'activity uses the image-led timeline card');
      await page.locator('.tracking-history-image').evaluate(img=>img.decode());
      await page.waitForFunction(()=>document.querySelector('.tracking-history-image')?.dataset.ready==='full');
      assert.ok(await page.locator('.tracking-history-image').evaluate(img=>Math.abs(img.clientWidth/img.clientHeight-img.naturalWidth/img.naturalHeight)<.02),'episode card matches the artwork ratio without cropping or gaps');
      assert.match(await page.locator('.tracking-history-date time').getAttribute('aria-label'),/\d{4}/);
      await page.locator('[data-track-activity="movie"]').click();
      assert.equal(await page.locator('.tracking-history-card').count(),0,'movie filter excludes episode history');
      await page.locator('[data-track-activity="all"]').click();
      if([375,1440].includes(width))await page.screenshot({path:path.resolve(__dirname,`../.impeccable/review/history-${width}.png`),fullPage:false});
      const original='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"/%3E';
      const episodes=[1,2,3].map(number=>({season:1,number,name:`Chapter ${number}`,airdate:'2024-01-01',runtime:42,image:{medium:'https://example.com/thumb.jpg',original}})).concat([1,2].map(number=>({season:2,number,name:`Return ${number}`,airdate:'2025-01-01',runtime:45,image:{medium:'https://example.com/thumb.jpg',original}})));
      await page.route('https://api.tvmaze.com/shows/1',route=>route.fulfill({json:{status:'Running',rating:{average:null}}}));
      await page.route('https://api.tvmaze.com/shows/1/seasons',route=>route.fulfill({json:[{number:1},{number:2}]}));
      await page.route('https://api.tvmaze.com/shows/1/episodes',route=>route.fulfill({json:episodes}));
      await page.evaluate(()=>{state.items[0].episodeCatalog=null;state.items[0].tvmaze=1;window.ReelTrackingUI.navigate('activity',{historyMode:'none'});});
      await page.waitForFunction(expected=>document.querySelector('.tracking-history-image')?.getAttribute('src')===expected,original);
      await page.waitForFunction(()=>document.querySelector('.tracking-history-image')?.dataset.ready==='full');
      assert.ok(await page.locator('.tracking-history-image').evaluate(img=>Math.abs(img.clientWidth/img.clientHeight-img.naturalWidth/img.naturalHeight)<.02),'hydrated episode stills fill the card and keep their full composition');
      await page.locator('[data-track-edit]').click();
      assert.equal(await page.locator('[data-track-date]').isVisible(),true);
      await page.evaluate(()=>window.ReelTrackingUI.navigate('stats',{historyMode:'none'}));
      assert.match(await page.locator('#trackingView').textContent(),/Episodes/);
      assert.equal(await page.locator('[data-track-person="Example Actor"]').count(),1);
      await page.evaluate(()=>window.ReelTrackingUI.navigate('calendar',{historyMode:'none'}));
      assert.match(await page.locator('#trackingView h1').textContent(),/Calendar/);
      await page.evaluate(()=>window.ReelTrackingUI.navigate('library',{historyMode:'none'}));
      await page.evaluate(()=>openItem(state.items[0].id));
      await page.locator('.tracking-season').first().locator('summary').click();
      assert.equal(await page.locator('.tracking-season').first().locator('[data-track-episode]:not([data-track-action="rewatch"])').count(),3);
      await page.locator('[data-track-episode="1:2"][data-track-action="watch"]').click();
      assert.deepEqual(await page.evaluate(()=>state.items[0].watchedEpisodes.sort()),['1:1','1:2']);
      await page.locator('[data-track-episode="1:2"][data-track-action="unwatch"]').click();
      assert.deepEqual(await page.evaluate(()=>state.items[0].watchedEpisodes),['1:1']);
      page.on('dialog',dialog=>dialog.accept());
      await page.locator('.tracking-season').first().locator('[data-track-season="1"][data-track-action="watch"]').click();
      assert.deepEqual(await page.evaluate(()=>state.items[0].watchedEpisodes.sort()),['1:1','1:2','1:3']);
      const eventCount=await page.evaluate(()=>state.events.length);
      if(!await page.locator('.tracking-season').first().evaluate(section=>section.open))await page.locator('.tracking-season').first().locator('summary').click();
      await page.locator('.tracking-season').first().locator('[data-track-season="1"][data-track-action="watch"]').click();
      assert.equal(await page.evaluate(()=>state.events.length),eventCount,'repeating a season action must not duplicate events');
      if(!await page.locator('.tracking-season').first().evaluate(section=>section.open))await page.locator('.tracking-season').first().locator('summary').click();
      await page.locator('.tracking-season').first().locator('[data-track-episode="1:1"][data-track-action="rewatch"]').click();
      assert.equal(await page.evaluate(()=>state.events.length),eventCount+1,'an explicit rewatch adds one viewing');
      await page.route('https://m.media-amazon.com/images/S/pv-target-images/f74dcd11206e4f41e09f244047c6ac440fc99a7084e3fe79bdc411c424c815f1.jpg',route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="3840" height="2160"/>'}));
      await page.route(/https:\/\/pixel\.disco\.nowtv\.com\/uuid\/fc52aec2-/,route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="3840" height="2160"/>'}));
      await page.route(/https:\/\/media\.formula1\.com\/image\/upload\/.*f1_movie_poster16x9/,route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"/>'}));
      await page.route(/https:\/\/m\.media-amazon\.com\/images\/S\/pv-target-images\/a79e88dd/,route=>route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"/>'}));
      await page.evaluate(()=>{
        closeSheets();
        const movie=makeItem('Guns Akimbo','movie','done');movie.year=2019;movie.cover='assets/posters/harry-potter/01-philosophers-stone.jpg';state.items.push(movie);
        const show=makeItem('The Mentalist','series','going');show.year=2008;show.episodeCatalog=[{season:2,number:2,title:'The Scarlet Letter',image:'https://example.com/small.jpg'}];state.items.push(show);
        state.events.push({id:'art-movie',titleId:movie.id,mediaType:'movie',eventType:'watch',watchedAt:new Date().toISOString()});
        state.events.push({id:'art-episode',titleId:show.id,mediaType:'series',season:2,episode:2,eventType:'watch',watchedAt:new Date().toISOString()});
        window.ReelTrackingUI.navigate('activity',{historyMode:'none'});
      });
      assert.equal(await page.locator('.tracking-history-image[src*="pv-target-images"]').count(),1,'the verified movie uses its 4K landscape source');
      assert.equal(await page.locator('.tracking-history-image[src*="pixel.disco.nowtv.com"]').count(),1,'the verified episode uses its 4K landscape source');
      await page.evaluate(()=>{
        for(const [title,year,id] of [['F1',2025,'f1-art'],['300',2007,'300-art']]){
          const item=makeItem(title,'movie','done');item.year=year;item.cover='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600"/%3E';
          state.items.push(item);state.events.push({id,titleId:item.id,mediaType:'movie',eventType:'watch',watchedAt:new Date().toISOString()});
        }
        window.ReelTrackingUI.refresh();
      });
      await page.locator('.tracking-history-image').evaluateAll(imgs=>imgs.forEach(img=>img.loading='eager'));
      await page.waitForFunction(()=>[...document.querySelectorAll('.tracking-history-image')].some(img=>img.src.includes('f1_movie_poster16x9')&&img.dataset.ready==='full')&&[...document.querySelectorAll('.tracking-history-image')].some(img=>img.src.includes('a79e88dd')&&img.dataset.ready==='full'));
      for(const selector of ['f1_movie_poster16x9','a79e88dd'])assert.ok(await page.locator(`.tracking-history-image[src*="${selector}"]`).evaluate(img=>Math.abs(img.clientWidth/img.clientHeight-img.naturalWidth/img.naturalHeight)<.02),'verified landscape fills the full width and height without zooming');
      assert.equal(await page.locator('.tracking-history-image[src*="a79e88dd"]').evaluate(img=>img.naturalWidth),1920,'300 uses the genuine HD still at every viewport');
      if([375,1440].includes(width)){
        await page.locator('.tracking-history-image[src*="f1_movie_poster16x9"]').locator('xpath=../..').screenshot({path:path.resolve(__dirname,`../.impeccable/review/history-f1-${width}.png`)});
        await page.locator('.tracking-history-image[src*="a79e88dd"]').locator('xpath=../..').screenshot({path:path.resolve(__dirname,`../.impeccable/review/history-300-${width}.png`)});
      }
      const movieId=await page.evaluate(()=>state.items.find(item=>item.title==='Guns Akimbo').id);
      await page.locator(`#trackingView [data-track-detail="${movieId}"]`).first().click();
      await page.locator('#drawer [data-f="historyBanner"]').fill('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="3840" height="2160"/%3E');
      await page.evaluate(()=>closeSheets());
      assert.ok((await page.evaluate(()=>{const movie=state.items.find(item=>item.title==='Guns Akimbo');return [...document.querySelectorAll('.tracking-history-card')].find(card=>card.querySelector(`[data-track-detail="${movie.id}"]`))?.querySelector('img')?.getAttribute('src');})).startsWith('data:image/svg+xml'),'a user-provided history banner takes priority');
      await page.route('https://example.com/missing-history-banner.jpg',route=>route.abort());
      await page.locator(`#trackingView [data-track-detail="${movieId}"]`).first().click();
      await page.locator('#drawer [data-f="historyBanner"]').fill('https://example.com/missing-history-banner.jpg');
      await page.evaluate(()=>closeSheets());
      await page.waitForFunction(()=>{const movie=state.items.find(item=>item.title==='Guns Akimbo');return [...document.querySelectorAll('.tracking-history-card')].find(card=>card.querySelector(`[data-track-detail="${movie.id}"]`))?.querySelector('img')?.getAttribute('src')?.includes('pv-target-images');});
      await page.evaluate(()=>{
        const item=makeItem('No large artwork','movie','done');
        item.cover='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600"/%3E';
        state.items.push(item);state.events.push({id:'small-art',titleId:item.id,mediaType:'movie',eventType:'watch',watchedAt:new Date().toISOString()});
        window.ReelTrackingUI.refresh();
      });
      await page.locator('.tracking-history-image').evaluateAll(imgs=>imgs.forEach(img=>img.loading='eager'));
      await page.waitForFunction(()=>{const item=state.items.find(row=>row.title==='No Large Artwork');const card=[...document.querySelectorAll('.tracking-history-card')].find(row=>row.querySelector(`[data-track-detail="${item.id}"]`));return card?.querySelector('img')?.dataset.ready==='portrait'&&card.classList.contains('has-art');});
      assert.equal(await page.evaluate(()=>{const item=state.items.find(row=>row.title==='No Large Artwork');const img=[...document.querySelectorAll('.tracking-history-card')].find(row=>row.querySelector(`[data-track-detail="${item.id}"]`)).querySelector('img');return getComputedStyle(img).objectFit;}),'contain','future portrait-only artwork is shown without cropping');
      await page.evaluate(()=>{
        const item=makeItem('High resolution backup','movie','done');
        item.historyBanner='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="200"/%3E';
        item.banner='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"/%3E';
        state.items.push(item);state.events.push({id:'backup-art',titleId:item.id,mediaType:'movie',eventType:'watch',watchedAt:new Date().toISOString()});
        window.ReelTrackingUI.refresh();
      });
      await page.locator('.tracking-history-image').evaluateAll(imgs=>imgs.forEach(img=>img.loading='eager'));
      await page.waitForFunction(()=>{const item=state.items.find(row=>row.title==='High Resolution Backup');const img=[...document.querySelectorAll('.tracking-history-card')].find(row=>row.querySelector(`[data-track-detail="${item.id}"]`))?.querySelector('img');return img?.dataset.ready==='full'&&img.naturalWidth===1920;});
      // Existing reading progress is visible without inventing a read date; new actions create dated events.
      await page.evaluate(()=>{const item=makeItem('Berserk','manga','going');item.chapter=12;item.chapters=400;state.items.push(item);window.ReelTrackingUI.refresh();});
      await page.locator('[data-track-activity="reading"]').click();
      assert.match(await page.locator('#trackingView').textContent(),/Berserk/);
      assert.match(await page.locator('#trackingView').textContent(),/Read date not recorded/);
      await page.evaluate(()=>bump(state.items.find(it=>it.title==='Berserk'),1));
      assert.equal(await page.locator('.tracking-history-card').count(),1);
      assert.match(await page.locator('#trackingView').textContent(),/Chapter 13/);
      assert.doesNotMatch(await page.locator('#trackingView').textContent(),/Read date not recorded/);
      const beforeEvents=await page.evaluate(()=>state.events.length);
      await page.locator('#trackingView [data-track-detail]').first().click();
      await page.locator('#drawer [data-f="chapter"]').fill('14');
      await page.locator('#drawer [data-f="chapter"]').blur();
      await page.waitForFunction(n=>state.events.length===n+1,beforeEvents);
      assert.equal(await page.evaluate(()=>state.events.find(it=>it.eventType==='chapter_read').chapter),14);
      await page.evaluate(()=>closeSheets());
      assert.equal(await page.locator('.tracking-history-card').count(),1,'chapters on the same day share one card');
      assert.match(await page.locator('.tracking-reading-range').textContent(),/Chapters 13 → 14/);
      assert.equal(await page.locator('.tracking-history-summary').count(),0,'reading cards omit summaries');
      await page.evaluate(()=>{const item=makeItem('Reading Book','book','want');item.castTried=true;item.pages=200;item.page=0;state.items.push(item);return bump(item,10);});
      assert.equal(await page.locator('.tracking-history-card').count(),2,'book page progress appears in History');
      const bookId=await page.evaluate(()=>state.items.find(it=>it.title==='Reading Book').id);
      await page.locator(`#trackingView [data-track-detail="${bookId}"]`).click();
      await page.locator('#drawer [data-f="page"]').fill('25');
      await page.locator('#drawer [data-f="page"]').blur();
      await page.waitForFunction(()=>state.events.some(e=>e.eventType==='pages_read'&&e.page===25));
      await page.evaluate(()=>closeSheets());
      assert.equal(await page.locator('.tracking-history-card').count(),2,'same-day pages are combined');
      assert.match(await page.locator(`#trackingView [data-track-detail="${bookId}"] .tracking-reading-range`).textContent(),/Pages 1 → 25/);
      await page.locator('.tracking-history-card').filter({has:page.locator(`[data-track-detail="${bookId}"]`)}).locator('[data-track-edit]').click();
      assert.equal(await page.locator('.tracking-history-date-input:not([hidden]) input').count(),2,'all grouped sessions remain date-editable');
      await page.locator('.tracking-history-card').filter({has:page.locator(`[data-track-detail="${bookId}"]`)}).locator('[data-track-edit]').click();
      if([375,1440].includes(width))await page.locator('#trackingView').screenshot({path:path.resolve(__dirname,`../.impeccable/review/history-reading-${width}.png`)});
      await page.locator('[data-track-activity="episode"]').click();
      assert.doesNotMatch(await page.locator('#trackingView').textContent(),/Berserk/);
      await page.evaluate(()=>applyChapterProgress(state.items.find(it=>it.title==='Berserk'),1000));
      assert.equal(await page.evaluate(()=>state.items.find(it=>it.title==='Berserk').chapter),400,'chapter progress stops at the known total');
      await page.evaluate(()=>applyChapterProgress(state.items.find(it=>it.title==='Berserk'),400));
      assert.equal(await page.evaluate(()=>state.events.filter(it=>it.eventType==='chapter_read'&&it.chapter===400).length),1,'repeating current chapter does not duplicate it');
      await page.evaluate(()=>applyChapterProgress(state.items.find(it=>it.title==='Berserk'),258));
      await page.evaluate(()=>applyChapterProgress(state.items.find(it=>it.title==='Berserk'),255));
      await page.locator('[data-track-activity="reading"]').click();
      const mangaId=await page.evaluate(()=>state.items.find(it=>it.title==='Berserk').id);
      assert.match(await page.locator(`#trackingView [data-track-detail="${mangaId}"] .tracking-reading-range`).textContent(),/255/);
      assert.doesNotMatch(await page.locator(`#trackingView [data-track-detail="${mangaId}"] .tracking-reading-range`).textContent(),/258|400/);
      assert.equal(await page.evaluate(()=>state.events.some(e=>e.mediaType==='manga'&&e.chapter>255)),false,'unread chapters are removed from History');
      await page.evaluate(()=>applyChapterProgress(state.items.find(it=>it.title==='Reading Book'),20));
      assert.match(await page.locator(`#trackingView [data-track-detail="${bookId}"] .tracking-reading-range`).textContent(),/Pages 1 → 20/);
      if([375,1440].includes(width))await page.locator('#trackingView').screenshot({path:path.resolve(__dirname,`../.impeccable/review/history-reading-corrected-${width}.png`)});
      await page.locator('[data-track-activity="all"]').click();
      await page.evaluate(()=>{const item=makeItem('Panorama Only','movie','done');item.banner='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="4096" height="1024"/%3E';state.items.push(item);state.events.unshift({id:'panorama',titleId:item.id,mediaType:'movie',eventType:'movie_watched',watchedAt:new Date().toISOString()});window.ReelTrackingUI.refresh();});
      await page.locator('.tracking-history-image').evaluateAll(imgs=>imgs.forEach(img=>img.loading='eager'));
      await page.waitForSelector('.tracking-history-image[data-ready="panorama"]');
      assert.ok(await page.locator('.tracking-history-image[data-ready="panorama"]').evaluate(img=>Math.abs(img.clientWidth/img.clientHeight-4)<.03),'future ultra-wide sources keep their full composition with a separate caption');
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      assert.ok(overflow<=1,`${width}: horizontal overflow ${overflow}`);
      const historyCount=await page.evaluate(()=>state.events.length);
      await page.evaluate(id=>openItem(id),bookId);
      page.removeAllListeners('dialog');
      let nativeDialogs=0;
      page.on('dialog',async dialog=>{nativeDialogs++;await dialog.dismiss();});
      await page.locator('#resetProgressBtn').click();
      assert.ok(await page.locator('#resetConfirmation').isVisible(),'reset uses a centered confirmation popup');
      assert.ok(await page.locator('#resetConfirmation').evaluate(el=>el.matches(':modal')),'reset is above Details and makes the background inert');
      assert.ok(await page.locator('#resetConfirmation').evaluate(el=>{
        const rect=el.getBoundingClientRect();
        return Math.abs(rect.left+rect.width/2-innerWidth/2)<1&&Math.abs(rect.top+rect.height/2-innerHeight/2)<1&&getComputedStyle(el,'::backdrop').backdropFilter.includes('blur');
      }),'popup is centered in the viewport with a blurred backdrop');
      assert.match(await page.locator('#resetConfirmation').textContent(),/History, ratings, notes, and favorites stay saved/);
      assert.equal(await page.evaluate(()=>document.activeElement.id),'resetCancelBtn','safe action receives focus');
      await page.keyboard.press('Shift+Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'resetConfirmBtn','keyboard focus wraps inside the popup');
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'resetCancelBtn');
      await page.keyboard.press('n');
      assert.equal(await page.locator('#modal').evaluate(el=>el.classList.contains('on')),false,'background keyboard shortcuts are suspended');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#resetConfirmation').isVisible(),false,'Escape cancels only the reset panel');
      assert.ok(await page.locator('#drawer').evaluate(el=>el.classList.contains('on')),'Escape keeps Details open');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'resetProgressBtn');
      await page.locator('#resetProgressBtn').click();
      await page.locator('#resetCancelBtn').click();
      assert.equal(await page.evaluate(()=>state.items.find(it=>it.title==='Reading Book').page),20,'cancel does not reset');
      await page.locator('#resetProgressBtn').click();
      await page.mouse.click(5,5);
      assert.equal(await page.locator('#resetConfirmation').isVisible(),false,'clicking the backdrop cancels safely');
      assert.ok(await page.locator('#drawer').evaluate(el=>el.classList.contains('on')),'backdrop cancellation keeps Details open');
      await page.locator('#resetProgressBtn').click();
      if([375,1440].includes(width)){
        for(const theme of ['dark','light']){
          for(const language of ['en','fr','ar']){
            await page.evaluate(({theme,language})=>{state.ui.language=language;document.documentElement.dataset.theme=theme;document.documentElement.dir=language==='ar'?'rtl':'ltr';openItem(openId);},{theme,language});
            await page.locator('#resetProgressBtn').click();
            assert.ok(await page.locator('#resetConfirmation').evaluate(el=>el.scrollWidth<=el.clientWidth+1),`${width} ${theme} ${language}: reset fits`);
            if(language==='en')await page.screenshot({path:path.resolve(__dirname,`../.impeccable/review/reset-popup-${width}-${theme}.png`)});
          }
        }
        await page.evaluate(()=>{state.ui.language='en';document.documentElement.dataset.theme='dark';document.documentElement.dir='ltr';openItem(openId);});
        await page.locator('#resetProgressBtn').click();
      }
      if(width===375){
        await page.emulateMedia({reducedMotion:'reduce'});
        await page.setViewportSize({width,height:280});
        assert.ok(await page.locator('#resetConfirmation').evaluate(el=>{const rect=el.getBoundingClientRect();return rect.top>=15&&rect.bottom<=innerHeight-15&&el.scrollHeight>el.clientHeight;}),'short screens scroll within the popup instead of clipping it');
        await page.locator('#resetCancelBtn').click();
        await page.setViewportSize({width,height:850});
        await page.emulateMedia({reducedMotion:'no-preference'});
        await page.locator('#resetProgressBtn').click();
      }
      await page.evaluate(()=>{window.originalResetForTest=resetItemProgress;resetItemProgress=()=>new Promise(resolve=>{window.resolveResetForTest=resolve;});});
      await page.locator('#resetConfirmBtn').click();
      assert.equal(await page.locator('#resetConfirmation').getAttribute('aria-busy'),'true');
      assert.ok(await page.locator('#resetConfirmBtn').isDisabled());
      assert.ok(await page.locator('#resetCancelBtn').isDisabled());
      await page.keyboard.press('Escape');
      assert.ok(await page.locator('#resetConfirmation').isVisible(),'pending reset cannot be dismissed accidentally');
      await page.mouse.click(5,5);
      assert.ok(await page.locator('#resetConfirmation').isVisible(),'backdrop clicks do not interrupt saving');
      await page.evaluate(()=>{window.resolveResetForTest(false);resetItemProgress=window.originalResetForTest;});
      await page.waitForFunction(()=>!document.querySelector('#resetConfirmBtn').disabled);
      assert.match(await page.locator('#resetMessage').textContent(),/could not be reset/);
      assert.equal(await page.evaluate(()=>state.items.find(it=>it.title==='Reading Book').page),20,'failed reset keeps progress');
      await page.locator('#resetConfirmBtn').click();
      await page.waitForFunction(()=>state.items.find(it=>it.title==='Reading Book').page===0);
      await page.waitForFunction(()=>document.activeElement.id==='resetProgressBtn');
      assert.equal(nativeDialogs,0,'reset never opens a browser alert or confirm');
      assert.equal(await page.evaluate(()=>state.items.find(it=>it.title==='Reading Book').status),'want');
      assert.equal(await page.evaluate(()=>state.events.length),historyCount,'reset preserves History');
      await page.evaluate(()=>closeSheets());
      for(const type of ['movie','series','anime','manga','manhwa']){
        assert.ok(await page.evaluate(async type=>{const item=makeItem('Reset Test '+type,type,'done');item.page=12;item.chapter=258;item.episode=10;item.stoppedAtSec=900;item.watchedEpisodes=['1:1'];state.items.push(item);return await resetItemProgress(item)&&item.status==='want'&&item.page===0&&item.chapter===0&&item.episode===0&&item.stoppedAtSec===0&&item.watchedEpisodes.length===0;},type),type+' reset clears progress');
      }
      assert.deepEqual(errors,[],`${width}: page errors`);
      const detailId=await page.evaluate(()=>{
        const item=makeItem('Banner Quality Test','movie','want');item.castTried=true;
        item.cover='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="600"/%3E';
        item.historyBanner='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="1200"/%3E';
        item.banner='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="3840" height="2160"/%3E';
        state.items.push(item);openItem(item.id);return item.id;
      });
      await page.waitForSelector('.detail-landscape[data-banner-ready="true"]');
      assert.ok(await page.locator('.detail-landscape img').evaluate(img=>{const style=getComputedStyle(img);return img.naturalWidth===3840&&Math.abs(img.clientWidth/img.clientHeight-16/9)<.03&&style.objectFit==='contain'&&style.filter==='none'&&style.transform==='none'&&style.opacity==='1';}),'details reject portrait candidates and show full HD landscape composition clearly');
      await page.evaluate(()=>closeSheets());
      await page.evaluate(id=>{const item=state.items.find(it=>it.id===id);item.historyBanner='';item.banner=item.cover;openItem(id);},detailId);
      await page.waitForFunction(()=>document.querySelector('.detail-banner-frame')?.dataset.bannerState==='unavailable');
      assert.equal(await page.locator('.detail-landscape:not([hidden])').count(),0,'cover is never reused as a detail banner');
      await page.evaluate(()=>closeSheets());
      await page.evaluate(()=>{
        const date=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
        state.items=['movie','series','anime','manga','manhwa','book'].map((type,i)=>{
          const item=makeItem('Release '+type,type,['done','going','waiting','want','paused','dropped'][i]);
          item.releaseCatalog=[{kind:type==='series'?'season':type==='anime'?'episode':['manga','manhwa'].includes(type)?'chapter':type,date,season:2,number:10,name:'Next release'}];
          item.releasesCheckedAt=Date.now();item.releasesVersion=2;item.episodeCatalog=[];return item;
        });
        window.ReelTrackingUI.navigate('home',{historyMode:'none'});
      });
      await page.waitForFunction(()=>!document.querySelector('[data-track-release-refresh]').disabled);
      assert.equal(await page.locator('.tracking-upcoming .tracking-title-row').count(),6,'all media and all statuses are shown by default');
      assert.equal(await page.locator('.tracking-upcoming .tracking-title-row>time').first().isVisible(),true,'release dates remain visible on mobile');
      await page.locator('[data-track-upcoming-filter]').click();
      assert.equal(await page.locator('.tracking-upcoming .tracking-title-row').count(),3,'status toggle keeps only In progress, Finished and Caught up');
      assert.equal(await page.locator('[data-track-upcoming-filter]').getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('[data-track-upcoming-filter]').evaluate(el=>el===document.activeElement),true,'toggle keeps keyboard focus after rendering');
      await page.locator('[data-track-upcoming-filter]').click();
      assert.equal(await page.locator('.tracking-upcoming .tracking-title-row').count(),6);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'release controls fit the viewport');
      await page.evaluate(()=>document.documentElement.dataset.theme='light');
      assert.equal(await page.locator('[data-track-upcoming-filter]').isVisible(),true,'filter is visible in light mode');
      await page.locator('[data-track-upcoming-filter]').click();
      assert.equal(await page.locator('.tracking-upcoming .tracking-title-row').count(),3);
      await page.locator('[data-track-upcoming-filter]').click();
      await page.evaluate(()=>document.documentElement.dataset.theme='dark');
      if([375,1440].includes(width)){
        await page.locator('.tracking-upcoming').scrollIntoViewIfNeeded();
        await page.screenshot({path:path.resolve(__dirname,`../.impeccable/review/releases-${width}.png`),fullPage:false});
      }
      await page.evaluate(()=>window.ReelTrackingUI.navigate('calendar',{historyMode:'none'}));
      await page.locator('[data-track-cal-filter="episodes"]').click();
      assert.equal(await page.locator('.tracking-agenda-row').count(),6,'calendar supports all release kinds');
      await page.locator('[data-track-upcoming-filter]').click();
      assert.equal(await page.locator('.tracking-agenda-row').count(),3,'calendar shares the status toggle');
      await page.locator('[data-track-upcoming-filter]').click();
      if(width===1440){
        await page.route('https://api.tvmaze.com/shows/999',route=>route.fulfill({json:{status:'Running'}}));
        await page.route('https://api.tvmaze.com/shows/999/seasons',route=>route.fulfill({json:[{number:3,premiereDate:'2027-01-02'}]}));
        await page.route('https://api.tvmaze.com/shows/999/episodes',route=>route.fulfill({json:[{season:3,number:1,name:'New season',airdate:'2027-01-02'}]}));
        const result=await page.evaluate(async()=>{
          state.items=Array.from({length:9},(_,i)=>({...makeItem('Book '+i,'book','want'),releaseCatalog:[],releasesCheckedAt:Date.now(),releasesVersion:2}));
          const item=makeItem('Finished Show','series','done');item.tvmaze=999;item.watchedEpisodes=['1:1'];state.items.push(item);
          await prepareLibraryReleases();return {episodes:item.episodeCatalog.length,status:item.status,seen:item.watchedEpisodes};
        });
        assert.deepEqual(result,{episodes:1,status:'done',seen:['1:1']},'release discovery includes Finished titles beyond the first eight and never changes viewing progress');
        await page.route('https://www.wikidata.org/w/api.php**',route=>route.fulfill({json:{entities:{Q123:{claims:{P577:[{mainsnak:{datavalue:{value:{time:'+2027-01-02T00:00:00Z',precision:11}}}}]},labels:{en:{value:'New film'}}}}}}));
        assert.equal(await page.evaluate(async()=>{
          const item=makeItem('Provider Identity Test','movie','done');state.items=[item];
          const before=window.ReelAccountLibrary.providerIdentity(item);
          const original=lookupMovie;lookupMovie=async()=>[{title:item.title,wd:'Q123'}];
          try{await prepareLibraryReleases();}finally{lookupMovie=original;}
          return JSON.stringify(before)===JSON.stringify(window.ReelAccountLibrary.providerIdentity(item))&&item.releaseCatalog[0].targetId==='Q123';
        }),true,'discovering a release provider never changes the saved catalog identity');
        await page.route('https://api.tvmaze.com/shows/54723',route=>route.fulfill({json:{status:'Running'}}));
        await page.route('https://api.tvmaze.com/shows/54723/seasons',route=>route.fulfill({json:[1,2,3,4,5].map(number=>({number,premiereDate:number===5?null:'2022-02-20'}))}));
        await page.route('https://api.tvmaze.com/shows/54723/episodes',route=>route.fulfill({json:[1,2,3,4].map(season=>({season,number:10,airdate:'2026-06-28'}))}));
        assert.equal(await page.evaluate(async()=>{
          const item=makeItem('From','series','done');item.tvmaze=54723;item.progressCheckedAt=Date.now();item.seasonGuide=[{number:1,episodes:[1]}];item.releaseCatalog=[];item.releasesCheckedAt=Date.now();item.releasesVersion=1;state.items=[item];
          await prepareLibraryReleases();return item.releaseCatalog.some(row=>row.season===5&&row.announced&&!row.date)&&item.releaseShowStatus==='Running';
        }),true,'old caches refresh even with a recent progress guide; live-shaped From season 5 remains undated');
        await page.route('https://api.tvmaze.com/shows/54723/episodes',route=>route.abort());
        assert.equal(await page.evaluate(async()=>{const item=state.items[0];item.releasesCheckedAt=1;await prepareLibraryReleases();return item.releaseCheck==='error'&&item.releasesCheckedAt===1&&item.releaseCatalog.some(row=>row.season===5);}),true,'cached episode fallback is not reported as a fresh successful release lookup');
      }
      await page.evaluate(()=>{
        const date=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
        const tulsa={...makeItem('Tulsa King','series','going'),episodeCatalog:Array.from({length:10},(_,i)=>({season:4,number:i+1,airdate:date})),releaseCatalog:[]};
        const from={...makeItem('From','series','done'),releaseCatalog:[{kind:'season',season:5,date:'',announced:true,source:'TVMaze'}],episodeCatalog:[]};
        const manga={...makeItem('Berserk','manga','paused'),releaseShowStatus:'current',releaseCatalog:[]};
        const book={...makeItem('Another upcoming title','book','want'),releaseDate:date,releaseCatalog:[]};
        state.items=[tulsa,from,manga,book].map(item=>({...item,releasesVersion:2,releasesCheckedAt:Date.now()}));
        window.ReelTrackingUI.navigate('home',{historyMode:'none'});
      });
      await page.waitForFunction(()=>!document.querySelector('[data-track-release-refresh]').disabled);
      assert.equal(await page.locator('.tracking-dated-releases .tracking-title-row').count(),2,'ten episodes occupy one preview row, leaving the other title visible');
      assert.match(await page.locator('.tracking-release-undated').textContent(),/From[\s\S]*Season 5 announced[\s\S]*Date not announced/);
      await page.locator('.tracking-release-dates summary').click();
      assert.equal(await page.locator('.tracking-release-dates li').count(),9,'all remaining dates are available within the title');
      await page.locator('.tracking-release-unavailable summary').click();
      assert.match(await page.locator('.tracking-release-unavailable').textContent(),/Berserk/);
      await page.locator('[data-track-upcoming-filter]').click();
      assert.equal(await page.locator('.tracking-dated-releases .tracking-title-row').count(),1);
      assert.equal(await page.locator('.tracking-release-undated .tracking-title-row').count(),1);
      assert.equal(await page.locator('.tracking-release-unavailable').count(),0,'status filter applies to unavailable schedules too');
      await page.locator('[data-track-upcoming-filter]').click();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'grouped and undated releases fit mobile');
      if([375,1440].includes(width))await page.locator('.tracking-upcoming').screenshot({path:path.resolve(__dirname,`../.impeccable/review/releases-grouped-${width}.png`)});
      if(width===1440){
        await page.locator('.tracking-release-dates summary').click();
        await page.evaluate(()=>{
          window.__originalPrepare=window.reelTrackingBridge.prepare;
          window.__originalProgress=window.reelTrackingBridge.releaseProgress;
          window.__homeMetrics=document.querySelector('.tracking-metrics');
          window.reelTrackingBridge.releaseProgress=()=>({checked:1,total:4});
          window.reelTrackingBridge.prepare=async({onProgress})=>{
            state.items.find(item=>item.title==='From').releaseCatalog.push({kind:'season',season:6,date:'',announced:true,source:'TVMaze'});
            onProgress();await new Promise(resolve=>window.__finishRelease=resolve);
          };
        });
        await page.locator('[data-track-release-refresh]').click();
        assert.match(await page.locator('.tracking-release-undated').textContent(),/Season 6 announced/,'results appear while the remaining requests are still pending');
        assert.match(await page.locator('[data-track-release-refresh]').textContent(),/1 \/ 4/,'real checked and total counts are visible');
        assert.equal(await page.evaluate(()=>document.querySelector('.tracking-metrics')===window.__homeMetrics),true,'progress does not rebuild unrelated Home content');
        assert.equal(await page.locator('.tracking-release-dates').getAttribute('open'),'','expanded dates stay open during progressive refresh');
        await page.evaluate(()=>window.__finishRelease());
        await page.waitForFunction(()=>!document.querySelector('[data-track-release-refresh]').disabled);
        await page.evaluate(()=>{window.reelTrackingBridge.prepare=window.__originalPrepare;window.reelTrackingBridge.releaseProgress=window.__originalProgress;});
      }
      assert.deepEqual(errors,[],`${width}: release page errors`);
      await page.close();
    }
    console.log('PASS: Home, watch/undo, idempotent season bulk, rewatch, Activity, Stats, Calendar, season explorer, and five responsive widths');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
