import { Application, BitmapText, Container, Graphics } from 'pixi.js'

import type {
	ChartNote,
	GameplayResult,
	HudSnapshot,
	SessionConfig,
	SettingsState,
	TempoState,
} from '@/core/models'
import { BACKGROUND_PRESETS } from '@/modes/modeDefinitions'
import {
	RENDERER_LOST_EVENT,
	STAFF_STEPS,
	createNoteGlyph,
	drawNoteGlyph,
	drawStaffLines,
	drawTrebleClef,
	getSharedApp,
	laneColor,
} from '@/game/notation'
import { audioService } from '@/services/audioService'
import {
	getMelodyPlan,
	getReadingStars,
	groupChartByTime,
	isIntervalInTempo,
	type MelodyPlan,
} from '@/features/reading'

// Reading mode: the melody is written out as sheet music and the player performs
// it at their own speed. There is no note travel, no approach time and no
// millisecond judgement window — the round is graded on how long it took, how
// many wrong keys were hit, and how evenly the beats were spaced. The notation
// itself — staff, clef, note glyphs — is drawn by game/notation.ts, which By Ear
// draws from too.

// A line of music needs room for the full pitch range (6.5 gaps from c4 to b5)
// plus breathing space above and below.
const LINE_SPAN_GAPS = 8.5
// Two lines are on screen at once: the one being played and the one after it.
const VISIBLE_LINES = 2
// Lives never climb past this, however many bonus notes are played.
const BONUS_LIFE_CAP = 5
// The HUD shows tenths of a second, so it never needs to be pushed more often.
const HUD_INTERVAL_MS = 100
// Particles are pooled sprites, not redrawn shapes: a fixed pool means a hit can
// never allocate, and the per-frame work is a transform per live particle.
const PARTICLE_POOL = 64
const PARTICLES_PER_HIT = 8
const PARTICLE_LIFE_MS = 620
// How long a played note takes to lift off the staff and fade out.
// How faint a note goes once it has been played and settled: present enough to
// read as "done", quiet enough that it never competes with what comes next.
const PLAYED_ALPHA = 0.26

const NOTE_RESOLVE_MS = 200
const NOTE_REJECT_MS = 260

interface NoteView {
	note: ChartNote
	slotIndex: number
	container: Container
	glow: Graphics
	head: Graphics
	stem: Graphics
	flag: Graphics
	ledger: Graphics
	accidental: Graphics
	label: BitmapText
	resolve?: { startMs: number; type: 'hit' | 'wrong'; originX: number; originY: number }
	// Finished animating: never touched again this round.
	done?: boolean
	// Played correctly and settled back onto the staff, where it stays as a quiet
	// mark. It still gets laid out every frame — the line it belongs to can still
	// scroll or re-flow underneath it — it is just drawn faint.
	played?: boolean
}

interface Particle {
	x: number
	y: number
	// Velocity in pixels per second, so motion is the same at 30 and 60 fps.
	vx: number
	vy: number
	life: number
	active: boolean
	sprite: Graphics
}

export interface ReadingGameCallbacks {
	onHud: (snapshot: HudSnapshot) => void
	onFinish: (result: GameplayResult) => void
	onFlash: (label: string, color: string) => void
}

export class ReadingGame {
	private app!: Application
	private readonly root = new Container()
	private readonly backgroundLayer = new Graphics()
	private readonly staffLayer = new Graphics()
	private readonly pacerLayer = new Graphics()
	private readonly notesLayer = new Container()
	private readonly particlesLayer = new Container()
	private readonly noteViews: NoteView[] = []
	private readonly particles: Particle[] = []
	private readonly callbacks: ReadingGameCallbacks
	private readonly session: SessionConfig
	private readonly theme: (typeof BACKGROUND_PRESETS)[keyof typeof BACKGROUND_PRESETS]
	private settings: SettingsState

	// The chart as beats: each slot is one x position holding one note, or several
	// stacked notes when the melody has a chord there.
	private readonly slots: ChartNote[][]
	private readonly plan: MelodyPlan

	private mounted = false
	private destroyed = false
	private readonly onRendererLost = () => void this.remount()
	private paused = false
	private completed = false
	private startAt = 0
	private pausedAt = 0
	private pauseOffset = 0

