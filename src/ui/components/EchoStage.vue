<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import type { EchoSessionConfig, SettingsState } from '@/core/models'
import { BACKGROUND_PRESETS, ECHO_CONFIG } from '@/modes/modeDefinitions'
import {
	compareEcho,
	getTimelineMs,
	nextOnsetMs,
	notesCrossed,
	placeNote,
	type EchoScore,
	type PlacedNote,
} from '@/features/echo'
import { EchoStaff, type NoteMark } from '@/game/EchoStaff'
import { audioService } from '@/services/audioService'
import admob from '@/utils/admob'

import ListeningCard from './ListeningCard.vue'
import MoodScene from './MoodScene.vue'
import PianoKeyboard from './PianoKeyboard.vue'

// By Ear. The same staff Campaign is read from, used the other way round: a line
// sweeps across an empty stave and every key the player presses is written down
// where the line stands. Nothing about the phrase is shown — it is only ever
// heard — so what ends up on the paper is the player's own answer, and the round
// is graded by comparing it with the tune.
//
// The line can be dragged back. That is the difference between this and playing
// along: a player who hears they put the third note in the wrong bar can return
// to that bar and write it again, which makes the mode about deciding where a
// note belongs rather than about reacting in time.

const props = defineProps<{
	session: EchoSessionConfig
	settings: SettingsState
}>()

const emit = defineEmits<{
	finish: [score: EchoScore]
	exit: []
}>()

const theme = computed(() => BACKGROUND_PRESETS[props.session.themeId])
const beatMs = computed(() => 60000 / Math.max(props.session.bpm, 1))
const timelineMs = computed(() => getTimelineMs(props.session.phrase, props.session.bpm))
const barMs = computed(() => beatMs.value * 4)


const staffHost = ref<HTMLElement | null>(null)
// Deliberately NOT a ref. Vue's refs are deep-reactive, so storing the staff in
// one hands out a Proxy of it, and every Pixi object reached through that proxy
// is proxied too — the note glyphs then ignore the positions set on them and
// pile up at the top-left corner of the canvas. Nothing in the template reads
// it, so a plain binding is both correct and enough.
let staff: EchoStaff | null = null

const activeKeys = ref<string[]>([])
const notes = ref<PlacedNote[]>([])
const cursorMs = ref(0)
const isRolling = ref(false)
const isListening = ref(false)
const listens = ref(0)
const adPending = ref(false)
// Corrections left in this attempt. They are spent, not free: see ECHO_CONFIG.
const undosLeft = ref(ECHO_CONFIG.undos)
const clearsLeft = ref(ECHO_CONFIG.clears)
const isLandscape = ref(window.innerWidth > window.innerHeight)
// The last check, kept on screen. Checking does not leave the staff: the player
// needs to see which of their own notes were right, against the phrase they were
// aiming at, in the place where they wrote them.
const review = ref<EchoScore | null>(null)
// The listening card belongs to opening the mode, not to every playback: once
// the player is writing, a full-screen card over the staff on each "listen
// again" would cover the very notes they are checking themselves against.
const introListen = ref(true)

// Shown once, ever: the mode's rules are three lines, and a player who already
// knows them should not meet a card every time they open it.
const RULES_SEEN_KEY = 'piano-notes-echo-seen-v2'
const showRules = ref(false)

try {
	showRules.value = window.localStorage.getItem(RULES_SEEN_KEY) !== '1'
} catch {
	showRules.value = false
}

let nextNoteId = 1
let stopPlayback: (() => void) | null = null
let playbackTimer: number | null = null
let frame: number | null = null
let lastFrameAt = 0
// How far the transport has already sounded. Playing back what the player wrote
// is the point of the ▶ button — a line sweeping over notes in silence tells
// them nothing about whether the tune they wrote is the tune they heard.
let soundedUpToMs = -1

const phraseLength = computed(() => props.session.phrase.length)
const entered = computed(() => notes.value.length)
const freeListensLeft = computed(() => Math.max(0, ECHO_CONFIG.freeListens - listens.value))
const needsAdToListen = computed(() => freeListensLeft.value === 0)
const canSubmit = computed(() => entered.value > 0 && !isListening.value && !review.value)

// Verdict per written note, keyed by the note's id, for the staff to ring.
const marks = computed(() => {
	const score = review.value
	if (!score) return {} as Record<number, NoteMark>

	const byIndex = notes.value
	const result: Record<number, NoteMark> = {}
	score.steps.forEach((step) => {
		if (step.playedIndex === undefined) return
		const note = byIndex[step.playedIndex]
		if (!note) return
		if (step.kind === 'match') result[note.id] = step.inTime === false ? 'late' : 'match'
		else if (step.kind === 'wrong') result[note.id] = 'wrong'
		else if (step.kind === 'extra') result[note.id] = 'extra'
	})
	return result
})

