"""Isolated rendered search/artwork regressions. Not a native hardware Back test."""
import io,json,re,time
from pathlib import Path
from urllib.parse import urlparse,unquote
from PIL import Image
from playwright.sync_api import sync_playwright,expect
from test_preview import fulfill,backend,SHOW

OUT=Path(__file__).resolve().parents[1]/'artifacts'
poster=io.BytesIO();Image.new('RGB',(160,240),'#ff654f').save(poster,format='PNG')

def run():
  with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':412,'height':915})
    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.route('**/*.supabase.co/**',backend)
    # The primary movie catalog fails while the independent IMDb index works.
    page.route('**/v3-cinemeta.strem.io/**',lambda route:fulfill(route,{},503))
    page.route('**/www.wikidata.org/**',lambda route:fulfill(route,{'search':[]}))
    # Keep an unrelated catalog outstanding. Films must render before it ends.
    pending_anime=[];defer_anime=[True]
    page.route('**/kitsu.io/**',lambda route:pending_anime.append(route) if defer_anime[0] else fulfill(route,{'data':[]}))
    def index(route):
      name='Office Space' if 'Office' in unquote(route.request.url) else 'No Hard Feelings'
      pid='tt0151804' if name=='Office Space' else 'tt15671028'
      # First film has a failing primary image and a valid ID-derived fallback.
      data={'id':pid,'l':name,'qid':'movie','y':1999 if name=='Office Space' else 2023,'rank':1000}
      if name=='No Hard Feelings':data['i']={'imageUrl':'https://posters.fixture.test/broken.png'}
      fulfill(route,{'d':[data]})
    page.route('**/v3.sg.media-imdb.com/**',index)
    page.route('**/posters.fixture.test/**',lambda route:route.fulfill(status=404))
    page.route('**/images.metahub.space/**',lambda route:route.fulfill(content_type='image/png',body=poster.getvalue()))
    def television(route):
      path=urlparse(route.request.url).path
      if path=='/search/people':return fulfill(route,[])
      if path=='/search/shows':return fulfill(route,[])
      return fulfill(route,[] if path.endswith('/images') else [SHOW])
    page.route('**/api.tvmaze.com/**',television)
    page.goto('http://127.0.0.1:8092',wait_until='domcontentloaded')
    page.get_by_role('button',name='Skip',exact=True).click()
    page.get_by_role('tab',name=re.compile('Search')).click()
    started=time.monotonic()
    page.get_by_label('Search titles, actors and directors',exact=True).fill('No Hard Feelings')
    target=page.get_by_role('button',name='Open No Hard Feelings',exact=True)
    expect(target).to_be_visible(timeout=7000)
    elapsed=round(time.monotonic()-started,2)
    assert pending_anime,'Test did not keep an unrelated catalog pending'
    film_image=target.locator('img')
    expect(film_image).to_have_attribute('src',re.compile('metahub.*tt15671028'),timeout=7000)
    expect(film_image).to_have_js_property('naturalWidth',160)
    assert target.inner_text().count('No Hard Feelings')==1,'Text poster fallback duplicated the title'
    page.screenshot(path=str(OUT/'search-recovery-fixture.png'))
    defer_anime[0]=False
    for pending in pending_anime:fulfill(pending,{'data':[]})
    target.click()
    page.get_by_role('button',name='Back',exact=True).click()
    expect(target).to_be_visible()
    target.click();expect(page).to_have_url(re.compile('/title/'))
    expect(page.get_by_role('button',name='Back',exact=True)).to_be_visible()
    page.go_back();expect(target).to_be_visible()
    # A second, unrelated movie with missing metadata artwork also resolves.
    page.get_by_label('Search titles, actors and directors',exact=True).fill('Office Space')
    other=page.get_by_role('button',name='Open Office Space',exact=True)
    expect(other).to_be_visible(timeout=7000)
    expect(other.locator('img')).to_have_attribute('src',re.compile('metahub.*tt0151804'))
    expect(other.locator('img')).to_have_js_property('naturalWidth',160)
    # Leaving the screen and returning must not retain the old poster/error.
    page.get_by_role('tab',name=re.compile('Library')).click()
    page.get_by_role('tab',name=re.compile('Search')).click()
    expect(other).to_be_visible()
    assert not errors,errors
    print(json.dumps({'passed':['primary movie source outage','progressive results with anime pending','No Hard Feelings 2023','broken poster recovery','missing poster recovery for another film','visible Back','browser history Back','tab state preservation'],'movie_visible_seconds':elapsed,'page_errors':errors}))
    browser.close()

if __name__=='__main__':run()
