# Piano Notes — UI Redesign

We need to redesign and improve the existing Piano Notes game UI.

The goal is NOT to create a complex illustrated game with many generated images, 3D scenes, fantasy worlds, or heavy visual effects.

The game should have a **clean, classic, modern, premium, and attractive game UI** that is easy to understand for users of all ages.

The existing functionality and game structure should remain intact unless a UI change clearly improves usability.

## Main Design Direction

The visual direction should be:

* Classic game UI
* Clean and structured
* Modern and premium
* Friendly but not childish
* Suitable for children, teenagers, and adults
* Music-focused
* Dark interface with carefully controlled colorful accents
* Strong visual hierarchy
* Minimal decorative elements
* Clear interactive states

The interface should feel like a polished game, not a business dashboard and not a children's educational application.

Use the principle:

**80% calm and clean interface + 20% visual excitement during interaction.**

The static UI should remain calm.

Animations, glow, particles, and stronger colors should appear mainly when the player interacts with the game, achieves something, answers correctly, increases a combo, completes a level, or unlocks an achievement.

---

# Important Rule: Avoid Complex Artwork

Do not depend on generated illustrations for the interface.

Prefer creating visual elements using:

* CSS
* SVG
* Gradients
* Shadows
* Blur
* Simple geometric shapes
* Icons
* GSAP animations
* CSS animations
* Lightweight Canvas effects when necessary

Do not create complex fantasy environments, castles, cities, detailed backgrounds, or illustrations inside every card.

The UI should be implementable and maintainable entirely in code.

---

# Visual Style

## Background

Use a dark premium background.

Preferred direction:

* Deep navy
* Dark indigo
* Dark purple

The background may contain subtle:

* musical waves
* thin flowing lines
* small stars
* subtle floating music notes
* soft gradient light

These elements should remain low contrast and must not reduce readability.

Avoid visual noise.

The background should support the UI instead of competing with it.

---

# Layout

The layout should be clean and structured.

Use:

* consistent spacing
* consistent border radius
* clear grid
* aligned components
* predictable placement of controls

Avoid unnecessary empty space, but also avoid overcrowding.

Every screen should immediately communicate:

1. Where the user is.
2. What the main action is.
3. What information is important.
4. What the user can interact with.

---

# Cards

Game mode cards should be simple and recognizable.

Each card should contain:

* one clear icon
* title
* optional short description
* subtle decorative elements related to the mode

Do not create separate complex illustrations for every card.

The visual identity of each mode should primarily come from:

* accent color
* icon
* subtle animated background element
* interaction animation

Examples:

Campaign:

* warm orange accent
* piano or music icon
* subtle progress path or dots

Time Mode:

* blue or cyan accent
* clock icon
* subtle rotating or moving element

Endless:

* purple accent
* infinity icon
* subtle flowing notes

Note Trainer:

* green accent
* target or music note icon

Records:

* gold accent
* trophy icon

Settings:

* neutral indigo accent
* settings icon

---

# Hover and Interaction

Cards and buttons should feel alive but should not constantly animate aggressively.

Hover effects may include:

* translateY
* small scale increase
* border highlight
* subtle glow
* icon movement
* one or two decorative particles

Avoid excessive animation.

Animations should feel smooth, responsive, and premium.

---

# Gameplay Screen

Keep the gameplay screen clean.

The player must immediately focus on:

1. The incoming note.
2. The musical staff.
3. The piano keyboard.

HUD information should remain compact and secondary.

Important gameplay feedback should be visually strong.

Correct answer:

* key lights up
* note reacts
* small particle effect
* score animation

Perfect answer:

* `PERFECT`
* short scale animation
* glow
* small particle burst

Combo:

* visually noticeable
* becomes more exciting as the combo increases
* should not permanently block the gameplay area

The gameplay screen should be calm while waiting for interaction and exciting when the player performs well.

---

# Campaign Screen

Do not create a complicated fantasy world map.

