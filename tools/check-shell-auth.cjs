const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const baseURL = process.env.REEL_TEST_URL || pathToFileURL(path.resolve(__dirname,'../reel.html')).href;

const supabaseStub = `
window.supabase={createClient(){
  const listeners=[];
  const read=()=>{try{return JSON.parse(localStorage.getItem('reel.mock.session')||'null')}catch{return null}};
  const readDb=()=>{try{return JSON.parse(localStorage.getItem('reel.mock.db')||'{"titles":{},"users":{},"preferences":{},"events":{}}')}catch{return {titles:{},users:{},preferences:{},events:{}}}};
  const writeDb=db=>localStorage.setItem('reel.mock.db',JSON.stringify(db));
  const write=session=>{if(session)localStorage.setItem('reel.mock.session',JSON.stringify(session));else localStorage.removeItem('reel.mock.session');listeners.forEach(fn=>fn(session?'SIGNED_IN':'SIGNED_OUT',session));};
  const user=email=>({id:email.startsWith('sara')?'account-b':'account-a',email,user_metadata:{display_name:email.startsWith('sara')?'Sara Account':'Omar Guest'}});
  const currentId=()=>read()?.user?.id;
  return {
    auth:{
      getSession:async()=>({data:{session:read()},error:null}),
      onAuthStateChange:fn=>{listeners.push(fn);return {data:{subscription:{unsubscribe(){}}}}},
      signInWithPassword:async({email,password})=>{
        if(email==='wrong@example.com'||password!=='password123')return {data:{},error:{code:'invalid_credentials',message:'Invalid login credentials'}};
        const session={access_token:'test-token',user:user(email)};write(session);return {data:session,error:null};
      },
      signUp:async({email})=>{
        if(email==='duplicate@example.com')return {data:{user:{...user(email),identities:[]},session:null},error:null};
        return {data:{user:{...user(email),identities:[{}]},session:null},error:null};
      },
      signOut:async()=>{write(null);return {error:null}}
    },
    from(name){return {
      select(){
        if(name==='user_titles')return {
          order:async()=>{await new Promise(resolve=>setTimeout(resolve,20));return {data:readDb().users[currentId()]||[],error:null}},
          eq:(field,value)=>({maybeSingle:async()=>({data:(readDb().users[currentId()]||[]).find(row=>row[field]===value)||null,error:null})})
        };
        if(name==='titles'){
          const filters={};
          const query={eq(field,value){filters[field]=value;return query},maybeSingle:async()=>({data:Object.values(readDb().titles).find(row=>Object.entries(filters).every(([field,value])=>row[field]===value))||null,error:null})};
          return query;
        }
        if(name==='user_preferences')return {maybeSingle:async()=>({data:readDb().preferences[currentId()]?{settings:readDb().preferences[currentId()]}:null,error:null})};
        if(name==='watch_events')return {order:()=>({limit:async n=>({data:(readDb().events?.[currentId()]||[]).slice(0,n),error:null}),range:async(a,b)=>({data:(readDb().events?.[currentId()]||[]).slice(a,b+1),error:null}),then:resolve=>Promise.resolve({data:readDb().events?.[currentId()]||[],error:null}).then(resolve)}),eq:(field,value)=>({order:async()=>({data:(readDb().events?.[currentId()]||[]).filter(event=>event[field]===value),error:null})})};
        return {maybeSingle:async()=>({data:null,error:null})};
      },
      update(values){return {eq:async(field,value)=>{const db=readDb();for(const event of db.events?.[currentId()]||[])if(event[field]===value)Object.assign(event,values);writeDb(db);return {error:null}}};}
    }},
    rpc:async(name,args)=>{
      if(!currentId())return {data:null,error:{message:'unauthorized'}};
      if(name==='apply_watch_action'){
        const db=readDb(),uid=currentId(),item=(db.users[uid]||[]).find(row=>row.id===args.p_user_title_id);
        if(!item)return {data:null,error:{message:'not owned'}};
        db.events ||= {};db.events[uid] ||= [];
        const watched=new Set(item.watched_episodes||args.p_baseline||[]);
        for(const entry of args.p_entries||[]){
          const key=entry.season+':'+entry.number;
          const matching=db.events[uid].filter(event=>event.user_title_id===item.id&&event.season_number===entry.season&&event.episode_number===entry.number);
          if(args.p_action==='unwatch'){
            if(matching.length)db.events[uid].splice(db.events[uid].indexOf(matching.at(-1)),1);
            if(!db.events[uid].some(event=>event.user_title_id===item.id&&event.season_number===entry.season&&event.episode_number===entry.number))watched.delete(key);
          }else{
            if(args.p_action==='rewatch'||!matching.length)db.events[uid].push({id:'watch-'+uid+'-'+Math.random(),user_title_id:item.id,season_number:entry.season,episode_number:entry.number,media_type:item.title.media_type,event_type:args.p_action==='rewatch'?'rewatch':item.title.media_type==='movie'?'movie_watched':'episode_watched',watched_at:args.p_watched_at,runtime_minutes:entry.runtime,source:'reel'});
            if(item.title.media_type!=='movie')watched.add(key);
          }
        }
        item.watched_episodes=[...watched];writeDb(db);return {data:1,error:null};
      }
      if(name!=='sync_my_library')return {data:null,error:{message:'unknown rpc'}};
      const db=readDb(),uid=currentId(),rows=[];
      for(const entry of args.p_entries||[]){
        const key=entry.provider+'|'+entry.providerId;
        db.titles[key] ||= {id:'title-'+Object.keys(db.titles).length,provider:entry.provider,provider_id:entry.providerId,media_type:entry.mediaType,title:entry.title,release_year:entry.year,poster_url:entry.posterUrl,backdrop_url:entry.backdropUrl,description:entry.description,creator:entry.creator,genres:entry.genres,runtime_minutes:entry.runtimeMinutes,page_count:entry.pageCount,public_rating:entry.publicRating,metadata:entry.metadata};
        const id='entry-'+uid+'-'+key,old=(db.users[uid]||[]).find(row=>row.id===id);
        rows.push({id,title_id:db.titles[key].id,status:entry.status,rating:entry.rating,favorite:entry.favorite,current_season:entry.currentSeason,current_episode:entry.currentEpisode,current_page:entry.currentPage,current_chapter:entry.currentChapter,stopped_at_sec:entry.stoppedAtSec,watched_episodes:old?.watched_episodes||null,notes:entry.notes,tags:entry.tags,started_at:entry.startedAt,completed_at:entry.completedAt,last_interaction_at:entry.lastInteractionAt,created_at:entry.createdAt,updated_at:entry.lastInteractionAt,title:db.titles[key]});
      }
      db.users[uid]=rows;db.preferences[uid]=args.p_preferences||{};writeDb(db);return {data:rows.length,error:null};
    }
  };
}};`;

