# Reel — Implementation checklist for Sol

Prepared 2026-11-14. Implementation branch `codex/reel-cinema-journal`, based on `1ea3630`. The specifications below remain the acceptance contract. See the [master plan](REEL_REDESIGN_MASTER_PLAN.md), [design system](REEL_DESIGN_SYSTEM.md), [reference mapping](REEL_REFERENCE_MAPPING.md) and [preservation contract](REEL_FEATURE_PRESERVATION.md).

## Implementation and evidence

The redesign is implemented across 13 user-facing routes and the 16 specified screen families, including movie and TV variants, episode information and shared overlays. **13 of 24 tasks are checked for their functional scope.** Unchecked tasks have implementation, additional acceptance work, or both, as recorded below. All screens share the native release acceptance in RD-22.

Mobile typecheck, lint, 28 mobile tests, 91 root tests and the root syntax check passed before and after implementation. The Android bundle and web preview exported successfully. The three final browser scripts reported 20 integrated checks, 8 search recovery checks, and 11 detail and library checks, all with zero page errors. Detail and library were exercised at 320×720 and 412×915, in both themes at 412×915, and at 915×412 landscape. Live read-only Discover loaded public catalog artwork and a spotlight at 412×915. Kitsu reported an outage, and the other catalogs remained visible. The browser fixtures also exercised independent provider failures.

On November 16, the [follow-up browser suite](../mobile/tools/test_redesign_acceptance.py) verified 525 saved titles across two fetches, all nine scopes combined with search and a collection, and resize restoration within the same part of the library. It verified selection and explanation continuity across Details and phone-to-expanded layout, reuse of an episode watch request ID after an intervening watch, Cancel and Retry for a private rating, and the user's own rating on the Top rated shelf. Captures include `mobile/artifacts/ask-three-picks-expanded-fixture.png`. The Android workflow accepts pushes to the redesign branch. The available Android check is a local bundle export. A new installable APK and device run are still outstanding.

| Tasks | Implemented | Evidence still needed or differences from plan |
|---|---|---|
| RD-00–RD-02 | Baseline export and fixture captures. Semantic colors, type roles, control sizing, insets, error and loading states, modal sheets. | Capture a baseline APK on the target device. Measure system text scaling, contrast over artwork, and TalkBack focus. Sheets animate in and dismiss immediately. Success feedback stays near the relevant action. |
| RD-03–RD-05 | Existing navigator and Back policy with compact tabs and an expanded rail. Mounted detail and tab state, Library resize anchor, exact poster recovery, one detail poster and accessible cast rail. Resize tested with 525 titles in the browser. | Physical Back/IME checks. Library restores by item ID or measured row, with a bounded estimated fallback. Removed anchors and native resize need verification. |
| RD-06–RD-08 | Bounded real catalog spotlight, Continue scopes, Ask request snapshot and cancellation, Guide me, per-response poster stage, explanation and pick selection. | Verify multi-pick and expanded layouts with an isolated live account. The transcript scrolls to the response heading. Pick changes fade. |
| RD-09–RD-11 | Movie and episodic layouts, virtualized guides, episode facts, existing watch actions, private rating and notes sheets. | Confirm long episodes and accessibility on device, and run the full write retry matrix. Movie detail keeps a centered column on large screens. Remove remains directly available under Your take. |
| RD-12–RD-14 | Progressive search and recovery, person/credit loading, all Library scopes, collection tiles and combined filters. All nine scopes verified with search and a collection across 525 titles. | Measure native rotation and text scaling. Search uses a scrollable scope strip. |
| RD-15–RD-17 | Date-grouped history, safe date edits, month/agenda calendar, known runtime summary and accessible chart controls. | Run the complete time-zone, leap-day, unknown-runtime and range fixtures. Verify touch targets and TalkBack on device. |
| RD-18–RD-19 | Profile and settings, private Top rated shelf, onboarding, and labeled auth/recovery forms. | Verify the full preference queue, registration/recovery email links, secure session restoration and the keyboard on native Android. |
| RD-20–RD-22 | Reduced-motion-aware feedback, Ask reveal, poster selection, sheet entry, onboarding and chart transitions. Android bundle and browser journeys available. | Physical release-device frame pacing and memory, TalkBack, 200% native text, system Back and keyboard. No measured frame or memory result. |
| RD-23 | Updated affected product memory and this checklist. | Record native follow-up results once collected. |

