<script lang="ts" setup>
import {
	ref,
	useTemplateRef,
	computed,
	watch,
	onMounted,
	onBeforeUnmount,
} from 'vue'
import { Capacitor } from '@capacitor/core'

import { NOTES } from '@/consts/notes.ts'

import Admob from '@/utils/admob'
import { IKeyCode, INote } from '@/utils/types'
import { KEYS } from '@/consts/keys'
import { useAdsStore } from '@/store/adsStore'

import { Particle } from './game'

const LINES_COLORS = ['#02D5FF', '#C84BFF', '#0BFFDD', '#C3FF18', '#13CAFF']

const $props = defineProps<{
	activeKeys?: IKeyCode[]
}>()

const $emits = defineEmits(['wrong'])

const scale = window.devicePixelRatio
const MS_HOUR = 60 * 60 * 10
const MS_MIN = 60 * 10
const MS_SEC = 10
const LIFE = 10
const SPEED = 1
const ACCELERATION = Math.floor(window.innerWidth * 0.0004 * 100) / 100

const COLORS: string[] = ['#ff7675', '#fdcb6e', '#74b9ff', '#a29bfe', '#00cec9']

const adsStore = useAdsStore()

const timers: { [key: string]: ReturnType<typeof setInterval> } = {}
const canvas = useTemplateRef('canvas')
const ctx = ref<CanvasRenderingContext2D | null>(null)
const width = ref(0)
const height = ref(0)
const NOTE_COUNT = 8
const noteLineDistance = computed(() => {
	return Math.floor(height.value / NOTE_COUNT)
})
const topOffsetHeight = computed(() => {
	return (height.value - NOTE_COUNT * noteLineDistance.value) / 2
})
const linePos = ref<number[]>([])
const claveImg = useTemplateRef('claveImg')
const border = ref(0)
const notePos = ref<{ [key: string]: number }>({})
const started = ref(false)
const time = ref(0)
const life = ref(LIFE)
const speed = ref(SPEED)
let notes: INote[] = []
let particles: Particle[] = []
const animId = ref<ReturnType<typeof requestAnimationFrame>>()
const path = ref(0)
const noteImg = useTemplateRef('noteImg')
const noteFlatImg = useTemplateRef('noteFlatImg')
const noteSharpImg = useTemplateRef('noteSharpImg')
const noteImgReverse = useTemplateRef('noteImgReverse')
const noteFlatImgReverse = useTemplateRef('noteFlatImgReverse')
const noteSharpImgReverse = useTemplateRef('noteSharpImgReverse')

const colors = computed(() => {
	return Object.values(KEYS).reduce((acc, key) => {
		acc[key.note] = key.color
		return acc
	}, {})
})

const getNoteImgSize = computed(() => {
	const height = noteLineDistance.value * 2
	return {
		width: Math.floor(
			(Number(noteImg.value?.width) * height) / Number(noteImg.value?.height)
		),
		height,
	}
})

const getTime = computed(() => setTimerValue(time.value))

const firstUnactiveNote = computed(() => {
	return notes[0]
})

watch(
	() => time.value,
	(newVal) => {
		if (newVal % 100 === 0) speed.value += ACCELERATION
	}
)

watch(
	() => $props.activeKeys,
	(activeKeys) => {
		if (!activeKeys?.length) return
		const note = firstUnactiveNote.value
		if (!note) return
		const isActive = activeKeys.some((n) => n.note.includes(note.name))

		if (isActive) {
			explode(note)
			notes = notes.filter((note2) => note2 !== note)
		}
	},
	{
		deep: true,
	}
)

onMounted(() => {
	toggleFullScreen()
	window.addEventListener('resize', resize)
})

onBeforeUnmount(() => {
	window.removeEventListener('resize', resize)
})

function explode(note: INote) {
	if (!ctx.value) return
	for (let i = 0; i < 100; i++) {
		const color = COLORS[Math.floor(Math.random() * COLORS.length)]
		particles.push(
			new Particle(
				ctx.value,
				note.x + getNoteImgSize.value.width / 2,
				notePos.value[note.name] + getNoteImgSize.value.height / 2,
				color
			)
		)
	}
}

function resize() {
	init()
	drawInit()
}

function onload() {
	if (canvas.value) {
		ctx.value = canvas.value.getContext('2d')
		init()
		drawInit()
	}
}

function init() {
	setSize()
	setLinePos()
	setNotePos()
}

