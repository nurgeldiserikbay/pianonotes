import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type {
	AppScreen,
	CampaignLevel,
	ChartNote,
	GameModeId,
	GameplayResult,
	EchoSessionConfig,
	SessionConfig,
	UserTune,
	SettingsState,
	SprintBonusRule,
} from '@/core/models'
import {
	deleteUserTune,
	loadSnapshot,
	markEchoCleared,
	markNotesIntroduced,
	renameUserTune,
	resetProgress,
	saveUserTune,
	storeResult,
	touchStreak,
	updateSettings,
} from '@/storage/storageService'
import { CAMPAIGN_LEVELS, MODE_DEFINITIONS, SPRINT_CONFIG } from '@/modes/modeDefinitions'
import { CAMPAIGN_WORLDS, WORLD_SIZE, getNewNotesForLevelIndex } from '@/modes/campaignWorlds'
import { buildMelodyChart, getMelodyForLevel } from '@/modes/campaignGenerator'
import { MELODIES_BY_DIFFICULTY, getMelodyMood } from '@/modes/melodies'
import { buildEchoPhrase, type EchoScore } from '@/features/echo'
import { createTuneId, defaultTuneTitle } from '@/features/composer'
import { audioService } from '@/services/audioService'
import { createSessionId } from '@/game/patterns'
import { adManager } from '@/ads/adManager'
import admob from '@/utils/admob'

function buildCampaignSession(level: CampaignLevel, notesIntroduced: string[]): SessionConfig {
	const levelIndex = level.index ?? CAMPAIGN_LEVELS.findIndex((item) => item.id === level.id)
	const melody = getMelodyForLevel(level.id)
	const bpm = melody?.bpm ?? level.bpm
	const chart = melody ? buildMelodyChart(melody, bpm) : []

	const candidateNewNotes = getNewNotesForLevelIndex(levelIndex)
	const newNotes = candidateNewNotes.filter((laneId) => !notesIntroduced.includes(laneId))

	return {
		id: createSessionId('campaign'),
		modeId: 'campaign',
		modeTitle: 'Campaign',
		levelId: level.id,
		levelTitle: level.title,
		bpm,
		themeId: level.themeId,
		lives: campaignLives(chart.length),
		chart,
		newNotes: newNotes.length ? newNotes : undefined,
		// The first two worlds hint the key; from world three on the player is
		// reading the staff unaided. Withdrawing the hint is the real difficulty
		// ramp of a reading game.
		showKeyHints: levelIndex < WORLD_SIZE * 2,
	}
}

// Lives scale with the length of the piece. Late levels run to a minute and a
// half, and a fixed five lives would mean one slip per nineteen notes there —
// losing a long piece at the last bar is the kind of punishment that makes a
// player put the game down. One life per twelve notes keeps the pressure the
// same at every length: five on an opening phrase, nine on a full piece.
function campaignLives(noteCount: number) {
	return Math.min(9, Math.max(5, Math.round(noteCount / 12)))
}

// One life every eight notes, capped at five: enough that a good run can recover
// from a slip, not enough to make lives stop mattering.
const SPRINT_BONUS: SprintBonusRule = { everyNthNote: 8, maxLives: 5 }