Browser evidence uses exported React Native Web components. The test data is isolated from production accounts. Compare the fixture captures in `mobile/artifacts/` with the corresponding files under `mobile/artifacts/redesign-baseline/`. Key comparisons are `ask-fixture.png`, `detail-412-dark-fixture.png`, `library-412-light-fixture.png`, `ask-landscape-fixture.png`, and `stats-fixture.png`. The new `episode-sheet-fixture.png` and `agenda-fixture.png` cover added surfaces.

### Android verification to reproduce

1. Build and install the native preview from this branch using the existing `mobile/README.md` build procedure. Keep the installed app data. Record the APK revision, phone model and Android version.
2. Capture Discover, Ask empty and result, Library, title, episode sheet, People, Calendar month and agenda, Insights, You and auth at the same account state in light and dark themes. Repeat with system text size at 200%. Use 320–360 dp compact width and a landscape or tablet configuration where available.
3. With TalkBack, reach every tab, change a pick, read its explanation, open Details and return, open and close an editor, inspect an activity day, and change a calendar day or the agenda. Repeat route Back with gesture and three-button navigation. Open the keyboard in Ask and the auth forms and confirm that the submit controls are reachable.
4. Use an isolated account. Verify sign-in, registration or password recovery from a real email link, account switching, app relaunch, Save pick, a private rating, watch and undo on a released episode, and an Activity date edit. Check that Calendar and Insights use the resulting events.
5. On the Redmi Note 12 or comparable hardware, compare before/after scrolling and route performance at 60 Hz with motion enabled and disabled. Perform twenty detail open/return cycles and record frame timing and memory against the [design system](REEL_DESIGN_SYSTEM.md).

## Execution rules

- Work in the existing `mobile/` application. Use existing services/shared core. No root SPA replacement, backend schema change, endpoint change or dependency upgrade is required.
- Establish a new current baseline before edits. Pre-existing modified root `.gitignore`, `package.json`, `package-lock.json` and untracked root `tsconfig.json` / `.planning/debug/upcoming-only-one-title.md` were observed during planning; preserve other work. No cleanup, reset or lockfile regeneration as a side effect.
- Paths under **Existing** were inspected or identified in the repository. **Proposed** names are new suggested components, not existing files. Sol may co-locate initially, but record final locations and keep route/controller responsibilities clear.
- V tasks change presentation; B tasks explicitly change bounded UI behavior; O tasks are optional and excluded. No feature can disappear because its UI moves to a sheet.
- P0 = correctness/foundation gate; P1 = core redesign; P2 = polish. Complexity S≈one isolated component, M≈one screen/few shared components, L≈coordinated state/route flow. These are sizing guides, not time promises. Risk indicates regression impact, not implementation duration.
- Reuse existing tests; add meaningful behavior tests for B work. Do not snapshot every style object. Preserve native/web evidence distinction and never use QA fixtures as release data.
- Implement and verify one milestone at a time. No M03 optional shared-poster transform until baseline routing, state, accessibility and release-device performance pass.

## Dependency map and ordered overview

| Order / ID | Milestone | Type | Priority / size / risk | Dependencies | Screens |
|---|---|---|---|---|---|
| 1 RD-00 | M0 | Read/QA | P0 / M / low | None | All |
| 2 RD-01 | M1 | V | P0 / M / medium | RD-00 | All tokens/type |
| 3 RD-02 | M1 | V+B | P0 / L / high | RD-01 | Shared controls/insets/overlays |
| 4 RD-03 | M2 | V+B | P0 / L / high | RD-02 | Shell, back, adaptive navigation |
| 5 RD-04 | M2 | B | P0 / L / high | RD-03 | State restoration across routes |
| 6 RD-05 | M2 | V | P1 / M / medium | RD-02 | Artwork/poster/cast primitives |
| 7 RD-06 | M3 | V+B | P1 / M / medium | RD-04,RD-05 | Discover/Continue |
| 8 RD-07 | M4 | B | P0 / L / high | RD-04 | Ask request lifecycle |
| 9 RD-08 | M4 | V+B | P1 / L / high | RD-05,RD-07 | Ask stage/options/Guide me |
| 10 RD-09 | M5 | V | P1 / M / medium | RD-04,RD-05 | Movie detail |
| 11 RD-10 | M5 | V+B | P1 / L / high | RD-09 | TV/anime/episodes |
| 12 RD-11 | M5 | V+B | P1 / M / high | RD-02,RD-09 | Private rating/notes/collections |
| 13 RD-12 | M6 | V | P1 / M / medium | RD-04,RD-05 | Search |
| 14 RD-13 | M6 | V | P1 / M / medium | RD-04,RD-05,RD-09 | People |
| 15 RD-14 | M6 | V+B | P1 / M / medium | RD-04,RD-05,RD-11 | Library/collections |
| 16 RD-15 | M7 | V+B | P1 / M / high | RD-10,RD-11 | Activity/date editor |
| 17 RD-16 | M7 | V+B | P1 / L / high | RD-04,RD-10,RD-15 | Calendar/agenda |
| 18 RD-17 | M7 | V+B | P1 / M / high | RD-02,RD-15 | Insights/chart inspector |
| 19 RD-18 | M8 | V+B | P1 / M / medium | RD-14,RD-15,RD-16,RD-17 | You/settings/top-rated |
| 20 RD-19 | M8 | V | P1 / M / high | RD-02,RD-03 | Onboarding/auth/callback |
| 21 RD-20 | M9 | V | P2 / M / medium | RD-06,RD-08 through RD-19 | Motion consistency |
| 22 RD-21 | M10 | QA | P0 / L / high | All core work | Regression/accessibility/real data |
| 23 RD-22 | M10 | QA | P0 / M / high | RD-20,RD-21 | Native visual/performance |
| 24 RD-23 | Handoff | Documentation | P0 / S / low | RD-21,RD-22 | Evidence and affected memory |

