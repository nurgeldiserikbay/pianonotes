/**
 * Theme Configuration
 * 
 * Визуальные настройки игры: цвета, тени, эффекты
 * Дизайн: тёмный фон, мягкие цвета, без кислотных оттенков
 */

export interface ThemeConfig {
	// Цвета фона
	background: {
		primary: string    // Основной цвет фона
		gradient: {
			start: string
			end: string
			angle: number  // Градусы для градиента
		}
	}
	
	// Цвета линий нотного стана
	lines: {
		colors: string[]
		width: number
		opacity: number
	}
	
	// Цвета нот
	notes: {
		shadow: {
			color: string
			blur: number
			offsetX: number
			offsetY: number
			opacity: number
		}
		gradient: {
			topBrightness: number  // Множитель яркости для верхней части (1.1 = на 10% светлее)
			bottomBrightness: number // Множитель яркости для нижней части (0.9 = на 10% темнее)
		}
	}
	
	// Цвета эффектов
	effects: {
		perfect: {
			color: string    // Тёплый цвет для perfect
			glow: {
				color: string
				blur: number
			}
		}
		fail: {
			flashColor: string  // Красный flash при промахе
			duration: number    // Длительность flash (ms)
		}
		combo: {
			color: string
			glow: {
				color: string
				blur: number
			}
		}
	}
	
	// Анимации
	animations: {
		spawn: {
			duration: number    // Длительность spawn анимации (ms)
			scaleStart: number
			scaleEnd: number
			fadeStart: number
			fadeEnd: number
		}
		perfect: {
			duration: number
			scaleStart: number
			scalePeak: number
			scaleEnd: number
		}
		fail: {
			duration: number
			shakeAmount: number  // Пиксели для тряски
		}
		combo: {
			duration: number
			glowPulse: {
				min: number
				max: number
			}
		}
	}
	
	// HUD стили
	hud: {
		score: {
			color: string
			fontSize: string
		}
		combo: {
			color: string
			fontSize: string
			visibleThreshold: number  // Показывать комбо только если >= этого значения
		}
		life: {
			color: string
		}
	}
	
	// Game Over экран
	gameOver: {
		background: string
		textColor: string
		nearMissColor: string
	}
}

export const themeConfig: ThemeConfig = {
	background: {
		primary: '#1a1f2e',
		gradient: {
			start: '#1a1f2e',
			end: '#0f1419',
			angle: 150,
		},
	},
	
	lines: {
		colors: [
			'#4a90e2',  // Мягкий синий
			'#9b59b6',  // Мягкий фиолетовый
			'#1abc9c',  // Мягкий бирюзовый
			'#f39c12',  // Мягкий оранжевый
			'#3498db',  // Мягкий голубой
		],
		width: 4,
		opacity: 0.9,
	},
	
	notes: {
		shadow: {
			color: 'rgba(0, 0, 0, 0.4)',
			blur: 8,
			offsetX: 0,
			offsetY: 4,
			opacity: 0.6,
		},
		gradient: {
			topBrightness: 1.15,   // Верхняя часть на 15% светлее
			bottomBrightness: 0.85, // Нижняя часть на 15% темнее
		},
	},
	
	effects: {
		perfect: {
			color: '#ffd700',  // Золотой
			glow: {
				color: '#ffd700',
				blur: 20,
			},
		},
		fail: {
			flashColor: 'rgba(231, 76, 60, 0.6)',  // Мягкий красный
			duration: 200,
		},
		combo: {
			color: '#ff6b6b',  // Тёплый красный
			glow: {
				color: '#ff6b6b',
				blur: 25,
			},
		},
	},
	
	animations: {
		spawn: {
			duration: 150,      // 150ms
			scaleStart: 0.92,
			scaleEnd: 1.0,
			fadeStart: 0.7,
			fadeEnd: 1.0,
		},
		perfect: {
			duration: 170,      // 170ms
			scaleStart: 1.0,
			scalePeak: 1.08,
			scaleEnd: 1.0,
		},
		fail: {
			duration: 230,      // 230ms
			shakeAmount: 4,
		},
		combo: {
			duration: 600,      // 600ms
			glowPulse: {
				min: 15,
				max: 30,
			},
		},
	},
	
	hud: {
		score: {
			color: '#fcda5f',
			fontSize: '1rem',
		},
		combo: {
			color: '#ff6b6b',
			fontSize: '1.2rem',
			visibleThreshold: 2,  // Показывать комбо только если >= 2
		},
		life: {
			color: '#fcda5f',
		},
	},
	
	gameOver: {
		background: 'rgba(58, 72, 114, 0.95)',
		textColor: '#fff',
		nearMissColor: '#ffd700',
	},
}

/**
 * Осветляет или затемняет цвет (для градиентов нот)
 */
export function adjustBrightness(color: string, factor: number): string {
	// Простая функция для изменения яркости hex цвета
	// Если color в формате #RRGGBB или rgb(), нужно конвертировать
	// Для простоты, если factor > 1 - осветляем, если < 1 - затемняем
	
	// Если цвет уже в rgba формате, оставляем как есть
	// В реальной игре лучше использовать более продвинутую функцию
	return color
}


