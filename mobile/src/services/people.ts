import type { Person, Title } from "../core/types";
import { personRecord } from "../core/people";
import { imageUrl } from "../core/artwork";
import { searchCore } from "../core/shared";
import { json, tvTitle, searchMovieIndex } from "./catalog";

interface IndexPerson {
  id: string;
  l: string;
  s?: string;
  rank?: number;
  i?: { imageUrl?: string };
}
interface TvPerson {
  id: number;
  name: string;
  image?: { medium?: string; original?: string };
  birthday?: string;
  country?: { name: string };
  url?: string;
}
export interface PersonProfile {
  person: Person;
  bio: string;
  sources: { label: string; url: string }[];
}

export async function searchActorIndex(
  name: string,
  signal?: AbortSignal,
): Promise<Person[]> {
  const initial = /^[a-z0-9]/i.exec(name)?.[0].toLowerCase() || "x";
  const data = await json<{ d?: IndexPerson[] }>(
    `https://v3.sg.media-imdb.com/suggestion/${initial}/${encodeURIComponent(name.trim())}.json`,
    signal,
  );
  return (data.d || [])
    .filter((p) => /^nm\d+$/.test(p.id))
    .sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity))
    .map((p) => ({
      id: p.id,
      name: p.l,
      provider: "imdb",
      imdb: p.id,
      role: p.s,
      image: imageUrl(p.i?.imageUrl?.replace(/\._V1_\.jpg$/, "._V1_SX300.jpg")),
      imageCandidates: [imageUrl(p.i?.imageUrl)].filter(
        (url): url is string => !!url,
      ),
      sourceUrl: `https://www.imdb.com/name/${p.id}/`,
    }));
}
function exactProfessional(
  matches: Person[],
  name: string,
): Person | undefined {
  const exact = matches.filter(
    (p) => searchCore.normalize(p.name) === searchCore.normalize(name),
  );
  const professional = exact.filter((p) =>
    /actor|actress|director|producer|performer|writer/i.test(p.role || ""),
  );
  const pictured = professional.filter((p) => p.image);
  return professional.length === 1
    ? professional[0]
    : pictured.length === 1 && pictured[0] === professional[0]
      ? pictured[0]
      : exact.length === 1
        ? exact[0]
        : undefined;
}
function fromTv(p: TvPerson): Person {
  return {
    id: String(p.id),
    tvmazeId: String(p.id),
    name: p.name,
    provider: "tvmaze",
    image: imageUrl(p.image?.medium || p.image?.original),
    imageCandidates: [imageUrl(p.image?.original)].filter(
      (url): url is string => !!url,
    ),
    birthday: p.birthday,
    country: p.country?.name,
    sourceUrl: p.url || `https://www.tvmaze.com/people/${p.id}`,
  };
}

export async function resolveActor(
  value: Person | string,
  signal?: AbortSignal,
): Promise<Person> {
  const p = personRecord(value);
  if (p.provider !== "name") return p;
  const matches = await searchActorIndex(p.name, signal);
  return exactProfessional(matches, p.name) || p;
}

export async function getPersonProfile(
  value: Person,
  signal?: AbortSignal,
): Promise<PersonProfile> {
  let p = await resolveActor(value, signal);
  const sources: PersonProfile["sources"] = [];
  let bio = p.role || "";
  if (p.provider === "tvmaze") {
    const record = await json<TvPerson>(
      `https://api.tvmaze.com/people/${p.id}`,
      signal,
    );
    p = { ...p, ...fromTv(record) };
    sources.push({ label: "TVMaze", url: p.sourceUrl! });
  } else if (p.provider === "imdb") {
    // Match the exact nm ID, never a namesake returned by the same query.
    if (p.name) {
      const [match, tv] = await Promise.all([
        p.image && p.role
          ? Promise.resolve(p)
          : searchActorIndex(p.name, signal)
              .then((items) => items.find((item) => item.id === p.id))
              .catch(() => undefined),
        json<{ person: TvPerson }[]>(
          `https://api.tvmaze.com/search/people?q=${encodeURIComponent(p.name)}`,
          signal,
        ).catch(() => []),
      ]);
      if (match) p = { ...p, ...match };
      const exact = tv.filter(
        ({ person }) =>
          searchCore.normalize(person.name) === searchCore.normalize(p.name),
      );
      if (exact.length === 1) {
        const record = exact[0].person;
        p = {
          ...p,
          image: p.image || fromTv(record).image,
          tvmazeId: String(record.id),
          birthday: record.birthday,
          country: record.country?.name,
        };
        sources.push({
          label: "TVMaze name match",
          url: record.url || `https://www.tvmaze.com/people/${record.id}`,
        });
      }
    }
    bio = p.role || bio;
    sources.unshift({
      label: "IMDb",
      url: `https://www.imdb.com/name/${p.id}/`,
    });
  } else if (p.provider === "wikidata") {
    const data = await json<{
      entities: Record<
        string,
        {
          labels?: { en?: { value: string } };
          descriptions?: { en?: { value: string } };
          claims?: Record<
            string,
            { mainsnak: { datavalue?: { value: string } } }[]
          >;
        }
      >;
    }>(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${p.id}&props=labels%7Cdescriptions%7Cclaims&languages=en&format=json&origin=*`,
      signal,
    );
    const entity = data.entities[p.id];
    if (!entity)
      throw new Error("This profile is temporarily unavailable. Please retry.");
    const image = entity.claims?.P18?.[0]?.mainsnak.datavalue?.value;
    p = {
      ...p,
      name: entity.labels?.en?.value || p.name,
      imdb: entity.claims?.P345?.[0]?.mainsnak.datavalue?.value,
      image:
        p.image ||
        (image
          ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(image)}?width=300`
          : undefined),
    };
    bio = entity.descriptions?.en?.value || bio;
    sources.push({
      label: "Wikidata",
      url: `https://www.wikidata.org/wiki/${p.id}`,
    });
  }
  signal?.throwIfAborted();
  return { person: p, bio, sources };
}