## M0 — Baseline

### [ ] RD-00 — Freeze factual and rendered baseline

**Objective:** make before/after and feature-preservation claims reviewable. **Existing:** `mobile/README.md`, `mobile/package.json`, `mobile/app/`, `mobile/src/theme.ts`, `docs/mobile-verification.md`, existing mobile tests/tools. **Reference:** entire R inventory; historical captures only as secondary evidence.

Actions: record branch/revision and dirty-file ownership; verify every route and F-row against current source; capture unchanged native app in required representative states; identify fixture/test-account setup and available native device. Read existing test scripts before running them. Note any pre-existing failures or mismatch from this planning baseline. Confirm `mobile/` toolchain, no root dependency installation.

**Acceptance:** manifest contains native device/OS/build, geometry/theme/text scale, route/data state and screenshots for Discover, Ask empty/result, film/series/person, Search partial failure, Library, Activity, Calendar, Insights, You, onboarding/auth. If native device unavailable, mark device gates outstanding; do not call web captures native. No production personal data written just for baseline.

**Tests:** run existing relevant checks before changes when environment permits; preserve failure logs without secrets. No screenshot comparison can substitute for account/engine tests.

## M1 — Foundations

### [ ] RD-01 — Implement semantic tokens and typography

**Existing:** `mobile/src/theme.ts`, `mobile/src/components/ui.tsx` (`Copy`), `mobile/app/_layout.tsx`. **Proposed:** optional `mobile/src/theme/typography.ts` only if splitting improves clarity. **Refs:** selected direction; R01/R18/R22; design-system §§2–4. **Objective:** shared native visual system and both themes.

Map current `bg/surface/raised/text/muted/line/accent/onAccent/mint/danger` compatibly to new semantic roles. Migrate consumers without breaking current theme selection. Add type roles and retain optional editorial serif only on designated entry screens. Replace operational oversized slogans as screens migrate. Preserve StatusBar theme detection when tokens change. No font download or palette extraction dependency.

**Acceptance:** all token pairs and states documented; no hardcoded dark text/background in light controls; normal text meets4.5:1; defaults remain dark and rating affinity off.2× text grows naturally; typography doesn't clip non-Latin glyphs. **Tests:** contrast computation for used pairs; native visual sample of each type/control in both themes; current typecheck/lint. Avoid tests mirroring every token constant.

### [ ] RD-02 — Shared accessible controls, state surfaces and sheets

**Existing:** `mobile/src/components/ui.tsx`, `Lumi.tsx`, `src/services/hooks.ts`. **Proposed:** `SheetFrame.tsx`, `InlineNotice.tsx`, `FeedbackSnackbar.tsx` under components. **Refs:** R12/R18, M01/M04/M08/M09/M10, SC16. **Objective:** consistent geometry, pending/error feedback and short editing surfaces.

Implement48dp target contract, labeled fields, button variants, compact visual chips with full target, component-shaped loading, separate no-data/error/partial states. Centralize one owner for top/bottom/IME insets; expose page layout for ScrollView vs virtualized owner. Sheet explicit Close, Android Back, focus containment/return, optional dirty draft guard. Pending states disable duplicate mutation, keep labels readable, success haptic remains once through existing hook. Do not add optimistic remote success.

