# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People who keep personal watchlists and reading lists across movies, television series, anime, and books. They use Reel to decide what to start, remember exactly where they stopped, and keep one private library across devices.

## Product Purpose

Reel is a personal media library and progress tracker. It combines a seeded local collection, a searchable online catalog, quick progress controls, rich editable metadata, and optional private cloud sync. Success means users can find a title, add it, continue it, and understand its key details with minimal friction.

## Positioning

Unlike a single-medium watchlist, Reel treats movies, series, anime, and books as one coherent personal queue while preserving the progress model each medium needs. It remains usable from a local browser copy and makes cloud sync optional.

## Operating Context

The primary workflow is a lightweight daily check-in: search or browse, choose something, update an episode or page position, and return later. Users may also bulk-import lists, fetch missing artwork, edit metadata, rate titles, keep notes, export backups, or sign in to sync privately through Supabase.

## Capabilities and Constraints

- The application is a dependency-light, single-page static web app in `reel.html` and deploys on Vercel.
- Local library data is stored in `localStorage`; optional Supabase authentication and per-user storage provide cloud sync.
- Existing library, catalog, backup, editing, filtering, keyboard, theme, and sync behaviors must remain functional.
- The online catalog searches keyless public sources: Wikipedia and Wikidata, TVMaze, Kitsu, and Open Library.
- Catalog breadth and metadata completeness are limited by the public sources. The interface must distinguish unavailable facts from loading or failure.
- Existing tab labels and main interaction paths remain recognizable. The requested redesign may improve hierarchy and grouping without changing the product model.

### Recommendations

`Pick 4 me` opens a temporary split-screen decision workspace with two modes: Pick 4 me and Surprise me. The left side keeps one substantial recommendation, its explanation, actions, an optional multi-pick filmstrip, and compact session history visible while the right side holds the conversation and controls. Mix is the fresh-session default, with My List and Discover as explicit alternatives. Users can choose All, Movies, Series, Anime, Books, Manga, or Manhwa and ask for one pick or a list of 3, 5, or 10. My List retrieves saved titles only, and an empty result never silently broadens the selected source.

Pick 4 me combines direct requests with up to three useful follow-up questions in one transcript. Conversation refinements accumulate until the user clearly changes direction. Every recommendation is linked to the request that produced it, and selecting either a historical message or a history thumbnail restores the related result set. Shown IDs are excluded across the session; weighted selection samples from the strongest relevant shortlist and applies a diversity penalty for lists. Type, explicit exclusions, named people, requested animation, source, and known child suitability act as hard or near-hard constraints. Mood, origin, genre, setting, era, themes, similarity, popularity, and length contribute weighted evidence and visible tradeoffs.

Closing Pick 4 me ends the temporary session; reopening starts fresh in Pick 4 me with Mix and All formats selected. Opening Details is the exception: Back to Pick 4 me and browser Back restore the exact transcript, result set, selection, source, format, mode, and history. Switching modes clears destination content and scroll position while preserving source and format. Start over resets the current mode, returns its source to Mix, and stays in that mode. Mood and rejection feedback do not become permanent preferences. Optional local genre affinity is off by default and requires at least three personal ratings of 8–10 in a genre. AI receives the request and a limited shortlist of public title facts, including credited cast when needed, while excluding personal notes and the full library.

Structured local parsing, scoring, history exclusion, and weighted selection work without AI configuration, including when `reel.html` is opened directly. Live AI uses the hosted Vercel endpoint and Supabase sign-in for semantic interpretation and grounded shortlist ranking. New static controls and the local parser are English; AI language support does not translate those controls. Cross-session recommendation history, advanced behavioral learning, and collaborative picks remain deferred. See `RECOMMENDATIONS.md` and `assets/recommendations-core.js` for the implemented scope and limits.

## Brand Commitments

The product name is `reel`. Its voice is concise, practical, media-aware, and free of inflated marketing language. A new logo is part of this redesign. The identity should feel at home around films, television, anime, and books without copying a streaming service.

## Evidence on Hand

- `reel.html` contains the full runnable application and inline seeded data.
- `seed-data.json` contains the pre-enriched starter library.
- `README.md` documents the product workflows, keyboard controls, data sources, and deployment constraints.
- Real poster and cover imagery comes from the catalog sources. No licensed photography, commercial claims, testimonials, or customer logos are available and none should be fabricated.

## Product Principles

1. One library, with medium-specific progress where it matters.
2. The next useful action should be obvious and fast.
3. Rich metadata should improve decisions without obscuring the title.
4. Local ownership and export remain first-class even when cloud sync is enabled.
5. Public-source uncertainty is handled honestly with useful empty and error states.

## Accessibility & Inclusion

The redesign must preserve keyboard access, visible focus, semantic dialogs and controls, accessible contrast, reduced-motion behavior, mobile usability, and readable light and dark themes. Arabic and other non-Latin titles must remain intact.
