import { Application, BitmapText, Container, Graphics } from 'pixi.js'

import type { NoteNamingSystem } from '@/core/models'
import { PIANO_KEY_MAP, getLaneLabel } from '@/entities/piano'

// How this game draws notation, in one place. Two screens read the staff now —
// Campaign performs a written melody, By Ear writes one down — and they have to
// be the same notation, drawn the same way, or the second one teaches the player
// to read something the first one never shows them.
//
// Vertical position on the staff is pitch, exactly as in real notation. A step
// of 1 is one staff position (half a line gap); c4 sits two positions below the
// bottom line, b5 eleven above it.
export const STAFF_STEPS: Record<string, number> = {
	c4: -2, cs4: -2, d4: -1, ds4: -1, e4: 0, f4: 1, fs4: 1, g4: 2, gs4: 2,
	a4: 3, as4: 3, b4: 4, c5: 5, cs5: 5, d5: 6, ds5: 6, e5: 7, f5: 8,
	fs5: 8, g5: 9, gs5: 9, a5: 10, as5: 10, b5: 11,
}

// One PixiJS Application is shared across every scene: creating and destroying
// an Application repeatedly corrupts renderer-level resource bookkeeping. Only
// the scene graph below each screen's own root is torn down between rounds, so
// two screens may take turns with this but never hold it at once.
let sharedAppReady: Promise<Application> | null = null

// A WebGL context can be taken away at any time — Android reclaims it when the
// app is backgrounded, when another tab is heavy, or simply when the driver
// decides to. Pixi does not rebuild itself when that happens: the canvas goes
// blank and every staff in the game turns into an empty white block, which is
// exactly what it looks like from the player's side.
//
// So the loss is caught here, the cached application is thrown away, and every
// mounted scene is told to rebuild itself against a fresh one.
export const RENDERER_LOST_EVENT = 'piano-notes:renderer-lost'

export function invalidateSharedApp() {
	sharedAppReady = null
}

function watchForContextLoss(app: Application) {
	const canvas = app.canvas as HTMLCanvasElement
	if (!canvas?.addEventListener) return

	canvas.addEventListener('webglcontextlost', (event) => {
		// Without preventDefault the browser never offers the context back.
		event.preventDefault()
		console.warn('[notation] WebGL context lost — rebuilding the renderer')
		invalidateSharedApp()
		window.dispatchEvent(new CustomEvent(RENDERER_LOST_EVENT))
	})
}

// How sharply to draw, and how that gets decided.
//
// The cap used to be a flat 2, on the reasoning that nobody would see the
// difference on a small screen. They do: a phone reporting 3 got a canvas drawn
// at 2 and stretched by half again, and thin vector strokes — staff lines, note
// stems, pitch labels — are exactly what upscaling ruins.
//
// But following the device is not free either. Measured on a throttled profile,
// going from 2 to 3 cost 78% more time per frame, because rasterising is paid
// per pixel and 3x is 2.25x the pixels of 2x. So the game starts sharp and drops
// to 2 if the frames say the device cannot afford it, and remembers that answer
// so the next screen opens at a scale that works.
const RESOLUTION_KEY = 'piano-notes-render-scale'
const MAX_RESOLUTION = 3

export function preferredResolution() {
	const device = Math.min(Math.max(window.devicePixelRatio || 1, 1), MAX_RESOLUTION)
	try {
		const stored = Number(window.localStorage.getItem(RESOLUTION_KEY))
		if (stored >= 1 && stored <= MAX_RESOLUTION) return Math.min(device, stored)
	} catch {
		// Private mode and blocked storage both throw; the device value is fine.
	}
	return device
}