**Acceptance:** sheet can be completed with TalkBack/external keyboard and dismissed without gesture; last content not hidden behind navigation; errors preserve input; haptics off truly off; no permanent empty skeleton. **Tests:** small viewport+IME,2× text, reduced motion, failed save, focus return, two quick taps. Verify existing Page consumers before full rollout.

## M2 — Navigation and media

### [ ] RD-03 — Preserve navigation with adaptive shell

**Existing:** `mobile/app/(tabs)/_layout.tsx`, `mobile/app/_layout.tsx`, `mobile/src/navigation.ts`, `core/back-navigation.ts`, BackHeader in ui. **Proposed:** `AdaptiveNavigation.tsx` if needed. **Refs:** R01/R12; design-system shell. **Objective:** stable five destinations, standard Android Back, compact bar/expanded rail.

Retain route names/tab order/history and `showAccountLibrary` behavior. Style64dp compact bar with labels and safe-area bottom; implement80dp rail only at≥600dp without rendering a second navigator. Let supported Router layout capabilities dictate implementation; verify versioned API before coding. Header uses short context labels. Keep predictive-back setting unchanged.

**Acceptance:** one mounted navigator/controller per tab; system/header Back same destination; cold detail returns home; home/no history allows OS default; keyboard/sheet dismissal has priority; rail switching doesn't lose active tab; no duplicate Ask composer after auth. **Tests:** existing `back-navigation.test.ts`, rendered auth/Back tools; physical gesture and3-button runs; tablet resize.

### [ ] RD-04 — Explicit transient screen restoration

**Existing:** Ask/Search keyed children; Library FlatList column key; title/person routes; navigation/provider. **Proposed:** `mobile/src/navigation/view-state.ts` in-memory map/hook (new file). **Refs:** R02/R07/R11, master§5, F10/F34. **Objective:** avoid loss of user context on detail return, column changes and tab excursions.

Record anchor IDs/offsets and local view options, scoped to account+route. Prefer mounted state; restore only after data/layout are ready; prevent restoration loops. Ask stores controller in route lifetime and result selection only in memory. No copied private data cache or AsyncStorage chat persistence. Clear on account change and explicit session reset. Details/person new destinations start at top; previous routes restore. Deleted anchors choose nearest surviving neighbor.

**Acceptance:** J01/J02/J04; rotation keeps same title neighborhood; no stale account snapshot; active season/day/range retained; no extra fetch caused solely by snapshot restore. **Tests:** add focused controller/anchor tests and rendered route round trips. Test Back after filtering away/deleting anchor and after opening direct cold link.

### [ ] RD-05 — Shared poster, row, cast and Continue primitives

**Existing:** `TitleCard.tsx`, `LibraryCard.tsx`, `DetailHero.tsx`, `People.tsx`, `core/artwork.ts`. **Proposed:** `ContinueCard.tsx`; optional extracted `PosterFrame.tsx` while retaining recovery behavior. **Refs:** R03/R09/R14/R22. **Objective:** strong consistent imagery without lost identity.

Preserve per-URL failure list and exact-ID recovery query. Add detail contain-fit variant, same2:3 geometry, icon fallback; no image double-narration. Cast72dp circle/96dp cell/full name. Continue uses saved position and released counts only; no new mutation logic. Virtualize shelves when large; use stable keys and bounded decode sizes.

**Acceptance:** missing/broken/alternate image cases correct, no duplicate detail poster; long title/actor names wrap; personal rating/status preserved; no fake progress percentage for unknown totals. **Tests:** existing catalog/people/artwork behavior tests; `test_detail_library.py` adapted to approved dimensions; inspect dark/light/320/landscape.

## M3 — Discover

### [x] RD-06 — Build cinematic Discover hierarchy and status shelf

**Existing:** `mobile/app/(tabs)/index.tsx`, catalog/discover, hooks. **Proposed:** `Spotlight.tsx`, reusable section data model; Continue status local state. **Refs:** R01/R02/R14, SC01. **Interaction:** Ask entry and mood prompts retain existing routes; real hero opens title; status selector changes shelf only; explicit Library destination scope wiring if added.

Use a bounded banner spotlight after Ask, responsive compact variant, Continue before generic shelves, accurate source labels, eligibility-preserved personal shelf. Keep pull-refresh and useful content when one provider fails. Do not rename provider popularity as personalized/trending without evidence.

