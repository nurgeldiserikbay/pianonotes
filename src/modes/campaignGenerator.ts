import type { CampaignLevel, ChartNote } from '@/core/models'
import { composeMotifChart } from '@/game/patterns'
import { CAMPAIGN_WORLDS, getNotePoolForLevel } from '@/modes/campaignWorlds'
import {
	TOTAL_CAMPAIGN_LEVELS,
	WORLD_SIZE,
	getBpmForLevel,
	getComplexityForLevel,
	getTargetScoreForLevel,
	getWorldIndex,
	isMilestoneLevel,
} from '@/modes/difficultyCurve'

// The original 6 hand-authored songs, kept verbatim (including their original ids, so
// existing players' saved stars/bestScore carry over). Reused as milestone content — the
// last level of every world — cycled twice across the 12 worlds ("— Reprise" for the
// second pass, played at that world's curve-driven tempo).
const HAND_AUTHORED_MILESTONES: Array<Omit<CampaignLevel, 'index' | 'worldId' | 'isMilestone'>> = [
	{
		id: 'twinkle-intro',
		title: 'Twinkle Intro',
		artist: 'Traditional',
		bpm: 92,
		difficulty: 'easy',
		themeId: 'purple-blue',
		description: 'A warm opening tune with clean rhythm and easy note reads.',
		patternIds: ['twinkleA', 'twinkleB'],
		targetScore: 26000,
	},
	{
		id: 'joy-steps',
		title: 'Joy Steps',
		artist: 'Beethoven',
		bpm: 104,
		difficulty: 'easy',
		themeId: 'aurora',
		description: 'A cheerful climb with a little more movement across the staff.',
		patternIds: ['joyRise', 'joyResolve', 'joyRise'],
		targetScore: 42000,
	},
	{
		id: 'starlight-river',
		title: 'Starlight River',
		artist: 'Original Mix',
		bpm: 112,
		difficulty: 'normal',
		themeId: 'neon',
		description: 'Brighter runs, faster reads, and a smoother melodic flow.',
		patternIds: ['riverRun', 'twinkleA', 'joyResolve'],
		targetScore: 58000,
	},
	{
		id: 'glass-bridge',
		title: 'Glass Bridge',
		artist: 'Original Mix',
		bpm: 118,
		difficulty: 'normal',
		themeId: 'aurora',
		description: 'Longer notes begin to sing while the pattern keeps moving.',
		patternIds: ['holdBridge', 'joyRise', 'twinkleB'],
		targetScore: 68000,
	},
	{
		id: 'golden-stage',
		title: 'Golden Stage',
		artist: 'Festival Edit',
		bpm: 124,
		difficulty: 'hard',
		themeId: 'gold-stage',
		description: 'Chords land on strong beats and ask for sharper timing.',
		patternIds: ['chordLift', 'riverRun', 'holdBridge'],
		targetScore: 82000,
	},
	{
		id: 'finale-burst',
		title: 'Finale Burst',
		artist: 'Original Mix',
		bpm: 132,
		difficulty: 'hard',
		themeId: 'neon',
		description: 'A colorful finale full of leaps, holds, and sparkling accents.',
		patternIds: ['joyRise', 'chordLift', 'riverRun', 'holdBridge'],
		targetScore: 102000,
	},
]

// Deterministic string hash (FNV-1a) + mulberry32 PRNG so a given level id always
// produces the identical procedural chart — records/stars stay meaningful on replay.
function hashSeed(id: string) {
	let hash = 0x811c9dc5
	for (let index = 0; index < id.length; index += 1) {
		hash ^= id.charCodeAt(index)
		hash = Math.imul(hash, 0x01000193)
	}
	return hash >>> 0
}

