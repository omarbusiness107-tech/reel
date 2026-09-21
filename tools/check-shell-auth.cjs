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
  const write=session=>{if(session)localStorage.setItem('reel.mock.session',JSON.stringify(session));else localStorage.removeItem('reel.mock.session');listeners.forEach(fn=>fn(session?'SIGNED_IN':'SIGNED_OUT',session));};
  const user=email=>({id:'user-1',email,user_metadata:{display_name:'Omar Guest'}});
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
    from(){return {
      select(){return {eq(){return {maybeSingle:async()=>({data:null,error:null})}}}},
      upsert:async()=>({error:null})
    }}
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
    await page.click('#btnAccount');
    assert.equal(await page.locator('#accountMenu').isVisible(),true);
    assert.match(await page.locator('#accountMenu').textContent(),/omar@example.com/);
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
    console.log('PASS: authentication, session persistence, navbar, drawer, Add Title, P4M edges, and five responsive widths');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
