<script lang="ts" setup>
import { ref, computed } from 'vue'

import CanvasItem from '@/components/CanvasItem.vue'

import { useAudio } from '@/composables/useAudio'

import { KEYS } from '@/consts/keys'
import { IKeyCode } from '@/utils/types'

const { playAudio } = useAudio()

const keys = ref(KEYS)
const getNotes = computed(() => {
	return Object.values(KEYS)
})

const activeKeys = ref<IKeyCode[]>([])
const isActive = computed(() => (keyCode: number) => {
	return activeKeys.value.includes(keys.value[keyCode])
})

function mousedown(keyCode: number) {
	if (!keys.value[keyCode]) return
	if (isActive.value(keyCode)) return
	activeKeys.value.push(keys.value[keyCode])
	playAudio(keys.value[keyCode].audio, true)
}

function mouseup(keyCode: number) {
	if (!keys.value[keyCode] || !activeKeys.value.length) return
	activeKeys.value = activeKeys.value.filter(
		(k) => k.char !== keys.value[keyCode].char
	)
}

function wrong(value: string) {
	const a = getNotes.value.find((k) => k.note.includes(value))
	playAudio(a.audio, true)
}
</script>

<template>
	<div class="page start-page">
		<CanvasItem :activeKeys="activeKeys" @wrong="wrong" />
		<div class="piano">
			<div class="keys">
				<div class="octave first-octave">
					<div
						class="key white"
						:class="{ active: isActive(81) }"
						:style="{
							background: isActive(81)
								? `linear-gradient(to bottom, rgba(255, 255, 255, 0.2) -30%, ${keys[81].color})`
								: '',
							color: isActive(81) ? '#fff' : keys[81].color,
						}"
						@pointerdown.stop="mousedown(81)"
						@pointerup.stop="mouseup(81)"
						@pointerleave.stop="mouseup(81)"
					>
						<span class="char">{{ keys[81].char }}</span>
						<div
							class="key black"
							:class="{ active: isActive(50) }"
							:style="{
								background: isActive(50)
									? `linear-gradient(to bottom, rgba(0, 0, 0, 1) -80%, ${keys[50].color})`
									: '',
								color: isActive(50) ? '#fff' : keys[50].color,
							}"
							@pointerdown.stop="mousedown(50)"
							@pointerup.stop="mouseup(50)"
							@pointerleave.stop="mouseup(50)"
						>
							<span class="char">{{ keys[50].char }}</span>
						</div>
					</div>
					<div
						class="key white"
						:class="{ active: isActive(87) }"
						:style="{
							background: isActive(87)
								? `linear-gradient(to bottom, rgba(255, 255, 255, 0.2) -30%, ${keys[87].color})`
								: '',
							color: isActive(87) ? '#fff' : keys[87].color,
						}"
						@pointerdown.stop="mousedown(87)"
						@pointerup.stop="mouseup(87)"
						@pointerleave.stop="mouseup(87)"
					>
						<span class="char">{{ keys[87].char }}</span>
						<div
							class="key black"
							:class="{ active: isActive(51) }"
							:style="{
								background: isActive(51)
									? `linear-gradient(to bottom, rgba(0, 0, 0, 1) -80%, ${keys[51].color})`
									: '',
								color: isActive(51) ? '#fff' : keys[51].color,
							}"
							@pointerdown.stop="mousedown(51)"
							@pointerup.stop="mouseup(51)"
							@pointerleave.stop="mouseup(51)"
						>
							<span class="char">{{ keys[51].char }}</span>
						</div>
					</div>
					<div
						class="key white"
						:class="{ active: isActive(69) }"
						:style="{
							background: isActive(69)
								? `linear-gradient(to bottom, rgba(255, 255, 255, 0.2) -30%, ${keys[69].color})`
								: '',
							color: isActive(69) ? '#fff' : keys[69].color,
						}"
						@pointerdown.stop="mousedown(69)"
						@pointerup.stop="mouseup(69)"
						@pointerleave.stop="mouseup(69)"
					>
						<span class="char">{{ keys[69].char }}</span>
					</div>
					<div
						class="key white"
						:class="{ active: isActive(82) }"
						:style="{
							background: isActive(82)
								? `linear-gradient(to bottom, rgba(255, 255, 255, 0.2) -30%, ${keys[82].color})`
								: '',
							color: isActive(82) ? '#fff' : keys[82].color,
						}"
						@pointerdown.stop="mousedown(82)"
						@pointerup.stop="mouseup(82)"
						@pointerleave.stop="mouseup(82)"
					>
						<span class="char">{{ keys[82].char }}</span>
						<div
							class="key black"
							:class="{ active: isActive(53) }"
							:style="{
								background: isActive(53)
									? `linear-gradient(to bottom, rgba(0, 0, 0, 1) -80%, ${keys[53].color})`
									: '',
								color: isActive(53) ? '#fff' : keys[53].color,
							}"
							@pointerdown.stop="mousedown(53)"
							@pointerup.stop="mouseup(53)"
							@pointerleave.stop="mouseup(53)"
						>
							<span class="char">{{ keys[53].char }}</span>
						</div>
					</div>
					<div
						class="key white"
						:class="{ active: isActive(84) }"
						:style="{
							background: isActive(84)
								? `linear-gradient(to bottom, rgba(255, 255, 255, 0.2) -30%, ${keys[84].color})`
								: '',
							color: isActive(84) ? '#fff' : keys[84].color,
						}"
						@pointerdown.stop="mousedown(84)"
						@pointerup.stop="mouseup(84)"
						@pointerleave.stop="mouseup(84)"
					>
						<span class="char">{{ keys[84].char }}</span>
						<div
							class="key black"
							:class="{ active: isActive(54) }"
							:style="{
								background: isActive(54)
									? `linear-gradient(to bottom, rgba(0, 0, 0, 1) -80%, ${keys[54].color})`
									: '',
								color: isActive(54) ? '#fff' : keys[54].color,
							}"
							@pointerdown.stop="mousedown(54)"
							@pointerup.stop="mouseup(54)"
							@pointerleave.stop="mouseup(54)"
						>
							<span class="char">{{ keys[54].char }}</span>
						</div>
					</div>
					<div
						class="key white"
						:class="{ active: isActive(89) }"
						:style="{
							background: isActive(89)
								? `linear-gradient(to bottom, rgba(255, 255, 255, 0.2) -30%, ${keys[89].color})`
								: '',
							color: isActive(89) ? '#fff' : keys[89].color,
						}"
						@pointerdown.stop="mousedown(89)"
						@pointerup.stop="mouseup(89)"
						@pointerleave.stop="mouseup(89)"
					>
						<span class="char">{{ keys[89].char }}</span>
						<div
							class="key black"
							:class="{ active: isActive(55) }"
							:style="{
								background: isActive(55)
									? `linear-gradient(to bottom, rgba(0, 0, 0, 1) -80%, ${keys[55].color})`
									: '',
								color: isActive(55) ? '#fff' : keys[55].color,
							}"
							@pointerdown.stop="mousedown(55)"
							@pointerup.stop="mouseup(55)"
							@pointerleave.stop="mouseup(55)"
						>
							<span class="char">{{ keys[55].char }}</span>
						</div>
					</div>
					<div
						class="key white"
						:class="{ active: isActive(85) }"
						:style="{
							background: isActive(85)
								? `linear-gradient(to bottom, rgba(255, 255, 255, 0.2) -30%, ${keys[85].color})`
								: '',
							color: isActive(85) ? '#fff' : keys[85].color,
						}"
						@pointerdown.stop="mousedown(85)"
						@pointerup.stop="mouseup(85)"
						@pointerleave.stop="mouseup(85)"
					>
						<span class="char">{{ keys[85].char }}</span>
					</div>
					<div
						class="key white"
						:class="{ active: isActive(86) }"
						:style="{
							background: isActive(86)
								? `linear-gradient(to bottom, rgba(255, 255, 255, 0.2) -30%, ${keys[86].color})`
								: '',
							color: isActive(86) ? '#fff' : keys[86].color,
						}"
						@pointerdown.stop="mousedown(86)"
						@pointerup.stop="mouseup(86)"
						@pointerleave.stop="mouseup(86)"
					>
						<span class="char">{{ keys[86].char }}</span>
						<div
							class="key black"
							:class="{ active: isActive(71) }"
							:style="{
								background: isActive(71)
									? `linear-gradient(to bottom, rgba(0, 0, 0, 1) -80%, ${keys[71].color})`
									: '',
								color: isActive(71) ? '#fff' : keys[71].color,
							}"
							@pointerdown.stop="mousedown(71)"
							@pointerup.stop="mouseup(71)"
							@pointerleave.stop="mouseup(71)"
						>
							<span class="char">{{ keys[71].char }}</span>
						</div>
					</div>
					<div
						class="key white"
						:class="{ active: isActive(66) }"
						:style="{
							background: isActive(66)
								? `linear-gradient(to bottom, rgba(255, 255, 255, 0.2) -30%, ${keys[66].color})`
								: '',
							color: isActive(66) ? '#fff' : keys[66].color,
						}"
						@pointerdown.stop="mousedown(66)"
						@pointerup.stop="mouseup(66)"
						@pointerleave.stop="mouseup(66)"
					>
						<span class="char">{{ keys[66].char }}</span>
						<div
							class="key black"
							:class="{ active: isActive(72) }"
							:style="{
								background: isActive(72)
									? `linear-gradient(to bottom, rgba(0, 0, 0, 1) -80%, ${keys[72].color})`
									: '',
								color: isActive(72) ? '#fff' : keys[72].color,
							}"
							@pointerdown.stop="mousedown(72)"
							@pointerup.stop="mouseup(72)"
							@pointerleave.stop="mouseup(72)"
						>
							<span class="char">{{ keys[72].char }}</span>
						</div>
					</div>
					<div
						class="key white"
						:class="{ active: isActive(78) }"
						:style="{
							background: isActive(78)
								? `linear-gradient(to bottom, rgba(255, 255, 255, 0.2) -30%, ${keys[78].color})`
								: '',
							color: isActive(78) ? '#fff' : keys[78].color,
						}"
						@pointerdown.stop="mousedown(78)"
						@pointerup.stop="mouseup(78)"
						@pointerleave.stop="mouseup(78)"
					>
						<span class="char">{{ keys[78].char }}</span>
					</div>
					<div
						class="key white"
						:class="{ active: isActive(77) }"
						:style="{
							background: isActive(77)
								? `linear-gradient(to bottom, rgba(255, 255, 255, 0.2) -30%, ${keys[77].color})`
								: '',
							color: isActive(77) ? '#fff' : keys[77].color,
						}"
						@pointerdown.stop="mousedown(77)"
						@pointerup.stop="mouseup(77)"
						@pointerleave.stop="mouseup(77)"
					>
						<span class="char">{{ keys[77].char }}</span>
						<div
							class="key black"
							:class="{ active: isActive(75) }"
							:style="{
								background: isActive(75)
									? `linear-gradient(to bottom, rgba(0, 0, 0, 1) -80%, ${keys[75].color})`
									: '',
								color: isActive(75) ? '#fff' : keys[75].color,
							}"
							@pointerdown.stop="mousedown(75)"
							@pointerup.stop="mouseup(75)"
							@pointerleave.stop="mouseup(75)"
						>
							<span class="char">{{ keys[75].char }}</span>
						</div>
					</div>
					<div
						class="key white"
						:class="{ active: isActive(188) }"
						:style="{
							background: isActive(188)
								? `linear-gradient(to bottom, rgba(255, 255, 255, 0.2) -30%, ${keys[188].color})`
								: '',
							color: isActive(188) ? '#fff' : keys[188].color,
						}"
						@pointerdown.stop="mousedown(188)"
						@pointerup.stop="mouseup(188)"
						@pointerleave.stop="mouseup(188)"
					>
						<span class="char">{{ keys[188].char }}</span>
						<div
							class="key black"
							:class="{ active: isActive(76) }"
							:style="{
								background: isActive(76)
									? `linear-gradient(to bottom, rgba(0, 0, 0, 1) -80%, ${keys[76].color})`
									: '',
								color: isActive(76) ? '#fff' : keys[76].color,
							}"
							@pointerdown.stop="mousedown(76)"
							@pointerup.stop="mouseup(76)"
							@pointerleave.stop="mouseup(76)"
						>
							<span class="char">{{ keys[76].char }}</span>
						</div>
					</div>
					<div class="key white"></div>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.start-page {
	position: relative;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	align-items: stretch;
	overflow: hidden;
	background: rgb(58, 72, 114);
	background: linear-gradient(
		150deg,
		rgba(58, 72, 114, 1) 0%,
		rgba(34, 44, 80, 1) 100%
	);
}

