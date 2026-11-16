import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Animated, {
  Easing,
  FadeInDown,
  ReduceMotion,
} from "react-native-reanimated";
import { useApp } from "../../src/providers/AppProvider";
import { useLibrary, useLibraryAction } from "../../src/services/hooks";
import { askReel, type Answer } from "../../src/services/assistant";
import { addTitle } from "../../src/services/library";
import { recommendations as R, searchCore } from "../../src/core/shared";
import type { Title, RecSession } from "../../src/core/types";
import { useTheme } from "../../src/theme";
import {
  Page,
  Copy,
  Field,
  Button,
  Chips,
  ErrorNote,
  usePageLayout,
} from "../../src/components/ui";
import { Lumi } from "../../src/components/Lumi";
import { SheetFrame } from "../../src/components/SheetFrame";
import { RecommendationStage } from "../../src/components/RecommendationStage";

const sources = [
  { value: "mix", label: "Mix" },
  { value: "library", label: "My library" },
];
const formats = [
  { value: "watch", label: "Any watch" },
  { value: "movie", label: "Films" },
  { value: "series", label: "TV" },
  { value: "anime", label: "Anime" },
];
const starters = [
  "A thoughtful movie under two hours",
  "A comforting series for a long day",
  "American animation with adventure",
];
const reveal = FadeInDown.duration(240)
  .easing(Easing.bezier(0.16, 1, 0.3, 1))
  .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })
  .reduceMotion(ReduceMotion.System);
type Turn =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "reel"; answer: Answer; scope: string };
type Request = {
  text: string;
  state: RecSession;
  regenerate: boolean;
  scope: string;
};

export default function Ask() {
  const { session } = useApp();
  const { prompt } = useLocalSearchParams<{ prompt?: string }>();
  return (
    <AskConversation
      key={`${session?.user.id || "guest"}:${prompt || ""}`}
      initialPrompt={prompt || ""}
    />
  );
}

