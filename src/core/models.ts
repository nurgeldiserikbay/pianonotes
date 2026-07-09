export type AppScreen =
	| 'menu'
	| 'mode-select'
	| 'campaign-levels'
	| 'records'
	| 'settings'
	| 'gameplay'
	| 'result'

export type GameModeId = 'campaign' | 'time' | 'endless'
export type NoteType = 'tap' | 'hold'
export type Judgement = 'perfect' | 'great' | 'good' | 'miss'
export type ResultBadge = '0' | '1' | '2' | '3' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | 'D'
export type BackgroundPresetId = 'neon' | 'purple-blue' | 'aurora' | 'gold-stage'
export type DifficultyId = 'easy' | 'normal' | 'hard'
export type AdTrigger = 'campaign-progress' | 'defeat'

export interface BackgroundPreset {
	id: BackgroundPresetId
	name: string
	uiGradient: string
	stageTop: number[]
	stageBottom: number[]
	glow: number
	wave: number
	accent: string
}

export interface PianoKeyDefinition {
	id: string
	label: string
	audioId: string
	tone: string
	isBlack: boolean
	whiteIndex: number
	blackOffset?: number
	color: string
}

export interface ChartNote {
	id: string
	laneId: string
	timeMs: number
	durationMs: number
	type: NoteType
	chordId?: string
	consumed?: boolean
}

export interface PatternNoteInput {
	laneId: string
	beat: number
	lengthBeats?: number
	chordId?: string
}

export interface PatternBlock {
	id: string
	label: string
	beats: number
	notes: PatternNoteInput[]
}

export interface CampaignLevel {
	id: string
	title: string
	artist: string
	bpm: number
	difficulty: DifficultyId
	themeId: BackgroundPresetId
	description: string
	patternIds: string[]
	targetScore: number
}

export interface ModeDescriptor {
	id: GameModeId
	title: string
	subtitle: string
	description: string
	themeId: BackgroundPresetId
}

export interface SettingsState {
	soundEnabled: boolean
	musicEnabled: boolean
	showLaneGlow: boolean
	showParticles: boolean
	leftHandedHud: boolean
	adsEnabled: boolean
}

export interface ModeRecord {
	id: string
	modeId: GameModeId
	date: string
	score: number
	accuracy: number
	maxCombo: number
	misses: number
	badge: ResultBadge
	survivalTimeSec?: number
	levelId?: string
	levelTitle?: string
}

export interface CampaignRunSummary extends ModeRecord {
	stars: 0 | 1 | 2 | 3
}

export interface CampaignProgress {
	levelId: string
	bestScore: number
	bestAccuracy: number
	bestCombo: number
	bestStars: 0 | 1 | 2 | 3
	lastPlayedAt: string | null
	recentRuns: CampaignRunSummary[]
}

export interface StorageSnapshot {
	settings: SettingsState
	campaignProgress: Record<string, CampaignProgress>
	records: Record<GameModeId, ModeRecord[]>
}

export interface SessionConfig {
	id: string
	modeId: GameModeId
	modeTitle: string
	levelId?: string
	levelTitle?: string
	bpm: number
	themeId: BackgroundPresetId
	lives: number
	approachMs: number
	durationSec?: number
	chart: ChartNote[]
}

export interface HudSnapshot {
	score: number
	combo: number
	lives: number
	accuracy: number
	elapsedSec: number
	maxCombo: number
	misses: number
	perfect: number
	great: number
	good: number
	currentSpeedLabel: string
	notesCompleted: number
	streak: number
	modeId: GameModeId
}

export interface GameplayResult {
	id: string
	modeId: GameModeId
	levelId?: string
	levelTitle?: string
	score: number
	accuracy: number
	maxCombo: number
	misses: number
	tempoStability: number
	badge: ResultBadge
	stars?: 0 | 1 | 2 | 3
	survivalTimeSec?: number
	notesCompleted: number
	remainingLives: number
	streak: number
	date: string
}

export interface RuntimeJudgementSummary {
	perfect: number
	great: number
	good: number
	miss: number
}

export interface EndlessComposerState {
	seed: number
	lastRootIndex: number
	lastTimeMs: number
	chunkIndex: number
}

export const DEFAULT_SETTINGS: SettingsState = {
	soundEnabled: true,
	musicEnabled: false,
	showLaneGlow: true,
	showParticles: true,
	leftHandedHud: false,
	adsEnabled: true,
}
