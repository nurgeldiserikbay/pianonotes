import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import en from './langs/en'

import App from './App.vue'

// Self-hosted (offline-safe for the packaged Capacitor app — no Google Fonts
// CDN dependency) rounded display font used for headings, HUD numbers and
// buttons throughout the redesign. Latin-only subset: the UI is English-only,
// so the default multi-subset import (which also bundles Devanagari/Vietnamese/
// Latin-Extended, ~300KB+ of woff2/woff this app never uses) would just bloat
// the packaged app for nothing.
import '@fontsource/baloo-2/latin-600.css'
import '@fontsource/baloo-2/latin-700.css'
import '@fontsource/baloo-2/latin-800.css'
import './style.scss'

const i18n = createI18n({
	locale: 'en',
	fallbackLocale: 'en',
	messages: {
		en,
	},
})

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app.use(i18n)
app.use(pinia)

app.mount('#app')
