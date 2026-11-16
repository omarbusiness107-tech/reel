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
  usePageLayout,
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
  const { content, available, fontScale } = usePageLayout();
  const compactGrid = content < 336 && available >= 360;
  const monthFits = (content >= 336 || compactGrid) && fontScale < 1.5;
  const [view, setView] = useState<string>();
  const agenda = !monthFits || view === "agenda";
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
              if (!guide.some((ep) => ep.airdate)) warnings.push(t.title);
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
  const releasesByDay = new Map<string, Release[]>();
  for (const release of releases.data?.result || []) {
    const date = release.episode.airdate!;
    const entries = releasesByDay.get(date);
    if (entries) entries.push(release);
    else releasesByDay.set(date, [release]);
  }
  const watchesByDay = new Map<string, typeof watching>();
  for (const event of watching) {
    const date = localDay(event.watchedAt);
    const entries = watchesByDay.get(date);
    if (entries) entries.push(event);
    else watchesByDay.set(date, [event]);
  }
  function entries(date: string) {
    return (
      <>
        {(releasesByDay.get(date) || []).map(({ title, episode }) => (
          <TitleRow
            key={title.id + ":" + episode.season + ":" + episode.number}
            title={title}
            subtitle={
              "Episode release · S" +
              episode.season +
              " E" +
              episode.number +
              (episode.name ? " · " + episode.name : "")
            }
          />
        ))}
        {(watchesByDay.get(date) || []).map((event) => {
          const title = byId.get(event.titleId);
          const label =
            event.season !== null
              ? "Watched · S" + event.season + " E" + event.episode
              : event.eventType === "rewatch"
                ? "Rewatch"
                : "Movie watched";
          return title ? (
            <TitleRow key={event.id} title={title} subtitle={label} />
          ) : (
            <Copy key={event.id} kind="small" style={{ color: c.secondary }}>
              {label} · Title unavailable
            </Copy>
          );
        })}
      </>
    );
  }
  const agendaDays = cells.filter(
    (date): date is string =>
      !!date && (releasesByDay.has(date) || watchesByDay.has(date)),
  );
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

      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Button
            label="Previous month"
            icon="chevron-back"
            iconOnly
            variant="quiet"
            onPress={() => setOffset((n) => n - 1)}
          />
          <Copy
            kind="title"
            accessibilityLiveRegion="polite"
            style={{ flex: 1, textAlign: "center" }}
          >
            {start.toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </Copy>
          <Button
            label="Next month"
            icon="chevron-forward"
            iconOnly
            variant="quiet"
            onPress={() => setOffset((n) => n + 1)}
          />
        </View>
        <Button
          label="Today"
          variant="quiet"
          onPress={() => {
            setOffset(0);
            setDay(localDay(new Date()));
          }}
        />
        {monthFits ? (
          <Chips
            value={agenda ? "agenda" : "month"}
            onChange={setView}
            values={[
              { value: "month", label: "Month" },
              { value: "agenda", label: "Agenda" },
            ]}
          />
        ) : null}
      </View>
      <Chips
        values={[
          { value: "tracked", label: "Tracking now" },
          { value: "all", label: "All saved series" },
        ]}
        value={scope}
        onChange={setScope}
      />
      {!agenda ? (
        <>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginHorizontal: compactGrid ? -8 : 0,
            }}
          >
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
              const hasWatch = date && (watchesByDay.get(date)?.length ?? 0);
              const hasRelease = date && (releasesByDay.get(date)?.length ?? 0);
              return (
                <View key={date || `blank${i}`} style={{ width: "14.285%" }}>
                  {date ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`${date}${hasWatch ? ", watched something" : ""}${hasRelease ? ", episode release" : ""}`}
                      accessibilityState={{ selected: chosen === date }}
                      onPress={() => setDay(date)}
                      style={{
                        minHeight: 48,
                        borderRadius: 12,
                        borderWidth:
                          date === localDay(new Date()) && chosen !== date
                            ? 1
                            : 0,
                        borderColor: c.outline,
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
                              transform: [{ rotate: "45deg" }],
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
            Dot: watched · Diamond: episode release. Tap a day.
          </Copy>
        </>
      ) : null}
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
      {agenda ? (
        <Section title="Monthly agenda">
          {agendaDays.length ? (
            agendaDays.map((date) => {
              const local = new Date(date + "T12:00:00");
              return (
                <View
                  key={date}
                  style={{
                    flexDirection: "row",
                    gap: 12,
                    paddingBottom: 12,
                    borderBottomWidth: 1,
                    borderColor: c.line,
                  }}
                >
                  <View
                    style={{
                      width: fontScale > 1.3 ? 64 : 52,
                      gap: 2,
                      paddingTop: 12,
                    }}
                    accessibilityLabel={local.toLocaleDateString(undefined, {
                      dateStyle: "full",
                    })}
                  >
                    <Copy
                      kind="title"
                      style={{ color: date === chosen ? c.accent : c.text }}
                    >
                      {local.getDate()}
                    </Copy>
                    <Copy kind="small" style={{ color: c.secondary }}>
                      {local.toLocaleDateString(undefined, {
                        weekday: "short",
                      })}
                    </Copy>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>{entries(date)}</View>
                </View>
              );
            })
          ) : !releases.isFetching &&
            !events.isPending &&
            !events.error &&
            !releases.error ? (
            <Copy style={{ color: c.secondary }}>
              No dated releases or watches this month.
            </Copy>
          ) : null}
        </Section>
      ) : (
        <Section
          title={new Date(chosen + "T12:00:00").toLocaleDateString(undefined, {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        >
          {entries(chosen)}
          {!releasesByDay.has(chosen) &&
          !watchesByDay.has(chosen) &&
          !releases.isFetching &&
          !events.isPending &&
          !events.error ? (
            <Copy style={{ color: c.secondary }}>
              No recorded watches or confirmed episode releases for this day.
            </Copy>
          ) : null}
        </Section>
      )}
      <Copy kind="small" style={{ color: c.muted }}>
        Episode dates: TVMaze. This calendar does not estimate streaming
        availability, undated anime schedules, or future films.
      </Copy>
    </Page>
  );
}
