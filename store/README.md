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
