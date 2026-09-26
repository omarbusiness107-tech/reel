# Reel known issues and limits

Last verified: 2026-09-25
Repository/branch: Reel / main
Verified against: current working tree
Purpose: Evidence-based unresolved risks, limitations, and regression hotspots.

## Issue: Tracking release coverage depends on available provider episode dates

Home and Calendar use lazily fetched TVMaze episode metadata for tracked shows. Anime with a known episode count can be tracked individually without TVMaze, but the count can include future episodes; without dates Reel cannot verify their release or offer a safe whole-season action. Unknown episode air dates, season premieres, movie digital releases, and titles absent from the provider cannot be scheduled accurately. The app does not invent dates. The calendar currently emphasizes known episodes and personal watch dates; a broader release-provider integration remains future work.

## Issue: New tracking pages are an incremental extraction, not a full app refactor

The shared state, auth, search, details, and provider adapters still live in the large `reel.html`. `tracking-core.js` and `tracking-pages.js` establish a feature boundary, but a dedicated repository/API layer and normalized global season/episode cache are not yet present. Initial Home episode enrichment is capped to eight relevant shows to avoid a request burst; large libraries may need incremental loading for complete upcoming coverage.

## Issue: Watch-event operational validation is incomplete

The live Supabase watch-event and retry-ledger migrations are applied; owner RLS policies and security advisors were inspected. Browser tests use a two-account mock, not two production credentials. Real authenticated end-to-end watch/undo/backdate and high-volume history behavior still need acceptance testing. Supabase continues to report existing warnings for `sync_my_library` (intentional SECURITY DEFINER design) and disabled leaked-password protection.

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