Use a clean game progression interface.

Possible direction:

* grouped levels
* connected level nodes
* clear progress indicators
* stars
* locked levels
* completed states
* selected level state

The campaign should feel like a game progression system while remaining simple and easy to scan.

Avoid making it look like a long settings list.

---

# Records Screen

Records should feel rewarding.

Use:

* personal best
* accuracy
* highest combo
* completed levels
* achievements
* mode statistics

Important achievements should receive stronger visual treatment than ordinary statistics.

Avoid turning the screen into a data dashboard.

---

# Settings Screen

Keep settings extremely simple.

Use:

* clear sections
* large enough controls
* consistent switches
* simple segmented controls
* minimal decoration

Settings should be the calmest screen in the application.

---

# Animation Principles

Use animation to communicate interaction and game feedback.

Prefer:

* opacity
* transform
* scale
* translate
* GPU-friendly properties

Avoid unnecessary layout animations.

Use GSAP for larger transitions and coordinated animations when appropriate.

Use CSS transitions for simple UI states.

Possible animations:

## Screen transitions

* fade
* slight translate
* staggered component entrance

## Cards

* small lift
* glow
* icon movement

## Gameplay

* note appearance
* key press reaction
* score feedback
* combo effects
* particles

## Progress

* smooth progress animation
* level completion celebration
* achievement unlock animation

Animations should feel fast and responsive.

Avoid slow animations that delay the player.

---

# Responsive Design

The game must work correctly across different screen sizes.

Do not simply scale the desktop layout down.

Use responsive layouts and adapt:

* spacing
* typography
* card grid
* HUD
* piano keyboard
* gameplay area

Preserve usability and visual hierarchy at every supported resolution.

The UI should never depend on a fixed screenshot size.

---

# Design System

Before changing individual screens, analyze the existing UI and establish reusable design tokens.

Create or maintain consistent values for:

* background colors
* surface colors
* accent colors
* typography
* spacing
* border radius
* borders
* shadows
* glow intensity
* animation durations

Do not introduce random colors, shadows, radii, or spacing values for every component.

Reuse the design system.

---

# Technical Principles

Prioritize reusable components.

Examples:

* GameBackground
* GameCard
* GameButton
* GamePanel
* GameHeader
* GameHUD
* StatBadge
* ProgressIndicator
* LevelNode
* AchievementCard
* AnimatedNote
* ParticleEffect

Do not duplicate similar UI logic across screens.

Keep components maintainable.

---

# What to Avoid

Do NOT:

* redesign every screen in a completely different style
* add unnecessary illustrations
* overload the UI with particles
* use excessive glow
* add random decorative elements
* create too many gradients
* make the interface look childish
* make the interface look like an admin dashboard
* sacrifice usability for visual effects
* use heavy animations that affect performance
* change the game mechanics unless explicitly requested

---

# Implementation Process

Work step by step.

## Step 1

Analyze the existing design and component structure.

Identify:

* inconsistent components
* spacing problems
* typography problems
* visual hierarchy issues
* unnecessary decorative elements
* duplicated styles

Do not immediately rewrite the entire application.

## Step 2

Define the design system and reusable UI primitives.

## Step 3

Redesign the Main Menu as the reference screen.

The Main Menu should define:

* spacing
* typography
* cards
* buttons
* colors
* animation behavior

Do not continue redesigning every screen until the Main Menu direction is consistent.

## Step 4

Apply the same system to:

* Campaign
* Gameplay
* Note Trainer
* Records
* Settings

Maintain visual consistency across all screens.

## Step 5

Add animations and interaction polish after the layout and visual hierarchy are correct.

---

# Final Goal

The final result should feel like a polished, modern piano game.

The design should be:

**simple enough to implement entirely in code, clean enough to be immediately understandable, and attractive enough to feel like a premium game.**

Prioritize:

1. Usability
2. Clarity
3. Consistency
4. Game feel
5. Animation feedback
6. Performance
7. Visual polish
