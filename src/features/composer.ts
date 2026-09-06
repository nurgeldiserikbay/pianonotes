import { placeNote, snapToGrid, type PlacedNote } from '@/features/echo'

// Writing your own tune. The staff, the moving line and the key-to-note
// placement are the same machinery By Ear uses — what changes is that there is
// no phrase to copy and no verdict at the end, so the player has to say two
// things the mode cannot infer: how long each note is, and when the tune is
// finished.
//
// Everything here is arithmetic over a note list; the screen holds no rules of
// its own. That is what makes a saved tune replayable in the list, editable a
// week later and testable without a browser.

export interface UserTune {
	id: string
	title: string
	bpm: number
	notes: Array<{ laneId: string; timeMs: number }>
	updatedAt: string
}

// The lengths a player writes with, in beats. Deliberately four: a note picker
// with every duration in it is a notation editor, and this is a game.
export const NOTE_LENGTHS = [
	{ id: 'eighth', label: '♪', beats: 0.5 },
	{ id: 'quarter', label: '♩', beats: 1 },
	{ id: 'half', label: '𝅗𝅥', beats: 2 },
	{ id: 'whole', label: '𝅝', beats: 4 },
] as const

export type NoteLengthId = (typeof NOTE_LENGTHS)[number]['id']

export function lengthBeats(id: NoteLengthId) {
	return NOTE_LENGTHS.find((length) => length.id === id)?.beats ?? 1
}

export const BEATS_PER_BAR = 4
// What the player sees at once while writing. Eight bars is two comfortable
// systems on a phone in landscape; a whole tune shown at once would leave each
// beat narrower than a notehead.
export const WINDOW_BARS = 8
// Room kept past the end of the written tune, so there is always empty staff to
// write onto and the last bar line is never the edge of the world.
const TAIL_BARS = 1

export function beatMs(bpm: number) {
	return 60000 / Math.max(bpm, 1)
}

export function barMs(bpm: number) {
	return beatMs(bpm) * BEATS_PER_BAR
}

// Where the tune currently ends: the last note plus its own length is not known
// (a note list carries onsets, not durations), so the end is the last onset plus
// one beat, which is what the player hears as the tail.
export function tuneEndMs(notes: Array<{ timeMs: number }>, bpm: number) {
	if (!notes.length) return 0
	return notes.reduce((latest, note) => Math.max(latest, note.timeMs), 0) + beatMs(bpm)
}

// The writable length of the staff: always whole bars, always at least one bar
// past both the music and the line, so writing never runs out of paper.
export function timelineForTune(
	notes: Array<{ timeMs: number }>,
	bpm: number,
	cursorMs = 0
) {
	const bar = barMs(bpm)
	const needed = Math.max(tuneEndMs(notes, bpm), cursorMs) + TAIL_BARS * bar
	const bars = Math.max(WINDOW_BARS, Math.ceil(needed / bar))
	return Math.round(bars * bar)
}

// Which page of the staff the line is on. Pages are whole windows so a note does
// not jump between screens as the line crosses it.
export function windowStartFor(cursorMs: number, bpm: number) {
	const span = barMs(bpm) * WINDOW_BARS
	return Math.floor(cursorMs / span) * span
}

export function windowSpanMs(bpm: number) {
	return barMs(bpm) * WINDOW_BARS
}

// Writing a note: same placement rule as By Ear (snapped, and replacing whatever
// stood on that spot), then the line moves on by the chosen length.
export function writeNote(
	notes: PlacedNote[],
	laneId: string,
	cursorMs: number,
	bpm: number,
	id: number
) {
	return placeNote(notes, laneId, cursorMs, bpm, id)
}

export function advance(cursorMs: number, length: NoteLengthId, bpm: number) {
	return snapToGrid(cursorMs + lengthBeats(length) * beatMs(bpm), bpm)
}

export function rewindOneStep(cursorMs: number, length: NoteLengthId, bpm: number) {
	return Math.max(0, snapToGrid(cursorMs - lengthBeats(length) * beatMs(bpm), bpm))
}

// A tune has to survive being saved and reopened, so the editor's working list
// (which carries ids for the staff's glyph reuse) is flattened on the way out
// and given fresh ids on the way in.
export function toStoredNotes(notes: PlacedNote[]): UserTune['notes'] {
	return [...notes]
		.sort((a, b) => a.timeMs - b.timeMs)
		.map((note) => ({ laneId: note.laneId, timeMs: Math.round(note.timeMs) }))
}

export function fromStoredNotes(notes: UserTune['notes']): PlacedNote[] {
	return notes.map((note, index) => ({ ...note, id: index + 1 }))
}

export function createTuneId() {
	return `tune-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4).toString(36)}`
}

// "Melody 3", not "Melody 1" again: the default name has to be free, or a player
// who saves three sketches cannot tell them apart in the list.
export function defaultTuneTitle(existing: UserTune[]) {
	const used = new Set(existing.map((tune) => tune.title))
	for (let index = 1; index < 999; index += 1) {
		const title = `Melody ${index}`
		if (!used.has(title)) return title
	}
	return `Melody ${existing.length + 1}`
}

export function tuneDurationLabel(tune: UserTune) {
	const seconds = Math.round(tuneEndMs(tune.notes, tune.bpm) / 1000)
	const minutes = Math.floor(seconds / 60)
	const rest = seconds % 60
	return minutes > 0 ? `${minutes}:${String(rest).padStart(2, '0')}` : `${rest}s`
}
