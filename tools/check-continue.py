"""Isolated Continue shelf/dialog regression checks. Add --capture for visual review."""
from pathlib import Path
import os
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
CAPTURE = "--capture" in sys.argv
ICONS = Path(os.environ["REEL_TEST_LUCIDE"]).read_text(encoding="utf-8") if os.environ.get("REEL_TEST_LUCIDE") else None


def order(page, host="#rail"):
    return page.locator(f"{host} > [data-continue-id]").evaluate_all("rows=>rows.map(row=>row.dataset.continueId)")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    try:
        for width in tuple(map(int, os.environ.get("REEL_TEST_WIDTHS", "320,375,768,1440").split(","))):
            context = browser.new_context(viewport={"width": width, "height": 900}, has_touch=True)
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))

            def route_request(route):
                url = route.request.url
                if "cdn.jsdelivr.net/npm/lucide@" in url and ICONS:
                    route.fulfill(content_type="application/javascript", body=ICONS)
                elif url.startswith("file:") or "cdn.jsdelivr.net/npm/lucide@" in url:
                    route.continue_()
                elif "cdn.jsdelivr.net/npm/@supabase/" in url:
                    route.fulfill(content_type="application/javascript", body="window.supabase={createClient(){return {auth:{getSession:async()=>({data:{session:null},error:null}),onAuthStateChange:()=>({data:{subscription:{}}})}}}};")
                else:
                    route.abort()

            page.route("**/*", route_request)
            page.goto((ROOT / "reel.html").as_uri(), wait_until="networkidle")
            page.wait_for_function("()=>!cloud.loading")
            page.evaluate("""()=>{
              state.items=[];state.events=[];state.ui.continueOrder=[];
              const titles=[['Harry Potter and the Philosopher’s Stone','movie','assets/posters/harry-potter/01-philosophers-stone.jpg'],['Harry Potter and the Chamber of Secrets','movie','assets/posters/harry-potter/02-chamber-of-secrets.jpg'],['إيكادولي','book','assets/covers/mamlakat-al-balagha/01-ikadoli.jpg'],['أوبال','book','assets/covers/mamlakat-al-balagha/02-opal.jpg'],['Harry Potter and the Prisoner of Azkaban','movie','assets/posters/harry-potter/03-prisoner-of-azkaban.jpg'],['Harry Potter and the Goblet of Fire','movie','assets/posters/harry-potter/04-goblet-of-fire.jpg']];
              titles.forEach(([title,type,cover],index)=>{const item=makeItem(title,type,'going');Object.assign(item,{id:'continue-'+index,cover,updated:100-index,year:2001+index,metaTried:true,castTried:true,castHydrated:true,pages:type==='book'?300:null,page:type==='book'?50:0,stoppedAtSec:type==='movie'?920:0,runtime:type==='movie'?152:null,genres:type==='book'?['Fantasy']:['Adventure','Fantasy'],notes:index===2?'A new journey through the kingdom.':''});state.items.push(item);});
              Object.assign(state.items[1],{title:'The Mentalist',type:'series',cover:'',year:2008,runtime:43,stoppedAtSec:0,season:2,episode:2,seasonGuide:[{number:1,episodes:[1,2,3]},{number:2,episodes:[1,2,3,4]}],watchedEpisodes:['1:1','1:2','1:3','2:1','2:2'],genres:['Crime','Drama']});
              render();
            }""")
            assert len(order(page)) == 6
            assert page.locator('#rail [data-continue-id="continue-1"] .at').inner_text() == 'S2 · E2'
            assert page.locator('#rail [data-continue-id="continue-1"] .continue-total').text_content() == '5/ 7 episodes'
            assert page.locator('#rail [data-continue-id="continue-1"] .at').evaluate("node=>parseFloat(getComputedStyle(node).fontSize)>parseFloat(getComputedStyle(node.parentElement.querySelector('.continue-total')).fontSize)")
            assert not page.locator('#rail .acts [data-act="open"],#rail .acts [data-continue-action="open"]').count()
            assert page.locator('#rail .resume').evaluate_all("nodes=>nodes.every(node=>node.getBoundingClientRect().height<175)"), page.locator('#rail .resume').evaluate_all("nodes=>nodes.map(node=>({title:node.querySelector('h4').innerText,height:node.getBoundingClientRect().height,body:node.querySelector('.body').getBoundingClientRect().height,header:node.querySelector('h4').getBoundingClientRect().height,position:node.querySelector('.continue-position').getBoundingClientRect().height,actions:node.querySelector('.acts').getBoundingClientRect().height}))")
            if CAPTURE and width in (375, 1440):
                for theme in ('dark','light'):
                    page.evaluate("theme=>{state.ui.theme=theme;document.documentElement.dataset.theme=theme;}",theme)
                    page.wait_for_timeout(220)
                    page.locator('.shelf').screenshot(path=str(ROOT / f'.impeccable/review/continue-shelf-{width}-{theme}.png'))
                page.evaluate("()=>{state.ui.theme='dark';document.documentElement.dataset.theme='dark';}")
            # Keyboard reorder, no item/progress mutation, and persistence through reload.
            original = page.evaluate("JSON.stringify(state.items)")
            handle = page.locator('#rail [data-continue-id="continue-0"] [data-continue-handle]')
            handle.focus()
            handle.press("ArrowRight")
            assert order(page)[:2] == ["continue-1", "continue-0"]
            if width == 1440:
                first = page.locator('#rail [data-continue-id="continue-1"] [data-continue-handle]')
                second = page.locator('#rail [data-continue-id="continue-0"]')
                a, b = first.bounding_box(), second.bounding_box()
                page.mouse.move(a["x"]+a["width"]/2, a["y"]+a["height"]/2)
                page.mouse.down()
                page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2, steps=12)
                page.wait_for_timeout(100)
                page.mouse.up()
                assert order(page)[:2] == ["continue-0", "continue-1"], {"order": order(page), "from": a, "to": b, "ghost": page.locator('.continue-ghost').count(), "errors": errors}
                page.locator('#rail [data-continue-id="continue-0"] [data-continue-handle]').press("ArrowRight")
                assert order(page)[:2] == ["continue-1", "continue-0"]
                page.wait_for_timeout(360)
            assert page.evaluate("document.activeElement.closest('[data-continue-id]')?.dataset.continueId") == "continue-0"
            assert page.evaluate("JSON.stringify(state.items)") == original
            page.wait_for_timeout(350)
            page.reload(wait_until="networkidle")
            page.wait_for_function("()=>!cloud.loading")
            assert order(page)[:2] == ["continue-1", "continue-0"]
            # Opening the native dialog does not jump the page; it shows all items.
            page.locator("#continueViewAll").click()
            page.wait_for_timeout(300)
            dialog = page.locator("#continueDialog")
            assert dialog.evaluate("node=>node.open&&node.matches(':modal')")
            if ICONS:
                assert dialog.locator('[data-continue-handle] svg').count() == 6
                assert dialog.locator('[data-continue-close] svg').count() == 1
            assert len(order(page, "#continueList")) == 6
            if width <= 700:
                assert dialog.locator('button').evaluate_all("nodes=>nodes.every(node=>node.getBoundingClientRect().height>=44)"), "Mobile buttons must have 44px touch targets"
                assert dialog.locator('[data-continue-handle],[data-continue-move]').evaluate_all("nodes=>nodes.every(node=>node.getBoundingClientRect().width>=44)")
            assert page.locator('#continueList [data-continue-id="continue-2"] .at').inner_text() == "Page 50"
            assert page.locator('#continueList [data-continue-id="continue-1"] .continue-total').text_content() == '5/ 7 episodes'
            assert not page.locator('#continueList .acts [data-continue-action="open"]').count()
            assert 'watched' not in page.locator('#continueList').inner_text().lower()
            if width == 1440:
                assert dialog.bounding_box()['width'] >= 1300, "View all must use the available desktop width"
            assert not page.evaluate("document.querySelector('#continueDialog').scrollWidth>document.querySelector('#continueDialog').clientWidth")
            # Native focus containment and explicit move buttons.
            last = dialog.locator('button:not([disabled]),input').last
            last.focus()
            page.keyboard.press("Tab")
            assert dialog.evaluate("node=>node.contains(document.activeElement)")
            page.locator('#continueList [data-continue-id="continue-1"] [data-continue-move="1"]').click()
            assert order(page, "#continueList")[0] == "continue-0"
            # Actual pointer drag, not just calling the sorting function.
            first = page.locator('#continueList [data-continue-id="continue-0"] [data-continue-handle]')
            second = page.locator('#continueList [data-continue-id="continue-1"]')
            first.scroll_into_view_if_needed()
            a, b = first.bounding_box(), second.bounding_box()
            page.mouse.move(a["x"]+a["width"]/2, a["y"]+a["height"]/2)
            page.mouse.down()
            page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2, steps=12)
            page.wait_for_timeout(150)
            page.mouse.up()
            assert order(page, "#continueList")[:2] == ["continue-1", "continue-0"]
            assert order(page)[:2] == ["continue-1", "continue-0"]
            assert not page.locator(".continue-ghost").count()
            before_cancel = order(page, "#continueList")
            first = page.locator('#continueList [data-continue-id="continue-1"] [data-continue-handle]')
            second = page.locator('#continueList [data-continue-id="continue-0"]')
            first.scroll_into_view_if_needed()
            a, b = first.bounding_box(), second.bounding_box()
            page.mouse.move(a["x"]+a["width"]/2, a["y"]+a["height"]/2)
            page.mouse.down()
            page.mouse.move(b["x"]+b["width"]/2, b["y"]+b["height"]/2, steps=12)
            page.keyboard.press("Escape")
            page.mouse.up()
            assert dialog.evaluate("node=>node.open"), "Escape cancels the drag before closing the dialog"
            assert order(page, "#continueList") == before_cancel
            assert not page.locator(".continue-ghost").count()
            # Touch dragging uses real browser Pointer Events and preserves ordinary scrolling elsewhere.
            if width == 375:
                first = page.locator('#continueList [data-continue-id="continue-1"] [data-continue-handle]')
                second = page.locator('#continueList [data-continue-id="continue-0"]')
                first.scroll_into_view_if_needed()
                a, b = first.bounding_box(), second.bounding_box()
                session = context.new_cdp_session(page)
                x, y = a["x"]+a["width"]/2, a["y"]+a["height"]/2
                session.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
                for step in range(1, 11):
                    session.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x+(b["x"]+b["width"]/2-x)*step/10, "y": y+(b["y"]+b["height"]/2-y)*step/10}]})
                page.wait_for_timeout(100)
                session.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []})
                assert order(page, "#continueList")[:2] == ["continue-0", "continue-1"]
                assert page.locator('#continueList [data-continue-handle]').first.evaluate("node=>getComputedStyle(node).touchAction") == "none"
            # Search, empty results, clear, both themes and reduced motion.
            page.locator("#continueSearch").fill("إيكادولي")
            assert len(order(page, "#continueList")) == 1
            page.locator("#continueSearch").fill("no such title")
            assert page.locator("#continueList [role=status]").is_visible()
            page.locator("#continueSearch").fill("")
            for theme in ("dark", "light"):
                page.evaluate("theme=>{state.ui.theme=theme;document.documentElement.dataset.theme=theme;}", theme)
                page.wait_for_timeout(220)
                assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
                assert dialog.evaluate("node=>{const r=node.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}")
                if CAPTURE and width in (375, 1440):
                    page.screenshot(path=str(ROOT / f".impeccable/review/continue-{width}-{theme}.png"))
            if width == 375:
                for language in ("fr", "ar", "en"):
                    page.evaluate("language=>{state.ui.language=language;render();}", language)
                    assert dialog.evaluate("node=>node.scrollWidth<=node.clientWidth")
                    assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
            page.emulate_media(reduced_motion="reduce")
            assert dialog.evaluate("node=>getComputedStyle(node).transitionDuration") == "0s"
            # Escape, focus restoration, detailed view, and bump history remain functional.
            page.keyboard.press("Escape")
            assert not dialog.evaluate("node=>node.open")
            assert page.locator("#continueViewAll").evaluate("node=>node===document.activeElement")
            page.wait_for_timeout(360)
            page.locator("#continueViewAll").click()
            page.locator('#continueList [data-continue-id="continue-2"] [data-continue-action="bump"]').click()
            page.wait_for_function("()=>state.items.find(item=>item.id==='continue-2').page===60")
            assert page.evaluate("state.events.some(event=>event.titleId==='continue-2')")
            page.wait_for_timeout(360)
            page.locator('#continueList [data-continue-id="continue-2"] .continue-title').click()
            assert not dialog.evaluate("node=>node.open")
            assert page.locator("#drawer").get_attribute("aria-hidden") == "false"
            assert page.locator('#drawer [data-f="page"]').input_value() == "60"
            page.evaluate("closeSheets()")
            page.locator("#continueViewAll").click()
            page.locator('#continueList [data-continue-id="continue-0"] [data-continue-action="done"]').click()
            page.wait_for_function("()=>state.items.find(item=>item.id==='continue-0').status==='done'")
            assert page.evaluate("state.events.some(event=>event.titleId==='continue-0'&&event.mediaType==='movie')")
            assert len(order(page, "#continueList")) == 5
            page.keyboard.press("Escape")
            # Empty shelf and account transition cannot leak another account's popup/order.
            page.locator("#continueViewAll").click()
            page.evaluate("()=>{state.items=[];state.ui.continueOrder=[];cloud.user={id:'another-account'};render();}")
            assert not dialog.evaluate("node=>node.open")
            assert page.locator("#continueViewAll").is_hidden()
            assert not order(page)
            assert not errors, errors
            context.close()
            print(f"PASS: Continue reorder, persistence, dialog, touch/keyboard, details and progress at {width}px")
    finally:
        browser.close()
