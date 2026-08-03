<script setup lang="ts">
// The mascot is a single 3D render (Stitch: wizard tuxedo cat). Every screen shows
// the mascot through this one component, so a re-crop or a different pose only
// touches this file. `variant` lets a screen opt into an alternate pose without
// each caller hardcoding a path.
withDefaults(defineProps<{ size?: string; variant?: 'wizard' | 'stage' | 'drummer' }>(), {
	size: '6rem',
	variant: 'wizard',
})

const SRC: Record<string, string> = {
	wizard: '/img/stitch/mascot-cat-wizard.png',
	stage: '/img/stitch/mascot-cat-stage.png',
	drummer: '/img/stitch/mascot-cat-drummer.png',
}
</script>

<template>
	<div class="mascot-slot" :style="{ width: size, height: size }">
		<img class="mascot-art" :src="SRC[variant]" alt="" draggable="false" />
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
