"""Rendered RN web contracts with a synthetic account and real public catalog imagery.
Screenshots are layout evidence, not Android device/performance verification.
"""
import concurrent.futures,json,re,urllib.request
from urllib.parse import urlparse,unquote,parse_qs
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import test_preview as qa

OUT=qa.OUT
def fetch_json(url):
    with urllib.request.urlopen(url,timeout=25) as response:return json.load(response)
cache_file=OUT/'detail-library-public-data.json'
if cache_file.exists():data=json.loads(cache_file.read_text(encoding='utf-8'))
else:
    ids=['tt15671028','tt15239678','tt0151804','tt0816692','tt2543164']
    movies=list(concurrent.futures.ThreadPoolExecutor(max_workers=3).map(lambda pid:fetch_json('https://v3-cinemeta.strem.io/meta/movie/'+pid+'.json')['meta'],ids))
    show=fetch_json('https://api.tvmaze.com/search/shows?q=Sherlock')[0]['show']
    cast=fetch_json(f"https://api.tvmaze.com/shows/{show['id']}/cast")
    actors={name:fetch_json('https://v3.sg.media-imdb.com/suggestion/x/'+urllib.parse.quote(name)+'.json') for name in movies[0]['cast']}
    jennifer=fetch_json('https://api.tvmaze.com/search/people?q=Jennifer%20Lawrence')
    data={'movies':movies,'show':show,'cast':cast,'actors':actors,'jennifer':jennifer}
    cache_file.write_text(json.dumps(data),encoding='utf-8')

if len(data['cast'])<4:
    data['show']=next(row['show'] for row in fetch_json('https://api.tvmaze.com/search/shows?q=Game%20of%20Thrones') if row['show']['name']=='Game of Thrones')
    data['cast']=fetch_json(f"https://api.tvmaze.com/shows/{data['show']['id']}/cast")
    cache_file.write_text(json.dumps(data),encoding='utf-8')
movies=data['movies'];show=data['show'];cast=data['cast'];people={str(row['person']['id']):row['person'] for row in cast}
if 'jenniferCredits' not in data:
    data['jenniferCredits']=fetch_json('https://api.tvmaze.com/people/58451/castcredits?embed=show')
    cache_file.write_text(json.dumps(data),encoding='utf-8')
for row in data['jennifer']:people[str(row['person']['id'])]=row['person']
qa.db[qa.A]=[]
for index,meta in enumerate(movies):
    title=qa.title_record('imdb',meta.get('imdb_id',meta['id']),meta['name'],'movie')
    title.update(poster_url=meta.get('poster'),release_year=int(meta['year']),description=meta.get('description'),genres=meta.get('genres',[]))
    entry=qa.member(title,qa.A);entry.update(status='done' if index==1 else 'want',favorite=index in [0,3],rating=8 if index==1 else 0,tags=['Weekend'] if index%2==0 else [])
    qa.db[qa.A].append(entry)
title=qa.title_record('tvmaze',str(show['id']),show['name'],'series');title.update(poster_url=show['image']['medium'],release_year=int(show['premiered'][:4]));title['metadata']['tvmaze']=show['id']
entry=qa.member(title,qa.A);entry.update(status='going',current_episode=3);qa.db[qa.A].append(entry)

