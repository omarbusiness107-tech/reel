import test from "node:test";
import assert from "node:assert/strict";
import { personRecord, personFromRoute, personKey } from "../src/core/people";
import {
  resolveActor,
  getPersonProfile,
  getPersonCredits,
} from "../src/services/people";
import type { Person } from "../src/core/types";
const actor: Person = {
  id: "nm2225369",
  provider: "imdb",
  name: "Jennifer Lawrence",
  image: "https://images.example/jennifer.jpg",
  role: "Actress, The Hunger Games (2012)",
};
function reply(data: unknown) {
  return Promise.resolve(new Response(JSON.stringify(data)));
}
test("actor routes preserve provider identity, full names and legacy links", () => {
  for (const person of [
    actor,
    { id: "42", provider: "tvmaze", name: "A television actor" },
    { id: "Q189490", provider: "wikidata", name: "Jennifer Lawrence" },
    personRecord("André: an actor"),
  ] as Person[]) {
    const parsed = personFromRoute(personKey(person), undefined, person.name);
    assert.equal(parsed.provider, person.provider);
    assert.equal(parsed.id, person.id);
    assert.equal(parsed.name, person.name);
  }
  assert.equal(
    personFromRoute("42", "tvmaze", "A television actor").provider,
    "tvmaze",
  );
  assert.equal(
    personRecord({ id: "nm2225369", name: "Jennifer Lawrence" } as Person)
      .provider,
    "imdb",
  );
  assert.equal(
    personRecord({
      id: "undefined",
      name: "Jennifer Lawrence",
      provider: "tvmaze",
    }).provider,
    "name",
  );
});
test("name-only movie cast resolves to the exact professional person, not a title or namesake", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    reply({
      d: [
        {
          id: "nm2225369",
          l: "Jennifer Lawrence",
          s: actor.role,
          i: { imageUrl: actor.image },
        },
        { id: "tt1", l: "Jennifer Lawrence", qid: "movie" },
        { id: "nm99", l: "Jennifer Lawrence" },
        {
          id: "nm0492821",
          l: "Jennifer Lawrence",
          s: "Actress, Golfballs! (1999)",
        },
      ],
    }),
  );
  const person = await resolveActor("Jennifer Lawrence");
  assert.equal(person.id, actor.id);
  assert.equal(person.provider, "imdb");
  assert.equal(person.image, actor.image);
});
test("ambiguous actor-name matches remain unresolved instead of assigning the wrong portrait", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    reply({
      d: [
        { id: "nm1", l: "Alex Smith", s: "Actor, First film (2020)" },
        { id: "nm2", l: "Alex Smith", s: "Actor, Another film (2021)" },
      ],
    }),
  );
  assert.equal((await resolveActor("Alex Smith")).provider, "name");
});
test("a known actor profile remains available when secondary metadata and credits fail", async (t) => {
  t.mock.method(globalThis, "fetch", async () => {
    throw new Error("provider outage");
  });
  const profile = await getPersonProfile(actor);
  assert.equal(profile.person.name, actor.name);
  assert.equal(profile.person.image, actor.image);
  assert.equal(profile.sources[0].label, "IMDb");
  await assert.rejects(
    getPersonCredits(profile),
    /Credits are temporarily unavailable/,
  );
});
test("TVMaze profile facts load independently of credits and other providers", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) => {
    assert.ok(url.endsWith("/people/42"));
    return reply({
      id: 42,
      name: "An actor",
      birthday: "1980-03-05",
      country: { name: "United Kingdom" },
      image: { medium: "https://images.example/actor.jpg" },
    });
  });
  const profile = await getPersonProfile({
    id: "42",
    provider: "tvmaze",
    name: "An actor",
  });
  assert.equal(profile.person.birthday, "1980-03-05");
  assert.equal(profile.person.country, "United Kingdom");
});
test("successful TV credits survive a failing crew or filmography source", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.includes("/castcredits"))
      return reply([
        {
          _embedded: {
            show: {
              id: 7,
              name: "A real series",
              genres: [],
              type: "Scripted",
            },
          },
        },
      ]);
    throw new Error("outage");
  });
  const works = await getPersonCredits({
    person: { id: "42", provider: "tvmaze", name: "An actor" },
    bio: "",
    sources: [],
  });
  assert.equal(works[0].id, "tvmaze:7");
  assert.equal(works.length, 1);
});
test("known-for movie recovery matches the supplied title and release year", async (t) => {
  t.mock.method(globalThis, "fetch", async (url: string) => {
    if (url.includes("media-imdb.com"))
      return reply({
        d: [
          { id: "tt1392170", l: "The Hunger Games", qid: "movie", y: 2012 },
          { id: "tt2", l: "The Hunger Games", qid: "movie", y: 2025 },
          { id: "tt3", l: "An unrelated movie", qid: "movie", y: 2012 },
        ],
      });
    throw new Error("filmography outage");
  });
  const works = await getPersonCredits({
    person: actor,
    bio: actor.role!,
    sources: [],
  });
  assert.deepEqual(
    works.map((work) => work.id),
    ["imdb:tt1392170"],
  );
});
