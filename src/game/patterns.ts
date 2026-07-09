import type {
	ChartNote,
	EndlessComposerState,
	PatternBlock,
	PatternNoteInput,
	SessionConfig,
} from '@/core/models'
import { ENDLESS_ROOTS, PIANO_KEYS } from '@/entities/piano'

const SCALE = ['c4', 'd4', 'e4', 'f4', 'g4', 'a4', 'b4', 'c5', 'd5', 'e5', 'f5', 'g5', 'a5', 'b5']

function withId(notes: PatternNoteInput[], blockId: string, shift = 0): PatternBlock {
	return {
		id: blockId,
		label: blockId,
		beats: Math.max(...notes.map((note) => note.beat + (note.lengthBeats ?? 0.5)), 4),
		notes: notes.map((note) => ({
			...note,
			beat: note.beat + shift,
		})),
	}
}

export const PATTERN_LIBRARY: Record<string, PatternBlock> = {
	twinkleA: withId(
		[
			{ laneId: 'c4', beat: 0 },
			{ laneId: 'c4', beat: 1 },
			{ laneId: 'g4', beat: 2 },
			{ laneId: 'g4', beat: 3 },
			{ laneId: 'a4', beat: 4 },
			{ laneId: 'a4', beat: 5 },
			{ laneId: 'g4', beat: 6, lengthBeats: 1.5 },
		],
		'twinkleA'
	),
	twinkleB: withId(
		[
			{ laneId: 'f4', beat: 0 },
			{ laneId: 'f4', beat: 1 },
			{ laneId: 'e4', beat: 2 },
			{ laneId: 'e4', beat: 3 },
			{ laneId: 'd4', beat: 4 },
			{ laneId: 'd4', beat: 5 },
			{ laneId: 'c4', beat: 6, lengthBeats: 1.5 },
		],
		'twinkleB'
	),
	joyRise: withId(
		[
			{ laneId: 'e4', beat: 0 },
			{ laneId: 'e4', beat: 1 },
			{ laneId: 'f4', beat: 2 },
			{ laneId: 'g4', beat: 3 },
			{ laneId: 'g4', beat: 4 },
			{ laneId: 'f4', beat: 5 },
			{ laneId: 'e4', beat: 6 },
			{ laneId: 'd4', beat: 7 },
		],
		'joyRise'
	),
	joyResolve: withId(
		[
			{ laneId: 'c4', beat: 0 },
			{ laneId: 'c4', beat: 1 },
			{ laneId: 'd4', beat: 2 },
			{ laneId: 'e4', beat: 3 },
			{ laneId: 'e4', beat: 4, lengthBeats: 1.5 },
			{ laneId: 'd4', beat: 6, lengthBeats: 1.5 },
		],
		'joyResolve'
	),
	riverRun: withId(
		[
			{ laneId: 'g4', beat: 0 },
			{ laneId: 'a4', beat: 0.75 },
			{ laneId: 'b4', beat: 1.5 },
			{ laneId: 'g5', beat: 2.5 },
			{ laneId: 'e5', beat: 3.25 },
			{ laneId: 'd5', beat: 4.25 },
			{ laneId: 'c5', beat: 5.25 },
			{ laneId: 'g4', beat: 6.25, lengthBeats: 1.25 },
		],
		'riverRun'
	),
	chordLift: withId(
		[
			{ laneId: 'c4', beat: 0, chordId: 'a' },
			{ laneId: 'e4', beat: 0, chordId: 'a' },
			{ laneId: 'g4', beat: 0, chordId: 'a' },
			{ laneId: 'd4', beat: 2 },
			{ laneId: 'f4', beat: 3.5, lengthBeats: 1.5 },
			{ laneId: 'g4', beat: 5, chordId: 'b' },
			{ laneId: 'b4', beat: 5, chordId: 'b' },
		],
		'chordLift'
	),
	holdBridge: withId(
		[
			{ laneId: 'c5', beat: 0, lengthBeats: 2 },
			{ laneId: 'g4', beat: 2.25 },
			{ laneId: 'a4', beat: 3.25 },
			{ laneId: 'g4', beat: 4.25 },
			{ laneId: 'e4', beat: 5.25, lengthBeats: 1.5 },
		],
		'holdBridge'
	),
}

