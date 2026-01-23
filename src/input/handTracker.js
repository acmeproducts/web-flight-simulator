import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

export class HandTracker {
	constructor(videoElement, canvasElement, onResults) {
		this.videoElement = videoElement;
		this.canvasElement = canvasElement;
		this.canvasCtx = canvasElement.getContext('2d');
		this.onResults = onResults;

		this.hands = new Hands({
			locateFile: (file) => {
				return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
			}
		});

		this.hands.setOptions({
			maxNumHands: 1,
			modelComplexity: 1,
			minDetectionConfidence: 0.7,
			minTrackingConfidence: 0.7
		});

		this.hands.onResults((results) => this._processResults(results));

		this.camera = new Camera(this.videoElement, {
			onFrame: async () => {
				await this.hands.send({ image: this.videoElement });
			},
			width: 640,
			height: 480
		});
	}

	start() {
		this.camera.start();
	}

	_processResults(results) {
		// Draw debug landmarks
		this.canvasCtx.save();
		this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

		if (results.multiHandLandmarks) {
			for (const landmarks of results.multiHandLandmarks) {
				// We'll use drawing_utils if imported, or just custom drawing
				this._drawLandmarks(landmarks);
			}
		}
		this.canvasCtx.restore();

		// Pass results to callback
		if (this.onResults) {
			this.onResults(results);
		}
	}

	_drawLandmarks(landmarks) {
		this.canvasCtx.fillStyle = '#0f0';
		for (const point of landmarks) {
			const x = point.x * this.canvasElement.width;
			const y = point.y * this.canvasElement.height;
			this.canvasCtx.beginPath();
			this.canvasCtx.arc(x, y, 3, 0, 2 * Math.PI);
			this.canvasCtx.fill();
		}
	}
}