**Acceptance:** Ask+spotlight action in first412×915 viewport; narrow/large-text fallback; signed-out and partial-source versions; no fake hero when data absent; filter changes never write library. **Tests:** F01–F03; live catalog read-only smoke plus deterministic partial-failure fixtures; before/after screenshot checkpoint.

## M4 — Ask

### [x] RD-07 — Stabilize request snapshot, Cancel/Retry and conversation state

**Existing:** `mobile/app/(tabs)/ask.tsx`, `mobile/src/services/assistant.ts`, `core/types.ts`; preserve root recommendations and API. **Proposed:** `mobile/src/features/ask/useAskConversation.ts` (controller extraction, new). **Refs:** R06/R19, SC02. **Objective:** prepare correct state ownership before visual stage work.

Explicit snapshot includes source/format/resultCount/text at submit; committed groups retain originating context. Abort/sequence guards cover Cancel, reset, account change, unmount. Freeze options while pending. Failed request can be retried with original snapshot and one user bubble; retain recoverable text. New chat retains source/format as current native behavior. Auto-follow only within80dp from end or on user submit; otherwise new-response anchor. Use ratings preference as current engine input; do not change rank/filter behavior.

**Acceptance:** no stale response, no double send, no silent scope relabel, no persisted transcript, guest fallback truthful, regeneration correct after changed options. **Tests:** mocked controllable async responses for cancel→new response ordering;401/429/timeouts; direct+3-followup limit; account change; exhaustion; unchanged shared engine/API suite.

### [x] RD-08 — Recommendation stage, option sheet and Guide me entry

**Existing:** Ask route, TitleRow/Artwork/Lumi. **Proposed:** `RecommendationStage.tsx`, `AskOptionsSheet.tsx` under components or ask feature folder. **Refs:** R05/R06/R19,M05/M06,SC02. **Objective:** make real title and grounded explanation the focal moment.

Build per-response selected pick, max two decorative rear silhouettes, reason, Details/Save, thumbnails and Previous/Next, group count, regeneration. Include one/three and Mix/library controls; keep existing format options. Guide me enters same service question flow. Compose single phone transcript; expanded52/48 uses one controller. No voice, fake typing, match percent, public history or rejection gesture.

**Acceptance:**0/1/2/3 real picks; active2→detail→Back exact restore; historical group select no request; screen-reader full reason and navigation;2×/landscape compact stage; Save idempotent membership. **Tests:** J02/J03; request count assertions; layout with1000-char explanation, missing cover, missing why; rendered capture light/dark+IME. Gate M4 only after RD-07 and RD-08 pass together.

## M5 — Details and personal edits

### [x] RD-09 — Movie detail composition

**Existing:** `mobile/app/title/[id].tsx`, `DetailHero.tsx`, CastRail. **Proposed:** optional `TitleActions.tsx`, `Synopsis.tsx`. **Refs:** R07/R08/R09/R18,SC03. **Objective:** clear title identity and useful action without duplicate artwork.

Single poster + metadata; Save/Watch separate; collapsible synopsis; full cast; grouped private take; accurate related/source section. Resolve provider score label from actual adapter/identity; fallback “Catalog rating” if uncertain. No schema alteration merely for a label. Preserve watch UUID lifetime and pending guards.

**Acceptance:** film Save vs Watch vs Rewatch correct; incomplete facts don't produce empty separators; one poster; private score distinct; removal reachable with existing warning. **Tests:** F17/F21–F26; watch retry/missing runtime; existing detail/library tool; J01 return; independent related/cast/detail failure.

### [ ] RD-10 — Season explorer and episode information sheet

**Existing:** episodic title branch, `Episode` type, catalog/episodes, safety/isReleased, shared tracking. **Proposed:** `EpisodeRow.tsx`, `EpisodeInfoSheet.tsx`; extracted episode section with virtualized owner. **Refs:** R10/R11/R14,SC04/05. **Objective:** usable episode progression with honest available fields.

Move progress above long sections; preserve saved statuses, seasons/specials/year groups, show30/all semantics, stable episode keys, baseline and future guards. Sheet contains only current fields and same mutation action. Preserve selected season/anchor. Never create a second independent watch writer or add Complete season without separate transactional design.

**Acceptance:** no inferred schedule or episode still; no future watch; existing progress retained on guide outage;1000-row season stays responsive; same row/sheet action yields one acknowledged event. **Tests:** future/missing dates,0-specials, anime labels, baseline holes, failed+retry UUID, watch/unwatch account switch, sheet Back; native TalkBack row actions.

### [x] RD-11 — Private rating, notes, collections and removal editors

