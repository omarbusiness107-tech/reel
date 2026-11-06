import type { Episode, Person, Title } from "../core/types";
import { searchCore } from "../core/shared";
import { imageUrl, imdbId } from "../core/artwork";

const CINEMA = "https://v3-cinemeta.strem.io";
const TV = "https://api.tvmaze.com";
export async function json<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
      : AbortSignal.timeout(20000),
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(
      `Catalog request failed (${response.status}). Try again shortly.`,
    );
  return response.json() as Promise<T>;
}
const text = (value?: string) =>
  (value || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
const https = imageUrl;
interface TvShow {
  id: number;
  name: string;
  genres: string[];
  premiered?: string;
  summary?: string;
  image?: { original?: string; medium?: string };
  rating?: { average?: number };
  runtime?: number;
  averageRuntime?: number;
  language?: string;
  network?: { country?: { name: string } };
  url?: string;
  type?: string;
  externals?: { imdb?: string };
  weight?: number;
}
interface Meta {
  id?: string;
  imdb_id?: string;
  name: string;
  type: string;
  year?: string;
  releaseInfo?: string;
  poster?: string;
  background?: string;
  description?: string;
  genres?: string[];
  genre?: string[];
  director?: string[];
  cast?: string[];
  imdbRating?: string;
  runtime?: string;
  country?: string;
}
export function tvTitle(show: TvShow): Title {
  return {
    id: `tvmaze:${show.id}`,
    catalogId: `tvmaze:${show.id}`,
    tvmaze: show.id,
    title: show.name,
    type:
      show.type === "Animation" && show.language === "Japanese"
        ? "anime"
        : "series",
    genres: [
      ...new Set([
        ...(show.genres || []),
        ...(show.type === "Animation" ? ["Animation"] : []),
      ]),
    ],
    year: Number(show.premiered?.slice(0, 4)) || null,
    cover: https(show.image?.medium || show.image?.original),
    posterCandidates: [
      https(show.image?.original),
      https(show.image?.medium),
    ].filter((url): url is string => !!url),
    synopsis: text(show.summary),
    score: show.rating?.average,
    runtime: show.averageRuntime || show.runtime,
    language: show.language,
    country: show.network?.country?.name,
    sourceUrl: show.url || `${TV}/shows/${show.id}`,
    imdb: show.externals?.imdb,
    popularity: show.weight,
  };
}
export function movieTitle(meta: Meta): Title {
  const id = meta.imdb_id || meta.id || "";
  return {
    id: `imdb:${id}`,
    catalogId: `imdb:${id}`,
    imdb: id,
    title: meta.name,
    type: meta.type === "series" ? "series" : "movie",
    year: Number((meta.year || meta.releaseInfo || "").slice(0, 4)) || null,
    genres: meta.genres || meta.genre || [],
    cover: https(meta.poster),
    banner: https(meta.background),
    synopsis: meta.description,
    creator: meta.director?.join(", "),
    cast: meta.cast,
    score: Number(meta.imdbRating) || null,
    runtime: parseInt(meta.runtime || "", 10) || null,
    country: meta.country,
    sourceUrl: `https://www.imdb.com/title/${id}/`,
  };
}
interface Kitsu {
  id: string;
  attributes: {
    canonicalTitle: string;
    titles?: { en?: string };
    synopsis?: string;
    startDate?: string;
    posterImage?: {
      large?: string;
      medium?: string;
      original?: string;
      small?: string;
    };
    coverImage?: { large?: string };
    averageRating?: string;
    episodeLength?: number;
    subtype?: string;
  };
}
function animeTitle(record: Kitsu): Title {
  const a = record.attributes;
  return {
    id: `kitsu-anime:${record.id}`,
    catalogId: `kitsu-anime:${record.id}`,
    kitsu: record.id,
    title: a.titles?.en || a.canonicalTitle,
    type: a.subtype === "movie" ? "movie" : "anime",
    year: Number(a.startDate?.slice(0, 4)) || null,
    genres: ["Animation"],
    cover: https(a.posterImage?.large),
    posterCandidates: [
      a.posterImage?.medium,
      a.posterImage?.original,
      a.posterImage?.small,
    ]
      .map(https)
      .filter((url): url is string => !!url),
    banner: https(a.coverImage?.large),
    synopsis: a.synopsis,
    score: Number(a.averageRating) / 10 || null,
    runtime: a.episodeLength,
    sourceUrl: `https://kitsu.app/anime/${record.id}`,
  };
}
export interface CatalogResult {
  items: Title[];
  warnings: string[];
}
interface MovieSuggestion {
  id: string;
  l: string;
  qid?: string;
  q?: string;
  y?: number;
  rank?: number;
  s?: string;
  i?: { imageUrl?: string };
}
export async function searchMovieIndex(
  query: string,
  signal?: AbortSignal,
): Promise<Title[]> {
  const value = query.trim().replace(/\s+/g, " ");
  if (value.length < 2) return [];
  const initial = /^[a-z0-9]/i.exec(value)?.[0].toLowerCase() || "x";
  const data = await json<{ d?: MovieSuggestion[] }>(
    `https://v3.sg.media-imdb.com/suggestion/${initial}/${encodeURIComponent(value)}.json`,
    signal,
  );
  return (data.d || [])
    .filter(
      (item) =>
        /^tt\d+$/.test(item.id) &&
        typeof item.l === "string" &&
        (item.qid
          ? ["movie", "tvMovie", "short", "tvShort", "video"].includes(item.qid)
          : /^(feature|TV movie|short|video)$/i.test(item.q || "")),
    )
    .map((item) => ({
      id: `imdb:${item.id}`,
      catalogId: `imdb:${item.id}`,
      imdb: item.id,
      title: item.l,
      type: "movie",
      year: item.y || null,
      genres: [],
      cover: https(item.i?.imageUrl?.replace(/\._V1_\.jpg$/, "._V1_SX400.jpg")),
      posterCandidates: [https(item.i?.imageUrl)].filter(
        (url): url is string => !!url,
      ),
      popularityRank: item.rank,
      cast: item.s?.split(", ").filter(Boolean),
      sourceUrl: `https://www.imdb.com/title/${item.id}/`,
    }));
}

// The screen queries sources independently: a slow/outage source must not hide
// results already returned by another one. The assistant can still collect all.
export const titleSearchSources = [
  {
    key: "movies",
    label: "Movie catalog",
    search: async (query: string, signal?: AbortSignal) => {
      const data = await json<{ metas?: Meta[] }>(
        `${CINEMA}/catalog/movie/top/search=${encodeURIComponent(query.trim())}.json`,
        signal,
      );
      return (data.metas || []).slice(0, 24).map(movieTitle);
    },
  },
  { key: "movie-index", label: "Movie index", search: searchMovieIndex },
  {
    key: "television",
    label: "Television",
    search: async (query: string, signal?: AbortSignal) => {
      const data = await json<{ show: TvShow }[]>(
        `${TV}/search/shows?q=${encodeURIComponent(query.trim())}`,
        signal,
      );
      return data.slice(0, 20).map((row) => tvTitle(row.show));
    },
  },
  {
    key: "anime",
    label: "Anime",
    search: async (query: string, signal?: AbortSignal) => {
      const data = await json<{ data: Kitsu[] }>(
        `https://kitsu.io/api/edge/anime?filter[text]=${encodeURIComponent(query.trim())}&page[limit]=12`,
        signal,
      );
      return data.data.map(animeTitle);
    },
  },
] as const;
async function collect(
  tasks: Promise<Title[]>[],
  labels: string[],
): Promise<CatalogResult> {
  const result = await Promise.allSettled(tasks);
  const items = result.flatMap((r) =>
    r.status === "fulfilled" ? r.value : [],
  );
  const warnings = result.flatMap((r, i) =>
    r.status === "rejected"
      ? [`${labels[i]} is unavailable. Other sources are still shown.`]
      : [],
  );
  if (result.every((r) => r.status === "rejected"))
    throw new Error(
      "The catalogs could not be reached. Check your connection and retry.",
    );
  return { items: searchCore.dedupe(items), warnings };
}
export async function discover(signal?: AbortSignal): Promise<CatalogResult> {
  return collect(
    [
      json<{ metas: Meta[] }>(`${CINEMA}/catalog/movie/top.json`, signal).then(
        (d) => d.metas.slice(0, 24).map(movieTitle),
      ),
      json<TvShow[]>(`${TV}/shows?page=1`, signal).then((d) =>
        d
          .sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0))
          .slice(0, 18)
          .map(tvTitle),
      ),
      json<{ data: Kitsu[] }>(
        "https://kitsu.io/api/edge/anime?sort=-userCount&page[limit]=12",
        signal,
      ).then((d) => d.data.map(animeTitle)),
    ],
    ["Movies", "Television", "Anime"],
  );
}
export async function searchTitles(
  query: string,
  signal?: AbortSignal,
): Promise<CatalogResult> {
  if (query.trim().length < 2) return { items: [], warnings: [] };
  return collect(
    titleSearchSources.map((source) => source.search(query, signal)),
    titleSearchSources.map((source) => source.label),
  );
}

