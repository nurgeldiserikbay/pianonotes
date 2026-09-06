// The campaign's content: real tunes, not generated note runs.
//
// COPYRIGHT: every melody here is public domain — traditional/folk tunes with no
// known author, or compositions whose copyright has long expired (Beethoven,
// Mozart-era, 19th-century songbook material). "Happy Birthday to You" is
// included because the melody was ruled public domain in 2016. Do NOT add modern
// popular songs: a melody stays under copyright for decades and Play removes
// apps over it. When in doubt, leave it out.
//
// ACCURACY: the sequences are written from the common singing versions in C
// major, transposed to sit inside the app's c4–b5 keyboard. They should be
// checked by ear once before release — a wrong note here is a wrong note the
// player is asked to play.

import type { MelodyMood } from '@/core/models'
import { IMPORTED_MELODIES } from './melodies.generated'
import { HYMNAL_MELODIES } from './melodies.hymnal'

export interface MelodyNote {
	lane: string
	// Length in beats. Only used for the tempo pacer: the player still advances
	// the melody at their own speed.
	beats: number
	// Extra notes sounding on the same beat. Kept to one companion in practice:
	// two fingers is what a phone screen reliably registers, and a beginner can
	// actually reach a second key without lifting their hand.
	with?: string[]
}

export interface Melody {
	id: string
	title: string
	source: string
	bpm: number
	notes: MelodyNote[]
	// Title of the transcription an imported melody actually came from. Present
	// only on imported entries, and only so a wrong match can be spotted in
	// review — the game itself never shows it.
	sourceTitle?: string
	// Mood carried by the melody itself. Corpus entries derive it from key and
	// tempo because a 150-tune batch cannot be tagged by hand; curated entries
	// leave it unset and are looked up in MELODY_MOODS below.
	mood?: MelodyMood
}

// Shorthand: "c5" or "c5:2" (two beats). Keeps the tables below readable.
function seq(spec: string): MelodyNote[] {
	return spec
		.trim()
		.split(/\s+/)
		.map((token) => {
			const [lane, beats] = token.split(':')
			return { lane, beats: beats ? Number(beats) : 1 }
		})
}

