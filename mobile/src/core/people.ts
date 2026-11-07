import type { Person } from "./types";

export function personRecord(value: Person | string): Person {
  if (typeof value === "string")
    return { id: value.trim(), name: value.trim(), provider: "name" };
  const id = String(value.id || "");
  const prefixed = /^(tvmaze|wikidata|imdb|name):(.+)$/.exec(id);
  const declared = prefixed?.[1] || value.provider;
  const provider =
    declared && ["tvmaze", "wikidata", "imdb", "name"].includes(declared)
      ? declared
      : /^nm\d+$/.test(id)
        ? "imdb"
        : /^Q\d+$/.test(id)
          ? "wikidata"
          : "name";
  const rawId = prefixed?.[2] || id;
  const valid =
    provider === "name" ||
    (provider === "imdb"
      ? /^nm\d+$/.test(rawId)
      : provider === "wikidata"
        ? /^Q\d+$/.test(rawId)
        : /^\d+$/.test(rawId));
  return {
    ...value,
    id:
      provider === "name"
        ? value.name || rawId
        : valid && rawId
          ? rawId
          : value.name,
    provider: valid ? (provider as Person["provider"]) : "name",
  };
}
export function personKey(person: Person): string {
  const p = personRecord(person);
  return `${p.provider}:${p.id}`;
}
export function personFromRoute(
  id: string,
  provider?: string,
  name?: string,
): Person {
  const prefix = /^(tvmaze|wikidata|imdb|name):(.+)$/.exec(id);
  const value = {
    id: prefix?.[2] || id,
    provider: (prefix?.[1] || provider) as Person["provider"],
    name: name || (prefix?.[1] === "name" ? prefix[2] : ""),
  };
  if (!value.name && !prefix && !provider && !/^(nm\d+|Q\d+)$/.test(id))
    value.name = id;
  return personRecord(value);
}
