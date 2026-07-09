import { Application, Container, Graphics } from 'pixi.js'

import type {
	ChartNote,
	GameplayResult,
	HudSnapshot,
	Judgement,
	SessionConfig,
	SettingsState,
} from '@/core/models'
import { PIANO_KEY_MAP } from '@/entities/piano'
import {
	MOVING_JUDGEMENT_WINDOWS,
	TIME_RESPONSE_WINDOWS,
	buildResultBadge,
	buildSpeedLabel,
	createEmptyHud,
	getAccuracy,
	getCampaignStars,
	getScoreGain,
	getTempoStability,
} from '@/features/scoring'
import { appendEndlessChunk, createEndlessState } from '@/game/patterns'
import { BACKGROUND_PRESETS, ENDLESS_MODE_CONFIG } from '@/modes/modeDefinitions'
import { audioService } from '@/services/audioService'

interface NoteView {
	note: ChartNote
	container: Container
	glow: Graphics
	trail: Graphics
	head: Graphics
	stem: Graphics
	flag: Graphics
	ledger: Graphics
	active: boolean
	colorNumber: number
	holdWidth: number
	holding?: boolean
	holdJudgement?: Judgement
	resolveAnimation?: {
		type: 'hit' | 'miss'
		startMs: number
		durationMs: number
		originX: number
		originY: number
	}
}

interface Particle {
	x: number
	y: number
	vx: number
	vy: number
	life: number
	color: number
	radius: number
}

interface RhythmGameCallbacks {
	onHud: (snapshot: HudSnapshot) => void
	onFinish: (result: GameplayResult) => void
	onFlash: (label: string, color: string) => void
}

const STAFF_STEPS: Record<string, number> = {
	c4: -2,
	cs4: -2,
	d4: -1,
	ds4: -1,
	e4: 0,
	f4: 1,
	fs4: 1,
	g4: 2,
	gs4: 2,
	a4: 3,
	as4: 3,
	b4: 4,
	c5: 5,
	cs5: 5,
	d5: 6,
	ds5: 6,
	e5: 7,
	f5: 8,
	fs5: 8,
	g5: 9,
	gs5: 9,
	a5: 10,
	as5: 10,
	b5: 11,
}

export class RhythmGame {
	private readonly app = new Application()
	private readonly root = new Container()
	private readonly backgroundLayer = new Graphics()
	private readonly ornamentLayer = new Graphics()
	private readonly staffLayer = new Graphics()
	private readonly notesLayer = new Container()
	private readonly particlesLayer = new Graphics()
	private readonly feedbackLayer = new Container()
	private readonly noteViews = new Map<string, NoteView>()
	private readonly holdMap = new Map<string, NoteView>()
	private readonly activeKeys = new Set<string>()
	private readonly particles: Particle[] = []
	private readonly hitOffsets: number[] = []
	private readonly callbacks: RhythmGameCallbacks
	private readonly session: SessionConfig
	private readonly theme: (typeof BACKGROUND_PRESETS)[keyof typeof BACKGROUND_PRESETS]
	private settings: SettingsState

	private endlessState = createEndlessState()
	private mounted = false
	private paused = false
	private completed = false
	private startAt = 0
	private pausedAt = 0
	private pauseOffset = 0

	private width = 0
	private height = 0
	private staffLeftX = 0
	private staffRightX = 0
	private hitX = 0
	private spawnX = 0
	private staffTopY = 0
	private bottomLineY = 0
	private lineGap = 18
	private noteYMap: Record<string, number> = {}

	private score = 0
	private combo = 0
	private maxCombo = 0
	private remainingLives = 0
	private notesCompleted = 0
	private misses = 0
	private bestStreak = 0
	private currentBpm = 0
	private currentApproachMs = 0
	private timeModeIndex = 0
	private timeModeNoteShownAt = 0
	private lastHudSignature = ''
	private judgementSummary = {
		perfect: 0,
		great: 0,
		good: 0,
		miss: 0,
	}