	private width = 0
	private height = 0
	private staffLeftX = 0
	private staffRightX = 0
	private lineGap = 20
	private lineHeight = 0
	private slotsPerLine = 8
	private scrollY = 0
	private targetScrollY = 0
	// Cache key for the drawn staff; empty forces the first draw.
	private staffKey = ''

	// Progress is a single cursor over the flattened note order: within a chord
	// the notes are played bottom-up, so one index covers both cases.
	private noteIndex = 0
	private readonly flatNotes: ChartNote[] = []
	private slotOfNote: number[] = []
	// Ids of notes already played. Needed because a chord's notes may be played in
	// any order, so "how far along" is no longer just an index.
	private readonly consumedIds = new Set<string>()

	private remainingLives = 0
	private wrongTaps = 0
	private lastTapMs: number | null = null
	private lastTapSlot = -1
	private tempoBeats = 0
	private tempoBeatsInTime = 0
	private tempoState: TempoState = 'on'
	// Two beats of run-up before the first note so the pacer arrives at it rather
	// than starting on top of it.
	private readonly leadInMs: number
	private pacerMs: number
	private lastHudSignature = ''
	private lastHudAt = -1000

	private get noteScale() {
		return this.lineGap / 24
	}

	constructor(
		private readonly host: HTMLElement,
		session: SessionConfig,
		settings: SettingsState,
		callbacks: ReadingGameCallbacks
	) {
		this.session = { ...session, chart: session.chart.map((note) => ({ ...note })) }
		this.settings = settings
		this.callbacks = callbacks
		this.theme = BACKGROUND_PRESETS[session.themeId]
		this.remainingLives = session.lives
		this.slots = groupChartByTime(this.session.chart)
		this.plan = getMelodyPlan(this.session.chart, session.bpm)
		this.leadInMs = (60000 / Math.max(session.bpm, 1)) * 2
		this.pacerMs = -this.leadInMs

		this.slots.forEach((slot, slotIndex) => {
			slot.forEach((note) => {
				this.flatNotes.push(note)
				this.slotOfNote.push(slotIndex)
			})
		})
	}

	async init() {
		if (this.mounted) return

		const app = await getSharedApp()
		if (this.destroyed) return

		this.app = app
		this.app.resizeTo = this.host

		audioService.setEnabled(this.settings.soundEnabled)
		audioService.preload()

		this.host.innerHTML = ''
		this.host.appendChild(this.app.canvas)

		this.app.stage.removeChildren()
		this.app.stage.addChild(this.root)
		this.root.addChild(
			this.backgroundLayer,
			this.staffLayer,
			this.pacerLayer,
			this.notesLayer,
			this.particlesLayer
		)

		this.resize()
		this.buildParticlePool()
		this.buildNoteViews()

		// The clock does NOT start here. A level can now appear the moment the app
		// opens, and a timer running while the player is still finding the screen
		// would spend their limit before they touched anything. It starts on the
		// first key, which is also when the melody actually begins.
		this.startAt = 0
		this.emitHud(0, true)
		this.app.ticker.add(this.update)
		this.mounted = true
		window.addEventListener(RENDERER_LOST_EVENT, this.onRendererLost)
	}

	// Rebuild the scene on a new renderer after a context loss. The round's own
	// state — elapsed time, lives, which notes are played — lives in this class,
	// so only the drawing has to be redone.
	private async remount() {
		if (this.destroyed) return

		const app = await getSharedApp().catch(() => null)
		if (!app || this.destroyed) return

		this.app = app
		this.app.resizeTo = this.host
		this.host.innerHTML = ''
		this.host.appendChild(this.app.canvas)
		this.app.stage.removeChildren()
		this.app.stage.addChild(this.root)

		this.resize()
		this.app.ticker.remove(this.update)
		this.app.ticker.add(this.update)
		this.mounted = true
	}

	destroy() {
		this.destroyed = true
		window.removeEventListener(RENDERER_LOST_EVENT, this.onRendererLost)
		if (!this.mounted) return
		this.app.ticker.remove(this.update)
		this.app.stage.removeChild(this.root)
		this.root.destroy({ children: true })
		this.mounted = false
	}

	setPaused(value: boolean) {
		if (this.paused === value || this.completed) return
		this.paused = value

		if (value) {
			this.pausedAt = performance.now()
			return
		}

		this.pauseOffset += performance.now() - this.pausedAt
	}

