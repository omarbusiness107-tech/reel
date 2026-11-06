import type { Episode, Title } from "./types";

export function isReleased(episode: Episode, now = Date.now()): boolean {
  const date = episode.airstamp || episode.airdate;
  return !!date && Number.isFinite(Date.parse(date)) && Date.parse(date) <= now;
}
export function callbackCode(url: string): {
  code: string | null;
  recovery: boolean;
} {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "reel:" ||
    parsed.hostname !== "auth" ||
    parsed.pathname !== "/callback"
  ) {
    throw new Error("This link does not belong to Reel authentication.");
  }
  if (parsed.searchParams.has("error_description"))
    throw new Error(parsed.searchParams.get("error_description")!);
  return {
    code: parsed.searchParams.get("code"),
    recovery: parsed.searchParams.get("flow") === "recovery",
  };
}
export function safeOrigin(value: string): string {
  if (!value.trim()) return "";
  const parsed = new URL(value);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      "The Reel API URL must be an HTTPS origin without a path or credentials.",
    );
  }
  return parsed.origin;
}
export function membershipPatch(patch: Partial<Title>) {
  const result: Record<string, unknown> = {};
  if (patch.status !== undefined) result.status = patch.status;
  if (patch.rating !== undefined)
    result.rating = Math.max(0, Math.min(10, patch.rating));
  if (patch.fav !== undefined) result.favorite = patch.fav;
  if (patch.notes !== undefined) result.notes = patch.notes.slice(0, 10000);
  if (patch.tags !== undefined)
    result.tags = patch.tags.filter((t) => t.trim()).slice(0, 30);
  return result;
}
