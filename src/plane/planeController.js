export class PlaneController {
	constructor() {
		this.keys = {};
		window.addEventListener('keydown', (e) => this.keys[e.key] = true);
		window.addEventListener('keyup', (e) => this.keys[e.key] = false);

		this.input = {
			throttle: 0,
			pitch: 0,
			roll: 0,
			yaw: 0
		};
	}
a
	update() {
		if (this.keys['w'] || this.keys['ArrowUp']) {
			this.input.throttle = Math.min(1, this.input.throttle + 0.01);
		}
		if (this.keys['s'] || this.keys['ArrowDown']) {
			this.input.throttle = Math.max(0, this.input.throttle - 0.01);
		}

		this.input.pitch = 0;
		if (this.keys['ArrowUp']) this.input.pitch = 1;
		if (this.keys['ArrowDown']) this.input.pitch = -1;

		this.input.roll = 0;
		if (this.keys['ArrowLeft']) this.input.roll = -1;
		if (this.keys['ArrowRight']) this.input.roll = 1;

		this.input.yaw = 0;
		if (this.keys['a']) this.input.yaw = -1;
		if (this.keys['d']) this.input.yaw = 1;

		return this.input;
	}

	setHandInput(roll, pitch, yaw, throttle) {
		this.input.roll = roll;
		this.input.pitch = pitch;
		this.input.yaw = yaw;
		this.input.throttle = throttle;
	}
}
