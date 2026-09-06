// Does the library actually teach every note? "The player will know all notes by
// the end" is only true if the melodies cover all 24 keys — this measures it
// rather than assuming it.
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const out = await build({ entryPoints: ['src/modes/melodies.ts'], bundle: true, format: 'esm', write: false, logLevel: 'silent', alias: { '@': './src' } })
const dir = mkdtempSync(join(tmpdir(), 'cov-'))
const f = join(dir, 'm.mjs'); writeFileSync(f, out.outputFiles[0].text)
const { MELODIES_BY_DIFFICULTY } = await import(pathToFileURL(f).href)

const LANES = ['c4','cs4','d4','ds4','e4','f4','fs4','g4','gs4','a4','as4','b4','c5','cs5','d5','ds5','e5','f5','fs5','g5','gs5','a5','as5','b5']
const melodies = Object.fromEntries(LANES.map((l) => [l, 0]))
const notes = Object.fromEntries(LANES.map((l) => [l, 0]))

for (const m of MELODIES_BY_DIFFICULTY) {
	const used = new Set()
	for (const n of m.notes) { notes[n.lane] = (notes[n.lane] ?? 0) + 1; used.add(n.lane) }
	used.forEach((l) => { melodies[l] = (melodies[l] ?? 0) + 1 })
}

console.log('melodies:', MELODIES_BY_DIFFICULTY.length, '| notes:', MELODIES_BY_DIFFICULTY.reduce((s,m)=>s+m.notes.length,0))
console.log('\nlane  melodies notes')
for (const l of LANES) {
	console.log(`${l.padEnd(5)} ${String(melodies[l]).padStart(6)} ${String(notes[l]).padStart(6)}  ${'#'.repeat(Math.min(24, melodies[l]))}${l.includes('s') ? '  (black)' : ''}`)
}
const never = LANES.filter((l) => melodies[l] === 0)

// The curriculum promise, written as thresholds. A note met in a single melody is
// not a note the player knows: three separate tunes is the floor for a white key,
// and every black key has to appear at least once for "by the end you know all
// the notes" to be a true statement rather than a hope.
const WHITE_MIN = 3
const BLACK_MIN = 1

const white = LANES.filter((l) => !l.includes('s'))
const black = LANES.filter((l) => l.includes('s'))
const whiteGaps = white.filter((l) => melodies[l] < WHITE_MIN)
const blackGaps = black.filter((l) => melodies[l] < BLACK_MIN)

console.log('')
console.log('never taught       :', never.join(', ') || 'none')
console.log('white keys under ' + WHITE_MIN + ' :', whiteGaps.join(', ') || 'none')
console.log('black keys under ' + BLACK_MIN + ' :', blackGaps.join(', ') || 'none')
console.log('coverage           :', LANES.length - never.length, '/', LANES.length, 'keys')

const ok = whiteGaps.length === 0 && blackGaps.length === 0
console.log('')
console.log(ok ? 'PASS - every key is taught' : 'GAPS - the library does not teach every key yet')
if (!ok && process.argv.includes('--strict')) process.exit(1)
