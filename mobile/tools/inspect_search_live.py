"""Read-only live public movie search and poster inspection. No account writes."""
import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect

OUT=Path(__file__).resolve().parents[1]/'artifacts'
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':412,'height':915})
    errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    page.goto('http://127.0.0.1:8092',wait_until='networkidle')
    page.get_by_role('button',name='Skip',exact=True).click()
    page.get_by_role('tab',name=re.compile('Search')).click()
    field=page.get_by_label('Search titles, actors and directors',exact=True)
    results=[]
    for query in ['No Hard Feelings','Office Space','Dune: Part Two']:
        field.fill(query)
        row=page.get_by_role('button',name='Open '+query,exact=True).first
        expect(row).to_be_visible(timeout=30000)
        image=row.locator('img')
        expect(image).to_be_visible(timeout=15000)
        page.wait_for_function('(name)=>{const row=[...document.querySelectorAll("[role=button]")].find(e=>e.getAttribute("aria-label")===name);const img=row?.querySelector("img");return img?.complete&&img.naturalWidth>20}',arg='Open '+query)
        results.append({'query':query,'row':row.inner_text(),'poster':image.get_attribute('src')})
        if query=='No Hard Feelings':
            page.screenshot(path=str(OUT/'search-no-hard-feelings-live.png'))
            row.click();expect(page.get_by_role('button',name='Back',exact=True)).to_be_visible()
            page.get_by_role('button',name='Back',exact=True).click();expect(field).to_have_value(query)
            row.click();expect(page).to_have_url(re.compile('/title/'))
            expect(page.get_by_role('button',name='Back',exact=True)).to_be_visible()
            page.go_back();expect(field).to_have_value(query)
    assert not errors,errors
    print(json.dumps({'live_results':results,'page_errors':errors,'back_checks':['visible control','browser history']},ensure_ascii=False))
    browser.close()
