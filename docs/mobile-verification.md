# Reel native verification

Updated 2026-11-06. Branch: `feat/reel-native-android`.

## Evidence collected

### 1.0.1 regression verification

The user reports 1.0.0 running on their phone. The 1.0.1 changes add independent movie search/progressive rendering, provider-ID artwork recovery and shared header/system Back handling. Typecheck and lint pass; 21 mobile/core/database tests pass, including 10 new search/artwork/navigation cases. The existing 16 rendered scenarios still pass with zero page errors. Eight targeted rendered assertions cover a failed movie source, an outstanding anime source, No Hard Feelings (2023), broken/missing artwork recovery, header/browser Back and preserved tab state. A movie row appears in approximately 1.3 seconds while anime remains pending.

Read-only live checks find No Hard Feelings (2023), Office Space (1999) and Dune: Part Two (2024) and load actual posters, both through catalog HTTP checks and rendered web components. Screenshot `mobile/artifacts/search-no-hard-feelings-live.png` was visually inspected. Live catalog currently returns No Hard Feelings from the original source as well; the user's missing result was not reproduced as a permanent catalog omission. Kitsu remains unavailable in these live checks and is labeled honestly.

The compiled APK manifest is version 1.0.1/code 2 with predictive-back opt-in false. Focused Back subscriptions share the tested back-or-home policy and are removed on blur; tabs use history. Header and browser history checks pass. These checks do not prove a physical Android key/gesture dispatch: that requires retesting the updated APK on the Redmi. No Android/ADB device was detected over USB in this session. Earlier 1.0.0 evidence is retained below as the baseline.

