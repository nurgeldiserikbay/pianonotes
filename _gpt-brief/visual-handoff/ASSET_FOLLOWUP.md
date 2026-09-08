# GPT visual asset follow-up

This batch answers the three requests in `NOTES_FOR_GPT.md`: a coherent line-icon set, chapter covers 7–12, and a wrong-note mascot pose.

## Integration rules

- SVG icons live in `src/assets/icons-v2/`. They are 24×24, inherit `currentColor`, use a 1.8 px rounded stroke, and contain no text or baked UI colour.
- Render ordinary icons at 20–24 px. Keep a minimum 44×44 px touch target around interactive icons.
- Do not add shadows or coloured containers to every icon. Reserve the warm coral accent for the primary action or active state.
- Chapter covers live in `public/img/redesign-v2/chapters/`. The supplied WebP files are the production assets; do not ship the source PNG files.
- The wrong-note pose is `public/img/redesign-v2/mascot/cat-wrong-note.webp`. Use it only for immediate incorrect-key feedback. Keep `retry` for a completed low-score attempt so the two states remain semantically distinct.

## Icon mapping

| UI role | Asset |
|---|---|
| Ear Training | `ear.svg` |
| Speed Trainer | `stopwatch.svg` |
| Sheet Music | `music-sheet.svg` |
| Campaign / piano practice | `piano.svg` |
| HUD | `timer.svg`, `heart.svg`, `star.svg`, `crown.svg`, `bolt.svg` |
| Settings | `speaker.svg`, `glow.svg`, `particles.svg`, `layout.svg`, `target.svg`, `note.svg` |
| General navigation/status | `trophy.svg`, `gear.svg`, `play.svg`, `chevron.svg`, `lock.svg`, `flame.svg` |

## Chapter cover IDs

Append these filenames to `CHAPTER_COVERS` in `src/modes/campaignWorlds.ts`:

```ts
'07-around-the-staff',
'08-wider-reach',
'09-old-standards',
'10-longer-phrases',
'11-folk-songs',
'12-across-the-sea',
```

All covers are cropped to 16:9 at 640×360. Keep titles, locks, progress, and stars as live HTML above the image; the artwork intentionally contains no text.

## Suggested mascot API

Extend the semantic mood union with `wrongNote` and map it to `cat-wrong-note.webp`. Trigger it briefly after a wrong key, then return to `thinking` or `teaching`. Respect reduced-motion preferences and do not shake the whole screen.
