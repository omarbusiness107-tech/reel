# Reel Android development

Updated: 2026-11-06. Branch: `feat/reel-native-android`.

## Scope and evidence

### 1.0.1 follow-up — search, artwork and Android Back

The user confirms 1.0.0 runs on their phone and reports a missing movie (*No Hard Feelings*), text-only poster fallbacks and system Back exiting the app. Live Cinemeta currently returns the 2023 movie, so the original absence is not reproduced as a catalog omission. Search previously depended on one movie endpoint and waited for all catalogs; it now queries an independent public IMDb movie index alongside Cinemeta/TVMaze/Kitsu and renders each source as it arrives. Exact titles and existing library state retain priority. Real search/HTTP checks find *No Hard Feelings*, *Office Space* and *Dune: Part Two* with image responses.

Artwork now tries unique HTTPS candidates, then recovers by exact provider ID; different-year namesakes cannot supply each other's posters. Image errors belong to a specific URL/title rather than a sticky boolean. When no actual artwork exists, a quiet film icon replaces duplicate title text. Focused Android Back handlers use the same back-or-home action as the visible header; tabs remember history, and predictive-back opt-in is disabled for device compatibility. Home with no history retains Android's normal exit/background behavior. Physical 1.0.1 button/gesture verification remains necessary.

The follow-up has 21 passing mobile tests (10 new search/artwork/navigation regressions), typecheck/lint passes and a compiled 1.0.1/code-2 native manifest. The targeted rendered outage test displays the film in approximately 1.3 seconds with anime deliberately pending and recovers both failed and absent artwork. Cloud run 42282413661 successfully built source `e2db1c6`; `mobile/artifacts/reel-android-1.0.1.apk` is 33.12 MiB. Signature/ZIP checks pass, the certificate matches 1.0.0 for an in-place update, and the compiled predictive-back setting is false. Exact APK evidence/checksum is in `mobile-verification.md`.

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
- [x] Generate release-mode ARM64 preview APK; verify signature, ZIP integrity, package, SDK, native callback and manifest permissions.
- [ ] Install and validate on the physical Redmi Note 12; the phone is not accessible to this session.

## Environment / external dependencies

Node 22.23.2, Windows, about 26 GiB free at audit. No Android SDK / adb detected in the standard location or PATH. Android Studio/emulator were not installed. Expo SDK 58.0.23 is current stable according to npm and Expo release notes. The user completed Expo login; EAS authentication is verified, but this preview uses the existing public GitHub repository and a standard Linux Actions runner. No paid runner or plan. User supplied hosted origin: `https://reel-navy.vercel.app`. Native prebuild succeeds. No production account/library data was modified.

## Audit findings

The website is a static SPA (`reel.html`), not a React app. `assets/account-library.js`, `search-core.js`, `recommendations-core.js`, `tracking-core.js`, `anime-arcs.js`, `release-data.js` contain reusable pure/injected-fetch logic. Supabase owns existing users, shared `titles`, private `user_titles`, `watch_events`, and `user_preferences`. Existing recommendation endpoint supports JSON `interpret` and `rank`, not streaming or persisted conversations. Public catalogs provide facts; AI supplies validated intent and ranking only. Episode writes use retry-safe `apply_watch_action`.

`sync_my_library` removes memberships absent from its input. Mobile must not call it with a partial or stale library. Additive `add_my_title` is required for safe single-title insertion; personal patches use owner-scoped table updates, and episode writes reuse the existing RPC. No new account store, duplicate AI service, generated catalog facts, fabricated activity, or pretend notification service.

## Verification log

91 website tests pass and 13 scripts parse. 11 mobile tests pass, including real PostgreSQL ownership/RPC execution. 16 rendered flow scenarios pass with isolated HTTP fixtures; live Discover renders Cinemeta and TVMaze, with an explicit Kitsu outage warning. Extra 320px and 915×412 landscape checks pass. Native prebuild, final web export and initial Android Hermes export succeed. Typecheck and lint pass without warnings; Expo Doctor passes 20/20 and the Expo dependency check is current. State-reset patterns were refactored into account-keyed screen lifetimes. Visual review corrected newline markers, tab geometry, episode labels, modal-auth navigation and the landscape Ask layout.

Hosted `add_my_title` is applied, recorded and verified: anonymous execution false, authenticated execution true. Only the native redirect allowlist was added; website URL and other settings remain. Public auth settings confirm email/signup enabled and Google disabled. Error-level hosted security advisors report no issues.

GitHub Actions run [42274765083](https://github.com/omarbusiness107-tech/reel/actions/runs/42274765083) successfully built source `9a49a37`. The downloaded APK is `mobile/artifacts/reel-android-preview.apk` (33.11 MiB). Official Google tools verify its signature and manifest; archive CRC passes. Package `app.reel.discovery`, version `1.0.0`, ARM64, minimum Android 7, release non-debuggable with preview signing. See `mobile-verification.md` for its checksum, exact evidence and remaining device checks. No Play publication occurred.