export const MELODIES: Melody[] = [
	{
		id: 'hot-cross-buns',
		title: 'Hot Cross Buns',
		source: 'Traditional',
		bpm: 84,
		notes: seq(`
			e5 d5 c5:2 e5 d5 c5:2
			c5 c5 c5 c5 d5 d5 d5 d5
			e5 d5 c5:2
		`),
	},
	{
		id: 'mary-had-a-little-lamb',
		title: 'Mary Had a Little Lamb',
		source: 'Traditional',
		bpm: 88,
		notes: seq(`
			e5 d5 c5 d5 e5 e5 e5:2
			d5 d5 d5:2 e5 g5 g5:2
			e5 d5 c5 d5 e5 e5 e5 e5
			d5 d5 e5 d5 c5:2
		`),
	},
	{
		id: 'twinkle-twinkle',
		title: 'Twinkle, Twinkle, Little Star',
		source: 'Traditional',
		bpm: 88,
		notes: seq(`
			c5 c5 g5 g5 a5 a5 g5:2
			f5 f5 e5 e5 d5 d5 c5:2
			g5 g5 f5 f5 e5 e5 d5:2
			g5 g5 f5 f5 e5 e5 d5:2
			c5 c5 g5 g5 a5 a5 g5:2
			f5 f5 e5 e5 d5 d5 c5:2
		`),
	},
	{
		id: 'row-your-boat',
		title: 'Row, Row, Row Your Boat',
		source: 'Traditional',
		bpm: 92,
		notes: seq(`
			c5:2 c5:2 c5 d5 e5:2
			e5 d5 e5 f5 g5:3
			c5 c5 c5 g5 g5 g5 e5 e5 e5 c5 c5 c5
			g5 f5 e5 d5 c5:3
		`),
	},
	{
		id: 'london-bridge',
		title: 'London Bridge Is Falling Down',
		source: 'Traditional',
		bpm: 96,
		notes: seq(`
			g5 a5 g5 f5 e5 f5 g5:2
			d5 e5 f5:2 e5 f5 g5:2
			g5 a5 g5 f5 e5 f5 g5:2
			d5:2 g5:2 e5 c5:3
		`),
	},
	{
		id: 'frere-jacques',
		title: 'Frère Jacques',
		source: 'Traditional',
		bpm: 96,
		notes: seq(`
			c5 d5 e5 c5 c5 d5 e5 c5
			e5 f5 g5:2 e5 f5 g5:2
			g5 a5 g5 f5 e5 c5
			g5 a5 g5 f5 e5 c5
			c5 g4 c5:2 c5 g4 c5:2
		`),
	},
	{
		id: 'ode-to-joy',
		title: 'Ode to Joy',
		source: 'Beethoven, 1824',
		bpm: 100,
		notes: seq(`
			e5 e5 f5 g5 g5 f5 e5 d5
			c5 c5 d5 e5 e5:2 d5:2
			e5 e5 f5 g5 g5 f5 e5 d5
			c5 c5 d5 e5 d5:2 c5:2
		`),
	},
	{
		id: 'old-macdonald',
		title: 'Old MacDonald Had a Farm',
		source: 'Traditional',
		bpm: 100,
		notes: seq(`
			c5 c5 c5 g4 a4 a4 g4:2
			e5 e5 d5 d5 c5:3
			g4 c5 c5 c5 g4 a4 a4 g4:2
			e5 e5 d5 d5 c5:3
		`),
	},
	{
		id: 'this-old-man',
		title: 'This Old Man',
		source: 'Traditional',
		bpm: 104,
		notes: seq(`
			g5 e5 g5:2 g5 e5 g5:2
			a5 g5 f5 e5 d5 e5 f5:2
			g5 g5 g5 g5 a5 g5 f5 e5
			d5 e5 f5 g5 d5 e5 f5:2
			e5 c5 c5 c5:2
		`),
	},
	{
		id: 'when-the-saints',
		title: 'When the Saints Go Marching In',
		source: 'Traditional',
		bpm: 104,
		notes: seq(`
			c5 e5 f5 g5:3
			c5 e5 f5 g5:3
			c5 e5 f5 g5 e5 c5 e5 d5:2
			e5 e5 d5 c5 c5 e5 g5 g5 f5:2
			e5 f5 g5 e5 c5 d5 c5:3
		`),
	},
	{
		id: 'itsy-bitsy-spider',
		title: 'The Itsy Bitsy Spider',
		source: 'Traditional',
		bpm: 104,
		notes: seq(`
			g4 c5 c5 c5 d5 e5 e5:2
			e5 d5 c5 d5 e5 c5:2
			e5 e5 f5 g5:2 g5 f5 e5 f5 g5 e5:2
			c5 c5 d5 e5 e5:2 d5 c5 d5 e5 c5:2
		`),
	},
	{
		id: 'jingle-bells',
		title: 'Jingle Bells',
		source: 'J. Pierpont, 1857',
		bpm: 112,
		notes: seq(`
			e5 e5 e5:2 e5 e5 e5:2
			e5 g5 c5 d5 e5:3
			f5 f5 f5 f5 f5 e5 e5 e5
			e5 d5 d5 e5 d5:2 g5:2
		`),
	},
	{
		id: 'yankee-doodle',
		title: 'Yankee Doodle',
		source: 'Traditional',
		bpm: 112,
		notes: seq(`
			c5 c5 d5 e5 c5 e5 d5 g4
			c5 c5 d5 e5 c5:2 b4:2
			c5 c5 d5 e5 f5 e5 d5 c5
			b4 g4 a4 b4 c5:2 c5:2
		`),
	},
	{
		id: 'korobeiniki',
		title: 'Korobeiniki',
		source: 'Russian folk, 1861',
		bpm: 116,
		notes: seq(`
			e5:2 b4 c5 d5:2 c5 b4
			a4:2 a4 c5 e5:2 d5 c5
			b4:3 c5 d5:2 e5:2
			c5:2 a4:2 a4:2
		`),
	},
	{
		id: 'silent-night',
		title: 'Silent Night',
		source: 'F. Gruber, 1818',
		bpm: 76,
		notes: seq(`
			g4 a4 g4 e4:3
			g4 a4 g4 e4:3
			d5:2 d5 b4:3
			c5:2 c5 g4:3
		`),
	},
	{
		id: 'amazing-grace',
		title: 'Amazing Grace',
		source: 'Traditional, 1779',
		bpm: 76,
		notes: seq(`
			g4 c5:2 e5 c5 e5 d5:3
			c5:2 a4 g4:3
			g4 c5:2 e5 c5 e5 d5:3
			e5:2 g5 g5:3
		`),
	},
	{
		id: 'happy-birthday',
		title: 'Happy Birthday to You',
		source: 'Traditional, public domain since 2016',
		bpm: 96,
		// Written a fourth below the usual key so the third phrase's octave leap
		// still lands inside the app's two-octave keyboard — and so the tune needs
		// no black keys, which keeps it early in the order.
		notes: seq(`
			g4 g4 a4 g4 c5 b4:2
			g4 g4 a4 g4 d5 c5:2
			g4 g4 g5 e5 c5 b4 a4:2
			f5 f5 e5 c5 d5 c5:2
		`),
	},
	{
		id: 'fur-elise',
		title: 'Für Elise (opening)',
		source: 'Beethoven, 1810',
		bpm: 104,
		notes: seq(`
			e5 ds5 e5 ds5 e5 b4 d5 c5
			a4:2 c4 e4 a4
			b4:2 e4 gs4 b4
			c5:2 e4 e5 ds5
		`),
	},
]

