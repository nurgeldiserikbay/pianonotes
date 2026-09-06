# Piano Notes Mobile Architecture

> Behaviour note: `PRODUCT_DIRECTION.md` and `STYLE_BRIEF.md` are authoritative.
> Campaign uses a static staff and player-paced input. References below to note
> motion, judgement windows and hold notes describe an earlier prototype and
> must not be reintroduced into Campaign.

## Product Goal
Build a polished but realistic mobile rhythm game that combines:
- CSS-based app UI for menus, HUD, cards, settings, and results
- Pixi.js for staff rendering, notation, restrained particles, and hit feedback
- TypeScript domain modules for charts, scoring, storage, ads, and session state

The product targets a premium casual music-game feel without relying on heavy art production or non-performant effects.

## Target UX
1. Main Menu
2. Mode Select
3. Campaign Levels / Records / Settings
4. Gameplay in forced landscape
5. Result Screen with large stars or rank
6. Return loop into retry / next / menu

## Screen Rules
- Menu UI is portrait-friendly and card-based
- Gameplay is landscape-only
- Gameplay layout:
  - top and middle: static staff, active note and reading feedback
  - bottom: piano keyboard with 2 octaves

## Architecture Layers

### `core`
Shared domain models, enums, runtime contracts, and app screen/state types.

### `entities`
Static musical entities such as piano keys and lane mapping.

### `modes`
Definitions for campaign levels, time mode presets, endless metadata, and background presets.

### `features`
Scoring formulas, judgement windows, rank/star evaluation, and aggregated run metrics.

### `game`
Pixi gameplay runtime:
- chart scheduling
- note rendering
- particles
- hit logic
- hold handling
- endless pattern extension

### `ui`
Vue screens and components:
- shell navigation
- cards and buttons
- gameplay HUD
- keyboard interaction
- result presentation

### `services`
Runtime-only helpers such as audio playback.

### `storage`
Persistent game state for settings, campaign progress, and last 5 records per mode.

### `ads`
Ad throttling logic with cooldown, campaign cadence, and an easy global off switch.

## Data Models

### Settings
- `soundEnabled`
- `musicEnabled`
- `showLaneGlow`
- `showParticles`
- `leftHandedHud`
- `adsEnabled`

### Campaign Progress
- `bestScore`
- `bestAccuracy`
- `bestCombo`
- `bestStars`
- `lastPlayedAt`
- `recentRuns[5]`

### Records
Stored per mode:
- `date`
- `score`
- `accuracy`
- `maxCombo`
- `misses`
- `rankOrStars`
- `survivalTime` for endless

### Note Runtime Model

This is a legacy model from the timing prototype. It is retained only as
historical context and is not the basis of current Campaign behaviour.
- `laneId`
- `timeMs`
- `durationMs`
- `type` = tap / hold
- `chordId`
- `judged`
- `holding`
- `releasedEarly`

## UX Flow

### Main Menu
- brand card
- CTA into mode select
- quick stats
- shortcuts to records and settings

### Mode Select
- Campaign
- Time Mode
- Endless

### Campaign Flow
1. Open level list
2. Inspect BPM, difficulty, best stars
3. Start level
4. Finish
5. Save best result and append recent run
6. Offer retry / next / menu

### Time Mode Flow
1. Start countdown challenge
2. Next note appears only after correct key press
3. Wrong press costs life
4. Finish on timer end or zero lives
5. Award rank `C` to `SS`

### Endless Flow
1. Start with simple melodic pattern
2. Composer appends pattern chunks
3. Speed, density, and chords scale upward
4. Finish on zero lives
5. Award rank `D` to `SSS`

## Scoring Formulas

### Judgement Windows
- `Perfect`: <= 55 ms
- `Great`: <= 110 ms
- `Good`: <= 180 ms
- `Miss`: > 180 ms or wrong lane / expired note

### Base Score
- `Perfect`: 1000
- `Great`: 700
- `Good`: 450
- `Miss`: 0

### Combo Multiplier
- `1 + min(combo, 30) * 0.035`

### Accuracy
- `(perfect*1 + great*0.8 + good*0.55) / totalNotes * 100`

### Tempo Stability
- `100 - min(stdDev(hitOffsetsMs) / 2.4, 100)`

### Campaign Stars
- 3 stars: `accuracy >= 94`, `misses <= 3`, `tempoStability >= 82`
- 2 stars: `accuracy >= 87`, `misses <= 7`
- 1 star: `accuracy >= 75`
- 0 stars: otherwise

### Time Rank
- `SS`: accuracy >= 98 and streak >= 24 and lives >= 3
- `S`: accuracy >= 94 and streak >= 18
- `A`: accuracy >= 88
- `B`: accuracy >= 78
- `C`: otherwise

### Endless Rank
- `SSS`: score >= 220000
- `SS`: score >= 160000
- `S`: score >= 110000
- `A`: score >= 70000
- `B`: score >= 40000
- `C`: score >= 18000
- `D`: otherwise

## Endless Pattern Design
Endless generation is not random-note spam. It uses:
- motif library with known melodic contours
- transposition inside a constrained pitch range
- controlled repetition
- variation by note length
- optional chord accent on strong beats
- difficulty-based density scaling

This keeps endless mode musical while still being replayable.

## Visual Rules
- rounded cards
- soft gradients
- glass panels
- restrained glow
- bright note colors on dark backgrounds
- CSS for all menus and keyboard chrome
- Pixi for motion, hit flashes, particles, and wave backgrounds

## Performance Rules
- simple vector shapes instead of expensive textures
- pooled particles
- low-overdraw gradients
- capped shadow blur
- responsive scaling based on viewport and safe area

## Ads Rules
- show on campaign completion every 3 levels
- show on defeat
- obey cooldown
- never show if ads are disabled in settings
- ad manager remains isolated from gameplay logic
