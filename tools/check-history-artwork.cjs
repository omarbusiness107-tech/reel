// Optional network verification: use actual provider images, not dimension-only fixtures.
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [375,1440]){
   const page=await browser.newPage({viewport:{width,height:900}});
   await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',route=>route.fulfill({contentType:'application/javascript',body:'window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{}}})}}}}'}));
   await page.goto(pathToFileURL(path.resolve(__dirname,'../reel.html')).href,{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>!cloud.loading);
   await page.evaluate(()=>{
    state.items=[];state.events=[];
    for(const [title,year,type] of [['The Machinist',2004,'movie'],['Man of Steel',2013,'movie'],['Zodiac',2007,'movie'],['300',2006,'movie'],['F1',2025,'movie'],['The Mentalist',2008,'series'],['Berserk',1989,'manga'],['$100M Leads',2023,'book']]){
     const item=makeItem(title,type,'going');item.year=year;
     const event={id:crypto.randomUUID(),titleId:item.id,mediaType:type,eventType:type==='manga'?'chapter_read':type==='movie'?'movie_watched':'episode_watched',watchedAt:'2026-10-05T12:00:00Z'};
     if(type==='series'){item.episodeCatalog=[{season:2,number:3,title:'Red Badge',image:'https://static.tvmaze.com/uploads/images/original_untouched/182/456503.jpg'}];event.season=2;event.episode=3;}
     if(type==='manga'){item.chapter=13;item.cover='https://media.kitsu.app/manga/8/poster_image/67d602c20d1bf0eeb43e1a363c59ed5b.jpg';item.synopsis='Guts, a wandering warrior, is drawn into the ambitions of Griffith and the Band of the Hawk.';item.genres=['Fantasy','Drama'];event.chapter=13;}
     if(type==='book'){item.page=20;item.cover='https://covers.openlibrary.org/b/id/14796132-L.jpg';event.page=20;event.mediaType='book';event.eventType='pages_read';}
     state.items.push(item);state.events.push(event);
    }
    render();window.ReelTrackingUI.navigate('activity',{historyMode:'none'});
    document.querySelectorAll('.tracking-history-image').forEach(img=>img.loading='eager');
   });
   await page.waitForFunction(()=>document.querySelectorAll('.tracking-history-image[data-ready]').length===8,null,{timeout:60000});
   const dimensions=await page.locator('.tracking-history-image').evaluateAll(imgs=>imgs.map(img=>({title:img.closest('article').querySelector('strong').textContent,ready:img.dataset.ready,source:[img.naturalWidth,img.naturalHeight],display:[img.clientWidth,img.clientHeight]})));
   for(const row of dimensions.filter(row=>row.ready==='full'))assert.ok(Math.abs(row.source[0]/row.source[1]-row.display[0]/row.display[1])<.025,`${row.title}: preserve the complete composition`);
   assert.equal(await page.locator('.tracking-history-summary').count(),0,'History contains no summaries');
   for(const title of ['The Machinist','Man of Steel']){const row=dimensions.find(row=>row.title===title);assert.equal(row.ready,'full');assert.ok(row.source[0]>=1280&&row.source[1]>=600,'real HD landscape source');}
   for(const title of ['Berserk','$100M Leads']){
    const card=page.locator('.tracking-history-card').filter({has:page.getByText(title,{exact:true})});
    assert.ok(await card.locator('img').evaluate(img=>{const box=img.getBoundingClientRect(),parent=img.parentElement.getBoundingClientRect();return Math.abs(box.right-parent.right)<2&&getComputedStyle(img).objectFit==='contain'&&getComputedStyle(img).objectPosition==='100% 50%';}),'reading cover sits flush with the right edge without cropping');
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no page overflow');
   console.log(width,dimensions);
   for(const title of ['The Machinist','Man of Steel','Zodiac','300','F1','Red Badge','Berserk','$100M Leads']){
    const card=page.locator('.tracking-history-card').filter({has:page.getByText(title,{exact:true})});
    await card.screenshot({path:path.resolve(__dirname,`../.impeccable/review/history-real-${title.replace(/ /g,'-')}-${width}.png`)});
   }
   await page.locator('.tracking-history-expand').first().click();
   assert.equal(await page.locator('#mediaViewer').isVisible(),true,'full image opens');
   await page.evaluate(()=>closeMedia());
   for(const title of ['The Machinist','Man of Steel']){
    await page.evaluate(title=>{const item=state.items.find(it=>it.title===title);item.castTried=true;openItem(item.id);},title);
    await page.waitForSelector('.detail-landscape[data-banner-ready="true"]');
    assert.ok(await page.locator('.detail-landscape img').evaluate(img=>img.naturalWidth>=1280&&Math.abs(img.clientWidth/img.clientHeight-img.naturalWidth/img.naturalHeight)<.03),'detail banners preserve genuine HD source composition');
    await page.locator('.detail-hero').screenshot({path:path.resolve(__dirname,`../.impeccable/review/detail-real-${title.replace(/ /g,'-')}-${width}.png`)});
    await page.evaluate(()=>closeSheets());
   }
   await page.evaluate(()=>document.documentElement.dataset.theme='light');
   await page.locator('.tracking-history-card').first().screenshot({path:path.resolve(__dirname,`../.impeccable/review/history-real-light-${width}.png`)});
   await page.close();
  }
  console.log('PASS: real artwork fills landscape cards without crop, portrait fallback, full-image viewer, mobile/desktop and light mode');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
