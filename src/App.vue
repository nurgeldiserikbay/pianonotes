<script lang="ts" setup>
import { onMounted, watch } from 'vue'
import { Capacitor } from '@capacitor/core'
import { StatusBar } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Fullscreen } from '@boengli/capacitor-fullscreen'

import { useAppStore } from '@/ui/stores/appStore'
import AppShell from '@/ui/AppShell.vue'

const appStore = useAppStore()

async function syncOrientation(screenName: string) {
	try {
		if (screenName === 'gameplay' && window.screen.orientation?.lock) {
			await window.screen.orientation.lock('landscape')
			return
		}

		if (screenName !== 'gameplay' && window.screen.orientation?.unlock) {
			window.screen.orientation.unlock()
		}
	} catch {
		// Browsers that do not support orientation lock fall back to the in-game overlay.
	}
}

onMounted(async () => {
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
