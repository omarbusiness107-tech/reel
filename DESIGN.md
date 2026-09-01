---
name: Reel
description: A projection-booth program index for one private movie, series, anime, and book library.
colors:
  carbon: "#101116"
  carbon-raised: "#15171d"
  carbon-panel: "#1b1d24"
  carbon-panel-high: "#242733"
  rule: "#30333f"
  rule-strong: "#454957"
  cool-paper: "#f4f5f2"
  text-muted: "#b8bbc6"
  text-quiet: "#858a99"
  cobalt: "#6276ff"
  cobalt-pressed: "#4f66ff"
  signal-ink: "#ffffff"
  want: "#5b8dee"
  suggested: "#2fb8a8"
  going: "#ffb02e"
  done: "#3fbf7f"
  paused: "#9b7fd4"
  dropped: "#6d6b7a"
  light-canvas: "#f4f5f8"
  light-raised: "#e9ebf1"
  light-panel: "#ffffff"
  light-panel-high: "#e8eaf2"
  light-rule: "#d8dbe4"
  light-rule-strong: "#b9becc"
  light-ink: "#17191f"
  light-text-muted: "#505563"
  light-text-quiet: "#6f7585"
  light-cobalt: "#425af0"
  light-cobalt-pressed: "#334de3"
typography:
  display:
    fontFamily: "Reel Display, Barlow Condensed, sans-serif"
    fontSize: "45px"
    fontWeight: 600
    lineHeight: 0.9
    letterSpacing: "0.01em"
  headline:
    fontFamily: "Reel Display, Barlow Condensed, sans-serif"
    fontSize: "29px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.015em"
  title:
    fontFamily: "Reel Display, Barlow Condensed, sans-serif"
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.01em"
  body:
    fontFamily: "Reel Sans, Manrope, Segoe UI, Noto Sans Arabic, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Reel Sans, Manrope, Segoe UI, Noto Sans Arabic, sans-serif"
    fontSize: "10px"
    fontWeight: 750
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  tight: "8px"
  control: "11px"
  media: "14px"
  panel: "16px"
  dialog: "18px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "18px"
  xl: "24px"
  page: "30px"
components:
  button-primary:
    backgroundColor: "{colors.cobalt}"
    textColor: "{colors.signal-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 13px"
    height: "38px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.cool-paper}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 13px"
    height: "38px"
  search-field:
    backgroundColor: "{colors.carbon-panel}"
    textColor: "{colors.cool-paper}"
    typography: "{typography.body}"
    rounded: "12px"
    padding: "10px 42px 10px 14px"
    height: "42px"
  tab-selected:
    backgroundColor: "{colors.cool-paper}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.tight}"
    padding: "7px 12px"
    height: "36px"
  status-chip:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    rounded: "9px"
    padding: "6px 9px"
  poster-frame:
    backgroundColor: "{colors.carbon-panel-high}"
    rounded: "{rounded.media}"
  catalog-panel:
    backgroundColor: "{colors.carbon-panel}"
    textColor: "{colors.cool-paper}"
    rounded: "{rounded.panel}"
    padding: "24px"
---

# Design System: Reel

## Overview

**Creative North Star: "The Projection-Booth Program Index"**

Reel feels like a precise personal program sheet assembled beside a projection booth: image-led, information-dense, dark enough to let artwork lead, and disciplined enough to keep four media types coherent. It is a working library surface rather than a streaming-service imitation. Condensed headings provide the program voice while a highly legible sans serif carries controls and metadata.

The system pairs carbon surfaces with cool-paper text and reserves cobalt for decisive state, selection, progress, and focus. Borders and tonal steps organize most depth. Motion is short and tactile, with stronger spatial movement limited to drawers, dialogs, and loading feedback. Light mode keeps the same hierarchy by exchanging carbon for cool paper rather than changing the visual language.

**Key Characteristics:**

- Condensed program headings paired with precise sans-serif interface copy.
- One cobalt signal color against carbon and cool-paper surfaces.
- Poster-first shelves with crisp metadata and medium-specific progress.
- Dense controls that remain readable, keyboard-friendly, and responsive.
- Dark and light themes that preserve the same hierarchy and component geometry.

## Colors

The palette behaves like a dim screening room with a cool printed program: neutrals carry structure, cobalt communicates action, and status hues remain small semantic signals.

### Primary

- **Projection Cobalt** (`#6276ff`): Marks primary actions, selected catalog controls, focus treatment, progress, and source links. Its pressed and hover state uses Deep Cobalt (`#4f66ff`).
- **Light Projection Cobalt** (`#425af0`): Replaces Projection Cobalt in light mode so the signal remains distinct on paper-colored surfaces. Its pressed state is (`#334de3`).

