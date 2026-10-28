# Reel code map

Last verified: 2026-10-28 (Continue module; other entries last verified 2026-10-16)
Repository/branch: Reel / main
Verified against: current working tree
Purpose: Locate the first files to inspect for substantial changes.

## Product shell, library, navigation, details, and auth

`reel.html`
Purpose: Main static application; owns the app shell, inline state/data, local storage, library/catalog browsing, public-provider integrations, details screens, navigation, translations, Supabase auth/sync, and the recommendation bridge.
Important areas: Picker details-history handling around the picker-detail history state; public-catalog/detail flows; recommendation adapter near the final script includes; loads recommendation scripts at the end.
Used by: Browser runtime; Vercel `/` rewrite.
Notes: Large, high-value file. Follow targeted functions/imports rather than reading its embedded seeded dataset.

`assets/account-library.js`
Purpose: Testable persistence boundary between merged UI records, shared `titles` metadata, and private `user_titles` fields.
Important exports: provider identity derivation, sync serialization, joined-row restoration.
Notes: `watchedEpisodes` is private, while the full episode catalog is transient and excluded from global sync metadata.

`assets/search-core.js`
Purpose: Pure, shared search normalization, work equivalence, provider-alias deduplication, audience-based popularity and exact-title ranking. Keeps original record object references and private state while merging safe public metadata. Loaded before the main application. `reel.html` uses it in autocomplete, catalog results, library membership resolution and unified search; `searchScope`, `syncSearchScope` and `setSearchScope` coordinate the input switch with request cancellation and local-only search. `tests/search-core.test.cjs` covers identity/ranking guards and `tools/check-search-suggestions.py` uses isolated provider fixtures to verify source isolation, deduplication, saved-item navigation, stale-response cancellation, error recovery, keyboard controls, both themes and responsive/localized layouts.

`assets/continue.js` and `assets/continue.css`
The pure `progressParts` helper separates the displayed cursor from completed/all released episode counts using the tracking core, respects continuous anime numbering, and preserves reading units. Its tests include gaps, unknown totals and calendar-year guides. Titles open full Details; action footers omit redundant Details buttons.
Purpose: Continue shelf ordering and its full-list native dialog. The UMD module exports pure `ordered`/`move` helpers and mounts through a narrow adapter in `reel.html`, which supplies existing artwork, progress actions, account scope, and preference saving. Keyed reconciliation preserves unchanged card/image nodes and shelf scroll. Pointer capture, touch-only drag handles, edge auto-scroll, cancellation, keyboard alternatives, live announcements, and a shared saved order are owned here. No independent copy of library state or new persistence schema is introduced. `tests/continue.test.cjs` covers pure ordering; `tools/check-continue.py` covers real pointer/touch gestures, keyboard/focus, reload persistence, popup filtering, existing reading History, account changes, themes and four widths. Optional `REEL_TEST_LUCIDE` supplies an unmodified copy of the app's pinned Lucide script for offline visual tests; `--capture` writes review screenshots.

`assets/tracking-core.js`
Purpose: Pure episode progress, legacy baseline, absolute anime numbering, arc/season groups, synchronized cursor baselines, upcoming releases, watch-event stats, genre/people rankings, and activity-day calculations. Loads `anime-arcs.js` in the browser or through CommonJS in tests. Native episode keys stay unchanged; absolute numbers are presentation values.
Used by: Tracking pages, title details, and `tests/tracking-core.test.cjs`.

`assets/anime-arcs.js`
Purpose: Exact anime identity profiles (type, normalized title or provider ID, release year) and source-linked One Piece, Naruto, and Naruto Shippuden arc ranges. Keeps season-based anime and live-action adaptations separate. `reel.html` uses profile IDs to resolve the correct animated show, hides calendar-year season inputs, and saves numeric progress through `applyEpisodeCursor`. `tools/check-anime-tracking.cjs` covers legacy year groups, continuous-key preservation, input/checkbox synchronization, lower corrections, Finished, account save rollback, and responsive themes.

`assets/release-data.js`
Purpose: Injectable-fetch public release discovery through exact Kitsu IDs and Wikidata successor/collection claims. Bounded P156 traversal (eight hops, forty IDs per hop) crosses already-released sequels and stops cycles; collection failures retain independent results. Precise dates and explicitly undated year/month windows stay separate. Kitsu chapter pagination is bounded and ongoing status is retained without estimating schedules. `prepareLibraryReleases` in `reel.html` handles three-worker progressive refresh, six-hour versioned caching, strict fresh episode lookups, safe identity matching, account generation checks, and partial/failure retention. `tracking-core.upcoming` supplies all calendar dates; `upcomingTitles` groups Home by title; `undatedReleases` separates confirmed announcements from missing chapter schedules. All apply the shared status toggle.

`assets/detail-artwork.js`
Purpose: Injectable-fetch detail-banner discovery via original TVMaze backgrounds, Kitsu landscape covers, and exact IMDb Cinemeta backgrounds (Wikidata P345 when necessary). Exports `discover` and `isLandscape`; never returns portrait posters as banners or mutates the source item. `detailBannerMarkup`, `recoverDetailBanner`, and load/error handlers in `reel.html` coordinate cached asynchronous fallback, native-dimension validation, account/DOM guards, and the overlapping cover header for library/catalog details. `tests/detail-artwork.test.cjs` covers provider identity and quality gates; `tools/check-detail-artwork.cjs` verifies both themes, five widths, keyboard expansion, and optional live artwork (`--live`).

