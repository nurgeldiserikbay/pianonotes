<script setup lang="ts">
import type { BackgroundPresetId } from '@/core/models'

import MoodScene from './MoodScene.vue'

// The card that stands over a mode while its melody plays, in both modes: the
// tune is the thing the player is about to work with, and hearing it once before
// they start is what the whole game rests on.
//
// It is also the only honest way to lock the keys for a few seconds. Without a
// card, a keyboard that ignores taps reads as a broken game — and a player who
// has heard enough needs somewhere to say so, which is what Skip is. Skipping
// stops the melody rather than leaving it playing underneath.

defineProps<{
	mood: BackgroundPresetId
	title: string
	copy: string
	// The browser has not had a gesture yet, so nothing can sound until the
	// player asks for it. The card waits with a Listen button instead of playing
	// to nobody.
	needsTap?: boolean
	skipLabel?: string
}>()

const emit = defineEmits<{
	listen: []
	skip: []
}>()
</script>

<template>
	<div class="listening-overlay" @click.self="emit('skip')">
		<div class="listening-card">
			<MoodScene :mood="mood" class="listening-scene" />
			<span class="listening-title">{{ title }}</span>
			<div v-if="!needsTap" class="equalizer" aria-hidden="true">
				<i /><i /><i /><i /><i />
			</div>
			<p class="listening-copy">{{ copy }}</p>
			<button v-if="needsTap" class="listening-btn primary" @click="emit('listen')">Listen</button>
			<button class="listening-btn" :class="{ primary: !needsTap }" @click="emit('skip')">
				{{ skipLabel ?? 'Skip' }}
			</button>
		</div>
	</div>
</template>

<style scoped lang="scss">
@use '../../assets/mixins' as *;

.listening-overlay {
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	padding: var(--space-4);
	background: color-mix(in srgb, var(--bg-deep) 86%, transparent);
	z-index: 5;
}

.listening-card {
	max-height: 100%;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--space-3);
	max-width: 28rem;
	padding: var(--space-5);
	border-radius: var(--radius-l);
	background: var(--surface-raised);
	border: 2px solid var(--border-strong);
	box-shadow: var(--shadow-float);
	text-align: center;
}

.listening-scene {
	width: 100%;
	max-height: 6rem;
	border-radius: var(--radius-m);
	border: 1px solid var(--border);
	overflow: hidden;
	filter: saturate(0.9) brightness(0.86);
}

.listening-title {
	font-size: var(--text-xl);
	font-weight: var(--weight-black);
	color: var(--text-1);
}

.listening-copy {
	margin: 0;
	color: var(--text-2);
	font-size: var(--text-sm);
}

.listening-btn {
	@include chunky-ghost;
	padding: 0.45rem 1.4rem;
	color: var(--text-2);
	font-size: var(--text-sm);
	cursor: pointer;
}

.listening-btn.primary {
	@include chunky(var(--good), #12946c);
}

/* Five bars breathing in turn: the only thing on this card that has to say
   "something is happening" while the melody plays. */
.equalizer {
	display: flex;
	align-items: flex-end;
	gap: 0.25rem;
	height: 1.5rem;
}

.equalizer i {
	width: 0.3rem;
	height: 100%;
	border-radius: var(--radius-round);
	background: var(--theme-accent, var(--accent));
	transform-origin: bottom;
	animation: echo-bounce 900ms ease-in-out infinite;
}

.equalizer i:nth-child(2) { animation-delay: 120ms; }
.equalizer i:nth-child(3) { animation-delay: 240ms; }
.equalizer i:nth-child(4) { animation-delay: 360ms; }
.equalizer i:nth-child(5) { animation-delay: 480ms; }

@keyframes echo-bounce {
	0%, 100% { transform: scaleY(0.35); opacity: 0.65; }
	50% { transform: scaleY(1); opacity: 1; }
}

/* On a phone in landscape the card has about 360px to live in. The scene is the
   first thing to go: the title, the bars and the button are the card. */
@media (max-height: 560px) {
	.listening-card {
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
	}

	.listening-scene {
		display: none;
	}

	.listening-title {
		font-size: var(--text-lg);
	}
}

@media (prefers-reduced-motion: reduce) {
	.equalizer i {
		animation: none;
		transform: scaleY(0.6);
	}
}
</style>
