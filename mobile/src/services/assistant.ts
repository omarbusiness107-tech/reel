import type { RecSession, Title, Intent, MediaType } from "../core/types";
import { recommendations as R, searchCore } from "../core/shared";
import { discover, searchTitles, searchPeople, personDetails } from "./catalog";
import { config } from "./config";
import { supabase } from "./supabase";
interface Interpretation {
  update: Partial<Intent>;
  question: string | null;
  suggestions: string[];
  searchHints: { title: string; type: MediaType }[];
}
export interface Answer {
  session: RecSession;
  items: Title[];
  message: string;
  suggestions: string[];
  mode: "AI + catalog" | "Catalog matching";
  warning?: string;
}
async function ai<T>(
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!data.session) throw new Error("Sign in to use AI.");
  const response = await fetch(`${config.apiOrigin}/api/recommend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.any([signal, AbortSignal.timeout(45000)]),
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "AI is temporarily unavailable.");
  return result as T;
}
export async function askReel(
  previous: RecSession,
  message: string,
  library: Title[],
  signal: AbortSignal,
  options: { ai: boolean; regenerate?: boolean },
): Promise<Answer> {
  const state = structuredClone(previous);
  state.mode = "ask";
  let warning = "";
  let live = false;
  let interpreted: Interpretation | undefined;
  if (!options.regenerate) {
    R.interpret(state, message);
    state.lastRequest = message;
    state.answers.push(message);
  }
  if (options.ai && config.apiOrigin && !options.regenerate) {
    try {
      interpreted = await ai<Interpretation>(
        {
          action: "interpret",
          message,
          intent: state.intent,
          answers: state.answers,
          questions: state.questions,
          shown: state.shown,
          language: "en",
        },
        signal,
      );
      R.patch(state, interpreted.update);
      state.searchHints = interpreted.searchHints;
      live = true;
    } catch (e) {
      if (signal.aborted) throw e;
      warning = e instanceof Error ? e.message : "AI is unavailable.";
    }
  }
  const question = R.question(state);
  if (
    !options.regenerate &&
    state.questions.length < 3 &&
    (interpreted?.question || question?.text)
  ) {
    const prompt = interpreted?.question || question?.text || "";
    const key = interpreted?.question
      ? prompt
      : (question as { id?: string })?.id || prompt;
    if (!state.questions.includes(key)) {
      state.questions.push(key);
      return {
        session: state,
        items: [],
        message: prompt,
        suggestions: interpreted?.suggestions.length
          ? interpreted.suggestions
          : question?.chips || [],
        mode: live ? "AI + catalog" : "Catalog matching",
        warning,
      };
    }
  }
  const catalog: Title[] = [];
  if (state.intent.source !== "library") {
    const terms = [
      ...state.searchHints.map((h) => h.title),
      ...state.intent.similarTo,
      ...state.intent.people,
      ...state.intent.genres,
      ...state.intent.themes,
      ...state.intent.keywords,
    ].filter(Boolean);
    const queries = [...new Set(terms)].slice(0, 3);
    const retrieved = await Promise.allSettled(
      queries.map((q) => searchTitles(q, signal)),
    );
    for (const r of retrieved)
      if (r.status === "fulfilled") catalog.push(...r.value.items);
    if (state.intent.people.length) {
      const people = await searchPeople(state.intent.people[0], signal).catch(
        () => [],
      );
      const matches = people.filter(
        (p) =>
          searchCore.normalize(p.name) ===
          searchCore.normalize(state.intent.people[0]),
      );
      const credits = await Promise.allSettled(
        matches
          .slice(0, 2)
          .map((match) => personDetails(match.provider, match.id, signal)),
      );
      for (const result of credits)
        if (result.status === "fulfilled") catalog.push(...result.value.works);
    }
    if (!catalog.length) {
      try {
        catalog.push(...(await discover(signal)).items);
      } catch (e) {
        if (!library.length) throw e;
        warning = [
          warning,
          "Catalog discovery is unavailable. Matching your library only.",
        ]
          .filter(Boolean)
          .join(" ");
      }
    }
  }
  if (signal.aborted) throw new Error("Request cancelled.");
  const saved = library.map((t) => R.candidate(t, true));
  const remote = catalog
    .filter((t) => !library.some((s) => searchCore.sameWork(s, t)))
    .map((t) => R.candidate(t));
  const candidates = R.rank([...saved, ...remote], state, library).slice(0, 24);
  const count = Math.min(10, Math.max(1, state.intent.resultCount || 3));
  let picks: Title[] = [];
  if (options.ai && config.apiOrigin && candidates.length) {
    try {
      const result = await ai<{ choices: { id: string; why: string }[] }>(
        {
          action: "rank",
          intent: state.intent,
          count,
          candidates: candidates.map(R.facts),
        },
        signal,
      );
      picks = result.choices.flatMap((choice) => {
        const item = candidates.find((t) => t.recId === choice.id);
        return item ? [{ ...item, why: choice.why }] : [];
      });
      live = true;
    } catch (e) {
      if (signal.aborted) throw e;
      warning = e instanceof Error ? e.message : "AI is unavailable.";
    }
  }
  if (!picks.length)
    picks = R.selectWeighted(candidates, count).map((t) => ({
      ...t,
      why: R.explain(t, state),
    }));
  picks.forEach((t) => R.show(state, t));
  return {
    session: state,
    items: picks,
    message: picks.length
      ? `${picks.length === 1 ? "A story" : `${picks.length} stories`} for your next watch.`
      : "No unseen matches remain in these sources. Try a different mood, format or source.",
    suggestions: picks.length
      ? ["Something lighter", "More suspense", "A different direction"]
      : ["Try a comedy", "A thoughtful movie"],
    mode: live ? "AI + catalog" : "Catalog matching",
    warning,
  };
}
