/**
 * Mobile Flight Controls - Web Flight Simulator
 *
 * Three control configurations:
 *
 *  config1  Virtual joystick (bottom-left) + throttle slider (right) + BOOST button
 *  config2  Device tilt / gyroscope for pitch & roll + tap-and-hold thrust buttons
 *  config3  "Gesture Pilot" – floating dual-zone: left = attitude, right = throttle/boost
 *
 * All configs output the same `input` object shape as PlaneController so the
 * flight physics and camera code work without changes.
 */

export class MobileControls {

	/**
	 * Returns true when the device is likely touch-primary.
	 * Works on iOS, Android, and hybrid (Surface, iPad w/ keyboard, etc.).
	 */
	static isMobile() {
		return ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
	}

	constructor() {
		/** Matches PlaneController.input exactly */
		this.input = {
			throttle:    0.5,
			pitch:       0,
			roll:        0,
			yaw:         0,
			boost:       false,
			cameraYaw:   0,
			cameraPitch: 0,
			isDragging:  false,
		};

		this.active  = false;
		this.mode    = null;   // 'config1' | 'config2' | 'config3'
		this.overlay = null;

		// ── Config 1 internal state ──────────────────────────────────────
		this._c1 = {
			joystickTouchId: null,
			camTouchId:      null,
			camLastX:        0,
			camLastY:        0,
		};

		// ── Config 2 internal state ──────────────────────────────────────
		this._c2 = {
			calibration:  { beta: 0, gamma: 0, done: false },
			tiltHandler:  null,
			throttleUp:   false,
			throttleDown: false,
		};

		// ── Config 3 internal state ──────────────────────────────────────
		this._c3 = {
			leftTouchId:       null,
			leftOriginX:       0,
			leftOriginY:       0,
			rightTouchId:      null,
			rightStartY:       0,
			rightBaseThrottle: 0.5,
			lastTapTime:       0,
			precision:         false,
		};
	}

	// ════════════════════════════════════════════════════════════════════
	// Public API
	// ════════════════════════════════════════════════════════════════════

	/** Create the overlay DOM for the chosen config and attach listeners. */
	activate(mode) {
		this.deactivate();
		this.mode   = mode;
		this.active = true;
		this._buildOverlay();
	}

	/** Tear down DOM and event listeners cleanly. */
	deactivate() {
		if (this.overlay) {
			this.overlay.remove();
			this.overlay = null;
		}
		if (this._c2.tiltHandler) {
			window.removeEventListener('deviceorientation', this._c2.tiltHandler);
			this._c2.tiltHandler = null;
		}
		this.active        = false;
		this.mode          = null;
		this.input.pitch   = 0;
		this.input.roll    = 0;
		this.input.boost   = false;
		this.input.isDragging = false;
	}

	/** Make overlay visible (called when entering FLYING state). */
	show() {
		if (this.overlay) this.overlay.classList.remove('mc-hidden');
	}

	/** Hide overlay without destroying it (pause, spawn-pick, crash screens). */
	hide() {
		if (this.overlay) this.overlay.classList.add('mc-hidden');
	}

	/**
	 * Called every game frame while FLYING.
	 * Smooths inputs and handles time-based throttle ramping (config2).
	 * @param {number} dt  Delta time in seconds
	 * @returns {object}   Current input state
	 */
	update(dt) {
		if (!this.active) return null;

		if (this.mode === 'config1') {
			// Joystick spring-back when finger lifted
			if (this._c1.joystickTouchId === null) {
				this.input.pitch = this._lerp(this.input.pitch, 0, 0.15);
				this.input.roll  = this._lerp(this.input.roll,  0, 0.15);
			}
		} else if (this.mode === 'config2') {
			// Ramp throttle from hold-buttons
			const rate = 0.6;
			if (this._c2.throttleUp) {
				this.input.throttle = Math.min(1, this.input.throttle + rate * dt);
			} else if (this._c2.throttleDown) {
				this.input.throttle = Math.max(0, this.input.throttle - rate * dt);
			}
			this._c2UpdateThrottleBar();
		} else if (this.mode === 'config3') {
			// Left-zone spring-back when finger lifted
			if (this._c3.leftTouchId === null) {
				this.input.pitch = this._lerp(this.input.pitch, 0, 0.12);
				this.input.roll  = this._lerp(this.input.roll,  0, 0.12);
			}
		}

		// Camera returns to behind-plane when user stops dragging
		if (!this.input.isDragging) {
			this.input.cameraYaw   = this._lerp(this.input.cameraYaw,   0, 0.1);
			this.input.cameraPitch = this._lerp(this.input.cameraPitch, 0, 0.1);
		}

		return this.input;
	}

