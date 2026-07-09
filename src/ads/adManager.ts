import type { AdTrigger } from '@/core/models'

const STORAGE_KEY = 'piano-notes-ad-state'
const COOLDOWN_MS = 1000 * 60 * 3
const CAMPAIGN_FREQUENCY = 3

interface AdState {
	lastShownAt: number
	campaignCompletions: number
}

function loadState(): AdState {
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY)
		if (!raw) {
			return {
				lastShownAt: 0,
				campaignCompletions: 0,
			}
		}

		return JSON.parse(raw) as AdState
	} catch {
		return {
			lastShownAt: 0,
			campaignCompletions: 0,
		}
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

	recordCampaignCompletion() {
		this.state.campaignCompletions += 1
		saveState(this.state)
	}

	canShow(trigger: AdTrigger, adsEnabled: boolean) {
		if (!adsEnabled) return false
		if (Date.now() - this.state.lastShownAt < COOLDOWN_MS) return false
		if (trigger === 'campaign-progress') {
			return this.state.campaignCompletions > 0 && this.state.campaignCompletions % CAMPAIGN_FREQUENCY === 0
		}

		return true
	}

	consume(trigger: AdTrigger, adsEnabled: boolean) {
		if (!this.canShow(trigger, adsEnabled)) return false
		this.state.lastShownAt = Date.now()
		saveState(this.state)
		return true
	}
}

export const adManager = new AdManager()
