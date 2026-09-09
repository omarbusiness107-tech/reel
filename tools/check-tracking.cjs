// Deterministic browser checks in an isolated profile. Never touches a saved library.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const output=path.join(require('node:os').tmpdir(),'reel-tracking-qa');
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    const episodes=[1,2,3].map(number=>({season:1,number,airdate:'2020-01-01'}))
      .concat([1,2].map(number=>({season:2,number,airdate:'2021-01-01'})),[{season:3,number:1,airdate:'2099-01-01'},{season:2,number:null,airdate:'2021-01-01'}]);
    await page.route('**/*',route=>{
      const url=route.request().url();
      if(url==='https://api.tvmaze.com/shows/999/episodes')return route.fulfill({json:episodes});
      if(url==='https://api.tvmaze.com/shows/999')return route.fulfill({json:{id:999,status:'Running',rating:{average:8.2}}});
      if(url.includes('api.tvmaze.com/search/shows'))return route.fulfill({json:[]});
      if(url.startsWith('file:')||url.includes('cdn.jsdelivr.net'))return route.continue();
      return route.abort();
    });
    await page.goto(pathToFileURL(path.resolve(__dirname,'../reel.html')).href);
    await page.waitForSelector('#typeTabs button');await page.evaluate(()=>document.fonts.ready);
    await page.evaluate(()=>{
      state.items=state.items.slice(0,18);state.items.forEach(it=>{it.castTried=true;it.castHydrated=true;});
      const it=makeItem('Tracking fixture','series','going');
      Object.assign(it,{id:'tracking-test',tvmaze:999,year:2020,castTried:true,castHydrated:true,score:8.2,sourceName:'TVMaze',showStatus:'Running',country:'United States',language:'English'});
      state.items.unshift(it);render();openItem(it.id);
    });
    await page.waitForFunction(()=>document.querySelector('#trackedEpisode')?.max==='3');
    const topOrder=await page.evaluate(()=>{
      const body=document.querySelector('#drawer .sheet-body'),nodes=[body.querySelector('#statusSeg'),body.querySelector('.progress-tracker'),body.querySelector('#stars'),body.querySelector('.title-facts')];
      return nodes.map(node=>[...body.children].findIndex(child=>child===node||child.contains(node)));
    });
    assert.deepEqual(topOrder,[0,1,3,4]);
    const statusColors=await page.evaluate(()=>{
      const read=status=>{
        const button=document.querySelector(`#statusSeg [data-status="${status}"]`);
        return {text:getComputedStyle(button).color,icon:getComputedStyle(button.querySelector('.lucide')).color};
      };
      return [read('suggested'),read('done'),read('waiting')];
    });
    assert.equal(new Set(statusColors.map(value=>value.text)).size,1);
    assert.equal(new Set(statusColors.map(value=>value.icon)).size,3);
    assert.equal(await page.locator('#trackedSeason').getAttribute('max'),'2');
    await page.locator('#trackedSeason').fill('21');
    assert.equal(await page.locator('#trackedSeason').inputValue(),'2');
    assert.equal(await page.locator('#trackedEpisode').getAttribute('max'),'2');
    await page.locator('#trackedEpisode').fill('40');
    assert.equal(await page.locator('#trackedEpisode').inputValue(),'2');
    await page.locator('#trackedSeason').fill('1');
    await page.locator('#trackedEpisode').fill('-3');
    assert.equal(await page.locator('#trackedEpisode').inputValue(),'0');
    await page.locator('#statusSeg [data-status="done"]').click();
    await page.waitForFunction(()=>state.items[0].status==='done');
    assert.deepEqual(await page.evaluate(()=>[state.items[0].season,state.items[0].episode]),[2,2]);
    await page.locator('#statusSeg [data-status="waiting"]').click();
    await page.waitForFunction(()=>state.items[0].status==='waiting');
    assert.equal(await page.locator('.waiting-help').isVisible(),true);
    const selectedWaiting=await page.locator('#statusSeg [data-status="waiting"]').evaluate(el=>getComputedStyle(el).backgroundColor);
    await page.locator('#statusSeg [data-status="done"]').click();
    const selectedDone=await page.locator('#statusSeg [data-status="done"]').evaluate(el=>getComputedStyle(el).backgroundColor);
    assert.notEqual(selectedWaiting,selectedDone);
    await page.locator('#statusSeg [data-status="waiting"]').click();
    assert.equal(await page.evaluate(()=>state.items[0].finished),null);
    assert.equal(await page.evaluate(async()=>{await bump(state.items[0],1);return state.items[0].status;}),'waiting');
    await page.locator('#trackedSeason').fill('1');await page.locator('#trackedEpisode').fill('3');
    await page.locator('#quickBump').click();
    await page.waitForFunction(()=>state.items[0].season===2);
    assert.equal(await page.locator('#trackedEpisode').inputValue(),'1');
    assert.equal(await page.locator('#nextSeason').isDisabled(),true);
    const facts=await page.locator('.labeled-facts').innerText();
    assert.match(facts,/Series status/);assert.match(facts,/Running/);assert.match(facts,/Rated by TVMaze users/);
    // All finish entry points share the same last-season completion rule.
    await page.evaluate(()=>{closeSheets();state.items[0].status='going';state.items[0].season=1;state.items[0].episode=1;render();});
    await page.locator('.resume[data-id="tracking-test"] [data-act="done"]').click();
    await page.waitForFunction(()=>state.items[0].status==='done');
    assert.deepEqual(await page.evaluate(()=>[state.items[0].season,state.items[0].episode]),[2,2]);
    const edge=await page.evaluate(async()=>{
      const unknown=makeItem('No catalog match','series');state.items.push(unknown);
      const unknownFinished=await changeItemStatus(unknown,'done');
      const empty=makeItem('Not yet released','series');Object.assign(empty,{seasonGuide:[],progressCheckedAt:now()});state.items.push(empty);
      const emptyFinished=await changeItemStatus(empty,'done');
      const gap=makeItem('Numbering gaps','series');Object.assign(gap,{seasonGuide:[{number:1,episodes:[1,3]},{number:3,episodes:[1,2]}],season:2,episode:99});clampProgress(gap);
      const anime=makeItem('Anime entry','anime');anime.pages=12;state.items.push(anime);await changeItemStatus(anime,'done');
      return {unknownFinished,unknownStatus:unknown.status,emptyFinished,gap:[gap.season,gap.episode],anime:[anime.season,anime.episode]};
    });
    assert.deepEqual(edge,{unknownFinished:false,unknownStatus:'want',emptyFinished:false,gap:[1,3],anime:[1,12]});
    // Persistence survives a round-trip without reinterpreting season-local episodes.
    assert.equal(await page.evaluate(()=>{const it=migrate(JSON.parse(JSON.stringify(state.items[0])));return it.seasonGuide.length===2&&it.season===2&&it.episode===2;}),true);
    await page.evaluate(()=>{state.items.forEach(it=>{it.castTried=true;it.castHydrated=true;});save();});
    await page.waitForTimeout(250);await page.reload();await page.waitForSelector('#typeTabs button');
    assert.deepEqual(await page.evaluate(()=>{const it=state.items.find(it=>it.id==='tracking-test');return [it.season,it.episode,it.seasonGuide.length];}),[2,2,2]);
    let layouts=0;
    for(const lang of ['en','fr','ar'])for(const theme of ['dark','light'])for(const width of [320,390,768,1280,1920]){
      await page.setViewportSize({width,height:1000});
      await page.evaluate(({lang,theme})=>{closeSheets();state.ui.language=lang;state.ui.theme=theme;filterType='all';filterStatus.clear();render();window.scrollTo(0,0);},{lang,theme});
      await page.waitForTimeout(250);
      const before=await page.locator('#statusChips [data-status="dropped"]').evaluate(el=>el.offsetTop);
      await page.locator('#statusChips [data-status="want"]').click();
      assert.equal(await page.locator('#statusChips [data-status="dropped"]').evaluate(el=>el.offsetTop),before);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`Page overflow ${width} ${lang}`);
      const counts=await page.locator('#typeTabs button:not([data-type="catalog"]) .n').evaluateAll(els=>els.every(el=>getComputedStyle(el).display!=='none'&&el.getBoundingClientRect().width>0));
      assert.equal(counts,true,`Hidden counts ${width}`);
      if(width<=768){
        const filled=await page.locator('#statusChips').evaluate(el=>{
          const rows=new Map();for(const b of el.children){rows.set(b.offsetTop,(rows.get(b.offsetTop)||0)+b.offsetWidth);}
          return [...rows.values()].every(width=>width>=el.clientWidth-30);
        });
        assert.equal(filled,true,`Empty filter slots ${width}`);
      }
      if(lang==='en'&&theme==='dark'&&[390,1920].includes(width))await page.screenshot({path:path.join(output,`library-${width}.png`)});
      await page.evaluate(()=>openItem('tracking-test'));await page.waitForTimeout(250);
      assert.equal(await page.locator('#drawer').evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,`Drawer overflow ${width} ${lang}`);
      if(lang==='en'&&[390,1920].includes(width)){
        await page.locator('.progress-tracker').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`tracker-${theme}-${width}.png`)});
        await page.locator('.title-facts').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`facts-${theme}-${width}.png`)});
      }
      layouts++;
    }
    await page.evaluate(()=>{closeSheets();filterStatus.clear();render();window.scrollTo(0,document.body.scrollHeight);});
    await page.waitForFunction(()=>!document.querySelector('#backToTop').hidden);
    await page.locator('#backToTop').click();await page.waitForFunction(()=>scrollY===0);
    await page.waitForFunction(()=>document.querySelector('#backToTop').hidden);
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({result:'passed',layouts,checks:'Season bounds, per-season episodes, finish from details and Continue, waiting, unknown/offline, upcoming, numbering gaps, anime, persistence, counts, filters, back-to-top',output},null,2));
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