	// ════════════════════════════════════════════════════════════════════
	// Overlay Construction
	// ════════════════════════════════════════════════════════════════════

	_buildOverlay() {
		this.overlay = document.createElement('div');
		this.overlay.id        = 'mobile-controls-overlay';
		this.overlay.className = `mobile-controls mobile-${this.mode} mc-hidden`;
		document.body.appendChild(this.overlay);

		if      (this.mode === 'config1') this._buildConfig1();
		else if (this.mode === 'config2') this._buildConfig2();
		else if (this.mode === 'config3') this._buildConfig3();
	}

	// ════════════════════════════════════════════════════════════════════
	// CONFIG 1 — Virtual Joystick + Throttle Slider + Boost
	// ════════════════════════════════════════════════════════════════════

	_buildConfig1() {
		this.overlay.innerHTML = `
			<div id="mc-joystick-zone" class="mc-joystick-zone">
				<div id="mc-joystick-base" class="mc-joystick-base">
					<div id="mc-joystick-stick" class="mc-joystick-stick"></div>
				</div>
				<div class="mc-zone-label">ATTITUDE</div>
			</div>

			<div class="mc-c1-center-btns">
				<button id="mc-boost-btn" class="mc-boost-btn">BOOST</button>
			</div>

			<div id="mc-throttle-zone" class="mc-throttle-zone">
				<div class="mc-throttle-label-top">MAX</div>
				<div class="mc-throttle-track" id="mc-throttle-track">
					<div id="mc-throttle-fill"   class="mc-throttle-fill"   style="height:50%"></div>
					<div id="mc-throttle-handle" class="mc-throttle-handle" style="bottom:calc(50% - 4px)"></div>
				</div>
				<div class="mc-throttle-label-bot">MIN</div>
				<div id="mc-throttle-value" class="mc-throttle-value">50%</div>
				<div class="mc-zone-label">THRUST</div>
			</div>

			<button id="mc-pause-btn" class="mc-pause-btn">II</button>
		`;

		this._setupC1Joystick();
		this._setupC1Throttle();
		this._setupBoostBtn('mc-boost-btn');
		this._setupPauseBtn('mc-pause-btn');
		this._setupC1Camera();
	}

	_setupC1Joystick() {
		const zone  = document.getElementById('mc-joystick-zone');
		const base  = document.getElementById('mc-joystick-base');
		const stick = document.getElementById('mc-joystick-stick');
		const maxR  = 52; // max displacement radius in px

		zone.addEventListener('touchstart', (e) => {
			e.preventDefault();
			if (this._c1.joystickTouchId !== null) return;
			this._c1.joystickTouchId = e.changedTouches[0].identifier;
		}, { passive: false });

		zone.addEventListener('touchmove', (e) => {
			e.preventDefault();
			for (const t of e.changedTouches) {
				if (t.identifier !== this._c1.joystickTouchId) continue;
				const rect = base.getBoundingClientRect();
				const dx   = t.clientX - (rect.left + rect.width  / 2);
				const dy   = t.clientY - (rect.top  + rect.height / 2);
				const dist = Math.hypot(dx, dy);
				const k    = dist > maxR ? maxR / dist : 1;
				const nx   = dx * k;
				const ny   = dy * k;
				stick.style.transform = `translate(${nx}px,${ny}px)`;
				this.input.roll  = nx / maxR;
				this.input.pitch = ny / maxR;
			}
		}, { passive: false });

		const onEnd = (e) => {
			for (const t of e.changedTouches) {
				if (t.identifier !== this._c1.joystickTouchId) continue;
				this._c1.joystickTouchId = null;
				stick.style.transform    = 'translate(0px,0px)';
			}
		};
		zone.addEventListener('touchend',    onEnd, { passive: false });
		zone.addEventListener('touchcancel', onEnd, { passive: false });
	}

