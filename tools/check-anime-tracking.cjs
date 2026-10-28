const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const url=pathToFileURL(path.resolve(__dirname,'../reel.html')).href;
const episodes=Array.from({length:308},(_,i)=>({season:i<8?1999:2000,number:i<8?i+1:i-7,name:`Episode ${i+1}`,airdate:'2000-01-01',runtime:24}));
episodes.push({season:2001,number:1,name:'Not yet released',airdate:'2999-01-01'});
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    for(const width of [375,768,1440]){
      const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('https://**',route=>route.abort());
      await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',route=>route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{}}})}}}}'}));
      await page.route('https://cdn.jsdelivr.net/npm/lucide/**',route=>route.fulfill({contentType:'application/javascript',body:'window.lucide={createIcons(){}}'}));
      await page.route('https://api.tvmaze.com/shows/1505',route=>route.fulfill({json:{type:'Animation',status:'Running'}}));
      await page.route('https://api.tvmaze.com/shows/1505/episodes',route=>route.fulfill({json:episodes}));
      await page.route('https://api.tvmaze.com/shows/1505/seasons',route=>route.fulfill({json:[{number:1999},{number:2000},{number:2001}]}));
      await page.goto(url,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>!cloud.loading);
      await page.evaluate(()=>{
        state.items=[];state.events=[];
        const item=makeItem('One Piece','anime','going');
        Object.assign(item,{id:'11111111-1111-4111-8111-111111111111',year:1999,tvmaze:1505,castTried:true,season:1999,episode:2,seasonGuide:[{number:1999,episodes:[1,2,3,4,5,6,7,8]}],progressCheckedAt:Date.now()-172800000});
        state.items.push(item);render();openItem(item.id);
      });
      await page.waitForFunction(()=>document.querySelector('#trackedEpisode')?.max==='308');
      assert.equal(await page.locator('#trackedSeason').count(),0);
      assert.equal(await page.locator('#trackedEpisode').inputValue(),'2');
      assert.equal(await page.locator('#trackedEpisode').isEnabled(),true);
      assert.match(await page.locator('#episodeLimit').textContent(),/308/);
      assert.match(await page.locator('.tracking-season-explorer').textContent(),/Arcs & episodes/);
      assert.match(await page.locator('.tracking-arc-range').first().textContent(),/1–61/);
      assert.doesNotMatch(await page.locator('.tracking-season-explorer').textContent(),/Season 1999/);
      const commit=async value=>{
        await page.locator('#trackedEpisode').fill(String(value));
        await page.locator('#trackedEpisode').press('Tab');
        await page.waitForFunction(value=>!trackingPending.size&&window.ReelTrackingCore.episodeNumber(state.items[0])===value,value);
      };
      await commit(258);
      assert.equal(await page.locator('[data-track-episode][aria-pressed=true]').count(),258);
      assert.equal(await page.evaluate(()=>state.events.length),0,'baseline input does not invent dated watches');
      await commit(255);
      assert.equal(await page.locator('[data-track-episode][aria-pressed=true]').count(),255);
      assert.equal(await page.locator('[data-track-episode="2000:250"]').getAttribute('aria-pressed'),'false');
      await page.locator('[data-episode-group="arc-207"] summary').click();
      await page.locator('[data-track-episode="2000:248"][data-track-action="watch"]').click();
      await page.waitForFunction(()=>document.querySelector('#trackedEpisode').value==='256');
      assert.equal(await page.locator('#trackedEpisode').isEnabled(),true);
      assert.equal(await page.locator('[data-episode-group="arc-207"]').evaluate(node=>node.open),true);
      assert.equal(await page.evaluate(()=>document.activeElement?.dataset.trackEpisode),'2000:248','checkbox focus survives refresh');
      await page.locator('[data-track-episode="2000:248"][data-track-action="unwatch"]').click();
      await page.waitForFunction(()=>document.querySelector('#trackedEpisode').value==='255');
      await page.locator('#statusSeg [data-status="done"]').click();
      await page.waitForFunction(()=>document.querySelector('#trackedEpisode').value==='308');
      assert.equal(await page.locator('[data-track-episode][aria-pressed=true]').count(),308);
      await commit(0);
      assert.equal(await page.locator('[data-track-episode][aria-pressed=true]').count(),0);
      await commit(65);
      for(const theme of ['dark','light']){
        await page.evaluate(theme=>{state.ui.theme=theme;document.documentElement.dataset.theme=theme;},theme);
        await page.locator('.progress-tracker').scrollIntoViewIfNeeded();
        assert.ok(await page.locator('#drawer').evaluate(node=>node.scrollWidth<=node.clientWidth+1),'drawer does not overflow');
        await page.screenshot({path:path.resolve(__dirname,`../.impeccable/review/anime-${width}-${theme}.png`)});
      }
      // The same input remains usable for genuinely seasonal anime.
      await page.evaluate(()=>{
        closeSheets();const item=makeItem('Jujutsu Kaisen','anime','going');
        Object.assign(item,{year:2020,tvmaze:48450,castTried:true,season:1,episode:1,watchedEpisodes:['1:1'],seasonGuide:[{number:1,episodes:[1,2,3]},{number:2,episodes:[1,2]}],progressCheckedAt:Date.now()});
        state.items.push(item);openItem(item.id);
      });
      assert.equal(await page.locator('#trackedSeason').isEnabled(),true);
      assert.equal(await page.locator('#trackedEpisode').isEnabled(),true);
      await page.locator('#trackedSeason').fill('2');await page.locator('#trackedSeason').press('Tab');
      await page.waitForFunction(()=>!trackingPending.size&&state.items[1].season===2);
      assert.equal(await page.locator('[data-track-episode][aria-pressed=true]').count(),4);
      assert.match(await page.locator('.tracking-season-explorer h3').textContent(),/Seasons & episodes/);
      if(width===1440){
        assert.deepEqual(await page.evaluate(async()=>{
          const item={id:'legacy-kitsu',type:'anime',title:'One Piece',year:1999,pages:308,season:1,episode:255,watchedEpisodes:['1:1','1:255']};
          const ok=await ensureProgressMeta(item,{force:true});
          return {ok,position:window.ReelTrackingCore.episodeNumber(item),keys:item.watchedEpisodes,continuous:item.continuousEpisodeKeys,last:item.seasonGuide.at(-1).number};
        }),{ok:true,position:255,keys:['1:1','1:255'],continuous:true,last:1},'metadata refresh preserves pre-existing continuous episode identities');
        // Exercise the real save path against a deterministic owner-scoped client.
        const result=await page.evaluate(async()=>{
          const item=state.items[0];cloud.user={id:'owner-a'};cloud.loaded=true;
          let payload,filter;window.__progressFailure=false;
          cloud.client={rpc:async()=>({error:null}),from:()=>({
            select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:item.id,title_id:'catalog-id'},error:null})})}),
            update(values){
              payload=values;
              return {eq(field,value){
                filter={field,value};
                return {select:()=>({maybeSingle:async()=>window.__progressFailure?{data:null,error:null}:{data:{id:item.id},error:null}})};
              }};
            }
          })};
          const success=await applyEpisodeCursor(item,{episode:258});
          const saved={success,payload,filter};window.__progressFailure=true;
          const rejected=await applyEpisodeCursor(item,{episode:255});
          clearTimeout(cloud.timer);cloud.user=null;
          return {...saved,rejected,after:window.ReelTrackingCore.episodeNumber(item),flags:item.watchedEpisodes.length,events:state.events.length};
        });
        assert.equal(result.success,true);assert.equal(result.payload.watched_episodes.length,258);
        assert.equal(result.filter.field,'id');assert.ok(result.filter.value);assert.equal(result.payload.user_id,undefined);
        assert.equal(result.rejected,false,'a zero-row private update must be treated as failure');
        assert.equal(result.after,258);assert.equal(result.flags,258,'failed edit rolls back all checkboxes');
      }
      assert.deepEqual(errors,[]);await page.close();
      console.log(`PASS: anime progress, arcs, two-way synchronization, correction and seasonal controls at ${width}px`);
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
