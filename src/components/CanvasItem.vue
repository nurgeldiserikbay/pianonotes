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
import { gameBalanceConfig, computeTravelTime, computeSpeed, computeDifficultyProgress } from '@/config/gameBalance'
import { themeConfig } from '@/config/themeConfig'
import { getAnimationProgress, easeOut, getShakeOffset } from '@/utils/animations'
import { getTodayChallenge, getChallengeProgress, updateChallengeProgress, isChallengeCompleted } from '@/utils/dailyChallenge'

const LINES_COLORS = themeConfig.lines.colors

const $props = defineProps<{
	activeKeys?: IKeyCode[]
}>()

const $emits = defineEmits<{
	wrong: [noteName: string]
}>()

const scale = window.devicePixelRatio
const MS_HOUR = 60 * 60 * 10
const MS_MIN = 60 * 10
const MS_SEC = 10
const LIFE = gameBalanceConfig.life

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
const speed = ref(0) // Скорость в px/sec (вычисляется через travelTime)
let notes: INote[] = []
let particles: Particle[] = []
const animId = ref<ReturnType<typeof requestAnimationFrame>>()
const path = ref(0)

// Новая система скорости и сложности
const travelTimeSec = ref(gameBalanceConfig.travelTime.phase1)
const score = ref(0)
const combo = ref(0)
const perfectCount = ref(0)
const maxCombo = ref(0)
const highScore = ref(0)
const nearMissMessage = ref('')
const comboText = ref('')
const comboTextTimeout = ref<ReturnType<typeof setTimeout>>()

// Загружаем рекорд из localStorage
try {
	const stored = localStorage.getItem('pianoNotes_highScore')
	if (stored) {
		highScore.value = parseInt(stored, 10) || 0
	}
} catch (e) {
	// Игнорируем ошибки
}

// DeltaTime для корректного движения
let lastFrameTime = 0
let gameStartTime = 0

// Slow motion эффект
const slowMotionActive = ref(false)
const slowMotionEndTime = ref(0)

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

// Вычисляем скорость на основе travelTime и размеров экрана
function updateSpeed() {
	if (width.value <= 0) return
	
	// Дистанция для движения ноты (от правого края до левого)
	const trackLength = width.value
	
	// Вычисляем travelTime на основе прогресса
	const progress = computeDifficultyProgress(
		score.value,
		time.value / 10, // time в 1/10 секундах
		gameBalanceConfig
	)
	travelTimeSec.value = computeTravelTime(progress, gameBalanceConfig)
	
	// Вычисляем скорость: speed = distance / time
	speed.value = computeSpeed(trackLength, travelTimeSec.value, true, gameBalanceConfig)
	
	// Применяем slow motion если активен
	if (slowMotionActive.value) {
		speed.value *= gameBalanceConfig.combo.slowMotionFactor
	}
}

// Обновляем скорость при изменении размеров или прогресса
watch([width, score, time], () => {
	if (started.value) {
		updateSpeed()
	}
}, { immediate: false })

