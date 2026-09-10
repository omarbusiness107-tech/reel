/* A temporary, resumable conversation. No session text is written to localStorage. */
(function () {
  'use strict';
  const R = window.ReelRecommendations;
  const B = window.reelRecommendationBridge;
  if (!R || !B) return;
  const esc = B.escape;
  let s = R.session(), root, pending = 0, controller, busy = false, enabled = true, configured = false;
  let view = { kind: 'welcome' }, lastRequest = '', feedback = false, serviceMessage = '';
  let focusAfterUpdate = null;
  const cache = new Map();
  const sourceNames = { library: 'My List', discover: 'Discover', mix: 'Mix' };
  const typeNames = { any: 'Anything', watch: 'Watch', read: 'Read' };
  const typeLabels = { movie: 'Movie', series: 'Series', anime: 'Anime', book: 'Book', manga: 'Manga', manhwa: 'Manhwa' };
  const icon = (name, size = 16) => B.icon(name, size);
  const btn = (action, text, primary = false, symbol = '') => `<button type="button" class="btn ${primary ? 'primary' : 'ghost'}" data-rec="${action}">${symbol ? icon(symbol) : ''}${esc(text)}</button>`;
  const chip = text => `<button type="button" class="rec-chip" data-answer="${esc(text)}">${esc(text)}</button>`;
  const fieldGroup = (name, label, values, selected) => `<fieldset><legend>${label}</legend><div class="rec-segment">${Object.entries(values).map(([key, text]) => `<button type="button" data-${name}="${key}" aria-pressed="${selected === key}">${text}</button>`).join('')}</div></fieldset>`;
  const safeUrl = value => { try { const u = new URL(value, location.href); return ['https:', 'http:'].includes(u.protocol) || (u.protocol === 'file:' && String(value).startsWith('assets/')) ? u.href : ''; } catch { return ''; } };
  const alive = ticket => ticket === pending && root?.isConnected && document.querySelector('#modal')?.classList.contains('on');
  function cancel() { pending++; controller?.abort(); busy = false; focusAfterUpdate = null; }
  function statusCopy() {
    if (!enabled) return 'Basic matching: no conversation or library data is sent to AI.';
    if (location.protocol === 'file:') return 'Local file: basic matching is active. AI needs the hosted app and sign-in.';
    if (!configured) return 'Basic matching is active. The server’s AI configuration is not available yet.';
    if (!B.signedIn()) return 'Sign in through Settings to use AI. Basic matching is available now.';
    return 'AI matching: your request and a small set of catalog facts are sent to OpenAI. Personal notes stay private.';
  }
  const useAI = () => enabled && configured && B.signedIn() && location.protocol !== 'file:';
  async function api(action, payload) {
    const token = await B.token();
    if (!token) throw new Error('Sign in through Settings to use AI, or choose basic matching.');
    const response = await fetch('/api/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...payload }), signal: controller.signal });
    let data; try { data = await response.json(); } catch { throw new Error('The AI service returned an unreadable response. Please retry.'); }
    if (!response.ok) throw new Error(data.error || 'AI is unavailable. Retry or use basic matching.');
    return data;
  }
  function open() {
    cancel();
    if (view.kind === 'busy') view = { kind: s.current ? 'result' : 'welcome' };
    B.show(`<div class="rec-shell">
      <div class="sheet-head"><h3>Pick for me</h3><button class="btn sm ghost" data-rec="reset" type="button">Start over</button><button class="btn sm ghost" data-close type="button" aria-label="Close recommendations">${icon('x')}Close</button></div>
      <div class="rec-body">
        <div class="rec-modes" role="group" aria-label="Recommendation mode">${[['tell', 'Tell Reel', 'message-circle'], ['ask', 'Ask Me', 'messages-square'], ['surprise', 'Surprise Me', 'shuffle']].map(([id, title, glyph]) => `<button type="button" data-mode="${id}" aria-pressed="${s.mode === id}">${icon(glyph)}${title}</button>`).join('')}</div>
        <div class="rec-controls">${fieldGroup('source', 'Where should I look?', sourceNames, s.intent.source)}${fieldGroup('medium', 'Watch or read?', typeNames, ['watch', 'read', 'any'].includes(s.intent.mediaType) ? s.intent.mediaType : R.mediaTypes({ mediaType: 'watch' }).includes(s.intent.mediaType) ? 'watch' : 'read')}</div>
        <div class="rec-context" aria-label="Your current preferences"></div>
        <div class="rec-main" aria-live="polite" aria-atomic="false"></div>
        <p class="rec-engine" id="recEngine">${icon('shield-check')}<span>${esc(statusCopy())}</span></p>
        <details class="rec-privacy"><summary>Matching &amp; privacy</summary>
          <label><input type="checkbox" id="recAI" ${enabled ? 'checked' : ''}>Use AI when available</label>
          <label><input type="checkbox" id="recRatings" ${s.useRatings ? 'checked' : ''}>Use genres I rated highly on at least three titles</label>
          <p>This conversation stays in this tab’s memory. Closing and reopening keeps it; Start over or reloading clears it. Mood and rejection feedback are never saved as permanent preferences. AI sees only your request and shortlisted public title facts, not personal notes or your full library.</p>
        </details>
      </div>
      <form class="rec-form"><label for="recInput">Or tell me in your own words</label>
        <div class="rec-composer"><textarea id="recInput" maxlength="1200" rows="2" placeholder="Rain, Japan, loneliness… or something funny under 90 minutes" aria-describedby="recEngine"></textarea><button class="btn primary" type="submit" aria-label="Send your answer">${icon('arrow-up')}Send</button></div>
      </form></div>`, element => {
      root = element; render();
      root.onclick = click;
      root.querySelector('form').onsubmit = event => { event.preventDefault(); submit(); };
      root.querySelector('#recInput').onkeydown = event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } };
      root.querySelector('#recAI').onchange = event => { cancel(); enabled = event.target.checked; updateEngine(); if (view.kind === 'busy') { view = { kind: 'welcome' }; render(); } };
      root.querySelector('#recRatings').onchange = event => { s.useRatings = event.target.checked; };
    });
    if (location.protocol !== 'file:') fetch('/api/recommend', { signal: AbortSignal.timeout(5000) }).then(r => r.ok ? r.json() : null).then(data => { configured = !!data?.configured; updateEngine(); }).catch(() => { configured = false; updateEngine(); });
  }
  function updateEngine() { const el = root?.querySelector('#recEngine span'); if (el) el.textContent = statusCopy(); }
  function renderContext() {
    const labels = { currentMood: 'Feeling', desiredMood: 'Experience', themes: 'Theme', genres: 'Genre', include: 'Include', exclude: 'Avoid', audience: 'Audience' };
    root.querySelector('.rec-context').innerHTML = R.arrays.flatMap(field => s.intent[field].map(value => `<button type="button" data-remove="${field}" data-value="${esc(value)}" aria-label="Remove ${esc(labels[field] + ': ' + value)}"><span>${labels[field]}:</span>${esc(value)}${icon('x', 12)}</button>`)).join('')
      + (R.types.includes(s.intent.mediaType) ? `<button type="button" data-rec="any-type" aria-label="Remove media type preference">${typeLabels[s.intent.mediaType]}${icon('x', 12)}</button>` : '')
      + ['maxRuntime', 'maxPages'].filter(k => s.intent[k]).map(k => `<button type="button" data-remove="${k}" aria-label="Remove length limit">Up to ${s.intent[k]} ${k === 'maxRuntime' ? 'min' : 'pages'}${icon('x', 12)}</button>`).join('')
      + (s.intent.contentSafety === 'kid_friendly' ? `<button type="button" data-remove="contentSafety" aria-label="Remove child suitability filter">Family filter${s.intent.childAge ? ' · age ' + s.intent.childAge : ''}${icon('x', 12)}</button>` : '');
  }
  function render() {
    if (!root?.isConnected) return;
    const active = document.activeElement;
    if (root.querySelector('.rec-main')?.contains(active) || root.querySelector('.rec-form')?.contains(active)) {
      focusAfterUpdate = active.dataset?.rec || 'heading';
    }
    renderContext();
    root.querySelectorAll('[data-source]').forEach(b => b.setAttribute('aria-pressed', b.dataset.source === s.intent.source));
    const medium = R.types.includes(s.intent.mediaType) ? (['movie', 'series', 'anime'].includes(s.intent.mediaType) ? 'watch' : 'read') : s.intent.mediaType;
    root.querySelectorAll('[data-medium]').forEach(b => b.setAttribute('aria-pressed', b.dataset.medium === medium));
    root.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === s.mode));
    const main = root.querySelector('.rec-main');
    let html = '';
    if (view.kind === 'busy') html = `<div class="rec-busy" role="status"><span class="exposure-loader" aria-hidden="true"></span><div><b>${esc(view.message)}</b><p>${s.intent.source === 'library' ? 'Checking saved titles only. Your preferences stay in place.' : 'Looking up real catalog records and checking your preferences.'}</p></div></div>`;
    else if (view.kind === 'question') html = `<div class="rec-question"><h2>${esc(view.question.text)}</h2><p>Pick an answer, or tell me in your own words.</p><div class="rec-chips">${view.question.chips.map(chip).join('')}</div></div>`;
    else if (view.kind === 'feedback') html = `<div class="rec-question"><h2>What didn’t fit?</h2><p>This only changes the current conversation. No explanation needed.</p><div class="rec-chips">${['Too long', 'Wrong mood', "Don’t like the genre", 'Too serious', 'Too childish', 'Already seen it', 'Just not feeling it'].map(chip).join('')}</div></div>`;
    else if (view.kind === 'error' || view.kind === 'empty') html = `<div class="rec-error"><h2>${view.kind === 'empty' ? 'Nothing fits all of that yet' : 'Couldn’t finish this pick'}</h2><p>${esc(view.message)}</p><div class="rec-actions">${btn('retry', 'Try again', true, 'rotate-ccw')}${view.kind === 'error' && useAI() ? btn('basic', 'Use basic matching') : ''}${btn('relax', 'Relax a preference')}${s.intent.source === 'library' ? btn('discover', 'Try Discover') : ''}${btn('change', 'Change request')}</div></div>`;
    else if (view.kind === 'result' && s.current) html = resultMarkup();
    else html = `<div class="rec-question"><h2>${s.mode === 'surprise' ? 'Leave the decision to Reel.' : 'What would feel right today?'}</h2><p>${s.mode === 'surprise' ? 'Choose where to look and what to explore. I’ll find one pick to start with.' : 'A feeling, a few words, or a very specific request. We can figure it out together.'}</p>${s.mode === 'surprise' ? btn('pick', 'Find my pick', true, 'shuffle') : `<div class="rec-chips">${['Something comforting', 'Make me laugh', 'Rain, Japan, loneliness', 'A short psychological anime'].map(chip).join('')}</div>`}</div>`;
    main.innerHTML = html;
    main.setAttribute('aria-busy', String(busy));
    root.querySelector('#recInput').disabled = busy;
    root.querySelector('button[type="submit"]').disabled = busy;
    root.querySelectorAll('.rec-main button,.rec-context button').forEach(b => { b.disabled = busy; });
    B.icons(); updateEngine();
    if (focusAfterUpdate && !busy) {
      const target = root.querySelector(`[data-rec="${focusAfterUpdate}"]`) || main.querySelector('h2') || root.querySelector('#recInput');
      if (target.tagName === 'H2') target.tabIndex = -1;
      target.focus({ preventScroll: true }); focusAfterUpdate = null;
    }
  }
  function resultMarkup() {
    const c = s.current, saved = B.find(c), cover = safeUrl(c.cover);
    const score = saved?.rating ? ['Your rating', `${saved.rating} / 10`] : c.score ? [c.ratingSource || c.sourceName || 'Community rating', `${c.score} / 10`] : null;
    const facts = [['Length', B.runtime(c)], [c.type === 'book' ? 'Author' : c.type === 'movie' ? 'Director' : 'Creator / network', c.creator], score, ['Age rating', c.ageRating]].filter(x => x && x[1]);
    return `${lastRequest ? `<div class="rec-request">Your request: ${esc(lastRequest)}</div>` : ''}<article class="rec-result">
      ${cover ? `<img class="rec-cover" src="${esc(cover)}" alt="${esc(c.title)} cover">` : '<div class="rec-cover rec-no-cover">Cover unavailable</div>'}
      <div><h2>${esc(c.title)}</h2><div class="rec-meta">${[typeLabels[c.type], c.year, ...(c.genres || []).slice(0, 3), saved ? 'In your library' : c.sourceName].filter(Boolean).map(esc).join(' · ')}</div>
      <dl>${facts.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl></div>
      <div class="rec-description"><h4>Why Reel picked this</h4><p class="rec-why">${esc(view.why || R.explain(c, s))}</p>
        ${c.ageRating ? `<p class="rec-why">Catalog rating: ${esc(c.ageRating)}${c.ageRatingGuide ? ' · ' + esc(c.ageRatingGuide) : ''}. Check the full content guide for your audience.</p>` : ''}
        ${serviceMessage ? `<p class="rec-why">${esc(serviceMessage)}</p>` : ''}
        <div class="rec-actions">${btn('another', 'Another', true, 'shuffle')}${btn('details', 'View details', false, 'arrow-up-right')}${btn('add', saved ? 'In my library' : 'Add to my list', false, saved ? 'library' : 'plus')}</div>
        <div class="rec-secondary"><button type="button" data-rec="reject">Not this</button><button type="button" data-rec="seen">${['book', 'manga', 'manhwa'].includes(c.type) ? 'Already read' : 'Already watched'}</button></div>
      </div></article>`;
  }
  function ask(q) { if (!q) return false; s.questions.push(q.id); view = { kind: 'question', question: q }; render(); root.querySelector('#recInput')?.focus({ preventScroll: true }); return true; }
  function submit() { if (busy) return; const input = root.querySelector('#recInput'), text = input.value.trim(); if (!text) return input.focus(); input.value = ''; run(text); }
  async function run(text, force = false) {
    cancel(); controller = new AbortController(); const ticket = pending;
    busy = true; view = { kind: 'busy', message: 'Finding your direction' }; render();
    const snapshot = structuredClone(s);
    try {
      const message = text.replaceAll('’', "'");
      if (feedback) { R.reject(s); feedback = false; }
      if (/wrong mood/i.test(message)) s.questions = s.questions.filter(q => !['mood', 'experience'].includes(q));
      R.interpret(s, message);
      if (!/^another[.!]?$/i.test(message)) lastRequest = text;
      let aiQuestion;
      if (useAI() && !/^another[.!]?$/i.test(message)) {
        const data = await api('interpret', { message, intent: snapshot.intent, answers: snapshot.answers, questions: snapshot.questions, previous: snapshot.current && R.facts(snapshot.current), language: B.language() });
        if (!alive(ticket)) return;
        // Source belongs exclusively to the visible selector. Local hard bounds survive interpretation.
        const local = structuredClone(s.intent);
        R.patch(s, data.update);
        s.intent.source = local.source;
        if (local.maxRuntime) s.intent.maxRuntime = Math.min(s.intent.maxRuntime || Infinity, local.maxRuntime);
        if (local.maxPages) s.intent.maxPages = Math.min(s.intent.maxPages || Infinity, local.maxPages);
        if (local.mediaType !== 'any' && !R.mediaTypes(local).includes(s.intent.mediaType) && s.intent.mediaType !== local.mediaType) s.intent.mediaType = local.mediaType;
        s.intent.exclude = R.words([...local.exclude, ...s.intent.exclude]);
        if (local.contentSafety === 'kid_friendly') s.intent.contentSafety = 'kid_friendly';
        if (local.childAge) s.intent.childAge = Math.min(s.intent.childAge || Infinity, local.childAge);
        s.searchHints = data.searchHints;
        if (data.question && data.suggestions.length >= 3 && !s.questions.includes(data.question) && s.questions.length < 4) aiQuestion = { id: data.question, text: data.question, chips: data.suggestions };
      }
      if (!alive(ticket)) return;
      busy = false;
      let q = force ? null : aiQuestion || R.question(s);
      if (!force && /wrong mood/i.test(message) && !q) q = { id: 'experience', text: 'What would feel better instead?', chips: ['Something comforting', 'Make me laugh', 'Keep me hooked', 'Make me think'] };
      if (!force && /shorter|too long/i.test(message) && snapshot.current && !snapshot.current.runtime && !snapshot.current.pages) q = { id: 'length', text: 'The last title has no known length. What limit should I use?', chips: ['Under 30 minutes', 'Under 90 minutes', 'A book under 200 pages', 'No time limit'] };
      if (ask(q)) return;
      await findPick(ticket);
    } catch (error) {
      if (!alive(ticket) || error.name === 'AbortError') return;
      // Interpretation failures must not partially commit a new set of constraints.
      s = snapshot; busy = false; view = { kind: 'error', message: error.message }; render();
      root.querySelector('#recInput').value = text;
    }
  }
  const seedTitles = {
    movie: { funny: ['Paddington', 'The Grand Budapest Hotel'], scary: ['The Others', 'The Sixth Sense'], thoughtful: ['Arrival', 'Contact'], comforting: ['Kiki’s Delivery Service', 'Paddington'], default: ['The Truman Show', 'Spirited Away'] },
    series: { funny: ['The Good Place', 'Brooklyn Nine-Nine'], default: ['Detectorists', 'Severance'] },
    anime: { thoughtful: ['Serial Experiments Lain', 'Paranoia Agent'], comforting: ['Barakamon', 'Natsume Yuujinchou'], default: ['Mushishi', 'Cowboy Bebop'] },
    book: { thoughtful: ['The Dispossessed', 'Piranesi'], default: ['A Wizard of Earthsea', 'The Hobbit'] },
    manga: { default: ['Yokohama Kaidashi Kikou', 'Mushishi'] }, manhwa: { default: ['Solo Leveling', 'Tower of God'] }
  };
  function searchJobs() {
    const allowed = R.mediaTypes(s.intent);
    const hints = s.searchHints.filter(h => allowed.includes(h.type));
    if (hints.length) return hints;
    return allowed.flatMap(type => {
      const map = seedTitles[type], mood = s.intent.desiredMood.find(m => map[m]);
      const title = map[mood || 'default'];
      return title.slice(0, allowed.length > 3 ? 1 : 2).map(title => ({ title, type }));
    });
  }
  async function retrieve(ticket) {
    const library = B.library().map(c => R.candidate(c, true));
    if (s.intent.source === 'library') return { candidates: library, failed: 0 };
    const jobs = searchJobs().slice(0, 8);
    let failed = 0;
    const results = await Promise.all(jobs.map(async job => {
      const key = `${job.type}:${job.title}`;
      if (cache.has(key)) return cache.get(key);
      try {
        const records = await B.search(job.title, job.type, 4);
        if (alive(ticket)) cache.set(key, records);
        return records;
      } catch { failed++; return []; }
    }));
    if (!alive(ticket)) return { candidates: [], failed };
    const external = results.flat().map(c => {
      const saved = B.find(c);
      return saved ? R.candidate({ ...c, ...saved }, true) : R.candidate(c);
    });
    // Hydrate only external records; never contact a catalog for My List recommendations.
    const needingFacts = external.filter(c => !c.inLibrary && ((s.intent.maxRuntime && !c.runtime) || (s.intent.contentSafety === 'kid_friendly' && !c.ageRating) || !c.genres.length)).slice(0, 8);
    await Promise.all(needingFacts.map(c => B.enrich(c)));
    return { candidates: s.intent.source === 'mix' ? [...library, ...external] : external, failed };
  }
  async function findPick(ticket = pending) {
    busy = true; view = { kind: 'busy', message: 'Matching real titles' }; render(); serviceMessage = '';
    try {
      const { candidates, failed } = await retrieve(ticket);
      if (!alive(ticket)) return;
      let ranked = R.rank(candidates, s, B.library());
      let chosen, why;
      if (ranked.length && useAI()) {
        const result = await api('rank', { intent: s.intent, candidates: ranked.slice(0, 24).map(R.facts) });
        if (!alive(ticket)) return;
        const choice = result.choices.find(x => ranked.some(c => c.recId === x.id));
        chosen = choice && ranked.find(c => c.recId === choice.id); why = choice?.why;
      } else {
        // Basic matching is explicit and factual, not presented as semantic AI reasoning.
        chosen = ranked[0]; why = chosen && R.explain(chosen, s);
      }
      busy = false;
      if (!chosen) {
        view = { kind: failed && !candidates.length ? 'error' : 'empty', message: failed && !candidates.length ? 'The external catalogs could not be reached. Your request is saved; please retry.' : `${s.intent.source === 'library' ? 'Nothing remaining in your list matches all of that. I haven’t searched outside your library.' : 'No verified match was found in the retrieved catalog records.'} Missing runtime or age-rating data never counts as a match. Remove a preference below or change your request.` };
      } else {
        if (failed) serviceMessage = 'Some catalog sources were unavailable. This pick comes from the records that loaded.';
        // Guard against a deleted/completed library item while a remote ranking request was in flight.
        const saved = B.find(chosen);
        if (chosen.inLibrary && (!saved || ['done', 'dropped', 'waiting'].includes(saved.status))) { view = { kind: 'empty', message: 'Your library changed while I was looking. Try again with the updated list.' }; }
        else { R.show(s, chosen); view = { kind: 'result', why }; }
      }
      render();
    } catch (e) { if (!alive(ticket) || e.name === 'AbortError') return; busy = false; view = { kind: 'error', message: e.message }; render(); }
  }
  async function click(event) {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.mode) {
      cancel(); s.mode = button.dataset.mode; feedback = false;
      view = { kind: 'welcome' };
      if (s.mode === 'ask') { const q = R.question(s); if (q) { ask(q); return; } }
      render(); return;
    }
    if (button.dataset.source || button.dataset.medium) {
      cancel(); if (button.dataset.source) s.intent.source = button.dataset.source; else s.intent.mediaType = button.dataset.medium;
      view = { kind: 'welcome' }; feedback = false; render(); return;
    }
    if (button.dataset.remove) { R.remove(s, button.dataset.remove, button.dataset.value); renderContext(); B.icons(); return; }
    if (button.dataset.answer) { run(button.dataset.answer); return; }
    switch (button.dataset.rec) {
      case 'reset': cancel(); s = R.session(s.intent.source, 'any'); view = { kind: 'welcome' }; lastRequest = ''; feedback = false; open(); break;
      case 'any-type': s.intent.mediaType = 'any'; render(); break;
      case 'pick': run('Surprise me', true); break;
      case 'another': run('Another', true); break;
      case 'reject': R.reject(s); feedback = true; view = { kind: 'feedback' }; render(); root.querySelector('#recInput').focus({ preventScroll: true }); break;
      case 'retry': { const text = root.querySelector('#recInput').value.trim(); if (text) run(text); else { cancel(); controller = new AbortController(); findPick(pending); } break; }
      case 'basic': enabled = false; root.querySelector('#recAI').checked = false; updateEngine(); { const text = root.querySelector('#recInput').value.trim(); if (text) run(text); else { cancel(); controller = new AbortController(); findPick(pending); } } break;
      case 'relax': view = { kind: 'question', question: { text: 'Which preference would you like to loosen?', chips: [] } }; render(); root.querySelector('.rec-main p').textContent = 'Remove a preference above, then send a revised request. Your other preferences stay in place.'; root.querySelector('.rec-context button')?.focus(); break;
      case 'change': view = { kind: 'welcome' }; render(); root.querySelector('#recInput').focus(); break;
      case 'discover': s.intent.source = 'discover'; run('Another', true); break;
      case 'details': s.acceptedItemId = s.current.recId; cancel(); B.details(s.current); break;
      case 'add': { s.acceptedItemId = s.current.recId; const existing = B.find(s.current); if (existing) { cancel(); B.details(existing); } else { B.add(s.current); render(); } break; }
      case 'seen': {
        const current = s.current, ticket = pending; button.disabled = true;
        try { await B.seen(current); if (!alive(ticket)) return; R.reject(s); run('Another', true); }
        catch { button.disabled = false; B.toast('Could not update this title. Please try again.'); }
        break;
      }
    }
  }
  window.ReelRecommendationUI = { open, close: cancel };
})();
