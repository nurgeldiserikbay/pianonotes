// Where the files in public/ actually live at runtime.
//
// They were addressed as `/audio/do.mp3` and `/img/mascot/...`, which only
// resolves when the app is served from the root of a domain. It is not: the web
// build is published from a subfolder, and there every one of those requests
// went to the domain root and 404'd — silently, because a missing sample just
// stays quiet and a missing image falls back. The published game had no sound
// at all and no mascot, and nothing in the console said why.
//
// Vite substitutes `BASE_URL` at build time from `base` in vite.config.ts, which
// is './' here, so a path resolves against the page rather than the host. That
// works from a subfolder, from the domain root, and from Capacitor's file://
// origin on Android alike.
const BASE = import.meta.env.BASE_URL

export function assetUrl(path: string): string {
	const relative = path.replace(/^\/+/, '')
	return BASE.endsWith('/') ? `${BASE}${relative}` : `${BASE}/${relative}`
}