.piano {
	width: 100%;
	height: 50dvh;
}

.keys {
	width: 100%;
	height: 100%;
	box-sizing: border-box;
	display: flex;
	align-items: stretch;
	justify-content: space-around;
}

.octave {
	display: flex;
	align-items: stretch;
	justify-content: space-around;
	flex-grow: 1;
}

.key {
	font-size: 1.8rem;
	font-weight: 900;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	align-items: center;
	padding-top: 1rem;
	padding-bottom: 1.5rem;
	font-weight: bold;
	box-sizing: border-box;
	text-transform: uppercase;
	text-shadow: 0 0 5px rgba(0, 0, 0, 0.8);
	border-radius: 5px;

	@media screen and (min-width: 480px) {
		font-size: 2rem;
	}

	@media screen and (min-width: 720px) {
		font-size: 2.4rem;
	}

	.char {
		writing-mode: vertical-rl;
		transform: rotateZ(180deg);
	}

	&:after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 5%;
		background: linear-gradient(
			to bottom,
			rgba(200, 200, 200, 0.5),
			rgba(255, 255, 255, 0)
		);
		border-bottom-left-radius: 5px;
		border-bottom-right-radius: 5px;
	}
}

.key.black {
	color: #fff;
	text-orientation: sideways;

	&:after {
		background: linear-gradient(
			to bottom,
			rgba(100, 100, 100, 0.5),
			rgba(0, 0, 0, 0)
		) !important;
	}
}

.key.white {
	position: relative;
	border: 1px solid #020202;
	box-sizing: border-box;
	flex-grow: 1;
	flex-shrink: 1;
	width: 7.14%;
	background-color: #fff;
	text-shadow: 0 0 5px rgba(255, 255, 255, 0.8);

	&:last-child {
		width: 3.57%;
		pointer-events: none;
	}
}

.key.black {
	position: absolute;
	top: -1px;
	right: 50%;
	transform: translateX(100%);
	width: 100%;
	flex-shrink: 1;
	max-width: 100px;
	height: 70%;
	background: #000;
	z-index: 10;
}
</style>
