/**
 * Animation Utilities
 * 
 * Утилиты для работы с анимациями
 */

/**
 * Линейная интерполяция
 */
export function lerp(start: number, end: number, t: number): number {
	return start + (end - start) * t
}

/**
 * Ease-out функция для плавных анимаций
 */
export function easeOut(t: number): number {
	return 1 - Math.pow(1 - t, 3)
}

/**
 * Ease-in-out функция
 */
export function easeInOut(t: number): number {
	return t < 0.5
		? 2 * t * t
		: 1 - Math.pow(-2 * t + 2, 2) / 2
}

/**
 * Вычисляет прогресс анимации (0-1) на основе времени
 */
export function getAnimationProgress(
	startTime: number,
	duration: number,
	currentTime: number
): number {
	if (duration <= 0) return 1
	
	const elapsed = currentTime - startTime
	const progress = Math.min(1, Math.max(0, elapsed / duration))
	return progress
}

/**
 * Вычисляет shake offset для fail анимации
 */
export function getShakeOffset(progress: number, amount: number): number {
	// Используем синус для тряски
	const frequency = 20  // Частота тряски
	const shake = Math.sin(progress * Math.PI * frequency) * amount
	// Затухание к концу
	const fade = 1 - progress
	return shake * fade
}


