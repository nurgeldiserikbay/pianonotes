import type { BackgroundPresetId, DifficultyId } from '@/core/models'
import { MELODIES_BY_DIFFICULTY, getMelodyMood } from '@/modes/melodies'

// Worlds are now derived from the melody library rather than hand-declared: the
// campaign is exactly the public-domain tunes in difficulty order, grouped into
// chapters for the level board. Adding a melody re-chapters the campaign by
// itself, and no hand-kept list can drift out of sync with the content.
// Eight levels a chapter. At five, a two-hundred-melody library produced forty
// chapters, which turns the level board into a scroll with no sense of place.
export const WORLD_SIZE = 8

export interface WorldDefinition {
	id: string
	index: number
	title: string
	concept: string
	themeId: BackgroundPresetId
	newNoteIds: string[]
	difficulty: DifficultyId
}

// A chapter mixes moods, so it simply borrows the character of the melody it
// opens with.
// Chapter names describe where the player is in the climb, not what the tunes
// are: which melodies land in which chapter follows from the difficulty sort and
// changes whenever the library does. A name like "Black Keys" would be a promise
// the sort cannot keep.
const CHAPTER_TITLES = [
	'First Tunes',
	'Nursery Favourites',
	'Songs You Know',
	'Around the Staff',
	'Wider Reach',
	'Old Standards',
	'Both Hands of the Staff',
	'Longer Phrases',
	'Folk Songs',
	'Across the Sea',
	'Carols',
	'Ballads',
	'Sailors and Soldiers',
	'Slow Airs',
	'Dance Tunes',
	'Two Pages',
	'Sharps and Flats',
	'Hymn Tunes',
	'Bells and Chimes',
	'Winter Songs',
	'Evening Songs',
	'Marches',
	'The High Register',
	'Full Pieces',
	'Wide Leaps',
	'Chromatic Steps',
	'The Whole Keyboard',
	'Long Airs',
	'Master Class',
	'Encore',
	'Curtain Call',
	'Grand Finale',
]

function difficultyForChapter(chapterIndex: number, chapterCount: number): DifficultyId {
	const progress = chapterCount <= 1 ? 0 : chapterIndex / (chapterCount - 1)
	if (progress < 0.34) return 'easy'
	if (progress < 0.7) return 'normal'
	return 'hard'
}

// Which pitches a melody introduces that no earlier melody used. Drives the
// "new notes" card, and now it is a fact about the content instead of a list
// somebody has to maintain.
const introducedByLevel: string[][] = []
const seenLanes = new Set<string>()

MELODIES_BY_DIFFICULTY.forEach((melody) => {
	const fresh: string[] = []
	melody.notes.forEach((note) => {
		if (seenLanes.has(note.lane)) return
		seenLanes.add(note.lane)
		fresh.push(note.lane)
	})
	introducedByLevel.push(fresh)
})

const chapterCount = Math.max(1, Math.ceil(MELODIES_BY_DIFFICULTY.length / WORLD_SIZE))

export const CAMPAIGN_WORLDS: WorldDefinition[] = Array.from(
	{ length: chapterCount },
	(_, chapterIndex) => {
		const start = chapterIndex * WORLD_SIZE
		const melodies = MELODIES_BY_DIFFICULTY.slice(start, start + WORLD_SIZE)
		const newNoteIds = introducedByLevel
			.slice(start, start + WORLD_SIZE)
			.flat()

		return {
			id: `w${String(chapterIndex + 1).padStart(2, '0')}`,
			index: chapterIndex,
			title: CHAPTER_TITLES[chapterIndex] ?? `Chapter ${chapterIndex + 1}`,
			concept: melodies.map((melody) => melody.title).join(' · '),
			themeId: getMelodyMood(melodies[0]?.id ?? ''),
			newNoteIds,
			difficulty: difficultyForChapter(chapterIndex, chapterCount),
		}
	}
)

export function getNewNotesForLevel(_worldIndex: number, _levelInWorld: number) {
	// Kept for call-site compatibility; the per-level answer now comes straight
	// from the melody order below.
	return []
}

export function getNewNotesForLevelIndex(levelIndex: number) {
	return introducedByLevel[levelIndex] ?? []
}
