import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { AppScreen, CampaignLevel, GameModeId, GameplayResult, SessionConfig, SettingsState } from '@/core/models'
import { loadSnapshot, resetProgress, storeResult, updateSettings } from '@/storage/storageService'
import { CAMPAIGN_LEVELS, ENDLESS_MODE_CONFIG, MODE_DEFINITIONS, TIME_MODE_CONFIG } from '@/modes/modeDefinitions'
import { buildChartFromPatterns, buildTimeModeChart, createSessionId } from '@/game/patterns'
import { adManager } from '@/ads/adManager'
import admob from '@/utils/admob'

// Seconds a note takes to travel from spawn to the hit line. ~2.4-3.1s keeps the
// rhythm readable; the previous value of 3 inflated this to ~14-18s (notes crawled).
const NOTE_TRAVEL_SCALE = 0.5

function buildCampaignSession(level: CampaignLevel): SessionConfig {
	const levelIndex = CAMPAIGN_LEVELS.findIndex((item) => item.id === level.id)
	const approachMs = Math.max(4800, 6200 - levelIndex * 240) * NOTE_TRAVEL_SCALE
	return {
		id: createSessionId('campaign'),
		modeId: 'campaign',
		modeTitle: 'Campaign',
		levelId: level.id,
		levelTitle: level.title,
		bpm: level.bpm,
		themeId: level.themeId,
		lives: 5,
		approachMs,
		chart: buildChartFromPatterns(level.patternIds, level.bpm, approachMs + 900),
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

function buildEndlessSession(): SessionConfig {
	const approachMs = 6200 * NOTE_TRAVEL_SCALE
	return {
		id: createSessionId('endless'),
		modeId: 'endless',
		modeTitle: ENDLESS_MODE_CONFIG.title,
		bpm: ENDLESS_MODE_CONFIG.bpmStart,
		themeId: ENDLESS_MODE_CONFIG.themeId,
		lives: ENDLESS_MODE_CONFIG.lives,
		approachMs,
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

	const levels = CAMPAIGN_LEVELS
	const modes = MODE_DEFINITIONS
	const settings = computed(() => snapshot.value.settings)
	const campaignProgress = computed(() => snapshot.value.campaignProgress)
	const records = computed(() => snapshot.value.records)

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

	function openModeSelect() {
		goTo('mode-select')
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
		selectedMode.value = 'campaign'
		selectedLevelId.value = levelId
		activeSession.value = buildCampaignSession(level)
		goTo('gameplay')
	}

	function startTimeMode() {
		selectedMode.value = 'time'
		selectedLevelId.value = null
		activeSession.value = buildTimeSession()
		goTo('gameplay')
	}

	function startEndlessMode() {
		selectedMode.value = 'endless'
		selectedLevelId.value = null
		activeSession.value = buildEndlessSession()
		goTo('gameplay')
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
			startTimeMode()
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
		selectedMode,
		selectedLevelId,
		activeSession,
		lastResult,
		adMessage,
		back,
		goTo,
		goHome,
		openModeSelect,
		openCampaignLevels,
		openRecords,
		openSettings,
		updateAppSettings,
		startCampaignLevel,
		startTimeMode,
		startEndlessMode,
		finishSession,
		replayLast,
		nextCampaignLevel,
		clearAllProgress,
	}
})
