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
}
