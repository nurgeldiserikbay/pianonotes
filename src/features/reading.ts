import type { ChartNote } from '@/core/models'

// Rules of the reading mode, in one place: how long a melody may take, what the
// star thresholds are, and what counts as "in tempo". Both the engine and the UI
// read from here so a limit shown on screen is always the limit being enforced.

export interface MelodyPlan {
	// Notes played back-to-back at the melody's own tempo — the time a perfect
	// sight-reader would need. Everything else is expressed as a multiple of it,
	// because 300 melodies cannot have hand-authored time limits.
	parMs: number
	// Hard limit: exceeding it fails the round.
	limitMs: number
	twoStarMs: number
	threeStarMs: number
}

// Tightened from 3 / 1.8 / 1.25: at the old numbers the first melody allowed 69
// seconds for 24 notes, so the clock — the mode's whole source of pressure —
// never actually threatened anyone. These still need a real playtest across the
// curve; par shrinks as the campaign's BPM rises, so late levels feel tighter at
// the same factor.
const LIMIT_FACTOR = 2.2
const TWO_STAR_FACTOR = 1.5
const THREE_STAR_FACTOR = 1.15
// Even a three-note melody must leave a beginner time to find the first key.
const MIN_LIMIT_MS = 18000
// Par has a floor per beat as well. Some transcriptions are written at a brisk
// singing tempo — a 17-note tune whose own duration is five seconds would demand
// three taps a second for three stars, which is a reading speed no beginner has.
// Below this, par stops following the tune and follows the player instead.
const MIN_MS_PER_BEAT = 450

// A chord is several notes on one beat: they share an x position and are played
// bottom-up, so timing is measured per beat, not per note.
export function groupChartByTime(chart: ChartNote[]) {
	const groups: ChartNote[][] = []
	const byTime = new Map<number, ChartNote[]>()

	chart.forEach((note) => {
		const bucket = byTime.get(note.timeMs)
		if (bucket) {
			bucket.push(note)
			return
		}
		const created = [note]
		byTime.set(note.timeMs, created)
		groups.push(created)
	})

	groups.forEach((group) => group.sort((a, b) => a.laneId.localeCompare(b.laneId)))
	return groups
}

export function getMelodyPlan(chart: ChartNote[], bpm: number): MelodyPlan {
	const beatMs = 60000 / Math.max(bpm, 1)
	const lastTimeMs = chart.reduce((latest, note) => Math.max(latest, note.timeMs), 0)
	// Beats, not notes: a chord is one thing to read and one moment to play.
	const beats = new Set(chart.map((note) => note.timeMs)).size
	const parMs = Math.max(beatMs, lastTimeMs + beatMs, beats * MIN_MS_PER_BEAT)

	return {
		parMs,
		limitMs: Math.max(MIN_LIMIT_MS, Math.round(parMs * LIMIT_FACTOR)),
		twoStarMs: Math.round(parMs * TWO_STAR_FACTOR),
		threeStarMs: Math.round(parMs * THREE_STAR_FACTOR),
	}
}

// Stars are cumulative and each one answers a different question: did you finish,
// were you quick, were you clean.
export function getReadingStars(
	completed: boolean,
	timeMs: number,
	livesLost: number,
	plan: MelodyPlan
): 0 | 1 | 2 | 3 {
	if (!completed) return 0
	if (timeMs <= plan.threeStarMs && livesLost === 0) return 3
	if (timeMs <= plan.twoStarMs) return 2
	return 1
}

// Tempo is graded, never enforced: a beat counts as "in tempo" when the gap
// since the previous beat is close to what the melody asks for. Being early is
// as off-tempo as being late, which is why the window is two-sided.
const TEMPO_MIN_RATIO = 0.6
const TEMPO_MAX_RATIO = 1.6

export function isIntervalInTempo(actualMs: number, expectedMs: number) {
	if (expectedMs <= 0) return true
	const ratio = actualMs / expectedMs
	return ratio >= TEMPO_MIN_RATIO && ratio <= TEMPO_MAX_RATIO
}

export function formatMs(ms: number) {
	const totalSeconds = Math.max(0, ms) / 1000
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds - minutes * 60
	if (minutes > 0) return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`
	return `${seconds.toFixed(1)}s`
}

// Always m:ss.d, so a running countdown never changes its character count and
// the HUD row it sits in never re-flows. formatMs above stays the compact form
// for static values (results, best times), where width doesn't matter.
export function formatCountdown(ms: number) {
	const totalSeconds = Math.max(0, ms) / 1000
	const minutes = Math.floor(totalSeconds / 60)
	const seconds = totalSeconds - minutes * 60
	return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`
}
