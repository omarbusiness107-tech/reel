import React, { useRef, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  View,
  Linking,
  Pressable,
  FlatList,
} from "react-native";
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
  usePageLayout,
} from "../../src/components/ui";
import { Shelf } from "../../src/components/TitleCard";
import { DetailHero } from "../../src/components/DetailHero";
import { CastRail } from "../../src/components/People";
import { SheetFrame } from "../../src/components/SheetFrame";

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
  const { gutter } = usePageLayout();
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
  const [editor, setEditor] = useState<"notes" | "rating">();
  const [rating, setRating] = useState("0");
  const [episodeInfo, setEpisodeInfo] = useState<Episode>();
  const [synopsisOpen, setSynopsisOpen] = useState(false);
  const [synopsisOverflows, setSynopsisOverflows] = useState(false);
  const inFlight = useRef(false);
  const [notice, setNotice] = useState("");
  const pendingWatch = useRef(new Map<string, { action: string; id: string }>());
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
    if (inFlight.current) return false;
    inFlight.current = true;
    setNotice("");
    mutate.reset();
    try {
      let requestId: string | undefined;
      let watchKey: string | undefined;
      if (args.kind === "watch") {
        watchKey = JSON.stringify([args.episode?.season, args.episode?.number]);
        const action = args.action || "watch";
        const previous = pendingWatch.current.get(watchKey);
        requestId = previous?.action === action ? previous.id : Crypto.randomUUID();
        pendingWatch.current.set(watchKey, { action, id: requestId });
      }
      await mutate.mutateAsync({ ...args, requestId });
      if (watchKey) pendingWatch.current.delete(watchKey);
      setNotice(
        args.kind === "watch"
          ? "Watch history updated."
          : args.kind === "remove"
            ? "Removed from your library."
            : "Saved to your Reel.",
      );
      return true;
    } catch {
      return false;
    } finally {
      inFlight.current = false;
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
  const progress = enriched ? tracking.progress(enriched) : undefined;
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
  const header = (
    <View style={{ gap: 20 }}>
      <BackHeader
        title={
          film
            ? "Film"
            : t.type === "series"
              ? "TV series"
              : t.type === "anime"
                ? "Anime"
                : "Title details"
        }
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
        {editor || episodeInfo ? null : <ErrorNote error={mutate.error} />}
        {notice ? (
          <Copy accessibilityRole="alert" style={{ color: c.mint }}>
            {notice}
          </Copy>
        ) : null}
      </View>
      {episodic ? (
        <Section title="Your progress">
          {saved?.episode ? (
            <Copy kind="small" style={{ color: c.secondary }}>
              Saved position ·{" "}
              {tracking.episodeLabel(
                enriched || t,
                saved.season ?? 1,
                saved.episode,
              )}
            </Copy>
          ) : null}
          <ErrorNote error={guide.error} retry={() => void guide.refetch()} />
          {guide.isPending ? (
            <Loading label="Loading the episode guide…" />
          ) : seasons.length ? (
            <>
              <Copy kind="small" style={{ color: c.secondary }}>
                {progress?.watched ?? 0} watched · {progress?.total ?? 0}{" "}
                released in this guide
              </Copy>
              {progress?.total ? (
                <View
                  style={{
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: c.raised,
                  }}
                >
                  <View
                    style={{
                      width: `${progress.percent}%`,
                      height: "100%",
                      borderRadius: 2,
                      backgroundColor: c.mint,
                    }}
                  />
                </View>
              ) : null}
              {progress?.next ? (
                <Copy kind="small" style={{ color: c.secondary }}>
                  Next episode ·{" "}
                  {tracking.episodeLabel(
                    enriched || t,
                    progress.next.season,
                    progress.next.number,
                  )}
                  {progress.next.name ? " · " + progress.next.name : ""}
                </Copy>
              ) : null}
              <Chips
                values={seasons.map((n) => ({
                  value: String(n),
                  label:
                    n === 0
                      ? "Specials"
                      : n >= 1900
                        ? String(n)
                        : "Season " + n,
                }))}
                value={String(selected)}
                onChange={(value) => {
                  setSeason(value);
                  setShowAll(false);
                }}
              />
            </>
          ) : !guide.error ? (
            <Copy style={{ color: c.secondary }}>
              A dated episode guide is not available. Your saved progress is
              preserved.
            </Copy>
          ) : null}
        </Section>
      ) : null}
    </View>
  );
  const footer = (
    <View style={{ gap: 28, paddingTop: 20 }}>
      {episodic && seasonEpisodes.length > 30 ? (
        <Button
          label={
            showAll
              ? "Show fewer episodes"
              : "Show all " + seasonEpisodes.length + " episodes"
          }
          variant="secondary"
          onPress={() => setShowAll(!showAll)}
        />
      ) : null}
      <Section title="Synopsis">
        <Copy kind="small" style={{ color: c.accent }}>
          {t.genres.join(" / ") || "Genres unavailable"}
        </Copy>
        <Copy
          numberOfLines={!synopsisOpen ? 5 : undefined}
          onTextLayout={(event) => {
            if (event.nativeEvent.lines.length > 5) setSynopsisOverflows(true);
          }}
          style={{ color: c.secondary }}
        >
          {t.synopsis || "A synopsis is not available from this catalog."}
        </Copy>
        {synopsisOverflows || (t.synopsis?.length ?? 0) > 280 ? (
          <Button
            label={synopsisOpen ? "Show less" : "Read more"}
            variant="quiet"
            onPress={() => setSynopsisOpen(!synopsisOpen)}
          />
        ) : null}
        {t.creator ? <Copy>Created by {t.creator}</Copy> : null}
      </Section>
      <CastRail title={t} />
      {saved ? (
        <Section title="Your take">
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
          <Button
            label="Your rating"
            icon="star-outline"
            variant="secondary"
            onPress={() => {
              mutate.reset();
              setRating(String(saved.rating || 0));
              setEditor("rating");
            }}
          />
          <Copy kind="small" style={{ color: c.secondary }}>
            {saved.rating ? saved.rating + "/10 · Private" : "Unrated"}
          </Copy>
          <Button
            label="Notes & collections"
            icon="reader-outline"
            variant="secondary"
            onPress={() => {
              mutate.reset();
              setNotes(saved.notes || "");
              setTags(saved.tags?.join(", ") || "");
              setEditor("notes");
            }}
          />
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
      <ErrorNote error={related.error} retry={() => void related.refetch()} />
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
    </View>
  );

  function episodeLabel(ep: Episode) {
    return tracking.episodeLabel(enriched || t!, ep.season, ep.number);
  }
  function episodeAction(ep: Episode) {
    const seen = watched.has(tracking.key(ep.season, ep.number));
    return (
      <Button
        label={seen ? "Undo" : "Watch"}
        icon={seen ? "checkmark-circle" : "checkmark-outline"}
        variant="secondary"
        disabled={!isReleased(ep) || mutate.isPending}
        onPress={() =>
          void act({
            kind: "watch",
            episode: ep,
            action: seen ? "unwatch" : "watch",
          })
        }
      />
    );
  }
  function closeEditor() {
    if (mutate.isPending) return;
    const dirty =
      editor === "rating"
        ? rating !== String(saved?.rating || 0)
        : notes !== (saved?.notes || "") ||
          tags !== (saved?.tags?.join(", ") || "");
    if (
      !dirty ||
      (Platform.OS === "web" && globalThis.confirm("Discard unsaved changes?"))
    ) {
      setEditor(undefined);
    } else if (Platform.OS !== "web") {
      Alert.alert("Discard changes?", "Your saved entry will stay as it was.", [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => setEditor(undefined),
        },
      ]);
    }
  }
  return (
    <Page scroll={false}>
      <FlatList
        data={episodic ? visible : []}
        keyExtractor={(ep) => ep.season + ":" + ep.number}
        contentContainerStyle={{
          padding: gutter,
          paddingBottom: 40,
          maxWidth: 1120,
          width: "100%",
          alignSelf: "center",
        }}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        renderItem={({ item: ep }) => (
          <View
            style={{
              flexDirection: "row",
              gap: 12,
              alignItems: "center",
              minHeight: 88,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                mutate.reset();
                setEpisodeInfo(ep);
              }}
              style={{ flex: 1, gap: 4, paddingVertical: 12 }}
            >
              <Copy style={{ fontWeight: "600" }}>
                {episodeLabel(ep)} · {ep.name || "Untitled episode"}
              </Copy>
              <Copy
                kind="small"
                style={{
                  color: watched.has(tracking.key(ep.season, ep.number))
                    ? c.mint
                    : c.secondary,
                }}
              >
                {watched.has(tracking.key(ep.season, ep.number))
                  ? "Watched"
                  : ep.airdate
                    ? isReleased(ep)
                      ? ep.airdate
                      : "Airs " + ep.airdate
                    : "Release date unavailable"}
              </Copy>
            </Pressable>
            {episodeAction(ep)}
          </View>
        )}
      />
      {episodeInfo ? (
        <SheetFrame
          title="Episode details"
          onClose={() => setEpisodeInfo(undefined)}
        >
          <Copy kind="small" style={{ color: c.secondary }}>
            {t.title} · {episodeLabel(episodeInfo)}
          </Copy>
          <Copy kind="headline">{episodeInfo.name || "Untitled episode"}</Copy>
          <Copy kind="small" style={{ color: c.secondary }}>
            {episodeInfo.airdate || "Release date unavailable"}
            {episodeInfo.runtime ? " · " + episodeInfo.runtime + " min" : ""}
          </Copy>
          {episodeAction(episodeInfo)}
          <ErrorNote error={mutate.error} />
        </SheetFrame>
      ) : null}
      {editor && saved ? (
        <SheetFrame
          title={editor === "rating" ? "Your rating" : "Notes & collections"}
          onClose={closeEditor}
        >
          {editor === "rating" ? (
            <>
              <Copy kind="metric">
                {rating === "0" ? "Unrated" : rating + "/10"}
              </Copy>
              <Chips
                wrap
                values={Array.from({ length: 11 }, (_, i) => ({
                  value: String(i),
                  label: i ? String(i) : "Unrated",
                }))}
                value={rating}
                onChange={setRating}
              />
            </>
          ) : (
            <>
              <Copy kind="small">Private notes</Copy>
              <Field
                multiline
                value={notes}
                onChangeText={setNotes}
                accessibilityLabel="Private notes"
                style={{ minHeight: 100 }}
              />
              <Copy kind="small">Collections, separated by commas</Copy>
              <Field
                value={tags}
                onChangeText={setTags}
                accessibilityLabel="Collections"
              />
            </>
          )}
          <ErrorNote error={mutate.error} />
          <Button
            label={
              editor === "rating" ? "Save rating" : "Save notes & collections"
            }
            loading={mutate.isPending}
            onPress={() => {
              const patch: Partial<Title> = {};
              if (editor === "rating") {
                if (Number(rating) !== (saved.rating || 0))
                  patch.rating = Number(rating);
              } else {
                if (notes !== (saved.notes || "")) patch.notes = notes;
                const collections = tags
                  .split(",")
                  .map((tag) => tag.trim())
                  .filter(Boolean);
                if (
                  JSON.stringify(collections) !==
                  JSON.stringify(saved.tags || [])
                )
                  patch.tags = collections;
              }
              if (!Object.keys(patch).length) {
                setEditor(undefined);
                return;
              }
              void act({ kind: "patch", patch }).then((saved) => {
                if (saved) setEditor(undefined);
              });
            }}
          />
          <Button
            label="Cancel"
            variant="quiet"
            disabled={mutate.isPending}
            onPress={closeEditor}
          />
        </SheetFrame>
      ) : null}
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
