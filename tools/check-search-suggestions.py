"""Isolated provider fixtures for search scope, ranking, identity and responsive UI."""
from pathlib import Path
from urllib.parse import urlparse, parse_qs
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
CAPTURE = "--capture" in sys.argv


def anime_rows():
    return [{"id": str(id_), "attributes": {"canonicalTitle": title, "titles": {"en": english},
        "startDate": f"{year}-01-01", "subtype": subtype, "popularityRank": rank, "userCount": users,
        "averageRating": "85", "posterImage": {"large": "https://example.com/poster.jpg"}, "synopsis": ""}}
        for id_, title, english, year, subtype, rank, users in [
            (1, "Jujutsu Kaisen", "Jujutsu Kaisen", 2020, "TV", 10, 1000000),
            (2, "Jujutsu Kaisen 0", "Jujutsu Kaisen 0", 2021, "movie", 30, 500000),
            (3, "Jujutsu Kaisen 2nd Season", "Jujutsu Kaisen Second Season", 2023, "TV", 20, 700000),
            (4, "Naruto: Shippuuden", "Naruto Shippuden", 2007, "TV", 15, 900000)]]


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    try:
        for width in (375, 768, 1440):
            context = browser.new_context(viewport={"width": width, "height": 900})
            page = context.new_page()
            errors, requests, held = [], [], []
            flags = {"hold": False, "offline": False}
            page.on("pageerror", lambda error: errors.append(str(error)))

            def route_request(route):
                url = route.request.url
                if url.startswith("file:"):
                    route.continue_()
                    return
                if "cdn.jsdelivr.net/npm/@supabase/" in url:
                    route.fulfill(content_type="application/javascript", body="""
                      window.supabase={createClient(){return {auth:{
                        getSession:async()=>({data:{session:null},error:null}),
                        onAuthStateChange:()=>({data:{subscription:{}}})
                      }}}};
                    """)
                    return
                if "cdn.jsdelivr.net/npm/lucide/" in url:
                    route.fulfill(content_type="application/javascript", body="window.lucide={createIcons(){}}")
                    return
                if any(domain in url for domain in ("kitsu.io", "tvmaze.com", "openlibrary.org", "wikipedia.org/w/api", "wikidata.org/w/api")):
                    requests.append(url)
                    if flags["offline"]:
                        route.fulfill(status=503, json={"error": "Fixture offline"})
                        return
                if "/api/edge/anime?" in url:
                    if flags["hold"]:
                        held.append(route)
                        return
                    route.fulfill(json={"data": anime_rows()})
                elif "/api/edge/" in url:
                    route.fulfill(json={"data": []})
                elif "api.tvmaze.com/search/shows" in url:
                    route.fulfill(json=[{"score": 20, "show": {"id": id_, "name": title, "type": "Animation", "language": "Japanese", "genres": ["Anime"], "premiered": f"{year}-01-01", "weight": 80, "image": {"original": "https://example.com/poster.jpg"}}}
                        for id_, title, year in [(48450, "Jujutsu Kaisen", 2020), (488, "Naruto: Shippūden", 2007)]])
                elif "api.tvmaze.com/" in url:
                    route.fulfill(json=[])
                elif "openlibrary.org/search.json" in url:
                    route.fulfill(json={"docs": []})
                elif "wikipedia.org/w/api.php" in url:
                    params = parse_qs(urlparse(url).query)
                    hits = [{"title": "Jujutsu Kaisen 0 (film)", "wordcount": 10000}] if "film" in params.get("srsearch", [""])[0] else []
                    route.fulfill(json={"query": {"search": hits}})
                elif "wikipedia.org/api/rest_v1/page/summary" in url:
                    route.fulfill(json={"title": "Jujutsu Kaisen 0 (film)", "description": "2021 Japanese animated film", "extract": "Jujutsu Kaisen 0 is a Japanese animated film.", "thumbnail": {"source": "https://example.com/poster.jpg"}, "wikibase_item": "Q2"})
                elif "wikidata.org/w/api.php" in url:
                    route.fulfill(json={"search": [], "entities": {}})
                else:
                    route.abort()

            page.route("**/*", route_request)
            page.goto((ROOT / "reel.html").as_uri(), wait_until="networkidle")
            page.wait_for_function("()=>!cloud.loading")
            page.evaluate("""()=>{
              state.items=[];state.events=[];state.ui.searchScope='library';catalog.results=[];catalog.people=[];
              const secret=makeItem('Library Secret','movie');secret.castTried=true;state.items.push(secret);
              const saved=makeItem('Jujutsu Kaisen','anime','going');Object.assign(saved,{year:2020,tvmaze:48450,catalogId:'tvmaze:48450',castTried:true,notes:'Keep this',episode:7});state.items.push(saved);
              render();
            }""")
            before = len(requests)
            page.locator("#q").fill("Library Secret")
            page.wait_for_timeout(250)
            assert len(requests) == before, "Library search must not call public search providers"
            assert page.locator('#searchSuggestions [data-kind="title"] b').all_text_contents() == ["Library Secret"]
            page.locator("#q").fill("jujutsu kaisen")
            page.locator('[data-search-scope="online"]').click()
            page.wait_for_function("()=>catalog.query==='jujutsu kaisen'&&!catalog.loading")
            assert page.locator("#q").input_value() == "jujutsu kaisen"
            assert page.locator('[data-search-scope="online"]').get_attribute("aria-pressed") == "true"
            before_repeat = len(requests)
            page.locator('[data-search-scope="online"]').click()
            page.wait_for_timeout(100)
            assert len(requests) == before_repeat, "Clicking the selected source must not restart search"
            assert page.locator('#searchSuggestions [data-kind="title"] b').first.inner_text() == "Jujutsu Kaisen"
            result = page.evaluate("catalog.results.map(item=>({title:item.title,type:item.type,aliases:item.catalogAliases}))")
            assert len(result) == 3, result
            assert len([item for item in result if item["title"] == "Jujutsu Kaisen 0"]) == 1, "Animated film duplicates must merge across media catalogs"
            assert page.evaluate("catalogLibraryItem(catalog.results.find(item=>item.title==='Jujutsu Kaisen')).id===state.items[1].id")
            assert page.evaluate("state.items[1].notes==='Keep this'&&state.items[1].episode===7"), "Search must preserve private progress"
            page.locator("#q").press("ArrowDown")
            selected = page.locator('#searchSuggestions [aria-selected="true"]')
            assert selected.locator("b").inner_text() == "Jujutsu Kaisen"
            assert page.locator("#q").get_attribute("aria-activedescendant") == selected.get_attribute("id")
            page.locator("#q").press("Escape")
            assert page.locator("#searchSuggestions").is_hidden()
            for theme in ("dark", "light"):
                page.evaluate("theme=>{state.ui.theme=theme;document.documentElement.dataset.theme=theme;document.querySelector('#q').focus();renderSearchSuggestions();}", theme)
                page.wait_for_timeout(220)
                assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1"), "Page must not overflow"
                assert page.locator("#q").evaluate("node=>{const s=getComputedStyle(node);return node.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)>70}"), "Search input must remain usable"
                if CAPTURE:
                    page.screenshot(path=str(ROOT / f".impeccable/review/search-{width}-{theme}.png"))
            if width == 375:
                for lang in ("fr", "ar"):
                    page.evaluate("lang=>{state.ui.language=lang;applyLanguage();updateModeChrome();}", lang)
                    assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+1")
                    assert page.locator('[data-search-scope="online"]').get_attribute("aria-label") in ("En ligne", "الإنترنت")
                    if CAPTURE:
                        page.screenshot(path=str(ROOT / f".impeccable/review/search-{width}-{lang}.png"))
                page.evaluate("()=>{state.ui.language='en';applyLanguage();}")
            page.locator("#q").fill("naruto shipudden")
            page.wait_for_function("()=>catalog.query==='naruto shipudden'&&!catalog.loading")
            assert page.evaluate("catalog.results.length") == 1, page.evaluate("catalog.results.map(item=>item.title)")
            assert page.evaluate("catalog.results[0].catalogAliases.includes('tvmaze:488')")
            page.locator('[data-search-scope="library"]').focus()
            page.locator('[data-search-scope="library"]').press("Enter")
            assert page.locator('[data-search-scope="library"]').get_attribute("aria-pressed") == "true"
            assert page.locator("#q").input_value() == "naruto shipudden"
            assert page.locator("[data-search-online]").is_visible()
            flags["hold"] = True
            page.evaluate("()=>{catalog.query='';}")
            with page.expect_request("**/api/edge/anime?**"):
                page.locator('[data-search-scope="online"]').click()
            page.wait_for_function("()=>catalog.loading")
            page.locator('[data-search-scope="library"]').click()
            flags["hold"] = False
            for pending in held:
                pending.fulfill(json={"data": anime_rows()})
            held.clear()
            page.wait_for_timeout(100)
            assert page.evaluate("searchScope()==='library'&&!catalog.loading")
            assert page.locator("[data-search-online]").is_visible(), "Cancelled online response must not replace the library empty state"
            flags["offline"] = True
            page.locator("#q").fill("offline example")
            page.locator('[data-search-scope="online"]').click()
            page.wait_for_function("()=>!catalog.loading&&!!catalog.error")
            assert page.locator("[data-catalog-retry]").is_visible()
            page.locator('[data-search-scope="library"]').click()
            assert page.evaluate("searchScope()==='library'")
            assert not page.locator("[data-catalog-retry]").count(), "Online errors must not leak into Library search"
            assert not errors, errors
            context.close()
            print(f"PASS: exact/popular ranking, generic deduplication, Library/Online isolation, cancellation, errors and keyboard at {width}px")
    finally:
        browser.close()
