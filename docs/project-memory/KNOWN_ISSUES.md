# Reel known issues and limits

Last verified: 2026-11-06 (native additions; earlier web entries last verified 2026-10-16)
Repository/branch: Reel / feat/reel-native-android; web baseline from main
Verified against: current working tree
Purpose: Evidence-based unresolved risks, limitations, and regression hotspots.

## Native Android verification and provider limits

`mobile/` has passed typecheck, lint, Expo Doctor (20/20), 11 core/database tests and 16 rendered contract-flow scenarios using isolated HTTP fixtures, plus narrow/landscape checks. Source `9a49a37` built an installable ARM64 release-mode preview APK in GitHub Actions run 42274765083; official Google tools verify its signature and manifest. Live Discover returned real Cinemeta/TVMaze data and honestly reported a Kitsu outage. Physical Redmi Note 12 validation remains outstanding; the exact evidence and artifact checksum are in `docs/mobile-verification.md`. Neither browser screenshots nor successful compilation establish Android runtime performance, SecureStore survival, keyboard geometry, TalkBack, haptic timing or email PKCE dispatch. No real user's password or production library was used for smoke tests.

The hosted additive mobile insertion function and native auth callback allowlist have been deployed; website URL and unrelated auth settings were preserved. Google sign-in remains hidden because its provider is disabled. Kitsu-only episode progress/calendar guides, reading-specific native actions, notifications, account deletion, permanent chat history and localized native copy are not supplied by this client. The UI does not fabricate them.

Expo SDK 58's CLI/fingerprint dependency tree currently reports five moderate glob/minimatch advisories and no high/critical finding. A force fix would downgrade the SDK, so it was not applied. Supabase error-level security advisors report no issues; warning-level intentional owner-checked definer RPCs and pre-existing leaked-password protection settings remain documented in the mobile verification report.

## Resolved: Search source ambiguity, anime/film ranking and cross-provider duplicates

Update 2026-10-16: Wikipedia result position/article length and TVMaze query relevance no longer masquerade as popularity. Autocomplete prioritizes exact title/alias matches and then uses audience counts, popularity ranks, provider weights or sitelinks where supplied. The new Library/Online switch makes source scope explicit and blocks provider searches in Library mode; generation checks prevent delayed online responses from changing the local view. Shared deduplication matches provider aliases and compatible title/year/media identities, including Naruto-style long-vowel spelling differences, without title-specific exceptions. Kitsu movie subtypes are classified as movies and excluded from episodic-anime enrichment. Library membership honors merged provider aliases and retains private state. Unknown years or ambiguous identities are intentionally not guessed; providers do not supply a single universal popularity scale, so exact-title relevance remains the first ranking safeguard. No production database mutation or deployment was required.

## Resolved: Anime calendar years shown as seasons and locked episode inputs

Update 2026-10-11: TVMaze One Piece anime (1505) uses calendar-year buckets beginning with eight episodes in 1999. Details now present absolute episodes and source-linked arcs for One Piece, Naruto, and Naruto Shippuden without changing native private episode keys. Explicit watched flags no longer disable numeric inputs; committed edits synchronize the explorer in both directions, including lowering an incorrect endpoint. Finished fills the released guide and numeric controls; account updates remain owner-scoped with zero-row failure detection and rollback. Kitsu-style continuous keys survive provider refresh instead of silently becoming year-bucket keys. Season-based anime retain seasons. Arc coverage is curated, not universal; unsupported calendar-year anime use a generic continuous guide, and unmapped/standalone episodes remain visible. Future provider episodes without a confirmed past release date cannot be completed from freshly fetched guides. No production database mutation or deployment was needed for this fix.

## Upcoming release coverage