// Called when a scene has watched enough slow frames to conclude the device
// cannot carry full resolution. Returns true if anything changed.
export function downgradeResolution(app: Application) {
	const current = app.renderer.resolution
	if (current <= 2) return false

	try {
		window.localStorage.setItem(RESOLUTION_KEY, '2')
	} catch {
		// Not being able to remember it only means measuring again next time.
	}
	app.renderer.resolution = 2
	app.renderer.resize(app.renderer.width, app.renderer.height)
	console.warn('[notation] frames were slow at %sx — dropping to 2x', current)
	return true
}

export function getSharedApp() {
	if (!sharedAppReady) {
		const app = new Application()
		sharedAppReady = app
			.init({
				backgroundAlpha: 0,
				antialias: true,
				autoDensity: true,
				resolution: preferredResolution(),
			})
			.then(() => {
				watchForContextLoss(app)
				return app
			})
			.catch((error) => {
				// A failed init would otherwise leave the promise cached and every
				// later screen waiting on a renderer that will never exist.
				console.warn('[notation] renderer init failed', error)
				invalidateSharedApp()
				throw error
			})
	}
	return sharedAppReady
}

export function laneColor(laneId: string) {
	const color = PIANO_KEY_MAP[laneId]?.color ?? '#69f0ff'
	return Number(`0x${color.replace('#', '')}`)
}

export function shade(color: number, factor: number) {
	const r = Math.min(255, Math.round(((color >> 16) & 0xff) * factor))
	const g = Math.min(255, Math.round(((color >> 8) & 0xff) * factor))
	const b = Math.min(255, Math.round((color & 0xff) * factor))
	return (r << 16) | (g << 8) | b
}

// Where a pitch sits, given the staff's baseline (its bottom line).
export function laneY(laneId: string, baselineY: number, lineGap: number) {
	return baselineY - (STAFF_STEPS[laneId] ?? 0) * (lineGap / 2)
}

export interface StaffLineOptions {
	leftX: number
	rightX: number
	baselineY: number
	lineGap: number
	ink: number
	alpha: number
}

// Line weight scales with the staff: a 1.5px hairline was fine on a big screen
// and vanished on a phone, and against the neon shell around the sheet it read
// as no staff at all. Notation is printed ink — it is allowed to be black.
export function drawStaffLines(g: Graphics, options: StaffLineOptions) {
	const width = Math.max(2, options.lineGap * 0.09)
	for (let line = 0; line < 5; line += 1) {
		const y = options.baselineY - line * options.lineGap
		g.moveTo(options.leftX, y)
		g.lineTo(options.rightX, y)
		g.stroke({ width, color: options.ink, alpha: options.alpha })
	}
}

// A staff without a clef is not notation — the position of a note only means a
// pitch once the clef says so. Drawn as a path rather than loaded as an image,
// like every other visual in the app. The G-clef curls around the second line
// from the bottom, which is why every coordinate is measured from there.
export function drawTrebleClef(
	g: Graphics,
	x: number,
	baselineY: number,
	lineGap: number,
	ink: number,
	alpha: number
) {
	const u = lineGap
	const gLineY = baselineY - u
	const width = Math.max(2.1, u * 0.19)
	const inkAlpha = Math.min(1, alpha + 0.18)
	const stroke = { width, color: ink, alpha: inkAlpha, cap: 'round' as const }

	// One continuous line, the way the glyph is actually written: hook over the
	// top line, down the spine, round the belly that wraps the G line, and out
	// into the tail a gap and a half below the staff.
	g.moveTo(x + u * 0.55, gLineY - u * 2.0)
	// Top hook, leaning left above the staff.
	g.bezierCurveTo(
		x + u * 0.55, gLineY - u * 3.3,
		x - u * 0.45, gLineY - u * 3.0,
		x - u * 0.35, gLineY - u * 1.9
	)
	// Spine descending through the staff, bowing right.
	g.bezierCurveTo(
		x - u * 0.25, gLineY - u * 0.7,
		x + u * 0.7, gLineY + u * 0.2,
		x + u * 0.55, gLineY + u * 1.35
	)
	// Tail curling left and down below the bottom line.
	g.bezierCurveTo(
		x + u * 0.45, gLineY + u * 2.35,
		x - u * 0.55, gLineY + u * 2.3,
		x - u * 0.5, gLineY + u * 1.45
	)
	g.stroke(stroke)

	// The belly: a loop around the G line, closing on the spiral eye that sits
	// exactly on that line — the whole point of the symbol.
	g.moveTo(x + u * 0.12, gLineY - u * 1.05)
	g.bezierCurveTo(
		x + u * 1.05, gLineY - u * 0.85,
		x + u * 1.15, gLineY + u * 0.55,
		x + u * 0.1, gLineY + u * 0.5
	)
	g.bezierCurveTo(
		x - u * 0.75, gLineY + u * 0.45,
		x - u * 0.7, gLineY - u * 0.35,
		x + u * 0.02, gLineY - u * 0.08
	)
	g.stroke(stroke)

	g.circle(x + u * 0.1, gLineY, width * 1.15).fill({ color: ink, alpha: inkAlpha })
}

