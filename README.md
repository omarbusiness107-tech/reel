# Reel

A lightweight tracker for movies, series, anime, manga, manhwa, and books: what you have watched, what you
want to watch, and exactly where you stopped.

The interface is designed as a compact media program index. It includes a responsive dark
and light theme, the custom Reel mark, grouped online catalog shelves, source-aware detail
records, and poster handling for both vertical and horizontal artwork.

## Running it

Double-click **`reel.html`**. That's it. No install, no server, no Node.

Keep the accompanying `assets` folder beside the file. Library tracking and basic
recommendations work this way. The new **Pick for me** conversation adds Tell Reel,
Ask Me, Surprise Me, source controls, and context-preserving refinements. AI matching
requires the hosted app, sign-in, and server configuration. See
[recommendation setup and architecture](RECOMMENDATIONS.md).

The same file adapts from 320px phones to large desktop screens. Navigation always stays
in one horizontal line; on smaller screens its labeled tabs swipe smoothly instead of
wrapping. Smaller screens move header utilities into Menu, stack forms, and use two-column poster grids. Status
filters fill compact rows; media shelves can be swiped horizontally. Landscape layouts leave more
vertical space for content, and panels respect device safe areas and viewport height.

For development, `node tools/check-responsive.cjs` runs a headless Chrome layout
check with Playwright available on Node's module path. It checks 11 widths, both
themes, English/French/Arabic, library and Online layouts, forms, and selected control
interactions in isolated browser storage. Reports and screenshots go to the system
temporary directory (`reel-responsive-qa`), or `REEL_QA_OUTPUT` if set. External
catalogs and poster requests are blocked during the check; CDN scripts are allowed.

Saved library browsing works offline. Online search, artwork, cast information, and
episode-guide updates use public catalogs. Opening series details checks the episode
guide when needed and caches it locally for a day. Unknown episode limits are shown
explicitly, with a Refresh details action; the app does not invent completion totals.

## Episode tracking and details

Details separate labeled catalog facts and community-rating attribution from your
own rating and watch status. TVMaze episode guides supply released, numbered episodes
per season, excluding specials and future episodes. Season and episode inputs enforce
those bounds, show the available totals, and apply the same rules to quick actions.
Finish sets the last available season and its final episode, including from Continue.
Awaiting next season records that you are caught up without classifying a running
series as finished or claiming that another season is confirmed. Anime catalogs that
index seasons as separate titles use the episode total for that individual entry.

Tabs show small library counts on every screen size. Settings can remove media tabs from
the rail and add them back later without deleting any titles; My library and All titles
remain pinned. Full-width filter groups avoid
empty slots and layout jumps; Back to top supports reduced motion and keyboard focus.

`node tools/check-tracking.cjs` verifies limits, completion, waiting, persistence,
unknown data, responsive controls, and Back to top in an isolated Playwright browser.
Its deterministic TVMaze fixtures exclude future episodes and include unequal seasons.
Screenshots are saved under the system temporary directory (`reel-tracking-qa`).

## Where your data lives

In your browser's `localStorage`, under the key `reel.v1`, tied to this machine and this
browser. Two consequences worth knowing:

- Clearing your browser data wipes the library.
- Opening `reel.html` in a *different* browser gives you an empty library.

So: use **Settings > Export JSON** now and then, and keep the backup file somewhere safe.
`Import JSON` restores it, and asks whether you want to merge or replace.

## Optional cloud sync

Open **Settings > Cloud sync** in the deployed app to create an account or sign in. Your
library is then saved privately to your account and restores on your other devices after
you sign in. The first sign-in for a new account uploads the library in that browser;
an existing cloud library is treated as the source of truth when you sign in elsewhere.

Cloud sync uses Supabase Auth and a per-user database row protected by Row Level Security.
The app still keeps a local browser copy, so exporting a JSON backup remains a good habit.

## First run

The app arrives already stocked: your 360 titles, with available cover images, genre, release
year, runtime, director/network and a short synopsis, all baked into the file at build
time. Nothing to press, no waiting. Everything starts in **Want**.

The cover images are linked from the internet rather than embedded, so posters need a
connection to appear the first time (your browser caches them afterwards). Everything
else — titles, genres, runtimes, synopses, your progress — is stored locally and works
fully offline.

A handful of titles may still have no match in the public databases and show a generated
tile instead; open one and use **Find art + info**, paste an image URL, or upload your own
picture. The seven-volume **مملكة البلاغة** series has verified high-resolution covers stored
locally in `assets/covers/mamlakat-al-balagha`, so it works even when the app is opened directly
from disk. The accompanying `provenance.json` records the source page for every volume.

**Fetch art** in the header stays available for anything you add later.

## Using it

**The Continue shelf** is the point of the app. Anything marked *In progress* sits at the
top with your exact spot — `0:42:18`, `S2 · E7`, `E14`, `Ch 33`, `p.142 / 380` — and a
direct progress action. Movies open their timestamp details instead of showing a false
`+1 ep` action.

**Pick for me** answers "what do I watch right now": choose a kind, a genre, and how much time
you have, and it draws a random title from your unwatched pile, with its synopsis and
runtime. *Start it* drops it straight onto the Continue shelf.

**Suggested** is a separate status from **Want**. Your own 360 titles stay in Want; the
titles reel added for you sit in Suggested, so your real watchlist is never diluted by
someone else's picks. Filter to Suggested to browse them, and move anything you like into
Want with one click in the detail panel.

**Filters** combine the type tabs, status chips, and genre dropdown, and the
genre list rebuilds itself from whatever is actually in your library.

