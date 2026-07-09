<script setup lang="ts">
import { computed } from 'vue'

import { BLACK_KEYS, WHITE_KEYS } from '@/entities/piano'

const props = defineProps<{
	activeKeys: string[]
	disabled?: boolean
}>()

const emit = defineEmits<{
	keydown: [laneId: string]
	keyup: [laneId: string]
}>()

const activeSet = computed(() => new Set(props.activeKeys))

function press(laneId: string) {
	if (props.disabled) return
	emit('keydown', laneId)
}

function release(laneId: string) {
	emit('keyup', laneId)
}
</script>

<template>
	<div class="keyboard-shell">
		<div class="keyboard-badge">2 Octaves</div>
		<div class="keyboard">
			<div class="white-keys">
				<button
					v-for="key in WHITE_KEYS"
					:key="key.id"
					class="white-key"
					:class="{ active: activeSet.has(key.id) }"
					:style="{ '--key-accent': key.color }"
					@pointerdown.prevent="press(key.id)"
					@pointerup.prevent="release(key.id)"
					@pointerleave.prevent="release(key.id)"
					@pointercancel.prevent="release(key.id)"
				>
					<span>{{ key.label }}</span>
				</button>
			</div>

			<div class="black-keys">
				<button
					v-for="key in BLACK_KEYS"
					:key="key.id"
					class="black-key"
					:class="{ active: activeSet.has(key.id) }"
					:style="{
						'--key-accent': key.color,
						left: `calc(${(key.whiteIndex + (key.blackOffset ?? 0.68)) / WHITE_KEYS.length * 100}% - 2.2%)`,
					}"
					@pointerdown.prevent="press(key.id)"
					@pointerup.prevent="release(key.id)"
					@pointerleave.prevent="release(key.id)"
					@pointercancel.prevent="release(key.id)"
				>
					<span>{{ key.label }}</span>
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.keyboard-shell {
	position: relative;
	padding: 0.85rem;
	border-radius: 2rem;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(28, 18, 58, 0.46), rgba(16, 19, 34, 0.55));
	border: 1px solid rgba(255, 255, 255, 0.16);
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.12),
		0 22px 60px rgba(0, 0, 0, 0.32),
		0 0 2.4rem rgba(122, 192, 255, 0.12);
	backdrop-filter: blur(18px);
}

.keyboard-badge {
	position: absolute;
	top: 0.65rem;
	right: 0.8rem;
	z-index: 2;
	padding: 0.35rem 0.7rem;
	border-radius: 999px;
	background: linear-gradient(135deg, rgba(255, 214, 107, 0.28), rgba(255, 122, 214, 0.24));
	color: rgba(255, 255, 255, 0.9);
	font-size: 0.72rem;
	font-weight: 800;
	letter-spacing: 0.08em;
	text-transform: uppercase;
}

.keyboard {
	position: relative;
	height: clamp(9rem, 24vh, 16rem);
}

.white-keys {
	display: grid;
	grid-template-columns: repeat(14, minmax(0, 1fr));
	gap: 0.35rem;
	height: 100%;
}

.white-key,
.black-key {
	border: none;
	cursor: pointer;
	transition:
		transform 120ms ease,
		box-shadow 120ms ease,
		filter 120ms ease;
}

.white-key {
	position: relative;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	padding-bottom: 1rem;
	border-radius: 0 0 1.15rem 1.15rem;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(231, 238, 255, 0.92) 55%, rgba(205, 214, 234, 0.95));
	box-shadow:
		inset 0 -0.55rem 0 rgba(165, 174, 201, 0.5),
		0 0.35rem 1rem rgba(0, 0, 0, 0.18);
	color: rgba(10, 14, 28, 0.7);
	font-size: clamp(0.75rem, 1.3vw, 0.95rem);
	font-weight: 700;
}

.white-key::after {
	content: '';
	position: absolute;
	inset: 0;
	border-radius: inherit;
	background: linear-gradient(180deg, rgba(255, 255, 255, 0.25), transparent 34%);
	opacity: 0.8;
}

.white-key.active {
	transform: translateY(0.25rem) scale(0.99);
	box-shadow:
		inset 0 -0.25rem 0 rgba(255, 255, 255, 0.12),
		0 0 1.8rem color-mix(in srgb, var(--key-accent) 70%, transparent);
	color: #ffffff;
	background:
		linear-gradient(180deg, rgba(255, 255, 255, 0.28), color-mix(in srgb, var(--key-accent) 64%, white) 88%);
}

.black-keys {
	position: absolute;
	inset: 0;
	pointer-events: none;
}

.black-key {
	position: absolute;
	top: 0;
	width: 4.4%;
	height: 62%;
	pointer-events: auto;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	padding-bottom: 0.8rem;
	border-radius: 0 0 0.9rem 0.9rem;
	background:
		linear-gradient(180deg, rgba(39, 45, 72, 0.98), rgba(10, 12, 22, 0.98));
	box-shadow:
		inset 0 -0.55rem 0 rgba(0, 0, 0, 0.35),
		0 0.35rem 1rem rgba(0, 0, 0, 0.4);
	color: rgba(255, 255, 255, 0.82);
	font-size: clamp(0.62rem, 0.95vw, 0.8rem);
	font-weight: 700;
}

.black-key.active {
	transform: translateY(0.18rem) scale(0.985);
	background:
		linear-gradient(180deg, color-mix(in srgb, var(--key-accent) 58%, #0c1021), #0d1228);
	box-shadow:
		inset 0 -0.25rem 0 rgba(255, 255, 255, 0.08),
		0 0 1.9rem color-mix(in srgb, var(--key-accent) 80%, transparent);
	color: #ffffff;
}

@media (max-width: 900px) {
	.keyboard-shell {
		padding: 0.55rem;
		border-radius: 1.4rem;
	}

	.white-keys {
		gap: 0.2rem;
	}
}
</style>
