// Shared beginner-to-advanced curve for the 300-level campaign. Both the level
// generator and appStore's session builder read from here so the "speed" and
// "world" progressions never drift apart.

export const TOTAL_CAMPAIGN_LEVELS = 300
export const WORLD_SIZE = 25
export const WORLD_COUNT = TOTAL_CAMPAIGN_LEVELS / WORLD_SIZE

// Note travel time in ms (RhythmGame's approachMs). Level 0 gives a true beginner
// real time to find the key; level 299 is harder than the old fixed 2.4-3.1s ceiling.
const BEGINNER_APPROACH_MS = 9000
const FLOOR_APPROACH_MS = 1500
const APPROACH_EASE = 1.6 // >1 = long easy tail, steeper ramp near the end

const BPM_START = 66
const BPM_END = 150 // stays under ENDLESS_MODE_CONFIG.bpmMax (158) for a smooth handoff
const BPM_EASE = 1.3

export function levelProgress(levelIndex: number) {
	if (TOTAL_CAMPAIGN_LEVELS <= 1) return 1
	return Math.min(1, Math.max(0, levelIndex / (TOTAL_CAMPAIGN_LEVELS - 1)))
}

export function getApproachMsForLevel(levelIndex: number) {
	const eased = Math.pow(levelProgress(levelIndex), APPROACH_EASE)
	return Math.round(BEGINNER_APPROACH_MS - (BEGINNER_APPROACH_MS - FLOOR_APPROACH_MS) * eased)
}

export function getBpmForLevel(levelIndex: number) {
	const eased = Math.pow(levelProgress(levelIndex), BPM_EASE)
	return Math.round(BPM_START + (BPM_END - BPM_START) * eased)
}

// 0..1 scalar reused for chord/hold-density scaling, the same role `difficulty`
// already plays inside patterns.ts's motif composer.
export function getComplexityForLevel(levelIndex: number) {
	return levelProgress(levelIndex)
}

export function getWorldIndex(levelIndex: number) {
	return Math.min(WORLD_COUNT - 1, Math.floor(levelIndex / WORLD_SIZE))
}

export function isMilestoneLevel(levelIndex: number) {
	return (levelIndex + 1) % WORLD_SIZE === 0
}

export function getTargetScoreForLevel(levelIndex: number) {
	const t = levelProgress(levelIndex)
	return Math.round(18000 + t * 220000 + Math.pow(levelIndex, 1.05) * 30)
}
