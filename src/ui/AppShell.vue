<script setup lang="ts">
import { computed, ref } from 'vue'

import { BACKGROUND_PRESETS } from '@/modes/modeDefinitions'
import { formatAccuracy } from '@/features/scoring'
import { formatMs } from '@/features/reading'
import { getLaneLabel } from '@/entities/piano'
import { tuneDurationLabel } from '@/features/composer'
import { useAppStore } from '@/ui/stores/appStore'
import { assetUrl } from '@/utils/assetUrl'
import { useDropInArt } from '@/ui/useDropInArt'
import { MELODIES_BY_DIFFICULTY, getMelodyMood } from '@/modes/melodies'

import IconMusic from '@/assets/icons/music.svg'
import IconSound from '@/assets/icons/sound.svg'
import IconGlow from '@/assets/icons/glow.svg'
import IconParticles from '@/assets/icons/particles.svg'
import IconLayout from '@/assets/icons/layout.svg'
import IconStar from '@/assets/icons/star.svg'
import IconCampaign from '@/assets/icons/campaign.svg'
import IconSprint from '@/assets/icons/trainer.svg'
import IconStudio from '@/assets/icons/music.svg'
import IconPlay from '@/assets/icons/play.svg'
import IconEar from '@/assets/icons/ear.svg'
import IconFlame from '@/assets/icons/flame.svg'
import IconEcho from '@/assets/icons/endless.svg'
import IconRecords from '@/assets/icons/records.svg'
import IconSettings from '@/assets/icons/settings.svg'

import MoodScene from '@/ui/components/MoodScene.vue'
import StarRow from '@/ui/components/StarRow.vue'
import GradeBadge from '@/ui/components/GradeBadge.vue'
import MascotSlot from '@/ui/components/MascotSlot.vue'

import GameStage from './components/GameStage.vue'
import EchoStage from './components/EchoStage.vue'
import ComposerStage from './components/ComposerStage.vue'

const appStore = useAppStore()

// The drawn wordmark, if it has been dropped in; the styled heading otherwise.
const logo = useDropInArt(() => assetUrl('/img/logo-piano-notes.png'))

// The library is generated, not typed out, so the button that offers to browse
// it counts the list rather than repeating a number that would quietly go stale
// the next time a melody is added.
const melodyCount = MELODIES_BY_DIFFICULTY.length
const screen = computed(() => appStore.screen)

// What a level node says about itself. Everything is playable, so the label is a
// report: cleared with a time, or not played yet.
function levelBestTime(level: { id: string }) {
	const progress = appStore.campaignProgress[level.id]
	return progress && (progress.bestStars ?? 0) > 0 ? progress.bestTimeMs : null
}

function levelNodeTitle(level: { id: string; title: string; bpm: number }) {
	const progress = appStore.campaignProgress[level.id]
	const stars = progress?.bestStars ?? 0
	if (!stars) return `${level.title} · ${level.bpm} BPM · not played yet`
	const best = progress?.bestTimeMs ? ` · best ${formatMs(progress.bestTimeMs)}` : ''
	return `${level.title} · ${level.bpm} BPM · ${stars}/3 stars${best}`
}

function noteChipLabel(laneId: string) {
	return getLaneLabel(laneId, appStore.settings.noteNamingSystem)
}

