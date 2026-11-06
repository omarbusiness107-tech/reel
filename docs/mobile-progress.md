# Reel Android development

Updated: 2026-11-06. Branch: `feat/reel-native-android`.

## Scope and evidence

Native Expo client in `mobile/`; the website remains independently runnable. Current repository source is authoritative. NotebookLM recall was attempted with notebook `03cc1bfa-6547-4f80-96b4-be709357a773` but failed certificate validation. Existing `graphify-out/` contains no `graph.json`. Context comes from versioned project-memory documents and targeted source inspection.

## Milestones

- [x] Audit existing accounts, library ownership, tracking RPC, recommendation schemas, pure modules, public providers and Git state.
- [x] Create isolated feature branch; preserve pre-existing untracked debugging note.
- [x] Research accessible mobile references and current Expo/Supabase guidance.
- [x] Implement native foundation, authentication and original character; verify types/rendered contracts.
- [x] Implement discovery, search, assistant, details and library; verify rendered contracts.
- [x] Implement episode tracking, activity, calendar, statistics and settings; verify rendered contracts.
- [x] Typecheck, regression tests, initial Android JS export and rendered UI inspection.
- [x] Test additive migration in isolated PostgreSQL, including two-account writes; deploy only the new function and record migration history.
- [ ] Generate APK and validate on Redmi Note 12.

## Environment / external dependencies

Node 22.23.2, Windows, about 26 GiB free at audit. No Android SDK / adb detected in the standard location or PATH. Android Studio/emulator were not installed. Expo SDK 58.0.23 is current stable according to npm and Expo release notes. EAS is unauthenticated, but GitHub is authenticated and the repository is public with Actions enabled. A standard Linux cloud preview build is configured; no paid runner or plan. User supplied hosted origin: `https://reel-navy.vercel.app`. Native prebuild succeeds. No production account/library data was modified.

## Audit findings

The website is a static SPA (`reel.html`), not a React app. `assets/account-library.js`, `search-core.js`, `recommendations-core.js`, `tracking-core.js`, `anime-arcs.js`, `release-data.js` contain reusable pure/injected-fetch logic. Supabase owns existing users, shared `titles`, private `user_titles`, `watch_events`, and `user_preferences`. Existing recommendation endpoint supports JSON `interpret` and `rank`, not streaming or persisted conversations. Public catalogs provide facts; AI supplies validated intent and ranking only. Episode writes use retry-safe `apply_watch_action`.

`sync_my_library` removes memberships absent from its input. Mobile must not call it with a partial or stale library. Additive `add_my_title` is required for safe single-title insertion; personal patches use owner-scoped table updates, and episode writes reuse the existing RPC. No new account store, duplicate AI service, generated catalog facts, fabricated activity, or pretend notification service.

## Verification log

91 website tests pass and 13 scripts parse. 11 mobile tests pass, including real PostgreSQL ownership/RPC execution. 16 rendered flow scenarios pass with isolated HTTP fixtures; live Discover renders Cinemeta and TVMaze, with an explicit Kitsu outage warning. Native prebuild and initial Android Hermes export succeed. Lint found state-reset patterns, which were refactored into account-keyed screen lifetimes. Visual review corrected newline markers, tab geometry and episode labels.

Hosted `add_my_title` is applied, recorded and verified: anonymous execution false, authenticated execution true. Only the native redirect allowlist was added; website URL and other settings remain. Public auth settings confirm email/signup enabled and Google disabled. Error-level hosted security advisors report no issues. See `mobile-verification.md` for exact scope and remaining device checks. Cloud APK compilation is next.
