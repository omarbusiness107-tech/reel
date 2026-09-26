# Reel code map

Last verified: 2026-09-25
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

`assets/tracking-core.js`
Purpose: Pure episode progress, legacy baseline, upcoming releases, watch-event stats, genre/people rankings, and activity-day calculations.
Used by: Tracking pages, title details, and `tests/tracking-core.test.cjs`.

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
