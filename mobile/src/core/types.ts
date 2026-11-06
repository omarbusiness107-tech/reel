export type MediaType =
  "movie" | "series" | "anime" | "book" | "manga" | "manhwa";
export type Status =
  "want" | "suggested" | "going" | "done" | "paused" | "dropped" | "waiting";
export interface Person {
  id: string;
  name: string;
  image?: string;
  role?: string;
  provider: "tvmaze" | "wikidata";
}
export interface Episode {
  id?: number;
  season: number;
  number: number;
  name?: string;
  airdate?: string;
  airstamp?: string;
  runtime?: number;
}
export interface Title {
  id: string;
  titleId?: string;
  title: string;
  type: MediaType;
  year?: number | null;
  catalogId?: string;
  cover?: string;
  banner?: string;
  synopsis?: string;
  genres: string[];
  runtime?: number | null;
  score?: number | null;
  popularity?: number;
  creator?: string;
  country?: string;
  language?: string;
  cast?: (Person | string)[];
  people?: Person[];
  tvmaze?: number;
  kitsu?: string;
  wd?: string;
  imdb?: string;
  sourceUrl?: string;
  status?: Status;
  rating?: number;
  fav?: boolean;
  notes?: string;
  tags?: string[];
  watchedEpisodes?: string[] | null;
  season?: number;
  episode?: number;
  added?: number;
  updated?: number;
  finished?: number | null;
  episodeCatalog?: Episode[];
  seasonGuide?: { number: number; episodes: number[] }[];
  recId?: string;
  inLibrary?: boolean;
  matchScore?: number;
  why?: string;
}
export interface WatchEvent {
  id: string;
  titleId: string;
  season: number | null;
  episode: number | null;
  watchedAt: string;
  mediaType: MediaType;
  eventType: string;
  runtimeMinutes: number | null;
}
export interface Intent {
  source: string;
  mediaType: string;
  resultCount: number;
  people: string[];
  genres: string[];
  desiredMood: string[];
  themes: string[];
  keywords: string[];
  similarTo: string[];
  [key: string]: unknown;
}
export interface RecSession {
  intent: Intent;
  mode: string;
  answers: string[];
  questions: string[];
  shown: string[];
  rejected: string[];
  current: Title | null;
  searchHints: { title: string; type: MediaType }[];
  lastRequest: string;
  useRatings: boolean;
}
