<script setup lang="ts">
import { computed } from 'vue'

import { BACKGROUND_PRESETS } from '@/modes/modeDefinitions'
import { formatAccuracy, formatTime } from '@/features/scoring'
import { useAppStore } from '@/ui/stores/appStore'

import GameStage from './components/GameStage.vue'

const appStore = useAppStore()
const screen = computed(() => appStore.screen)

const heroTheme = computed(() => {
	if (appStore.activeSession) {
		return BACKGROUND_PRESETS[appStore.activeSession.themeId]
	}

	const selectedMode = appStore.modes.find(
		(mode) => mode.id === appStore.selectedMode
	)
	if (selectedMode) {
		return BACKGROUND_PRESETS[selectedMode.themeId]
	}

	return BACKGROUND_PRESETS['purple-blue']
})

const totalStars = computed(() =>
	appStore.levels.reduce((sum, level) => {
		return sum + (appStore.campaignProgress[level.id]?.bestStars ?? 0)
	}, 0)
)

const totalBestScore = computed(() =>
	Object.values(appStore.records)
		.flat()
		.reduce((sum, record) => sum + record.score, 0)
)

const groupedRecords = computed(() => [
	{ id: 'campaign', title: 'Campaign', items: appStore.records.campaign },
	{ id: 'time', title: 'Time Mode', items: appStore.records.time },
	{ id: 'endless', title: 'Endless', items: appStore.records.endless },
])

function openMode(modeId: 'campaign' | 'time' | 'endless') {
	if (modeId === 'campaign') {
		appStore.openCampaignLevels()
		return
	}

	if (modeId === 'time') {
		appStore.startTimeMode()
		return
	}

	appStore.startEndlessMode()
}

function difficultyLabel(value: string) {
	return value.charAt(0).toUpperCase() + value.slice(1)
}

function stars(value: number) {
	return value > 0 ? '★'.repeat(value) : 'Play to earn stars'
}
</script>

