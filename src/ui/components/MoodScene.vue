<script setup lang="ts">
import type { MelodyMood } from '@/core/models'

// A scene per melody mood, drawn as inline SVG rather than shipped as a photo.
//
// Why not photographs or painted PNGs: they would need a licence tracked per
// file, they cost megabytes in an APK we cut from 21MB to 3.5, and a decoded
// 1080p bitmap is ~8MB of RAM per screen. These weigh nothing, scale to any
// display, and re-tint themselves from the mood's own palette.
//
// Painted-lite, not flat: each scene is a night sky with its own light source,
// a moon or a sun low on the horizon, two or three layers of silhouette and a
// scatter of stars. That layering is what makes a 320×120 strip read as a place
// rather than as a coloured rectangle — the flat two-hill version before this
// looked like a placeholder next to the rest of the neon UI.
defineProps<{ mood: MelodyMood }>()

// Deterministic star field: the same seed every render, so a card does not
// twinkle differently each time Vue re-draws it.
const STARS = [
	[18, 22, 1.4], [46, 12, 1], [74, 30, 1.2], [104, 18, 0.9], [132, 27, 1.3],
	[160, 10, 1], [186, 24, 1.1], [212, 14, 0.9], [238, 29, 1.2], [262, 18, 1],
	[288, 26, 1.3], [306, 12, 0.9], [60, 40, 0.8], [124, 44, 0.9], [200, 42, 0.8],
	[276, 40, 0.9],
] as const
</script>

<template>
	<div class="mood-scene" :class="`mood-${mood}`" aria-hidden="true">
		<svg viewBox="0 0 320 120" preserveAspectRatio="xMidYMid slice">
			<defs>
				<linearGradient :id="`sky-${mood}`" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0%" class="sky-top" />
					<stop offset="62%" class="sky-mid" />
					<stop offset="100%" class="sky-bottom" />
				</linearGradient>
				<radialGradient :id="`halo-${mood}`" cx="0.5" cy="0.5" r="0.5">
					<stop offset="0%" class="halo-in" />
					<stop offset="100%" class="halo-out" />
				</radialGradient>
			</defs>

			<rect width="320" height="120" :fill="`url(#sky-${mood})`" />

			<!-- The light source and its halo: every mood has one, and it is what
			     gives the strip a direction. -->
			<circle class="halo" :cx="mood === 'playful' ? 62 : 246" cy="40" r="42" :fill="`url(#halo-${mood})`" />
			<circle class="light" :cx="mood === 'playful' ? 62 : 246" cy="40" :r="mood === 'bright' ? 17 : 13" />
			<!-- Crescent bite, for the moods whose light is a moon rather than a sun. -->
			<circle
				v-if="mood === 'wistful' || mood === 'solemn' || mood === 'tender'"
				class="moon-bite"
				:cx="252"
				cy="35"
				r="12"
			/>

			<g class="stars">
				<circle v-for="(star, index) in STARS" :key="index" :cx="star[0]" :cy="star[1]" :r="star[2]" />
			</g>

			<!-- bright: open meadow, sun still up -->
			<template v-if="mood === 'bright'">
				<path d="M0 78 Q54 52 112 74 T220 66 T320 78 V120 H0 Z" class="layer-3" />
				<path d="M0 92 Q66 68 140 88 T268 82 T320 92 V120 H0 Z" class="layer-2" />
				<path d="M0 108 Q88 86 178 104 T320 100 V120 H0 Z" class="layer-1" />
			</template>

			<!-- playful: rolling hills, birds, low sun on the left -->
			<template v-else-if="mood === 'playful'">
				<path d="M96 30 q6 -6 12 0 q6 -6 12 0" class="bird" fill="none" />
				<path d="M136 20 q5 -5 10 0 q5 -5 10 0" class="bird" fill="none" />
				<path d="M0 80 Q70 50 142 78 T320 70 V120 H0 Z" class="layer-3" />
				<path d="M0 96 Q80 70 176 94 T320 86 V120 H0 Z" class="layer-2" />
				<path d="M0 110 Q96 88 200 108 T320 102 V120 H0 Z" class="layer-1" />
			</template>

			<!-- calm: still water under the moon, with a reflection -->
			<template v-else-if="mood === 'calm'">
				<path d="M0 84 Q60 66 120 80 T240 74 T320 84 V120 H0 Z" class="layer-3" />
				<rect y="88" width="320" height="32" class="water" />
				<g class="reflection">
					<rect x="240" y="92" width="12" height="2" rx="1" />
					<rect x="236" y="98" width="20" height="2" rx="1" />
					<rect x="242" y="104" width="10" height="2" rx="1" />
					<rect x="234" y="110" width="24" height="2" rx="1" />
				</g>
			</template>

			<!-- tender: blossom trees on a soft rise -->
			<template v-else-if="mood === 'tender'">
				<path d="M0 88 Q70 66 148 86 T320 80 V120 H0 Z" class="layer-3" />
				<g class="tree">
					<rect x="58" y="76" width="4" height="26" rx="2" />
					<circle cx="60" cy="72" r="14" />
					<circle cx="48" cy="78" r="9" />
					<circle cx="72" cy="78" r="9" />
				</g>
				<g class="tree">
					<rect x="196" y="82" width="3" height="20" rx="1.5" />
					<circle cx="197" cy="78" r="10" />
					<circle cx="188" cy="83" r="7" />
					<circle cx="206" cy="83" r="7" />
				</g>
				<path d="M0 106 Q96 88 196 104 T320 98 V120 H0 Z" class="layer-1" />
			</template>

			<!-- wistful: pines against a dusk ridge -->
			<template v-else-if="mood === 'wistful'">
				<path d="M0 74 L40 50 L74 74 L112 46 L150 74 L192 52 L232 74 L276 48 L320 74 V120 H0 Z" class="layer-3" />
				<g class="pines">
					<path d="M44 104 L54 78 L64 104 Z" />
					<path d="M84 106 L96 74 L108 106 Z" />
					<path d="M132 104 L142 80 L152 104 Z" />
					<path d="M214 106 L226 76 L238 106 Z" />
					<path d="M268 104 L278 82 L288 104 Z" />
				</g>
				<path d="M0 104 Q88 96 176 104 T320 100 V120 H0 Z" class="layer-1" />
			</template>

			<!-- solemn: a distant spire, the quietest scene of the six -->
			<template v-else>
				<path d="M0 82 Q80 62 160 80 T320 76 V120 H0 Z" class="layer-3" />
				<g class="spire">
					<path d="M150 96 L160 46 L170 96 Z" />
					<rect x="156" y="40" width="2" height="10" rx="1" />
					<rect x="152" y="44" width="10" height="2" rx="1" />
				</g>
				<path d="M0 100 Q84 88 168 100 T320 96 V120 H0 Z" class="layer-2" />
				<path d="M0 112 Q96 102 200 112 T320 108 V120 H0 Z" class="layer-1" />
			</template>
		</svg>
	</div>