**Tab settings** let you simplify the main rail by removing media categories you do not
use and restoring them at any time. This changes navigation only, never the library data.
Dropdown menus open and close on a shared `220ms` motion timeline, including their joined
corner transition, with a reduced-motion alternative.

**All titles** is a separate online catalog. One search looks across movies, series, anime,
manga, manhwa, and books. Results are placed into consecutive shelves by media type. Filter them by media
type and decade, then sort by popularity, public rating, year, or title. Open a result for
runtime or page count, dates, credits, community data, genres, overview, and its source,
then press **Add to library** to place it in your Want list. Exact source identities keep
same-name adaptations separate, and an owned result can be opened in the library or removed
directly from the catalog. If a library search is empty, **Search online** carries the same
query into All titles. Adding is optimistic, so the result changes immediately while richer
metadata finishes in the background. The catalog stays online and
searchable instead of trying to download millions of titles into the browser.

Card artwork now uses one clean edge-to-edge image plane. Images keep their original aspect
ratio and quality, are never stretched or duplicated into a blurred background, and use a
centered proportional crop inside the consistent `2:3` card. Portrait posters and wide detail
banners are stored separately, and both can be expanded at full resolution. The complete
Harry Potter film collection includes verified local portrait posters; any previously saved
wide artwork is preserved as the title's detail banner during migration.

**Anything is editable.** Click a card to open the detail panel: status, color-graded rating
out of 10, genre, runtime, year, tags, notes, cover, and an exact `H:MM:SS` stopping point.
Manga and manhwa track chapters instead of pages. Artwork expands at full size, and cast
cards include portraits, biographies, and source links. Changes save as you type; there's no save button.
Deleting shows an undo toast.

Frequent interactions update only the affected tab, shelf, card group, or detail control.
The library and catalog tab bars use an iOS-style liquid capsule that stretches toward the
next choice and settles its icon and label, while status pills fill when selected,
and catalog searches use an indeterminate reel loader plus skeleton shelves.

The interface language can be changed between English, French, and Arabic in Settings.
Arabic automatically switches the complete interface direction to right-to-left.

Keyboard: `/` search · `n` new title · `Esc` close.

## Where the metadata comes from

All keyless and free — nothing to sign up for, no API keys in the file.

| Type | Source | What it provides |
|---|---|---|
| Movies | Wikipedia + Wikidata | poster, genre, year, director, cast, runtime, country, language, synopsis |
| Series | TVMaze | poster, genre, year, network, cast, seasons, episodes, rating, dates, schedule, status, country, language, summary |
| Anime | Kitsu | poster, genre, year, episodes, episode length, rating, ranks, community counts, age rating, dates, synopsis |
| Manga and manhwa | Kitsu | poster, format, chapters, volumes, rating, ranks, community counts, dates, synopsis |
| Books | Open Library | cover, subjects, first published, author, pages, ratings, reading counts, editions, publisher, ISBN, language |

Movie cast and country are parsed from the Wikipedia opening sentence ("...is a 2019 South
Korean black comedy thriller film ... It stars Song Kang-ho, Lee Sun-kyun"). The search is
year-aware, because a bare *Heat* lands on the 2013 comedy rather than Michael Mann's 1995
film. There is no keyless public rating source for films, so the ★ score appears on series,
anime and books only — your own 0–10 rating works everywhere.

Movie genres are parsed from the opening sentence of the Wikipedia article ("…is a 1995
American **crime thriller** film…"), so they're good but not infallible — every genre is
editable by hand.

## Notes on the seeded list

The original lists had duplicates and typos; both were cleaned on the way in:

- `Se7en` / `Seven` merged, as were `Rango` ×3, `Kiss Kiss Bang Bang` ×2, `Dune` ×2,
  `Watchmen` ×2, `22 Jump Street` ×2 and about a dozen others.
- Typos fixed: `Good fellas`, `Straight Outta Compto`, `Hanniabal`, `old boy.`,
  `Boyz in the hood`, `Ocean s eleven`.
- Streaming suffixes dropped: `... netflix`, `(netflix)`.
- Trailing years read as release years: `life 1999` → *Life* (1999).
- Titles filed under the wrong list were moved: `Fallout`, `Chernobyl`, `Succession`,
  `Mouse`, `Save Me`, `Signal`, `Beyond Evil`, `Flower of Evil`, `Bloodhounds`,
  `Reborn Rich` and `Hell Is Other People` are series; `Terra Formars` and `UQ Holder!`
  are anime; `Rango` stayed a movie.
- Arabic titles kept as-is: `حب في المتجر`, `الليالي البيضاء`, `العمى`, `الغريب`.

If any of those calls were wrong, the type and title are both editable in the detail panel.

## Rebuilding the seed

`seed-data.json` holds the pre-fetched library, and `reel.html` carries a copy inline.
To refresh it (after adding titles to the plain-text lists, say):

```
node tools/enrich.mjs     # resumable: only fetches what is still missing
python tools/inject.py    # writes the result back into reel.html
```

`enrich.mjs` reuses reel.html's own parsing and lookup code rather than duplicating it, so
the two can't drift. Wikipedia rate-limits hard, so it paces itself, retries on 429 and
checkpoints every 20 titles — run it more than once and it picks up where it stopped.

## Adding more

**Add title** adds one title. **Import** accepts a pasted list, one per line. It uses the same parser that
read the original lists, so trailing years and duplicates are handled the same way.

## Brand assets

- `assets/reel-mark.svg` is the flat production mark used by the header and favicon.
- `assets/reel-logo-source.png` is the generated concept source.
- `assets/reel-logo-source.provenance.json` records how that source was created.
- Self-hosted Manrope and Barlow Condensed files live in `assets/fonts` with their OFL licenses.