	_setupC1Throttle() {
		const track  = document.getElementById('mc-throttle-track');
		const fill   = document.getElementById('mc-throttle-fill');
		const handle = document.getElementById('mc-throttle-handle');
		const label  = document.getElementById('mc-throttle-value');
		let touchId  = null;

		const setVal = (clientY) => {
			const rect = track.getBoundingClientRect();
			const v    = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
			this.input.throttle = v;
			const pct = Math.round(v * 100);
			fill.style.height   = pct + '%';
			handle.style.bottom = `calc(${pct}% - 4px)`;
			label.textContent   = pct + '%';
		};

		track.addEventListener('touchstart', (e) => {
			e.preventDefault();
			if (touchId !== null) return;
			const t = e.changedTouches[0];
			touchId = t.identifier;
			setVal(t.clientY);
		}, { passive: false });

		track.addEventListener('touchmove', (e) => {
			e.preventDefault();
			for (const t of e.changedTouches) {
				if (t.identifier !== touchId) continue;
				setVal(t.clientY);
			}
		}, { passive: false });

		const onEnd = (e) => {
			for (const t of e.changedTouches) {
				if (t.identifier !== touchId) continue;
				touchId = null;
			}
		};
		track.addEventListener('touchend',    onEnd, { passive: false });
		track.addEventListener('touchcancel', onEnd, { passive: false });
	}

	_setupC1Camera() {
		// Single-finger drag in the open central area = camera orbit
		this.overlay.addEventListener('touchstart', (e) => {
			if (this._c1.camTouchId !== null) return;
			for (const t of e.changedTouches) {
				const tgt = t.target;
				if (tgt.closest('#mc-joystick-zone') ||
				    tgt.closest('#mc-throttle-zone') ||
				    tgt.closest('button')) continue;
				this._c1.camTouchId  = t.identifier;
				this._c1.camLastX    = t.clientX;
				this._c1.camLastY    = t.clientY;
				this.input.isDragging = true;
				break;
			}
		}, { passive: false });

		this.overlay.addEventListener('touchmove', (e) => {
			e.preventDefault();
			for (const t of e.changedTouches) {
				if (t.identifier !== this._c1.camTouchId) continue;
				const dx = t.clientX - this._c1.camLastX;
				const dy = t.clientY - this._c1.camLastY;
				this._c1.camLastX = t.clientX;
				this._c1.camLastY = t.clientY;
				this.input.cameraYaw   += dx * 0.3;
				this.input.cameraPitch -= dy * 0.3;
				this.input.cameraPitch  = Math.max(-85, Math.min(85, this.input.cameraPitch));
			}
		}, { passive: false });

		const onEnd = (e) => {
			for (const t of e.changedTouches) {
				if (t.identifier !== this._c1.camTouchId) continue;
				this._c1.camTouchId   = null;
				this.input.isDragging = false;
			}
		};
		this.overlay.addEventListener('touchend',    onEnd, { passive: false });
		this.overlay.addEventListener('touchcancel', onEnd, { passive: false });
	}

	// ════════════════════════════════════════════════════════════════════
	// CONFIG 2 — Device Tilt + Tap-and-Hold Thrust + Boost
	// ════════════════════════════════════════════════════════════════════

	_buildConfig2() {
		this.overlay.innerHTML = `
			<div id="mc-tilt-indicator" class="mc-tilt-indicator">
				<div id="mc-tilt-horizon" class="mc-tilt-horizon"></div>
				<div class="mc-tilt-crosshair"></div>
				<div class="mc-tilt-ring"></div>
			</div>

			<div id="mc-tdown-btn" class="mc-tilt-hold-btn mc-tdown-btn">
				<span class="mc-hold-arrow">▼</span>
				<span class="mc-hold-label">REDUCE<br>THRUST</span>
			</div>

			<div id="mc-tup-btn" class="mc-tilt-hold-btn mc-tup-btn">
				<span class="mc-hold-arrow">▲</span>
				<span class="mc-hold-label">INCREASE<br>THRUST</span>
			</div>

			<div class="mc-c2-bottom-bar">
				<button id="mc-calibrate-btn" class="mc-calibrate-btn">CALIBRATE</button>
				<button id="mc-boost-btn"     class="mc-boost-btn">BOOST</button>
			</div>

			<div class="mc-c2-throttle-bar">
				<span class="mc-c2-thr-label">THRUST</span>
				<div  class="mc-c2-thr-track">
					<div id="mc-c2-thr-fill" class="mc-c2-thr-fill" style="width:50%"></div>
				</div>
				<span id="mc-c2-thr-pct" class="mc-c2-thr-pct">50%</span>
			</div>

			<button id="mc-pause-btn" class="mc-pause-btn">II</button>
		`;

		this._setupC2HoldButtons();
		this._setupBoostBtn('mc-boost-btn');
		this._setupCalibrateBtn();
		this._setupPauseBtn('mc-pause-btn');
		this._requestTiltPermission();
	}

