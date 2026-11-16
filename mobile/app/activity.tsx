import React, { useMemo, useState } from "react";
import { SectionList, View, Alert, Platform } from "react-native";
import { router } from "expo-router";
import { useApp } from "../src/providers/AppProvider";
import { useEvents, useLibrary, useLibraryAction } from "../src/services/hooks";
import { supabase } from "../src/services/supabase";
import { assertAccount } from "../src/services/library";
import { validDay, localDay } from "../src/core/dates";
import { useTheme } from "../src/theme";
import {
  Page,
  Copy,
  BackHeader,
  State,
  ErrorNote,
  Loading,
  Button,
  Field,
  Chips,
} from "../src/components/ui";
import { SheetFrame } from "../src/components/SheetFrame";
import type { WatchEvent } from "../src/core/types";
import { TitleRow } from "../src/components/TitleCard";
export default function Activity() {
  const c = useTheme();
  const { session } = useApp();
  const history = useEvents();
  const library = useLibrary();
  const [filter, setFilter] = useState("all");
  const [count, setCount] = useState(50);
  const [editing, setEditing] = useState("");
  const [date, setDate] = useState("");
  const [originalDate, setOriginalDate] = useState("");
  const changeDate = useLibraryAction(
    async (args: { eventId: string; day: string }, userId: string) => {
      if (!validDay(args.day))
        throw new Error("Enter a valid date as YYYY-MM-DD.");
      await assertAccount(userId);
      const { error } = await supabase
        .from("watch_events")
        .update({ watched_at: new Date(`${args.day}T12:00:00`).toISOString() })
        .eq("id", args.eventId)
        .eq("user_id", userId)
        .select("id")
        .single();
      if (error) throw error;
    },
  );
  const titles = useMemo(
    () => new Map((library.data || []).map((t) => [t.id, t])),
    [library.data],
  );
  const events = (history.data || []).filter(
    (e) =>
      ["movie_watched", "episode_watched", "rewatch"].includes(e.eventType) &&
      (filter === "all" ||
        e.mediaType === filter ||
        (filter === "series" && e.mediaType === "anime")),
  );
  const byDay = new Map<string, WatchEvent[]>();
  for (const event of events.slice(0, count)) {
    const day = localDay(event.watchedAt);
    const group = byDay.get(day);
    if (group) group.push(event);
    else byDay.set(day, [event]);
  }
  const sections = Array.from(byDay, ([day, data]) => ({ day, data }));
  function closeEditor() {
    if (changeDate.isPending) return;
    if (
      date === originalDate ||
      (Platform.OS === "web" && globalThis.confirm("Discard unsaved date?"))
    )
      setEditing("");
    else if (Platform.OS !== "web")
      Alert.alert("Discard date change?", undefined, [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => setEditing(""),
        },
      ]);
  }
  if (!session)
    return (
      <Page>
        <BackHeader title="Activity" />
        <State
          title="Your story so far"
          body="Sign in to see your real watch history."
          action={{ label: "Sign in", onPress: () => router.push("/auth") }}
        />
      </Page>
    );
  return (
    <Page scroll={false}>
      <View style={{ padding: 20, gap: 16 }}>
        <BackHeader title="Activity" />

        <Chips
          values={[
            { value: "all", label: "All viewing" },
            { value: "movie", label: "Movies" },
            { value: "series", label: "Episodes" },
          ]}
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setCount(50);
          }}
        />
        <ErrorNote
          error={history.error || library.error}
          retry={() => {
            void history.refetch();
            void library.refetch();
          }}
        />
      </View>
      <SectionList
        sections={sections}
        stickySectionHeadersEnabled={false}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        refreshing={history.isRefetching}
        onRefresh={() => void history.refetch()}
        ListHeaderComponent={
          history.isPending ? (
            <Loading label="Loading watch history…" />
          ) : undefined
        }
        ListEmptyComponent={
          !history.isPending && !history.error ? (
            <State
              title="Your first watch awaits"
              body="Mark a film or episode as watched. Dated activity will appear here; older undated progress is not invented as history."
            />
          ) : undefined
        }
        renderSectionHeader={({ section }) => (
          <Copy
            kind="small"
            accessibilityRole="header"
            style={{
              fontWeight: "600",
              color: c.secondary,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            {new Date(section.day + "T12:00:00").toLocaleDateString(undefined, {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </Copy>
        )}
        renderItem={({ item: e }) => {
          const t = titles.get(e.titleId);
          return (
            <View style={{ gap: 8, paddingBottom: 12 }}>
              {t ? (
                <TitleRow
                  title={t}
                  subtitle={
                    e.season !== null
                      ? `S${e.season} · E${e.episode}${e.eventType === "rewatch" ? " · Rewatch" : ""}`
                      : e.eventType === "rewatch"
                        ? "Rewatch"
                        : "Movie watched"
                  }
                />
              ) : (
                <Copy>Watch event · title unavailable</Copy>
              )}
              <Button
                label="Edit watch date"
                icon="calendar-outline"
                variant="quiet"
                onPress={() => {
                  const day = localDay(e.watchedAt);
                  changeDate.reset();
                  setEditing(e.id);
                  setDate(day);
                  setOriginalDate(day);
                }}
              />
            </View>
          );
        }}
        ListFooterComponent={
          count < events.length ? (
            <Button
              label="Load more history"
              variant="secondary"
              onPress={() => setCount((n) => n + 50)}
            />
          ) : undefined
        }
      />
      {editing ? (
        <SheetFrame title="Edit watch date" onClose={closeEditor}>
          <Copy kind="small">Watch date</Copy>
          <Field
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            accessibilityLabel="Watch date"
          />
          <ErrorNote error={changeDate.error} />
          <Button
            label="Save date"
            loading={changeDate.isPending}
            onPress={() => {
              void changeDate
                .mutateAsync({ eventId: editing, day: date })
                .then(() => setEditing(""))
                .catch(() => {});
            }}
          />
          <Button
            label="Cancel"
            variant="quiet"
            disabled={changeDate.isPending}
            onPress={closeEditor}
          />
        </SheetFrame>
      ) : null}
    </Page>
  );
}