### Secondary

- **Status Blue** (`#5b8dee`), **Teal** (`#2fb8a8`), **Amber** (`#ffb02e`), **Green** (`#3fbf7f`), **Lilac** (`#9b7fd4`), and **Slate** (`#6d6b7a`): Distinguish want, suggested, in-progress, done, paused, and dropped states. Use them as small swatches, meters, and selected-state tints rather than large surfaces.

### Neutral

- **Booth Carbon** (`#101116`): Default canvas. Carbon Raised (`#15171d`), Carbon Panel (`#1b1d24`), and Carbon Panel High (`#242733`) create the dark tonal stack.
- **Cool Paper** (`#f4f5f2`): Primary dark-theme text. Muted Silver (`#b8bbc6`) and Quiet Slate (`#858a99`) carry secondary copy and labels.
- **Screening Rules** (`#30333f`, `#454957`): Default and emphasized borders, dividers, and scroll thumbs.
- **Paper Canvas** (`#f4f5f8`): Light-mode canvas. Raised Paper (`#e9ebf1`), White Panel (`#ffffff`), and High Paper (`#e8eaf2`) preserve the same tonal layering.
- **Paper Ink** (`#17191f`): Primary light-theme text. Muted Ink (`#505563`) and Quiet Ink (`#6f7585`) support secondary hierarchy.

### Named Rules

**The One Signal Rule.** Cobalt is the only general-purpose accent. Status colors communicate status only and never compete with primary actions.

## Typography

**Display Font:** Reel Display, self-hosted Barlow Condensed SemiBold (with sans-serif fallback)  
**Body Font:** Reel Sans, self-hosted Manrope Variable (with Segoe UI, Noto Sans Arabic, and sans-serif fallbacks)  
**Label Font:** Reel Sans

**Character:** The condensed display face reads like a program heading or catalog spine. Manrope keeps dense metadata, mixed scripts, controls, and long descriptions calm and highly legible.

### Hierarchy

- **Display** (600, `45px`, `0.9`): Uppercase All Titles heading and the strongest catalog statement.
- **Headline** (600, `29px`, `1`): Shelf headings and major collection divisions.
- **Title** (600, `22px`, `1`): Drawer section headings, detail facts, and progress values.
- **Body** (400, `15px`, `1.5`): Default interface copy; long detail paragraphs open to `1.7` line-height.
- **Label** (750, `10px`, `0.08em`, uppercase): Media type, metadata keys, sort labels, and card overlines.

### Named Rules

**The Program Type Rule.** Use Reel Display for headings, counts, and high-value facts; use Reel Sans for every control, description, and editable value.

## Layout

The desktop surface uses a centered `1440px` maximum canvas with `30px` horizontal padding. The library grid fills available space with columns no narrower than `168px`, while catalog results form consecutive horizontal shelves with `178px` cards and proximity scroll snapping. The All Titles console is a two-column panel that pairs a compact introduction with right-aligned filters.

At `1120px`, secondary header actions yield and the catalog console stacks. At `760px`, page gutters reduce to `16px`, the header becomes a two-row grid, library cards settle into two columns, utilities move into a compact menu, catalog filters form a five-part strip, and drawer facts collapse from four columns to two. Catalog cards narrow to `148px`. At `410px`, the Pick action yields and the catalog controls become a single-column stack.

Spacing follows a tight working rhythm of `4px`, `8px`, `12px`, `18px`, `24px`, and `30px`. Sections use larger intervals, while metadata, controls, and card copy use the smaller steps. Horizontal shelves may reach the mobile viewport edge to preserve a continuous browsing gesture.

## Elevation & Depth

Reel is flat by default and layered through surface tone, one-pixel rules, and poster imagery. The standard poster and dialog shadow is structural rather than decorative. Hover lift is reserved for media cards; menus and sheets receive stronger depth because they cross the page plane.

### Shadow Vocabulary

- **Poster Depth** (`0 18px 44px -24px rgba(2,5,20,.82)`): Dark-theme posters and dialogs.
- **Paper Poster Depth** (`0 18px 44px -25px rgba(27,36,80,.30)`): Light-theme equivalent.
- **Primary Control Depth** (`0 8px 22px -14px rgba(0,0,0,.72)`): Restrained neutral lift below the primary action without turning cobalt into a glow.
- **Utility Menu Depth** (`0 22px 60px rgba(0,0,0,.32)`): Mobile utility menu only.

### Named Rules

**The Lift With Purpose Rule.** Flat controls change tone; media cards may rise by `4px`; overlays and transient menus may cast depth because they occupy a new interaction plane.

## Shapes

