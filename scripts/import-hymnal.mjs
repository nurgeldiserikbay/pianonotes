// Bulk melody import from the Open Hymnal Project — one 2 MB ABC file holding
// 293 hymn and carol tunes.
//
// WHY THIS SOURCE. Volume needs a corpus, and most corpora cannot be used here:
// Henrik Norbeck's 3000-tune collection forbids commercial use, and the
// thesession.org data dump forbids processing with language models. The Open
// Hymnal admits a tune only if "it must be in the public domain or freely
// distributable", and every tune carries its own copyright line — which this
// script checks per tune rather than trusting the collection as a whole.
//
// WHAT IT TAKES. Only the melody voice (the soprano line). The rest of the
// four-part setting is a different arranger's work and irrelevant to a game
// where one note is played at a time.
//
// REVIEW: the tunes are old and the transcriptions are careful, but nothing here
// has been heard by a human. Play a sample before shipping a chapter.
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const SOURCE = 'http://openhymnal.org/OpenHymnal2014.06.abc'
const CACHE_DIR = join(tmpdir(), 'openhymnal')
const CACHE = join(CACHE_DIR, 'OpenHymnal2014.06.abc')
const OUT = new URL('../src/modes/melodies.hymnal.ts', import.meta.url)

// How many tunes to keep. The library should not become a hymn book, so the
// corpus is capped and thinned for variety below.
const CAP = Number(process.argv.find((a) => a.startsWith('--cap='))?.split('=')[1] ?? 150)
const MIN_NOTES = 16
const MAX_NOTES = 160
const RANGE_LOW = 48 // c4
const RANGE_HIGH = 71 // b5

const SEMITONES = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }
const LANE_BY_SEMITONE = ['c', 'cs', 'd', 'ds', 'e', 'f', 'fs', 'g', 'gs', 'a', 'as', 'b']
const KEY_SIGNATURES = {
	C: {}, G: { f: 1 }, D: { f: 1, c: 1 }, A: { f: 1, c: 1, g: 1 },
	E: { f: 1, c: 1, g: 1, d: 1 }, B: { f: 1, c: 1, g: 1, d: 1, a: 1 },
	F: { b: -1 }, Bb: { b: -1, e: -1 }, Eb: { b: -1, e: -1, a: -1 },
	Ab: { b: -1, e: -1, a: -1, d: -1 }, Db: { b: -1, e: -1, a: -1, d: -1, g: -1 },
	Am: {}, Em: { f: 1 }, Bm: { f: 1, c: 1 }, Fm: { b: -1, e: -1, a: -1, d: -1 },
	Dm: { b: -1 }, Gm: { b: -1, e: -1 }, Cm: { b: -1, e: -1, a: -1 },
	'F#m': { f: 1, c: 1, g: 1 }, 'C#m': { f: 1, c: 1, g: 1, d: 1 },
}

async function loadSource() {
	if (existsSync(CACHE)) return readFileSync(CACHE, 'utf8')
	const response = await fetch(SOURCE, { headers: { 'user-agent': 'Mozilla/5.0' } })
	if (!response.ok) throw new Error(`HTTP ${response.status} for ${SOURCE}`)
	const text = new TextDecoder().decode(await response.arrayBuffer())
	mkdirSync(CACHE_DIR, { recursive: true })
	writeFileSync(CACHE, text)
	return text
}

function evalFraction(value) {
	const [top, bottom] = value.split('/')
	return Number(top) / Number(bottom || 1)
}

// Repeat marks are played through, the way the tune is sung.
function expandRepeats(body) {
	const parts = body.split(/:\|+|\|+:/)
	if (parts.length < 2) return body
	return parts.map((part, index) => (index === 0 ? part : part + ' ' + part)).join(' ')
}

function cleanBody(body) {
	return body
		.replace(/"[^"]*"/g, '')
		.replace(/![^!]*!/g, '')
		.replace(/\{[^}]*\}/g, '')
		.replace(/\[[A-Za-z]:[^\]]*\]/g, '')
		.replace(/\(\d/g, '')
		.replace(/[()\-~.]/g, '')
}

