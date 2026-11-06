import test from "node:test";
import assert from "node:assert/strict";
import {
  searchTitles,
  searchMovieIndex,
  resolvePosters,
  titleSearchSources,
} from "../src/services/catalog";
import { posterUrls, imageUrl } from "../src/core/artwork";
import { searchCore } from "../src/core/shared";
import type { Title } from "../src/core/types";

const movie: Title = {
  id: "imdb:tt15671028",
  imdb: "tt15671028",
  title: "No Hard Feelings",
  type: "movie",
  year: 2023,
  genres: [],
};
const suggestion = {
  id: "tt15671028",
  l: "No Hard Feelings",
  qid: "movie",
  y: 2023,
  rank: 1552,
  i: { imageUrl: "https://m.media-amazon.com/images/M/poster._V1_.jpg" },
};
function reply(data: unknown) {
  return Promise.resolve(new Response(JSON.stringify(data)));
}

test("movie index recovers No Hard Feelings and other films when the primary catalog is unavailable", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.includes("media-imdb.com"))
      return reply({
        d: [
          suggestion,
          { ...suggestion, id: "tt0151804", l: "Office Space", y: 1999 },
        ],
      });
    if (url.includes("cinemeta")) throw new Error("catalog outage");
    return reply(url.includes("tvmaze") ? [] : { data: [] });
  });
  const result = await searchTitles("No Hard Feelings");
  assert.ok(
    result.items.some(
      (item) => item.imdb === movie.imdb && item.year === 2023 && item.cover,
    ),
  );
  assert.ok(result.items.some((item) => item.imdb === "tt0151804"));
  assert.ok(
    result.warnings.some((warning) => warning.includes("Movie catalog")),
  );
});

test("movie index uses actual media types, IDs, years and popularity; ignores people/episodes/games", async (t) => {
  let request = "";
  t.mock.method(globalThis, "fetch", async (url: string) => {
    request = url;
    return reply({
      d: [
        suggestion,
        { ...suggestion, id: "nm123", qid: "name" },
        { ...suggestion, id: "tt2", qid: "tvEpisode" },
        { ...suggestion, id: "tt3", qid: "videoGame" },
        { ...suggestion, id: "tt4", qid: "tvMovie" },
      ],
    });
  });
  const result = await searchMovieIndex("  No   Hard Feelings  ");
  assert.equal(result.length, 2);
  assert.ok(request.endsWith("/n/No%20Hard%20Feelings.json"));
  assert.equal(result[0].popularityRank, 1552);
  assert.equal(
    result[0].cover,
    "https://m.media-amazon.com/images/M/poster._V1_SX400.jpg",
  );
});

test("catalog and index results deduplicate by identity without merging different release years", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.includes("media-imdb.com"))
      return reply({
        d: [suggestion, { ...suggestion, id: "tt8892064", y: 2020 }],
      });
    if (url.includes("cinemeta"))
      return reply({
        metas: [
          {
            id: suggestion.id,
            name: suggestion.l,
            type: "movie",
            year: "2023",
          },
        ],
      });
    return reply(url.includes("tvmaze") ? [] : { data: [] });
  });
  const result = await searchTitles(movie.title);
  assert.equal(result.items.length, 2);
  assert.ok(result.items.every((item) => item.cover));
  assert.equal(result.items.filter((item) => item.year === 2023).length, 1);
  assert.equal(
    [...result.items].sort((a, b) => searchCore.compare(a, b, movie.title))[0]
      .year,
    2023,
  );
});

test("a fast movie source resolves while an unrelated catalog is still pending", async (t) => {
  let finishAnime!: (response: Response) => void;
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.includes("kitsu"))
      return new Promise<Response>((resolve) => {
        finishAnime = resolve;
      });
    if (url.includes("media-imdb.com")) return reply({ d: [suggestion] });
    return reply({ metas: [] });
  });
  const anime = titleSearchSources[3].search(movie.title);
  const films = await titleSearchSources[1].search(movie.title);
  assert.equal(films[0].imdb, movie.imdb);
  finishAnime(new Response('{"data":[]}'));
  await anime;
});

test("poster recovery accepts only the same IMDb ID, preserving remakes and namesakes", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.includes("cinemeta")) throw new Error("outage");
    return reply({
      d: [
        {
          ...suggestion,
          id: "tt8892064",
          y: 2020,
          i: { imageUrl: "https://images.example/wrong-film.jpg" },
        },
        suggestion,
      ],
    });
  });
  const urls = await resolvePosters(movie);
  assert.ok(urls.some((url) => url.includes("poster._V1_SX400")));
  assert.ok(!urls.some((url) => url.includes("wrong-film")));
});

test("poster recovery retrieves alternate television posters, excluding backgrounds", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    reply([
      {
        type: "background",
        resolutions: { original: { url: "https://images.example/banner.jpg" } },
      },
      {
        type: "poster",
        resolutions: {
          medium: { url: "http://images.example/medium.jpg" },
          original: { url: "https://images.example/original.jpg" },
        },
      },
    ]),
  );
  assert.deepEqual(
    await resolvePosters({
      ...movie,
      id: "tvmaze:42",
      imdb: undefined,
      tvmaze: 42,
      type: "series",
    }),
    [
      "https://images.example/medium.jpg",
      "https://images.example/original.jpg",
    ],
  );
});

test("poster candidates are unique, HTTPS and identity based; do not use banners as posters", () => {
  const urls = posterUrls(
    {
      ...movie,
      cover: "http://images.example/a.jpg",
      posterCandidates: [
        "https://images.example/a.jpg",
        "N/A",
        "javascript:bad",
      ],
      banner: "https://images.example/banner.jpg",
    },
    ["https://images.example/b.jpg"],
  );
  assert.deepEqual(urls, [
    "https://images.example/a.jpg",
    "https://images.example/b.jpg",
    "https://images.metahub.space/poster/medium/tt15671028/img",
  ]);
  assert.equal(imageUrl("N/A"), undefined);
  assert.equal(imageUrl(""), undefined);
  assert.equal(
    imageUrl(" https://images.example/a.jpg "),
    "https://images.example/a.jpg",
  );
});
