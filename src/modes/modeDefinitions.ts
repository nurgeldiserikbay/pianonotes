import type { BackgroundPreset, ModeDescriptor } from '@/core/models'
import { generateCampaignLevels } from '@/modes/campaignGenerator'

export const BACKGROUND_PRESETS: Record<BackgroundPreset['id'], BackgroundPreset> = {
	neon: {
		id: 'neon',
		name: 'Neon Pulse',
		uiGradient: 'linear-gradient(145deg, #22185b 0%, #2d1f72 38%, #0d1735 100%)',
		stageTop: [0x120f2d, 0x1f2354],
		stageBottom: [0x0a0d19, 0x12172a],
		glow: 0x69f0ff,
		wave: 0x8a5cff,
		accent: '#69f0ff',
	},
	'purple-blue': {
		id: 'purple-blue',
		name: 'Purple Blue',
		uiGradient: 'linear-gradient(155deg, #2c1f7a 0%, #4731a6 38%, #13204b 100%)',
		stageTop: [0x1b1a46, 0x33276e],
		stageBottom: [0x101427, 0x18213f],
		glow: 0x82a0ff,
		wave: 0xb081ff,
		accent: '#9db3ff',
	},
	aurora: {
		id: 'aurora',
		name: 'Aurora',
		uiGradient: 'linear-gradient(160deg, #0c3357 0%, #186a7b 40%, #17265a 100%)',
		stageTop: [0x0d2344, 0x176565],
		stageBottom: [0x09111d, 0x0e2034],
		glow: 0x74f7d5,
		wave: 0x5bbcff,
		accent: '#74f7d5',
	},
	'gold-stage': {
		id: 'gold-stage',
		name: 'Gold Stage',
		uiGradient: 'linear-gradient(155deg, #5a3315 0%, #8b5626 45%, #2d1b45 100%)',
		stageTop: [0x3c2814, 0x6d4b1d],
		stageBottom: [0x120f18, 0x261d13],
		glow: 0xffca5f,
		wave: 0xff8b42,
		accent: '#ffd56b',
	},
}

export const MODE_DEFINITIONS: ModeDescriptor[] = [
	{
		id: 'campaign',
		title: 'Campaign',
		subtitle: 'Hit the melody',
		description: 'Play bright, familiar tunes, earn stars, and unlock the next song.',
		themeId: 'purple-blue',
	},
	{
		id: 'time',
		title: 'Time Mode',
		subtitle: 'Race the melody',
		description: 'Clear the full melody as fast as you can, but seven wrong keys end the run.',
		themeId: 'aurora',
	},
	{
		id: 'endless',
		title: 'Endless',
		subtitle: 'Melodic rush',
		description: 'Survive a nonstop stream of musical patterns as the pace and pressure rise.',
		themeId: 'neon',
	},
]

// 300-level curriculum campaign: 12 worlds of 25 levels, each teaching one new note
// group or mechanic (see modes/campaignWorlds.ts), difficulty-curved via
// modes/difficultyCurve.ts. The original 6 hand-authored songs are preserved verbatim
// inside modes/campaignGenerator.ts as milestone content — see that file.
export const CAMPAIGN_LEVELS = generateCampaignLevels()

export const TIME_MODE_CONFIG = {
	bpm: 108,
	lives: 7,
	themeId: 'aurora' as const,
	title: 'Time Mode',
}

export const ENDLESS_MODE_CONFIG = {
	// Was 104 — nearly as fast as the campaign's late-game tempo right from note one.
	// Starts gentle now and ramps up live (see RhythmGame.updateMovingDifficulty).
	bpmStart: 82,
	bpmMax: 158,
	lives: 5,
	themeId: 'neon' as const,
	title: 'Endless',
}
