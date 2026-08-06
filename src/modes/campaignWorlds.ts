import type { BackgroundPresetId, DifficultyId } from '@/core/models'
import { WHITE_KEYS } from '@/entities/piano'
import { WORLD_SIZE } from '@/modes/difficultyCurve'

// Every level's melody draws from the full natural (white-key) range from level 1 —
// a beginner should get whole tunes, not a single repeated pitch. Difficulty ramps
// through tempo (difficultyCurve.ts), melodic complexity (campaignGenerator.ts's
// gentle/moderate/complex motif tiers), and mechanics (chords/holds below), not by
// rationing which notes are allowed to appear. Sharps (black keys) are the one
// exception: they're still introduced progressively, as a genuine "harder pieces"
// step, in worlds 8-10.
export const FULL_NATURAL_POOL = WHITE_KEYS.map((key) => key.id)

export interface WorldDefinition {
	id: string
	index: number
	title: string
	concept: string
	themeId: BackgroundPresetId
	newNoteIds: string[]
	allowChords: boolean
	allowHolds: boolean
	difficulty: DifficultyId
}

const RAW_WORLDS: Omit<WorldDefinition, 'index'>[] = [
	{ id: 'w01', title: 'First Melodies', concept: 'Slow, simple children’s tunes', themeId: 'purple-blue', newNoteIds: [], allowChords: false, allowHolds: false, difficulty: 'easy' },
	{ id: 'w02', title: 'Gentle Tunes', concept: 'A little more movement', themeId: 'aurora', newNoteIds: [], allowChords: false, allowHolds: false, difficulty: 'easy' },
	{ id: 'w03', title: 'Growing Confidence', concept: 'Longer melodies, steady rhythm', themeId: 'neon', newNoteIds: [], allowChords: false, allowHolds: false, difficulty: 'easy' },
	{ id: 'w04', title: 'First Chords', concept: 'Two notes at once', themeId: 'purple-blue', newNoteIds: [], allowChords: true, allowHolds: false, difficulty: 'easy' },
	{ id: 'w05', title: 'Holding Notes', concept: 'Long notes that sing', themeId: 'aurora', newNoteIds: [], allowChords: true, allowHolds: true, difficulty: 'normal' },
	{ id: 'w06', title: 'Classical Sketches', concept: 'Familiar-sounding phrases', themeId: 'neon', newNoteIds: [], allowChords: true, allowHolds: true, difficulty: 'normal' },
	{ id: 'w07', title: 'Folk & Pop', concept: 'Catchy, upbeat tunes', themeId: 'gold-stage', newNoteIds: [], allowChords: true, allowHolds: true, difficulty: 'normal' },
	{ id: 'w08', title: 'Sharps I', concept: 'Black keys: C# and D#', themeId: 'purple-blue', newNoteIds: ['cs4', 'ds4'], allowChords: true, allowHolds: true, difficulty: 'normal' },
	{ id: 'w09', title: 'Sharps II', concept: 'F#, G#, A#', themeId: 'aurora', newNoteIds: ['fs4', 'gs4', 'as4'], allowChords: true, allowHolds: true, difficulty: 'hard' },
	{ id: 'w10', title: 'High Sharps', concept: 'Black keys up top', themeId: 'neon', newNoteIds: ['cs5', 'ds5', 'fs5', 'gs5', 'as5'], allowChords: true, allowHolds: true, difficulty: 'hard' },
	{ id: 'w11', title: 'Speed & Rhythm', concept: 'Faster tempo, denser runs', themeId: 'gold-stage', newNoteIds: [], allowChords: true, allowHolds: true, difficulty: 'hard' },
	{ id: 'w12', title: 'Grand Finale', concept: 'Every note, full speed', themeId: 'neon', newNoteIds: [], allowChords: true, allowHolds: true, difficulty: 'hard' },
]

export const CAMPAIGN_WORLDS: WorldDefinition[] = RAW_WORLDS.map((world, index) => ({ ...world, index }))

export function getWorldById(worldId: string) {
	return CAMPAIGN_WORLDS.find((world) => world.id === worldId)
}

// Sharps are the only notes still introduced progressively. The first two of a
// world's sharps land on its very first level (so a level's "new" batch is never
// just one note), the rest stagger across the remaining levels.
function getNoteIntroLevelInWorld(world: WorldDefinition, noteIndex: number) {
	const total = world.newNoteIds.length
	if (total <= 2 || noteIndex < 2) return 0

	const remaining = total - 2
	const remainingIndex = noteIndex - 2
	const span = WORLD_SIZE - 1
	return 1 + Math.floor((remainingIndex * span) / remaining)
}

// Sharps newly introduced exactly at `levelInWorld` (0-based position within the
// world) — drives the one-time "New notes!" tutorial toast for that level.
export function getNewNotesForLevel(worldIndex: number, levelInWorld: number) {
	const world = CAMPAIGN_WORLDS[worldIndex]
	if (!world) return []
	return world.newNoteIds.filter((_, noteIndex) => getNoteIntroLevelInWorld(world, noteIndex) === levelInWorld)
}

// The full natural range, plus whichever sharps have been introduced by the time
// the player reaches `levelInWorld` of `worldIndex`. Drives the procedural chart
// generator and Note Trainer's pool.
export function getNotePoolForLevel(worldIndex: number, levelInWorld: number) {
	const priorSharps = CAMPAIGN_WORLDS.slice(0, worldIndex).flatMap((world) => world.newNoteIds)
	const world = CAMPAIGN_WORLDS[worldIndex]
	const introducedThisWorld = world
		? world.newNoteIds.filter((_, noteIndex) => getNoteIntroLevelInWorld(world, noteIndex) <= levelInWorld)
		: []
	return [...FULL_NATURAL_POOL, ...priorSharps, ...introducedThisWorld]
}
