# Reel — Android redesign master plan

**Planning only.** Prepared 2026-11-14 against source HEAD `1ea3630` and the current working tree. This document describes a proposed redesign for Sol to implement later. No application source, asset, dependency, backend, deployment or runtime behavior was changed in this planning task.

## 1. Read this packet in order

1. This master plan: scope, decisions, every screen, milestones and quality gates.
2. [Feature preservation](REEL_FEATURE_PRESERVATION.md): current truth, native/web distinctions, F01–F36 and J01–J10 regression contracts.
3. [Reference mapping](REEL_REFERENCE_MAPPING.md): all eleven supplied references, observations, timestamps and R01–R22 adaptation decisions.
4. [Design system](REEL_DESIGN_SYSTEM.md): exact roles, dimensions, type, components and M01–M12 motion contracts.
5. [Implementation tasks](REEL_IMPLEMENTATION_TASKS.md): ordered work packages and acceptance criteria.

These proposed documents govern the future native visual redesign; they do not retroactively describe the current implementation. They supersede older native visual guidance only where explicitly changed here. Stable data, security and product invariants remain binding. Website visual guidance stays unchanged.

## 2. Investigation, evidence and limits

The request asks for a cinematic Android discovery app, preserving all useful current workflows. Inspected the native routes and shared UI, theme, artwork, people, assistant, hooks, navigation, preferences and types; targeted architecture, code-map, README and verification documents; dependency manifests; historical rendered captures; all four supplied images and seven videos. No broad reading of the large website seed bundle was needed.

NotebookLM was consulted first for architectural navigation using full notebook ID `03cc1bfa-6547-4f80-96b4-be709357a773`. The exposed session had no NotebookLM MCP tool, so the installed authenticated CLI was used. Its answer was materially stale: it said there was no native application and cited old storage assumptions. Current source and current project-memory Markdown clearly establish the native app. Repository truth wins; no architecture is inferred from that stale answer. Updating/syncing canonical memory is a separate maintenance action; this task writes only the five requested planning documents.

The reference audit used timestamped representative frames plus closer 100–200 ms sequences around six transitions. All supplied files were accessible; none is marked unreviewed. Audio, finger trajectories, haptics, exact easing curves and exact source code cannot be inferred from those frames. Specific proposed durations are authored design choices. Historical screenshots under `mobile/artifacts/` are React Native Web evidence, not current physical Android acceptance. No app, build, test suite or development server was executed for this plan.

### Actual stack and architectural boundaries

| Layer | Verified implementation | Redesign consequence |
|---|---|---|
| Native client | `mobile/package.json`: Expo ~58.0.23, React 19.3.0, React Native 0.88.1, TypeScript; app version1.0.2 | Implement in existing native project; no framework rewrite |
| Routes | Expo Router ~58.0.30; `mobile/app/_layout.tsx`, five tab routes and secondary Stack routes | Preserve route identity and account-aware navigator lifecycle |
| UI | Native StyleSheet/inline styles, Ionicons, `expo-image`, `expo-linear-gradient`, SVG | Refactor presentation into reusable components without replacing services |
| Motion | Reanimated4.7.1, gesture-handler~3.3.0, worklets0.13.0 | Transform/opacity first; avoid experimental shared-element dependency |
| Data | TanStack Query5.106.1; source adapters in services; public catalog identities | Keep independent source loading, cache keys and exact identity |
| Accounts | Supabase JS2.119.0; SecureStore chunks; account query clearing; pinned writes | No schema migration or auth flow redesign required |
| Shared core | `mobile/src/core/shared.ts` imports root account/search/recommendation/tracking modules | UI must not fork rankings, episode keys or tracking calculations |
| Recommendations | Existing `/api/recommend`, complete JSON; local matching fallback | No typing stream, voice, new AI endpoint or permanent memory |
| Delivery | Existing GitHub preview APK workflow, optional EAS; website remains root SPA | Build/testing occurs later inside mobile; root working changes are not this task's property |

Versions are observed manifest values, not a recommendation to upgrade. Root `package.json` has separate current edits; `mobile/package.json` is the native dependency authority. Generated `mobile/android/` is not a source target for visual work. Cloud deployment/backend configuration is not needed for this plan.

## 3. Product audit and design problems

Current native strengths: real catalogs; a reliable single-poster detail identity; large Library covers; provider-aware actor navigation; independent search-source failure recovery; shared recommendation logic; private ratings/notes/tags; transactional watch events; two themes; original Lumi; explicit local-matching fallback.

Current visual constraints from source and historical captures:

- Repeated large serif slogans consume task space in Search, Activity, Calendar, Stats and Profile. Keep expressive type for entry moments, reduce it on operational screens.
- Ask puts several control rows above a tall transcript and renders picks as small rows inside a large bubble. The title and reason deserve a coherent foreground without losing conversational continuity.
- Personal title actions, rating chips, notes and removal create a long unstructured detail page. Group them as “Your take” while keeping tracking immediately reachable.
- Library's large covers are successful; do not replace them with the reference's tiny three-column phone grid. Improve filter clarity and preserve collection intersections.
- Calendar has weak compact-width touch geometry; Stats' fourteen separate bar targets are too narrow. Give them accessible agenda/inspector alternatives.
- Screen text such as “community rating” and “screen time” can imply unsupported services. Label actual provider scores and known logged runtime precisely.
- Native scroll/state preservation needs explicit acceptance beyond mounted-screen assumptions. The design must not remount sessions or reset grids merely to animate them.