	_setupC2HoldButtons() {
		const make = (id, setOn, setOff) => {
			const el = document.getElementById(id);
			el.addEventListener('touchstart', (e) => {
				e.preventDefault(); setOn(); el.classList.add('active');
			}, { passive: false });
			el.addEventListener('touchend', (e) => {
				e.preventDefault(); setOff(); el.classList.remove('active');
			}, { passive: false });
			el.addEventListener('touchcancel', () => { setOff(); el.classList.remove('active'); });
		};
		make('mc-tup-btn',
			() => { this._c2.throttleUp   = true;  },
			() => { this._c2.throttleUp   = false; });
		make('mc-tdown-btn',
			() => { this._c2.throttleDown = true;  },
			() => { this._c2.throttleDown = false; });
	}

	_setupCalibrateBtn() {
		const btn = document.getElementById('mc-calibrate-btn');
		const recalib = () => { this._c2.calibration.done = false; };
		btn.addEventListener('touchstart', (e) => { e.preventDefault(); recalib(); }, { passive: false });
		btn.addEventListener('click', recalib);
	}

	_requestTiltPermission() {
		// iOS 13+ requires explicit user-gesture permission for DeviceOrientation
		if (typeof DeviceOrientationEvent !== 'undefined' &&
		    typeof DeviceOrientationEvent.requestPermission === 'function') {

			const prompt = document.createElement('div');
			prompt.className = 'mc-tilt-permission';
			prompt.innerHTML = `
				<div class="mc-tilt-perm-box">
					<div class="mc-tilt-perm-title">MOTION SENSOR</div>
					<p>Allow tilt / gyroscope access to fly with device orientation.</p>
					<button id="mc-allow-tilt" class="mc-boost-btn" style="width:100%">ALLOW TILT</button>
					<button id="mc-deny-tilt"  class="mc-calibrate-btn" style="width:100%;margin-top:8px">USE BUTTONS ONLY</button>
				</div>
			`;
			this.overlay.appendChild(prompt);

			document.getElementById('mc-allow-tilt').addEventListener('touchstart', async (e) => {
				e.preventDefault();
				try {
					const perm = await DeviceOrientationEvent.requestPermission();
					if (perm === 'granted') this._startTiltListener();
				} catch (err) {
					console.warn('[MobileControls] Tilt permission denied:', err);
				}
				prompt.remove();
			}, { passive: false });

			document.getElementById('mc-deny-tilt').addEventListener('touchstart', (e) => {
				e.preventDefault();
				prompt.remove();
			}, { passive: false });

		} else {
			// Android / older Safari – no permission step needed
			this._startTiltListener();
		}
	}

	_startTiltListener() {
		this._c2.tiltHandler = (event) => {
			const beta  = event.beta  ?? 0;   // front-back tilt  −180 … 180
			const gamma = event.gamma ?? 0;   // left-right tilt   −90 … 90

			// First reading becomes the "neutral" reference
			if (!this._c2.calibration.done) {
				this._c2.calibration.beta  = beta;
				this._c2.calibration.gamma = gamma;
				this._c2.calibration.done  = true;
			}

			const db = beta  - this._c2.calibration.beta;   // delta from neutral
			const dg = gamma - this._c2.calibration.gamma;

			// Map to ±1 input range
			this.input.roll  = Math.max(-1, Math.min(1, dg / 28));  // ±28° → full roll
			this.input.pitch = Math.max(-1, Math.min(1, db / 22));  // ±22° → full pitch

			// Animate the artificial horizon
			const horizon = document.getElementById('mc-tilt-horizon');
			if (horizon) {
				horizon.style.transform =
					`rotate(${-dg * 1.2}deg) translateY(${db * 1.8}px)`;
			}
		};
		window.addEventListener('deviceorientation', this._c2.tiltHandler);
	}

	_c2UpdateThrottleBar() {
		const fill = document.getElementById('mc-c2-thr-fill');
		const pct  = document.getElementById('mc-c2-thr-pct');
		if (fill) fill.style.width = Math.round(this.input.throttle * 100) + '%';
		if (pct)  pct.textContent  = Math.round(this.input.throttle * 100) + '%';
	}