async function open(browser,width,height){
  const page=await browser.newPage({viewport:{width,height}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://cdn.jsdelivr.net/npm/@supabase/**',route=>route.fulfill({contentType:'application/javascript',body:supabaseStub}));
  await page.route('https://cdn.jsdelivr.net/npm/lucide/**',route=>route.fulfill({contentType:'application/javascript',body:'window.lucide={createIcons(){}}'}));
  await page.route('https://zwedeotmsmtfkshxeezn.supabase.co/**',route=>route.abort());
  await page.goto(baseURL,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#btnAuth');
  return {page,errors};
}

async function checkResponsive(browser,width,height){
  const {page,errors}=await open(browser,width,height);
  const shell=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,innerWidth,headerHeight:document.querySelector('header.top').getBoundingClientRect().height,authVisible:!!document.querySelector('#btnAuth')?.offsetParent}));
  assert.ok(shell.scrollWidth<=shell.innerWidth+1,`${width}: shell must not scroll horizontally`);
  assert.ok(shell.headerHeight<90,`${width}: navbar must stay on one line`);
  assert.equal(shell.authVisible,true,`${width}: sign in must remain visible`);
  await page.click('#btnMobileMenu');
  await page.waitForSelector('#navDrawer.on');
  const drawerRatio=await page.locator('#navDrawer').evaluate(el=>el.getBoundingClientRect().width/innerWidth);
  const closeControl=await page.locator('#navClose').evaluate(el=>{const rect=el.getBoundingClientRect();return {width:rect.width,height:rect.height}});
  assert.ok(Math.abs(closeControl.width-40)<1&&Math.abs(closeControl.height-40)<1,`${width}: drawer Close must remain a compact icon control (${JSON.stringify(closeControl)})`);
  const navLayout=await page.locator('.nav-drawer-list').evaluate(el=>({display:getComputedStyle(el).display,columns:getComputedStyle(el).gridTemplateColumns,children:[...el.children].map(child=>({width:child.getBoundingClientRect().width,top:child.getBoundingClientRect().top}))}));
  assert.equal(new Set(navLayout.children.map(child=>child.top)).size,navLayout.children.length,`${width}: drawer navigation must be one vertical list (${JSON.stringify(navLayout)})`);
  assert.match(await page.locator('#btnAdd').textContent(),/Add title/i,`${width}: Add Title label must stay visible in the drawer`);
  if(width<=430)assert.ok(drawerRatio>=.75&&drawerRatio<=.9,`${width}: mobile drawer width must be 75 to 90 percent`);
  assert.equal(await page.locator('#navDrawer [data-nav-action="list"]').getAttribute('aria-current'),'page');
  if(width===375){const output=path.resolve(__dirname,'../.impeccable/review');fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'drawer-375.png'),fullPage:false});}
  if(width===375){
    await page.mouse.click(width-3,Math.round(height/2));
    await page.waitForFunction(()=>document.querySelector('#navOverlay').hidden);
    await page.click('#btnMobileMenu');await page.waitForSelector('#navDrawer.on');
  }
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.querySelector('#navDrawer').classList.contains('on'));
  assert.equal(await page.locator('#btnMobileMenu').getAttribute('aria-expanded'),'false');
  assert.equal(errors.length,0,`${width}: ${errors.join('; ')}`);
  if([375,1024].includes(width)){
    const output=path.resolve(__dirname,'../.impeccable/review');fs.mkdirSync(output,{recursive:true});
    await page.screenshot({path:path.join(output,`shell-${width}.png`),fullPage:false});
  }
  await page.close();
}

