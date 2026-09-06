// Every beat the player is asked to tap must be playable on a phone: at most two
// keys at once, agreed as the touchscreen limit. This scans the chart of every
// level for slots that ask for more, and for melodies whose notes collide in
// time (which produce exactly such a stack on the staff).
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const compiled = await build({ entryPoints: ['src/modes/campaignGenerator.ts'], bundle: true, format: 'esm', write: false, logLevel: 'silent', alias: { '@': './src' } })
const dir = mkdtempSync(join(tmpdir(), 'slots-'))
const file = join(dir, 'gen.mjs')
writeFileSync(file, compiled.outputFiles[0].text)
const { generateCampaignLevels, buildMelodyChart } = await import(pathToFileURL(file).href)

const melodies = await build({ entryPoints: ['src/modes/melodies.ts'], bundle: true, format: 'esm', write: false, logLevel: 'silent', alias: { '@': './src' } })
const mfile = join(dir, 'mel.mjs')
writeFileSync(mfile, melodies.outputFiles[0].text)
const { MELODIES_BY_DIFFICULTY } = await import(pathToFileURL(mfile).href)

const LIMIT = 2
const offenders = []
let worst = 0

MELODIES_BY_DIFFICULTY.forEach((melody, index) => {
	const chart = buildMelodyChart(melody, melody.bpm)
	const slots = new Map()
	for (const note of chart) {
		if (!slots.has(note.timeMs)) slots.set(note.timeMs, [])
		slots.get(note.timeMs).push(note.laneId)
	}
	const biggest = Math.max(...[...slots.values()].map((s) => s.length))
	worst = Math.max(worst, biggest)
	if (biggest > LIMIT) {
		const example = [...slots.entries()].find(([, s]) => s.length === biggest)
		offenders.push({ level: index + 1, id: melody.id, title: melody.title, size: biggest, lanes: example[1].join(' ') })
	}
})

const levels = generateCampaignLevels()
console.log('levels        :', levels.length)
console.log('biggest slot  :', worst, 'note(s) at once')
console.log('offenders     :', offenders.length)
for (const o of offenders.slice(0, 20)) {
	console.log(`  level ${String(o.level).padStart(3)}  ${o.size} at once  ${o.title} [${o.lanes}]`)
}
if (offenders.length > 20) console.log(`  ... and ${offenders.length - 20} more`)

console.log('')
console.log(offenders.length ? 'FAIL - some beats ask for more keys than a phone can register' : 'PASS - no beat asks for more than two keys')
if (offenders.length && process.argv.includes('--strict')) process.exit(1)