	updateSettings(settings: SettingsState) {
		const namingChanged = settings.noteNamingSystem !== this.settings.noteNamingSystem
		this.settings = settings
		if (namingChanged) this.rebuildNoteGeometry()
	}

	resize() {
		this.width = this.host.clientWidth
		this.height = this.host.clientHeight

		// Both visible lines have to fit, so the staff spacing follows from the
		// height rather than being chosen and then hoping it fits.
		this.lineGap = Math.max(11, Math.min(26, this.height / (LINE_SPAN_GAPS * VISIBLE_LINES)))
		this.lineHeight = this.lineGap * LINE_SPAN_GAPS

		this.staffLeftX = Math.max(56, this.width * 0.07)
		this.staffRightX = this.width - Math.max(28, this.width * 0.035)

		// A beat needs about three line-gaps of width to stay readable; fit as many
		// as the screen allows, within sane bounds for a phone in landscape.
		const usableWidth = this.staffRightX - this.staffLeftX
		this.slotsPerLine = Math.max(4, Math.min(12, Math.floor(usableWidth / (this.lineGap * 3.1))))

		this.staffKey = ''
		this.buildPacer()
		this.drawBackground()
		this.rebuildNoteGeometry()
		this.targetScrollY = -this.currentLine() * this.lineHeight
		this.scrollY = this.targetScrollY
	}

	pressKey(laneId: string) {
		audioService.setEnabled(this.settings.soundEnabled)
		audioService.playLane(laneId)

		if (this.completed || this.paused) return

		// First key of the round starts the clock and the tempo pacer. Any pause
		// accumulated before this moment — the rules card, the melody preview, the
		// new-notes toast — belongs to a round that had not begun, so it is
		// discarded rather than subtracted: subtracting it drove elapsed time
		// negative and stopped the round dead.
		if (!this.startAt) {
			this.startAt = performance.now()
			this.pausedAt = this.startAt
			this.pauseOffset = 0
			this.lastFrameMs = 0
		}

		// A beat may hold a chord. Its notes are accepted in ANY order and with no
		// time window between them: on a phone, two fingers landing at once is not
		// guaranteed — cheap panels drop or serialise simultaneous touches — so
		// demanding simultaneity would fail players for their hardware. Pressing
		// both together and pressing them one after another are both correct.
		const pending = this.pendingNotes()
		if (!pending.length) return

		const match = pending.find((note) => note.laneId === laneId)
		if (!match) {
			this.registerWrongTap()
			return
		}

		this.consumeNote(match)
	}

	// Notes of the current beat that have not been played yet.
	private pendingNotes(): ChartNote[] {
		const slot = this.slots[this.currentSlot()]
		if (!slot) return []
		return slot.filter((note) => !this.consumedIds.has(note.id))
	}

	releaseKey(_laneId: string) {
		// Reading mode has no holds: a note is done the moment it is played.
	}

	private update = (ticker?: { deltaMS: number }) => {
		if (!this.mounted || this.destroyed) return
		// Clamped: a tab that was backgrounded reports a huge delta, which would
		// teleport every particle off-screen in one step.
		const deltaMs = Math.min(ticker?.deltaMS ?? 16.7, 64)

		const elapsedMs = this.getElapsedMs()

		if (!this.paused && !this.completed) {
			this.updatePacer(elapsedMs)

			if (elapsedMs >= this.plan.limitMs) {
				this.finish(false, true)
				return
			}
		}

		// Ease the page toward the current line instead of jumping: the scroll is
		// how the player knows a line was finished.
		this.scrollY += (this.targetScrollY - this.scrollY) * 0.18

		this.drawStaff()
		this.movePacer()
		this.updateNotes(elapsedMs)
		this.updateParticles(deltaMs)
		this.emitHud(elapsedMs)
	}

	private getElapsedMs() {
		// Before the first key, no time has passed.
		if (!this.startAt) return 0
		if (this.paused) return this.pausedAt - this.startAt - this.pauseOffset
		return performance.now() - this.startAt - this.pauseOffset
	}

	private currentSlot() {
		return this.slotOfNote[this.noteIndex] ?? this.slots.length
	}

	private currentLine() {
		return Math.floor(this.currentSlot() / this.slotsPerLine)
	}

	// ── Layout ──────────────────────────────────────────────────────────────

	private slotX(slotIndex: number) {
		const column = slotIndex % this.slotsPerLine
		const step = (this.staffRightX - this.staffLeftX) / this.slotsPerLine
		return this.staffLeftX + step * (column + 0.5)
	}

