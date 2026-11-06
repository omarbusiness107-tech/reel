from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
out=root/'artifacts'
out.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page(viewport={'width':412,'height':915},device_scale_factor=1)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto('http://127.0.0.1:8092/',wait_until='networkidle',timeout=60000)
    page.screenshot(path=str(out/'onboarding.png'),full_page=True)
    print(page.locator('body').inner_text()[:2500])
    print('BUTTONS:',page.get_by_role('button').all_text_contents())
    print('PAGE_ERRORS:',errors)
    page.get_by_role('button',name='Skip',exact=True).click()
    page.wait_for_timeout(23000)
    page.screenshot(path=str(out/'discover-live.png'),full_page=True)
    print('DISCOVER:',page.locator('body').inner_text()[:2200])
    print('TABS:',page.get_by_role('tab').all_text_contents())
    print('ERRORS_AFTER_DISCOVER:',errors)
    browser.close()
