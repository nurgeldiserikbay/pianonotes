<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ grade: string }>()

// Letter grades only (S/SS/SSS, A, B, C, D — Time/Endless badges). Campaign's
// numeric star-count badges are rendered with StarRow instead, never through here.
const COLOR_BY_GRADE: Record<string, string> = {
	SSS: 'var(--grade-s)',
	SS: 'var(--grade-s)',
	S: 'var(--grade-s)',
	A: 'var(--grade-a)',
	B: 'var(--grade-b)',
	C: 'var(--grade-c)',
	D: 'var(--grade-d)',
}

const color = computed(() => COLOR_BY_GRADE[props.grade] ?? 'var(--grade-d)')
</script>

<template>
	<strong class="grade-badge" :style="{ color }">{{ grade }}</strong>
</template>

<style scoped lang="scss">
.grade-badge {
	font-size: clamp(1.4rem, 4vw, 2.1rem);
	line-height: 1;
	filter: drop-shadow(0 0 0.55rem currentColor);
}
</style>
