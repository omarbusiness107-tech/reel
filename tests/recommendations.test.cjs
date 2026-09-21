const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../assets/recommendations-core.js');
const movie = (title, runtime = 90, extra = {}) => R.candidate({ title, type: 'movie', year: 2020, runtime, genres: ['Comedy'], synopsis: 'A heartwarming comedy about friendship.', ...extra }, true);

test('My List never admits external titles, even if they rank better', () => {
  const s = R.session('library'); R.interpret(s, 'I want something funny');
  const out = R.candidate({ title: 'External', type: 'movie', score: 10, genres: ['Comedy'] });
  assert.deepEqual(R.rank([out, movie('Saved')], s).map(c => c.title), ['Saved']);
});
test('another and shorter preserve context and exclude previously shown results', () => {
  const s = R.session(); R.interpret(s, 'I am tired, give me a funny movie under 100 minutes');
  const one = movie('First', 95); R.show(s, one); R.interpret(s, 'Another but shorter');
  assert.equal(s.intent.maxRuntime, 94); assert.equal(s.intent.mediaType, 'movie');
  assert.ok(s.intent.currentMood.includes('tired')); assert.ok(s.intent.desiredMood.includes('funny'));
  const ranked = R.rank([one, movie('Long', 100), movie('Short', 80)], s);
  assert.equal(ranked[0].title, 'Short'); assert.ok(ranked.some(candidate => candidate.title === 'Long'));
  assert.ok(ranked.find(candidate => candidate.title === 'Long').tradeoffs.length);
});
test('sad does not mean the user wants sad media; question has suggestions', () => {
  const s = R.session(); R.interpret(s, "I'm sad");
  assert.deepEqual(s.intent.desiredMood, []);
  const q = R.question(s); assert.match(q.text, /stay|shift/); assert.equal(q.chips.length, 4);
  s.questions.push(q.id); R.interpret(s, 'Something comforting'); assert.equal(R.question(s), null);
});
test('specific requests skip unnecessary questions and parse known hard limits', () => {
  const s = R.session(); R.interpret(s, 'A funny family movie under 100 minutes suitable for an 8-year-old');
  assert.equal(R.question(s), null); assert.equal(s.intent.maxRuntime, 100); assert.equal(s.intent.childAge, 8);
  const a = movie('PG', 95, { ageRating: 'PG' });
  const b = movie('Unknown', 90); const c = movie('Adult', 80, { ageRating: 'R' });
  assert.deepEqual(R.rank([a, b, c], s).map(x => x.title), ['PG']);
});
test('runtime is a soft preference and known matches rank above unknown or over-limit titles', () => {
  const s = R.session(); s.intent.maxRuntime = 90;
  const ranked = R.rank([movie('No time', null), movie('Over', 105), movie('Fine', 90)], s);
  assert.equal(ranked[0].title, 'Fine'); assert.equal(ranked.length, 3);
  assert.match(ranked.find(candidate => candidate.title === 'Over').tradeoffs[0], /105 minutes/);
});
test('TV-14 is not suitable for the under-14 audience filter', () => {
  const s = R.session(); s.intent.contentSafety = 'kid_friendly'; s.intent.childAge = 13;
  assert.equal(R.rank([movie('TV14', 80, { ageRating: 'TV-14' })], s).length, 0);
  assert.equal(R.rank([movie('PG13', 80, { ageRating: 'PG-13' })], s).length, 1);
});
test('negation excludes genres, not includes them', () => {
  const s = R.session(); R.interpret(s, 'Something scary but not too disturbing, no comedy');
  assert.ok(s.intent.exclude.includes('disturbing')); assert.ok(s.intent.exclude.includes('comedy'));
  assert.ok(!s.intent.genres.includes('comedy'));
  assert.equal(R.rank([movie('Comedy')], s).length, 0);
});
test('semantic inputs become visible removable signals', () => {
  const s = R.session(); R.interpret(s, 'rain sword loneliness');
  assert.ok(s.intent.themes.includes('atmospheric')); assert.ok(s.intent.themes.includes('warrior'));
  R.remove(s, 'themes', 'atmospheric'); R.patch(s, { themes: ['atmospheric', 'warrior'] });
  assert.deepEqual(s.intent.themes, ['warrior']);
});
test('read/watch and exact media types stay distinct', () => {
  const s = R.session('mix', 'read');
  assert.equal(R.rank([movie('Movie'), R.candidate({ title: 'Book', type: 'book' })], s).length, 1);
  R.interpret(s, 'I want manhwa'); assert.deepEqual(R.mediaTypes(s.intent), ['manhwa']);
  R.interpret(s, 'any format'); assert.deepEqual(R.mediaTypes(s.intent), R.types);
});
test('completed, dropped, waiting, shown and rejected records are not repeated', () => {
  const s = R.session(); const rejected = movie('Rejected'); R.show(s, rejected); R.reject(s);
  assert.equal(R.rank([rejected, movie('Done', 80, { status: 'done' }), movie('Dropped', 80, { status: 'dropped' }), movie('Waiting', 80, { status: 'waiting' })], s).length, 0);
});
test('same-name remakes with different years remain distinct', () => {
  assert.notEqual(movie('Suits', 50, { year: 2011 }).recId, movie('Suits', 50, { year: 2018 }).recId);
});
test('Mix favors relevant saved titles, not unrelated saved titles', () => {
  const s = R.session('mix'); R.interpret(s, 'Make me laugh');
  const external = R.candidate({ title: 'External Comedy', type: 'movie', genres: ['Comedy'], score: 10 });
  const unrelated = movie('Saved Horror', 90, { genres: ['Horror'], synopsis: 'A frightening haunting.' });
  assert.equal(R.rank([unrelated, external], s)[0].title, 'External Comedy');
  assert.equal(R.rank([movie('Saved Comedy'), external], s)[0].title, 'Saved Comedy');
});
test('preference learning requires three high personal ratings, not one mood', () => {
  assert.deepEqual(R.affinity([movie('A', 90, { rating: 10 })]), {});
  assert.equal(R.affinity(['A', 'B', 'C'].map(x => movie(x, 90, { rating: 8 }))).comedy, 3);
  const s = R.session(); R.interpret(s, 'I am tired'); assert.equal(s.useRatings, false);
});
test('only public shortlist facts leave the client', () => {
  const c = movie('Private', 90, { notes: 'SECRET', rating: 9, id: 'private-local-id', updated: 123, cast: ['someone'] });
  const serialized = JSON.stringify(R.facts(c)); assert.ok(!serialized.includes('SECRET')); assert.ok(!serialized.includes('private-local-id'));
  assert.equal(R.facts(c).rating, undefined);
});
test('Guide me is bounded and never repeats the same question', () => {
  const s = R.session(); s.mode = 'ask';
  const answers = { experience: 'Something relaxing', medium: 'A movie', time: 'Under 120 minutes', discovery: 'A hidden gem', pace: 'Balanced' };
  while (R.question(s)) {
    const q = R.question(s); assert.ok(q); assert.ok(q.chips.length >= 3); s.questions.push(q.id);
    const answer = answers[q.id] || q.chips[0];
    R.interpret(s, answer);
  }
  assert.equal(R.question(s), null); assert.equal(new Set(s.questions).size, s.questions.length); assert.ok(s.questions.length >= 2 && s.questions.length <= 4);
});
test('readable length constraints do not treat episode counts as book pages', () => {
  const s = R.session(); R.interpret(s, 'A book under 200 pages');
  assert.equal(s.intent.maxPages, 200);
  assert.equal(R.rank([R.candidate({ title: 'Book', type: 'book', pages: 150 }, true), R.candidate({ title: 'Show', type: 'anime', pages: 12 }, true)], s).length, 1);
});
test('person intent matches credited people and deep never fuzzy-matches Depp', () => {
  const actor = R.session(); R.interpret(actor, 'johnny depp');
  assert.deepEqual(actor.intent.people, ['Johnny Depp']);
  const pirate = movie('Pirates', 143, { genres: ['Adventure'], cast: [{ name: 'Johnny Depp' }], synopsis: 'A pirate adventure.' });
  const profound = movie('Profound', 95, { genres: ['Drama'], synopsis: 'A deep philosophical story about grief and connection.' });
  assert.equal(R.rank([profound, pirate], actor)[0].title, 'Pirates');
  assert.match(R.explain(R.rank([pirate], actor)[0], actor), /Johnny Depp/);
  const deep = R.session(); R.interpret(deep, 'deep');
  assert.deepEqual(deep.intent.people, []); assert.ok(deep.intent.semanticTraits.includes('deep'));
  assert.equal(R.rank([pirate, profound], deep)[0].title, 'Profound');
});
test('ambiguous places and eras ask one useful clarification', () => {
  const moroccan = R.session(); R.interpret(moroccan, 'moroccan');
  assert.equal(R.question(moroccan).id, 'moroccan');
  const medieval = R.session(); R.interpret(medieval, 'medieval');
  assert.equal(R.question(medieval).id, 'medieval');
  R.interpret(medieval, 'Fantasy'); assert.equal(medieval.intent.ambiguousTerm, '');
});
test('atmosphere, family, anime length and similarity become structured intent', () => {
  const atmosphere = R.session(); R.interpret(atmosphere, 'rain japan loneliness');
  assert.ok(atmosphere.intent.settings.includes('Japan')); assert.ok(atmosphere.intent.themes.includes('atmospheric')); assert.ok(atmosphere.intent.themes.includes('isolation'));
  const family = R.session(); R.interpret(family, 'suggest a movie to watch with my family');
  assert.equal(family.intent.mediaType, 'movie'); assert.equal(family.intent.context, 'family'); assert.equal(family.intent.contentSafety, 'kid_friendly');
  const anime = R.session(); R.interpret(anime, 'a short psychological anime');
  assert.equal(anime.intent.mediaType, 'anime'); assert.equal(anime.intent.maxRuntime, 30); assert.ok(anime.intent.genres.includes('psychological'));
  const similar = R.session(); R.interpret(similar, 'movie like Interstellar but less complicated');
  assert.deepEqual(similar.intent.similarTo, ['Interstellar']); assert.ok(similar.intent.semanticTraits.includes('accessible'));
});
test('refreshing Guide me replies keeps the question and changes its suggestions', () => {
  const s = R.session(); s.mode = 'ask'; const question = R.question(s);
  const refreshed = R.refreshQuestion(s, question);
  assert.equal(refreshed.id, question.id); assert.equal(refreshed.text, question.text); assert.notDeepEqual(refreshed.chips, question.chips);
});

