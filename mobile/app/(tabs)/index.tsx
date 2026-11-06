import React, { useMemo } from "react";
import { View, Pressable, ScrollView } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
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
} from "../../src/components/ui";
import { Shelf, openTitle } from "../../src/components/TitleCard";
import { Lumi } from "../../src/components/Lumi";
import { recommendations as R } from "../../src/core/shared";
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
  const continued = (library.data || []).filter((t) => t.status === "going");
  const hero = items.find((t) => t.type === "movie" && t.banner);
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
      <View style={{ gap: 7 }}>
        <Copy kind="label" style={{ color: c.muted }}>
          YOUR DAILY DOSE OF GOOD STORIES
        </Copy>
        <Copy kind="hero">{"What moves\nyou tonight?"}</Copy>
      </View>
      <Pressable
        onPress={() => router.push("/(tabs)/ask")}
        accessibilityRole="button"
        accessibilityLabel="Ask Reel to find your next watch"
        style={{
          backgroundColor: c.surface,
          borderColor: c.line,
          borderWidth: 1,
          borderRadius: 20,
          padding: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Lumi state="curious" size={56} />
        <View style={{ flex: 1, gap: 3 }}>
          <Copy style={{ fontWeight: "700" }}>A mood. A moment. A movie.</Copy>
          <Copy kind="small" style={{ color: c.muted }}>
            Tell Reel what you’re looking for ↗
          </Copy>
        </View>
      </Pressable>
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
      {continued.length ? (
        <Section title="Pick up the story" kicker="In progress">
          <Shelf titles={continued} />
        </Section>
      ) : null}
      {catalog.isPending ? <Loading /> : null}
      <ErrorNote error={catalog.error} retry={() => void catalog.refetch()} />
      {catalog.data?.warnings.map((w) => (
        <Copy key={w} kind="small" style={{ color: c.muted }}>
          {w}
        </Copy>
      ))}
      {hero ? (
        <Pressable
          onPress={() => openTitle(hero)}
          accessibilityRole="button"
          accessibilityLabel={`Explore ${hero.title}`}
          style={{
            height: 320,
            borderRadius: 20,
            overflow: "hidden",
            backgroundColor: c.surface,
          }}
        >
          <Image
            source={hero.banner}
            contentFit="cover"
            style={{ position: "absolute", width: "100%", height: "100%" }}
          />
          <LinearGradient
            colors={["transparent", "rgba(16,17,19,0.95)"]}
            style={{ flex: 1, justifyContent: "flex-end", padding: 22, gap: 8 }}
          >
            <Copy kind="label" style={{ color: "#FFAA8F" }}>
              IN THE SPOTLIGHT
            </Copy>
            <Copy kind="title" style={{ color: "#F3EFE5", fontSize: 32 }}>
              {hero.title}
            </Copy>
            <Copy kind="small" style={{ color: "#D8D6D0" }}>
              {hero.year} · {hero.genres.slice(0, 2).join(" / ")}
            </Copy>
            <Copy style={{ color: "#F3EFE5", fontWeight: "700", marginTop: 4 }}>
              Meet your next watch →
            </Copy>
          </LinearGradient>
        </Pressable>
      ) : null}
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
