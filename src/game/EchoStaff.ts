import { Container, Graphics } from 'pixi.js'

import type { BackgroundPresetId, NoteNamingSystem } from '@/core/models'
import type { EchoNote, PlacedNote } from '@/features/echo'
import { BACKGROUND_PRESETS } from '@/modes/modeDefinitions'
import {
	RENDERER_LOST_EVENT,
	createNoteGlyph,
	drawNoteGlyph,
	drawStaffLines,
	drawTrebleClef,
	getSharedApp,
	laneY,
	type NoteGlyph,
} from '@/game/notation'

// The By Ear staff: the same notation Campaign reads from, used the other way
// round. Campaign draws a melody and asks the player to perform it; this draws
// an empty staff with a line sweeping across it and writes down whatever the
// player plays. Both use game/notation.ts, so a note means the same thing and
// looks the same in both places.
//
// Time runs left to right and wraps onto the next system when a line is full,
// the way written music does. Everything the player has written stays on screen:
// they cannot judge a note they cannot see, and going back to fix one is the
// point of the mode.

// Enough room for the full pitch range (c4 to b5 is 6.5 gaps), the stems above
// it and the note names below.
const STAFF_SPAN_GAPS = 9.5
const MIN_LINE_GAP = 11
const MAX_LINE_GAP = 30
// A beat needs about this much width to stay readable — the same rule Campaign
// uses to decide how many beats fit on one of its lines.
const MIN_BEAT_GAPS = 2.6
// More than three systems on a phone in landscape leaves each of them too short
// to read; the timelines this mode uses fit well inside that.
const MAX_LINES = 3
const BEATS_PER_BAR = 4

export interface EchoStaffOptions {
	themeId: BackgroundPresetId
	bpm: number
	// Length of the writable timeline. The phrase plus a little room past its end,
	// so a player who runs long still has staff to write on.
	timelineMs: number
	namingSystem: NoteNamingSystem
}

// What the check said about one written note. The head itself takes the verdict
// colour — green for right, red for wrong, amber for the right note in the wrong
// place — because that is what the player is looking for after a check, and it
// has to be readable at a glance rather than found in an outline.
export type NoteMark = 'match' | 'late' | 'wrong' | 'extra'

// Ghost notes are grey rather than their lane colours. After a check the staff
// carries green and red, and a pale pink ghost beside a red note reads as a
// third verdict instead of as "here is where the note belonged".
const GHOST_COLOR = 0x8b93a1

const MARK_COLORS: Record<NoteMark, number> = {
	match: 0x0f9a67,
	late: 0xc1830a,
	wrong: 0xbd2f45,
	extra: 0xbd2f45,
}

interface NoteView extends NoteGlyph {
	note: PlacedNote
	mark?: NoteMark
}

export class EchoStaff {
	private app!: Awaited<ReturnType<typeof getSharedApp>>
	private readonly root = new Container()
	private readonly backgroundLayer = new Graphics()
	private readonly staffLayer = new Graphics()
	private readonly gridLayer = new Graphics()
	private readonly playhead = new Container()
	private readonly playheadBar = new Graphics()
	private readonly ghostLayer = new Container()
	private readonly notesLayer = new Container()
	private readonly views: NoteView[] = []
	private readonly ghostViews: NoteGlyph[] = []

	// The slice of the timeline on screen. By Ear shows a whole phrase, so the
	// window is the phrase; the Studio writes tunes longer than a screen can hold
	// legibly and pages through them a window at a time.
	private windowStartMs = 0
	private windowSpanMs = 0

	private options: EchoStaffOptions
	private theme: (typeof BACKGROUND_PRESETS)[BackgroundPresetId]
	private ghosts: EchoNote[] = []
	private cursorMs = 0

	private mounted = false
	private destroyed = false
	// Bound once so it can be removed again; a leaked listener would keep a
	// destroyed scene alive and rebuild it into a detached canvas.
	private readonly onRendererLost = () => void this.remount()
	private width = 0
	private height = 0
	private lineGap = 20
	private lineCount = 1
	private lineHeight = 0
	private msPerLine = 1
	private leftX = 0
	private rightX = 0