**Existing:** title local editing state, patch/remove through library service. **Proposed:** `PersonalTitleSheet.tsx` or separate rating/note components using SheetFrame. **Refs:** R18,SC16,F21–F23. **Objective:** structured private annotations without losing controls.

Rating draft includes Unrated0 and1–10 exact integers, Save/Cancel. Notes/tags initialize from saved record; Save trims tag entries as current; do not modify unrelated fields. Favorite remains immediate acknowledged patch. Dirty-dismiss guard; error retains draft. Removal confirms associated history consequence and respects mutation pending. No public posting or new mood field.

**Acceptance:** Cancel causes zero writes; Save sends only changed allowed fields; retry retains inputs; rating scale unchanged; large notes scroll; delete cancel safe. **Tests:** test draft lifecycle and patch payload preservation, long/RTL notes, tag whitespace, failed writes, account switch; check schema/RLS unchanged.

## M6 — Search, people and Library

### [x] RD-12 — Search-first layout with progressive results

**Existing:** `mobile/app/(tabs)/search.tsx`, TitleRow, search core and source queries. **Proposed:** optional SearchScopeSheet. **Refs:** SC06,R03/R09. **Objective:** get usable results faster without changing ranking.

Compact header/field/filter; recents and all filters remain; partial-source progress one row; clear query; title/person rows use common image grammar. Do not combine source queries back into blocking Promise.all. Retain350ms and2-character semantics, account recents and local-only scope.

**Acceptance:** fast results visible while another pending; wrong-query response never shown; no false empty while loading; all six filters reachable; saved state preserved. **Tests:** existing `test_search_recovery.py`, catalog tests; failed provider, exact-person query, recent clear/account switch, IME layout, J01.

### [x] RD-13 — People profile and available filmography

**Existing:** person route, `People.tsx`, core/services people. **Proposed:** collapsible bio via shared Synopsis; optional available-credits grid presentation. **Refs:** R09,SC07. **Objective:** readable identity and independent partial results.

112dp portrait/name/facts; About; available credits with unchanged provider-qualified navigation; source links. Keep originating work context and60-work bound unless separately reviewed. No auto-resolve ambiguous name and no “complete filmography” claim.

**Acceptance:** profile stays when credits fail; unknown birth/country omitted; long names wrap; both routes Back correctly; no made-up director credit. **Tests:** existing people tests/tool, IMDb actor/TV actor/unresolved name, broken portrait, independent retry,2× text.

### [x] RD-14 — Library filters and tag collection overview

**Existing:** Library route, LibraryCard; tags and statuses derived from library. **Proposed:** `LibraryFiltersSheet.tsx`, `CollectionTile.tsx`. **Refs:** R03/R04,SC08. **Objective:** retain large artwork and expose full library organization.

All nine current scopes, search+tag intersection, updated sort and pull-refresh preserved. Apply/Cancel filters, Clear filters; tags derive collection tiles with real thumbnails/counts, no new persistence. Large text row fallback; column changes restore anchor via RD-04. Reading titles remain.

**Acceptance:** no native reading loss; same dataset produces identical filtered IDs/order before and after; empty filtered collection offers Clear; guest state remains; no public list actions. **Tests:**9 filters×representative tag/query intersections,500+ titles, duplicate works, rotation, update ordering,2× text; existing detail/library checks.

## M7 — Activity and insights

### [x] RD-15 — Date-grouped history and editor

**Existing:** activity route, useEvents/library, dates, existing watch_events update. **Proposed:** ActivitySectionList/WatchDateSheet. **Refs:** R13/R20,SC09. **Objective:** scannable log with unchanged event meaning.

Group by local day without removing event IDs/rewatches; maintain50-load-more and filters; preserve missing-title fallback. Date editor Save/Cancel uses validated YYYY-MM-DD and existing local-noon semantics. Loading/error distinct from empty. Do not introduce date-picker dependency for convenience.

**Acceptance:** one edit touches one owner event; dates consistent with Calendar/Stats; draft survives failure; pagination no duplicated/missing events; no fabricated baseline history. **Tests:** leap dates,invalid date,timezone day boundary,50/51/501 entries,rewatch,owner switch,keyboard/Back.

### [x] RD-16 — Calendar month plus agenda

**Existing:** calendar route, episodes query, dates helpers, hooks. **Proposed:** `CalendarMonth.tsx`, `CalendarAgenda.tsx`. **Refs:** R12/R13,SC10. **Objective:** chronological reference-inspired design with honest native data scope.

