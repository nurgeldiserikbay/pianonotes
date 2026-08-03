<script setup lang="ts">
import { computed, ref } from 'vue'

import { BACKGROUND_PRESETS } from '@/modes/modeDefinitions'
import { formatAccuracy, formatTime } from '@/features/scoring'
import { getLaneLabel } from '@/entities/piano'
import { useAppStore } from '@/ui/stores/appStore'

import IconLock from '@/assets/icons/lock.svg'
import IconMusic from '@/assets/icons/music.svg'
import IconSound from '@/assets/icons/sound.svg'
import IconGlow from '@/assets/icons/glow.svg'
import IconParticles from '@/assets/icons/particles.svg'
import IconLayout from '@/assets/icons/layout.svg'

import StarRow from '@/ui/components/StarRow.vue'
import GradeBadge from '@/ui/components/GradeBadge.vue'
import MascotSlot from '@/ui/components/MascotSlot.vue'

import GameStage from './components/GameStage.vue'

const appStore = useAppStore()
const screen = computed(() => appStore.screen)

function noteChipLabel(laneId: string) {
	return getLaneLabel(laneId, appStore.settings.noteNamingSystem)
}

const heroTheme = computed(() =>
	appStore.activeSession
		? BACKGROUND_PRESETS[appStore.activeSession.themeId]
		: BACKGROUND_PRESETS['purple-blue']
)

const totalStars = computed(() =>
	appStore.levels.reduce((sum, level) => {
		return sum + (appStore.campaignProgress[level.id]?.bestStars ?? 0)
	}, 0)
)

// A light, honest gamification touch — derived entirely from real star progress
// (not a fabricated separate stat), matching the "Pianist Lv. N" flavor from the
// reference without inventing new state to track.
const STARS_PER_LEVEL = 15
const playerLevel = computed(() => Math.floor(totalStars.value / STARS_PER_LEVEL) + 1)
// 0..1 progress toward the next Pianist level, for the topbar XP bar in the ref.
const levelProgress = computed(() => (totalStars.value % STARS_PER_LEVEL) / STARS_PER_LEVEL)

// "NEW" hint on the Records card while the player hasn't stored any run yet — an
// honest nudge (the section really is new to them), not a fake permanent badge.
const hasAnyRecord = computed(() =>
	Object.values(appStore.records).some((list) => list.length > 0)
)

const groupedRecords = computed(() => [
	{ id: 'campaign', title: 'Campaign', items: appStore.records.campaign },
	{ id: 'time', title: 'Time Mode', items: appStore.records.time },
	{ id: 'endless', title: 'Endless', items: appStore.records.endless },
])

// Records used to render as a 2-column grid of all three groups at once — cards in
// the same grid row stretch to match the tallest one, so a mode with few records
// left a big dead gap under "No records yet." One tab at a time avoids that
// entirely, since there's nothing else in the row to stretch against.
const selectedRecordsTab = ref('campaign')

const activeRecordGroup = computed(
	() => groupedRecords.value.find((group) => group.id === selectedRecordsTab.value) ?? groupedRecords.value[0]
)

// Per-difficulty campaign-world identity: a glossy 3D note whose color signals
// "this world is harder" (green → cyan → purple), reusing the same note assets
// as the menu mode cards so the visual language stays consistent.
const DIFFICULTY_NOTE: Record<string, string> = {
	easy: 'var(--note-trainer)',
	normal: 'var(--note-time)',
	hard: 'var(--note-endless)',
}

// "NEW BEST!" tags — campaign is the only mode with explicit best-tracking
// (campaignProgress), so this only ever lights up there. By the time the result
// screen renders, storeResult() has already merged this run into the stored
// best, so "this run's value equals the stored best" is an honest, low-risk way
// to detect "this run just set (or matched) the record" without new state.
const resultProgress = computed(() => {
	const result = appStore.lastResult
	if (!result || result.modeId !== 'campaign' || !result.levelId) return null
	return appStore.campaignProgress[result.levelId] ?? null
})

const isNewBestScore = computed(() => {
	const result = appStore.lastResult
	const progress = resultProgress.value
	return !!result && !!progress && result.score > 0 && result.score === progress.bestScore
})

const isNewBestAccuracy = computed(() => {
	const result = appStore.lastResult
	const progress = resultProgress.value
	return !!result && !!progress && result.accuracy === progress.bestAccuracy
})

const isNewBestCombo = computed(() => {
	const result = appStore.lastResult
	const progress = resultProgress.value
	return !!result && !!progress && result.maxCombo > 0 && result.maxCombo === progress.bestCombo
})
</script>

