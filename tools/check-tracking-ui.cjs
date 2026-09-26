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
      await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>!cloud.loading);
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
      await page.evaluate(()=>window.ReelTrackingUI.navigate('activity',{historyMode:'none'}));
      assert.match(await page.locator('#trackingView').textContent(),/Test Series/);
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
      await page.locator('.tracking-season').first().locator('[data-track-season="1"][data-track-action="watch"]').click();
      assert.equal(await page.evaluate(()=>state.events.length),eventCount,'repeating a season action must not duplicate events');
      await page.locator('.tracking-season').first().locator('[data-track-episode="1:1"][data-track-action="rewatch"]').click();
      assert.equal(await page.evaluate(()=>state.events.length),eventCount+1,'an explicit rewatch adds one viewing');
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
      assert.ok(overflow<=1,`${width}: horizontal overflow ${overflow}`);
      assert.deepEqual(errors,[],`${width}: page errors`);
      await page.close();
    }
    console.log('PASS: Home, watch/undo, idempotent season bulk, rewatch, Activity, Stats, Calendar, season explorer, and five responsive widths');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