export function buildChartFromPatterns(patternIds: string[], bpm: number, startMs = 1200) {
	const beatMs = 60000 / bpm
	let cursorBeat = 0
	const notes: ChartNote[] = []

	patternIds.forEach((patternId, patternIndex) => {
		const pattern = PATTERN_LIBRARY[patternId]
		if (!pattern) return

		pattern.notes.forEach((note, noteIndex) => {
			const durationMs = Math.max(Math.round((note.lengthBeats ?? 0) * beatMs), 0)
			notes.push({
				id: `${patternId}-${patternIndex}-${noteIndex}`,
				laneId: note.laneId,
				timeMs: Math.round(startMs + (cursorBeat + note.beat) * beatMs),
				durationMs,
				type: durationMs > beatMs * 0.9 ? 'hold' : 'tap',
				chordId: note.chordId,
			})
		})

		cursorBeat += pattern.beats
	})

	return notes.sort((a, b) => a.timeMs - b.timeMs)
}

export function buildTimeModeChart(bpm: number) {
	const seedPattern = [
		'twinkleA',
		'twinkleB',
		'joyRise',
		'joyResolve',
		'riverRun',
		'chordLift',
	]

	return buildChartFromPatterns(seedPattern, bpm, 0).map((note, index) => ({
		...note,
		timeMs: index * 1000,
		durationMs: 0,
		type: 'tap' as const,
	}))
}

function clampScaleIndex(index: number) {
	return Math.max(0, Math.min(index, SCALE.length - 1))
}

function maybeAddChord(baseLaneId: string, allowChord: boolean) {
	if (!allowChord) return [baseLaneId]
	const baseIndex = SCALE.indexOf(baseLaneId)
	if (baseIndex < 0) return [baseLaneId]
	const third = SCALE[clampScaleIndex(baseIndex + 2)]
	return [baseLaneId, third]
}

export function createEndlessState(): EndlessComposerState {
	return {
		seed: Date.now(),
		lastRootIndex: 0,
		lastTimeMs: 1200,
		chunkIndex: 0,
	}
}

export function appendEndlessChunk(
	state: EndlessComposerState,
	difficulty: number,
	bpm: number
) {
	const beatMs = 60000 / bpm
	const chunkLength = 8
	const rootShift = state.chunkIndex % ENDLESS_ROOTS.length
	state.lastRootIndex = (state.lastRootIndex + rootShift + 1) % ENDLESS_ROOTS.length
	const root = ENDLESS_ROOTS[state.lastRootIndex]
	const rootIndex = SCALE.indexOf(root)
	const density = difficulty > 0.72 ? 0.5 : difficulty > 0.38 ? 0.75 : 1
	const allowChord = difficulty > 0.45
	const holdChance = difficulty > 0.6 ? 0.24 : 0.12
	const motif = [0, 2, 4, 2, 5, 4, 2, 0]
	const notes: ChartNote[] = []

	motif.forEach((step, index) => {
		const laneId = SCALE[clampScaleIndex(rootIndex + step)]
		const beat = index * density
		const durationBeats = Math.random() < holdChance && index % 3 === 0 ? density * 2 : 0
		const chordLanes = maybeAddChord(laneId, allowChord && index % 4 === 0)
		const chordId = chordLanes.length > 1 ? `endless-${state.chunkIndex}-${index}` : undefined

		chordLanes.forEach((chordLaneId, chordIndex) => {
			notes.push({
				id: `endless-${state.chunkIndex}-${index}-${chordIndex}`,
				laneId: chordLaneId,
				timeMs: Math.round(state.lastTimeMs + beat * beatMs),
				durationMs: Math.round(durationBeats * beatMs),
				type: durationBeats > 0 ? 'hold' : 'tap',
				chordId,
			})
		})
	})

	state.lastTimeMs += chunkLength * density * beatMs
	state.chunkIndex += 1

	return notes.sort((a, b) => a.timeMs - b.timeMs)
}

export function createSessionId(prefix: SessionConfig['modeId']) {
	return `${prefix}-${Date.now()}`
}

export function hasValidLane(laneId: string) {
	return PIANO_KEYS.some((key) => key.id === laneId)
}
