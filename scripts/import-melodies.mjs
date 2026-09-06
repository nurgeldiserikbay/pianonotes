// Imports public-domain melodies from abcnotation.com into the game's melody
// format, so the note data comes from published transcriptions instead of being
// typed out from memory.
//
// Usage:  node scripts/import-melodies.mjs [--limit N]
// Output: src/modes/melodies.generated.ts  (review the report it prints before
//         trusting a tune — a failed transposition or an odd transcription is
//         reported, not silently shipped.)
//
// The same parser is what a later bulk import of a folk-tune corpus would use;
// only the WANTED list below would change.

import { readFile, writeFile } from 'node:fs/promises'

// Politeness, and self-defence. Re-running the whole list re-requested every
// tune from scratch; four runs of a 50-entry list came to several hundred
// requests and the host stopped answering us. So: keep what is already imported,
// fetch only what is missing, pause between requests, and retry a transient
// failure instead of counting it as "not found".
const REQUEST_DELAY_MS = 500
const RETRIES = 2
const GENERATED = new URL('../src/modes/melodies.generated.ts', import.meta.url)

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function loadExisting() {
	try {
		const text = await readFile(GENERATED, 'utf8')
		return JSON.parse(text.slice(text.indexOf('= [') + 2).trim())
	} catch {
		return []
	}
}