	constructor(
		private readonly host: HTMLElement,
		session: SessionConfig,
		settings: SettingsState,
		callbacks: RhythmGameCallbacks
	) {
		this.session = {
			...session,
			chart: session.chart.map((note) => ({ ...note })),
		}
		this.settings = settings
		this.callbacks = callbacks
		this.theme = BACKGROUND_PRESETS[session.themeId]
		this.currentBpm = session.bpm
		this.currentApproachMs = session.approachMs
		this.remainingLives = session.lives
	}

	async init() {
		if (this.mounted) return

		await this.app.init({
			resizeTo: this.host,
			backgroundAlpha: 0,
			antialias: true,
			autoDensity: true,
			resolution: Math.max(window.devicePixelRatio || 1, 1),
		})

		audioService.setEnabled(this.settings.soundEnabled)
		audioService.preload()

		this.host.innerHTML = ''
		this.host.appendChild(this.app.canvas)
		this.app.stage.addChild(this.root)
		this.root.addChild(
			this.backgroundLayer,
			this.ornamentLayer,
			this.staffLayer,
			this.notesLayer,
			this.particlesLayer,
			this.feedbackLayer
		)

		this.resize()
		if (this.session.modeId === 'endless' && !this.session.chart.length) {
			this.endlessState.lastTimeMs = this.currentApproachMs + 1000
			this.extendEndlessChart()
		}
		this.registerNotes(this.session.chart)

		this.startAt = performance.now()
		this.timeModeNoteShownAt = 0
		this.emitHud(0, true)
		this.app.ticker.add(this.update)
		this.mounted = true
	}

	destroy() {
		if (!this.mounted) return
		this.app.ticker.remove(this.update)
		this.app.destroy(true, { children: true })
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
		this.settings = settings
	}

	resize() {
		this.width = this.host.clientWidth
		this.height = this.host.clientHeight
		this.lineGap = Math.max(15, Math.min(24, this.height * 0.052))
		this.staffLeftX = Math.max(84, this.width * 0.1)
		this.hitX = this.staffLeftX + Math.max(18, this.width * 0.02)
		this.staffRightX = this.width - Math.max(56, this.width * 0.055)
		this.spawnX = this.width + Math.max(72, this.width * 0.08)
		this.staffTopY = Math.max(58, this.height * 0.16)
		this.bottomLineY = this.staffTopY + this.lineGap * 4
		this.noteYMap = Object.fromEntries(
			Object.entries(STAFF_STEPS).map(([laneId, step]) => [
				laneId,
				this.bottomLineY - step * (this.lineGap / 2),
			])
		)

		this.drawBackground(0)
		this.drawStaff()
		this.rebuildNoteGeometry()
	}

	pressKey(laneId: string) {
		if (this.completed) return
		this.activeKeys.add(laneId)
		audioService.setEnabled(this.settings.soundEnabled)
		audioService.playLane(laneId)

		if (this.session.modeId === 'time') {
			this.handleTimeModePress(laneId)
			return
		}

		const noteView = this.findFrontPressableNote(laneId)
		if (!noteView) return

		const elapsedMs = this.getElapsedMs()
		const deltaMs = elapsedMs - noteView.note.timeMs
		const judgement = this.getMovingPressJudgement(deltaMs)
		if (judgement === 'miss') return

		if (noteView.note.type === 'hold') {
			noteView.holding = true
			noteView.holdJudgement = judgement
			this.holdMap.set(laneId, noteView)
			this.flash(judgement)
			return
		}

		this.consumeNote(noteView, judgement, deltaMs)
	}

	releaseKey(laneId: string) {
		this.activeKeys.delete(laneId)
		const holding = this.holdMap.get(laneId)
		if (!holding) return

		const elapsedMs = this.getElapsedMs()
		if (elapsedMs + 70 < holding.note.timeMs + holding.note.durationMs) {
			this.failNote(holding)
		}
	}