</template>

<style scoped lang="scss">
.mood-scene {
	position: relative;
	width: 100%;
	aspect-ratio: 8 / 3;
	border-radius: inherit;
	overflow: hidden;
}

svg {
	display: block;
	width: 100%;
	height: 100%;
}

/* One palette per mood: sky in three stops, three silhouette layers, and the
   colour of the light. Everything below reads from these, so a mood is six
   custom properties rather than six shapes. */
.mood-bright {
	--sky-1: #3a1f6b;
	--sky-2: #7a3a86;
	--sky-3: #ffb060;
	--l3: #6b2f6d;
	--l2: #4a1f57;
	--l1: #2e1240;
	--light: #ffd98a;
}

.mood-playful {
	--sky-1: #1f2f7a;
	--sky-2: #3f6fbf;
	--sky-3: #8fe3c8;
	--l3: #2c6b6a;
	--l2: #1d4d52;
	--l1: #12333c;
	--light: #ffe98a;
}

.mood-calm {
	--sky-1: #131a5c;
	--sky-2: #24408f;
	--sky-3: #4d7fd6;
	--l3: #16255f;
	--l2: #101c4a;
	--l1: #0b1338;
	--light: #cfe4ff;
}

.mood-tender {
	--sky-1: #3d1552;
	--sky-2: #7c3376;
	--sky-3: #e58fae;
	--l3: #6a2a63;
	--l2: #4b1c4c;
	--l1: #2f1136;
	--light: #ffd6e8;
}

.mood-wistful {
	--sky-1: #171a48;
	--sky-2: #33306f;
	--sky-3: #6f5aa0;
	--l3: #2a2560;
	--l2: #1c1848;
	--l1: #121033;
	--light: #dcd2ff;
}

.mood-solemn {
	--sky-1: #101433;
	--sky-2: #24284f;
	--sky-3: #4a4270;
	--l3: #1e2148;
	--l2: #161835;
	--l1: #0e0f26;
	--light: #f0e6c8;
}

.sky-top { stop-color: var(--sky-1); }
.sky-mid { stop-color: var(--sky-2); }
.sky-bottom { stop-color: var(--sky-3); }

.halo-in { stop-color: var(--light); stop-opacity: 0.45; }
.halo-out { stop-color: var(--light); stop-opacity: 0; }

.light { fill: var(--light); }
/* The bite that turns a disc into a crescent: filled with the sky's own mid
   tone, so it works on any of the six palettes. */
.moon-bite { fill: var(--sky-2); }

.stars circle {
	fill: #ffffff;
	opacity: 0.75;
}

.layer-3 { fill: var(--l3); }
.layer-2 { fill: var(--l2); }
.layer-1 { fill: var(--l1); }

.water { fill: var(--l2); opacity: 0.9; }
.reflection rect { fill: var(--light); opacity: 0.5; }
.bird { stroke: var(--l1); stroke-width: 1.6; stroke-linecap: round; }
.tree circle { fill: var(--l2); }
.tree rect { fill: var(--l1); }
.pines path { fill: var(--l1); }
.spire path,
.spire rect { fill: var(--l1); }
</style>