These are source-grounded design findings, not claims that every issue was reproduced live. Sol captures the unchanged native baseline before editing.

### Scope classification

**Core visual work:** all current native screens, shared controls, layout, typography, poster handling, state/error/loading presentation and restrained motion.

**Explicit bounded behavior improvements (B):** in-memory scroll/selection restoration; Ask options/request snapshot, Cancel/Retry, Guide me entry and selected-result stage; accessible sheet editors; Continue status selector; tag-collection overview; episode information sheet from existing fields; calendar agenda view; chart inspector; derived private top-rated shelf. These do not require new backend services. Each has a task and tests.

**Optional future product work (O), excluded from core completion:** games; public reviews/social/follows; voice; trailers/streaming availability; push/reminders; full-year/weekday/monthly chart expansion; full website recommendation parity; new episode imagery/synopsis adapter fields; full native translation; reading-progress editor; account deletion service. Do not create empty navigation destinations for these.

## 4. Creative direction selection

| Direction | Visual grammar | Reference support | Product fit / risk | Decision |
|---|---|---|---|---|
| **Cinema journal** | Warm carbon/ivory, coral action, spacious poster hierarchy, restrained editorial serif, Lumi and private annotations | S3 poster emphasis; V1/V3/V5 continuity; V4 grids; S4 taste hierarchy | Builds on actual native identity, serves both cinematic discovery and precise tracking; needs disciplined heading restraint | **Selected** |
| Screening room | Near-black, neutral sans, blue signal, dense full-bleed cover shelves | V1/V4/V5/V6/V7 | Very scannable, but resembles reference app/streaming product and loses Reel's warmth | Borrow composition only |
| Social festival | Magenta/violet, expressive badges, human reactions and review feeds | S1/S2/S4 | Energetic but implies social infrastructure and promotes decorative gradients | Reject as unified product direction |

### Committed identity

Reel is a curator and journal, not a place to stream. The first viewport pairs a real title with a meaningful path into Ask. Conversation is the product's distinctive action, while library/progress make recommendations useful over time. Coral is action, mint is confirmed progress, posters carry varied color. Two strong surfaces per screen are enough: image and text, not nested cards everywhere.

Keep existing lowercase `reel.` mark and Lumi geometry. No logo replacement is required by this brief. The “cinema journal” name is design shorthand, not new user-facing marketing copy. Exact token values, adaptive rules and motion are fixed in the design-system document.

## 5. Information architecture and state contract

Preserve **Discover / Ask Reel / Search / Library / You**. You provides Activity, Calendar and Insights; Discover adds a visible “Calendar” text action alongside Continue only when relevant saved episodic content exists. Details and people are Stack destinations. Short edits are sheets anchored to existing routes. There is no new top-level Hub competing with Library.

### Navigation preservation requirements

Store only ephemeral view state keyed by account + route identity in memory: scroll anchor item ID plus offset, filter/query, selected season, expanded synopsis, selected calendar day/month/scope/view, Stats range/day, Ask request-group/active pick and transcript position. Prefer keeping routes mounted; snapshots repair remount/rotation cases. Do not serialize chat or private title snapshots to AsyncStorage. Cache-derived title data is not duplicated in the navigation store.

Opening title/person starts the new destination at top. Returning restores previous anchor and filter; if anchor was deleted, select the nearest surviving neighbor. Changing Library columns preserves anchor rather than numeric pixels. Opening a sheet preserves route state and returns focus to its trigger. Fresh search entered from a new `q` parameter is a new search context; explicit new Ask `prompt` is a new conversation by current keyed behavior. Account switch clears all private navigation snapshots.

Back order: dismiss active keyboard when OS handles it, then active sheet/dialog, then route history, then existing home/exit policy. Visible Back and system Back agree at route level. Root predictive-back setting remains as currently configured until physical compatibility is separately proven. Do not invent an edge swipe gesture that conflicts with system Back.

## 6. Shared screen specification rules

Every screen below inherits the design-system colors/type/space, 48 dp targets, safe-area/IME rules, dark/light variants and reduced-motion behavior. “Mxx” references motion contract IDs; “Rxx” references exact source mapping. Layout dimensions are dp, text values scale. State handling is part of completion, not later polish. Dependencies name existing modules; names prefixed **Proposed** are new components, not existing files.

## 7. Screen specifications

### SC01 — Discover / Home

**Current:** `mobile/app/(tabs)/index.tsx`; live discovery, mood links, Continue, optional rating-affinity shelf, banner spotlight and provider shelves. Large heading and Ask callout precede imagery. No general future-film feed.

**References:** R01, R02, R14, R19. **Goal:** choose a real title or start a meaningful Ask in one glance.

**Hierarchy and layout:** 56 dp brand/profile bar → 12 gap → short 28/34 editorial invitation (“Find your next story.”) → 12 gap → Ask entry (56 dp Lumi-free text row or 40 dp Lumi + label; total min72) → 24 gap → one real spotlight (height clamp220–280, width fill, actual banner only) → 24 gap → Continue when available → source-qualified Films/TV/Anime shelves and optional personal shelf. At viewport height <700 or large text, spotlight becomes a 96 dp poster row; Ask stays ahead of it. At 412×915 default scale, Ask and the spotlight action are both visible before scrolling. Mood chips sit under Ask only while no prompt is active and use 48 dp targets; do not force all five into a wrapped block.

