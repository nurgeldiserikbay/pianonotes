import type { GameModeId, HudSnapshot } from '@/core/models'

// Reading mode grades three things and nothing else: how long the melody took,
// how many keys were hit correctly, and how evenly the beats were spaced. The
// old millisecond judgement windows, combo multipliers and point values are gone
// with the scrolling engine — nothing is judged against a moving target anymore.
// Star thresholds and the tempo window live in features/reading.ts.

export function formatAccuracy(value: number) {
	return `${value.toFixed(1)}%`
}

export function formatTime(seconds: number) {
	const mins = Math.floor(seconds / 60)
	const secs = Math.floor(seconds % 60)
	return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function createEmptyHud(modeId: GameModeId, lives = 5): HudSnapshot {
	return {
		score: 0,
		combo: 0,
		lives,
		accuracy: 100,
		elapsedSec: 0,
		remainingSec: 0,
		maxCombo: 0,
		misses: 0,
		perfect: 0,
		great: 0,
		good: 0,
		currentSpeedLabel: '',
		notesCompleted: 0,
		notesTotal: 0,
		tempoState: 'on',
		nextLaneId: null,
		streak: 0,
		modeId,
	}
}