<template>
	<div
		class="shell"
		:style="{
			'--hero-gradient': heroTheme.uiGradient,
			'--hero-accent': heroTheme.accent,
		}"
	>
		<div class="shell-bg">
			<span v-if="screen === 'menu'" class="floating-note note-1">♪</span>
			<span v-if="screen === 'menu'" class="floating-note note-2">♫</span>
			<span v-if="screen === 'menu'" class="floating-note note-3">♩</span>
			<span v-if="screen === 'menu'" class="floating-note note-4">♬</span>
		</div>

		<header v-if="screen !== 'gameplay' && screen !== 'menu'" class="topbar">
			<button class="ghost-btn" @click="appStore.back">
				Back
			</button>
			<div class="brand">
				<img class="brand-mark" src="/img/stitch/treble-clef.png" alt="" draggable="false" />
				<div class="brand-text">
					<strong>Piano Notes</strong>
				</div>
			</div>
		</header>

		<main class="content">
			<section v-if="screen === 'menu'" class="screen menu-screen">
				<!-- Top HUD bar: player chip (left) · logo (center) · stars (right) -->
				<header class="menu-hud">
					<div class="player-chip">
						<span class="player-avatar">
							<img src="/img/stitch/mascot-cat-wizard.png" alt="" draggable="false" />
						</span>
						<div class="player-info">
							<strong class="player-name">Pianist</strong>
							<span class="player-lv">Lv. {{ playerLevel }}</span>
							<span class="xp-bar"><span class="xp-fill" :style="{ width: `${levelProgress * 100}%` }" /></span>
						</div>
					</div>

					<h1 class="menu-logo">Piano Notes</h1>

					<div class="stars-chip">
						<img src="/img/stitch/star-gold.png" alt="" class="stars-chip-icon" draggable="false" />
						<strong>{{ totalStars }}</strong>
					</div>
				</header>

				<!-- Body: mascot host (left) + 3×2 mode grid (right) -->
				<div class="menu-body">
					<MascotSlot class="menu-mascot" size="min(52vh, 15rem)" variant="wizard" />

					<div class="menu-cards">
						<button class="menu-card mode-campaign" @click="appStore.openCampaignLevels">
							<span class="menu-card-icon icon-campaign" />
							<span class="menu-card-title">Campaign</span>
						</button>
						<button class="menu-card mode-time" @click="appStore.startTimeMode">
							<span class="menu-card-icon icon-time" />
							<span class="menu-card-title">Time Mode</span>
						</button>
						<button class="menu-card mode-endless" @click="appStore.startEndlessMode">
							<span class="menu-card-icon icon-endless" />
							<span class="menu-card-title">Endless</span>
						</button>
						<button class="menu-card mode-trainer" @click="appStore.startTrainerMode">
							<span class="menu-card-icon icon-trainer" />
							<span class="menu-card-title">Note Trainer</span>
						</button>
						<button class="menu-card mode-records" @click="appStore.openRecords">
							<span v-if="!hasAnyRecord" class="menu-card-badge">NEW</span>
							<span class="menu-card-icon icon-records" />
							<span class="menu-card-title">Records</span>
						</button>
						<button class="menu-card mode-settings" @click="appStore.openSettings">
							<span class="menu-card-icon icon-settings" />
							<span class="menu-card-title">Settings</span>
						</button>
					</div>
				</div>
			</section>

			<section v-else-if="screen === 'campaign-levels'" class="screen stack">
				<div class="song-list">
					<template v-for="world in appStore.worldsWithProgress" :key="world.id">
						<div class="song-section">
							<span class="song-section-note" :style="{ '--note': DIFFICULTY_NOTE[world.difficulty] }" />
							<div class="song-section-text">
								<strong>{{ world.title }}</strong>
								<span>{{ world.concept }}</span>
								<div v-if="world.newNoteIds.length" class="note-chips">
									<span v-for="noteId in world.newNoteIds" :key="noteId" class="note-chip">{{
										noteChipLabel(noteId)
									}}</span>
								</div>
							</div>
							<span class="section-stars">{{ world.starsEarned }}/{{ world.totalStars }} ★</span>
						</div>

						<button
							v-for="level in world.levels"
							:key="level.id"
							class="song-row"
							:class="{ locked: !appStore.isLevelUnlocked(level.index ?? 0), milestone: level.isMilestone }"
							:disabled="!appStore.isLevelUnlocked(level.index ?? 0)"
							@click="appStore.startCampaignLevel(level.id)"
						>
							<span v-if="level.isMilestone" class="corner-ribbon">Real Song</span>
							<span class="song-row-index">{{ (level.index ?? 0) + 1 }}</span>
							<span class="song-row-title">
								<strong>{{ level.title }}</strong>
								<span>{{ level.artist }} · {{ level.bpm }} BPM</span>
							</span>
							<span class="song-row-trailing">
								<IconLock v-if="!appStore.isLevelUnlocked(level.index ?? 0)" class="song-row-lock" />
								<StarRow
									v-else
									:count="appStore.campaignProgress[level.id]?.bestStars ?? 0"
									:max="3"
								/>
							</span>
						</button>
					</template>
				</div>
			</section>

			<section v-else-if="screen === 'records'" class="screen stack">
				<div class="segmented records-tabs">
					<button
						v-for="group in groupedRecords"
						:key="group.id"
						type="button"
						:class="{ active: selectedRecordsTab === group.id }"
						@click="selectedRecordsTab = group.id"
					>
						{{ group.title }}
					</button>
				</div>

				<div class="glass-card records-panel">
					<div class="section-head">
						<strong>{{ activeRecordGroup.title }}</strong>
						<span>{{ activeRecordGroup.items.length }}/5 stored</span>
					</div>
					<div v-if="activeRecordGroup.items.length" class="records-list">
						<div
							v-for="(record, index) in activeRecordGroup.items"
							:key="record.id"
							class="record-item"
						>
							<span class="record-rank">{{ index + 1 }}</span>
							<div class="record-item-text">
								<strong>{{ record.levelTitle || activeRecordGroup.title }}</strong>
								<span>{{ new Date(record.date).toLocaleDateString() }}</span>
							</div>
							<div class="record-stats">
								<span>{{ record.score }}</span>
								<span>{{ record.accuracy.toFixed(1) }}%</span>
								<GradeBadge v-if="!/^[0-3]$/.test(record.badge)" class="record-grade" :grade="record.badge" />
								<StarRow v-else :count="Number(record.badge)" :max="3" />
							</div>
						</div>
					</div>
					<div v-else class="empty-state">
						<img class="empty-state-art" src="/img/stitch/treble-clef.png" alt="" draggable="false" />
						<p class="empty-copy">
							No {{ activeRecordGroup.title }} records yet — play a run to see it here.
						</p>
					</div>
				</div>
			</section>

			<section v-else-if="screen === 'settings'" class="screen stack">
				<div class="settings-grid">
					<button
						class="toggle-card accent-time"
						@click="
							appStore.updateAppSettings({
								soundEnabled: !appStore.settings.soundEnabled,
							})
						"
					>
						<span class="toggle-card-icon-badge"><IconSound class="toggle-card-icon" /></span>
						<strong class="toggle-card-label">Sound</strong>
						<span class="switch" :class="{ on: appStore.settings.soundEnabled }"><span class="switch-knob" /></span>
					</button>
					<button
						class="toggle-card accent-endless"
						@click="
							appStore.updateAppSettings({
								musicEnabled: !appStore.settings.musicEnabled,
							})
						"
					>
						<span class="toggle-card-icon-badge"><IconMusic class="toggle-card-icon" /></span>
						<strong class="toggle-card-label">Music</strong>
						<span class="switch" :class="{ on: appStore.settings.musicEnabled }"><span class="switch-knob" /></span>
					</button>
					<button
						class="toggle-card accent-campaign"
						@click="
							appStore.updateAppSettings({
								showLaneGlow: !appStore.settings.showLaneGlow,
							})
						"
					>
						<span class="toggle-card-icon-badge"><IconGlow class="toggle-card-icon" /></span>
						<strong class="toggle-card-label">Lane Glow</strong>
						<span class="switch" :class="{ on: appStore.settings.showLaneGlow }"><span class="switch-knob" /></span>
					</button>
					<button
						class="toggle-card accent-records"
						@click="
							appStore.updateAppSettings({
								showParticles: !appStore.settings.showParticles,
							})
						"
					>
						<span class="toggle-card-icon-badge"><IconParticles class="toggle-card-icon" /></span>
						<strong class="toggle-card-label">Particles</strong>
						<span class="switch" :class="{ on: appStore.settings.showParticles }"><span class="switch-knob" /></span>
					</button>
					<button
						class="toggle-card accent-trainer"
						@click="
							appStore.updateAppSettings({
								leftHandedHud: !appStore.settings.leftHandedHud,
							})
						"
					>
						<span class="toggle-card-icon-badge"><IconLayout class="toggle-card-icon" /></span>
						<strong class="toggle-card-label">HUD Align</strong>
						<span class="switch" :class="{ on: appStore.settings.leftHandedHud }"><span class="switch-knob" /></span>
					</button>
					<div class="toggle-card naming-card accent-settings">
						<span class="naming-card-head">
							<span class="toggle-card-icon-badge"><IconMusic class="toggle-card-icon" /></span>
							<strong class="toggle-card-label">Note Names</strong>
						</span>
						<div class="segmented">
							<button
								type="button"
								:class="{ active: appStore.settings.noteNamingSystem === 'letters' }"
								@click="appStore.updateAppSettings({ noteNamingSystem: 'letters' })"
							>
								Letters
							</button>
							<button
								type="button"
								:class="{ active: appStore.settings.noteNamingSystem === 'solfege' }"
								@click="appStore.updateAppSettings({ noteNamingSystem: 'solfege' })"
							>
								Do-Re-Mi
							</button>
						</div>
					</div>
				</div>

				<button
					class="secondary-btn destructive"
					@click="appStore.clearAllProgress"
				>
					Reset Stored Progress
				</button>
			</section>

			<section v-else-if="screen === 'result'" class="screen stack">
				<div class="result-card">
					<MascotSlot
						class="result-mascot"
						size="5.5rem"
						:variant="(appStore.lastResult?.stars ?? 0) >= 3 ? 'stage' : 'wizard'"
					/>
					<div class="result-header">
						<StarRow
							v-if="appStore.lastResult?.modeId === 'campaign'"
							class="result-stars"
							:count="appStore.lastResult?.stars ?? 0"
							:max="3"
						/>
						<GradeBadge v-else :grade="appStore.lastResult?.badge ?? 'D'" />
						<h2>
							{{ appStore.lastResult?.levelTitle || appStore.lastResult?.modeId }}
						</h2>
					</div>
					<div class="grid result-stats">
						<div class="glass-card">
							<span class="eyebrow">Score</span>
							<strong class="metric">{{
								appStore.lastResult?.score ?? 0
							}}</strong>
							<span v-if="isNewBestScore" class="new-best-tag">New Best!</span>
						</div>
						<div class="glass-card">
							<span class="eyebrow">Accuracy</span>
							<strong class="metric">{{
								formatAccuracy(appStore.lastResult?.accuracy ?? 100)
							}}</strong>
							<span v-if="isNewBestAccuracy" class="new-best-tag">New Best!</span>
						</div>
						<div class="glass-card">
							<span class="eyebrow">Max Combo</span>
							<strong class="metric">{{
								appStore.lastResult?.maxCombo ?? 0
							}}</strong>
							<span v-if="isNewBestCombo" class="new-best-tag">New Best!</span>
						</div>
						<div class="glass-card">
							<span class="eyebrow">{{
								appStore.lastResult?.modeId === 'endless'
									? 'Survival'
									: appStore.lastResult?.modeId === 'time'
										? 'Time'
										: 'Misses'
							}}</span>
							<strong class="metric">
								{{
									appStore.lastResult?.modeId === 'endless' ||
									appStore.lastResult?.modeId === 'time'
										? formatTime(appStore.lastResult?.survivalTimeSec ?? 0)
										: appStore.lastResult?.misses ?? 0
								}}
							</strong>
						</div>
					</div>

					<p v-if="appStore.adMessage" class="ad-copy">
						{{ appStore.adMessage }}
					</p>

					<div class="hero-actions">
						<button
							class="secondary-btn"
							:class="{ primary: appStore.lastResult?.modeId !== 'campaign' }"
							@click="appStore.replayLast"
						>
							Retry
						</button>
						<button
							v-if="appStore.lastResult?.modeId === 'campaign'"
							class="primary-btn"
							@click="appStore.nextCampaignLevel"
						>
							Next
						</button>
						<button class="secondary-btn" @click="appStore.goHome">Menu</button>
					</div>
				</div>
			</section>

			<GameStage
				v-else-if="screen === 'gameplay' && appStore.activeSession"
				:session="appStore.activeSession"
				:settings="appStore.settings"
				@finish="appStore.finishSession"
				@acknowledge-notes="appStore.acknowledgeNewNotes"
				@exit="appStore.exitGameplay"
			/>
		</main>
	</div>
