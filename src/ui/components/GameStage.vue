<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { GameplayResult, HudSnapshot, SessionConfig, SettingsState } from '@/core/models'
import { BACKGROUND_PRESETS } from '@/modes/modeDefinitions'
import { ReadingGame } from '@/game/ReadingGame'
import { createEmptyHud } from '@/features/scoring'
import { formatCountdown } from '@/features/reading'
import { getLaneLabel } from '@/entities/piano'
import { audioService } from '@/services/audioService'

import IconCombo from '@/assets/icons/combo.svg'
import IconHeart from '@/assets/icons/heart.svg'
import IconScore from '@/assets/icons/score.svg'
import IconTimer from '@/assets/icons/timer.svg'
import IconGlow from '@/assets/icons/glow.svg'
import IconSparkle from '@/assets/decor/sparkle.svg'

import IconChip from './IconChip.vue'
import ListeningCard from './ListeningCard.vue'
import MascotSlot from './MascotSlot.vue'
import PianoKeyboard from './PianoKeyboard.vue'

const props = defineProps<{
	session: SessionConfig
	settings: SettingsState
}>()

const emit = defineEmits<{
	finish: [result: GameplayResult]
	acknowledgeNotes: [laneIds: string[]]
	exit: []
}>()

const stageRef = ref<HTMLElement | null>(null)
const engine = ref<ReadingGame | null>(null)
const activeKeys = ref<string[]>([])
const hud = ref<HudSnapshot>(createEmptyHud(props.session.modeId, props.session.lives))
const flash = ref({ label: '', color: '#ffffff', visible: false })
const isLandscape = ref(window.innerWidth > window.innerHeight)

// First-time-note tutorial: pauses gameplay until the player acknowledges the new
// notes this level/world introduces (see appStore.buildCampaignSession).
const showNewNotesToast = ref(Boolean(props.session.newNotes?.length))

// The rules card is a one-off, remembered outside the game snapshot so that
// "Reset Stored Progress" doesn't re-teach a player who already knows.
const RULES_SEEN_KEY = 'piano-notes-rules-seen'
const showRulesCard = ref(false)

try {
	showRulesCard.value = window.localStorage.getItem(RULES_SEEN_KEY) !== '1'
} catch {
	showRulesCard.value = false
}

function dismissRules() {
	showRulesCard.value = false
	try {
		window.localStorage.setItem(RULES_SEEN_KEY, '1')
	} catch {
		// Private mode / quota: showing the card again is harmless.
	}
	// On a first launch this tap is the only gesture the page has had, so it also
	// carries the preview: otherwise a new player taps "Let's play", then taps
	// "Listen", and only then plays. One card, one tap, then the melody.
	if (previewNeedsTap.value) listenNow()
	engine.value?.setPaused(shouldPauseEngine())
}
const newNoteLabels = computed(() =>
	(props.session.newNotes ?? [])
		.map((laneId) => getLaneLabel(laneId, props.settings.noteNamingSystem))
		.join(', ')
)

const theme = computed(() => BACKGROUND_PRESETS[props.session.themeId])

const modeAccent = computed(() => {
	if (props.session.modeId === 'sprint') return 'var(--mode-endless)'
	return 'var(--mode-campaign)'
})

// Same character count for all three states: a label that grows and shrinks
// pushes every chip beside it. Shorter wording is also plainer for a beginner
// than "ahead of tempo".
const tempoCopy = computed(() => {
	if (hud.value.tempoState === 'behind') return 'Too slow'
	if (hud.value.tempoState === 'ahead') return 'Too fast'
	return 'On tempo'
})

const tempoColor = computed(() => {
	if (hud.value.tempoState === 'on') return 'var(--good)'
	return 'var(--warn)'
})

// The countdown is the pressure in this mode, so it turns red before it runs out
// rather than silently expiring.
const timeCritical = computed(() => hud.value.remainingSec <= 10)

// Before the first attempt at a melody the player hears it played properly. The
// mode is self-paced, so during play the tune only sounds as musical as the
// player's own timing — the preview is the only moment they hear what they are
// aiming for. Practice has no melody to preview.
// Never in Sprint: a run is one continuous attempt, and a card between every
// melody would stop it four times a minute — besides handing the player the
// tune they are supposed to be reading at speed.
const isPreviewing = ref(props.session.modeId !== 'sprint' && props.session.chart.length > 0)
// The app can now open straight into a level, which means the preview may be the
// first thing that happens on the page — before any touch. Browsers and the
// Android WebView keep audio suspended until a gesture, so playing then would
// show "Listen first" over silence. When that is the case the card waits for a
// tap instead, and that tap is both the gesture and the request to listen.
const previewNeedsTap = ref(false)
let stopPreview: (() => void) | null = null
let previewTimer: number | null = null