	private readonly update = () => {
		if (this.completed || this.paused) return

		const elapsedMs = this.getElapsedMs()
		if (this.session.modeId !== 'time') {
			this.updateMovingDifficulty(elapsedMs)
		}

		this.drawBackground(elapsedMs)
		this.updateNotes(elapsedMs)
		this.updateParticles()
		this.updateFeedback(elapsedMs)
		this.emitHud(elapsedMs)
		this.checkFinish(elapsedMs)
	}

	private getElapsedMs() {
		return performance.now() - this.startAt - this.pauseOffset
	}

	private easeProgress(value: number) {
		const clamped = Math.max(0, Math.min(1, value))
		return clamped * clamped * (3 - 2 * clamped)
	}

	private buildHud(elapsedMs = this.getElapsedMs()): HudSnapshot {
		const accuracy = getAccuracy(this.judgementSummary)
		return {
			...createEmptyHud(this.session.modeId),
			score: this.score,
			combo: this.combo,
			lives: this.remainingLives,
			accuracy,
			elapsedSec: elapsedMs / 1000,
			maxCombo: this.maxCombo,
			misses: this.misses,
			perfect: this.judgementSummary.perfect,
			great: this.judgementSummary.great,
			good: this.judgementSummary.good,
			currentSpeedLabel: buildSpeedLabel(this.session.modeId, this.currentBpm, this.currentApproachMs),
			notesCompleted: this.notesCompleted,
			streak: this.bestStreak,
			modeId: this.session.modeId,
		}
	}

	private emitHud(elapsedMs: number, force = false) {
		const snapshot = this.buildHud(elapsedMs)
		const signature = [
			snapshot.score,
			snapshot.combo,
			snapshot.lives,
			snapshot.accuracy,
			snapshot.maxCombo,
			snapshot.misses,
			snapshot.perfect,
			snapshot.great,
			snapshot.good,
			snapshot.notesCompleted,
			snapshot.streak,
			snapshot.currentSpeedLabel,
			Math.floor(snapshot.elapsedSec * 4),
		].join('|')

		if (!force && signature === this.lastHudSignature) {
			return
		}

		this.lastHudSignature = signature
		this.callbacks.onHud(snapshot)
	}

	private drawBackground(elapsedMs: number) {
		this.backgroundLayer.clear()
		this.backgroundLayer.rect(0, 0, this.width, this.height).fill({
			color: this.theme.stageTop[0],
		})
		this.backgroundLayer.rect(0, this.height * 0.48, this.width, this.height * 0.52).fill({
			color: this.theme.stageBottom[1],
			alpha: 0.96,
		})

		this.ornamentLayer.clear()
		this.ornamentLayer.circle(this.width * 0.16, this.height * 0.18, this.height * 0.24).fill({
			color: this.theme.glow,
			alpha: 0.14,
		})
		this.ornamentLayer.circle(this.width * 0.86, this.height * 0.26, this.height * 0.3).fill({
			color: this.theme.wave,
			alpha: 0.13,
		})
		this.ornamentLayer.roundRect(this.width * 0.24, this.height * 0.08, this.width * 0.44, this.height * 0.08, 28).fill({
			color: 0xffffff,
			alpha: 0.05,
		})

		const waveY = this.height * 0.34
		for (let band = 0; band < 3; band += 1) {
			const alpha = 0.12 - band * 0.02
			const offsetY = band * 18
			this.ornamentLayer.moveTo(0, waveY + offsetY)
			for (let x = 0; x <= this.width; x += 20) {
				const y = waveY + offsetY + Math.sin(x / 92 + elapsedMs / 780 + band) * (10 + band * 3)
				this.ornamentLayer.lineTo(x, y)
			}
			this.ornamentLayer.stroke({
				width: 2,
				color: band === 1 ? this.theme.glow : this.theme.wave,
				alpha,
			})
		}
	}

