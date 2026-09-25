# Reel project overview

Last verified: 2026-09-23
Repository/branch: Reel / main
Verified against commit: 1bcffb4
Purpose: Concise product and platform context for targeted engineering work.

## What Reel is

Reel is a personal media-library and progress-tracking web app for movies, television series, anime, manga, manhwa, and books. It combines a seeded local collection, public-catalog discovery, medium-specific progress tracking, editable metadata, backup/import, optional private cloud sync, and a recommendation workspace named **Pick 4 me**.

The primary user is someone who wants one private queue across media types: decide what to start, remember exactly where they stopped, and return later. The app is deliberately useful as a local file as well as when hosted.

## Major features

- Local library, filtering, type tabs, statuses, ratings, notes, import/export, and per-medium progress.
- Online catalog search across movie, series, anime, manga/manhwa, and books; catalog records can be added to the local library.
- Details views with source-aware metadata, artwork, cast, and episode-guide handling for series.
- Optional Supabase sign-in with a shared catalog and RLS-protected per-account library relationships; guest data remains local and separate.
- Pick 4 me: a temporary conversational decision room with Pick and Surprise modes, source and format controls, recommendation explanations, details/save actions, list output, and session history.
- English, French, and Arabic interface support; Arabic switches direction to RTL.

## Technology and runtime

- Dependency-light static single-page application centered on `reel.html`.
- Browser JavaScript and CSS, with recommendation modules in `assets/`.
- Node 22+ is used for checks and the hosted API function, not required to open the static app.
- Vercel hosts the static app and `api/recommend.js`; `/` rewrites to `reel.html`.
- `@vercel/oidc` enables short-lived deployment identity for Vercel AI Gateway.

## Services and data

- Guest browser data: `localStorage` key `reel.guest.v1`, with legacy `reel.v1` read as a guest fallback; export/import remains available.
- Account cloud data: Supabase Auth plus shared `public.titles`, private `public.user_titles`, and private `public.user_preferences`; the legacy `user_libraries` rows are retained only as a migration archive.
- Public catalog providers: Wikipedia/Wikidata (movies), TVMaze (series and episodes), Kitsu (anime/manga/manhwa), and Open Library (books).
- Live AI: the server-side Vercel AI Gateway path normally uses `openai/gpt-4.1-mini`; direct OpenAI is an optional non-Vercel fallback.

## Current product direction

The recent direction is a polished, accessible recommendation experience without converting the app to a framework or moving its primary local-first model. Pick 4 me is the main active product area: retain complete multi-concept intent, provide grounded and varied recommendations, keep conversation and results visible, preserve context when returning from details, and make source/mode changes predictable.

## Current development priorities

1. Recommendation quality and safe relevance: multi-word requests, named people, child suitability, firearm/context matching, and avoiding unrelated fallback picks.
2. Pick 4 me UI reliability: split-screen layout, mobile Chat/Pick navigation, no unwanted outer scrolling, details return, reset/mode behavior, and visible chat/composer.
3. Keep the static/offline matching path working when live AI, authentication, or catalog providers are unavailable.
4. Preserve existing library, tracking, catalog, privacy, and sync behavior while iterating on recommendations.
