import React, { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
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
  Loading,
} from "../../src/components/ui";
import { Lumi } from "../../src/components/Lumi";
import { TitleRow } from "../../src/components/TitleCard";
const prompts = [
  "A thoughtful movie under two hours",
  "A comforting series for a long day",
  "American animation with adventure",
];
interface Message {
  id: number;
  role: "user" | "reel";
  text: string;
  items?: Title[];
  mode?: Answer["mode"];
  suggestions?: string[];
  warning?: string;
}
export default function Ask() {
  const { session } = useApp();
  const params = useLocalSearchParams<{ prompt?: string }>();
  return (
    <AskConversation
      key={`${session?.user.id || "guest"}:${params.prompt || ""}`}
      initialPrompt={params.prompt || ""}
    />
  );
}
function AskConversation({ initialPrompt }: { initialPrompt: string }) {
  const c = useTheme();
  const { session, preferences } = useApp();
  const library = useLibrary();
  const [draft, setDraft] = useState(initialPrompt);
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [source, setSource] = useState("mix");
  const [format, setFormat] = useState("watch");
  const [list, setList] = useState(true);
  const [suggestions, setSuggestions] = useState(prompts);
  const rec = useRef<RecSession>(R.session("mix", "watch"));
  const request = useRef<AbortController | null>(null);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const sequence = useRef(0);
  const [toast, setToast] = useState("");
  const save = useLibraryAction(async (t: Title, id: string) =>
    addTitle({ ...t, status: "suggested" }, id),
  );
  useEffect(() => () => request.current?.abort(), []);
  function reset() {
    request.current?.abort();
    sequence.current++;
    rec.current = R.session(source, format);
    setMessages([]);
    setSuggestions(prompts);
    setError(null);
    setBusy(false);
    setToast("");
  }
  async function send(text = draft, regenerate = false) {
    if (busy || (!regenerate && !text.trim())) return;
    if (text.length > 1200) {
      setError(new Error("Keep your request under 1,200 characters."));
      return;
    }
    const current = ++sequence.current;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError(null);
    setDraft("");
    setToast("");
    const prepared = structuredClone(rec.current);
    prepared.intent.source = source;
    prepared.intent.mediaType = format;
    prepared.intent.resultCount = list ? 3 : 1;
    prepared.useRatings = preferences.useRatings;
    if (!regenerate)
      setMessages((m) => [
        ...m,
        { id: Date.now(), role: "user", text: text.trim() },
      ]);
    try {
      const result = await askReel(
        prepared,
        text.trim(),
        library.data || [],
        controller.signal,
        { ai: !!session, regenerate },
      );
      if (sequence.current !== current || controller.signal.aborted) return;
      rec.current = result.session;
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: "reel",
          text: result.message,
          items: result.items,
          mode: result.mode,
          suggestions: result.suggestions,
          warning: result.warning,
        },
      ]);
      setSuggestions(result.suggestions);
    } catch (e) {
      if (!controller.signal.aborted && sequence.current === current)
        setError(e);
    } finally {
      if (sequence.current === current) setBusy(false);
    }
  }
  async function savePick(t: Title) {
    if (!session) {
      router.push("/auth");
      return;
    }
    if ((library.data || []).some((s) => searchCore.sameWork(s, t))) {
      setToast("Already in your library.");
      return;
    }
    try {
      await save.mutateAsync(t);
      setToast(`${t.title} saved to your picks.`);
    } catch {
      /* mutation error rendered below */
    }
  }
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Page scroll={false}>
        <View style={{ padding: 20, paddingBottom: 10, gap: 12 }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View
              style={{ flexDirection: "row", gap: 10, alignItems: "center" }}
            >
              <Lumi
                state={
                  busy ? "thinking" : messages.length ? "ready" : "curious"
                }
                size={42}
              />
              <Copy kind="title">Ask Reel</Copy>
            </View>
            <Button label="New chat" variant="quiet" onPress={reset} />
          </View>
          <Chips
            values={[
              { value: "mix", label: "Discover + library" },
              { value: "library", label: "My library" },
            ]}
            value={source}
            onChange={(v) => {
              setSource(v);
              rec.current.intent.source = v;
            }}
          />
          <Chips
            values={[
              { value: "watch", label: "Any watch" },
              { value: "movie", label: "Films" },
              { value: "series", label: "Series" },
              { value: "anime", label: "Anime" },
            ]}
            value={format}
            onChange={setFormat}
          />
        </View>
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, gap: 22, paddingBottom: 28 }}
          onContentSizeChange={() =>
            scroll.current?.scrollToEnd({ animated: false })
          }
        >
          {!messages.length ? (
            <View style={{ gap: 18, paddingVertical: 20 }}>
              <Copy kind="hero">{"Less searching.\nMore feeling."}</Copy>
              <Copy style={{ color: c.muted }}>
                Tell me the kind of story you need. A mood, a filmmaker, or a
                wonderfully specific idea.
              </Copy>
              <Copy kind="small" style={{ color: c.muted }}>
                {session
                  ? "AI helps interpret your request; real catalogs supply the facts."
                  : "Catalog matching is available now. Sign in for AI interpretation."}{" "}
                Conversations stay in this session.
              </Copy>
            </View>
          ) : null}
          {messages.map((m) => (
            <View
              key={m.id}
              style={{
                gap: 12,
                padding: 16,
                borderRadius: 18,
                backgroundColor: m.role === "user" ? c.raised : c.surface,
                marginLeft: m.role === "user" ? 28 : 0,
              }}
            >
              <Copy
                kind="label"
                style={{ color: m.role === "reel" ? c.accent : c.muted }}
              >
                {m.role === "user" ? "YOU" : `REEL · ${m.mode}`}
              </Copy>
              <Copy>{m.text}</Copy>
              {m.warning ? (
                <Copy kind="small" style={{ color: c.muted }}>
                  {m.warning} Using catalog matching where needed.
                </Copy>
              ) : null}
              {m.items?.map((t) => (
                <View key={t.recId || t.id} style={{ gap: 8 }}>
                  <TitleRow title={t} />
                  <Copy kind="small" style={{ color: c.muted }}>
                    {t.why}
                  </Copy>
                  <Button
                    label={
                      (library.data || []).some((s) =>
                        searchCore.sameWork(s, t),
                      )
                        ? "In your library"
                        : "Save pick"
                    }
                    icon="bookmark-outline"
                    variant="secondary"
                    loading={save.isPending}
                    onPress={() => void savePick(t)}
                  />
                </View>
              ))}
            </View>
          ))}
          {busy ? <Loading label="Lumi is connecting the dots…" /> : null}
          <ErrorNote error={error} />
          <ErrorNote error={save.error} />
          {toast ? (
            <Copy accessibilityRole="alert" style={{ color: c.mint }}>
              {toast}
            </Copy>
          ) : null}
          {!busy
            ? suggestions.map((p) => (
                <Button
                  key={p}
                  label={p}
                  variant="secondary"
                  onPress={() => void send(p)}
                />
              ))
            : null}
          {!busy && messages.length ? (
            <Button
              label="Find another set"
              variant="quiet"
              icon="refresh"
              onPress={() => void send(rec.current.lastRequest, true)}
            />
          ) : null}
        </ScrollView>
        <View
          style={{
            padding: 16,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: c.line,
            gap: 8,
          }}
        >
          <View
            style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}
          >
            <Field
              accessibilityLabel="Your request to Reel"
              placeholder="What are you in the mood for?"
              multiline
              maxLength={1200}
              value={draft}
              onChangeText={setDraft}
              style={{ flex: 1, maxHeight: 120 }}
            />
            <Button
              label="Send"
              icon="arrow-up"
              onPress={() => void send()}
              loading={busy}
              disabled={!draft.trim()}
            />
          </View>
          <Button
            label={list ? "3 picks · tap for one" : "One pick · tap for a list"}
            variant="quiet"
            onPress={() => setList((v) => !v)}
            style={{ minHeight: 36, paddingVertical: 4 }}
          />
        </View>
      </Page>
    </KeyboardAvoidingView>
  );
}
