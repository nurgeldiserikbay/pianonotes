import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
	appId: 'com.thelightcome.pianonotes',
	appName: 'pianonotes',
	webDir: 'docs',
	server: {
		androidScheme: 'https',
	},
	plugins: {
		StatusBar: {
			overlaysWebView: false,
			// 'DARK' is the plugin's name for light glyphs on a dark bar, which is
			// what the app's own deep navy needs. The colour was opaque white, and
			// framed a dark game in a bright band on every screen.
			style: 'DARK',
			backgroundColor: '#ff090d22',
		},
		AndroidNavigationBar: {
			isImmersive: true,
		},
	},
}

export default config
