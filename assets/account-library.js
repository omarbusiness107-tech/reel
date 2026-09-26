(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ReelAccountLibrary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const personalKeys = new Set([
    'id', 'titleId', 'userId', 'status', 'rating', 'fav', 'favorite',
    'season', 'episode', 'page', 'chapter', 'stoppedAtSec', 'notes', 'tags',
    'added', 'updated', 'finished', 'startedAt', 'completedAt', 'lastInteractionAt',
    'watchedEpisodes'
  ]);
  const transientKeys = new Set(['episodeCatalog']);

  const clean = value => String(value == null ? '' : value).trim();
  const normalize = value => clean(value).toLocaleLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

  function hash(value) {
    let a = 0x811c9dc5;
    for (const char of String(value)) {
      a ^= char.codePointAt(0);
      a = Math.imul(a, 0x01000193) >>> 0;
    }
    return a.toString(16).padStart(8, '0');
  }

  function providerIdentity(item) {
    const identity = clean(item.catalogId || (item.tvmaze ? `tvmaze:${item.tvmaze}` : '') ||
      (item.kitsu ? `kitsu-anime:${item.kitsu}` : '') || (item.kitsuManga ? `kitsu-manga:${item.kitsuManga}` : '') ||
      (item.wd ? `wikidata:${item.wd}` : '') || item.sourceUrl);
    if (/^https?:\/\//i.test(identity)) return { provider: 'url', providerId: hash(identity.toLocaleLowerCase()) };
    const match = /^([a-z0-9_-]+):(.+)$/i.exec(identity);
    if (match) return { provider: match[1].toLocaleLowerCase(), providerId: clean(match[2]) };
    const fingerprint = [item.type, normalize(item.title), item.year || ''].join('|');
    return { provider: 'reel', providerId: hash(fingerprint) };
  }

  function iso(value) {
    if (!value) return null;
    const date = typeof value === 'number' ? new Date(value) : new Date(String(value));
    return Number.isNaN(date.valueOf()) ? null : date.toISOString();
  }

  function metadataFor(item) {
    const metadata = {};
    for (const [key, value] of Object.entries(item || {})) {
      if (personalKeys.has(key) || transientKeys.has(key) || key.startsWith('_') || value === undefined) continue;
      metadata[key] = value;
    }
    return metadata;
  }

  function toSyncEntry(item) {
    const identity = providerIdentity(item);
    return {
      ...identity,
      mediaType: clean(item.type) || 'movie',
      title: clean(item.title),
      year: Number.isFinite(Number(item.year)) ? Number(item.year) : null,
      posterUrl: clean(item.cover) || null,
      backdropUrl: clean(item.banner) || null,
      description: clean(item.synopsis) || null,
      creator: clean(item.creator) || null,
      genres: Array.isArray(item.genres) ? item.genres.filter(Boolean) : [],
      runtimeMinutes: Number.isFinite(Number(item.runtime)) ? Number(item.runtime) : null,
      pageCount: Number.isFinite(Number(item.pages)) ? Number(item.pages) : null,
      publicRating: Number.isFinite(Number(item.score)) ? Number(item.score) : null,
      metadata: metadataFor(item),
      status: clean(item.status) || 'want',
      rating: Number.isFinite(Number(item.rating)) ? Number(item.rating) : 0,
      favorite: !!item.fav,
      currentSeason: Number.isFinite(Number(item.season)) ? Number(item.season) : 1,
      currentEpisode: Number.isFinite(Number(item.episode)) ? Number(item.episode) : 0,
      currentPage: Number.isFinite(Number(item.page)) ? Number(item.page) : 0,
      currentChapter: Number.isFinite(Number(item.chapter)) ? Number(item.chapter) : 0,
      stoppedAtSec: Number.isFinite(Number(item.stoppedAtSec)) ? Number(item.stoppedAtSec) : 0,
      notes: clean(item.notes),
      tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
      startedAt: iso(item.startedAt),
      completedAt: iso(item.finished || item.completedAt),
      lastInteractionAt: iso(item.updated) || new Date().toISOString(),
      createdAt: iso(item.added) || new Date().toISOString()
    };
  }

  function toSyncEntries(items) {
    const unique = new Map();
    for (const item of Array.isArray(items) ? items : []) {
      const entry = toSyncEntry(item);
      if (!entry.title) continue;
      unique.set(`${entry.provider}\u0000${entry.providerId}`, entry);
    }
    return [...unique.values()];
  }

  const millis = value => value ? new Date(value).valueOf() : null;

  function fromRow(row) {
    const title = row.title || row.titles || {};
    const metadata = title.metadata && typeof title.metadata === 'object' ? title.metadata : {};
    const item = {
      ...metadata,
      id: String(row.id),
      titleId: String(row.title_id || title.id || ''),
      title: title.title || metadata.title || '',
      key: metadata.key || normalize(title.title || metadata.title),
      type: title.media_type || metadata.type || 'movie',
      year: title.release_year ?? metadata.year ?? null,
      cover: title.poster_url || metadata.cover || '',
      banner: title.backdrop_url || metadata.banner || '',
      synopsis: title.description || metadata.synopsis || '',
      creator: title.creator || metadata.creator || '',
      genres: Array.isArray(title.genres) ? title.genres : (metadata.genres || []),
      runtime: title.runtime_minutes ?? metadata.runtime ?? null,
      pages: title.page_count ?? metadata.pages ?? null,
      score: title.public_rating ?? metadata.score ?? null,
      catalogId: metadata.catalogId || (title.provider && title.provider !== 'reel' ? `${title.provider}:${title.provider_id}` : ''),
      status: row.status || 'want',
      rating: Number(row.rating) || 0,
      fav: !!row.favorite,
      season: Number(row.current_season) || 1,
      episode: Number(row.current_episode) || 0,
      page: Number(row.current_page) || 0,
      chapter: Number(row.current_chapter) || 0,
      stoppedAtSec: Number(row.stopped_at_sec) || 0,
      watchedEpisodes: Array.isArray(row.watched_episodes) ? row.watched_episodes : null,
      notes: row.notes || '',
      tags: Array.isArray(row.tags) ? row.tags : [],
      startedAt: millis(row.started_at),
      finished: millis(row.completed_at),
      added: millis(row.created_at) || Date.now(),
      updated: millis(row.last_interaction_at || row.updated_at) || Date.now()
    };
    return item;
  }

  function fromRows(rows) {
    return (Array.isArray(rows) ? rows : []).map(fromRow);
  }

  return { providerIdentity, toSyncEntry, toSyncEntries, fromRow, fromRows };
});
