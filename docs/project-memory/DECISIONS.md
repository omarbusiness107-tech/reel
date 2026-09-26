# Reel decisions

Last verified: 2026-09-25
Repository/branch: Reel / main
Verified against: current working tree
Purpose: Preserve confirmed product and engineering choices without inventing rationale.

## Decision

Keep Reel as a dependency-light static SPA centered on `reel.html`, with a small Vercel server function only for optional AI.

### Reason

The app must remain usable directly from a local browser copy. The new personal-tracking brief explicitly authorizes an incremental account database migration but does not call for a framework conversion.

### Consequences

Preserve the local-first path. Extract focused modules and add hash destinations without breaking `reel.html`, existing overlays, search, or Pick 4 Me. Avoid an unsafe wholesale rewrite.

## Decision

Keep library status/progress distinct from dated viewing activity, with legacy progress as an undated baseline.

### Reason

Old season and episode numbers do not contain actual watch dates. Deriving a history or watch-time trend from them would fabricate activity. Rewatches also need multiple dated instances per title.

### Consequences

`user_titles.watched_episodes = NULL` means legacy cursor-based progress; an explicit array means episode-by-episode progress. `watch_events` stores only real user actions. Activity and Stats use events, so existing completed titles do not suddenly appear as watches on the migration date. The local-only guest path stores the same shape in its own browser state.

## Decision

Store the personal library locally first, with optional private Supabase sync.

### Reason

The README and product specification prioritize local ownership, browser-only use, export/import, and optional cross-device sync.

### Consequences

Do not make basic library or local recommendation workflows dependent on auth, network, or cloud storage. Preserve backup/export behavior.

## Decision

Store shared provider metadata once and authenticated personal state in private account relationships.

### Reason

The former JSON-blob sync mixed global metadata with private status, ratings, progress, favorites, and notes. It could also upload an unscoped browser library into a newly signed-in account.

### Consequences

Use `titles` plus `user_titles`, enforce unique `(user_id,title_id)`, and authorize every private operation with owner-only RLS. Guest state remains separate. The catalog-upsert RPC derives ownership only from `auth.uid()`, uses a fixed search path, and is unavailable to anonymous callers.

## Decision

Make Pick 4 me a temporary split-screen decision workspace.

### Reason

The current product/design documentation specifies a desktop result/conversation split and mobile Chat/Pick tabs. It says closing ends the temporary session and conversation/history are not persisted.

### Consequences

Keep recommendation and conversation prominent together on desktop; retain a usable mobile pane switch. Avoid turning transient mood/rejection input into permanent preferences or persisted history without a new product decision.

## Decision

Keep Pick and Surprise as separate modes with shared source and format controls.

### Reason

The implemented behavior documents Surprise as a focused no-composer mode and Pick as the conversational mode. Mode switches preserve source/format but clear destination content and scroll.

### Consequences

Do not add a redundant free-text “Tell Reel more” input to Surprise unless product direction changes. Preserve mode-specific reset and scrolling semantics.

## Decision

Use local structured recommendation matching as the baseline, with hosted AI as an optional enhancement.

### Reason

The implementation and documentation require recommendations to work from a direct local-file open and label the fallback when live AI is unavailable.

### Consequences

Changes to intent/ranking need to preserve `assets/recommendations-core.js` behavior and tests. Do not require API keys or sign-in for basic matching.

## Decision

Only provide AI with a limited public-fact shortlist and validate returned choices.

### Reason

The documented privacy/security model excludes notes, personal item IDs, ratings/history, and the full library; the endpoint validates IDs, evidence, and duplicate choices.

### Consequences

Do not send private user data or model-generated metadata to the UI. Preserve server-side auth, strict structured outputs, and post-response validation.

## Decision

Prioritize complete multi-concept intent and factual relevance over filling a requested list with weak results.

### Reason

Current tests and recommendation documentation explicitly cover American animation, guns and organized crime, named people, child suitability, exclusions, and no unrelated padding.

### Consequences

Keep meaningful constraints together, prefer a short relevant result set to generic fillers, and make soft-constraint tradeoffs visible.

## Decision

Details navigation must preserve active Pick 4 me context.

### Reason

Repository documentation and controller code explicitly capture the picker view and restore it via an origin-aware Back action and browser history.

### Consequences

When changing details, overlays, history, or picker state, verify return restoration, draft preservation, selected result, and scroll positions.

## Decision

Use one ranking contract for autocomplete and full search, and merge public discovery into ordinary search.

### Reason

Separate local/Online search paths created inconsistent ordering and required users to know which source contained an answer. Fixed People-first ordering also misrepresented title intent.

### Consequences

Keep exact and ordered token-prefix matching above fuzzy matches, use popularity only to resolve close textual matches, infer People-versus-Titles order from name matches, and invalidate in-flight provider work as soon as the query changes. Online mode remains available for deeper filtering rather than as a prerequisite for remote results.

## Decision

Person pages own their provider resolution and credit fetch.

### Reason

Deriving Known For from incidental catalog state made clean-cache profiles empty and duplicated the same work across multiple default sections.

### Consequences

Resolve Wikidata/TVMaze IDs on profile open, fetch credits directly, cache profiles, merge local records as the preferred copy, and show one ranked Known For shelf by default. Keep full role-grouped filmography behind an explicit control and preserve provider-failure retry states.
