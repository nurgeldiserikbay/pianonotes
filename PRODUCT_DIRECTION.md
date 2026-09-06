# Piano Notes — product direction

This document is the source of truth for product and UX decisions. When an
older checklist or architecture note conflicts with it, follow this document
and `STYLE_BRIEF.md`.

## Product promise

Piano Notes is a pleasant mobile game in which players perform real melodies
and gradually learn to read standard notation. It should feel like playing a
song first and studying second.

The target experience is:

> Play one more melody, then notice that you recognise more notes than before.

## Scope guardrails

- Keep the four existing modes: Campaign, By Ear, Sprint and My Tunes.
- Keep the real staff, 24-key piano, offline progress and public-domain melody
  library.
- Do not add currencies, shops, accounts, social systems or a fantasy map.
- Do not turn Campaign into a timing-lane or falling-note rhythm game.
- Improve existing screens before adding new screens.
- Use code-built UI first. Drawn artwork is optional and must have a fallback.

## Core gameplay

### Campaign

- The staff is static and the player controls the pace.
- A melody is learned in short musical phrases and then performed in full.
- Early levels show note labels and a soft key hint.
- Assistance fades as the player demonstrates recognition.
- Mistakes teach the note-to-key relationship; they do not create a harsh
  full-screen failure response.
- Stars represent completion, clean playing and independent playing. Speed is a
  personal best, not the sole definition of success.

### By Ear

- Unlock after the player understands the basic staff interaction.
- Begin with phrases of 3–5 notes and grow gradually.
- Keep feedback directly on the staff: correct, wrong pitch, wrong placement.

### Sprint

- The high-pressure mode: no hints, shared lives, continuous play and records.
- Strict failure, combo emphasis and rewarded continuation belong here rather
  than in the learning-first Campaign.

### My Tunes

- Creativity is a reward for learning.
- Players compose with notes they already recognise; the editor can expose the
  full range without blocking experimentation.

## Learning model

Assistance follows a small ladder:

1. Note label and key hint.
2. Note label only.
3. Label appears after a mistake.
4. Standard notation only.

Future adaptive learning may track attempts, first-try accuracy and recognition
time per pitch. This is deliberately a later phase; the initial version uses
chapter progression and simple hint rules.

## Visual direction

The interface is a calm dark musical instrument around a bright, readable
sheet of music.

- 80% calm structure, 20% excitement during interaction and reward.
- Deep navy base, indigo surfaces and one amber primary action.
- Mode colours identify modes; they do not fill entire screens.
- Visible edges and small hard shadows make controls feel pressable.
- Glow is restrained at rest and grows briefly on successful input.
- The staff and keyboard always outrank the HUD and decoration.
- The mascot appears as a guide or celebration, never over active notation.
- No emoji, glossy plastic, large blurred glass surfaces or constant particles.

## Screen priorities

1. Main menu: one obvious Campaign action, three smaller modes, compact progress.
2. Campaign list: chapters, clear node states and one recommended next melody.
3. Gameplay: staff, current note and keyboard; compact secondary HUD.
4. Result: stars, one verdict, three useful facts and a prominent Next action.
5. By Ear, Sprint and My Tunes reuse the same primitives and interaction rules.
6. Records and Settings remain the calmest, simplest screens.

## Motion

- 120 ms: press and immediate feedback.
- 200 ms: component state change.
- 320 ms: screen entrance or small celebration.
- Animate opacity and transforms; avoid layout-heavy animation.
- Respect reduced-motion preferences.
- Never delay the next playable action for an animation.

## Delivery phases

### Phase 1 — visual foundation

- Consolidate tokens and reduce permanent neon/glow.
- Refine Main Menu hierarchy and remove duplicate destinations.
- Use Main Menu as the reference for panels, buttons, icons and motion.

### Phase 2 — core screens

- Apply the system to Campaign list, Gameplay and Result.
- Validate 640×300, 844×390 and wider landscape screens.

### Phase 3 — remaining modes

- Bring By Ear, Sprint, My Tunes, Records and Settings into the system.

### Phase 4 — learning and game feel

- Add phrase practice, progressive hint removal and difficult-fragment replay.
- Add richer musical feedback for clean streaks without obscuring notation.

### Phase 5 — release polish

- Performance and accessibility pass.
- Android device validation, ad-flow validation and Google Play screenshots.

## Ownership and handoff

- Product/visual work: UX hierarchy, tokens, screen states, motion specification,
  artwork and visual QA.
- Implementation work: Vue/Pixi behaviour, Android integration, ads and device
  verification.
- Every change should be small enough to review from a focused diff and a set of
  screenshots at the supported landscape sizes.