	// ════════════════════════════════════════════════════════════════════
	// CONFIG 3 — "Gesture Pilot": Floating Dual-Zone Touch
	//
	//  Left zone  Touch anywhere → floating stick appears at touch origin
	//             Drag from origin → pitch + roll (spring-returns on lift)
	//  Right zone Swipe up/down → throttle
	//             Double-tap     → boost (+ haptic on supported devices)
	//  Camera     2-finger drag anywhere → orbit camera
	//  Top-bar    PRECISION toggle (cuts sensitivity ÷2 for fine inputs)
	// ════════════════════════════════════════════════════════════════════

	_buildConfig3() {
		this.overlay.innerHTML = `
			<div id="mc-left-zone" class="mc-c3-left-zone">
				<div class="mc-c3-zone-hint">ATTITUDE<br><span class="mc-c3-zone-sub">TOUCH &amp; DRAG</span></div>
				<div class="mc-c3-center-cross"></div>
				<div id="mc-c3-indicator" class="mc-c3-indicator mc-c3-hidden"></div>
			</div>

			<div class="mc-c3-divider"></div>

			<div id="mc-right-zone" class="mc-c3-right-zone">
				<div class="mc-c3-zone-hint">THRUST<br><span class="mc-c3-zone-sub">SWIPE ↕ | DBL-TAP BOOST</span></div>
				<div class="mc-c3-thr-display">
					<div class="mc-c3-thr-label">THR</div>
					<div id="mc-c3-thr-bar" class="mc-c3-thr-bar">
						<div id="mc-c3-thr-fill" class="mc-c3-thr-fill" style="height:50%"></div>
					</div>
					<div id="mc-c3-thr-pct" class="mc-c3-thr-pct">50%</div>
				</div>
			</div>

			<div class="mc-c3-topbar">
				<button id="mc-precision-btn" class="mc-small-btn">PRECISION: OFF</button>
				<button id="mc-pause-btn"     class="mc-pause-btn mc-pause-inline">II</button>
			</div>
		`;

		this._setupC3LeftZone();
		this._setupC3RightZone();
		this._setupC3PrecisionToggle();
		this._setupC3TwoFingerCamera();
		this._setupPauseBtn('mc-pause-btn');
	}

	_setupC3LeftZone() {
		const zone      = document.getElementById('mc-left-zone');
		const indicator = document.getElementById('mc-c3-indicator');

		zone.addEventListener('touchstart', (e) => {
			e.preventDefault();
			if (this._c3.leftTouchId !== null) return;
			if (e.touches.length > 1) return;   // 2-finger = camera, handled separately
			const t    = e.changedTouches[0];
			const rect = zone.getBoundingClientRect();
			this._c3.leftTouchId = t.identifier;
			this._c3.leftOriginX = t.clientX - rect.left;
			this._c3.leftOriginY = t.clientY - rect.top;
			indicator.style.left = this._c3.leftOriginX + 'px';
			indicator.style.top  = this._c3.leftOriginY + 'px';
			indicator.classList.remove('mc-c3-hidden');
		}, { passive: false });

		zone.addEventListener('touchmove', (e) => {
			e.preventDefault();
			for (const t of e.changedTouches) {
				if (t.identifier !== this._c3.leftTouchId) continue;
				const rect  = zone.getBoundingClientRect();
				const cx    = t.clientX - rect.left;
				const cy    = t.clientY - rect.top;
				const dx    = cx - this._c3.leftOriginX;
				const dy    = cy - this._c3.leftOriginY;
				// Precision mode doubles the physical travel needed for full deflection
				const range = Math.min(rect.width, rect.height) * (this._c3.precision ? 0.55 : 0.30);
				this.input.roll  = Math.max(-1, Math.min(1, dx / range));
				this.input.pitch = Math.max(-1, Math.min(1, dy / range));
				// Drag the indicator dot with the finger
				indicator.style.left = cx + 'px';
				indicator.style.top  = cy + 'px';
			}
		}, { passive: false });

		const onEnd = (e) => {
			for (const t of e.changedTouches) {
				if (t.identifier !== this._c3.leftTouchId) continue;
				this._c3.leftTouchId = null;
				indicator.classList.add('mc-c3-hidden');
			}
		};
		zone.addEventListener('touchend',    onEnd, { passive: false });
		zone.addEventListener('touchcancel', onEnd, { passive: false });
	}