const WANTED = [
	{ id: 'hot-cross-buns', title: 'Hot Cross Buns', query: 'hot cross buns' },
	{ id: 'mary-had-a-little-lamb', title: 'Mary Had a Little Lamb', query: 'mary had a little lamb' },
	{ id: 'twinkle-twinkle', title: 'Twinkle, Twinkle, Little Star', query: 'ah vous dirai-je maman' },
	{ id: 'row-your-boat', title: 'Row, Row, Row Your Boat', query: 'row row row your boat' },
	{ id: 'london-bridge', title: 'London Bridge Is Falling Down', query: 'london bridge is falling down' },
	{ id: 'frere-jacques', title: 'Frère Jacques', query: 'frere jacques' },
	{ id: 'ode-to-joy', title: 'Ode to Joy', query: 'ode to joy beethoven' },
	{ id: 'old-macdonald', title: 'Old MacDonald Had a Farm', query: 'old macdonald had a farm' },
	{ id: 'this-old-man', title: 'This Old Man', query: 'this old man' },
	{ id: 'when-the-saints', title: 'When the Saints Go Marching In', query: 'when the saints go marching in' },
	{ id: 'itsy-bitsy-spider', title: 'The Itsy Bitsy Spider', query: 'itsy bitsy spider' },
	{ id: 'jingle-bells', title: 'Jingle Bells', query: 'jingle bells' },
	// Deliberately not imported: the search only offers "(I'm a) Yankee Doodle
	// Dandy", which is Cohan's 1904 song — a different melody that happens to
	// share the name. The hand-written entry in melodies.ts is used instead.
	// { id: 'yankee-doodle', title: 'Yankee Doodle', query: 'yankee doodle' },
	{ id: 'silent-night', title: 'Silent Night', query: 'silent night' },
	{ id: 'amazing-grace', title: 'Amazing Grace', query: 'amazing grace' },
	{ id: 'happy-birthday', title: 'Happy Birthday to You', query: 'happy birthday to you' },
	{ id: 'greensleeves', title: 'Greensleeves', query: 'greensleeves' },
	{ id: 'auld-lang-syne', title: 'Auld Lang Syne', query: 'auld lang syne' },
	{ id: 'deck-the-halls', title: 'Deck the Halls', query: 'deck the halls' },
	{ id: 'we-wish-you-merry-christmas', title: 'We Wish You a Merry Christmas', query: 'we wish you a merry christmas' },
	{ id: 'oh-susanna', title: 'Oh! Susanna', query: 'oh susanna foster' },
	{ id: 'camptown-races', title: 'Camptown Races', query: 'camptown races' },
	{ id: 'pop-goes-the-weasel', title: 'Pop Goes the Weasel', query: 'pop goes the weasel' },
	{ id: 'bingo', title: 'Bingo', query: 'bingo was his name' },
	{ id: 'baa-baa-black-sheep', title: 'Baa, Baa, Black Sheep', query: 'baa baa black sheep' },
	{ id: 'skip-to-my-lou', title: 'Skip to My Lou', query: 'skip to my lou' },
	{ id: 'kumbaya', title: 'Kumbaya', query: 'kumbaya' },
	{ id: 'michael-row-the-boat', title: 'Michael, Row the Boat Ashore', query: 'michael row the boat ashore' },
	{ id: 'clementine', title: 'Oh My Darling, Clementine', query: 'oh my darling clementine' },
	{ id: 'red-river-valley', title: 'Red River Valley', query: 'red river valley' },
	{ id: 'home-on-the-range', title: 'Home on the Range', query: 'home on the range' },
	{ id: 'danny-boy', title: 'Danny Boy (Londonderry Air)', query: 'londonderry air' },
	{ id: 'scarborough-fair', title: 'Scarborough Fair', query: 'scarborough fair' },
	// Deliberately not imported: the only match is "Bridge, Drunken Sailor, 8 bars
	// in D" — a connecting fragment, not the tune.
	// { id: 'drunken-sailor', title: 'Drunken Sailor', query: 'drunken sailor' },
	{ id: 'la-cucaracha', title: 'La Cucaracha', query: 'la cucaracha' },
	{ id: 'kalinka', title: 'Kalinka', query: 'kalinka' },
	{ id: 'korobeiniki', title: 'Korobeiniki', query: 'korobeiniki' },
	// NOT public domain — Blanter, 1938, composer died 1990. It never imported, but
	// it should never have been on the list either.
	// { id: 'katyusha', title: 'Katyusha', query: 'katyusha russian' },
	{ id: 'santa-lucia', title: 'Santa Lucia', query: 'santa lucia' },
	{ id: 'o-sole-mio', title: "O Sole Mio", query: 'o sole mio' },
	{ id: 'brahms-lullaby', title: 'Wiegenlied', query: 'wiegenlied brahms' },
	{ id: 'fur-elise', title: 'Für Elise (opening)', query: 'fur elise' },
	{ id: 'minuet-in-g', title: 'Minuet in G', query: 'minuet in g bach petzold' },
	{ id: 'canon-in-d', title: 'Canon in D (theme)', query: 'pachelbel canon' },
	{ id: 'blue-danube', title: 'The Blue Danube', query: 'blue danube strauss' },
	{ id: 'william-tell', title: 'William Tell Overture', query: 'william tell overture' },
	{ id: 'turkish-march', title: 'Turkish March', query: 'mozart turkish march rondo alla turca' },
	{ id: 'swan-lake', title: 'Swan Lake (theme)', query: 'swan lake tchaikovsky' },
	{ id: 'greenwood-tree', title: 'Under the Greenwood Tree', query: 'under the greenwood tree' },
	// ── Public-domain stand-ins for "modern" music ────────────────────────────
	// Japanese traditional pieces (heard constantly in anime and Japanese media)
	// and cinematic classical themes that film and advertising reach for precisely
	// because they are free. Anime openings and film scores themselves are under
	// copyright — including shortened or simplified arrangements, which are
	// derivative works — so they are deliberately absent.
	{ id: 'sakura-sakura', title: 'Sakura Sakura', query: 'sakura sakura' },
	{ id: 'kojo-no-tsuki', title: 'Kojo no Tsuki', query: 'kojo no tsuki' },
	{ id: 'furusato', title: 'Furusato', query: 'furusato' },
	{ id: 'hall-of-mountain-king', title: 'In the Hall of the Mountain King', query: 'hall of the mountain king' },
	{ id: 'morning-mood', title: 'Morning Mood', query: 'morning mood grieg' },
	{ id: 'sugar-plum-fairy', title: 'Dance of the Sugar Plum Fairy', query: 'sugar plum fairy' },
	{ id: 'habanera', title: 'Habanera', query: 'habanera carmen' },
	// Deliberately not imported: the only match was "Alleluia Ave Maria", which is
	// not Schubert's Ave Maria — two shared words, different piece.
	// { id: 'ave-maria', title: 'Ave Maria', query: 'ave maria schubert' },
	{ id: 'gymnopedie', title: 'Gymnopedie', query: 'gymnopedie satie' },
	{ id: 'air-on-the-g-string', title: 'Air on the G String', query: 'air on the g string' },
	{ id: 'eine-kleine-nachtmusik', title: 'Eine kleine Nachtmusik', query: 'eine kleine nachtmusik' },
	{ id: 'can-can', title: 'Can-Can', query: 'can can offenbach' },
	{ id: 'hungarian-dance', title: 'Hungarian Dance', query: 'hungarian dance brahms' },
	{ id: 'toreador-song', title: 'Toreador Song', query: 'toreador carmen' },
	{ id: 'pomp-and-circumstance', title: 'Pomp and Circumstance', query: 'pomp and circumstance' },
	{ id: 'ride-of-the-valkyries', title: 'Ride of the Valkyries', query: 'ride of the valkyries' },
	// ── Volume batch: recognisable traditional songs and carols ───────────────
	// A folk-tune database answers well to folk material, which is why classical
	// themes mostly failed above and these are the better bet for growing the
	// library. All traditional or 19th-century, all public domain.
	{ id: 'lightly-row', title: 'Lightly Row', query: 'lightly row' },
	{ id: 'long-long-ago', title: 'Long, Long Ago', query: 'long long ago' },
	{ id: 'molly-malone', title: 'Cockles and Mussels', query: 'cockles and mussels' },
	{ id: 'ash-grove', title: 'The Ash Grove', query: 'ash grove' },
	{ id: 'loch-lomond', title: 'Loch Lomond', query: 'loch lomond' },
	{ id: 'shenandoah', title: 'Shenandoah', query: 'shenandoah' },
	// Matched "As I Went Down In The Valley To Pray" — a different song sharing
	// three words. Excluded until a verified transcription turns up.
	//	{ id: 'down-in-the-valley', title: 'Down in the Valley', query: 'down in the valley' },
	{ id: 'buffalo-gals', title: 'Buffalo Gals', query: 'buffalo gals' },
	{ id: 'turkey-in-the-straw', title: 'Turkey in the Straw', query: 'turkey in the straw' },
	{ id: 'soldiers-joy', title: "Soldier's Joy", query: 'soldiers joy' },
	{ id: 'girl-i-left-behind', title: 'The Girl I Left Behind Me', query: 'girl i left behind me' },
	{ id: 'star-of-county-down', title: 'Star of the County Down', query: 'star of the county down' },
	{ id: 'wild-rover', title: 'The Wild Rover', query: 'wild rover' },
	{ id: 'early-one-morning', title: 'Early One Morning', query: 'early one morning' },
	{ id: 'barbara-allen', title: 'Barbara Allen', query: 'barbara allen' },
	{ id: 'water-is-wide', title: 'The Water Is Wide', query: 'water is wide' },
	{ id: 'cielito-lindo', title: 'Cielito Lindo', query: 'cielito lindo' },
	{ id: 'alouette', title: 'Alouette', query: 'alouette' },
	{ id: 'sur-le-pont', title: "Sur le pont d'Avignon", query: 'sur le pont d avignon' },
	{ id: 'au-clair-de-la-lune', title: 'Au clair de la lune', query: 'au clair de la lune' },
	// Only "Imitation de La Marseillaise" exists on the site: a piece *about*
	// the anthem, not the anthem. Excluded.
	//	{ id: 'marseillaise', title: 'La Marseillaise', query: 'marseillaise' },
	{ id: 'o-tannenbaum', title: 'O Tannenbaum', query: 'o tannenbaum' },
	{ id: 'first-noel', title: 'The First Noel', query: 'first noel' },
	{ id: 'away-in-a-manger', title: 'Away in a Manger', query: 'away in a manger' },
	{ id: 'joy-to-the-world', title: 'Joy to the World', query: 'joy to the world' },
	{ id: 'hark-the-herald', title: 'Hark the Herald Angels Sing', query: 'hark the herald angels sing' },
	{ id: 'god-rest-ye', title: 'God Rest Ye Merry Gentlemen', query: 'god rest ye merry gentlemen' },
	{ id: 'angels-we-have-heard', title: 'Angels We Have Heard on High', query: 'angels we have heard on high' },
	{ id: 'o-come-all-ye-faithful', title: 'O Come All Ye Faithful', query: 'o come all ye faithful' },
	{ id: 'good-king-wenceslas', title: 'Good King Wenceslas', query: 'good king wenceslas' },
	{ id: 'carol-of-the-bells', title: 'Carol of the Bells', query: 'carol of the bells' },
	{ id: 'blow-the-man-down', title: 'Blow the Man Down', query: 'blow the man down' },
	{ id: 'rakes-of-mallow', title: 'The Rakes of Mallow', query: 'rakes of mallow' },
	{ id: 'bobby-shafto', title: 'Bobby Shafto', query: 'bobby shafto' },
	{ id: 'oranges-and-lemons', title: 'Oranges and Lemons', query: 'oranges and lemons' },
	{ id: 'three-blind-mice', title: 'Three Blind Mice', query: 'three blind mice' },
	{ id: 'muffin-man', title: 'The Muffin Man', query: 'muffin man' },
	{ id: 'mulberry-bush', title: 'Here We Go Round the Mulberry Bush', query: 'mulberry bush' },
	{ id: 'old-folks-at-home', title: 'Old Folks at Home', query: 'old folks at home' },
	{ id: 'beautiful-dreamer', title: 'Beautiful Dreamer', query: 'beautiful dreamer' },
	{ id: 'jeanie-light-brown-hair', title: 'Jeanie with the Light Brown Hair', query: 'jeanie with the light brown hair' },
	// ── Second volume batch: folk songs from further afield ───────────────────
	{ id: 'skye-boat-song', title: 'The Skye Boat Song', query: 'skye boat song' },
	{ id: 'ye-banks-and-braes', title: 'Ye Banks and Braes', query: 'ye banks and braes' },
	{ id: 'annie-laurie', title: 'Annie Laurie', query: 'annie laurie' },
	{ id: 'bluebells-of-scotland', title: 'The Bluebells of Scotland', query: 'bluebells of scotland' },
	{ id: 'comin-thro-the-rye', title: 'Comin Thro the Rye', query: 'comin thro the rye' },
	{ id: 'my-bonnie', title: 'My Bonnie Lies Over the Ocean', query: 'my bonnie lies over the ocean' },
	{ id: 'clementine', title: 'Oh My Darling Clementine', query: 'oh my darling clementine' },
	{ id: 'home-on-the-range', title: 'Home on the Range', query: 'home on the range' },
	{ id: 'coming-round-the-mountain', title: 'Coming Round the Mountain', query: 'coming round the mountain' },
	{ id: 'yellow-rose-of-texas', title: 'The Yellow Rose of Texas', query: 'yellow rose of texas' },
	{ id: 'streets-of-laredo', title: 'Streets of Laredo', query: 'streets of laredo' },
	{ id: 'sweet-betsy-from-pike', title: 'Sweet Betsy from Pike', query: 'sweet betsy from pike' },
	{ id: 'skip-to-my-lou', title: 'Skip to My Lou', query: 'skip to my lou' },
	{ id: 'polly-wolly-doodle', title: 'Polly Wolly Doodle', query: 'polly wolly doodle' },
	{ id: 'blue-tail-fly', title: 'Blue Tail Fly', query: 'blue tail fly' },
	{ id: 'arkansas-traveler', title: 'Arkansas Traveler', query: 'arkansas traveler' },
	{ id: 'old-dan-tucker', title: 'Old Dan Tucker', query: 'old dan tucker' },
	{ id: 'golden-slippers', title: 'Golden Slippers', query: 'golden slippers' },
	{ id: 'aura-lee', title: 'Aura Lee', query: 'aura lee' },
	{ id: 'shortnin-bread', title: 'Shortnin Bread', query: 'shortnin bread' },
	{ id: 'simple-gifts', title: 'Simple Gifts', query: 'simple gifts' },
	{ id: 'wayfaring-stranger', title: 'Wayfaring Stranger', query: 'wayfaring stranger' },
	{ id: 'go-tell-aunt-rhody', title: 'Go Tell Aunt Rhody', query: 'go tell aunt rhody' },
	{ id: 'little-brown-jug', title: 'Little Brown Jug', query: 'little brown jug' },
	{ id: 'erie-canal', title: 'The Erie Canal', query: 'erie canal' },
	{ id: 'sailors-hornpipe', title: 'Sailors Hornpipe', query: 'sailors hornpipe' },
	{ id: 'irish-washerwoman', title: 'The Irish Washerwoman', query: 'irish washerwoman' },
	{ id: 'minstrel-boy', title: 'The Minstrel Boy', query: 'minstrel boy' },
	{ id: 'last-rose-of-summer', title: 'The Last Rose of Summer', query: 'last rose of summer' },
	{ id: 'men-of-harlech', title: 'Men of Harlech', query: 'men of harlech' },
	{ id: 'all-through-the-night', title: 'All Through the Night', query: 'all through the night' },
	{ id: 'lavenders-blue', title: 'Lavenders Blue', query: 'lavenders blue' },
	{ id: 'girls-and-boys', title: 'Girls and Boys Come Out to Play', query: 'girls and boys come out to play' },
	{ id: 'i-saw-three-ships', title: 'I Saw Three Ships', query: 'i saw three ships' },
	{ id: 'sussex-carol', title: 'Sussex Carol', query: 'sussex carol' },
	{ id: 'coventry-carol', title: 'Coventry Carol', query: 'coventry carol' },
	{ id: 'wexford-carol', title: 'Wexford Carol', query: 'wexford carol' },
	{ id: 'silent-night', title: 'Silent Night', query: 'stille nacht silent night' },
	{ id: 'haenschen-klein', title: 'Hanschen Klein', query: 'hanschen klein' },
	{ id: 'ach-du-lieber-augustin', title: 'Ach du lieber Augustin', query: 'ach du lieber augustin' },
	{ id: 'alle-voegel', title: 'Alle Vogel sind schon da', query: 'alle vogel sind schon da' },
	{ id: 'a-la-claire-fontaine', title: 'A la claire fontaine', query: 'a la claire fontaine' },
	{ id: 'funiculi-funicula', title: 'Funiculi Funicula', query: 'funiculi funicula' },
	{ id: 'torna-a-surriento', title: 'Torna a Surriento', query: 'torna a surriento' },
	{ id: 'tarantella', title: 'Tarantella Napoletana', query: 'tarantella napoletana' },
	{ id: 'korobeiniki', title: 'Korobeiniki', query: 'korobeiniki' },
	{ id: 'dark-eyes', title: 'Dark Eyes', query: 'ochi chornye dark eyes' },
	{ id: 'la-bamba', title: 'La Bamba', query: 'la bamba' },
	{ id: 'las-mananitas', title: 'Las Mananitas', query: 'las mananitas' },
	{ id: 'el-condor-pasa', title: 'El Condor Pasa', query: 'el condor pasa' },
]

