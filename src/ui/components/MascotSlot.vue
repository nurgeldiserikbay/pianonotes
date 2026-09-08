<script setup lang="ts">
// Every screen shows the mascot through this one component, so a new pose set
// only touches this file.
//
// Callers ask for a *situation* — the player is being taught, is thinking, has
// won, has to try again — and this file decides which drawing that is. That way
// a screen never names a file, and a redrawn set with different names is one
// map away from being wired.
import { computed, toRef } from 'vue'

import { assetUrl } from '@/utils/assetUrl'
import { useDropInArt } from '@/ui/useDropInArt'

export type MascotMood = 'idle' | 'teaching' | 'thinking' | 'cheer' | 'retry' | 'wrongNote'

const props = withDefaults(defineProps<{ size?: string; variant?: MascotMood }>(), {
	size: '6rem',
	variant: 'idle',
})

// The drawn set, in the order it was delivered. Anything not drawn yet falls
// back to the nearest pose that was, so a half-finished set never breaks a
// screen and never shows a gap.
const NEAREST: Record<MascotMood, MascotMood> = {
	idle: 'idle',
	teaching: 'idle',
	thinking: 'idle',
	cheer: 'idle',
	retry: 'idle',
	wrongNote: 'retry',
}

// The drawn files, where a pose's name on disk differs from the name screens use
// for it. `wrongNote` is the moment a key is wrong; `retry` is a finished
// attempt that did not go well. Two different feelings, so two files.
const FILE: Partial<Record<MascotMood, string>> = {
	wrongNote: 'cat-wrong-note',
}

const variant = toRef(props, 'variant')
const fileFor = (mood: MascotMood) => FILE[mood] ?? `cat-${mood}`
const art = useDropInArt(computed(() => assetUrl(`/img/redesign-v2/mascot/${fileFor(variant.value)}.webp`)))
const src = computed(
	() => art.src.value ?? assetUrl(`/img/redesign-v2/mascot/${fileFor(NEAREST[variant.value])}.webp`)
)
</script>

<template>
	<div class="mascot-slot" :style="{ width: size, height: size }">
		<img class="mascot-art" :src="src" alt="" draggable="false" @error="art.onError" />
	</div>
</template>

<style scoped lang="scss">
.mascot-slot {
	display: grid;
	place-items: center;
	// Slow idle bob so the hero mascot feels alive rather than pasted on.
	animation: mascot-idle 4.5s ease-in-out infinite;
}

.mascot-art {
	width: 100%;
	height: 100%;
	// contain, never cover: an ear, a tail or the baton cropped off is worse
	// than a little empty space around the character.
	object-fit: contain;
	pointer-events: none;
	user-select: none;
	filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.42));
}

@keyframes mascot-idle {
	0%,
	100% {
		transform: translateY(0) rotate(-0.6deg);
	}
	50% {
		transform: translateY(-5%) rotate(0.6deg);
	}
}

@media (prefers-reduced-motion: reduce) {
	.mascot-slot {
		animation: none;
	}
}
</style>