function endPreview() {
	if (!isPreviewing.value) return
	stopPreview?.()
	stopPreview = null
	if (previewTimer !== null) {
		window.clearTimeout(previewTimer)
		previewTimer = null
	}
	isPreviewing.value = false
	engine.value?.setPaused(shouldPauseEngine())
}

// The tap on "Listen" is itself the gesture the browser was waiting for, so the
// audibility check is skipped here: checking it would fail every time, because
// the context is only created and resumed once something asks to play.
function listenNow() {
	previewNeedsTap.value = false
	startPreview(true)
}

function startPreview(fromGesture = false) {
	if (!isPreviewing.value) return
	if (!fromGesture && !audioService.isAudible()) {
		previewNeedsTap.value = true
		return
	}
	previewNeedsTap.value = false
	const playback = audioService.playSequence(
		props.session.chart.map((note) => ({ laneId: note.laneId, timeMs: note.timeMs }))
	)
	stopPreview = playback.stop
	previewTimer = window.setTimeout(endPreview, playback.durationMs)
}

function shouldPauseEngine() {
	return (
		!isLandscape.value ||
		showNewNotesToast.value ||
		showRulesCard.value ||
		isPreviewing.value
	)
}

async function mountEngine() {
	if (!stageRef.value) return

	engine.value = new ReadingGame(stageRef.value, props.session, props.settings, {
		onHud(snapshot) {
			hud.value = snapshot
		},
		onFinish(result) {
			emit('finish', result)
		},
		onFlash(label, color) {
			flash.value = { label, color, visible: true }
			window.setTimeout(() => {
				flash.value.visible = false
			}, 420)
		},
	})

	await engine.value.init()
	engine.value.setPaused(shouldPauseEngine())
	startPreview()
}

function handleResize() {
	isLandscape.value = window.innerWidth > window.innerHeight
	engine.value?.resize()
	engine.value?.setPaused(shouldPauseEngine())
}

function dismissNewNotesToast() {
	if (!props.session.newNotes?.length) return
	showNewNotesToast.value = false
	emit('acknowledgeNotes', props.session.newNotes)
	engine.value?.setPaused(shouldPauseEngine())
}

// There was previously no way to leave a gameplay session short of losing all
// lives or finishing the chart.
function handleExit() {
	emit('exit')
}

function onKeyDown(laneId: string) {
	if (!activeKeys.value.includes(laneId)) {
		activeKeys.value = [...activeKeys.value, laneId]
	}
	engine.value?.pressKey(laneId)
}

function onKeyUp(laneId: string) {
	activeKeys.value = activeKeys.value.filter((item) => item !== laneId)
	engine.value?.releaseKey(laneId)
}

watch(
	() => props.settings,
	(settings) => {
		engine.value?.updateSettings(settings)
	},
	{ deep: true }
)

onMounted(async () => {
	window.addEventListener('resize', handleResize)
	await mountEngine()
})

onBeforeUnmount(() => {
	window.removeEventListener('resize', handleResize)
	stopPreview?.()
	if (previewTimer !== null) window.clearTimeout(previewTimer)
	engine.value?.destroy()
})
</script>

