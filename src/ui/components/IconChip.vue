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
	background: var(--surface-2);
	/* A HUD value is a read-out, and a read-out needs a frame: without one the
	   numbers floated on the cabinet. */
	border: 1px solid var(--border);
	box-shadow: var(--shadow-1);
}

.icon-chip-icon {
	width: 1rem;
	height: 1rem;
	flex-shrink: 0;
	color: var(--text-2);
}

.icon-chip strong {
	font-size: clamp(0.9rem, 1.8vw, 1.2rem);
	color: var(--text-1);
	white-space: nowrap;
	// Proportional digits are different widths, so a counter re-flows the whole
	// HUD row on every tick. Tabular figures keep every digit the same width.
	font-variant-numeric: tabular-nums;
	font-feature-settings: 'tnum' 1;
}
</style>
