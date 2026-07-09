import type {
	CampaignProgress,
	GameModeId,
	GameplayResult,
	ModeRecord,
	SettingsState,
	StorageSnapshot,
} from '@/core/models'
import { DEFAULT_SETTINGS } from '@/core/models'

const STORAGE_KEY = 'piano-notes-mobile-v2'

function createEmptySnapshot(): StorageSnapshot {
	return {
		settings: { ...DEFAULT_SETTINGS },
		campaignProgress: {},
		records: {
			campaign: [],
			time: [],
			endless: [],
		},
	}
}

function safeRead() {
	try {
		return window.localStorage.getItem(STORAGE_KEY)
	} catch {
		return null
	}
}

function safeWrite(snapshot: StorageSnapshot) {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
	} catch {
		// Ignore storage quota issues on unsupported environments.
	}
}

export function loadSnapshot(): StorageSnapshot {
	const raw = safeRead()
	if (!raw) return createEmptySnapshot()

	try {
		const parsed = JSON.parse(raw) as Partial<StorageSnapshot>
		return {
			...createEmptySnapshot(),
			...parsed,
			settings: {
				...DEFAULT_SETTINGS,
				...(parsed.settings ?? {}),
			},
			campaignProgress: parsed.campaignProgress ?? {},
			records: {
				campaign: parsed.records?.campaign ?? [],
				time: parsed.records?.time ?? [],
				endless: parsed.records?.endless ?? [],
			},
		}
	} catch {
		return createEmptySnapshot()
	}
}

export function saveSnapshot(snapshot: StorageSnapshot) {
	safeWrite(snapshot)
}

export function updateSettings(snapshot: StorageSnapshot, settings: SettingsState) {
	const next: StorageSnapshot = {
		...snapshot,
		settings: { ...settings },
	}

	saveSnapshot(next)
	return next
}

function toRecord(result: GameplayResult): ModeRecord {
	return {
		id: result.id,
		modeId: result.modeId,
		date: result.date,
		score: result.score,
		accuracy: result.accuracy,
		maxCombo: result.maxCombo,
		misses: result.misses,
		badge: result.badge,
		survivalTimeSec: result.survivalTimeSec,
		levelId: result.levelId,
		levelTitle: result.levelTitle,
	}
}

function upsertCampaignProgress(current: CampaignProgress | undefined, result: GameplayResult): CampaignProgress {
	const previous = current ?? {
		levelId: result.levelId ?? 'unknown',
		bestScore: 0,
		bestAccuracy: 0,
		bestCombo: 0,
		bestStars: 0,
		lastPlayedAt: null,
		recentRuns: [],
	}

	const recentRuns = [
		{
			...toRecord(result),
			stars: result.stars ?? 0,
		},
		...previous.recentRuns,
	].slice(0, 5)

	return {
		levelId: previous.levelId,
		bestScore: Math.max(previous.bestScore, result.score),
		bestAccuracy: Math.max(previous.bestAccuracy, result.accuracy),
		bestCombo: Math.max(previous.bestCombo, result.maxCombo),
		bestStars: Math.max(previous.bestStars, result.stars ?? 0) as 0 | 1 | 2 | 3,
		lastPlayedAt: result.date,
		recentRuns,
	}
}

export function storeResult(snapshot: StorageSnapshot, result: GameplayResult) {
	const next: StorageSnapshot = {
		...snapshot,
		records: {
			...snapshot.records,
			[result.modeId]: [toRecord(result), ...snapshot.records[result.modeId]].slice(0, 5),
		} as Record<GameModeId, ModeRecord[]>,
		campaignProgress: { ...snapshot.campaignProgress },
	}

	if (result.modeId === 'campaign' && result.levelId) {
		next.campaignProgress[result.levelId] = upsertCampaignProgress(
			next.campaignProgress[result.levelId],
			result
		)
	}

	saveSnapshot(next)
	return next
}

export function resetProgress() {
	const fresh = createEmptySnapshot()
	saveSnapshot(fresh)
	return fresh
}