<template>
	<div class="gameplay-page" :style="{ '--theme-accent': theme.accent }">
		<div class="hud-row" :class="{ 'left-handed': settings.leftHandedHud }">
			<button class="exit-btn" aria-label="Exit" @click="handleExit">✕</button>
			<!-- Every chip that carries a changing value has a reserved width, so the
			     row is laid out once and the countdown can tick without nudging
			     anything sideways. -->
			<div class="hud-primary">
				<IconChip
					class="chip-time"
					:icon="IconTimer"
					:color="timeCritical ? 'var(--bad)' : modeAccent"
				>
					{{ formatCountdown(hud.remainingSec * 1000) }}
				</IconChip>
				<IconChip :icon="IconHeart" color="#ff6f91">{{ hud.lives }}</IconChip>
				<IconChip class="chip-progress" :icon="IconScore" :color="modeAccent">
					{{ hud.notesCompleted }}/{{ hud.notesTotal }}
				</IconChip>
				<IconChip class="chip-accuracy" :icon="IconCombo" :color="modeAccent">
					{{ Math.round(hud.accuracy) }}%
				</IconChip>
				<IconChip class="chip-tempo" :icon="IconGlow" :color="tempoColor">
					{{ tempoCopy }}
				</IconChip>
			</div>
		</div>

		<div class="stage">
			<div ref="stageRef" class="stage-canvas" />
			<IconSparkle class="stage-sparkle sparkle-1" />
			<IconSparkle class="stage-sparkle sparkle-2" />
			<IconSparkle class="stage-sparkle sparkle-3" />
		</div>

		<div v-if="flash.visible" class="flash" :style="{ color: flash.color }">
			{{ flash.label }}
		</div>

		<div class="keyboard-area">
			<PianoKeyboard
				:active-keys="activeKeys"
				:naming-system="settings.noteNamingSystem"
				:hint-key="session.showKeyHints && settings.keyHintsEnabled ? hud.nextLaneId : null"
				:disabled="!isLandscape || showNewNotesToast || showRulesCard"
				@keydown="onKeyDown"
				@keyup="onKeyUp"
			/>
		</div>

		<!-- Shown once, ever, and shown FIRST: the app can open straight into a
		     level now, so the rules have to arrive before the melody preview
		     rather than after it. Its button also starts the preview. -->
		<div v-if="showRulesCard" class="rotate-overlay">
			<div class="rotate-card rules-card">
				<MascotSlot class="rules-mascot" size="4.4rem" variant="teaching" />
				<span class="rotate-title">How to play</span>
				<ul class="rules-list">
					<li>Play the notes left to right, as written.</li>
					<li>A wrong key costs a life.</li>
					<li>Finish before the clock runs out.</li>
				</ul>
				<button class="acknowledge-btn" @click="dismissRules">Let's play</button>
			</div>
		</div>

		<!-- The same card By Ear opens with: hear the melody once, or skip it and
		     start playing. Skipping stops the playback rather than leaving it
		     sounding under the staff. -->
		<ListeningCard
			v-else-if="isPreviewing"
			:mood="session.themeId"
			:title="session.levelTitle || session.modeTitle"
			:copy="previewNeedsTap ? 'Tap to hear it, then play it back.' : 'Listen first — then play it back.'"
			:needs-tap="previewNeedsTap"
			:skip-label="previewNeedsTap ? 'Play now' : 'Skip'"
			@listen="listenNow"
			@skip="endPreview"
		/>

		<div v-else-if="!isLandscape" class="rotate-overlay">
			<div class="rotate-card">
				<span class="rotate-title">↻ Rotate to play</span>
			</div>
		</div>

		<div v-else-if="showNewNotesToast" class="rotate-overlay new-notes-overlay">
			<div class="rotate-card">
				<span class="rotate-title">New: {{ newNoteLabels }}</span>
				<button class="acknowledge-btn" @click="dismissNewNotesToast">Got it</button>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
@use '../../assets/mixins' as *;

