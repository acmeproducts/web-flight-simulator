export class GestureMapper {
	constructor() {
		this.lastPitch = 0;
		this.lastRoll = 0;
	}

	mapHandToFlight(landmarks) {
		if (!landmarks || landmarks.length === 0) return null;

		// landmarks[0] is wrist
		// landmarks[9] is middle finger mcp (center of palm area)
		// landmarks[12] is middle finger tip

		const wrist = landmarks[0];
		const middleMcp = landmarks[9];

		// 1. Roll (Tilt of the hand)
		// Calculate angle between wrist and index mcp (5) or middle mcp (9)
		const indexMcp = landmarks[5];
		const pinkyMcp = landmarks[17];

		// Vector from index to pinky (horizontal line across knuckles)
		const dxRoll = pinkyMcp.x - indexMcp.x;
		const dyRoll = pinkyMcp.y - indexMcp.y;
		const rollAngle = Math.atan2(dyRoll, dxRoll); // In radians

		// Map roll angle to -1 to 1
		// Normal flat hand rollAngle is approx 0.
		let roll = rollAngle * 2; // Sensitivity
		roll = Math.max(-1, Math.min(1, roll));

		// 2. Pitch (Vertical angle of the hand)
		// Vector from wrist to middle mcp
		const dxPitch = middleMcp.x - wrist.x;
		const dyPitch = middleMcp.y - wrist.y;
		const pitchAngle = Math.atan2(dyPitch, dxPitch);

		// Neutral pitch is usually pointing up (around -PI/2)
		// Let's map it based on deviation from a neutral point
		let pitch = -(pitchAngle + Math.PI / 2) * 2;
		pitch = Math.max(-1, Math.min(1, pitch));

		// 3. Throttle (Open hand vs Fist)
		// Measure distance between fingertips and wrist
		const thumbTip = landmarks[4];
		const indexTip = landmarks[8];
		const middleTip = landmarks[12];
		const ringTip = landmarks[16];
		const pinkyTip = landmarks[20];

		const avgFingertipDist = (
			this._dist(thumbTip, wrist) +
			this._dist(indexTip, wrist) +
			this._dist(middleTip, wrist) +
			this._dist(ringTip, wrist) +
			this._dist(pinkyTip, wrist)
		) / 5;

		// Thresholds for throttle (calibrated to normalized coordinates)
		// Fist is approx < 0.15, Open hand is approx > 0.3
		let throttle = (avgFingertipDist - 0.15) / 0.15;
		throttle = Math.max(0, Math.min(1, throttle));

		return {
			roll,
			pitch,
			throttle,
			yaw: roll * 0.3 // Auto-coordinated turn simplification
		};
	}

	_dist(p1, p2) {
		return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
	}
}
