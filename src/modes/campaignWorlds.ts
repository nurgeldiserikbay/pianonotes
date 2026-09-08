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
	coverId: ChapterCoverId
	newNoteIds: string[]
	difficulty: DifficultyId
}

// The painted covers, in the order they were drawn.
//
// They were spread across the whole campaign at first, so that the art climbed
// from a moonlit meadow to a lit concert hall as the player did. With thirty-two
// chapters that gave each cover a run of several, and the first thing anyone saw
// was a stretch of chapters wearing the same picture. Variety where the player
// is beats a progression they would have to play for hours to notice, so they
// cycle — and with twelve rather than six, a chapter's art repeats half as
// often.
export const CHAPTER_COVERS = [
	'01-first-tunes',
	'02-nursery-favourites',
	'03-songs-you-know',
	'04-rhythm-garden',
	'05-starlight-stage',
	'06-grand-finale',
	'07-around-the-staff',
	'08-wider-reach',
	'09-old-standards',
	'10-longer-phrases',
	'11-folk-songs',
	'12-across-the-sea',
] as const

export type ChapterCoverId = (typeof CHAPTER_COVERS)[number]

function coverForChapter(chapterIndex: number): ChapterCoverId {
	return CHAPTER_COVERS[Math.max(0, chapterIndex) % CHAPTER_COVERS.length]
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
			coverId: coverForChapter(chapterIndex),
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

// The cover a single level sits under — the menu hero and the result screen show
// the art of the chapter the player is in, not a generic one.
export function chapterCoverForLevelIndex(levelIndex: number): ChapterCoverId {
	const chapter = Math.floor(Math.max(0, levelIndex) / WORLD_SIZE)
	return CAMPAIGN_WORLDS[Math.min(chapter, CAMPAIGN_WORLDS.length - 1)]?.coverId ?? CHAPTER_COVERS[0]
}