	// Note heads follow the staff spacing, but never grow wider than the space
	// between the closest pair of notes actually written: a run of eighths puts
	// two heads where a quarter puts one, and full-size glyphs there overlap into
	// an unreadable smear. Measured from the music, not from the beat, because
	// the beat is not what collides.
	private minGapMs = 0

	private get pxPerMs() {
		return (this.rightX - this.trackLeftX) / Math.max(1, this.msPerLine)
	}

	private get noteGapPx() {
		return this.minGapMs ? this.minGapMs * this.pxPerMs : Number.POSITIVE_INFINITY
	}

	private get noteScale() {
		const byGap = this.lineGap / 24
		return Math.max(0.45, Math.min(byGap, this.noteGapPx / 26))
	}

	// Below this the flag of one note reaches across the head of the next.
	private get showsFlags() {
		return this.noteGapPx >= 46
	}

	constructor(private readonly host: HTMLElement, options: EchoStaffOptions) {
		this.options = options
		this.theme = BACKGROUND_PRESETS[options.themeId]
	}

	async init() {
		if (this.mounted) return

		const app = await getSharedApp()
		if (this.destroyed) return

		this.app = app
		this.app.resizeTo = this.host

		this.host.innerHTML = ''
		this.host.appendChild(this.app.canvas)

		this.app.stage.removeChildren()
		this.app.stage.addChild(this.root)
		this.playhead.addChild(this.playheadBar)
		// Ghosts go under the player's own notes: they are the answer being shown
		// after a check, and must never be mistaken for something that was written.
		this.ghostLayer.alpha = 0.3
		this.root.addChild(
			this.backgroundLayer,
			this.gridLayer,
			this.staffLayer,
			this.playhead,
			this.ghostLayer,
			this.notesLayer
		)

		this.resize()
		this.mounted = true
		window.addEventListener(RENDERER_LOST_EVENT, this.onRendererLost)
	}

	// The renderer went away: attach this scene to a freshly created one. The
	// notes, ghosts and cursor are model state, so they survive the rebuild.
	private async remount() {
		if (this.destroyed) return

		this.mounted = false
		const app = await getSharedApp().catch(() => null)
		if (!app || this.destroyed) return

		this.app = app
		this.app.resizeTo = this.host
		this.host.innerHTML = ''
		this.host.appendChild(this.app.canvas)
		this.app.stage.removeChildren()
		this.app.stage.addChild(this.root)

		this.resize()
		this.mounted = true
	}

	destroy() {
		this.destroyed = true
		window.removeEventListener(RENDERER_LOST_EVENT, this.onRendererLost)
		if (!this.mounted) return
		this.app.stage.removeChild(this.root)
		this.root.destroy({ children: true })
		this.mounted = false
	}

	// Grow (or shrink) the writable staff without rebuilding the scene.
	setTimeline(timelineMs: number) {
		if (timelineMs === this.options.timelineMs) return
		this.options = { ...this.options, timelineMs }
		if (!this.windowSpanMs) this.resize()
		else this.setWindow(this.windowStartMs, this.windowSpanMs)
	}

	// Show `spanMs` of the timeline starting at `startMs`. Passing a span of 0
	// goes back to showing everything, which is what By Ear wants.
	setWindow(startMs: number, spanMs: number) {
		this.windowStartMs = Math.max(0, startMs)
		this.windowSpanMs = Math.max(0, spanMs)
		this.resize()
	}

	setNamingSystem(namingSystem: NoteNamingSystem) {
		if (namingSystem === this.options.namingSystem) return
		this.options = { ...this.options, namingSystem }
		this.views.forEach((view) => this.drawNote(view))
	}