function mulberry32(seed: number) {
	let state = seed
	return () => {
		state |= 0
		state = (state + 0x6d2b79f5) | 0
		let t = Math.imul(state ^ (state >>> 15), 1 | state)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

// Every level draws from the full natural note pool (see campaignWorlds.ts) — the
// "gradual" part of the difficulty curve instead comes from which of these three
// motif tiers gets picked, plus how wide a root band they're allowed to start from
// (see pickRootIndex). Gentle = small steps, narrow range, genuinely childlike.
// Moderate/complex widen the steps and eventually add real leaps.
const GENTLE_MOTIFS = [
	[0, 1, 2, 1, 0, 1, 2, 0],
	[0, 0, 1, 1, 2, 1, 0, 0],
	[2, 1, 0, 1, 2, 2, 1, 0],
	[0, 1, 0, 1, 2, 1, 0, 0],
]
const MODERATE_MOTIFS = [
	[0, 2, 4, 2, 5, 4, 2, 0],
	[0, 1, 2, 3, 4, 3, 2, 0],
	[0, 4, 2, 5, 3, 6, 4, 0],
]
const COMPLEX_MOTIFS = [
	[0, 5, 2, 7, 4, 8, 3, 0],
	[0, 3, 7, 4, 8, 5, 2, 0],
	[6, 3, 0, 4, 8, 5, 1, 0],
	[0, 2, 5, 8, 6, 3, 7, 0],
]

// Dedicated stepwise motifs for the rare degenerate pool (e.g. the ['c4','d4','e4']
// fallback when a level somehow has no notePool at all), indexed 0..poolLength-1 so
// every available note gets used instead of clamping to the top of the range.
const SMALL_POOL_MOTIFS: Record<number, number[][]> = {
	2: [
		[0, 1, 0, 1, 0, 0, 1, 0],
		[0, 0, 1, 1, 0, 1, 0, 1],
		[1, 0, 1, 0, 1, 1, 0, 0],
	],
	3: [
		[0, 1, 2, 1, 0, 1, 2, 0],
		[0, 1, 2, 2, 1, 0, 1, 0],
		[2, 1, 0, 1, 2, 1, 0, 0],
		[0, 0, 1, 2, 1, 1, 0, 2],
	],
}

function pickMotifShape(notePool: string[], difficulty: number, random: () => number) {
	const smallPoolShapes = SMALL_POOL_MOTIFS[notePool.length]
	if (smallPoolShapes) return smallPoolShapes[Math.floor(random() * smallPoolShapes.length)]

	const tier = difficulty < 0.3 ? GENTLE_MOTIFS : difficulty < 0.65 ? MODERATE_MOTIFS : COMPLEX_MOTIFS
	return tier[Math.floor(random() * tier.length)]
}

// Gentle-tier melodies additionally stay within a narrow 5-note band (a "five
// finger position", the way real beginner piano books start) instead of picking a
// root anywhere across the full pool — small steps alone don't read as childlike if
// the phrase still wanders end-to-end of a 14-note range.
function pickRootIndex(notePool: string[], difficulty: number, random: () => number) {
	if (notePool.length <= 3) return 0

	if (difficulty < 0.3) {
		const bandSize = Math.min(5, notePool.length)
		const bandStart = Math.floor((notePool.length - bandSize) / 2)
		return bandStart + Math.floor(random() * bandSize)
	}

	return Math.floor(random() * notePool.length)
}

export function generateCampaignLevels(): CampaignLevel[] {
	const levels: CampaignLevel[] = []

	for (let index = 0; index < TOTAL_CAMPAIGN_LEVELS; index += 1) {
		const worldIndex = getWorldIndex(index)
		const world = CAMPAIGN_WORLDS[worldIndex]
		const bpm = getBpmForLevel(index)

		if (isMilestoneLevel(index)) {
			const milestoneSlot = Math.floor(index / WORLD_SIZE)
			const song = HAND_AUTHORED_MILESTONES[milestoneSlot % HAND_AUTHORED_MILESTONES.length]
			const isReprise = milestoneSlot >= HAND_AUTHORED_MILESTONES.length

			levels.push({
				...song,
				id: isReprise ? `${song.id}-reprise` : song.id,
				title: isReprise ? `${song.title} — Reprise` : song.title,
				bpm,
				difficulty: world.difficulty,
				themeId: world.themeId,
				targetScore: getTargetScoreForLevel(index),
				worldId: world.id,
				isMilestone: true,
				index,
			})
			continue
		}

		levels.push({
			id: `campaign-${String(index + 1).padStart(3, '0')}`,
			title: `${world.title} — Level ${(index % WORLD_SIZE) + 1}`,
			artist: world.title,
			bpm,
			difficulty: world.difficulty,
			themeId: world.themeId,
			description: world.concept,
			patternIds: [],
			notePool: getNotePoolForLevel(worldIndex, index % WORLD_SIZE),
			allowChords: world.allowChords,
			allowHolds: world.allowHolds,
			targetScore: getTargetScoreForLevel(index),
			worldId: world.id,
			isMilestone: false,
			index,
		})
	}

	return levels
}

export function buildProceduralCampaignChart(level: CampaignLevel, bpm: number, startMs: number): ChartNote[] {
	const notePool = level.notePool && level.notePool.length > 0 ? level.notePool : ['c4', 'd4', 'e4']
	const random = mulberry32(hashSeed(level.id))
	const levelIndex = level.index ?? 0
	const difficulty = getComplexityForLevel(levelIndex)
	const phrases = 3 + Math.floor(difficulty * 3)

	let cursorMs = startMs
	const notes: ChartNote[] = []

	for (let phrase = 0; phrase < phrases; phrase += 1) {
		// A fresh shape per phrase keeps a level from playing the exact same 8 notes
		// 3-6 times in a row.
		const shape = pickMotifShape(notePool, difficulty, random)
		const rootIndex = pickRootIndex(notePool, difficulty, random)
		const chunk = composeMotifChart({
			notePool,
			rootIndex,
			motif: shape,
			density: 1,
			allowChord: level.allowChords ?? false,
			holdChance: level.allowHolds ? 0.1 + difficulty * 0.2 : 0,
			bpm,
			startMs: cursorMs,
			idPrefix: `${level.id}-${phrase}`,
			random,
		})

		notes.push(...chunk)
		const lastNote = chunk.length ? chunk[chunk.length - 1] : undefined
		cursorMs = (lastNote?.timeMs ?? cursorMs) + (60000 / bpm) * 2
	}

	return notes
}
