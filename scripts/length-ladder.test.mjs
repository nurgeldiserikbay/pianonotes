// The campaign's two promises about content, checked against the real list.
//
// 1. Every level plays its melody WHOLE. Levels used to be cut to a per-level
//    note budget, so the early ones played a fragment of a song and short tunes
//    were padded by repeating them. A player who knows the tune hears both.
// 2. The player meets tunes they recognise first. The hymnal corpus is 150
//    honest melodies almost nobody outside a congregation knows; it used to lead
//    the campaign because those tunes are short, which is the wrong reason.
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const out = await build({ entryPoints: ['src/modes/melodies.ts'], bundle: true, format: 'esm', write: false, logLevel: 'silent', alias: { '@': './src' } })
const dir = mkdtempSync(join(tmpdir(), 'ladder-'))
const f = join(dir, 'm.mjs'); writeFileSync(f, out.outputFiles[0].text)
const { MELODIES_BY_DIFFICULTY, ALL_MELODIES } = await import(pathToFileURL(f).href)

const total = MELODIES_BY_DIFFICULTY.length
const source = new Map(ALL_MELODIES.map((m) => [m.id, m]))
const seconds = (m) => m.notes.reduce((sum, n) => sum + n.beats, 0) * (60 / m.bpm)
// Melodies the hymnal import contributed. Matched by id prefix, minus the one
// folk song whose title starts the same way.
const isHymnal = (m) => m.id.startsWith('oh-') && m.id !== 'oh-susanna'

console.log(`levels: ${total}\n`)
console.log('  #  notes   ~sec  title')
MELODIES_BY_DIFFICULTY.forEach((m, i) => {
	const src = source.get(m.id)
	const cut = src && m.notes.length < src.notes.length ? `  (CUT from ${src.notes.length})` : ''
	console.log(`${String(i + 1).padStart(3)}  ${String(m.notes.length).padStart(5)}  ${seconds(m).toFixed(0).padStart(5)}  ${m.title}${cut}`)
})

const cut = MELODIES_BY_DIFFICULTY.filter((m) => {
	const src = source.get(m.id)
	return src && m.notes.length < src.notes.length
})
// The safety valve is allowed to shorten the few transcriptions that run past a
// phone sitting — but it must stay a handful, not a policy.
const longest = Math.max(...MELODIES_BY_DIFFICULTY.map(seconds))
const firstHymnal = MELODIES_BY_DIFFICULTY.findIndex(isHymnal)
const familiarRun = firstHymnal === -1 ? total : firstHymnal
const openingLongest = Math.max(...MELODIES_BY_DIFFICULTY.slice(0, 8).map(seconds))

console.log('')
console.log('levels cut short   :', cut.length, cut.map((m) => m.title).join(', '))
console.log('longest level      :', longest.toFixed(0), 'seconds')
console.log('recognisable run   :', familiarRun, 'levels before the first hymnal tune')
console.log('opening 8 levels   : up to', openingLongest.toFixed(0), 'seconds each')

const problems = []
if (cut.length > 5) problems.push(`${cut.length} levels play only part of their melody`)
if (longest > 150) problems.push(`a level runs ${longest.toFixed(0)}s`)
if (familiarRun < 80) problems.push(`only ${familiarRun} recognisable tunes before the hymnal corpus starts`)
if (openingLongest > 45) problems.push(`the opening asks for a ${openingLongest.toFixed(0)}s level`)

console.log('')
console.log(problems.length ? 'FAIL - ' + problems.join('; ') : 'PASS - whole melodies, familiar ones first')
if (problems.length && process.argv.includes('--strict')) process.exit(1)