const heroTheme = computed(() =>
	appStore.activeSession
		? BACKGROUND_PRESETS[appStore.activeSession.themeId]
		: BACKGROUND_PRESETS['calm']
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

// One tab per mode: every mode keeps records now that the unscored Note Trainer
// is gone.
const groupedRecords = computed(() => [
	{ id: 'campaign', title: 'Campaign', items: appStore.records.campaign },
	{ id: 'sprint', title: 'Sprint', items: appStore.records.sprint },
	{ id: 'echo', title: 'By Ear', items: appStore.records.echo },
])

// What the Continue card promises, in the player's terms: the level they are
// actually on, not a mode name.
const campaignStarted = computed(() =>
	Object.values(appStore.campaignProgress).some((progress) => (progress?.bestStars ?? 0) > 0)
)

const continueLabel = computed(() => {
	const level = appStore.continueLevel
	if (!level) return 'Campaign'
	// Levels are named melodies now, so the tune's own name is the useful label.
	return `${(level.index ?? 0) + 1}. ${level.title}`
})

// Furthest sprint run so far, in melodies cleared — the number a new run is
// trying to beat.
const sprintBest = computed(() =>
	appStore.records.sprint.reduce((best, record) => Math.max(best, record.score), 0)
)

// Best By Ear attempt so far, as its combined score — the number a new attempt
// is trying to beat.
const echoBest = computed(() =>
	appStore.records.echo.reduce((best, record) => Math.max(best, record.score), 0)
)

const MASCOT_TIPS = [
	'Find the note on the staff, then the same key below.',
	'The line moves at your speed — take your time.',
	'Three stars means fast and clean, in that order.',
	'By Ear has no notes on screen: trust what you heard.',
	'Written a tune of your own yet? My Tunes is waiting.',
] as const

const mascotTip = computed(() => MASCOT_TIPS[totalStars.value % MASCOT_TIPS.length])

// The road ahead: the level the player is on and the four after it, so the hero
// card shows progress as a path rather than as a sentence. Each carries its own
// star count, which is what makes the row worth looking at.
const roadAhead = computed(() => {
	const level = appStore.continueLevel
	const start = level?.index ?? 0
	return appStore.levels.slice(start, start + 5).map((item) => ({
		id: item.id,
		number: (item.index ?? 0) + 1,
		stars: appStore.campaignProgress[item.id]?.bestStars ?? 0,
		current: item.id === level?.id,
	}))
})

// Stars on the melody the hero card is about to start.
const continueStars = computed(() => {
	const level = appStore.continueLevel
	if (!level) return 0
	return appStore.campaignProgress[level.id]?.bestStars ?? 0
})

// Best time on the melody the Continue card is about to start — the number the
// player is replaying against.
const continueBestTime = computed(() => {
	const level = appStore.continueLevel
	if (!level) return null
	return appStore.campaignProgress[level.id]?.bestTimeMs ?? null
})

// Records used to render as a 2-column grid of all three groups at once — cards in
// the same grid row stretch to match the tallest one, so a mode with few records
// left a big dead gap under "No records yet." One tab at a time avoids that
// entirely, since there's nothing else in the row to stretch against.
const selectedRecordsTab = ref('campaign')

const activeRecordGroup = computed(
	() => groupedRecords.value.find((group) => group.id === selectedRecordsTab.value) ?? groupedRecords.value[0]
)

// Per-difficulty campaign-world identity, expressed as a mode accent class
// (green → cyan → purple) rather than a separate illustration per world. The
// class feeds --accent-1/--accent-2 to everything inside the world block.
const DIFFICULTY_MODE: Record<string, string> = {
	easy: 'mode-trainer',
	normal: 'mode-time',
	hard: 'mode-endless',
}

const DIFFICULTY_LABEL: Record<string, string> = {
	easy: 'Easy',
	normal: 'Normal',
	hard: 'Hard',
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

const isNewBestTime = computed(() => {
	const result = appStore.lastResult
	const progress = resultProgress.value
	return !!result && !!progress && result.completed && result.timeMs === progress.bestTimeMs
})

const isEchoResult = computed(() => appStore.lastResult?.modeId === 'echo')
const isSprintResult = computed(() => appStore.lastResult?.modeId === 'sprint')

// Which scene belongs on the result card: the melody's own, or a neutral one.
const resultMood = computed(() =>
	appStore.lastResult?.levelId ? getMelodyMood(appStore.lastResult.levelId) : 'calm'
)

// The melody the Continue card is about to start — its scene previews the mood.
const continueMood = computed(() =>
	appStore.continueLevel ? getMelodyMood(appStore.continueLevel.id) : 'calm'
)

// Three ways a round can end, and the player has to be told which one happened.
const resultOutcome = computed(() => {
	const result = appStore.lastResult
	if (!result) return { label: '', tone: 'neutral' }
	if (result.modeId === 'sprint') {
		return {
			label: `Run over — ${result.score} cleared`,
			tone: result.score > 0 ? 'good' : 'bad',
		}
	}
	if (result.modeId === 'echo') {
		if (result.accuracy >= 99) return { label: 'Every note right', tone: 'good' }
		if (result.stars) return { label: `${result.notesCompleted}/${result.notesTotal} notes right`, tone: 'good' }
		return { label: 'Not this one — listen again', tone: 'bad' }
	}
	if (result.completed) return { label: 'Melody complete', tone: 'good' }
	if (result.timedOut) return { label: 'Out of time', tone: 'bad' }
	return { label: 'Out of lives', tone: 'bad' }
})

const isNewBestAccuracy = computed(() => {
	const result = appStore.lastResult
	const progress = resultProgress.value
	return (
		!!result &&
		!!progress &&
		result.completed &&
		result.accuracy > 0 &&
		result.accuracy === progress.bestAccuracy
	)
})

</script>

<template>
	<div
		class="shell"
		:class="{
			'full-bleed': screen === 'gameplay' || screen === 'echo' || screen === 'composer',
		}"
		:style="{
			'--hero-gradient': heroTheme.uiGradient,
			'--hero-accent': heroTheme.accent,
		}"
	>
		<!-- Background is drawn entirely in CSS (see .shell-bg): a dark ground, two
		     soft light pools and a low-contrast staff. Only the menu adds drifting
		     notes on top of it. -->
		<div class="shell-bg">
			<template v-if="screen === 'menu'">
				<span class="floating-note note-1">♪</span>
				<span class="floating-note note-2">♫</span>
				<span class="floating-note note-3">♩</span>
			</template>
		</div>

		<header
			v-if="screen !== 'gameplay' && screen !== 'echo' && screen !== 'composer' && screen !== 'menu'"
			class="topbar"
		>
			<button class="ghost-btn" @click="appStore.back">
				Back
			</button>
			<div class="brand">
				<span class="brand-mark"><IconMusic /></span>
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
						<span class="player-avatar"><IconMusic /></span>
						<div class="player-info">
							<strong class="player-name">Pianist</strong>
							<span class="player-lv">Lv. {{ playerLevel }}</span>
							<span class="xp-bar"><span class="xp-fill" :style="{ width: `${levelProgress * 100}%` }" /></span>
						</div>
					</div>

					<!-- Artwork if it exists, type if it does not: the wordmark is the
					     one place a drawn logo beats anything CSS can do, and the app
					     must not wait for it. -->
					<h1 class="menu-logo">
						<img
							v-if="logo.src.value"
							class="menu-logo-art"
							:src="logo.src.value"
							alt="Piano Notes"
							@error="logo.onError"
						/>
						<span v-else>Piano Notes</span>
					</h1>

					<div class="hud-right">
						<!-- Streak only appears once there is one to keep: an empty "0 days"
						     badge on first launch is noise, not a hook. -->
						<div v-if="appStore.streak.current > 0" class="streak-chip" :title="`Best streak: ${appStore.streak.best} days`">
							<IconFlame class="streak-chip-icon" />
							<strong>{{ appStore.streak.current }}</strong>
						</div>
						<div class="stars-chip">
							<IconStar class="stars-chip-icon" />
							<strong>{{ totalStars }}</strong>
						</div>
						<button class="hud-btn hud-btn-labeled" aria-label="Records" @click="appStore.openRecords">
							<span v-if="!hasAnyRecord" class="hud-btn-dot" />
							<IconRecords />
							<span class="hud-btn-label">Records</span>
						</button>
						<button class="hud-btn" aria-label="Settings" title="Settings" @click="appStore.openSettings">
							<IconSettings />
						</button>
					</div>
				</header>

				<!-- One hero and three alternatives. The hero is the campaign melody
				     the player is on: its art, its stars, a big amber PLAY and the
				     road of levels ahead. Everything else on this screen is smaller
				     than it on purpose. -->
				<div class="menu-play">
					<button class="hero-card mode-campaign" @click="appStore.startContinue">
						<MoodScene :mood="continueMood" class="hero-art" />
						<span class="hero-veil" />

						<span class="hero-badge">
							<IconCampaign class="hero-badge-icon" />
							{{ campaignStarted ? 'Continue' : 'Start here' }}
						</span>

						<span class="hero-body">
							<strong class="hero-title">{{ continueLabel }}</strong>
							<StarRow class="hero-stars" :count="continueStars" :max="3" />
							<span class="hero-cue">
								{{ continueBestTime ? `Best ${formatMs(continueBestTime)} — beat it` : 'Campaign · read and play' }}
							</span>
							<span class="hero-play"><IconPlay class="hero-play-icon" /> Play</span>
						</span>

						<span class="hero-road">
							<span
								v-for="step in roadAhead"
								:key="step.id"
								class="road-node"
								:class="{ current: step.current, done: step.stars > 0 }"
							>
								<span class="road-number">{{ step.number }}</span>
								<span class="road-stars">
									<i v-for="n in 3" :key="n" :class="{ lit: n <= step.stars }" />
								</span>
							</span>
						</span>
					</button>

					<div class="mode-column">
						<button class="mode-card mode-endless" @click="appStore.startEchoMode">
							<span class="mode-card-icon"><IconEar /></span>
							<span class="mode-card-text">
								<strong>By Ear</strong>
								<span>Listen, then write the notes</span>
							</span>
						</button>

						<button class="mode-card mode-time" @click="appStore.startSprint">
							<span class="mode-card-icon"><IconSprint /></span>
							<span class="mode-card-text">
								<strong>Sprint</strong>
								<span>{{ echoBest || sprintBest ? `Best: ${sprintBest} melodies` : 'One run, no stops' }}</span>
							</span>
						</button>

						<button class="mode-card mode-records" @click="appStore.openTunes">
							<span class="mode-card-icon"><IconStudio /></span>
							<span class="mode-card-text">
								<strong>My Tunes</strong>
								<span>
									{{
										appStore.userTunes.length
											? `${appStore.userTunes.length} ${appStore.userTunes.length === 1 ? 'tune' : 'tunes'} written`
											: 'Write your own melody'
									}}
								</span>
							</span>
						</button>

					<!-- The mascot fills the column's tail with the one line of advice
					     the screen has room for. -->
					<div class="menu-host">
						<MascotSlot class="menu-mascot" size="5.5rem" variant="idle" />
						<p class="menu-tip">{{ mascotTip }}</p>
					</div>
					</div>
				</div>

				<div class="menu-secondary">
					<button class="secondary-row mode-campaign" @click="appStore.openCampaignLevels">
						<IconCampaign class="secondary-row-icon" />
						Browse all {{ melodyCount }} melodies
					</button>
				</div>
			</section>

			<!-- Progression, not a settings list: each world is one panel with its own
			     accent, a progress bar, and a grid of compact level nodes. 25 levels
			     fit in a block the player can scan at a glance instead of scrolling
			     300 identical rows. -->
			<section v-else-if="screen === 'campaign-levels'" class="screen stack">
				<div
					v-for="world in appStore.worldsWithProgress"
					:key="world.id"
					class="world-panel"
					:class="DIFFICULTY_MODE[world.difficulty]"
				>
					<header class="world-head">
						<MoodScene :mood="world.themeId" class="world-scene" />
						<div class="world-text">
							<strong class="world-title">{{ world.title }}</strong>
							<span class="world-concept">{{ world.concept }}</span>
						</div>
						<span class="world-difficulty">{{ DIFFICULTY_LABEL[world.difficulty] }}</span>
						<div class="world-progress">
							<span class="world-stars">
								<IconStar class="world-stars-icon" />
								{{ world.starsEarned }}/{{ world.totalStars }}
							</span>
							<span class="world-bar">
								<span
									class="world-bar-fill"
									:style="{ width: `${world.totalStars ? (world.starsEarned / world.totalStars) * 100 : 0}%` }"
								/>
							</span>
						</div>
					</header>

					<div v-if="world.newNoteIds.length" class="note-chips">
						<span class="note-chips-label">New notes</span>
						<span v-for="noteId in world.newNoteIds" :key="noteId" class="note-chip">{{
							noteChipLabel(noteId)
						}}</span>
					</div>

					<div class="node-grid">
						<button
							v-for="level in world.levels"
							:key="level.id"
							class="level-node"
							:class="{
								milestone: level.isMilestone,
								cleared: (appStore.campaignProgress[level.id]?.bestStars ?? 0) > 0,
							}"
							:title="levelNodeTitle(level)"
							@click="appStore.startCampaignLevel(level.id)"
						>
							<span class="node-index">{{ (level.index ?? 0) + 1 }}</span>
							<StarRow
								class="node-stars"
								:count="appStore.campaignProgress[level.id]?.bestStars ?? 0"
								:max="3"
							/>
							<!-- Played melodies say so on the node itself: with every level
							     open, the board's job is to report what has been done rather
							     than what is permitted. -->
							<span v-if="levelBestTime(level)" class="node-time">{{
								formatMs(levelBestTime(level) as number)
							}}</span>
						</button>
					</div>
				</div>
			</section>

			<section v-else-if="screen === 'records'" class="screen stack centered">
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
						<span class="empty-state-art"><IconMusic /></span>
						<p class="empty-copy">
							No {{ activeRecordGroup.title }} records yet — play a run to see it here.
						</p>
					</div>
				</div>
			</section>

			<section v-else-if="screen === 'settings'" class="screen stack centered">
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
					<!-- No Music toggle: the project ships note samples only, so the switch
					     controlled nothing. It comes back the day there is a track to play. -->
					<button
						class="toggle-card accent-campaign"
						@click="
							appStore.updateAppSettings({
								showLaneGlow: !appStore.settings.showLaneGlow,
							})
						"
					>
						<span class="toggle-card-icon-badge"><IconGlow class="toggle-card-icon" /></span>
						<strong class="toggle-card-label">Note highlight</strong>
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
					<button
						class="toggle-card accent-campaign"
						@click="
							appStore.updateAppSettings({
								keyHintsEnabled: !appStore.settings.keyHintsEnabled,
							})
						"
					>
						<span class="toggle-card-icon-badge"><IconSprint class="toggle-card-icon" /></span>
						<strong class="toggle-card-label">Key Hints</strong>
						<span class="switch" :class="{ on: appStore.settings.keyHintsEnabled }"><span class="switch-knob" /></span>
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

			<!-- The player's own tunes. A list, not a board: these are files they
			     made, and the actions on a file are play, edit, rename, delete. -->
			<section v-else-if="screen === 'tunes'" class="screen stack">
				<div class="tunes-head">
					<h2 class="section-title">My Tunes</h2>
					<button class="primary-btn" @click="appStore.newTune">New tune</button>
				</div>

				<p v-if="!appStore.userTunes.length" class="empty-copy">
					Nothing written yet. "New tune" opens an empty staff — play the keys and the
					notes land where the line stands.
				</p>

				<div v-else class="tune-list">
					<div v-for="tune in appStore.userTunes" :key="tune.id" class="tune-row">
						<div class="tune-info">
							<strong class="tune-title">{{ tune.title }}</strong>
							<span class="tune-meta">
								{{ tune.notes.length }} notes · {{ tuneDurationLabel(tune) }} · {{ tune.bpm }} BPM
							</span>
						</div>
						<button
							class="secondary-btn small"
							:disabled="!tune.notes.length"
							@click="appStore.playTune(tune.id)"
						>
							▶ Play
						</button>
						<button class="secondary-btn small primary" @click="appStore.editTune(tune.id)">
							Edit
						</button>
						<button class="secondary-btn small destructive" @click="appStore.removeTune(tune.id)">
							Delete
						</button>
					</div>
				</div>
			</section>

			<section v-else-if="screen === 'result'" class="screen stack">
				<div class="result-card">
					<MoodScene :mood="resultMood" class="result-scene" />
					<MascotSlot
						class="result-mascot"
						size="5.5rem"
						:variant="(appStore.lastResult?.stars ?? 0) >= 3 ? 'cheer' : 'thinking'"
					/>
					<div class="result-header">
						<StarRow
							v-if="appStore.lastResult?.modeId === 'campaign'"
							class="result-stars"
							:count="appStore.lastResult?.stars ?? 0"
							:max="3"
						/>
						<h2>
							{{ appStore.lastResult?.levelTitle || appStore.lastResult?.modeTitle }}
						</h2>
					</div>

					<!-- Why the round ended, before any numbers: a failed run and a clean
					     one otherwise look identical at a glance. -->
					<p class="result-verdict" :class="resultOutcome.tone">{{ resultOutcome.label }}</p>

					<!-- By Ear grades two different skills, so it reports them as two
					     numbers: which notes came out, and where they landed. Blending
					     them into one percentage would hide which of the two failed. -->
					<div v-if="isEchoResult" class="grid result-stats">
						<div class="glass-card">
							<span class="eyebrow">Notes</span>
							<strong class="metric">{{ formatAccuracy(appStore.lastResult?.accuracy ?? 0) }}</strong>
						</div>
						<div class="glass-card">
							<span class="eyebrow">Placement</span>
							<strong class="metric">{{
								formatAccuracy(appStore.lastResult?.tempoAccuracy ?? 0)
							}}</strong>
						</div>
						<div class="glass-card">
							<span class="eyebrow">Right</span>
							<strong class="metric">
								{{ appStore.lastResult?.notesCompleted ?? 0 }}/{{ appStore.lastResult?.notesTotal ?? 0 }}
							</strong>
						</div>
						<div class="glass-card">
							<span class="eyebrow">Your tempo</span>
							<strong class="metric">
								{{ appStore.lastEchoScore?.playedBpm ? `${appStore.lastEchoScore.playedBpm} BPM` : '—' }}
							</strong>
						</div>
					</div>

					<div v-else class="grid result-stats">
						<div class="glass-card">
							<span class="eyebrow">Time</span>
							<strong class="metric">{{ formatMs(appStore.lastResult?.timeMs ?? 0) }}</strong>
							<span v-if="isNewBestTime" class="new-best-tag">New Best!</span>
						</div>
						<div class="glass-card">
							<span class="eyebrow">Accuracy</span>
							<strong class="metric">{{
								formatAccuracy(appStore.lastResult?.accuracy ?? 100)
							}}</strong>
							<span v-if="isNewBestAccuracy" class="new-best-tag">New Best!</span>
						</div>
						<div class="glass-card">
							<span class="eyebrow">Tempo</span>
							<strong class="metric">{{
								formatAccuracy(appStore.lastResult?.tempoAccuracy ?? 100)
							}}</strong>
						</div>
						<div class="glass-card">
							<span class="eyebrow">{{ isSprintResult ? 'Melodies' : 'Wrong keys' }}</span>
							<strong class="metric">{{
								isSprintResult ? appStore.lastResult?.score ?? 0 : appStore.lastResult?.misses ?? 0
							}}</strong>
						</div>
					</div>

					<p v-if="appStore.adMessage" class="ad-copy">
						{{ appStore.adMessage }}
					</p>

					<div class="hero-actions">
						<!-- A rewarded ad the player asks for: keep the run instead of
						     losing it. Offered once per run. -->
						<button
							v-if="appStore.revivableRun"
							class="primary-btn"
							@click="appStore.reviveSprintWithAd"
						>
							Watch ad · keep run
						</button>
						<button
							class="secondary-btn"
							:class="{
								primary:
									appStore.lastResult?.modeId !== 'campaign' &&
									!appStore.revivableRun &&
									!isEchoResult,
							}"
							@click="appStore.replayLast"
						>
							Retry
						</button>
						<button v-if="isEchoResult" class="primary-btn" @click="appStore.startAnotherEcho">
							Next tune
						</button>
						<button
							v-if="appStore.lastResult?.modeId === 'campaign' && appStore.lastResult?.completed"
							class="primary-btn"
							@click="appStore.nextCampaignLevel"
						>
							Next
						</button>
						<button class="secondary-btn" @click="appStore.goHome">Menu</button>
					</div>
				</div>
			</section>

			<!-- Keyed by session: a mode that swaps one melody for the next without
			     leaving the screen would otherwise reuse the component, leaving the
			     finished melody's engine mounted and the player stuck. -->
			<GameStage
				v-else-if="screen === 'gameplay' && appStore.activeSession"
				:key="appStore.activeSession.id"
				:session="appStore.activeSession"
				:settings="appStore.settings"
				@finish="appStore.finishSession"
				@acknowledge-notes="appStore.acknowledgeNewNotes"
				@exit="appStore.exitGameplay"
			/>

			<ComposerStage
				v-else-if="screen === 'composer' && appStore.editingTune"
				:key="appStore.editingTune.id"
				:tune="appStore.editingTune"
				:settings="appStore.settings"
				@save="appStore.saveTune"
				@exit="appStore.closeComposer"
			/>

			<EchoStage
				v-else-if="screen === 'echo' && appStore.echoSession"
				:key="appStore.echoSession.id"
				:session="appStore.echoSession"
				:settings="appStore.settings"
				@finish="appStore.finishEcho"
				@exit="appStore.exitEcho"
			/>
		</main>
	</div>
