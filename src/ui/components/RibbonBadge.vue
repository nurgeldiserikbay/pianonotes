<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'gold' | 'pink' | 'blue' | 'red' | 'green' }>(), {
	tone: 'gold',
})
</script>

<template>
	<span class="ribbon" :class="`tone-${tone}`"><slot /></span>
</template>

<style scoped lang="scss">
.ribbon {
	display: inline-flex;
	align-items: center;
	padding: 0.2rem 0.55rem;
	border-radius: var(--radius-round);
	font-size: 0.68rem;
	font-weight: 800;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	white-space: nowrap;
}

.tone-gold {
	background: linear-gradient(135deg, #ffd86f, #ff9dd8);
	color: #07111f;
}

.tone-pink {
	background: rgba(255, 111, 216, 0.25);
	color: #ffd7f0;
}

.tone-blue {
	background: rgba(89, 185, 255, 0.25);
	color: #cdeeff;
}

.tone-red {
	background: rgba(255, 99, 99, 0.25);
	color: #ffd7d7;
}

.tone-green {
	background: rgba(123, 228, 149, 0.25);
	color: #d8ffe3;
}
</style>
