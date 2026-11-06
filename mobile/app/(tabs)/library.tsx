import React, { useMemo, useState } from "react";
import { FlatList, View } from "react-native";
import { router } from "expo-router";
import { useApp } from "../../src/providers/AppProvider";
import { useLibrary } from "../../src/services/hooks";
import { useTheme } from "../../src/theme";
import {
  Page,
  Copy,
  Chips,
  Field,
  State,
  Loading,
  ErrorNote,
} from "../../src/components/ui";
import { TitleRow } from "../../src/components/TitleCard";
const statuses = [
  { value: "all", label: "All" },
  { value: "want", label: "Watchlist" },
  { value: "going", label: "In progress" },
  { value: "done", label: "Watched" },
  { value: "fav", label: "Favorites" },
  { value: "suggested", label: "Saved picks" },
  { value: "paused", label: "Paused" },
];
export default function Library() {
  const c = useTheme();
  const { session } = useApp();
  const library = useLibrary();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all");
  const tags = useMemo(
    () =>
      [...new Set((library.data || []).flatMap((t) => t.tags || []))].sort(),
    [library.data],
  );
  const items = useMemo(
    () =>
      (library.data || [])
        .filter(
          (t) =>
            (filter === "all" || filter === "fav"
              ? filter !== "fav" || t.fav
              : t.status === filter) &&
            (tag === "all" || t.tags?.includes(tag)) &&
            t.title.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) => (b.updated || 0) - (a.updated || 0)),
    [library.data, filter, query, tag],
  );
  if (!session)
    return (
      <Page>
        <State
          title="Your own cinema"
          body="Sign in with your existing Reel account to find your watchlist, collections and progress here."
          state="greeting"
          action={{ label: "Sign in", onPress: () => router.push("/auth") }}
        />
      </Page>
    );
  return (
    <Page scroll={false}>
      <View style={{ padding: 20, gap: 14 }}>
        <Copy kind="label" style={{ color: c.accent }}>
          {library.data?.length || 0} STORIES, ALL YOURS
        </Copy>
        <Copy kind="hero">The collection.</Copy>
        <Field
          value={query}
          onChangeText={setQuery}
          placeholder="Find a saved title"
          accessibilityLabel="Filter your library"
        />
        <Chips values={statuses} value={filter} onChange={setFilter} />
        {tags.length ? (
          <Chips
            values={[
              { value: "all", label: "Every collection" },
              ...tags.map((t) => ({ value: t, label: t })),
            ]}
            value={tag}
            onChange={setTag}
          />
        ) : null}
      </View>
      <FlatList
        data={items}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
        refreshing={library.isRefetching}
        onRefresh={() => void library.refetch()}
        ListHeaderComponent={
          <>
            {library.isPending ? (
              <Loading label="Opening your library…" />
            ) : null}
            <ErrorNote
              error={library.error}
              retry={() => void library.refetch()}
            />
          </>
        }
        ListEmptyComponent={
          !library.isPending && !library.error ? (
            <State
              title="Room for a great story"
              body={
                query || filter !== "all"
                  ? "No saved titles match these filters."
                  : "Save a film, series or recommendation to begin your collection."
              }
              action={{
                label: "Explore Discover",
                onPress: () => router.push("/(tabs)"),
              }}
            />
          ) : undefined
        }
        renderItem={({ item: t }) => (
          <TitleRow
            title={t}
            subtitle={`${t.status === "going" && ["series", "anime"].includes(t.type) ? `S${t.season || 1} · E${t.episode || 0}` : t.status === "done" ? "Watched" : t.status === "suggested" ? "Saved recommendation" : t.status === "want" ? "On your watchlist" : t.status || ""}${t.rating ? ` · Your rating ${t.rating}/10` : ""}${t.fav ? " · Favorite" : ""}`}
          />
        )}
      />
    </Page>
  );
}
