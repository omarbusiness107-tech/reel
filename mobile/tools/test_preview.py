"""Contract/UI tests against exported native components on web. All account data is isolated HTTP fixtures.
This does not prove Android behavior or replace live-device/auth integration testing.
"""
import base64,json,re,time,uuid
from pathlib import Path
from urllib.parse import urlparse,parse_qs
from playwright.sync_api import sync_playwright,expect
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts';OUT.mkdir(exist_ok=True)
A='11111111-1111-4111-8111-111111111111';B='22222222-2222-4222-8222-222222222222'
FILM={'id':'tt0000001','imdb_id':'tt0000001','name':'Fixture Film Alpha','type':'movie','year':'2024','genres':['Drama'],'description':'A thoughtful drama. Isolated test data.','runtime':'100 min','imdbRating':'8.0'}
SHOW={'id':42,'name':'Fixture Series','type':'Scripted','language':'English','genres':['Drama'],'premiered':'2020-01-01','summary':'Isolated series fixture.','runtime':45,'rating':{'average':8},'weight':90}
EPISODES=[{'id':1,'season':1,'number':1,'name':'First frame','airdate':'2020-01-01','runtime':45},{'id':2,'season':1,'number':2,'name':'Future frame','airdate':'2099-01-01','runtime':45}]
def title_record(provider,pid,name,kind):return {'id':str(uuid.uuid4()),'provider':provider,'provider_id':pid,'media_type':kind,'title':name,'release_year':2024,'genres':['Drama'],'runtime_minutes':45 if kind=='series' else 100,'metadata':{'catalogId':provider+':'+pid,**({'tvmaze':42} if provider=='tvmaze' else {})}}
def member(title,user):return {'id':str(uuid.uuid4()),'user_id':user,'title_id':title['id'],'title':title,'status':'want','rating':0,'favorite':False,'current_season':1,'current_episode':0,'watched_episodes':[],'notes':'','tags':[],'created_at':'2026-01-01T00:00:00Z','last_interaction_at':'2026-01-01T00:00:00Z'}
db={A:[member(title_record('tvmaze','42','Fixture Series','series'),A)],B:[member(title_record('imdb','tt0000002','Account B private film','movie'),B)]}
events={A:[],B:[]};calls=[];users={}
def jwt(user):
    enc=lambda v:base64.urlsafe_b64encode(json.dumps(v).encode()).decode().rstrip('=')
    return enc({'alg':'HS256','typ':'JWT'})+'.'+enc({'sub':user,'role':'authenticated','aud':'authenticated','exp':int(time.time())+3600})+'.fixture-signature'
def owner(req):
    token=req.headers.get('authorization','').replace('Bearer ','')
    return users.get(token,A)
def fulfill(route,data,status=200):route.fulfill(status=status,content_type='application/json',body=json.dumps(data),headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'*'})
def backend(route):
    req=route.request;u=urlparse(req.url);q=parse_qs(u.query);path=u.path
    if req.method=='OPTIONS':return fulfill(route,{})
    body=req.post_data_json if req.post_data else {}
    if '/auth/v1/token' in path:
        user=B if body.get('email','').startswith('b@') else A;token=jwt(user);users[token]=user
        return fulfill(route,{'access_token':token,'token_type':'bearer','expires_in':3600,'refresh_token':'fixture-refresh','user':{'id':user,'email':body.get('email'),'aud':'authenticated','role':'authenticated','created_at':'2026-01-01T00:00:00Z'}})
    if '/auth/v1/logout' in path:return fulfill(route,{})
    user=owner(req)
    if '/auth/v1/user' in path:return fulfill(route,{'id':user,'email':'a@fixture.test'})
    calls.append((path,req.method,body))
    if path.endswith('/rpc/add_my_title'):
        e=body['p_entry'];assert 'notes' not in e['metadata'];assert 'user_id' not in e
        existing=next((m for m in db[user] if m['title']['provider']==e['provider'] and m['title']['provider_id']==e['providerId']),None)
        if existing:return fulfill(route,existing['id'])
        t=title_record(e['provider'],e['providerId'],e['title'],e['mediaType']);m=member(t,user);m['status']=e.get('status','want');db[user].append(m);return fulfill(route,m['id'])
    if path.endswith('/rpc/apply_watch_action'):
        assert re.match(r'^[a-f0-9-]{36}$',body['p_request_id'])
        m=next(m for m in db[user] if m['id']==body['p_user_title_id'])
        for ep in body['p_entries']:
            if body['p_action']=='unwatch':events[user]=[e for e in events[user] if not(e['user_title_id']==m['id'] and e['episode_number']==ep.get('number'))];m['watched_episodes']=[]
            else:
                events[user].append({'id':str(uuid.uuid4()),'user_title_id':m['id'],'season_number':ep.get('season'),'episode_number':ep.get('number'),'watched_at':body['p_watched_at'],'media_type':m['title']['media_type'],'event_type':'episode_watched' if ep.get('number') else 'movie_watched','runtime_minutes':ep.get('runtime')})
                if ep.get('number'):m.update(watched_episodes=[f"{ep['season']}:{ep['number']}"],current_episode=ep['number'],status='going')
                else:m['status']='done'
        return fulfill(route,1)
    if path.endswith('/user_titles'):
        rows=db[user]
        if 'id' in q:rows=[m for m in rows if m['id']==q['id'][0].removeprefix('eq.')]
        if req.method=='PATCH':
            for m in rows:m.update(body)
        if req.method=='DELETE':db[user]=[m for m in db[user] if m not in rows];return fulfill(route,[])
        return fulfill(route,rows[0] if 'vnd.pgrst.object' in req.headers.get('accept','') and rows else rows)
    if path.endswith('/watch_events'):
        rows=events[user]
        if 'id' in q:rows=[e for e in rows if e['id']==q['id'][0].removeprefix('eq.')]
        if req.method=='PATCH':
            for e in rows:e.update(body)
        return fulfill(route,rows[0] if 'vnd.pgrst.object' in req.headers.get('accept','') and rows else rows)
    return fulfill(route,{})