Spotlight uses title28/34, two metadata facts14/20, “Explore title” action, verified dark scrim. No Play/95% match. If banner is absent, use a single poster row on solid surface rather than cropping a portrait landscape. Existing content-provider ordering stays stable. Continue cards show exact saved position; a heading control selects In progress/Watchlist/Watched locally (B). Default remains In progress. An explicit “View library” opens Library with equivalent scope only after route-state plumbing is implemented; until then preserve normal Library navigation and do not falsely claim a filter applied.

**Behavior/motion:** preserve pull-to-refresh and mood prompt navigation. M01 on press, M02 on title, M07 only on explicit status change; no auto-rotating hero, scroll parallax or shelf entrance cascade. Returned titles use real `catalog`/`library` data.

**States:** skeleton for initial catalog; show Continue even if catalog fails; partial-source note near its missing section; complete error with Retry; guest omits private shelves; personal shelf omitted until opt-in/eligibility; artwork failure keeps title/action; empty catalog offers Search/Ask, not fabricated posters.

**Dependencies:** catalog/discover, useLibrary, recommendations core, `TitleCard`/`Shelf`, Lumi; **Proposed** `Spotlight`, `ContinueCard`, section renderer. Android: one virtualized vertical owner with bounded horizontal shelves, no content behind bar. **Acceptance:** 320/412/tablet layouts meet action visibility; F01–F03 retained; status selection makes no write; labels name real provider and no streaming capability.

### SC02 — Ask Reel, Guide me and recommendation results

**Current:** `mobile/app/(tabs)/ask.tsx`, `services/assistant.ts`; one transcript, direct/guided questions, source and format chips, one/three choices, Save, regeneration, New chat. No distinct Guide Me route, no streaming, no composer Cancel button, no historical result stage.

**References:** R05, R06, R19. **Goal:** feel guided toward a real watch, with the reason visible and control retained.

**Hierarchy:** pinned56 app bar (Lumi32, Ask Reel18/24, New chat48) → options-summary row min48 (`Mix · Any watch · 3 picks`, Edit) → flexible transcript → pinned composer. Empty transcript contains display36 heading, one explanatory paragraph and three example prompts, plus `Guide me` secondary action. Guide me submits a neutral starter such as “Help me choose something to watch” into the **same** question flow; no second session or permanent preference. Show ephemeral-session explanation once. Signed-out copy distinguishes catalog matching from signed-in AI.

User messages: right inset24, surfaceRaised, padding12, radius12, body16/24. Assistant questions: full width plain content with Lumi24 label, body16/24 and answer buttons; do not surround every line with a bubble. Assistant result group: response header with exact mode, recommendation stage per design system, full grounded reason, Save/Details, alternatives. All historical groups stay in transcript; selecting their thumbnails changes only that group's active title and never calls the API. Up to three choices is default native scope. No fake third placeholder when only two qualify.

Options sheet contains source Mix / My library, format Any watch / Films / TV / Anime, result One / Three. Maintain explicit source and current value in header. During request freeze options to the captured request context; Cancel releases them. Source changes affect next request, not previous response labels. Regeneration uses last committed context; if options changed, label action “Find with these options” and create a new context instead of relabeling the old result. This is B state work and must be tested.

Composer: multiline max1200 characters, four visible lines max, 48 dp Send, local draft preserved on failure. Request state idle→pending→result/question/fallback/error/cancelled; pending has visible Cancel and truthful “Finding matches…” text, not token simulation. Abort plus monotonic sequence guard prevents late results after cancel/reset/account switch. Retry uses the same submitted request snapshot without duplicating its user bubble. New chat matches current native semantics: clears transcript/seen/request state, retains chosen source/format; fresh account/session defaults Mix/Any watch. One/three preference remains as current component state unless explicit reset is specified in a later product change.

**Scroll:** auto-follow only if within80 dp of transcript end or user just submitted; otherwise “New response” button scrolls to the group. Details/person round trip preserves draft, group selection, transcript offset, engine state and seen IDs. Phone uses a single vertical transcript; at ≥840 dp usable width, selected result is alongside chat in a 52/48 composition with separate scroll areas, but all information remains in semantic transcript order. Do not mount a second conversation controller for tablet.

**States/motion:** compact thinking row/Lumi, not three giant poster skeletons for a question; M05 result reveal only after real answer, M06 selection, M09 Lumi once per meaningful state; local fallback banner with actual error reason condensed; exhausted My library explicitly suggests changing scope, never changes it. Save error stays on pick; guest Save opens auth and current auth flow clears account-keyed chat, so do not promise automatic post-login restoration or auto-save.

**Dependencies:** existing assistant, R.session/rank/show, useLibraryAction/addTitle, account provider, AbortController. **Proposed** `RecommendationStage`, `AskOptionsSheet`, in-memory request/result-group controller, accessible Cancel/Retry. **Acceptance:** F04–F12/J02/J03 pass; no new chat persistence or API; active poster + reason accessible at200% text; no request triggered by animation/selection/Back; keyboard never hides Send.

### SC03 — Movie detail

**Current:** title route + `DetailHero` + `CastRail`; one poster; metadata/score, Save, Watch/Rewatch, synopsis/creator, personal controls and related catalog search. No trailer/public review/player UI.

