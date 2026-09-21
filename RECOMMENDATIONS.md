# Reel recommendations

## Architecture and scope

`Pick 4 me` opens a temporary split-screen recommendation workspace. Pick 4 me and
Surprise me share a source selector (Mix / My List / Discover), an exact All formats /
Movies / Series / Anime / Books / Manga / Manhwa selector, One/List output controls,
removable intent chips, and a full recommendation panel. Mix, All formats, and One are
the fresh defaults. Pick 4 me combines direct prompts and useful follow-up questions in
one large transcript. Surprise me deliberately has no composer.

The session includes structured source/type, current and desired mood, audience,
genres, themes, credited people, origins, settings, eras, semantic traits, similarity
targets, negative preferences, requested result count, runtime/page preferences, child
suitability, question/answer history, shown/rejected IDs, recommendation groups, and a
message-to-group relation. Nothing from the conversation or recommendation history is
written to localStorage or Supabase. Closing and reopening starts a fresh Pick 4 me
session. Details is origin-aware: its explicit Back action and browser Back restore the
exact conversation, unsent draft, list scroll, selected result, history, controls, and mode. Mode switches
clear destination content and scroll while preserving source and format. Start over
resets the current mode and its history, returns to Mix, and stays in that mode.

1. `assets/recommendations-core.js`: shared pure intent/session/filter/ranking engine.
2. `assets/recommendations.js`: conversation controller, candidate lookup, result actions.
3. `assets/recommendations.css`: existing Reel tokens, responsive dialog and reduced motion.
4. `api/recommend.js`: server-only OpenAI Responses integration through Vercel AI Gateway, with strict structured output.
5. `reel.html`: small adapter to existing storage, auth, public catalogs and detail UI.

No framework conversion or database migration is required. The existing
`public.user_libraries(user_id, state, updated_at)` integration remains unchanged.
Live schema inspection timed out during implementation; this shape is inferred from
the existing client calls, not a successful database audit.

## Live AI setup

On Vercel, the recommendation endpoint uses the deployment's secure OIDC identity to
call Vercel AI Gateway. No OpenAI key is exposed to the browser and no permanent
gateway key is required. The default hosted model is `openai/gpt-4.1-mini`.

These **server environment variables** are optional:

| Variable | Value |
| --- | --- |
| `REEL_AI_MODEL` | AI Gateway model slug; defaults to `openai/gpt-4.1-mini` |
| `REEL_AI_ALLOWED_USER_IDS` | Optional comma-separated Supabase Auth user UUIDs. Empty permits every signed-in Reel user |
| `AI_GATEWAY_API_KEY` | Optional AI Gateway key for non-OIDC environments |
| `OPENAI_API_KEY` | Optional direct OpenAI fallback outside Vercel |
| `OPENAI_MODEL` | Direct OpenAI model; defaults to `gpt-4.1-mini` |
| `SUPABASE_URL` | Optional override of the existing Reel Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Optional override of the existing public Supabase API key |

Deploy the repository with its existing static/Other framework configuration. The
`api/recommend.js` Vercel function uses native Node fetch plus `@vercel/oidc` for its
short-lived deployment token.
The function has a 60-second maximum duration, an 8-second authentication timeout,
and a 35-second AI timeout. After deployment, sign in through Reel Settings. The matching status must say
**Live AI** in Preferences and privacy. Opening `reel.html` directly or using an
unconfigured server uses the explicitly labeled Local matching path. Signed-out users
see Sign in for live AI. This is not an offline LLM.

The endpoint verifies the access token with Supabase Auth before making a paid call.
It does not trust client-supplied user IDs. When an allowlist is configured, access
is fail-closed for accounts outside it. There is an additional 40-request/hour/user **per-process** guard; this is
not a durable global billing quota and resets on cold starts. Keep the allowlist
limited to trusted users when controlling access is important. Before a large public
rollout, add a shared atomic limiter and monitor provider spending.

No API key, service-role key, or JWT is written to the frontend or logs. The AI
receives only the session request/intent and at most 24 allowlisted candidate records,
not personal notes, private item IDs, personal rating history, or the entire library.
`store: false` disables Responses application-state storage; it is not a claim of
zero provider retention. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

## Retrieval and ranking

My List reads only the current local library snapshot. It never performs catalog
searches or enrichment during recommendation retrieval. AI may interpret and rank
saved records when enabled, but cannot introduce an external result.

Discover and Mix reuse Wikipedia/Wikidata, TVMaze, Kitsu and Open Library. AI-generated
title suggestions are **lookup seeds only**, never displayed as factual records.
Without AI, a small set of curated title-only search seeds starts discovery. Actual
titles, artwork, runtime, descriptions and ratings still come from the providers.
Up to twelve external records receive optional fact enrichment. The existing source
limitations and outages apply; the search is not an exhaustive catalog search.

Hard filtering removes wrong types, completed/dropped/caught-up saved titles, previous
or rejected IDs, known excluded terms, and titles that conflict with an explicit
child-age safety requirement. Named people and an explicitly requested animated medium
act as near-hard constraints when factual matching candidates exist. Firearm requests
keep factually evidenced firearm candidates when available rather than padding lists
with generic action. These relevance pools are established before session exclusions,
so exhausting them cannot silently surface unrelated titles. Runtime for
episodic media is per episode. Page limits apply to books only. Unknown or slightly
over-limit length is a soft tradeoff rather than an automatic empty state. Child
suitability uses known catalog classifications, not AI guesses, and still displays the
actual rating for parental review.