	private drawStaff() {
		this.staffLayer.clear()

		for (let line = 0; line < 5; line += 1) {
			const y = this.staffTopY + line * this.lineGap
			this.staffLayer.moveTo(this.staffLeftX, y)
			this.staffLayer.lineTo(this.staffRightX, y)
			this.staffLayer.stroke({
				width: 2,
				color: 0xffffff,
				alpha: 0.34,
			})
		}

		this.staffLayer.roundRect(this.hitX - 6, this.staffTopY - this.lineGap, 12, this.lineGap * 6, 8).fill({
			color: this.theme.glow,
			alpha: 0.8,
		})
		this.staffLayer.roundRect(this.hitX - 22, this.bottomLineY + this.lineGap * 1.45, 28, 10, 8).fill({
			color: this.theme.glow,
			alpha: 0.95,
		})
		this.staffLayer.circle(this.hitX - 12, this.bottomLineY + this.lineGap * 1.5, 12).fill({
			color: this.theme.glow,
			alpha: 0.16,
		})
	}

	private registerNotes(notes: ChartNote[]) {
		notes.forEach((note) => {
			if (this.noteViews.has(note.id)) return

			const container = new Container()
			const glow = new Graphics()
			const trail = new Graphics()
			const head = new Graphics()
			const stem = new Graphics()
			const flag = new Graphics()
			const ledger = new Graphics()

			container.addChild(glow, trail, head, stem, flag, ledger)
			this.notesLayer.addChild(container)

			this.noteViews.set(note.id, {
				note,
				container,
				glow,
				trail,
				head,
				stem,
				flag,
				ledger,
				active: true,
				colorNumber: 0,
				holdWidth: 0,
			})

			const noteView = this.noteViews.get(note.id)
			if (noteView) {
				this.buildNoteGeometry(noteView)
			}
		})
	}

	private getLaneColorNumber(laneId: string) {
		const color = PIANO_KEY_MAP[laneId]?.color ?? '#69f0ff'
		return Number(`0x${color.replace('#', '')}`)
	}

	private getBaseHoldWidth(note: ChartNote) {
		if (note.type !== 'hold') return 0
		return Math.max(
			36,
			(note.durationMs / Math.max(this.session.approachMs, 1)) *
				(this.spawnX - this.hitX)
		)
	}

	private buildNoteGeometry(noteView: NoteView) {
		const { note, glow, trail, head, stem, flag, ledger } = noteView
		const colorNumber = this.getLaneColorNumber(note.laneId)
		const y = this.noteYMap[note.laneId] ?? this.bottomLineY
		const holdWidth = this.getBaseHoldWidth(note)

		noteView.colorNumber = colorNumber
		noteView.holdWidth = holdWidth

		glow.clear()
		glow.circle(0, 0, 20).fill({ color: colorNumber, alpha: 0.18 })

		trail.clear()
		if (holdWidth > 0) {
			trail.roundRect(2, -7, holdWidth, 14, 10).fill({
				color: colorNumber,
				alpha: 0.26,
			})
		}

		head.clear()
		head.ellipse(0, 0, 14, 10).fill({ color: colorNumber, alpha: 0.96 })
		head.ellipse(-2, -2, 10, 6).fill({ color: 0xffffff, alpha: 0.18 })

		stem.clear()
		stem.roundRect(11, -38, 4, 39, 2).fill({ color: 0xffffff, alpha: 0.95 })

		flag.clear()
		flag.moveTo(15, -38)
		flag.bezierCurveTo(31, -34, 32, -18, 14, -18)
		flag.stroke({
			width: 4,
			color: note.type === 'hold' ? colorNumber : 0xffffff,
			alpha: 0.88,
			cap: 'round',
		})

		ledger.clear()
		this.drawLedgerLines(ledger, y)
	}

	private rebuildNoteGeometry() {
		this.noteViews.forEach((noteView) => {
			this.buildNoteGeometry(noteView)
		})
	}