const reviewCopy = computed(() => {
	const score = review.value
	if (!score) return ''
	if (score.noteAccuracy >= 99 && score.timingAccuracy >= 80) return 'Note for note.'
	if (score.missing || score.extra || score.wrong) {
		const parts: string[] = []
		if (score.wrong) parts.push(`${score.wrong} wrong`)
		if (score.missing) parts.push(`${score.missing} missed`)
		if (score.extra) parts.push(`${score.extra} extra`)
		return parts.join(' · ')
	}
	return 'Right notes — check the spacing.'
})

const listenLabel = computed(() => {
	if (isListening.value) return 'Stop'
	if (adPending.value) return 'Loading ad…'
	if (needsAdToListen.value) return 'Watch ad · hear it again'
	return listens.value === 0 ? 'Listen' : `Listen again (${freeListensLeft.value})`
})

// Bar and beat under the line, counted from one the way a musician counts them.
// A bare millisecond readout would be precise and unusable.
const positionLabel = computed(() => {
	const beat = cursorMs.value / beatMs.value
	return `${Math.floor(beat / 4) + 1}.${Math.floor(beat % 4) + 1}`
})

function stopRolling() {
	isRolling.value = false
	lastFrameAt = 0
}

function setCursor(timeMs: number) {
	cursorMs.value = Math.max(0, Math.min(timelineMs.value, timeMs))
	staff?.setCursor(cursorMs.value)
	// Moving the line by hand is not playback: dragging across the staff would
	// otherwise fire every note it passed as fast as the finger moved.
	if (!isRolling.value) soundedUpToMs = cursorMs.value - 1
}

// Every note the line has just crossed, in the order it crossed them.
function soundNotesUpTo(timeMs: number) {
	notesCrossed(notes.value, soundedUpToMs, timeMs).forEach((note) => audioService.playLane(note.laneId))
	soundedUpToMs = timeMs
}

// The transport. It runs on rAF rather than on the audio clock because nothing
// is being played back against it — it is a ruler moving across paper, and the
// only thing that has to stay honest is where it stands when a key goes down.
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
		stopRolling()
		return
	}
	setCursor(next)
	soundNotesUpTo(next)
}

function toggleRoll() {
	if (isRolling.value) {
		stopRolling()
		return
	}
	// Starting from the very end would look broken: the line is already there and
	// nothing would move. Rewind to the top instead.
	if (cursorMs.value >= timelineMs.value - 1) setCursor(0)
	lastFrameAt = 0
	// A note sitting exactly where the line starts still belongs to this pass.
	soundedUpToMs = cursorMs.value - 1
	isRolling.value = true
}

function rewindBar() {
	// Back to the start of the bar the line is in, or to the previous one when it
	// already sits on a bar line — "back one bar" has to move every time.
	const bar = Math.floor(cursorMs.value / barMs.value)
	const atBarStart = Math.abs(cursorMs.value - bar * barMs.value) < 20
	setCursor((atBarStart ? bar - 1 : bar) * barMs.value)
}

function rewindStart() {
	setCursor(0)
}

function stopPlaybackNow() {
	stopPlayback?.()
	stopPlayback = null
	if (playbackTimer !== null) {
		window.clearTimeout(playbackTimer)
		playbackTimer = null
	}
	isListening.value = false
}

function playPhrase() {
	stopPlaybackNow()
	// The default cap is written for a preview of a whole melody; a phrase at a
	// slow tempo can run past it, and a phrase cut off mid-way is not the thing
	// the player is being asked to reproduce.
	const playback = audioService.playSequence(props.session.phrase, 30000)
	if (!playback.durationMs) return false

	isListening.value = true
	stopPlayback = playback.stop
	// A tail beyond the last note, so the phrase ends in silence rather than in
	// the player's first key.
	playbackTimer = window.setTimeout(() => {
		stopPlaybackNow()
		introListen.value = false
	}, playback.durationMs + 400)
	return true
}

// The rewarded ad is the only one the player asks for, and it buys the one thing
// this mode can sell: hearing the phrase again.
async function listen() {
	if (adPending.value) return
	// The button is also the way out of a playback the player has heard enough
	// of: the keys stay locked while the phrase sounds, so without this they
	// would sit through all of it before they could start answering.
	if (isListening.value) {
		stopPlaybackNow()
		introListen.value = false
		return
	}

	if (needsAdToListen.value) {
		adPending.value = true
		const rewarded = await admob.showRewarded().catch(() => false)
		adPending.value = false
		if (!rewarded) return
		listens.value -= 1
	}

	stopRolling()
	if (playPhrase()) listens.value += 1
}

