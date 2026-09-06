import type { ResultBadge } from '@/core/models'

// By Ear mode: nothing is written down. The player hears a phrase, then lays it
// out on the keyboard themselves — which keys, in which order, spaced how they
// remember it — and the round is graded by comparing what they entered against
// the original.
//
// Two separate numbers come out of that, because they are two separate skills
// and a single blended percentage hides which one failed:
//   - notes: did the right pitches come out, in the right order;
//   - placement: did they fall where the tune puts them.
// Placement is judged on the shape of the rhythm, not on absolute speed: a
// phrase played correctly but half as fast is right, and telling a beginner it
// is wrong would teach them to rush.

export interface EchoNote {
	laneId: string
	timeMs: number
}

export interface EchoTap {
	laneId: string
	timeMs: number
}

// A note the player has written onto the staff. The id is what lets the staff
// keep a glyph across an edit instead of rebuilding every note whenever one
// changes.
export interface PlacedNote extends EchoTap {
	id: number
}

export type EchoStepKind = 'match' | 'wrong' | 'missing' | 'extra'

export interface EchoStep {
	kind: EchoStepKind
	targetLane?: string
	playedLane?: string
	// Which note of each side this step is about, so the staff can colour the
	// player's own notes with the verdict instead of only counting them.
	targetIndex?: number
	playedIndex?: number
	// How far this tap sits from where the tune puts it, once the player's own
	// tempo has been factored out. Only present on a matched note.
	offsetMs?: number
	// Within the tight window — the note is not merely the right pitch, it is in
	// the right place.
	inTime?: boolean
}

export interface EchoScore {
	// Share of the phrase played as the right pitch in the right order, 0..100.
	noteAccuracy: number
	// How well the spacing matches, 0..100. 100 when every matched note sits on
	// its beat; 0 when they all land a beat away or worse.
	timingAccuracy: number
	// One number for the record list: notes weigh more than placement, because a
	// wrong note is a wrong note and a late one is still the tune.
	score: number
	stars: 0 | 1 | 2 | 3
	badge: ResultBadge
	steps: EchoStep[]
	correct: number
	wrong: number
	missing: number
	extra: number
	// The tempo the player actually played at, in BPM, or null when there were
	// too few matched notes to measure one. Shown as information, never graded.
	playedBpm: number | null
}

// A phrase, not a whole tune. The mode asks the player to hold the melody in
// their head and reproduce it; a 50-note hymn is a memory test nobody passes,
// and failing it teaches nothing about pitch. Bar-aligned so the phrase ends
// where the music breathes.
export const ECHO_PHRASE_MAX_NOTES = 12
const BEATS_PER_BAR = 4

export function buildEchoPhrase(
	notes: Array<{ lane: string; beats: number }>,
	bpm: number,
	maxNotes = ECHO_PHRASE_MAX_NOTES
): EchoNote[] {
	const beatMs = 60000 / Math.max(bpm, 1)
	const phrase: EchoNote[] = []
	let beats = 0
	let lastBar = 0

	for (let index = 0; index < Math.min(maxNotes, notes.length); index += 1) {
		const note = notes[index]
		phrase.push({ laneId: note.lane, timeMs: Math.round(beats * beatMs) })
		beats += Number.isFinite(note.beats) && note.beats > 0 ? note.beats : 1
		if (Math.abs(beats % BEATS_PER_BAR) < 0.01) lastBar = index + 1
	}

	// Only cut back to the bar line when doing so keeps most of the phrase: a
	// tune whose first bar ends on note three would otherwise be reduced to three
	// notes, which is not a phrase anyone recognises.
	if (lastBar >= Math.min(maxNotes, notes.length) * 0.6) return phrase.slice(0, lastBar)
	return phrase
}

// Notes land on a grid rather than at the millisecond the finger touched glass.
// The player is writing music down, not reacting to it: a sixteenth-note grid is
// fine enough to hold every rhythm the phrases use and coarse enough that a
// deliberate placement is exact rather than nearly right.
export const PLACEMENT_GRID_BEATS = 0.25

