import type { CampaignLevel, ChartNote } from '@/core/models'
import { CAMPAIGN_WORLDS, WORLD_SIZE } from '@/modes/campaignWorlds'
import { MELODIES_BY_DIFFICULTY, getMelodyMood, type Melody } from '@/modes/melodies'

// One campaign level per public-domain melody, in difficulty order. The campaign
// used to be 300 procedurally generated note runs; a hundred random sequences are
// not a hundred songs, and a player can tell.

// At most one companion note per beat: more than two simultaneous touches is
// where cheap phone panels start dropping or merging contacts.
const MAX_VOICES_PER_BEAT = 2

export function buildMelodyChart(melody: Melody, bpm: number): ChartNote[] {
	const beatMs = 60000 / Math.max(bpm, 1)
	const chart: ChartNote[] = []
	let cursorBeats = 0

	melody.notes.forEach((note, index) => {
		const timeMs = Math.round(cursorBeats * beatMs)
		cursorBeats += note.beats

		const lanes = [note.lane, ...(note.with ?? [])].slice(0, MAX_VOICES_PER_BEAT)
		lanes.forEach((lane, voice) => {
			chart.push({
				id: `${melody.id}-${index}-${voice}`,
				laneId: lane,
				timeMs,
				durationMs: 0,
				type: 'tap' as const,
			})
		})
	})

	return chart
}

export function generateCampaignLevels(): CampaignLevel[] {
	return MELODIES_BY_DIFFICULTY.map((melody, index) => {
		const world = CAMPAIGN_WORLDS[Math.floor(index / WORLD_SIZE)]

		return {
			id: melody.id,
			title: melody.title,
			artist: melody.source,
			// The melody's own tempo, not a curve-driven one: these are real tunes
			// and each has a speed it is meant to be heard at.
			bpm: melody.bpm,
			difficulty: world?.difficulty ?? 'easy',
			// The melody's own character, not its position in the list.
			themeId: getMelodyMood(melody.id),
			description: `${melody.title} — ${melody.source}.`,
			targetScore: 0,
			worldId: world?.id,
			// The last melody of each chapter is its landmark.
			isMilestone: (index + 1) % WORLD_SIZE === 0,
			index,
		}
	})
}

export function getMelodyForLevel(levelId: string) {
	return MELODIES_BY_DIFFICULTY.find((melody) => melody.id === levelId) ?? null
}