function parseNotes(body, keyName, unitLength) {
	const signature = KEY_SIGNATURES[keyName] ?? KEY_SIGNATURES[keyName.replace('m', '')] ?? {}
	const notes = []
	let pendingRestBeats = 0

	const tokens = expandRepeats(cleanBody(body)).match(/[_^=]*[A-Ga-gz][,']*\d*(?:\/\d*)?/g) ?? []
	for (const token of tokens) {
		const parsed = token.match(/^([_^=]*)([A-Ga-gz])([,']*)(\d*)(?:\/(\d*))?$/)
		if (!parsed) continue
		const [, accidental, letter, octaveMarks, multiplier, divisor] = parsed

		let length = unitLength
		if (multiplier) length *= Number(multiplier)
		if (divisor !== undefined) length /= divisor ? Number(divisor) : 2
		const beats = Math.max(0.25, Math.round((length / 0.25) * 4) / 4)

		if (letter === 'z') {
			pendingRestBeats += beats
			continue
		}

		const lower = letter.toLowerCase()
		let semitone = SEMITONES[lower]
		let octave = letter === lower ? 5 : 4
		for (const mark of octaveMarks) octave += mark === "'" ? 1 : -1
		if (accidental.includes('^')) semitone += accidental.split('^').length - 1
		else if (accidental.includes('_')) semitone -= accidental.split('_').length - 1
		else if (!accidental.includes('=')) semitone += signature[lower] ?? 0

		// A rest lengthens the note before it: the game has no rests, and holding
		// the previous note keeps the phrase the right length.
		if (notes.length && pendingRestBeats) {
			notes[notes.length - 1].beats += pendingRestBeats
			pendingRestBeats = 0
		}
		notes.push({ midi: octave * 12 + semitone, beats })
	}
	return notes
}

// Shift the whole tune into the two octaves the keyboard has. Which shift is
// chosen matters more than it looks: shifting only by whole octaves preserves
// every note name, so a corpus transposed that way can never teach a note its
// sources never contain. That is exactly why the library sat at 22 of 24 keys
// with g#5 and a#5 unreachable.
//
// So the shift is picked per tune, in semitones, against two different goals:
// beginner material takes the placement with the fewest black keys, and later
// material takes the placement that introduces notes the library has not taught
// yet. The difficulty sort then puts the chromatic ones late by itself, because
// accidentals weigh heavily in it.
const BEGINNER_TUNES = 60

function candidateShifts(notes) {
	const low = Math.min(...notes.map((n) => n.midi))
	const high = Math.max(...notes.map((n) => n.midi))
	if (high - low > RANGE_HIGH - RANGE_LOW) return []
	const shifts = []
	for (let shift = -48; shift <= 48; shift += 1) {
		if (low + shift < RANGE_LOW || high + shift > RANGE_HIGH) continue
		shifts.push(shift)
	}
	return shifts
}

function laneAt(midi) {
	return LANE_BY_SEMITONE[midi % 12] + Math.floor(midi / 12)
}

function applyShift(notes, shift) {
	return notes.map((note) => ({ lane: laneAt(note.midi + shift), beats: note.beats }))
}

function fitToRange(notes, taught, seekCoverage) {
	const shifts = candidateShifts(notes)
	if (!shifts.length) return null

	const low = Math.min(...notes.map((n) => n.midi))
	const high = Math.max(...notes.map((n) => n.midi))
	const middle = (RANGE_LOW + RANGE_HIGH) / 2

	let best = null
	for (const shift of shifts) {
		const lanes = new Set(notes.map((note) => laneAt(note.midi + shift)))
		const black = [...lanes].filter((lane) => lane.includes('s')).length
		// Distance from the middle of the keyboard, as a tiebreaker only.
		const offCentre = Math.abs((low + high) / 2 + shift - middle)

		let score
		if (seekCoverage) {
			// A note nobody has been taught is worth far more than a fourth
			// repetition of one they already know.
			let gain = 0
			for (const lane of lanes) {
				const seen = taught.get(lane) ?? 0
				gain += seen === 0 ? 12 : seen === 1 ? 5 : seen === 2 ? 2 : 0
			}
			score = gain - offCentre * 0.1
		} else {
			score = -black * 10 - offCentre
		}
		if (!best || score > best.score) best = { shift, score }
	}
	if (!best) return null
	return applyShift(notes, best.shift)
}

function trimToPhrase(notes, max) {
	if (notes.length <= max) return notes
	let beats = 0
	let lastBar = 0
	for (let i = 0; i < max; i += 1) {
		beats += notes[i].beats
		if (Math.abs(beats % 4) < 0.01) lastBar = i + 1
	}
	return notes.slice(0, lastBar >= max * 0.75 ? lastBar : max)
}

// Mood comes from the music, not from a hand-kept table: 293 tunes cannot be
// tagged by hand, and the key and the pace already say most of it.
function deriveMood(keyName, tempo, notes) {
	const minor = /m$|min|dor|aeo|phr/i.test(keyName)
	const perNote = notes.reduce((sum, n) => sum + n.beats, 0) / notes.length
	if (minor) return perNote > 1.3 ? 'wistful' : 'calm'
	// Thresholds are calibrated on this corpus, whose tempos run 96-140 with a
	// median of 120. A flat "fast is bright" rule put 90 of 150 tunes in one
	// scene, which made the backgrounds stop meaning anything.
	if (tempo >= 132) return 'bright'
	if (tempo <= 100) return perNote > 1.35 ? 'solemn' : 'tender'
	return perNote > 1.3 ? 'calm' : 'playful'
}

const slug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)
const normaliseTitle = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function splitTunes(text) {
	const chunks = []
	let current = null
	for (const line of text.split(/\r?\n/)) {
		if (/^X:/.test(line)) {
			if (current) chunks.push(current)
			current = []
		}
		if (current) current.push(line)
	}
	if (current) chunks.push(current)
	return chunks
}

function readTune(lines, taught, seekCoverage) {
	const field = (name) => lines.find((l) => l.startsWith(name + ':'))?.slice(name.length + 1).trim()
	const title = field('T')
	if (!title) return { skip: 'no title' }

	// Per-tune licence gate. No public-domain line, no import.
	const rights = lines.filter((l) => l.startsWith('C:')).join(' ')
	if (!/public domain|freely distributable/i.test(rights)) return { skip: 'no public-domain line' }

	const keyName = (field('K') ?? 'C').split('%')[0].trim().split(/\s+/)[0]
	const rawLength = field('L')
	const unitLength = rawLength ? evalFraction(rawLength.split('%')[0].trim()) : 0.125
	const tempoText = lines.join(' ').match(/Q:\s*[^=\]]*=\s*(\d+)/)
	const tempo = tempoText ? Number(tempoText[1]) : 0
	const meter = (field('M') ?? '4/4').split('%')[0].trim()

	// The melody is the first voice. Voice names differ between tunes, so take
	// whichever voice the file declares first rather than hard-coding "S1V1".
	const firstVoice = lines.find((l) => l.startsWith('V:'))?.slice(2).trim().split(/\s+/)[0]
	if (!firstVoice) return { skip: 'no voices' }
	const melodyLines = lines
		.filter((l) => l.startsWith('[V: ' + firstVoice + ']') || l.startsWith('[V:' + firstVoice + ']'))
		.map((l) => l.replace(/^\[V:\s*[^\]]*\]/, ''))
	if (!melodyLines.length) return { skip: 'melody voice not found' }

	const notes = parseNotes(melodyLines.join(' '), keyName, unitLength)
	if (notes.length < MIN_NOTES) return { skip: 'too few notes' }
	const fitted = fitToRange(notes, taught, seekCoverage)
	if (!fitted) return { skip: 'does not fit two octaves' }

	const composer = lines.find((l) => l.startsWith('%OHCOMPOSER'))?.slice('%OHCOMPOSER'.length).trim()
	return {
		melody: {
			id: 'oh-' + slug(title),
			title,
			source: composer ? composer.replace(/\s*\(.*\)\s*$/, '') : 'Traditional',
			bpm: tempo >= 60 && tempo <= 160 ? tempo : 96,
			mood: deriveMood(keyName, tempo, fitted),
			notes: trimToPhrase(fitted, MAX_NOTES),
		},
		group: keyName + '|' + meter,
	}
}

// Thinning for variety: walk the key/metre groups round-robin so the kept set is
// spread across the collection instead of being the first N alphabetically.
function thinForVariety(entries, cap) {
	const groups = new Map()
	for (const entry of entries) {
		if (!groups.has(entry.group)) groups.set(entry.group, [])
		groups.get(entry.group).push(entry.melody)
	}
	const order = [...groups.values()]
	const kept = []
	for (let round = 0; kept.length < cap; round += 1) {
		let addedThisRound = 0
		for (const list of order) {
			if (round >= list.length || kept.length >= cap) continue
			kept.push(list[round])
			addedThisRound += 1
		}
		if (!addedThisRound) break
	}
	return kept
}

const text = await loadSource()
const tunes = splitTunes(text)
const accepted = []
const skips = new Map()
const seenTitles = new Set()

// What the library has taught so far, built up as tunes are accepted. The tally
// is what makes the coverage-seeking transposition above possible.
const taught = new Map()

tunes.forEach((lines) => {
	const result = readTune(lines, taught, accepted.length >= BEGINNER_TUNES)
	if (result.skip) {
		skips.set(result.skip, (skips.get(result.skip) ?? 0) + 1)
		return
	}
	const key = normaliseTitle(result.melody.title)
	if (seenTitles.has(key)) {
		skips.set('duplicate title', (skips.get('duplicate title') ?? 0) + 1)
		return
	}
	seenTitles.add(key)
	accepted.push(result)
	for (const lane of new Set(result.melody.notes.map((note) => note.lane))) {
		taught.set(lane, (taught.get(lane) ?? 0) + 1)
	}
})

const kept = thinForVariety(accepted, CAP)
kept.sort((a, b) => a.title.localeCompare(b.title))

const header = `// GENERATED by scripts/import-hymnal.mjs — do not edit by hand.
// Source: the Open Hymnal Project's single-file ABC edition (2014.06),
// http://openhymnal.org/. Every tune below carried its own "copyright: public
// domain" line in the source file; the script refuses tunes that do not.
//
// Only the melody voice is taken. Moods are derived from key and tempo rather
// than hand-tagged — see deriveMood in the script.
//
// REVIEW: none of these has been heard by a human. Sample a few per chapter.

import type { Melody } from './melodies'

export const HYMNAL_MELODIES: Melody[] = `

writeFileSync(OUT, header + JSON.stringify(kept, null, '\t') + '\n')

const moodCounts = {}
for (const melody of kept) moodCounts[melody.mood] = (moodCounts[melody.mood] ?? 0) + 1

console.log('tunes in file :', tunes.length)
console.log('usable        :', accepted.length)
console.log('kept          :', kept.length, '(cap ' + CAP + ')')
console.log('skips         :', [...skips.entries()].map(([k, v]) => k + ' (' + v + ')').join(', ') || 'none')
console.log('moods         :', JSON.stringify(moodCounts))
