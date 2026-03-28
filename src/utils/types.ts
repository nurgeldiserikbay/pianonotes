export type TYPE_PAGES = 'START'

export interface IKeyCode {
	char: string
	color: string
	note: string[]
	audio: string
	active: boolean
}

export interface IKeyCodes {
	[key: number]: IKeyCode
}

export interface INote {
	name: string
	x: number
	color: string
	// Анимации
	animation?: {
		type: 'spawn' | 'perfect' | 'fail' | 'combo'
		startTime: number
		duration: number
		progress: number  // 0-1
	}
	scale?: number
	alpha?: number
	// Для perfect/combo системы
	isPerfect?: boolean
}
