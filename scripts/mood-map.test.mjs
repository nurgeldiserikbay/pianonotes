// Every campaign level must take its paper from the melody's tagged mood, and
// every melody must be tagged. Compiles the real modules — no reimplementation.
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const out = await build({
	entryPoints: ['src/modes/campaignGenerator.ts'],
	bundle: true, format: 'esm', write: false, logLevel: 'silent',
	alias: { '@': './src' },
})
const dir = mkdtempSync(join(tmpdir(), 'mood-'))
const file = join(dir, 'gen.mjs')
writeFileSync(file, out.outputFiles[0].text)

const { generateCampaignLevels } = await import(pathToFileURL(file).href)
const moodsOut = await build({
	entryPoints: ['src/modes/melodies.ts'],
	bundle: true, format: 'esm', write: false, logLevel: 'silent',
	alias: { '@': './src' },
})
const mfile = join(dir, 'mel.mjs')
writeFileSync(mfile, moodsOut.outputFiles[0].text)
const { getMelodyMood, MELODY_MOODS, MELODIES_BY_DIFFICULTY } = await import(pathToFileURL(mfile).href)

const levels = generateCampaignLevels()
const counts = {}
levels.forEach((l) => { counts[l.themeId] = (counts[l.themeId] ?? 0) + 1 })

// Checked through getMelodyMood rather than the hand-written table: corpus
// entries carry a derived mood of their own, and reading the table directly
// would report 150 tunes as untagged when the game colours them correctly.
// A melody is tagged if the hand table names it or it carries its own mood;
// checking the resolved value alone cannot tell "tagged calm" from "defaulted".
const untagged = MELODIES_BY_DIFFICULTY.filter((m) => !MELODY_MOODS[m.id] && !m.mood).map((m) => m.id)
const mismatched = levels.filter((l) => l.themeId !== getMelodyMood(l.id))

console.log('levels:', levels.length)
console.log('moods used:', JSON.stringify(counts))
console.log('untagged melodies:', untagged.length ? untagged.join(', ') : 'none')
console.log('levels whose paper != their mood:', mismatched.length)
console.log('sample:', levels.slice(0, 6).map((l) => `${l.title} → ${l.themeId}`).join('\n         '))

const ok = untagged.length === 0 && mismatched.length === 0 && Object.keys(counts).length >= 4
console.log(ok ? '\nPASS' : '\nFAIL')
process.exit(ok ? 0 : 1)
