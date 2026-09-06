<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { SettingsState, UserTune } from '@/core/models'
import { BACKGROUND_PRESETS } from '@/modes/modeDefinitions'
import { notesCrossed, type PlacedNote } from '@/features/echo'
import {
	NOTE_LENGTHS,
	advance,
	barMs,
	fromStoredNotes,
	rewindOneStep,
	timelineForTune,
	toStoredNotes,
	windowSpanMs,
	windowStartFor,
	writeNote,
	type NoteLengthId,
} from '@/features/composer'
import { EchoStaff } from '@/game/EchoStaff'
import { audioService } from '@/services/audioService'

import PianoKeyboard from './PianoKeyboard.vue'

// The Studio: the player writes their own tune on the same staff the rest of the
// game reads from. Every key press puts a note where the line stands and moves
// the line on by the chosen length, so a melody is written the way it is hummed
// — one note after another — rather than by dragging blocks around.
//
// Nothing is graded here and nothing is timed. The only two things this screen
// owes the player are that what they wrote is what they hear, and that it is
// still there tomorrow.

const props = defineProps<{
	tune: UserTune
	settings: SettingsState
}>()

const emit = defineEmits<{
	save: [tune: UserTune]
	exit: []
}>()

const theme = computed(() => BACKGROUND_PRESETS.calm)

const staffHost = ref<HTMLElement | null>(null)
// Not a ref: a Vue proxy around a Pixi scene makes the note glyphs ignore the
// positions set on them. See EchoStage for the same note.
let staff: EchoStaff | null = null

const title = ref(props.tune.title)
const bpm = ref(props.tune.bpm)
const notes = ref<PlacedNote[]>(fromStoredNotes(props.tune.notes))
const cursorMs = ref(0)
const activeKeys = ref<string[]>([])
const isRolling = ref(false)
const isLandscape = ref(window.innerWidth > window.innerHeight)
const noteLength = ref<NoteLengthId>('quarter')
const savedAt = ref<string | null>(null)

let nextNoteId = notes.value.length + 1
let frame: number | null = null
let lastFrameAt = 0
let soundedUpToMs = -1

const timelineMs = computed(() => timelineForTune(notes.value, bpm.value, cursorMs.value))
const windowStart = computed(() => windowStartFor(cursorMs.value, bpm.value))
const positionLabel = computed(() => {
	const beat = cursorMs.value / (60000 / Math.max(bpm.value, 1))
	return `${Math.floor(beat / 4) + 1}.${Math.floor(beat % 4) + 1}`
})
const isDirty = computed(() => {
	const stored = JSON.stringify(props.tune.notes)
	return (
		JSON.stringify(toStoredNotes(notes.value)) !== stored ||
		title.value.trim() !== props.tune.title ||
		bpm.value !== props.tune.bpm
	)
})

function setCursor(timeMs: number) {
	cursorMs.value = Math.max(0, Math.min(timelineMs.value, timeMs))
	staff?.setTimeline(timelineMs.value)
	staff?.setWindow(windowStart.value, windowSpanMs(bpm.value))
	staff?.setCursor(cursorMs.value)
	if (!isRolling.value) soundedUpToMs = cursorMs.value - 1
}

function soundNotesUpTo(timeMs: number) {
	notesCrossed(notes.value, soundedUpToMs, timeMs).forEach((note) => audioService.playLane(note.laneId))
	soundedUpToMs = timeMs
}

// Playback is the line moving at the tune's own tempo, sounding what it crosses:
// the same transport By Ear uses, so "play it back" means the same thing in both
// places.
function tick(now: number) {
	frame = window.requestAnimationFrame(tick)
	if (!isRolling.value) {
		lastFrameAt = now
		return
	}

	const delta = lastFrameAt ? Math.min(64, now - lastFrameAt) : 0
	lastFrameAt = now
	const next = cursorMs.value + delta

	if (next >= timelineMs.value) {
		setCursor(timelineMs.value)
		soundNotesUpTo(timelineMs.value)
		isRolling.value = false
		return
	}
	setCursor(next)
	soundNotesUpTo(next)
}

function toggleRoll() {
	if (isRolling.value) {
		isRolling.value = false
		return
	}
	if (cursorMs.value >= timelineMs.value - 1) setCursor(0)
	lastFrameAt = 0
	soundedUpToMs = cursorMs.value - 1
	isRolling.value = true
}

function playFromStart() {
	setCursor(0)
	lastFrameAt = 0
	soundedUpToMs = -1
	isRolling.value = true
}