</template>

<style scoped lang="scss">
.shell {
	position: relative;
	height: 100dvh;
	display: flex;
	flex-direction: column;
	padding: max(env(safe-area-inset-top), 1rem)
		max(env(safe-area-inset-right), 1rem) max(env(safe-area-inset-bottom), 1rem)
		max(env(safe-area-inset-left), 1rem);
	background: #090d18;
	color: #f7f9ff;
	overflow-x: hidden;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
}

/* Layered background: the Stitch neon-staff scene photo at the bottom, a dark +
   theme-tinted gradient veil on top so foreground text/cards always stay legible
   over the busy artwork. */
.shell-bg {
	position: fixed;
	inset: 0;
	z-index: 0;
	background:
		radial-gradient(circle at 15% 10%, rgba(255, 255, 255, 0.1), transparent 24%),
		radial-gradient(circle at 82% 22%, rgba(255, 150, 210, 0.14), transparent 26%),
		linear-gradient(160deg, rgba(9, 12, 24, 0.34), rgba(9, 12, 24, 0.6)),
		var(--asset-bg-scene) center / cover no-repeat,
		var(--hero-gradient);
	overflow: hidden;
}

/* Purely decorative — keeps the home screen from feeling like a bare settings
   panel. Slow drift + fade, low opacity, ignores clicks. */
