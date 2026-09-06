// By Ear grading, checked against attempts a real player makes. The two numbers
// it reports are the whole mode, and each one has a way of being quietly wrong:
// notes by punishing everything after one dropped key, placement by punishing a
// player for choosing a slower tempo than the transcription.
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const out = await build({
	entryPoints: ['src/features/echo.ts'],
	bundle: true,
	format: 'esm',
	write: false,
	logLevel: 'silent',
	alias: { '@': './src' },
})
const dir = mkdtempSync(join(tmpdir(), 'echo-'))
const file = join(dir, 'echo.mjs')
writeFileSync(file, out.outputFiles[0].text)
const {
	buildEchoPhrase,
	compareEcho,
	getTimelineMs,
	getTypicalGapMs,
	nextOnsetMs,
	notesCrossed,
	placeNote,
	snapToGrid,
	ECHO_PHRASE_MAX_NOTES,
} = await import(pathToFileURL(file).href)

const BPM = 90
const beat = 60000 / BPM

// "Twinkle, Twinkle" — the phrase a first attempt actually meets.
const source = [
	{ lane: 'c5', beats: 1 },
	{ lane: 'c5', beats: 1 },
	{ lane: 'g5', beats: 1 },
	{ lane: 'g5', beats: 1 },
	{ lane: 'a5', beats: 1 },
	{ lane: 'a5', beats: 1 },
	{ lane: 'g5', beats: 2 },
]
const phrase = buildEchoPhrase(source, BPM)

