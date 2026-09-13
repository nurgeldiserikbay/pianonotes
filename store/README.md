# Google Play asset pack

Final production files prepared from `PLAY_STORE_BRIEF.md`.

| Path | Size | Purpose |
| --- | --- | --- |
| `icon-512.png` | 512×512 RGBA | Play Console store icon |
| `feature-graphic.png` | 1024×500 RGB | Play Console feature graphic |
| `screenshots/01.png` … `08.png` | 1920×1080 RGB | Landscape store screenshots in recommended order |

The Android build inputs are in `resources/`:

- `icon.png`: complete 1024×1024 opaque icon;
- `icon-foreground.png`: transparent adaptive foreground, with meaningful content kept inside the central 666 px safe circle;
- `icon-background.png`: full-bleed opaque radial background.

The screenshots preserve the current game UI at its original 1920×1080 size. Only the requested top captions were added. Raw generation files and review contact sheets are intentionally excluded.

## Missing: 01, 03 and 04

Three of the eight arrived as corrupt PNGs and were removed rather than
shipped. All three were 786 444 bytes — the same length to the byte — and none
carried a valid `IEND`; the last twelve bytes are the end marker shifted by half
a byte, so the stream is mangled rather than merely cut short. They decode 29%,
35% and 44% of the way down and then stop. Google Play rejects files that will
not open.

The three are the ones over painted artwork: the menu, the result screen and the
chapter list. The uncaptioned originals they were made from are intact in
[`screenshots/play-2026-09-12/`](../screenshots/play-2026-09-12/) — `1-menu.png`,
`3-result.png` and `4-chapters.png` — so only the export needs repeating, not the
work.

Until they are back, the listing can go up with the five that survived: Play
asks for at least two.