Update 2026-10-10: Home now groups dated releases by distinct library title, so Tulsa King's ten episodes cannot monopolize the eight-title preview. Confirmed undated seasons are visible separately: live TVMaze From (54723) data showed season 4 ending 2026-06-28 and season 5 with premiereDate:null. No future episode date was invented. Ongoing manga/manhwa lacking usable dates show an explicit schedule-unavailable disclosure; live Kitsu Berserk (8) returned undated records numbered 5000/4999/4998, which are not used to infer a next chapter. Versioned caches force an upgrade refresh, expired episodic caches require genuinely fresh requests, and progress/results update before the entire library finishes. Wikidata successors traverse past released sequels with cycle bounds; a collection outage no longer discards independently obtained dates. Saved results survive partial and failed lookups. Movie/book continuations still require provider identity and documented relationships; imported books without Wikidata identity are not automatically matched. Kitsu pagination is bounded to ten pages; upcoming collection discovery to 100 members per collection. No background scheduler or push notifications are introduced.

## Resolved: Book pages missing from History and repeated daily reading cards

Follow-up 2026-10-09: lowering a chapter or page now corrects stored History ranges rather than retaining the previous high endpoint. Owner-scoped RPCs trim overlapping ranges and remove unread sessions; guest state uses the same semantics. Reading cards are compact and vertically centered so removing the synopsis does not leave a large empty region.

Resolved 2026-10-09. Books previously updated `current_page` without saving activity. Page increments, committed edits, and finishing now use owner-scoped `record_page_progress` and retain reading ranges. History groups each title's daily chapter/page sessions before pagination, removes reading summaries, and highlights start/end positions. Existing undated progress remains undated. Transactional live tests cover page/chapter saves, retries, limits, finishing, and account isolation.

## Issue: Genuine high-resolution History art is not available for every title

Update 2026-10-10: Library and catalog details again place the cover over the banner's bottom-left edge. Missing or rejected banners now trigger exact-ID TVMaze/Kitsu/Cinemeta discovery rather than silently disappearing. Wide native banners (including 1500×500) are no longer rejected by the former 2.4 aspect-ratio ceiling. From's original 3840×2160 background was verified in the browser; native quality checks still reject portraits and low-resolution art. Some books and other titles have no genuine landscape artwork in these public sources; their unavailable state remains explicit rather than stretching a cover.

Earlier update 2026-10-10: Library/catalog details reject portrait or low-resolution banners and share the verified movie artwork mapping with History. The Landscape banner field supplies both surfaces. This separate-banner version's cover positioning has now been superseded by the restored overlapping layout described above.

Update 2026-10-09: The Machinist and Man of Steel now have title-matched native 1920×1080 Prime Video hero images, verified in the browser. All History summaries are removed. Reading cover columns size from the loaded source ratio and align to the outer edge rather than centering inside a fixed-width slot. Real-image checks cover both reading types and the new movie sources on mobile/desktop and light mode.

History checks native dimensions and prefers HD landscape sources. Its ordinary landscape cards now follow the image ratio and fill the entire card; portrait-only art uses a deliberate larger-cover layout. A text-led fallback appears only when no source loads. The current keyless providers do not guarantee Full HD or 4K artwork for every movie or episode; TVMaze's original image is the original upload, not a guaranteed 4K file. A comprehensive high-resolution artwork provider and rights/attribution review remain future work.

## Resolved: History artwork letterboxing and missing chapter entries

Resolved 2026-10-09. The former 98% aspect-match gate and native-pixel display cap produced empty regions around ordinary landscape stills and tiny posters. Landscape card proportions now follow the image. F1 aliases resolve correctly; 300 and Zodiac have verified replacement art. Real-image browser checks cover desktop/mobile, light mode, and full-image access. Manga/manhwa chapter actions now save dated `chapter_read` events through owner-scoped `record_chapter_progress`; earlier reading progress is shown without inventing dates. The live database was restored from a paused state, the migration applied, and transactional tests passed for save/retry/limits/finish and account isolation with test data rolled back. Browser checks cover guest and signed-in saves, failures, and account switching.

## Issue: Tracking release coverage depends on available provider episode dates

Home and Calendar use lazily fetched TVMaze, Kitsu, and Wikidata release metadata. Anime with a known episode count can be tracked individually without TVMaze, but the count can include future episodes; without dates Reel cannot verify release or offer a safe whole-season action. Confirmed undated announcements appear on Home, not as invented calendar events. Missing provider coverage and digital-release-specific scheduling remain limitations.