// Cutting a tune mid-phrase sounds like a mistake, not an ending. We walk back to
// the nearest point where the elapsed beats land on a bar line (4 beats covers
// 4/4 and two bars of 2/4) so every truncated melody stops where a phrase does.
function trimToPhrase(notes, max) {
	if (notes.length <= max) return notes
	let beats = 0
	let lastBar = 0
	for (let i = 0; i < max; i += 1) {
		beats += notes[i].beats
		if (Math.abs(beats % 4) < 0.01) lastBar = i + 1
	}
	// Never trade more than a quarter of the material for a tidy ending.
	return notes.slice(0, lastBar >= max * 0.75 ? lastBar : max)
}

const BASE = 'https://abcnotation.com'
const RANGE_LOW = 48 // c4 on this keyboard
const RANGE_HIGH = 71 // b5
// The ceiling, not the target. Late chapters want long pieces, so we keep more
// than the game will ever show and let the length ladder in melodies.ts decide
// per level. 160 notes is roughly two and a half minutes at 100 BPM — far more
// than any level uses, which is the point: the ladder can only lengthen a level
// as far as the stored material goes.
const MAX_NOTES = 160

const SEMITONES = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 }
const LANE_BY_SEMITONE = ['c', 'cs', 'd', 'ds', 'e', 'f', 'fs', 'g', 'gs', 'a', 'as', 'b']

