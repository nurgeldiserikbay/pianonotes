export type AppScreen =
	| 'menu'
	| 'campaign-levels'
	| 'records'
	| 'settings'
	| 'gameplay'
	| 'echo'
	| 'tunes'
	| 'composer'
	| 'result'

// 'sprint' is the continuous run through the melodies in campaign order; 'echo'
// is By Ear, where the player hears a phrase and lays it out on the keyboard
// themselves. The old 'time' id is gone with the scrolling engine — it had
// stopped meaning anything — and so is 'practice', the unscored Note Trainer
// drill Sprint took the place of.
export type GameModeId = 'campaign' | 'sprint' | 'echo'
// Every mode keeps records now. The alias stays because storage is keyed by it
// and a mode could stop being scored again.
export type ScoredModeId = GameModeId
export type NoteType = 'tap' | 'hold'
export type Judgement = 'perfect' | 'great' | 'good' | 'miss'
export type ResultBadge = '0' | '1' | '2' | '3' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS' | 'D'
// A melody's character, and at the same time the id of the paper it is played
// on: one concept, one list. Themes used to be handed out by chapter number, so
// a lullaby and a march could look identical while two carols looked different.
export type MelodyMood = 'bright' | 'playful' | 'calm' | 'tender' | 'wistful' | 'solemn'
export type BackgroundPresetId = MelodyMood
export type DifficultyId = 'easy' | 'normal' | 'hard'
// 'level-end' fires when a campaign melody finishes, won or lost; 'sprint-run'
// when a whole run is over; 'echo-round' when a By Ear attempt is graded. Each
// has its own counter in the ad manager, because a level, a run and an attempt
// are three different lengths of play.
export type AdTrigger = 'level-end' | 'sprint-run' | 'echo-round'
export type NoteNamingSystem = 'letters' | 'solfege'

export interface BackgroundPreset {
	id: BackgroundPresetId
	name: string
	uiGradient: string
	stageTop: number[]
	stageBottom: number[]
	glow: number
	wave: number
	accent: string
	// Colour of everything drawn *on* the staff — lines, clef, stems, ledger lines,
	// note names. Notation is ink on paper, so this follows the paper rather than
	// being hardcoded white as it was while the app was dark-only.
	ink: number
}

export interface PianoKeyDefinition {
	id: string
	label: string
	solfegeLabel: string
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
	// Playing this note correctly returns a life. Marked in the chart itself, so
	// it is the same note on every attempt.
	bonusLife?: boolean
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
	targetScore: number
	// Hand-authored levels list pattern ids to build their chart from. Procedural
	// levels omit this (or pass []) and are built from `notePool` instead — see
	// buildProceduralCampaignChart in modes/campaignGenerator.ts.
	patternIds?: string[]
	notePool?: string[]
	allowChords?: boolean
	allowHolds?: boolean
	worldId?: string
	isMilestone?: boolean
	index?: number
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
	// Highlight the key the staff is asking for. On by default — a beginner needs
	// the link between a dot on a line and a key — but anyone who already reads
	// music wants it gone, and until now there was no way to turn it off.
	keyHintsEnabled: boolean
	noteNamingSystem: NoteNamingSystem
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
	// How long the melody took and how evenly it was played — the two numbers a
	// reading-mode record is actually about.
	timeMs?: number
	tempoAccuracy?: number
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
	// Fastest clean-enough run of this melody, in ms — the number the player is
	// chasing on a replay. Null until the melody has been completed once.
	bestTimeMs: number | null
	lastPlayedAt: string | null
	recentRuns: CampaignRunSummary[]
}

// Consecutive days on which the player finished at least one scored run. The
// only "come back tomorrow" hook in the game, so it is tracked honestly: local
// calendar days, broken the moment a day is skipped.
export interface StreakState {
	current: number
	best: number
	// Local calendar date of the last counted run, as YYYY-MM-DD.
	lastPlayedDay: string | null
}

// One tune written in the Studio. Kept structurally identical to a phrase — a
// lane id and a time — so the same staff draws it, the same audio plays it and a
// saved tune could be handed to another mode without conversion.
export interface UserTune {
	id: string
	title: string
	bpm: number
	notes: Array<{ laneId: string; timeMs: number }>
	updatedAt: string
}

export interface StorageSnapshot {
	settings: SettingsState
	campaignProgress: Record<string, CampaignProgress>
	records: Record<ScoredModeId, ModeRecord[]>
	// Lane ids the player has already met in campaign play. Drives the
	// first-time-note tutorial toast.
	notesIntroduced: string[]
	// Melodies answered in By Ear, in no particular order. The mode's own
	// progress: it plays the same library as Campaign but is not the same
	// achievement, so it cannot read campaign progress and must not write it.
	echoCleared: string[]
	// Tunes the player wrote themselves. The only content in the app that is
	// theirs rather than the library's, so it is never derived, migrated away or
	// cleared by anything but their own delete.
	userTunes: UserTune[]
	streak: StreakState
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
	durationSec?: number
	chart: ChartNote[]
	// Lane ids this campaign session introduces for the first time (empty for
	// non-campaign sessions, or once the player has already met every note in the
	// level's world). Read by GameStage.vue to show the first-time tutorial toast.
	newNotes?: string[]
	// Highlight the key the melody is waiting for. On in the first worlds and off
	// in Sprint; withdrawn later, which is how the reading difficulty ramps.
	showKeyHints?: boolean
}

export interface SprintBonusRule {
	// Every Nth note of the melody carries a life. Expressed as a rule rather than
	// a random roll so two runs of the same melody are always identical — a run
	// whose bonuses move around cannot be compared with another one.
	everyNthNote: number
	maxLives: number
}

// One By Ear attempt: a phrase to reproduce and the melody it came from. Not a
// SessionConfig — the mode has no chart to read, no lives and no clock, and
// pretending otherwise would mean carrying four fields that mean nothing.
export interface EchoSessionConfig {
	id: string
	levelId: string
	title: string
	source: string
	bpm: number
	themeId: BackgroundPresetId
	phrase: Array<{ laneId: string; timeMs: number }>
}

// Where the player is against the tempo pacer. Informational only — the pacer
// never fails a round, it just shows whether the melody is being played at the
// speed it was written at.
export type TempoState = 'ahead' | 'on' | 'behind'

export interface HudSnapshot {
	score: number
	combo: number
	lives: number
	accuracy: number
	elapsedSec: number
	// Time left before the round times out.
	remainingSec: number
	maxCombo: number
	misses: number
	perfect: number
	great: number
	good: number
	currentSpeedLabel: string
	notesCompleted: number
	notesTotal: number
	tempoState: TempoState
	// Lane the melody is waiting for, so the keyboard can hint it in early levels.
	nextLaneId: string | null
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
	// Share of beats played within the tempo window, 0..100.
	tempoAccuracy: number
	badge: ResultBadge
	stars?: 0 | 1 | 2 | 3
	survivalTimeSec?: number
	// How long the melody took, and whether the round ended by running out of
	// time rather than by finishing or losing every life.
	timeMs: number
	timedOut: boolean
	completed: boolean
	notesCompleted: number
	notesTotal: number
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
	keyHintsEnabled: true,
	noteNamingSystem: 'letters',
}