Preserve current scope/status rule and3-worker guide fetch; add view toggle and today control; agenda within viewed month; default agenda when day targets can't fit. Month markers use shape+color; accessible full date/counts. Day/month/scope/view state retained. No future-film/manga expansion or reminder service.

**Acceptance:** true dated episode/watch entries agree in both views;7×48 month geometry or accessible agenda alternative; partial guides visible; no year/month estimate turned into day. **Tests:** February/leap/year boundary,scope filters,timezone timestamps vs date-only guides, empty/failure,320/412/2× text, J06.

### [x] RD-17 — Truthful viewing metrics and accessible charts

**Existing:** stats route, tracking overview/activityDays/genreStats. **Proposed:** `DayActivityChart.tsx`, `ChartDataList.tsx` using existing SVG/View. **Refs:** R15–R17,SC11. **Objective:** clear insight from existing computed data.

Large Known viewing time and unknown-runtime disclosure, existing counts,14-day bars, genres. Previous/Next day48 and data list replace tiny-target dependency. Maintain range semantics and label month-boundary limitation. No donut/year heatmap/new statistical engine in core.

**Acceptance:** values equal existing shared calculations; month/all scope clear; zero not represented as positive; each datum accessible without tap precision; no OS screen-time claim. **Tests:** all unknown runtimes,rewatches,reading-only history,no selected-range events,genre overlap,2× text,TalkBack day inspection; bounded M11 motion.

## M8 — Account and secondary screens

### [x] RD-18 — You, preferences and private top-rated shelf

**Existing:** Profile route, AppProvider preferences, hooks, config, Supabase signout. **Proposed:** SettingsRow; derived top-rated selector. **Refs:** R20,V7 entry,SC12. **Objective:** useful private account home rather than unsupported social profile.

Identity/count, activity links,up to6 personally top-rated titles, appearance/haptics/rating opt-in, website/signout. Use real app version. Top-rated stable sort by rating descending then stable ID; no cloud write for shelf. Keep all settings and error paths. Condense implementation-heavy privacy prose to user-relevant copy without making new promises.

**Acceptance:** guest/pending/error/library populated correctly; settings retain values on failed persistence; sign-out failure visible; no fake0 count/followers; affinity default unchanged. **Tests:** preference queue,rapid theme toggles,haptics off,3-rating opt-in scenario,account switch,website link.

### [ ] RD-19 — Onboarding and complete auth state family

**Existing:** onboarding,auth/index,auth/callback,auth-callback service,secure-storage,showAccountLibrary. **Proposed:** shared AuthForm layout only. **Refs:** SC13–SC15. **Objective:** clear native forms and onboarding without altered authentication.

Retain two steps/Skip/guest/existing account; resize Lumi for short screens. Signin/signup/reset/recovery all get labels,keyboard-safe layout,mode-specific errors/notices. Keep OAuth gating and PKCE flow; no new account deletion,notification permission or OAuth provider. Auth successful destination stays current Library.

**Acceptance:** no password/token/code in UI logs; callback duplicate handled once; valid/expired/missing link states; one navigator;320dp/2×/IME no hidden submit. **Tests:** existing core/secure-storage/rendered auth cases; J07/J08 on native isolated account later; real email dispatch and relaunch evidence explicitly labelled, not implied from web.

## M9 — Motion

### [ ] RD-20 — Motion coherence and bounded performance polish

**Existing:** Lumi/ui/root stack and redesigned components. **Proposed:** `mobile/src/motion.ts` for reusable authored timing/easing if needed. **Refs:** M01–M12, source motion observations R05/R07/R11/R12. **Objective:** consistent response and continuity without expensive effects.

Audit all new motion against contract; cancel off-focus/background loops; no per-scroll replay; reduced motion removes displacement. Baseline same-poster native push is required. Optional enhanced M03 transform can be attempted only with a supported versioned API and bounded one-overlay implementation; fallback when measure/source unavailable. If it adds fragility/jank, omit and record, core design remains valid.

**Acceptance:** all actions interruptible; no forced loading duration; app stationary no animation churn; one success haptic; reduced-motion controls still give feedback; no gestures exclusively required. **Tests:** release-device scroll/route/Ask recordings with normal/reduced settings; memory cycles; fail-to-fallback M03; repeated tap/cancel/rotate mid-transition.

## M10 — Validation

### [ ] RD-21 — Functional, accessibility and data-integrity gate

**Existing:** `mobile/tests/*.test.ts`, tools/test_preview.py,test_search_recovery.py,test_detail_library.py; root existing tests. **Refs:** every F-row and J01–J10. **Objective:** prove preservation rather than infer it from clean screenshots.