<template>
	<div
		class="shell"
		:style="{
			'--hero-gradient': heroTheme.uiGradient,
			'--hero-accent': heroTheme.accent,
		}"
	>
		<div class="shell-bg" />

		<header v-if="screen !== 'gameplay'" class="topbar">
			<button v-if="screen !== 'menu'" class="ghost-btn" @click="appStore.back">
				Back
			</button>
			<div class="brand">
				<span class="brand-mark">♪</span>
				<div>
					<strong>Piano Notes</strong>
					<small>Colorful piano rhythm game</small>
				</div>
			</div>
			<button
				v-if="screen === 'menu'"
				class="ghost-btn"
				@click="appStore.openSettings"
			>
				Settings
			</button>
		</header>

		<main class="content">
			<section v-if="screen === 'menu'" class="screen stack">
				<div class="hero-card">
					<div>
						<span class="eyebrow">Music and color</span>
						<h1>
							Tap piano keys in rhythm as bright notes glide across the staff.
						</h1>
						<p>
							Play songs, chase combos, save records, and enjoy a more lively,
							playful stage.
						</p>
					</div>
					<div class="hero-actions">
						<button class="primary-btn" @click="appStore.openModeSelect">
							Play
						</button>
						<button class="secondary-btn" @click="appStore.openRecords">
							Records
						</button>
					</div>
				</div>

				<div class="grid two-up">
					<div class="glass-card">
						<span class="eyebrow">Progress</span>
						<strong class="metric">{{ totalStars }}</strong>
						<p>Stars collected across all campaign melodies.</p>
					</div>
					<div class="glass-card">
						<span class="eyebrow">Best runs</span>
						<strong class="metric">{{ totalBestScore }}</strong>
						<p>Your saved scores from campaign, time mode, and endless.</p>
					</div>
				</div>

				<div class="grid two-up">
					<button class="menu-card" @click="appStore.openModeSelect">
						<span class="menu-card-title">Mode Select</span>
						<span>Jump into songs, time challenges, or endless play.</span>
					</button>
					<button class="menu-card" @click="appStore.openCampaignLevels">
						<span class="menu-card-title">Campaign Levels</span>
						<span>Pick a melody, check the BPM, and collect stars.</span>
					</button>
					<button class="menu-card" @click="appStore.openRecords">
						<span class="menu-card-title">Records</span>
						<span>Your latest five runs in every game mode.</span>
					</button>
					<button class="menu-card" @click="appStore.openSettings">
						<span class="menu-card-title">Settings</span>
						<span>Sound, visuals, HUD layout, and more.</span>
					</button>
				</div>
			</section>

			<section v-else-if="screen === 'mode-select'" class="screen stack">
				<div class="hero-card compact">
					<div>
						<span class="eyebrow">Modes</span>
						<h2>Pick a play style</h2>
						<p>
							Each mode keeps the same piano feel, but changes the pacing and
							challenge.
						</p>
					</div>
				</div>

				<div class="grid mode-grid">
					<button
						v-for="mode in appStore.modes"
						:key="mode.id"
						class="mode-card"
						@click="openMode(mode.id)"
					>
						<span class="eyebrow">{{ mode.subtitle }}</span>
						<strong>{{ mode.title }}</strong>
						<p>{{ mode.description }}</p>
					</button>
				</div>
			</section>

			<section v-else-if="screen === 'campaign-levels'" class="screen stack">
				<div class="hero-card compact">
					<div>
						<span class="eyebrow">Campaign</span>
						<h2>Easy songs first, brighter challenges later</h2>
						<p>
							Play cleanly, keep your combo alive, and turn good runs into star
							clears.
						</p>
					</div>
				</div>

				<div class="grid level-grid">
					<div
						v-for="level in appStore.levels"
						:key="level.id"
						class="level-card"
					>
						<div class="level-head">
							<div>
								<strong>{{ level.title }}</strong>
								<span>{{ level.artist }}</span>
							</div>
							<span class="difficulty-chip">{{
								difficultyLabel(level.difficulty)
							}}</span>
						</div>
						<p>{{ level.description }}</p>
						<div class="level-meta">
							<span>{{ level.bpm }} BPM</span>
							<span>Target {{ level.targetScore }}</span>
						</div>
						<div class="level-footer">
							<span class="stars">{{
								stars(appStore.campaignProgress[level.id]?.bestStars ?? 0)
							}}</span>
							<button
								class="primary-btn small"
								@click="appStore.startCampaignLevel(level.id)"
							>
								Play
							</button>
						</div>
					</div>
				</div>
			</section>

			<section v-else-if="screen === 'records'" class="screen stack">
				<div class="hero-card compact">
					<div>
						<span class="eyebrow">Records</span>
						<h2>Your latest highlights</h2>
						<p>Compare your recent runs and see how each mode is improving.</p>
					</div>
				</div>

				<div class="grid records-grid">
					<div
						v-for="group in groupedRecords"
						:key="group.id"
						class="glass-card"
					>
						<div class="section-head">
							<strong>{{ group.title }}</strong>
							<span>{{ group.items.length }}/5 stored</span>
						</div>
						<div v-if="group.items.length" class="records-list">
							<div
								v-for="record in group.items"
								:key="record.id"
								class="record-item"
							>
								<div>
									<strong>{{ record.levelTitle || group.title }}</strong>
									<span>{{ new Date(record.date).toLocaleDateString() }}</span>
								</div>
								<div class="record-stats">
									<span>{{ record.score }}</span>
									<span>{{ record.accuracy.toFixed(1) }}%</span>
									<span>{{ record.badge }}</span>
								</div>
							</div>
						</div>
						<p v-else class="empty-copy">No records yet.</p>
					</div>
				</div>
			</section>

			<section v-else-if="screen === 'settings'" class="screen stack">
				<div class="hero-card compact">
					<div>
						<span class="eyebrow">Settings</span>
						<h2>Tune the feel of the game</h2>
						<p>
							Adjust audio, effects, HUD layout, and a few comfort options
							before your next song.
						</p>
					</div>
				</div>

				<div class="settings-grid">
					<button
						class="toggle-card"
						@click="
							appStore.updateAppSettings({
								soundEnabled: !appStore.settings.soundEnabled,
							})
						"
					>
						<strong>Sound</strong>
						<span>{{ appStore.settings.soundEnabled ? 'On' : 'Off' }}</span>
					</button>
					<button
						class="toggle-card"
						@click="
							appStore.updateAppSettings({
								musicEnabled: !appStore.settings.musicEnabled,
							})
						"
					>
						<strong>Music</strong>
						<span>{{ appStore.settings.musicEnabled ? 'On' : 'Off' }}</span>
					</button>
					<button
						class="toggle-card"
						@click="
							appStore.updateAppSettings({
								showLaneGlow: !appStore.settings.showLaneGlow,
							})
						"
					>
						<strong>Lane Glow</strong>
						<span>{{ appStore.settings.showLaneGlow ? 'On' : 'Off' }}</span>
					</button>
					<button
						class="toggle-card"
						@click="
							appStore.updateAppSettings({
								showParticles: !appStore.settings.showParticles,
							})
						"
					>
						<strong>Particles</strong>
						<span>{{ appStore.settings.showParticles ? 'On' : 'Off' }}</span>
					</button>
					<button
						class="toggle-card"
						@click="
							appStore.updateAppSettings({
								leftHandedHud: !appStore.settings.leftHandedHud,
							})
						"
					>
						<strong>HUD Align</strong>
						<span>{{
							appStore.settings.leftHandedHud ? 'Left-handed' : 'Default'
						}}</span>
					</button>
					<button
						class="toggle-card"
						@click="
							appStore.updateAppSettings({
								adsEnabled: !appStore.settings.adsEnabled,
							})
						"
					>
						<strong>Ads</strong>
						<span>{{
							appStore.settings.adsEnabled ? 'Enabled' : 'Disabled'
						}}</span>
					</button>
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
					<span class="eyebrow">Result</span>
					<div class="result-badge">
						{{
							appStore.lastResult?.modeId === 'campaign'
								? `★ ${appStore.lastResult?.stars ?? 0}`
								: appStore.lastResult?.badge
						}}
					</div>
					<h2>
						{{ appStore.lastResult?.levelTitle || appStore.lastResult?.modeId }}
					</h2>
					<div class="grid two-up">
						<div class="glass-card">
							<span class="eyebrow">Score</span>
							<strong class="metric">{{
								appStore.lastResult?.score ?? 0
							}}</strong>
						</div>
						<div class="glass-card">
							<span class="eyebrow">Accuracy</span>
							<strong class="metric">{{
								formatAccuracy(appStore.lastResult?.accuracy ?? 100)
							}}</strong>
						</div>
						<div class="glass-card">
							<span class="eyebrow">Max Combo</span>
							<strong class="metric">{{
								appStore.lastResult?.maxCombo ?? 0
							}}</strong>
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
						<button class="primary-btn" @click="appStore.replayLast">
							Retry
						</button>
						<button
							v-if="appStore.lastResult?.modeId === 'campaign'"
							class="secondary-btn"
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
			/>
		</main>
	</div>