function setSize() {
	if (!canvas.value) return
	canvas.value.width = Math.floor(canvas.value.clientWidth * scale)
	canvas.value.height = Math.floor(canvas.value.clientHeight * scale)
	width.value = canvas.value.width
	height.value = Math.floor(canvas.value.height / 2)
}

function setLinePos() {
	linePos.value = [
		topOffsetHeight.value + 2 * noteLineDistance.value,
		topOffsetHeight.value + 3 * noteLineDistance.value,
		topOffsetHeight.value + 4 * noteLineDistance.value,
		topOffsetHeight.value + 5 * noteLineDistance.value,
		topOffsetHeight.value + 6 * noteLineDistance.value,
	]
}

function setNotePos() {
	notePos.value = {
		do: noteLineDistance.value * 7,
		'do#': noteLineDistance.value * 7,
		're&': noteLineDistance.value * 6.5,
		re: noteLineDistance.value * 6.5,
		're#': noteLineDistance.value * 6.5,
		'mi&': noteLineDistance.value * 6,
		mi: noteLineDistance.value * 6,
		fa: noteLineDistance.value * 5.5,
		'fa#': noteLineDistance.value * 5.5,
		'sol&': noteLineDistance.value * 5,
		sol: noteLineDistance.value * 5,
		'sol#': noteLineDistance.value * 5,
		'la&': noteLineDistance.value * 4.5,
		la: noteLineDistance.value * 4.5,
		'la#': noteLineDistance.value * 4.5,
		'si&': noteLineDistance.value * 4,
		si: noteLineDistance.value * 4,
		do2: noteLineDistance.value * 3.5,
		'do2#': noteLineDistance.value * 3.5,
		're2&': noteLineDistance.value * 3,
		re2: noteLineDistance.value * 3,
		're2#': noteLineDistance.value * 3,
		'mi2&': noteLineDistance.value * 2.5,
		mi2: noteLineDistance.value * 2.5,
		fa2: noteLineDistance.value * 2,
		'fa2#': noteLineDistance.value * 2,
		'sol2&': noteLineDistance.value * 1.5,
		sol2: noteLineDistance.value * 1.5,
		'sol2#': noteLineDistance.value * 1.5,
		'la2&': noteLineDistance.value * 1,
	}
}

function drawInit() {
	drawClave()
	drawLines()
	// drawBorder()
}

function drawLines() {
	linePos.value.forEach((p, pInt) => {
		if (!ctx.value) return
		ctx.value.save()
		ctx.value.beginPath()
		ctx.value.strokeStyle = LINES_COLORS[pInt]
		// ctx.value.shadowColor = LINES_COLORS[pInt]
		// ctx.value.shadowBlur = 10
		ctx.value.lineWidth = 4
		ctx.value.moveTo(0, p + 4)
		ctx.value.lineTo(width.value, p + 4)
		ctx.value.stroke()
		ctx.value.restore()
	})
}

function drawClave() {
	if (!ctx.value || !claveImg.value) return
	const height = noteLineDistance.value * 7
	const width = (claveImg.value?.width * height) / claveImg.value?.height
	// setBorder(width)
	ctx.value.save()
	ctx.value.globalAlpha = 0.1
	ctx.value.drawImage(
		claveImg.value,
		10,
		linePos.value[0] - noteLineDistance.value * 1.4,
		width,
		height
	)
	ctx.value.restore()
}

async function start() {
	toggleFullScreen()
	if (time.value) {
		if (Capacitor.getPlatform() === 'android') {
			if (adsStore.loading) return
			adsStore.toggleLoading(true)
			await new Promise((res) => {
				Admob.interstitial({
					isFirst: false,
					onInterstitialAdClosed: () => {
						res(true)
					},
				})
			})
			adsStore.toggleLoading(false)
		}
	}
	if (started.value) return
	started.value = true
	time.value = 0
	life.value = LIFE
	speed.value = SPEED
	notes = []
	addNote()
	animId.value = requestAnimationFrame(animate)
	setTimer()
}

function setTimer() {
	timers['timer'] = setInterval(() => {
		time.value += 1
	}, 100)
}

function addNote() {
	const name = NOTES[Math.floor(Math.random() * NOTES.length)]
	const color = colors.value[name]

	notes.push({
		name: name,
		x: width.value,
		color: color,
	})

	path.value = (width.value * 0.88) / 4
}

function animate() {
	draw()
	path.value -= speed.value
	if (path.value < 0) {
		addNote()
	}
	if (notes.length && notes[0].x < border.value) {
		life.value -= 1
		explode(notes[0])
		$emits('wrong', notes[0].name)
		if (life.value <= 0) {
			stop()
			return
		}
		notes.splice(0, 1)
	}
	updateParticles()
	animId.value = requestAnimationFrame(animate)
}

