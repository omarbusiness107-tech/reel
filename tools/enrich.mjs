/**
 * Builds seed-data.json: every title from reel.html's plain-text lists, enriched with a
 * cover URL, genres, year, runtime, creator and synopsis from the four keyless APIs.
 *
 * The parsing and lookup logic is SLICED OUT OF reel.html and evaluated, not reimplemented,
 * so the seed can never drift from what the app itself would produce.
 */
import { readFileSync, writeFileSync } from 'node:fs';

/*
 * Wikimedia rate-limits hard and asks for a descriptive User-Agent. Without this the
 * movie lookups (3 requests each, 270 titles) get 429'd into oblivion, which is exactly
 * what happened on the first run: 4/270 matched.
 */
const realFetch = globalThis.fetch;
const lastAt = new Map();
const gap = (host) => host.includes('wikipedia') || host.includes('wikidata') ? 400 : 60;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

globalThis.fetch = async (url, opts = {}) => {
  const host = new URL(url).host;
  for (let attempt = 0; attempt < 6; attempt++) {
    const wait = (lastAt.get(host) || 0) + gap(host) - Date.now();
    if (wait > 0) await sleep(wait);
    lastAt.set(host, Date.now());
    const res = await realFetch(url, {
      ...opts,
      // No blanket Accept: Kitsu speaks JSON:API and 406s on application/json.
      headers: { 'User-Agent': 'reel-watchlist/1.0 (personal media tracker; single user)',
                 ...(opts.headers || {}) }
    });
    if (res.status !== 429 && res.status < 500) return res;
    await sleep(Math.min(20000, 800 * Math.pow(2, attempt)));
  }
  return realFetch(url, opts);
};

const html = readFileSync(new URL('../reel.html', import.meta.url), 'utf8');
// Locate the two reusable regions by marker text, not line numbers: reel.html gets
// edited, and line offsets silently rot.
function region(from, to) {
  const i = html.indexOf(from);
  const j = html.indexOf(to, i);
  if (i < 0 || j < 0) throw new Error('region not found: ' + from.slice(0, 30));
  return html.slice(i, j);
}
const PARSE  = region('const ZW = ', '/* ---------- storage ---------- */');
const LOOKUP = region('async function getJSON(url){', '/** Just the poster URLs');

const mod = await import('data:text/javascript;base64,' + Buffer.from(
  PARSE + '\n' + LOOKUP + '\n' +
  'export {clean,norm,titleCase,FIXES,TYPE_FIX,lookup,topUp,tidyGenres};'
).toString('base64'));

const { clean, norm, titleCase, FIXES, TYPE_FIX, lookup, topUp } = mod;

/* Mirrors makeItem()'s title/year/type derivation. */
function parseTitle(raw, type) {
  let t = clean(raw);
  if (!t) return null;
  let year = null;
  const m = t.match(/[\s(](19|20)\d{2}\)?$/);
  if (m) { year = parseInt(m[0].replace(/[^\d]/g, ''), 10); t = t.slice(0, m.index).trim(); }
  t = FIXES[norm(t)] || titleCase(t);
  const key = norm(t);
  return { title: t, key, type: TYPE_FIX[key] || type, year };
}

/* Pull the four seed lists straight out of the HTML (indexOf, so no regex escaping). */
function seedBlock(type){
  const open = '<script type="text/plain" id="' + type + '">';
  const i = html.indexOf(open);
  if (i < 0) throw new Error('block not found: ' + type);
  const j = html.indexOf('</scr' + 'ipt>', i);
  return html.slice(i + open.length, j);
}

const items = [];
const seen = new Set();
// seed-* are the user's own lists (Want); sugg-* are reel's additions (Suggested).
for (const [prefix, status] of [['seed', 'want'], ['sugg', 'suggested']]) {
  for (const type of ['movie', 'series', 'anime', 'book']) {
    let block;
    try { block = seedBlock(prefix + '-' + type); } catch { continue; }
    for (const line of block.split(String.fromCharCode(10))) {
      const it = parseTitle(line, type);
      if (!it || seen.has(it.key)) continue;
      seen.add(it.key);
      it.status = status;
      items.push(it);
    }
  }
}
console.error(`parsed ${items.length} unique titles`);

/* Resume: anything already carrying a cover from a previous run is left alone. */
import { existsSync } from 'node:fs';
const OUT = new URL('../seed-data.json', import.meta.url);
if (existsSync(OUT)) {
  const prev = new Map(JSON.parse(readFileSync(OUT, 'utf8'))
    .map(p => [p.type + '|' + p.title, p]));
  for (const it of items) {
    const p = prev.get(it.type + '|' + it.title);
    if (p && p.cover) Object.assign(it, p, { status: it.status });
  }
  console.error(`resuming: ${items.filter(i => i.cover).length} already done`);
}

// Normalise on every write so a mid-run checkpoint is always a valid seed file.
const checkpoint = () => {
  for (const it of items) {
    it.genres ??= []; it.cover ??= ''; it.creator ??= ''; it.synopsis ??= '';
    it.runtime ??= null; it.pages ??= null; it.year ??= null;
    it.cast ??= []; it.score ??= null; it.country ??= ''; it.language ??= '';
    it.showStatus ??= ''; it.seasons ??= null; it.ageRating ??= '';
  }
  writeFileSync(OUT, JSON.stringify(items.map(({key, ...rest}) => rest)));
};
// re-fetch anything without a cover, or predating the richer field set
const queue = items.filter(i => !i.cover || i.enrichV !== 2);
console.error(`${queue.length} left to fetch`);

let next = 0, done = 0, hit = 0;
const misses = [];
const worker = async () => {
  while (next < queue.length) {
    const it = queue[next++];
    try {
      const [best] = await lookup(it, 1);
      if (best) {
        await topUp(best);
        it.cover    = best.cover || '';
        it.genres   = best.genres || [];
        it.year     = it.year || best.year || null;
        it.runtime  = best.runtime || null;
        it.pages    = best.pages || null;
        it.creator  = best.creator || '';
        it.synopsis = (best.synopsis || '').slice(0, 300);
        it.cast       = best.cast       || [];
        it.score      = best.score      ?? null;
        it.country    = best.country    || '';
        it.language   = best.language   || '';
        it.showStatus = best.showStatus || '';
        it.seasons    = best.seasons    ?? null;
        it.ageRating  = best.ageRating  || '';
        it.enrichV = 2;
        hit++;
      } else misses.push(`${it.title} (${it.type})`);
    } catch (e) { misses.push(`${it.title} (${it.type}) ERR ${e.message}`); }
    if (++done % 20 === 0) { checkpoint(); console.error(`  ${done}/${queue.length} (${hit} hit)`); }
    await sleep(90);
  }
};
const t0 = Date.now();
await Promise.all([worker(), worker()]);
checkpoint();

checkpoint();

console.error(`\ndone in ${((Date.now() - t0) / 1000 / 60).toFixed(1)}min`);
console.error(`matched ${hit}/${queue.length} this pass`);
console.error(`covers ${items.filter(i => i.cover).length}, genres ${items.filter(i => i.genres.length).length}, runtimes ${items.filter(i => i.runtime).length}`);
console.error('misses:\n  ' + misses.join('\n  '));