**References:** R07–R09, R18, R22. **Hierarchy:** 56 dp contextual app bar → hero row (poster width min168 or42% available; 20 gap; title28/34, year/type/runtime14/20, provider score) → 20 gap → primary Save/In library and secondary Watch/Rewatch → 24 gap → synopsis → cast/creators → “Your take” → related catalog search → source link. At <360 or scale≥1.5, hero stacks with poster centered max176 and title full width. At expanded width, hero and main actions occupy left bounded column while synopsis/personal sections occupy right; preserve reading order.

Exactly **one poster** in hero. Do not regress the recent 1.0.2 fix by adding a huge duplicate poster background. Original landscape banner may be used only in Discover; title hero stays poster-led. Score labelled by actual source; personal rating is separate. Synopsis collapses at five lines with explicit Read more/Show less; creators shown only when present. Cast uses full names and portrait rail. Related heading is “Keep exploring”, subtitle “Related catalog search”; not “More from this franchise”.

“Your take” contains favorite, current private rating, Notes & collections. Move long rating chips/editor into sheet; leave current value visible. Save = membership, Watch = dated event, Favorite = private flag; never conflate. Remove is in explicit More menu and still warns it removes watch history. Missing private membership offers add first, consistent with current behavior. Do not fabricate review count or review text.

**Motion/state:** M02 baseline; M03 optional later; M12 synopsis; M08 acknowledged watch/save. Cached seed shows instantly while detail refreshes; independent detail error preserves saved fields; partial cast/related failures keep rest; unknown score/runtime/year omitted or plainly unavailable. Pending write disables relevant mutation controls; failure retains prior truth and retry ID.

**Dependencies:** titleDetails, sameWork, library mutations, artwork recovery, CastRail. **Acceptance:** F17/F21–F26; full poster is inspectable, no duplicate title-in-placeholder, no accidental watch on card tap, auth failure no success toast, Back restores originating context.

### SC04 — TV/anime detail and season explorer

**Current:** same title route, episodic branch; season chips; released watched count; first30 then Show all; watch/unwatch; saved status chips. TVMaze dated guide; some Kitsu-only guides absent.

**References:** R10, R14. Inherit SC03 hero/metadata/synopsis/cast/private sections, but place **Your progress before long synopsis/cast**: next available episode when derivable → watched released count/known total → season selector → episode list. Progress bar3 dp uses actual watched-set count, not current episode number; unknown totals show no percentage. Keep all saved statuses Watchlist/Watching/Paused/Waiting/Dropped available; do not add a fake Finished batch action.

Season heading22/28; selector48 targets, horizontal scroll, year-like labels preserved. Episode row min88, left text flex, 12 gap, trailing48 watch target; identity16/24, name16/24, release/runtime14/20. Full row title opens SC05; trailing Watch/Undo never triggers row navigation. No episode stills because current type lacks them. Future rows say Airs date; missing date says Date unavailable, action guarded by existing release rule. Specials season0 is valid. Use shared `tracking.episodeLabel`, not hand-built numbering for anime.

**States:** missing guide leaves existing saved progress visible; retry guide independently; saved guide failure does not zero progress. For long seasons use virtualized data with existing Show all/Show fewer semantics; preserve selected season and anchor when toggling or returning. M07 season changes, M08 watch state, no full-page progress celebration. Android: controls remain usable at2× text; no nested vertical FlatList inside Page ScrollView.

**Dependencies:** `episodes`, `isReleased`, watchedSet/baselineKeys, transactional watch service. **Acceptance:** F18–F19/J05/J06; no future watch, no synthetic dates, no legacy baseline lost, exact season/episode keys retained; zero,30,31 and1000-episode cases do not freeze.

### SC05 — Episode information sheet (explicit new presentation)

**Current:** no dedicated episode route. **References:** R11/R12. **Proposed:** sheet within title route, not a new URL requiring invented global episode IDs. Header show name and Close; series name14/20; episode label18/24 and full title22/28; release date/runtime; watched status; Watch/Undo action; “Open series” unnecessary because underlying route is already series.

Padding20, gap16, content-driven height max85%; no tall image slot, synopsis, actor list or social stats unless provider adapter later gains verified fields under separate O task. Use available `Episode`/parent Title and the same mutation controller. Opening performs no new watch mutation and need not fetch unsupported metadata. Pending mutation/error shown in sheet; Back restores exact episode row focus and season. M04 only; do not implement reference's entire expanding episode dashboard.

**Acceptance:** correct series+season+number; sheet works for special0, unknown runtime/date and long title; no unseen data fields; no second request UUID for same retry; accessible dismiss without swipe. Dependency SC04 and common sheet primitives.

### SC06 — Search and filtering

**Current:** native search route has title/people results, six scopes,350ms debounce, ≥2char query, independently loading sources, account recents. **References:** R03/R09 for row/image grammar; interaction primarily derived from existing product, not invented from a search video.

**Layout:** app bar Search56 → labeled search field56 with clear48 → active-scope chips/Filters48 → result list flex. Remove oversized two-line slogan. Empty input shows Recent searches (max8) with Clear action and one concise hint. Results use64×96 poster,12 gap, title16/24, metadata14/20, saved badge; people use56 circle where already available or initial, full name and known role. Scope options remain All, Films, TV, Anime, People, My library. Filter sheet is optional presentation for narrow/large-text layouts; keep active scope visible.

**Interaction:** do not change search normalization/ranking/dedupe, exact-person ordering or local-preferred records. Clear cancels stale visible context; changing query/filter must not show old-query results. Search submit remembers term as current behavior; visual changes must not silently start retaining every keystroke. Library-only performs no catalog title call. Main results visible as each provider finishes; inline “Searching remaining sources” occupies one short row, not a blocking overlay.