test('multi-concept requests retain origin, animation, tone, setting, theme and audience signals', () => {
  const animation = R.session(); R.interpret(animation, 'funny American animated movie to watch with my younger brother');
  assert.equal(animation.intent.mediaType, 'movie'); assert.ok(animation.intent.origins.includes('American'));
  assert.ok(animation.intent.semanticTraits.includes('animated')); assert.ok(animation.intent.desiredMood.includes('funny'));
  assert.equal(animation.intent.contentSafety, 'kid_friendly'); assert.ok(animation.intent.audience.includes('family'));
  const medieval = R.session(); R.interpret(medieval, 'dark medieval fantasy with swords');
  assert.ok(medieval.intent.desiredMood.includes('dark')); assert.ok(medieval.intent.eras.includes('Medieval'));
  assert.ok(medieval.intent.genres.includes('fantasy')); assert.ok(medieval.intent.themes.includes('swords'));
});

test('guns and organized crime both affect scoring rather than collapsing to generic action', () => {
  const s = R.session('mix', 'movie'); R.interpret(s, 'movie with guns and organized crime');
  const exact = movie('Heat', 170, { genres: ['Crime', 'Thriller'], synopsis: 'Armed professional robbers use firearms in shootouts while police pursue the organized crime crew.' });
  const crimeOnly = movie('Quiet Crime', 100, { genres: ['Crime'], synopsis: 'A fraud investigation inside a company.' });
  const actionOnly = movie('Generic Action', 100, { genres: ['Action'], synopsis: 'A hero runs from danger.' });
  const ranked = R.rank([actionOnly, crimeOnly, exact], s);
  assert.equal(ranked[0].title, 'Heat'); assert.ok(ranked[0].matchSignals.includes('firearms')); assert.ok(ranked[0].matchSignals.includes('organized crime'));
});

