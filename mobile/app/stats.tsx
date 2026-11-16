import React, { useMemo, useState } from "react";
import { View } from "react-native";
import Animated, {
  cubicBezier,
  useReducedMotion,
} from "react-native-reanimated";
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
  Button,
  usePageLayout,
} from "../src/components/ui";
export default function Stats() {
  const c = useTheme();
  const { fontScale } = usePageLayout();
  const reduced = useReducedMotion();
  const { session } = useApp();
  const history = useEvents();
  const library = useLibrary();
  const [range, setRange] = useState("month");
  const [selected, setSelected] = useState(13);
  const [showData, setShowData] = useState(false);
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
  const largestCount = Math.max(1, ...data.recent.map((day) => day.count));
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
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: 16,
              padding: 20,
              gap: 8,
            }}
          >
            <Copy kind="subhead">Known viewing time</Copy>
            <Copy kind="metric" style={{ color: c.accent }}>
              {Math.floor(data.summary.minutes / 60)}h{" "}
              {data.summary.minutes % 60}m
            </Copy>
            <Copy kind="small" style={{ color: c.secondary }}>
              From dated watches with known runtimes.
            </Copy>
            {data.summary.unknownRuntimes ? (
              <Copy kind="small" style={{ color: c.warning }}>
                {data.summary.unknownRuntimes} watches without a runtime.
              </Copy>
            ) : null}
          </View>
          <View
            style={{
              flexDirection: fontScale >= 1.5 ? "column" : "row",
              gap: 8,
            }}
          >
            {[
              { n: data.summary.movies, label: "Films watched" },
              { n: data.summary.episodes, label: "Episodes watched" },
              { n: data.summary.activeDays, label: "Active days" },
            ].map((metric) => (
              <View
                key={metric.label}
                style={{
                  flex: 1,
                  borderTopWidth: 1,
                  borderColor: c.line,
                  paddingTop: 12,
                  gap: 4,
                }}
              >
                <Copy kind="title">{metric.n}</Copy>
                <Copy kind="small" style={{ color: c.secondary }}>
                  {metric.label}
                </Copy>
              </View>
            ))}
          </View>
          <Section title="Your last two weeks">
            {range === "month" ? (
              <Copy kind="small" style={{ color: c.secondary }}>
                Counts are limited to this month.
              </Copy>
            ) : null}
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                height: 120,
                gap: 4,
                borderBottomWidth: 1,
                borderColor: c.outline,
              }}
            >
              {data.recent.map((day, index) => (
                <Animated.View
                  key={day.label}
                  style={{
                    flex: 1,
                    height: 116,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4,
                    backgroundColor: selected === index ? c.accent : c.mint,
                    transformOrigin: "center bottom",
                    transform: [{ scaleY: day.count / largestCount }],
                    transitionProperty: "transform",
                    transitionDuration: reduced ? 0 : 200,
                    transitionTimingFunction: cubicBezier(0.2, 0, 0, 1),
                  }}
                />
              ))}
            </View>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Button
                label="Previous day"
                icon="chevron-back"
                iconOnly
                variant="quiet"
                disabled={selected === 0}
                onPress={() => setSelected((i) => Math.max(i - 1, 0))}
              />
              <Copy
                kind="small"
                accessibilityLiveRegion="polite"
                style={{ flex: 1, color: c.secondary, textAlign: "center" }}
              >
                {data.recent[selected].label} · {data.recent[selected].count}{" "}
                watches
              </Copy>
              <Button
                label="Next day"
                icon="chevron-forward"
                iconOnly
                variant="quiet"
                disabled={selected === 13}
                onPress={() => setSelected((i) => Math.min(i + 1, 13))}
              />
            </View>
            <Button
              label={showData ? "Hide data" : "View data"}
              variant="quiet"
              onPress={() => setShowData(!showData)}
            />
            {showData
              ? data.recent.map((day) => (
                  <Copy key={day.label} kind="small">
                    {day.label} · {day.count} watches
                  </Copy>
                ))
              : null}
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
            Dated watches include rewatches. Undated progress and reading
            sessions are excluded.
          </Copy>
        </>
      ) : !history.error ? (
        <State
          title="The first frame is yours"
          body="Log a film or episode to start your viewing insights. Your stats grow from actual watch history."
        />
      ) : null}
    </Page>
  );
}