**States/motion:** idle/recent, initial loading, partial loading+results, partial failures, all-failed Retry, true empty. M01/M02, no stagger per result. Keyboard stays until user chooses result or dismisses; Back/clear actions have predictable priority. Text errors say which source failed, do not claim no matches prematurely.

**Dependencies:** current search route, titleSearchSources/searchPeople, query hooks, shared search core, TitleRow/Portrait. **Acceptance:** F13–F14/J01; fast type/cancel tests; 320dp/IME/200%; saved title opens saved private record; people accessible separately.

### SC07 — People: actors and directors

**Current:** `mobile/app/person/[id].tsx`; provider-qualified seeded profile; portrait/name/country/birthday, biography or role, max60 available credits, independent retries/source links. Director completeness depends on provider; no separate guaranteed director service.

**References:** R09, S3 cast. **Layout:** app bar People56 → portrait112 +20 gap +name28/34/role14/20; stack at320/large text → factual biography (5 lines collapsed) → “Available credits” shelf or expanded grid using same real works → source links. Full names, optional country/date only if available; no computed age when death/date completeness is not verified. Originating-title context remains available with partial credits. “Ask about their work” may prefill a named-person request via existing Ask route as B only if tested; core plan keeps existing search/detail actions, so this extra shortcut is optional.

**States/motion:** profile pending displays seed identity; portrait fallback fixed; credit error doesn't hide biography; biography error doesn't fabricate identity; no credits = explanation + source link. M02 and M12. Android: circular crop not a decorative button; filmography virtualizes beyond initial shelf. **Dependencies:** `core/people`, people service, Portrait, openTitle/openPerson. **Acceptance:** F25/J01, same-name ambiguity never chooses wrong actor, long Arabic names wrap, independent retries, exact Back origin.

### SC08 — Library and private collections

**Current:** larger responsive grid, title query, nine status/favorite scopes, tag filter, updated order; guest auth state; no public lists. **References:** R03/R04/R18. **Layout:** Library28/34 + real count14/20 → search56 → compact active-filter summary + Filters → optional collection strip → grid. Grid uses2 columns at compact widths,12 gap, metadata outside poster; three lines title, status and private rating. Large text becomes one-column rows. Filters sheet exposes **all** existing statuses and tag choices with current intersection; Apply/Cancel affects only view state. Clear filters is always reachable.

Collection overview is derived from existing `tags`; tile = name18/24, count14/20, two small real cover thumbnails. Tap applies existing tag filter, shows collection name and Clear; no new collection ID, public sharing or nested list persistence. Empty collection data doesn't invent preset genres. Preserve updated-desc sort; no new drag-reorder behavior on native from website assumption.

**States:** loading count uses placeholder, not0; refreshing preserves list; error retains loaded titles; no saved titles offers Search; filtered empty offers Clear filters, not only Discover. Guest gives Sign in and explains same existing account. M07 applied filters; no rearrangement animation for hundreds of cards. Android: column change restores anchor and does not reset filter;2× text rows still expose every action.

**Dependencies:** useLibrary, LibraryCard, TitleCard/Artwork, existing tag/status logic; **Proposed** LibraryFilters/CollectionTile. **Acceptance:** F15/F16/F22, all statuses and reading entries remain, collection+status+query intersection exact, filters never patch metadata, large library remains responsive.

### SC09 — Activity / watch history

**Current:** `mobile/app/activity.tsx`; movies/episodes/rewatches,50-item pages, date editor; no native reading events. **References:** R13 date rhythm and R20 recent activity hierarchy. **Layout:**56 app bar →28/34 heading “Your watch history” → All viewing/Movies/Episodes scopes48 → date-grouped SectionList. Date heading14/20 semibold with subtle rule; each event64×96 poster + title16/24 + episode/rewatch14/20 + Edit date48. Grouping is presentation only; no event collapse/deduplication that erases rewatches.

Date editor sheet shows current day, persistent “Watch date” label, validated YYYY-MM-DD field, Save/Cancel. A native date picker requires dependency verification and is not mandatory; don't add uninstalled picker. Preserve local-noon conversion used by current service. Don't auto-submit on date change. Pending/error retain editor and input. Missing title still shows event identity/time, not blank space.

**States/motion:** loading/error never show “first watch” until history resolves; empty explains undated progress excluded; Load more50; pull-refresh; M04 editor, M08 date save, no row flyout on refetch. Android: keyboard-safe editor, TalkBack date readout, Back discard protection. **Dependencies:** useEvents/useLibrary, assertAccount/supabase update, dates helpers. **Acceptance:** F27/J05, leap/month/timezone cases, repeated watches remain distinct, editing one event changes no others, anchor preserved on pagination/return.

### SC10 — Calendar / upcoming episode agenda

**Current:** real month grid with selected day, episode release markers and logged watches; tracking-status scope; guides loaded with3 workers. **References:** R12–R14. **Layout:**56 app bar → month/year with Previous/Next48 and Today48 → Month/Agenda segmented control → Tracking now/All saved series scope → month grid when it fits → selected-day chronological entries. Agenda groups actual dated items by date with52 dp left rail (day24/28, weekday12/16) +12 gap + content. At narrow320 default to Agenda; at normal widths retain Month as default. Use actual dated data within current viewed month, not an invented endless future feed.

