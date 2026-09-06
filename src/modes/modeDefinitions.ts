import type { BackgroundPreset, ModeDescriptor } from '@/core/models'
import { generateCampaignLevels } from '@/modes/campaignGenerator'

// Paper, not neon. The game is about reading notation, and notation is black ink
// on a warm page — that is what every learner's eye is trained on, and small
// glyphs (clef, stems, accidentals) hold far more contrast on paper than glowing
// white lines on near-black. Each chapter tints its page slightly so the campaign
// still has visual variety, but the ink stays dark everywhere.
export const BACKGROUND_PRESETS: Record<BackgroundPreset['id'], BackgroundPreset> = {
	bright: {
		id: 'bright',
		name: 'Sunlit Paper',
		uiGradient: 'linear-gradient(155deg, #fff8ec 0%, #fbeed6 45%, #f5e4c4 100%)',
		stageTop: [0xfffaf0, 0xfaeed8],
		stageBottom: [0xf6e9cf, 0xefe0c0],
		glow: 0xb07515,
		wave: 0xd2872a,
		accent: '#9a6510',
		ink: 0x231b0e,
	},
	playful: {
		id: 'playful',
		name: 'Meadow Paper',
		uiGradient: 'linear-gradient(160deg, #f3fbf5 0%, #e6f5e9 45%, #dcefe1 100%)',
		stageTop: [0xf6fcf8, 0xe8f6ec],
		stageBottom: [0xe2f1e6, 0xd8ebdd],
		glow: 0x2f8f3c,
		wave: 0x6ab04c,
		accent: '#237a2f',
		ink: 0x14211a,
	},
	calm: {
		id: 'calm',
		name: 'Sky Paper',
		uiGradient: 'linear-gradient(145deg, #f4f8ff 0%, #e8eefc 45%, #dfe7f8 100%)',
		stageTop: [0xf7faff, 0xeaf1fd],
		stageBottom: [0xe6edfa, 0xdde6f6],
		glow: 0x2f7de0,
		wave: 0x5b9de8,
		accent: '#2f6fd0',
		ink: 0x172033,
	},
	tender: {
		id: 'tender',
		name: 'Blossom Paper',
		uiGradient: 'linear-gradient(150deg, #fff7fa 0%, #fbecf2 45%, #f5e2ea 100%)',
		stageTop: [0xfffafc, 0xfbeff4],
		stageBottom: [0xf7e9f0, 0xf0dfe8],
		glow: 0xbf5c86,
		wave: 0xd98aa9,
		accent: '#a8446b',
		ink: 0x2a1a21,
	},
	wistful: {
		id: 'wistful',
		name: 'Dusk Paper',
		uiGradient: 'linear-gradient(160deg, #f4f5fa 0%, #e9ebf4 45%, #dfe2ee 100%)',
		stageTop: [0xf6f7fb, 0xebedf6],
		stageBottom: [0xe5e8f2, 0xdbdfec],
		glow: 0x5b5fa8,
		wave: 0x7c7fc0,
		accent: '#4b4f93',
		ink: 0x1b1d2b,
	},
	solemn: {
		id: 'solemn',
		name: 'Ivory Paper',
		uiGradient: 'linear-gradient(155deg, #fffdf6 0%, #f6f1e2 45%, #ece5d1 100%)',
		stageTop: [0xfffef8, 0xf7f2e4],
		stageBottom: [0xf1ebd9, 0xe8e0ca],
		glow: 0x8a6a1f,
		wave: 0xb08c3a,
		accent: '#7a5c15',
		ink: 0x1f1b12,
	},
}

export const MODE_DEFINITIONS: ModeDescriptor[] = [
	{
		id: 'campaign',
		title: 'Campaign',
		subtitle: 'Read and play',
		description: 'Play tunes you already know, earn stars, and unlock the next one.',
		themeId: 'calm',
	},
	{
		id: 'sprint',
		title: 'Sprint',
		subtitle: 'One run, no stops',
		description: 'Melody after melody on one pool of lives, until they run out.',
		themeId: 'bright',
	},
	{
		id: 'echo',
		title: 'By Ear',
		subtitle: 'Hear it, then place it',
		description: 'Listen to a phrase, lay it out on the keys yourself, and see how close you got.',
		themeId: 'bright',
	},
]

// 300-level curriculum campaign: 12 worlds of 25 levels, each teaching one new note
// group or mechanic (see modes/campaignWorlds.ts), difficulty-curved via
// modes/difficultyCurve.ts. The original 6 hand-authored songs are preserved verbatim
// inside modes/campaignGenerator.ts as milestone content — see that file.
export const CAMPAIGN_LEVELS = generateCampaignLevels()

// Sprint: one continuous run through the melodies in campaign order on a single
// pool of lives. It replaces Note Trainer, whose pressure-free drill duplicated
// what Campaign already does at its own pace.
export const SPRINT_CONFIG = {
	lives: 5,
	themeId: 'bright' as const,
	title: 'Sprint',
}

// By Ear. The phrase length lives in features/echo.ts with the scoring that
// depends on it; what belongs here is how the mode picks what to play and how
// often it will hand out the tune for free.
export const ECHO_CONFIG = {
	title: 'By Ear',
	themeId: 'bright' as const,
	// Plays of the phrase included in an attempt. After these the player can
	// still hear it, but the rewarded ad pays for it — the same bargain the
	// Sprint revive offers, in the one place where hearing it again is worth
	// something.
	freeListens: 3,
	// Corrections an attempt allows. Rubbing out is part of writing music down —
	// a wrong note the player hears is a wrong note they should be able to fix —
	// but unlimited rubbing out turns the mode into trial and error against the
	// Check button, so the answer is the third guess rather than what they heard.
	undos: 3,
	clears: 1,
}
