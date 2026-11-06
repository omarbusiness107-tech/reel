import React, { useMemo, useState } from "react";
import { View, Pressable } from "react-native";
import Svg, { Rect } from "react-native-svg";
import { router } from "expo-router";
import { useApp } from "../src/providers/AppProvider";
import { useEvents, useLibrary } from "../src/services/hooks";
import { tracking } from "../src/core/shared";
import { monthBounds, localDay } from "../src/core/dates";
import { useTheme } from "../src/theme";
import {
  Page,
  Copy,
  BackHeader,
  State,
  Loading,
  ErrorNote,
  Chips,
  Section,
} from "../src/components/ui";
export default function Stats() {
  const c = useTheme();
  const { session } = useApp();
  const history = useEvents();
  const library = useLibrary();
  const [range, setRange] = useState("month");
  const [selected, setSelected] = useState("");
  const data = useMemo(() => {
    const { start } = monthBounds();
    const events = (history.data || []).filter(
      (e) => range === "all" || Date.parse(e.watchedAt) >= start.valueOf(),
    );
    const summary = tracking.overview(events);
    const genres = tracking.genreStats(events, library.data || []).slice(0, 6);
    const days = tracking.activityDays(events);
    const recent = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 13 + i);
      const label = localDay(d);
      return { label, count: days.get(label) || 0 };
    });
    return { summary, genres, recent };
  }, [range, history.data, library.data]);
  if (!session)
    return (
      <Page>
        <BackHeader title="Insights" />
        <State
          title="A picture of your taste"
          body="Sign in to explore insights from your viewing activity."
          action={{ label: "Sign in", onPress: () => router.push("/auth") }}
        />
      </Page>
    );
  return (
    <Page>
      <BackHeader title="Viewing insights" />
      <View style={{ gap: 8 }}>
        <Copy kind="label" style={{ color: c.accent }}>
          THE BIGGER PICTURE
        </Copy>
        <Copy kind="hero">{"A life in\nmoving pictures."}</Copy>
      </View>
      <Chips
        values={[
          { value: "month", label: "This month" },
          { value: "all", label: "All time" },
        ]}
        value={range}
        onChange={setRange}
      />
      <ErrorNote
        error={history.error || library.error}
        retry={() => {
          void history.refetch();
          void library.refetch();
        }}
      />
      {history.isPending ? (
        <Loading label="Connecting your watch history…" />
      ) : history.data?.length ? (
        <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {[
              { n: data.summary.movies, label: "Films watched" },
              { n: data.summary.episodes, label: "Episodes watched" },
              {
                n: Math.round((data.summary.minutes / 60) * 10) / 10,
                label: "Known hours",
              },
              { n: data.summary.activeDays, label: "Active days" },
            ].map((m) => (
              <View
                key={m.label}
                style={{
                  width: "47%",
                  padding: 18,
                  borderRadius: 16,
                  backgroundColor: c.surface,
                  gap: 8,
                }}
              >
                <Copy
                  style={{
                    fontSize: 34,
                    lineHeight: 40,
                    fontWeight: "600",
                    color: c.accent,
                  }}
                >
                  {m.n}
                </Copy>
                <Copy kind="small" style={{ color: c.muted }}>
                  {m.label}
                </Copy>
              </View>
            ))}
          </View>
          <Section title="Your last two weeks">
            <View
              style={{
                flexDirection: "row",
                height: 140,
                alignItems: "flex-end",
                gap: 4,
              }}
            >
              {data.recent.map((d) => (
                <Pressable
                  key={d.label}
                  accessibilityRole="button"
                  accessibilityLabel={`${d.label}: ${d.count} watches`}
                  onPress={() =>
                    setSelected(
                      `${d.label} · ${d.count} ${d.count === 1 ? "watch" : "watches"}`,
                    )
                  }
                  style={{
                    flex: 1,
                    height: "100%",
                    justifyContent: "flex-end",
                    minHeight: 48,
                  }}
                >
                  <View
                    style={{
                      height: Math.max(
                        3,
                        (d.count /
                          Math.max(1, ...data.recent.map((d) => d.count))) *
                          120,
                      ),
                      backgroundColor: selected.startsWith(d.label)
                        ? c.mint
                        : c.accent,
                      borderRadius: 4,
                    }}
                  />
                </Pressable>
              ))}
            </View>
            <Copy kind="small" style={{ color: c.muted }}>
              {selected ||
                "Tap a bar to inspect a day. Zero days remain visible."}
            </Copy>
          </Section>
          <Section title="Your favorite worlds">
            {data.genres.length ? (
              data.genres.map((g) => (
                <View key={g.genre} style={{ gap: 8 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Copy>{g.genre}</Copy>
                    <Copy style={{ color: c.muted }}>{g.count}</Copy>
                  </View>
                  <Svg
                    height={8}
                    width="100%"
                    viewBox="0 0 300 8"
                    preserveAspectRatio="none"
                    accessible
                    accessibilityLabel={`${g.genre}, ${g.count} watched entries`}
                  >
                    <Rect width={300} height={8} rx={4} fill={c.raised} />
                    <Rect
                      width={(g.count / data.genres[0].count) * 300}
                      height={8}
                      rx={4}
                      fill={c.mint}
                    />
                  </Svg>
                </View>
              ))
            ) : (
              <Copy style={{ color: c.muted }}>
                Genre data is unavailable for these titles.
              </Copy>
            )}
          </Section>
          <Copy kind="small" style={{ color: c.muted }}>
            Statistics use dated watch events, including rewatches. Undated
            progress and reading sessions are excluded.{" "}
            {data.summary.unknownRuntimes} events have unknown runtime and are
            excluded from viewing hours.
          </Copy>
        </>
      ) : (
        <State
          title="The first frame is yours"
          body="Log a film or episode to start your viewing insights. Your stats grow from actual watch history."
        />
      )}
    </Page>
  );
}
