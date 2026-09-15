# Google Play asset pack

Final production files prepared from `PLAY_STORE_BRIEF.md`.

| Path | Size | Purpose |
| --- | --- | --- |
| `icon-512.png` | 512×512 RGBA | Play Console store icon — square, because Play applies its own rounded mask |
| `logo.png` | 512×512 RGBA | the same artwork with a 23% corner radius, for anywhere that does not round for you |
| `feature-graphic.png` | 1024×500 RGB | Play Console feature graphic |
| `screenshots/01.png` … `08.png` | 1920×1080 RGB | Landscape store screenshots in recommended order |

The Android build inputs are in `resources/`:

- `icon.png`: complete 1024×1024 opaque icon;
- `icon-foreground.png`: transparent adaptive foreground, with meaningful content kept inside the central 666 px safe circle;
- `icon-background.png`: full-bleed opaque radial background.

The screenshots preserve the current game UI at its original 1920×1080 size. Only the requested top captions were added. Raw generation files and review contact sheets are intentionally excluded.

## 01, 03 and 04 were rebuilt here

Those three arrived as corrupt PNGs: all 786 444 bytes, the same length to the
byte, each failing a CRC check inside an IDAT chunk — verified against the git
objects, so the damage was in the committed bytes, not in any checkout. They
decoded 29%, 35% and 44% of the way down and stopped, and Play rejects files
that will not open.

They were repairable without redrawing anything. The caption layer is the top
170 rows, which sits inside the part that still decoded correctly, and every row
below it was byte-identical to the uncaptioned source in
[`screenshots/play-2026-09-12/`](../screenshots/play-2026-09-12/). So the caption
band was lifted onto the clean frame. All eight files now pass a full chunk-chain
check and decode end to end.

## Icon artwork

Both 512s are cut from `raw-assets/icon-v3/source-1254.png` — an open book of
sheet music between piano keys with a gold note above it.

`icon-512.png` is square on purpose. Play rounds the store icon itself, and
handing it corners that are already cut lets its mask bite into artwork drawn to
the edge. `logo.png` carries the rounding for everywhere that does not round for
you.
