/* Reel recommendation intent, scoring, and guided-question engine. Shared by browser and server. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ReelRecommendations = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const types = ['movie', 'series', 'anime', 'book', 'manga', 'manhwa'];
  const arrays = ['currentMood', 'desiredMood', 'audience', 'genres', 'themes', 'people', 'origins', 'settings', 'eras', 'semanticTraits', 'similarTo', 'keywords', 'include', 'exclude'];
  const clean = value => String(value || '').normalize('NFKC').toLowerCase().trim();
  const normalizedText = value => clean(value).replace(/[’']/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  const words = value => Array.isArray(value)
    ? [...new Set(value.filter(item => typeof item === 'string').map(item => item.trim().slice(0, 80)).filter(Boolean))].slice(0, 20)
    : [];
  const positive = value => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : null;
  const titleCase = value => String(value || '').trim().replace(/\b\p{L}/gu, letter => letter.toUpperCase());
  const phrase = (text, value) => {
    const haystack = ` ${normalizedText(text)} `;
    const needle = normalizedText(value);
    return !!needle && haystack.includes(` ${needle} `);
  };

  const expansions = {
    funny: ['comedy', 'humor', 'humour', 'comic', 'funny', 'hilarious'],
    comforting: ['family', 'friendship', 'heartwarming', 'comforting', 'cozy', 'gentle'],
    relaxing: ['slice of life', 'friendship', 'gentle', 'relaxing', 'calm', 'easygoing'],
    suspenseful: ['thriller', 'mystery', 'suspense', 'tense', 'gripping'],
    thoughtful: ['psychological', 'philosophical', 'thought provoking', 'science fiction', 'introspective'],
    emotional: ['drama', 'romance', 'emotional', 'grief', 'moving'],
    scary: ['horror', 'supernatural', 'scary', 'frightening'],
    imaginative: ['fantasy', 'adventure', 'science fiction', 'imaginative'],
    atmospheric: ['noir', 'mystery', 'rain', 'atmospheric', 'moody'],
    introspective: ['drama', 'isolation', 'lonely', 'loneliness', 'introspective'],
    dark: ['dark', 'grim', 'noir', 'bleak', 'brooding'],
    hopeful: ['hopeful', 'uplifting', 'optimistic', 'heartwarming'],
    deep: ['philosophical', 'psychological', 'thought provoking', 'introspective', 'existential'],
    animated: ['animation', 'animated', 'cartoon', 'anime', 'cgi'],
    'live action': ['live action'],
    medieval: ['medieval', 'middle ages', 'knight', 'knights', 'kingdom', 'crusade'],
    cyberpunk: ['cyberpunk', 'dystopian', 'future', 'technology'],
    moroccan: ['morocco', 'moroccan', 'maghreb'],
    american: ['american', 'usa', 'united states', 'u s'],
    japanese: ['japan', 'japanese'],
    korean: ['korea', 'korean'],
    french: ['france', 'french'],
    firearms: ['gun', 'guns', 'firearm', 'firearms', 'shootout', 'shootouts', 'gunfight', 'gunfights', 'gunfire', 'rifle', 'rifles', 'pistol', 'pistols', 'armed robbery', 'armed robbers', 'arms dealer', 'weapons dealer'],
    'organized crime': ['organized crime', 'organised crime', 'mafia', 'mob', 'gangster', 'criminal underworld'],
    swords: ['sword', 'swords', 'swordfight', 'blade', 'blades', 'warrior'],
    family: ['family', 'family friendly', 'all ages', 'children', 'kids'],
    loneliness: ['loneliness', 'lonely', 'isolation', 'solitude'],
    'science fiction': ['science fiction', 'sci fi', 'space', 'future'],
    accessible: ['accessible', 'straightforward', 'clear', 'easy to follow', 'less complicated'],
    unusual: ['unusual', 'offbeat', 'strange', 'experimental', 'hidden gem'],
    depressing: ['tragedy', 'suicide', 'depressing', 'bleak', 'despair'],
    disturbing: ['torture', 'gore', 'sexual violence', 'graphic violence'],
    romantic: ['romance', 'romantic', 'love story'],
    superheroes: ['superhero', 'superheroes', 'comic book hero'],
    childish: ['preschool', 'toddler', 'childish'],
    'too serious': ['war', 'tragedy', 'grim', 'solemn']
  };

  const conceptPatterns = [
    ['origins', 'American', /\b(american|usa|united states)\b/],
    ['origins', 'Japanese', /\b(japanese|japan)\b/],
    ['origins', 'Moroccan', /\b(moroccan|morocco)\b/],
    ['origins', 'Korean', /\b(korean|korea)\b/],
    ['origins', 'French', /\b(french|france)\b/],
    ['semanticTraits', 'animated', /\b(animated|animation|cartoons?)\b/],
    ['semanticTraits', 'live action', /\blive[ -]action\b/],
    ['themes', 'firearms', /\b(guns?|firearms?|shootouts?|armed|weaponry)\b/],
    ['themes', 'organized crime', /\b(organized crime|organised crime|mafia|mobsters?|gangsters?|criminal underworld)\b/],
    ['themes', 'swords', /\b(swords?|swordfights?|blades?)\b/],
    ['themes', 'revenge', /\b(revenge|vengeance)\b/],
    ['themes', 'loneliness', /\b(loneliness|lonely|solitude|isolation)\b/],
    ['themes', 'friendship', /\b(friendship|friends)\b/],
    ['themes', 'family', /\bfamily\b/],
    ['settings', 'Japan', /\b(japan|japanese)\b/],
    ['settings', 'Morocco', /\b(morocco|moroccan)\b/],
    ['settings', 'space', /\b(space|spaceship|interstellar)\b/],
    ['settings', 'war', /\bwar|battlefield\b/],
    ['settings', 'school', /\bschool|academy\b/],
    ['settings', 'cyberpunk', /\bcyberpunk\b/],
    ['settings', 'western', /\bwestern|wild west\b/],
    ['eras', 'Medieval', /\bmedieval|middle ages\b/],
    ['semanticTraits', 'deep', /\b(deep|profound)\b/],
    ['semanticTraits', 'accessible', /\b(less complicated|easy to follow|not too complex|straightforward)\b/],
    ['semanticTraits', 'unusual', /\b(unusual|weird|strange|offbeat|hidden gem)\b/],
    ['semanticTraits', 'popular', /\b(popular|well known|crowd pleaser)\b/],
    ['semanticTraits', 'slow-paced', /\b(slow burn|slow paced)\b/],
    ['semanticTraits', 'fast-paced', /\b(fast paced|quick paced)\b/]
  ];

  function intent(raw = {}) {
    const count = positive(raw.resultCount);
    const output = {
      source: ['library', 'discover', 'mix'].includes(raw.source) ? raw.source : 'mix',
      mediaType: [...types, 'watch', 'read', 'any'].includes(raw.mediaType) ? raw.mediaType : 'any',
      context: typeof raw.context === 'string' ? raw.context.slice(0, 120) : '',
      ambiguousTerm: typeof raw.ambiguousTerm === 'string' ? raw.ambiguousTerm.slice(0, 80) : '',
      maxRuntime: positive(raw.maxRuntime), maxPages: positive(raw.maxPages), childAge: positive(raw.childAge),
      resultCount: count ? Math.min(10, Math.max(1, Math.round(count))) : 1,
      contentSafety: raw.contentSafety === 'kid_friendly' ? 'kid_friendly' : 'any'
    };
    arrays.forEach(key => { output[key] = words(raw[key]); });
    return output;
  }

  function session(source = 'mix', mediaType = 'any') {
    return {
      intent: intent({ source, mediaType }), mode: 'pick', answers: [], questions: [], shown: [], rejected: [],
      acceptedItemId: null, current: null, searchHints: [], removedSignals: [], useRatings: false,
      lastRequest: '', suggestionVariants: {}
    };
  }

  function patch(state, update = {}) {
    const next = { ...state.intent };
    for (const key of Object.keys(next)) if (update[key] != null) next[key] = arrays.includes(key) ? words(update[key]) : update[key];
    state.intent = intent(next);
    for (const removed of state.removedSignals) {
      if (arrays.includes(removed.field)) state.intent[removed.field] = state.intent[removed.field].filter(value => clean(value) !== clean(removed.value));
    }
    return state.intent;
  }

  function remove(state, field, value) {
    if (arrays.includes(field)) {
      state.removedSignals.push({ field, value });
      state.intent[field] = state.intent[field].filter(item => clean(item) !== clean(value));
    } else if (['maxRuntime', 'maxPages', 'childAge'].includes(field)) state.intent[field] = null;
    else if (field === 'resultCount') state.intent.resultCount = 1;
    else if (field === 'contentSafety') { state.intent.contentSafety = 'any'; state.intent.childAge = null; }
    else if (field === 'ambiguousTerm') state.intent.ambiguousTerm = '';
  }

  function isDirectionReset(text) {
    return /\b(actually|instead|forget (?:that|it|the|medieval|previous)|new request|start over with|change that to)\b/i.test(String(text || ''));
  }
  function clearDirection(state) {
    const source = state.intent.source, mediaType = state.intent.mediaType, resultCount = state.intent.resultCount;
    state.intent = intent({ source, mediaType, resultCount });
    state.questions = []; state.removedSignals = [];
  }
  function negated(normalized, term) {
    const token = normalizedText(term).replace(/\s+/g, '\\s+');
    return new RegExp(`(?:^|\\s)(?:no|not|without|avoid|dont want|dont like|dislike)(?:\\s+(?:any|too|overly))?\\s+${token}(?:\\s|$)`).test(normalized);
  }
  function parseResultCount(normalized) {
    const numbered = normalized.match(/\b(?:give|show|recommend|suggest|top|list)\s+(?:me\s+)?(10|[1-9])\b|\b(10|[1-9])\s+(?:great\s+)?(?:movies?|films?|series|shows?|anime|books?|manga|manhwa|picks?|recommendations?)\b/);
    if (numbered) return Number(numbered[1] || numbered[2]);
    if (/\b(one|single|just one)\b/.test(normalized)) return 1;
    if (/\b(a few|few|several|a list|list of|some|multiple|recommend some)\b/.test(normalized)) return 5;
    return null;
  }

  function interpret(state, text) {
    const original = String(text || '').trim();
    if (!original) return state.intent;
    const directionReset = isDirectionReset(original);
    if (directionReset) clearDirection(state);
    const parsedText = directionReset ? original.replace(/^(?:actually\s+)?(?:forget [^,;.]+[,;.]?|instead[,;]?)/i, '') : original;
    const normalized = normalizedText(parsedText || original);
    const next = structuredClone(state.intent);
    const add = (key, ...values) => { next[key] = words([...next[key], ...values]); };
    const typePatterns = { manhwa: /\bmanhwa\b/, manga: /\bmanga\b/, anime: /\banime\b/, book: /\bbooks?\b/, series: /\b(series|tv show|sitcom)\b/, movie: /\b(movies?|films?)\b/ };
    for (const [type, pattern] of Object.entries(typePatterns)) if (pattern.test(normalized) && !negated(normalized, type)) { next.mediaType = type; break; }
    if (/^(something to read|read)$/.test(normalized)) next.mediaType = 'read';
    if (/^(something to watch|watch)$/.test(normalized)) next.mediaType = 'watch';
    if (/^(any format|anything|all formats|either|doesnt matter|no preference)$/.test(normalized)) next.mediaType = 'any';
    const count = parseResultCount(normalized); if (count) next.resultCount = count;

    for (const mood of ['tired', 'sad', 'lonely', 'stressed', 'happy', 'bored']) if (phrase(normalized, mood)) add('currentMood', mood);
    if (/long day|stressful day/.test(normalized)) add('currentMood', 'tired');
    const desired = {
      funny: /\b(funny|laugh|humor|humour|comedy)\b/, comforting: /\b(comfort|comforting|cozy|cosy|warm)\b/,
      relaxing: /\b(relax|relaxing|easy|chill|distraction)\b/, suspenseful: /\b(hooked|gripping|suspense|thriller|tense)\b/,
      thoughtful: /\b(think|thought provoking|mind blowing|psychological)\b/, emotional: /\b(emotional|moving|beautiful)\b/,
      scary: /\b(scary|horror)\b/, imaginative: /\b(imaginative|fantasy)\b/
    };
    for (const [value, pattern] of Object.entries(desired)) if (pattern.test(normalized) && !negated(normalized, value)) add('desiredMood', value);
    if (/\b(dark|grim|brooding)\b/.test(normalized) && !negated(normalized, 'dark')) add('desiredMood', 'dark');
    if (/\b(hopeful|uplifting|optimistic)\b/.test(normalized) && !negated(normalized, 'hopeful')) add('desiredMood', 'hopeful');
    for (const genre of ['comedy', 'drama', 'horror', 'romance', 'thriller', 'fantasy', 'action', 'musical', 'psychological', 'adventure', 'crime']) {
      if (phrase(normalized, genre)) add(negated(normalized, genre) ? 'exclude' : 'genres', genre);
    }
    for (const [field, value, pattern] of conceptPatterns) if (pattern.test(normalized)) {
      if (negated(normalized, value) || (value === 'animated' && /\bnot animated\b/.test(normalized))) add('exclude', value);
      else add(field, value);
    }
    if (/\b(swords?|swordfights?|blades?)\b/.test(normalized)) add('themes', 'warrior');
    if (/\b(loneliness|lonely|solitude|isolation)\b/.test(normalized)) add('themes', 'isolation', 'introspective');
    if (/\brain|rainy\b/.test(normalized)) add('themes', 'atmospheric', 'reflective');
    if (/\bdeep|profound\b/.test(normalized)) add('desiredMood', 'thoughtful');
    if (/^moroccan$/.test(normalized)) next.ambiguousTerm = 'Moroccan';
    if (/^medieval$/.test(normalized)) next.ambiguousTerm = 'Medieval';
    if (/\bhistorical\b/.test(normalized)) { add('genres', 'history'); next.ambiguousTerm = ''; }
    if (/\b(medieval fantasy|fantasy)\b/.test(normalized) && next.ambiguousTerm === 'Medieval') next.ambiguousTerm = '';
    if (/moroccan film|made by moroccan/.test(normalized)) { add('include', 'Moroccan film'); next.ambiguousTerm = ''; }
    if (/set in morocco|moroccan setting/.test(normalized)) { add('settings', 'Morocco'); next.ambiguousTerm = ''; }
    if (/moroccan culture|culture and language|any of these|anything relevant/.test(normalized)) next.ambiguousTerm = '';

    const similar = original.match(/\b(?:like|similar to)\s+([^,.!?]+?)(?:\s+but\b|$)/i);
    if (similar) {
      const title = similar[1].trim().slice(0, 80); add('similarTo', title); add('exclude', title);
      if (/interstellar/i.test(title)) add('themes', 'science fiction', 'space', 'human connection');
    }
    for (const person of ['Johnny Depp', 'Christopher Nolan', 'Brad Pitt', 'Hayao Miyazaki']) if (phrase(original, person)) add('people', person);
    const explicitPerson = original.match(/\b(?:with|starring|featuring|actor|actress|director|directed by|created by|by)\s+([\p{Lu}][\p{L}'’-]+(?:\s+[\p{Lu}][\p{L}'’-]+){1,3})/u);
    if (explicitPerson) add('people', titleCase(explicitPerson[1].replace(/\s+(?:who|that|under|in|from|and)\b.*$/i, '')));

    const negativeConcepts = [
      ['depressing', /\b(?:not|no|without|avoid)\s+(?:too\s+|overly\s+)?depressing\b/],
      ['superheroes', /\b(?:not|no|without|avoid)\s+superheroes?\b/],
      ['fantasy', /\b(?:not|no|without|avoid)\s+fantasy\b/],
      ['romantic', /\b(?:not|no|without|avoid)\s+(?:romance|romantic)\b/],
      ['childish', /\b(?:not|no|without|avoid)\s+(?:too\s+|overly\s+)?childish\b/],
      ['disturbing', /\b(?:not|no|without|avoid)\s+(?:too\s+|overly\s+)?disturbing\b/],
      ['gore', /\b(?:not|no|without|avoid)\s+gore\b/],
      ['violence', /\b(?:not|no|without|avoid)\s+violence\b/]
    ];
    for (const [value, pattern] of negativeConcepts) if (pattern.test(normalized)) add('exclude', value);
    if (/not (?:stupid|mindless)|not overly simplistic/.test(normalized)) add('exclude', 'childish');
    if (/too serious/.test(normalized)) { add('exclude', 'too serious'); add('desiredMood', 'funny'); }
    if (/dont like (?:the )?genre|dislike (?:the )?genre/.test(normalized) && state.current) add('exclude', ...(state.current.genres || []));
    if (/wrong mood/.test(normalized)) next.desiredMood = [];

    if (/\b(family|kids|children|younger brother|younger sister|little brother|little sister|mixed ages)\b|\d+.year.old/.test(normalized)) {
      next.context = 'family'; add('audience', 'family'); next.contentSafety = 'kid_friendly';
    }
    if (/young kids|younger (?:brother|sister)/.test(normalized)) { add('audience', 'young kids'); next.childAge = next.childAge || 10; next.contentSafety = 'kid_friendly'; }
    if (/\bteens?\b/.test(normalized)) { add('audience', 'teens'); next.childAge = 13; next.contentSafety = 'kid_friendly'; }
    if (/adults only/.test(normalized)) { next.context = 'adults'; next.contentSafety = 'any'; next.childAge = null; next.audience = ['adults']; }
    if (/mixed ages|everyone together/.test(normalized)) { add('audience', 'mixed ages'); next.contentSafety = 'kid_friendly'; }
    const age = normalized.match(/(\d{1,2})[ -]year[ -]old/); if (age) next.childAge = +age[1];
    const minutes = normalized.match(/(?:under|less than|up to|about|max(?:imum)?|only)\s*(\d+)\s*(?:min|minute)/);
    const hours = normalized.match(/(?:under|about|up to|only)\s*(\d+(?:\.\d+)?)\s*hours?/);
    const pages = normalized.match(/(?:under|less than|up to|max(?:imum)?)\s*(\d+)\s*pages?/);
    if (minutes) next.maxRuntime = +minutes[1]; if (hours) next.maxRuntime = +hours[1] * 60;
    if (/about an hour|under an hour/.test(normalized)) next.maxRuntime = 60;
    if (pages) next.maxPages = +pages[1];
    if (/shorter|too long/.test(normalized) && state.current) {
      if (['book', 'manga', 'manhwa'].includes(state.current.type) && state.current.pages) next.maxPages = Math.max(1, state.current.pages - 1);
      else if (state.current.runtime) next.maxRuntime = Math.max(1, Math.min(next.maxRuntime || Infinity, state.current.runtime - 1));
    } else if (/\bshort\b/.test(normalized) && !next.maxRuntime && !['book', 'manga', 'manhwa', 'read'].includes(next.mediaType)) {
      next.maxRuntime = next.mediaType === 'anime' || next.mediaType === 'series' ? 30 : 100;
    }

    if (/forget medieval/.test(normalized)) {
      next.eras = next.eras.filter(value => !/medieval/i.test(value)); next.themes = next.themes.filter(value => !/medieval/i.test(value)); next.ambiguousTerm = '';
    }
    if (/forget (?:the )?family/.test(normalized)) { next.audience = []; next.contentSafety = 'any'; next.childAge = null; next.context = ''; }
    if (/no time limit/.test(normalized)) next.maxRuntime = null;

    const meaningfulAdded = arrays.some(key => next[key].some(value => !state.intent[key].some(old => clean(old) === clean(value))));
    if (!meaningfulAdded && original && !/^(?:another|another one|surprise me|no time limit)$/i.test(original)) {
      add('keywords', ...normalized.split(' ').filter(token => token.length > 2 && !/^(give|show|some|thing|something|please|movie|series)$/.test(token)).slice(0, 8));
    }
    patch(state, next);
    state.lastRequest = original.slice(0, 1200);
    state.answers.push(original.slice(0, 1200)); state.answers = state.answers.slice(-16);
    return state.intent;
  }

  const questionBank = {
    experience: [['Something comforting', 'Make me laugh', 'Keep me hooked', 'Make me think'], ['Give me an escape', 'Something beautiful', 'Keep it light', 'Make it intense']],
    medium: [['A movie', 'A series', 'An anime', 'A book', 'Any format'], ['Something to watch', 'Something to read', 'A movie tonight', 'No preference']],
    time: [['Under 30 minutes', 'Under 90 minutes', 'Around 2 hours', 'No time limit'], ['Something short', 'One movie length', 'I have all evening', 'Doesn’t matter']],
    pace: [['Slow and immersive', 'Balanced', 'Fast-paced', 'No preference'], ['Let it breathe', 'Keep it moving', 'Make it intense', 'Surprise me']],
    familyAge: [['Young kids', 'Teens', 'Adults only', 'Mixed ages'], ['Under 8', 'Ages 8 to 12', 'Teenagers', 'Everyone together']],
    medieval: [['Historical', 'Fantasy', 'Either', 'Dark and realistic'], ['Knights and battles', 'Court intrigue', 'Medieval fantasy', 'Surprise me']],
    moroccan: [['Moroccan film', 'Set in Morocco', 'Moroccan culture', 'Any of these'], ['Made by Moroccan creators', 'Moroccan setting', 'Culture and language', 'Anything relevant']]
  };
  function makeQuestion(state, id, text) {
    if (state.questions.includes(id)) return null;
    const variants = questionBank[id] || [[]], index = state.suggestionVariants[id] || 0;
    return { id, text, chips: variants[index % variants.length] };
  }
  function question(state) {
    const current = state.intent;
    if (state.questions.length >= 3) return null;
    if (current.ambiguousTerm === 'Moroccan') return makeQuestion(state, 'moroccan', 'Which Moroccan connection matters most?');
    if (current.ambiguousTerm === 'Medieval') return makeQuestion(state, 'medieval', 'Historical medieval world or medieval fantasy?');
    if (current.currentMood.length && !current.desiredMood.length) {
      if (state.questions.includes('mood')) return null;
      return { id: 'mood', text: 'Should the pick match that feeling or shift it?', chips: ['Something comforting', 'Make me laugh', 'A distraction', 'Match my mood'] };
    }
    if (!['pick', 'ask'].includes(state.mode)) return null;
    if (current.context === 'family' && !current.childAge && !current.audience.some(value => /young|teen|mixed/i.test(value))) return makeQuestion(state, 'familyAge', 'Who is watching with you?');
    const signalCount = current.desiredMood.length + current.genres.length + current.themes.length + current.semanticTraits.length + current.people.length + current.origins.length + current.settings.length + current.eras.length + current.similarTo.length;
    if (!signalCount) return makeQuestion(state, 'experience', 'What kind of experience are you looking for?');
    if (signalCount <= 1 && current.mediaType === 'any' && state.answers.length < 2) return makeQuestion(state, 'medium', 'What format should I focus on?');
    return null;
  }
  function refreshQuestion(state, current) {
    if (!current?.id || !questionBank[current.id]) return current;
    state.suggestionVariants[current.id] = (state.suggestionVariants[current.id] || 0) + 1;
    const variants = questionBank[current.id];
    return { ...current, chips: variants[state.suggestionVariants[current.id] % variants.length] };
  }

  function mediaTypes(current) { return current.mediaType === 'watch' ? types.slice(0, 3) : current.mediaType === 'read' ? types.slice(3) : types.includes(current.mediaType) ? [current.mediaType] : types; }
  function identity(value) { return `${value.type}:${clean(value.title)}:${value.year || ''}`; }
  function candidate(value, library = false) {
    return { ...value, recId: identity(value), inLibrary: library, genres: words(value.genres), synopsis: String(value.synopsis || value.firstSentence || '').slice(0, 1600), cast: Array.isArray(value.cast) ? value.cast.slice(0, 24) : [], searchTerms: words(value.searchTerms) };
  }
  const castNames = value => (value.cast || []).map(person => typeof person === 'string' ? person : person?.name).filter(Boolean);
  function haystack(value, field = '') {
    const groups = { people: [value.creator, ...castNames(value)], origins: [value.country, value.language, ...(value.originCountries || [])], settings: [value.country, value.language, value.synopsis, ...(value.searchTerms || [])], eras: [value.year, value.synopsis, ...(value.searchTerms || [])], similarTo: [value.title, value.synopsis, ...(value.searchTerms || [])] };
    return normalizedText((groups[field] || [value.title, ...(value.genres || []), value.synopsis, value.creator, ...castNames(value), value.country, value.language, value.ageRatingGuide, value.format, ...(value.searchTerms || [])]).join(' '));
  }
  function terms(signal) { return [clean(signal), ...(expansions[clean(signal)] || [])]; }
  function hits(value, signal, field = '') { return terms(signal).some(term => phrase(haystack(value, field), term)); }
  function minimumAge(value) {
    const rating = clean(value.ageRating).replace(/\s/g, '');
    if (/^(g|u|tv-y|tv-g|allages)$/.test(rating)) return 0;
    if (/^(pg|tv-pg|tv-y7)$/.test(rating)) return 7;
    if (rating === 'pg-13') return 13;
    if (rating === 'tv-14') return 14;
    if (/^(r|r17\+|tv-ma|nc-17)$/.test(rating)) return 17;
    const number = rating.match(/^(?:ages?)?(\d{1,2})(?:\+)?$/); return number ? +number[1] : null;
  }
  function eligible(value, state, { ignoreHistory = false } = {}) {
    const current = state.intent;
    if (current.source === 'library' && !value.inLibrary) return false;
    if (!mediaTypes(current).includes(value.type)) return false;
    if (!ignoreHistory && (state.shown.includes(value.recId) || state.rejected.includes(value.recId))) return false;
    if (value.inLibrary && ['done', 'dropped', 'waiting'].includes(value.status)) return false;
    if (current.maxPages && value.type !== 'book') return false;
    if (current.maxRuntime && ['book', 'manga', 'manhwa'].includes(value.type)) return false;
    if (current.contentSafety === 'kid_friendly' && current.childAge) { const age = minimumAge(value); if (age == null || age > current.childAge) return false; }
    if (current.exclude.some(signal => hits(value, signal))) return false;
    return true;
  }
  function affinity(library) {
    const counts = {}; for (const value of library) if (value.rating >= 8) for (const genre of value.genres || []) counts[clean(genre)] = (counts[clean(genre)] || 0) + 1;
    return Object.fromEntries(Object.entries(counts).filter(([, count]) => count >= 3));
  }
  const weights = { people: 42, similarTo: 26, semanticTraits: 18, origins: 18, genres: 17, settings: 15, eras: 15, themes: 14, desiredMood: 12, include: 12, audience: 10, keywords: 4 };
  function hasNearHard(value, state) {
    if (state.intent.people.length && !state.intent.people.every(signal => hits(value, signal, 'people'))) return false;
    if (state.intent.semanticTraits.some(signal => clean(signal) === 'animated') && !hits(value, 'animated', 'semanticTraits')) return false;
    return true;
  }
  function scoreCandidate(value, state, preferences = {}) {
    let score = 0; const matchDetails = [], missedSignals = [], tradeoffs = [];
    for (const [field, weight] of Object.entries(weights)) for (const signal of state.intent[field]) {
      if (hits(value, signal, field)) { score += weight; matchDetails.push({ field, signal }); }
      else { missedSignals.push({ field, signal }); score -= ['people', 'semanticTraits'].includes(field) ? Math.round(weight * .55) : 0; }
    }
    if (state.intent.maxRuntime) {
      if (positive(value.runtime) && value.runtime <= state.intent.maxRuntime) { score += 10; matchDetails.push({ field: 'runtime', signal: `under ${state.intent.maxRuntime} minutes` }); }
      else if (positive(value.runtime)) { score -= Math.min(15, Math.max(3, Math.round((value.runtime - state.intent.maxRuntime) / 6))); tradeoffs.push(`${value.runtime} minutes rather than under ${state.intent.maxRuntime}`); }
      else { score -= 5; tradeoffs.push('runtime is not listed'); }
    }
    if (state.intent.maxPages) {
      if (positive(value.pages) && value.pages <= state.intent.maxPages) { score += 10; matchDetails.push({ field: 'pages', signal: `under ${state.intent.maxPages} pages` }); }
      else if (positive(value.pages)) { score -= Math.min(15, Math.max(3, Math.round((value.pages - state.intent.maxPages) / 25))); tradeoffs.push(`${value.pages} pages rather than under ${state.intent.maxPages}`); }
      else { score -= 5; tradeoffs.push('page count is not listed'); }
    }
    if (state.intent.contentSafety === 'kid_friendly') {
      const age = minimumAge(value);
      if (age != null && age <= (state.intent.childAge || 13)) { score += 22; matchDetails.push({ field: 'audience', signal: value.ageRating || 'family suitable' }); }
      else if (age == null) { score -= 9; tradeoffs.push('the catalog has no age rating'); }
      else { score -= 28; tradeoffs.push(`${value.ageRating} may not suit the whole group`); }
    }
    if (state.intent.source === 'mix' && value.inLibrary && (matchDetails.length || score > 0)) score += 7;
    score += Math.min(6, Math.max(0, Number(value.score || 0) / 2));
    score += Math.min(4, Math.max(0, Number(value.popularity || 0) / 25));
    score += (value.genres || []).reduce((total, genre) => total + Math.min(1, (preferences[clean(genre)] || 0) / 3), 0);
    return { ...value, matchSignals: matchDetails.map(detail => detail.signal), matchDetails, missedSignals, tradeoffs, matchScore: score };
  }
  function rank(candidates, state, library = [], options = {}) {
    const preferences = state.useRatings ? affinity(library) : {}, unique = new Map();
    for (const value of candidates) if (!unique.has(value.recId) || value.inLibrary) unique.set(value.recId, value);
    let pool = [...unique.values()].filter(value => eligible(value, state, { ignoreHistory: true }));
    const nearHardMatches = pool.filter(value => hasNearHard(value, state)); if (nearHardMatches.length) pool = nearHardMatches;
    if (state.intent.themes.some(signal => clean(signal) === 'firearms')) {
      const firearmMatches = pool.filter(value => hits(value, 'firearms', 'themes'));
      if (firearmMatches.length) pool = firearmMatches;
    }
    pool = pool.filter(value => eligible(value, state, options));
    return pool.map(value => scoreCandidate(value, state, preferences)).sort((a, b) => b.matchScore - a.matchScore || Number(b.score || 0) - Number(a.score || 0) || Number(b.popularity || 0) - Number(a.popularity || 0) || a.recId.localeCompare(b.recId));
  }
  function weightedChoice(items, random) {
    if (!items.length) return null; const floor = Math.min(...items.map(item => item.weight));
    const weightList = items.map(item => Math.max(.15, item.weight - floor + 1)); let cursor = random() * weightList.reduce((sum, value) => sum + value, 0);
    for (let index = 0; index < items.length; index++) { cursor -= weightList[index]; if (cursor <= 0) return items[index].item; }
    return items.at(-1).item;
  }
  function selectWeighted(ranked, count = 1, random = Math.random) {
    const topScore = Math.max(...ranked.map(item => item.matchScore));
    const minimumScore = topScore - Math.max(16, Math.abs(topScore) * .35);
    const selected = [], pool = ranked.filter(item => item.matchScore >= minimumScore).slice(0, Math.max(10, Math.min(24, count * 4)));
    while (selected.length < Math.min(count, pool.length)) {
      const weighted = pool.filter(item => !selected.includes(item)).map((item, index) => {
        const genreOverlap = selected.reduce((sum, chosen) => sum + (item.genres || []).filter(genre => (chosen.genres || []).some(other => clean(other) === clean(genre))).length, 0);
        const creatorOverlap = selected.some(chosen => chosen.creator && item.creator && clean(chosen.creator) === clean(item.creator));
        const relevance = Math.max(1, item.matchScore - (ranked[0]?.matchScore || 0) + 16);
        return { item, weight: relevance * Math.pow(.86, index) - genreOverlap * 1.5 - (creatorOverlap ? 2 : 0) };
      });
      const chosen = weightedChoice(weighted, random); if (!chosen) break; selected.push(chosen);
    }
    return selected;
  }
  function humanList(values, limit = 4) {
    const list = [...new Set(values)].filter(Boolean).slice(0, limit);
    return list.length < 2 ? (list[0] || '') : `${list.slice(0, -1).join(', ')} and ${list.at(-1)}`;
  }
  function explain(value, state) {
    const matched = value.matchDetails?.filter(detail => !['runtime', 'pages'].includes(detail.field)).map(detail => detail.signal) || [];
    const parts = [], requested = humanList(matched, 4);
    if (requested) parts.push(`You asked for ${requested}. This title directly matches those catalog details.`);
    else parts.push('This is the strongest available match in the current source and format.');
    const importantMiss = value.missedSignals?.find(detail => ['people', 'origins', 'themes', 'semanticTraits', 'eras', 'settings'].includes(detail.field));
    if (value.tradeoffs?.length) parts.push(`The closest tradeoff is ${value.tradeoffs[0]}.`);
    else if (importantMiss) parts.push(`It does not fully verify ${importantMiss.signal}, so treat that as an approximation.`);
    else if (state.intent.maxRuntime && value.runtime) parts.push(`At ${value.runtime} minutes${['anime', 'series'].includes(value.type) ? ' per episode' : ''}, it fits your time preference.`);
    else if (state.intent.maxPages && value.pages) parts.push(`Its ${value.pages} pages fit your length preference.`);
    if (value.inLibrary) parts.push('It is already in your library.');
    return parts.join(' ');
  }
  function show(state, value) { state.current = value; if (!state.shown.includes(value.recId)) state.shown.push(value.recId); }
  function reject(state) { if (state.current && !state.rejected.includes(state.current.recId)) state.rejected.push(state.current.recId); }
  function facts(value) {
    return { id: value.recId, title: String(value.title || '').slice(0, 200), type: value.type, year: value.year || null, runtime: value.runtime || null, pages: value.pages || null, genres: words(value.genres), synopsis: String(value.synopsis || '').slice(0, 1000), ageRating: String(value.ageRating || '').slice(0, 60), country: String(value.country || '').slice(0, 80), creator: String(value.creator || '').slice(0, 120), cast: words(castNames(value)).slice(0, 12), inLibrary: !!value.inLibrary, score: positive(value.score), popularity: positive(value.popularity), format: String(value.format || '').slice(0, 80), searchTerms: words(value.searchTerms) };
  }

  return { types, arrays, intent, session, patch, remove, interpret, question, refreshQuestion, mediaTypes, identity, candidate, eligible, rank, scoreCandidate, selectWeighted, explain, show, reject, facts, affinity, words, normalizedText, hasPhrase: phrase, isDirectionReset, parseResultCount };
});