function onKeyDown(laneId: string) {
	if (!isLandscape.value) return

	if (!activeKeys.value.includes(laneId)) activeKeys.value = [...activeKeys.value, laneId]
	audioService.playLane(laneId)

	notes.value = writeNote(notes.value, laneId, cursorMs.value, bpm.value, nextNoteId)
	nextNoteId += 1
	// While the line is running the player is performing into it; stopped, they
	// are writing, and the line steps on by the length they chose.
	if (!isRolling.value) setCursor(advance(cursorMs.value, noteLength.value, bpm.value))
}

function onKeyUp(laneId: string) {
	activeKeys.value = activeKeys.value.filter((item) => item !== laneId)
}

// A rest is the same gesture as a note without the note: the line moves on and
// leaves a gap. Without it a tune can only be written as an unbroken run.
function addRest() {
	setCursor(advance(cursorMs.value, noteLength.value, bpm.value))
}

function stepBack() {
	setCursor(rewindOneStep(cursorMs.value, noteLength.value, bpm.value))
}

// Undo removes the last note written, not the last one on the staff: after
// moving the line back those are different notes.
function undo() {
	if (!notes.value.length) return
	const last = notes.value.reduce((latest, note) => (note.id > latest.id ? note : latest))
	notes.value = notes.value.filter((note) => note.id !== last.id)
	setCursor(last.timeMs)
}

// Delete whatever stands under the line — the way a player fixes one wrong note
// in the middle of a finished tune.
function deleteAtCursor() {
	const at = cursorMs.value
	notes.value = notes.value.filter((note) => Math.abs(note.timeMs - at) > 1)
}

function clearAll() {
	notes.value = []
	setCursor(0)
	isRolling.value = false
}

function save() {
	emit('save', {
		...props.tune,
		title: title.value.trim() || props.tune.title,
		bpm: bpm.value,
		notes: toStoredNotes(notes.value),
		updatedAt: new Date().toISOString(),
	})
	savedAt.value = new Date().toISOString()
}

function scrubTo(event: PointerEvent) {
	const host = staffHost.value
	if (!host || !staff) return
	const rect = host.getBoundingClientRect()
	isRolling.value = false
	setCursor(staff.timeAt(event.clientX - rect.left, event.clientY - rect.top))
}

function onScrubStart(event: PointerEvent) {
	;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
	scrubTo(event)
}

function onScrubMove(event: PointerEvent) {
	if (event.buttons === 0) return
	scrubTo(event)
}

function onScrubEnd(event: PointerEvent) {
	const target = event.currentTarget as HTMLElement
	if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId)
}

// At the smallest supported screen the control row is wider than the bar it
// sits in, and its scrollbar is hidden on purpose — which left the last button
// looking cut off rather than scrollable. Rather than shrink controls that are
// already thumb-sized, the row says so: these two flags drive a fade on
// whichever edge still has controls behind it.
const transportEl = ref<HTMLElement | null>(null)
const transportOverflows = ref(false)
const transportAtEnd = ref(true)

function measureTransport() {
	const el = transportEl.value
	if (!el) return
	transportOverflows.value = el.scrollWidth > el.clientWidth + 1
	transportAtEnd.value = el.scrollLeft >= el.scrollWidth - el.clientWidth - 1
}

function handleResize() {
	isLandscape.value = window.innerWidth > window.innerHeight
	staff?.resize()
	measureTransport()
}

watch(notes, (value) => {
	staff?.setTimeline(timelineMs.value)
	staff?.setNotes(value)
})

watch(
	() => props.settings.noteNamingSystem,
	(value) => staff?.setNamingSystem(value)
)

// Changing the tempo re-times nothing: the notes keep their millisecond
// positions, so a tune written at 90 played at 120 is the same tune faster,
// which is what a tempo control is for.
watch(bpm, () => setCursor(cursorMs.value))

onMounted(async () => {
	window.addEventListener('resize', handleResize)

	if (staffHost.value) {
		const instance = new EchoStaff(staffHost.value, {
			themeId: 'calm',
			bpm: bpm.value,
			timelineMs: timelineMs.value,
			namingSystem: props.settings.noteNamingSystem,
		})
		await instance.init()
		staff = instance
		instance.setWindow(0, windowSpanMs(bpm.value))
		instance.setNotes(notes.value)
		instance.setCursor(0)
	}

	measureTransport()
	frame = window.requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
	window.removeEventListener('resize', handleResize)
	if (frame !== null) window.cancelAnimationFrame(frame)
	staff?.destroy()
})
</script>