## Issue: New tracking pages are an incremental extraction, not a full app refactor

The shared state, auth, search, details, and provider adapters still live in the large `reel.html`. `tracking-core.js`, `tracking-pages.js`, and `release-data.js` establish feature boundaries, but a dedicated repository/API layer and normalized global season/episode cache are not yet present. Home checks the whole library with three workers and incremental results; very large libraries can still take time and encounter public-provider rate limits.

## Issue: Watch-event operational validation is incomplete

The live Supabase watch-event and retry-ledger migrations are applied; owner RLS policies and security advisors were inspected. Browser tests use a two-account mock, not two production credentials. Real authenticated end-to-end watch/undo/backdate and high-volume history behavior still need acceptance testing. Supabase continues to report existing warnings for `sync_my_library` (intentional SECURITY DEFINER design) and disabled leaked-password protection.

## Resolved: newly added movies could not save watch history

Resolved 2026-09-26. The browser initially held a temporary local ID while `sync_my_library` created a different `user_titles.id`. A watch RPC using the temporary or stale ID failed, and setting a movie to Finished did not create a dated event. Watch actions now resolve the owner-scoped library row first, retry a stale sync when needed, and Finished logs the first movie watch. The idle toast is fully hidden instead of leaving a visible edge at the bottom. A signed-in browser mock covers the new-title flow; a live authenticated RPC was checked inside a rolled-back transaction.

## Resolved: unscoped browser state could initialize an account library

Resolved 2026-09-23. The former `user_libraries` blob path could push `reel.v1` into a new account and mixed catalog facts with personal fields. Authenticated storage now uses shared `titles`, owner-scoped `user_titles`, owner-scoped preferences, unique `(user_id,title_id)`, and four-operation RLS. Guest data uses a separate key and is never automatically merged. The legacy blob table is retained as an owner-protected rollback archive.

## Issue: Public People/profile completeness depends on keyless providers

Symptoms: A person may have a biography but incomplete credits, occupation, birthplace, or portrait when Wikidata, Wikipedia, TVMaze, or Commons is unavailable or lacks the field.

Likely relevant files: `reel.html`, `tools/check-discovery.cjs`, `tools/check-responsive.cjs`.

Known cause: Reel intentionally uses keyless public sources and does not fabricate missing biographical or credit data.

Previous attempts: Profile opening now resolves provider IDs directly, merges Wikidata and TVMaze credits with local records, caches results, exposes retry on provider failure, and remembers failed/undersized portraits for stable fallbacks.

Current status: Expected operational/data-source limitation; clean-cache and failure behavior have deterministic browser coverage.

Suggested investigation: If provider reliability becomes insufficient, add a server-side cached adapter while preserving provider IDs, field-level provenance, and the local-first path.

## Issue: Live AI quality and production behavior are not proven by repository tests

Symptoms: A deployed model may interpret or rank requests differently from mocked tests, and external authentication/provider conditions can fail.

Likely relevant files: `api/recommend.js`, `assets/recommendations.js`, `RECOMMENDATIONS.md`, `tests/recommend-api.test.cjs`.

Known cause: Tests mock the provider and auth; documentation explicitly states they do not prove real model quality, production auth, Supabase availability, Vercel deployment, or catalog uptime.

Previous attempts: Strict response schemas, candidate/evidence validation, local fallback labels, auth checks, and request-size/rate safeguards are implemented.

Current status: Open operational limitation.

Suggested investigation: Conduct manual hosted acceptance with signed-in and non-allowlisted accounts, multi-concept prompts, provider failures, and real catalog data before relying on a model/provider change.

## Issue: Recommendation relevance remains a high-risk regression area

Symptoms: Multi-concept requests can degrade into generic matches, or weak candidates can appear if ranking/filtering changes.

Likely relevant files: `assets/recommendations-core.js`, `assets/recommendations.js`, `tests/recommendations.test.cjs`, `RECOMMENDATIONS.md`.

