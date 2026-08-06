import { Capacitor } from '@capacitor/core'
import {
	AdMob,
	AdmobConsentStatus,
	BannerAdSize,
	BannerAdPosition,
	BannerAdPluginEvents,
	InterstitialAdPluginEvents,
} from '@capacitor-community/admob'
import type {
	AdMobBannerSize,
	BannerAdOptions,
	AdLoadInfo,
	AdOptions,
} from '@capacitor-community/admob'

// TODO(owner): replace BANNER_AD_ID / INTERSTITIAL_AD_ID with the real PianoNotes
// production AdMob ad unit IDs before shipping. The previous values pointed at a
// different app account (ca-app-pub-9702825788968948/...), which is why ads were
// never eligible to fill. The values below are Google's official public test ad
// unit IDs so test builds keep working without inventing real IDs.
const BANNER_AD_ID = 'ca-app-pub-3940256099942544/6300978111'
const INTERSTITIAL_AD_ID = 'ca-app-pub-3940256099942544/1033173712'

const AdMobInitializationOptions = {
	testingDevices: ['8a1b4b83d67add00', '1f6e845f97c74f32', 'e81b6ee74e7f26dc'],
	// Only opt into AdMob's test-mode initialization on dev builds; production
	// builds must initialize for real serving.
	initializeForTesting: import.meta.env.DEV,
	// This is a general-audience music game, not directed at children.
	tagForChildDirectedTreatment: false,
}

class Admob {
	private initialized = false
	private bannerListenersReady = false
	private interstitialListenersReady = false

	private get isNative() {
		return Capacitor.isNativePlatform()
	}

	async initialize() {
		// No-op on web / when already initialized: keeps the browser build safe.
		if (!this.isNative || this.initialized) return
		this.initialized = true

		await AdMob.initialize(AdMobInitializationOptions)

		const [trackingInfo, consentInfo] = await Promise.all([
			AdMob.trackingAuthorizationStatus(),
			AdMob.requestConsentInfo(),
		])

		if (trackingInfo.status === 'notDetermined') {
			// First launch: the platform surfaces its tracking prompt before ads load.
		} else if (
			trackingInfo.status === 'authorized' &&
			consentInfo.isConsentFormAvailable &&
			consentInfo.status === AdmobConsentStatus.REQUIRED
		) {
			await AdMob.showConsentForm()
		}
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
		this.registerBannerListeners()

		const options: BannerAdOptions = {
			adId: BANNER_AD_ID,
			adSize: BannerAdSize.BANNER,
			position: BannerAdPosition.BOTTOM_CENTER,
			margin: 0,
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
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
			// User dismissed the interstitial.
		})
		AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => {
			// Load failure: gameplay flow already continued, nothing to unwind.
		})
		AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
			// Show failure: gameplay flow already continued, nothing to unwind.
		})
	}

	async showInterstitial() {
		if (!this.isNative) return
		this.registerInterstitialListeners()

		const options: AdOptions = {
			adId: INTERSTITIAL_AD_ID,
			isTesting: import.meta.env.VITE_APP_MODE === 'TEST',
		}

		try {
			await AdMob.prepareInterstitial(options)
			await AdMob.showInterstitial()
		} catch (error) {
			// Never let an ad failure break the game's post-session navigation.
			console.warn('[admob] interstitial failed', error)
		}
	}
}

export default new Admob()
