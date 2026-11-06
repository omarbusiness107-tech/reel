import React, { useState } from "react";
import { View, Pressable } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useApp } from "../src/providers/AppProvider";
import { useLibrary, useEvents } from "../src/services/hooks";
import { episodes } from "../src/services/catalog";
import { localDay, monthBounds } from "../src/core/dates";
import { useTheme } from "../src/theme";
import {
  Page,
  Copy,
  BackHeader,
  State,
  Loading,
  ErrorNote,
  Button,
  Section,
  Chips,
} from "../src/components/ui";
import { TitleRow } from "../src/components/TitleCard";
import type { Title, Episode } from "../src/core/types";
interface Release {
  title: Title;
  episode: Episode;
}
export default function Calendar() {
  const c = useTheme();
  const { session } = useApp();
  const library = useLibrary();
  const events = useEvents();
  const [offset, setOffset] = useState(0);
  const [day, setDay] = useState(localDay(new Date()));
  const [scope, setScope] = useState("tracked");
  const { start, end } = monthBounds(offset);
  const titles = (library.data || []).filter(
    (t) =>
      ["series", "anime"].includes(t.type) &&
      (scope === "all" ||
        ["going", "waiting", "done"].includes(t.status || "")),
  );
  const releases = useQuery({
    queryKey: [
      "calendar-guides",
      session?.user.id,
      scope,
      titles.map((t) => [t.id, t.tvmaze, t.catalogId]),
    ],
    enabled: !!session && !!library.data,
    staleTime: 3600000,
    queryFn: async ({ signal }) => {
      let index = 0;
      const result: Release[] = [];
      const warnings: string[] = [];
      await Promise.all(
        Array.from({ length: Math.min(3, titles.length) }, async () => {
          while (index < titles.length) {
            const t = titles[index++];
            try {
              const guide = await episodes(t, signal);
              result.push(
                ...guide
                  .filter((ep) => ep.airdate)
                  .map((episode) => ({ title: t, episode })),
              );
              if (!guide.length) warnings.push(t.title);
            } catch {
              if (signal.aborted) throw new Error("Cancelled");
              warnings.push(t.title);
            }
          }
        }),
      );
      return { result, warnings };
    },
  });
  const watching = (events.data || []).filter((e) =>
    ["movie_watched", "episode_watched", "rewatch"].includes(e.eventType),
  );
  const byId = new Map((library.data || []).map((t) => [t.id, t]));
  const first = start.getDay();
  const days =
    end.getDate() === 1 ? new Date(end.valueOf() - 86400000).getDate() : 31;
  const cells = Array.from({ length: first + days }, (_, i) =>
    i < first
      ? null
      : localDay(
          new Date(start.getFullYear(), start.getMonth(), i - first + 1),
        ),
  );
  const chosen = day.startsWith(localDay(start).slice(0, 7))
    ? day
    : localDay(start);
  const dated = (releases.data?.result || []).filter(
    (r) => r.episode.airdate === chosen,
  );
  const logged = watching.filter((e) => localDay(e.watchedAt) === chosen);
  if (!session)
    return (
      <Page>
        <BackHeader title="Calendar" />
        <State
          title="Make time for stories"
          body="Sign in to see your viewing days and dated episode releases from your library."
          action={{ label: "Sign in", onPress: () => router.push("/auth") }}
        />
      </Page>
    );
  return (
    <Page>
      <BackHeader title="Watch calendar" />
      <Copy kind="hero">{"Dates with\ngreat stories."}</Copy>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Button
          label="Previous"
          icon="chevron-back"
          variant="quiet"
          onPress={() => setOffset((n) => n - 1)}
        />
        <Copy style={{ fontWeight: "700", flex: 1, textAlign: "center" }}>
          {start.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </Copy>
        <Button
          label="Next"
          icon="chevron-forward"
          variant="quiet"
          onPress={() => setOffset((n) => n + 1)}
        />
      </View>
      <Chips
        values={[
          { value: "tracked", label: "Tracking now" },
          { value: "all", label: "All saved series" },
        ]}
        value={scope}
        onChange={setScope}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 0 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <View
            key={`${d}${i}`}
            style={{
              width: "14.285%",
              alignItems: "center",
              paddingVertical: 8,
            }}
          >
            <Copy kind="small" style={{ color: c.muted }}>
              {d}
            </Copy>
          </View>
        ))}
        {cells.map((date, i) => {
          const hasWatch =
            date && watching.some((e) => localDay(e.watchedAt) === date);
          const hasRelease =
            date &&
            releases.data?.result.some((r) => r.episode.airdate === date);
          return (
            <View
              key={date || `blank${i}`}
              style={{ width: "14.285%", padding: 2 }}
            >
              {date ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${date}${hasWatch ? ", watched something" : ""}${hasRelease ? ", episode release" : ""}`}
                  accessibilityState={{ selected: chosen === date }}
                  onPress={() => setDay(date)}
                  style={{
                    minHeight: 48,
                    borderRadius: 12,
                    backgroundColor: chosen === date ? c.accent : c.surface,
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                >
                  <Copy
                    style={{
                      color: chosen === date ? c.onAccent : c.text,
                      fontWeight: "600",
                    }}
                  >
                    {Number(date.slice(-2))}
                  </Copy>
                  <View style={{ flexDirection: "row", gap: 3, height: 4 }}>
                    {hasWatch ? (
                      <View
                        style={{
                          height: 4,
                          width: 4,
                          borderRadius: 2,
                          backgroundColor:
                            chosen === date ? c.onAccent : c.mint,
                        }}
                      />
                    ) : null}
                    {hasRelease ? (
                      <View
                        style={{
                          height: 4,
                          width: 4,
                          borderRadius: 2,
                          backgroundColor:
                            chosen === date ? c.onAccent : c.accent,
                        }}
                      />
                    ) : null}
                  </View>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
      <Copy kind="small" style={{ color: c.muted }}>
        Mint dot: watched · Accent dot: episode release. Tap a day.
      </Copy>
      <ErrorNote
        error={library.error || events.error || releases.error}
        retry={() => {
          void library.refetch();
          void events.refetch();
          void releases.refetch();
        }}
      />
      {releases.isFetching ? (
        <Loading label="Refreshing dated episode releases…" />
      ) : null}
      {releases.data?.warnings.length ? (
        <Copy kind="small" style={{ color: c.muted }}>
          No dated guide available for {releases.data.warnings.length} saved
          titles. Dates are never estimated.
        </Copy>
      ) : null}
      <Section
        title={new Date(`${chosen}T12:00:00`).toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
        })}
        kicker="On this day"
      >
        {dated.map((r) => (
          <TitleRow
            key={`${r.title.id}:${r.episode.season}:${r.episode.number}`}
            title={r.title}
            subtitle={`Episode release · S${r.episode.season} E${r.episode.number} · ${r.episode.name || ""}`}
          />
        ))}
        {logged.map((e) => {
          const t = byId.get(e.titleId);
          return t ? (
            <TitleRow
              key={e.id}
              title={t}
              subtitle={
                e.season
                  ? `Watched · S${e.season} E${e.episode}`
                  : "Movie watched"
              }
            />
          ) : null;
        })}
        {!dated.length && !logged.length ? (
          <Copy style={{ color: c.muted }}>
            No recorded watches or confirmed episode releases for this day.
          </Copy>
        ) : null}
      </Section>
      <Copy kind="small" style={{ color: c.muted }}>
        Episode dates: TVMaze. This calendar does not estimate streaming
        availability, undated anime schedules, or future films.
      </Copy>
    </Page>
  );
}