</template>

<style scoped lang="scss">
.shell {
	position: relative;
	min-height: 100dvh;
	padding: max(env(safe-area-inset-top), 1rem)
		max(env(safe-area-inset-right), 1rem) max(env(safe-area-inset-bottom), 1rem)
		max(env(safe-area-inset-left), 1rem);
	background: #090d18;
	color: #f7f9ff;
	overflow: hidden;
}

.shell-bg {
	position: absolute;
	inset: 0;
	background: radial-gradient(
			circle at 15% 10%,
			rgba(255, 255, 255, 0.18),
			transparent 24%
		),
		radial-gradient(
			circle at 82% 22%,
			rgba(255, 150, 210, 0.22),
			transparent 26%
		),
		radial-gradient(
			circle at bottom right,
			color-mix(in srgb, var(--hero-accent) 34%, transparent),
			transparent 30%
		),
		var(--hero-gradient);
}

.topbar,
.content {
	position: relative;
	z-index: 1;
}

.topbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 1rem;
	margin-bottom: 1rem;
}

.brand {
	display: flex;
	align-items: center;
	gap: 0.8rem;
}

.brand strong {
	display: block;
	font-size: 1.05rem;
}

.brand small {
	display: block;
	color: rgba(231, 237, 255, 0.66);
}

.brand-mark {
	display: grid;
	place-items: center;
	width: 2.8rem;
	height: 2.8rem;
	border-radius: 1rem;
	background: linear-gradient(
		135deg,
		rgba(255, 255, 255, 0.18),
		rgba(8, 10, 22, 0.42)
	);
	box-shadow: 0 0 2.2rem color-mix(in srgb, var(--hero-accent) 48%, transparent);
	font-size: 1.35rem;
}

.content {
	min-height: calc(100dvh - 5rem);
}

.screen {
	max-width: 72rem;
	margin: 0 auto;
}

.stack {
	display: grid;
	gap: 1rem;
}

.grid {
	display: grid;
	gap: 1rem;
}

.two-up {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.hero-card,
.glass-card,
.result-card {
	padding: 1.35rem;
	border-radius: 1.8rem;
	background: linear-gradient(
		160deg,
		rgba(20, 24, 48, 0.74),
		rgba(11, 14, 30, 0.56)
	);
	border: 1px solid rgba(255, 255, 255, 0.14);
	box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08),
		0 24px 60px rgba(0, 0, 0, 0.24),
		0 0 2.4rem color-mix(in srgb, var(--hero-accent) 12%, transparent);
	backdrop-filter: blur(18px);
}

