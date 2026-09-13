# Reply to the v2 visual handoff

The five slices from `CLAUDE_HANDOFF.md` are implemented and on `main`.
Screenshots of every screen, taken from the current build, are in
[`screenshots/current-2026-09-06/`](screenshots/current-2026-09-06/) — that
folder is the state to review, not the mockups.

## What landed

- **Artwork wired.** Six chapter covers, five mascot poses, the wordmark. They
  arrived as 7.5MB of PNG, which is more than twice the whole APK; re-encoded to
  WebP at the sizes they are actually drawn, the set is 537KB.
- **Covers cycle per chapter.** Spreading six covers across thirty-two chapters
  gave each a run of five, so the first thing a player saw was five chapters
  wearing the same picture.
- **Poses are asked for by situation** (`teaching`, `cheer`, `retry`), never by
  filename, so a redrawn set is one map away from being wired.
- **Staff note weights**: played notes settle and stay as quiet marks, the
  current note is the loudest thing on the staff.
- **Result** stands in front of the chapter art, with the stars above the title
  and a "You learned C5 and D5" line built from real data.
- **Campaign** cards lead with a numbered badge over a painted banner, two
  across.
- **Records** opens with four accented facts; **Settings** is grouped.

## Two decisions that differ from the mockups, and why

- **No volume slider, metronome or music toggle.** The mockup shows them; the
  game has no music track and no metronome, so the switches would control
  nothing. `CLAUDE_HANDOFF.md` says not to copy invented controls, so they were
  left out.
- **My Tunes is pink, not gold.** Gold is amber, which the brief reserves for
  the primary action, so the third menu card was competing with Play — and
  mixed into a navy panel it came out olive. Gold still belongs to stars,
  trophies and milestone rings.

## The follow-up pack is in (icons, covers 7-12, wrong-note pose)

All three wired, on `main`. Two notes back:

- **The star icon is stroke-only, like the rest of the set — which is right for
  an icon and wrong for a star that has to show earned versus unearned.** A row
  of outlines says nothing. Earned stars are filled from CSS now, so no new file
  is needed; just be aware the set has one member that carries state.
- **Covers 7-12 are 640×360; covers 1-6 are 1280×720.** On a chapter card that
  is invisible, but the result screen puts the cover behind the whole page, so
  on a desktop the newer ones are upscaled twice and go soft — which is the
  exact complaint that led to the renderer work last week. **1280×720 versions
  of 07-12 would fix it**, and nothing else needs to change.

## The Play pack is in — and three screenshots needed repair

Merged to `main`. The icons are wired: `capacitor-assets` regenerated all 148
Android assets from the 1024 sources, so the launcher icon is a downscale now
rather than an upscale of a 500px file. The adaptive foreground was checked
against the circle Android guarantees — furthest content 227px from centre
against a 341px radius.

**`01.png`, `03.png` and `04.png` arrived corrupt.** All three were 786 444
bytes, the same length to the byte, and each failed a CRC check inside an IDAT
chunk. That was verified against the git objects themselves, so the damage was
in the committed bytes. They decoded 29%, 35% and 44% down the image and
stopped. A header read reports the right size and mode on such a file, which is
probably why they passed your check — the pixels have to be decoded to see it.

No redraw was needed. The caption layer is the top 170 rows, inside the part
that still decoded, and everything below was byte-identical to the uncaptioned
sources, so the band was lifted onto clean frames. All eight now pass a full
chunk-chain check.

**Worth fixing in the source files anyway**, since the next export will inherit
it: on `02.png` the caption plate lands on the game's own HUD and covers two of
its chips. The plate wants empty ground under it, not the interface.

## What would help most next

1. **Covers 07-12 at 1280×720**, to match 01-06. See above.

2. **Six icons the set does not cover yet**, in the same style, because these
   six screens still mix the new family with the old one: pause, rewind,
   to-start, pencil, trash, check. They belong to the Studio's transport row and
   the My Tunes list.

3. **More chapter covers.** Twelve over thirty-two chapters is a repeat every
   twelve, which is comfortable; beyond that it is diminishing returns, so this
   is the lowest priority of the three.

Not needed: buttons, panels, HUD frames, the staff, keys, or any screen
background. Those are code, and a picture of them would not scale, translate or
theme.
