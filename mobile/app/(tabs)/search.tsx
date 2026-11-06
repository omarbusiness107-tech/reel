import React, { useEffect, useMemo, useState } from "react";
import { FlatList, View, Pressable, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  useQuery,
  useQueries,
  type UseQueryResult,
} from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { titleSearchSources, searchPeople } from "../../src/services/catalog";
import { useLibrary } from "../../src/services/hooks";
import { searchCore } from "../../src/core/shared";
import { useTheme } from "../../src/theme";
import { useApp } from "../../src/providers/AppProvider";
import {
  Page,
  Copy,
  Field,
  Chips,
  Loading,
  ErrorNote,
  State,
  Button,
} from "../../src/components/ui";
import { TitleRow, openPerson } from "../../src/components/TitleCard";
import type { Title, Person } from "../../src/core/types";
const filters = [
  { value: "all", label: "All" },
  { value: "movie", label: "Films" },
  { value: "series", label: "TV" },
  { value: "anime", label: "Anime" },
  { value: "people", label: "People" },
  { value: "library", label: "My library" },
] as const;
type Row = { kind: "title"; value: Title } | { kind: "person"; value: Person };
function combineSources(results: UseQueryResult<Title[], Error>[]) {
  return {
    items: results.flatMap((result) => result.data || []),
    warnings: results.flatMap((result, index) =>
      result.isError
        ? [
            `${titleSearchSources[index].label} is unavailable. Other sources are still shown.`,
          ]
        : [],
    ),
    loading: results.some((result) => result.isPending),
    error: results.every((result) => result.isError) ? results[0].error : null,
    retry: () => Promise.all(results.map((result) => result.refetch())),
  };
}
export default function Search() {
  const { session } = useApp();
  const params = useLocalSearchParams<{ q?: string }>();
  return (
    <SearchResults
      key={`${session?.user.id || "guest"}:${params.q || ""}`}
      initialQuery={params.q || ""}
    />
  );
}
function SearchResults({ initialQuery }: { initialQuery: string }) {
  const c = useTheme();
  const { session } = useApp();
  const [text, setText] = useState(initialQuery);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [recent, setRecent] = useState<string[]>([]);
  const library = useLibrary();
  const recentKey = `reel.mobile.recent.v1.${session?.user.id || "guest"}`;
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(recentKey).then((s) => {
      if (s && active) {
        try {
          const list = JSON.parse(s);
          if (Array.isArray(list))
            setRecent(list.filter((v) => typeof v === "string").slice(0, 8));
        } catch {}
      }
    });
    return () => {
      active = false;
    };
  }, [recentKey]);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text]);
  const titles = useQueries({
    queries: titleSearchSources.map((source) => ({
      queryKey: ["search-source", source.key, query],
      enabled: query.length >= 2 && filter !== "library" && filter !== "people",
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        source.search(query, signal),
      retry: 1,
    })),
    combine: combineSources,
  });
  const people = useQuery({
    queryKey: ["people-search", query],
    enabled: query.length >= 2 && ["all", "people"].includes(filter),
    queryFn: ({ signal }) => searchPeople(query, signal),
  });
  const results = useMemo(() => {
    if (query.length < 2) return [];
    const q = searchCore.normalize(query);
    const local = (library.data || []).filter((t) =>
      searchCore.normalize(t.title).includes(q),
    );
    const combined =
      filter === "library"
        ? local
        : searchCore.dedupe([...local, ...titles.items], {
            preferred: new Set(local),
          });
    const rows: Row[] = combined
      .filter((t) => ["all", "library"].includes(filter) || t.type === filter)
      .sort((a, b) => searchCore.compare(a, b, query))
      .map((value) => ({ kind: "title", value }));
    const names: Row[] = ["all", "people"].includes(filter)
      ? (people.data || []).map((value) => ({ kind: "person", value }))
      : [];
    const exactPerson = names.some(
      (r) => r.kind === "person" && searchCore.normalize(r.value.name) === q,
    );
    return exactPerson ? [...names, ...rows] : [...rows, ...names];
  }, [query, filter, titles.items, people.data, library.data]);
  async function remember() {
    const value = text.trim();
    if (value.length < 2) return;
    const next = [value, ...recent.filter((s) => s !== value)].slice(0, 8);
    setRecent(next);
    await AsyncStorage.setItem(recentKey, JSON.stringify(next));
  }
  const loading =
    query.length >= 2 &&
    ((filter !== "library" && filter !== "people" && titles.loading) ||
      (["all", "people"].includes(filter) && people.isPending));
  return (
    <Page scroll={false}>
      <View style={{ padding: 20, gap: 16 }}>
        <Copy kind="hero">{"Follow your\ncuriosity."}</Copy>
        <Field
          value={text}
          onChangeText={setText}
          placeholder="Titles, actors, directors…"
          accessibilityLabel="Search titles, actors and directors"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => void remember()}
        />
        <Chips values={filters} value={filter} onChange={setFilter} />
      </View>
      {query.length < 2 ? (
        <View style={{ paddingHorizontal: 20, flex: 1 }}>
          {recent.length ? (
            <>
              <Copy kind="label" style={{ color: c.muted }}>
                RECENT SEARCHES
              </Copy>
              {recent.map((q) => (
                <Button
                  key={q}
                  label={q}
                  variant="quiet"
                  icon="time-outline"
                  onPress={() => setText(q)}
                />
              ))}
              <Button
                label="Clear recent searches"
                variant="quiet"
                onPress={() => {
                  setRecent([]);
                  void AsyncStorage.removeItem(recentKey);
                }}
              />
            </>
          ) : (
            <State
              title="Start with a spark"
              body="A title you loved. A director you follow. Find where the story goes next."
              state="curious"
            />
          )}
        </View>
      ) : (
        <FlatList
          data={results}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(r) =>
            `${r.kind}:${r.kind === "title" ? r.value.id : r.value.provider + ":" + r.value.id}`
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 28 }}
          ListHeaderComponent={
            <>
              {loading ? (
                results.length ? (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                      paddingVertical: 12,
                    }}
                  >
                    <ActivityIndicator size="small" color={c.accent} />
                    <Copy kind="small" style={{ color: c.muted }}>
                      Searching remaining sources…
                    </Copy>
                  </View>
                ) : (
                  <Loading label="Searching the catalogs…" />
                )
              ) : null}
              <ErrorNote
                error={
                  filter !== "library" && filter !== "people"
                    ? titles.error
                    : null
                }
                retry={() => void titles.retry()}
              />
              <ErrorNote
                error={["all", "people"].includes(filter) ? people.error : null}
                retry={() => void people.refetch()}
              />
              {(filter !== "library" && filter !== "people"
                ? titles.warnings
                : []
              ).map((w) => (
                <Copy key={w} kind="small" style={{ color: c.muted }}>
                  {w}
                </Copy>
              ))}
            </>
          }
          ListEmptyComponent={
            !loading ? (
              <State
                title="No matches yet"
                body="Try a shorter title, another spelling or a person’s full name."
              />
            ) : undefined
          }
          renderItem={({ item }) =>
            item.kind === "title" ? (
              <TitleRow
                title={item.value}
                subtitle={item.value.status ? "In your library" : undefined}
              />
            ) : (
              <Pressable
                onPress={() => {
                  void remember();
                  openPerson(item.value);
                }}
                accessibilityRole="button"
                style={{
                  minHeight: 76,
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: c.line,
                  gap: 5,
                }}
              >
                <Copy style={{ fontWeight: "700" }}>{item.value.name}</Copy>
                <Copy kind="small" style={{ color: c.muted }}>
                  PERSON · {item.value.role || "Film & television"}
                </Copy>
              </Pressable>
            )
          }
        />
      )}
    </Page>
  );
}
