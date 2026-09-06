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

// Playback runs on the Web Audio API, not on HTMLAudioElement pools.
//
// The pool version created 24 samples x 4 elements = 96 <audio> objects and
// called load() on all of them at once. The browser caps how many media loads it
// will run in parallel and aborts the rest (visible as a wall of ERR_ABORTED
// /audio/*.mp3 in any session), so a pool slot could be left with readyState 0 —
// and pressing that key produced silence. That is the "sometimes audio does not
// play" bug.
//
// One decoded AudioBuffer per sample fixes it at the root: 24 fetches instead of
// 96 media loads, decoding happens once, and every press starts a fresh
// BufferSource with no per-element state that can be half-loaded. Polyphony is
// unlimited, and scheduling is sample-accurate, which the melody preview needs.
class AudioService {
	private enabled = true
	private volume = 0.55
	private ctx: AudioContext | null = null
	private gain: GainNode | null = null
	private readonly buffers = new Map<string, AudioBuffer>()
	private readonly loading = new Map<string, Promise<void>>()
	private preloadStarted = false

	private getContext(): AudioContext | null {
		if (this.ctx) return this.ctx
		const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
		if (!Ctor) return null

		this.ctx = new Ctor()
		this.gain = this.ctx.createGain()
		this.gain.gain.value = this.volume
		this.gain.connect(this.ctx.destination)
		return this.ctx
	}

	// A context created outside a user gesture starts suspended on mobile. Every
	// entry point calls this, so the first tap or keypress wakes it.
	private unlock() {
		const ctx = this.getContext()
		if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {})
		return ctx
	}

	private load(audioId: string) {
		const cached = this.loading.get(audioId)
		if (cached) return cached

		const src = AUDIO_MAP[audioId]
		const ctx = this.getContext()
		if (!src || !ctx) return Promise.resolve()

		const task = fetch(src)
			.then((response) => response.arrayBuffer())
			.then((data) => ctx.decodeAudioData(data))
			.then((buffer) => {
				this.buffers.set(audioId, buffer)
			})
			.catch(() => {
				// A sample that fails to load simply stays silent; the game does not
				// depend on it and retrying on every press would hammer the network.
				this.loading.delete(audioId)
			})

		this.loading.set(audioId, task)
		return task
	}

	preload() {
		if (this.preloadStarted) return
		this.preloadStarted = true
		Object.keys(AUDIO_MAP).forEach((audioId) => void this.load(audioId))
	}

	// Whether sound can actually be heard right now. A context created without a
	// user gesture stays suspended, so anything played before the first touch is
	// silent — the caller needs to know that rather than play to nobody.
	isAudible() {
		return this.enabled && this.ctx?.state === 'running'
	}

	setEnabled(value: boolean) {
		this.enabled = value
	}

	setVolume(value: number) {
		this.volume = value
		if (this.gain) this.gain.gain.value = value
	}

	// Start one sample at an absolute context time (or now). Returns the source so
	// a scheduled preview can cancel what has not sounded yet.
	private start(audioId: string, when?: number) {
		const ctx = this.unlock()
		const buffer = this.buffers.get(audioId)
		if (!ctx || !this.gain || !buffer) return null

		const source = ctx.createBufferSource()
		source.buffer = buffer
		source.connect(this.gain)
		source.start(when ?? ctx.currentTime)
		return source
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

		if (!this.buffers.has(audioId)) {
			// Not decoded yet (a very early press): decode now and play as soon as it
			// is ready rather than dropping the note.
			void this.load(audioId).then(() => {
				if (this.enabled) this.start(audioId)
			})
			return
		}

		this.start(audioId)
	}

	// Play a melody the way it is written — in its own tempo, notes landing when
	// the score says they land. The game itself is self-paced, so without this the
	// player never actually hears the tune they are reading: they hear their own
	// hesitant keypresses.
	//
	// Scheduled on the audio clock rather than with setTimeout: timers drift under
	// load, and a preview that stumbles teaches the wrong rhythm.
	playSequence(notes: Array<{ laneId: string; timeMs: number }>, maxMs = 14000) {
		if (!this.enabled || !notes.length) return { stop: () => {}, durationMs: 0 }

		this.preload()
		const ctx = this.unlock()
		if (!ctx) return { stop: () => {}, durationMs: 0 }

		const origin = notes[0].timeMs
		const startAt = ctx.currentTime + 0.25
		const sources: AudioBufferSourceNode[] = []
		let lastAt = 0
		let cancelled = false

		const schedule = () => {
			if (cancelled) return
			for (const note of notes) {
				const at = note.timeMs - origin
				if (at > maxMs) break
				lastAt = at
				const key = PIANO_KEY_MAP[note.laneId]
				if (!key) continue
				const source = this.start(key.audioId, startAt + at / 1000)
				if (source) sources.push(source)
			}
		}

		// Wait for the samples this melody needs, then lay the whole thing out on
		// the audio clock at once.
		const needed = new Set(
			notes.map((note) => PIANO_KEY_MAP[note.laneId]?.audioId).filter(Boolean) as string[]
		)
		void Promise.all([...needed].map((audioId) => this.load(audioId))).then(schedule)

		for (const note of notes) {
			const at = note.timeMs - origin
			if (at > maxMs) break
			lastAt = at
		}

		return {
			stop: () => {
				cancelled = true
				sources.forEach((source) => {
					try {
						source.stop()
					} catch {
						// Already finished.
					}
				})
			},
			// A little tail so the last note is heard out rather than cut off, plus
			// the quarter-second lead-in the schedule starts with.
			durationMs: lastAt + 1150,
		}
	}
}

export const audioService = new AudioService()