Run from `mobile/` when executing later: `npm run typecheck`, `npm run lint`, `npm test`, `npm run export:android`. Run existing root `npm test` and `npm run check` in root. Inspect tool assumptions before rendered checks; use isolated fixture traffic only in QA. Run unchanged shared core/API tests; do not edit their expected behavior to make visual work pass. Add focused tests created in preceding B tasks.

**Acceptance:** all new regressions resolved; pre-existing failures separately evidenced; all36F rows assigned outcome and all10J journeys reported; TalkBack/2×/contrast/targets/IME pass; no accidental optional feature exposed; real catalog read-only smoke plus isolated account write smoke identified. No production database migration or live user-data alteration required.

### [ ] RD-22 — Native visual and performance acceptance

**Existing:** documented native preview build workflow and capture tooling available at execution. **Refs:** master§9,design-system§7,R mapping. **Objective:** validate actual Android experience.

Capture native before/after same route/data/theme/scale; prepare full-screen and detail crops. Cover320/360/412,landscape,600/840+,dark/light,1.0/1.3/1.5/2.0 text,long/RTL data,loading/empty/error. Document true device dimensions; don't mislabel browser viewport asdp. Record release60Hz baseline on Redmi Note12 or named equivalent. Measure missed frames,stall/frame times and20-detail-cycle memory; targets in design system. Use reference IDs to assess transferred hierarchy, not iOS pixel replication.

**Acceptance:** rubric≥21/24,each≥3,zero hard blockers; performance targets met or explicit measured remaining limitation; hardware Back/IME/session/PKCE evidence recorded. If device unavailable, gate remains unverified; do not ship a claim of complete Android QA. Batch visual corrections, then one confirmation pass of affected views; new functional failures still must be resolved.

### [x] RD-23 — Handoff and truthful project-memory update

**Existing:** docs/mobile-architecture.md,mobile-design-system.md,mobile-verification.md,mobile-progress.md and affected `docs/project-memory/` sources. **Objective:** leave evidence for future agents after actual implementation.

Record changed files, task completion,real tests/native devices,screenshots,known limits and optional work intentionally not shipped. Update only affected canonical memory sources with freshness metadata **after implementation**: PRODUCT_SPEC for B behavior,CODE_MAP for moved responsibilities,DECISIONS for chosen native visual/state decisions,KNOWN_ISSUES for actual resolved/new issues,ARCHITECTURE only if boundaries changed. No blanket memory rewrite; no credentials or personal library content. NotebookLM synchronization is a separate explicit action if desired, not silently performed by this plan.

**Acceptance:** future agent can tell implemented vs proposed vs unverified; no stale web-only claim replaces native architecture; no planning task marked “tested” without evidence; user gets concise result and residual risk. All core checkboxes have evidence references.

## Optional backlog — excluded from core milestone completion

| ID | Idea / references | What must be designed/verified first | Likely scope/risk |
|---|---|---|---|
| O-01 | Poster puzzle · S2/R21 | Accessible nonvisual equivalent,answer aliases,artwork usage rights/content sourcing,game state/scoring,placement; no fabricated content | New feature L/high |
| O-02 | Public reviews/follows/social lists · S1/S4 | Auth/visibility/moderation/data model/reporting and true social graph; private notes must not be migrated to public by default | Backend/product L/high |
| O-03 | Year heatmap/weekday/monthly charts · V7/R16 | Define period/timezone/denominators,complete event pagination,accessible data alternative,series vs rewatches; reuse shared pure helpers only after exact verification | Analytics extension L/medium-high |
| O-04 | Full website recommendation parity | Confirm separate Surprise mode,Discover-only source,3/5/10 counts,other media,history/rejection UI and native reset semantics; no accidental service mismatch | Product/controller L/high |
| O-05 | Rich episode details / trailers / availability | Verify actual public adapter fields/provider rights,identity,regional/time validity and failure behavior; extend types intentionally | Data integration L/high |
| O-06 | Voice / reminders / account deletion | Dedicated supported service/permissions/lifecycle/privacy and accessibility contracts; never copied as decorative buttons | Backend/native L/high |
| O-07 | Full native localization / reading editor | Translation ownership and RTL review; exact shared reading-history semantics and account mutations | Product extension L/high |

No O task blocks a beautiful complete redesign of the implemented application. If later authorized, create a separate requirements/acceptance packet rather than relabeling it as visual polish.
