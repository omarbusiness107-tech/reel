import { supabase } from "./supabase";
import { createClient } from "@supabase/supabase-js";
import { config } from "./config";
import { account } from "../core/shared";
import { membershipPatch } from "../core/safety";
import type { Episode, Title, WatchEvent } from "../core/types";

const JOIN = "*,title:titles!inner(*)";
export async function assertAccount(id: string) {
  const { data, error } = await supabase.auth.getSession();
  if (error || data.session?.user.id !== id)
    throw new Error("Your account changed. Please try again.");
  return data.session;
}
async function writeClient(userId: string) {
  const session = await assertAccount(userId);
  // Pin the request to the initiating account even if sign-out/sign-in happens
  // between the identity check and the HTTP dispatch. No new token is persisted.
  return createClient(config.supabaseUrl, config.publishableKey, {
    accessToken: async () => session.access_token,
  });
}
export async function loadLibrary(
  userId: string,
  signal?: AbortSignal,
): Promise<Title[]> {
  const rows: unknown[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("user_titles")
      .select(JOIN)
      .eq("user_id", userId)
      .order("id")
      .range(offset, offset + 499)
      .abortSignal(signal || new AbortController().signal);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) break;
  }
  return account.fromRows(rows);
}
export async function loadEvents(
  userId: string,
  signal?: AbortSignal,
): Promise<WatchEvent[]> {
  const rows: WatchEvent[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
      .from("watch_events")
      .select(
        "id,user_title_id,season_number,episode_number,watched_at,media_type,event_type,runtime_minutes",
      )
      .eq("user_id", userId)
      .order("watched_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499)
      .abortSignal(signal || new AbortController().signal);
    if (error) throw error;
    rows.push(
      ...data.map((r) => ({
        id: r.id,
        titleId: r.user_title_id,
        season: r.season_number,
        episode: r.episode_number,
        watchedAt: r.watched_at,
        mediaType: r.media_type,
        eventType: r.event_type,
        runtimeMinutes: r.runtime_minutes,
      })),
    );
    if (data.length < 500) break;
  }
  return rows;
}
export async function addTitle(t: Title, userId: string) {
  const client = await writeClient(userId);
  const { data, error } = await client.rpc("add_my_title", {
    p_entry: account.toSyncEntry(t),
  });
  if (error) {
    if (error.code === "PGRST202")
      throw new Error(
        "Saving needs the mobile database migration. Your library has not been changed.",
      );
    throw error;
  }
  return data as string;
}
export async function patchTitle(
  id: string,
  patch: Partial<Title>,
  userId: string,
) {
  const client = await writeClient(userId);
  const { data, error } = await client
    .from("user_titles")
    .update({
      ...membershipPatch(patch),
      last_interaction_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select("id")
    .single();
  if (error) throw error;
  if (!data) throw new Error("This title is no longer in your library.");
}
export async function removeTitle(id: string, userId: string) {
  const client = await writeClient(userId);
  const { error } = await client
    .from("user_titles")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}
export async function watchTitle(
  args: {
    id: string;
    entries: Partial<Episode>[];
    action: "watch" | "unwatch" | "rewatch";
    requestId: string;
    baseline: string[];
  },
  userId: string,
) {
  const client = await writeClient(userId);
  const { error } = await client.rpc("apply_watch_action", {
    p_user_title_id: args.id,
    p_entries: args.entries,
    p_action: args.action,
    p_request_id: args.requestId,
    p_watched_at: new Date().toISOString(),
    p_baseline: args.baseline,
  });
  if (error) throw error;
}
