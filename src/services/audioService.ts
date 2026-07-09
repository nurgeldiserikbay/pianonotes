import { PIANO_KEY_MAP } from '@/entities/piano'

const AUDIO_MAP: Record<string, string> = {
	do: '/audio/do.mp3',
	do_: '/audio/do_.mp3',
	re: '/audio/re.mp3',
	re_: '/audio/re_.mp3',
	mi: '/audio/mi.mp3',
	fa: '/audio/fa.mp3',
	fa_: '/audio/fa_.mp3',
	sol: '/audio/sol.mp3',
	sol_: '/audio/sol_.mp3',
	la: '/audio/la.mp3',
	la_: '/audio/la_.mp3',
	si: '/audio/si.mp3',
	do2: '/audio/do2.mp3',
	do2_: '/audio/do2_.mp3',
	re2: '/audio/re2.mp3',
	re2_: '/audio/re2_.mp3',
	mi2: '/audio/mi2.mp3',
	fa2: '/audio/fa2.mp3',
	fa2_: '/audio/fa2_.mp3',
	sol2: '/audio/sol2.mp3',
	sol2_: '/audio/sol2_.mp3',
	la2: '/audio/la2.mp3',
	la2_: '/audio/la2_.mp3',
	si2: '/audio/si2.mp3',
}

// Small round-robin pool per sample so rapid repeated presses can overlap without
// allocating a fresh HTMLAudioElement (and re-decoding the file) on every keypress.
const POOL_SIZE = 4

class AudioService {
	private enabled = true
	private volume = 0.55
	private readonly pools = new Map<string, HTMLAudioElement[]>()
	private readonly cursors = new Map<string, number>()
	private preloaded = false

	// Build and warm the audio pools once. Decoding happens up front instead of on the
	// first press of each note, removing the latency/desync of `new Audio()` per hit.
	preload() {
		if (this.preloaded || typeof Audio === 'undefined') return
		this.preloaded = true

		Object.entries(AUDIO_MAP).forEach(([audioId, src]) => {
			const pool: HTMLAudioElement[] = []
			for (let index = 0; index < POOL_SIZE; index += 1) {
				const audio = new Audio(src)
				audio.preload = 'auto'
				audio.volume = this.volume
				audio.load()
				pool.push(audio)
			}
			this.pools.set(audioId, pool)
			this.cursors.set(audioId, 0)
		})
	}

	setEnabled(value: boolean) {
		this.enabled = value
	}

	setVolume(value: number) {
		this.volume = value
		this.pools.forEach((pool) => {
			pool.forEach((audio) => {
				audio.volume = value
			})
		})
	}

	playLane(laneId: string) {
		if (!this.enabled) return
		const key = PIANO_KEY_MAP[laneId]
		if (!key) return
		this.playAudioId(key.audioId)
	}

	playAudioId(audioId: string) {
		if (!this.enabled) return
		if (!AUDIO_MAP[audioId]) return
		if (!this.preloaded) this.preload()

		const pool = this.pools.get(audioId)
		if (!pool || !pool.length) return

		const cursor = this.cursors.get(audioId) ?? 0
		const audio = pool[cursor]
		this.cursors.set(audioId, (cursor + 1) % pool.length)

		audio.currentTime = 0
		audio.volume = this.volume
		void audio.play().catch(() => {
			// Ignore autoplay restrictions until the user interacts.
		})
	}
}

export const audioService = new AudioService()