(async()=>{
  const installedBrowser=['C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'].find(fs.existsSync);
  const browser=await chromium.launch({headless:true,...(installedBrowser?{executablePath:installedBrowser}:{})});
  try{
    for(const [width,height] of [[375,760],[430,820],[768,900],[1024,800],[1440,900]])await checkResponsive(browser,width,height);
    const {page,errors}=await open(browser,1024,800);

    await page.click('#btnMobileMenu');
    await page.click('#btnAdd');
    await page.waitForSelector('#modal.on #aTitle');
    assert.match(await page.locator('#modal').textContent(),/Add a title/);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'btnMobileMenu','drawer-launched dialogs return focus to the menu trigger');

    await page.click('#btnAuth');
    {const output=path.resolve(__dirname,'../.impeccable/review');fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'auth-1024.png'),fullPage:false});}
    await page.fill('#authEmail','bad-email');
    await page.fill('#authPassword','short');
    await page.click('#authSubmit');
    assert.match(await page.locator('#authMessage').textContent(),/valid email/i);
    await page.fill('#authEmail','wrong@example.com');
    await page.fill('#authPassword','password123');
    await page.click('#authSubmit');
    assert.match(await page.locator('#authMessage').textContent(),/Incorrect email or password/i);
    assert.doesNotMatch(await page.locator('#authMessage').textContent(),/invalid login credentials/i);

    await page.click('#authSwitch');
    assert.match(await page.locator('#modal').textContent(),/Create your Reel account/);
    await page.fill('#authName','Omar Guest');
    await page.fill('#authEmail','duplicate@example.com');
    await page.fill('#authPassword','password123');
    await page.click('#authSubmit');
    assert.match(await page.locator('#authMessage').textContent(),/already exists/i);
    await page.fill('#authEmail','new@example.com');
    await page.click('#authSubmit');
    assert.match(await page.locator('#authMessage').textContent(),/confirm your account/i);
    await page.click('#authSwitch');
    await page.fill('#authEmail','omar@example.com');
    await page.fill('#authPassword','password123');
    await page.click('#authSubmit');
    await page.waitForSelector('#btnAccount:not([hidden])');
    assert.equal(await page.locator('#btnAuth').isHidden(),true);
    assert.match(await page.locator('#btnAccount').getAttribute('aria-label'),/Omar Guest/);

    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForSelector('#btnAccount:not([hidden])');
    assert.equal(await page.locator('#btnAuth').isHidden(),true,'session must survive refresh');
    await page.evaluate(async()=>{
      state.items=[];
      const add=(title,type,status,catalogId,rating=0)=>{const item=makeItem(title,type,status);item.catalogId=catalogId;item.rating=rating;state.items.push(item);};
      add('Interstellar 2014','movie','done','wikidata:Q13417189',9);
      add('Breaking Bad 2008','series','going','tvmaze:169');
      add('Dune 2021','movie','want','wikidata:Q61446713');
      render();await pushCloud();
    });
    const switchCheck=await page.evaluate(async()=>{
      const titleBefore=state.items[0]?.title;
      const loading=cloudSignIn('sara@example.com','password123');
      await new Promise(resolve=>setTimeout(resolve,0));
      const immediate={loading:cloud.loading,count:state.items.length};
      await loading;
      const accountB={count:state.items.length,titles:state.items.map(item=>item.title)};
      await cloudSignIn('omar@example.com','password123');
      return {titleBefore,immediate,accountB,accountA:{titles:state.items.map(item=>item.title).sort(),status:state.items.find(item=>item.title==='Interstellar')?.status,rating:state.items.find(item=>item.title==='Interstellar')?.rating}};
    });
    assert.equal(switchCheck.titleBefore,'Interstellar');
    assert.deepEqual(switchCheck.immediate,{loading:true,count:0},'account changes clear the old private state before loading');
    assert.deepEqual(switchCheck.accountB,{count:0,titles:[]},'new account must not inherit account A');
    assert.deepEqual(switchCheck.accountA,{titles:['Breaking Bad','Dune','Interstellar'],status:'done',rating:9},'account A state survives independently');
    const watchIsolation=await page.evaluate(async()=>{
      const item=state.items.find(row=>row.title==='Breaking Bad');
      item.seasonGuide=[{number:1,episodes:[1,2]}];item.episodeCatalog=[{season:1,number:1,title:'Pilot',airdate:'2008-01-01',runtime:45},{season:1,number:2,title:'Next',airdate:'2008-01-08',runtime:45}];item.progressCheckedAt=Date.now();
      const saved=await applyTrackingAction(item,[{season:1,number:1,runtime:45}],'watch');
      await pushCloud();const a={saved,events:state.events.length,watched:item.watchedEpisodes};
      window.ReelTrackingUI.navigate('activity',{historyMode:'none'});
      const switching=cloudSignIn('sara@example.com','password123');
      await new Promise(resolve=>setTimeout(resolve,0));
      const privateTransition={loading:cloud.loading,showsOldActivity:document.querySelector('#trackingView').textContent.includes('Breaking Bad')};
      await switching;
      const b={events:state.events.length,titles:state.items.length};
      await cloudSignIn('omar@example.com','password123');
      const back={events:state.events.length,watched:state.items.find(row=>row.title==='Breaking Bad')?.watchedEpisodes};
      return {a,privateTransition,b,back};
    });
    assert.deepEqual(watchIsolation,{a:{saved:true,events:1,watched:['1:1']},privateTransition:{loading:true,showsOldActivity:false},b:{events:0,titles:0},back:{events:1,watched:['1:1']}},'watch history and episode progress remain account-specific, including while accounts switch');
    const localMovieId=await page.evaluate(()=>{
      const movie=makeItem('New Movie 2026','movie','want');movie.catalogId='wikidata:Q-test-new-movie';movie.runtime=112;state.items.push(movie);
      openItem(movie.id);return movie.id;
    });
    await page.locator('#statusSeg [data-status="done"]').click();
    await page.waitForFunction(()=>state.items.some(item=>item.title==='New Movie'&&item.status==='done'&&state.events.some(event=>event.titleId===item.id)));
    const freshMovieWatch=await page.evaluate(localId=>{
      const movie=state.items.find(item=>item.title==='New Movie');
      const db=JSON.parse(localStorage.getItem('reel.mock.db'));
      return {serverId:movie.id,localId,status:movie.status,events:state.events.filter(event=>event.titleId===movie.id).length,remoteEvents:(db.events['account-a']||[]).filter(event=>event.user_title_id===movie.id).length};
    },localMovieId);
    assert.notEqual(freshMovieWatch.serverId,freshMovieWatch.localId,'the local movie ID must resolve to its account library row');
    assert.deepEqual([freshMovieWatch.status,freshMovieWatch.events,freshMovieWatch.remoteEvents],['done',1,1],'Finished adds a dated movie event locally and remotely');
    assert.match(await page.locator('#movieWatchControls').textContent(),/Watched 1 time/,'the movie details update after finishing');
    assert.equal(await page.locator('#toast').isVisible(),false,'the toast container stays hidden when idle');
    const sharedTitleCheck=await page.evaluate(async()=>{
      await cloudSignIn('sara@example.com','password123');
      const add=(title,type,status,catalogId)=>{const item=makeItem(title,type,status);item.catalogId=catalogId;state.items.push(item);};
      add('The Batman 2022','movie','done','wikidata:Q25188');
      add('Naruto 2002','anime','going','kitsu-anime:11');
      add('Interstellar 2014','movie','want','wikidata:Q13417189');
      render();await pushCloud();
      const db=JSON.parse(localStorage.getItem('reel.mock.db'));
      await cloudSignIn('omar@example.com','password123');
      return {globalTitles:Object.keys(db.titles).length,interstellarTitles:Object.values(db.titles).filter(title=>title.title==='Interstellar').length,accountARows:db.users['account-a'].length,accountBRows:db.users['account-b'].length,bTitles:db.users['account-b'].map(row=>row.title.title).sort(),a:db.users['account-a'].find(row=>row.title.title==='Interstellar'),b:db.users['account-b'].find(row=>row.title.title==='Interstellar')};
    });
    assert.equal(sharedTitleCheck.globalTitles,6);
    assert.equal(sharedTitleCheck.interstellarTitles,1,'same provider title is stored globally once');
    assert.deepEqual([sharedTitleCheck.accountARows,sharedTitleCheck.accountBRows],[4,3]);
    assert.deepEqual(sharedTitleCheck.bTitles,['Interstellar','Naruto','The Batman']);
    assert.deepEqual([sharedTitleCheck.a.status,sharedTitleCheck.a.rating,sharedTitleCheck.b.status,sharedTitleCheck.b.rating],['done',9,'want',0]);
    await page.waitForFunction(()=>!cloud.loading&&cloud.user?.id==='account-a');
    await page.click('#btnAccount');
    assert.equal(await page.locator('#accountMenu').isVisible(),true);
    assert.match(await page.locator('#accountMenu').textContent(),/omar@example.com/);
    await page.waitForFunction(()=>document.activeElement?.dataset.accountAction==='list');
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(()=>document.activeElement?.dataset.accountAction),'signout');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#accountMenu').isHidden(),true);
    await page.click('#btnAccount');await page.click('#q');assert.equal(await page.locator('#accountMenu').isHidden(),true,'outside click closes the account menu');
    await page.click('#btnAccount');
    await page.click('[data-account-action="signout"]');
    await page.waitForSelector('#btnAuth:not([hidden])');

    const pick=page.locator('#btnPick');
    for(const theme of ['light','dark']){
      await page.evaluate(value=>{document.documentElement.dataset.theme=value},theme);
      const restingSurface=await pick.evaluate(el=>getComputedStyle(el).backgroundImage);
      await pick.hover();
      const pickStyle=await pick.evaluate(el=>({overflow:getComputedStyle(el).overflow,clip:getComputedStyle(el).backgroundClip,border:getComputedStyle(el).borderTopWidth,surface:getComputedStyle(el).backgroundImage}));
      assert.equal(pickStyle.overflow,'hidden');assert.equal(pickStyle.clip,'border-box');assert.equal(pickStyle.border,'0px');
      assert.equal(pickStyle.surface,restingSurface);
    }
    await page.locator('#sort').evaluate(select=>select._smart.trigger.click());
    await page.waitForFunction(()=>document.querySelector('#sort')._smart.menu.dataset.open==='true');
    const selectGeometry=await page.locator('#sort').evaluate(select=>{
      const {trigger,menu}=select._smart;
      const measure=node=>{const rect=node.getBoundingClientRect();return {left:rect.left,right:rect.right,width:rect.width}};
      return {trigger:measure(trigger),menu:measure(menu)};
    });
    assert.ok(Math.abs(selectGeometry.trigger.left-selectGeometry.menu.left)<.1&&Math.abs(selectGeometry.trigger.right-selectGeometry.menu.right)<.1&&Math.abs(selectGeometry.trigger.width-selectGeometry.menu.width)<.1,`dropdown must match its trigger exactly (${JSON.stringify(selectGeometry)})`);
    await page.keyboard.press('Escape');
    await page.evaluate(()=>{state.ui.language='ar';render()});
    assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
    await page.click('#btnMobileMenu');
    await page.waitForTimeout(300);
    assert.match(await page.locator('#navDrawer').textContent(),/قائمتي/);
    const drawerEdge=await page.locator('#navDrawer').evaluate(el=>({right:el.getBoundingClientRect().right,viewport:innerWidth}));
    assert.ok(Math.abs(drawerEdge.right-drawerEdge.viewport)<1,`RTL drawer opens from the right edge (${JSON.stringify(drawerEdge)})`);
    await page.keyboard.press('Escape');
    await page.click('#btnAuth');assert.match(await page.locator('#modal').textContent(),/تسجيل الدخول/);await page.keyboard.press('Escape');
    assert.equal(errors.length,0,errors.join('; '));
    await page.close();
    console.log('PASS: authentication, account-specific libraries/watch history, navbar, drawer, Add Title, P4M edges, and five responsive widths');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