Month grid min48×48 day targets; Today outline, selected fill; release marker diamond, watched marker dot with legend (shape+color). Screen-reader date label includes full date and counts. Selected date persists when switching Month/Agenda; month navigation selects first valid day if existing day outside month, matching existing behavior. Agenda day selection exposes that day's releases and watch records. Release row has poster48×72, title, exact episode label, date; no series art reused as fake episode still. Distinguish “Episode release” from “Watched”. No reminders button.

**States:** partial guide warning with count, no date estimates; library/events/release query errors localized; retain successfully loaded guides; selected empty day helpful; missing library invites Save titles. M07 view/scope change; route M02. Calendar future-film/manga expansion remains O. **Dependencies:** episodes, localDay/monthBounds, current status filter, useEvents; **Proposed** CalendarAgenda. **Acceptance:** F28/J06; correct date-only semantics, DST/month bounds,3-worker limit retained, marker contrast, no narrower-than48 touch target, no fake availability.

### SC11 — Insights / statistics

**Current:** month/all, four summary metrics,14-day bars, top-six genre bars; no reference heatmap/year/weekday charts. **References:** R15–R17. **Layout:**56 bar → range selector → large Known viewing time36/42 with “From logged titles with known runtimes”14/20 and unknown-runtime count → three compact metrics films/episodes/active days (wrap2+1 or stack at large text) →14-day activity panel → genre ranking. Use surface blocks for metrics only; charts on canvas with clear axes/labels.

Fourteen day bars remain proportionate and zero values visible as zero, not a decorative nonzero bar. Provide selected-day summary, Previous/Next day48, and “View data” text list; visual bars can be decorative or larger group hit target, not14 tiny buttons. Period label explains month scope; preserve existing computation at month boundaries. Genres keep counts and horizontal bars, no donut implying exclusive category percentages. No peak-hour, weekly comparison or invented streak until separately implemented.

**States:** initial loading skeleton metrics, error with Retry, no dated events vs no events in selected range, missing genre data note, unknown runtime disclosures visible. M11 range animation ≤200; numbers change immediately, no count-up. Android: chart readout announces day/count, accessible list covers every datum; tablet charts max680 wide. **Dependencies:** tracking.overview/genreStats/activityDays, dates, useEvents. **Acceptance:** F29, metrics agree with event fixtures, rewatches/unknowns/reading exclusions unchanged, all chart information available without sight or precise tapping.

### SC12 — You / private profile and settings

**Current:** profile route combines account, links, preferences, privacy text and sign-out; no editable public profile/follows. **References:** R20 and V7 profile entry. **Layout:**56 heading “You” → initials avatar56 + account email/title count → three activity destinations in simple divided rows min56 → optional personal Top rated shelf (up to6 saved rated titles, rating desc then existing stable ID tie-break; label Your ratings) → Appearance, Haptics, Use ratings switches → concise privacy/help → website link + sign-out.

No fake name, biography, followers or media percentage. Account email wraps and can be copied only via deliberate future control; not needed now. Appearance retains After dark/Matinee/System but also accessible Dark/Light meanings. Ratings copy retains opt-in and native eligibility. Privacy copy is user-relevant (“Your notes are private. Chats stay in this session.”); do not put build keys or database implementation into main flow. App version comes from actual config/package rather than hardcoded1.0.0.

**States:** guest Sign in/Create account, no private shelf; loading count placeholder; settings write error inline and old value retained; sign-out pending/error; unknown library never shown as0. Motion limited M01/M08. Android Switch semantics remain native, local preferences unchanged. **Dependencies:** AppProvider,setPreferences,hooks,supabase signOut,config. **Acceptance:** F30/F33/F35; successful signout clears private surfaces; website opens correct origin; Top rated doesn't create new preference model or public exposure.

### SC13 — Onboarding

**Current:** two steps with Lumi, Skip, guest discovery and existing account path. **References:** no direct onboarding reference; retain original product identity, R06 restrained personality. **Layout:** brand/Skip56 → Lumi max144 (reduce to80 on short viewport) → step label12/16 → display36/42 heading → body16/24 → primary52 → account link48. Use actual two-step purpose: discover by intent, then save/track privately. No artwork collage without licensed/local source plan; original Lumi is enough.

Keep two steps and Skip from first; second provides Start discovering and existing account route. No preference questionnaire or forced sign-in. M09 one greeting,140ms crossfade between steps; reduced instant. Safe-area footer, scrollable if large text/IME. Error completing preference save stays visible and does not mark onboarding done prematurely. **Dependencies:** current preferences/router,Lumi. **Acceptance:** F31;320×640/2× text, skip/return, guest use, no permission request or network dependency.

### SC14 — Sign in / create account / reset password

**Current:** auth modal has signin/signup/reset, optional configured Google, existing Supabase and redirect behavior. **References:** typography/control system; no auth behavior inferred from references. **Layout:**56 Back header → small Lumi48 optional → headline28/34 → short mode copy → labeled Email56 and Password56 where required → error/notice → primary52 → mode links48; form max480 centered on tablet. Keep Submit visible with keyboard or reachable by scroll. Password uses secure entry/autocomplete, email keyboard/autocorrect off. Do not hide password rules behind placeholder.

