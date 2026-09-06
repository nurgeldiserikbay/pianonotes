import { Capacitor } from '@capacitor/core'
import {
	AdMob,
	BannerAdSize,
	BannerAdPosition,
	BannerAdPluginEvents,
	InterstitialAdPluginEvents,
	MaxAdContentRating,
} from '@capacitor-community/admob'
import type {
	AdMobBannerSize,
	BannerAdOptions,
	AdLoadInfo,
	AdOptions,
} from '@capacitor-community/admob'
import { StatusBar } from '@capacitor/status-bar'
import { Fullscreen } from '@boengli/capacitor-fullscreen'

// The publisher's own units, as they were before the July cleanup swapped the
// banner for a Google test id.
const BANNER_AD_ID = 'ca-app-pub-9702825788968948/6128253678'
const INTERSTITIAL_AD_ID = 'ca-app-pub-9702825788968948/4804268957'
// TODO(owner): rewarded юнита у PianoNotes ещё нет — стоит публичный тестовый ID
// Google. Завести rewarded в консоли AdMob (App ID ca-app-pub-9702825788968948~4130816693)
// и подставить сюда: без этого «продолжить за просмотр» показывает тестовый ролик
// и не приносит дохода.
// Only the ad *load* is bounded. If the ad has not arrived within this window the
// show is abandoned altogether: by then the player has usually left the result
// screen and started the next session, and a late full screen ad would land at
// the start of a round — the "unexpected full screen interstitial" Google rejects.
const INTERSTITIAL_LOAD_TIMEOUT_MS = 5000

const REWARDED_AD_ID = 'ca-app-pub-3940256099942544/5224354917'

// The Play Console target audience of this game includes children, so Families
// policy applies: every ad request must be tagged as child-directed, capped at
// G-rated inventory and non-personalized. Without these flags the store review
// rejects the update for "ad content not consistent with the app's content
// rating".
const AdMobInitializationOptions = {
	testingDevices: ['8a1b4b83d67add00', '1f6e845f97c74f32', 'e81b6ee74e7f26dc'],
	// Only opt into AdMob's test-mode initialization on dev builds; production
	// builds must initialize for real serving.
	initializeForTesting: import.meta.env.DEV,
	tagForChildDirectedTreatment: true,
	tagForUnderAgeOfConsent: true,
	maxAdContentRating: MaxAdContentRating.General,
}

class Admob {
	// initialize() is what applies the child-directed request configuration, so
	// no ad may be requested before it has finished — an early request is served
	// from adult-rated inventory. `initPromise` caches the run so the ad entry
	// points await the same initialization; `configured` flips only once the
	// configuration is actually in place.
	private initPromise: Promise<void> | null = null
	private configured = false
	private bannerListenersReady = false
	private interstitialListenersReady = false

	private get isNative() {
		return Capacitor.isNativePlatform()
	}

	initialize() {
		// No-op on web: keeps the browser build safe.
		if (!this.isNative) return Promise.resolve()
		if (!this.initPromise) {
			this.initPromise = this.runInitialize()
		}
		return this.initPromise
	}

	private async runInitialize() {
		await AdMob.initialize(AdMobInitializationOptions)
		this.configured = true

		// The UMP consent form is deliberately never requested. Every request is
		// tagged tagForUnderAgeOfConsent, and a user below the age of consent is not
		// asked to consent to ad personalisation — showing them a personalisation
		// form is wrong under both GDPR and the Families Policy. Non-personalised
		// delivery is guaranteed by npa: true on every request.
	}

	// Register banner listeners exactly once to avoid leaking a new listener on
	// every showBanner() call.
	private registerBannerListeners() {
		if (this.bannerListenersReady) return
		this.bannerListenersReady = true

		AdMob.addListener(BannerAdPluginEvents.SizeChanged, (_size: AdMobBannerSize) => {
			// Subscribe change banner size.
		})
	}

	async showBanner() {
		if (!this.isNative) return

		// Wait for the child-directed configuration; if initialization failed there
		// is no safe way to request an ad, so show none.
		await this.initialize().catch((error) => console.warn('[admob] init', error))
		if (!this.configured) return

		this.registerBannerListeners()

		const options: BannerAdOptions = {
			adId: BANNER_AD_ID,
			// ADAPTIVE_BANNER, а не BANNER: фиксированный 320x50 не растягивается на ширину
			// экрана, и плагин центрирует его боковыми маргинами — а слушатель инсетов на
			// Android 15+ эти маргины обнуляет, из-за чего баннер уезжает к левому краю.
			adSize: BannerAdSize.ADAPTIVE_BANNER,
			position: BannerAdPosition.BOTTOM_CENTER,
			margin: 0,
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			npa: true,
		}

		await AdMob.showBanner(options)
	}

