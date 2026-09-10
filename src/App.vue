<script lang="ts" setup>
import { onMounted, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Fullscreen } from '@boengli/capacitor-fullscreen'

import Admob from '@/utils/admob'

import { useAdsStore } from '@/store/adsStore'
import { useAppStore } from '@/ui/stores/appStore'
import AppShell from '@/ui/AppShell.vue'

const adsStore = useAdsStore()
const appStore = useAppStore()

// Both playing screens need the keyboard's full width. By Ear was left out when
// it landed, so it asked the player to rotate instead of rotating for them.
const LANDSCAPE_SCREENS = ['gameplay', 'echo']

async function syncOrientation(screenName: string) {
	try {
		if (LANDSCAPE_SCREENS.includes(screenName) && window.screen.orientation?.lock) {
			await window.screen.orientation.lock('landscape')
			return
		}

		if (!LANDSCAPE_SCREENS.includes(screenName) && window.screen.orientation?.unlock) {
			window.screen.orientation.unlock()
		}
	} catch {
		// Browsers that do not support orientation lock fall back to the in-game overlay.
	}
}

onMounted(async () => {
	// Safe on web: the service no-ops off native platforms.
	// Подписку ставим до initialize(): первое событие баннера может прийти
	// раньше, чем страница успеет смонтироваться, и потеряться.
	Admob.onBannerChange((live, height) => adsStore.setBanner(live, height))

	void Admob.initialize().catch(() => {})

	if (Capacitor.getPlatform() === 'android') {
		await Fullscreen.activateImmersiveMode()
		await StatusBar.hide()
		await StatusBar.setOverlaysWebView({ overlay: true })
		await SplashScreen.hide()
	}
})

watch(
	() => appStore.screen,
	(screenName) => {
		void syncOrientation(screenName)
	},
	{ immediate: true }
)
</script>

<template>
	<AppShell />
</template>
