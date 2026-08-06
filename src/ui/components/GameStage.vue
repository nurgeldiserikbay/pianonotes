<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { GameplayResult, HudSnapshot, SessionConfig, SettingsState } from '@/core/models'
import { BACKGROUND_PRESETS } from '@/modes/modeDefinitions'
import { RhythmGame } from '@/game/RhythmGame'
import { formatTime } from '@/features/scoring'
import { getLaneLabel } from '@/entities/piano'

import IconCombo from '@/assets/icons/combo.svg'
import IconHeart from '@/assets/icons/heart.svg'
import IconScore from '@/assets/icons/score.svg'
import IconTimer from '@/assets/icons/timer.svg'
import IconSparkle from '@/assets/decor/sparkle.svg'

import IconChip from './IconChip.vue'
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
const engine = ref<RhythmGame | null>(null)
const activeKeys = ref<string[]>([])
const hud = ref<HudSnapshot>({
	score: 0,
	combo: 0,
	lives: props.session.lives,
	accuracy: 100,
	elapsedSec: 0,
	maxCombo: 0,
	misses: 0,
	perfect: 0,
	great: 0,
	good: 0,
	currentSpeedLabel: props.session.modeId === 'time' ? 'Manual tempo' : `${props.session.bpm} BPM`,
	notesCompleted: 0,
	streak: 0,
	modeId: props.session.modeId,
})
const flash = ref({ label: '', color: '#ffffff', visible: false })
const isLandscape = ref(window.innerWidth > window.innerHeight)

// First-time-note tutorial: pauses gameplay until the player acknowledges the new
// notes this level/world introduces (see appStore.buildCampaignSession).
const showNewNotesToast = ref(Boolean(props.session.newNotes?.length))
const newNoteLabels = computed(() =>
	(props.session.newNotes ?? [])
		.map((laneId) => getLaneLabel(laneId, props.settings.noteNamingSystem))
		.join(', ')
)

const theme = computed(() => BACKGROUND_PRESETS[props.session.themeId])

// Note Trainer reuses the 'time' engine path (see appStore.buildTrainerSession), so it's
// told apart by title, not modeId, when picking a HUD accent color.
const modeAccent = computed(() => {
	if (props.session.modeTitle === 'Note Trainer') return 'var(--mode-trainer)'
	if (props.session.modeId === 'campaign') return 'var(--mode-campaign)'
	if (props.session.modeId === 'endless') return 'var(--mode-endless)'
	return 'var(--mode-time)'
})

function shouldPauseEngine() {
	return !isLandscape.value || showNewNotesToast.value
}

