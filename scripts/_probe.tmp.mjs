import { build } from 'esbuild'
import { writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
const out = await build({ entryPoints: ['src/modes/melodies.ts'], bundle: true, format: 'esm', write: false, logLevel: 'silent', alias: { '@': './src' } })
const f = join(tmpdir(), 'probe-' + Date.now() + '.mjs')
writeFileSync(f, out.outputFiles[0].text)
const { ALL_MELODIES, MELODIES_BY_DIFFICULTY } = await import(pathToFileURL(f).href)

const lens = ALL_MELODIES.map((m) => m.notes.length).sort((a, b) => a - b)
const atLeast = (n) => lens.filter((l) => l >= n).length
console.log('library:', lens.length, 'melodies')
console.log('source >= 49 notes :', atLeast(49))
console.log('source >= 40 notes :', atLeast(40))
console.log('source >= 24 notes :', atLeast(24))
console.log('shortest ten       :', lens.slice(0, 10).join(' '))

// What the first eight levels look like today, and what 49 notes would mean there.
console.log('\nfirst eight levels (played notes / source notes / seconds):')
for (const m of MELODIES_BY_DIFFICULTY.slice(0, 8)) {
	const src = ALL_MELODIES.find((x) => x.id === m.id).notes.length
	const secs = m.notes.reduce((s, n) => s + n.beats, 0) * (60 / m.bpm)
	const passesFor49 = Math.ceil(49 / src)
	console.log(`  ${m.title.padEnd(30)} ${String(m.notes.length).padStart(3)} / ${String(src).padStart(3)}  ${secs.toFixed(0)}s   -> 49 notes needs ${passesFor49} passes`)
}
