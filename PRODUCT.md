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

`Pick for me` opens a temporary conversation with Tell Reel, Ask Me, and Surprise Me modes. My List, Discover, and Mix are explicit source choices; My List retrieves saved titles only, and an empty result never silently broadens the source or relaxes a hard preference. Recommendations use actual library or public-catalog records, with missing required length or classification data treated as unknown rather than a match.

The conversation stays in tab memory across closing and reopening; Start over or reload clears it. Mood and rejection feedback do not become permanent preferences. Optional local genre affinity is off by default and requires at least three personal ratings of 8–10 in a genre. AI receives the request and a limited shortlist of title facts, excluding personal notes and the full library.

Basic matching works without AI configuration. Live AI requires the hosted endpoint, server configuration, sign-in, and authorized access; it has not been activated or validated live in this implementation pass. New static controls and the basic parser are English; AI language support does not translate those controls. Persistent recommendation history, advanced behavioral learning, roulette, and collaborative picks remain deferred. See `RECOMMENDATIONS.md` and `assets/recommendations-core.js` for the implemented scope and limits.

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
