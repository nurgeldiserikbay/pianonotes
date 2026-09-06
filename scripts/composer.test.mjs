// The Studio's arithmetic, which is all of it that can be wrong quietly: a tune
// the player writes must never run out of staff, must survive being saved and
// reopened unchanged, and must place a note where the line stands rather than
// where the finger landed.
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const out = await build({
	entryPoints: ['src/features/composer.ts'],
	bundle: true,
	format: 'esm',
	write: false,
	logLevel: 'silent',
	alias: { '@': './src' },
})
const dir = mkdtempSync(join(tmpdir(), 'composer-'))
const file = join(dir, 'composer.mjs')
writeFileSync(file, out.outputFiles[0].text)
const {
	advance,
	barMs,
	beatMs,
	defaultTuneTitle,
	fromStoredNotes,
	lengthBeats,
	rewindOneStep,
	timelineForTune,
	toStoredNotes,
	tuneEndMs,
	windowSpanMs,
	windowStartFor,
	writeNote,
	WINDOW_BARS,
} = await import(pathToFileURL(file).href)

const BPM = 100
const beat = beatMs(BPM)
const bar = barMs(BPM)

const results = []
function check(name, ok, detail = '') {
	results.push([name, ok])
	console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`)
}

// Writing a melody note by note, the way the screen does it.
function writeTune(lanes, length = 'quarter') {
	let notes = []
	let cursor = 0
	lanes.forEach((lane, index) => {
		notes = writeNote(notes, lane, cursor, BPM, index + 1)
		cursor = advance(cursor, length, BPM)
	})
	return { notes, cursor }
}

check('a length is worth its beats', lengthBeats('half') === 2 && lengthBeats('eighth') === 0.5)

const quarters = writeTune(['c5', 'd5', 'e5', 'f5'])
check(
	'notes land one length apart',
	quarters.notes.every((note, index) => Math.abs(note.timeMs - index * beat) < 1),
	quarters.notes.map((n) => (n.timeMs / beat).toFixed(1)).join(' ')
)

const eighths = writeTune(['c5', 'd5', 'e5', 'f5'], 'eighth')
check(
	'eighths land half a beat apart',
	Math.abs(eighths.notes[1].timeMs - beat / 2) < 1,
	`${eighths.notes[1].timeMs.toFixed(0)}ms`
)

// Stepping back and playing a different key replaces the note, rather than
// stacking a chord the player never asked for.
let fixed = writeTune(['c5', 'd5', 'e5']).notes
const back = rewindOneStep(2 * beat, 'quarter', BPM)
fixed = writeNote(fixed, 'g5', back, BPM, 99)
check(
	'writing over a note replaces it',
	fixed.length === 3 && fixed[1].laneId === 'g5',
	fixed.map((n) => n.laneId).join()
)

// The staff has to stay ahead of the writing, or the last notes of a long tune
// pile up on the final beat — the bug By Ear already had once.
const long = writeTune(Array.from({ length: 40 }, () => 'c5'))
const timeline = timelineForTune(long.notes, BPM, long.cursor)
check(
	'the staff stays ahead of a long tune',
	timeline >= tuneEndMs(long.notes, BPM) + bar - 1,
	`${(timeline / bar).toFixed(0)} bars for ${long.notes.length} notes`
)
check('the staff is whole bars', Math.abs((timeline / bar) % 1) < 0.01)
check(
	'an empty tune still gets a window to write on',
	timelineForTune([], BPM, 0) >= windowSpanMs(BPM),
	`${(timelineForTune([], BPM, 0) / bar).toFixed(0)} bars`
)

// Paging: the window is whole windows, so a note never jumps screens as the line
// crosses it.
check('the first window starts at zero', windowStartFor(0, BPM) === 0)
check(
	'the line turns the page at the window edge',
	windowStartFor(WINDOW_BARS * bar + 1, BPM) === WINDOW_BARS * bar,
	`${windowStartFor(WINDOW_BARS * bar + 1, BPM) / bar} bars in`
)
check(
	'a note just before the edge stays on the first page',
	windowStartFor(WINDOW_BARS * bar - 1, BPM) === 0
)

// Saved and reopened: the tune is the same tune.
const stored = toStoredNotes(long.notes)
const reopened = fromStoredNotes(stored)
check(
	'a saved tune reopens unchanged',
	reopened.length === long.notes.length &&
		reopened.every((note, index) => note.laneId === stored[index].laneId && note.timeMs === stored[index].timeMs),
	`${reopened.length} notes`
)
check('reopened notes get usable ids', new Set(reopened.map((n) => n.id)).size === reopened.length)

const shuffled = [
	{ id: 3, laneId: 'e5', timeMs: 2000 },
	{ id: 1, laneId: 'c5', timeMs: 0 },
	{ id: 2, laneId: 'd5', timeMs: 1000 },
]
check(
	'saving puts the notes in time order',
	toStoredNotes(shuffled).map((n) => n.laneId).join() === 'c5,d5,e5'
)

// Names have to be free, or three sketches are all "Melody 1".
const existing = [
	{ id: 'a', title: 'Melody 1', bpm: 100, notes: [], updatedAt: '' },
	{ id: 'b', title: 'Melody 2', bpm: 100, notes: [], updatedAt: '' },
]
check('a new tune gets a free name', defaultTuneTitle(existing) === 'Melody 3')

console.log('')
const failed = results.filter(([, ok]) => !ok)
console.log(failed.length ? `FAIL - ${failed.length} check(s)` : 'PASS - the Studio writes, pages and saves whole tunes')
if (failed.length && process.argv.includes('--strict')) process.exit(1)
