export function lowPassFilter(prev, current, alpha = 0.2) {
	if (prev === undefined || prev === null) return current;
	return prev + alpha * (current - prev);
}

export class SmoothingFilter {
	constructor(alpha = 0.2) {
		this.alpha = alpha;
		this.value = null;
	}

	filter(newValue) {
		if (this.value === null) {
			this.value = newValue;
		} else {
			this.value = this.value + this.alpha * (newValue - this.value);
		}
		return this.value;
	}
}
