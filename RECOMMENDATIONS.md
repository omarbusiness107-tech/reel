# Reel recommendations

## Architecture and scope

`Pick for me` now opens a temporary conversational recommendation session. Tell Reel,
Ask Me, and Surprise Me share a source selector (My List / Discover / Mix), a
Watch / Read / Anything selector, removable intent chips, free-text input, and
poster-led results. The composer stays visible while the conversation scrolls.

The session includes structured source/type, current and desired mood, audience,
context, genres, semantic themes, inclusion/exclusion signals, runtime/page bounds,
child suitability, question/answer history, shown/rejected IDs, and an accepted ID.
Nothing from the conversation is written to localStorage or Supabase. Closing the
dialog preserves it in memory; Start over or reloading clears it.

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
**AI matching**. Opening `reel.html` directly, an unconfigured server, or being signed
out uses the explicitly labeled basic matcher instead. This is not an offline LLM.

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
Up to eight external records receive optional fact enrichment. The existing source
limitations and outages apply; the search is not an exhaustive catalog search.

Hard filtering removes wrong types, completed/dropped/caught-up saved titles, previous
or rejected results, known excluded terms, and titles lacking required length or
age-rating information. Runtime for episodic media is per episode. Page limits
apply to books only. Child suitability uses known catalog classifications, not AI
guesses, and still displays the actual rating for parental review.

Basic ranking uses semantic aliases against catalog text, then public ratings; Mix
gives a modest advantage to relevant saved titles. It openly labels weak mood matches.
AI ranking operates on the filtered shortlist, evaluates richer semantic constraints,
and can return no match. Unknown IDs and explanations without an exact supporting
catalog quote are rejected by the endpoint. Factual card metadata is never copied
from the model output. Model-generated explanations still need live evaluation.

Another skips reinterpretation and preserves constraints. Refinements patch the
session; the client protects the chosen source, known hard upper bounds and existing
exclusions. To loosen a hard preference, remove its chip. There is no silent
fallback to Discover or automatic relaxation after an empty result.

An optional checkbox gives a small genre affinity boost when at least three titles
have personal ratings of 8–10 in that genre. It is off by default, uses existing
ratings locally, and never learns a permanent preference from one night's mood or
one rejection. Advanced behavioral learning, roulette, collaborative picks and
persistent recommendation history are intentionally deferred.

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

Coverage includes source isolation, semantic parsing, sad-versus-desired mood,
length/age constraints, exclusions, repeat avoidance, feedback, affinity thresholds,
data minimization, auth/allowlist failures, strict output schemas, invented IDs,
provider failures, mobile reply-field visibility, eight theme/viewport combinations,
and a mocked hosted AI interpretation-to-ranking flow. Existing responsive, catalog,
and tracking suites can also run unchanged.

There is no TypeScript configuration, production compiler, or pre-existing lint
framework. `check` parses all executable inline scripts plus new JavaScript files.
Mocked provider tests do not prove live model quality, Supabase availability, Vercel
deployment, or external catalog uptime.

### Manual live acceptance after configuration

- A signed-out or non-allowlisted account cannot call paid AI.
- My List + “I'm sad” asks match/change with answer chips and accepts free text.
- “A funny family movie under 100 minutes for an 8-year-old” skips redundant questions,
  uses actual runtime/classification, and does not label missing ratings safe.
- “Rain, Japan, loneliness” produces useful themes and a grounded explanation.
- Another excludes prior titles; “another but shorter” preserves all other preferences.
- Discover + books uses Open Library facts rather than model-invented descriptions.
- A provider outage shows retry/basic matching without changing the selected source.

Implementation references: [OpenAI structured output](https://developers.openai.com/api/docs/guides/structured-outputs),
[Supabase token verification](https://supabase.com/docs/guides/auth/jwts),
[Vercel Node functions](https://vercel.com/docs/functions/runtimes/node-js),
[Wikidata film classifications](https://www.wikidata.org/wiki/Property:P1657).