States: idle/pending/error/confirmation email notice; reset success communicates email flow; retain entered email on retry; do not echo password in error/logs. Provider buttons shown only when actual config enables them, not because reference uses social auth. Existing successful auth routes to Library and clears account-keyed conversation; preserve single navigator. M04 modal where supported, M01 controls, no success confetti. **Dependencies:** supabase auth, completeAuth, config, showAccountLibrary. **Acceptance:** F32/J08; invalid email/signup short password, reset, provider cancellation,2× text/IME, no duplicate stack, no falsely promised automatically saved pick.

### SC15 — Auth callback / recovery

**Current:** `/auth/callback` exchanges code, guards duplicate URL, recovery password form and Back to sign in. **Layout:** compact progress row + explicit “Completing sign-in”; success navigates as current; recovery title28/34, labeled new-password56, Save52; failure explanation and Back48. This is a functional screen, not blank animated splash. No auto-dismiss of recovery before save succeeds.

M09 optional static Lumi, no motion delays for code exchange. Accessibility announces completion/error once; screen keyboard/safe areas match auth. **Dependencies:** auth-callback, SecureStore/session service, showAccountLibrary. **Acceptance:** duplicate/expired/missing URL, recovery8-char validation, interrupted network, real email deep-link dispatch on native later; no token/code displayed in diagnostics/screenshots.

### SC16 — Global overlays, editors and empty states

**Current:** shared `ui.tsx`, native remove Alert, inline notes/date/rating controls, error/loading components. **References:** R12/R18. **Proposed:** common SheetFrame, ConfirmDialog, InlineNotice, FeedbackSnackbar; native dialogs remain appropriate for destructive confirmation. Rating sheet: Unrated plus1–10 buttons, ≥48 targets, selected numeric value large, Save/Cancel (draft semantics B). Notes sheet: explicit Private notes multiline, Collections comma-separated, Save/Cancel, discard protection. Filters sheet: active choices and Apply/Clear; no writes. All use system-back handling and focus restoration.

Empty/loading/error examples: missing artwork icon; absent synopsis plain note; guide unavailable with preserved progress; source partial failure beside successful results; signed-out library with Sign in; no filtered titles with Clear filters. Never show skeleton for permanent unsupported data. Notification/privacy settings for absent services are not disabled fake controls.

**Acceptance:** every overlay closes by explicit button and Back without losing acknowledged data; pending write cannot silently succeed after account change in new account UI; focus returns to opener; minimum target/contrast/text-scale checks; no multiple simultaneous sheets.

## 8. Milestones and dependencies

| Milestone | Depends on | Outcome and exit gate |
|---|---|---|
| M0 Baseline and evidence | None | Native screen/state inventory, unchanged-build captures and F-matrix; known failures recorded, not hidden |
| M1 Design foundations | M0 | Tokens, type, controls, layout/insets, state primitives in both themes; small-screen/2× text checkpoint |
| M2 Navigation/common media | M1 | Existing tabs/Stack, rail adaptation, poster/cast primitives, state restoration; J01/J09 passes |
| M3 Discover | M2 | Real-data cinematic home with explicit Ask and Continue; compare R01/R02, partial-data gate |
| M4 Ask | M2 | Single conversation/stage, options snapshot, cancel/retry, privacy and restoration; J02/J03 gate |
| M5 Title/episode detail | M2; integrate M4 return | Movie, TV/anime and episode sheet; tracking and private edits preserved; J05 gate |
| M6 Search/people/library | M2; integrate M5 | Search recovery, people independent errors, all library filters and collections; J01/J04 gate |
| M7 Activity/calendar/insights | M5,M6 | Real event/date views and accessible charts; J05/J06/data truth gate |
| M8 Account/onboarding/secondary | M1,M2; integration with M4–M7 | Auth, settings, guest and callback lifecycle; J07/J08 gate |
| M9 Motion polish | M3–M8 | Baseline functional motion already exists; refine timing, optional M03 only after profiling; reduced-motion gate |
| M10 Validation/handoff | All core milestones | Native visual/functional/performance evidence and explicit residual risks; no feature loss |

M3 and M4 may be developed independently after shared foundations, but Sol should integrate one screen family at a time to keep shared component changes reviewable. Core motion and accessibility are built with components; M9 is refinement, not a deferred usability phase. No backend migration or dependency upgrade is on the critical path.

## 9. Visual and functional quality assurance

### Baseline and comparison protocol

Before edits, Sol captures current native app on a documented device/emulator with fixed viewport, font scale, theme and test-account dataset. Save a screenshot manifest: route, state, data IDs, theme, dp dimensions, pixel dimensions, device/OS, build revision, font scale and capture time. Avoid recording credentials, private notes or personal email in shared artifacts; use isolated test accounts/fixtures for reproducible images. Fixture tests do not replace a separately labeled real-data smoke test.

For each screen family, capture before/after at identical state and device. Compare composition and behavior against reference IDs, not literal iOS pixel copying. Use side-by-side at full resolution plus crops for header/action region, poster rendering, text and navigation. Check one batch across standard/compact/large text/light; fix findings together; recheck affected views once. Functional regressions require their own resolution even after visual review budget ends.

### Device/state matrix