`assets/tracking-pages.js` and `assets/tracking.css`
Purpose: Hash-navigated Home, Activity, Calendar, Stats, season explorer, responsive layout, and empty/loading states. The page module uses `window.reelTrackingBridge` for current account state, details, and watch actions.

`supabase/migrations/20260925141932_watch_activity.sql` and `20260925144307_watch_action_retry_guard.sql`
Purpose: Owner-scoped watch-event table, legacy baseline preservation, transactional watch action, and retry-safe private request ledger.

`tools/check-tracking-ui.cjs` and `tests/tracking-core.test.cjs`
Purpose: Browser flows at five widths and pure tracking/analytics regression coverage. `tools/check-shell-auth.cjs` also exercises two-account watch-history isolation.

`supabase/migrations/20260923232252_account_library_ownership.sql`
Purpose: Creates shared catalog/private relationship tables, constraints, RLS policies, authenticated sync RPC, preferences, and the owner-preserving legacy backfill.

`supabase/migrations/20260923233255_normalize_manual_title_identity.sql`
Purpose: Makes the database compute the canonical identity for manual titles so migrated and newly saved records deduplicate consistently.

`supabase/tests/account_library_rls_test.sql`
Purpose: pgTAP coverage for two-account SELECT/PATCH/DELETE/INSERT isolation, forged owner input, unauthenticated mutation denial, and same-title sharing.

`seed-data.json`
Purpose: Pre-enriched starter library used to maintain seeded content.
Used by: `tools/inject.py`, then embedded into `reel.html`.
Notes: Data source, not the live user library.

`vercel.json`
Purpose: Vercel function duration, root rewrite to `reel.html`, and common response headers.
Used by: Vercel deployment.

`.env.example`
Purpose: Documents names of optional server configuration variables for live AI and Supabase overrides.
Used by: Deployment setup.
Notes: Never use sample values as production secrets and never upload values to project memory.

## Recommendations and Pick 4 me

`assets/recommendations-core.js`
Purpose: Shared pure recommendation engine.
Important exports: session construction, user-text interpretation, candidate normalization, ranking/filtering, weighted selection, explanations, guided questions, and optional genre affinity.
Used by: Browser controller, server endpoint, and `tests/recommendations.test.cjs`.
Notes: First file for multi-word intent, relevance, repeat avoidance, selection variation, or local fallback changes.

`assets/recommendations.js`
Purpose: Pick 4 me decision-room controller and rendering.
Important behavior: modal lifecycle, source/mode/type/list controls, transcript, chips, candidate retrieval, optional API calls, result groups, history, regeneration/rejection, and Details return restoration.
Used by: `reel.html` after the core module loads.
Notes: First file for split-screen UI behavior, chat visibility, tabs, Start over, Surprise, history, and details restoration.

`assets/recommendations.css`
Purpose: Recommendation dialog layout, controls, responsive behavior, reduced-motion behavior, and result/history styling.
Used by: Pick 4 me UI.
Notes: Desktop split and mobile Chat/Pick breakpoints live here; outer shell should not scroll while internal regions may.

`api/recommend.js`
Purpose: Hosted AI endpoint for intent interpretation and ranking.
Important exports: handler factory, request validation, strict response schemas, provider selection.
Used by: Vercel `/api/recommend` and API tests.
Notes: Verifies Supabase token before a paid request; validates model selections/evidence; controls per-process request rate.

`RECOMMENDATIONS.md`
Purpose: The most detailed current recommendation architecture, privacy, constraints, and validation document.
Used by: Developers and project-memory maintenance.

## Tests and checks

`tests/recommendations.test.cjs`
Purpose: Unit tests for parser, filters, multi-concept signals, ranking, selection, repeat avoidance, and privacy serialization.
Used by: `npm test`.

`tests/recommend-api.test.cjs`
Purpose: Endpoint tests for authentication, schemas, provider errors, and invalid AI output.
Used by: `npm test`.

`tests/account-library.test.cjs`
Purpose: Unit/static security tests for catalog/private field separation, same-title identity, joined state, RLS migration contracts, and client payload ownership.
Used by: `npm test`.

`tools/check-recommendations.cjs`
Purpose: Browser-contract checks for the Pick 4 me layout and interactions.
Used by: `npm run test:recommendations-ui`.

`tools/check-shell-auth.cjs`
Purpose: Browser checks related to the main shell and authentication behavior.
Used by: `npm run test:shell-ui`.

`tools/check-syntax.cjs`
Purpose: Parses executable inline scripts and the standalone JavaScript files.
Used by: `npm run check`.

`tools/check-responsive.cjs` and `tools/check-tracking.cjs`
Purpose: Broader browser checks for responsive layout and episode/progress tracking.
Notes: Their output is written outside the repository by default.

`tools/enrich.mjs` and `tools/inject.py`
Purpose: Refresh missing seed metadata, then write refreshed seed data into `reel.html`.
Notes: Run only when intentionally rebuilding the starter dataset.

## Reference documentation

`README.md`
Purpose: Product operation, local-first model, catalog providers, data location, and developer checks.

`PRODUCT.md`
Purpose: Product intent and constraints; includes the recommendation experience at a higher level.

`DESIGN.md`
Purpose: Design system and explicit recommendation layout/interaction contract.