// Character of each melody, tagged by hand. It cannot be derived reliably:
// Greensleeves is in a minor key but is not sad, and Korobeiniki is fast and
// minor at once. Forty one-word judgements beat a formula that is wrong a third
// of the time. The mood is also the id of the paper the melody is played on, so
// a lullaby and a march can no longer look identical.
export const MELODY_MOODS: Record<string, MelodyMood> = {
	'hot-cross-buns': 'playful',
	'mary-had-a-little-lamb': 'playful',
	'twinkle-twinkle': 'tender',
	'row-your-boat': 'playful',
	'london-bridge': 'playful',
	'frere-jacques': 'calm',
	'ode-to-joy': 'solemn',
	'old-macdonald': 'playful',
	'this-old-man': 'playful',
	'when-the-saints': 'bright',
	'itsy-bitsy-spider': 'playful',
	'jingle-bells': 'bright',
	'yankee-doodle': 'bright',
	'silent-night': 'tender',
	'amazing-grace': 'solemn',
	'happy-birthday': 'bright',
	'fur-elise': 'wistful',
	'greensleeves': 'wistful',
	'auld-lang-syne': 'solemn',
	'deck-the-halls': 'bright',
	'we-wish-you-merry-christmas': 'bright',
	'oh-susanna': 'playful',
	'camptown-races': 'playful',
	'pop-goes-the-weasel': 'playful',
	'bingo': 'playful',
	'baa-baa-black-sheep': 'tender',
	'kumbaya': 'calm',
	'michael-row-the-boat': 'calm',
	'red-river-valley': 'wistful',
	'danny-boy': 'wistful',
	'scarborough-fair': 'wistful',
	'la-cucaracha': 'bright',
	'kalinka': 'bright',
	'santa-lucia': 'calm',
	'o-sole-mio': 'tender',
	'brahms-lullaby': 'tender',
	'canon-in-d': 'solemn',
	'william-tell': 'bright',
	'greenwood-tree': 'calm',
	// Tagged ahead of the import so these arrive already coloured instead of
	// falling back to the neutral page. Japanese traditional pieces and cinematic
	// classical themes — the public-domain answer to "something modern".
	'sakura-sakura': 'tender',
	'kojo-no-tsuki': 'wistful',
	'furusato': 'tender',
	'hall-of-mountain-king': 'wistful',
	'morning-mood': 'calm',
	'sugar-plum-fairy': 'playful',
	'habanera': 'wistful',
	'ave-maria': 'solemn',
	'gymnopedie': 'calm',
	'air-on-the-g-string': 'solemn',
	'eine-kleine-nachtmusik': 'bright',
	'can-can': 'playful',
	'hungarian-dance': 'bright',
	'toreador-song': 'bright',
	'pomp-and-circumstance': 'solemn',
	'ride-of-the-valkyries': 'solemn',
	// Volume batch — traditional songs and carols.
	'lightly-row': 'playful',
	'long-long-ago': 'tender',
	'molly-malone': 'wistful',
	'ash-grove': 'calm',
	'loch-lomond': 'wistful',
	'shenandoah': 'calm',
	'buffalo-gals': 'playful',
	'turkey-in-the-straw': 'playful',
	'soldiers-joy': 'bright',
	'girl-i-left-behind': 'bright',
	'star-of-county-down': 'wistful',
	'wild-rover': 'bright',
	'early-one-morning': 'calm',
	'barbara-allen': 'wistful',
	'water-is-wide': 'wistful',
	'cielito-lindo': 'bright',
	'alouette': 'playful',
	'sur-le-pont': 'playful',
	'au-clair-de-la-lune': 'tender',
	'o-tannenbaum': 'tender',
	'first-noel': 'solemn',
	'away-in-a-manger': 'tender',
	'joy-to-the-world': 'bright',
	'hark-the-herald': 'bright',
	'god-rest-ye': 'solemn',
	'angels-we-have-heard': 'solemn',
	'o-come-all-ye-faithful': 'solemn',
	'good-king-wenceslas': 'bright',
	'carol-of-the-bells': 'wistful',
	'blow-the-man-down': 'playful',
	'rakes-of-mallow': 'playful',
	'bobby-shafto': 'playful',
	'oranges-and-lemons': 'playful',
	'three-blind-mice': 'playful',
	'muffin-man': 'playful',
	'mulberry-bush': 'playful',
	'old-folks-at-home': 'wistful',
	'beautiful-dreamer': 'tender',
	'jeanie-light-brown-hair': 'tender',
	// Second volume batch.
	'skye-boat-song': 'calm',
	'ye-banks-and-braes': 'wistful',
	'annie-laurie': 'tender',
	'bluebells-of-scotland': 'bright',
	'comin-thro-the-rye': 'playful',
	'my-bonnie': 'wistful',
	'clementine': 'playful',
	'home-on-the-range': 'calm',
	'coming-round-the-mountain': 'playful',
	'yellow-rose-of-texas': 'bright',
	'streets-of-laredo': 'wistful',
	'sweet-betsy-from-pike': 'playful',
	'skip-to-my-lou': 'playful',
	'polly-wolly-doodle': 'playful',
	'blue-tail-fly': 'playful',
	'arkansas-traveler': 'bright',
	'old-dan-tucker': 'playful',
	'golden-slippers': 'bright',
	'aura-lee': 'tender',
	'shortnin-bread': 'playful',
	'simple-gifts': 'calm',
	'wayfaring-stranger': 'wistful',
	'go-tell-aunt-rhody': 'calm',
	'little-brown-jug': 'playful',
	'erie-canal': 'bright',
	'sailors-hornpipe': 'playful',
	'irish-washerwoman': 'playful',
	'minstrel-boy': 'solemn',
	'last-rose-of-summer': 'wistful',
	'men-of-harlech': 'solemn',
	'all-through-the-night': 'tender',
	'lavenders-blue': 'tender',
	'girls-and-boys': 'playful',
	'i-saw-three-ships': 'bright',
	'sussex-carol': 'bright',
	'coventry-carol': 'wistful',
	'wexford-carol': 'solemn',
	'haenschen-klein': 'playful',
	'ach-du-lieber-augustin': 'playful',
	'alle-voegel': 'bright',
	'a-la-claire-fontaine': 'wistful',
	'funiculi-funicula': 'bright',
	'torna-a-surriento': 'tender',
	'tarantella': 'playful',
	'korobeiniki': 'bright',
	'dark-eyes': 'wistful',
	'la-bamba': 'playful',
	'las-mananitas': 'tender',
	'el-condor-pasa': 'wistful',
}

