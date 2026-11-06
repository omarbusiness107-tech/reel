import type { Title } from "./types";

export function imageUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const url = value.trim().replace(/^http:/i, "https:");
  return /^https:\/\/[^\s]+$/i.test(url) ? url : undefined;
}

export function imdbId(title: Title): string | undefined {
  const id =
    title.imdb || /^imdb:(tt\d+)$/.exec(title.catalogId || title.id)?.[1];
  return id && /^tt\d+$/.test(id) ? id : undefined;
}

export function posterUrls(title: Title, recovered: string[] = []): string[] {
  const id = imdbId(title);
  return [
    ...new Set(
      [
        title.cover,
        ...(title.posterCandidates || []),
        ...recovered,
        ...(id ? [`https://images.metahub.space/poster/medium/${id}/img`] : []),
      ]
        .map(imageUrl)
        .filter((url): url is string => !!url),
    ),
  ];
}