function markBonusNotes(chart: ChartNote[], rule: SprintBonusRule): ChartNote[] {
	return chart.map((note, index) => ({
		...note,
		// index+1 so the very first note is never the bonus one.
		bonusLife: (index + 1) % rule.everyNthNote === 0,
	}))
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
	// Non-null only while a sprint run is in progress; it is the state that turns
	// a sequence of melodies into one run.
	const sprintRun = ref<{
		index: number
		lives: number
		totalTimeMs: number
		cleared: number
	} | null>(null)
	// Non-null only while a By Ear attempt is on screen. The mode has no engine
	// and no chart, so its session is its own small thing rather than a
	// SessionConfig with four fields that would mean nothing.
	const echoSession = ref<EchoSessionConfig | null>(null)
	// How the last attempt was graded, kept beside lastResult: the note-by-note
	// comparison is the whole point of the mode and does not fit in a
	// GameplayResult, which is a shape the reading engine owns.
	const lastEchoScore = ref<EchoScore | null>(null)

	const levels = CAMPAIGN_LEVELS
	const modes = MODE_DEFINITIONS
	const settings = computed(() => snapshot.value.settings)
	const campaignProgress = computed(() => snapshot.value.campaignProgress)
	const records = computed(() => snapshot.value.records)
	const notesIntroduced = computed(() => snapshot.value.notesIntroduced)
	const streak = computed(() => snapshot.value.streak)

	// Every level is open from the start. Locking them in order made sense for a
	// short campaign; with 251 melodies it hides the library behind work, and the
	// library is the reason to open the app at all — a player who wants to play
	// Greensleeves should not have to clear two hundred tunes to reach it.
	//
	// The order still means something: it is a recommendation, and the board shows
	// which melodies have actually been played and how well. Difficulty enforces
	// itself — a late melody attempted early is simply failed.
	function isLevelUnlocked(_levelIndex: number) {
		return true
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

	// The opening melodies are where an interruption costs the most and earns the
	// least, so ads are paced wider until the player is past them.
	const EARLY_GAME_LEVELS = 10

	function isEarlyGame() {
		const cleared = Object.values(campaignProgress.value).filter(
			(progress) => (progress?.bestStars ?? 0) > 0
		).length
		return cleared < EARLY_GAME_LEVELS
	}

	// One place that asks for an interstitial, so every mode makes the same two
	// promises: the ad is abandoned if the player has already moved on, and the
	// "Ad break." line only appears when an ad actually appeared. It used to be
	// written before the request, so a failed or skipped ad still told the player
	// one had run.
	function showAdBreak() {
		adMessage.value = ''
		void admob
			.showInterstitial(() => screen.value === 'result')
			.then((shown) => {
				adMessage.value = shown ? 'Ad break.' : ''
			})
	}

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
		echoSession.value = null
		activeSession.value = buildCampaignSession(level, snapshot.value.notesIntroduced)
		goTo('gameplay')
	}

	// One tap from the menu into the level the player is actually on: the first
	// unlocked level they haven't cleared yet, or the last one if the campaign is
	// finished. Removing the menu → list → level detour is the single biggest
	// thing standing between opening the app and playing.
	// Where the player is: the first melody in difficulty order they have not
	// cleared. Unchanged by everything being unlocked — "next" is still the next
	// one in the recommended order, not the next one they are allowed to touch.
	const continueLevel = computed(() => {
		const next = levels.find((level) => (campaignProgress.value[level.id]?.bestStars ?? 0) === 0)
		return next ?? levels[levels.length - 1] ?? null
	})

	function startContinue() {
		const level = continueLevel.value
		if (!level) return
		startCampaignLevel(level.id)
	}

	// The app opens on the menu. It used to drop straight into the campaign
	// melody the player was on, which saved a tap for someone who only ever plays
	// the campaign and hid every other way into the game from everyone else —
	// there are two modes and a level list now, and launching into one of them
	// answers a question the player never asked. `screen` starts at 'menu', so
	// this needs no boot step at all.

	// -- Sprint --------------------------------------------------------------
	// One continuous run through the melodies in campaign order, on a single pool
	// of lives, with the clock never reset. A run always starts at melody 1 so two
	// runs are comparable; how far you get is the score. Melodies cleared here are
	// stored as campaign progress too, so the modes share one library.
	function startSprint() {
		sprintRun.value = { index: 0, lives: SPRINT_CONFIG.lives, totalTimeMs: 0, cleared: 0 }
		startSprintLevel()
	}

	function startSprintLevel() {
		const run = sprintRun.value
		const level = run ? levels[run.index] : null
		if (!run || !level) {
			endSprint()
			return
		}

		const base = buildCampaignSession(level, snapshot.value.notesIntroduced)

		selectedMode.value = 'sprint'
		selectedLevelId.value = level.id
		echoSession.value = null
		activeSession.value = {
			...base,
			id: createSessionId('sprint'),
			modeId: 'sprint',
			modeTitle: SPRINT_CONFIG.title,
			// Lives carry across melodies - that is what makes it a run rather than
			// a sequence of separate rounds.
			lives: run.lives,
			// Sprint is the scored mode: no training wheels, whatever the melody's
			// position in the campaign would grant.
			showKeyHints: false,
			// Bonus lives exist only here: in Campaign a melody is a self-contained
			// attempt, while a run needs a way to recover or it becomes attrition.
			chart: markBonusNotes(base.chart, SPRINT_BONUS),
		}
		goTo('gameplay')
	}

	// A finished run kept aside so the result screen can offer one paid-for
	// continue. Cleared when the offer is taken or the player leaves.
	const revivableRun = ref<{ index: number; totalTimeMs: number; cleared: number } | null>(null)

	// "Watch an ad, keep the run" - a rewarded ad the player asks for rather than
	// one that interrupts them. Offered once per run: a run that can be revived
	// forever is not a run.
	async function reviveSprintWithAd() {
		const revivable = revivableRun.value
		if (!revivable) return

		const rewarded = await admob.showRewarded()
		if (!rewarded) return

		revivableRun.value = null
		sprintRun.value = { ...revivable, lives: 3 }
		startSprintLevel()
	}

	// The run is over: report it as one result covering every melody played.
	function endSprint(lastRunResult?: GameplayResult) {
		const run = sprintRun.value
		if (!run) return

		// Only a run that ended in failure is worth reviving, and only if it got
		// somewhere first.
		revivableRun.value =
			lastRunResult && !lastRunResult.completed && run.cleared > 0
				? { index: run.index, totalTimeMs: run.totalTimeMs, cleared: run.cleared }
				: null

		const summary: GameplayResult = {
			id: createSessionId('sprint-run'),
			modeId: 'sprint',
			levelTitle: `${run.cleared} ${run.cleared === 1 ? 'melody' : 'melodies'}`,
			score: run.cleared,
			accuracy: lastRunResult?.accuracy ?? 100,
			maxCombo: 0,
			misses: lastRunResult?.misses ?? 0,
			tempoAccuracy: lastRunResult?.tempoAccuracy ?? 100,
			badge: `${Math.min(3, run.cleared)}` as GameplayResult['badge'],
			timeMs: run.totalTimeMs,
			timedOut: lastRunResult?.timedOut ?? false,
			completed: run.cleared > 0,
			notesCompleted: run.cleared,
			notesTotal: levels.length,
			remainingLives: run.lives,
			streak: 0,
			date: new Date().toISOString(),
		}

		sprintRun.value = null
		lastResult.value = summary
		snapshot.value = storeResult(snapshot.value, summary)
		snapshot.value = touchStreak(snapshot.value)

		// A run is several melodies long, so it is paced per run: one ad every
		// second finished run.
		adManager.recordSprintRun()
		if (adManager.consume('sprint-run', snapshot.value.settings.adsEnabled)) {
			showAdBreak()
		} else {
			adMessage.value = ''
		}

		replace('result')
	}

	// ── By Ear ──────────────────────────────────────────────────────────────
	// Nothing is written down: the player hears a phrase and lays it out on the
	// keyboard themselves, then sees how close they got. It is the other half of
	// reading — Campaign asks "what does this dot mean", By Ear asks "what did
	// you just hear" — and it is the reason the library is made of tunes people
	// already know.

	// The mode walks the library in the same order Campaign recommends — the most
	// recognisable tunes first — and picks up where it left off. It used to draw
	// at random from whatever Campaign had cleared, which for a player who only
	// plays By Ear meant the same six nursery rhymes forever.
	const echoCleared = computed(() => snapshot.value.echoCleared)

	function nextEchoMelody() {
		const next = MELODIES_BY_DIFFICULTY.find((melody) => !echoCleared.value.includes(melody.id))
		return next ?? MELODIES_BY_DIFFICULTY[0] ?? null
	}

	// The tune after the one just played, whether or not it was answered well: the
	// player asked to move on, and repeating the tune they failed would read as
	// the game refusing to.
	function melodyAfter(levelId?: string | null) {
		if (!levelId) return nextEchoMelody()
		const index = MELODIES_BY_DIFFICULTY.findIndex((melody) => melody.id === levelId)
		if (index < 0) return nextEchoMelody()
		return MELODIES_BY_DIFFICULTY[index + 1] ?? nextEchoMelody()
	}

	function startEchoMelody(melodyId: string) {
		const melody = MELODIES_BY_DIFFICULTY.find((item) => item.id === melodyId)
		if (!melody) return

		selectedMode.value = 'echo'
		selectedLevelId.value = melody.id
		activeSession.value = null
		echoSession.value = {
			id: createSessionId('echo'),
			levelId: melody.id,
			title: melody.title,
			source: melody.source,
			bpm: melody.bpm,
			themeId: getMelodyMood(melody.id),
			phrase: buildEchoPhrase(melody.notes, melody.bpm),
		}
		goTo('echo')
	}

	function startEchoMode() {
		const melody = nextEchoMelody()
		if (!melody) return
		startEchoMelody(melody.id)
	}

	// "Next tune" from the result screen: the following melody in the ladder.
	function startAnotherEcho() {
		const melody = melodyAfter(lastResult.value?.levelId)
		if (!melody) return
		startEchoMelody(melody.id)
	}

	function retryEcho() {
		const levelId = echoSession.value?.levelId ?? lastResult.value?.levelId
		if (!levelId) {
			startEchoMode()
			return
		}
		startEchoMelody(levelId)
	}

	function exitEcho() {
		echoSession.value = null
		back()
	}

	// One graded attempt. There is no clock and no lives here, so most of a
	// GameplayResult is filled from the two numbers the mode actually produces:
	// accuracy is the notes, tempoAccuracy is their placement.
	function finishEcho(score: EchoScore) {
		const session = echoSession.value
		if (!session) return

		const result: GameplayResult = {
			id: `${session.id}-result`,
			modeId: 'echo',
			levelId: session.levelId,
			levelTitle: session.title,
			score: score.score,
			accuracy: score.noteAccuracy,
			maxCombo: 0,
			misses: score.wrong + score.missing + score.extra,
			tempoAccuracy: score.timingAccuracy,
			badge: score.badge,
			stars: score.stars,
			timeMs: 0,
			timedOut: false,
			completed: score.stars > 0,
			notesCompleted: score.correct,
			notesTotal: session.phrase.length,
			remainingLives: 0,
			streak: 0,
			date: new Date().toISOString(),
		}

		echoSession.value = null
		lastEchoScore.value = score
		lastResult.value = result
		snapshot.value = storeResult(snapshot.value, result)
		snapshot.value = touchStreak(snapshot.value)
		// Answered well enough to count: the mode moves on from this tune the next
		// time it is opened.
		if (score.stars > 0) snapshot.value = markEchoCleared(snapshot.value, session.levelId)

		// An attempt is a phrase long, so the pacing counter is its own: one ad
		// every third attempt rather than campaign's per-level count.
		adManager.recordEchoRound()
		if (adManager.consume('echo-round', snapshot.value.settings.adsEnabled)) {
			showAdBreak()
		} else {
			adMessage.value = ''
		}

		replace('result')
	}

	// ── Studio ──────────────────────────────────────────────────────────────
	// The player's own tunes: written on the same staff, stored apart from every
	// score in the app because they are the one thing here that is theirs.
	const userTunes = computed(() => snapshot.value.userTunes)
	const editingTune = ref<UserTune | null>(null)

	function openTunes() {
		goTo('tunes')
	}

	function newTune() {
		editingTune.value = {
			id: createTuneId(),
			title: defaultTuneTitle(snapshot.value.userTunes),
			bpm: 100,
			notes: [],
			updatedAt: new Date().toISOString(),
		}
		goTo('composer')
	}

	function editTune(tuneId: string) {
		const tune = snapshot.value.userTunes.find((item) => item.id === tuneId)
		if (!tune) return
		editingTune.value = tune
		goTo('composer')
	}

	// Playing from the list is the plain thing: the tune as written, at its own
	// tempo, without opening the editor.
	function playTune(tuneId: string) {
		const tune = snapshot.value.userTunes.find((item) => item.id === tuneId)
		if (!tune || !tune.notes.length) return
		audioService.setEnabled(snapshot.value.settings.soundEnabled)
		audioService.playSequence(tune.notes, 120000)
	}

	function saveTune(tune: UserTune) {
		snapshot.value = saveUserTune(snapshot.value, tune)
		// Keep editing the saved version, so a second save replaces it rather than
		// adding a copy.
		editingTune.value = tune
	}

	function removeTune(tuneId: string) {
		snapshot.value = deleteUserTune(snapshot.value, tuneId)
	}

	function retitleTune(tuneId: string, title: string) {
		snapshot.value = renameUserTune(snapshot.value, tuneId, title)
	}

	function closeComposer() {
		editingTune.value = null
		back()
	}

	function acknowledgeNewNotes(laneIds: string[]) {
		snapshot.value = markNotesIntroduced(snapshot.value, laneIds)
	}

	// Quit a session early: Campaign otherwise has no way out short of losing it
	// or finishing it.
	function exitGameplay() {
		activeSession.value = null
		// Quitting mid-run ends the run rather than dropping the player back into
		// a half-finished sprint they can no longer see.
		if (sprintRun.value) {
			endSprint()
			return
		}
		back()
	}

	function finishSession(result: GameplayResult) {
		lastResult.value = result
		activeSession.value = null

		// A sprint melody is a step inside a run, not a result of its own: it is
		// stored (so it counts in Campaign) but the player only sees the result
		// screen when the whole run ends.
		if (sprintRun.value) {
			const run = sprintRun.value
			run.totalTimeMs += result.timeMs
			run.lives = result.remainingLives
			snapshot.value = storeResult(snapshot.value, result)

			if (result.completed && run.lives > 0 && run.index + 1 < levels.length) {
				run.cleared += 1
				run.index += 1
				startSprintLevel()
				return
			}

			if (result.completed) run.cleared += 1
			endSprint(result)
			return
		}

		snapshot.value = storeResult(snapshot.value, result)
		snapshot.value = touchStreak(snapshot.value)

		if (result.modeId === 'campaign') {
			adManager.recordLevelEnd()
			// One ad per four attempts while the player is still in the opening
			// melodies, one per three after that (adManager holds the numbers).
			if (
				adManager.consume('level-end', snapshot.value.settings.adsEnabled, isEarlyGame())
			) {
				showAdBreak()
			} else {
				adMessage.value = ''
			}
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

		if (lastResult.value?.modeId === 'echo') {
			retryEcho()
			return
		}

		startSprint()
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
		// The player's own tunes survive: see resetProgress.
		snapshot.value = resetProgress(snapshot.value)
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
		streak,
		worldsWithProgress,
		continueLevel,
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
		startContinue,
		startSprint,
		sprintRun,
		revivableRun,
		reviveSprintWithAd,
		startEchoMode,
		startEchoMelody,
		startAnotherEcho,
		retryEcho,
		exitEcho,
		finishEcho,
		echoSession,
		lastEchoScore,
		echoCleared,
		userTunes,
		editingTune,
		openTunes,
		newTune,
		editTune,
		playTune,
		saveTune,
		removeTune,
		retitleTune,
		closeComposer,
		acknowledgeNewNotes,
		exitGameplay,
		finishSession,
		replayLast,
		nextCampaignLevel,
		clearAllProgress,
	}
})
