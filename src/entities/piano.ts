import type { PianoKeyDefinition } from '@/core/models'

export const PIANO_KEYS: PianoKeyDefinition[] = [
	{ id: 'c4', label: 'C4', audioId: 'do', tone: 'C4', isBlack: false, whiteIndex: 0, color: '#ff6b8a' },
	{ id: 'cs4', label: 'C#4', audioId: 'do_', tone: 'C#4', isBlack: true, whiteIndex: 0, blackOffset: 0.68, color: '#b18cff' },
	{ id: 'd4', label: 'D4', audioId: 're', tone: 'D4', isBlack: false, whiteIndex: 1, color: '#ff9f68' },
	{ id: 'ds4', label: 'D#4', audioId: 're_', tone: 'D#4', isBlack: true, whiteIndex: 1, blackOffset: 0.68, color: '#ffcc66' },
	{ id: 'e4', label: 'E4', audioId: 'mi', tone: 'E4', isBlack: false, whiteIndex: 2, color: '#ffe66d' },
	{ id: 'f4', label: 'F4', audioId: 'fa', tone: 'F4', isBlack: false, whiteIndex: 3, color: '#7be495' },
	{ id: 'fs4', label: 'F#4', audioId: 'fa_', tone: 'F#4', isBlack: true, whiteIndex: 3, blackOffset: 0.68, color: '#43d9bd' },
	{ id: 'g4', label: 'G4', audioId: 'sol', tone: 'G4', isBlack: false, whiteIndex: 4, color: '#59b9ff' },
	{ id: 'gs4', label: 'G#4', audioId: 'sol_', tone: 'G#4', isBlack: true, whiteIndex: 4, blackOffset: 0.68, color: '#4b8dff' },
	{ id: 'a4', label: 'A4', audioId: 'la', tone: 'A4', isBlack: false, whiteIndex: 5, color: '#8c7dff' },
	{ id: 'as4', label: 'A#4', audioId: 'la_', tone: 'A#4', isBlack: true, whiteIndex: 5, blackOffset: 0.68, color: '#c084fc' },
	{ id: 'b4', label: 'B4', audioId: 'si', tone: 'B4', isBlack: false, whiteIndex: 6, color: '#ff6fd8' },
	{ id: 'c5', label: 'C5', audioId: 'do2', tone: 'C5', isBlack: false, whiteIndex: 7, color: '#ff6b8a' },
	{ id: 'cs5', label: 'C#5', audioId: 'do2_', tone: 'C#5', isBlack: true, whiteIndex: 7, blackOffset: 0.68, color: '#b18cff' },
	{ id: 'd5', label: 'D5', audioId: 're2', tone: 'D5', isBlack: false, whiteIndex: 8, color: '#ff9f68' },
	{ id: 'ds5', label: 'D#5', audioId: 're2_', tone: 'D#5', isBlack: true, whiteIndex: 8, blackOffset: 0.68, color: '#ffcc66' },
	{ id: 'e5', label: 'E5', audioId: 'mi2', tone: 'E5', isBlack: false, whiteIndex: 9, color: '#ffe66d' },
	{ id: 'f5', label: 'F5', audioId: 'fa2', tone: 'F5', isBlack: false, whiteIndex: 10, color: '#7be495' },
	{ id: 'fs5', label: 'F#5', audioId: 'fa2_', tone: 'F#5', isBlack: true, whiteIndex: 10, blackOffset: 0.68, color: '#43d9bd' },
	{ id: 'g5', label: 'G5', audioId: 'sol2', tone: 'G5', isBlack: false, whiteIndex: 11, color: '#59b9ff' },
	{ id: 'gs5', label: 'G#5', audioId: 'sol2_', tone: 'G#5', isBlack: true, whiteIndex: 11, blackOffset: 0.68, color: '#4b8dff' },
	{ id: 'a5', label: 'A5', audioId: 'la2', tone: 'A5', isBlack: false, whiteIndex: 12, color: '#8c7dff' },
	{ id: 'as5', label: 'A#5', audioId: 'la2_', tone: 'A#5', isBlack: true, whiteIndex: 12, blackOffset: 0.68, color: '#c084fc' },
	{ id: 'b5', label: 'B5', audioId: 'si2', tone: 'B5', isBlack: false, whiteIndex: 13, color: '#ff6fd8' },
]

export const WHITE_KEYS = PIANO_KEYS.filter((key) => !key.isBlack)
export const BLACK_KEYS = PIANO_KEYS.filter((key) => key.isBlack)

export const PIANO_KEY_MAP = Object.fromEntries(
	PIANO_KEYS.map((key) => [key.id, key])
) as Record<string, PianoKeyDefinition>

export const ENDLESS_ROOTS = ['c4', 'd4', 'e4', 'f4', 'g4', 'a4', 'c5']