// Skipping the opening card stops the melody so the player can start writing —
// letting it play on under a dismissed card is the one thing Skip must not do.
function skipIntro() {
	stopPlaybackNow()
	introListen.value = false
}

function onKeyDown(laneId: string) {
	if (isListening.value || showRules.value || !isLandscape.value || review.value) return

	if (!activeKeys.value.includes(laneId)) activeKeys.value = [...activeKeys.value, laneId]
	audioService.playLane(laneId)

	notes.value = placeNote(notes.value, laneId, cursorMs.value, props.session.bpm, nextNoteId)
	nextNoteId += 1

	// With the line stopped the staff is being written on rather than played to,
	// so the line moves on by itself — to where the tune puts its next note, so
	// the answer inherits the melody's own spacing. Without this every key would
	// land on the same spot and overwrite the note before it.
	if (!isRolling.value) {
		setCursor(nextOnsetMs(props.session.phrase, cursorMs.value, props.session.bpm))
	}
}

function onKeyUp(laneId: string) {
	activeKeys.value = activeKeys.value.filter((item) => item !== laneId)
}

function undo() {
	if (!notes.value.length || !undosLeft.value) return
	undosLeft.value -= 1
	// The last note *written*, not the last one on the staff: after a rewind
	// those are different notes, and the player means the one they just played.
	const last = notes.value.reduce((latest, note) => (note.id > latest.id ? note : latest))
	notes.value = notes.value.filter((note) => note.id !== last.id)
	setCursor(last.timeMs)
}

function clearAll() {
	if (!notes.value.length || !clearsLeft.value) return
	clearsLeft.value -= 1
	review.value = null
	staff?.setGhosts(null)
	notes.value = []
	setCursor(0)
	stopRolling()
}

// Checking marks up the staff instead of leaving it. The score screen still
// exists — it is where the attempt is recorded — but it is one tap further on,
// so the first thing the player sees is their own notes with the verdict on
// them. It happens once: an answer that can be corrected after being marked is
// not an answer, and a score built from the third look at the right notes says
// nothing about what the player heard.
function submit() {
	if (!canSubmit.value) return
	stopPlaybackNow()
	stopRolling()
	review.value = compareEcho(props.session.phrase, notes.value, props.session.bpm)
	staff?.setNotes(notes.value, marks.value)
	staff?.setGhosts(props.session.phrase)
}

function done() {
	if (!review.value) return
	emit('finish', review.value)
}

function dismissRules() {
	showRules.value = false
	try {
		window.localStorage.setItem(RULES_SEEN_KEY, '1')
	} catch {
		// Private mode / quota: showing the card again is harmless.
	}
	// This tap is also the gesture the browser was waiting for, so it can carry
	// the first playback: otherwise the player taps "Got it", then "Listen".
	void listen()
}

// Dragging the line: the staff is a timeline, so pointing at a spot on it is the
// plainest way to say "take me back there".
function scrubTo(event: PointerEvent) {
	const host = staffHost.value
	if (!host || !staff) return
	const rect = host.getBoundingClientRect()
	setCursor(staff.timeAt(event.clientX - rect.left, event.clientY - rect.top))
}

