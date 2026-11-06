import test from "node:test";
import assert from "node:assert/strict";
import {
  callbackCode,
  isReleased,
  membershipPatch,
  safeOrigin,
} from "../src/core/safety";
import { validDay, localDay } from "../src/core/dates";
import { secureStorage } from "../src/core/secure-storage";
import { account, recommendations as R, tracking } from "../src/core/shared";
import type { Title } from "../src/core/types";
const film: Title = {
  id: "imdb:tt1",
  catalogId: "imdb:tt1",
  title: "A quiet story",
  type: "movie",
  genres: ["Drama"],
  notes: "private",
  rating: 9,
  status: "want",
};
test("auth callback accepts only the registered host and path", () => {
  assert.deepEqual(
    callbackCode("reel://auth/callback?code=one&flow=recovery"),
    { code: "one", recovery: true },
  );
  for (const url of [
    "https://evil.test/?code=one",
    "reel://other/callback?code=one",
    "reel://auth/other?code=one",
  ])
    assert.throws(() => callbackCode(url));
});
test("backend origin cannot redirect a bearer token through a path or credentials", () => {
  assert.equal(
    safeOrigin("https://reel-navy.vercel.app"),
    "https://reel-navy.vercel.app",
  );
  for (const v of [
    "http://example.com",
    "https://user:secret@example.com",
    "https://example.com/evil",
    "https://example.com/?x=1",
  ])
    assert.throws(() => safeOrigin(v));
});
test("private patches cannot inject catalog or ownership fields", () => {
  assert.deepEqual(membershipPatch({ ...film, rating: 50 }), {
    status: "want",
    rating: 10,
    notes: "private",
  });
  assert.equal("user_id" in membershipPatch({ title: "replacement" }), false);
  const entry = account.toSyncEntry(film);
  assert.equal((entry.metadata as Record<string, unknown>).notes, undefined);
  assert.equal((entry.metadata as Record<string, unknown>).rating, undefined);
});
test("unknown and future episode dates are not treated as released", () => {
  const now = Date.parse("2026-11-06T12:00:00Z");
  assert.equal(isReleased({ season: 1, number: 1 }, now), false);
  assert.equal(
    isReleased({ season: 1, number: 1, airdate: "2026-11-07" }, now),
    false,
  );
  assert.equal(
    isReleased({ season: 1, number: 1, airdate: "2026-11-05" }, now),
    true,
  );
});
test("watch date input rejects impossible dates", () => {
  assert.equal(validDay("2026-02-30"), false);
  assert.equal(validDay("2024-02-29"), true);
  assert.equal(validDay("yesterday"), false);
  assert.equal(localDay(new Date(2026, 10, 6, 23, 30)), "2026-11-06");
});
test("shared recommendations exclude shown picks", () => {
  const s = R.session("mix", "movie");
  R.interpret(s, "a quiet drama movie");
  const candidate = R.candidate(film);
  const first = R.rank([candidate], s);
  assert.equal(first.length, 1);
  R.show(s, first[0]);
  assert.equal(R.rank([candidate], s).length, 0);
});
test("shared tracking keeps legacy progress undated", () => {
  const t: Title = {
    ...film,
    type: "series",
    season: 1,
    episode: 2,
    watchedEpisodes: null,
    seasonGuide: [{ number: 1, episodes: [1, 2, 3] }],
  };
  assert.deepEqual(tracking.baselineKeys(t), ["1:1", "1:2"]);
  assert.equal(tracking.overview([]).movies, 0);
  assert.equal(tracking.episodeLabel(t,1,2),'S1 E2');
});
function fakeDriver() {
  const values = new Map<string, string>();
  return {
    values,
    getItemAsync: async (k: string) => values.get(k) ?? null,
    setItemAsync: async (k: string, v: string) => {
      values.set(k, v);
    },
    deleteItemAsync: async (k: string) => {
      values.delete(k);
    },
  };
}
test("session chunks round trip and sign out deletes all chunks", async () => {
  const driver = fakeDriver();
  const store = secureStorage(driver, () => "version-1");
  const token = "secret".repeat(700);
  await store.setItem("session", token);
  assert.equal(await store.getItem("session"), token);
  assert.ok(!driver.values.get("session")?.includes("secret"));
  assert.ok(
    [...driver.values.values()].every(
      (v) => new TextEncoder().encode(v).length <= 2000,
    ),
  );
  await store.removeItem("session");
  assert.equal(driver.values.size, 0);
});
test("missing or malformed chunks never restore a partial session", async () => {
  const driver = fakeDriver();
  const store = secureStorage(driver, () => "version-1");
  await store.setItem("session", "secret".repeat(700));
  driver.values.delete("session.version-1.1");
  assert.equal(await store.getItem("session"), null);
  driver.values.set("session", '{"chunks":999999,"version":"invalid"}');
  assert.equal(await store.getItem("session"), null);
});
test("failed session write retains the previous valid session", async () => {
  const driver = fakeDriver();
  let generation = 0;
  const store = secureStorage(driver, () => `version-${++generation}`);
  await store.setItem("session", "old");
  const write = driver.setItemAsync;
  driver.setItemAsync = async (k, v) => {
    if (k.endsWith("version-2.1")) throw new Error("disk full");
    await write(k, v);
  };
  await assert.rejects(store.setItem("session", "new".repeat(700)));
  assert.equal(await store.getItem("session"), "old");
  assert.ok(![...driver.values.keys()].some((k) => k.includes("version-2")));
});
