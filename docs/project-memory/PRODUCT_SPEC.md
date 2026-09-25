# Reel product specification

Last verified: 2026-09-23
Repository/branch: Reel / main
Verified against commit: 1bcffb4 plus current working-tree search/profile changes
Purpose: Intended product behavior, with emphasis on the recommendation experience.

## Product behavior

Reel is one personal queue across media types, preserving medium-specific progress and making the next useful action quick. A user can work entirely locally, optionally sign in to sync a private library, search public catalogs, inspect details, and decide what to watch or read.

For authenticated users, My List and every status, rating, favorite, progress marker, note, history-derived preference, and My List recommendation source belong only to the active Supabase account. Catalog facts remain shared. Account changes clear the prior private state before loading the next account, so a new account sees a loading state followed by its own library or a deliberate empty state—never another account's titles. Guest browser data remains separate and is not automatically imported after sign-in.

## Search and People

The primary search is unified: it immediately searches saved records, then adds public title and person matches without requiring a switch to Online mode. Online remains the deeper source/filter view. Autocomplete and the full result surface use the same normalized token-prefix, typo-tolerant scoring. Exact and ordered token-prefix matches dominate; popularity breaks close ties. People and Titles are ordered by inferred query intent, so person-name queries lead with People while title queries lead with Titles. Local and remote duplicates collapse by provider identity and then normalized title/type/year.

People results use stable 4:5 portrait cards with bounded widths, face-biased cropping, and initials fallbacks for absent, broken, or unusably small art. Their loading skeletons use the same geometry.

Opening a person always performs direct profile resolution and credit lookup when the cache is cold. The page shows a natural-width portrait, available factual chips, exact age or age at death, a collapsed biography when long, and one popularity-ranked Known For shelf. Known For resolves missing or unsuitable raw credit art through the title's stable Wikidata/Wikipedia identity and uses HTTPS artwork, retaining a fixed fallback only when no image exists. Additional role-grouped credits are progressive disclosure under Full filmography; the default view does not repeat Acting/Directed/Written variants of the same work. Person/title navigation participates in browser history and returns to the prior state.

## Pick 4 me

Pick 4 me is a temporary decision workspace rather than a permanent preference profiler. It has a desktop split screen: the left keeps the chosen recommendation, its facts, explanation, actions, optional list strip, and session history visible; the right holds the conversational interaction and compact controls. On mobile, accessible Chat and Pick tabs expose one workspace at a time.

### Supported requests

The assistant supports direct requests and conversational discovery, including random words, multiple concepts, moods, natural language, guided follow-up questions, suggested-answer chips, individual recommendations, and natural lists such as three/five/ten picks. Sources are explicit:

- **Mix:** relevant saved and discovery candidates.
- **My List:** saved library candidates only; no silent broaden to catalog results.
- **Discover:** external catalog candidates grounded in provider data.

Users can choose exact media formats, ask for one or a list, change or remove semantic context chips, regenerate, reject, save, open details, and restore a result through either transcript links or session history.

### Pick and Surprise modes

- **Pick 4 me:** full conversation, direct requests plus no more than three useful guided questions, chips, source/type/output controls, result and history.
- **Surprise me:** shares the workspace and source/format controls but intentionally has no free-text composer. It offers a safe/unusual tuning choice and a regenerate action.

Fresh Pick defaults are Mix, All formats, and one result. Closing the workspace ends the temporary session. Reopening begins fresh. Switching modes clears destination content and scroll position but preserves source and format. Start over resets only the current mode and its history, returns that mode to Mix, and remains in the current mode. Details is special: explicit Back and browser Back restore the exact picker transcript, selected result, controls, mode, unsent draft, and relevant scroll positions.

## Recommendation-quality requirements

The system must retain the entire request rather than independently matching the first recognizable word.

- **American animation:** must respect both American origin and animation; animation is near-hard when factual candidates exist and origin is strongly weighted.
- **Family movie suitable for kids:** must retain movie format, family context, and known child-safety constraints. Unknown classifications are not blanket-safe.
- **Johnny Depp medieval movie:** must consider the named person and medieval context; broad lexical matching must not confuse `deep` with `Depp`.
- **Moroccan deep drama:** must preserve combined origin/culture, tone/semantic trait, and drama intent. `Moroccan` and `medieval` can legitimately trigger one useful clarification when meaning is ambiguous.
- **Guns:** needs factual firearms, shootout, armed-conflict, or weapon evidence; generic action must not pad a gun-recommendation list.

Type, explicit exclusions, named people/titles, requested animation, source, and known child safety are hard or near-hard constraints. Genre, theme, origin, era, setting, and strong mood are high-weight evidence. Runtime/pages and broad adjectives are softer and should surface a visible tradeoff when imperfect. Recommendations exclude shown/rejected IDs across the session, sample without replacement from the strongest relevant shortlist, and apply a small diversity penalty. When a meaningful pool is exhausted, the UI should prefer a shorter relevant list over unrelated padding.

## Current implementation versus intent

The current code and tests implement structured local parsing/scoring, phrase-aware multi-concept handling, source isolation, intent accumulation and explicit direction reset, context-preserving details return, weighted variation, history exclusion, and explicit local fallback when hosted AI fails. AI can interpret/rank a limited factual shortlist but is optional and requires sign-in/hosted configuration.

The repository does not establish that live model quality has been evaluated in production. Cross-session recommendation history, advanced behavioral learning, collaborative picks, a durable global rate limit, real model-quality evaluation, and broad localization of new static recommendation controls remain deferred or unsupported.