.floating-note {
	position: absolute;
	color: rgba(255, 255, 255, 0.16);
	font-size: 2.6rem;
	pointer-events: none;
	animation: note-drift 14s ease-in-out infinite;
}

.note-1 {
	top: 12%;
	left: 8%;
	animation-delay: 0s;
}

.note-2 {
	top: 55%;
	left: 88%;
	font-size: 3.4rem;
	animation-delay: 3s;
}

.note-3 {
	top: 78%;
	left: 20%;
	animation-delay: 6s;
}

.note-4 {
	top: 20%;
	left: 70%;
	font-size: 2.1rem;
	animation-delay: 9s;
}

@keyframes note-drift {
	0%,
	100% {
		transform: translateY(0) rotate(-4deg);
		opacity: 0.12;
	}
	50% {
		transform: translateY(-18px) rotate(4deg);
		opacity: 0.22;
	}
}

.topbar,
.content {
	position: relative;
	z-index: 1;
}

.topbar {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	margin-bottom: 0.6rem;
}

.brand {
	display: flex;
	align-items: center;
	gap: 0.7rem;
}

.brand-text {
	display: grid;
	gap: 0.05rem;
}

.brand strong {
	font-size: 1.05rem;
}

.brand-mark {
	width: 2.4rem;
	height: 2.4rem;
	object-fit: contain;
	filter: var(--art-shadow);
}

.content {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.screen {
	max-width: 72rem;
	margin: 0 auto;
	width: 100%;
}

/* The menu is the one screen meant to exactly fill the remaining space (no dead
   zone, no overflow) — every other screen sizes to its own content and lets
   .shell's overflow-y handle the rest. */
/* Reference layout: a top HUD strip (player · logo · stars) over a body that puts
   the mascot host on the left and the 3×2 mode grid on the right. */
.screen.menu-screen {
	flex: 1;
	min-height: 0;
	max-width: 78rem;
	display: flex;
	flex-direction: column;
	gap: 0.7rem;
}

.stack {
	display: grid;
	gap: 0.5rem;
}

.grid {
	display: grid;
	gap: 0.5rem;
}

.two-up {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.glass-card,
.result-card {
	padding: 0.85rem 1rem;
	border-radius: var(--radius-l);
	background: linear-gradient(
		160deg,
		rgba(20, 24, 48, 0.74),
		rgba(11, 14, 30, 0.56)
	);
	border: 1px solid rgba(255, 255, 255, 0.14);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08),
		var(--shadow-2),
		0 0 2.4rem color-mix(in srgb, var(--hero-accent) 12%, transparent);
	backdrop-filter: blur(18px);
}

.glass-card {
	position: relative;
}

.result-card h2 {
	margin: 0.15rem 0;
	line-height: 1.08;
}

.hero-actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	align-items: center;
	gap: 0.6rem;
}

.primary-btn,
.secondary-btn,
.ghost-btn,
.menu-card,
.toggle-card {
	border: none;
	cursor: pointer;
	transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
}

.primary-btn,
.secondary-btn,
.ghost-btn {
	padding: 0.7rem 1.15rem;
	border-radius: var(--radius-round);
	font-weight: 700;
	font-size: 0.9rem;
}

.primary-btn,
.secondary-btn.primary {
	background: linear-gradient(
		135deg,
		#ffd86f 0%,
		#ff9dd8 45%,
		var(--hero-accent) 100%
	);
	color: #07111f;
	box-shadow: 0 1rem 2.4rem
		color-mix(in srgb, var(--hero-accent) 30%, transparent);
}

