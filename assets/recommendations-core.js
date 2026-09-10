/* Reel recommendation session and factual ranking. Shared by browser and server. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ReelRecommendations = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const types = ['movie', 'series', 'anime', 'book', 'manga', 'manhwa'];
  const arrays = ['currentMood', 'desiredMood', 'audience', 'genres', 'themes', 'include', 'exclude'];
  const clean = v => String(v || '').normalize('NFKC').toLowerCase().trim();
  const words = v => Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string').map(x => x.trim().slice(0, 80)).filter(Boolean))].slice(0, 12) : [];
  const positive = v => Number.isFinite(v) && v > 0 ? v : null;
  const semantic = {
    rain: ['atmospheric', 'reflective'], loneliness: ['isolation', 'introspective'],
    sword: ['warrior', 'fantasy'], samurai: ['samurai', 'Japan'], space: ['science fiction', 'exploration'],
    spaceship: ['science fiction', 'adventure'], midnight: ['mystery', 'atmospheric'],
    summer: ['summer', 'friendship'], friends: ['friendship'], snow: ['winter', 'quiet'],
    sunset: ['romance', 'reflective'], ocean: ['ocean', 'adventure'], detective: ['mystery', 'crime']
  };
  const expansions = {
    funny: ['comedy', 'humor', 'comic'], comforting: ['family', 'friendship', 'heartwarming', 'comedy'],
    relaxing: ['slice of life', 'friendship', 'comedy'], suspenseful: ['thriller', 'mystery', 'suspense'],
    thoughtful: ['psychological', 'philosoph', 'science fiction'], emotional: ['drama', 'romance'],
    scary: ['horror', 'supernatural'], imaginative: ['fantasy', 'adventure', 'science fiction'],
    atmospheric: ['noir', 'mystery', 'rain', 'atmospheric'], introspective: ['drama', 'isolation', 'lonely'],
    'science fiction': ['science fiction', 'sci-fi', 'space'], depressing: ['tragedy', 'suicide', 'depress', 'bleak'],
    disturbing: ['torture', 'gore', 'rape', 'sexual violence', 'graphic violence'],
    'too serious': ['war', 'tragedy'], childish: ['preschool', 'toddler']
  };
  function intent(raw = {}) {
    const i = { source: ['library', 'discover', 'mix'].includes(raw.source) ? raw.source : 'library',
      mediaType: [...types, 'watch', 'read', 'any'].includes(raw.mediaType) ? raw.mediaType : 'any',
      context: typeof raw.context === 'string' ? raw.context.slice(0, 120) : '',
      maxRuntime: positive(raw.maxRuntime), maxPages: positive(raw.maxPages),
      childAge: positive(raw.childAge), contentSafety: raw.contentSafety === 'kid_friendly' ? 'kid_friendly' : 'any' };
    arrays.forEach(k => { i[k] = words(raw[k]); });
    return i;
  }
  function session(source = 'library', mediaType = 'any') {
    return { intent: intent({ source, mediaType }), mode: 'tell', answers: [], questions: [], shown: [], rejected: [],
      acceptedItemId: null, current: null, searchHints: [], removedSignals: [], useRatings: false };
  }
  function patch(s, update) {
    const next = { ...s.intent };
    for (const k of Object.keys(next)) if (update[k] != null) next[k] = arrays.includes(k) ? words(update[k]) : update[k];
    s.intent = intent(next);
    for (const removed of s.removedSignals) s.intent[removed.field] = s.intent[removed.field].filter(x => clean(x) !== clean(removed.value));
    return s.intent;
  }
  function remove(s, field, value) {
    if (arrays.includes(field)) { s.removedSignals.push({ field, value }); s.intent[field] = s.intent[field].filter(x => x !== value); }
    else if (['maxRuntime', 'maxPages', 'childAge'].includes(field)) s.intent[field] = null;
    else if (field === 'contentSafety') { s.intent.contentSafety = 'any'; s.intent.childAge = null; }
  }
  function interpret(s, text) {
    const t = clean(text), i = structuredClone(s.intent);
    const add = (k, ...v) => { i[k] = words([...i[k], ...v]); };
    const negative = term => new RegExp(`(?:no|not|without|avoid|don't (?:want|like)|dislike)\\s+(?:any\\s+|too\\s+)?(?:${term})`).test(t);
    const typePatterns = { manhwa: /\bmanhwa\b/, manga: /\bmanga\b/, anime: /\banime\b/, book: /\bbooks?\b/, series: /\b(series|tv show|sitcom)\b/, movie: /\b(movies?|films?)\b/ };
    for (const [type, re] of Object.entries(typePatterns)) if (re.test(t) && !negative(type + 's?')) { i.mediaType = type; break; }
    if (/^something to read$|^read$/.test(t)) i.mediaType = 'read';
    if (/^something to watch$|^watch$/.test(t)) i.mediaType = 'watch';
    for (const mood of ['tired', 'sad', 'lonely', 'stressed', 'happy', 'bored']) if (t.includes(mood)) add('currentMood', mood);
    if (/long day|stressful day/.test(t)) add('currentMood', 'tired');
    const desired = { funny: /funny|laugh|humou?r|comedy/, comforting: /comfort|cozy|cosy/, relaxing: /relax|easy|chill|distraction/, suspenseful: /hooked|suspense|thriller/, thoughtful: /think|mind.blow|psychological/, emotional: /emotional|match my mood/, scary: /scary|horror/, imaginative: /imaginative|fantasy/ };
    for (const [v, re] of Object.entries(desired)) if (re.test(t) && !negative(re.source)) add('desiredMood', v);
    for (const g of ['comedy', 'drama', 'horror', 'romance', 'thriller', 'fantasy', 'action', 'musical', 'psychological', 'adventure']) {
      if (new RegExp(`\\b${g}\\b`).test(t)) add(negative(g) ? 'exclude' : 'genres', g);
    }
    for (const word of Object.keys(semantic)) if (new RegExp(`\\b${word}\\b`).test(t)) add('themes', ...semantic[word]);
    if (/japan|japanese/.test(t)) add('themes', 'Japan');
    for (const x of ['depressing', 'disturbing', 'childish', 'serious', 'gore', 'violence']) if (negative(x)) add('exclude', x);
    if (/not (?:stupid|mindless)|not overly simplistic/.test(t)) add('exclude', 'childish');
    if (/family|kids|children|\d+.year.old/.test(t)) { i.context = 'family'; add('audience', 'adults', 'children'); i.contentSafety = 'kid_friendly'; }
    const age = t.match(/(\d{1,2})[ -]year[ -]old/); if (age) i.childAge = +age[1];
    const mins = t.match(/(?:under|less than|up to|about|max(?:imum)?|only)\s*(\d+)\s*(?:min|minute)/);
    const hours = t.match(/(?:under|about|up to|only)\s*(\d+(?:\.\d+)?)\s*hours?/);
    const pages = t.match(/(?:under|less than|up to|max(?:imum)?)\s*(\d+)\s*pages?/);
    if (mins) i.maxRuntime = +mins[1]; if (hours) i.maxRuntime = +hours[1] * 60;
    if (/about an hour|under an hour/.test(t)) i.maxRuntime = 60;
    if (pages) i.maxPages = +pages[1];
    if (/shorter|too long/.test(t) && s.current) {
      if (['book', 'manga', 'manhwa'].includes(s.current.type)) { if (s.current.pages) i.maxPages = Math.max(1, s.current.pages - 1); }
      else if (s.current.runtime) i.maxRuntime = Math.max(1, Math.min(i.maxRuntime || Infinity, s.current.runtime - 1));
    } else if (/\bshort\b/.test(t) && !i.maxRuntime && !['book', 'manga', 'manhwa', 'read'].includes(i.mediaType)) i.maxRuntime = i.mediaType === 'anime' || i.mediaType === 'series' ? 30 : 100;
    if (/too serious/.test(t)) { add('exclude', 'too serious'); add('desiredMood', 'funny'); }
    if (/too childish/.test(t)) add('exclude', 'childish');
    if (/don't like (?:the )?genre|dislike (?:the )?genre/.test(t) && s.current) add('exclude', ...(s.current.genres || []));
    if (/wrong mood/.test(t)) i.desiredMood = [];
    patch(s, i); s.answers.push(text.slice(0, 1200)); s.answers = s.answers.slice(-12);
    return s.intent;
  }
  function question(s) {
    const i = s.intent;
    if (s.questions.length >= 4) return null;
    const q = (id, text, chips) => s.questions.includes(id) ? null : { id, text, chips };
    if (i.currentMood.length && !i.desiredMood.length) return q('mood', 'Do you want to match that feeling, or change it?', ['Something comforting', 'Make me laugh', 'A distraction', 'Match my mood']);
    if (s.mode !== 'ask') return null;
    if (!i.desiredMood.length && !i.genres.length && !i.themes.length) return q('experience', 'What would feel good right now?', ['Something relaxing', 'Make me laugh', 'Keep me hooked', 'Make me think', 'Surprise me']);
    if (i.mediaType === 'any') return q('medium', 'Would you rather watch or read?', ['Something to watch', 'Something to read', 'Either is good']);
    if (!i.maxRuntime && !['book', 'manga', 'manhwa', 'read'].includes(i.mediaType)) return q('time', 'How much time do you have?', ['Under 30 minutes', 'About an hour', 'Under 120 minutes', 'No time limit']);
    return null;
  }
  function mediaTypes(i) { return i.mediaType === 'watch' ? types.slice(0, 3) : i.mediaType === 'read' ? types.slice(3) : types.includes(i.mediaType) ? [i.mediaType] : types; }
  function identity(c) { return `${c.type}:${clean(c.title)}:${c.year || ''}`; }
  function candidate(c, library = false) {
    return { ...c, recId: identity(c), inLibrary: library, genres: words(c.genres), synopsis: String(c.synopsis || c.firstSentence || '').slice(0, 1600) };
  }
  function haystack(c) { return clean([c.title, ...(c.genres || []), c.synopsis, c.creator, c.country, c.language, c.ageRatingGuide].join(' ')); }
  function terms(signal) { return [clean(signal), ...(expansions[clean(signal)] || [])]; }
  function hits(c, signal) { const h = haystack(c); return terms(signal).some(t => h.includes(t)); }
  function minimumAge(c) {
    const a = clean(c.ageRating).replace(/\s/g, '');
    if (/^(g|u|tv-y|tv-g|allages)$/.test(a)) return 0;
    if (/^(pg|tv-pg|tv-y7)$/.test(a)) return 7;
    if (a === 'pg-13') return 13;
    if (a === 'tv-14') return 14;
    if (/^(r|r17\+|tv-ma|nc-17)$/.test(a)) return 17;
    const n = a.match(/^(?:ages?)?(\d{1,2})(?:\+)?$/); return n ? +n[1] : null;
  }
  function eligible(c, s) {
    const i = s.intent;
    if (i.source === 'library' && !c.inLibrary) return false;
    if (!mediaTypes(i).includes(c.type) || s.shown.includes(c.recId) || s.rejected.includes(c.recId)) return false;
    if (c.inLibrary && ['done', 'dropped', 'waiting'].includes(c.status)) return false;
    if (i.maxRuntime && (!positive(c.runtime) || c.runtime > i.maxRuntime || ['book', 'manga', 'manhwa'].includes(c.type))) return false;
    if (i.maxPages && (!positive(c.pages) || c.pages > i.maxPages || c.type !== 'book')) return false;
    if (i.contentSafety === 'kid_friendly') { const age = minimumAge(c); if (age == null || age > (i.childAge || 7)) return false; }
    if (i.exclude.some(x => hits(c, x))) return false;
    return true;
  }
  function affinity(library) {
    const counts = {};
    for (const c of library) if (c.rating >= 8) for (const g of c.genres || []) counts[clean(g)] = (counts[clean(g)] || 0) + 1;
    return Object.fromEntries(Object.entries(counts).filter(([, n]) => n >= 3));
  }
  function rank(candidates, s, library = []) {
    const prefs = s.useRatings ? affinity(library) : {};
    const signals = [...s.intent.desiredMood, ...s.intent.genres, ...s.intent.themes, ...s.intent.include];
    const unique = new Map();
    for (const c of candidates) if (!unique.has(c.recId) || c.inLibrary) unique.set(c.recId, c);
    return [...unique.values()].filter(c => eligible(c, s)).map(c => {
      const matches = signals.filter(x => hits(c, x));
      const score = matches.length * 10 + (s.intent.source === 'mix' && c.inLibrary && (!signals.length || matches.length) ? 4 : 0)
        + Math.min(2, Number(c.score || 0) / 5) + (c.genres || []).reduce((n, g) => n + Math.min(1, (prefs[clean(g)] || 0) / 3), 0);
      return { ...c, matchSignals: matches, matchScore: score };
    }).sort((a, b) => b.matchScore - a.matchScore || a.recId.localeCompare(b.recId));
  }
  function explain(c, s) {
    const parts = [];
    if (c.matchSignals?.length) parts.push(`Its catalog description connects with your ${c.matchSignals.slice(0, 3).join(', ')} request.`);
    else parts.push('This is an available pick within your current limits. Its mood may be a looser match.');
    if (s.intent.maxRuntime) parts.push(`At ${c.runtime} minutes${['anime', 'series'].includes(c.type) ? ' per episode' : ''}, it fits your time limit.`);
    if (s.intent.maxPages) parts.push(`Its ${c.pages} pages fit your length preference.`);
    if (c.inLibrary) parts.push('It is already in your library.');
    return parts.join(' ');
  }
  function show(s, c) { s.current = c; if (!s.shown.includes(c.recId)) s.shown.push(c.recId); }
  function reject(s) { if (s.current && !s.rejected.includes(s.current.recId)) s.rejected.push(s.current.recId); }
  function facts(c) {
    // Explicit allowlist: no notes, personal timestamps, auth data, or library history.
    return { id: c.recId, title: String(c.title || '').slice(0, 200), type: c.type, year: c.year || null,
      runtime: c.runtime || null, pages: c.pages || null, genres: words(c.genres), synopsis: String(c.synopsis || '').slice(0, 1000),
      ageRating: String(c.ageRating || '').slice(0, 60), country: String(c.country || '').slice(0, 60),
      creator: String(c.creator || '').slice(0, 120), inLibrary: !!c.inLibrary };
  }
  return { types, arrays, intent, session, patch, remove, interpret, question, mediaTypes, identity, candidate, eligible, rank, explain, show, reject, facts, affinity, words };
});