function onScrubStart(event: PointerEvent) {
	if (showRules.value) return
	stopRolling()
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

function handleResize() {
	isLandscape.value = window.innerWidth > window.innerHeight
	staff?.resize()
}

watch(notes, (value) => staff?.setNotes(value, marks.value))
watch(
	() => props.settings.noteNamingSystem,
	(value) => staff?.setNamingSystem(value)
)

onMounted(async () => {
	window.addEventListener('resize', handleResize)

	if (staffHost.value) {
		const instance = new EchoStaff(staffHost.value, {
			themeId: props.session.themeId,
			bpm: props.session.bpm,
			timelineMs: timelineMs.value,
			namingSystem: props.settings.noteNamingSystem,
		})
		await instance.init()
		staff = instance
		instance.setNotes(notes.value)
		instance.setCursor(cursorMs.value)
	}

	frame = window.requestAnimationFrame(tick)

	// Nothing is played unattended: audio started before the first gesture is
	// silent, and a silent "Listen" spent for nothing is the worst first
	// impression this mode could make.
	if (!showRules.value && audioService.isAudible()) void listen()
})

onBeforeUnmount(() => {
	window.removeEventListener('resize', handleResize)
	if (frame !== null) window.cancelAnimationFrame(frame)
	stopPlaybackNow()
	staff?.destroy()
})
</script>

<template>
	<div class="echo-page" :style="{ '--theme-accent': theme.accent }">
		<div class="echo-top">
			<button class="exit-btn" aria-label="Exit" @click="emit('exit')">✕</button>
			<div class="echo-title">
				<span class="eyebrow">By Ear</span>
				<strong>{{ session.title }}</strong>
			</div>
			<button
				class="listen-btn"
				:class="{ paid: needsAdToListen }"
				:disabled="adPending"
				@click="listen"
			>
				<span class="listen-icon">♪</span>
				{{ listenLabel }}
			</button>
			<span class="echo-count" :class="{ full: entered >= phraseLength }">
				{{ entered }}/{{ phraseLength }}
			</span>
		</div>

		<!-- The staff is also the scrub bar: a pointer anywhere on it moves the
		     line there. -->
		<div
			ref="staffHost"
			class="staff-host"
			@pointerdown.prevent="onScrubStart"
			@pointermove.prevent="onScrubMove"
			@pointerup.prevent="onScrubEnd"
			@pointercancel.prevent="onScrubEnd"
		/>

		<!-- After a check the transport row becomes the verdict row: the same strip
		     of screen, so the player's eye stays on the staff above it. -->
		<div v-if="review" class="transport review-row">
			<span class="review-score">
				Notes <strong>{{ Math.round(review.noteAccuracy) }}%</strong>
			</span>
			<span class="review-score">
				Placement <strong>{{ Math.round(review.timingAccuracy) }}%</strong>
			</span>
			<span class="review-copy">{{ reviewCopy }}</span>
			<span class="transport-gap" />
			<span class="legend"><i class="dot match" />right</span>
			<span class="legend"><i class="dot late" />off the beat</span>
			<span class="legend"><i class="dot wrong" />wrong</span>
			<span class="legend"><i class="dot ghost" />the phrase</span>
			<button class="submit-btn" @click="done">Done</button>
		</div>

		<div v-else class="transport">
			<button class="ghost-btn" aria-label="To the start" @click="rewindStart">⏮</button>
			<button class="ghost-btn" aria-label="Back a bar" @click="rewindBar">⏪</button>
			<button class="roll-btn" :class="{ rolling: isRolling }" @click="toggleRoll">
				{{ isRolling ? '⏸' : '▶' }}
			</button>
			<span class="position">{{ positionLabel }}</span>
			<span class="transport-gap" />
			<!-- What is left of them is on the button: a correction the player
			     cannot see running out is one they will be surprised to lose. -->
			<button
				class="ghost-btn"
				:disabled="!entered || !undosLeft"
				:aria-label="`Undo, ${undosLeft} left`"
				@click="undo"
			>
				⌫ {{ undosLeft }}
			</button>
			<button
				class="ghost-btn"
				:disabled="!entered || !clearsLeft"
				:aria-label="`Clear, ${clearsLeft} left`"
				@click="clearAll"
			>
				Clear {{ clearsLeft }}
			</button>
			<button class="submit-btn" :disabled="!canSubmit" @click="submit">Check it</button>
		</div>

		<div class="keyboard-area">
			<PianoKeyboard
				:active-keys="activeKeys"
				:naming-system="settings.noteNamingSystem"
				:disabled="!isLandscape || showRules || isListening || Boolean(review)"
				@keydown="onKeyDown"
				@keyup="onKeyUp"
			/>
		</div>

		<div v-if="showRules" class="echo-overlay">
			<div class="echo-card">
				<MoodScene :mood="session.themeId" class="echo-scene" />
				<span class="echo-card-title">Write it by ear</span>
				<ul class="echo-rules">
					<li>Listen to the phrase — nothing is written down for you.</li>
					<li>Every key you press lands where the line stands.</li>
					<li>Drag the line back to fix a note, then check it.</li>
				</ul>
				<button class="submit-btn" @click="dismissRules">Got it</button>
			</div>
		</div>

		<div v-else-if="!isLandscape" class="echo-overlay">
			<div class="echo-card">
				<span class="echo-card-title">↻ Rotate to play</span>
			</div>
		</div>

		<ListeningCard
			v-else-if="isListening && introListen"
			:mood="session.themeId"
			:title="session.title"
			copy="Hear the phrase, then write it down — nothing is shown for you."
			skip-label="I'm ready"
			@skip="skipIntro"
		/>
	</div>
</template>

<style scoped lang="scss">
@use '../../assets/mixins' as *;

.echo-page {
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

.echo-top {
	display: flex;
	align-items: center;
	gap: var(--space-3);
}

.exit-btn {
	flex-shrink: 0;
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
}

.echo-title {
	display: flex;
	flex-direction: column;
	min-width: 0;
	margin-right: auto;

	.eyebrow {
		font-size: var(--text-xs);
		letter-spacing: var(--tracking-caps);
		text-transform: uppercase;
		color: var(--text-3);
	}

	strong {
		font-size: var(--text-lg);
		color: var(--text-1);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
}

/* Reserved width so the counter ticking up never nudges the title. */
.echo-count {
	min-width: 3.6rem;
	text-align: center;
	padding: 0.3rem 0.5rem;
	border-radius: var(--radius-m);
	background: var(--surface-2);
	color: var(--text-2);
	font-weight: var(--weight-bold);
	font-variant-numeric: tabular-nums;
}

.echo-count.full {
	background: color-mix(in srgb, var(--good) 18%, transparent);
	color: var(--good);
}

.staff-host {
	position: relative;
	min-height: 0;
	border-radius: var(--radius-l);
	overflow: hidden;
	/* Same framed sheet as Campaign's stage. */
	background: #ffffff;
	border: 2px solid var(--border-strong);
	box-shadow: var(--shadow-3);
	/* The line is dragged along this, so the browser must not claim the gesture
	   for scrolling first. */
	touch-action: none;
	cursor: ew-resize;
}

.transport {
	display: flex;
	align-items: center;
	gap: var(--space-2);
}

.transport-gap {
	flex: 1 1 auto;
}

.review-row {
	flex-wrap: wrap;
}

.review-score {
	color: var(--text-2);
	font-size: var(--text-sm);

	strong {
		color: var(--text-1);
		font-variant-numeric: tabular-nums;
	}
}

.review-copy {
	color: var(--text-3);
	font-size: var(--text-sm);
}

.legend {
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	color: var(--text-3);
	font-size: var(--text-xs);
}

.dot {
	width: 0.6rem;
	height: 0.6rem;
	border-radius: 50%;
	border: 2px solid currentColor;
}

.dot.match {
	color: var(--good);
}

.dot.late {
	color: var(--warn);
}

.dot.wrong {
	color: var(--bad);
}

.dot.ghost {
	color: var(--text-3);
	border-style: dashed;
}

.position {
	min-width: 2.6rem;
	text-align: center;
	color: var(--text-3);
	font-size: var(--text-sm);
	font-weight: var(--weight-bold);
	font-variant-numeric: tabular-nums;
}

.listen-btn {
	@include chunky(var(--mode-endless), var(--mode-endless-deep));
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	padding: 0.45rem 1.1rem;
	font-size: var(--text-sm);
	white-space: nowrap;
	cursor: pointer;
}

.listen-btn.paid {
	@include chunky(var(--mode-records), var(--mode-records-deep));
}

.listen-icon {
	font-size: var(--text-md);
	line-height: 1;
}

.ghost-btn,
.submit-btn,
.roll-btn {
	padding: 0.45rem 1rem;
	font-size: var(--text-sm);
	cursor: pointer;
}

.ghost-btn {
	@include chunky-ghost;
	color: var(--text-2);
}

.roll-btn {
	@include chunky(var(--mode-time), var(--mode-time-deep));
	min-width: 3.4rem;
}

.roll-btn.rolling {
	@include chunky(var(--mode-records), var(--mode-records-deep));
}

.submit-btn {
	@include chunky(var(--good), #12946c);
	padding-inline: 1.4rem;
}

.keyboard-area {
	min-height: 0;
}

.echo-overlay {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	padding: var(--space-4);
	background: color-mix(in srgb, var(--bg-deep) 82%, transparent);
	z-index: 5;
}

.echo-card {
	max-height: 100%;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--space-3);
	max-width: 28rem;
	padding: var(--space-5);
	border-radius: var(--radius-l);
	background: var(--surface-raised);
	border: 1px solid var(--border);
	text-align: center;
}

.echo-scene {
	width: 100%;
	max-height: 6rem;
	border-radius: var(--radius-m);
	border: 1px solid var(--border);
	overflow: hidden;
	filter: saturate(0.9) brightness(0.86);
}

.echo-card-title {
	font-size: var(--text-xl);
	font-weight: var(--weight-black);
	color: var(--text-1);
}

@media (max-height: 560px) {
	.echo-card {
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
	}

	.echo-scene {
		display: none;
	}

	.echo-card-title {
		font-size: var(--text-lg);
	}
}

.echo-rules {
	margin: 0;
	padding-left: 1.1rem;
	text-align: left;
	color: var(--text-2);
	font-size: var(--text-sm);
	line-height: 1.6;
}
</style>