	private lineBaselineY(lineIndex: number) {
		// Baseline = the staff's bottom line for that line of music. The first line
		// sits low enough that notes above the staff stay on screen.
		return this.lineGap * 5.6 + lineIndex * this.lineHeight + this.scrollY
	}

	private noteY(note: ChartNote, lineIndex: number) {
		const step = STAFF_STEPS[note.laneId] ?? 0
		return this.lineBaselineY(lineIndex) - step * (this.lineGap / 2)
	}

	// ── Drawing ─────────────────────────────────────────────────────────────

	private drawBackground() {
		this.backgroundLayer.clear()
		this.backgroundLayer.rect(0, 0, this.width, this.height).fill({
			color: this.theme.stageTop[0],
		})
	}

	private drawStaff() {
		// The staff is ten straight lines and two hand-drawn clefs — cheap to look
		// at, expensive to rebuild. It only changes when the page scrolls or the
		// visible line window moves, so a key guards the redraw. Idle reading (most
		// of a round) now costs nothing here.
		const key = `${this.currentLine()}:${Math.round(this.scrollY)}:${Math.round(this.lineGap)}`
		if (key === this.staffKey) return
		this.staffKey = key

		this.staffLayer.clear()

		const totalLines = Math.max(1, Math.ceil(this.slots.length / this.slotsPerLine))
		const first = this.currentLine()

		for (let lineIndex = first; lineIndex < Math.min(totalLines, first + VISIBLE_LINES); lineIndex += 1) {
			const baseline = this.lineBaselineY(lineIndex)
			// The line being played is fully lit; the one after it is dimmed so the
			// eye knows where it is without losing sight of what is coming.
			const alpha = lineIndex === first ? 0.95 : 0.45

			drawStaffLines(this.staffLayer, {
				leftX: this.staffLeftX - this.lineGap * 2.6,
				rightX: this.staffRightX,
				baselineY: baseline,
				lineGap: this.lineGap,
				ink: this.theme.ink,
				alpha,
			})

			drawTrebleClef(
				this.staffLayer,
				this.staffLeftX - this.lineGap * 1.7,
				baseline,
				this.lineGap,
				this.theme.ink,
				alpha
			)
		}
	}

	// The pacer is the melody's own tempo, drawn as a soft column sweeping the
	// line. It never overtakes the next unplayed beat — it waits there — so it can
	// show that the player is behind without ever failing them for it.
	private updatePacer(elapsedMs: number) {
		const slotIndex = this.currentSlot()
		const slot = this.slots[slotIndex]
		if (!slot) return

		const nextBeatMs = slot[0]?.timeMs ?? this.pacerMs
		const previousBeatMs = slotIndex > 0 ? this.slots[slotIndex - 1][0]?.timeMs ?? 0 : -this.leadInMs

		this.pacerMs = Math.min(nextBeatMs, Math.max(this.pacerMs, previousBeatMs) + this.frameDeltaMs(elapsedMs))

		// Nothing has been played yet: the player is reading the first bar, not
		// lagging. Reporting "behind" before the first key is pressed would be a
		// lie and the first thing they see.
		if (this.lastTapMs === null) {
			this.tempoState = 'on'
			return
		}

		const beatMs = 60000 / Math.max(this.session.bpm, 1)
		const behindBy = nextBeatMs - this.pacerMs
		if (this.pacerMs >= nextBeatMs) this.tempoState = 'behind'
		else if (behindBy > beatMs * 0.75) this.tempoState = 'ahead'
		else this.tempoState = 'on'
	}

	private lastFrameMs = 0

	private frameDeltaMs(elapsedMs: number) {
		const delta = this.lastFrameMs === 0 ? 16 : elapsedMs - this.lastFrameMs
		this.lastFrameMs = elapsedMs
		return Math.max(0, Math.min(64, delta))
	}

	// The pacer moves every frame by definition, so it must never be *redrawn*
	// every frame: its bar is built once and then only translated. Rebuilding two
	// rounded rects 60 times a second is exactly the kind of cost that turns into
	// visible stutter on a mid-range Android.
	private buildPacer() {
		this.pacerLayer.clear()
		const height = this.lineGap * 7
		this.pacerLayer
			.roundRect(-this.lineGap * 0.55, 0, this.lineGap * 1.1, height, this.lineGap * 0.5)
			.fill({ color: this.theme.wave, alpha: 0.16 })
		this.pacerLayer
			.roundRect(-1.5, 0, 3, height, 1.5)
			.fill({ color: this.theme.wave, alpha: 0.55 })
	}