Basic ranking uses phrase-aware matching across title, synopsis, genre, creator,
credited cast, origin, setting, format, source terms, and catalog metadata. The parser
retains all meaningful concepts in requests such as “American animation,” “guns and
organized crime,” and “rain Japan loneliness.” Weighted signals favor named people,
similarity, requested medium, origin, genre, setting/era, theme and mood before softer
runtime, popularity, pace, and discovery qualities. Explicit negative preferences are
excluded or heavily penalized. This keeps “deep” distinct from “Depp” and allows a
useful closest match with a visible tradeoff. Mix gives a modest advantage to relevant
saved titles.

After local ranking, Reel samples without replacement from a top relevant shortlist,
excluding distant low-scoring matches even when that means a shorter list. The
weight combines relevance and public quality, while a small genre/creator diversity
penalty keeps lists from becoming repetitive. Every selected ID joins the session-level
shown set. Another pick and New list preserve criteria and avoid every prior session ID;
reuse is allowed only after reasonable unused candidates are exhausted. AI ranking
operates on the same factual shortlist and requested count. Unknown IDs and explanations
without exact supporting evidence and duplicate choice IDs are rejected by the endpoint.
Validated AI choices are displayed in their returned order, not randomized again.
Ranking outages or an unverified AI choice explicitly label the local fallback. Factual card metadata
is never copied from model output. Model-generated explanations still need live
evaluation.

Another and New list skip reinterpretation and preserve constraints. Normal replies
patch the accumulated conversation. Explicit direction changes such as “Actually forget
medieval, give me cyberpunk” reset stale intent while leaving older recommendations in
session history. Natural phrases including “give me 5,” “a few,” “some,” and “top 3” set
list mode without requiring the control. To loosen a preference, remove its chip. There
is no silent fallback to Discover or automatic source relaxation after an empty result.

An optional checkbox gives a small genre affinity boost when at least three titles
have personal ratings of 8–10 in that genre. It is off by default, uses existing
ratings locally, and never learns a permanent preference from one night's mood or
one rejection. Cross-session history, advanced behavioral learning, and collaborative
picks are intentionally deferred.

The new static controls and basic English-language parser are not yet localized.
The AI receives the existing UI language and can interpret/respond in other languages;
this does not translate the surrounding controls. Existing library translations are
unchanged.

## Validation

```text
npm run check
npm test
npm run test:recommendations-ui
```

The UI test needs Playwright and headless Chrome, as do the existing project checks.
Use the available runtime's `NODE_PATH`, or install Playwright in your development
environment. No runtime dependency is needed by the shipped static UI or endpoint.

Coverage includes source isolation, full-sentence semantic parsing, guns/organized
crime evidence, American animation, named creators, deep-versus-Depp, negative
preferences, direction resets, natural list counts, weighted unique selection,
length/age constraints, repeat avoidance, affinity thresholds, data minimization,
auth/allowlist failures, strict output schemas, invented IDs, and provider failures.
The browser contract checks the populated 44/56 split at 1366×768 and 1440×900, zero
outer-shell overflow, composer visibility, single/list UI, session history, linked chat
selection, Details restoration, mode isolation, source preservation, Start over, mobile
Chat/Pick navigation, and reduced motion. A mocked hosted transport also checks that
AI choices retain their order, locally parsed multi-concept/list intent survives AI
patches, explicit direction resets omit stale AI context, and ranking outages visibly
fall back to local matching. It also checks light/dark containment, noncropped loaded
covers, tab arrow keys, draft/list-scroll restoration, preference-render continuity,
and cancelled retrieval after a source change. This does not exercise real model quality or production auth.

There is no TypeScript configuration, production compiler, or pre-existing lint
framework. `check` parses all executable inline scripts plus new JavaScript files.
Mocked provider tests do not prove live model quality, Supabase availability, Vercel
deployment, or external catalog uptime.

### Manual live acceptance after configuration

- A signed-out or non-allowlisted account cannot call paid AI.
- My List + “I'm sad” asks match/change with answer chips and accepts free text.
- “A funny family movie under 100 minutes for an 8-year-old” skips redundant questions,
  uses actual runtime/classification, and does not label missing ratings safe.
- “Rain, Japan, loneliness” produces origin, atmosphere, isolation, and a grounded explanation.
- “American animation” requires animation and strongly favors matching origin.
- “Give me 5 gun movies” returns distinct, factually relevant choices with individual reasons.
- Another and New list exclude prior IDs; “another but shorter” preserves other preferences.
- Discover + books uses Open Library facts rather than model-invented descriptions.
- A provider outage shows retry/basic matching without changing the selected source.

Implementation references: [OpenAI structured output](https://developers.openai.com/api/docs/guides/structured-outputs),
[Supabase token verification](https://supabase.com/docs/guides/auth/jwts),
[Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js),
[Wikidata film classifications](https://www.wikidata.org/wiki/Property:P1657).
