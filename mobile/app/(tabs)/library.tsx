import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  View,
  type FlatListProps,
} from "react-native";
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
  Button,
  usePageLayout,
} from "../../src/components/ui";
import { SheetFrame } from "../../src/components/SheetFrame";
import { Artwork } from "../../src/components/TitleCard";
import { LibraryCard } from "../../src/components/LibraryCard";
import type { Title } from "../../src/core/types";
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
  const { session } = useApp();
  return <LibraryScreen key={session?.user.id || "guest"} />;
}
function LibraryScreen() {
  const c = useTheme();
  const { content, gutter, available, fontScale } = usePageLayout();
  const columns =
    fontScale >= 1.5 ? 1 : content >= 840 ? 4 : available >= 520 ? 3 : 2;
  const posterWidth = Math.min(220, (content - (columns - 1) * 12) / columns);
  const { session } = useApp();
  const library = useLibrary();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [filterDraft, setFilterDraft] = useState<{
    status: string;
    tag: string | null;
  }>();
  const list = useRef<FlatList<Title>>(null);
  const anchor = useRef<{ id: string; index: number } | null>(null);
  const restoredColumns = useRef(columns);
  const restore = useRef<{ index: number; attempts: number } | null>(null);
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => () => clearTimeout(restoreTimer.current), [columns]);
  const trackAnchor = useCallback<
    NonNullable<FlatListProps<Title>["onViewableItemsChanged"]>
  >(
    ({ viewableItems }) => {
      if (restoredColumns.current !== columns || restore.current) return;
      const first = viewableItems.find((item) => item.isViewable);
      if (first?.index != null)
        anchor.current = { id: first.item.id, index: first.index };
    },
    [columns],
  );
  const collections = useMemo(() => {
    const grouped = new Map<string, Title[]>();
    for (const title of library.data || []) {
      for (const tag of new Set(title.tags || [])) {
        const collection = grouped.get(tag);
        if (collection) collection.push(title);
        else grouped.set(tag, [title]);
      }
    }
    return grouped;
  }, [library.data]);
  const tags = [...collections.keys()].sort();
  const items = useMemo(
    () =>
      (library.data || [])
        .filter(
          (t) =>
            (filter === "all" || filter === "fav"
              ? filter !== "fav" || t.fav
              : t.status === filter) &&
            (tag === null || t.tags?.includes(tag)) &&
            t.title.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((a, b) => (b.updated || 0) - (a.updated || 0)),
    [library.data, filter, query, tag],
  );
  const active = filter !== "all" || tag !== null || !!query;
  function clearFilters() {
    setFilter("all");
    setTag(null);
    setQuery("");
    list.current?.scrollToOffset({ offset: 0, animated: false });
  }
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
        ref={list}
        onViewableItemsChanged={trackAnchor}
        onContentSizeChange={() => {
          if (restoredColumns.current === columns || !items.length) return;
          restoredColumns.current = columns;
          if (!anchor.current) return;
          const index = items.findIndex((t) => t.id === anchor.current?.id);
          const target =
            index >= 0
              ? index
              : Math.min(anchor.current.index, items.length - 1);
          const indexToRestore = Math.floor(target / columns);
          restore.current = { index: indexToRestore, attempts: 0 };
          list.current?.scrollToIndex({
            index: indexToRestore,
            animated: false,
          });
          if (restore.current?.attempts === 0) restore.current = null;
        }}
        onScrollToIndexFailed={({ index, averageItemLength }) => {
          const pending = restore.current;
          if (!pending || pending.index !== index) return;
          list.current?.scrollToOffset({
            offset: index * averageItemLength,
            animated: false,
          });
          clearTimeout(restoreTimer.current);
          if (++pending.attempts >= 4) {
            restore.current = null;
            return;
          }
          // Let the virtualized list measure the estimated region before
          // aligning the actual target row.
          restoreTimer.current = setTimeout(() => {
            if (restore.current !== pending) return;
            const attempts = pending.attempts;
            list.current?.scrollToIndex({ index, animated: false });
            if (pending.attempts === attempts) restore.current = null;
          }, 120);
        }}
        key={`posters-${columns}`}
        numColumns={columns}
        columnWrapperStyle={
          columns > 1 ? { gap: 12, justifyContent: "center" } : undefined
        }
        data={items}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{
          paddingHorizontal: gutter,
          maxWidth: 1200,
          alignSelf: "center",
          width: "100%",
          paddingBottom: 28,
          gap: 18,
        }}
        refreshing={library.isRefetching}
        onRefresh={() => void library.refetch()}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={{ paddingTop: 24, paddingBottom: 6, gap: 16 }}>
            <Copy kind="headline" accessibilityRole="header">
              Library
            </Copy>
            <Field
              value={query}
              onChangeText={setQuery}
              placeholder="Find a saved title"
              accessibilityLabel="Filter your library"
            />
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Copy kind="small" style={{ color: c.secondary, flex: 1 }}>
                {[statuses.find((entry) => entry.value === filter)?.label, tag]
                  .filter(Boolean)
                  .join(" · ")}
              </Copy>
              <Button
                label="Filters"
                icon="options-outline"
                variant="secondary"
                onPress={() => setFilterDraft({ status: filter, tag })}
              />
            </View>
            {active ? (
              <Button
                label="Clear filters"
                variant="quiet"
                onPress={clearFilters}
              />
            ) : null}
            {tags.length && !tag ? (
              <ScrollView
                horizontal
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 12 }}
              >
                {tags.map((name) => {
                  const entries = collections.get(name) || [];
                  return (
                    <Pressable
                      key={name}
                      accessibilityRole="button"
                      accessibilityLabel={
                        name + " collection, " + entries.length + " titles"
                      }
                      onPress={() => setTag(name)}
                      style={{
                        width: 156,
                        borderRadius: 12,
                        backgroundColor: c.surface,
                        padding: 12,
                        gap: 8,
                      }}
                    >
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        {entries.slice(0, 2).map((t) => (
                          <Artwork key={t.id} title={t} width={32} decorative />
                        ))}
                      </View>
                      <Copy kind="subhead" numberOfLines={2}>
                        {name}
                      </Copy>
                      <Copy kind="small" style={{ color: c.secondary }}>
                        {entries.length}{" "}
                        {entries.length === 1 ? "title" : "titles"}
                      </Copy>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : null}
            {library.isPending ? (
              <Loading label="Opening your library…" />
            ) : null}
            <ErrorNote
              error={library.error}
              retry={() => void library.refetch()}
            />
            {library.data ? (
              <Copy kind="small" style={{ color: c.secondary }}>
                {items.length} {items.length === 1 ? "title" : "titles"}
                {active ? " matching your filters" : " in your library"}
              </Copy>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !library.isPending && !library.error ? (
            <State
              title="Room for a great story"
              body={
                active
                  ? "No saved titles match these filters."
                  : "Save a film, series or recommendation to begin your collection."
              }
              action={
                active
                  ? undefined
                  : {
                      label: "Search the catalogs",
                      onPress: () => router.navigate("/(tabs)/search"),
                    }
              }
            />
          ) : undefined
        }
        renderItem={({ item: t }) => (
          <LibraryCard title={t} width={posterWidth} row={columns === 1} />
        )}
      />
      {filterDraft ? (
        <SheetFrame
          title="Library filters"
          onClose={() => setFilterDraft(undefined)}
        >
          <Copy kind="subhead">Status</Copy>
          <Chips
            wrap
            values={statuses}
            value={filterDraft.status}
            onChange={(status) => setFilterDraft({ ...filterDraft, status })}
          />
          {tags.length ? (
            <>
              <Copy kind="subhead">Collection</Copy>
              <Chips
                wrap
                values={[
                  { value: "", label: "Every collection" },
                  ...tags.map((name) => ({ value: name, label: name })),
                ]}
                value={filterDraft.tag || ""}
                onChange={(value) =>
                  setFilterDraft({ ...filterDraft, tag: value || null })
                }
              />
            </>
          ) : null}
          <Button
            label="Apply filters"
            onPress={() => {
              setFilter(filterDraft.status);
              setTag(filterDraft.tag);
              setFilterDraft(undefined);
              list.current?.scrollToOffset({ offset: 0, animated: false });
            }}
          />
          <Button
            label="Clear filters"
            variant="quiet"
            onPress={() => {
              clearFilters();
              setFilterDraft(undefined);
            }}
          />
        </SheetFrame>
      ) : null}
    </Page>
  );
}
