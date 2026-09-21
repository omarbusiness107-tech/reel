/* Pick 4 me is a temporary mini-app. Conversation text is never written to localStorage. */
(function () {
  'use strict';
  const R = window.ReelRecommendations, B = window.reelRecommendationBridge;
  if (!R || !B) return;

  const esc = B.escape;
  const cache = new Map();
  const sourceNames = { mix: 'Mix', library: 'My List', discover: 'Discover' };
  const mediaChoices = { any: 'All formats', movie: 'Movies', series: 'Series', anime: 'Anime', book: 'Books', manga: 'Manga', manhwa: 'Manhwa' };
  const typeLabels = { movie: 'Movie', series: 'Series', anime: 'Anime', book: 'Book', manga: 'Manga', manhwa: 'Manhwa' };
  const initialPrompts = [
    ['Make me laugh', 'Something intense', 'A hidden gem', 'Surprise me'],
    ['American animation', 'Dark medieval fantasy', 'A family movie', 'Short psychological anime'],
    ['Johnny Depp', 'Rain, Japan, loneliness', 'Deep but not depressing', 'Like Interstellar, simpler']
  ];
  const seedTitles = {
    movie: {
      firearms: ['John Wick', 'Heat', 'Sicario', 'Lord of War', 'Collateral', 'The Town', 'Hard Boiled', 'The Killer'],
      animated: ['Spider-Man: Into the Spider-Verse', 'The Mitchells vs. the Machines', 'The Incredibles', 'The Lego Movie', 'Kubo and the Two Strings', 'Ratatouille'],
      organized: ['Heat', 'The Godfather', 'Goodfellas', 'The Departed', 'The Irishman', 'American Gangster'],
      medieval: ['Kingdom of Heaven', 'The Green Knight', 'A Knight’s Tale', 'The Last Duel', 'Excalibur'],
      cyberpunk: ['Blade Runner 2049', 'Ghost in the Shell', 'Upgrade', 'Alita: Battle Angel', 'Akira'],
      morocco: ['The Blue Caftan', 'The Unknown Saint', 'Ali Zaoua', 'Horses of God', 'Adam'],
      japan: ['Perfect Days', 'Lost in Translation', 'Shoplifters', 'Drive My Car', 'After the Storm'],
      family: ['Paddington 2', 'The Mitchells vs. the Machines', 'The Princess Bride', 'Kiki’s Delivery Service', 'Ratatouille'],
      thoughtful: ['Arrival', 'Contact', 'After Yang', 'Her', 'Moon', 'Ex Machina'],
      funny: ['Game Night', 'Palm Springs', 'Hunt for the Wilderpeople', 'The Nice Guys', 'Paddington 2'],
      johnnydepp: ['Pirates of the Caribbean: The Curse of the Black Pearl', 'Edward Scissorhands', 'Finding Neverland', 'Sweeney Todd', 'Donnie Brasco'],
      christophernolan: ['The Prestige', 'Inception', 'Memento', 'Dunkirk', 'The Dark Knight', 'Oppenheimer'],
      interstellar: ['The Martian', 'Contact', 'Arrival', 'Moon', 'Sunshine'],
      default: ['The Truman Show', 'Spirited Away', 'Parasite', 'Little Women', 'The Holdovers', 'Dune']
    },
    series: {
      firearms: ['The Wire', 'Justified', 'Gomorrah', 'Narcos', 'Mr Inbetween'], organized: ['The Sopranos', 'The Wire', 'Gomorrah', 'Narcos'],
      funny: ['The Good Place', 'Brooklyn Nine-Nine', 'Derry Girls'], thoughtful: ['Severance', 'The Leftovers', 'Dark'],
      comforting: ['Detectorists', 'Ted Lasso', 'Somebody Somewhere'], medieval: ['The Last Kingdom', 'Vikings', 'Wolf Hall'],
      family: ['Avatar: The Last Airbender', 'A Series of Unfortunate Events'], cyberpunk: ['Altered Carbon', 'Cyberpunk: Edgerunners', 'Pantheon'],
      default: ['Detectorists', 'Severance', 'The Bear', 'Slow Horses', 'Dark']
    },
    anime: {
      psychological: ['Paranoia Agent', 'Serial Experiments Lain', 'Ergo Proxy', 'Perfect Blue', 'Paprika', 'Odd Taxi'],
      firearms: ['Black Lagoon', 'Trigun', 'Cowboy Bebop', 'Jormungand', 'Ghost in the Shell: Stand Alone Complex'],
      thoughtful: ['Serial Experiments Lain', 'Paranoia Agent', 'Monster', 'Sonny Boy'], comforting: ['Barakamon', 'Natsume Yuujinchou', 'Laid-Back Camp'],
      atmospheric: ['Mushishi', 'Ergo Proxy', 'Mononoke', 'Haibane Renmei'], family: ['Spy x Family', 'Little Witch Academia'],
      cyberpunk: ['Cyberpunk: Edgerunners', 'Ghost in the Shell', 'Akira', 'Psycho-Pass'], default: ['Mushishi', 'Cowboy Bebop', 'Frieren', 'Odd Taxi', 'Pluto']
    },
    book: { firearms: ['The Power of the Dog', 'The Cartel', 'No Country for Old Men'], thoughtful: ['The Dispossessed', 'Piranesi', 'Never Let Me Go'], comforting: ['A Psalm for the Wild-Built', 'Legends and Lattes'], atmospheric: ['Piranesi', 'The Shadow of the Wind'], medieval: ['The Name of the Rose', 'The Pillars of the Earth'], cyberpunk: ['Neuromancer', 'Snow Crash', 'Altered Carbon'], default: ['A Wizard of Earthsea', 'The Hobbit', 'Piranesi', 'Kindred'] },
    manga: { firearms: ['Gunsmith Cats', 'Black Lagoon', 'Jormungand'], psychological: ['Monster', 'Pluto', 'Homunculus'], comforting: ['Yokohama Kaidashi Kikou', 'Aria'], thoughtful: ['Mushishi', 'Pluto', 'Land of the Lustrous'], default: ['Yokohama Kaidashi Kikou', 'Mushishi', 'Vagabond'] },
    manhwa: { firearms: ['Mercenary Enrollment', 'Manager Kim'], psychological: ['The Horizon', 'Bastard'], thoughtful: ['The Horizon', 'Annarasumanara'], default: ['Solo Leveling', 'Tower of God', 'Omniscient Reader', 'The Boxer'] }
  };

  let s = R.session('mix'), root, pending = 0, controller, busy = false, enabled = true, configured = false;
  let view = { kind: 'welcome' }, messages = [], history = [], activeGroupId = '', activeIndex = 0;
  let lastRequest = '', lastRequestMessageId = '', messageSequence = 0, groupSequence = 0, promptPage = 0;
  let surpriseFlavor = 'balanced', serviceMessage = '', mobilePane = 'chat', scrollLatest = false;
  let detailsReturnView = null;

  const icon = (name, size = 16) => B.icon(name, size);
  const safeUrl = value => { try { const url = new URL(value, location.href); return ['https:', 'http:'].includes(url.protocol) || (url.protocol === 'file:' && String(value).startsWith('assets/')) ? url.href : ''; } catch { return ''; } };
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const alive = ticket => ticket === pending && root?.isConnected && document.querySelector('#modal')?.classList.contains('on');
  const wait = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
  const btn = (action, text, primary = false, glyph = '') => `<button type="button" class="btn ${primary ? 'primary' : 'ghost'}" data-rec="${action}">${glyph ? icon(glyph) : ''}<span>${esc(text)}</span></button>`;
  const chip = text => `<button type="button" class="rec-chip" data-answer="${esc(text)}">${esc(text)}</button>`;
  function cancel() { pending++; controller?.abort(); busy = false; }
  function uid(prefix) { return `${prefix}-${Date.now().toString(36)}-${(++messageSequence).toString(36)}`; }
  function activeGroup() { return history.find(group => group.id === activeGroupId) || null; }
  function activeRecord() { return activeGroup()?.items[activeIndex] || null; }
  function remember(role, text, options = {}) {
    const id = options.id || uid(role === 'user' ? 'user' : 'reel');
    const existing = messages.find(message => message.id === id);
    if (existing) return existing;
    const message = { id, role, text: String(text || '').slice(0, 1200), groupIds: [], kind: options.kind || '' };
    messages.push(message); messages = messages.slice(-40); scrollLatest = true; return message;
  }
  function linkMessage(messageId, groupId) {
    const message = messages.find(item => item.id === messageId);
    if (message && !message.groupIds.includes(groupId)) message.groupIds.push(groupId);
  }
  function resetMode(mode = 'pick', { source = 'mix', mediaType = 'any' } = {}) {
    const ratings = s?.useRatings || false;
    s = R.session(source, mediaType); s.mode = mode; s.useRatings = ratings;
    view = { kind: 'welcome' }; messages = []; history = []; activeGroupId = ''; activeIndex = 0;
    lastRequest = ''; lastRequestMessageId = ''; serviceMessage = ''; surpriseFlavor = 'balanced'; mobilePane = mode === 'pick' ? 'chat' : 'pick'; scrollLatest = false; detailsReturnView = null;
    if (mode === 'pick') remember('assistant', 'Tell me what you want to watch or read. Give me a mood, person, place, theme, or all of them.', { id: 'reel-welcome' });
  }
  function statusCopy() {
    if (!enabled) return 'Local matching';
    if (location.protocol === 'file:') return 'Local matching';
    if (!configured) return 'Local matching';
    if (!B.signedIn()) return 'Sign in for live AI';
    return 'Live AI';
  }
  const useAI = () => enabled && configured && B.signedIn() && location.protocol !== 'file:';
  async function api(action, payload) {
    const token = await B.token(); if (!token) throw new Error('AI sign-in is unavailable.');
    const response = await fetch('/api/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ action, ...payload }), signal: controller.signal });
    let data; try { data = await response.json(); } catch { throw new Error('Unreadable AI response.'); }
    if (!response.ok) throw new Error(data.error || 'AI request failed.'); return data;
  }

  function shellMarkup() {
    return `<div class="rec-shell" data-current-mode="${s.mode}" data-mobile-pane="${mobilePane}">
      <header class="rec-head"><div><span class="rec-kicker">Reel decision room</span><h3>Pick 4 me</h3></div><div class="rec-head-actions"><button class="btn sm ghost" data-rec="reset" type="button">${icon('rotate-ccw')}<span>Start over</span></button><button class="btn sm ghost" data-close type="button" aria-label="Close Pick 4 me" title="Close">${icon('x')}<span class="sr-only">Close</span></button></div></header>
      <div class="rec-mobile-tabs" role="tablist" aria-label="Pick 4 me panels"><button type="button" data-pane="chat" aria-selected="${mobilePane === 'chat'}">${icon('message-circle')} Chat</button><button type="button" data-pane="pick" aria-selected="${mobilePane === 'pick'}">${icon('clapperboard')} Pick</button></div>
      <div class="rec-workspace">
        <section class="rec-left" aria-label="Recommendation workspace"><div class="rec-left-main" aria-live="polite"></div><div class="rec-history-wrap"><div class="rec-section-head"><h4>Session history</h4><span>${history.reduce((sum, group) => sum + group.items.length, 0)} shown</span></div><div class="rec-history" aria-label="Recommendation history"></div></div></section>
        <section class="rec-right" aria-label="Conversation workspace">
          <div class="rec-right-head"><div class="rec-modes" role="tablist" aria-label="Recommendation mode"><button type="button" role="tab" data-mode="pick" aria-selected="${s.mode === 'pick'}">${icon('messages-square')}<span>Pick 4 me</span></button><button type="button" role="tab" data-mode="surprise" aria-selected="${s.mode === 'surprise'}">${icon('shuffle')}<span>Surprise me</span></button></div>${controlsMarkup()}</div>
          <div class="rec-context" aria-label="Current preferences"></div>
          <div class="rec-chat" aria-live="polite"></div>
          <div class="rec-suggestions"></div>
          <form class="rec-form"><label class="sr-only" for="recInput">Message Reel</label><div class="rec-composer"><textarea id="recInput" maxlength="1200" rows="2" placeholder="Try: funny American animation for my family"></textarea><button class="btn primary" type="submit" aria-label="Send to Reel">${icon('arrow-up')}<span>Send</span></button></div></form>
        </section>
      </div>
    </div>`;
  }
  function controlsMarkup() {
    return `<div class="rec-compact-controls">
      <div class="rec-source" role="group" aria-label="Search source">${Object.entries(sourceNames).map(([key, label]) => `<button type="button" data-source="${key}" aria-pressed="${s.intent.source === key}">${label}</button>`).join('')}</div>
      <label class="rec-select"><span class="sr-only">Media format</span><select id="recMedia">${Object.entries(mediaChoices).map(([key, label]) => `<option value="${key}" ${s.intent.mediaType === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
      <div class="rec-output" role="group" aria-label="Number of recommendations"><button type="button" data-output="one" aria-pressed="${s.intent.resultCount === 1}">One</button><button type="button" data-output="list" aria-pressed="${s.intent.resultCount > 1}">List</button></div>
      <label class="rec-select rec-count" ${s.intent.resultCount > 1 ? '' : 'hidden'}><span class="sr-only">List size</span><select id="recCount">${[3, 5, 10].map(count => `<option value="${count}" ${s.intent.resultCount === count ? 'selected' : ''}>${count}</option>`).join('')}</select></label>
      <details class="rec-preferences"><summary aria-label="Preferences and privacy" title="Preferences and privacy">${icon('sliders-horizontal')}<span class="sr-only">Preferences and privacy</span></summary><div class="rec-popover"><strong>Preferences</strong><label><input type="checkbox" id="recAI" ${enabled ? 'checked' : ''}> Use AI when available</label><label><input type="checkbox" id="recRatings" ${s.useRatings ? 'checked' : ''}> Use genres I rate highly</label><p><span class="rec-engine-dot"></span><span id="recEngine">${esc(statusCopy())}</span></p><small>Live AI receives your request and shortlisted public title facts. Notes and full library history stay private.</small>${enabled && configured && !B.signedIn() && location.protocol !== 'file:' ? `<button type="button" data-rec="signin">Sign in</button>` : ''}</div></details>
    </div>`;
  }

  function renderContext() {
    const labels = { currentMood: 'Feeling', desiredMood: 'Mood', themes: 'Theme', genres: 'Genre', people: 'Person', origins: 'Origin', settings: 'Place', eras: 'Era', semanticTraits: 'Style', similarTo: 'Like', keywords: 'Idea', include: 'Include', exclude: 'Avoid', audience: 'Audience' };
    const chips = R.arrays.flatMap(field => s.intent[field].map(value => `<button type="button" data-remove="${field}" data-value="${esc(value)}" aria-label="Remove ${esc(labels[field] + ': ' + value)}"><span>${labels[field]}:</span> ${esc(value)} ${icon('x', 11)}</button>`));
    if (s.intent.maxRuntime) chips.push(`<button type="button" data-remove="maxRuntime" aria-label="Remove length preference">Under ${s.intent.maxRuntime} min ${icon('x', 11)}</button>`);
    if (s.intent.maxPages) chips.push(`<button type="button" data-remove="maxPages" aria-label="Remove page preference">Under ${s.intent.maxPages} pages ${icon('x', 11)}</button>`);
    if (s.intent.contentSafety === 'kid_friendly') chips.push(`<button type="button" data-remove="contentSafety" aria-label="Remove family preference">Family${s.intent.childAge ? `, age ${s.intent.childAge}` : ''} ${icon('x', 11)}</button>`);
    root.querySelector('.rec-context').innerHTML = chips.length ? `<span class="rec-context-label">Based on</span>${chips.join('')}` : '';
  }
  function turnMarkup(message) {
    const linked = message.groupIds.length > 0, selected = linked && message.groupIds.includes(activeGroupId);
    const tag = linked ? 'button' : 'div';
    return `<${tag} ${linked ? `type="button" data-message="${message.id}" aria-pressed="${selected}" title="Show recommendations from this message"` : ''} class="rec-turn ${message.role}${selected ? ' selected' : ''}"><span>${message.role === 'assistant' ? `${icon('sparkles', 12)} Reel` : 'You'}</span><p>${esc(message.text)}</p>${linked ? `<small>${icon('corner-left-up', 11)} Show related ${message.groupIds.length > 1 ? 'picks' : 'pick'}</small>` : ''}</${tag}>`;
  }
  function chatMarkup() {
    if (s.mode === 'surprise') return `<div class="rec-surprise-chat"><div class="rec-surprise-mark">${icon('clapperboard', 30)}${icon('sparkles', 18)}</div><h2>Feeling lucky?</h2><p>One strong pick. No overthinking.</p><div class="rec-surprise-tune" role="group" aria-label="Surprise style"><button type="button" data-flavor="balanced" aria-pressed="${surpriseFlavor === 'balanced'}">Safe pick</button><button type="button" data-flavor="weird" aria-pressed="${surpriseFlavor === 'weird'}">Go unusual</button></div>${btn('surprise', activeGroupId ? 'Surprise me again' : 'Surprise me', true, 'shuffle')}</div>`;
    return `<div class="rec-chat-turns">${messages.map(turnMarkup).join('')}${busy ? `<div class="rec-turn assistant thinking"><span>${icon('sparkles', 12)} Reel</span><p><i></i><i></i><i></i><b>Finding something that fits all of that</b></p></div>` : ''}</div>`;
  }
  function suggestionsMarkup() {
    if (s.mode !== 'pick' || busy) return '';
    const question = view.kind === 'question' ? view.question : null;
    const options = question?.chips || (history.length ? ['Another pick', 'Make it shorter', 'Go more unusual'] : initialPrompts[promptPage % initialPrompts.length]);
    return `<div class="rec-suggestion-row"><div class="rec-chips">${options.map(chip).join('')}</div><button type="button" class="rec-refresh" data-rec="refresh-suggestions" aria-label="Refresh suggested replies" title="Refresh suggested replies">${icon('refresh-cw')}</button></div>`;
  }
  function historyMarkup() {
    const items = history.flatMap(group => group.items.map((record, index) => ({ group, record, index }))).slice().reverse();
    if (!items.length) return `<p class="rec-history-empty">Your picks will collect here for this session.</p>`;
    return items.map(({ group, record, index }) => {
      const cover = safeUrl(record.candidate.cover), active = group.id === activeGroupId && index === activeIndex;
      return `<button type="button" class="rec-history-item" data-group="${group.id}" data-index="${index}" aria-current="${active ? 'true' : 'false'}">${cover ? `<img src="${esc(cover)}" alt="">` : `<span class="rec-history-fallback">${icon('image-off', 14)}</span>`}<span><strong>${esc(record.candidate.title)}</strong><small>${esc(typeLabels[record.candidate.type] || record.candidate.type)}</small></span></button>`;
    }).join('');
  }
  function ratingMarkup(candidate) {
    const saved = B.find(candidate), rating = saved?.rating || candidate.score;
    if (!rating) return '';
    return `<div class="rec-score" aria-label="${saved?.rating ? 'Your rating' : candidate.ratingSource || 'Community rating'} ${Number(rating).toFixed(1)} out of 10"><strong>${Number(rating).toFixed(1)}</strong><span>/10</span></div>`;
  }
  function factMarkup(candidate) {
    const creatorLabel = candidate.type === 'book' ? 'Author' : candidate.type === 'movie' ? 'Director' : 'Creator';
    const facts = [['Length', B.runtime(candidate)], [creatorLabel, candidate.creator], ['Age', candidate.ageRating], ['Origin', candidate.country]].filter(([, value]) => value);
    return `<dl class="rec-facts">${facts.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`;
  }
  function resultMarkup() {
    const record = activeRecord(); if (!record) return emptyMarkup();
    const candidate = record.candidate, cover = safeUrl(candidate.cover), saved = B.find(candidate), group = activeGroup();
    return `<article class="rec-result" data-active-rec="${esc(candidate.recId)}">
      <div class="rec-art">${cover ? `<img src="${esc(cover)}" alt="${esc(candidate.title)} cover">` : `<div class="rec-no-cover">${icon('image-off', 24)}<span>Cover unavailable</span></div>`}<span class="rec-source-badge">${saved ? 'In your library' : esc(candidate.sourceName || 'Discover')}</span></div>
      <div class="rec-result-copy"><div class="rec-result-top"><div><span class="rec-result-label">${group?.items.length > 1 ? `${activeIndex + 1} of ${group.items.length} picks` : 'Reel’s pick'}</span><h2>${esc(candidate.title)}</h2><p class="rec-meta">${[typeLabels[candidate.type], candidate.year, ...(candidate.genres || []).slice(0, 3)].filter(Boolean).map(esc).join(' · ')}</p></div>${ratingMarkup(candidate)}</div>
      ${factMarkup(candidate)}
      <div class="rec-why"><span>${icon('sparkles', 13)} Why Reel picked it</span><p>${esc(record.why)}</p>${candidate.tradeoffs?.length ? `<small>Closest match: ${esc(candidate.tradeoffs[0])}.</small>` : ''}${serviceMessage ? `<small>${esc(serviceMessage)}</small>` : ''}</div>
      <div class="rec-actions">${btn('details', 'Details', false, 'arrow-up-right')}${btn('add', saved ? 'In my library' : 'Save', !saved, saved ? 'library' : 'bookmark-plus')}${btn('another', group?.items.length > 1 ? 'New list' : 'Another pick', false, 'refresh-cw')}</div>
      <div class="rec-secondary"><button type="button" data-rec="reject">Not this</button><button type="button" data-rec="seen">${['book', 'manga', 'manhwa'].includes(candidate.type) ? 'Already read' : 'Already watched'}</button></div></div>
      ${group?.items.length > 1 ? `<div class="rec-list" aria-label="Recommendations in this list">${group.items.map((item, index) => `<button type="button" data-group="${group.id}" data-index="${index}" aria-current="${index === activeIndex}">${safeUrl(item.candidate.cover) ? `<img src="${esc(safeUrl(item.candidate.cover))}" alt="">` : icon('image-off', 14)}<span><b>${index + 1}. ${esc(item.candidate.title)}</b><small>${esc(item.why)}</small></span></button>`).join('')}</div>` : ''}
    </article>`;
  }
  function emptyMarkup() {
    if (view.kind === 'busy') return `<div class="rec-loading" role="status"><div class="rec-poster-skeleton"></div><div><span></span><span></span><span></span><p>${esc(view.message || 'Looking for a strong match')}</p></div></div>`;
    if (view.kind === 'error' || view.kind === 'empty') return `<div class="rec-empty rec-problem">${icon(view.kind === 'error' ? 'cloud-off' : 'search-x', 28)}<h2>${view.kind === 'error' ? 'Reel could not finish that pick' : 'No strong unused match'}</h2><p>${esc(view.message)}</p><div>${btn('retry', 'Try again', true, 'rotate-ccw')}${s.intent.source === 'library' ? btn('discover', 'Try Discover') : ''}</div></div>`;
    const covers = B.library().filter(item => item.cover).slice(0, 3);
    return `<div class="rec-empty"><div class="rec-empty-art" aria-hidden="true">${covers.map((item, index) => `<img src="${esc(safeUrl(item.cover))}" alt="" style="--i:${index}">`).join('') || `${icon('clapperboard', 34)}${icon('book-open', 25)}`}</div><h2>Your next pick starts here</h2><p>Describe what you want, or choose one of Reel’s prompts.</p></div>`;
  }

  function render() {
    if (!root?.isConnected) return;
    const previousScroll = {};
    for (const selector of ['.rec-chat', '.rec-left-main', '.rec-history', '.rec-list']) {
      const region = root.querySelector(selector); if (region) previousScroll[selector] = { top: region.scrollTop, left: region.scrollLeft };
    }
    const shell = root.querySelector('.rec-shell'); shell.dataset.currentMode = s.mode; shell.dataset.mobilePane = mobilePane;
    root.querySelectorAll('[data-source]').forEach(button => button.setAttribute('aria-pressed', button.dataset.source === s.intent.source));
    root.querySelectorAll('[data-output]').forEach(button => button.setAttribute('aria-pressed', button.dataset.output === (s.intent.resultCount > 1 ? 'list' : 'one')));
    const media = root.querySelector('#recMedia'); if (media) { media.value = s.intent.mediaType; media.dispatchEvent(new Event('change', { bubbles: false })); }
    const count = root.querySelector('#recCount'); if (count) { count.closest('.rec-count').hidden = s.intent.resultCount === 1; count.value = [3, 5, 10].includes(s.intent.resultCount) ? String(s.intent.resultCount) : '5'; count.dispatchEvent(new Event('change', { bubbles: false })); }
    const ai = root.querySelector('#recAI'); if (ai) ai.checked = enabled;
    const ratings = root.querySelector('#recRatings'); if (ratings) ratings.checked = s.useRatings;
    const engine = root.querySelector('#recEngine'); if (engine) engine.textContent = statusCopy();
    root.querySelector('.rec-left-main').innerHTML = activeRecord() ? resultMarkup() : emptyMarkup();
    root.querySelector('.rec-history').innerHTML = historyMarkup();
    root.querySelector('.rec-history-wrap .rec-section-head span').textContent = `${history.reduce((sum, group) => sum + group.items.length, 0)} shown`;
    root.querySelector('.rec-chat').innerHTML = chatMarkup();
    root.querySelector('.rec-suggestions').innerHTML = suggestionsMarkup();
    renderContext();
    const form = root.querySelector('.rec-form'); form.hidden = s.mode === 'surprise';
    const input = root.querySelector('#recInput'); input.disabled = busy; form.querySelector('button').disabled = busy;
    root.querySelectorAll('[data-mode]').forEach(button => { const selected = button.dataset.mode === s.mode; button.setAttribute('aria-selected', selected); button.setAttribute('aria-pressed', selected); button.tabIndex = selected ? 0 : -1; });
    root.querySelectorAll('[data-pane]').forEach(button => { const selected = button.dataset.pane === mobilePane; button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', selected); button.tabIndex = selected ? 0 : -1; });
    root.querySelectorAll('.rec-left button,.rec-context button,.rec-suggestions button').forEach(button => { if (busy) button.disabled = true; });
    for (const [selector, position] of Object.entries(previousScroll)) {
      if (selector === '.rec-chat' && scrollLatest) continue;
      const region = root.querySelector(selector); if (region) { region.scrollTop = position.top; region.scrollLeft = position.left; }
    }
    B.icons();
    if (scrollLatest) requestAnimationFrame(() => { const chat = root.querySelector('.rec-chat'); chat?.scrollTo({ top: chat.scrollHeight, behavior: reducedMotion() ? 'auto' : 'smooth' }); scrollLatest = false; });
  }

  function open(options = {}) {
    cancel();
    if (!options.resume) { promptPage = (promptPage + 1) % initialPrompts.length; resetMode('pick'); }
    else if (view.kind === 'busy') view = activeRecord() ? { kind: 'result' } : { kind: 'welcome' };
    B.show(shellMarkup(), element => {
      root = element; render(); root.onclick = click;
      root.querySelector('.rec-form').onsubmit = event => { event.preventDefault(); submit(); };
      root.querySelector('#recInput').onkeydown = event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submit(); } };
      root.onchange = change;
      root.onkeydown = event => {
        const tab = event.target.closest('[role="tab"]'); if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        const tabs = [...tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')];
        const index = tabs.indexOf(tab), next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
        event.preventDefault(); tabs[next].click(); tabs[next].focus({ preventScroll: true });
      };
      if (options.resume && detailsReturnView) {
        root.querySelector('#recInput').value = detailsReturnView.draft;
        for (const [selector, position] of Object.entries(detailsReturnView.positions)) {
          const region = root.querySelector(selector); if (region) { region.scrollTop = position.top; region.scrollLeft = position.left; }
        }
      }
    });
    if (location.protocol !== 'file:') fetch('/api/recommend', { signal: AbortSignal.timeout(5000) }).then(response => response.ok ? response.json() : null).then(data => { configured = !!data?.configured; if (root?.isConnected) render(); }).catch(() => { configured = false; if (root?.isConnected) render(); });
  }

  function change(event) {
    if (!['recMedia', 'recCount', 'recAI', 'recRatings'].includes(event.target.id)) return;
    if (busy) { cancel(); clearActive(); }
    if (event.target.id === 'recMedia') { s.intent.mediaType = event.target.value; clearActive(); }
    if (event.target.id === 'recCount') s.intent.resultCount = Number(event.target.value);
    if (event.target.id === 'recAI') enabled = event.target.checked;
    if (event.target.id === 'recRatings') s.useRatings = event.target.checked;
    render();
  }
  function clearActive() { activeGroupId = ''; activeIndex = 0; s.current = null; view = { kind: 'welcome' }; }
  function submit() {
    if (busy || s.mode !== 'pick') return;
    const input = root.querySelector('#recInput'), text = input.value.trim(); if (!text) return input.focus();
    input.value = ''; run(text);
  }
  function rememberDetailsView() {
    detailsReturnView = { draft: root.querySelector('#recInput').value, positions: {} };
    for (const selector of ['.rec-chat', '.rec-left-main', '.rec-history', '.rec-list']) {
      const region = root.querySelector(selector); if (region) detailsReturnView.positions[selector] = { top: region.scrollTop, left: region.scrollLeft };
    }
  }
  function selectGroup(groupId, index = 0, focus = false) {
    const group = history.find(item => item.id === groupId); if (!group) return;
    activeGroupId = groupId; activeIndex = Math.max(0, Math.min(index, group.items.length - 1)); s.current = group.items[activeIndex].candidate; view = { kind: 'result' }; mobilePane = 'pick'; render();
    if (focus) requestAnimationFrame(() => root.querySelector('.rec-result h2')?.focus({ preventScroll: true }));
  }
  function animateRefresh(button) {
    const glyph = button?.querySelector('.lucide'); if (!glyph?.animate || reducedMotion()) return;
    glyph.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 320, easing: 'cubic-bezier(.23,1,.32,1)' });
  }
  async function click(event) {
    const button = event.target.closest('button'); if (!button) return;
    if (button.dataset.pane) { mobilePane = button.dataset.pane; render(); return; }
    if (button.dataset.mode) {
      if (button.dataset.mode === s.mode) return;
      const source = s.intent.source, mediaType = s.intent.mediaType;
      cancel(); resetMode(button.dataset.mode, { source, mediaType }); render(); return;
    }
    if (button.dataset.source) { cancel(); s.intent.source = button.dataset.source; clearActive(); render(); return; }
    if (button.dataset.output) { if (busy) { cancel(); clearActive(); } s.intent.resultCount = button.dataset.output === 'one' ? 1 : 5; render(); return; }
    if (button.dataset.flavor) { surpriseFlavor = button.dataset.flavor; render(); return; }
    if (button.dataset.remove) { R.remove(s, button.dataset.remove, button.dataset.value); clearActive(); render(); return; }
    if (button.dataset.answer) { run(button.dataset.answer); return; }
    if (button.dataset.group) { selectGroup(button.dataset.group, Number(button.dataset.index || 0), true); return; }
    if (button.dataset.message) { const message = messages.find(item => item.id === button.dataset.message); const groupId = message?.groupIds.at(-1); if (groupId) selectGroup(groupId, 0, true); return; }
    switch (button.dataset.rec) {
      case 'reset': { const mode = s.mode; cancel(); resetMode(mode); render(); break; }
      case 'refresh-suggestions': {
        animateRefresh(button);
        if (view.kind === 'question') view.question = R.refreshQuestion(s, view.question);
        else promptPage = (promptPage + 1) % initialPrompts.length;
        render(); break;
      }
      case 'surprise': animateRefresh(button); run('Surprise me', { force: true }); break;
      case 'another': animateRefresh(button); run('Another', { force: true, messageId: activeGroup()?.messageId || lastRequestMessageId }); break;
      case 'retry': run(lastRequest || 'Surprise me', { force: true, messageId: lastRequestMessageId }); break;
      case 'discover': s.intent.source = 'discover'; clearActive(); render(); break;
      case 'signin': B.settings(); break;
      case 'details': { const record = activeRecord(); if (record) { s.acceptedItemId = record.candidate.recId; rememberDetailsView(); cancel(); B.details(record.candidate, { origin: 'picker' }); } break; }
      case 'add': { const record = activeRecord(); if (!record) break; const existing = B.find(record.candidate); if (existing) { rememberDetailsView(); cancel(); B.details(existing, { origin: 'picker' }); } else { B.add(record.candidate); render(); } break; }
      case 'reject': { const record = activeRecord(); if (!record) break; if (!s.rejected.includes(record.candidate.recId)) s.rejected.push(record.candidate.recId); run('Another', { force: true, messageId: activeGroup()?.messageId || lastRequestMessageId }); break; }
      case 'seen': {
        const record = activeRecord(); if (!record) break; button.disabled = true;
        try { await B.seen(record.candidate); if (root?.isConnected) run('Another', { force: true, messageId: activeGroup()?.messageId || lastRequestMessageId }); }
        catch (error) { console.error('[Pick 4 me seen]', error); button.disabled = false; B.toast('Could not update this title. Please try again.'); }
        break;
      }
    }
  }

  function searchKey() {
    if (s.intent.people.some(value => /johnny depp/i.test(value))) return 'johnnydepp';
    if (s.intent.people.some(value => /christopher nolan/i.test(value))) return 'christophernolan';
    if (s.intent.similarTo.some(value => /interstellar/i.test(value))) return 'interstellar';
    if (s.intent.themes.some(value => /firearms/i.test(value))) return 'firearms';
    if (s.intent.themes.some(value => /organized crime/i.test(value))) return 'organized';
    if (s.intent.semanticTraits.some(value => /animated/i.test(value))) return 'animated';
    if (s.intent.settings.some(value => /cyberpunk/i.test(value))) return 'cyberpunk';
    if (s.intent.settings.some(value => /morocco/i.test(value))) return 'morocco';
    if (s.intent.settings.some(value => /japan/i.test(value))) return 'japan';
    if (s.intent.eras.some(value => /medieval/i.test(value))) return 'medieval';
    if (s.intent.context === 'family') return 'family';
    if (s.intent.genres.some(value => /psychological/i.test(value))) return 'psychological';
    return [...s.intent.desiredMood, ...s.intent.themes, ...s.intent.semanticTraits].map(value => value.toLowerCase()).find(value => Object.values(seedTitles).some(group => group[value])) || 'default';
  }
  function searchJobs() {
    const allowed = R.mediaTypes(s.intent);
    const hints = s.searchHints.filter(hint => allowed.includes(hint.type));
    const key = searchKey(), jobs = [...hints];
    for (const type of allowed) {
      const titles = seedTitles[type][key] || seedTitles[type].default;
      for (const title of titles) jobs.push({ title, type });
    }
    const unique = new Map(); for (const job of jobs) unique.set(`${job.type}:${job.title.toLowerCase()}`, job);
    return [...unique.values()].slice(0, s.intent.resultCount > 1 ? 24 : 14);
  }
  async function retrieve(ticket) {
    const library = B.library().map(value => R.candidate(value, true)); if (s.intent.source === 'library') return { candidates: library, failed: 0 };
    let failed = 0;
    const results = await Promise.all(searchJobs().map(async job => {
      const key = `${job.type}:${job.title}`; if (cache.has(key)) return cache.get(key);
      try { const records = await B.search(job.title, job.type, 5); if (alive(ticket)) cache.set(key, records); return records; }
      catch (error) { console.warn('[Pick 4 me catalog]', job, error); failed++; return []; }
    }));
    if (!alive(ticket)) return { candidates: [], failed };
    const external = results.flat().map(value => { const saved = B.find(value); return saved ? R.candidate({ ...value, ...saved }, true) : R.candidate(value); });
    const needingFacts = external.filter(value => !value.inLibrary && ((s.intent.maxRuntime && !value.runtime) || (s.intent.contentSafety === 'kid_friendly' && !value.ageRating) || !value.genres.length)).slice(0, 12);
    await Promise.all(needingFacts.map(value => B.enrich(value).catch(() => value)));
    return { candidates: s.intent.source === 'mix' ? [...library, ...external] : external, failed };
  }

  async function run(text, options = {}) {
    cancel(); controller = new AbortController(); const ticket = pending;
    const force = !!options.force, message = String(text || '').replaceAll('’', "'");
    const snapshot = structuredClone(s); let messageId = options.messageId || '';
    if (s.mode === 'pick' && !force) { const user = remember('user', message); messageId = user.id; lastRequestMessageId = messageId; lastRequest = message; }
    if (!messageId) messageId = lastRequestMessageId;
    clearActive(); serviceMessage = ''; busy = true; view = { kind: 'busy', message: s.mode === 'surprise' ? 'Shuffling your next pick' : 'Looking for a strong match' }; render();
    try {
      if (s.mode === 'surprise' && surpriseFlavor === 'weird') R.patch(s, { semanticTraits: ['unusual'] });
      if (!/^(another|surprise me)$/i.test(message.trim())) R.interpret(s, message);
      let aiQuestion = null;
      if (useAI() && !force && s.mode === 'pick') {
        const resetDirection = R.isDirectionReset(message);
        const data = await api('interpret', { message, intent: resetDirection ? s.intent : snapshot.intent, answers: resetDirection ? [] : snapshot.answers, questions: resetDirection ? [] : snapshot.questions, shown: snapshot.shown.slice(-20), previous: !resetDirection && snapshot.current ? R.facts(snapshot.current) : null, language: B.language() });
        if (!alive(ticket)) return;
        const local = structuredClone(s.intent); R.patch(s, data.update); s.intent.source = local.source;
        if (local.mediaType !== 'any') s.intent.mediaType = local.mediaType;
        s.intent.resultCount = local.resultCount;
        for (const field of R.arrays) s.intent[field] = R.words([...local[field], ...s.intent[field]]);
        if (local.maxRuntime) s.intent.maxRuntime = Math.min(local.maxRuntime, s.intent.maxRuntime || Infinity);
        if (local.maxPages) s.intent.maxPages = Math.min(local.maxPages, s.intent.maxPages || Infinity);
        if (local.contentSafety === 'kid_friendly') s.intent.contentSafety = 'kid_friendly'; if (local.childAge) s.intent.childAge = local.childAge;
        s.searchHints = data.searchHints;
        const id = data.question ? `ai:${R.normalizedText(data.question)}` : '';
        if (data.question && data.suggestions.length >= 3 && s.questions.length < 3 && !s.questions.includes(id)) aiQuestion = { id, text: data.question, chips: data.suggestions };
      }
      if (!alive(ticket)) return;
      const question = force ? null : aiQuestion || R.question(s);
      if (question) {
        s.questions.push(question.id); remember('assistant', question.text, { id: `question:${question.id}`, kind: 'question' }); busy = false; view = { kind: 'question', question }; render(); return;
      }
      await findPicks(ticket, messageId);
    } catch (error) {
      if (!alive(ticket) || error.name === 'AbortError') return;
      console.error('[Pick 4 me]', error); s = snapshot; busy = false; view = { kind: 'error', message: 'Your request is still here. Try again, or continue with local matching.' };
      if (s.mode === 'pick') remember('assistant', 'I could not finish that recommendation. Want me to try again?', { kind: 'error' }); render();
    }
  }

  async function findPicks(ticket, messageId) {
    const started = performance.now();
    try {
      const { candidates, failed } = await retrieve(ticket); if (!alive(ticket)) return;
      if (s.mode === 'surprise') await wait(Math.max(0, (reducedMotion() ? 60 : 420) - (performance.now() - started)));
      if (!alive(ticket)) return;
      let ranked = R.rank(candidates, s, B.library());
      if (!ranked.length && candidates.length && s.shown.length) ranked = R.rank(candidates, s, B.library(), { ignoreHistory: true });
      const count = Math.min(s.intent.resultCount || 1, 10); let aiWhy = new Map(), aiPicks = [];
      if (ranked.length && useAI()) {
        try {
          const response = await api('rank', { intent: s.intent, count, candidates: ranked.slice(0, 24).map(R.facts) });
          if (!alive(ticket)) return; aiWhy = new Map(response.choices.map(choice => [choice.id, choice.why]));
          aiPicks = [...new Set(response.choices.map(choice => choice.id))].map(id => ranked.find(candidate => candidate.recId === id)).filter(Boolean);
          if (!aiPicks.length) serviceMessage = 'Live AI did not verify a choice, so Reel used local matching.';
        } catch (error) { console.warn('[Pick 4 me AI rank fallback]', error); serviceMessage = 'Live AI was unavailable, so Reel used local matching.'; }
      }
      const selected = aiPicks.length ? aiPicks.slice(0, count) : R.selectWeighted(ranked, count);
      busy = false;
      if (!selected.length) {
        view = { kind: failed && !candidates.length ? 'error' : 'empty', message: failed && !candidates.length ? 'The catalog did not respond. Your request is still ready to retry.' : s.intent.source === 'library' ? 'No unused match remains in My List. Try Mix or Discover.' : 'Try adding a format, mood, person, or theme.' };
        if (s.mode === 'pick') remember('assistant', 'I could not find a strong unused match yet. Add one more detail or try again.', { kind: 'empty' }); render(); return;
      }
      const group = { id: `group-${++groupSequence}`, messageId, request: lastRequest || 'Surprise me', intent: structuredClone(s.intent), createdAt: Date.now(), items: selected.map(candidate => ({ candidate, why: aiWhy.get(candidate.recId) || R.explain(candidate, s) })) };
      for (const candidate of selected) R.show(s, candidate);
      history.push(group); history = history.slice(-16); activeGroupId = group.id; activeIndex = 0; s.current = selected[0]; view = { kind: 'result' }; mobilePane = 'pick';
      if (messageId) linkMessage(messageId, group.id);
      if (s.mode === 'pick') { const response = remember('assistant', selected.length > 1 ? `I found ${selected.length} distinct picks. Select any one to see why it fits.` : `I found a strong match: ${selected[0].title}.`, { id: `result:${group.id}`, kind: 'result' }); response.groupIds.push(group.id); }
      if (failed) serviceMessage = 'Some catalog sources were unavailable, so these use the records that loaded.';
      render();
    } catch (error) {
      if (!alive(ticket) || error.name === 'AbortError') return; console.error('[Pick 4 me retrieve]', error); busy = false; view = { kind: 'error', message: 'The catalog could not finish this request. Please try again.' }; render();
    }
  }

  resetMode('pick');
  window.ReelRecommendationUI = { open, resume: () => open({ resume: true }), close: cancel, state: () => structuredClone({ session: s, view, messages, history, activeGroupId, activeIndex, lastRequest, mobilePane }) };
})();