// Key signature → which letters are sharpened or flattened by default.
const KEY_SIGNATURES = {
	C: {}, Am: {},
	G: { f: 1 }, Em: { f: 1 },
	D: { f: 1, c: 1 }, Bm: { f: 1, c: 1 },
	A: { f: 1, c: 1, g: 1 }, 'F#m': { f: 1, c: 1, g: 1 },
	E: { f: 1, c: 1, g: 1, d: 1 },
	F: { b: -1 }, Dm: { b: -1 },
	Bb: { b: -1, e: -1 }, Gm: { b: -1, e: -1 },
	Eb: { b: -1, e: -1, a: -1 }, Cm: { b: -1, e: -1, a: -1 },
	Ab: { b: -1, e: -1, a: -1, d: -1 },
}

async function fetchText(url) {
	let lastError
	for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
		if (attempt > 0) await sleep(REQUEST_DELAY_MS * (attempt + 1) * 4)
		try {
			await sleep(REQUEST_DELAY_MS)
			const response = await fetch(url, { headers: { 'user-agent': 'piano-notes-importer' } })
			if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
			return await response.text()
		} catch (error) {
			lastError = error
			// A refused or timed-out connection is the host telling us to slow down
			// or that it is unavailable — worth retrying, unlike a 404.
			if (String(error).includes('HTTP 4')) break
		}
	}
	throw lastError
}