| Axis | Required coverage |
|---|---|
| Compact phones | 320×640 logical stress case,360×800,412×915; record actual native capture geometry |
| Landscape/tablet | ~915×412,600dp medium,840+ usable-width expanded; resize and return to original orientation |
| Text | 1.0/1.3/1.5/2.0 OS scale; long title,1000-character reason,10000-character private note (within backend acceptance), multi-line error |
| Language | Real Arabic/French/long Latin titles; pseudo-localized +30% controls; RTL layout smoke check. No claim native translations already exist |
| Themes | Dark, light, system change while screen open; spotlight keeps readable overlay; dialog/IME consistent |
| Access | TalkBack, keyboard focus,48dp targets, no duplicate poster narration, reduced motion, haptics off |
| Data | Guest, signed-in empty, full library, missing images, missing dates/runtimes/scores, partial source failure, offline/retry, large history |
| Hardware | Release-mode Redmi Note12 or equivalent; gesture and3-button navigation; weak network; physical frame pacing |

### Objective rubric

Score each0–4 with evidence. 0 missing/broken,1 major flaws,2 usable with material defects,3 meets contract,4 exceeds without violating constraints. Required overall ≥21/24 and every dimension≥3; hard failures below override score.

| Dimension | Observable pass at3 |
|---|---|
| Visual hierarchy | One clear primary action per region; title/why/metadata distinguishable; essential first-viewport actions meet SC01/SC02 rules; no repeated giant operational slogans |
| Usability | J01–J10 complete; all existing filters/actions discoverable; errors recoverable without data loss; no hidden gesture-only action |
| Consistency | All colors/type/spacing from system; same poster ratios, controls and back behavior; dark/light no accidental mismatches |
| Distinctiveness | Reel coral/Lumi + restrained editorial entry + recommendation stage recognizable across Discover/Ask/You; no unsupported streaming/social chrome |
| Accessibility | Normal text4.5:1, targets48dp, full workflows at2× text and TalkBack, reduced motion, accessible chart alternative |
| Performance/data truth | Native release frame target met or bounded waiver with evidence; no fabricated facts/data; source failures remain independent; no request duplication from animation |

Hard release failures: account/private-data leak; dropped existing feature; duplicate watch event; future episode falsely marked released; broken Back loop; hidden keyboard action; inaccessible core control; invented streaming/social feature; persistent chat leak; crash; tests changed to mask a behavior regression. Cosmetic score cannot compensate.

### Required verification evidence

Sol runs native typecheck/lint/unit tests/export and existing root checks as documented in task file. Rendered React Native Web tests are useful contract evidence but must be labelled web-only. Capture native screenshots and interaction recordings of Ask selection/detail-return, episode watch/undo, calendar/agenda, search partial-source return and auth Back. Run release-device performance scenarios; report real observations rather than “smooth” from desktop preview. Live public catalog verification does not require a production write; account/write checks use authorized isolated accounts and are explicitly identified.

## 10. Risks and decisions Sol must not improvise

| Risk | Decision / mitigation |
|---|---|
| Old documentation contradicts native source | Use native source and this dated audit; do not implement a WebView or remove mobile |
| Reference suggests unavailable services | Follow O list; omit controls, do not stub them with fake data |
| UI extraction changes mutation semantics | Keep service/controller boundaries; regression-test before visual polish; reuse request IDs |
| Long transcript/image memory | Virtualize/bound visible stage content; preserve group data in memory; never persist chat as workaround |
| Shared-element fragility | M02 baseline; M03 optional gated enhancement; no dependency upgrade to chase reference effect |
| Large text compromises cinema layout | Reflow to rows/stack; readability wins; preserve core actions |
| Provider failure looks like empty account | Separate loading/error/empty and partial source states; keep loaded data |
| Root pre-existing package changes | Do not revert, install or resolve them as part of redesign; run commands later in mobile workspace |
| Native full-bleed/system bars | Test actual edge-to-edge/IME; no transparent controls over busy art without scrim |
| Scope expands into new backend work | Stop that feature at honest available data; O tasks require separate scope, not a hidden redesign dependency |

Implementation details to verify at M0: exact current branch/working changes at execution time; availability of installed native device/test toolchain; actual viewport/insets on target Redmi; versioned Expo/Reanimated support for chosen APIs; any existing screenshot artifacts stale against new baseline; score source provenance when merged records combine catalogs. Defaults are specified above, so these checks do not reopen the visual direction.

## 11. Completion definition

All core task IDs complete; every existing native route and state covered; F01–F36 accounted for; J01–J10 pass or a specifically documented pre-existing limitation remains with user-visible honesty; no application mock data shipped; both themes and adaptive/accessible layouts verified; native performance evidence recorded; all B changes explicit; O features not accidentally exposed. Sol hands over changed-file list, before/after evidence, test/device results, remaining known limitations and updated affected canonical memory only when implementation actually changes product behavior. Planning documents alone are not implementation acceptance.

### Research notes

Planning packet integrity check: all five requested documents exist; sibling-document links resolve; SC01–SC16 and RD-00–RD-23 are present; no unresolved RD task identifiers; Git status adds only these five planning documents relative to the observed pre-existing changes. Token contrast calculations were performed for key opaque pairs. This is documentation verification, not application test/build/device evidence. Existing Impeccable context also reports a web-only PRODUCT platform description and stale design sidecar; neither was repaired as a side effect of planning.

Design values are authored for Reel. Android target/contrast guidance was checked against [Android accessibility](https://developer.android.com/guide/topics/ui/accessibility/apps); inset requirements against [Android edge-to-edge](https://developer.android.com/develop/ui/views/layout/edge-to-edge); motion behavior against [Reanimated accessibility](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/). These inform platform constraints, not a recommendation to replace React Native with Compose. Native gesture/frame-performance claims still require device evidence.