	private updateNotes(elapsedMs: number) {
		this.noteViews.forEach((noteView) => {
			if (!noteView.active) return

			if (noteView.resolveAnimation) {
				this.renderResolvedNote(noteView, elapsedMs)
				return
			}

			if (this.session.modeId === 'time') {
				this.renderTimeModeNote(noteView, elapsedMs)
			} else {
				this.renderScrollingNote(noteView, elapsedMs)
			}

			if (noteView.holding && elapsedMs >= noteView.note.timeMs + noteView.note.durationMs) {
				this.completeHold(noteView)
				return
			}

			if (
				this.session.modeId !== 'time' &&
				!noteView.note.consumed &&
				!noteView.holding &&
				elapsedMs - noteView.note.timeMs > MOVING_JUDGEMENT_WINDOWS.good + 30
			) {
				this.failNote(noteView)
			}
		})
	}

	private renderScrollingNote(noteView: NoteView, elapsedMs: number) {
		const progress = 1 - (noteView.note.timeMs - elapsedMs) / this.currentApproachMs
		const clamped = Math.max(-0.18, progress)
		const x = this.spawnX - clamped * (this.spawnX - this.hitX)
		const y = this.noteYMap[noteView.note.laneId] ?? this.bottomLineY
		const alpha = Math.max(0, Math.min(1, (progress + 0.18) / 0.18))
		noteView.container.visible = !noteView.note.consumed && progress > -0.18
		this.renderNote(noteView, x, y, 1, alpha)
	}

	private renderTimeModeNote(noteView: NoteView, elapsedMs: number) {
		const current = this.session.chart[this.timeModeIndex]
		const isVisible = current?.id === noteView.note.id
		noteView.container.visible = isVisible
		if (!isVisible) return

		const staffWidth = this.staffRightX - this.staffLeftX
		const entryX = this.spawnX
		const startX = this.staffRightX - Math.max(42, staffWidth * 0.05)
		const touchLeftLineX = this.hitX + 20
		const maxSteps = Math.max(this.session.lives, 1)
		const penaltyProgress = Math.min(this.misses, maxSteps) / maxSteps
		const targetX = startX - (startX - touchLeftLineX) * penaltyProgress
		const shownForMs = Math.max(0, elapsedMs - this.timeModeNoteShownAt)
		const enterProgress = Math.min(1, shownForMs / 220)
		const x = entryX + (targetX - entryX) * this.easeProgress(enterProgress)
		const y = this.noteYMap[noteView.note.laneId] ?? this.bottomLineY
		const pulse = 1 + Math.sin(elapsedMs / 150) * 0.06
		this.renderNote(noteView, x, y, pulse)
	}

	private renderNote(noteView: NoteView, x: number, y: number, scale = 1, alpha = 1) {
		const { note, container, glow, trail } = noteView

		container.visible = container.visible && (!note.consumed || Boolean(noteView.resolveAnimation))
		container.x = x
		container.y = y
		container.scale.set(scale)
		container.alpha = alpha
		container.rotation = 0
		glow.visible = this.settings.showLaneGlow
		trail.visible = noteView.holdWidth > 0
	}

	private drawLedgerLines(graphics: Graphics, y: number) {
		const topLineY = this.staffTopY
		const bottomLineY = this.bottomLineY
		const maxY = bottomLineY + this.lineGap
		const minY = topLineY - this.lineGap

		for (let ledgerY = bottomLineY + this.lineGap; ledgerY <= y + 2; ledgerY += this.lineGap) {
			if (ledgerY <= maxY) {
				graphics.moveTo(-18, ledgerY - y)
				graphics.lineTo(18, ledgerY - y)
				graphics.stroke({ width: 2, color: 0xffffff, alpha: 0.36 })
			}
		}

		for (let ledgerY = topLineY - this.lineGap; ledgerY >= y - 2; ledgerY -= this.lineGap) {
			if (ledgerY >= minY) {
				graphics.moveTo(-18, ledgerY - y)
				graphics.lineTo(18, ledgerY - y)
				graphics.stroke({ width: 2, color: 0xffffff, alpha: 0.36 })
			}
		}
	}

	private isScrollingNoteVisible(noteView: NoteView, elapsedMs: number) {
		const progress = 1 - (noteView.note.timeMs - elapsedMs) / Math.max(this.currentApproachMs, 1)
		return progress > -0.18
	}