	resize() {
		this.width = this.host.clientWidth
		this.height = this.host.clientHeight
		if (!this.width || !this.height) return

		this.leftX = Math.max(52, this.width * 0.07)
		this.rightX = this.width - Math.max(20, this.width * 0.03)
		this.layoutLines()

		this.drawBackground()
		this.drawStaff()
		this.buildPlayhead()
		this.views.forEach((view) => this.drawNote(view))
		this.layoutNotes()
		this.setGhosts(this.ghosts)
		this.setCursor(this.cursorMs)
	}

	// How many systems the phrase needs, and where they break. A line holds whole
	// bars — that is how the tune itself is written, and a system that starts in
	// the middle of a bar makes the second line unreadable however much room it
	// has. One line is best, the whole answer at a glance; the staff wraps only
	// when a beat would end up narrower than a notehead.
	// What the layout is actually laying out: the visible slice.
	private get spanMs() {
		return this.windowSpanMs || this.options.timelineMs
	}

	private layoutLines() {
		const beatMs = 60000 / Math.max(this.options.bpm, 1)
		const barMs = beatMs * BEATS_PER_BAR
		const totalBars = Math.max(1, Math.round(this.spanMs / barMs))

		for (let lines = 1; lines <= MAX_LINES; lines += 1) {
			const barsPerLine = Math.ceil(totalBars / lines)
			const gap = Math.max(
				MIN_LINE_GAP,
				Math.min(MAX_LINE_GAP, this.height / (STAFF_SPAN_GAPS * lines))
			)
			const beatWidth = (this.rightX - this.trackLeftXFor(gap)) / (barsPerLine * BEATS_PER_BAR)

			if (beatWidth >= gap * MIN_BEAT_GAPS || lines === MAX_LINES) {
				// Whole bars per line means the last system can be the only short one,
				// and that the count follows from the split rather than the other way
				// round: three bars over two lines is two lines of two, not of 1.5.
				this.lineCount = Math.ceil(totalBars / barsPerLine)
				this.lineGap = Math.max(
					MIN_LINE_GAP,
					Math.min(MAX_LINE_GAP, this.height / (STAFF_SPAN_GAPS * this.lineCount))
				)
				this.lineHeight = this.height / this.lineCount
				this.msPerLine = barsPerLine * barMs
				return
			}
		}
	}

	// The first beat of a line starts clear of its clef. Time zero at the staff's
	// left edge put the opening note on top of the glyph, where it read as part
	// of it.
	private trackLeftXFor(lineGap: number) {
		return this.leftX + lineGap * 1.6
	}

	private get trackLeftX() {
		return this.trackLeftXFor(this.lineGap)
	}

	// Local time: where a moment sits inside the visible window.
	private localTime(timeMs: number) {
		return timeMs - this.windowStartMs
	}

	isVisible(timeMs: number) {
		const local = this.localTime(timeMs)
		return local >= -1 && local <= this.spanMs + 1
	}

	private lineOfTime(timeMs: number) {
		const clamped = Math.max(0, Math.min(this.spanMs - 1, this.localTime(timeMs)))
		return Math.max(0, Math.min(this.lineCount - 1, Math.floor(clamped / this.msPerLine)))
	}

	// The bottom line of a system: pitch is measured up from here, and the note
	// names and ledger lines under c5 sit below it.
	private baselineOfLine(line: number) {
		return line * this.lineHeight + this.lineHeight - this.lineGap * 2.2
	}

	// Where a moment sits on screen, and the inverse — the inverse is what lets
	// the player drag the line back to a bar they want to redo.
	xAtTime(timeMs: number) {
		const clamped = Math.max(0, Math.min(this.spanMs, this.localTime(timeMs)))
		const line = Math.max(0, Math.min(this.lineCount - 1, Math.floor(Math.min(this.spanMs - 1, clamped) / this.msPerLine)))
		const local = clamped - line * this.msPerLine
		return this.trackLeftX + (local / this.msPerLine) * (this.rightX - this.trackLeftX)
	}