</template>

<style scoped lang="scss">
@use '../assets/mixins' as *;

.shell {
	position: relative;
	height: 100dvh;
	display: flex;
	flex-direction: column;
	padding: max(env(safe-area-inset-top), 1rem)
		max(env(safe-area-inset-right), 1rem) max(env(safe-area-inset-bottom), 1rem)
		max(env(safe-area-inset-left), 1rem);
	background: var(--bg-base);
	color: var(--text-1);
	overflow-x: hidden;
	overflow-y: auto;
	-webkit-overflow-scrolling: touch;
}

/* Gameplay and By Ear draw their own full-height layout, safe areas included.
   Left inside the padded, scrollable shell they came out taller than the window
   by exactly that padding, so the whole screen scrolled and their overlays hung
   off the bottom edge. */
.shell.full-bleed {
	padding: 0;
	overflow: hidden;
}

/* Background is drawn in CSS, not photographed: a dark ground plus two soft
   light pools tinted by the active theme. Nothing here competes with the UI —
   the earlier scene photo is what made list text unreadable over it. */
.shell-bg {
	position: fixed;
	inset: 0;
	z-index: 0;
	overflow: hidden;
	background:
		/* Two coloured blooms: the mode's own accent up in the left corner and a
		   fixed magenta on the right, so the ground has direction and warmth
		   instead of one even wash. */
		radial-gradient(
			ellipse 60% 50% at 8% -10%,
			color-mix(in srgb, var(--hero-accent) 26%, transparent),
			transparent 70%
		),
		radial-gradient(ellipse 55% 45% at 96% 8%, rgba(99, 118, 208, 0.14), transparent 70%),
		radial-gradient(ellipse 70% 40% at 50% 108%, rgba(72, 89, 176, 0.18), transparent 72%),
		linear-gradient(180deg, #1b2550 0%, var(--bg-base) 42%, var(--bg-deep) 100%);
}

/* A star field, drawn as three layers of dotted gradients rather than as DOM
   nodes: a hundred absolutely-positioned spans would cost layout on every
   resize, and this costs one paint. */
.shell-bg::after {
	content: '';
	position: absolute;
	inset: 0;
	background-image:
		radial-gradient(1.6px 1.6px at 12% 18%, rgba(255, 255, 255, 0.9), transparent 60%),
		radial-gradient(1.3px 1.3px at 27% 62%, rgba(255, 255, 255, 0.7), transparent 60%),
		radial-gradient(1.8px 1.8px at 43% 12%, rgba(255, 236, 190, 0.9), transparent 60%),
		radial-gradient(1.2px 1.2px at 58% 44%, rgba(255, 255, 255, 0.65), transparent 60%),
		radial-gradient(1.7px 1.7px at 71% 22%, rgba(214, 196, 255, 0.85), transparent 60%),
		radial-gradient(1.3px 1.3px at 84% 66%, rgba(255, 255, 255, 0.7), transparent 60%),
		radial-gradient(1.5px 1.5px at 92% 32%, rgba(255, 236, 190, 0.8), transparent 60%),
		radial-gradient(1.2px 1.2px at 19% 86%, rgba(255, 255, 255, 0.6), transparent 60%),
		radial-gradient(1.4px 1.4px at 63% 88%, rgba(214, 196, 255, 0.7), transparent 60%);
	opacity: 0.58;
	pointer-events: none;
	animation: star-breathe 9s ease-in-out infinite;
}

@keyframes star-breathe {
	0%, 100% { opacity: 0.55; }
	50% { opacity: 0.95; }
}

/* A single low-contrast staff sweeping across the ground — the one "musical"
   decoration, at an opacity that can never fight foreground text. */
.shell-bg::before {
	content: '';
	position: absolute;
	left: -6%;
	right: -6%;
	top: 52%;
	height: 8.5rem;
	transform: translateY(-50%) rotate(-3.5deg);
	background: repeating-linear-gradient(
		to bottom,
		rgba(214, 196, 255, 0.1) 0 1px,
		transparent 1px 1.7rem
	);
	-webkit-mask-image: linear-gradient(to right, transparent, #000 22%, #000 78%, transparent);
	mask-image: linear-gradient(to right, transparent, #000 22%, #000 78%, transparent);
}

/* Drifting notes, lit rather than inked: on the violet ground the old
   ink-coloured glyphs were invisible, which is half of why the screen read as
   empty between the cards. */
.floating-note {
	position: absolute;
	color: rgba(226, 214, 255, 0.22);
	font-size: 2.1rem;
	text-shadow: 0 0 1rem rgba(168, 180, 255, 0.3);
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
	font-size: var(--text-lg);
}

.brand-mark {
	display: grid;
	place-items: center;
	width: 2rem;
	height: 2rem;
	border-radius: var(--radius-s);
	background: var(--surface-2);
	color: var(--accent);
}

.brand-mark svg {
	width: 1.05rem;
	height: 1.05rem;
}

.content {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
}

.screen {
	max-width: var(--screen-max);
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
	display: flex;
	flex-direction: column;
	gap: var(--space-3);
}

.stack {
	display: grid;
	gap: var(--space-3);
}

/* Short screens (settings, records) sit in the middle of the viewport instead of
   clinging to the top edge with a screen of dead space beneath them. */
.screen.centered {
	margin-block: auto;
}

.grid {
	display: grid;
	gap: var(--space-2);
}

.two-up {
	grid-template-columns: repeat(2, minmax(0, 1fr));
}

.glass-card,
.result-card {
	@include panel;
	padding: var(--space-3) var(--space-4);
	/* Never taller than the screen it is shown on: a result the player has to
	   scroll hides the buttons that end the round. */
	max-height: calc(100dvh - 2rem);
	overflow-y: auto;
}

/* A phone in landscape is about 360px tall, and the result card's decoration
   costs more than half of that. The numbers and the buttons are the screen; the
   scene and the mascot are what goes first. */
@media (max-height: 560px) {
	.result-card {
		padding: var(--space-2) var(--space-3);
		gap: 0.35rem;
	}

	.result-scene,
	.result-mascot {
		display: none;
	}

	.result-card h2 {
		font-size: var(--text-md);
	}

	.result-verdict {
		margin: 0.1rem 0;
		font-size: var(--text-xs);
	}

	.result-stats .glass-card {
		padding: 0.3rem 0.25rem;
	}

	.result-stats .metric {
		font-size: 0.95rem;
	}

	.hero-actions {
		gap: 0.4rem;
	}
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
.toggle-card {
	cursor: pointer;
}

.primary-btn,
.secondary-btn,
.ghost-btn {
	padding: 0.7rem 1.15rem;
	font-weight: var(--weight-bold);
	font-size: var(--text-md);
}

/* Every button in the app stands on a solid edge and sinks onto it when
   pressed. Pill-shaped gradients with a soft halo read as a web form; this reads
   as a control. */
.primary-btn,
.secondary-btn.primary {
	@include chunky(var(--accent-1, var(--accent)), var(--accent-2, var(--accent-deep)));
}

.primary-btn.small {
	padding: 0.7rem 1rem;
	font-size: 0.88rem;
}

.secondary-btn {
	@include chunky-ghost;
}

/* A destructive, rarely-used action shouldn't be the visually loudest thing on
   the screen — small, centered, and outlined instead of a filled block. */
.secondary-btn.destructive {
	justify-self: center;
	background: transparent;
	border: 2px solid color-mix(in srgb, var(--bad) 55%, transparent);
	box-shadow: none;
	color: var(--bad);
	padding: 0.55rem 1.1rem;
	font-size: 0.82rem;
}

.secondary-btn.destructive:hover {
	background: color-mix(in srgb, var(--bad) 10%, transparent);
	color: var(--bad);
}

.ghost-btn {
	@include chunky-ghost;
	color: var(--text-2);
}

.metric {
	display: block;
	font-size: clamp(1.55rem, 4vw, 2.35rem);
	margin-top: var(--space-1);
}

.eyebrow {
	@include caps;
	color: var(--text-3);
}

.toggle-card {
	padding: var(--space-3);
	text-align: left;
}

.toggle-card {
	@include chunky-ghost(var(--radius-l));
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
	padding: 0.3rem 0.8rem 0.3rem 0.35rem;
	border-radius: var(--radius-round);
	background: var(--surface-2);
}

.player-avatar {
	flex-shrink: 0;
	display: grid;
	place-items: center;
	width: 2.2rem;
	height: 2.2rem;
	border-radius: 50%;
	color: var(--accent);
	background: radial-gradient(
		circle at 50% 35%,
		color-mix(in srgb, var(--accent) 28%, transparent),
		rgba(12, 14, 30, 0.6)
	);
	border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
}

.player-avatar svg {
	width: 1.05rem;
	height: 1.05rem;
}

.player-info {
	display: grid;
	gap: 0.08rem;
	min-width: 4.5rem;
}

.player-name {
	font-size: var(--text-sm);
	line-height: 1;
}

.player-lv {
	@include caps(0.62rem);
	color: color-mix(in srgb, var(--accent) 90%, white);
	letter-spacing: 0.06em;
}

.xp-bar {
	margin-top: 0.12rem;
	height: 0.3rem;
	border-radius: var(--radius-round);
	background: var(--surface-2);
	overflow: hidden;
}

.xp-fill {
	display: block;
	height: 100%;
	border-radius: var(--radius-round);
	background: linear-gradient(90deg, var(--accent), var(--mode-campaign));
	transition: width var(--dur-3) var(--ease);
}

.menu-logo-art {
	height: 2.4rem;
	width: auto;
	display: block;
	filter: drop-shadow(0 4px 10px rgba(10, 4, 32, 0.55));
}

.menu-logo {
	justify-self: center;
	margin: 0;
	font-size: var(--text-display);
	font-weight: var(--weight-black);
	line-height: 1;
	color: var(--text-1);
	white-space: nowrap;
}

.stars-chip {
	justify-self: end;
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0.3rem 0.85rem;
	border-radius: var(--radius-round);
	background: var(--surface-2);
	font-weight: var(--weight-black);
	font-size: var(--text-md);
}

.stars-chip-icon {
	width: 1rem;
	height: 1rem;
	color: var(--mode-records);
}

/* ---- HUD right cluster ---- */
.hud-right {
	justify-self: end;
	display: flex;
	align-items: center;
	gap: var(--space-2);
}

/* Utilities are icon-only and sit apart from the play buttons — they are not a
   way to play and should not look like one. */
.hud-btn {
	@include lift;
	position: relative;
	display: grid;
	place-items: center;
	width: 2.2rem;
	height: 2.2rem;
	border-radius: var(--radius-round);
	background: var(--surface-2);
	color: var(--text-2);
	cursor: pointer;
}

.hud-btn-labeled {
	grid-auto-flow: column;
	width: auto;
	padding: 0 var(--space-3);
	gap: 0.4rem;
}

.hud-btn-label {
	font-size: var(--text-sm);
	font-weight: var(--weight-bold);
}

.hud-btn svg {
	width: 1.05rem;
	height: 1.05rem;
}

.hud-btn:hover {
	color: var(--text-1);
	border-color: var(--border);
}

/* Unseen-content dot instead of the old "NEW" ribbon on a full-size card. */
.hud-btn-dot {
	position: absolute;
	top: 0.15rem;
	right: 0.15rem;
	width: 0.42rem;
	height: 0.42rem;
	border-radius: 50%;
	background: var(--mode-records);
}

.streak-chip {
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	padding: 0.3rem 0.7rem;
	border-radius: var(--radius-round);
	background: color-mix(in srgb, var(--mode-campaign) 12%, transparent);
	font-weight: var(--weight-black);
	font-size: var(--text-md);
	color: var(--mode-campaign);
}

.streak-chip-icon {
	width: 0.95rem;
	height: 0.95rem;
}

/* ---- Body: two ways to play ---- */
/* Landscape home: the hero takes two thirds of the width, the three other modes
   stack beside it. On a narrow phone they go under it instead of shrinking to
   unreadable slivers. */
.menu-play {
	flex: 1;
	display: grid;
	grid-template-columns: minmax(0, 1.85fr) minmax(0, 1fr);
	gap: var(--space-3);
	align-items: stretch;
	min-height: 0;
}

@media (max-width: 720px) and (orientation: portrait) {
	.menu-play {
		grid-template-columns: minmax(0, 1fr);
	}
}

/* The supported floor is 640×300. Keep the two-column landscape hierarchy and
   remove only non-essential decoration; stacking the columns makes the menu
   taller than the viewport and hides entire modes. */
@media (orientation: landscape) and (max-height: 360px) {
	.shell:not(.full-bleed) {
		padding: max(env(safe-area-inset-top), 0.35rem)
			max(env(safe-area-inset-right), 0.45rem)
			max(env(safe-area-inset-bottom), 0.35rem)
			max(env(safe-area-inset-left), 0.45rem);
	}

	.screen.menu-screen {
		gap: 0.35rem;
	}

	.menu-hud {
		gap: 0.35rem;
	}

	.player-chip {
		padding: 0.2rem 0.55rem 0.2rem 0.25rem;
	}

	.player-avatar,
	.hud-btn {
		width: 1.9rem;
		height: 1.9rem;
	}

	.hud-btn-labeled {
		width: auto;
		padding-inline: 0.55rem;
	}

	.stars-chip {
		padding: 0.2rem 0.55rem;
	}

	.menu-logo,
	.menu-logo-art {
		font-size: 1.45rem;
		height: 1.75rem;
	}

	.menu-play {
		grid-template-columns: minmax(0, 1.55fr) minmax(13rem, 1fr);
		gap: 0.45rem;
	}

	.menu-screen .hero-card {
		gap: 0.25rem;
		padding: 0.5rem;
	}

	.menu-screen .hero-title {
		font-size: 1.15rem;
	}

	.menu-screen .hero-cue {
		font-size: 0.6rem;
	}

	.menu-screen .hero-play {
		margin-top: 0.1rem;
		padding: 0.35rem 0.9rem;
		font-size: var(--text-md);
	}

	.menu-screen .hero-road,
	.menu-screen .menu-host {
		display: none;
	}

	.menu-screen .mode-column {
		grid-template-rows: repeat(3, minmax(0, 1fr));
		gap: 0.35rem;
	}

	.menu-screen .mode-card {
		gap: 0.5rem;
		padding: 0.4rem 0.55rem;
	}

	.menu-screen .mode-card-icon {
		width: 2.1rem;
		height: 2.1rem;
		border-radius: var(--radius-s);
	}

	.menu-screen .mode-card-icon svg {
		width: 1.05rem;
		height: 1.05rem;
	}

	.menu-screen .mode-card-text strong {
		font-size: var(--text-md);
	}

	.menu-screen .mode-card-text span {
		font-size: 0.68rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.menu-screen .secondary-row {
		padding: 0.3rem 0.75rem;
		font-size: var(--text-xs);
	}
}

/* Between the floor and a comfortable phone the menu only misses by a few dozen
   pixels, and the mascot is what costs them: it sits under the mode cards and
   its speech bubble reaches across them. Dropping just the mascot buys back the
   height and keeps the level road, which is the part a player actually uses.
   Without this the 375-tall landscape iPhones overflowed — 667×375 by 30px,
   812×375 by 11 — with no way to scroll to what fell off. */
@media (orientation: landscape) and (min-height: 361px) and (max-height: 400px) {
	.menu-screen .menu-host {
		display: none;
	}

	.menu-screen .hero-card {
		padding: 0.6rem;
	}

	.menu-screen .hero-road {
		gap: 0.3rem;
	}
}

/* ---- Hero card ---- */
.hero-card {
	@include panel(var(--radius-l));
	position: relative;
	display: grid;
	grid-template-rows: auto 1fr auto;
	gap: var(--space-2);
	padding: var(--space-3);
	overflow: hidden;
	text-align: left;
	color: var(--text-1);
	cursor: pointer;
	border: 2px solid color-mix(in srgb, var(--accent-1) 55%, var(--border));
	box-shadow: 0 5px 0 var(--accent-2), 0 0 1.2rem color-mix(in srgb, var(--accent-1) 14%, transparent);
	transition: transform var(--dur-1) var(--ease), box-shadow var(--dur-1) var(--ease);
}

.hero-card:active {
	transform: translateY(5px);
	box-shadow: 0 1px 0 var(--accent-2), 0 0 0.7rem color-mix(in srgb, var(--accent-1) 14%, transparent);
}

/* The mood art is the card's background, not a picture on it: full bleed, with
   a veil so the text over it never has to fight the sky. */
.hero-art {
	position: absolute;
	inset: 0 0 auto 0;
	z-index: 0;
	width: 100%;
	height: 62%;
	aspect-ratio: auto;
	border-radius: 0;
}

.hero-veil {
	position: absolute;
	inset: 0;
	z-index: 1;
	background:
		linear-gradient(180deg, rgba(15, 9, 48, 0) 0%, rgba(15, 9, 48, 0.08) 30%, rgba(46, 34, 120, 0.85) 56%, var(--panel-top) 66%),
		/* A soft vignette so the card has a lit centre rather than four equally
		   bright corners. */
		radial-gradient(ellipse 80% 60% at 50% 40%, transparent 40%, rgba(10, 4, 32, 0.45) 100%);
}

.hero-badge,
.hero-body,
.hero-road {
	position: relative;
	z-index: 2;
}

.hero-badge {
	@include caps;
	justify-self: start;
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
	padding: 0.3rem 0.65rem;
	border-radius: var(--radius-round);
	background: color-mix(in srgb, var(--accent-1) 22%, rgba(15, 9, 48, 0.7));
	border: 1px solid color-mix(in srgb, var(--accent-1) 55%, transparent);
	color: var(--accent-1);
}

.hero-badge-icon {
	width: 0.9rem;
	height: 0.9rem;
}

.hero-body {
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
	gap: 0.4rem;
	min-height: 0;
}

.hero-title {
	font-size: clamp(1.3rem, 3.2vw, 2rem);
	font-weight: var(--weight-black);
	line-height: 1.05;
	text-shadow: 0 2px 12px rgba(10, 4, 32, 0.6);
}

.hero-stars {
	justify-content: flex-start;
}

.hero-cue {
	@include caps;
	color: var(--text-3);
}

/* The one amber thing on the screen. */
.hero-play {
	@include chunky;
	align-self: flex-start;
	display: inline-flex;
	align-items: center;
	gap: 0.45rem;
	margin-top: 0.35rem;
	padding: 0.55rem 1.6rem;
	font-size: var(--text-lg);
}

.hero-play-icon {
	width: 1.1rem;
	height: 1.1rem;
}

/* The road: this level and the four after it. Progress as a path is the one
   piece of game furniture the old menu had no equivalent for. */
.hero-road {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	flex-wrap: wrap;
}

.road-node {
	display: grid;
	justify-items: center;
	gap: 0.1rem;
	min-width: 2.4rem;
	padding: 0.25rem 0.35rem;
	border-radius: var(--radius-s);
	background: rgba(15, 9, 48, 0.6);
	border: 1px solid var(--border-soft);
}

.road-node.done {
	border-color: color-mix(in srgb, var(--mode-records) 45%, transparent);
}

.road-node.current {
	background: color-mix(in srgb, var(--accent-1) 26%, rgba(15, 9, 48, 0.7));
	border-color: var(--accent-1);
	box-shadow: 0 0 0.9rem color-mix(in srgb, var(--accent-1) 40%, transparent);
}

.road-number {
	font-size: var(--text-xs);
	font-weight: var(--weight-black);
	color: var(--text-2);
}

.road-stars {
	display: flex;
	gap: 0.1rem;
}

.road-stars i {
	width: 0.28rem;
	height: 0.28rem;
	border-radius: 50%;
	background: var(--surface-2);
}

.road-stars i.lit {
	background: var(--mode-records);
	box-shadow: 0 0 0.35rem var(--mode-records);
}

/* ---- The other three modes ---- */
.mode-column {
	display: grid;
	grid-template-rows: repeat(3, auto) 1fr;
	align-content: start;
	gap: var(--space-2);
	min-height: 0;
}

.mode-card {
	@include panel(var(--radius-m));
	display: flex;
	align-items: center;
	gap: var(--space-3);
	padding: var(--space-3);
	text-align: left;
	color: var(--text-1);
	cursor: pointer;
	border: 2px solid color-mix(in srgb, var(--accent-1) 40%, var(--border));
	box-shadow: 0 4px 0 var(--accent-2);
	transition: transform var(--dur-1) var(--ease), box-shadow var(--dur-1) var(--ease),
		border-color var(--dur-1) var(--ease);
}

.mode-card:hover {
	border-color: var(--accent-1);
}

.mode-card:active {
	transform: translateY(3px);
	box-shadow: 0 1px 0 var(--accent-2);
}

/* The icon tile carries the mode's colour and its glow — the card body stays
   calm, so three cards in a column do not turn into three coloured slabs. */
.mode-card-icon {
	@include icon-well(var(--accent-1), 2.8rem, var(--radius-m));
}

.mode-card-icon svg {
	width: 1.4rem;
	height: 1.4rem;
}

.mode-card-text {
	display: flex;
	flex-direction: column;
	gap: 0.1rem;
	min-width: 0;
}

.mode-card-text strong {
	font-size: var(--text-lg);
	line-height: 1.1;
}

.mode-card-text span {
	font-size: var(--text-sm);
	color: var(--text-3);
}

/* ---- Mascot and tip ---- */
.menu-host {
	display: flex;
	align-items: center;
	gap: var(--space-2);
	padding-top: var(--space-2);
	min-height: 0;
}

.menu-mascot {
	flex-shrink: 0;
}

/* A speech bubble with a tail, because a floating line of grey text next to a
   character does not read as the character saying it. */
.menu-tip {
	position: relative;
	margin: 0;
	padding: var(--space-2) var(--space-3);
	border-radius: var(--radius-m);
	background: var(--surface-raised);
	border: 1px solid var(--border);
	box-shadow: var(--shadow-1);
	color: var(--text-2);
	font-size: var(--text-sm);
	line-height: 1.35;
}

.menu-tip::before {
	content: '';
	position: absolute;
	left: -0.42rem;
	top: 1.2rem;
	width: 0.8rem;
	height: 0.8rem;
	rotate: 45deg;
	background: var(--surface-raised);
	border-left: 1px solid var(--border);
	border-bottom: 1px solid var(--border);
}

/* ---- Secondary row ---- */
.menu-secondary {
	display: flex;
	justify-content: center;
	gap: var(--space-2);
	margin: 0;
}

.secondary-row {
	@include chunky-ghost(var(--radius-m));
	display: inline-flex;
	align-items: center;
	gap: 0.45rem;
	padding: 0.5rem 1rem;
	border-radius: var(--radius-round);
	background: var(--surface-1);
	color: var(--text-2);
	font-size: var(--text-sm);
	font-weight: var(--weight-bold);
	cursor: pointer;
}

.menu-secondary .secondary-row {
	min-width: min(18rem, 100%);
	justify-content: center;
}

.secondary-row:hover {
	color: var(--text-1);
	border-color: color-mix(in srgb, var(--accent-1) 40%, transparent);
}

.secondary-row-icon {
	width: 0.95rem;
	height: 0.95rem;
	color: var(--accent-1);
}

/* Rounded badge holding a mode's SVG glyph, tinted by its accent. */
.mode-icon {
	position: relative;
	z-index: 1;
	display: grid;
	place-items: center;
	width: 3.6rem;
	height: 3.6rem;
	border-radius: var(--radius-m);
	color: var(--accent-1);
	background: linear-gradient(
		150deg,
		color-mix(in srgb, var(--accent-1) 24%, transparent),
		color-mix(in srgb, var(--accent-2) 12%, transparent)
	);
	border: 1px solid color-mix(in srgb, var(--accent-1) 28%, transparent);
	transition: transform var(--dur-2) var(--ease), box-shadow var(--dur-2) var(--ease);
}

.mode-icon svg {
	width: 1.75rem;
	height: 1.75rem;
}

.play-card:hover .mode-icon {
	transform: translateY(-2px) scale(1.06);
	box-shadow: 0 0 1.2rem color-mix(in srgb, var(--accent-1) 32%, transparent);
}

/* ---- Campaign: one panel per world, levels as nodes ---- */
.world-panel {
	@include panel;
	display: grid;
	gap: var(--space-3);
	padding: var(--space-4);
}

/* A world the player can't reach yet stays visible (so the road ahead is legible)
   but recedes — it must not compete with the world they're actually playing. */
.world-panel.dimmed {
	opacity: 0.55;
}

.world-head {
	display: grid;
	grid-template-columns: auto minmax(0, 1fr) auto auto;
	align-items: center;
	gap: var(--space-3);
}

.world-text {
	min-width: 0;
	display: grid;
	gap: 0.1rem;
}

.world-title {
	font-size: var(--text-lg);
	color: var(--text-1);
}

.world-concept {
	font-size: var(--text-sm);
	color: var(--text-3);
}

.world-difficulty {
	@include caps;
	padding: 0.2rem 0.6rem;
	border-radius: var(--radius-round);
	color: var(--accent-2);
	background: color-mix(in srgb, var(--accent-1) 14%, transparent);
	border: 1px solid color-mix(in srgb, var(--accent-1) 32%, transparent);
	white-space: nowrap;
}

.world-progress {
	display: grid;
	justify-items: end;
	gap: 0.3rem;
	min-width: 7rem;
}

.world-stars {
	display: inline-flex;
	align-items: center;
	gap: 0.3rem;
	font-weight: var(--weight-bold);
	font-size: var(--text-sm);
	color: var(--text-2);
}

.world-stars-icon {
	width: 0.9rem;
	height: 0.9rem;
	color: var(--mode-records);
}

.world-bar {
	display: block;
	width: 100%;
	height: 0.3rem;
	border-radius: var(--radius-round);
	background: var(--surface-2);
	overflow: hidden;
}

.world-bar-fill {
	display: block;
	height: 100%;
	border-radius: var(--radius-round);
	background: linear-gradient(90deg, var(--accent-1), var(--accent-2));
	transition: width var(--dur-3) var(--ease);
}

.note-chips {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 0.35rem;
}

.note-chips-label {
	@include caps;
	color: var(--text-3);
	margin-right: 0.15rem;
}

.note-chip {
	padding: 0.15rem 0.5rem;
	border-radius: var(--radius-round);
	background: var(--surface-2);
	font-size: var(--text-xs);
	font-weight: var(--weight-bold);
	color: var(--text-2);
}

/* Nodes instead of rows: 25 levels read as a board at a glance, where the same
   levels as a list needed a long scroll and looked like settings. */
.node-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(3.4rem, 1fr));
	gap: var(--space-2);
}

.level-node {
	@include chunky-ghost(var(--radius-m));
	position: relative;
	display: grid;
	justify-items: center;
	align-content: center;
	gap: 0.15rem;
	aspect-ratio: 1;
	padding: 0.2rem;
	color: var(--text-1);
	cursor: pointer;
}

.level-node:hover:not(:disabled) {
	border-color: color-mix(in srgb, var(--accent-1) 70%, transparent);
}

/* Cleared: filled with the world accent so progress is visible as a shape, not
   only as stars. */
.level-node.cleared {
	background: color-mix(in srgb, var(--accent-1) 14%, transparent);
	border-color: color-mix(in srgb, var(--accent-1) 34%, transparent);
}

/* Milestone ("real song") levels carry a gold ring — the campaign's landmarks. */
.level-node.milestone {
	box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--mode-records) 45%, transparent);
}

.node-index {
	font-size: var(--text-md);
	font-weight: var(--weight-black);
	line-height: 1;
}

/* Best time on a cleared node: the board's report of what was actually done. */
.node-time {
	font-size: 0.6rem;
	font-weight: var(--weight-bold);
	color: var(--text-2);
	line-height: 1;
}

.node-stars {
	transform: scale(0.62);
	transform-origin: center;
	margin-top: -0.1rem;
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

/* Tinted, not filled: the icon carries the accent while the row stays quiet. */
.toggle-card-icon-badge {
	flex-shrink: 0;
	display: grid;
	place-items: center;
	width: 2rem;
	height: 2rem;
	border-radius: var(--radius-s);
	background: color-mix(in srgb, var(--accent-1) 16%, transparent);
	border: 1px solid color-mix(in srgb, var(--accent-1) 28%, transparent);
	color: var(--accent-1);
}

.toggle-card-icon {
	width: 1.05rem;
	height: 1.05rem;
}

.toggle-card-label {
	flex: 1;
	font-size: var(--text-md);
}

.switch {
	flex-shrink: 0;
	position: relative;
	width: 2.4rem;
	height: 1.3rem;
	border-radius: var(--radius-round);
	background: var(--surface-2);
	border: 1px solid var(--border);
	transition: background var(--dur-1) var(--ease);
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
	background: linear-gradient(135deg, var(--good), var(--mode-trainer-deep));
	border-color: transparent;
}

.switch.on .switch-knob {
	transform: translateX(1.1rem);
}

/* Each settings row only declares which accent it belongs to; the badge styling
   above does the rest, so there is one badge design instead of six. */
.toggle-card.accent-time { --accent-1: var(--mode-time); --accent-2: var(--mode-time-deep); }
.toggle-card.accent-endless { --accent-1: var(--mode-endless); --accent-2: var(--mode-endless-deep); }
.toggle-card.accent-campaign { --accent-1: var(--mode-campaign); --accent-2: var(--mode-campaign-deep); }
.toggle-card.accent-records { --accent-1: var(--mode-records); --accent-2: var(--mode-records-deep); }
.toggle-card.accent-trainer { --accent-1: var(--mode-trainer); --accent-2: var(--mode-trainer-deep); }
.toggle-card.accent-settings { --accent-1: var(--mode-settings); --accent-2: var(--mode-settings-deep); }

.segmented {
	display: flex;
	gap: 0.4rem;
	background: var(--surface-2);
	padding: 0.3rem;
	border-radius: var(--radius-round);
}

.segmented button {
	border: none;
	background: transparent;
	color: var(--text-2);
	padding: 0.45rem 0.9rem;
	border-radius: var(--radius-round);
	font-weight: 700;
	font-size: 0.82rem;
	cursor: pointer;
	transition: background 140ms ease, color 140ms ease;
}

.segmented button.active {
	background: linear-gradient(135deg, var(--accent-deep), #7d4406);
	color: var(--text-on-accent);
}

/* Same measure as the settings column: a 78rem-wide tab strip over a 5-row list
   reads as a stretched dashboard rather than a game screen. */
.records-tabs,
.records-panel {
	width: 100%;
	max-width: 48rem;
	margin-inline: auto;
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
	display: grid;
	place-items: center;
	width: 3.2rem;
	height: 3.2rem;
	border-radius: var(--radius-m);
	background: var(--surface-2);
	color: var(--text-3);
}

.empty-state-art svg {
	width: 1.4rem;
	height: 1.4rem;
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
	color: var(--text-2);
}

.records-list {
	display: grid;
	gap: 0.45rem;
	margin-top: 0.75rem;
}

.record-item {
	padding: var(--space-2) var(--space-3);
	border-radius: var(--radius-m);
	background: var(--surface-1);
}

.record-rank {
	flex-shrink: 0;
	width: 1.4rem;
	height: 1.4rem;
	display: grid;
	place-items: center;
	border-radius: var(--radius-round);
	background: color-mix(in srgb, var(--mode-records) 16%, transparent);
	color: var(--mode-records);
	font-weight: var(--weight-black);
	font-size: var(--text-sm);
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

/* The calmest screen in the app (per the design brief): a narrow, centered
   column of identical rows rather than a wide 3-across grid of colored tiles
   with a screen of dead space under it. */
.settings-grid {
	display: grid;
	grid-template-columns: repeat(2, minmax(0, 1fr));
	/* Rows size to their own content: with the default stretch, the two-line
	   "Note Names" card forced its plain neighbour to the same height. */
	align-items: start;
	gap: var(--space-2);
	width: 100%;
	max-width: 48rem;
	margin: 0 auto;
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

/* Says why the round ended before the numbers explain how it went. */
.result-verdict {
	@include caps(var(--text-sm));
	margin: 0;
	color: var(--text-2);
}

.result-verdict.good {
	color: var(--good);
}

.result-verdict.bad {
	color: var(--bad);
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

/* ---- My Tunes ---- */
.tunes-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--space-3);
}

.tune-list {
	display: grid;
	gap: var(--space-2);
}

.tune-row {
	@include panel(var(--radius-m));
	display: flex;
	align-items: center;
	gap: var(--space-2);
	padding: var(--space-2) var(--space-3);
}

.tune-info {
	flex: 1 1 auto;
	min-width: 0;
	display: flex;
	flex-direction: column;
}

.tune-title {
	color: var(--text-1);
	font-size: var(--text-md);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.tune-meta {
	color: var(--text-3);
	font-size: var(--text-xs);
	font-variant-numeric: tabular-nums;
}

.secondary-btn.small {
	padding: 0.4rem 0.8rem;
	font-size: var(--text-sm);
}

.new-best-tag {
	display: block;
	margin-top: 0.15rem;
	font-size: 0.6rem;
	font-weight: 800;
	letter-spacing: 0.02em;
	text-transform: uppercase;
	color: var(--mode-trainer-deep);
}

.ad-copy,
.empty-copy {
	color: var(--text-2);
	font-size: 0.78rem;
	margin: 0;
}

/* Portrait (or very tall/narrow): shrink the mascot and let the cards take the
   width in a 2-column grid. The game is landscape-first, but the menu still has to
   look intentional if opened upright. */
@media (orientation: portrait), (max-width: 560px) {
	.menu-logo-art {
	height: 2.4rem;
	width: auto;
	display: block;
	filter: drop-shadow(0 4px 10px rgba(10, 4, 32, 0.55));
}

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