<template>
	<div class="composer-page" :style="{ '--theme-accent': theme.accent }">
		<div class="composer-top">
			<button class="exit-btn" aria-label="Back" @click="emit('exit')">✕</button>
			<input v-model="title" class="title-input" maxlength="40" aria-label="Tune name" />
			<div class="tempo">
				<span class="tempo-label">BPM</span>
				<button class="ghost-btn tiny" aria-label="Slower" @click="bpm = Math.max(50, bpm - 5)">−</button>
				<strong class="tempo-value">{{ bpm }}</strong>
				<button class="ghost-btn tiny" aria-label="Faster" @click="bpm = Math.min(180, bpm + 5)">+</button>
			</div>
			<button class="save-btn" :class="{ dirty: isDirty }" @click="save">
				{{ isDirty ? 'Save' : 'Saved' }}
			</button>
		</div>

		<div
			ref="staffHost"
			class="staff-host"
			@pointerdown.prevent="onScrubStart"
			@pointermove.prevent="onScrubMove"
			@pointerup.prevent="onScrubEnd"
			@pointercancel.prevent="onScrubEnd"
		/>

		<div
			ref="transportEl"
			class="transport"
			:class="{ 'has-more': transportOverflows && !transportAtEnd }"
			@scroll="measureTransport"
		>
			<button class="ghost-btn" aria-label="To the start" @click="setCursor(0)">⏮</button>
			<button
				class="ghost-btn"
				aria-label="Back a bar"
				@click="setCursor(cursorMs - barMs(bpm))"
			>
				⏪
			</button>
			<button class="roll-btn" :class="{ rolling: isRolling }" @click="toggleRoll">
				{{ isRolling ? '⏸' : '▶' }}
			</button>
			<button class="ghost-btn" aria-label="Play from the start" @click="playFromStart">⟲</button>
			<span class="position">{{ positionLabel }}</span>

			<!-- The note length every key press writes. It is the one thing the
			     screen cannot guess, so it lives in the middle of the controls
			     rather than behind a menu. -->
			<div class="lengths">
				<button
					v-for="length in NOTE_LENGTHS"
					:key="length.id"
					class="length-btn"
					:class="{ active: noteLength === length.id }"
					:aria-label="length.id"
					@click="noteLength = length.id"
				>
					{{ length.label }}
				</button>
			</div>

			<span class="transport-gap" />
			<button class="ghost-btn" aria-label="Step back" @click="stepBack">◀</button>
			<button class="ghost-btn" aria-label="Rest" @click="addRest">▬</button>
			<button class="ghost-btn" :disabled="!notes.length" aria-label="Undo" @click="undo">⌫</button>
			<button class="ghost-btn" :disabled="!notes.length" @click="deleteAtCursor">Erase</button>
			<button class="ghost-btn" :disabled="!notes.length" @click="clearAll">Clear</button>
		</div>

		<div class="keyboard-area">
			<PianoKeyboard
				:active-keys="activeKeys"
				:naming-system="settings.noteNamingSystem"
				:disabled="!isLandscape"
				@keydown="onKeyDown"
				@keyup="onKeyUp"
			/>
		</div>

		<div v-if="!isLandscape" class="rotate-overlay">
			<div class="rotate-card">
				<span class="rotate-title">↻ Rotate to write</span>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
@use '../../assets/mixins' as *;