const results = []
function check(name, ok, detail = '') {
	results.push([name, ok])
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

// Taps at a chosen tempo, with per-note nudges in beats.
function play(lanes, { tempoScale = 1, nudges = [] } = {}) {
	let time = 0
	return lanes.map((lane, index) => {
		const tap = { laneId: lane, timeMs: Math.round(time + (nudges[index] ?? 0) * beat) }
		time += beat * tempoScale
		return tap
	})
}

const lanes = phrase.map((note) => note.laneId)

console.log(`phrase: ${lanes.join(' ')} (${phrase.length} notes)\n`)
check('phrase stays short enough to hold in your head', phrase.length <= ECHO_PHRASE_MAX_NOTES, `${phrase.length} notes`)

const perfect = compareEcho(phrase, play(lanes), BPM)
check('exact replay scores 100/100', perfect.noteAccuracy === 100 && perfect.timingAccuracy === 100)
check('exact replay is three stars', perfect.stars === 3)

// The mode must not be a speed test: the same phrase played at half tempo is the
// same phrase, and telling a beginner otherwise teaches them to rush.
const slow = compareEcho(phrase, play(lanes, { tempoScale: 2 }), BPM)
check('half-tempo replay still scores 100 placement', slow.timingAccuracy === 100, `${slow.timingAccuracy.toFixed(0)}%`)
check('half-tempo replay reports the tempo played', slow.playedBpm === Math.round(BPM / 2), `${slow.playedBpm} BPM`)

// One dropped note must cost one note, not everything after it.
const dropped = compareEcho(phrase, play(lanes.filter((_, index) => index !== 2)), BPM)
check(
	'one dropped note costs one note',
	dropped.missing === 1 && dropped.correct === phrase.length - 1,
	`${dropped.correct}/${phrase.length} kept`
)

// Same for an extra key hit by accident.
const extraLanes = [...lanes.slice(0, 3), 'd5', ...lanes.slice(3)]
const extra = compareEcho(phrase, play(extraLanes), BPM)
check('one extra note costs one note', extra.extra === 1 && extra.correct === phrase.length)
check('an extra note still lowers the score', extra.noteAccuracy < 100, `${extra.noteAccuracy.toFixed(0)}%`)

// A neighbouring key is a wrong note in the right place, not a missing note plus
// an added one — that is what the player did, and what they need told back.
const wrongLanes = [...lanes]
wrongLanes[4] = 'b5'
const wrong = compareEcho(phrase, play(wrongLanes), BPM)
check('a wrong key reads as one wrong note', wrong.wrong === 1 && wrong.missing === 0 && wrong.extra === 0)

// Rhythm actually being graded: right notes, badly spaced.
const ragged = compareEcho(phrase, play(lanes, { nudges: [0, 0.6, -0.5, 0.7, 0, 0.8, -0.6] }), BPM)
check('right notes, wrong spacing → notes stay 100', ragged.noteAccuracy === 100)
check('right notes, wrong spacing → placement drops', ragged.timingAccuracy < 70, `${ragged.timingAccuracy.toFixed(0)}%`)
check('ragged spacing cannot earn three stars', ragged.stars < 3)

// Nothing entered, or nonsense entered, must not read as a pass.
const nonsense = compareEcho(phrase, play(['d4', 'e4', 'f4', 'd4']), BPM)
check('an unrelated phrase scores nothing', nonsense.noteAccuracy === 0 && nonsense.stars === 0)

const single = compareEcho(phrase, play([lanes[0]]), BPM)
check('a single tap has no tempo to grade', single.timingAccuracy === 0 && single.playedBpm === null)

// The comparison strip the result screen draws has to line up with the counts.
const steps = dropped.steps
check(
	'steps describe every note of both sides',
	steps.filter((s) => s.kind !== 'extra').length === phrase.length,
	`${steps.length} steps`
)

// ── Writing on the staff ────────────────────────────────────────────────────
// The player does not tap a rhythm here, they place notes against a line they
// can rewind. Two things have to hold for that to be usable: a note lands on the
// grid the tune is written on, and writing over a note replaces it rather than
// stacking a chord the player never asked for.

const onGrid = snapToGrid(beat * 1.03, BPM)
check('a placement snaps to the nearest sixteenth', onGrid === Math.round(beat), `${onGrid}ms vs ${Math.round(beat)}ms`)

const written = ['c5', 'd5', 'e5'].reduce(
	(list, lane, index) => placeNote(list, lane, index * beat, BPM, index + 1),
	[]
)
check('notes are written in time order', written.map((n) => n.laneId).join() === 'c5,d5,e5')

const rewritten = placeNote(written, 'g5', beat, BPM)
check(
	'writing over a note replaces it',
	rewritten.length === 3 && rewritten[1].laneId === 'g5',
	rewritten.map((n) => n.laneId).join()
)

// A phrase must not end flush with the last note: the player needs staff left to
// write a note that runs past the tune, and the last bar line has to close.
const timeline = getTimelineMs(phrase, BPM)
const lastNote = phrase[phrase.length - 1].timeMs
check('the staff runs past the last note', timeline > lastNote, `${Math.round(timeline)}ms vs ${lastNote}ms`)
const bars = timeline / (beat * 4)
check('the staff ends on a bar line', Math.abs(bars - Math.round(bars)) < 0.01, `${bars.toFixed(2)} bars`)

// The staff has to hold the ANSWER, not just the tune. A phrase written in
// eighths spans few beats but is written note by note, and sizing the staff to
// the tune alone left the last notes with nowhere to go: they landed on the
// final beat one after another, each replacing the one before, so a player saw
// their notes stop appearing where they played them.
const eighths = buildEchoPhrase(
	Array.from({ length: 12 }, (_, index) => ({ lane: index % 2 ? 'c5' : 'd5', beats: 0.5 })),
	BPM
)
const eighthStep = getTypicalGapMs(eighths, BPM)
const eighthStaff = getTimelineMs(eighths, BPM)
check(
	'the step matches how the phrase is written',
	Math.abs(eighthStep - beat * 0.5) < 1,
	`${eighthStep.toFixed(0)}ms vs ${(beat * 0.5).toFixed(0)}ms`
)
check(
	'the staff holds every note of the answer',
	eighthStaff >= eighths.length * eighthStep,
	`${(eighthStaff / beat).toFixed(1)} beats for ${eighths.length} notes`
)

// Writing the whole answer note by note must land every note somewhere of its
// own — this is the failure the two checks above are about, seen end to end.
let written12 = []
let cursor = 0
eighths.forEach((_, index) => {
	written12 = placeNote(written12, 'c5', cursor, BPM, index + 1)
	cursor += eighthStep
})
check('every written note keeps its own place', written12.length === eighths.length, `${written12.length} notes`)

// Writing a note moves the line to where the TUNE puts the next one, so an
// answer written note by note comes out with the melody's own spacing. A fixed
// step made a phrase of eighths come out in quarters and marked every note late.
let walk = 0
const walked = [0]
for (let index = 1; index < phrase.length; index += 1) {
	walk = nextOnsetMs(phrase, walk, BPM)
	walked.push(walk)
}
check(
	'writing note by note reproduces the melody spacing',
	walked.every((time, index) => Math.abs(time - phrase[index].timeMs) < 1),
	walked.map((t) => (t / beat).toFixed(1)).join(' ')
)

// Past the end of the tune the line still has to move, or extra notes would
// stack on the final onset.
const past = nextOnsetMs(phrase, phrase[phrase.length - 1].timeMs, BPM)
check('past the last note the line keeps moving', past > phrase[phrase.length - 1].timeMs)

// And the spacing it inherits has to survive the check: writing the right notes
// this way is a clean 100 on placement.
const stepEntered = walked.map((time, index) => ({ laneId: phrase[index].laneId, timeMs: time }))
const stepScore = compareEcho(phrase, stepEntered, BPM)
check(
	'a note-by-note answer scores 100 placement',
	stepScore.timingAccuracy === 100,
	`${stepScore.timingAccuracy.toFixed(0)}%`
)

// Pressing play sounds what the player wrote, so the rule for "which notes has
// the line just passed" has to hold frame by frame: each note exactly once, in
// order, and nothing at all when the line is being dragged backwards.
const onStaff = [
	{ laneId: 'c5', timeMs: 0 },
	{ laneId: 'd5', timeMs: 500 },
	{ laneId: 'e5', timeMs: 1000 },
]
// A pass starts one millisecond before the line, so a note sitting on the very
// first tick is not silently skipped.
const firstFrame = notesCrossed(onStaff, -1, 20)
check('a note at the start of the pass sounds', firstFrame.length === 1 && firstFrame[0].laneId === 'c5')

let sounded = []
let at = -1
for (let frame = 0; frame < 80; frame += 1) {
	const next = at + 16
	sounded = sounded.concat(notesCrossed(onStaff, at, next).map((n) => n.laneId))
	at = next
}
check('a pass sounds every note once, in order', sounded.join() === 'c5,d5,e5', sounded.join() || 'nothing')

check('dragging the line backwards sounds nothing', notesCrossed(onStaff, 1200, 300).length === 0)
check('a frame that crosses nothing sounds nothing', notesCrossed(onStaff, 600, 900).length === 0)

// Placement that is graded must survive the grid: a phrase written exactly where
// the tune puts it has to come back as a clean 100, or the grid is fighting the
// scoring.
const placed = phrase.reduce((list, note, index) => placeNote(list, note.laneId, note.timeMs, BPM, index + 1), [])
const gridPerfect = compareEcho(phrase, placed, BPM)
check(
	'a phrase written exactly on the grid scores 100/100',
	gridPerfect.noteAccuracy === 100 && gridPerfect.timingAccuracy === 100
)

console.log('')
const failed = results.filter(([, ok]) => !ok)
console.log(failed.length ? `FAIL - ${failed.length} check(s)` : 'PASS - By Ear grades notes and placement separately')
if (failed.length && process.argv.includes('--strict')) process.exit(1)
