export class HUD {
	constructor() {
		this.speedElem = document.getElementById('speed');
		this.altElem = document.getElementById('altitude');
		this.statusElem = document.getElementById('hud-status');

		// Add more elements if needed
		this.createHorizon();
	}

	createHorizon() {
		// Create an artificial horizon element in index.html if it doesn't exist
		if (!document.getElementById('horizon-container')) {
			const ui = document.getElementById('uiContainer');
			const horizon = document.createElement('div');
			horizon.id = 'horizon-container';
			horizon.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                width: 200px;
                height: 200px;
                border: 2px solid #0f0;
                transform: translate(-50%, -50%);
                border-radius: 50%;
                overflow: hidden;
            `;

			const line = document.createElement('div');
			line.id = 'horizon-line';
			line.style.cssText = `
                position: absolute;
                top: 50%;
                width: 100%;
                height: 2px;
                background: #0f0;
            `;
			horizon.appendChild(line);
			ui.appendChild(horizon);
		}
	}

	update(state) {
		this.speedElem.innerText = Math.round(state.speed);
		this.altElem.innerText = Math.round(state.alt * 3.28084); // Meters to Feet

		const line = document.getElementById('horizon-line');
		if (line) {
			// Roll affects rotation, Pitch affects vertical translation
			const roll = state.roll;
			const pitch = state.pitch;
			line.style.transform = `rotate(${-roll}deg) translateY(${pitch * 2}px)`;
		}
	}
}