function draw() {
	if (!ctx.value || !canvas.value) return
	ctx.value.clearRect(0, 0, canvas.value.width, canvas.value.height)
	drawInit()
	drawNotes()
}

function drawNotes() {
	notes.forEach((note) => {
		let posX = (note.x -= speed.value)
		if (['fa2#', 'sol2&', 'sol2', 'sol2#', 'la2&'].includes(note.name))
			drawNote(note.name, posX, notePos.value[note.name], true)
		else drawNote(note.name, posX, notePos.value[note.name])
	})
}

function drawNote(name: string, x: number, y: number, rotate: boolean = false) {
	if (!ctx.value) return
	let img

	if (rotate) {
		if (name.indexOf('#') !== -1) img = noteSharpImgReverse.value
		else if (name.indexOf('&') !== -1) img = noteFlatImgReverse.value
		else img = noteImgReverse.value
	} else {
		if (name.indexOf('#') !== -1) img = noteSharpImg.value
		else if (name.indexOf('&') !== -1) img = noteFlatImg.value
		else img = noteImg.value
	}

	if (!img) return

	ctx.value.save()

	if (rotate) {
		ctx.value.drawImage(
			img,
			x,
			y - getNoteImgSize.value.height * 0.1,
			getNoteImgSize.value.width,
			getNoteImgSize.value.height
		)
	} else {
		ctx.value.drawImage(
			img,
			x,
			y - getNoteImgSize.value.height * 0.8,
			getNoteImgSize.value.width,
			getNoteImgSize.value.height
		)
	}
	ctx.value.restore()
}

function updateParticles() {
	particles.forEach((particle, index) => {
		particle.update()
		particle.draw()
		if (particle.opacity <= 0) {
			particles.splice(index, 1)
		}
	})
}

function stop() {
	started.value = false
	if (animId.value) cancelAnimationFrame(animId.value)
	if (timers['timer']) {
		clearInterval(timers['timer'])
		delete timers['timer']
	}
}

function setTimerValue(time: number) {
	let reminder = time
	const h = Math.floor(time / MS_HOUR)
	reminder = reminder % MS_HOUR
	const m = Math.floor(reminder / MS_MIN)
	reminder = reminder % MS_MIN
	const s = Math.floor(reminder / MS_SEC)
	const ms = reminder % MS_SEC

	return `${h ? `${addZero(h)}:` : ''}${m ? `${addZero(m)}:` : ''}${addZero(
		s
	)}:${addZero(ms)}`
}

function addZero(num: number) {
	if (!num) return `00`
	else if (num < 10) return `0${num}`
	else return num
}

function toggleFullScreen() {
	if (!document.fullscreenElement) {
		document.documentElement.requestFullscreen()
	}
}
</script>

<template>
	<div class="wrapper">
		<div v-show="started" class="control">
			<div class="score">
				<div class="info life">
					<img src="/img/heart.svg" alt="" /> <span>{{ life }}</span>
				</div>
				<div class="info speed">
					<img src="/img/flash.svg" alt="" /><span>{{ speed.toFixed(1) }}</span>
				</div>
				<div class="info time">
					<img src="/img/hourglass.svg" alt="" /><span>{{ getTime }}</span>
				</div>
			</div>
		</div>
		<canvas ref="canvas" id="canvas"></canvas>
		<img
			src="/img/clave.png"
			ref="claveImg"
			style="position: absolute; left: 0; z-index: -200000; opacity: 0"
			@load="onload"
		/>
		<img
			src="/img/note.png"
			ref="noteImg"
			style="position: absolute; left: 0; z-index: -200000; opacity: 0"
		/>
		<img
			src="/img/note-sharp.png"
			ref="noteSharpImg"
			style="position: absolute; left: 0; z-index: -200000; opacity: 0"
		/>
		<img
			src="/img/note-flat.png"
			ref="noteFlatImg"
			style="position: absolute; left: 0; z-index: -200000; opacity: 0"
		/>
		<img
			src="/img/note-reverse.png"
			ref="noteImgReverse"
			style="position: absolute; left: 0; z-index: -200000; opacity: 0"
		/>
		<img
			src="/img/note-sharp-reverse.png"
			ref="noteSharpImgReverse"
			style="position: absolute; left: 0; z-index: -200000; opacity: 0"
		/>
		<img
			src="/img/note-flat-reverse.png"
			ref="noteFlatImgReverse"
			style="position: absolute; left: 0; z-index: -200000; opacity: 0"
		/>
	</div>
	<div
		v-show="!started"
		:style="{ pointerEvents: started ? 'none' : 'unset' }"
		class="menu"
	>
		<div class="menu-modal">
			<button class="button" @click="start">
				<template v-if="time">
					<span>r</span>
					<span>e</span>
					<span>s</span>
					<span>t</span>
					<span>a</span>
					<span>r</span>
					<span>t</span>
				</template>
				<template v-else>
					<span>s</span>
					<span>t</span>
					<span>a</span>
					<span>r</span>
					<span>t</span>
				</template>
			</button>
			<div v-show="time" class="score">
				<div class="info speed">
					<img src="/img/flash.svg" alt="" /><span>{{ speed.toFixed(1) }}</span>
				</div>
				<div class="info time">
					<img src="/img/hourglass.svg" alt="" /><span>{{ getTime }}</span>
				</div>
			</div>
			<a
				href="https://docs.google.com/document/d/1byFWplCBr8q44uYRmmzl15besPpmpqDZ1_shiGIonbY/edit?usp=sharing"
				target="_blank"
				class="privacy"
				>Privacy Policy</a
			>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.wrapper {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100dvh;
	z-index: 100;
	display: flex;
	flex-direction: column;
	pointer-events: none;
}

