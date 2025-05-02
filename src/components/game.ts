export class Particle {
	ctx: CanvasRenderingContext2D
	x: number
	y: number
	size: number
	speedX: number
	speedY: number
	fadeSpeed: number
	rotation: number
	gravity: number
	opacity: number
	color: string

	constructor(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		color: string
	) {
		this.ctx = ctx
		this.x = x
		this.y = y
		this.size = Math.random() * 5 + 1
		this.speedX = Math.random() * 2
		this.speedY = Math.random() * -4 - 1
		this.fadeSpeed = Math.random() * 0.01
		this.rotation = Math.random() * 360
		this.gravity = 0.05
		this.opacity = 1
		this.color = color
	}

	update() {
		this.speedY += this.gravity
		this.x += this.speedX
		this.y += this.speedY
		this.opacity -= this.fadeSpeed
	}

	draw() {
		this.ctx.save()
		this.ctx.globalAlpha = this.opacity
		this.ctx.fillStyle = this.color
		this.ctx.beginPath()
		this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
		this.ctx.fillStyle = this.color
		this.ctx.shadowBlur = 8
		this.ctx.shadowColor = this.color
		this.ctx.globalAlpha = 1
		this.ctx.closePath()
		this.ctx.fill()
		this.ctx.restore()
	}
}
