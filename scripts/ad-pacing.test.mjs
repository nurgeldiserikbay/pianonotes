import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Compile the real adManager (no reimplementation — the test must exercise the
// shipped rules) and run it against a fake clock and a fake localStorage.
const result = await build({
	entryPoints: ['src/ads/adManager.ts'],
	bundle: true,
	format: 'esm',
	write: false,
	external: [],
	alias: { '@': './src' },
	logLevel: 'silent',
})

const dir = mkdtempSync(join(tmpdir(), 'adtest-'))
const file = join(dir, 'adManager.mjs')
writeFileSync(file, result.outputFiles[0].text)

let now = 0
const store = new Map()
globalThis.window = { localStorage: {
	getItem: (k) => store.get(k) ?? null,
	setItem: (k, v) => store.set(k, v),
} }
const realNow = Date.now
Date.now = () => now

const { AdManager } = await import(pathToFileURL(file).href)

const MINUTE = 60_000

function run(label, { count, trigger, earlyGame, minutesBetween }) {
	store.clear()
	now = 10 * MINUTE
	const manager = new AdManager()
	const adsAt = []

	for (let i = 1; i <= count; i += 1) {
		now += minutesBetween * MINUTE
		if (trigger === 'echo-round') manager.recordEchoRound()
		else if (trigger === 'sprint-run') manager.recordSprintRun()
		else manager.recordLevelEnd()
		if (manager.consume(trigger, true, earlyGame)) adsAt.push(i)
	}

	const gaps = adsAt.slice(1).map((v, i) => v - adsAt[i])
	console.log(`${label}\n  ads after: [${adsAt.join(', ')}]  gaps: [${gaps.join(', ')}]`)
	return { adsAt, gaps }
}

const early = run('EARLY campaign, 12 attempts, 2 min apart', { count: 12, trigger: 'level-end', earlyGame: true, minutesBetween: 2 })
const later = run('LATER campaign, 12 attempts, 2 min apart', { count: 12, trigger: 'level-end', earlyGame: false, minutesBetween: 2 })
const sprint = run('SPRINT, 6 runs, 4 min apart', { count: 6, trigger: 'sprint-run', earlyGame: false, minutesBetween: 4 })
const echo = run('BY EAR, 9 attempts, 4 min apart', { count: 9, trigger: 'echo-round', earlyGame: false, minutesBetween: 4 })
const fast = run('EARLY campaign, 12 fast attempts, 20 s apart', { count: 12, trigger: 'level-end', earlyGame: true, minutesBetween: 1 / 3 })

Date.now = realNow

const checks = [
	['early: never closer than 4 levels', early.gaps.every((g) => g >= 4)],
	['early: first ad not before level 4', early.adsAt[0] >= 4],
	['later: never closer than 3 levels', later.gaps.every((g) => g >= 3)],
	['sprint: every 2nd run', sprint.adsAt.join() === '2,4,6'],
	['by ear: every 3rd attempt', echo.adsAt.join() === '3,6,9'],
	['fast play: cooldown keeps ads apart', fast.gaps.every((g) => g >= 4)],
]
console.log('')
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}`)
process.exit(checks.every(([, ok]) => ok) ? 0 : 1)