// Anything untagged (a freshly imported tune) falls back to the calmest paper
// rather than to a random one — a neutral page is never wrong for a melody
// nobody has listened to yet.
export function getMelodyMood(id: string): MelodyMood {
	return MELODY_MOODS[id] ?? MOOD_BY_MELODY.get(id) ?? 'calm'
}
// Difficulty is derived, not hand-assigned: how many different pitches the tune
// asks for, how far apart they sit, whether it needs black keys, and how long it
// is. Sorting by this is what puts the campaign in order — a hand-kept order
// drifts the moment a melody is added.
// Staff position of a lane. Octaves start at C, so the letters have to be ranked
// c,d,e,f,g,a,b — ranking them alphabetically puts A and B below C and makes the
// range of every melody that crosses an octave nonsense.
const LETTER_STEPS: Record<string, number> = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 }

function laneStaffIndex(lane: string) {
	const letter = lane[0]
	const octave = Number(lane.slice(-1))
	return octave * 7 + (LETTER_STEPS[letter] ?? 0)
}

// Ranked on pitch content only, measured over the opening phrase. Raw length is
// deliberately left out: the length ladder below sets each level's length from
// its rank, so ranking by length would be circular. What makes a tune hard to
// read is which notes it asks for and how far apart they sit, not how long it
// goes on.
const RANK_WINDOW = 32