Known cause: The feature must balance hard/near-hard constraints, evidence availability, soft tradeoffs, and finite catalog candidates. The repository does not document a currently reproducible bug.

Previous attempts: Structured parsing and tests cover multi-concept input, American animation, firearms/organized crime, named people, deep-versus-Depp, origin/settings, exclusions, age suitability, and intent direction resets.

Current status: Regression risk, not a confirmed current defect.

Suggested investigation: Add a failing test before changing parser/scoring behavior; compare candidate facts and match signals, not only visible titles.

## Issue: Repetition and randomness are constrained by available relevant candidates

Symptoms: Surprise/Another can appear repetitive when candidate pools are small or exhausted.

Likely relevant files: `assets/recommendations-core.js`, `assets/recommendations.js`, `tests/recommendations.test.cjs`.

Known cause: The engine intentionally avoids shown/rejected IDs and unrelated padding; it can return fewer results when relevant options are exhausted.

Previous attempts: Session-level shown IDs, weighted shortlist sampling without replacement, and genre/creator diversity penalty are implemented.

Current status: Expected tradeoff; no repository evidence of a current bug.

Suggested investigation: Reproduce with a known candidate set and distinguish true repeats from an exhausted relevant pool. Do not loosen relevance simply to fill a list.

## Issue: Picker layout and state restoration are sensitive UI surfaces

Symptoms: Potential regressions include clipped controls, unwanted shell scrolling, unreadable small cards, hidden composer/buttons, mobile-pane issues, lost draft/scroll/result after details, or incorrect mode/reset behavior.

Likely relevant files: `assets/recommendations.css`, `assets/recommendations.js`, `reel.html`, `tools/check-recommendations.cjs`, `tools/check-shell-auth.cjs`, `DESIGN.md`.

Known cause: The workspace combines viewport constraints, independently scrollable regions, responsive breakpoints, modal history, and temporary session state. The repository does not establish a current reproducible overflow or tab-state bug.

Previous attempts: Explicit desktop grid rows, mobile Chat/Pick tabs, low-height styles, reduced-motion behavior, captured picker detail state, and browser-contract checks are present.

Current status: Regression hotspot.

Suggested investigation: Run recommendation UI checks at desktop, mobile, short-height, light/dark, and reduced-motion states; exercise Details → Back, browser Back, mode switch, Start over, and source changes.

## Issue: AI rate guard is not durable or globally enforced

Symptoms: The per-user request limit resets on function cold starts and does not coordinate across instances.

Likely relevant files: `api/recommend.js`, `RECOMMENDATIONS.md`, `tests/recommend-api.test.cjs`.

Known cause: The limiter is an in-memory, per-process map.

Previous attempts: The endpoint enforces 40 requests per user per hour within a running process and supports an optional user allowlist.

Current status: Known scalability/billing limitation.

Suggested investigation: Before public rollout, design a shared atomic limiter and provider-spend monitoring.

## Issue: Some recommendation controls are not localized

Symptoms: New static Pick 4 me controls remain English even when the app is otherwise in French or Arabic.

Likely relevant files: `assets/recommendations.js`, `reel.html`, `RECOMMENDATIONS.md`.

Known cause: Documentation says the local parser and new static controls are English; AI can interpret/respond in another language but does not translate surrounding static UI.

Previous attempts: Existing library translations remain intact.

Current status: Documented limitation.

Suggested investigation: Inventory recommendation strings and extend the current translation mechanism before claiming localized picker support.

## Issue: Cross-session recommendation history and behavioral learning are deferred

Symptoms: Recommendations and transcript disappear when the picker closes; the app does not learn durable preferences from chat/rejection feedback.

Likely relevant files: `assets/recommendations.js`, `assets/recommendations-core.js`, `RECOMMENDATIONS.md`, `PRODUCT.md`.

Known cause: Product direction deliberately makes the picker session temporary and protects user privacy.

Previous attempts: Optional local genre affinity is constrained to three 8–10 ratings and is off by default.

Current status: Deferred product scope.

Suggested investigation: Treat persistence/learning as a new privacy and product-design decision, not a small UI enhancement.