	private isSameFrontGroup(candidate: NoteView, lead: NoteView) {
		if (candidate.note.id === lead.note.id) return true
		if (candidate.note.chordId && lead.note.chordId) {
			return candidate.note.chordId === lead.note.chordId
		}
		return Math.abs(candidate.note.timeMs - lead.note.timeMs) <= 1
	}

	private findFrontPressableNote(laneId: string) {
		const elapsedMs = this.getElapsedMs()
		let lead: NoteView | null = null

		this.noteViews.forEach((noteView) => {
			if (
				!noteView.active ||
				noteView.note.consumed ||
				noteView.holding ||
				noteView.resolveAnimation ||
				!this.isScrollingNoteVisible(noteView, elapsedMs)
			) {
				return
			}

			if (!lead || noteView.note.timeMs < lead.note.timeMs) {
				lead = noteView
			}
		})

		if (!lead) return null

		let match: NoteView | null = null
		this.noteViews.forEach((noteView) => {
			if (
				!noteView.active ||
				noteView.note.consumed ||
				noteView.holding ||
				noteView.resolveAnimation ||
				!this.isSameFrontGroup(noteView, lead) ||
				noteView.note.laneId !== laneId
			) {
				return
			}

			match = noteView
		})

		return match
	}

	private getMovingPressJudgement(deltaMs: number): Judgement {
		const distance = Math.abs(deltaMs)
		if (distance <= MOVING_JUDGEMENT_WINDOWS.perfect) return 'perfect'
		if (distance <= MOVING_JUDGEMENT_WINDOWS.great) return 'great'
		if (deltaMs <= MOVING_JUDGEMENT_WINDOWS.good) return 'good'
		return 'miss'
	}

	private handleTimeModePress(laneId: string) {
		const note = this.session.chart[this.timeModeIndex]
		if (!note) return

		if (note.laneId !== laneId) {
			this.registerMiss()
			this.flash('miss')
			return
		}

		const responseMs = this.getElapsedMs() - this.timeModeNoteShownAt
		const judgement = this.getTimeModeResponseJudgement(responseMs)
		const noteView = this.noteViews.get(note.id)
		if (!noteView) return
		this.consumeTimeNote(noteView, judgement, responseMs)
	}

	private getTimeModeResponseJudgement(responseMs: number): Exclude<Judgement, 'miss'> {
		if (responseMs <= TIME_RESPONSE_WINDOWS.perfect) return 'perfect'
		if (responseMs <= TIME_RESPONSE_WINDOWS.great) return 'great'
		return 'good'
	}

	private consumeTimeNote(noteView: NoteView, judgement: Judgement, deltaMs: number) {
		noteView.note.consumed = true
		noteView.holding = false
		this.startResolveAnimation(noteView, 'hit')
		this.timeModeIndex += 1
		this.timeModeNoteShownAt = this.getElapsedMs()
		this.registerHit(judgement, deltaMs)
		this.emitParticles(noteView.container.x, noteView.container.y, noteView.note.laneId)
		this.flash(judgement)
	}

	private consumeNote(noteView: NoteView, judgement: Judgement, deltaMs: number) {
		noteView.note.consumed = true
		noteView.holding = false
		this.startResolveAnimation(noteView, 'hit')
		this.registerHit(judgement, deltaMs)
		this.emitParticles(noteView.container.x, noteView.container.y, noteView.note.laneId)
		this.flash(judgement)
	}

	private completeHold(noteView: NoteView) {
		if (!this.activeKeys.has(noteView.note.laneId)) {
			this.failNote(noteView)
			return
		}

		this.holdMap.delete(noteView.note.laneId)
		this.consumeNote(
			noteView,
			noteView.holdJudgement ?? 'good',
			this.getElapsedMs() - noteView.note.timeMs
		)
	}

	private failNote(noteView: NoteView) {
		if (noteView.note.consumed) return
		noteView.note.consumed = true
		noteView.holding = false
		this.holdMap.delete(noteView.note.laneId)
		this.startResolveAnimation(noteView, 'miss')
		this.registerMiss()
		this.emitParticles(noteView.container.x || this.hitX, noteView.container.y || this.bottomLineY, noteView.note.laneId)
		this.flash('miss')
	}

