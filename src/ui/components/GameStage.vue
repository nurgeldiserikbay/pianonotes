<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { GameplayResult, HudSnapshot, SessionConfig, SettingsState } from '@/core/models'
import { BACKGROUND_PRESETS } from '@/modes/modeDefinitions'
import { RhythmGame } from '@/game/RhythmGame'
import { formatAccuracy, formatTime } from '@/features/scoring'

import PianoKeyboard from './PianoKeyboard.vue'

const props = defineProps<{
	session: SessionConfig
	settings: SettingsState
}>()

const emit = defineEmits<{
	finish: [result: GameplayResult]
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

const theme = computed(() => BACKGROUND_PRESETS[props.session.themeId])

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
	engine.value.setPaused(!isLandscape.value)
}

function handleResize() {
	isLandscape.value = window.innerWidth > window.innerHeight
	engine.value?.resize()
	engine.value?.setPaused(!isLandscape.value)
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
		<div class="hud" :class="{ 'left-handed': settings.leftHandedHud }">
			<div class="hud-pill">
				<span class="hud-label">Score</span>
				<strong>{{ hud.score }}</strong>
			</div>
			<div class="hud-pill">
				<span class="hud-label">Lives</span>
				<strong>{{ hud.lives }}</strong>
			</div>
			<div class="hud-pill">
				<span class="hud-label">Accuracy</span>
				<strong>{{ formatAccuracy(hud.accuracy) }}</strong>
			</div>
			<div class="hud-pill">
				<span class="hud-label">{{ session.modeId === 'endless' ? 'Survival' : 'Time' }}</span>
				<strong>{{ formatTime(hud.elapsedSec) }}</strong>
			</div>
			<div class="hud-pill">
				<span class="hud-label">Combo</span>
				<strong>x{{ hud.combo }}</strong>
			</div>
			<div class="hud-pill accent">
				<span class="hud-label">Pace</span>
				<strong>{{ hud.currentSpeedLabel }}</strong>
			</div>
		</div>

		<div ref="stageRef" class="stage" />

		<div v-if="flash.visible" class="flash" :style="{ color: flash.color }">
			{{ flash.label }}
		</div>

		<div class="keyboard-area">
			<PianoKeyboard
				:active-keys="activeKeys"
				:disabled="!isLandscape"
				@keydown="onKeyDown"
				@keyup="onKeyUp"
			/>
		</div>

		<div v-if="!isLandscape" class="rotate-overlay">
			<div class="rotate-card">
				<span class="rotate-title">Rotate to landscape</span>
				<p>Turn the phone sideways so the full staff and two-octave keyboard stay easy to play.</p>
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
		max(env(safe-area-inset-top), 0.8rem)
		max(env(safe-area-inset-right), 0.8rem)
		max(env(safe-area-inset-bottom), 0.8rem)
		max(env(safe-area-inset-left), 0.8rem);
	gap: 0.8rem;
	background:
		radial-gradient(circle at 16% 4%, rgba(255, 255, 255, 0.12), transparent 28%),
		radial-gradient(circle at 82% 8%, rgba(255, 164, 206, 0.16), transparent 24%);
}

.hud {
	display: grid;
	grid-template-columns: repeat(6, minmax(0, 1fr));
	gap: 0.65rem;
	z-index: 3;
}

.hud.left-handed {
	direction: rtl;
}

.hud-pill {
	display: grid;
	gap: 0.18rem;
	padding: 0.75rem 0.95rem;
	border-radius: 1.25rem;
	background: linear-gradient(155deg, rgba(24, 28, 56, 0.68), rgba(8, 10, 22, 0.5));
	border: 1px solid rgba(255, 255, 255, 0.14);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
	backdrop-filter: blur(16px);
}

.hud-pill.accent {
	background: linear-gradient(135deg, rgba(255, 219, 121, 0.22), rgba(255, 117, 190, 0.18), rgba(6, 10, 24, 0.5));
}

.hud-label {
	font-size: 0.72rem;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: rgba(235, 240, 255, 0.66);
}

.hud-pill strong {
	font-size: clamp(0.95rem, 1.8vw, 1.25rem);
	color: white;
}

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

.stage :deep(canvas) {
	display: block;
	width: 100%;
	height: 100%;
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
	padding: 1.4rem;
	border-radius: 1.6rem;
	background: rgba(14, 18, 34, 0.94);
	border: 1px solid rgba(255, 255, 255, 0.1);
	text-align: center;
	color: rgba(237, 242, 255, 0.88);
}

.rotate-title {
	display: block;
	margin-bottom: 0.5rem;
	font-size: 1.05rem;
	font-weight: 800;
}

@media (max-width: 900px) {
	.hud {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.hud-pill {
		padding: 0.6rem 0.75rem;
	}

	.flash {
		top: 22%;
		font-size: 1rem;
	}
}
</style>
