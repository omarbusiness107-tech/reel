# Reel for Android

Native Expo SDK 58 client for the existing Reel service. The website remains in the repository root. Development branch: `feat/reel-native-android`.

## Start on Windows

```powershell
cd "C:\Users\Yasmine DAHBI\claude 1\reel\mobile"
npm ci
npx expo start --dev-client --lan
```

The app already points to `https://reel-navy.vercel.app` and the same public Supabase project as the website. Optional public overrides are listed in `.env.example`. Never put an AI API key, Supabase service-role key, password or private signing key in `EXPO_PUBLIC_*` variables.

## Install on Redmi Note 12

The Android preview workflow builds an **arm64 release-mode APK signed with a preview/debug key**. It is for device testing, not a Google Play release. No emulator or local Android SDK is needed.

The current APK is [`artifacts/reel-android-1.0.1.apk`](artifacts/reel-android-1.0.1.apk), 33.12 MiB, version 1.0.1/code 2. It was built from `e2db1c6` in [successful run 42282413661](https://github.com/omarbusiness107-tech/reel/actions/runs/42282413661). Signature, archive integrity and native manifest are verified. Its signing certificate matches 1.0.0, so install it **over the existing app**, without uninstalling or clearing data. Minimum Android version: 7. SHA-256: `678609a601cb064b5d539ecc20160d00e77c98330610f01114298c42bd0402d5`. The original 1.0.0 APK remains at `artifacts/reel-android-preview.apk` for rollback. Local APKs are not committed to Git; cloud artifacts expire after seven days.

1. Download the `reel-android-preview` artifact from the latest successful [Android workflow](https://github.com/omarbusiness107-tech/reel/actions/workflows/android-preview.yml), then extract `app-release.apk`.
2. Transfer the APK to your phone by USB or a private file transfer you control.
3. Open the APK on the phone and allow installation from that source when Android prompts. Install Reel.
4. Open Reel and sign in using your existing Reel email/password. The release-mode preview runs without a Metro server.
5. Verify the device checklist below. A future preview made with a different generated signing key may require uninstalling the earlier preview first; account data remains on the backend, but local settings are lost on uninstall.

For a stable personal signing identity, Expo EAS is also configured:

```powershell
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile preview
```

Use only the free build allowance; do not purchase a plan. No Play upload is configured or performed. Development-client APKs can instead use the `development` EAS profile and the Metro command above.

## Implemented boundaries

Version 1.0.1 improves movie search with a second IMDb source and independent result loading, recovers missing/broken posters by exact provider ID, and routes Android system Back through the same action as the visible Back control. Tabs retain navigation history. Predictive-back opt-in is disabled for compatibility. A genuine artwork outage ends with a quiet icon, not duplicate title text. The verified version-1.0.1 APK is linked above; hardware Back still needs phone confirmation.

Discover, local rating-based suggestions when explicitly enabled, Ask Reel with real catalog retrieval and the existing authenticated AI API, unified title/people search, details and people credits, watchlists/saved picks, private ratings/notes/collections, episode progress, movie watches/rewatches, activity and date editing, calendar, statistics, appearance, haptics and sign-out. Lumi is an original scalable vector character with ten expressions and reduced-motion-aware feedback.

`supabase/migrations/20261106165224_mobile_add_my_title.sql` adds single-title insertion without replacing a library. It has been deployed to the existing backend and recorded in migration history. Personal updates keep existing RLS and watch RPCs. The hosted auth allowlist now includes both `reel://auth/callback` and its recovery variant while preserving the website URL. Google login is hidden because the existing provider is disabled. Email sign-in/registration and recovery use the existing account system; live email links still need physical-device validation.

Conversations stay in memory. The existing API does not stream, persist chat history, provide streaming-service availability, deliver notifications, or delete accounts. The app does not simulate those services. Reading entries remain visible in the library; native chapter/page tracking is outside this movie/TV client. Catalogs may return partial data or outages; unavailable episode dates are never estimated. TVMaze supplies the initial dated episode/calendar guide; Kitsu-only guides can remain unavailable.

## Checks

```powershell
npm run typecheck
npm run lint
npm test
npm run export:android
```

From the repository root, the existing website checks remain `npm test` and `npm run check`.

Web is used only to inspect rendered React Native components and automate contract tests:

```powershell
npx expo export --platform web --output-dir dist-web --max-workers 2
python tools/preview_server.py --port 8092
# In another terminal:
python tools/test_preview.py
```

Python Playwright is a local QA dependency, not an app dependency. Fixture account traffic is intercepted only by `tools/test_preview.py`; the shipped app always uses real services. Web sessions intentionally stay in memory. Native sessions use encrypted SecureStore chunks. No tokens are persisted in unencrypted preferences/recent-search storage.

## Physical-device checklist

- Install and cold-launch, use Android Back and rotate the phone.
- Sign in; force-close/reopen to verify secure session restoration. Sign out and switch accounts.
- Confirm email registration/recovery links open the installed app and exchange the PKCE code once.
- Search film, series, actor and director; open details, credits and Back.
- Save a title, then verify it on the website. Change notes/rating and verify only that account changes.
- Mark/undo a released episode, log a film and a rewatch; confirm Activity and the website agree.
- Check activity dates, calendar and statistics in the device timezone.
- Ask a multi-concept request, follow up, regenerate, change source, cancel and retry on a weak connection.
- Inspect 200% system text, TalkBack, gesture navigation, keyboard avoidance, reduced motion and haptic timing.
- Judge frame pacing in this release-mode build on the Redmi Note 12. Browser rendering is not performance evidence.

See [architecture](../docs/mobile-architecture.md), [research](../docs/mobile-design-research.md), [progress](../docs/mobile-progress.md) and [verification](../docs/mobile-verification.md).

Next validation priority is the physical-device checklist above, including a real-account save followed by a website check and an authenticated Ask response. Later improvements can add localized interface copy, a more reliable server-cached public catalog and a stable private release signing identity. Services absent from the existing backend require their own implementation before enabling their controls.