	private startResolveAnimation(noteView: NoteView, type: 'hit' | 'miss') {
		noteView.resolveAnimation = {
			type,
			startMs: this.getElapsedMs(),
			durationMs: type === 'hit' ? 240 : 320,
			originX: noteView.container.x || this.hitX,
			originY: noteView.container.y || this.bottomLineY,
		}
		noteView.container.visible = true
	}

	private renderResolvedNote(noteView: NoteView, elapsedMs: number) {
		const animation = noteView.resolveAnimation
		if (!animation) return

		const progress = Math.max(
			0,
			Math.min(1, (elapsedMs - animation.startMs) / Math.max(animation.durationMs, 1))
		)

		if (progress >= 1) {
			noteView.resolveAnimation = undefined
			this.releaseNoteView(noteView)
			return
		}

		if (animation.type === 'hit') {
			this.renderNote(
				noteView,
				animation.originX - progress * 48,
				animation.originY - progress * 24,
				1 + progress * 0.18,
				1 - progress
			)
			noteView.container.rotation = progress * 0.14
			return
		}

		this.renderNote(
			noteView,
			animation.originX - progress * 16,
			animation.originY + Math.sin(progress * Math.PI) * 6,
			1 - progress * 0.08,
			1 - progress
		)
		noteView.container.rotation = -progress * 0.12
	}

	// Fully retire a resolved note: detach and destroy its Pixi container and drop it
	// from the per-frame map. Without this, endless mode accumulates note views forever,
	// growing the update loop and GPU memory unbounded. Safe to delete the current key
	// mid-forEach: Map iteration skips entries removed during iteration.
	private releaseNoteView(noteView: NoteView) {
		noteView.active = false
		this.holdMap.delete(noteView.note.laneId)
		this.notesLayer.removeChild(noteView.container)
		noteView.container.destroy({ children: true })
		this.noteViews.delete(noteView.note.id)
	}

	private registerHit(judgement: Judgement, deltaMs: number) {
		this.judgementSummary[judgement] += 1
		this.notesCompleted += 1
		this.combo += 1
		this.maxCombo = Math.max(this.maxCombo, this.combo)
		this.bestStreak = Math.max(this.bestStreak, this.combo)
		this.score += getScoreGain(judgement, this.combo)
		this.hitOffsets.push(deltaMs)
	}

	private registerMiss() {
		this.judgementSummary.miss += 1
		this.combo = 0
		this.remainingLives -= 1
		this.misses += 1
	}

	private emitParticles(x: number, y: number, laneId: string) {
		if (!this.settings.showParticles) return
		const color = Number(`0x${(PIANO_KEY_MAP[laneId]?.color ?? '#ffffff').replace('#', '')}`)
		for (let index = 0; index < 16; index += 1) {
			this.particles.push({
				x,
				y,
				vx: (Math.random() - 0.5) * 4.8,
				vy: (Math.random() - 0.7) * 3.6,
				life: 1,
				color,
				radius: Math.random() * 3.4 + 1.8,
			})
		}
	}

	private updateParticles() {
		this.particlesLayer.clear()
		this.particles.forEach((particle) => {
			particle.x += particle.vx
			particle.y += particle.vy
			particle.vy += 0.08
			particle.life -= 0.025
			if (particle.life <= 0) return

			this.particlesLayer.circle(particle.x, particle.y, particle.radius).fill({
				color: particle.color,
				alpha: particle.life,
			})
		})

		for (let index = this.particles.length - 1; index >= 0; index -= 1) {
			if (this.particles[index].life <= 0) {
				this.particles.splice(index, 1)
			}
		}
	}

