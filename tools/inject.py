"""Injects seed-data.json into reel.html as a baked-in <script id="seed-data"> block."""
import io, json

html = io.open('reel.html', encoding='utf-8').read()
data = json.load(io.open('seed-data.json', encoding='utf-8'))

# Compact, and neutralise any "<" so the payload can never terminate the script tag.
payload = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
payload = payload.replace('<', chr(92) + 'u003c')

OPEN  = '<script type="application/json" id="seed-data">'
CLOSE = '</scr' + 'ipt>'
block = OPEN + payload + CLOSE

start = html.find(OPEN)
if start >= 0:                                  # replace an existing block
    end = html.find(CLOSE, start) + len(CLOSE)
    html = html[:start] + block + html[end:]
    action = 'replaced'
else:                                           # insert after the last plain-text list
    marker = '<script type="text/plain" id="seed-book">'
    i = html.find(marker)
    assert i >= 0, 'seed-book block not found'
    j = html.find(CLOSE, i) + len(CLOSE)
    html = html[:j] + chr(10) + chr(10) + block + html[j:]
    action = 'inserted'

io.open('reel.html', 'w', encoding='utf-8').write(html)
covers = sum(1 for d in data if d.get('cover'))
genres = sum(1 for d in data if d.get('genres'))
print(action, len(data), 'items;', covers, 'covers,', genres, 'genres;',
      'html now', round(len(html)/1024), 'KB')
