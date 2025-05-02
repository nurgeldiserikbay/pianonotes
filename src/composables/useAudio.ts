import { ref } from 'vue'

export const audioList: { [key: string]: string } = {
	do: `./audio/do.mp3`,
	do_: `./audio/do_.mp3`,
	re: `./audio/re.mp3`,
	re_: `./audio/re_.mp3`,
	mi: `./audio/mi.mp3`,
	fa: `./audio/fa.mp3`,
	fa_: `./audio/fa_.mp3`,
	sol: `./audio/sol.mp3`,
	sol_: `./audio/sol_.mp3`,
	la: `./audio/la.mp3`,
	la_: `./audio/la_.mp3`,
	si: `./audio/si.mp3`,
	do2: `./audio/do2.mp3`,
	do2_: `./audio/do2_.mp3`,
	re2: `./audio/re2.mp3`,
	re2_: `./audio/re2_.mp3`,
	mi2: `./audio/mi2.mp3`,
	fa2: `./audio/fa2.mp3`,
	fa2_: `./audio/fa2_.mp3`,
	sol2: `./audio/sol2.mp3`,
	sol2_: `./audio/sol2_.mp3`,
	la2: `./audio/la2.mp3`,
	la2_: `./audio/la2_.mp3`,
	si2: `./audio/si2.mp3`,
}

const audioActive = ref(false)
const musicActive = ref(false)

let music: { [key: string]: HTMLAudioElement } = {}

export const useAudio = () => {
	function playAudio(audioType: string, anyway: boolean = false) {
		if (!anyway && (!audioActive.value || !audioList[audioType])) return

		if (audioList[audioType]) {
			const audio = new Audio(audioList[audioType])
			// audio.volume = 0.1
			audio.play()
		}
	}

	function toggleAudio() {
		audioActive.value = !audioActive.value
	}

	function toggleMusic() {
		musicActive.value = !musicActive.value

		if (musicActive.value) {
			Object.entries(music).forEach(([_, audio]) => {
				audio.volume = 0.5
			})
		} else {
			Object.entries(music).forEach(([_, audio]) => {
				audio.volume = 0
			})
		}

		playAudio('break')
	}

	function play(name: string) {
		if (!audioList[name]) return

		if (musicActive.value) {
			if (music[name]) {
				music[name].play()
				music[name].currentTime = 0
			} else {
				music[name] = new Audio(audioList[name])

				music[name].addEventListener(
					'canplaythrough',
					function () {
						this.play().catch((_: any) => {
							document.addEventListener(
								'click',
								() => {
									this.play()
								},
								{
									once: true,
								}
							)
						})
					},
					false
				)

				music[name].addEventListener(
					'ended',
					function () {
						this.currentTime = 0
						this.play()
					},
					false
				)
				music[name].volume = 0.5
			}
		}
	}

	function stop(name: string) {
		if (music[name]) music[name].pause()
	}

	return {
		audioActive,
		musicActive,
		toggleAudio,
		playAudio,
		toggleMusic,
		play,
		stop,
	}
}
