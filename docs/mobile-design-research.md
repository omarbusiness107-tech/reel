# Reel mobile design research

Researched 2026-11-06. Original direction: a pocket cinema journal.

## Access and method

Opened [Mobbin](https://mobbin.com/) and its [iOS app catalog](https://mobbin.com/discover/apps/ios). Public landing content is readable; catalog access presents login/join gates. The connected browser host was unavailable. No subscriber flows, animation timing, or screenshots behind those gates were inspected. Agent Reach's Jina reader returned Netflix's public navigation documentation; Exa failed and its update check failed on network connectivity. Browser search and official public documentation supplied the references below. These are documented patterns and publicly shown stills, not a claim of hands-on app testing.

## References and decisions

| Reference | Useful screen / pattern | Lesson for Reel | Rejected |
| --- | --- | --- | --- |
| [Netflix mobile navigation](https://help.netflix.com/en/node/575087423404644) | Persistent bottom destinations; content filters above shelves | Discover, Ask, Search, Library and You remain reachable; filters stay near their content | Autoplay video feed: irrelevant cost and distraction for a tracker |
| [Apple TV Home](https://support.apple.com/en-tm/guide/tvapp/atvb05f2070b/web) | Continue Watching and Watchlist shelves | Resume personal progress before browsing new titles; separate saved intent from viewing history | Streaming play controls: Reel does not stream films |
| [Letterboxd mobile](https://letterboxd.com/mobile/) | Poster-led personal cinema diary, list/diary concepts | Keep artwork dominant, expose private ratings and dated activity distinctly | Reproducing its layout, green identity, or social features absent from Reel |
| [Spotify library](https://support.spotify.com/article/your-library/) and [public screenshot](https://community.spotify.com/t5/Your-Library/Necesito-ayuda-con-mis-me-gusta/td-p/5487391) | Compact chips, clear grouping, persistent search, cover hierarchy | Thumb-friendly status/type filters, useful recent searches and dense library rows | Nested carousels inside the saved library |
| [Duolingo shape language](https://blog.duolingo.com/shape-language-duolingos-art-style/) and [character system](https://blog.duolingo.com/building-character/) | Recognizable silhouette, small expressive vocabulary, consistent geometry | Build an original projection-window character with few scalable parts | Streak pressure, intrusive celebrations, copying owl or human character artwork |
| [Apple: Behind the Design, Duolingo](https://developer.apple.com/news/?id=jhkvppla) | Character storytelling tied to meaningful moments | Use a character to communicate searching, readiness and recovery | Continuous idle motion and animation that delays access |
| [Material navigation](https://m3.material.io/components/navigation-bar/overview) and [accessibility](https://m3.material.io/foundations/accessible-design/overview) | Stable navigation, clear selected states, accessible targets | 48dp targets, visible labels, scalable text, semantic controls | Icon-only primary navigation, color-only state |
| [Reanimated reduced motion](https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/) | Respect OS motion settings | State changes remain legible without moving geometry | Treating animation as proof of progress |

## Visual system

Ink `#101113`, projection surface `#1A1C20`, warm paper `#F3EFE5`, muted `#A6A7AB`, vermilion `#FF654F`, chart mint `#A6CBB4`. Accent is reserved for decisions, selection and the character. Movie artwork supplies most color. Large editorial titles use system serif, body uses native system sans; this avoids a font download dependency and supports scaling. Spacing uses a 4dp base, 20dp screen gutters and 12dp card gaps. Borders separate surfaces; no decorative glow or blur. Poster aspect ratio 2:3, original landscape image only for detail/hero backgrounds. Missing artwork becomes a labeled frame rather than an invented poster.

## UX and motion

Discovery is a finite scroll with personal continuation and catalog shelves. Search starts with recent queries and media filters, then separates people and works. Details have a native back path and explicit save/watch feedback. Ask combines suggested prompts, one concise clarification where useful, grounded result cards and follow-up; the existing backend returns complete JSON so no simulated streaming is used. Library uses a virtualized list. Activity and insights derive only from real watch events, with undated baseline progress kept separate.

Native stack navigation supplies hierarchy; peer tabs do not slide. Press scale 0.97, 120ms; state feedback opacity 150ms; occasional reveal opacity 200ms. Character motion uses UI-thread transform/opacity, stops offscreen/background, and obeys reduced motion. Haptics occur once on a successful user-initiated save/watch, never per frame. Sheets use native presentation, not a custom drag engine. No claim is made to have measured source-app timings.

## Original character: Lumi

Lumi is a small coral projection aperture: an asymmetric rounded frame with a folded upper-right corner, two off-center ink eyes, a tiny mouth, and two paper-colored film perforations. A short projected spark indicates discovery. The silhouette must work at 32dp. The component and SVG assets are authored for Reel and have no external artwork dependency. States: idle, greeting, thinking, searching, excited, curious, confused, success, no-results, ready. Expressions are geometry; a brief tilt or bob communicates an occasional state, never an endless decorative loop. See `mobile/assets/character/` and `mobile/src/components/Lumi.tsx`.

## Limits

No reference animations were screen-recorded or measured. No authenticated Mobbin flow was accessible. Public links may change. The interface needs release-build testing on the Redmi Note 12 for frame pacing, keyboard behavior, haptics, text scaling and real touch ergonomics.

## Detail and library refinement - 2026-11-07

TMDB's [Barbie detail page](https://www.themoviedb.org/movie/346698-barbie), read through Agent Reach's public Jina reader, separates poster/facts and provides image-led Top Billed Cast links to people. This informed the native hierarchy and actor affordances without copying its screen or branding. Letterboxd's old mobile URL returned 404 and provides no inspected evidence. Final native rules and evidence are in `mobile-detail-library-direction.md`.
