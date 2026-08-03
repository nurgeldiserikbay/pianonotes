import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { AppScreen, CampaignLevel, GameModeId, GameplayResult, SessionConfig, SettingsState } from '@/core/models'
import {
	loadSnapshot,
	markNotesIntroduced,
	resetProgress,
	storeResult,
	updateSettings,
} from '@/storage/storageService'
import { CAMPAIGN_LEVELS, ENDLESS_MODE_CONFIG, MODE_DEFINITIONS, TIME_MODE_CONFIG } from '@/modes/modeDefinitions'
import { CAMPAIGN_WORLDS, FULL_NATURAL_POOL, getNewNotesForLevel } from '@/modes/campaignWorlds'
import { WORLD_SIZE, getApproachMsForLevel, getBpmForLevel } from '@/modes/difficultyCurve'
import { buildProceduralCampaignChart } from '@/modes/campaignGenerator'
import { buildChartFromPatterns, buildTimeModeChart, buildTrainerChart, createSessionId } from '@/game/patterns'
import { adManager } from '@/ads/adManager'
import admob from '@/utils/admob'

function buildCampaignSession(level: CampaignLevel, notesIntroduced: string[]): SessionConfig {
	const levelIndex = level.index ?? CAMPAIGN_LEVELS.findIndex((item) => item.id === level.id)
	const approachMs = getApproachMsForLevel(levelIndex)
	const bpm = getBpmForLevel(levelIndex)
	const startMs = approachMs + 900
	const chart = level.patternIds && level.patternIds.length > 0
		? buildChartFromPatterns(level.patternIds, bpm, startMs)
		: buildProceduralCampaignChart(level, bpm, startMs)

	const worldIndex = level.worldId ? CAMPAIGN_WORLDS.findIndex((world) => world.id === level.worldId) : -1
	const levelInWorld = levelIndex % WORLD_SIZE
	const candidateNewNotes = worldIndex >= 0 ? getNewNotesForLevel(worldIndex, levelInWorld) : []
	const newNotes = candidateNewNotes.filter((laneId) => !notesIntroduced.includes(laneId))

	return {
		id: createSessionId('campaign'),
		modeId: 'campaign',
		modeTitle: 'Campaign',
		levelId: level.id,
		levelTitle: level.title,
		bpm,
		themeId: level.themeId,
		lives: 5,
		approachMs,
		chart,
		newNotes: newNotes.length ? newNotes : undefined,
	}
}

function buildTimeSession(): SessionConfig {
	return {
		id: createSessionId('time'),
		modeId: 'time',
		modeTitle: TIME_MODE_CONFIG.title,
		bpm: TIME_MODE_CONFIG.bpm,
		themeId: TIME_MODE_CONFIG.themeId,
		lives: TIME_MODE_CONFIG.lives,
		approachMs: 0,
		chart: buildTimeModeChart(TIME_MODE_CONFIG.bpm),
	}
}

// Untimed practice drill. Reuses the 'time' engine path as-is (no scrolling, waits for
// the correct key) with a generous life count so a beginner is never rushed or ended
// early. Draws from every natural note (all playable from campaign level 1) plus
// whichever sharps have been introduced so far — sharps are still the one thing
// that unlocks progressively, see campaignWorlds.ts.
function buildTrainerSession(notesIntroduced: string[]): SessionConfig {
	const pool = [...FULL_NATURAL_POOL, ...notesIntroduced]
	return {
		id: createSessionId('time'),
		modeId: 'time',
		modeTitle: 'Note Trainer',
		bpm: TIME_MODE_CONFIG.bpm,
		themeId: TIME_MODE_CONFIG.themeId,
		lives: 999,
		approachMs: 0,
		chart: buildTrainerChart(pool, 24),
	}
}

