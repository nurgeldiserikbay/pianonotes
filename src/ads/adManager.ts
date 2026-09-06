import type { AdTrigger } from '@/core/models'

const STORAGE_KEY = 'piano-notes-ad-state-v2'

// Pacing is counted in levels and runs, not only in minutes. A cooldown alone
// cannot promise "no more than one ad every few levels": a player who takes 90
// seconds per melody would meet a 3-minute cooldown every second level.
//
// The counters tick on every attempt, won or lost. That is deliberate: a
// beginner who fails the same melody four times has had four goes at it, and
// interrupting them more often than a player who wins four times would punish
// exactly the person most likely to quit.
const LEVELS_BETWEEN_ADS_EARLY = 4
const LEVELS_BETWEEN_ADS = 3
// Sprint runs are long (several melodies each), so they are paced by run count.
const RUNS_BETWEEN_ADS = 2
// By Ear attempts are short — a phrase, then a result — so they get a counter of
// their own rather than sharing Sprint's: three attempts is about as long as one
// run, and sharing would make whichever mode the player used last set the pace
// for the other.
const ROUNDS_BETWEEN_ADS = 3
// Backstop only — it can make ads rarer than the counters, never more frequent.
const COOLDOWN_MS = 1000 * 60 * 3

interface AdState {
	lastShownAt: number
	levelsSinceAd: number
	runsSinceAd: number
	roundsSinceAd: number
}

function emptyState(): AdState {
	return { lastShownAt: 0, levelsSinceAd: 0, runsSinceAd: 0, roundsSinceAd: 0 }
}

function loadState(): AdState {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY)
		if (!raw) return emptyState()
		return { ...emptyState(), ...(JSON.parse(raw) as Partial<AdState>) }
	} catch {
		return emptyState()
	}
}

function saveState(state: AdState) {
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
	} catch {
		// Ignore non-critical storage failures.
	}
}

export class AdManager {
	private state = loadState()

	// Called once per finished campaign melody, whatever the outcome.
	recordLevelEnd() {
		this.state.levelsSinceAd += 1
		saveState(this.state)
	}

	// Called once per finished sprint run.
	recordSprintRun() {
		this.state.runsSinceAd += 1
		saveState(this.state)
	}

	// Called once per graded By Ear attempt.
	recordEchoRound() {
		this.state.roundsSinceAd += 1
		saveState(this.state)
	}

	// `earlyGame` stretches the gap while the player is still learning the game:
	// the first melodies are where an interruption costs the most and earns the
	// least.
	canShow(trigger: AdTrigger, adsEnabled: boolean, earlyGame = false) {
		if (!adsEnabled) return false
		if (Date.now() - this.state.lastShownAt < COOLDOWN_MS) return false

		if (trigger === 'sprint-run') {
			return this.state.runsSinceAd >= RUNS_BETWEEN_ADS
		}

		if (trigger === 'echo-round') {
			return this.state.roundsSinceAd >= ROUNDS_BETWEEN_ADS
		}

		const needed = earlyGame ? LEVELS_BETWEEN_ADS_EARLY : LEVELS_BETWEEN_ADS
		return this.state.levelsSinceAd >= needed
	}

	consume(trigger: AdTrigger, adsEnabled: boolean, earlyGame = false) {
		if (!this.canShow(trigger, adsEnabled, earlyGame)) return false

		this.state.lastShownAt = Date.now()
		if (trigger === 'sprint-run') this.state.runsSinceAd = 0
		else if (trigger === 'echo-round') this.state.roundsSinceAd = 0
		else this.state.levelsSinceAd = 0
		saveState(this.state)
		return true
	}

	// Exposed for tests and for showing the player nothing surprising: the state
	// is plain data.
	snapshot() {
		return { ...this.state }
	}
}

export const adManager = new AdManager()
