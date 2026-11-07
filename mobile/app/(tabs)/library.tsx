import React, { useMemo, useState } from "react";
import { FlatList, View, useWindowDimensions } from "react-native";
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
import { LibraryCard } from "../../src/components/LibraryCard";
const statuses = [
  { value: "all", label: "All" },
  { value: "want", label: "Watchlist" },
  { value: "going", label: "In progress" },
  { value: "done", label: "Watched" },
  { value: "fav", label: "Favorites" },
  { value: "suggested", label: "Saved picks" },
  { value: "paused", label: "Paused" },
  { value: "waiting", label: "Waiting" },
  { value: "dropped", label: "Dropped" },
];
export default function Library() {
  const c = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const columns =
    fontScale > 1.5
      ? 1
      : Math.max(2, Math.min(4, Math.floor((width - 26) / 174)));
  const posterWidth = (width - 40 - (columns - 1) * 14) / columns;
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
      <FlatList
        key={`posters-${columns}`}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? { gap: 14 } : undefined}
        data={items}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 28,
          gap: 18,
        }}
        refreshing={library.isRefetching}
        onRefresh={() => void library.refetch()}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ paddingTop: 24, paddingBottom: 6, gap: 16 }}>
            <Copy kind="hero">Your library.</Copy>
            <Copy style={{ color: c.muted }}>
              {library.data?.length || 0}{" "}
              {(library.data?.length || 0) === 1 ? "story" : "stories"} to make
              time for.
            </Copy>
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
            {library.isPending ? (
              <Loading label="Opening your library…" />
            ) : null}
            <ErrorNote
              error={library.error}
              retry={() => void library.refetch()}
            />
            <Copy kind="small" style={{ color: c.muted }}>
              {items.length} {items.length === 1 ? "title" : "titles"}
              {filter !== "all" || tag !== "all" || query
                ? " matching your selection"
                : " in your collection"}
            </Copy>
          </View>
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
          <LibraryCard title={t} width={posterWidth} />
        )}
      />
    </Page>
  );
}
