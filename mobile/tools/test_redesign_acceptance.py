"""Browser acceptance for large libraries, Ask pick state, and failed private writes."""

import json
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect, sync_playwright

import test_preview as qa


def button(page, name):
    return page.get_by_role("button", name=name, exact=True)


def tab(page, name):
    page.get_by_role("tab", name=name, exact=True).click()


def open_library(page):
    tab(page, "Library")
    button(page, "Sign in").click()
    page.get_by_label("Email address", exact=True).fill("a@fixture.test")
    page.get_by_label("Password", exact=True).fill("isolated-fixture-password")
    button(page, "Sign in").click()


def setup(browser):
    page = browser.new_page(viewport={"width": 412, "height": 915}, reduced_motion="reduce")
    page.add_init_script("""
        localStorage.setItem("reel.mobile.preferences.v1", JSON.stringify({
            onboarded: true, appearance: "dark", haptics: false
        }));
    """)
    return page


def large_library(browser):
    statuses = {
        "Watchlist": "want", "In progress": "going", "Watched": "done",
        "Saved picks": "suggested", "Paused": "paused", "Waiting": "waiting",
        "Dropped": "dropped",
    }
    titles = [
        qa.member(qa.title_record("imdb", f"tt{1_000_000 + i}",
                                  f"Library fixture {i:03d}", "movie"), qa.A)
        for i in range(525)
    ]
    for i, row in enumerate(titles):
        row.update(status=list(statuses.values())[i % len(statuses)],
                   favorite=i % 5 == 0, tags=["Weekend"] if i % 2 == 0 else ["Weekday"])
        row["title"]["metadata"]["cover"] = "https://images.metahub.space/test.png"
    page = setup(browser)
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    offsets = []

    def backend(route):
        request = route.request
        url = urlparse(request.url)
        if url.path.endswith("/user_titles") and request.method == "GET":
            params = parse_qs(url.query)
            offset = int(params.get("offset", ["0"])[0])
            limit = int(params.get("limit", ["500"])[0])
            offsets.append(offset)
            return qa.fulfill(route, titles[offset:offset + limit])
        return qa.backend(route)

    page.route("**/*.supabase.co/**", backend)
    page.route("**/images.metahub.space/**", lambda route: route.abort())
    page.route("**/v3-cinemeta.strem.io/**", qa.catalogs)
    page.route("**/api.tvmaze.com/**", qa.catalogs)
    page.route("**/kitsu.io/**", qa.catalogs)
    page.route("**/v3.sg.media-imdb.com/**", qa.catalogs)
    page.goto("http://127.0.0.1:8092", wait_until="domcontentloaded")
    open_library(page)
    expect(page.get_by_text("525 titles in your library", exact=True)).to_be_visible()
    assert offsets[:2] == [0, 500], offsets
    field = page.get_by_label("Filter your library", exact=True)
    field.fill("Library fixture 0")
    for label in ["All", *statuses, "Favorites"]:
        button(page, "Filters").click()
        button(page, label).click()
        button(page, "Weekend").click()
        button(page, "Apply filters").click()
        relevant = [
            row for row in titles
            if "Library fixture 0" in row["title"]["title"] and "Weekend" in row["tags"]
            and (label == "All" or (row["favorite"] if label == "Favorites" else row["status"] == statuses[label]))
        ]
        expect(page.get_by_text(f"{len(relevant)} titles matching your filters", exact=True)).to_be_visible()
        expect(button(page, f'Open {relevant[0]["title"]["title"]}')).to_be_visible()
    button(page, "Clear filters").click()
    first = button(page, "Open Library fixture 000")
    scroll = first.evaluate_handle("""card => {
        for (let el = card.parentElement; el; el = el.parentElement) {
          if (/(auto|scroll)/.test(getComputedStyle(el).overflowY) &&
              el.scrollHeight > el.clientHeight) return el;
        }
        throw new Error("Library scroll view missing");
    }""")
    scroll.evaluate("el => el.scrollTop = 4400")
    visible_fixture = """() => [...document.querySelectorAll('[aria-label^="Open Library fixture"]')]
      .filter(el => { const rect = el.getBoundingClientRect();
        return rect.top >= 0 && rect.top < innerHeight - 140; })
      .map(el => Number(el.getAttribute("aria-label").slice(-3)))"""
    page.wait_for_function(f"() => ({visible_fixture})().some(i => i > 12)")
    before = next(i for i in page.evaluate(visible_fixture) if i > 12)
    page.set_viewport_size({"width": 915, "height": 560})
    page.wait_for_function(
        f"before => ({visible_fixture})().some(i => Math.abs(i-before) <= 12)",
        arg=before, timeout=8000,
    )
    after = page.evaluate(visible_fixture)
    assert any(abs(i - before) <= 12 for i in after), (before, after)
    assert not errors, errors
    print(json.dumps({"checks": "525 titles, 9 intersecting scopes, resize anchor",
                      "page_offsets": offsets, "anchor": before, "visible_after_resize": after}))
    page.close()


