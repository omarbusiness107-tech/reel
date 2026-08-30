# reel

A single-file tracker for movies, series, anime and books — what you've watched, what you
want to watch, and exactly where you stopped.

## Running it

Double-click **`reel.html`**. That's it. No install, no server, no Node.

It works offline. The only time it touches the network is when you ask it to fetch cover
art and genre info.

## Where your data lives

In your browser's `localStorage`, under the key `reel.v1`, tied to this machine and this
browser. Two consequences worth knowing:

- Clearing your browser data wipes the library.
- Opening `reel.html` in a *different* browser gives you an empty library.

So: **use `⋯ → Export JSON` now and then**, and keep the backup file somewhere safe.
`Import JSON` restores it, and asks whether you want to merge or replace.

## Optional cloud sync

Open **`⋯ → Cloud sync`** in the deployed app to create an account or sign in. Your
library is then saved privately to your account and restores on your other devices after
you sign in. The first sign-in for a new account uploads the library in that browser;
an existing cloud library is treated as the source of truth when you sign in elsewhere.

Cloud sync uses Supabase Auth and a per-user database row protected by Row Level Security.
The app still keeps a local browser copy, so exporting a JSON backup remains a good habit.

## First run

The app arrives already stocked: your 360 titles, each with a cover image, genre, release
year, runtime, director/network and a short synopsis, all baked into the file at build
time. Nothing to press, no waiting. Everything starts in **Want**.

The cover images are linked from the internet rather than embedded, so posters need a
connection to appear the first time (your browser caches them afterwards). Everything
else — titles, genres, runtimes, synopses, your progress — is stored locally and works
fully offline.

A handful of titles had no match in any database (a few obscure films and the Arabic-script
books, since these sources are English-indexed). Those show a generated tile instead; open
one and use **Find art + info**, paste an image URL, or upload your own picture.

**Fetch art** in the header stays available for anything you add later.

## Using it

**The Continue shelf** is the point of the app. Anything marked *In progress* sits at the
top with your exact spot — `S2 · E7`, `E14`, `p.142 / 380` — and a one-click `+1 ep` /
`+10 pages` button, so updating where you stopped never needs a dialog.

**🎲 Pick** answers "what do I watch right now": choose a kind, a genre, and how much time
you have, and it draws a random title from your unwatched pile, with its synopsis and
runtime. *Start it* drops it straight onto the Continue shelf.

**Suggested** is a separate status from **Want**. Your own 360 titles stay in Want; the
titles reel added for you sit in Suggested, so your real watchlist is never diluted by
someone else's picks. Filter to Suggested to browse them, and move anything you like into
Want with one click in the detail panel.

**Filters** — the type tabs, the status chips and the genre dropdown all combine, and the
genre list rebuilds itself from whatever is actually in your library.

**Anything is editable.** Click a card to open the detail panel: status, rating out of 10,
genre, runtime, year, tags, notes, cover. Changes save as you type; there's no save button.
Deleting shows an undo toast.

Keyboard: `/` search · `n` new title · `Esc` close.

## Where the metadata comes from

All keyless and free — nothing to sign up for, no API keys in the file.

| Type | Source | What it provides |
|---|---|---|
| Movies | Wikipedia + Wikidata | poster, genre, year, director, cast, runtime, country, language, synopsis |
| Series | TVMaze | poster, genre, year, network, cast, seasons, rating, status, country, language, summary |
| Anime | Kitsu | poster, genre, year, episodes, episode length, rating, age rating, synopsis |
| Books | Open Library | cover, subjects, first published, author, page count, rating, language |

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

**+ Add** for one title. **Bulk** for a pasted list, one per line — the same parser that
read the original lists, so trailing years and duplicates are handled the same way.
