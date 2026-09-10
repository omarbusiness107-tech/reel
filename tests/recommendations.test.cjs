const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../assets/recommendations-core.js');
const movie = (title, runtime = 90, extra = {}) => R.candidate({ title, type: 'movie', year: 2020, runtime, genres: ['Comedy'], synopsis: 'A heartwarming comedy about friendship.', ...extra }, true);

test('My List never admits external titles, even if they rank better', () => {
  const s = R.session(); R.interpret(s, 'I want something funny');
  const out = R.candidate({ title: 'External', type: 'movie', score: 10, genres: ['Comedy'] });
  assert.deepEqual(R.rank([out, movie('Saved')], s).map(c => c.title), ['Saved']);
});
test('another and shorter preserve context and exclude previously shown results', () => {
  const s = R.session(); R.interpret(s, 'I am tired, give me a funny movie under 100 minutes');
  const one = movie('First', 95); R.show(s, one); R.interpret(s, 'Another but shorter');
  assert.equal(s.intent.maxRuntime, 94); assert.equal(s.intent.mediaType, 'movie');
  assert.ok(s.intent.currentMood.includes('tired')); assert.ok(s.intent.desiredMood.includes('funny'));
  assert.deepEqual(R.rank([one, movie('Long', 100), movie('Short', 80)], s).map(c => c.title), ['Short']);
});
test('sad does not mean the user wants sad media; question has suggestions', () => {
  const s = R.session(); R.interpret(s, "I'm sad");
  assert.deepEqual(s.intent.desiredMood, []);
  const q = R.question(s); assert.ok(q.text.includes('change')); assert.equal(q.chips.length, 4);
  s.questions.push(q.id); R.interpret(s, 'Something comforting'); assert.equal(R.question(s), null);
});
test('specific requests skip unnecessary questions and parse known hard limits', () => {
  const s = R.session(); R.interpret(s, 'A funny family movie under 100 minutes suitable for an 8-year-old');
  assert.equal(R.question(s), null); assert.equal(s.intent.maxRuntime, 100); assert.equal(s.intent.childAge, 8);
  const a = movie('PG', 95, { ageRating: 'PG' });
  const b = movie('Unknown', 90); const c = movie('Adult', 80, { ageRating: 'R' });
  assert.deepEqual(R.rank([a, b, c], s).map(x => x.title), ['PG']);
});
test('unknown or invalid runtime is never accepted for a length limit', () => {
  const s = R.session(); s.intent.maxRuntime = 90;
  assert.equal(R.rank([movie('No time', null), movie('Negative', -3), movie('Fine', 90)], s).length, 1);
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
test('Ask Me is bounded and never repeats the same question', () => {
  const s = R.session(); s.mode = 'ask';
  for (const answer of ['Something relaxing', 'Something to watch', 'Under 120 minutes']) {
    const q = R.question(s); assert.ok(q); assert.ok(q.chips.length >= 3); s.questions.push(q.id); R.interpret(s, answer);
  }
  assert.equal(R.question(s), null); assert.equal(new Set(s.questions).size, s.questions.length);
});
test('readable length constraints do not treat episode counts as book pages', () => {
  const s = R.session(); R.interpret(s, 'A book under 200 pages');
  assert.equal(s.intent.maxPages, 200);
  assert.equal(R.rank([R.candidate({ title: 'Book', type: 'book', pages: 150 }, true), R.candidate({ title: 'Show', type: 'anime', pages: 12 }, true)], s).length, 1);
});