The signature silhouette is a gently rounded `14px` media frame. Controls use tighter `8px` to `12px` corners, large panels use `16px`, and dialogs use `18px`. Fully circular geometry belongs only to tiny status swatches, progress tracks, and scroll thumbs. Borders are crisp one-pixel rules; image and panel clipping must respect the same radius as the visible container.

Wide or horizontal artwork stays inside the vertical `2:3` media frame with `object-fit: contain`, `10px` internal breathing room, and a softened, blurred version of the same image behind it. Never crop incompatible artwork into false poster proportions.

## Components

### Buttons

- **Shape:** Compact and tactile with a gently rounded control silhouette (`11px`) and a minimum height of `38px`.
- **Primary:** Projection Cobalt with white signal ink, a matching border, `8px 13px` padding, and restrained signal depth.
- **Hover / Focus:** Hover deepens to Deep Cobalt; keyboard focus receives a three-pixel cobalt-white outline; active feedback scales to `0.97` over `140ms` with the responsive ease-out curve.
- **Secondary / Ghost:** Secondary buttons use Carbon Panel and a rule border. Ghost buttons retain the border but remove the fill. Danger actions use red text with a mixed red rule.

### Chips

- **Style:** Compact rectangular chips use a `9px` radius, `6px 9px` padding, muted text, a one-pixel rule, and an optional six-pixel status swatch.
- **State:** Selected status chips tint the panel with their semantic hue. Catalog media filters use cobalt fill and white text when pressed.

### Cards / Containers

- **Corner Style:** Media frames use the signature `14px` radius; catalog panels use `16px`.
- **Background:** Cards rely on artwork over Carbon Panel High, while list cards and information panels use Carbon Panel.
- **Shadow Strategy:** Posters use Poster Depth; list cards remain flat.
- **Border:** One-pixel Screening Rules define images and panels.
- **Internal Padding:** Metadata begins `11px` below the poster; list cards use `9px`; catalog consoles use `24px`.

### Inputs / Fields

- **Style:** Search uses a `42px` height, `12px` radius, one-pixel rule, panel fill, and `10px 42px 10px 14px` padding. Selects use `38px` height and `10px` radius.
- **Focus:** Border shifts to cobalt and a three-pixel translucent cobalt ring appears. No field uses a color change alone as its focus cue.
- **Error / Disabled:** Disabled quick actions retain visible text with reduced contrast. Catalog errors use a bordered panel and plain recovery action rather than a decorative alert.

### Navigation

The sticky header uses a translucent canvas layer with a `14px` backdrop blur and a one-pixel bottom rule. Tabs live in a bordered tonal track; the selected library tab reverses to Cool Paper on Carbon, while the selected All Titles tab uses cobalt. At mobile widths, search occupies a second row and secondary actions move into a text-led utility menu.

### Poster Card

Poster cards are the system's primary browsing unit. Every frame is vertical (`2:3`), carries a concise uppercase media overline, a two-line title, and compact secondary metadata. Direct actions stay visible at the lower edge. Hover lifts the card and scales compatible artwork to `1.018`; catalog results also compress on active feedback. Horizontal artwork uses the contained treatment described in Shapes.

### Catalog Shelf

All Titles groups Movies, Series, Anime, and Books into named consecutive rows. Each row uses scroll snapping, fixed card widths, and a visible item count. Sorting and release filtering happen in the console above the shelves, and each result opens a full source-aware record before it is added.

### Exposure Loader

The loading mark is a `42px` framed aperture with a cobalt inner exposure sweeping across opposite halves over `760ms`. Poster skeletons use a quiet inset focus frame that fades between two opacity levels over `900ms`, without scrolling content. Both collapse to effectively static feedback when reduced motion is requested.

## Do's and Don'ts

### Do:

- **Do** preserve cobalt as the single general interaction signal in both themes.
- **Do** keep poster shelves image-led and place dense metadata in disciplined overlines, facts, and drawer sections.
- **Do** fit horizontal artwork inside vertical cards with the softened same-image backdrop.
- **Do** provide visible focus, tactile active feedback, keyboard access, and reduced-motion behavior for every new interactive pattern.
- **Do** use short transitions, generally `140ms` to `260ms`, only for feedback, hierarchy, or spatial continuity.

### Don't:

- **Don't** introduce purple gradients, broad glass panels, decorative label noise, or streaming-service hero conventions.
- **Don't** turn status hues into competing action colors or large decorative surfaces.
- **Don't** crop wide artwork into unreadable vertical fragments.
- **Don't** use `transition: all`, animate from `scale(0)`, or add motion that survives reduced-motion preferences.
- **Don't** hide essential mobile utilities without a text-led replacement.