.primary-btn.small {
	padding: 0.7rem 1rem;
	font-size: 0.88rem;
}

.secondary-btn {
	background: rgba(255, 255, 255, 0.1);
	color: white;
}

/* A destructive, rarely-used action shouldn't be the visually loudest thing on
   the screen — small, centered, and muted instead of a full-width filled pill. */
.secondary-btn.destructive {
	justify-self: center;
	background: transparent;
	border: 1px solid rgba(255, 120, 140, 0.28);
	color: rgba(255, 200, 210, 0.75);
	padding: 0.55rem 1.1rem;
	font-size: 0.82rem;
}

.secondary-btn.destructive:hover {
	background: rgba(255, 120, 140, 0.12);
	color: #ffd7df;
}

.ghost-btn {
	background: rgba(255, 255, 255, 0.06);
	color: rgba(243, 246, 255, 0.88);
}

.metric {
	display: block;
	font-size: clamp(1.55rem, 4vw, 2.35rem);
	margin-top: 0.4rem;
}

.eyebrow {
	font-size: 0.75rem;
	letter-spacing: 0.14em;
	text-transform: uppercase;
	color: rgba(231, 237, 255, 0.62);
}

.menu-card,
.toggle-card {
	padding: 0.7rem 0.85rem;
	border-radius: var(--radius-l);
	background: linear-gradient(
		150deg,
		rgba(17, 22, 44, 0.75),
		rgba(9, 12, 24, 0.55)
	);
	border: 1px solid rgba(255, 255, 255, 0.12);
	color: #f7f9ff;
	text-align: left;
}

.menu-card:hover,
.toggle-card:hover,
.primary-btn:hover,
.secondary-btn:hover,
.ghost-btn:hover {
	transform: translateY(-2px);
	box-shadow: var(--shadow-2);
}

/* Landscape-first home: left is the 3D mascot "host" over the neon scene, right is
   the 3×2 grid of mode cards. Every destination is one tap away — no intermediate
   "pick a mode" page. */
/* ---- Top HUD bar ---- */
.menu-hud {
	flex-shrink: 0;
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	align-items: center;
	gap: 0.6rem;
}

.player-chip {
	justify-self: start;
	display: flex;
	align-items: center;
	gap: 0.55rem;
	padding: 0.3rem 0.7rem 0.3rem 0.35rem;
	border-radius: var(--radius-round);
	background: linear-gradient(150deg, rgba(28, 24, 54, 0.72), rgba(12, 14, 30, 0.55));
	border: 1px solid rgba(255, 255, 255, 0.14);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), var(--shadow-1);
	backdrop-filter: blur(14px);
}

.player-avatar {
	flex-shrink: 0;
	display: grid;
	place-items: center;
	width: 2.5rem;
	height: 2.5rem;
	border-radius: 50%;
	overflow: hidden;
	background: radial-gradient(circle at 50% 35%, rgba(255, 216, 111, 0.3), rgba(12, 14, 30, 0.6));
	border: 2px solid rgba(255, 216, 111, 0.55);
}

.player-avatar img {
	width: 150%;
	height: 150%;
	object-fit: contain;
	object-position: center 20%;
}

.player-info {
	display: grid;
	gap: 0.08rem;
	min-width: 4.5rem;
}

.player-name {
	font-size: 0.8rem;
	line-height: 1;
}

.player-lv {
	font-size: 0.62rem;
	font-weight: 800;
	color: rgba(255, 216, 111, 0.92);
	text-transform: uppercase;
	letter-spacing: 0.04em;
}

.xp-bar {
	margin-top: 0.12rem;
	height: 0.32rem;
	border-radius: var(--radius-round);
	background: rgba(255, 255, 255, 0.14);
	overflow: hidden;
}

.xp-fill {
	display: block;
	height: 100%;
	border-radius: var(--radius-round);
	background: linear-gradient(90deg, #ffd86f, #ff9d3d);
	box-shadow: 0 0 0.4rem rgba(255, 200, 70, 0.6);
	transition: width 320ms ease;
}

.menu-logo {
	justify-self: center;
	margin: 0;
	font-size: clamp(1.5rem, 5vw, 2.6rem);
	font-weight: 800;
	line-height: 1;
	letter-spacing: 0.01em;
	background: linear-gradient(135deg, #fff 0%, #ffe6a6 45%, #ff9dd8 100%);
	-webkit-background-clip: text;
	background-clip: text;
	color: transparent;
	filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.45));
	white-space: nowrap;
}

.stars-chip {
	justify-self: end;
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0.3rem 0.85rem;
	border-radius: var(--radius-round);
	background: linear-gradient(150deg, rgba(28, 24, 54, 0.72), rgba(12, 14, 30, 0.55));
	border: 1px solid rgba(255, 216, 111, 0.4);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), var(--shadow-1);
	backdrop-filter: blur(14px);
	font-weight: 800;
	font-size: 1rem;
}

.stars-chip-icon {
	width: 1.2rem;
	height: 1.2rem;
	object-fit: contain;
	filter: drop-shadow(0 0 0.35rem rgba(255, 200, 70, 0.7));
}

/* ---- Body: mascot + cards ---- */
.menu-body {
	flex: 1;
	min-height: 0;
	display: grid;
	grid-template-columns: minmax(0, 0.72fr) minmax(0, 1.28fr);
	gap: 0.8rem;
	align-items: center;
}

.menu-mascot {
	align-self: end;
	justify-self: center;
}

.menu-cards {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	grid-template-rows: repeat(2, minmax(4.4rem, 1fr));
	gap: 0.6rem;
	height: 100%;
	min-height: 0;
	align-content: center;
}