export async function getPersonCredits(
  profile: PersonProfile,
  signal?: AbortSignal,
): Promise<Title[]> {
  const p = { ...profile.person };
  if (!p.imdb && p.name) {
    const match = await searchActorIndex(p.name, signal)
      .then((items) => exactProfessional(items, p.name))
      .catch(() => undefined);
    if (match) {
      p.imdb = match.id;
      p.role = p.role || match.role;
    }
  }
  const tasks: Promise<Title[]>[] = [];
  const tvId = p.provider === "tvmaze" ? p.id : p.tvmazeId;
  if (tvId) {
    for (const type of ["castcredits", "crewcredits"])
      tasks.push(
        json<{ _embedded?: { show?: Parameters<typeof tvTitle>[0] } }[]>(
          `https://api.tvmaze.com/people/${tvId}/${type}?embed=show`,
          signal,
        ).then((rows) =>
          rows.flatMap((row) =>
            row._embedded?.show ? [tvTitle(row._embedded.show)] : [],
          ),
        ),
      );
  }
  const identity =
    p.provider === "wikidata" && /^Q\d+$/.test(p.id)
      ? `VALUES ?person { wd:${p.id} }`
      : /^nm\d+$/.test(p.imdb || p.id)
        ? `?person wdt:P345 "${p.imdb || p.id}" .`
        : "";
  if (identity) {
    const sparql = `SELECT DISTINCT ?imdb ?label ?date WHERE { ${identity} ?work (wdt:P161|wdt:P57) ?person; wdt:P31/wdt:P279* wd:Q11424; wdt:P345 ?imdb; rdfs:label ?label . FILTER(LANG(?label)="en") OPTIONAL { ?work wdt:P577 ?date } } LIMIT 24`;
    tasks.push(
      json<{
        results: {
          bindings: {
            imdb: { value: string };
            label: { value: string };
            date?: { value: string };
          }[];
        };
      }>(
        `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`,
        signal,
      ).then((data) =>
        data.results.bindings
          .filter((row) => /^tt\d+$/.test(row.imdb.value))
          .map((row) => ({
            id: `imdb:${row.imdb.value}`,
            catalogId: `imdb:${row.imdb.value}`,
            imdb: row.imdb.value,
            title: row.label.value,
            type: "movie",
            year: Number(row.date?.value.slice(0, 4)) || null,
            genres: [],
            cover: `https://images.metahub.space/poster/medium/${row.imdb.value}/img`,
            sourceUrl: `https://www.imdb.com/title/${row.imdb.value}/`,
          })),
      ),
    );
  }
  // IMDb's supplied profession includes a documented known-for title. Resolve
  // that title and year, rather than inventing an actor filmography on outage.
  const known = /, (.+) \((\d{4})\)\s*$/.exec(p.role || "");
  if (known)
    tasks.push(
      searchMovieIndex(known[1], signal).then((items) =>
        items.filter(
          (item) =>
            searchCore.normalize(item.title) ===
              searchCore.normalize(known[1]) && item.year === Number(known[2]),
        ),
      ),
    );
  if (!tasks.length) return [];
  const results = await Promise.allSettled(tasks);
  signal?.throwIfAborted();
  if (results.every((result) => result.status === "rejected"))
    throw new Error(
      "Credits are temporarily unavailable. The profile is still available; retry the credits below.",
    );
  return searchCore.dedupe(
    results.flatMap((result) =>
      result.status === "fulfilled" ? result.value : [],
    ),
  );
}