// Endless mode's own pacing is unrelated to the campaign curve (it ramps live via
// RhythmGame's updateMovingDifficulty). Was 3100ms — about as fast as campaign level
// ~257/300, i.e. nearly its hardest pace, right from the first note. Starts slow
// enough for a beginner to survive a while, then climbs toward the same 1500ms floor.
const ENDLESS_BASE_APPROACH_MS = 7000

function buildEndlessSession(): SessionConfig {
	return {
		id: createSessionId('endless'),
		modeId: 'endless',
		modeTitle: ENDLESS_MODE_CONFIG.title,
		bpm: ENDLESS_MODE_CONFIG.bpmStart,
		themeId: ENDLESS_MODE_CONFIG.themeId,
		lives: ENDLESS_MODE_CONFIG.lives,
		approachMs: ENDLESS_BASE_APPROACH_MS,
		chart: [],
	}
}

export const useAppStore = defineStore('appStore', () => {
	const screen = ref<AppScreen>('menu')
	const screenHistory = ref<AppScreen[]>(['menu'])
	const snapshot = ref(loadSnapshot())
	const activeSession = ref<SessionConfig | null>(null)
	const selectedMode = ref<GameModeId>('campaign')
	const selectedLevelId = ref<string | null>(null)
	const lastResult = ref<GameplayResult | null>(null)
	const adMessage = ref('')
	const isTrainerSession = ref(false)

	const levels = CAMPAIGN_LEVELS
	const modes = MODE_DEFINITIONS
	const settings = computed(() => snapshot.value.settings)
	const campaignProgress = computed(() => snapshot.value.campaignProgress)
	const records = computed(() => snapshot.value.records)
	const notesIntroduced = computed(() => snapshot.value.notesIntroduced)

	// Levels unlock strictly in order — level 1 is always open, level N+1 opens once
	// level N has been cleared (>=1 star). This is what makes the 300-level curve
	// actually gradual for a beginner: one continuous, in-order song list rather than
	// a whole world (25 levels) opening up at once.
	function isLevelUnlocked(levelIndex: number) {
		if (levelIndex <= 0) return true
		const previous = levels[levelIndex - 1]
		if (!previous) return true
		return (campaignProgress.value[previous.id]?.bestStars ?? 0) >= 1
	}

	// Kept for the campaign screen's section headers (per-world title/notes/star
	// totals) — unlocking itself is per-level now, see isLevelUnlocked above.
	const worldsWithProgress = computed(() =>
		CAMPAIGN_WORLDS.map((world, index) => {
			const worldLevels = levels.filter((level) => level.worldId === world.id)
			const starsEarned = worldLevels.reduce(
				(sum, level) => sum + (campaignProgress.value[level.id]?.bestStars ?? 0),
				0
			)
			const unlocked = worldLevels.length > 0 && isLevelUnlocked(worldLevels[0].index ?? index * WORLD_SIZE)
			return {
				...world,
				levels: worldLevels,
				starsEarned,
				totalStars: worldLevels.length * 3,
				unlocked,
			}
		})
	)

	function goTo(next: AppScreen) {
		screen.value = next
		screenHistory.value.push(next)
	}

	function replace(next: AppScreen) {
		screen.value = next
		screenHistory.value[screenHistory.value.length - 1] = next
	}

	function back() {
		if (screenHistory.value.length <= 1) {
			screen.value = 'menu'
			return
		}

		screenHistory.value.pop()
		screen.value = screenHistory.value[screenHistory.value.length - 1]
	}

	function goHome() {
		screen.value = 'menu'
		screenHistory.value = ['menu']
	}

	function openCampaignLevels() {
		selectedMode.value = 'campaign'
		goTo('campaign-levels')
	}

	function openRecords() {
		goTo('records')
	}

	function openSettings() {
		goTo('settings')
	}

	function updateAppSettings(patch: Partial<SettingsState>) {
		snapshot.value = updateSettings(snapshot.value, {
			...snapshot.value.settings,
			...patch,
		})
	}

	function startCampaignLevel(levelId: string) {
		const level = levels.find((item) => item.id === levelId)
		if (!level) return
		if (!isLevelUnlocked(level.index ?? 0)) return

		selectedMode.value = 'campaign'
		selectedLevelId.value = levelId
		isTrainerSession.value = false
		activeSession.value = buildCampaignSession(level, snapshot.value.notesIntroduced)
		goTo('gameplay')
	}

	function startTimeMode() {
		selectedMode.value = 'time'
		selectedLevelId.value = null
		isTrainerSession.value = false
		activeSession.value = buildTimeSession()
		goTo('gameplay')
	}

	function startTrainerMode() {
		selectedMode.value = 'time'
		selectedLevelId.value = null
		isTrainerSession.value = true
		activeSession.value = buildTrainerSession(snapshot.value.notesIntroduced)
		goTo('gameplay')
	}

	function startEndlessMode() {
		selectedMode.value = 'endless'
		selectedLevelId.value = null
		isTrainerSession.value = false
		activeSession.value = buildEndlessSession()
		goTo('gameplay')
	}

	function acknowledgeNewNotes(laneIds: string[]) {
		snapshot.value = markNotesIntroduced(snapshot.value, laneIds)
	}

	// Quit a session early (Note Trainer has no natural end — 999 lives — and even
	// Campaign/Time/Endless previously had no way out short of losing or finishing).
	function exitGameplay() {
		activeSession.value = null
		back()
	}

	function finishSession(result: GameplayResult) {
		lastResult.value = result
		activeSession.value = null
		snapshot.value = storeResult(snapshot.value, result)

		if (result.modeId === 'campaign') {
			adManager.recordCampaignCompletion()
			// adManager.consume() enforces the interstitial frequency cap (3-minute
			// cooldown + every-3rd-campaign-milestone gate). Only fire a real ad when
			// it grants the slot.
			if (adManager.consume('campaign-progress', snapshot.value.settings.adsEnabled)) {
				adMessage.value = 'Ad break ready after campaign milestone.'
				void admob.showInterstitial()
			} else {
				adMessage.value = ''
			}
		} else if (result.remainingLives <= 0 && adManager.consume('defeat', snapshot.value.settings.adsEnabled)) {
			adMessage.value = 'Ad break ready after defeat.'
			void admob.showInterstitial()
		} else {
			adMessage.value = ''
		}

		replace('result')
	}

	function replayLast() {
		if (lastResult.value?.modeId === 'campaign' && lastResult.value.levelId) {
			startCampaignLevel(lastResult.value.levelId)
			return
		}

		if (lastResult.value?.modeId === 'time') {
			if (isTrainerSession.value) {
				startTrainerMode()
			} else {
				startTimeMode()
			}
			return
		}

		startEndlessMode()
	}

	function nextCampaignLevel() {
		if (!lastResult.value?.levelId) {
			openCampaignLevels()
			return
		}

		const currentIndex = levels.findIndex((level) => level.id === lastResult.value?.levelId)
		const nextLevel = levels[currentIndex + 1]
		if (!nextLevel) {
			openCampaignLevels()
			return
		}

		startCampaignLevel(nextLevel.id)
	}

	function clearAllProgress() {
		snapshot.value = resetProgress()
		lastResult.value = null
	}

	return {
		screen,
		screenHistory,
		levels,
		modes,
		settings,
		campaignProgress,
		records,
		notesIntroduced,
		worldsWithProgress,
		isLevelUnlocked,
		selectedMode,
		selectedLevelId,
		activeSession,
		lastResult,
		adMessage,
		back,
		goTo,
		goHome,
		openCampaignLevels,
		openRecords,
		openSettings,
		updateAppSettings,
		startCampaignLevel,
		startTimeMode,
		startTrainerMode,
		startEndlessMode,
		acknowledgeNewNotes,
		exitGameplay,
		finishSession,
		replayLast,
		nextCampaignLevel,
		clearAllProgress,
	}
})