	private flash(judgement: Judgement) {
		const palette: Record<Judgement, { label: string; color: string }> = {
			perfect: { label: 'Perfect', color: '#9ce7ff' },
			great: { label: 'Great', color: '#93f0b8' },
			good: { label: 'Good', color: '#ffd970' },
			miss: { label: 'Miss', color: '#ff8ca1' },
		}
		this.callbacks.onFlash(palette[judgement].label, palette[judgement].color)
	}

	private updateFeedback(elapsedMs: number) {
		this.feedbackLayer.children.forEach((child) => {
			child.y -= 0.25
			child.alpha -= 0.022
		})

		for (let index = this.feedbackLayer.children.length - 1; index >= 0; index -= 1) {
			if (this.feedbackLayer.children[index].alpha <= 0) {
				this.feedbackLayer.removeChildAt(index)
			}
		}
	}

	private updateMovingDifficulty(elapsedMs: number) {
		if (this.session.modeId === 'campaign') {
			const lastNoteTime = this.session.chart[this.session.chart.length - 1]?.timeMs ?? 1
			const progress = this.easeProgress(elapsedMs / Math.max(lastNoteTime, 1))
			const targetApproachMs = Math.max(
				1400,
				this.session.approachMs - Math.min(1650, this.session.approachMs * 0.1)
			)
			this.currentApproachMs =
				this.session.approachMs - (this.session.approachMs - targetApproachMs) * progress
			this.currentBpm = this.session.bpm
			return
		}

		const progress = this.easeProgress(elapsedMs / 180000)
		this.currentBpm =
			ENDLESS_MODE_CONFIG.bpmStart +
			(ENDLESS_MODE_CONFIG.bpmMax - ENDLESS_MODE_CONFIG.bpmStart) * progress
		this.currentApproachMs = Math.max(1600, this.session.approachMs - progress * 1400)

		const futureNotes = this.session.chart.filter((note) => !note.consumed && note.timeMs > elapsedMs - 200)
		const furthest = futureNotes[futureNotes.length - 1]?.timeMs ?? 0
		if (furthest - elapsedMs < this.currentApproachMs * 2.8) {
			this.extendEndlessChart(progress)
		}
	}

	private extendEndlessChart(progress = 0) {
		const notes = appendEndlessChunk(this.endlessState, progress, this.currentBpm || this.session.bpm)
		this.session.chart.push(...notes)
		this.registerNotes(notes)
	}

	private checkFinish(elapsedMs: number) {
		if (this.remainingLives <= 0) {
			this.finish()
			return
		}

		if (this.session.modeId === 'time') {
			if (this.timeModeIndex >= this.session.chart.length) {
				this.finish()
			}
			return
		}

		if (this.session.modeId === 'campaign') {
			const allConsumed = this.session.chart.every((note) => note.consumed)
			const passedLastNote = elapsedMs > (this.session.chart[this.session.chart.length - 1]?.timeMs ?? 0) + 1200
			if (allConsumed && passedLastNote) {
				this.finish()
			}
		}
	}

	private finish() {
		if (this.completed) return
		this.completed = true

		const elapsedSec = this.getElapsedMs() / 1000
		const accuracy = getAccuracy(this.judgementSummary)
		const tempoStability = getTempoStability(this.hitOffsets)
		const stars =
			this.session.modeId === 'campaign'
				? getCampaignStars(accuracy, this.misses, tempoStability)
				: undefined

		const baseResult = {
			id: `${this.session.id}-result`,
			modeId: this.session.modeId,
			levelId: this.session.levelId,
			levelTitle: this.session.levelTitle,
			score: this.score,
			accuracy,
			maxCombo: this.maxCombo,
			misses: this.misses,
			tempoStability,
			stars,
			survivalTimeSec:
				this.session.modeId === 'campaign' ? undefined : Number(elapsedSec.toFixed(1)),
			notesCompleted: this.notesCompleted,
			remainingLives: this.remainingLives,
			streak: this.bestStreak,
			date: new Date().toISOString(),
		}

		const result: GameplayResult = {
			...baseResult,
			badge: buildResultBadge(baseResult),
		}

		this.emitHud(elapsedSec * 1000, true)
		this.callbacks.onFinish(result)
	}
}