// Recover only by an existing provider ID. Name-only poster matching can attach
// an unrelated remake/adaptation to a user's saved title.
export async function resolvePosters(
  title: Title,
  signal?: AbortSignal,
): Promise<string[]> {
  const id = imdbId(title);
  let urls: (string | undefined)[] = [];
  if (id) {
    const results = await Promise.allSettled([
      json<{ meta?: Meta }>(
        `${CINEMA}/meta/${title.type === "series" ? "series" : "movie"}/${id}.json`,
        signal,
      ).then((data) => [https(data.meta?.poster)]),
      searchMovieIndex(title.title, signal).then((matches) => {
        const exact = matches.find((item) => item.imdb === id);
        return exact ? [exact.cover, ...(exact.posterCandidates || [])] : [];
      }),
    ]);
    signal?.throwIfAborted();
    urls = results.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    );
  } else {
    const tvId =
      title.tvmaze || /^tvmaze:(\d+)$/.exec(title.catalogId || title.id)?.[1];
    const kitsuId =
      title.kitsu ||
      /^kitsu-anime:(\d+)$/.exec(title.catalogId || title.id)?.[1];
    if (tvId) {
      const images = await json<
        {
          type: string;
          resolutions: { original?: { url: string }; medium?: { url: string } };
        }[]
      >(`${TV}/shows/${tvId}/images`, signal);
      urls = images
        .filter((item) => item.type === "poster")
        .flatMap((item) => [
          https(item.resolutions.medium?.url),
          https(item.resolutions.original?.url),
        ]);
    } else if (kitsuId) {
      const data = await json<{ data: Kitsu }>(
        `https://kitsu.io/api/edge/anime/${kitsuId}`,
        signal,
      );
      const image = data.data.attributes.posterImage;
      urls.push(
        ...[image?.large, image?.medium, image?.original, image?.small].map(
          https,
        ),
      );
    }
  }
  return [...new Set(urls.filter((url): url is string => !!url))];
}
export async function searchPeople(
  query: string,
  signal?: AbortSignal,
): Promise<Person[]> {
  const q = encodeURIComponent(query);
  const [tv, wd] = await Promise.allSettled([
    json<
      { person: { id: number; name: string; image?: { medium?: string } } }[]
    >(`${TV}/search/people?q=${q}`, signal),
    json<{ search: { id: string; label: string; description?: string }[] }>(
      `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${q}&language=en&format=json&origin=*`,
      signal,
    ),
  ]);
  if (tv.status === "rejected" && wd.status === "rejected")
    throw new Error("People search is unavailable.");
  const people: Person[] =
    tv.status === "fulfilled"
      ? tv.value.slice(0, 8).map(({ person: p }) => ({
          id: String(p.id),
          name: p.name,
          image: https(p.image?.medium),
          provider: "tvmaze",
        }))
      : [];
  if (wd.status === "fulfilled")
    for (const p of wd.value.search)
      if (
        /actor|actress|director|filmmaker|screenwriter/i.test(
          p.description || "",
        )
      ) {
        if (!people.some((x) => x.provider === "wikidata" && x.id === p.id))
          people.push({
            id: p.id,
            name: p.label,
            role: p.description,
            provider: "wikidata",
          });
      }
  return people.slice(0, 12);
}
export async function titleDetails(
  id: string,
  seed?: Title,
  signal?: AbortSignal,
): Promise<Title> {
  if (id.startsWith("tvmaze:")) {
    const num = id.slice(7);
    const [show, cast, crew, images] = await Promise.all([
      json<TvShow>(`${TV}/shows/${num}`, signal),
      json<
        { person: { id: number; name: string; image?: { medium?: string } } }[]
      >(`${TV}/shows/${num}/cast`, signal),
      json<{ type: string; person: { id: number; name: string } }[]>(
        `${TV}/shows/${num}/crew`,
        signal,
      ),
      json<{ type: string; resolutions: { original: { url: string } } }[]>(
        `${TV}/shows/${num}/images`,
        signal,
      ).catch(() => []),
    ]);
    const people: Person[] = [
      ...cast.slice(0, 20).map(({ person: p }) => ({
        id: String(p.id),
        name: p.name,
        image: https(p.image?.medium),
        provider: "tvmaze" as const,
      })),
      ...crew
        .filter((p) => /creator|director/i.test(p.type))
        .slice(0, 6)
        .map(({ person: p, type }) => ({
          id: String(p.id),
          name: p.name,
          role: type,
          provider: "tvmaze" as const,
        })),
    ];
    return {
      ...seed,
      ...tvTitle(show),
      people,
      cast: people.filter((p) => !p.role),
      creator: people
        .filter((p) => p.role)
        .map((p) => p.name)
        .join(", "),
      banner: https(
        images.find((i) => i.type === "background")?.resolutions.original.url,
      ),
    };
  }
  if (id.startsWith("imdb:")) {
    const d = await json<{ meta: Meta }>(
      `${CINEMA}/meta/movie/${id.slice(5)}.json`,
      signal,
    );
    return { ...seed, ...movieTitle(d.meta) };
  }
  if (id.startsWith("kitsu-anime:")) {
    const d = await json<{ data: Kitsu }>(
      `https://kitsu.io/api/edge/anime/${id.slice(12)}`,
      signal,
    );
    return { ...seed, ...animeTitle(d.data) };
  }
  if (seed) return seed;
  throw new Error(
    "This title is unavailable. Open it again from your library.",
  );
}
export async function episodes(
  title: Title,
  signal?: AbortSignal,
): Promise<Episode[]> {
  const tvId =
    title.tvmaze || /^tvmaze:(\d+)$/.exec(title.catalogId || "")?.[1];
  if (!tvId) return title.episodeCatalog || [];
  const data = await json<(Episode & { number: number | null })[]>(
    `${TV}/shows/${tvId}/episodes`,
    signal,
  );
  return data.filter(
    (ep): ep is Episode =>
      Number.isInteger(ep.number) && Number(ep.number) > 0 && ep.season > 0,
  );
}
export async function personDetails(
  provider: string,
  id: string,
  signal?: AbortSignal,
): Promise<{ person: Person; bio: string; works: Title[] }> {
  if (provider === "tvmaze" && /^\d+$/.test(id)) {
    const [p, cast, crew] = await Promise.all([
      json<{
        id: number;
        name: string;
        image?: { original?: string };
        country?: { name: string };
        birthday?: string;
      }>(`${TV}/people/${id}`, signal),
      json<{ _embedded: { show: TvShow } }[]>(
        `${TV}/people/${id}/castcredits?embed=show`,
        signal,
      ),
      json<{ _embedded: { show: TvShow } }[]>(
        `${TV}/people/${id}/crewcredits?embed=show`,
        signal,
      ),
    ]);
    return {
      person: {
        id,
        name: p.name,
        image: p.image?.original,
        provider: "tvmaze",
      },
      bio: [p.country?.name, p.birthday ? `Born ${p.birthday}` : ""]
        .filter(Boolean)
        .join(" · "),
      works: searchCore.dedupe(
        [...cast, ...crew].map((c) => tvTitle(c._embedded.show)),
      ),
    };
  }
  if (provider === "wikidata" && /^Q\d+$/.test(id)) {
    const d = await json<{
      entities: Record<
        string,
        {
          labels: { en?: { value: string } };
          descriptions: { en?: { value: string } };
        }
      >;
    }>(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${id}&props=labels%7Cdescriptions&languages=en&format=json&origin=*`,
      signal,
    );
    const entity = d.entities[id];
    const sparql = `SELECT DISTINCT ?imdb WHERE { ?work (wdt:P161|wdt:P57) wd:${id}; wdt:P345 ?imdb. } LIMIT 24`;
    const credits = await json<{
      results: { bindings: { imdb: { value: string } }[] };
    }>(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`,
      signal,
    );
    const results = await Promise.allSettled(
      credits.results.bindings
        .slice(0, 18)
        .map((row) =>
          titleDetails(`imdb:${row.imdb.value}`, undefined, signal),
        ),
    );
    return {
      person: { id, name: entity.labels.en?.value || id, provider: "wikidata" },
      bio: entity.descriptions.en?.value || "",
      works: results.flatMap((r) =>
        r.status === "fulfilled" ? [r.value] : [],
      ),
    };
  }
  throw new Error("This person could not be resolved.");
}