watch(
	() => $props.activeKeys,
	(activeKeys) => {
		if (!activeKeys?.length || !started.value) return
		const note = firstUnactiveNote.value
		if (!note) return
		const isActive = activeKeys.some((n) => n.note.includes(note.name))

		if (isActive) {
			handleNoteHit(note)
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

// Обработка попадания по ноте (новая логика с perfect/combo)
function handleNoteHit(note: INote) {
	if (!ctx.value) return
	
	// Вычисляем расстояние до целевой линии для perfect
	// Целевая линия находится примерно на позиции 50px от левого края (где линии нотного стана)
	const targetLineX = 50 + getNoteImgSize.value.width / 2
	const distance = Math.abs(note.x - targetLineX)
	const isPerfect = distance <= gameBalanceConfig.combo.perfectThreshold
	
	// Обновляем комбо
	if (isPerfect) {
		perfectCount.value++
		combo.value++
		if (combo.value > maxCombo.value) {
			maxCombo.value = combo.value
		}
		
		// Анимация perfect
		note.animation = {
			type: 'perfect',
			startTime: performance.now(),
			duration: themeConfig.animations.perfect.duration,
			progress: 0,
		}
		note.isPerfect = true
		
		// Slow motion при комбо x5
		if (combo.value === gameBalanceConfig.combo.multipliers.x5) {
			slowMotionActive.value = true
			slowMotionEndTime.value = performance.now() + gameBalanceConfig.combo.slowMotionDuration * 1000
		}
		
		// Комбо текст
		if (combo.value >= 2) {
			showComboText(combo.value)
		}
		
		// Очки за perfect
		const baseScore = gameBalanceConfig.rewards.perfect
		const comboMultiplier = combo.value >= 2 ? combo.value * gameBalanceConfig.rewards.comboMultiplier : 1
		score.value += Math.floor(baseScore * comboMultiplier)
	} else {
		// Обычное попадание
		combo.value = 0
		score.value += gameBalanceConfig.rewards.normal
	}
	
	explode(note)
	notes = notes.filter((note2) => note2 !== note)
	
	// Обновляем скорость после изменения прогресса
	updateSpeed()
}

// Показать текст комбо
function showComboText(comboValue: number) {
	comboText.value = `COMBO x${comboValue}!`
	if (comboTextTimeout.value) {
		clearTimeout(comboTextTimeout.value)
	}
	comboTextTimeout.value = setTimeout(() => {
		comboText.value = ''
	}, 1000)
}

function resize() {
	init()
	drawInit()
	if (started.value) {
		updateSpeed()
	}
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
		ctx.value.strokeStyle = LINES_COLORS[pInt] || themeConfig.lines.colors[pInt] || '#4a90e2'
		ctx.value.globalAlpha = themeConfig.lines.opacity
		ctx.value.lineWidth = themeConfig.lines.width
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
	score.value = 0
	combo.value = 0
	perfectCount.value = 0
	maxCombo.value = 0
	nearMissMessage.value = ''
	comboText.value = ''
	slowMotionActive.value = false
	notes = []
	travelTimeSec.value = gameBalanceConfig.travelTime.phase1
	gameStartTime = performance.now()
	lastFrameTime = gameStartTime
	updateSpeed()
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
	const now = performance.now()

	// Добавляем spawn анимацию
	notes.push({
		name: name,
		x: width.value,
		color: color,
		animation: {
			type: 'spawn',
			startTime: now,
			duration: themeConfig.animations.spawn.duration,
			progress: 0,
		},
		scale: themeConfig.animations.spawn.scaleStart,
		alpha: themeConfig.animations.spawn.fadeStart,
	})

	path.value = (width.value * gameBalanceConfig.notes.minDistance) / gameBalanceConfig.notes.spacingFactor
}

function animate(currentTime: number) {
	if (!started.value) return
	
	// Вычисляем deltaTime в секундах
	const deltaTime = lastFrameTime > 0 ? (currentTime - lastFrameTime) / 1000 : 0.016 // ~60fps по умолчанию
	lastFrameTime = currentTime
	
	// Обновляем slow motion
	if (slowMotionActive.value && currentTime >= slowMotionEndTime.value) {
		slowMotionActive.value = false
		updateSpeed()
	}
	
	// Обновляем анимации нот и перемещаем их
	const effectiveDeltaTime = slowMotionActive.value 
		? deltaTime * gameBalanceConfig.combo.slowMotionFactor 
		: deltaTime
	
	notes.forEach((note) => {
		// Движение
		note.x -= speed.value * effectiveDeltaTime
		
		// Обновление анимаций
		if (note.animation) {
			note.animation.progress = getAnimationProgress(
				note.animation.startTime,
				note.animation.duration,
				currentTime
			)
			
			if (note.animation.type === 'spawn') {
				const progress = easeOut(note.animation.progress)
				note.scale = themeConfig.animations.spawn.scaleStart + 
					(themeConfig.animations.spawn.scaleEnd - themeConfig.animations.spawn.scaleStart) * progress
				note.alpha = themeConfig.animations.spawn.fadeStart + 
					(themeConfig.animations.spawn.fadeEnd - themeConfig.animations.spawn.fadeStart) * progress
				
				if (note.animation.progress >= 1) {
					note.animation = undefined
					note.scale = 1
					note.alpha = 1
				}
			} else if (note.animation.type === 'perfect') {
				const anim = themeConfig.animations.perfect
				if (note.animation.progress < 0.5) {
					const t = note.animation.progress * 2
					note.scale = anim.scaleStart + (anim.scalePeak - anim.scaleStart) * easeOut(t)
				} else {
					const t = (note.animation.progress - 0.5) * 2
					note.scale = anim.scalePeak + (anim.scaleEnd - anim.scalePeak) * easeOut(t)
				}
				if (note.animation.progress >= 1) {
					note.animation = undefined
					note.scale = 1
				}
			}
		}
	})
	
	draw()
	
	// Добавление новой ноты
	path.value -= speed.value * effectiveDeltaTime
	if (path.value < 0) {
		addNote()
	}
	
	// Проверка промахов
	if (notes.length && notes[0].x < border.value) {
		const missedNote = notes[0]
		
		// Fail анимация
		if (!missedNote.animation || missedNote.animation.type !== 'fail') {
			missedNote.animation = {
				type: 'fail',
				startTime: currentTime,
				duration: themeConfig.animations.fail.duration,
				progress: 0,
			}
		}
		
		life.value -= 1
		explode(missedNote)
		$emits('wrong', missedNote.name)
		combo.value = 0
		
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
	const currentTime = performance.now()
	
	notes.forEach((note) => {
		let posX = note.x
		
		// Применяем shake для fail анимации
		if (note.animation?.type === 'fail') {
			const shakeProgress = getAnimationProgress(
				note.animation.startTime,
				note.animation.duration,
				currentTime
			)
			posX += getShakeOffset(shakeProgress, themeConfig.animations.fail.shakeAmount)
		}
		
		if (['fa2#', 'sol2&', 'sol2', 'sol2#', 'la2&'].includes(note.name))
			drawNote(note.name, posX, notePos.value[note.name], true, note)
		else drawNote(note.name, posX, notePos.value[note.name], false, note)
	})
}

function drawNote(name: string, x: number, y: number, rotate: boolean = false, note?: INote) {
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
	
	// Применяем scale и alpha если есть анимация
	const scale = note?.scale ?? 1
	const alpha = note?.alpha ?? 1
	
	if (scale !== 1 || alpha !== 1) {
		const centerX = x + getNoteImgSize.value.width / 2
		const centerY = rotate 
			? y - getNoteImgSize.value.height * 0.1 + getNoteImgSize.value.height / 2
			: y - getNoteImgSize.value.height * 0.8 + getNoteImgSize.value.height / 2
		
		ctx.value.translate(centerX, centerY)
		ctx.value.scale(scale, scale)
		ctx.value.translate(-centerX, -centerY)
		ctx.value.globalAlpha = alpha
	}
	
	// Тень для ноты
	if (!note?.animation || note.animation.type !== 'fail') {
		ctx.value.shadowColor = themeConfig.notes.shadow.color
		ctx.value.shadowBlur = themeConfig.notes.shadow.blur
		ctx.value.shadowOffsetX = themeConfig.notes.shadow.offsetX
		ctx.value.shadowOffsetY = themeConfig.notes.shadow.offsetY
	}
	
	// Glow для perfect/combo
	if (note?.isPerfect) {
		ctx.value.shadowColor = themeConfig.effects.perfect.glow.color
		ctx.value.shadowBlur = themeConfig.effects.perfect.glow.blur
	}

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
	
	// Проверка near-miss
	if (score.value > 0 && highScore.value > 0) {
		const difference = highScore.value - score.value
		if (difference > 0 && difference <= gameBalanceConfig.nearMiss.threshold) {
			nearMissMessage.value = `Было близко! Ещё ${difference} до рекорда`
		}
	}
	
	// Сохранение рекорда
	if (score.value > highScore.value) {
		highScore.value = score.value
		try {
			localStorage.setItem('pianoNotes_highScore', score.value.toString())
		} catch (e) {
			// Игнорируем ошибки
		}
	}
	
	// Обновление daily challenge
	updateChallengeProgress(perfectCount.value, score.value, maxCombo.value)
	
	lastFrameTime = 0
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
				<div class="info score">
					<span>{{ score }}</span>
				</div>
				<div class="info life">
					<img src="/img/heart.svg" alt="" /> <span>{{ life }}</span>
				</div>
				<div class="info time">
					<img src="/img/hourglass.svg" alt="" /><span>{{ getTime }}</span>
				</div>
			</div>
			<div v-if="combo >= 2" class="combo-display">
				COMBO x{{ combo }}
			</div>
			<div v-if="comboText" class="combo-text">
				{{ comboText }}
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
				<div class="info score">
					<span>Score: {{ score }}</span>
				</div>
				<div v-if="highScore > 0" class="info high-score">
					<span>Best: {{ highScore }}</span>
				</div>
				<div class="info time">
					<img src="/img/hourglass.svg" alt="" /><span>{{ getTime }}</span>
				</div>
				<div v-if="nearMissMessage" class="near-miss">
					{{ nearMissMessage }}
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

	.near-miss {
		margin-top: 15px;
		color: #ffd700;
		font-size: 1.5rem;
		font-weight: bold;
		text-align: center;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
	}

	.high-score {
		color: #ffd700;
		font-weight: bold;
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