/* Vivid cards with a tinted note/star pattern baked into each colored fill (see the
   reference). The pattern gives every card life and variety while a shared glossy
   top sheen, rounded frame and consistent grid keep them a cohesive set.
   --accent = mode color; --pat = the colored pattern background. */
.menu-card {
	--accent: var(--mode-time);
	--pat: none;
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.5rem;
	padding: 0.7rem 0.7rem 0.75rem;
	text-align: center;
	overflow: hidden;
	border: 1px solid color-mix(in srgb, var(--accent) 55%, rgba(255, 255, 255, 0.25));
	border-radius: var(--radius-l);
	background: var(--pat) center / cover no-repeat,
		linear-gradient(180deg, color-mix(in srgb, var(--accent) 90%, white 5%), color-mix(in srgb, var(--accent) 70%, black 25%));
	box-shadow:
		inset 0 1.5px 0 rgba(255, 255, 255, 0.4),
		inset 0 -1.2rem 1.8rem color-mix(in srgb, var(--accent) 55%, black 30%),
		0 0.6rem 1.4rem rgba(0, 0, 0, 0.4),
		0 0 1.4rem color-mix(in srgb, var(--accent) 28%, transparent);
	transition: transform 160ms cubic-bezier(0.2, 0.7, 0.3, 1), box-shadow 200ms ease, filter 160ms ease;
}

.menu-card:hover {
	transform: translateY(-4px);
	filter: brightness(1.06);
	box-shadow:
		inset 0 1.5px 0 rgba(255, 255, 255, 0.5),
		inset 0 -1.2rem 1.8rem color-mix(in srgb, var(--accent) 55%, black 30%),
		0 1rem 2.2rem rgba(0, 0, 0, 0.45),
		0 0 2.4rem color-mix(in srgb, var(--accent) 55%, transparent);
}

.menu-card.mode-campaign { --accent: var(--mode-campaign); --pat: url('/img/stitch/patterns/pat-campaign.png'); }
.menu-card.mode-time { --accent: var(--mode-time); --pat: url('/img/stitch/patterns/pat-time.png'); }
.menu-card.mode-endless { --accent: var(--mode-endless); --pat: url('/img/stitch/patterns/pat-endless.png'); }
.menu-card.mode-trainer { --accent: var(--mode-trainer); --pat: url('/img/stitch/patterns/pat-trainer.png'); }
.menu-card.mode-records { --accent: var(--mode-records); --pat: url('/img/stitch/patterns/pat-records.png'); }
.menu-card.mode-settings { --accent: var(--mode-settings); --pat: url('/img/stitch/patterns/pat-settings.png'); }

/* Detailed 3D glyph on transparent bg (see /img/stitch/iconsx), sitting on a soft
   accent-colored light pool so it reads as lit by the card's own glow. */
.menu-card-icon {
	position: relative;
	z-index: 1;
	width: 4.2rem;
	height: 4.2rem;
	background-repeat: no-repeat;
	background-position: center;
	background-size: contain;
	filter: drop-shadow(0 3px 7px rgba(0, 0, 0, 0.45))
		drop-shadow(0 0 0.7rem rgba(255, 255, 255, 0.35));
	transition: transform 200ms cubic-bezier(0.2, 0.7, 0.3, 1);
}

/* Soft white light pool behind the icon so it pops off the colored fill. */
.menu-card-icon::before {
	content: '';
	position: absolute;
	inset: -18%;
	z-index: -1;
	background: radial-gradient(circle, rgba(255, 255, 255, 0.35), transparent 65%);
	filter: blur(6px);
}

.menu-card:hover .menu-card-icon {
	transform: scale(1.08) translateY(-2px);
}

.icon-campaign { background-image: url('/img/stitch/iconsx/icon-campaign.png'); }
.icon-time { background-image: url('/img/stitch/iconsx/icon-time.png'); }
.icon-endless { background-image: url('/img/stitch/iconsx/icon-endless.png'); }
.icon-trainer { background-image: url('/img/stitch/iconsx/icon-trainer.png'); }
.icon-records { background-image: url('/img/stitch/iconsx/icon-records.png'); }
.icon-settings { background-image: url('/img/stitch/iconsx/icon-settings.png'); }

.menu-card-title {
	position: relative;
	z-index: 1;
	font-size: 1rem;
	font-weight: 800;
	color: #ffffff;
	text-shadow: 0 2px 4px color-mix(in srgb, var(--accent) 60%, black 40%),
		0 1px 2px rgba(0, 0, 0, 0.4);
}

