# Reel architecture

Last verified: 2026-11-06 (native addition; web sections last verified 2026-10-10)
Repository/branch: Reel / feat/reel-native-android; web baseline from main
Verified against: current working tree and Supabase migrations through reading_progress_corrections
Purpose: Technical map of stable application boundaries and important data flows.

## Application shape

The native Android client is isolated in `mobile/`: Expo SDK 58, React Native 0.88, TypeScript, Expo Router, TanStack Query, Reanimated and native StyleSheet primitives. It shares the exact pure account, search, recommendation and tracking modules in root `assets/` through a typed boundary and Metro watch folder. It does not embed or replace the static website. `docs/mobile-architecture.md` describes the client boundaries.

Native auth uses the same Supabase account store, PKCE and encrypted SecureStore chunks. Account changes clear private queries and transient chat. Writes pin the initiating session token. `add_my_title(jsonb)` is an additive, owner-checked catalog/membership insertion RPC; unlike the existing whole-library sync, it never deletes omitted memberships or changes an existing private record. Existing RLS protects private patches and `apply_watch_action` handles dated viewing changes. Migration `20261106165224_mobile_add_my_title.sql` has been applied and recorded. Hosted auth redirects retain the website and add the native callback/recovery URLs; Google provider remains disabled. No account data was changed during deployment verification.

The app uses the existing hosted `/api/recommend`, TVMaze, Cinemeta and Kitsu. Native conversations remain temporary and JSON responses are not presented as streaming. Cloud APK compilation is configured in `.github/workflows/android-preview.yml` on the isolated branch, using a standard public-repository Linux runner and preview signing; EAS remains optional. No Google Play publication is configured.

Reel is a static, dependency-light SPA. `reel.html` still contains the app shell, inline application logic, seeded library data, Supabase client integration, catalog adapters, storage, details UI, navigation, and bridges to feature modules. Recommendation and personal-tracking logic are incrementally extracted into `assets/`; this is not a framework rewrite.

`assets/release-data.js` is an injected-fetch public release adapter for exact Kitsu anime/manga records and Wikidata dated sequel/collection relationships. Library-wide refresh is orchestrated by `prepareLibraryReleases` with bounded concurrency, cache timestamps, failure retention, and account-generation checks. Discovered IDs live in `releaseProvider` rather than replacing the item's persisted catalog identity. `tracking-core.upcoming` merges release metadata and TVMaze episode catalogs for Home/Calendar; the UI shares a status-only toggle. No release jobs, paid API, or new database schema are required.

`assets/detail-artwork.js` provides lazy public landscape-art discovery for library/catalog detail headers. It uses TVMaze original backgrounds, Kitsu original cover images, and exact IMDb Cinemeta metadata (resolved through Wikidata P345 if needed), sending only public title identifiers/search text. `reel.html` owns a bounded 15-minute promise cache, native image validation, DOM/account-generation guards, public banner/attribution persistence, and the restored bottom-left overlapping cover layout. Failed or unavailable artwork stays explicit; portrait covers never become enlarged banners. This does not require a paid API, server function, or schema change.

`vercel.json` rewrites `/` to `reel.html`, applies security headers, and configures the only server function, `api/recommend.js`, for a 60-second duration.

## Frontend and state

- **Core shell and state:** `reel.html` owns library state, persistence, catalog browsing, details overlays, navigation, theming, translations, and auth/sync wiring.
- **Guest storage:** Signed-out state uses `localStorage` key `reel.guest.v1`; `reel.v1` is read only as a legacy guest fallback. Authenticated libraries are never cached into that shared browser key and guest data is never automatically merged into an account.
- **Account storage:** Supabase Auth supplies the owner identity. `public.titles` stores shared provider/catalog facts, `public.user_titles` stores private status/rating/progress/favorite/notes/timestamps with unique `(user_id,title_id)`, `public.watch_events` stores dated personal viewing instances, and `public.user_preferences` stores account settings. Owner-scoped RLS applies to personal tables.
- **Persistence boundary:** `assets/account-library.js` splits merged UI items into catalog and personal payloads and reconstructs joined rows for the existing UI. `sync_my_library(entries,preferences)` derives its owner from `auth.uid()` and does not accept a user ID.
- **Legacy migration:** The versioned Supabase migration backfills each `user_libraries` JSON blob only to its existing owner, retains the legacy table as a rollback archive, and replaces its policies with owner-only policies.
- **Tracking migration:** Legacy scalar season/episode progress remains an undated baseline (`watched_episodes IS NULL`), not invented watch events. Explicit watched episode keys and watch events are updated transactionally by `apply_watch_action`. A private request ledger prevents retried watch/unwatch/rewatch requests from double-applying. Event dates drive Activity and Stats; title status remains a separate current-state concept.
- **Reading history:** `record_chapter_progress` and `record_page_progress` are owner-scoped SECURITY INVOKER RPCs that atomically update reading progress and add `chapter_read`/`pages_read` events with `chapter_number`/`page_number` and `reading_start`. Request IDs and unchanged-position checks prevent duplicate entries. Known totals clamp progress. `tracking-core.readingDays` groups sessions by local day, title, and medium before History pagination without mutating the raw events. Session dates remain individually editable. Earlier reading positions have no fabricated dates; the UI displays them as undated baselines. Reading events join History/Calendar but are excluded from viewing-time statistics.
- **Tracking pages:** `assets/tracking-core.js` holds pure progress, upcoming, activity, and analytics calculations. `assets/tracking-pages.js` renders Home, Calendar, Activity, Stats, and the title-detail season explorer through a narrow bridge in `reel.html`; `assets/tracking.css` supplies their responsive visual layer. A compact icon rail appears at desktop widths and the existing slide-out drawer remains on mobile. Hash destinations (`#page=home`, etc.) preserve direct `reel.html` use and existing title/person history flows.
- **History loading:** Home initially reads the latest 100 account events. Activity, Calendar, and Stats request the full owner-scoped history in 500-row pages only when visited; Activity renders 50 rows at a time. TVMaze episode details are fetched lazily; the full transient episode catalog is not pushed into shared title metadata on every account sync.
- **Recommendation state:** Pick 4 me session, transcript, seen/rejected IDs, result groups, active result, and history are in-memory only. They are not written to local storage or Supabase. Closing it starts a fresh session, except an origin-aware Details return restores that open session.