async function mountEngine() {
	if (!stageRef.value) return

	engine.value = new RhythmGame(stageRef.value, props.session, props.settings, {
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

// There was previously no way to leave a gameplay session short of losing all lives
// or finishing the chart — a real dead end in Note Trainer (999 lives, waits forever).
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
	engine.value?.destroy()
})
</script>

<template>
	<div class="gameplay-page" :style="{ '--theme-accent': theme.accent }">
		<div class="hud-row" :class="{ 'left-handed': settings.leftHandedHud }">
			<button class="exit-btn" aria-label="Exit" @click="handleExit">✕</button>
			<div class="hud-primary">
				<IconChip :icon="IconScore" :color="modeAccent">{{ hud.score }}</IconChip>
				<IconChip :icon="IconHeart" color="#ff6f91">{{ hud.lives >= 999 ? '∞' : hud.lives }}</IconChip>
				<IconChip :icon="IconCombo" :color="modeAccent">×{{ hud.combo }}</IconChip>
				<IconChip :icon="IconTimer" :color="modeAccent">{{ formatTime(hud.elapsedSec) }}</IconChip>
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
				:disabled="!isLandscape || showNewNotesToast"
				@keydown="onKeyDown"
				@keyup="onKeyUp"
			/>
		</div>

		<div v-if="!isLandscape" class="rotate-overlay">
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
.gameplay-page {
	position: relative;
	display: grid;
	grid-template-rows: auto 1fr auto;
	height: 100dvh;
	padding:
		max(env(safe-area-inset-top), 0.55rem)
		max(env(safe-area-inset-right), 0.55rem)
		max(env(safe-area-inset-bottom), 0.55rem)
		max(env(safe-area-inset-left), 0.55rem);
	gap: 0.5rem;
	/* Same neon-staff scene as the rest of the app, but heavily darkened so it
	   never competes with the falling notes on the Pixi stage. */
	background:
		radial-gradient(circle at 16% 4%, rgba(255, 255, 255, 0.1), transparent 28%),
		radial-gradient(circle at 82% 8%, rgba(255, 164, 206, 0.12), transparent 24%),
		linear-gradient(160deg, rgba(7, 9, 20, 0.88), rgba(7, 9, 20, 0.94)),
		var(--asset-bg-scene, none) center / cover no-repeat,
		#070914;
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
	border: 1px solid rgba(255, 255, 255, 0.16);
	background: linear-gradient(155deg, rgba(24, 28, 56, 0.68), rgba(8, 10, 22, 0.5));
	color: rgba(255, 255, 255, 0.92);
	font-size: 0.9rem;
	font-weight: 800;
	line-height: 1;
	cursor: pointer;
	backdrop-filter: blur(16px);
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

.stage {
	position: relative;
	min-height: 0;
	border-radius: 2rem;
	overflow: hidden;
	background: linear-gradient(180deg, rgba(18, 22, 44, 0.58), rgba(9, 12, 28, 0.42));
	border: 1px solid rgba(255, 255, 255, 0.14);
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.06),
		0 26px 80px rgba(0, 0, 0, 0.24),
		0 0 2.4rem color-mix(in srgb, var(--theme-accent) 14%, transparent);
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

.flash {
	position: absolute;
	left: 50%;
	top: 26%;
	transform: translateX(-50%);
	padding: 0.8rem 1.25rem;
	border-radius: 999px;
	background: linear-gradient(135deg, rgba(17, 20, 38, 0.8), rgba(8, 10, 22, 0.56));
	border: 1px solid rgba(255, 255, 255, 0.12);
	backdrop-filter: blur(14px);
	font-size: 1.25rem;
	font-weight: 800;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	box-shadow: 0 0 2rem color-mix(in srgb, var(--theme-accent) 60%, transparent);
	z-index: 4;
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
	background: rgba(4, 7, 16, 0.74);
	z-index: 8;
}

.rotate-card {
	max-width: 22rem;
	padding: 1.4rem 1.6rem;
	border-radius: var(--radius-l);
	background: linear-gradient(160deg, rgba(20, 24, 48, 0.96), rgba(11, 14, 30, 0.9));
	border: 1px solid rgba(255, 255, 255, 0.14);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), var(--shadow-2);
	backdrop-filter: blur(18px);
	text-align: center;
	color: rgba(237, 242, 255, 0.9);
}

/* Treble-clef mark above the overlay title, tying the tutorial/rotate cards into
   the same brand language as the menu. */
.rotate-card::before {
	content: '';
	display: block;
	width: 2.6rem;
	height: 2.6rem;
	margin: 0 auto 0.6rem;
	background: var(--asset-treble) center / contain no-repeat;
	filter: var(--art-shadow);
}

.rotate-title {
	display: block;
	margin-bottom: 0.5rem;
	font-size: 1.05rem;
	font-weight: 800;
}

.acknowledge-btn {
	margin-top: 0.9rem;
	padding: 0.65rem 1.4rem;
	border: none;
	border-radius: 999px;
	background: linear-gradient(135deg, #ffd86f 0%, #ff9dd8 45%, var(--theme-accent) 100%);
	color: #07111f;
	font-weight: 800;
	font-size: 0.9rem;
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