	private movePacer() {
		const slotIndex = this.currentSlot()
		if (this.completed || slotIndex >= this.slots.length) {
			this.pacerLayer.visible = false
			return
		}

		const lineIndex = Math.floor(slotIndex / this.slotsPerLine)
		const baseline = this.lineBaselineY(lineIndex)
		const previousSlot = slotIndex > 0 ? this.slots[slotIndex - 1] : null
		const previousMs = previousSlot?.[0]?.timeMs ?? -this.leadInMs
		const nextMs = this.slots[slotIndex][0]?.timeMs ?? previousMs + 1
		const span = Math.max(1, nextMs - previousMs)
		const progress = Math.max(0, Math.min(1, (this.pacerMs - previousMs) / span))

		const fromX = previousSlot && Math.floor((slotIndex - 1) / this.slotsPerLine) === lineIndex
			? this.slotX(slotIndex - 1)
			: this.staffLeftX - this.lineGap
		const x = fromX + (this.slotX(slotIndex) - fromX) * progress

		this.pacerLayer.visible = true
		this.pacerLayer.x = x
		this.pacerLayer.y = baseline - this.lineGap * 5
	}

	// ── Notes ───────────────────────────────────────────────────────────────

	private buildNoteViews() {
		this.slots.forEach((slot, slotIndex) => {
			slot.forEach((note) => {
				const glyph = createNoteGlyph(this.theme.ink)
				this.notesLayer.addChild(glyph.container)

				const view: NoteView = { note, slotIndex, ...glyph }
				this.noteViews.push(view)
				this.drawNoteGeometry(view)
			})
		})
	}

	private drawNoteGeometry(view: NoteView) {
		drawNoteGlyph(view, {
			laneId: view.note.laneId,
			scale: this.noteScale,
			lineGap: this.lineGap,
			ink: this.theme.ink,
			namingSystem: this.settings.noteNamingSystem,
			// A bonus note wears a gold ring: in Sprint it is worth a life, and the
			// player has to be able to see that while reading ahead.
			ringColor: view.note.bonusLife ? 0xffd45e : undefined,
		})
	}

	private rebuildNoteGeometry() {
		this.noteViews.forEach((view) => this.drawNoteGeometry(view))
	}

	private updateNotes(elapsedMs: number) {
		const firstLine = this.currentLine()
		const currentSlot = this.currentSlot()

		this.noteViews.forEach((view) => {
			if (view.done) return
			const lineIndex = Math.floor(view.slotIndex / this.slotsPerLine)
			const onScreen = lineIndex >= firstLine && lineIndex < firstLine + VISIBLE_LINES

			if (view.resolve) {
				this.renderResolving(view, elapsedMs)
				return
			}

			if (!onScreen) {
				view.container.visible = false
				return
			}

			const y = this.noteY(view.note, lineIndex)
			view.container.visible = true
			view.container.x = this.slotX(view.slotIndex)
			view.container.y = y
			view.container.rotation = 0
			view.glow.visible = this.settings.showLaneGlow

			// The beat being played pulses and is fully opaque; the rest of the line
			// is present but quiet, and the next line quieter still.
			if (view.slotIndex === currentSlot) {
				const pulse = 1 + Math.sin(elapsedMs / 170) * 0.07
				view.container.scale.set(pulse)
				view.container.alpha = 1
				return
			}

			view.container.scale.set(1)
			if (view.played) {
				view.container.alpha = PLAYED_ALPHA
				view.glow.visible = false
				return
			}
			// What is still to come is quieter than it was, so that the note being
			// asked for is unmistakably the loudest thing on the staff.
			view.container.alpha = lineIndex === firstLine ? 0.58 : 0.28
		})
	}