.control {
	position: absolute;
	left: 50%;
	top: 5px;
	z-index: 50;
	transform: translateX(-50%);
	width: 100vw;
	box-sizing: border-box;
	padding: 0 25px;
	display: flex;
	flex-direction: row-reverse;
	justify-content: space-between;
	align-items: center;
	gap: 5px;
	overflow: hidden;
}

.score {
	display: flex;
	justify-content: space-between;
	gap: 45px;
	flex-grow: 2;
	font-size: 1rem;
	font-weight: black;
	letter-spacing: 0.2rem;
	text-align: center;
	text-transform: uppercase;
	overflow: hidden;
	max-width: 50%;

	@media screen and (min-width: 480px) {
		font-size: 1.8rem;
	}

	@media screen and (min-width: 720px) {
		font-size: 2.5rem;
	}
}

.info {
	display: flex;
	align-items: center;
	gap: 5px;
	height: 100%;
	color: #fcda5f;

	img {
		height: 20px;

		@media screen and (min-width: 480px) {
			height: 30px;
		}

		@media screen and (min-width: 720px) {
			height: 35px;
		}
	}
}

#canvas {
	display: block;
	width: 100%;
	height: 100%;
}

.menu {
	position: absolute;
	top: 0;
	left: 0;
	bottom: 0;
	right: 0;
	z-index: 150;
	background: rgba(0, 0, 0, 0.3);
	display: flex;
	justify-content: center;
	align-items: stretch;
	padding: 25px;
	box-sizing: border-box;

	.menu-modal {
		width: 100%;
		max-width: 50%;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		align-items: center;
		background: rgb(58, 72, 114);
		background: linear-gradient(
			150deg,
			rgba(58, 72, 114, 1) 0%,
			rgba(34, 44, 80, 1) 100%
		);
		padding: 35px 0;
		border-radius: 11px;
		border: 3px solid #3c598c;
		box-shadow: inset 0 0 5px 0 rgba(0, 0, 0, 0.3);
	}

	.score {
		max-width: unset;
		font-size: 2.5rem !important;
	}
}

.privacy {
	width: fit-content;
	display: inline-block;
	font-size: 2rem;
	font-weight: bold;
	color: #fff;
	text-decoration: none;
	letter-spacing: 4px;
	text-align: center;
	text-transform: capitalize;
}

.button {
	border-radius: 50px;
	padding: 22px 45px;
	background: linear-gradient(110deg, #13caff 0%, #c84dff 100%);
	box-shadow: 2px 2px 10px 0 rgba(0, 0, 0, 0.5),
		inset 2px 2px 3px 0 rgba(255, 255, 255, 0.3);
	font-family: 'Public Sans', sans-serif;
	font-size: 3.5rem;
	font-weight: 700;
	letter-spacing: 1.45;
	letter-spacing: 5px;
	color: #000000;
	text-shadow: 2px 2px 2px rgba(0, 0, 0, 0.5);
	border: none;
	text-transform: uppercase;
	cursor: pointer;
	transition: all 0.3s ease-in-out;
}
</style>
