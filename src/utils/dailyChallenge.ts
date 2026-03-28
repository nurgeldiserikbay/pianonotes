/**
 * Daily Challenge System
 * 
 * Простая система ежедневных заданий без сервера
 * Использует localStorage для хранения прогресса
 */

export interface DailyChallenge {
	id: string
	type: 'perfect' | 'score' | 'combo'
	target: number  // Целевое значение
	description: string
}

export interface DailyChallengeProgress {
	challengeId: string
	date: string  // YYYY-MM-DD
	completed: boolean
	progress: number  // Текущий прогресс (0 до target)
}

const CHALLENGES: DailyChallenge[] = [
	{
		id: 'perfect_20',
		type: 'perfect',
		target: 20,
		description: 'Сделай 20 perfect подряд',
	},
	{
		id: 'score_500',
		type: 'score',
		target: 500,
		description: 'Набери 500 очков',
	},
	{
		id: 'combo_10',
		type: 'combo',
		target: 10,
		description: 'Достигни комбо x10',
	},
]

const STORAGE_KEY = 'pianoNotes_dailyChallenge'

/**
 * Получает текущее задание на день
 */
export function getTodayChallenge(): DailyChallenge {
	const today = new Date().toISOString().split('T')[0]  // YYYY-MM-DD
	const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
	
	// Выбираем задание на основе дня года (циклически)
	const challengeIndex = dayOfYear % CHALLENGES.length
	return CHALLENGES[challengeIndex]
}

/**
 * Получает прогресс текущего задания
 */
export function getChallengeProgress(): DailyChallengeProgress | null {
	const today = new Date().toISOString().split('T')[0]
	const challenge = getTodayChallenge()
	
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (!stored) {
			return {
				challengeId: challenge.id,
				date: today,
				completed: false,
				progress: 0,
			}
		}
		
		const progress: DailyChallengeProgress = JSON.parse(stored)
		
		// Если задание на другой день, сбрасываем
		if (progress.date !== today || progress.challengeId !== challenge.id) {
			return {
				challengeId: challenge.id,
				date: today,
				completed: false,
				progress: 0,
			}
		}
		
		return progress
	} catch (e) {
		return {
			challengeId: challenge.id,
			date: today,
			completed: false,
			progress: 0,
		}
	}
}

/**
 * Обновляет прогресс задания
 */
export function updateChallengeProgress(
	perfectCount: number,
	score: number,
	maxCombo: number
): { completed: boolean; wasCompleted: boolean } {
	const progress = getChallengeProgress()
	if (!progress || progress.completed) {
		return { completed: true, wasCompleted: true }
	}
	
	const challenge = getTodayChallenge()
	let newProgress = progress.progress
	let completed = false
	
	switch (challenge.type) {
		case 'perfect':
			newProgress = Math.max(progress.progress, perfectCount)
			completed = newProgress >= challenge.target
			break
		case 'score':
			newProgress = Math.max(progress.progress, score)
			completed = newProgress >= challenge.target
			break
		case 'combo':
			newProgress = Math.max(progress.progress, maxCombo)
			completed = newProgress >= challenge.target
			break
	}
	
	const wasCompleted = progress.completed
	const updatedProgress: DailyChallengeProgress = {
		...progress,
		progress: newProgress,
		completed,
	}
	
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedProgress))
	} catch (e) {
		console.error('Failed to save challenge progress:', e)
	}
	
	return { completed, wasCompleted }
}

/**
 * Проверяет, завершено ли задание на сегодня
 */
export function isChallengeCompleted(): boolean {
	const progress = getChallengeProgress()
	return progress?.completed ?? false
}

/**
 * Получает описание текущего задания
 */
export function getChallengeDescription(): string {
	const challenge = getTodayChallenge()
	const progress = getChallengeProgress()
	
	if (!progress) {
		return challenge.description
	}
	
	const percentage = Math.floor((progress.progress / challenge.target) * 100)
	return `${challenge.description} (${progress.progress}/${challenge.target})`
}


