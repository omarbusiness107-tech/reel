---
status: resolved
trigger: "When performing an action, like adding to library or filter by something, there is an unsatisfying refresh in the page. The background image of each card becomes clear when it's originally it's blurred. And the online tab, like the horizontal scroll resets if I add some item in the library. Can you fix this? And make it when performing an action, like the page didn't refresh at all. To give the user a good experience and feels the good quality."
created: 2026-09-04
updated: 2026-09-04
---

## Symptoms

- expected: Adding/removing library items and changing filters should update in place without a page-refresh sensation, poster-treatment flashes, or unrelated scroll changes.
- actual: Card backgrounds briefly become clear and online horizontal result rows reset their scroll positions after actions.
- errors: No explicit error reported.
- timeline: Present in the current local build.
- reproduction: Open the local `reel.html`, scroll an online result row horizontally, then add an item to the library or change a filter.

## Current Focus

- hypothesis: Confirmed. Catalog membership actions and filter handlers rebuild `#grid` with `innerHTML`; that destroys `.catalog-row` scroll state and removes the `wide-art` class until each recreated image fires `onload` again.
- test: Replace catalog-wide membership rerenders with in-place card control updates, persist poster-fit classification by cover URL, and preserve row scroll offsets across the remaining legitimate catalog rerenders.
- expecting: Adding/removing a title changes only the affected controls; filters may change content but retained poster treatment and row positions do not flash or reset.
- next_action: None. Fix verified with syntax, source-path, and whitespace checks.
- reasoning_checkpoint:
    hypothesis: "Whole-grid `innerHTML` replacement causes both symptoms because it discards nested scroller DOM and runtime poster-fit classes."
    confirming_evidence:
      - "`addCatalogItem()` calls `renderCatalogGrid()` after changing one library membership, and `renderCatalogGrid()` assigns `#grid.innerHTML`."
      - "`posterFit()` alone adds `.wide-art` and `--poster-bg`; `posterInner()` does not carry that state into recreated markup."
      - "Library and catalog filter handlers call `renderGrid()` / `renderCatalogGrid()`, which also replace all card markup."
    falsification_test: "If catalog actions still replace `#grid`, or recreated wide posters lack `.wide-art` before image load after the patch, the hypothesis is wrong or the fix is incomplete."
    fix_rationale: "Updating membership controls in place prevents unnecessary DOM destruction; caching fit by URL and restoring scroll offsets preserves the two runtime states during legitimate content rerenders."
    blind_spots: "The local file cannot be driven with the unavailable browser automation stack, so visual end-to-end feel still needs a human check in Brave."
- tdd_checkpoint:

## Evidence

- timestamp: 2026-09-04
  checked: `addCatalogItem()` and `renderCatalogGrid()`
  found: A single add operation calls `renderCatalogGrid()`, whose success path replaces all of `#grid.innerHTML` including every `.catalog-row`.
  implication: Every horizontal scroll container is newly created with `scrollLeft = 0`.

- timestamp: 2026-09-04
  checked: `posterInner()`, `posterFit()`, and poster CSS
  found: The blurred wide-art treatment depends on the runtime `.wide-art` class and `--poster-bg`, but generated card markup contains neither until the new image's `onload` callback executes.
  implication: Recreated wide covers temporarily use the normal `object-fit: cover` rule, producing the reported clear/cropped flash.

- timestamp: 2026-09-04
  checked: catalog and library filter event handlers
  found: Type, year, sort, genre, status, and text filters all route through full grid rendering.
  implication: Legitimate filter changes need runtime visual-state preservation even when the result set itself changes.


## Eliminated


## Resolution

- root_cause: Whole-grid HTML replacement was used for both content changes and single-card membership changes. That discarded nested scroll positions and poster-fit state, while poster-fit state was only recomputed asynchronously on image load.
- fix: Catalog add/remove membership now updates only affected card controls while catalog-mode library refreshes avoid `#grid` rendering. Wide-art classification is cached by cover URL and included in regenerated markup, catalog scroll offsets are saved/restored by media type for legitimate rerenders, and the full-grid opacity dip was removed from content-swap motion.
- verification: Main inline JavaScript parsed successfully with Node; `git diff --check` passed; source inspection confirmed add and catalog-mode library refresh paths no longer invoke the full catalog renderer. Automated visual verification was attempted, but the bundled Playwright runtime is unavailable and headless Brave could not complete a screenshot in this Windows environment.
- files_changed: [reel.html]
