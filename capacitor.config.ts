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
			style: 'DARK',
			backgroundColor: '#ffffffff',
		},
		AndroidNavigationBar: {
			isImmersive: true,
		},
	},
}

export default config