export function snapToGrid(timeMs: number, bpm: number) {
	const step = (60000 / Math.max(bpm, 1)) * PLACEMENT_GRID_BEATS
	// Whole milliseconds: a note's time is compared against other notes' times and
	// used to place a glyph, and a fractional tail helps neither.
	return Math.round(Math.round(Math.max(0, timeMs) / step) * step)
}

// Writing a note where one already stands replaces it. That is what a player
// means by playing a different key at the same spot on the staff — two notes
// stacked on one position would be a chord they did not ask for.
export function placeNote(
	notes: PlacedNote[],
	laneId: string,
	timeMs: number,
	bpm: number,
	id: number
): PlacedNote[] {
	const at = snapToGrid(timeMs, bpm)
	const kept = notes.filter((note) => Math.abs(note.timeMs - at) > 1)
	return [...kept, { id, laneId, timeMs: at }].sort((a, b) => a.timeMs - b.timeMs)
}

// Where the line goes after a note is written with the transport stopped: to the
// tune's next onset. The spacing of the answer is then the spacing of the melody
// the player is copying, which is what "write down what you heard" means — they
// are being asked which notes it was, and a rhythm they have to reconstruct from
// a blank stave is a second puzzle on top of the first.
//
// Past the end of the phrase the step falls back to its typical spacing, so a
// player who writes more notes than the tune has still moves forward.
export function nextOnsetMs(phrase: EchoNote[], fromMs: number, bpm: number) {
	const next = phrase.find((note) => note.timeMs > fromMs + 1)
	if (next) return next.timeMs
	return fromMs + getTypicalGapMs(phrase, bpm)
}

// The phrase's typical note spacing, used past its end and wherever a single
// step has to stand for "one note further on".
export function getTypicalGapMs(phrase: EchoNote[], bpm: number) {
	const beatMs = 60000 / Math.max(bpm, 1)
	const gaps: number[] = []
	for (let index = 1; index < phrase.length; index += 1) {
		const gap = phrase[index].timeMs - phrase[index - 1].timeMs
		if (gap > 0) gaps.push(gap)
	}
	if (!gaps.length) return beatMs

	gaps.sort((a, b) => a - b)
	const median = gaps[Math.floor(gaps.length / 2)]
	// Never finer than the grid a note can land on, never coarser than a beat:
	// below the grid two notes would collide, above it the line outruns the tune.
	return Math.max(beatMs * PLACEMENT_GRID_BEATS, Math.min(beatMs, median))
}

// How much staff the player gets. Two things have to fit, and the longer one
// wins: the tune itself, and the answer the player writes note by note. Sizing
// it to the tune alone was a real bug — a nine-note phrase spanning six beats
// gave a staff of eight, so the last notes of the answer piled up on the final
// beat, replacing each other instead of appearing where they were played.
const TAIL_BEATS = 4
const BEATS_PER_BAR_TIMELINE = 4

export function getTimelineMs(phrase: EchoNote[], bpm: number) {
	const beatMs = 60000 / Math.max(bpm, 1)
	const last = phrase.reduce((latest, note) => Math.max(latest, note.timeMs), 0)
	const writtenOut = phrase.length * getTypicalGapMs(phrase, bpm)
	const needed = Math.max(last, writtenOut) / beatMs + TAIL_BEATS
	const beats = Math.ceil(needed / BEATS_PER_BAR_TIMELINE) * BEATS_PER_BAR_TIMELINE
	return Math.round(beats * beatMs)
}

// Which written notes the transport has just swept over, in the order it met
// them. The window is half-open on the left so a note is sounded exactly once
// however many frames the line takes to cross it, and closed on the right so a
// note sitting precisely where the line stops still sounds.
export function notesCrossed<T extends { timeMs: number }>(notes: T[], afterMs: number, toMs: number) {
	if (toMs <= afterMs) return []
	return notes.filter((note) => note.timeMs > afterMs && note.timeMs <= toMs).sort((a, b) => a.timeMs - b.timeMs)
}