export function getMelodyDifficulty(melody: Melody) {
	const window = melody.notes.slice(0, RANK_WINDOW)
	const distinct = new Set(window.map((note) => note.lane))
	const accidentals = Array.from(distinct).filter((lane) => lane.includes('s')).length

	const positions = Array.from(distinct).map(laneStaffIndex)
	const spread = Math.max(...positions) - Math.min(...positions)

	// How many different pitches to find, how far apart they sit, whether black
	// keys are involved, how fast it is meant to go — and how long the source
	// tune is. Length counts here because it is a property of the source data,
	// fixed before the ladder trims anything; ranking by the *trimmed* length
	// would be circular, since the ladder derives the trim from this ranking.
	const length = Math.min(melody.notes.length, 96) * 0.08

	return distinct.size * 2 + spread * 1.5 + accidentals * 10 + melody.bpm / 25 + length
}


// A few transcriptions arrive with a unit note length that makes every note a
// bar long — "Beautiful Dreamer" came in at 2.9 beats per note, which reads as
// nearly three seconds of waiting between taps. Halving until the typical note
// is under two beats keeps the rhythm exactly as written and only fixes the
// scale it was written at.
function normaliseNoteLengths(notes: MelodyNote[]): MelodyNote[] {
	if (!notes.length) return notes

	// Generated data is not trusted here. A melody whose durations failed to
	// parse once reached the game as notes with no length at all, which put
	// seventeen of them on the same beat — a chord no hand can play and no eye
	// can read. A note with an unusable duration becomes a plain beat instead.
	const usable = (note: MelodyNote) => Number.isFinite(note.beats) && note.beats > 0
	const playable = notes.every(usable) ? notes : notes.map((note) => (usable(note) ? note : { ...note, beats: 1 }))

	const sorted = [...playable.map((note) => note.beats)].sort((a, b) => a - b)
	const median = sorted[Math.floor(sorted.length / 2)]

	// Both directions. Some transcriptions write a bar per note, others write in
	// sixteenths — "Kalinka" arrived at a quarter of a beat per note, which the
	// pacer raced through in under a second and no player could follow.
	let factor = 1
	while (median / factor >= 2 && factor < 8) factor *= 2
	while (median * factor < 0.5 && factor < 8) factor *= 2
	if (factor === 1) return playable
	const scale = median / factor >= 0.5 ? 1 / factor : factor
	return playable.map((note) => ({ ...note, beats: note.beats * scale }))
}

// A level plays its melody whole. The only cap left is a safety valve for the
// handful of transcriptions that run longer than anyone plays in one sitting on
// a phone — everything else in the library finishes well inside it.
const MAX_LEVEL_SECONDS = 130
const MAX_LEVEL_NOTES = 160

function playableLength(notes: MelodyNote[], bpm: number) {
	const perBeat = 60 / bpm
	let seconds = 0
	const max = Math.min(MAX_LEVEL_NOTES, notes.length)
	for (let index = 0; index < max; index += 1) {
		seconds += notes[index].beats * perBeat
		if (seconds > MAX_LEVEL_SECONDS) return index
	}
	return max
}

// Same rule as the importer: stop where a bar ends, so a shortened melody ends
// like a phrase instead of being cut off mid-word.
function trimToPhrase(notes: MelodyNote[], max: number) {
	if (notes.length <= max) return notes
	let beats = 0
	let lastBar = 0
	for (let index = 0; index < max; index += 1) {
		beats += notes[index].beats
		if (Math.abs(beats % 4) < 0.01) lastBar = index + 1
	}
	return notes.slice(0, lastBar >= max * 0.75 ? lastBar : max)
}

