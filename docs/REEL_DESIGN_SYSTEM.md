# Reel — Cinema journal design system

Date: 2026-11-14. **Proposed native Android contract**, not implemented tokens. Applies to `mobile/`; root website `DESIGN.md` is not replaced. Source baseline `1ea3630` plus working tree. Read with [master plan](REEL_REDESIGN_MASTER_PLAN.md), [reference mapping](REEL_REFERENCE_MAPPING.md), [tasks](REEL_IMPLEMENTATION_TASKS.md), [preservation](REEL_FEATURE_PRESERVATION.md).

## 1. Visual thesis

A private cinema journal with an intelligent curator inside it. Posters provide the spectacle; typography and spacing provide the structure; coral marks action; Lumi makes the assistant recognizable. One large image can earn attention, but every first viewport must also expose a useful action. Discovery is expressive. Search, logging and account screens are restrained tools.

Signature: **the recommendation stage**. A real result takes the visual foreground within the conversation; its explanation follows immediately, and alternative picks remain reachable without losing the user's request. This is a presentation of the real answer, not a streaming-player carousel or a separate chat product.

Use native primitives and the existing installed stack. No new component suite, blur package, chart package, font downloader or shader runtime is required. Proposed new components below are not claims of existing files.

## 2. Color roles

Keep current native palette as the continuity anchor, with stronger control boundaries and explicit extra roles. Do not import the website's cobalt system into Android. `useTheme()` resolves all roles; no screen-specific raw colors except documented image scrims and original Lumi artwork.

| Token | After dark | Matinee | Use |
|---|---|---|---|
| `canvas` | `#101113` | `#F3EFE5` | Root background |
| `surface` | `#1A1C20` | `#FFFCF5` | Sheets, fields, selected content region |
| `surfaceRaised` | `#23252A` | `#E7E1D7` | Secondary buttons, quiet chart tracks |
| `surfaceHigh` | `#2B2E34` | `#DDD5C9` | Pressed neutral, nested selection |
| `text` | `#F3EFE5` | `#191A1D` | Main text |
| `textSecondary` | `#B9B6AF` | `#626267` | Body metadata, helper copy |
| `textQuiet` | `#A6A7AB` | `#626267` | Nonessential metadata; still readable |
| `divider` | `#34363C` | `#CFC8BE` | Decorative separators, not sole control boundary |
| `outline` | `#777A82` | `#79746C` | Essential field/control boundaries |
| `accent` | `#FF654F` | `#A82D1E` | Main action, selected state |
| `onAccent` | `#18100E` | `#FFFFFF` | Text/icons on filled action |
| `accentPressed` | `#F07866` | `#8F2519` | Pressed filled action |
| `accentContainer` | `#3B2422` | `#F6D8CF` | Selected tabs/chips, bounded tint |
| `onAccentContainer` | `#FFB5A6` | `#742015` | Container text |
| `success` | `#A6CBB4` | `#35654D` | Confirmed save/watch; never pending |
| `warning` | `#E6BC78` | `#7C5316` | Partial data, explicit caution |
| `danger` | `#FF9585` | `#A82D1E` | Failed/destructive action with icon + text |
| `focus` | `#F3EFE5` | `#191A1D` | 2 dp focus ring, 2 dp offset |
| `onImage` | `#FFF9EF` | `#FFF9EF` | Text on verified dark scrim |
| `imagePlaceholder` | `#23252A` | `#E7E1D7` | Reserved image geometry |

Disabled control: retain shape, remove press affordance, use text at 60% opacity; disabled text is never used for explanatory information. On-image text uses a black scrim in both themes. Main labels do not change with artwork colors. Success and error have different icons/text even where hue is not perceived.