	_setupC3RightZone() {
		const zone = document.getElementById('mc-right-zone');

		zone.addEventListener('touchstart', (e) => {
			e.preventDefault();
			if (this._c3.rightTouchId !== null) return;
			if (e.touches.length > 1) return;
			const t = e.changedTouches[0];
			this._c3.rightTouchId      = t.identifier;
			this._c3.rightStartY       = t.clientY;
			this._c3.rightBaseThrottle = this.input.throttle;

			// Double-tap detection → boost
			const now = Date.now();
			if (now - this._c3.lastTapTime < 320) {
				this.input.boost = true;
				if (navigator.vibrate) navigator.vibrate(50);
				setTimeout(() => { this.input.boost = false; }, 250);
			}
			this._c3.lastTapTime = now;
		}, { passive: false });

		zone.addEventListener('touchmove', (e) => {
			e.preventDefault();
			for (const t of e.changedTouches) {
				if (t.identifier !== this._c3.rightTouchId) continue;
				const rect  = zone.getBoundingClientRect();
				const dy    = this._c3.rightStartY - t.clientY;   // positive = up = more thrust
				const delta = dy / (rect.height * 0.75);
				this.input.throttle = Math.max(0, Math.min(1, this._c3.rightBaseThrottle + delta));
				const pct = Math.round(this.input.throttle * 100);
				const fill = document.getElementById('mc-c3-thr-fill');
				const pctEl = document.getElementById('mc-c3-thr-pct');
				if (fill)  fill.style.height  = pct + '%';
				if (pctEl) pctEl.textContent  = pct + '%';
			}
		}, { passive: false });

		const onEnd = (e) => {
			for (const t of e.changedTouches) {
				if (t.identifier !== this._c3.rightTouchId) continue;
				this._c3.rightTouchId = null;
			}
		};
		zone.addEventListener('touchend',    onEnd, { passive: false });
		zone.addEventListener('touchcancel', onEnd, { passive: false });
	}

	_setupC3PrecisionToggle() {
		const btn = document.getElementById('mc-precision-btn');
		btn.addEventListener('touchstart', (e) => {
			e.preventDefault();
			this._c3.precision = !this._c3.precision;
			btn.textContent = `PRECISION: ${this._c3.precision ? 'ON' : 'OFF'}`;
			btn.classList.toggle('mc-small-btn-active', this._c3.precision);
		}, { passive: false });
	}

	_setupC3TwoFingerCamera() {
		let lastMidX = 0, lastMidY = 0;

		this.overlay.addEventListener('touchstart', (e) => {
			if (e.touches.length === 2) {
				lastMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
				lastMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
				this.input.isDragging = true;
				// Release zone controls so they don't fight camera
				this._c3.leftTouchId  = null;
				this._c3.rightTouchId = null;
				const ind = document.getElementById('mc-c3-indicator');
				if (ind) ind.classList.add('mc-c3-hidden');
			}
		}, { passive: false });

		this.overlay.addEventListener('touchmove', (e) => {
			if (!this.input.isDragging || e.touches.length < 2) return;
			e.preventDefault();
			const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
			const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
			this.input.cameraYaw   += (midX - lastMidX) * 0.3;
			this.input.cameraPitch -= (midY - lastMidY) * 0.3;
			this.input.cameraPitch  = Math.max(-85, Math.min(85, this.input.cameraPitch));
			lastMidX = midX;
			lastMidY = midY;
		}, { passive: false });

		const onEnd = (e) => {
			if (e.touches.length < 2) this.input.isDragging = false;
		};
		this.overlay.addEventListener('touchend',    onEnd, { passive: false });
		this.overlay.addEventListener('touchcancel', onEnd, { passive: false });
	}

	// ════════════════════════════════════════════════════════════════════
	// Shared helpers
	// ════════════════════════════════════════════════════════════════════

	_setupBoostBtn(id) {
		const btn = document.getElementById(id);
		if (!btn) return;
		btn.addEventListener('touchstart', (e) => {
			e.preventDefault();
			this.input.boost = true;
			btn.classList.add('active');
		}, { passive: false });
		btn.addEventListener('touchend', (e) => {
			e.preventDefault();
			this.input.boost = false;
			btn.classList.remove('active');
		}, { passive: false });
		btn.addEventListener('touchcancel', () => {
			this.input.boost = false;
			btn.classList.remove('active');
		});
	}

	_setupPauseBtn(id) {
		const btn = document.getElementById(id);
		if (!btn) return;
		btn.addEventListener('touchstart', (e) => {
			e.preventDefault();
			window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		}, { passive: false });
	}

	_lerp(a, b, t) {
		return (1 - t) * a + t * b;
	}
}