/* "NEW" ribbon in the top-right corner, like the reference's Records badge. */
.menu-card-badge {
	position: absolute;
	top: 0.5rem;
	right: 0.5rem;
	z-index: 2;
	padding: 0.12rem 0.45rem;
	border-radius: var(--radius-round);
	background: linear-gradient(135deg, #ff5ea3, #b23bff);
	color: #fff;
	font-size: 0.6rem;
	font-weight: 800;
	letter-spacing: 0.06em;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}

/* Two columns uses the width landscape gives us, roughly halving how far the
   300-level list has to scroll. */
.song-list {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 0.4rem 0.6rem;
}

.song-section {
	grid-column: 1 / -1;
	display: flex;
	align-items: flex-start;
	gap: 0.6rem;
	margin: 0.5rem 0 0.1rem;
	padding: 0 0.2rem;
}

.song-section-note {
	flex-shrink: 0;
	width: 2.1rem;
	height: 2.1rem;
	background: var(--note, none) center / contain no-repeat;
	filter: var(--art-shadow);
	margin-top: 0.1rem;
}

.song-section-text {
	flex: 1;
	min-width: 0;
}

.song-section strong {
	display: block;
	font-size: 1rem;
}

.song-section-text > span {
	color: rgba(230, 235, 252, 0.64);
	font-size: 0.88rem;
}

.section-stars {
	flex-shrink: 0;
	font-weight: 700;
	color: #ffd36e;
	white-space: nowrap;
}

.note-chips {
	display: flex;
	flex-wrap: wrap;
	gap: 0.35rem;
	margin-top: 0.4rem;
}

.note-chip {
	padding: 0.25rem 0.6rem;
	border-radius: var(--radius-round);
	background: rgba(255, 255, 255, 0.1);
	font-size: 0.78rem;
	font-weight: 700;
}

.song-row {
	position: relative;
	display: flex;
	align-items: center;
	gap: 0.7rem;
	padding: 0.6rem 0.85rem;
	border-radius: var(--radius-m);
	border: 1px solid rgba(255, 255, 255, 0.1);
	background: linear-gradient(135deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
	color: #f7f9ff;
	text-align: left;
	cursor: pointer;
	overflow: hidden;
	transition: transform 140ms ease, box-shadow 140ms ease, opacity 140ms ease;
}

/* Diagonal corner banner (classic CSS ribbon technique) instead of an inline pill
   next to the title — matches the reference's "REAL SONG" corner treatment. */
.corner-ribbon {
	position: absolute;
	top: 0.55rem;
	right: -1.7rem;
	width: 5.8rem;
	transform: rotate(30deg);
	background: linear-gradient(135deg, #ffd86f, #ff9dd8);
	color: #07111f;
	font-size: 0.54rem;
	font-weight: 800;
	letter-spacing: 0.03em;
	text-transform: uppercase;
	text-align: center;
	padding: 0.08rem 0;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
	z-index: 1;
}

.song-row:hover:not(:disabled) {
	transform: translateY(-1px);
	box-shadow: var(--shadow-1);
}

.song-row.milestone {
	border-color: color-mix(in srgb, var(--mode-campaign) 45%, transparent);
	background: linear-gradient(135deg, color-mix(in srgb, var(--mode-campaign) 16%, transparent), rgba(255, 255, 255, 0.04));
}

.song-row.locked,
.song-row:disabled {
	opacity: 0.42;
	cursor: not-allowed;
}

.song-row-index {
	flex-shrink: 0;
	width: 1.9rem;
	text-align: center;
	font-weight: 700;
	color: rgba(230, 235, 252, 0.55);
}

.song-row-title {
	flex: 1;
	min-width: 0;
	display: grid;
	gap: 0.15rem;
}

.song-row-title strong {
	font-size: 0.92rem;
}

.song-row-title span {
	font-size: 0.8rem;
	color: rgba(230, 235, 252, 0.6);
}

.song-row-trailing {
	flex-shrink: 0;
	display: flex;
	align-items: center;
}

.song-row-lock {
	width: 1.1rem;
	height: 1.1rem;
	color: rgba(230, 235, 252, 0.45);
}

.toggle-card.naming-card {
	flex-direction: column;
	align-items: flex-start;
	gap: 0.5rem;
	cursor: default;
}

.naming-card-head {
	display: flex;
	align-items: center;
	gap: 0.55rem;
}

.toggle-card {
	position: relative;
	gap: 0.55rem;
}

.toggle-card-icon-badge {
	flex-shrink: 0;
	display: grid;
	place-items: center;
	width: 2.1rem;
	height: 2.1rem;
	border-radius: var(--radius-s);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3), 0 2px 6px rgba(0, 0, 0, 0.2);
}

.toggle-card-icon {
	width: 1.15rem;
	height: 1.15rem;
	color: white;
	filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.3));
}

.toggle-card-label {
	flex: 1;
	font-size: 0.85rem;
}

.switch {
	flex-shrink: 0;
	position: relative;
	width: 2.4rem;
	height: 1.3rem;
	border-radius: var(--radius-round);
	background: rgba(255, 255, 255, 0.12);
	border: 1px solid rgba(255, 255, 255, 0.16);
	transition: background 140ms ease;
}

.switch-knob {
	position: absolute;
	top: 0.14rem;
	left: 0.14rem;
	width: 0.9rem;
	height: 0.9rem;
	border-radius: 50%;
	background: white;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
	transition: transform 140ms ease;
}

