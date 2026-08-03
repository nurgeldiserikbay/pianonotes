<script setup lang="ts">
withDefaults(
	defineProps<{
		icon?: object | null
		color?: string
	}>(),
	{ icon: null, color: undefined }
)
</script>

<template>
	<div class="icon-chip">
		<component :is="icon" v-if="icon" class="icon-chip-icon" :style="color ? { color } : undefined" />
		<strong><slot /></strong>
	</div>
</template>

<style scoped lang="scss">
.icon-chip {
	flex: 0 0 auto;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.3rem;
	min-width: 3.4rem;
	padding: 0.45rem 0.85rem;
	border-radius: var(--radius-m);
	background: linear-gradient(155deg, rgba(24, 28, 56, 0.68), rgba(8, 10, 22, 0.5));
	border: 1px solid rgba(255, 255, 255, 0.14);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
}

.icon-chip-icon {
	width: 1rem;
	height: 1rem;
	flex-shrink: 0;
	color: rgba(255, 255, 255, 0.8);
}

.icon-chip strong {
	font-size: clamp(0.9rem, 1.8vw, 1.2rem);
	color: white;
	white-space: nowrap;
}
</style>
