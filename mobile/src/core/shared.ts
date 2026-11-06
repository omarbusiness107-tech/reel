import type { RecSession, Intent, Title, WatchEvent } from "./types";

// These are the exact modules used by the website and its existing regression tests.
export const account = require("../../../assets/account-library.js") as {
  providerIdentity(t: Title): { provider: string; providerId: string };
  toSyncEntry(t: Title): Record<string, unknown>;
  fromRows(rows: unknown[]): Title[];
};
export const searchCore = require("../../../assets/search-core.js") as {
  normalize(s: string): string;
  sameWork(a: Title, b: Title): boolean;
  dedupe(items: Title[], options?: { preferred: Set<Title> }): Title[];
  compare(a: Title, b: Title, query: string): number;
};
export const recommendations =
  require("../../../assets/recommendations-core.js") as {
    session(source?: string, mediaType?: string): RecSession;
    interpret(s: RecSession, text: string): Intent;
    patch(s: RecSession, update: Partial<Intent>): Intent;
    candidate(t: Title, library?: boolean): Title;
    rank(t: Title[], s: RecSession, library?: Title[]): Title[];
    selectWeighted(t: Title[], count: number): Title[];
    explain(t: Title, s: RecSession): string;
    show(s: RecSession, t: Title): void;
    facts(t: Title): Record<string, unknown>;
    question(s: RecSession): {
      text?: string;
      question?: string;
      options?: string[];
      chips?: string[];
    } | null;
  };
export const tracking = require("../../../assets/tracking-core.js") as {
  key(season: number, episode: number): string;
  baselineKeys(t: Title): string[];
  watchedSet(t: Title): Set<string>;
  episodeList(t: Title, at?: number): NonNullable<Title["episodeCatalog"]>;
  episodeLabel(t: Title, season: number, number: number): string;
  progress(t: Title): { watched: number; total: number; percent?: number };
  overview(e: WatchEvent[]): {
    movies: number;
    episodes: number;
    minutes: number;
    activeDays: number;
    unknownRuntimes: number;
  };
  genreStats(e: WatchEvent[], t: Title[]): { genre: string; count: number }[];
  activityDays(e: WatchEvent[]): Map<string, number>;
};
