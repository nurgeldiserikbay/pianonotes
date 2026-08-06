import type {
	GameModeId,
	GameplayResult,
	HudSnapshot,
	Judgement,
	ResultBadge,
	RuntimeJudgementSummary,
} from '@/core/models'

export const MOVING_JUDGEMENT_WINDOWS = {
	perfect: 80,
	great: 150,
	good: 240,
}

export const TIME_RESPONSE_WINDOWS = {
	perfect: 700,
	great: 1400,
	good: 2400,
}

const JUDGEMENT_WEIGHTS: Record<Judgement, number> = {
	perfect: 1,
	great: 0.8,
	good: 0.55,
	miss: 0,
}

const JUDGEMENT_SCORE: Record<Judgement, number> = {
	perfect: 1000,
	great: 700,
	good: 450,
	miss: 0,
}

export function getJudgement(deltaMs: number, modeId: GameModeId): Judgement {
	const windows = modeId === 'time' ? TIME_RESPONSE_WINDOWS : MOVING_JUDGEMENT_WINDOWS
	const distance = Math.abs(deltaMs)

	if (distance <= windows.perfect) return 'perfect'
	if (distance <= windows.great) return 'great'
	if (distance <= windows.good) return 'good'
	return 'miss'
}

export function getComboMultiplier(combo: number) {
	return 1 + Math.min(combo, 30) * 0.035
}

export function getScoreGain(judgement: Judgement, combo: number) {
	return Math.round(JUDGEMENT_SCORE[judgement] * getComboMultiplier(combo))
}

export function getAccuracy(summary: RuntimeJudgementSummary) {
	const total = summary.perfect + summary.great + summary.good + summary.miss
	if (!total) return 100

	const weighted =
		summary.perfect * JUDGEMENT_WEIGHTS.perfect +
		summary.great * JUDGEMENT_WEIGHTS.great +
		summary.good * JUDGEMENT_WEIGHTS.good

	return Math.max(0, Math.min(100, Number(((weighted / total) * 100).toFixed(1))))
}

export function getTempoStability(hitOffsetsMs: number[]) {
	if (!hitOffsetsMs.length) return 100

	const mean = hitOffsetsMs.reduce((sum, value) => sum + value, 0) / hitOffsetsMs.length
	const variance =
		hitOffsetsMs.reduce((sum, value) => sum + (value - mean) ** 2, 0) / hitOffsetsMs.length
	const deviation = Math.sqrt(variance)

	return Math.max(0, Math.min(100, Number((100 - Math.min(deviation / 2.4, 100)).toFixed(1))))
}

export function getCampaignStars(accuracy: number, misses: number, tempoStability: number) {
	if (accuracy >= 94 && misses <= 3 && tempoStability >= 82) return 3
	if (accuracy >= 87 && misses <= 7) return 2
	if (accuracy >= 75) return 1
	return 0
}

export function getTimeRank(accuracy: number, streak: number, lives: number): ResultBadge {
	if (accuracy >= 98 && streak >= 24 && lives >= 3) return 'SS'
	if (accuracy >= 94 && streak >= 18) return 'S'
	if (accuracy >= 88) return 'A'
	if (accuracy >= 78) return 'B'
	return 'C'
}

export function getEndlessRank(score: number): ResultBadge {
	if (score >= 220000) return 'SSS'
	if (score >= 160000) return 'SS'
	if (score >= 110000) return 'S'
	if (score >= 70000) return 'A'
	if (score >= 40000) return 'B'
	if (score >= 18000) return 'C'
	return 'D'
}

export function getCampaignBadge(stars: number): ResultBadge {
	return `${stars}` as ResultBadge
}

export function buildResultBadge(result: Omit<GameplayResult, 'badge'>): ResultBadge {
	if (result.modeId === 'campaign') {
		return getCampaignBadge(result.stars ?? 0)
	}

	if (result.modeId === 'time') {
		return getTimeRank(result.accuracy, result.streak, result.remainingLives)
	}

	return getEndlessRank(result.score)
}

export function formatAccuracy(value: number) {
	return `${value.toFixed(1)}%`
}

export function formatTime(seconds: number) {
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function buildSpeedLabel(modeId: GameModeId, bpm: number, approachMs: number) {
	if (modeId === 'time') return 'Manual tempo'
	const notesPerSecond = 1000 / Math.max(approachMs * 0.35, 1)
	return `${Math.round(bpm)} BPM • ${notesPerSecond.toFixed(1)}x`
}

export function createEmptyHud(modeId: GameModeId): HudSnapshot {
	return {
		score: 0,
		combo: 0,
		lives: 5,
		accuracy: 100,
		elapsedSec: 0,
		maxCombo: 0,
		misses: 0,
		perfect: 0,
		great: 0,
		good: 0,
		currentSpeedLabel: modeId === 'time' ? 'Manual tempo' : '0.0x',
		notesCompleted: 0,
		streak: 0,
		modeId,
	}
}