test('American animation behaves as a near-hard medium and a high-weight origin', () => {
  const s = R.session('mix', 'movie'); R.interpret(s, 'American animation');
  const live = movie('American Live', 100, { country: 'United States', genres: ['Drama'], synopsis: 'A live action American drama.' });
  const foreignAnimation = movie('Foreign Animation', 100, { country: 'France', genres: ['Animation'], synopsis: 'An animated French adventure.' });
  const exact = movie('American Animation', 100, { country: 'United States of America', genres: ['Animation'], synopsis: 'An American animated family adventure.' });
  const ranked = R.rank([live, foreignAnimation, exact], s);
  assert.equal(ranked[0].title, 'American Animation'); assert.ok(!ranked.some(item => item.title === 'American Live'));
  assert.ok(ranked[0].matchScore > ranked.find(item => item.title === 'Foreign Animation').matchScore);
});

test('explicit people are near-hard and creator names are recognized', () => {
  const nolan = R.session('mix', 'movie'); R.interpret(nolan, 'Give me 3 Christopher Nolan movies');
  assert.deepEqual(nolan.intent.people, ['Christopher Nolan']); assert.equal(nolan.intent.resultCount, 3);
  const exact = movie('The Prestige', 130, { creator: 'Christopher Nolan', genres: ['Drama'] });
  const other = movie('Other', 110, { creator: 'Someone Else', genres: ['Drama'], score: 10 });
  assert.deepEqual(R.rank([other, exact], nolan).map(item => item.title), ['The Prestige']);
});

