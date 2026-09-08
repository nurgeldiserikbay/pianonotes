<script setup lang="ts">
// Stars are drawn from the icon set rather than a bitmap render: they stay crisp
// at any size, tint from tokens, and cost nothing to download.
import IconStar from '@/assets/icons-v2/star.svg'

withDefaults(defineProps<{ count: number; max?: number }>(), {
	max: 3,
})
</script>

<template>
	<div class="star-row">
		<IconStar
			v-for="n in max"
			:key="n"
			class="star"
			:class="{ filled: n <= count }"
		/>
	</div>
</template>

<style scoped lang="scss">
.star-row {
	display: inline-flex;
	gap: 0.1rem;
}

.star {
	width: 1.1rem;
	height: 1.1rem;
	// Empty slot: same silhouette, drained of color so the row reads as progress.
	color: var(--text-3);
	transition: color var(--dur-2) var(--ease), transform var(--dur-2) var(--ease),
		filter var(--dur-2) var(--ease);
}

// The icon set is drawn as strokes, so an earned star has to be filled here.
// Without this the whole row is outlines and there is nothing to tell earned
// from unearned — which is the only thing the row exists to say.
.star.filled {
	color: var(--mode-records);
	fill: var(--mode-records);
	filter: drop-shadow(0 0 0.3rem color-mix(in srgb, var(--mode-records) 55%, transparent));
	transform: scale(1.06);
}
</style>