// Sequence alignment (Needleman-Wunsch, unit costs). The player will drop a
// note, add one, or hit a neighbouring key — a positional comparison would call
// every note after a single missed one wrong, which is both untrue and the most
// discouraging way to be wrong.
type Op = 'match' | 'sub' | 'del' | 'ins'

function align(target: EchoNote[], played: EchoTap[]) {
	const rows = target.length
	const cols = played.length
	const cost: number[][] = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0))
	const from: Op[][] = Array.from({ length: rows + 1 }, () => new Array<Op>(cols + 1).fill('match'))

	for (let i = 1; i <= rows; i += 1) {
		cost[i][0] = i
		from[i][0] = 'del'
	}
	for (let j = 1; j <= cols; j += 1) {
		cost[0][j] = j
		from[0][j] = 'ins'
	}

	for (let i = 1; i <= rows; i += 1) {
		for (let j = 1; j <= cols; j += 1) {
			const same = target[i - 1].laneId === played[j - 1].laneId
			const diagonal = cost[i - 1][j - 1] + (same ? 0 : 1)
			const deletion = cost[i - 1][j] + 1
			const insertion = cost[i][j - 1] + 1

			let best = diagonal
			let op: Op = same ? 'match' : 'sub'
			// Ties go to the diagonal: a wrong key in the right place is a closer
			// description of what happened than "you missed one and added one".
			if (deletion < best) {
				best = deletion
				op = 'del'
			}
			if (insertion < best) {
				best = insertion
				op = 'ins'
			}

			cost[i][j] = best
			from[i][j] = op
		}
	}

	const path: Array<{ op: Op; targetIndex: number; playedIndex: number }> = []
	let i = rows
	let j = cols
	while (i > 0 || j > 0) {
		const op = i === 0 ? 'ins' : j === 0 ? 'del' : from[i][j]
		if (op === 'del') {
			path.push({ op, targetIndex: i - 1, playedIndex: -1 })
			i -= 1
		} else if (op === 'ins') {
			path.push({ op, targetIndex: -1, playedIndex: j - 1 })
			j -= 1
		} else {
			path.push({ op, targetIndex: i - 1, playedIndex: j - 1 })
			i -= 1
			j -= 1
		}
	}

	return path.reverse()
}

// Placement is graded relative to the player's own tempo, so the fit below is
// what turns "you played it slowly" into "you played it evenly". A straight line
// through (tap time, original time) absorbs both the tempo they chose and how
// long they waited before starting; what is left over is the rhythm they got
// wrong.
function fitTempo(pairs: Array<{ target: number; played: number }>) {
	if (pairs.length < 2) return null

	const n = pairs.length
	const meanPlayed = pairs.reduce((sum, pair) => sum + pair.played, 0) / n
	const meanTarget = pairs.reduce((sum, pair) => sum + pair.target, 0) / n

	let covariance = 0
	let variance = 0
	pairs.forEach((pair) => {
		const dx = pair.played - meanPlayed
		covariance += dx * (pair.target - meanTarget)
		variance += dx * dx
	})

	// Every tap at the same instant (or one single tap): no tempo to read.
	if (variance < 1) return null

	const scale = covariance / variance
	// A negative or absurd slope means the taps carry no usable tempo at all —
	// grading placement off it would produce a number out of thin air.
	if (!Number.isFinite(scale) || scale <= 0.1 || scale > 10) return null

	return { scale, offset: meanTarget - scale * meanPlayed }
}

// A note landing within an eighth of the beat is where it belongs; a whole beat
// out is a different rhythm, and scores nothing.
const IN_TIME_RATIO = 0.125
const ZERO_RATIO = 1