def ask_picks_and_write_retries(browser):
    page = setup(browser)
    errors = []
    page.on("pageerror", lambda err: errors.append(str(err)))
    film_set = [dict(qa.FILM, id=f"tt899900{i}", imdb_id=f"tt899900{i}",
                     name=f"Drama fixture {i}") for i in range(1, 4)]
    picks = {film["id"]: film for film in film_set}
    requests = []
    patch_payloads = []
    watch_ids = {}
    fail_rating = True

    def catalog(route):
        path = urlparse(route.request.url).path
        if "api.tvmaze.com" in route.request.url and path.endswith("/episodes"):
            episodes = [
                qa.EPISODES[0],
                {"id": 3, "season": 1, "number": 3, "name": "Another released frame",
                 "airdate": "2020-01-02", "runtime": 45},
                qa.EPISODES[1],
            ]
            return qa.fulfill(route, episodes)
        if "v3-cinemeta" in route.request.url:
            if "/meta/" in path:
                name = path.rsplit("/", 1)[-1].removesuffix(".json")
                return qa.fulfill(route, {"meta": picks.get(name, qa.FILM)})
            return qa.fulfill(route, {"metas": film_set})
        return qa.catalogs(route)

    def ai(route):
        data = route.request.post_data_json
        requests.append(data["action"])
        if data["action"] == "interpret":
            return qa.fulfill(route, {
                "update": {"mediaType": "movie", "genres": ["Drama"]},
                "question": None, "suggestions": [], "searchHints": [],
            })
        return qa.fulfill(route, {"choices": [
            {"id": candidate["id"], "why": f"Explanation for {candidate['title']}."}
            for candidate in data["candidates"][:data["count"]]
        ]})

    def backend(route):
        nonlocal fail_rating
        request = route.request
        path = urlparse(request.url).path
        if path.endswith("/user_titles") and request.method == "PATCH":
            body = request.post_data_json
            patch_payloads.append(body)
            if "rating" in body and fail_rating:
                fail_rating = False
                return qa.fulfill(route, {"message": "Fixture rating write failed"}, 503)
        if path.endswith("/rpc/apply_watch_action") and request.method == "POST":
            body = request.post_data_json
            key = (body["p_action"], body["p_entries"][0].get("number"))
            watch_ids.setdefault(key, []).append(body["p_request_id"])
            if key == ("watch", 1) and len(watch_ids[key]) == 1:
                return qa.fulfill(route, {"message": "Fixture watch response lost"}, 503)
        return qa.backend(route)

    page.route("**/*.supabase.co/**", backend)
    for host in ["v3-cinemeta.strem.io", "v3.sg.media-imdb.com", "api.tvmaze.com",
                 "kitsu.io", "www.wikidata.org", "query.wikidata.org"]:
        page.route(f"**/{host}/**", catalog)
    page.route("**/images.metahub.space/**", lambda route: route.abort())
    page.route("https://reel-navy.vercel.app/api/recommend", ai)
    page.goto("http://127.0.0.1:8092", wait_until="domcontentloaded")
    open_library(page)
    tab(page, "Ask Reel")
    page.get_by_label("Your request to Reel", exact=True).fill("A thoughtful drama movie under two hours")
    button(page, "Send").click()
    expect(page.get_by_text("Pick 1 of 3", exact=True)).to_be_visible()
    button(page, "Next pick").click()
    expect(page.get_by_text("Pick 2 of 3", exact=True)).to_be_visible()
    pick_title = page.get_by_role("heading", name=r"Drama fixture", exact=False).inner_text()
    explanation = page.get_by_text(f"Explanation for {pick_title}.", exact=True)
    expect(explanation).to_be_visible()
    before = len(requests)
    button(page, "Details").click()
    expect(page.get_by_role("heading", name=pick_title, exact=True)).to_be_visible()
    button(page, "Back").click()
    expect(explanation).to_be_visible()
    page.set_viewport_size({"width": 1120, "height": 740})
    expect(page.get_by_text("Pick 2 of 3", exact=True)).to_be_visible()
    expect(explanation).to_be_visible()
    button(page, "View picks").click()
    assert len(requests) == before, requests
    button(page, "Save pick").click()
    expect(page.get_by_text("In your library", exact=True)).to_be_visible()
    page.screenshot(path=str(qa.OUT / "ask-three-picks-expanded-fixture.png"))
    button(page, "Details").click()
    button(page, "Your rating").click()
    button(page, "9").click()
    page.once("dialog", lambda dialog: dialog.accept())
    button(page, "Cancel").click()
    expect(page.get_by_role("heading", name="Your rating", exact=True)).to_have_count(0)
    assert not patch_payloads, patch_payloads
    button(page, "Your rating").click()
    button(page, "8").click()
    button(page, "Save rating").click()
    expect(page.get_by_role("alert").filter(has_text="Fixture rating write failed")).to_be_visible()
    expect(page.get_by_text("8/10", exact=True)).to_be_visible()
    button(page, "Save rating").click()
    expect(page.get_by_text("8/10 · Private", exact=True)).to_be_visible()
    assert [set(payload) for payload in patch_payloads] == [
        {"rating", "last_interaction_at"}, {"rating", "last_interaction_at"},
    ], patch_payloads
    button(page, "Your rating").click()
    button(page, "Save rating").click()
    expect(page.get_by_role("heading", name="Your rating", exact=True)).to_have_count(0)
    assert len(patch_payloads) == 2, patch_payloads
    button(page, "Notes & collections").click()
    private_note = "ملاحظات المشاهدة " * 90
    page.get_by_label("Private notes", exact=True).fill(private_note)
    page.get_by_label("Collections", exact=True).fill(" Weekend ,  Film night  ")
    button(page, "Save notes & collections").click()
    expect(page.get_by_role("heading", name="Notes & collections", exact=True)).to_have_count(0)
    assert patch_payloads[-1]["notes"] == private_note
    assert patch_payloads[-1]["tags"] == ["Weekend", "Film night"]
    assert "rating" not in patch_payloads[-1]
    button(page, "Back").click()
    tab(page, "Library")
    button(page, "Open Fixture Series").click()
    button(page, "Watch").first.click()
    expect(page.get_by_text("Fixture watch response lost", exact=True)).to_be_visible()
    button(page, "Watch").nth(1).click()
    expect(button(page, "Undo")).to_be_visible()
    button(page, "Watch").first.click()
    expect(button(page, "Undo")).to_have_count(2)
    assert len(watch_ids[("watch", 1)]) == 2
    assert len(set(watch_ids[("watch", 1)])) == 1, watch_ids
    button(page, "Undo").first.click()
    expect(button(page, "Undo")).to_have_count(1)
    button(page, "Back").click()
    tab(page, "You")
    expect(page.get_by_role("heading", name="Top rated", exact=True)).to_be_visible()
    expect(button(page, f"Open {pick_title}").get_by_label("Your rating 8 out of 10")).to_be_visible()
    button(page, "Matinee").click()
    button(page, "After dark").click()
    button(page, "Matinee").click()
    page.wait_for_function(
        """() => JSON.parse(localStorage.getItem("reel.mobile.preferences.v1")).appearance === "light" """
    )
    assert not json.loads(page.evaluate('localStorage.getItem("reel.mobile.preferences.v1")'))["useRatings"]
    assert not errors, errors
    print(json.dumps({"checks": "three picks, Details return, expanded selection, save, cancel, "
                               "private write failure/retry, watch retry ID, undo, "
                               "private Top rated, queued appearance", "page_errors": errors}))
    page.close()


if __name__ == "__main__":
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        large_library(browser)
        ask_picks_and_write_retries(browser)
        browser.close()
