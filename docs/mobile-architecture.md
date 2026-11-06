# Native Reel architecture

Updated: 2026-11-06. Implementation branch: `feat/reel-native-android`.

`mobile/` is a standalone Expo SDK 58 / React Native / TypeScript app, with Expo Router, TanStack Query, native StyleSheet tokens, Reanimated, SecureStore and SVG. It does not replace the static website, add a WebView, or change production deployment routing. Android comes first; screens use platform-neutral components for later iOS support.

## Boundaries

- `src/core/`: typed boundary to existing pure CommonJS modules in root `assets/`. Metro watches the repository and resolves mobile dependencies locally. No browser UI is imported.
- `src/services/`: Supabase session and library APIs, public catalog adapters, real recommendation endpoint orchestration.
- `src/providers/`: auth lifecycle, per-account query lifetime and local appearance/preferences.
- `src/components/`: native design primitives and original Lumi vector expressions.
- `app/`: routes, tabs, title/person details, authentication callbacks, activity, calendar and insights.

Public catalog queries use TVMaze, Kitsu and Wikidata with HTTPS, cancellation, bounded result sets and honest errors. They need no privileged key. Attribution is displayed with provider links. Unknown metadata stays unknown. No fake trending feed is labeled trending: public TV catalog ratings are labeled clearly. Search uses the existing deduplication/ranking module and provider identities; saved items keep private state.

Auth connects to the same Supabase project using its public publishable key, never service-role credentials. On native devices session storage uses SecureStore with chunking to avoid platform value limits; no auth token is stored with recent queries or preferences. Session changes clear account queries and transient recommendations. Web is a layout-verification target only; sessions are memory-only there. Email sign-in works independently of OAuth. PKCE callback/reset support requires the `reel://auth/callback` redirect in Supabase; only enable provider buttons when configured. AppState controls refresh. Sign-out is explicit and errors remain visible.

Mobile account writes never use the destructive whole-library `sync_my_library`. An additive `add_my_title` RPC inserts a shared catalog identity and private membership without changing an existing membership. Existing owner RLS protects private patches/deletes. Watch/rewatch/unwatch use `apply_watch_action` with one UUID per mutation (including retry). A failed or uncertain write is not optimistically marked successful. Query invalidation is scoped to the initiating account.

Ask reuses `recommendations-core.js`, accumulates intent, keeps shown/rejected IDs, retrieves real candidates, and optionally calls `/api/recommend` with a current user bearer token. The existing API supports complete JSON, not streaming, and ephemeral conversations, not server history. Local matching is explicitly labeled when AI is unavailable. No privileged provider keys enter the bundle. Hosted API origin must be configured; do not guess a deployment.

Activity/statistics read paged owner history and share `tracking-core.js`; episode/catalog progress stays distinct from dated watch events. The calendar uses real release dates and never guesses schedules. Shared account preferences are patched preserving unrelated settings; local appearance/haptics do not overwrite website settings.

## Build

Run npm commands inside `mobile/`. EAS internal-distribution preview profile produces an APK. The repo root is included in the cloud archive for shared modules, while dependency folders, local secrets, tests' artifacts and generated exports are excluded. No Google Play upload is configured. See `mobile/README.md` for setup and physical-device validation. Android JS export is a compiler check, not an APK or device test.
