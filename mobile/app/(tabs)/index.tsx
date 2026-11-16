import React, { useMemo, useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { discover } from "../../src/services/catalog";
import { useLibrary } from "../../src/services/hooks";
import { useApp } from "../../src/providers/AppProvider";
import { useTheme } from "../../src/theme";
import {
  Page,
  Copy,
  Section,
  Button,
  Loading,
  ErrorNote,
  Chips,
} from "../../src/components/ui";
import { Shelf, TitleRow } from "../../src/components/TitleCard";
import { Spotlight } from "../../src/components/Spotlight";
import { Lumi } from "../../src/components/Lumi";
import { recommendations as R, tracking } from "../../src/core/shared";
export default function Discover() {
  const c = useTheme();
  const { session, preferences } = useApp();
  const catalog = useQuery({
    queryKey: ["discover"],
    queryFn: ({ signal }) => discover(signal),
    staleTime: 1800000,
  });
  const library = useLibrary();
  const items = useMemo(() => catalog.data?.items || [], [catalog.data]);
  const [status, setStatus] = useState("going");
  const continued = (library.data || []).filter((t) => t.status === status);
  const hero =
    items.find((t) => t.type === "movie" && t.banner) ||
    items.find((t) => t.type === "movie") ||
    items[0];
  const personal = useMemo(() => {
    const saved = library.data || [];
    if (
      !preferences.useRatings ||
      saved.filter((t) => (t.rating || 0) >= 8).length < 3
    )
      return [];
    const state = R.session("mix", "watch");
    state.useRatings = true;
    return R.rank(
      items.map((t) => R.candidate(t)),
      state,
      saved,
    ).slice(0, 8);
  }, [items, library.data, preferences.useRatings]);
  return (
    <Page
      gap={24}
      refreshing={catalog.isRefetching}
      onRefresh={() => {
        void catalog.refetch();
        if (session) void library.refetch();
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Copy style={{ fontSize: 32, fontWeight: "800", letterSpacing: -1.4 }}>
          reel<Copy style={{ color: c.accent, fontSize: 34 }}>.</Copy>
        </Copy>
        <Pressable
          onPress={() => router.push("/(tabs)/profile")}
          accessibilityRole="button"
          accessibilityLabel="Your profile"
          style={{
            minWidth: 48,
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 24,
            borderWidth: 1,
            borderColor: c.line,
          }}
        >
          <Copy style={{ fontWeight: "700" }}>
            {session?.user.email?.[0]?.toUpperCase() || "YOU"}
          </Copy>
        </Pressable>
      </View>
      <View style={{ gap: 12 }}>
        <Copy
          kind="hero"
          accessibilityRole="header"
          style={{ fontSize: 28, lineHeight: 34 }}
        >
          Find your next story.
        </Copy>
        <Pressable
          onPress={() => router.navigate("/(tabs)/ask")}
          accessibilityRole="button"
          accessibilityLabel="Ask Reel to find your next watch"
          style={({ pressed }) => ({
            backgroundColor: c.accentContainer,
            opacity: pressed ? 0.85 : 1,
            minHeight: 72,
            borderRadius: 12,
            padding: 12,
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
          })}
        >
          <Lumi state="curious" size={40} />
          <View style={{ flex: 1, gap: 2 }}>
            <Copy kind="subhead" style={{ color: c.onAccentContainer }}>
              Ask Reel
            </Copy>
            <Copy kind="small" style={{ color: c.onAccentContainer }}>
              Tell Reel what you’re in the mood for.
            </Copy>
          </View>
          <Ionicons
            name="arrow-forward"
            size={19}
            color={c.onAccentContainer}
          />
        </Pressable>
      </View>
      {hero ? (
        <Spotlight title={hero} />
      ) : catalog.isPending ? (
        <Loading posters label="Opening the catalogs…" />
      ) : null}
      {library.data?.length ? (
        <Section
          title="Your watchlist"
          action={
            (library.data || []).some(
              (t) => t.type === "series" || t.type === "anime",
            )
              ? { label: "Calendar", onPress: () => router.push("/calendar") }
              : undefined
          }
        >
          <Chips
            value={status}
            onChange={setStatus}
            values={[
              { value: "going", label: "In progress" },
              { value: "want", label: "Watchlist" },
              { value: "done", label: "Watched" },
            ]}
          />
          {continued.length ? (
            continued.slice(0, 5).map((t) => {
              const progress =
                t.type === "series" || t.type === "anime"
                  ? tracking.progress(t)
                  : undefined;
              const position =
                status === "going" && t.episode
                  ? tracking.episodeLabel(t, t.season ?? 1, t.episode)
                  : undefined;
              const count = progress?.total
                ? `${progress.watched} of ${progress.total} watched`
                : undefined;
              return (
                <TitleRow
                  key={t.id}
                  title={t}
                  subtitle={[position, count].filter(Boolean).join(" · ")}
                />
              );
            })
          ) : (
            <Copy kind="small" style={{ color: c.muted }}>
              No titles in this section.
            </Copy>
          )}
          <Button
            label="View library"
            variant="quiet"
            onPress={() => router.navigate("/(tabs)/library")}
          />
        </Section>
      ) : null}
      <Section title="Find your feeling" kicker="A way into the story">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {[
            "Comforting",
            "Thoughtful",
            "Suspenseful",
            "Funny",
            "Imaginative",
          ].map((mood) => (
            <Button
              key={mood}
              label={mood}
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/ask",
                  params: { prompt: `A ${mood.toLowerCase()} movie` },
                })
              }
            />
          ))}
        </ScrollView>
      </Section>
      <ErrorNote error={catalog.error} retry={() => void catalog.refetch()} />
      {!hero && !catalog.isPending && !catalog.error ? (
        <Button
          label="Search the catalogs"
          variant="secondary"
          onPress={() => router.navigate("/(tabs)/search")}
        />
      ) : null}
      {catalog.data?.warnings.map((w) => (
        <Copy key={w} kind="small" style={{ color: c.warning }}>
          {w}
        </Copy>
      ))}
      {personal.length ? (
        <Section
          title="A little more your taste"
          kicker="Based on your library"
        >
          <Copy kind="small" style={{ color: c.muted }}>
            Catalog suggestions using your available ratings. Chat preferences
            stay in this session.
          </Copy>
          <Shelf titles={personal} />
        </Section>
      ) : null}
      {items.some((t) => t.type === "movie") ? (
        <Section title="Films worth a look" kicker="Popular on Cinemeta">
          <Shelf titles={items.filter((t) => t.type === "movie")} />
        </Section>
      ) : null}
      {items.some((t) => t.type === "series") ? (
        <Section
          title="One more episode"
          kicker="Highly rated television · TVMaze"
        >
          <Shelf titles={items.filter((t) => t.type === "series")} />
        </Section>
      ) : null}
      {items.some((t) => t.type === "anime") ? (
        <Section title="Beyond the ordinary" kicker="Anime · Kitsu">
          <Shelf titles={items.filter((t) => t.type === "anime")} />
        </Section>
      ) : null}
      <Copy kind="small" style={{ color: c.muted }}>
        Catalog artwork and facts: Cinemeta / IMDb, TVMaze and Kitsu.
        Availability on streaming services is not provided.
      </Copy>
    </Page>
  );
}