// One drawn note: the parts are kept apart because each is redrawn for its own
// reason — the head on a pitch change, the ledger lines on a resize, the label
// when the player switches between letters and solfège.
export interface NoteGlyph {
	container: Container
	glow: Graphics
	head: Graphics
	stem: Graphics
	flag: Graphics
	ledger: Graphics
	accidental: Graphics
	label: BitmapText
}

export function createNoteGlyph(ink: number): NoteGlyph {
	const container = new Container()
	const glow = new Graphics()
	const head = new Graphics()
	const stem = new Graphics()
	const flag = new Graphics()
	const ledger = new Graphics()
	const accidental = new Graphics()
	// BitmapText, not Text: pre-rasterized glyphs avoid a PixiJS v8 canvas text
	// bug that throws on freshly-created coloured Text nodes.
	const label = new BitmapText({
		text: '',
		style: { fontSize: 12, fontWeight: '800', fill: ink, align: 'center' },
	})
	label.anchor.set(0.5, 0)

	container.addChild(glow, ledger, accidental, head, stem, flag, label)
	return { container, glow, head, stem, flag, ledger, accidental, label }
}

export interface NoteGlyphOptions {
	laneId: string
	// lineGap / 24 — every measurement below was drawn against a 24px gap.
	scale: number
	lineGap: number
	ink: number
	namingSystem: NoteNamingSystem
	// Paints the head something other than its lane colour. By Ear uses it to
	// light a checked note green or red: the verdict has to be the first thing
	// the eye gets, and a small ring around a pastel head is not.
	color?: number
	// Draws a ring around the head without touching its colour. Sprint marks the
	// notes that carry a life this way — the player has to spot one while reading
	// ahead, not discover it after the fact.
	ringColor?: number
	// The flag hangs a long way to the right of the stem. Where notes are written
	// close together — a run of eighths in the Studio — it lands on top of the
	// next note's head, so a dense passage drops it and keeps the stem.
	withFlag?: boolean
}