.composer-page {
	position: relative;
	display: grid;
	grid-template-rows: auto 1fr auto auto;
	height: 100%;
	min-height: 0;
	gap: var(--space-2);
	padding:
		max(env(safe-area-inset-top), 0.55rem)
		max(env(safe-area-inset-right), 0.55rem)
		max(env(safe-area-inset-bottom), 0.55rem)
		max(env(safe-area-inset-left), 0.55rem);
	background:
		radial-gradient(
			ellipse 60% 40% at 50% -10%,
			color-mix(in srgb, var(--theme-accent) 12%, transparent),
			transparent 70%
		),
		linear-gradient(180deg, #1a2148 0%, var(--bg-deep) 100%);
}

.composer-top {
	display: flex;
	align-items: center;
	gap: var(--space-2);
}

.exit-btn {
	flex-shrink: 0;
	width: 2.1rem;
	height: 2.1rem;
	display: grid;
	place-items: center;
	border-radius: var(--radius-m);
	border: 1px solid var(--border);
	background: var(--surface-2);
	color: var(--text-2);
	font-size: var(--text-md);
	font-weight: var(--weight-black);
	line-height: 1;
	cursor: pointer;
}

.title-input {
	flex: 1 1 auto;
	min-width: 0;
	padding: 0.35rem 0.6rem;
	border-radius: var(--radius-m);
	border: 1px solid var(--border);
	background: var(--surface-1);
	color: var(--text-1);
	font-size: var(--text-lg);
	font-weight: var(--weight-black);
	font-family: inherit;

	&:focus {
		outline: none;
		border-color: var(--accent);
	}
}

.tempo {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0.2rem 0.45rem;
	border-radius: var(--radius-m);
	border: 1px solid var(--border);
	background: var(--surface-1);
}

.tempo-label {
	@include caps;
	color: var(--text-3);
}

.tempo-value {
	min-width: 2.4rem;
	text-align: center;
	color: var(--text-1);
	font-variant-numeric: tabular-nums;
}

.save-btn {
	@include chunky-ghost;
	padding: 0.45rem 1.1rem;
	font-size: var(--text-sm);
	cursor: pointer;
}

.save-btn.dirty {
	@include chunky(var(--good), #12946c);
	padding: 0.45rem 1.1rem;
}

.staff-host {
	position: relative;
	min-height: 0;
	border-radius: var(--radius-l);
	overflow: hidden;
	background: #ffffff;
	border: 2px solid var(--border-strong);
	box-shadow: var(--shadow-3);
	touch-action: none;
	cursor: ew-resize;
}

.transport {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--space-2);
}

/* On a phone in landscape the controls wrapping onto a second row cost the
   staff two thirds of its height — 41px of paper is not a staff. One row that
   scrolls sideways keeps every control reachable and the music readable. */
@media (max-height: 560px) {
	.transport {
		flex-wrap: nowrap;
		overflow-x: auto;
		scrollbar-width: none;
		gap: 0.35rem;
	}

	.transport::-webkit-scrollbar {
		display: none;
	}

	.ghost-btn,
	.roll-btn {
		flex: 0 0 auto;
		padding: 0.3rem 0.6rem;
	}

	.roll-btn {
		min-width: 2.6rem;
	}

	.length-btn,
	.length-btn.active {
		min-width: 1.9rem;
		padding: 0.15rem 0.3rem;
		font-size: var(--text-md);
	}

	.composer-top {
		gap: 0.35rem;
	}

	.title-input {
		font-size: var(--text-md);
		padding: 0.25rem 0.45rem;
	}
}

/* At the supported floor the row still did not fit: 708px of controls in a
   622px bar, so "Erase" and "Clear" sat past the right edge — and the scrollbar
   is hidden here, so nothing on screen suggested they were there at all.
   Tightening the gaps and the two reserved widths brings the row inside the
   bar, which puts the sideways scroll back to what it should be: a fallback for
   anything narrower than we support, not the way controls are normally found. */
@media (max-height: 420px) {
	.transport {
		gap: 0.22rem;
	}

	.ghost-btn,
	.roll-btn {
		padding: 0.3rem 0.42rem;
	}

	.roll-btn {
		min-width: 2.2rem;
	}

	.position {
		min-width: 2.1rem;
	}
}

/* The only thing that tells a player the row continues: its right edge fades
   while controls are still hidden behind it, and clears once the row is
   scrolled to the end. The buttons under the fade stay clickable — a mask
   changes what is drawn, not what is hit. */
.transport.has-more {
	-webkit-mask-image: linear-gradient(to right, #000 calc(100% - 2.4rem), transparent 100%);
	mask-image: linear-gradient(to right, #000 calc(100% - 2.4rem), transparent 100%);
}

.transport-gap {
	flex: 1 1 auto;
}

.position {
	min-width: 2.6rem;
	text-align: center;
	color: var(--text-3);
	font-size: var(--text-sm);
	font-weight: var(--weight-bold);
	font-variant-numeric: tabular-nums;
}

.lengths {
	display: inline-flex;
	gap: 0.25rem;
	padding: 0.2rem;
	border-radius: var(--radius-m);
	border: 1px solid var(--border);
	background: var(--surface-1);
}

.length-btn {
	@include chunky-ghost(var(--radius-s));
	min-width: 2.2rem;
	padding: 0.25rem 0.4rem;
	font-size: var(--text-lg);
	line-height: 1;
	cursor: pointer;
}

.length-btn.active {
	@include chunky(var(--accent), var(--accent-deep), var(--radius-s));
	min-width: 2.2rem;
	padding: 0.25rem 0.4rem;
}

.ghost-btn {
	@include chunky-ghost;
	padding: 0.45rem 0.9rem;
	color: var(--text-2);
	font-size: var(--text-sm);
	cursor: pointer;
}

.ghost-btn.tiny {
	padding: 0.15rem 0.45rem;
	font-size: var(--text-md);
}

.roll-btn {
	@include chunky(var(--mode-time), var(--mode-time-deep));
	min-width: 3.4rem;
	padding: 0.45rem 0.9rem;
	font-size: var(--text-sm);
	cursor: pointer;
}

.roll-btn.rolling {
	@include chunky(var(--mode-records), var(--mode-records-deep));
	min-width: 3.4rem;
	padding: 0.45rem 0.9rem;
}

.keyboard-area {
	min-height: 0;
}

.rotate-overlay {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	padding: var(--space-4);
	background: color-mix(in srgb, var(--bg-deep) 86%, transparent);
	z-index: 5;
}

.rotate-card {
	@include floating;
	padding: var(--space-5);
	text-align: center;
}

.rotate-title {
	font-size: var(--text-xl);
	font-weight: var(--weight-black);
	color: var(--text-1);
}
</style>
