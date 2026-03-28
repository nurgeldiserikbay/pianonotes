/**
 * Game Balance Configuration
 *
 * Система баланса игры, основанная на travelTime вместо прямых значений скорости.
 * Скорость вычисляется как: speed = distance / travelTimeSec
 * Это гарантирует одинаковую динамику на любом размере экрана.
 */

export interface GameBalanceConfig {
	// Базовые параметры
	life: number

	// Система скорости через travelTime (в секундах)
	travelTime: {
		// Фазы сложности
		phase1: number // Обучение: ~1.6s
		phase2: number // Вызов: ~1.2s
		phase3: number // Экстрим: ~0.85s
		// Микро-рандом к скорости (не ломает честность)
		randomVariation: {
			min: number
			max: number
		}
	}

	// Прогресс сложности (0-1)
	difficulty: {
		// Очки для перехода между фазами
		phase2Score: number
		phase3Score: number
		// Время (в секундах) для перехода между фазами (альтернатива очкам)
		phase2Time: number
		phase3Time: number
	}

	// Perfect/Combo система
	combo: {
		// Минимальное расстояние для perfect (в пикселях от целевой линии)
		perfectThreshold: number
		// Множители комбо
		multipliers: {
			x2: number // Очки для x2
			x3: number // Очки для x3
			x5: number // Очки для x5 (slow motion)
			x10: number // Очки для x10 (усиленная награда)
		}
		// Slow motion при комбо x5 (в секундах)
		slowMotionDuration: number
		slowMotionFactor: number // Множитель замедления (0.5 = в 2 раза медленнее)
	}

	// Награды за perfect/combo
	rewards: {
		perfect: number // Очки за perfect
		normal: number // Очки за обычное попадание
		comboMultiplier: number // Множитель за комбо (x2, x3, etc.)
	}

	// Near-miss система
	nearMiss: {
		// Разница в очках для near-miss сообщения
		threshold: number
	}

	// Генерация нот
	notes: {
		// Дистанция между нотами (часть ширины экрана)
		minDistance: number // Минимальная дистанция (0.88 = 88% ширины)
		spacingFactor: number // Фактор интервала (0.88 / 4 = расстояние между нотами)
	}
}

export const gameBalanceConfig: GameBalanceConfig = {
	life: 10,

	travelTime: {
		phase1: 3.5, // Обучение (еще более замедлено)
		phase2: 3.0, // Вызов (еще более замедлено)
		phase3: 2.2, // Экстрим (еще более замедлено)
		randomVariation: {
			min: 0.95,
			max: 1.05,
		},
	},

	difficulty: {
		phase2Score: 50, // Переход на фазу 2 после 50 очков
		phase3Score: 150, // Переход на фазу 3 после 150 очков
		phase2Time: 30, // Или через 30 секунд
		phase3Time: 60, // Или через 60 секунд
	},

	combo: {
		perfectThreshold: 15, // Пикселей от линии для perfect
		multipliers: {
			x2: 2,
			x3: 3,
			x5: 5,
			x10: 10,
		},
		slowMotionDuration: 0.25, // 250ms slow motion
		slowMotionFactor: 0.5, // В 2 раза медленнее
	},

	rewards: {
		perfect: 20,
		normal: 10,
		comboMultiplier: 1.5, // Дополнительный множитель для комбо-очков
	},

	nearMiss: {
		threshold: 2, // Если рекорд был близок в пределах 2 очков
	},

	notes: {
		minDistance: 0.88,
		spacingFactor: 4,
	},
}

/**
 * Вычисляет travelTime на основе прогресса игры (0-1)
 * Использует линейную интерполяцию между фазами
 */
export function computeTravelTime(
	progress: number,
	config: GameBalanceConfig = gameBalanceConfig
): number {
	const { phase1, phase2, phase3 } = config.travelTime

	// Clamp progress между 0 и 1
	const clampedProgress = Math.max(0, Math.min(1, progress))

	// Переход между фазами
	if (clampedProgress < 0.5) {
		// Фаза 1 -> Фаза 2 (0 -> 0.5 progress)
		const phaseProgress = clampedProgress / 0.5
		return phase1 + (phase2 - phase1) * phaseProgress
	} else {
		// Фаза 2 -> Фаза 3 (0.5 -> 1.0 progress)
		const phaseProgress = (clampedProgress - 0.5) / 0.5
		return phase2 + (phase3 - phase2) * phaseProgress
	}
}

/**
 * Вычисляет скорость в px/sec на основе travelTime
 * speed = distance / travelTimeSec
 */
export function computeSpeed(
	distancePx: number,
	travelTimeSec: number,
	randomVariation: boolean = true,
	config: GameBalanceConfig = gameBalanceConfig
): number {
	if (travelTimeSec <= 0 || distancePx <= 0) {
		return 0
	}

	let speed = distancePx / travelTimeSec

	// Применяем микро-рандом для естественности
	if (randomVariation) {
		const variation =
			config.travelTime.randomVariation.min +
			Math.random() *
				(config.travelTime.randomVariation.max -
					config.travelTime.randomVariation.min)
		speed *= variation
	}

	return speed
}

/**
 * Вычисляет прогресс сложности на основе очков и времени
 * Возвращает значение от 0 до 1
 */
export function computeDifficultyProgress(
	score: number,
	timeSec: number,
	config: GameBalanceConfig = gameBalanceConfig
): number {
	const { phase2Score, phase3Score, phase2Time, phase3Time } = config.difficulty

	// Вычисляем прогресс по очкам (0-1)
	const scoreProgress = Math.min(1, score / phase3Score)

	// Вычисляем прогресс по времени (0-1)
	const timeProgress = Math.min(1, timeSec / phase3Time)

	// Используем максимум из двух для более агрессивной прогрессии
	return Math.max(scoreProgress, timeProgress)
}