export function drawNoteGlyph(glyph: NoteGlyph, options: NoteGlyphOptions) {
	const { glow, head, stem, flag, label, accidental } = glyph
	const { laneId, scale: s, ink, namingSystem } = options
	const color = options.color ?? laneColor(laneId)

	label.text = getLaneLabel(laneId, namingSystem)
	label.style.fontSize = Math.max(8, Math.round(11 * s))
	label.y = 15 * s

	glow.clear()
	glow.circle(0, 0, 20 * s).fill({ color, alpha: 0.13 })
	glow.circle(0, 0, 13 * s).fill({ color, alpha: 0.15 })

	// Darker than the dark theme's heads: a pastel notehead that glowed against
	// black disappears against paper. Rim, body and core all step down, and the
	// white specular below stays to keep the 3D read.
	const rim = shade(color, 0.45)
	const body = shade(color, 0.82)
	const core = shade(color, 1.0)
	head.clear()
	head.ellipse(0, 0, 14 * s, 10.5 * s).fill({ color: rim, alpha: 1 })
	head.ellipse(0, 0, 12 * s, 8.8 * s).fill({ color: body, alpha: 1 })
	head.ellipse(-1.5 * s, -2 * s, 9 * s, 5.6 * s).fill({ color: core, alpha: 0.9 })
	head.ellipse(-3 * s, -3.2 * s, 4.6 * s, 2.8 * s).fill({ color: 0xffffff, alpha: 0.42 })

	stem.clear()
	stem.roundRect(10 * s, -36 * s, 3.4 * s, 37 * s, 2 * s).fill({ color: ink, alpha: 0.9 })

	flag.clear()
	if (options.withFlag !== false) {
		flag.moveTo(13.4 * s, -36 * s)
		flag.bezierCurveTo(29 * s, -32 * s, 30 * s, -17 * s, 12 * s, -17 * s)
		flag.stroke({ width: 3.4 * s, color: ink, alpha: 0.8, cap: 'round' })
	}

	if (options.ringColor !== undefined) {
		glow.circle(0, 0, 24 * s).fill({ color: options.ringColor, alpha: 0.16 })
		glow.circle(0, 0, 17 * s).stroke({ width: 2 * s, color: options.ringColor, alpha: 0.9 })
	}

	drawAccidental(accidental, laneId, s, ink)
	drawLedger(glyph.ledger, STAFF_STEPS[laneId] ?? 0, options.lineGap, s, ink)
}

// A sharp shares its staff position with the natural below it — c5 and cs5 are
// both written on the same line. Without the sign in front of the head the two
// are indistinguishable on the staff, and a note-reading game cannot ask the
// player to tell them apart from the text label alone.
export function drawAccidental(graphics: Graphics, laneId: string, s: number, ink: number) {
	graphics.clear()
	if (!laneId.includes('s')) return

	const x = -26 * s
	const arm = 5.6 * s
	const stroke = { width: 1.7 * s, color: ink, alpha: 0.92, cap: 'round' as const }

	// Two uprights, two slightly rising crossbars — the standard ♯ construction.
	graphics.moveTo(x - 2.2 * s, -arm * 1.5)
	graphics.lineTo(x - 2.2 * s, arm * 1.2)
	graphics.moveTo(x + 2.2 * s, -arm * 1.7)
	graphics.lineTo(x + 2.2 * s, arm)
	graphics.stroke(stroke)

	graphics.moveTo(x - 5 * s, -arm * 0.25)
	graphics.lineTo(x + 5 * s, -arm * 0.65)
	graphics.moveTo(x - 5 * s, arm * 0.6)
	graphics.lineTo(x + 5 * s, arm * 0.2)
	graphics.stroke({ ...stroke, width: 2.1 * s })
}

// Ledger lines are geometry, not animation: their offsets from the note head
// depend only on the pitch and the staff spacing. Drawn relative to the head,
// which sits at the glyph's origin, with the staff baseline +step*(gap/2) below.
export function drawLedger(
	ledger: Graphics,
	step: number,
	lineGap: number,
	noteScale: number,
	ink: number
) {
	ledger.clear()

	const baseline = step * (lineGap / 2)
	const topLine = baseline - lineGap * 4
	const halfWidth = 17 * noteScale

	const width = Math.max(2, lineGap * 0.09)

	for (let y = baseline + lineGap; y <= 2; y += lineGap) {
		ledger.moveTo(-halfWidth, y)
		ledger.lineTo(halfWidth, y)
		ledger.stroke({ width, color: ink, alpha: 0.88 })
	}

	for (let y = topLine - lineGap; y >= -2; y -= lineGap) {
		ledger.moveTo(-halfWidth, y)
		ledger.lineTo(halfWidth, y)
		ledger.stroke({ width, color: ink, alpha: 0.88 })
	}
}
