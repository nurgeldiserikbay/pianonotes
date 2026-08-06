# Google Stitch prompt — Piano Notes redesign

Вставляй в Stitch целиком (можно по частям на каждый экран). Приложи к запросу
скриншоты из этой же папки (`01-home.png`, `02-campaign-list.png`,
`03-gameplay-campaign.png`, `09-settings.png`, `08-records-campaign.png`) —
Stitch умеет использовать референсы, это резко повысит точность.

---

## Prompt

Redesign the UI of "Piano Notes," a mobile rhythm game where players tap piano
keys in time with falling notes on a musical staff, similar in spirit to Piano
Tiles or Magic Tiles but with a real 2-octave piano keyboard and actual note
names. The current design (see attached screenshots) is functional but reads
as flat and generic — dark navy/purple gradient cards with plain text, no
mascot, no illustration, minimal color variation, low "juice." I want a design
that feels like a polished, colorful, addictive casual mobile game a big
studio spent years polishing — playful, warm, rewarding — while staying
readable and uncluttered.

**Hard constraints:**
- Landscape orientation only, phone aspect ratio (roughly 16:7 to 20:9, e.g.
  844×390). Every screen must work without vertical scrolling except the
  300-level campaign list.
- The gameplay screen must keep: a 5-line musical staff with falling notes
  moving right-to-left toward a fixed hit-line near the left edge, a full
  2-octave (14 white + 10 black key) piano keyboard docked at the bottom, and
  a compact HUD (score, lives, combo, elapsed time) that must NOT dominate the
  screen — it should be a small cluster of pills, not stretched full-width.
- Keep it accessible for kids and adults alike — big tap targets, high
  contrast, no tiny text.

**Screens to design:**

1. **Home screen** — 6 big tappable destination cards in a 3×2 grid, one tap
   each, no intermediate menus: Campaign, Time Mode, Endless, Note Trainer,
   Records, Settings. Give each card its own icon and accent color/gradient
   tied to its mood (Campaign = warm/gold and inviting since it's the main
   progression mode, Time Mode = cool/urgent, Endless = deep space/infinite,
   Note Trainer = focused/precise, Records = trophy/celebratory, Settings =
   neutral). Add a small mascot or decorative illustration (a friendly
   character, floating musical notes, sheet-music motif) so the screen has
   personality instead of reading like a settings panel. Show the player's
   total star count as a small badge, not a separate stat tile.

2. **Campaign level list** — a vertically scrolling list, 2 columns wide,
   grouped into "worlds" (curriculum chapters like "First Melodies," "Sharps
   I," "Grand Finale") with a short section header per world (title + one-line
   description + stars earned in that world). Each level row: level number,
   title, tempo, star rating or a lock icon if not yet unlocked. Make locked
   vs unlocked vs cleared visually distinct at a glance (color/opacity/badge),
   and make milestone "real song" levels (as opposed to generated practice
   levels) visually special — a highlighted border or ribbon.

3. **Gameplay screen** — musical staff (5 lines) with colorful falling note
   shapes (note head + stem + flag, like a real quarter note) that carry a
   small readable note-name label (e.g. "C4" or "Do4"). A subtle animated
   background (soft glowing orbs, faint parallax waves) themed per mode. A
   compact HUD row top-left: a small circular exit (✕) button, then 3-4 small
   pill chips (score, ♥ lives, ×combo, time) sized to their content — do not
   stretch them to fill the width. The 2-octave keyboard at the bottom should
   have colorful key-press feedback (glow in the note's assigned color when
   pressed) and clear note-name labels on every key.

4. **Records screen** — a segmented tab control (Campaign / Time Mode /
   Endless) switching a single panel below showing the 5 most recent runs per
   mode (title, date, score, accuracy, grade). Friendly empty state with an
   icon and copy when a mode has no runs yet.

5. **Settings screen** — a grid of toggle cards (Sound, Music, Lane Glow,
   Particles, HUD side, Note-name system letters/do-re-mi) plus a small,
   visually de-emphasized "Reset Progress" action — it must NOT be the most
   prominent element on the screen.

6. **Result screen** (after finishing a level) — a star/grade badge next to
   the level title in one row, 4 compact stat tiles (Score/Accuracy/Combo/
   Misses) in a single row, and Retry/Next/Menu buttons that are ALWAYS
   visible without scrolling even on a short landscape phone (~375px tall).

**Visual direction:** vibrant but not garish — rich gradients, soft glows,
rounded-rectangle cards with a consistent corner-radius hierarchy (bigger
radius on big containers, smaller nested radius on small tiles inside them —
never the same radius on both), a warm gold/pink accent for primary actions,
distinct cool accent hues per game mode, tasteful musical motifs (notes,
staff lines, piano key silhouettes) as background texture rather than empty
negative space. Typography: rounded, friendly, bold for numbers/titles.