// Imported transcriptions win over the hand-written ones: they come from
// published sources rather than from memory. The hand-written entries stay as
// the fallback for tunes the importer could not match, so the library never
// shrinks because a search failed.
const byId = new Map<string, Melody>()
MELODIES.forEach((melody) => byId.set(melody.id, melody))
IMPORTED_MELODIES.forEach((melody) => byId.set(melody.id, melody))

// The bulk corpus goes in last and loses every collision. Ids cannot collide
// (corpus ids are prefixed "oh-"), so the guard that matters is by title: the
// hymnal and the curated set share tunes like Amazing Grace and Joy to the
// World, and the curated transcription is the one that was checked.
const titleKey = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const curatedTitles = new Set(Array.from(byId.values(), (melody) => titleKey(melody.title)))
HYMNAL_MELODIES.forEach((melody) => {
	if (curatedTitles.has(titleKey(melody.title))) return
	byId.set(melody.id, melody)
})

export const ALL_MELODIES = Array.from(byId.values())

// Index of the moods melodies carry themselves, so getMelodyMood stays a plain
// lookup by id for every caller.
const MOOD_BY_MELODY = new Map<string, MelodyMood>(
	ALL_MELODIES.filter((melody) => melody.mood).map((melody) => [melody.id, melody.mood as MelodyMood])
)

// Campaign order, by two rules in this order.
//
// 1. Familiarity. A beginner keeps playing because they recognise what comes out
//    of the speaker — the tune tells them whether they got it right before the
//    score does. A melody nobody has heard gives them nothing to check against.
//    So the songs everyone can hum come first, then the folk and classical
//    standards, and only after them the hymnal corpus: 150 honest tunes that
//    almost nobody outside a congregation recognises. They used to lead the
//    campaign because they are short and simple, which is the wrong reason.
// 2. Difficulty inside each tier: the pitch content getMelodyDifficulty measures,
//    plus how long the tune runs. Length counts directly now that a level is
//    never trimmed — how long attention has to hold is part of how hard it is.

// The opening stretch, hand-ordered easiest first. These are the first twenty
// minutes of the game and worth ordering by ear rather than by formula.
const FIRST_TUNES = [
	'hot-cross-buns',
	'mary-had-a-little-lamb',
	'twinkle-twinkle',
	'row-your-boat',
	'baa-baa-black-sheep',
	'itsy-bitsy-spider',
	'london-bridge',
	'frere-jacques',
	'three-blind-mice',
	'muffin-man',
	'mulberry-bush',
	'this-old-man',
	'bingo',
	'old-macdonald',
	'happy-birthday',
	'yankee-doodle',
	'jingle-bells',
	'when-the-saints',
	'ode-to-joy',
	'pop-goes-the-weasel',
	'oh-susanna',
	'brahms-lullaby',
	'silent-night',
	'amazing-grace',
	'korobeiniki',
]

const FAMILIAR_ORDER = new Map(FIRST_TUNES.map((id, index) => [id, index]))

// The bulk corpus, matched by identity rather than by its "oh-" id prefix:
// "Oh! Susanna" is not a hymn.
const HYMNAL_IDS = new Set(HYMNAL_MELODIES.map((melody) => melody.id))

// Seconds of playing time, converted into difficulty points.
const LENGTH_WEIGHT = 0.35

function campaignRank(melody: Melody) {
	const familiar = FAMILIAR_ORDER.get(melody.id)
	if (familiar !== undefined) return familiar

	const seconds = melody.notes.reduce((sum, note) => sum + note.beats, 0) * (60 / melody.bpm)
	const tier = HYMNAL_IDS.has(melody.id) ? 2 : 1
	return tier * 10000 + getMelodyDifficulty(melody) + seconds * LENGTH_WEIGHT
}

// Every mode reads this one list, so Sprint and Campaign can never disagree
// about what "next" means. Each entry is the complete melody: the campaign used
// to cut tunes down to a per-level note budget and pad short ones by repeating
// them, which meant the first levels played a fragment of a song and some later
// ones played the same verse three times. A player who knows the tune hears both.
export const MELODIES_BY_DIFFICULTY: Melody[] = ALL_MELODIES.map((melody) => {
	const scaled = normaliseNoteLengths(melody.notes)
	const notes = trimToPhrase(scaled, playableLength(scaled, melody.bpm))
	return notes === melody.notes ? melody : { ...melody, notes }
}).sort((a, b) => campaignRank(a) - campaignRank(b))