	private renderResolving(view: NoteView, elapsedMs: number) {
		const { resolve } = view
		if (!resolve) return

		const duration = resolve.type === 'hit' ? NOTE_RESOLVE_MS : NOTE_REJECT_MS
		const progress = Math.max(0, Math.min(1, (elapsedMs - resolve.startMs) / duration))

		if (progress >= 1) {
			view.resolve = undefined
			if (resolve.type === 'hit') {
				// A played note stays on the staff as a faint mark rather than
				// vanishing: what has already been performed is exactly what tells a
				// reader where they are in the line, and an emptying staff takes that
				// away just as the line gets long enough to need it.
				view.played = true
				view.container.scale.set(1)
				return
			}
			// A wrong note has nothing to leave behind, so it still goes.
			view.container.visible = false
			view.done = true
			return
		}

		view.container.visible = true
		view.container.alpha = 1 - progress

		if (resolve.type === 'hit') {
			// Played notes lift off the staff and fade — the melody visibly empties
			// out as it is performed. Driven by progress, not by a per-frame step:
			// the old version moved 1.4px every frame, so the lift was twice as fast
			// at 60fps as at 30 and never matched the fade.
			// Lift, then settle: the note rises and swells at the moment it is
			// played and comes back to its own place on the staff, dimming to the
			// tone it keeps for the rest of the round.
			const lift = Math.sin(progress * Math.PI)
			view.container.y = resolve.originY - lift * 14
			view.container.scale.set(1 + lift * 0.22)
			view.container.alpha = 1 - progress * (1 - PLAYED_ALPHA)
			return
		}

		view.container.x = resolve.originX + Math.sin(progress * Math.PI * 6) * 3
	}

	// ── Rules ───────────────────────────────────────────────────────────────

	private consumeNote(note: ChartNote) {
		const elapsedMs = this.getElapsedMs()
		const view = this.noteViews.find((item) => item.note.id === note.id)
		const slotIndex = this.slotOfNote[this.noteIndex]
		this.consumedIds.add(note.id)

		if (view) {
			view.resolve = {
				startMs: elapsedMs,
				type: 'hit',
				originX: view.container.x,
				originY: view.container.y,
			}
			this.emitParticles(view.container.x, view.container.y, note.laneId)
		}

		// Bonus note: a life back, never above the cap the run started with, so a
		// long run can recover without the life count becoming meaningless.
		if (note.bonusLife && this.remainingLives < BONUS_LIFE_CAP) {
			this.remainingLives += 1
			this.callbacks.onFlash('+1 life', '#946306')
		}

		// Tempo is measured between beats, so chord notes inside one beat are not
		// separate intervals.
		if (slotIndex !== this.lastTapSlot) {
			if (this.lastTapMs !== null && this.lastTapSlot >= 0) {
				const expected =
					(this.slots[slotIndex]?.[0]?.timeMs ?? 0) - (this.slots[this.lastTapSlot]?.[0]?.timeMs ?? 0)
				this.tempoBeats += 1
				if (isIntervalInTempo(elapsedMs - this.lastTapMs, expected)) this.tempoBeatsInTime += 1
			}
			this.lastTapMs = elapsedMs
			this.lastTapSlot = slotIndex
		}

		this.noteIndex += 1
		this.targetScrollY = -this.currentLine() * this.lineHeight

		if (this.noteIndex >= this.flatNotes.length) {
			this.finish(true, false)
		}
	}

	private registerWrongTap() {
		this.wrongTaps += 1
		this.remainingLives -= 1
		this.callbacks.onFlash('Wrong note', '#ce3b52')

		const view = this.noteViews.find(
			(item) => item.slotIndex === this.currentSlot() && !item.resolve
		)
		if (view) view.container.x += 3

		if (this.remainingLives <= 0) this.finish(false, false)
	}

