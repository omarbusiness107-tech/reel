# Lumi / Reel original character

Authored for Reel, 2026-11-06. No externally licensed artwork.

Master geometry: 120 × 120 viewBox. Use 32–56dp inline, 72–96dp for feedback, 190dp in onboarding. Maintain clear space of 8% around the silhouette. Coral `#FF654F`, fold `#FFAA8F`, eyes `#191A1D`, perforations/spark `#F3EFE5`. Do not stretch.

The ten SVG expressions work as static reusable assets; `src/components/Lumi.tsx` supplies equivalent native vector geometry with state-driven motion. Greeting, ready and success smile; thinking and searching show state marks; curious raises one eye; confusion/no-results soften the mouth. Idle is still. A single tilt (-7°, 140ms out, 200ms back) acknowledges an occasional state transition. Transform stays on the UI runtime. No endless idle loop. OS reduced motion removes the tilt.

Regenerate originals and the matching icon using `python tools/create_character.py` (Pillow). No AI image generation or external character asset is required for this vector system.
