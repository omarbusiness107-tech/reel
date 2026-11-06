# Reel native verification

Updated 2026-11-06. Branch: `feat/reel-native-android`.

## Evidence collected

| Boundary | Evidence | Limit |
| --- | --- | --- |
| Existing website | 91 existing tests pass; 13 JavaScript scripts parse | Browser website regression suite not rerun because its source is unchanged |
| Native TypeScript | `npm run typecheck` passes | Does not prove native rendering |
| Mobile core/data | 11 tests pass, including real PGlite PostgreSQL execution of the existing ownership migration and new insertion RPC | Embedded local database, not a production account write |
| Account isolation | Local PostgreSQL verifies separate memberships, ownership, no catalog note leakage, anonymous denial, duplicate preservation and non-destructive insertion | Production personal data was not modified to test this |
| Rendered flows | Python Playwright on exported React Native web components passes 16 scenarios with isolated HTTP fixtures and zero page errors | Fixture traffic is confined to the QA script; not a claim of live account integration |
| Live catalog rendering | Discover rendered real Cinemeta films and TVMaze series; screenshots inspected | Kitsu unavailable in that run; app displayed its partial-source warning |
| Hosted AI reachability | `GET https://reel-navy.vercel.app/api/recommend` returned `{"configured":true}` | Paid/authenticated recommendation was not invoked against a real user |
| Hosted migration | Additive function applied, migration history recorded; read-only ACL query confirms present, anonymous false, authenticated true | Real-account save still needs phone/user smoke test |
| Hosted auth configuration | Only the redirect URL array changed; original website URL retained; subsequent diff reports zero declared updates | Registration/recovery delivery and native return require a device |
| Supabase security errors | Hosted security advisors at error level report none | Warning-level pre-existing items and intentional owner-checked definer RPCs are documented below |
| Android compilation | Initial Metro Android export produced a Hermes bundle successfully | An export is not an installable APK; final CI build/device results must be recorded |

## Rendered scenarios

Onboarding; Discover; email/password sign-in; account library; episode watch; future-episode guard; search → details; single-title save; private notes/collections; Ask Reel response; history date edit; statistics; calendar; light appearance; sign-out/two-account isolation; no plaintext auth token in web preferences. Captures are under ignored `mobile/artifacts/` with `-fixture` filenames. The live Discover capture is labeled `discover-live.png`.

Visual inspection found and corrected literal newline markers, tab-bar clipping, and an incorrect call signature to the shared episode-label helper. A regression assertion now checks `S1 E2`. Final narrow/landscape checks and APK results are still pending.

## Security and limitations

The app uses a public publishable key only. Existing AI provider credentials remain on Vercel. Native tokens use encrypted, bounded, atomic chunk storage with recovery tests. Writes pin the initiating account's token to avoid an account-switch race. Private patches whitelist fields; new title insertion derives owner from `auth.uid()`, strips non-public metadata and never replaces/deletes existing memberships.

The security advisor flags intentional authenticated `SECURITY DEFINER` RPCs: existing `sync_my_library` and new `add_my_title` need catalog insertion privileges and check owner explicitly. Anonymous execution of the new RPC is revoked. Leaked-password protection was already disabled; this unrelated auth setting was preserved.

`npm audit --omit=dev` reports five moderate findings through Expo's CLI/fingerprint glob/minimatch dependencies, zero high/critical. The suggested force fix downgrades Expo to SDK 53 and was not applied. No advisory was silently claimed fixed.

Still unverified: real credentials and email delivery, Android PKCE link dispatch, SecureStore on-device survival, Android keyboard/safe areas/TalkBack/200% fonts, release frame pacing and physical Redmi installation. No account deletion, push notification delivery, streaming, permanent chat history, or Kitsu-only episode progress is presented as complete.
