<script setup lang="ts">
// Filled stars use the glossy 3D gold-star render; empty slots reuse the same
// image desaturated + dimmed so the row keeps a consistent silhouette.
withDefaults(defineProps<{ count: number; max?: number }>(), {
	max: 3,
})
</script>

<template>
	<div class="star-row">
		<img
			v-for="n in max"
			:key="n"
			class="star"
			:class="{ filled: n <= count }"
			src="/img/stitch/star-gold.png"
			alt=""
			draggable="false"
		/>
	</div>
</template>

<style scoped lang="scss">
.star-row {
	display: inline-flex;
	gap: 0.1rem;
}

.star {
	width: 1.25rem;
	height: 1.25rem;
	object-fit: contain;
	// Empty slot: keep the shape, drain the color and dim it.
	filter: grayscale(1) brightness(0.5) opacity(0.5);
	transition: filter 160ms ease, transform 160ms ease;
}

.star.filled {
	filter: drop-shadow(0 0 0.35rem rgba(255, 200, 70, 0.7));
	transform: scale(1.05);
}
</style>