.hero-card {
	display: grid;
	gap: 1rem;
}

.hero-card.compact {
	padding-block: 1.1rem;
}

.hero-card h1,
.hero-card h2,
.result-card h2 {
	margin: 0.25rem 0 0.55rem;
	line-height: 1.08;
}

.hero-card p,
.result-card p,
.glass-card p,
.mode-card p,
.level-card p {
	margin: 0;
	color: rgba(231, 237, 255, 0.7);
	line-height: 1.55;
}

.hero-actions {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
	align-items: center;
	gap: 0.8rem;
	margin-top: 1rem;
}

.primary-btn,
.secondary-btn,
.ghost-btn,
.menu-card,
.mode-card,
.toggle-card {
	border: none;
	cursor: pointer;
	transition: transform 140ms ease, box-shadow 140ms ease, background 140ms ease;
}

.primary-btn,
.secondary-btn,
.ghost-btn {
	padding: 0.95rem 1.25rem;
	border-radius: 999px;
	font-weight: 700;
	font-size: 0.95rem;
}

.primary-btn {
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
	background: rgba(255, 255, 255, 0.08);
	color: white;
}

.secondary-btn.destructive {
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
.mode-card,
.toggle-card,
.level-card {
	padding: 1.2rem;
	border-radius: 1.6rem;
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
.mode-card:hover,
.toggle-card:hover,
.level-card:hover,
.primary-btn:hover,
.secondary-btn:hover,
.ghost-btn:hover {
	transform: translateY(-2px);
	box-shadow: 0 1rem 2.4rem rgba(0, 0, 0, 0.22);
}

.menu-card {
	display: grid;
	gap: 0.35rem;
}

.menu-card-title {
	font-size: 1.05rem;
	font-weight: 700;
}

.mode-grid {
	grid-template-columns: repeat(3, minmax(0, 1fr));
}

.mode-card strong,
.level-card strong {
	display: block;
	font-size: 1.18rem;
	margin: 0.45rem 0;
}

.level-grid,
.records-grid {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.level-card {
	display: grid;
	gap: 0.75rem;
}

.level-head,
.level-footer,
.section-head,
.record-item,
.record-stats {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
}

.level-head span,
.section-head span,
.record-item span,
.record-stats span {
	color: rgba(230, 235, 252, 0.64);
}

.difficulty-chip {
	padding: 0.35rem 0.7rem;
	border-radius: 999px;
	background: linear-gradient(
		135deg,
		rgba(255, 216, 111, 0.18),
		rgba(156, 231, 255, 0.16)
	);
	font-size: 0.78rem;
}

.level-meta {
	display: flex;
	gap: 0.75rem;
	flex-wrap: wrap;
	color: rgba(230, 235, 252, 0.68);
}

.stars {
	font-weight: 700;
	color: #ffd36e;
}

.records-list {
	display: grid;
	gap: 0.75rem;
	margin-top: 1rem;
}

.record-item {
	padding: 0.9rem 1rem;
	border-radius: 1.1rem;
	background: linear-gradient(
		135deg,
		rgba(255, 255, 255, 0.06),
		rgba(255, 255, 255, 0.03)
	);
}

.record-item strong {
	display: block;
	margin-bottom: 0.12rem;
}

.record-stats {
	min-width: 8rem;
}

.settings-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	gap: 1rem;
}

.toggle-card {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.result-card {
	max-width: 40rem;
	margin: 0 auto;
	text-align: center;
}

.result-badge {
	margin: 1rem auto;
	padding: 0.85rem 1.4rem;
	width: fit-content;
	border-radius: 999px;
	background: linear-gradient(
		135deg,
		rgba(255, 216, 111, 0.16),
		rgba(255, 157, 216, 0.16)
	);
	font-size: clamp(1.35rem, 4vw, 2.4rem);
	font-weight: 800;
	box-shadow: 0 0 2rem color-mix(in srgb, var(--hero-accent) 24%, transparent);
}

.ad-copy,
.empty-copy {
	color: rgba(231, 237, 255, 0.66);
}

@media (max-width: 900px) {
	.two-up,
	.level-grid,
	.records-grid,
	.settings-grid,
	.mode-grid {
		grid-template-columns: 1fr;
	}

	.topbar {
		flex-wrap: wrap;
	}

	.brand {
		width: 100%;
	}
}
</style>