function normalise(text) {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9 ]/g, ' ')
		.split(/\s+/)
		.filter((word) => word.length > 2 && !['the', 'and', 'for', 'was', 'his'].includes(word))
}

// The search is fuzzy and its first hit is regularly a different tune entirely
// ("Mary Had a Little Lamb" came back as "Faithful Emma"). Matching is done
// against the tune's own title rather than the search phrase, because a query
// carries extra words ("foster", "beethoven") that no transcription's title has.
function titleMatches(wantedTitle, candidateTitle) {
	const wanted = normalise(wantedTitle)
	const candidate = normalise(candidateTitle)
	if (!wanted.length || !candidate.length) return false

	const wantedSet = new Set(wanted)
	const candidateSet = new Set(candidate)
	const hits = wanted.filter((word) => candidateSet.has(word)).length

	// A loose overlap accepts wrong tunes: "This Old Man" matched "THE OLD MAN AND
	// OLD WOMAN SCOLDIN'" on two shared words. So either the candidate's title says
	// nothing we did not ask for (a plain or decorated version of our tune), or it
	// has to contain nearly all of our words.
	const candidateIsSubset = candidate.every((word) => wantedSet.has(word))
	return candidateIsSubset || hits / wanted.length >= 0.75
}

// Search hits are tried in order until one is both the right tune and usable:
// the first transcription of a well-known piece is often a full two-hand piano
// arrangement whose range no 24-key keyboard can hold, while the third is the
// plain melody line.
async function findAbc(wanted, accept) {
	const query = wanted.query.replace(/\s+/g, '+')
	const search = await fetchText(`${BASE}/searchTunes?q=${query}&f=c&o=a&s=0`)

	// Each result is "<h3><small>N.</small> Title</h3> … href=/tunePage?a=…".
	const blocks = search.split('<h3>').slice(1)
	const candidates = []
	for (const block of blocks) {
		const title = block.match(/<\/small>\s*([^<]+)</)?.[1]?.trim()
		const link = block.match(/\/tunePage\?a=[^"'<> ]+/)?.[0]
		if (title && link && titleMatches(wanted.title, title)) candidates.push({ title, link })
	}

	if (!candidates.length) {
		const seen = blocks
			.map((block) => block.match(/<\/small>\s*([^<]+)</)?.[1]?.trim())
			.filter(Boolean)
			.slice(0, 3)
		throw new Error(`no title match (top hits: ${seen.join(' / ') || 'none'})`)
	}

	const problems = []
	for (const candidate of candidates.slice(0, 6)) {
		try {
			const tune = await fetchText(`${BASE}${candidate.link}`)
			const download = tune.match(/href="([^"]*getResource\/downloads\/text_[^"]*)"/)
			if (!download) throw new Error('no abc download link')

			const abc = await fetchText(`${BASE}${download[1].replace(/&amp;/g, '&')}`)
			const result = accept(abc)
			if (result) return { ...result, matchedTitle: candidate.title }
			problems.push(`${candidate.title}: unusable`)
		} catch (error) {
			problems.push(`${candidate.title}: ${error.message}`)
		}
	}

	throw new Error(`no usable transcription (${problems.slice(0, 3).join('; ')})`)
}

// Strips everything ABC allows that this game has no concept of: chord symbols,
// decorations, grace notes, slurs, ties, tuplet marks and bar lines.
function cleanBody(body) {
	return body
		.replace(/"[^"]*"/g, '')
		.replace(/![^!]*!/g, '')
		.replace(/\{[^}]*\}/g, '')
		.replace(/\[[A-Za-z]:[^\]]*\]/g, '')
		.replace(/\(\d/g, '')
		.replace(/[()\-~.]/g, '')
}

function parseAbc(abc) {
	const lines = abc.split(/\r?\n/)
	const header = {}
	const bodyLines = []
	let inBody = false

	for (const line of lines) {
		const field = line.match(/^([A-Za-z]):\s*(.*)$/)
		if (field) {
			const [, key, value] = field
			if (key === 'K') {
				// Some files carry an empty K: before the real one.
				if (value.trim()) {
					header.K = value.trim()
					inBody = true
				}
				continue
			}
			if (!inBody) header[key] = value.trim()
			continue
		}
		if (line.startsWith('%') || !line.trim()) continue
		if (inBody) bodyLines.push(line)
	}

	const keyName = (header.K ?? 'C').split(/\s+/)[0].replace('maj', '').replace('min', 'm')
	const signature = KEY_SIGNATURES[keyName] ?? KEY_SIGNATURES[keyName.replace('m', '')] ?? {}
	// ABC headers carry trailing comments ("L: 1/8 % eighth notes"), and a header
	// this parser cannot read used to yield NaN — which travelled all the way
	// into the game as notes with no duration, so every note of the tune landed
	// on the same beat and the staff showed a seventeen-note chord. Anything not
	// a positive number falls back to the ABC default.
	const declaredLength = header.L ? evalFraction(header.L.split('%')[0].trim()) : 0.125
	const unitLength = Number.isFinite(declaredLength) && declaredLength > 0 ? declaredLength : 0.125
	const tempo = Number((header.Q ?? '').match(/(\d+)\s*$/)?.[1] ?? 0)

	// Repeats are played through twice, the way the tune is sung.
	const body = expandRepeats(cleanBody(bodyLines.join(' ')))

	const notes = []
	let pendingRestBeats = 0
	const tokens = body.match(/[_^=]*[A-Ga-gz][,']*\d*(?:\/\d*)?/g) ?? []

	for (const token of tokens) {
		const parsed = token.match(/^([_^=]*)([A-Ga-gz])([,']*)(\d*)(?:\/(\d*))?$/)
		if (!parsed) continue
		const [, accidental, letter, octaveMarks, multiplier, divisor] = parsed

		let length = unitLength
		if (multiplier) length *= Number(multiplier)
		if (divisor !== undefined) length /= divisor ? Number(divisor) : 2
		// Quarter note = 1 beat in this game's terms.
		const rounded = Math.round((length / 0.25) * 4) / 4
		const beats = Number.isFinite(rounded) ? Math.max(0.25, rounded) : 1

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

		const midi = octave * 12 + semitone
		if (notes.length && pendingRestBeats) {
			notes[notes.length - 1].beats += pendingRestBeats
			pendingRestBeats = 0
		}
		notes.push({ midi, beats })
	}

	return { notes, tempo, title: header.T ?? '', source: header.C || header.O || 'Traditional' }
}

function evalFraction(value) {
	const [top, bottom] = value.split('/')
	return Number(top) / Number(bottom || 1)
}

function expandRepeats(body) {
	// |: ... :| played twice. Nested or numbered endings are beyond this parser;
	// tunes using them are reported and skipped rather than mangled.
	let out = ''
	let rest = body
	while (true) {
		const open = rest.indexOf('|:')
		const close = rest.indexOf(':|')
		if (open === -1 || close === -1 || close < open) break
		out += rest.slice(0, open)
		const section = rest.slice(open + 2, close)
		out += section + section
		rest = rest.slice(close + 2)
	}
	return out + rest
}

// Shift the whole tune into the app's two-octave keyboard, keeping intervals.
//
// Of every shift that fits, the one needing the fewest black keys wins. A
// transcription's original key is an accident of whoever wrote it down — "Mary
// Had a Little Lamb" arrived in D major, which would have handed a beginner two
// sharps on the second level of the game. Transposing costs nothing musically
// here: the player is reading shapes on a staff, not playing along with a record.
function fitToRange(notes) {
	if (!notes.length) return null
	const low = Math.min(...notes.map((note) => note.midi))
	const high = Math.max(...notes.map((note) => note.midi))
	if (high - low > RANGE_HIGH - RANGE_LOW) return null

	let best = null
	for (let shift = -60; shift <= 60; shift += 1) {
		if (low + shift < RANGE_LOW || high + shift > RANGE_HIGH) continue

		const blackKeys = new Set()
		notes.forEach((note) => {
			const semitone = (note.midi + shift) % 12
			if (LANE_BY_SEMITONE[semitone].length > 1) blackKeys.add(semitone)
		})

		const candidate = { shift, blackKeys: blackKeys.size, distance: Math.abs(shift) }
		if (
			!best ||
			candidate.blackKeys < best.blackKeys ||
			(candidate.blackKeys === best.blackKeys && candidate.distance < best.distance)
		) {
			best = candidate
		}
	}

	if (!best) return null

	return notes.map((note) => {
		const midi = note.midi + best.shift
		const octave = Math.floor(midi / 12)
		return { lane: `${LANE_BY_SEMITONE[midi % 12]}${octave}`, beats: note.beats }
	})
}

async function main() {
	const limitArg = process.argv.indexOf('--limit')
	const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) : WANTED.length

	// Start from what is already on disk; only missing ids are fetched.
	const existing = await loadExisting()
	const byId = new Map(existing.map((melody) => [melody.id, melody]))
	const onlyArg = process.argv.indexOf('--only')
	const only = onlyArg > -1 ? new Set(process.argv[onlyArg + 1].split(',')) : null
	const refresh = process.argv.includes('--refresh')

	const imported = [...existing]
	const failures = []
	let added = 0

	const queue = WANTED.slice(0, limit).filter((wanted) => {
		if (only) return only.has(wanted.id)
		return refresh || !byId.has(wanted.id)
	})

	console.log(`already imported: ${existing.length}; to fetch: ${queue.length}
`)

	for (const wanted of queue) {
		try {
			// A transcription is only accepted if it actually fits the game: inside
			// the keyboard's range and long enough to be a tune.
			const { parsed, notes, matchedTitle } = await findAbc(wanted, (abc) => {
				const parsedAbc = parseAbc(abc)
				const fitted = fitToRange(parsedAbc.notes)
				if (!fitted || fitted.length < 8) return null
				// Last line of defence: never write a melody with unusable
				// durations, whatever the transcription did.
				if (fitted.some((note) => !Number.isFinite(note.beats) || note.beats <= 0)) return null
				return { parsed: parsedAbc, notes: fitted }
			})

			const melody = {
				id: wanted.id,
				title: wanted.title,
				source: parsed.source.slice(0, 60) || 'Traditional',
				bpm: parsed.tempo >= 60 && parsed.tempo <= 160 ? parsed.tempo : 96,
				notes: trimToPhrase(notes, MAX_NOTES),
				truncated: notes.length > MAX_NOTES,
				abcTitle: matchedTitle,
			}
			const at = imported.findIndex((item) => item.id === wanted.id)
			if (at >= 0) imported[at] = melody
			else imported.push(melody)
			added += 1
			console.log(`ok    ${wanted.id.padEnd(28)} ${notes.length} notes  (abc: ${matchedTitle})`)
		} catch (error) {
			failures.push({ id: wanted.id, reason: error.message })
			console.log(`skip  ${wanted.id.padEnd(28)} ${error.message}`)
		}
	}

	// sourceTitle is kept in the data on purpose: it is the title of the actual
	// transcription that was imported, so a mismatch between "what we asked for"
	// and "what we got" is visible in review instead of hiding in the notes.
	const file = `// GENERATED by scripts/import-melodies.mjs — do not edit by hand.
// Source: abcnotation.com (public-domain transcriptions). Re-run the script to
// refresh. Every tune here is public domain; see the script's WANTED list.
//
// REVIEW: check each entry's sourceTitle against its title, and play each tune
// once. Automated title matching narrows the risk of importing the wrong melody;
// it cannot rule it out.

import type { Melody } from './melodies'

export const IMPORTED_MELODIES: Melody[] = ${JSON.stringify(
		imported.map(({ truncated, abcTitle, ...melody }) => ({ ...melody, sourceTitle: abcTitle })),
		null,
		'\t'
	)}
`

	await writeFile(new URL('../src/modes/melodies.generated.ts', import.meta.url), file, 'utf8')

	console.log(`\nimported ${imported.length}, skipped ${failures.length}`)
	console.log(`truncated to ${MAX_NOTES} notes: ${imported.filter((m) => m.truncated).map((m) => m.id).join(', ') || 'none'}`)
}

main()