## Recommendation flow

User
→ `assets/recommendations.js` decision-room UI/controller
→ `assets/recommendations-core.js` local interpretation, constraints, ranking, explanation, and weighted selection
→ existing `reel.html` adapter for saved items and public-catalog lookups
→ real library/catalog candidate facts
→ optional `POST /api/recommend` for AI interpretation or ranking
→ validated selections and explanations
→ result pane, list strip, linked transcript, and session history.

### Local recommendation path

`assets/recommendations-core.js` is shared pure logic. It builds structured intent, retains multiple meaningful concepts, applies source/type/exclusion/history/safety filters, scores facts, produces explicit tradeoffs, and samples a relevant shortlist without replacement. This path works when the file is opened directly and when live AI is unavailable.

### Optional AI path

`assets/recommendations.js` sends only the latest request/accumulated intent or a limited public-fact candidate shortlist to `api/recommend.js`. The endpoint verifies the Supabase bearer token before paid calls, uses Vercel AI Gateway with deployment OIDC when available (or an optional direct OpenAI fallback), and uses strict JSON schemas. The server rejects invented IDs, duplicate choices, and unsupported evidence before the UI uses the result. The model does not supply card metadata.

Live AI requires hosted configuration and a signed-in user. Requests have an in-process limit of 40 per user per hour; this is not a durable distributed quota.

## Pick 4 me UI architecture

- `assets/recommendations.js`: modal lifecycle, rendering, message/result/history linking, retrieval orchestration, source and format controls, details handoff/restore, cancellation, and AI fallback messaging.
- `assets/recommendations.css`: viewport-locked decision room. Desktop uses an approximately 44/56 result/chat split with independent internal scrolling. At 900px and below it uses accessible Chat/Pick tabs without changing DOM order.
- `assets/recommendations-core.js`: `session`, `interpret`, `rank`, `selectWeighted`, `explain`, question/chip logic, candidate normalization, and affinity behavior.
- `reel.html`: creates the narrow recommendation bridge to existing storage, catalog lookup, add/save, toast, sign-in, and details behavior; it loads the three recommendation assets near the end of the document.

## External data flow

- Catalog and enrichment calls originate in `reel.html` and use public providers. Source-specific record identities prevent same-name adaptations from collapsing.
- The main search box and Online mode share one token-prefix/fuzzy ranking path. Main search merges local records with debounced public results, deduplicates by provider identity before title/year fallback, and orders People versus Titles from the strongest name match rather than a fixed section order. Popularity is only a tie-breaker.
- Person search resolves candidates through Wikidata/Wikipedia and TVMaze. Opening a person independently resolves stable provider IDs, fetches direct Wikidata film/series credits and TVMaze cast credits, merges them with local works, and caches the resulting profile. The leading Wikidata credits use their stable IDs to resolve Wikipedia title thumbnails when raw credit art is absent or unsuitable, and all remote artwork is normalized to HTTPS. The flow does not depend on a previous Online search.
- Person portrait URLs that fail or resolve below the minimum usable dimensions are remembered for the current session and replaced by a fixed-geometry initials fallback.
- Series details may retrieve and cache TVMaze episode guides locally for a day. Only released episodes are used for progress limits.
- Catalog uncertainty is displayed rather than fabricated; unavailable data is distinct from loading/failure.

## Person profile and navigation flow

Search/cast/crew person selection → history state with a compact provider-aware person reference → direct profile/credit resolution → ranked Known For shelf → optional grouped full filmography. The profile calculates age against the current date or date of death, exposes only available facts, collapses long biographies, and starts each person/title navigation target at the top. Title → Person → Title and browser Back preserve the prior overlay and search/filter state.

## Deployment assumptions

- A direct `reel.html` open supports local library and local recommendation matching but not server AI.
- Vercel is the intended hosted runtime for the rewrite and recommendation API.
- Sensitive runtime values remain server-side. Documentation may name env vars such as `REEL_AI_MODEL`, `AI_GATEWAY_API_KEY`, `OPENAI_API_KEY`, `REEL_AI_ALLOWED_USER_IDS`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`, but never values.
- New deployments must apply all versioned files in `supabase/migrations/` before serving the account-aware client.