test('natural multi-item wording chooses sensible list sizes', () => {
  const five = R.session(); R.interpret(five, 'Give me 5 gun movies'); assert.equal(five.intent.resultCount, 5);
  const few = R.session(); R.interpret(few, 'Suggest a few short anime'); assert.equal(few.intent.resultCount, 5);
  const top = R.session(); R.interpret(top, 'top 3 thrillers'); assert.equal(top.intent.resultCount, 3);
  const one = R.session(); R.interpret(one, 'just one great movie'); assert.equal(one.intent.resultCount, 1);
});

test('negative preferences are explicit exclusions', () => {
  const cases = [
    ['deep but not depressing', 'depressing'], ['action but no superheroes', 'superheroes'],
    ['family movie but not childish', 'childish'], ['medieval without fantasy', 'fantasy'],
    ['something funny but not romantic', 'romantic']
  ];
  for (const [request, excluded] of cases) { const s = R.session(); R.interpret(s, request); assert.ok(s.intent.exclude.includes(excluded), request); }
});

test('conversation accumulates refinements and explicit direction changes replace stale context', () => {
  const s = R.session(); R.interpret(s, 'Medieval'); R.interpret(s, 'Fantasy'); R.interpret(s, 'Make it dark');
  assert.ok(s.intent.eras.includes('Medieval')); assert.ok(s.intent.genres.includes('fantasy')); assert.ok(s.intent.desiredMood.includes('dark'));
  R.interpret(s, 'Actually forget medieval, give me cyberpunk');
  assert.ok(!s.intent.eras.includes('Medieval')); assert.ok(!s.intent.genres.includes('fantasy')); assert.ok(s.intent.settings.includes('cyberpunk'));
});

test('weighted list selection is unique, bounded and capable of variation', () => {
  const ranked = ['A', 'B', 'C', 'D', 'E'].map((title, index) => ({ ...movie(title), matchScore: 20 - index, genres: index < 2 ? ['Action'] : ['Drama'] }));
  const first = R.selectWeighted(ranked, 3, () => .01); const last = R.selectWeighted(ranked, 3, () => .99);
  assert.equal(new Set(first.map(item => item.recId)).size, 3); assert.equal(first.length, 3); assert.equal(last.length, 3);
  assert.notDeepEqual(first.map(item => item.title), last.map(item => item.title));
});

test('gun lists do not pad with generic action or lose firearm relevance after showing a match', () => {
  const s = R.session('mix', 'movie'); R.interpret(s, 'Give me 5 gun movies');
  const first = movie('Armed Crime', 100, { synopsis: 'A firearms crew prepares an armed robbery.' });
  const second = movie('Shootout', 100, { synopsis: 'A detective faces a gunfight and shootouts.' });
  const generic = movie('Fast Running', 100, { genres: ['Action'], synopsis: 'A hero runs from danger.' });
  const picks = R.selectWeighted(R.rank([first, second, generic], s), 5);
  assert.equal(picks.length, 2); assert.ok(picks.every(item => item.matchSignals.includes('firearms')));
  R.show(s, first); assert.deepEqual(R.rank([first, second, generic], s).map(item => item.title), ['Shootout']);
  R.show(s, second); assert.deepEqual(R.rank([first, second, generic], s), []);
  assert.equal(R.rank([first, second, generic], s, [], { ignoreHistory: true }).length, 2);
});

test('exhausted creator matches never silently turn into unrelated creator picks', () => {
  const s = R.session('mix', 'movie'); R.interpret(s, 'Christopher Nolan movie');
  const exact = movie('Nolan Pick', 100, { creator: 'Christopher Nolan' });
  const other = movie('Unrelated', 100, { creator: 'Someone Else' });
  R.show(s, exact); assert.deepEqual(R.rank([exact, other], s), []);
});

test('weighted lists never pad a strong semantic match with distant low-scoring candidates', () => {
  const strong = { ...movie('Strong match'), matchScore: 60 };
  const unrelated = { ...movie('Unrelated'), matchScore: 5 };
  assert.deepEqual(R.selectWeighted([strong, unrelated], 5, () => .99).map(item => item.title), ['Strong match']);
  assert.deepEqual(R.selectWeighted([], 5), []);
});
