import React, { useRef, useMemo, useState } from "react";
import { Alert, Platform, View, Linking } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import {
  titleDetails,
  episodes,
  searchTitles,
} from "../../src/services/catalog";
import { useLibrary, useLibraryAction } from "../../src/services/hooks";
import {
  addTitle,
  patchTitle,
  watchTitle,
  removeTitle,
} from "../../src/services/library";
import { useApp } from "../../src/providers/AppProvider";
import { useTheme } from "../../src/theme";
import { tracking, searchCore } from "../../src/core/shared";
import { isReleased } from "../../src/core/safety";
import type { Title, Episode, Status } from "../../src/core/types";
import {
  Page,
  Copy,
  Button,
  BackHeader,
  Loading,
  ErrorNote,
  Section,
  Field,
  Chips,
} from "../../src/components/ui";
import { Shelf } from "../../src/components/TitleCard";
import { DetailHero } from "../../src/components/DetailHero";
import { CastRail } from "../../src/components/People";
const statusOptions: { value: Status; label: string }[] = [
  { value: "want", label: "Watchlist" },
  { value: "going", label: "Watching" },
  { value: "paused", label: "Paused" },
  { value: "waiting", label: "Waiting" },
  { value: "dropped", label: "Dropped" },
];
export default function Details() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useApp();
  return <DetailsScreen key={`${session?.user.id || "guest"}:${id}`} id={id} />;
}
function DetailsScreen({ id }: { id: string }) {
  const c = useTheme();
  const { session } = useApp();
  const client = useQueryClient();
  const library = useLibrary();
  const seed = client.getQueryData<Title>(["title-seed", id]);
  const saved = (library.data || []).find(
    (t) =>
      t.catalogId === id ||
      t.id === id ||
      (seed && searchCore.sameWork(t, seed)),
  );
  const detail = useQuery({
    queryKey: ["title", id],
    queryFn: ({ signal }) => titleDetails(id, saved || seed, signal),
    enabled: !!id,
  });
  const t = detail.data || saved || seed;
  const guide = useQuery({
    queryKey: ["episodes", t?.catalogId || id],
    enabled: !!t && ["series", "anime"].includes(t.type),
    queryFn: ({ signal }) => episodes(t!, signal),
    staleTime: 3600000,
  });
  const related = useQuery({
    queryKey: ["related", id, t?.genres[0]],
    enabled: !!t,
    queryFn: ({ signal }) => searchTitles(t!.genres[0] || t!.title, signal),
    staleTime: 1800000,
  });
  const [season, setSeason] = useState("1");
  const [showAll, setShowAll] = useState(false);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const pendingWatch = useRef<{ key: string; requestId: string } | null>(null);
  const mutate = useLibraryAction(
    async (
      args: {
        kind: "save" | "patch" | "watch" | "remove";
        patch?: Partial<Title>;
        episode?: Episode;
        action?: "watch" | "unwatch" | "rewatch";
        requestId?: string;
      },
      userId: string,
    ) => {
      if (!t) throw new Error("This title has not loaded.");
      if (args.kind === "remove") {
        if (saved) await removeTitle(saved.id, userId);
        return;
      }
      const membership = saved?.id || (await addTitle(t, userId));
      if (args.kind === "patch")
        await patchTitle(membership, args.patch || {}, userId);
      if (args.kind === "watch") {
        const catalog = guide.data || [];
        const title = {
          ...t,
          ...saved,
          episodeCatalog: catalog,
          seasonGuide: groupSeasons(catalog),
        };
        await watchTitle(
          {
            id: membership,
            entries: [
              args.episode
                ? {
                    season: args.episode.season,
                    number: args.episode.number,
                    runtime: args.episode.runtime || t.runtime || undefined,
                  }
                : { runtime: t.runtime || undefined },
            ],
            action: args.action || "watch",
            requestId: args.requestId!,
            baseline: saved ? tracking.baselineKeys(title) : [],
          },
          userId,
        );
      }
    },
  );
  async function act(args: Parameters<typeof mutate.mutateAsync>[0]) {
    if (!session) {
      router.push("/auth");
      return;
    }
    setNotice("");
    try {
      if (args.kind === "watch") {
        const key = JSON.stringify([
          id,
          args.action || "watch",
          args.episode?.season,
          args.episode?.number,
        ]);
        if (pendingWatch.current?.key !== key)
          pendingWatch.current = { key, requestId: Crypto.randomUUID() };
      }
      await mutate.mutateAsync({
        ...args,
        requestId:
          args.kind === "watch" ? pendingWatch.current!.requestId : undefined,
      });
      if (args.kind === "watch") pendingWatch.current = null;
      setNotice(
        args.kind === "watch"
          ? "Watch history updated."
          : args.kind === "remove"
            ? "Removed from your library."
            : "Saved to your Reel.",
      );
    } catch {
      /* render exact error */
    }
  }
  const enriched = useMemo(
    () =>
      t
        ? {
            ...t,
            ...saved,
            episodeCatalog: guide.data || t.episodeCatalog,
            seasonGuide: groupSeasons(guide.data || t.episodeCatalog || []),
          }
        : undefined,
    [t, saved, guide.data],
  );
  const watched = enriched ? tracking.watchedSet(enriched) : new Set<string>();
  const seasons = [...new Set((guide.data || []).map((ep) => ep.season))].sort(
    (a, b) => a - b,
  );
  const selected = seasons.includes(Number(season))
    ? Number(season)
    : seasons[0];
  const seasonEpisodes = (guide.data || []).filter(
    (ep) => ep.season === selected,
  );
  const visible = showAll ? seasonEpisodes : seasonEpisodes.slice(0, 30);
  function remove() {
    if (Platform.OS === "web") {
      if (
        globalThis.confirm(
          "Remove this title and its associated watch history from your library?",
        )
      )
        void act({ kind: "remove" });
    } else
      Alert.alert(
        "Remove title?",
        "This also removes this title’s watch history from your account.",
        [
          { text: "Keep it", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: () => void act({ kind: "remove" }),
          },
        ],
      );
  }
  if (!t)
    return (
      <Page>
        <BackHeader title="Title details" />
        {detail.isPending ? (
          <Loading />
        ) : (
          <ErrorNote error={detail.error} retry={() => void detail.refetch()} />
        )}
      </Page>
    );
  const film = t.type === "movie";
  const episodic = ["series", "anime"].includes(t.type);
  return (
    <Page>
      <BackHeader
        title={t.type === "movie" ? "A film for your collection" : t.type}
      />
      <ErrorNote error={detail.error} retry={() => void detail.refetch()} />
      <DetailHero title={t} />
      <View style={{ gap: 10 }}>
        <Button
          label={saved ? "In your library" : "Add to watchlist"}
          icon={saved ? "checkmark" : "add"}
          variant={saved ? "secondary" : "primary"}
          disabled={
            !!saved || mutate.isPending || (!!session && library.isPending)
          }
          loading={mutate.isPending}
          onPress={() => void act({ kind: "save" })}
        />
        {film ? (
          <Button
            label={
              saved?.status === "done" ? "Log a rewatch" : "Mark as watched"
            }
            icon="checkmark-circle-outline"
            variant="secondary"
            disabled={mutate.isPending}
            onPress={() =>
              void act({
                kind: "watch",
                action: saved?.status === "done" ? "rewatch" : "watch",
              })
            }
          />
        ) : null}
        <ErrorNote error={mutate.error} />
        {notice ? (
          <Copy accessibilityRole="alert" style={{ color: c.mint }}>
            {notice}
          </Copy>
        ) : null}
      </View>
      <View style={{ gap: 12 }}>
        <Copy kind="small" style={{ color: c.accent }}>
          {t.genres.join(" / ") || "Genres unavailable"}
        </Copy>
        <Copy style={{ lineHeight: 25, color: c.muted }}>
          {t.synopsis || "A synopsis is not available from this catalog."}
        </Copy>
        {t.creator ? <Copy>Created by {t.creator}</Copy> : null}
      </View>
      <CastRail title={t} />
      {episodic ? (
        <Section title="One episode at a time" kicker="Your progress">
          <ErrorNote error={guide.error} retry={() => void guide.refetch()} />
          {guide.isPending ? (
            <Loading label="Loading the episode guide…" />
          ) : seasons.length ? (
            <>
              <Copy style={{ color: c.muted }}>
                {enriched ? tracking.progress(enriched).watched : 0} released
                episodes watched ·{" "}
                {guide.data?.filter((ep) => isReleased(ep)).length} released in
                this guide
              </Copy>
              <Chips
                values={seasons.map((n) => ({
                  value: String(n),
                  label: n >= 1900 ? String(n) : `Season ${n}`,
                }))}
                value={String(selected)}
                onChange={(v) => {
                  setSeason(v);
                  setShowAll(false);
                }}
              />
              {visible.map((ep) => {
                const seen = watched.has(tracking.key(ep.season, ep.number));
                const released = isReleased(ep);
                return (
                  <View
                    key={`${ep.season}:${ep.number}`}
                    style={{
                      flexDirection: "row",
                      gap: 12,
                      alignItems: "center",
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: c.line,
                    }}
                  >
                    <View style={{ flex: 1, gap: 4 }}>
                      <Copy style={{ fontWeight: "600" }}>
                        {enriched
                          ? tracking.episodeLabel(
                              enriched,
                              ep.season,
                              ep.number,
                            )
                          : `E${ep.number}`}{" "}
                        · {ep.name || "Untitled episode"}
                      </Copy>
                      <Copy
                        kind="small"
                        style={{ color: seen ? c.mint : c.muted }}
                      >
                        {seen
                          ? "Watched"
                          : released
                            ? ep.airdate || "Released"
                            : ep.airdate
                              ? `Airs ${ep.airdate}`
                              : "Release date unavailable"}
                      </Copy>
                    </View>
                    <Button
                      label={seen ? "Undo" : "Watch"}
                      icon={seen ? "checkmark-circle" : "ellipse-outline"}
                      variant="quiet"
                      disabled={!released || mutate.isPending}
                      onPress={() =>
                        void act({
                          kind: "watch",
                          episode: ep,
                          action: seen ? "unwatch" : "watch",
                        })
                      }
                    />
                  </View>
                );
              })}
              {seasonEpisodes.length > 30 ? (
                <Button
                  label={
                    showAll
                      ? "Show fewer episodes"
                      : `Show all ${seasonEpisodes.length} episodes`
                  }
                  variant="secondary"
                  onPress={() => setShowAll((v) => !v)}
                />
              ) : null}
            </>
          ) : (
            <Copy style={{ color: c.muted }}>
              A dated episode guide is not available for this provider. Your
              existing saved progress is preserved.
            </Copy>
          )}
        </Section>
      ) : null}
      {saved ? (
        <Section title="Make it yours">
          <Button
            label={saved.fav ? "Favorited" : "Add to favorites"}
            icon={saved.fav ? "heart" : "heart-outline"}
            variant="secondary"
            disabled={mutate.isPending}
            onPress={() =>
              void act({ kind: "patch", patch: { fav: !saved.fav } })
            }
          />
          {episodic ? (
            <Chips
              values={statusOptions}
              value={saved.status || "want"}
              onChange={(status) =>
                void act({ kind: "patch", patch: { status } })
              }
            />
          ) : null}
          <Copy kind="label">YOUR RATING</Copy>
          <Chips
            values={[
              { value: "0", label: "Unrated" },
              ...Array.from({ length: 10 }, (_, i) => ({
                value: String(i + 1),
                label: String(i + 1),
              })),
            ]}
            value={String(saved.rating || 0)}
            onChange={(v) =>
              void act({ kind: "patch", patch: { rating: Number(v) } })
            }
          />
          <Button
            label={editing ? "Close notes" : "Notes & collections"}
            variant="secondary"
            onPress={() => {
              setNotes(saved.notes || "");
              setTags(saved.tags?.join(", ") || "");
              setEditing((v) => !v);
            }}
          />
          {editing ? (
            <>
              <Field
                multiline
                value={notes}
                onChangeText={setNotes}
                placeholder="Your private notes"
                accessibilityLabel="Private notes"
                style={{ minHeight: 100 }}
              />
              <Field
                value={tags}
                onChangeText={setTags}
                placeholder="Collections, separated by commas"
                accessibilityLabel="Collections"
              />
              <Button
                label="Save notes & collections"
                disabled={mutate.isPending}
                onPress={() =>
                  void act({
                    kind: "patch",
                    patch: {
                      notes,
                      tags: tags
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  })
                }
              />
            </>
          ) : null}
          <Button
            label="Remove from library"
            variant="danger"
            disabled={mutate.isPending}
            onPress={remove}
          />
        </Section>
      ) : null}
      {related.data?.items.filter((r) => !searchCore.sameWork(r, t)).length ? (
        <Section title="Keep exploring" kicker="Related catalog search">
          <Shelf
            titles={related.data.items
              .filter((r) => !searchCore.sameWork(r, t))
              .slice(0, 12)}
          />
        </Section>
      ) : null}
      {t.sourceUrl ? (
        <Button
          label="View catalog source"
          variant="quiet"
          icon="open-outline"
          onPress={() => void Linking.openURL(t.sourceUrl!)}
        />
      ) : null}
      <Copy kind="small" style={{ color: c.muted }}>
        Catalog facts may be incomplete. Reel tracks what you watch; it does not
        stream this title.
      </Copy>
    </Page>
  );
}
function groupSeasons(catalog: Episode[]) {
  const groups = new Map<number, number[]>();
  for (const ep of catalog) {
    if (!isReleased(ep)) continue;
    const list = groups.get(ep.season) || [];
    list.push(ep.number);
    groups.set(ep.season, list);
  }
  return [...groups].map(([number, episodes]) => ({ number, episodes }));
}