def catalogs(route):
    url=route.request.url;path=unquote(urlparse(url).path);query=parse_qs(urlparse(url).query)
    if 'wikidata.org' in url:return qa.fulfill(route,{},503)
    if 'kitsu.io' in url:return qa.fulfill(route,{'data':[]})
    if 'media-imdb.com' in url:
        name=path.rsplit('/',1)[-1].removesuffix('.json')
        return qa.fulfill(route,data['actors'].get(name,{'d':[]}))
    if 'v3-cinemeta' in url:
        if '/meta/' in path:
            meta=next((movie for movie in movies if movie.get('imdb_id',movie['id'])+'.json' in path),movies[0]);return qa.fulfill(route,{'meta':meta})
        return qa.fulfill(route,{'metas':movies})
    if path=='/search/people':return qa.fulfill(route,data['jennifer'] if query.get('q',[''])[0]=='Jennifer Lawrence' else [])
    if path=='/search/shows':return qa.fulfill(route,[{'show':show}])
    if path.endswith('/cast'):return qa.fulfill(route,cast)
    if path.endswith(('/crew','/images','/episodes')):return qa.fulfill(route,[])
    if '/castcredits' in path:return qa.fulfill(route,data['jenniferCredits'] if '/people/58451/' in path else [{'_embedded':{'show':show}}])
    if '/crewcredits' in path:return qa.fulfill(route,[])
    if path.startswith('/people/'):return qa.fulfill(route,people.get(path.split('/')[2],{'id':1,'name':'Unknown person'}))
    if path.startswith('/shows/'):return qa.fulfill(route,show)
    return qa.fulfill(route,[show])

