import type {
	CampaignProgress,
	GameplayResult,
	UserTune,
	ModeRecord,
	ScoredModeId,
	SettingsState,
	StorageSnapshot,
} from '@/core/models'
import { DEFAULT_SETTINGS } from '@/core/models'

// v3: the reading rewrite changed what a run even is — records are now time and
// accuracy rather than points and combo, so v2 snapshots are not migrated, they
// are simply not read.
const STORAGE_KEY = 'piano-notes-mobile-v3'

function createEmptySnapshot(): StorageSnapshot {
	return {
		settings: { ...DEFAULT_SETTINGS },
		campaignProgress: {},
		records: {
			campaign: [],
			sprint: [],
			echo: [],
		},
		notesIntroduced: [],
		echoCleared: [],
		userTunes: [],
		streak: { current: 0, best: 0, lastPlayedDay: null },
	}
}

// Local calendar day, not UTC: a streak has to match the player's own idea of
// "yesterday", and toISOString() would roll over at the wrong hour for them.
function localDay(date: Date) {
	const month = `${date.getMonth() + 1}`.padStart(2, '0')
	const day = `${date.getDate()}`.padStart(2, '0')
	return `${date.getFullYear()}-${month}-${day}`
}

function previousDay(day: string) {
	const [year, month, date] = day.split('-').map(Number)
	const parsed = new Date(year, (month ?? 1) - 1, date ?? 1)
	parsed.setDate(parsed.getDate() - 1)
	return localDay(parsed)
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
				sprint: parsed.records?.sprint ?? [],
				echo: parsed.records?.echo ?? [],
			},
			notesIntroduced: parsed.notesIntroduced ?? [],
			echoCleared: parsed.echoCleared ?? [],
			userTunes: parsed.userTunes ?? [],
			streak: {
				current: parsed.streak?.current ?? 0,
				best: parsed.streak?.best ?? 0,
				lastPlayedDay: parsed.streak?.lastPlayedDay ?? null,
			},
		}
	} catch {
		return createEmptySnapshot()
	}
}

// Called once per finished scored run. Same day → unchanged; the next calendar
// day → +1; any longer gap → back to 1.
export function touchStreak(snapshot: StorageSnapshot, now = new Date()): StorageSnapshot {
	const today = localDay(now)
	const { current, best, lastPlayedDay } = snapshot.streak

	if (lastPlayedDay === today) return snapshot

	const continued = lastPlayedDay === previousDay(today)
	const nextCurrent = continued ? current + 1 : 1

	const next: StorageSnapshot = {
		...snapshot,
		streak: {
			current: nextCurrent,
			best: Math.max(best, nextCurrent),
			lastPlayedDay: today,
		},
	}

	saveSnapshot(next)
	return next
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
		timeMs: result.timeMs,
		tempoAccuracy: result.tempoAccuracy,
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
		bestTimeMs: null,
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

	// Only a completed run has a comparable time: a failed attempt stops the clock
	// early, so recording it would hand the player a "best time" they never played.
	const bestTimeMs = result.completed
		? Math.min(previous.bestTimeMs ?? Number.POSITIVE_INFINITY, result.timeMs)
		: previous.bestTimeMs

	return {
		levelId: previous.levelId,
		bestScore: Math.max(previous.bestScore, result.score),
		bestAccuracy: Math.max(previous.bestAccuracy, result.accuracy),
		bestCombo: Math.max(previous.bestCombo, result.maxCombo),
		bestStars: Math.max(previous.bestStars, result.stars ?? 0) as 0 | 1 | 2 | 3,
		bestTimeMs: Number.isFinite(bestTimeMs) ? bestTimeMs : null,
		lastPlayedAt: result.date,
		recentRuns,
	}
}

export function storeResult(snapshot: StorageSnapshot, result: GameplayResult) {
	// Practice runs are never stored (see appStore.finishSession), so anything
	// reaching here belongs to a scored mode.
	const modeId = result.modeId as ScoredModeId

	const next: StorageSnapshot = {
		...snapshot,
		records: {
			...snapshot.records,
			[modeId]: [toRecord(result), ...snapshot.records[modeId]].slice(0, 5),
		},
		campaignProgress: { ...snapshot.campaignProgress },
	}

	// Only Campaign writes campaign progress. By Ear plays the same melodies, but
	// reproducing a phrase by ear is not reading it off the staff: crediting it
	// with stars and a best time would report levels as cleared that the player
	// never read a note of.
	if (result.levelId && result.modeId === 'campaign') {
		next.campaignProgress[result.levelId] = upsertCampaignProgress(
			next.campaignProgress[result.levelId],
			result
		)
	}

	saveSnapshot(next)
	return next
}

// One melody answered by ear. Recorded only when the attempt was worth
// something — a run of wrong notes is not "done with this tune".
export function markEchoCleared(snapshot: StorageSnapshot, levelId: string): StorageSnapshot {
	if (snapshot.echoCleared.includes(levelId)) return snapshot

	const next: StorageSnapshot = {
		...snapshot,
		echoCleared: [...snapshot.echoCleared, levelId],
	}
	saveSnapshot(next)
	return next
}

// The player's own tunes. Saving an existing id replaces it in place — editing a
// tune must not leave the old version behind — and a new one goes to the front,
// where the list shows the most recent work first.
export function saveUserTune(snapshot: StorageSnapshot, tune: UserTune): StorageSnapshot {
	const without = snapshot.userTunes.filter((item) => item.id !== tune.id)
	const next: StorageSnapshot = {
		...snapshot,
		userTunes: [tune, ...without],
	}
	saveSnapshot(next)
	return next
}

export function deleteUserTune(snapshot: StorageSnapshot, tuneId: string): StorageSnapshot {
	const next: StorageSnapshot = {
		...snapshot,
		userTunes: snapshot.userTunes.filter((tune) => tune.id !== tuneId),
	}
	saveSnapshot(next)
	return next
}

export function renameUserTune(
	snapshot: StorageSnapshot,
	tuneId: string,
	title: string
): StorageSnapshot {
	const clean = title.trim().slice(0, 40)
	if (!clean) return snapshot

	const next: StorageSnapshot = {
		...snapshot,
		userTunes: snapshot.userTunes.map((tune) =>
			tune.id === tuneId ? { ...tune, title: clean, updatedAt: new Date().toISOString() } : tune
		),
	}
	saveSnapshot(next)
	return next
}

export function resetProgress(previous?: StorageSnapshot) {
	// Progress is the game's; the tunes are the player's. "Reset stored progress"
	// means stars and records, and silently deleting someone's own compositions
	// with them would be the worst possible reading of that button.
	const fresh: StorageSnapshot = {
		...createEmptySnapshot(),
		userTunes: previous?.userTunes ?? [],
	}
	saveSnapshot(fresh)
	return fresh
}

export function markNotesIntroduced(snapshot: StorageSnapshot, laneIds: string[]) {
	if (!laneIds.length) return snapshot

	const merged = new Set(snapshot.notesIntroduced)
	laneIds.forEach((laneId) => merged.add(laneId))

	const next: StorageSnapshot = {
		...snapshot,
		notesIntroduced: Array.from(merged),
	}

	saveSnapshot(next)
	return next
}