function AskConversation({ initialPrompt }: { initialPrompt: string }) {
  const c = useTheme();
  const { gutter, content, height, fontScale } = usePageLayout();
  const expanded = content >= 840 && fontScale < 1.5;
  const compact = height < 600 || content < 324 || fontScale >= 1.5;
  const { session, preferences } = useApp();
  const library = useLibrary();
  const [draft, setDraft] = useState(initialPrompt);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [source, setSource] = useState("mix");
  const [format, setFormat] = useState("watch");
  const [count, setCount] = useState("3");
  const [options, setOptions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [retry, setRetry] = useState<Request>();
  const [toast, setToast] = useState("");
  const [newResponse, setNewResponse] = useState(false);
  const [activeGroup, setActiveGroup] = useState<number>();
  const [selection, setSelection] = useState<Record<number, number>>({});
  const engine = useRef<RecSession>(R.session("mix", "watch"));
  const pending = useRef<{ snapshot: Request; abort: AbortController } | null>(
    null,
  );
  const nextId = useRef(0);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const following = useRef(true);
  const revealTurn = useRef<number | undefined>(undefined);
  const responsePositions = useRef(new Map<number, number>());
  const last = turns.reduce<Extract<Turn, { role: "reel" }> | undefined>(
    (previous, turn) => (turn.role === "reel" ? turn : previous),
    undefined,
  );
  const active = turns.find(
    (turn) => turn.role === "reel" && turn.id === activeGroup,
  );
  const scope = [
    sources.find((v) => v.value === source)?.label,
    formats.find((v) => v.value === format)?.label,
    count === "1" ? "One pick" : "3 picks",
  ].join(" · ");
  const save = useLibraryAction((title: Title, owner: string) =>
    addTitle({ ...title, status: "suggested" }, owner),
  );

  useEffect(
    () => () => {
      pending.current?.abort.abort();
      pending.current = null;
    },
    [],
  );

  function reset() {
    pending.current?.abort.abort();
    pending.current = null;
    engine.current = R.session(source, format);
    setTurns([]);
    setSelection({});
    setActiveGroup(undefined);
    setDraft("");
    setError(undefined);
    setRetry(undefined);
    setBusy(false);
    setToast("");
    setNewResponse(false);
    following.current = true;
    revealTurn.current = undefined;
    responsePositions.current.clear();
  }

  function cancel() {
    if (!pending.current) return;
    const { snapshot, abort } = pending.current;
    pending.current = null;
    abort.abort();
    setBusy(false);
    setRetry(snapshot);
  }

  async function run(snapshot: Request, appendUser: boolean) {
    if (pending.current) return;
    const abort = new AbortController();
    pending.current = { snapshot, abort };
    setBusy(true);
    setError(undefined);
    setRetry(undefined);
    setToast("");
    if (appendUser) {
      following.current = true;
      setNewResponse(false);
      const id = ++nextId.current;
      setTurns((value) => [
        ...value,
        { id, role: "user", text: snapshot.text },
      ]);
    }
    try {
      const answer = await askReel(
        snapshot.state,
        snapshot.text,
        library.data || [],
        abort.signal,
        { ai: !!session, regenerate: snapshot.regenerate },
      );
      if (pending.current?.abort !== abort || abort.signal.aborted) return;
      engine.current = answer.session;
      const id = ++nextId.current;
      if (following.current) revealTurn.current = id;
      setTurns((value) => [
        ...value,
        { id, role: "reel", answer, scope: snapshot.scope },
      ]);
      if (answer.items.length) setActiveGroup(id);
      if (!following.current) setNewResponse(true);
    } catch (failure) {
      if (pending.current?.abort !== abort || abort.signal.aborted) return;
      setError(failure);
      setRetry(snapshot);
    } finally {
      if (pending.current?.abort === abort) {
        pending.current = null;
        setBusy(false);
      }
    }
  }

  function send(text = draft, regenerate = false) {
    if (pending.current || !text.trim()) return;
    const prepared = structuredClone(engine.current);
    prepared.intent.source = source;
    prepared.intent.mediaType = format;
    prepared.intent.resultCount = Number(count);
    prepared.useRatings = preferences.useRatings;
    if (!regenerate && text === draft) setDraft("");
    void run(
      { text: text.trim(), state: prepared, regenerate, scope },
      !regenerate,
    );
  }

  async function savePick(title: Title) {
    if (!session) {
      router.push("/auth");
      return;
    }
    if (
      save.isPending ||
      (library.data || []).some((item) => searchCore.sameWork(item, title))
    )
      return;
    try {
      await save.mutateAsync(title);
      setToast(`${title.title} saved to your picks.`);
    } catch {
      // The mutation error stays visible above the composer.
    }
  }

  const stage = (turn: Extract<Turn, { role: "reel" }>) => (
    <RecommendationStage
      titles={turn.answer.items}
      selected={selection[turn.id] ?? 0}
      onSelect={(index) =>
        setSelection((value) => ({ ...value, [turn.id]: index }))
      }
      compact={compact || (expanded && height < 840)}
      saved={(title) =>
        (library.data || []).some((item) => searchCore.sameWork(item, title))
      }
      saving={save.isPending}
      onSave={(title) => void savePick(title)}
    />
  );
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Page scroll={false}>
        <View
          style={{
            flex: 1,
            width: "100%",
            maxWidth: 1200,
            alignSelf: "center",
          }}
        >
          <View
            style={{
              paddingHorizontal: gutter,
              borderBottomWidth: 1,
              borderColor: c.line,
            }}
          >
            <View
              style={{
                minHeight: 56,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Lumi
                state={busy ? "thinking" : turns.length ? "ready" : "curious"}
                size={32}
              />
              <Copy
                kind="subhead"
                accessibilityRole="header"
                style={{ flex: 1 }}
              >
                Ask Reel
              </Copy>
              <Button label="New chat" variant="quiet" onPress={reset} />
            </View>
            <View
              style={{
                minHeight: 48,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Copy kind="small" style={{ color: c.secondary, flex: 1 }}>
                {scope}
              </Copy>
              <Button
                label="Edit recommendation options"
                icon="options-outline"
                iconOnly
                variant="quiet"
                disabled={busy}
                onPress={() => setOptions(true)}
              />
            </View>
          </View>
          <View
            style={{
              flex: 1,
              flexDirection: expanded ? "row" : "column",
              gap: expanded ? 24 : 0,
            }}
          >
            <View style={{ flex: expanded ? 52 : 1, minWidth: 0 }}>
              <ScrollView
                ref={scroll}
                keyboardShouldPersistTaps="handled"
                scrollEventThrottle={100}
                onScroll={({ nativeEvent }) => {
                  following.current =
                    nativeEvent.contentSize.height -
                      nativeEvent.layoutMeasurement.height -
                      nativeEvent.contentOffset.y <
                    80;
                }}
                onContentSizeChange={() => {
                  if (revealTurn.current !== undefined) {
                    const top = responsePositions.current.get(
                      revealTurn.current,
                    );
                    if (top !== undefined) {
                      scroll.current?.scrollTo({
                        y: Math.max(0, top - 8),
                        animated: false,
                      });
                      revealTurn.current = undefined;
                      following.current = false;
                    }
                  } else if (pending.current && following.current) {
                    scroll.current?.scrollToEnd({ animated: false });
                  }
                }}
                contentContainerStyle={{ padding: gutter, gap: 20 }}
              >
                {!turns.length ? (
                  <View style={{ gap: 12 }}>
                    <Copy
                      kind={compact ? "headline" : "hero"}
                      accessibilityRole="header"
                    >
                      What are you in the mood for?
                    </Copy>
                    <Copy style={{ color: c.secondary }}>
                      Tell Reel what you feel like watching.{" "}
                      {session
                        ? "Chats stay in this session."
                        : "Catalog matching is available now. Sign in for AI interpretation."}
                    </Copy>
                    <Button
                      label="Guide me"
                      icon="sparkles-outline"
                      variant="secondary"
                      onPress={() => send("Help me choose something to watch")}
                    />
                    {starters.map((text) => (
                      <Button
                        key={text}
                        label={text}
                        variant="quiet"
                        onPress={() => send(text)}
                      />
                    ))}
                  </View>
                ) : null}
                {turns.map((turn) =>
                  turn.role === "user" ? (
                    <View
                      key={turn.id}
                      style={{
                        marginLeft: 24,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: c.raised,
                      }}
                    >
                      <Copy>{turn.text}</Copy>
                    </View>
                  ) : (
                    <Animated.View
                      key={turn.id}
                      entering={reveal}
                      onLayout={(event) => {
                        const top = event.nativeEvent.layout.y;
                        responsePositions.current.set(turn.id, top);
                        if (revealTurn.current === turn.id) {
                          revealTurn.current = undefined;
                          following.current = false;
                          scroll.current?.scrollTo({
                            y: Math.max(0, top - 8),
                            animated: false,
                          });
                        }
                      }}
                      style={{ gap: 12 }}
                    >
                      <Copy kind="label" style={{ color: c.accent }}>
                        {turn.answer.mode}
                      </Copy>
                      <Copy>{turn.answer.message}</Copy>
                      {turn.answer.warning ? (
                        <Copy kind="small" style={{ color: c.warning }}>
                          {turn.answer.warning}
                        </Copy>
                      ) : null}
                      {turn.answer.items.length ? (
                        <>
                          <Copy kind="small" style={{ color: c.secondary }}>
                            {turn.scope}
                          </Copy>
                          {expanded ? (
                            <Button
                              label={`View ${turn.answer.items.length === 1 ? "pick" : "picks"}`}
                              variant="secondary"
                              onPress={() => setActiveGroup(turn.id)}
                            />
                          ) : (
                            stage(turn)
                          )}
                        </>
                      ) : null}
                    </Animated.View>
                  ),
                )}
                {busy ? (
                  <Copy
                    accessibilityRole="progressbar"
                    style={{ color: c.secondary }}
                  >
                    Finding matches…
                  </Copy>
                ) : null}
                {!busy && !retry && last ? (
                  <>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                    >
                      {last.answer.suggestions.map((text) => (
                        <Button
                          key={text}
                          label={text}
                          variant="secondary"
                          onPress={() => send(text)}
                        />
                      ))}
                    </View>
                    {last.answer.items.length ? (
                      <Button
                        label={
                          last.scope === scope
                            ? "Find another set"
                            : "Find with these options"
                        }
                        icon="refresh"
                        variant="quiet"
                        onPress={() => send(engine.current.lastRequest, true)}
                      />
                    ) : null}
                  </>
                ) : null}
              </ScrollView>
              {newResponse ? (
                <Button
                  label="New response"
                  variant="secondary"
                  onPress={() => {
                    following.current = true;
                    setNewResponse(false);
                    const top = last && responsePositions.current.get(last.id);
                    if (typeof top === "number")
                      scroll.current?.scrollTo({
                        y: Math.max(0, top - 8),
                        animated: false,
                      });
                    else scroll.current?.scrollToEnd({ animated: false });
                  }}
                />
              ) : null}
            </View>
            {expanded && active?.role === "reel" ? (
              <ScrollView
                style={{ flex: 48, minWidth: 0 }}
                contentContainerStyle={{ padding: gutter }}
              >
                {stage(active)}
              </ScrollView>
            ) : null}
          </View>
          <View
            style={{
              borderTopWidth: 1,
              borderColor: c.line,
              paddingHorizontal: gutter,
              paddingVertical: 8,
              gap: 8,
            }}
          >
            <ErrorNote error={error || save.error} />
            {retry ? (
              <Button
                label="Retry request"
                icon="refresh"
                variant="quiet"
                onPress={() => void run(retry, false)}
              />
            ) : null}
            {toast ? (
              <Copy
                kind="small"
                accessibilityRole="alert"
                style={{ color: c.mint }}
              >
                {toast}
              </Copy>
            ) : null}
            <View
              style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}
            >
              <Field
                accessibilityLabel="Your request to Reel"
                placeholder="Describe what you want to watch"
                multiline
                maxLength={1200}
                value={draft}
                onChangeText={setDraft}
                style={{ flex: 1, maxHeight: 120, minHeight: 52 }}
              />
              {busy ? (
                <Button label="Cancel" variant="secondary" onPress={cancel} />
              ) : (
                <Button
                  label="Send"
                  icon="arrow-up"
                  iconOnly={compact}
                  disabled={!draft.trim()}
                  onPress={() => send()}
                />
              )}
            </View>
          </View>
        </View>
      </Page>
      {options ? (
        <SheetFrame
          title="Recommendation options"
          onClose={() => setOptions(false)}
        >
          <Copy kind="subhead">Source</Copy>
          <Chips values={sources} value={source} onChange={setSource} wrap />
          <Copy kind="small" style={{ color: c.secondary }}>
            Mix searches the catalogs and your library.
          </Copy>
          <Copy kind="subhead">Format</Copy>
          <Chips values={formats} value={format} onChange={setFormat} wrap />
          <Copy kind="subhead">How many?</Copy>
          <Chips
            values={[
              { value: "1", label: "One pick" },
              { value: "3", label: "3 picks" },
            ]}
            value={count}
            onChange={setCount}
            wrap
          />
          <Button label="Done" onPress={() => setOptions(false)} />
        </SheetFrame>
      ) : null}
    </KeyboardAvoidingView>
  );
}
