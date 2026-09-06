<script setup lang="ts">
import { computed } from 'vue'

import type { NoteNamingSystem } from '@/core/models'
import { BLACK_KEYS, WHITE_KEYS, getKeyLabel } from '@/entities/piano'

const props = defineProps<{
	activeKeys: string[]
	namingSystem: NoteNamingSystem
	disabled?: boolean
	// The key the melody is waiting for. Shown as a hint in the early worlds and
	// withdrawn later — that withdrawal is the difficulty curve of a reading game,
	// far more than note count or tempo is.
	hintKey?: string | null
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
		<div class="keyboard">
			<div class="white-keys">
				<button
					v-for="key in WHITE_KEYS"
					:key="key.id"
					class="white-key"
					:class="{ active: activeSet.has(key.id), hint: hintKey === key.id }"
					:style="{ '--key-accent': key.color }"
					@pointerdown.prevent="press(key.id)"
					@pointerup.prevent="release(key.id)"
					@pointerleave.prevent="release(key.id)"
					@pointercancel.prevent="release(key.id)"
				>
					<span>{{ getKeyLabel(key, namingSystem) }}</span>
				</button>
			</div>

			<div class="black-keys">
				<button
					v-for="key in BLACK_KEYS"
					:key="key.id"
					class="black-key"
					:class="{ active: activeSet.has(key.id), hint: hintKey === key.id }"
					:style="{
						'--key-accent': key.color,
						left: `calc(${(key.whiteIndex + (key.blackOffset ?? 0.68)) / WHITE_KEYS.length * 100}% - 2.2%)`,
					}"
					@pointerdown.prevent="press(key.id)"
					@pointerup.prevent="release(key.id)"
					@pointerleave.prevent="release(key.id)"
					@pointercancel.prevent="release(key.id)"
				>
					<span>{{ getKeyLabel(key, namingSystem) }}</span>
				</button>
			</div>
		</div>
	</div>
</template>

<style scoped lang="scss">
.keyboard-shell {
	position: relative;
	padding: 0.6rem 0.6rem 0.75rem;
	border-radius: var(--radius-l);
	/* The case the keys sit in. On the dark cabinet it is a darker slab with a
	   real rim and a felt strip along the top — the keys have to look set into an
	   instrument, not printed on the background. */
	background: linear-gradient(180deg, #2a3260, #161c3c);
	border: 2px solid var(--border);
	box-shadow: var(--shadow-2), inset 0 2px 0 rgba(255, 255, 255, 0.06);
	/* No backdrop-filter: the tray is opaque, so the blur changed nothing visually
	   while forcing the compositor to read back the whole area behind the largest
	   element on the play screen — one of the two things making Android stutter. */
}

.keyboard {
	position: relative;
	height: clamp(9rem, 27vh, 17rem);
	/* The felt: the thin coloured line every real keyboard has where the keys
	   disappear into the case. */
	border-top: 3px solid color-mix(in srgb, var(--theme-accent, var(--accent)) 55%, #0a0e24);
	padding-top: 0.35rem;
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
	/* A real white key: white, barely shaded, with the lane colour kept to the
	   bottom strip. Tinting the whole key made fourteen pastel keys compete with
	   the notes on the staff. */
	background:
		linear-gradient(
			180deg,
			#ffffff 0%,
			#f7f8fd 46%,
			color-mix(in srgb, var(--key-accent) 22%, #ffffff) 72%,
			color-mix(in srgb, var(--key-accent) 62%, #ffffff) 100%
		);
	box-shadow:
		inset 0 -0.15rem 0 color-mix(in srgb, var(--key-accent) 45%, #ffffff),
		0 0.3rem 0 color-mix(in srgb, var(--key-accent) 30%, #1b1050),
		0 0.5rem 0.9rem rgba(10, 4, 32, 0.35);
	/* Labels are a reading aid, not the subject: quieter than the key itself so
	   the keyboard reads as an instrument rather than a labelled diagram. */
	color: rgba(16, 8, 44, 0.78);
	font-size: clamp(0.68rem, 1.1vw, 0.82rem);
	font-weight: 800;
}

.white-key::before {
	content: '';
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: 0.42rem;
	border-radius: 0 0 1.15rem 1.15rem;
	background: var(--key-accent);
	opacity: 0.95;
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
		inset 0 -0.25rem 0 rgba(255, 255, 255, 0.16),
		0 0.1rem 0 color-mix(in srgb, var(--key-accent) 45%, #1b1050),
		0 0 2.4rem color-mix(in srgb, var(--key-accent) 85%, transparent);
	/* A pressed white key darkens into its lane colour, so the label has to go
	   the other way — white text on a mid-tone tint was unreadable. */
	color: var(--text-1);
	background:
		linear-gradient(180deg, color-mix(in srgb, var(--key-accent) 34%, white), color-mix(in srgb, var(--key-accent) 70%, white) 88%);
}

/* The hint pulses rather than sits still: it has to be findable at a glance by a
   beginner, without looking like the key is already pressed. Animated as opacity
   on an overlay rather than as box-shadow on the key — a box-shadow keyframe
   repaints the key on every frame it runs, and this one runs the whole round. */
.white-key.hint::after,
.black-key.hint::after {
	content: '';
	position: absolute;
	inset: 0;
	border-radius: inherit;
	background: var(--key-accent);
	opacity: 0.35;
	will-change: opacity;
	animation: key-hint 1.1s ease-in-out infinite;
	pointer-events: none;
}

@keyframes key-hint {
	0%,
	100% {
		opacity: 0.12;
	}
	50% {
		opacity: 0.42;
	}
}

@media (prefers-reduced-motion: reduce) {
	.white-key.hint::after,
	.black-key.hint::after {
		animation: none;
		opacity: 0.3;
	}
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
		linear-gradient(
			180deg,
			color-mix(in srgb, var(--key-accent) 30%, rgba(39, 45, 72, 0.98)),
			rgba(10, 12, 22, 0.98)
		);
	box-shadow:
		inset 0 -0.55rem 0 rgba(0, 0, 0, 0.35),
		inset 0 0.16rem 0 color-mix(in srgb, var(--key-accent) 55%, transparent),
		0 0.35rem 1rem rgba(0, 0, 0, 0.4);
	color: rgba(255, 255, 255, 0.66);
	font-size: clamp(0.56rem, 0.85vw, 0.7rem);
	font-weight: 600;
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

/* Short landscape phones: the fixed rem floor on .keyboard plus a squeezed HUD
   above it can push the stage (and the note staff on it) out of view — shrink
   the floor instead. Thresholds match GameStage.vue's HUD breakpoints. */
@media (max-height: 560px) {
	.keyboard-shell {
		padding: 0.4rem;
	}

	.keyboard {
		height: clamp(6rem, 20vh, 16rem);
	}
}

@media (max-height: 380px) {
	.keyboard-shell {
		padding: 0.3rem;
		border-radius: 1rem;
	}

	.keyboard {
		height: clamp(5rem, 18vh, 16rem);
	}
}
</style>