	yAtTime(timeMs: number) {
		return this.lineOfTime(timeMs) * this.lineHeight
	}

	// Both coordinates matter once the staff wraps: which system was pointed at
	// decides which part of the timeline the player meant.
	timeAt(x: number, y: number) {
		const line = Math.max(0, Math.min(this.lineCount - 1, Math.floor(y / this.lineHeight)))
		const usable = Math.max(1, this.rightX - this.trackLeftX)
		const ratio = (x - this.trackLeftX) / usable
		const local = Math.max(0, Math.min(1, ratio)) * this.msPerLine
		return Math.max(
			0,
			Math.min(this.options.timelineMs, this.windowStartMs + line * this.msPerLine + local)
		)
	}

	setCursor(timeMs: number) {
		this.cursorMs = Math.max(0, Math.min(this.options.timelineMs, timeMs))
		this.playhead.visible = this.isVisible(this.cursorMs)
		this.playhead.x = this.xAtTime(this.cursorMs)
		this.playhead.y = this.yAtTime(this.cursorMs)
	}

	setNotes(notes: PlacedNote[], marks: Record<number, NoteMark> = {}) {
		// How tightly this tune is written decides how big a head may be drawn.
		const times = [...notes].map((note) => note.timeMs).sort((a, b) => a - b)
		let gap = 0
		for (let index = 1; index < times.length; index += 1) {
			const step = times[index] - times[index - 1]
			if (step > 1 && (!gap || step < gap)) gap = step
		}
		const densityChanged = gap !== this.minGapMs
		this.minGapMs = gap

		// Views are reconciled rather than rebuilt: a note the player did not touch
		// keeps its glyph, so undoing one note does not re-tessellate the rest.
		while (this.views.length > notes.length) {
			const view = this.views.pop()
			if (view) view.container.destroy({ children: true })
		}

		notes.forEach((note, index) => {
			let view = this.views[index]
			if (!view) {
				const glyph = createNoteGlyph(this.theme.ink)
				this.notesLayer.addChild(glyph.container)
				view = { ...glyph, note }
				this.views.push(view)
			}

			const mark = marks[note.id]
			const changed = densityChanged || view.note.laneId !== note.laneId || view.mark !== mark
			view.note = note
			view.mark = mark
			if (changed || !view.label.text) this.drawNote(view)
		})

		this.layoutNotes()
	}

	// The phrase itself, revealed after a check: faint notes at the pitches and
	// places the tune actually asks for. Nothing shows them before that — the
	// mode is about hearing where a note goes, not reading it.
	setGhosts(phrase: EchoNote[] | null) {
		this.ghosts = phrase ?? []

		while (this.ghostViews.length > this.ghosts.length) {
			const view = this.ghostViews.pop()
			if (view) view.container.destroy({ children: true })
		}

		this.ghosts.forEach((note, index) => {
			let view = this.ghostViews[index]
			if (!view) {
				view = createNoteGlyph(this.theme.ink)
				this.ghostLayer.addChild(view.container)
				this.ghostViews.push(view)
			}
			drawNoteGlyph(view, {
				laneId: note.laneId,
				scale: this.noteScale,
				lineGap: this.lineGap,
				ink: this.theme.ink,
				namingSystem: this.options.namingSystem,
				color: GHOST_COLOR,
				withFlag: this.showsFlags,
			})
			this.placeGlyph(view, note.laneId, note.timeMs)
		})
	}

	private drawNote(view: NoteView) {
		drawNoteGlyph(view, {
			laneId: view.note.laneId,
			scale: this.noteScale,
			lineGap: this.lineGap,
			ink: this.theme.ink,
			namingSystem: this.options.namingSystem,
			color: view.mark ? MARK_COLORS[view.mark] : undefined,
			withFlag: this.showsFlags,
		})
	}