	async resumeBanner() {
		if (!this.isNative) return
		await AdMob.resumeBanner()
	}

	async hideBanner() {
		if (!this.isNative) return
		await AdMob.hideBanner()
	}

	async removeBanner() {
		if (!this.isNative) return
		await AdMob.removeBanner()
	}

	// Register interstitial listeners exactly once to avoid leaking a new listener
	// on every showInterstitial() call.
	private registerInterstitialListeners() {
		if (this.interstitialListenersReady) return
		this.interstitialListenersReady = true

		AdMob.addListener(InterstitialAdPluginEvents.Loaded, (_info: AdLoadInfo) => {
			// Interstitial loaded.
		})
		AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
			// User dismissed the interstitial: put the game back into fullscreen.
			void this.restoreImmersiveMode()
		})
		AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
			// Load failure: gameplay flow already continued, nothing to unwind.
		})
		AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
			// Show failure: nothing was displayed, so restore the game's fullscreen.
			void this.restoreImmersiveMode()
		})
	}

	// While a full-screen ad is up the system bars must be visible: the ad activity
	// belongs to the Ads SDK and Android 15 renders it edge-to-edge, so with the
	// game's immersive mode active its close button can land under the navigation
	// bar. This game is locked to landscape, where that is the reported failure
	// mode. Failures here are non-fatal — the ad still shows.
	private async showSystemBars() {
		try {
			await Fullscreen.deactivateImmersiveMode()
			await StatusBar.show()
		} catch (error) {
			console.warn('[admob] system bars', error)
		}
	}

	private async restoreImmersiveMode() {
		try {
			await Fullscreen.activateImmersiveMode()
			await StatusBar.hide()
		} catch (error) {
			console.warn('[admob] immersive mode', error)
		}
	}

	// `canStillShow` is checked after the ad has loaded and before it is put on
	// screen. Loading takes up to five seconds, and in that time the player can
	// have left the result screen and started the next round — an interstitial
	// landing there is exactly the "unexpected full screen ad" Google rejects,
	// and worse, it lands under the finger of someone who just tapped Retry.
	// Returns whether an ad was actually shown.
	async showInterstitial(canStillShow?: () => boolean): Promise<boolean> {
		if (!this.isNative) return false

		// Await the same cached initialization the banner does: the first session's
		// interstitial used to be dropped silently because initialize() had not
		// resolved yet by the time the first session ended.
		await this.initialize().catch((error) => console.warn('[admob] init', error))

		// Still not configured (initialization failed): skip the ad rather than send
		// a request without the child-directed tags. Nothing in the game waits here.
		if (!this.configured) return false

		this.registerInterstitialListeners()

		const options: AdOptions = {
			adId: INTERSTITIAL_AD_ID,
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			npa: true,
			// Deliberately not setting immersiveMode: since Android 15 forces
			// edge-to-edge it pushes the ad's close button under the navigation bar
			// or cutout, making the ad unclosable — a Families policy rejection.
		}

		try {
			const loaded = await new Promise<boolean>((resolve) => {
				const timeoutId = setTimeout(() => {
					console.warn('[admob] interstitial load timed out')
					resolve(false)
				}, INTERSTITIAL_LOAD_TIMEOUT_MS)

				AdMob.prepareInterstitial(options)
					.then(() => {
						clearTimeout(timeoutId)
						resolve(true)
					})
					.catch((error) => {
						clearTimeout(timeoutId)
						console.warn('[admob] interstitial load failed', error)
						resolve(false)
					})
			})

			if (!loaded) return false
			if (canStillShow && !canStillShow()) return false

			await this.showSystemBars()
			await AdMob.showInterstitial()
			return true
		} catch (error) {
			// Never let an ad failure break the game's post-session navigation.
			console.warn('[admob] interstitial failed', error)
			return false
		}
	}

	// Rewarded: the player chooses to watch in exchange for something. Resolves
	// true only when the reward actually fired, so a dismissed or failed ad can
	// never hand out a free continue.
	async showRewarded(): Promise<boolean> {
		if (!this.isNative) return false

		await this.initialize().catch((error) => console.warn('[admob] init', error))
		if (!this.configured) return false

		const options: AdOptions = {
			adId: REWARDED_AD_ID,
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
			npa: true,
			// Same reason as the interstitial: immersiveMode hides the close button
			// under the system bars on Android 15, which reads as an unclosable ad.
		}

		try {
			await AdMob.prepareRewardVideoAd(options)
			await this.showSystemBars()
			const reward = await AdMob.showRewardVideoAd()
			void this.restoreImmersiveMode()
			return Boolean(reward)
		} catch (error) {
			console.warn('[admob] rewarded failed', error)
			void this.restoreImmersiveMode()
			return false
		}
	}
}

export default new Admob()