The predictive-back compatibility flag disables system predictive animations while preserving AndroidX Back callbacks, as documented by [Android's Back migration guide](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture#opt-out). The flag is generated through [Expo's versioned app configuration](https://docs.expo.dev/versions/v58.0.0/config/app/#predictivebackgestureenabled); generated native source is not edited manually.

### Verified 1.0.1 APK

[GitHub build 42282413661](https://github.com/omarbusiness107-tech/reel/actions/runs/42282413661) successfully built source `e2db1c6c7303b5c61a67ff9aee3dd574f848fe0c`, including cloud typecheck, lint and all 21 tests. Local delivery: `mobile/artifacts/reel-android-1.0.1.apk`, 34,727,180 bytes / 33.12 MiB. SHA-256:

```text
678609a601cb064b5d539ecc20160d00e77c98330610f01114298c42bd0402d5
```

Google Build Tools verify APK Signature Scheme v2, ZIP CRC and the ARM64 release manifest. Package remains `app.reel.discovery`, version 1.0.1/code 2; non-debuggable; native callback scheme retained; unused overlay/storage permissions remain absent. Predictive-back opt-in is confirmed false in the compiled manifest. Signer SHA-256 matches the delivered 1.0.0 certificate: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`, allowing an in-place update without uninstalling. The old APK remains available for rollback. Local evidence is `apk-metadata-1.0.1.json`, the versioned checksum file and `*-1.0.1-verification.txt` beside the APK.

| Boundary | Evidence | Limit |
| --- | --- | --- |
| Existing website | 91 existing tests pass; 13 JavaScript scripts parse | Browser website regression suite not rerun because its source is unchanged |
| Native TypeScript | `npm run typecheck` passes | Does not prove native rendering |
| Native dependencies / lint | Expo Doctor 20/20; Expo dependency check current; lint passes without warnings | Static compatibility checks do not replace a device test |
| Mobile core/data | 11 tests pass, including real PGlite PostgreSQL execution of the existing ownership migration and new insertion RPC | Embedded local database, not a production account write |
| Account isolation | Local PostgreSQL verifies separate memberships, ownership, no catalog note leakage, anonymous denial, duplicate preservation and non-destructive insertion | Production personal data was not modified to test this |
| Rendered flows | Python Playwright on exported React Native web components passes 16 scenarios with isolated HTTP fixtures and zero page errors | Fixture traffic is confined to the QA script; not a claim of live account integration |
| Live catalog rendering | Discover rendered real Cinemeta films and TVMaze series; screenshots inspected | Kitsu unavailable in that run; app displayed its partial-source warning |
| Hosted AI reachability | `GET https://reel-navy.vercel.app/api/recommend` returned `{"configured":true}` | Paid/authenticated recommendation was not invoked against a real user |
| Hosted migration | Additive function applied, migration history recorded; read-only ACL query confirms present, anonymous false, authenticated true | Real-account save still needs phone/user smoke test |
| Hosted auth configuration | Only the redirect URL array changed; original website URL retained; subsequent diff reports zero declared updates | Registration/recovery delivery and native return require a device |
| Supabase security errors | Hosted security advisors at error level report none | Warning-level pre-existing items and intentional owner-checked definer RPCs are documented below |
| Android compilation | Release APK built successfully in GitHub Actions run 42274765083; all preceding checks also passed | Physical installation and execution are not yet verified |
| APK integrity / manifest | Official Google `apksigner` verifies the v2 signature; ZIP CRC passes; `aapt2` confirms package/version/SDK/ARM64, native scheme and non-debuggable release | Preview/debug signing certificate, not a production signing identity |

## Installable Android artifact

Source: `9a49a378cd16ca80f859ba2da07eb74cbbfb0552`. [Successful build and downloadable artifact](https://github.com/omarbusiness107-tech/reel/actions/runs/42274765083), completed 2026-11-06. Native Gradle compilation took 8m32s; the complete job took 9m17s.

Local delivery: `mobile/artifacts/reel-android-preview.apk` (ignored by Git), 34,717,536 bytes / 33.11 MiB. The GitHub artifact is named `reel-android-preview` and contains `app-release.apk`; retention is seven days. The local copy is independent of that retention period. SHA-256:

```text
2681153660883158ba07539b3026277ee959d35b640d237183ab6b2080c2dd1f
```

`app.reel.discovery`, version `1.0.0` / code `1`; ARM64 only; minimum SDK 24 (Android 7), target SDK 36. The APK contains the offline JavaScript/Hermes bundle and native libraries; it does not require Metro. Live catalog, account and AI requests require network access. The manifest is non-debuggable and registers the `reel` scheme. Unused overlay and external-storage permissions are absent. Declared permissions come from networking, haptics, SecureStore biometric support, a private dynamic receiver and the install-referrer library; no camera, microphone, contacts or location permissions are declared.

Signature verified with Google's Build Tools 37 `apksigner`: APK Signature Scheme v2, one RSA-2048 Android Debug signer. Certificate SHA-256: `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`. This is an installable preview, not a Play release. Raw local inspection results are saved beside the APK as `apk-metadata.json`, `signature-verification.txt`, `badging-verification.txt` and `manifest-verification.txt`.

## Rendered scenarios

Onboarding; Discover; email/password sign-in; account library; episode watch; future-episode guard; search → details; single-title save; private notes/collections; Ask Reel response; history date edit; statistics; calendar; light appearance; sign-out/two-account isolation; no plaintext auth token in web preferences. Captures are under ignored `mobile/artifacts/` with `-fixture` filenames. The live Discover capture is labeled `discover-live.png`.

Visual inspection found and corrected literal newline markers, tab-bar clipping, an incorrect call signature to the shared episode-label helper, and duplicated tab stacks after modal sign-in. Regression assertions check `S1 E2` and a single Ask composer after an account switch. Final rendered checks also pass at 320px width and 915×412 landscape; the landscape Ask composer and filters remain usable. Android APK results are recorded separately below.

## Security and limitations

The app uses a public publishable key only. Existing AI provider credentials remain on Vercel. Native tokens use encrypted, bounded, atomic chunk storage with recovery tests. Writes pin the initiating account's token to avoid an account-switch race. Private patches whitelist fields; new title insertion derives owner from `auth.uid()`, strips non-public metadata and never replaces/deletes existing memberships.

The security advisor flags intentional authenticated `SECURITY DEFINER` RPCs: existing `sync_my_library` and new `add_my_title` need catalog insertion privileges and check owner explicitly. Anonymous execution of the new RPC is revoked. Leaked-password protection was already disabled; this unrelated auth setting was preserved.

`npm audit --omit=dev` reports five moderate findings through Expo's CLI/fingerprint glob/minimatch dependencies, zero high/critical. The suggested force fix downgrades Expo to SDK 53 and was not applied. No advisory was silently claimed fixed.

Still unverified: real credentials and email delivery, Android PKCE link dispatch, SecureStore on-device survival, Android keyboard/safe areas/TalkBack/200% fonts, release frame pacing and physical Redmi installation. No account deletion, push notification delivery, streaming, permanent chat history, or Kitsu-only episode progress is presented as complete.