export function compareEcho(target: EchoNote[], played: EchoTap[], bpm: number): EchoScore {
	const beatMs = 60000 / Math.max(bpm, 1)
	const path = align(target, played)

	const steps: EchoStep[] = []
	const pairs: Array<{ target: number; played: number; stepIndex: number }> = []
	let correct = 0
	let wrong = 0
	let missing = 0
	let extra = 0

	path.forEach((entry) => {
		if (entry.op === 'del') {
			missing += 1
			steps.push({
				kind: 'missing',
				targetLane: target[entry.targetIndex].laneId,
				targetIndex: entry.targetIndex,
			})
			return
		}
		if (entry.op === 'ins') {
			extra += 1
			steps.push({
				kind: 'extra',
				playedLane: played[entry.playedIndex].laneId,
				playedIndex: entry.playedIndex,
			})
			return
		}

		const targetNote = target[entry.targetIndex]
		const playedNote = played[entry.playedIndex]
		if (entry.op === 'sub') {
			wrong += 1
			steps.push({
				kind: 'wrong',
				targetLane: targetNote.laneId,
				playedLane: playedNote.laneId,
				targetIndex: entry.targetIndex,
				playedIndex: entry.playedIndex,
			})
			return
		}

		correct += 1
		steps.push({
			kind: 'match',
			targetLane: targetNote.laneId,
			playedLane: playedNote.laneId,
			targetIndex: entry.targetIndex,
			playedIndex: entry.playedIndex,
		})
		pairs.push({ target: targetNote.timeMs, played: playedNote.timeMs, stepIndex: steps.length - 1 })
	})

	// Both lists count: dropping half the phrase and adding a note that is not in
	// it are different mistakes, and neither may be scored as a clean run.
	const denominator = Math.max(target.length, played.length, 1)
	const noteAccuracy = (correct / denominator) * 100

	const fit = fitTempo(pairs)
	let timingAccuracy = 0

	if (fit && pairs.length >= 2) {
		let sum = 0
		pairs.forEach((pair) => {
			const expected = fit.scale * pair.played + fit.offset
			const offsetMs = pair.target - expected
			const ratio = Math.abs(offsetMs) / beatMs
			const share =
				ratio <= IN_TIME_RATIO ? 1 : Math.max(0, 1 - (ratio - IN_TIME_RATIO) / (ZERO_RATIO - IN_TIME_RATIO))
			sum += share

			const step = steps[pair.stepIndex]
			step.offsetMs = Math.round(offsetMs)
			step.inTime = ratio <= IN_TIME_RATIO
		})
		timingAccuracy = (sum / pairs.length) * 100
	}

	const score = Math.round(noteAccuracy * 0.65 + timingAccuracy * 0.35)
	const stars = getEchoStars(noteAccuracy, timingAccuracy)

	return {
		noteAccuracy,
		timingAccuracy,
		score,
		stars,
		badge: String(stars) as ResultBadge,
		steps,
		correct,
		wrong,
		missing,
		extra,
		playedBpm: readPlayedBpm(bpm, fit),
	}
}

// The tempo is reported, not graded, so it is only worth showing when it is a
// tempo a person could be playing at. Four taps in a second fit a line as well
// as any other, and "561 BPM" says nothing except that the fit had little to go
// on.
const MIN_REPORTED_BPM = 20
const MAX_REPORTED_BPM = 300

function readPlayedBpm(bpm: number, fit: { scale: number } | null) {
	if (!fit) return null
	const played = Math.round(bpm * fit.scale)
	if (played < MIN_REPORTED_BPM || played > MAX_REPORTED_BPM) return null
	return played
}

// Stars answer three questions in order, the same way the reading mode's do:
// did you get the tune, did you get all of it, did you get its rhythm too.
export function getEchoStars(noteAccuracy: number, timingAccuracy: number): 0 | 1 | 2 | 3 {
	if (noteAccuracy >= 99 && timingAccuracy >= 80) return 3
	if (noteAccuracy >= 85 && timingAccuracy >= 55) return 2
	if (noteAccuracy >= 60) return 1
	return 0
}