def catalogs(route):
    path=urlparse(route.request.url).path
    if 'media-imdb.com' in route.request.url:return fulfill(route,{'d':[]})
    if 'v3-cinemeta' in route.request.url:return fulfill(route,{'meta':FILM} if '/meta/' in path else {'metas':[FILM]})
    if 'kitsu' in route.request.url:return fulfill(route,{'data':[]})
    if 'wikidata' in route.request.url:return fulfill(route,{'search':[],'results':{'bindings':[]}})
    if path=='/search/people':return fulfill(route,[])
    if '/search/shows' in path:return fulfill(route,[{'show':SHOW}])
    if path.endswith('/episodes'):return fulfill(route,EPISODES)
    if path.endswith(('/cast','/crew','/images')):return fulfill(route,[])
    if path=='/shows/42':return fulfill(route,SHOW)
    return fulfill(route,[SHOW])
def run():
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':412,'height':915},reduced_motion='reduce')
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/*.supabase.co/**',backend)
    for host in ['v3-cinemeta.strem.io','v3.sg.media-imdb.com','api.tvmaze.com','kitsu.io','www.wikidata.org','query.wikidata.org']:page.route('**/'+host+'/**',catalogs)
    page.route('**/images.metahub.space/**',lambda route:route.abort())
    def ai(route):
        b=route.request.post_data_json
        if b['action']=='interpret':return fulfill(route,{'update':{'mediaType':'movie','genres':['Drama']},'question':None,'suggestions':[],'searchHints':[{'title':FILM['name'],'type':'movie'}]})
        return fulfill(route,{'choices':[{'id':c['id'],'why':'A drama from the supplied catalog.'} for c in b['candidates'][:b['count']]]})
    page.route('https://reel-navy.vercel.app/api/recommend',ai)
    page.goto('http://127.0.0.1:8092',wait_until='networkidle')
    page.get_by_role('button',name='Skip',exact=True).click()
    expect(page.get_by_text('Films worth a look',exact=True)).to_be_visible()
    assert '\\n' not in page.locator('body').inner_text()
    page.screenshot(path=str(OUT/'discover-fixture.png'))
    def tab(label):page.get_by_role('tab',name=re.compile(label)).click()
    def signin(email):
        page.get_by_role('button',name='Sign in',exact=True).click()
        page.get_by_label('Email address',exact=True).fill(email)
        page.get_by_label('Password',exact=True).fill('isolated-fixture-password')
        page.get_by_role('button',name='Sign in',exact=True).click()
    tab('Library');signin('a@fixture.test')
    page.get_by_role('button',name='Open Fixture Series',exact=True).click()
    expect(page.get_by_text('S1 E1 · First frame',exact=True)).to_be_visible()
    assert '[object Object]' not in page.locator('body').inner_text()
    expect(page.get_by_role('button',name='Watch',exact=True).last).to_be_disabled()
    page.get_by_role('button',name='Watch',exact=True).first.click()
    expect(page.get_by_text('Watch history updated.',exact=True)).to_be_visible()
    page.screenshot(path=str(OUT/'episodes-fixture.png'))
    page.get_by_role('button',name='Back',exact=True).click();tab('Search')
    page.get_by_label('Search titles, actors and directors',exact=True).fill('fixture')
    page.get_by_role('button',name='Open Fixture Film Alpha',exact=True).click()
    page.get_by_role('button',name='Add to watchlist',exact=True).click()
    expect(page.get_by_role('button',name='In your library',exact=True)).to_be_visible()
    page.get_by_role('button',name='Notes & collections',exact=True).click()
    page.get_by_label('Private notes',exact=True).fill('Account A private notes')
    page.get_by_label('Collections',exact=True).fill('Weekend')
    page.get_by_role('button',name='Save notes & collections',exact=True).click()
    expect(page.get_by_text('Saved to your Reel.',exact=True)).to_be_visible()
    page.get_by_role('button',name='Back',exact=True).click();tab('Ask Reel')
    page.get_by_label('Your request to Reel',exact=True).fill('A thoughtful drama movie under two hours')
    page.get_by_role('button',name='Send',exact=True).click()
    expect(page.get_by_text('A story for your next watch.',exact=True)).to_be_visible(timeout=30000)
    page.screenshot(path=str(OUT/'ask-fixture.png'))
    tab('You');page.get_by_role('button',name='Activity & watch history',exact=True).click()
    expect(page.get_by_role('button',name='Open Fixture Series',exact=True)).to_be_visible()
    page.get_by_role('button',name='Edit watch date',exact=True).click()
    page.get_by_label('Watch date',exact=True).fill('2026-11-05')
    page.get_by_role('button',name='Save date',exact=True).click()
    expect(page.get_by_role('button',name='Edit watch date',exact=True)).to_be_visible()
    page.get_by_role('button',name='Back',exact=True).click();page.get_by_role('button',name='Viewing insights',exact=True).click()
    expect(page.get_by_text('Episodes watched',exact=True)).to_be_visible();page.screenshot(path=str(OUT/'stats-fixture.png'))
    page.get_by_role('button',name='Back',exact=True).click();page.get_by_role('button',name='Watch calendar',exact=True).click()
    expect(page.get_by_text('Tap a day.',exact=False)).to_be_visible();page.screenshot(path=str(OUT/'calendar-fixture.png'))
    page.get_by_role('button',name='Back',exact=True).click();page.get_by_role('button',name='Matinee',exact=True).click();page.screenshot(path=str(OUT/'profile-light-fixture.png'))
    page.get_by_role('button',name='Sign out',exact=True).click();tab('Library');signin('b@fixture.test')
    expect(page.get_by_role('button',name='Open Account B private film',exact=True)).to_be_visible()
    expect(page.get_by_role('button',name='Open Fixture Series',exact=True)).to_have_count(0)
    assert 'Account A private notes' not in page.locator('body').inner_text()
    stored=page.evaluate('JSON.stringify(localStorage)')
    assert 'access_token' not in stored and 'fixture-refresh' not in stored
    tab('Ask Reel');page.set_viewport_size({'width':915,'height':412})
    expect(page.get_by_label('Your request to Reel',exact=True)).to_have_count(1)
    page.screenshot(path=str(OUT/'ask-landscape-fixture.png'))
    box=page.get_by_label('Your request to Reel',exact=True).bounding_box()
    assert box and box['y']+box['height']<=412,box
    page.set_viewport_size({'width':320,'height':640});tab('Discover')
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    page.screenshot(path=str(OUT/'discover-narrow-fixture.png'))
    page.goto('http://127.0.0.1:8092/onboarding',wait_until='networkidle')
    page.get_by_role('button',name='Meet your next watch',exact=True).scroll_into_view_if_needed()
    expect(page.get_by_role('button',name='Meet your next watch',exact=True)).to_be_visible()
    page.screenshot(path=str(OUT/'onboarding-narrow.png'))
    assert not errors,errors
    print(json.dumps({'passed':['onboarding','discover','auth','account library','episode watch','future episode guard','search details','save title','private notes/collections','Ask Reel','activity date edit','statistics','calendar','light appearance','sign-out/account isolation','no plaintext tokens'],'account_http_calls':len(calls),'page_errors':errors,'screenshots':str(OUT)},ensure_ascii=False))
    browser.close()
if __name__=='__main__':run()
