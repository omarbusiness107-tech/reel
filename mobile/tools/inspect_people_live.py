"""Read-only live movie → cast → actor profile → Back check. No account writes.
The browser-only harness bridges live IMDb responses because that native catalog
does not send browser CORS headers. No catalog responses are fabricated."""
import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
OUT=Path(__file__).resolve().parents[1]/'artifacts'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':412,'height':915},reduced_motion='reduce')
    def native_catalog_bridge(route):
        response=page.request.get(route.request.url,timeout=25000)
        route.fulfill(status=response.status,body=response.body(),content_type='application/json',headers={'Access-Control-Allow-Origin':'*'})
    page.route('**/v3.sg.media-imdb.com/**',native_catalog_bridge)
    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto('http://127.0.0.1:8092',wait_until='networkidle')
    page.get_by_role('button',name='Skip',exact=True).click()
    page.get_by_role('tab',name=re.compile('Search')).click()
    page.get_by_label('Search titles, actors and directors',exact=True).fill('No Hard Feelings')
    page.get_by_role('button',name='Open No Hard Feelings',exact=True).first.click()
    expect(page).to_have_url(re.compile('/title/'))
    rail=page.get_by_label('Cast and creators, swipe horizontally',exact=True)
    rail.scroll_into_view_if_needed(timeout=30000)
    portrait=page.get_by_role('img',name='Portrait of Jennifer Lawrence',exact=True)
    expect(portrait).to_be_visible(timeout=30000)
    page.wait_for_function('()=>[...document.querySelectorAll("img")].some(img=>img.alt==="Portrait of Jennifer Lawrence"&&img.complete&&img.naturalWidth>20)')
    page.screenshot(path=str(OUT/'cast-no-hard-feelings-live.png'))
    page.get_by_role('button',name='About Jennifer Lawrence',exact=True).click()
    expect(page).to_have_url(re.compile('/person/imdb'))
    expect(page.get_by_text('1990-08-15',exact=True)).to_be_visible(timeout=30000)
    expect(page.get_by_text('Finding available credits…',exact=True)).not_to_be_visible(timeout=45000)
    assert 'Page could not be found' not in page.locator('body').inner_text()
    route=page.url
    page.screenshot(path=str(OUT/'jennifer-lawrence-profile-live.png'))
    page.get_by_role('button',name='Back',exact=True).click()
    expect(page).to_have_url(re.compile('/title/'))
    expect(page.get_by_role('button',name='About Jennifer Lawrence',exact=True)).to_be_visible()
    assert not errors,errors
    print(json.dumps({'live_actor':'Jennifer Lawrence','route':route,'birthday':'1990-08-15','portrait_loaded':True,'imdb_transport':'live HTTP bridge for browser-only CORS','back_to_title':True,'page_errors':errors}))
    browser.close()