	private placeGlyph(glyph: NoteGlyph, laneId: string, timeMs: number) {
		// A note outside the visible window is hidden rather than clamped to the
		// edge, where it would read as a note the player actually wrote there.
		glyph.container.visible = this.isVisible(timeMs)
		if (!glyph.container.visible) return

		const line = this.lineOfTime(timeMs)
		glyph.container.x = this.xAtTime(timeMs)
		glyph.container.y = laneY(laneId, this.baselineOfLine(line), this.lineGap)
	}

	private layoutNotes() {
		this.views.forEach((view) => this.placeGlyph(view, view.note.laneId, view.note.timeMs))
	}

	private drawBackground() {
		this.backgroundLayer.clear()
		this.backgroundLayer.rect(0, 0, this.width, this.height).fill({
			color: this.theme.stageTop[0],
		})
	}

	private drawStaff() {
		this.staffLayer.clear()
		this.gridLayer.clear()

		const beatMs = 60000 / Math.max(this.options.bpm, 1)

		for (let line = 0; line < this.lineCount; line += 1) {
			const baseline = this.baselineOfLine(line)
			// The music ends where it ends: the last system stops at the end of the
			// timeline instead of running empty ruled paper to the edge of the
			// screen, which reads as staff the player can still write on.
			const lineEndMs = this.windowStartMs + (line + 1) * this.msPerLine
			const lineRightX =
				lineEndMs > this.options.timelineMs
					? Math.min(this.rightX, this.xAtTime(this.options.timelineMs))
					: this.rightX

			drawStaffLines(this.staffLayer, {
				leftX: this.leftX - this.lineGap * 2.6,
				rightX: lineRightX,
				baselineY: baseline,
				lineGap: this.lineGap,
				ink: this.theme.ink,
				alpha: 0.95,
			})
			drawTrebleClef(
				this.staffLayer,
				this.leftX - this.lineGap * 1.7,
				baseline,
				this.lineGap,
				this.theme.ink,
				0.95
			)

			// Bars and beats. Written music is read in bars, and a player placing
			// notes by eye needs the same landmarks the tune has — without them
			// "the third beat" is a guess about a blank stretch of paper.
			const top = baseline - this.lineGap * 4
			const firstBeat = Math.ceil((this.windowStartMs + line * this.msPerLine) / beatMs)
			const lastBeat = Math.floor((this.windowStartMs + (line + 1) * this.msPerLine) / beatMs)

			for (let beat = firstBeat; beat <= lastBeat; beat += 1) {
				const timeMs = beat * beatMs
				if (timeMs > this.options.timelineMs + 1) break
				// A beat landing exactly on the wrap belongs to the line it ends, not
				// to the start of the next one.
				const x = this.xAtTime(Math.min(timeMs, this.windowStartMs + (line + 1) * this.msPerLine - 1))
				const isBar = beat % BEATS_PER_BAR === 0
				this.gridLayer.moveTo(x, isBar ? top - this.lineGap * 0.6 : top)
				this.gridLayer.lineTo(x, isBar ? baseline + this.lineGap * 0.6 : baseline)
				this.gridLayer.stroke({
					width: isBar ? 2 : 1.2,
					color: this.theme.ink,
					alpha: isBar ? 0.38 : 0.16,
				})
			}
		}
	}

	// The line the player writes against. Built once and then only moved: it
	// travels every frame, and rebuilding a shape sixty times a second is exactly
	// the cost that turns into stutter on a mid-range Android. Drawn against the
	// first system, so moving it between lines is a y translation.
	private buildPlayhead() {
		this.playheadBar.clear()
		const baseline = this.baselineOfLine(0)
		const height = this.lineGap * 7.2
		const top = baseline - this.lineGap * 5.6
		this.playheadBar
			.roundRect(-this.lineGap * 0.5, top, this.lineGap, height, this.lineGap * 0.5)
			.fill({ color: this.theme.wave, alpha: 0.16 })
		this.playheadBar
			.roundRect(-1.5, top, 3, height, 1.5)
			.fill({ color: this.theme.wave, alpha: 0.7 })
	}
}