**Contrast gate:** calculate final composited values, including scrims and pressed states. Target 4.5:1 for normal text, 3:1 for large text and meaningful nontext control graphics. Selected state also uses check/underline/shape. Thin divider is decorative only. Sol must verify combinations; palette selection alone does not certify an entire screen. These thresholds follow [Android accessibility guidance](https://developer.android.com/guide/topics/ui/accessibility/apps).

Planning-time relative-luminance checks: dark secondary/surface 8.43:1; dark quiet/raised 6.38:1; light secondary/raised 4.66:1; dark onAccent/accent 6.46:1; light onAccent/accent 6.86:1; dark outline/surface 3.97:1; light outline/surface 4.53:1. These verify those exact opaque pairs only, not composited artwork, disabled states or every rendered combination.

### Artwork gradients

- Spotlight: `rgba(0,0,0,0)` at 0%, `rgba(0,0,0,0.12)` at 35%, `rgba(0,0,0,0.78)` at 72%, `rgba(0,0,0,0.94)` at 100%. Text block sits in last 28%; if text wraps above it, increase solid lower region rather than lowering font size.
- Optional detail atmosphere: one fixed `accentContainer` patch behind poster, opacity .35 dark / .55 light, max height 280 dp; no image duplication or per-frame color extraction. Default is solid canvas.
- No blurred copy of a portrait as a banner. Only actual `banner` data may produce a landscape spotlight. No banner available means poster-led solid layout.
- Never stack gradient, blur, shadow and a border around the same poster.

## 3. Typography

**Final choice for core implementation:** Android system sans for body, labels, headings and metadata; retain platform `serif` only for Discover's short invitation, Ask empty-state heading, and onboarding. This is an intentional editorial accent, not a replacement body font. It requires no new font asset and respects the current native implementation. No fonts are installed in this planning task.

If later brand work needs identical serif metrics across devices, use a separately reviewed bundled serif asset; do not let Sol silently substitute a downloaded font during this redesign. System fallback remains the acceptance baseline. Arabic/non-Latin text uses Android fallback; do not force Latin serif metrics or uppercase transformations onto it.

Sizes are logical React Native fontSize values with Android scaling enabled, intended as sp-equivalent. Never set `allowFontScaling={false}` to fit a layout. Line height is the base, scales with text. Use actual supported font weights and test Android synthetic weight output.

| Role | Size / line height | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | 36 / 42 | serif normal | -.5 | One short invitation, max two lines at default scale |
| `headline` | 28 / 34 | sans 700 | -.3 | Title name, primary page heading |
| `section` | 22 / 28 | sans 700 | -.2 | Shelf/section heading |
| `title` | 18 / 24 | sans 600 | 0 | Result title, dialog heading |
| `body` | 16 / 24 | sans 400 | 0 | Synopsis, reasons, chat, forms |
| `bodyStrong` | 16 / 24 | sans 600 | 0 | Actions and key facts |
| `meta` | 14 / 20 | sans 400 | 0 | Year/type/status, chart labels |
| `label` | 12 / 16 | sans 600 | .5 Latin only | Optional source overline; never long prose |
| `metric` | 36 / 42 | sans 600 | -.5 | Known viewing time; use tabular numerals if supported |
| `nav` | 12 / 16 | sans 600 | 0 | Persistent visible navigation labels |

No all-caps multi-line back headers. Use “Movie”, “Series”, “Activity”, not “A FILM FOR YOUR COLLECTION”. Do not force title names into slogans or manually authored line breaks. Library names: up to three lines normally; full accessible name always available; at text scale ≥1.5 use rows and uncapped titles. Essential reasons and errors never truncate. Synopsis: five lines with “Read more”; expanded text stays open on return.

## 4. Space, geometry and adaptive layout

Spacing scale: `2, 4, 8, 12, 16, 20, 24, 32, 40, 48`. `2` is optical/icon detail only. Page gutter 20 dp; narrow <360: 16 dp. Section gap 32; heading-to-content 12; adjacent controls 8; poster gap 12; paragraph gap 12. Divider inset equals page gutter. Avoid an enclosing card around every section.

Radii: poster 10; small image 8; button/field 12; result stage 16; sheet upper corners 20; circular people and avatars 50%; pills only for compact selections and mode controls. Corner radii stay fixed across devices, not proportional to viewport. Flat surfaces use tonal separation, with no shadow except elevated sheet/dialog (native elevation 6 as initial proposal; verify on hardware).

| Available width / condition | Layout contract |
|---|---|
| 320–359 dp | 16 dp gutters; 2 poster columns except large text; stacked detail header; single recommendation stage; calendar agenda default because seven 48 dp day targets cannot fit |
| 360–599 dp | 20 dp gutters; 2 large Library columns; 136–156 dp shelf posters; bottom nav; detail poster + title if readable |
| 600–839 dp | 24 dp gutters; 80 dp navigation rail; Library 3 columns in remaining content width; centered forms max 480; one-column Ask at content widths below 840 |
| ≥840 dp usable content | Rail; body max 1200 centered; Ask conversation 52%, results 48% with 24 dp gap; detail hero + information column; Library 4 columns maximum |
| Height <600 dp or text scale ≥1.5 | Compact app bar, collapse Ask options into button, no tall empty hero, preserve composer; Library one-column image/text rows; detail poster above text; metric tiles stack if needed |

Compute columns from **usable content width after insets/rail/gutters**, not window width. Grid formula: `(contentWidth - (columns-1)*12)/columns`; poster ratio 2:3. Do not stretch beyond 220 dp wide; center remaining space or use rows. Tablet text column max 680 dp. Hinge awareness is a verification item; no content spanning an occluding hinge. Split-screen uses current dimensions without restart.

Calendar month grid needs 7×48 = 336 dp of tappable content. At 360 dp viewport use 12 dp grid-only side gutters; at 320 dp use accessible agenda and optional horizontally scrollable month grid with clearly labeled full weekday names for accessibility. Never solve by overlapping hit slop or 40 dp day targets.

48×48 dp minimum interactive targets. Visual small icons can sit inside those targets. Adjacent icon controls have nonoverlapping target regions; use at least 8 dp gap where practical. Charts with tiny visual bars are not individually tiny touch buttons: provide a 48 dp Previous/Next day inspector and an accessible data list.

System bars, cutouts, bottom navigation, sheets and IME each have one inset owner. Main pages use safe-area context. Full-bleed imagery may extend behind status bar; text/controls cannot. Composer bottom follows IME and must not add bottom-bar inset twice. Android edge-to-edge behavior must be checked on device; [official guidance](https://developer.android.com/develop/ui/views/layout/edge-to-edge) describes the system-bar constraints. Do not edit generated Android files as a layout shortcut.

## 5. Navigation and component contracts

### Shell and app bar

Preserve five tabs in order: Discover, Ask Reel, Search, Library, You. Compact bar height 64 dp plus bottom inset. Each item has 24 dp icon, 4 dp label gap, at least 48 dp hit height. Selected item has coral icon and short 24×3 dp indicator above label; unselected is secondary text. No floating glass capsule or detached Search button. Existing Ionicons remain the one icon family; no emoji substituted for actions. Details/auth/activity/calendar/stats sit above tabs in the existing Stack; do not duplicate navigators.

App bar: minimum 56 dp, 48 dp back target, 18/24 title, optional one trailing action. Text scales; height grows. Solid background once content scrolls beneath. Back uses existing `goBack`/`useAndroidBack` policy; cold deep links go safely home. Keep predictive Back disabled under existing compatibility decision until separately verified.

### Buttons, fields and chips

- Primary button 52 dp min, 16 horizontal padding, bodyStrong; use only one visually dominant action per task region. Secondary tonal button 48 dp, quiet button 48 dp without filled background. Destructive action is outlined/text danger, separated from normal Save.
- Pending: retain label width, spinner + “Saving…”/“Sending…”, accessible busy state, prevent duplicate mutation. Success only after acknowledgement. Error stays next to its action and supports retry without erasing input.
- Field: 56 dp min, 16 dp padding, body16, persistent visible label above at 14/20, focus border 2 dp. Placeholder is example, not sole label. Error/help below with 8 dp gap. Password visibility toggle 48 dp if added; passwords never appear in screen recordings.
- Single-select chip: 48 dp target, 36 dp visual capsule centered within it, 12 horizontal padding; selected `accentContainer` + check, unselected surface + outline. Source explicitly displays **Mix**, subtitle “Discover + library” in options. Type labels Any watch, Films, TV, Anime.
- Long option sets belong in an accessible sheet; active summary remains visible. Never make horizontally hidden filter selections the only way to understand scope.

### Poster and title primitives

- `Artwork` retains provider-qualified recovery and URL failure list. Reserved 2:3 box prevents relayout. Shelves may use cover-fit; detail poster uses contain-fit within its frame to expose full image. Failed art shows icon and accessible “Poster unavailable”, no duplicate title text.
- ShelfCard: 136 dp minimum width on compact, image, 8 dp gap, title14/20 semibold, 4 dp gap, metadata14/20. Preview of next poster indicates horizontal content. Entire card opens detail; no nested invisible actions.
- LibraryCard: 2-column large poster, title16/22 three lines, year/type, current status and private rating. Favorite badge 24 visual inside noninteractive overlay; its meaning included in card accessibility label.
- ContinueCard: 64×96 poster, 12 gap, title16/24, current episode label, released watched count, 3 dp track when known. Open detail is primary. This redesign does not add an independent progress writer.
- Cast cell: 72 circle in 96-wide column, 8 gap, name14/20 up to three lines, role12/16 if available. Expand to 120-wide at large font. Whole cell 48+ target; initials fallback same dimensions. Never infer an identity from a common name alone.

### Recommendation stage

One selected real pick per assistant response group. At 360–599 dp, poster width `min(216, contentWidth*.58)`, aspect 2:3, centered on solid surface. At narrow/short/large-text layouts use 96 dp poster beside title, with explanation beneath. Two background silhouettes (not duplicate loaded images) offset 6 and 12 dp, scale .97/.94, maximum 2. They are decorative and excluded from accessibility.

Order: “Pick 1 of N” → poster/title/facts → **Why this fits** → returned explanation → optional factual tradeoff already returned → Details + Save → thumbnail strip/Previous/Next → “Find another set”. Do not hide explanation behind a swipe or flip. No match percentage derived from `matchScore`; it is not calibrated probability. Result group identity persists in the transcript; history never reruns a request. Phone has one vertical transcript; no default full-screen split or nested vertical result scroll.

Composer remains pinned above keyboard/navigation, 52 dp min, up to four lines/120 dp then internally scrolls, Send 48. Options summary opens sheet. During request, show Cancel instead of pretending disabled Send can cancel. “Guide me” entry sends a guided starter through the existing question flow; no separate persistent mode. See explicit behavior changes in master plan.

### Sheets and dialogs

Filter/rating/episode information: screen-width bottom sheet on phone; max width 560 on expanded layouts. 20 dp padding, header24/30, 48 dp Close target, content can scroll, footer respects IME/insets. Default max height 85% available window; at large text can become full-height. A drag handle may be decorative only unless drag dismissal is implemented and tested. Always provide explicit Close and Android Back, focus containment and restoration.

Use existing React Native Modal/gesture infrastructure; if a library is proposed, Sol must document necessity separately. No dependency change is required by this plan. Unsaved rating/notes/date edits prompt Discard/Keep editing on dismissal; pending writes cannot be silently discarded. Remove title confirmation repeats the consequence: associated watch history is removed. This confirmation remains mandatory product behavior.

### Feedback, loading and empty states

Feedback hierarchy: inline error for failed action; persistent partial-source notice near affected section; small success snackbar above bottom bar for acknowledged mutation, duration 4 s and accessible announcement. No automatic undo promise unless inverse mutation exists and is tested.

Loading is component-shaped: poster rectangles for catalog, three text lines for synopsis, avatar circles for cast, row placeholders for activity. Reserve geometry. Keep already-loaded results while refreshing. Delay purely cosmetic skeleton display by 150 ms to avoid flicker; never delay data display to meet animation timing. No random skeleton values, pulsating entire screen, animated gradients or blank blocking spinner over existing data.

Empty state: 64 dp Lumi (maximum one per screen), 22/28 title, 16/24 body ≤3 short sentences, one useful action. “No matches in My library” is different from “Catalog unavailable” and “Sign in to see your library”. Settings do not show motivational empty illustrations. No “0 titles” or “0 hours” presented as loaded truth while request is pending/error.

## 6. Motion specification

Easing tokens: `standard = cubic-bezier(.2,0,0,1)`, `enter = cubic-bezier(.16,1,.3,1)`, `exit = cubic-bezier(.4,0,1,1)`, `linear = linear`. These are authored decisions. Reuse installed Reanimated for UI-thread transforms/opacity. Root Stack retains native transitions where custom timing cannot be guaranteed; do not replace navigation just to meet a 280 ms target.

| ID | Purpose / trigger | From → to | Duration / easing | Interruption and accessibility | Performance |
|---|---|---|---|---|---|
| M01 | Press feedback, pointer down/up | scale 1→.98→1; subtle tonal state | 90 ms down / 120 ms up, standard | Release/cancel reverses immediately; reduced motion tonal-only; no haptic per tap | Transform only, no list relayout |
| M02 | Open/close detail route | Native forward/back transition; same cached poster at destination | Native default; design target 240–300 ms | Back remains native; reduced motion instant or ≤80 ms opacity; no forced image fetch wait | No experimental shared-element prerequisite |
| M03 | Optional enhanced selected-poster continuity, after M02 passes | Measured source rect→destination rect using translated/scaled overlay | 280 ms enter; 220 ms return | If source unmounted, scrolled away, missing image, rotation or accessibility reduction: M02 fallback; cancel overlay safely | At most one overlay; release it on finish; never animate layout across entire list |
| M04 | Sheet open/close | translateY(32), opacity0→0,1 with scrim0→.48 | 240 ms enter / 180 exit | Close/Back interrupts; reduced instant; focus after settle; reduced motion must not wait | Transform+opacity; no blur |
| M05 | Assistant response arrives | Result opacity0, y12→1,0; behind layers settle once | 240 ms enter; 40 ms optional metadata stagger, total ≤320 | No animation until real response; no minimum thinking delay; reduced instant; announce concise response once | Only active group; images use cache and fixed geometry |
| M06 | Select next pick | Current opacity1→0, x0→-12; next opacity0→1, x12→0 (reverse for Previous) | 180 ms standard | Buttons and thumbnail taps always available; gesture optional and axis-locked; repeated input lands on latest selected pick; reduced no translation | Only current and adjacent pick mounted in stage |
| M07 | Status/filter replacement | Old content opacity1→0 then new0→1; header remains | 80 out + 120 in | Latest filter wins; screen reader gets result count; reduced instant; never animate on initial scrolling | No per-card cascade |
| M08 | Confirm watch/save | Pending indicator→check; track updates from old to acknowledged value | 160 ms standard | Success haptic only via existing preference hook, once; failed write keeps previous state; reduced instant | No speculative remote state |
| M09 | Lumi state feedback | Existing expression + rotate0→-4°→0 | 100 + 160 ms standard | Only meaningful state transitions; no perpetual bob; no motion on reduce setting; duplicate labels suppressed | One small SVG, no raster sequence |
| M10 | Content skeleton | Static raised shapes; optional opacity .65↔.9 | 1000 ms each direction, standard | Reduced static; stop when screen off-focus/background; retain busy text | At most visible skeleton group; no shimmer shader |
| M11 | Chart range changes | Bars old value→new scaled value; numbers update immediately | 200 ms standard | Reduced instant; selection announced; zero stays zero; never animated on every scroll | Animate bounded bar transforms, not complex SVG path morphs |
| M12 | Expand synopsis / section | New block fades in without forced scroll | 140 ms opacity | Immediate text accessibility; Collapse returns focus; reduced instant | Let natural layout resolve once; no height animation over long text |

M03 is an enhancement gate, not required for functional delivery. M02 plus matching image continuity is the default design. Exact source observations supporting M03–M07 are in R05/R07/R11/R12; no claim those videos use these APIs/easings.

Honor OS remove animations with both navigation and component animation settings. Reanimated documents default system-reduced behavior and configurable policies in its [accessibility guide](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/). Avoid an override that forces `Never`. Test setting changes with app resumed/restarted as necessary; do not assume a hook refreshes all mounted routes automatically.

## 7. Accessibility and motion budgets

Every icon action has a specific label; selected/checked/busy/disabled states are exposed. Heading hierarchy follows visual reading order. Decorative posters in a fully labeled card are hidden from duplicate reading; standalone artwork retains alt text. Live announcements report new result count or mutation outcome, not every skeleton or animation frame. Restore focus to opener after sheets and to selected title after Back. Keep keyboard navigation for external keyboards.

Test default, 1.3, 1.5 and 2.0 text scale; 320, 360, 412, landscape and tablet widths. Layout may grow vertically. Do not cap large text to preserve a poster composition. RTL checks use real Arabic titles plus pseudo-localized UI; full native translation is not claimed implemented. Directional icons mirror where appropriate; posters, rating numbers and chronology semantics do not arbitrarily reverse.

Release-build performance targets on Redmi Note 12 or comparable documented device, fixed 60 Hz baseline: ≤5% missed-frame rate during a repeated 10 s scroll and route transition scenario; p95 frame work target ≤16.7 ms, no main-thread stalls >100 ms attributable to redesign; no new steady-state memory growth after 20 detail open/back cycles. Record actual tool/device and baseline; targets are acceptance goals, not measured results. If missed: remove M03, reduce poster prefetch to one adjacent pick, remove skeleton pulse, then profile before changing data logic. Never mask provider latency with a long animation.

Use FlatList/SectionList for long grids, histories and episode lists; stable provider/event keys; bounded image decode sizes; no full-size raster backgrounds per row; no nested virtualized lists on the same axis. Refresh, theme change and tab switching do not remount intact content unnecessarily. A pleasant stationary screen must not keep animation work running.

## 8. Voice and honest labels

Prefer “Ask Reel”, “Why this fits”, “Mix”, “My library”, “Save pick”, “In your library”, “Mark watched”, “Undo watch”, “Known viewing time”, “Episode release”. Use “Guide me” as an entry into the same conversation. Say “Catalog matching” when AI falls back. Do not show “AI is watching”, “Streaming now”, “Perfect match”, “Friends love this”, “Review posted”, or “Reminder set” without those real capabilities.

Public provider score and personal score are separate: `IMDb rating 6.3/10`, `TVMaze rating …`, or `Catalog rating …` when attribution cannot be proven. Private control label is `Your rating`. A title fact is never inferred from a poster's text. Public people/filmography data can be partial; show “Available credits” rather than promising complete filmography.
