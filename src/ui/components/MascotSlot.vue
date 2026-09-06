<script setup lang="ts">
// Every screen shows the mascot through this one component, so a new pose set
// only touches this file.
//
// Poses are looked up in /img/mascot/ first — that is where hand-drawn artwork
// is meant to land, one PNG per pose, transparent, square. Anything missing
// falls back to the render the app already ships, so dropping in one file at a
// time works and a half-finished set never breaks a screen.
import { ref } from 'vue'

const props = withDefaults(
	defineProps<{ size?: string; variant?: 'idle' | 'happy' | 'cheer' | 'thinking' | 'wink' }>(),
	{ size: '6rem', variant: 'idle' }
)

const ART = `/img/mascot/cat-${props.variant}.png`
const FALLBACK: Record<string, string> = {
	idle: '/img/stitch/mascot-cat-wizard.png',
	happy: '/img/stitch/mascot-cat-stage.png',
	cheer: '/img/stitch/mascot-cat-stage.png',
	thinking: '/img/stitch/mascot-cat-wizard.png',
	wink: '/img/stitch/mascot-cat-drummer.png',
}

const src = ref(ART)
const onError = () => {
	const fallback = FALLBACK[props.variant] ?? FALLBACK.idle
	if (src.value !== fallback) src.value = fallback
}
</script>

<template>
	<div class="mascot-slot" :style="{ width: size, height: size }">
		<img class="mascot-art" :src="src" alt="" draggable="false" @error="onError" />
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
