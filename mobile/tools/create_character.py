"""Rebuild Reel's original vector expressions and launcher icon. No third party art."""
from pathlib import Path
from PIL import Image, ImageDraw
root = Path(__file__).resolve().parents[1]
out = root / 'assets' / 'character'
out.mkdir(exist_ok=True)
states = ['idle', 'greeting', 'thinking', 'searching', 'excited', 'curious', 'confused', 'success', 'no-results', 'ready']
for state in states:
    happy = state in ['greeting', 'excited', 'success', 'ready']
    unsure = state in ['confused', 'no-results']
    eyes = '<path d="M39 58Q45 49 51 58M65 58Q71 49 77 58" stroke="#191A1D" stroke-width="5" fill="none" stroke-linecap="round"/>' if happy else f'<ellipse cx="45" cy="{53 if state == "curious" else 57}" rx="5" ry="{4 if unsure else 7}" fill="#191A1D"/><ellipse cx="71" cy="57" rx="5" ry="7" fill="#191A1D"/>'
    mouth = 'M47 74Q58 86 70 72' if happy else 'M49 80Q59 72 68 79' if unsure else 'M51 76Q58 81 65 76'
    spark = '<path d="M108 9L110 17L118 19L110 22L108 30L105 22L97 19L105 17Z" fill="#F3EFE5"/>' if state in ['ready', 'excited', 'success'] else ''
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" role="img" aria-label="Lumi {state}"><path d="M25 15H78L102 39V87Q102 103 85 103H25Q11 103 11 87V31Q11 15 25 15Z" fill="#FF654F"/><path d="M78 15V30Q78 39 88 39H102" fill="#FFAA8F"/><rect x="17" y="33" width="7" height="11" rx="2" fill="#F3EFE5"/><rect x="17" y="73" width="7" height="11" rx="2" fill="#F3EFE5"/>{eyes}<path d="{mouth}" fill="none" stroke="#191A1D" stroke-width="4" stroke-linecap="round"/>{spark}</svg>'
    (out / f'lumi-{state}.svg').write_text(svg, encoding='utf8')
# Icon uses the same geometry with an adaptive-icon safe central region.
im = Image.new('RGBA', (1024, 1024), '#101113')
d = ImageDraw.Draw(im)
d.rounded_rectangle((246, 240, 778, 792), radius=95, fill='#FF654F')
d.polygon([(640, 240), (778, 378), (670, 378), (640, 348)], fill='#FFAA8F')
for y in [360, 620]: d.rounded_rectangle((280,y,316,y+60), radius=10, fill='#F3EFE5')
for x in [440, 606]: d.ellipse((x-24,475,x+24,555), fill='#191A1D')
d.arc((450, 560, 610, 660), 15, 165, fill='#191A1D', width=20)
im.save(root / 'assets' / 'icon.png')
print(f'Created {len(states)} original Lumi SVGs and Reel launcher icon.')
