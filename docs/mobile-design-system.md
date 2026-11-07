# Reel native design system

Updated 2026-11-07 against the native 1.0.2 implementation. Tokens: `mobile/src/theme.ts`; primitives: `mobile/src/components/ui.tsx`. This document governs `mobile/`; the website's design system is separate.

The visual idea is a personal cinema journal. Artwork carries the color; large serif headlines provide an editorial voice, while native sans-serif body text stays familiar and readable. The asymmetric coral Lumi projection frame is the brand signature.

| Role | Dark | Light |
| --- | --- | --- |
| Canvas | `#101113` | `#F3EFE5` |
| Surface | `#1A1C20` | `#FFFCF5` |
| Raised surface | `#23252A` | `#E7E1D7` |
| Primary text | `#F3EFE5` | `#191A1D` |
| Secondary text | `#A6A7AB` | `#626267` |
| Action / selection | `#FF654F` | `#A82D1E` |
| Progress / chart | `#A6CBB4` | `#35654D` |

Type roles: hero 42/46, title 28/34, body 15/22, small 12/18, label 12/22 with 1.5dp tracking. Type scales with the OS. Long headings wrap; scroll containers preserve reachability at large text sizes. System fonts avoid blocking first paint on downloads.

Spacing: 4, 8, 12, 20, 28, 40dp. Screen gutter 20dp. Poster radius 10dp, controls 14dp, narrative surfaces 18–20dp. Poster ratio 2:3. Landscape artwork is rendered separately, not by stretching a poster. Border and surface changes supply hierarchy; no glow, blur or animated shadows. Gradients are reserved for readable text over real landscape artwork.

Components: primary/secondary/quiet/destructive buttons; labeled fields; single-select chips; poster cards; compact poster rows; section headings; honest error/retry cards; static loading skeletons; character empty states. Primary navigation has five stable labeled tabs. Detail/person pages use the native stack and a visible Back path. Forms use native inputs and keyboard avoidance; onboarding scrolls on short screens.

Detail identity uses one portrait poster beside wrapping title facts, with no duplicate banner. `DetailHero` sizes the poster to 42% of screen width after 40dp gutters, capped at 168dp; the row stacks above fontScale 1.6. Its serif title is 34/39, reduced to 28/34 below 360dp or above fontScale 1.4. This is a detail-header treatment, not a replacement for the shared type ramp.

Cast uses a horizontal `FlatList`: circular 84dp portraits, 106dp items, 12dp gaps and full wrapping names at 13/18. Portrait failures retain a silhouette. Person destinations carry provider identity; the profile and optional credits have separate loading/error states. The originating title remains a known credit without carrying private library metadata.

The library uses large 2:3 poster cards in a responsive `FlatList`: two columns on phones, up to four on expanded widths, and one above fontScale 1.5. Horizontal gaps are 14dp within 20dp gutters. Search, status and collection filters scroll with the list. Title, year/type, status/progress and personal rating sit below artwork; a favorite heart sits on the poster. These rules live in `LibraryCard.tsx` and `app/(tabs)/library.tsx`.

Targets are at least 48dp. Selected controls expose accessibility state, buttons have accessible names, errors use alerts, images have explicit fallbacks, and charts expose values with text. Information never relies on color or haptics alone. No font scaling is disabled. Screen reader and 200% Android text still require device verification.

Motion: native stack transitions; no sliding peer tabs; 120ms press scale to 0.97; occasional Lumi tilt -7 degrees for 140ms, return 200ms. UI-thread transform/opacity only. Reduced motion removes spatial character/press movement. Skeletons are still rather than infinite shimmer loops. One haptic per successful user-initiated mutation, never per scroll or frame.

Lumi geometry, expressions, color and asset generation are documented in `mobile/assets/character/README.md`. The character gives feedback without blocking navigation or imposing streak mechanics.

Verification boundary (2026-11-07): the independent finish review approved the 1.0.2 detail/cast/library work from 12 React Native Web captures and layout/navigation evidence, including compact, normal and landscape layouts, dark/light appearances and long names. This establishes browser-rendered layout and navigation behavior. Native Android gestures, hardware Back, screen readers, large system text and frame pacing still need device/emulator verification; the review does not establish native runtime acceptance.