	// A fixed pool of one-circle Graphics. Each is drawn once at construction and
	// afterwards only transformed and tinted, so a burst of particles costs no
	// geometry work — the previous version rebuilt a single Graphics holding up to
	// eighty circles on every frame a particle was alive, which is exactly the
	// frame a note disappears on.
	private buildParticlePool() {
		if (this.particles.length) return

		for (let index = 0; index < PARTICLE_POOL; index += 1) {
			const sprite = new Graphics()
			sprite.visible = false
			this.particlesLayer.addChild(sprite)
			this.particles.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, active: false, sprite })
		}
	}

	private emitParticles(x: number, y: number, laneId: string) {
		if (!this.settings.showParticles) return

		const color = laneColor(laneId)
		let spawned = 0

		for (const particle of this.particles) {
			if (spawned >= PARTICLES_PER_HIT) break
			if (particle.active) continue

			particle.x = x
			particle.y = y
			particle.vx = (Math.random() - 0.5) * 260
			particle.vy = (Math.random() - 0.8) * 200
			particle.life = 1
			particle.active = true

			// Drawn once per birth, in the lane's colour. Not `tint`: setting tint on
			// a Graphics threw inside Pixi ("_onUpdate of null") and took every key
			// press down with it. Eight rebuilds per hit is nothing; the thing that
			// mattered was rebuilding on every frame, and that is gone.
			const radius = Math.random() * 3 + 1.6
			particle.sprite.clear().circle(0, 0, radius).fill({ color })
			particle.sprite.scale.set(1)
			particle.sprite.visible = true
			spawned += 1
		}
	}

	private updateParticles(deltaMs: number) {
		const seconds = deltaMs / 1000

		for (const particle of this.particles) {
			if (!particle.active) continue

			particle.x += particle.vx * seconds
			particle.y += particle.vy * seconds
			particle.vy += 480 * seconds
			particle.life -= deltaMs / PARTICLE_LIFE_MS

			if (particle.life <= 0) {
				particle.active = false
				particle.sprite.visible = false
				continue
			}

			particle.sprite.x = particle.x
			particle.sprite.y = particle.y
			particle.sprite.alpha = particle.life
		}
	}

	// ── Reporting ───────────────────────────────────────────────────────────

	private getAccuracy() {
		const total = this.noteIndex + this.wrongTaps
		if (total === 0) return 100
		return (this.noteIndex / total) * 100
	}

	private getTempoAccuracy() {
		if (this.tempoBeats === 0) return 100
		return (this.tempoBeatsInTime / this.tempoBeats) * 100
	}

	private buildHud(elapsedMs: number): HudSnapshot {
		return {
			score: 0,
			combo: 0,
			lives: this.remainingLives,
			accuracy: this.getAccuracy(),
			elapsedSec: elapsedMs / 1000,
			remainingSec: Math.max(0, (this.plan.limitMs - elapsedMs) / 1000),
			maxCombo: 0,
			misses: this.wrongTaps,
			perfect: 0,
			great: 0,
			good: 0,
			currentSpeedLabel: `${this.session.bpm} BPM`,
			notesCompleted: this.noteIndex,
			notesTotal: this.flatNotes.length,
			tempoState: this.tempoState,
			nextLaneId: this.pendingNotes()[0]?.laneId ?? null,
			streak: 0,
			modeId: this.session.modeId,
		}
	}

	private emitHud(elapsedMs: number, force = false) {
		// Rebuilding and pushing the HUD on every frame re-renders the Vue chips 60
		// times a second for values that change at most ten times a second.
		if (!force && elapsedMs - this.lastHudAt < HUD_INTERVAL_MS) return
		this.lastHudAt = elapsedMs

		const snapshot = this.buildHud(elapsedMs)
		const signature = [
			snapshot.lives,
			Math.round(snapshot.accuracy),
			snapshot.notesCompleted,
			snapshot.misses,
			snapshot.tempoState,
			snapshot.nextLaneId,
			Math.floor(snapshot.remainingSec * 10),
		].join('|')

		if (!force && signature === this.lastHudSignature) return

		this.lastHudSignature = signature
		this.callbacks.onHud(snapshot)
	}

	private finish(completed: boolean, timedOut: boolean) {
		if (this.completed) return
		this.completed = true

		const timeMs = Math.round(this.getElapsedMs())
		const livesLost = this.session.lives - this.remainingLives
		const stars = getReadingStars(completed, timeMs, livesLost, this.plan)
		const accuracy = this.getAccuracy()
		const tempoAccuracy = this.getTempoAccuracy()

		this.callbacks.onFinish({
			id: `${this.session.id}-result`,
			modeId: this.session.modeId,
			levelId: this.session.levelId,
			levelTitle: this.session.levelTitle ?? this.session.modeTitle,
			// Reading mode grades time and accuracy, not points. Score is kept at the
			// star count so the stored record shape stays valid.
			score: stars,
			accuracy,
			maxCombo: 0,
			misses: this.wrongTaps,
			tempoAccuracy,
			badge: String(stars) as GameplayResult['badge'],
			stars,
			timeMs,
			timedOut,
			completed,
			notesCompleted: this.noteIndex,
			notesTotal: this.flatNotes.length,
			remainingLives: Math.max(0, this.remainingLives),
			streak: 0,
			date: new Date().toISOString(),
		})
	}
}