.gameplay-page {
	position: relative;
	display: grid;
	grid-template-rows: auto 1fr auto;
	height: 100%;
	min-height: 0;
	padding:
		max(env(safe-area-inset-top), 0.55rem)
		max(env(safe-area-inset-right), 0.55rem)
		max(env(safe-area-inset-bottom), 0.55rem)
		max(env(safe-area-inset-left), 0.55rem);
	gap: var(--space-2);
	/* The darkest surface in the app: during play nothing may compete with the
	   notes and the hit line. Drawn in CSS, like every other background. */
	background:
		radial-gradient(
			ellipse 60% 40% at 50% -10%,
			color-mix(in srgb, var(--theme-accent) 10%, transparent),
			transparent 70%
		),
		linear-gradient(180deg, #1a2148 0%, var(--bg-deep) 100%);
}

.hud-row {
	display: flex;
	/* Center the exit button and the metric chips on one shared line — with
	   flex-start the round exit button pinned to the top edge while the taller
	   chips centered on their own text, so the row read as two misaligned pieces. */
	align-items: center;
	gap: 0.6rem;
	z-index: 3;
}

.hud-row.left-handed {
	flex-direction: row-reverse;
}

.hud-row.left-handed .hud-primary {
	direction: rtl;
}

.exit-btn {
	flex-shrink: 0;
	/* Square footprint that matches the chip row's height (chip = 0.45rem×2 padding
	   + ~1.2rem text ≈ 2.1rem), and the same rounded-rect radius + fill as the chips
	   so the exit control reads as part of the same HUD set instead of a stray dot. */
	width: 2.1rem;
	height: 2.1rem;
	display: grid;
	place-items: center;
	border-radius: var(--radius-m);
	background: var(--surface-2);
	color: var(--text-2);
	font-size: var(--text-md);
	font-weight: var(--weight-black);
	line-height: 1;
	cursor: pointer;
	position: relative;
}

/* The button tracks the chip height so the HUD stays one line, and on a phone
   that leaves it 26px across — 21px at the 640×300 floor. That is the control
   that ends a level, and it is too small to hit with a thumb. The drawn size
   stays (growing it would push the whole HUD row down and steal staff height);
   the target is widened past it with a transparent overlay, which costs no
   layout. Kept to 38px so it cannot reach the chips beside it. */
.exit-btn::after {
	content: '';
	position: absolute;
	left: 50%;
	top: 50%;
	width: max(100%, 38px);
	height: max(100%, 38px);
	transform: translate(-50%, -50%);
}

/* Pills size to their own content instead of stretching into 4 equal grid
   columns — on a wide landscape screen, forcing a bare "0" to fill a 200px-wide
   column left it looking like an empty, unfinished box. */
.hud-primary {
	flex: 0 1 auto;
	min-width: 0;
	display: flex;
	flex-wrap: wrap;
	gap: 0.5rem;
}

/* IconChip supplies its own base look; the rules below only add HUD-specific
   sizing/breakpoint overrides on top of it (see the media queries further down). */

/* Widths reserved for the widest value each chip can ever show. Without this the
   countdown re-flows the row ten times a second, and the progress chip jumps
   again when it reaches double digits. */
.hud-primary :deep(.chip-time) {
	min-width: 6.4rem;
}

.hud-primary :deep(.chip-progress) {
	min-width: 5.6rem;
}

.hud-primary :deep(.chip-accuracy) {
	min-width: 5rem;
}

.hud-primary :deep(.chip-tempo) {
	min-width: 8.2rem;
}

.stage {
	position: relative;
	min-height: 0;
	border-radius: var(--radius-l);
	overflow: hidden;
	// The sheet of music, lit against the dark cabinet: white paper, a hard edge
	// and a solid drop so it reads as a physical sheet laid on the machine rather
	// than as the page the whole app is printed on.
	background: #ffffff;
	border: 2px solid var(--border-strong);
	box-shadow: var(--shadow-3);
}

.stage-canvas {
	width: 100%;
	height: 100%;
}

.stage-canvas :deep(canvas) {
	display: block;
	width: 100%;
	height: 100%;
}

/* Purely decorative sparkle drift on the gameplay stage — same low-key "toy" flourish
   as the menu's floating notes, so the stage doesn't read as a bare dark panel. */
.stage-sparkle {
	position: absolute;
	color: color-mix(in srgb, var(--theme-accent) 70%, white);
	opacity: 0.5;
	pointer-events: none;
	animation: sparkle-twinkle 3.2s ease-in-out infinite;
}

.sparkle-1 {
	top: 14%;
	left: 6%;
	width: 0.9rem;
	height: 0.9rem;
	animation-delay: 0s;
}

.sparkle-2 {
	top: 66%;
	left: 92%;
	width: 0.7rem;
	height: 0.7rem;
	animation-delay: 1.1s;
}

.sparkle-3 {
	top: 78%;
	left: 12%;
	width: 0.55rem;
	height: 0.55rem;
	animation-delay: 2s;
}

@keyframes sparkle-twinkle {
	0%,
	100% {
		opacity: 0.2;
		transform: scale(0.8);
	}
	50% {
		opacity: 0.75;
		transform: scale(1.15);
	}
}

/* Judgement verdict — the loudest moment in the UI by design (the "20%"), so it
   pops in rather than fading, and carries the colour of the verdict itself. */
.flash {
	position: absolute;
	left: 50%;
	top: 24%;
	transform: translateX(-50%);
	padding: 0.7rem 1.2rem;
	border-radius: var(--radius-round);
	background: var(--surface-raised);
	box-shadow: var(--shadow-float);
	font-size: var(--text-xl);
	font-weight: var(--weight-black);
	letter-spacing: var(--tracking-caps);
	text-transform: uppercase;
	box-shadow: 0 0 2rem color-mix(in srgb, currentcolor 45%, transparent);
	z-index: 4;
	animation: flash-pop var(--dur-3) var(--ease);
}

@keyframes flash-pop {
	0% {
		transform: translateX(-50%) scale(0.82);
		opacity: 0;
	}
	55% {
		transform: translateX(-50%) scale(1.06);
		opacity: 1;
	}
	100% {
		transform: translateX(-50%) scale(1);
		opacity: 1;
	}
}

.keyboard-area {
	position: relative;
	z-index: 3;
}

.rotate-overlay {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	background: rgba(23, 32, 51, 0.55);
	z-index: 8;
}

.rotate-card {
	max-height: 100%;
	overflow-y: auto;
	@include floating;
	max-width: 22rem;
	padding: var(--space-5) var(--space-5);
	text-align: center;
	color: var(--text-1);
}

/* A ♪ glyph above the overlay title — same brand language as the menu, drawn as
   type rather than as an image. */
.rotate-card::before {
	content: '♪';
	display: block;
	margin-bottom: var(--space-2);
	font-size: 1.8rem;
	line-height: 1;
	color: var(--theme-accent);
}

.rotate-title {
	display: block;
	margin-bottom: var(--space-2);
	font-size: var(--text-lg);
	font-weight: var(--weight-black);
}

.rules-card {
	max-width: 26rem;
}

/* The one screen that is purely explanation is the one place the mascot can
   teach without ever sitting over notation. */
.rules-mascot {
	justify-self: center;
	margin-bottom: -0.35rem;
}

.rules-list {
	margin: 0;
	padding: 0;
	list-style: none;
	display: grid;
	gap: var(--space-2);
	text-align: left;
	font-size: var(--text-md);
	color: var(--text-2);
}

.rules-list li {
	padding-left: 1.1rem;
	position: relative;
}

.rules-list li::before {
	content: '♪';
	position: absolute;
	left: 0;
	color: var(--theme-accent);
}

.acknowledge-btn {
	margin-top: var(--space-3);
	padding: 0.65rem 1.4rem;
	border: none;
	border-radius: var(--radius-round);
	background: linear-gradient(135deg, var(--accent), var(--accent-deep));
	color: var(--text-on-accent);
	font-weight: var(--weight-black);
	font-size: var(--text-md);
	cursor: pointer;
}

@media (max-width: 900px) {
	.hud-primary :deep(.icon-chip) {
		padding: 0.6rem 0.75rem;
	}

	.flash {
		top: 22%;
		font-size: 1rem;
	}
}

/* In landscape on a phone, the constrained axis is height (often 320-430px), not
   width — the width breakpoint above rarely fires for a real landscape phone. */
@media (max-height: 560px) {
	.gameplay-page {
		padding-top: max(env(safe-area-inset-top), 0.4rem);
		padding-bottom: max(env(safe-area-inset-bottom), 0.4rem);
		gap: 0.35rem;
	}

	.hud-primary {
		gap: 0.35rem;
	}

	.hud-primary :deep(.icon-chip) {
		padding: 0.32rem 0.5rem;
		border-radius: 0.9rem;
	}

	/* Track the shrunken chip height (0.32rem×2 + ~0.82rem text ≈ 1.65rem) so the
	   exit button stays level with the chips at this breakpoint too. */
	.exit-btn {
		width: 1.65rem;
		height: 1.65rem;
		border-radius: 0.9rem;
		font-size: 0.8rem;
	}

	.hud-primary :deep(.icon-chip strong) {
		font-size: 0.82rem;
	}

	.hud-primary :deep(.icon-chip-icon) {
		width: 0.85rem;
		height: 0.85rem;
	}

	.flash {
		top: 14%;
		font-size: 0.85rem;
		padding: 0.5rem 0.85rem;
	}
}

/* Very short (e.g. small phones with on-screen browser chrome) — the staff still
   needs to win over the keyboard, so trim the keyboard's own floor too (see
   PianoKeyboard.vue) and squeeze the HUD pills down to icons-only rows. */
@media (max-height: 380px) {
	.gameplay-page {
		gap: 0.25rem;
	}

	.hud-primary {
		gap: 0.25rem;
	}

	.hud-primary :deep(.icon-chip) {
		padding: 0.2rem 0.4rem;
		border-radius: 0.7rem;
	}

	.hud-primary :deep(.icon-chip strong) {
		font-size: 0.72rem;
	}

	.hud-primary :deep(.icon-chip-icon) {
		width: 0.7rem;
		height: 0.7rem;
	}

	/* Match the smallest chip height (0.2rem×2 + ~0.72rem text ≈ 1.3rem). */
	.exit-btn {
		width: 1.3rem;
		height: 1.3rem;
		border-radius: 0.7rem;
		font-size: 0.7rem;
	}
}
</style>