.switch.on {
	background: linear-gradient(135deg, #7be495, #22cf7a);
	border-color: transparent;
}

.switch.on .switch-knob {
	transform: translateX(1.1rem);
}

.toggle-card.accent-time .toggle-card-icon-badge {
	background: linear-gradient(150deg, var(--mode-time), var(--mode-time-deep));
}

.toggle-card.accent-endless .toggle-card-icon-badge {
	background: linear-gradient(150deg, var(--mode-endless), var(--mode-endless-deep));
}

.toggle-card.accent-campaign .toggle-card-icon-badge {
	background: linear-gradient(150deg, var(--mode-campaign), var(--mode-campaign-deep));
}

.toggle-card.accent-records .toggle-card-icon-badge {
	background: linear-gradient(150deg, var(--mode-records), var(--mode-records-deep));
}

.toggle-card.accent-trainer .toggle-card-icon-badge {
	background: linear-gradient(150deg, var(--mode-trainer), var(--mode-trainer-deep));
}

.toggle-card.accent-settings .toggle-card-icon-badge {
	background: linear-gradient(150deg, var(--mode-settings), var(--mode-settings-deep));
}

.segmented {
	display: flex;
	gap: 0.4rem;
	background: rgba(255, 255, 255, 0.06);
	padding: 0.3rem;
	border-radius: var(--radius-round);
}

.segmented button {
	border: none;
	background: transparent;
	color: rgba(247, 249, 255, 0.7);
	padding: 0.45rem 0.9rem;
	border-radius: var(--radius-round);
	font-weight: 700;
	font-size: 0.82rem;
	cursor: pointer;
	transition: background 140ms ease, color 140ms ease;
}

.segmented button.active {
	background: linear-gradient(135deg, #ffd86f 0%, #ff9dd8 45%, var(--hero-accent) 100%);
	color: #07111f;
}

.records-tabs {
	width: 100%;
}

.records-tabs button {
	flex: 1;
	text-align: center;
}

.records-panel {
	min-height: 12rem;
}

.empty-state {
	display: grid;
	place-items: center;
	gap: 0.5rem;
	padding: 2rem 1rem;
	text-align: center;
}

.empty-state-art {
	width: 4.5rem;
	height: 4.5rem;
	object-fit: contain;
	opacity: 0.85;
	filter: var(--art-shadow);
}

.section-head,
.record-stats {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
}

.record-item {
	display: flex;
	align-items: center;
	gap: 0.7rem;
	flex-wrap: wrap;
}

.section-head span,
.record-item span,
.record-stats span {
	color: rgba(230, 235, 252, 0.64);
}

.records-list {
	display: grid;
	gap: 0.45rem;
	margin-top: 0.75rem;
}

.record-item {
	padding: 0.5rem 0.75rem;
	border-radius: var(--radius-m);
	background: linear-gradient(
		135deg,
		rgba(255, 255, 255, 0.06),
		rgba(255, 255, 255, 0.03)
	);
}

.record-rank {
	flex-shrink: 0;
	width: 1.4rem;
	height: 1.4rem;
	display: grid;
	place-items: center;
	border-radius: var(--radius-round);
	background: rgba(255, 216, 111, 0.16);
	color: #ffd36e;
	font-weight: 800;
	font-size: 0.82rem;
}

.record-item-text {
	flex: 1;
	min-width: 8rem;
}

.record-item-text strong {
	display: block;
	margin-bottom: 0.12rem;
}

.record-stats {
	min-width: 8rem;
	gap: 0.6rem;
}

.record-grade {
	font-size: 1.1rem;
}

.settings-grid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 0.5rem;
}

.toggle-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.result-card {
	position: relative;
	max-width: 50rem;
	margin: 0 auto;
	padding: 0.85rem 1rem;
	text-align: center;
	display: grid;
	gap: 0.5rem;
}

/* Celebration mascot at the top-right of the result card — `stage` pose (with the
   trophy staff) when the player 3-starred, `wizard` otherwise. Absolute so it
   never pushes the metric grid down; overlaps the card's own corner so it stays
   on-screen even when the card sits near the top of a short landscape viewport. */
.result-mascot {
	position: absolute;
	top: -2.4rem;
	right: -1rem;
	z-index: 2;
	pointer-events: none;
}

@media (max-height: 480px) {
	.result-mascot {
		top: -1.6rem;
		right: -0.6rem;
		width: 4rem !important;
		height: 4rem !important;
	}
}

/* Badge + title side by side instead of stacked — on a short landscape phone
   (e.g. iPhone SE, 375px tall) the old vertical stack pushed Retry/Menu below
   the fold entirely. */
.result-header {
	display: flex;
	align-items: center;
	justify-content: center;
	flex-wrap: wrap;
	gap: 0.6rem;
}

.result-header h2 {
	margin: 0;
	font-size: 1.05rem;
	line-height: 1.2;
}

.result-stats {
	grid-template-columns: repeat(4, minmax(0, 1fr));
}

.result-stats .glass-card {
	padding: 0.45rem 0.3rem;
	border-radius: var(--radius-s);
	border-top: 1px solid color-mix(in srgb, var(--hero-accent) 45%, transparent);
}

.result-stats .eyebrow {
	font-size: 0.62rem;
}

.result-stats .metric {
	font-size: clamp(0.95rem, 3vw, 1.35rem);
	margin-top: 0.05rem;
}

.new-best-tag {
	display: block;
	margin-top: 0.15rem;
	font-size: 0.6rem;
	font-weight: 800;
	letter-spacing: 0.02em;
	text-transform: uppercase;
	color: #ff8ad4;
	text-shadow: 0 0 0.6rem rgba(255, 138, 212, 0.6);
}

.ad-copy,
.empty-copy {
	color: rgba(231, 237, 255, 0.66);
	font-size: 0.78rem;
	margin: 0;
}

/* Portrait (or very tall/narrow): shrink the mascot and let the cards take the
   width in a 2-column grid. The game is landscape-first, but the menu still has to
   look intentional if opened upright. */
@media (orientation: portrait), (max-width: 560px) {
	.menu-logo {
		font-size: clamp(1.2rem, 6vw, 1.9rem);
	}

	.player-info {
		min-width: 3.6rem;
	}

	.menu-body {
		grid-template-columns: minmax(0, 0.55fr) minmax(0, 1.45fr);
		gap: 0.5rem;
	}

	.menu-mascot {
		align-self: center;
		width: min(30vw, 9rem) !important;
		height: min(30vw, 9rem) !important;
	}

	.menu-cards {
		grid-template-columns: repeat(2, minmax(0, 1fr));
		grid-template-rows: repeat(3, minmax(3.8rem, 1fr));
	}
}

/* Landscape phones commonly land in the 650-900px width band — collapsing grids
   there would defeat the point of a landscape-first layout, so this only kicks in
   for genuinely narrow views. */
@media (max-width: 480px) {
	.two-up,
	.settings-grid,
	.song-list {
		grid-template-columns: 1fr;
	}

	.result-stats {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.topbar {
		flex-wrap: wrap;
	}

	.brand {
		width: 100%;
	}
}
</style>
