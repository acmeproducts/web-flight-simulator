export class PlanePhysics {
	constructor() {
		this.speed = 0;
		this.maxSpeed = 300; // knots-ish
		this.minSpeed = 50; // Stall speed
		this.throttle = 0;
		this.enginePower = 0.5;
		this.drag = 0.01;
		this.liftFactor = 0.005;
		this.gravity = 9.8;

		this.pitch = 0;
		this.roll = 0;
		this.heading = 0;

		this.pitchRate = 40.0;
		this.rollRate = 60.0;
		this.yawRate = 20.0;
	}

	update(input, dt) {
		// Throttle / Speed
		this.throttle = input.throttle;
		const acceleration = (this.throttle * this.enginePower * 10) - (this.drag * this.speed * 0.1);
		this.speed += acceleration * dt * 50;

		// Limits
		if (this.speed < 0) this.speed = 0;
		if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;

		// Pitch, Roll, Yaw
		// Effectiveness of controls depends on speed
		const controlEffectiveness = Math.min(1, this.speed / 50);
		this.pitch += input.pitch * this.pitchRate * dt * controlEffectiveness;
		this.roll += input.roll * this.rollRate * dt * controlEffectiveness;
		this.heading += input.yaw * this.yawRate * dt * controlEffectiveness;

		// Lift (simplified)
		const lift = (this.speed * this.speed * this.liftFactor);

		// Stall logic
		if (this.speed < this.minSpeed && this.pitch > 10) {
			this.pitch -= 20 * dt; // Nose drops in stall
		}

		return {
			speed: this.speed,
			pitch: this.pitch,
			roll: this.roll,
			heading: this.heading,
			lift: lift
		};
	}
}