def run():
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    results=[]
    for width,height,theme in [(412,915,'dark'),(320,720,'dark'),(412,915,'light'),(915,412,'dark')]:
      page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
      errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
      page.add_init_script('localStorage.setItem("reel.mobile.preferences.v1",'+json.dumps(json.dumps({'onboarded':True,'appearance':theme,'haptics':False,'useRatings':False}))+')')
      page.route('**/*.supabase.co/**',qa.backend)
      for host in ['v3-cinemeta.strem.io','api.tvmaze.com','v3.sg.media-imdb.com','kitsu.io','www.wikidata.org','query.wikidata.org']:page.route('**/'+host+'/**',catalogs)
      page.goto('http://127.0.0.1:8092',wait_until='networkidle')
      page.get_by_role('tab',name=re.compile('Library')).click()
      page.get_by_role('button',name='Sign in',exact=True).click()
      page.get_by_label('Email address',exact=True).fill('a@fixture.test');page.get_by_label('Password',exact=True).fill('isolated-fixture-password');page.get_by_role('button',name='Sign in',exact=True).click()
      first=page.get_by_role('button',name='Open No Hard Feelings',exact=True)
      expect(first).to_be_visible();expect(first.locator('img')).to_be_visible()
      page.wait_for_function('()=>[...document.querySelectorAll("img")].filter(img=>{const r=img.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}).every(img=>img.complete&&img.naturalWidth>0)')
      assert first.locator('img').bounding_box()['width']>125
      if height<600:first.scroll_into_view_if_needed()
      page.screenshot(path=str(OUT/f'library-{width}-{theme}-fixture.png'))
      first.click();expect(page).to_have_url(re.compile('/title/'))
      expect(page.get_by_role('button',name='Back',exact=True)).to_be_visible()
      expect(page.get_by_role('img',name='No Hard Feelings artwork',exact=True)).to_have_count(0)
      try:expect(page.get_by_role('img',name='Poster for No Hard Feelings',exact=True)).to_have_count(1)
      except Exception:
        page.screenshot(path=str(OUT/'detail-failure.png'));print(page.locator('body').inner_text()[:2500]);print(errors);raise
      page.screenshot(path=str(OUT/f'detail-{width}-{theme}-fixture.png'))
      rail=page.get_by_label('Cast and creators, swipe horizontally',exact=True)
      rail.scroll_into_view_if_needed()
      expect(page.get_by_role('img',name='Portrait of Jennifer Lawrence',exact=True)).to_be_visible(timeout=15000)
      page.wait_for_function('()=>[...document.querySelectorAll("img")].some(img=>(img.getAttribute("aria-label")==="Portrait of Jennifer Lawrence"||img.alt==="Portrait of Jennifer Lawrence")&&img.complete&&img.naturalWidth>20)')
      expect(page.get_by_role('button',name='About Andrew Barth Feldman',exact=True)).to_be_visible()
      page.screenshot(path=str(OUT/f'cast-{width}-{theme}-fixture.png'))
      if width==412:
        page.get_by_role('button',name='About Jennifer Lawrence',exact=True).click()
        expect(page).to_have_url(re.compile('/person/imdb'))
        expect(page.get_by_text('1990-08-15',exact=True)).to_be_visible()
        expect(page.get_by_text('Finding available credits...',exact=True)).not_to_be_visible(timeout=15000)
        page.wait_for_function('()=>[...document.querySelectorAll("img")].filter(img=>{const r=img.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0}).every(img=>img.complete&&img.naturalWidth>0)')
        assert "Page could not be found" not in page.locator('body').inner_text()
        page.screenshot(path=str(OUT/f'actor-profile-{theme}-fixture.png'))
        page.get_by_role('button',name='Back',exact=True).click()
        expect(page).to_have_url(re.compile('/title/'))
      page.get_by_role('button',name='Back',exact=True).click()
      expect(first).to_be_visible()
      if width==412:
        page.get_by_role('button',name='Favorites',exact=True).click();expect(page.get_by_role('button',name='Open Dune: Part Two',exact=True)).to_have_count(0)
        page.get_by_role('button',name='All',exact=True).click()
        page.get_by_label('Filter your library',exact=True).fill('Office');expect(page.get_by_role('button',name='Open Office Space',exact=True)).to_be_visible();expect(first).to_have_count(0)
        page.get_by_label('Filter your library',exact=True).fill('')
        page.get_by_role('button',name='Open '+show['name'],exact=True).click()
        expect(page).to_have_url(re.compile('/title/(tvmaze%3A|tvmaze:)'))
        tvrail=page.get_by_label('Cast and creators, swipe horizontally',exact=True);tvrail.scroll_into_view_if_needed()
        page.screenshot(path=str(OUT/'cast-tv-horizontal-fixture.png'))
        scroll=tvrail.evaluate_handle('(el)=>[el,...el.querySelectorAll("div")].find(node=>node.scrollWidth>node.clientWidth&&/auto|scroll/.test(getComputedStyle(node).overflowX))')
        assert scroll.as_element(),'No horizontally scrollable cast rail'
        scroll.evaluate('(el)=>el.scrollLeft=250')
        assert scroll.evaluate('(el)=>el.scrollLeft')>0
        page.screenshot(path=str(OUT/'cast-tv-horizontal-fixture.png'))
      assert not errors,errors
      assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth')
      results.append({'viewport':[width,height],'theme':theme,'page_errors':errors})
      page.close()
    # A failed profile must not leave its disabled credits query loading forever.
    page=browser.new_page(viewport={'width':412,'height':915})
    page.add_init_script('localStorage.setItem("reel.mobile.preferences.v1",'+json.dumps(json.dumps({'onboarded':True,'appearance':'dark'}))+')')
    page.route('**/www.wikidata.org/**',lambda route:qa.fulfill(route,{},503))
    page.goto('http://127.0.0.1:8092/person/wikidata%3AQ999999999?name=Known%20actor',wait_until='networkidle')
    expect(page.get_by_text('Catalog request failed (503). Try again shortly.',exact=True)).to_be_visible(timeout=15000)
    expect(page.get_by_text('Known actor',exact=True)).to_be_visible()
    expect(page.get_by_text('Finding available credits...',exact=True)).not_to_be_visible()
    expect(page.get_by_text('This provider has no available credits for this person right now. Their profile remains available above.',exact=True)).to_be_visible()
    page.close()
    browser.close()
    print(json.dumps({'passed':['large library posters','responsive poster grid','single detail poster','horizontal circle cast','full actor names','movie actor profile','profile survives filmography outage','Back to detail/library','favorite/search filters','horizontal TV cast scroll','failed profile stops credits loading'],'captures':results}))
if __name__=='__main__':run()
