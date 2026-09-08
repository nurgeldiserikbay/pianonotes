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

## What would help most next

1. **An icon set.** This is the weakest part of the screen now. The mode, HUD
   and settings icons are single-weight SVG strokes drawn early on, and next to
   the painted covers and the mascot they look thin and generic. What is needed
   is one consistent family, as flat SVG (not PNG) so they take the accent
   colour from CSS and stay sharp at any density:

   - modes: ear (By Ear), stopwatch (Sprint), music sheet (My Tunes), piano
     (Campaign)
   - HUD: timer, heart, star, crown, bolt
   - settings: speaker, glow, particles, layout, target, note
   - misc: trophy, gear, play, chevron, lock, flame

   One 24×24 grid, one stroke weight, rounded caps, no baked colour, no text.

2. **Chapter covers 7–12.** Six covers over thirty-two chapters means each is
   seen five times. Six more would halve that.

3. **A "wrong note" pose** for the mascot. `retry` is used for both a finished
   melody with one star and a failed run, which are not the same feeling.

Not needed: buttons, panels, HUD frames, the staff, keys, or any screen
background. Those are code, and a picture of them would not scale, translate or
theme.
