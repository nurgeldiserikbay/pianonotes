# Piano Notes — bright mobile visual handoff

This folder is the visual reference for the next UI pass. Product behaviour is
still defined by `PRODUCT_DIRECTION.md`; do not reintroduce a moving/timing lane.
The game remains player-paced and reads a static staff from left to right.

## Reference screens

Use these as composition and art-direction targets, not as raster UI:

| File | Target |
| --- | --- |
| `screens/01-menu.png` | Campaign hero plus three secondary modes |
| `screens/02-campaign.png` | Chapter-first campaign selection |
| `screens/03-gameplay.png` | Static two-row staff and two-octave keyboard |
| `screens/04-how-to-play.png` | Three-step first-run explanation |
| `screens/05-result.png` | Larger reward-focused result state |
| `screens/06-records-settings.png` | Denser useful utility screens |

The generated copy and exact metrics are illustrative. Keep the app's real data,
routes, settings and mode names. Do not copy invented controls from a mockup.

## Production assets

All usable assets are under `public/img/redesign-v2/`.

### Chapter covers

The six files in `chapters/` are 1280×720 opaque PNGs:

1. `01-first-tunes.png`
2. `02-nursery-favourites.png`
3. `03-songs-you-know.png`
4. `04-rhythm-garden.png`
5. `05-starlight-stage.png`
6. `06-grand-finale.png`

Use `object-fit: cover`. The menu hero uses the current chapter cover. Campaign
cards use the corresponding cover. Add a CSS navy gradient veil wherever white
text overlaps an image; do not bake text into the artwork.

### Mascot poses

The five files in `mascot/` are real RGBA PNGs, max 512 px:

| File | Use |
| --- | --- |
| `cat-idle.png` | Menu and empty states |
| `cat-teaching.png` | How-to-play and learning tips |
| `cat-thinking.png` | By Ear and writing states |
| `cat-cheer.png` | Completed result / three stars |
| `cat-retry.png` | Timeout, retry and gentle correction |

Wire these through `MascotSlot.vue`; components should select a semantic pose,
not import image paths themselves. Keep the full mascot inside its box with
`object-fit: contain`. Never clip ears, tail, paws or baton.

### Shared effects and wordmark

- `effects/correct-burst.png`: RGBA burst behind a correctly played note,
  180–240 ms, scale 0.65 → 1.05 and fade to zero. Maximum one burst at a time.
- `effects/wrong-pulse.png`: RGBA friendly error pulse behind the pressed key,
  140–180 ms, scale 0.85 → 1.0 and fade. Combine with one 2–3 px key shake.
- `wordmark.png`: RGBA horizontal logo. Use only when it remains legible; fall
  back to the existing text wordmark at short heights.

If CSS/Pixi particles are cheaper than the PNG effects, reproduce their shape
and colour in code. The visual result matters more than the implementation.

## Implementation direction

1. Keep the current Vue/Pinia/Pixi architecture and all game rules.
2. Use the assets to improve hierarchy, not to turn screens into full-image
   layouts. Buttons, panels, icons, staff, keys and text remain code-rendered.
3. Campaign is the only large hero on the menu. By Ear, Sprint and My Tunes are
   smaller and each carries one accent colour.
4. On the staff, the current note is strongest; future notes are quieter and
   completed notes are softened. The current note and matching key share colour.
5. Amber is reserved for the primary action: Play, Let's play, Next or Save.
6. Reduce tiny copy. Never render generated mockup filler text in production.
7. Keep existing banner/interstitial behaviour and safe areas. Ads must never
   cover the keyboard, staff, primary action or result controls.

## Responsive acceptance criteria

Test every changed screen at:

- 1280×720 desktop reference;
- 844×390 landscape phone;
- 667×375 short landscape phone;
- 640×300 minimum supported viewport.

No horizontal scroll. Only the campaign list may scroll vertically. Every
primary action remains visible, touch targets are at least 44×44 CSS px where
space permits, text does not overlap artwork, and gameplay never scrolls.

At 640×300 simplify in this order: hide ambient mascot, reduce decorative art,
hide secondary descriptions, tighten gaps. Do not shrink gameplay labels below
readability and do not remove the level path or primary action.

## Motion

- Buttons: 120 ms press down by 2–3 px; no spring bounce.
- Mode card: 160–200 ms border/glow emphasis on focus/press.
- Correct note: 180–240 ms burst and gentle upward settle.
- Wrong key: 140–180 ms shake/pulse; no screen flash.
- Result stars: stagger by 120 ms; counters animate in under 500 ms.
- Respect `prefers-reduced-motion`; retain state colour without movement.

## Delivery sequence

Implement and screenshot one vertical slice at a time:

1. gameplay + how-to-play;
2. result;
3. menu;
4. campaign;
5. records + settings.

After each slice, compare against its reference at 844×390 and 640×300 before
continuing. Run the existing tests and production build at the end.
