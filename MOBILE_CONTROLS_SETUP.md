# Mobile Controls — Setup & User Guide

This document explains how to run, build, deploy, and use the mobile
flight controls that were added to Web Flight Simulator.

---

## Table of Contents

1. [What Was Added](#what-was-added)
2. [Running Locally](#running-locally)
3. [Deploying to GitHub Pages](#deploying-to-github-pages)
4. [Self-Hosting on a VPS / Server](#self-hosting-on-a-vps--server)
5. [Mobile Control Configurations](#mobile-control-configurations)
   - [Config 1 — Virtual Joystick](#config-1--virtual-joystick--throttle-slider--boost)
   - [Config 2 — Device Tilt](#config-2--device-tilt--tap-and-hold-thrust)
   - [Config 3 — Gesture Pilot](#config-3--gesture-pilot-dual-zone-touch)
6. [Changing the Active Config](#changing-the-active-config)
7. [Cesium Ion API Token](#cesium-ion-api-token)
8. [Troubleshooting](#troubleshooting)

---

## What Was Added

| File | Purpose |
|------|---------|
| `src/mobile/mobileControls.js` | All three mobile control configs in one class |
| `src/mobile/mobileControls.css` | On-screen HUD styling for mobile controls |
| `src/main.js` *(updated)* | Imports mobile module; hooks show/hide into game states |
| `index.html` *(updated)* | Mobile options in Settings modal + help text |
| `.github/workflows/deploy.yml` | GitHub Actions build & deploy pipeline |
| `MOBILE_CONTROLS_SETUP.md` | This file |

Mobile controls activate automatically when the game detects a touch
device (phone, tablet, touch laptop).  On a non-touch device you can
force them on via **Options → Mobile Controls → Force Touch Controls**.

---

## Running Locally

### Requirements

- **Node.js 18 or newer** — download from <https://nodejs.org>
- **npm** (bundled with Node.js)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/web-flight-simulator.git
cd web-flight-simulator

# 2. Install all dependencies (first time only)
npm install

# 3. Start the development server
npm run dev
```

Vite will print a local URL such as `http://localhost:5173`.

**To test mobile controls on your desktop browser:**

1. Open the URL printed by `npm run dev`
2. In Chrome DevTools (F12) → click the phone icon (Toggle Device Toolbar)
3. Select a phone preset (iPhone 14, Pixel 7, etc.)
4. Reload the page — touch events are now simulated
5. Alternatively: enable **Options → Force Touch Controls** and reload

---

## Deploying to GitHub Pages

This is the easiest free hosting method.

### One-time Setup (do this once)

1. Push your code to GitHub (fork or new repo).
2. Go to your repo → **Settings** → **Pages**.
3. Under **Source**, choose **"GitHub Actions"**.
4. Save.

### Every Push Deploys Automatically

After the one-time setup, every push to `main` (or `master`) will:

1. Trigger the **Build & Deploy** workflow (`.github/workflows/deploy.yml`)
2. Run `npm ci && npm run build`
3. Upload `dist/` to GitHub Pages

Your live URL will be:
```
https://YOUR_USERNAME.github.io/web-flight-simulator/
```

> **Sub-path note** — if your Pages URL has a sub-path (it usually does
> for project pages), set the `BASE_URL` repository variable:
>
> Settings → Secrets and variables → Actions → **Variables** tab
> → New repository variable → Name: `BASE_URL`, Value: `/web-flight-simulator/`

### Checking build status

Go to your repo → **Actions** tab.  You'll see a green tick when the
deploy succeeds, or a red cross with logs if something failed.

---

## Self-Hosting on a VPS / Server

### Build for production

```bash
npm run build
```

This outputs a static website into the `dist/` folder.

### Serve with Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/web-flight-simulator/dist;
    index index.html;

    # Required: CesiumJS workers use service workers / ES modules
    add_header Cross-Origin-Embedder-Policy require-corp;
    add_header Cross-Origin-Opener-Policy same-origin;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets aggressively
    location ~* \.(js|css|glb|ttf|jpg|png|wasm)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Copy the `dist/` folder to `/var/www/web-flight-simulator/dist/` and
reload Nginx:

```bash
sudo systemctl reload nginx
```

### HTTPS (required for device orientation on iOS)

Device tilt (Config 2) **requires HTTPS** on iOS.  Use Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Mobile Control Configurations

### Config 1 — Virtual Joystick + Throttle Slider + Boost

Best for: most users, phones and tablets, one-handed or two-handed play.

```
┌──────────────────────────────────────────────┐
│  [II]                                  [II]  │  ← Pause button
│                                              │
│  ┌──────┐      ← drag here               ┌──┐│
│  │  ●   │         for camera orbit       │  ││
│  │ ─●─  │                                │▓▓││  ← Throttle slider
│  │  ●   │                                │  ││
│  └──────┘                                └──┘│
│    ATTITUDE        [  BOOST  ]           THRUST
└──────────────────────────────────────────────┘
```

| Touch | Action |
|-------|--------|
| Drag the **joystick** (bottom-left) | Pitch & Roll |
| Drag the **throttle track** (bottom-right) | Throttle (up = more) |
| Tap **BOOST** | Afterburner |
| Drag the **open centre area** | Orbit camera |
| Tap **II** | Pause |

---

### Config 2 — Device Tilt + Tap-and-Hold Thrust

Best for: immersive feel, landscape orientation, steady hands.

> Requires motion sensor access.  On **iOS 13+** a permission prompt
> appears the first time — tap **ALLOW TILT**.  On Android it works
> automatically.
>
> **Must be served over HTTPS** for tilt to work on iOS.

```
┌──────────────────────────────────────────────┐
│  [II]                                        │
│                                              │
│  ┌──────┐      ┌───────────┐      ┌──────┐  │
│  │  ▼   │      │   tilt    │      │  ▲   │  │
│  │REDUCE│      │ indicator │      │THRUST│  │
│  │THRUST│      └───────────┘      │  UP  │  │
│  └──────┘                         └──────┘  │
│              [CALIBRATE] [BOOST]             │
│         ■■■■■■■■□□□□ 60%  THRUST             │
└──────────────────────────────────────────────┘
```

| Touch / Motion | Action |
|----------------|--------|
| **Tilt device** left/right | Roll |
| **Tilt device** forward/back | Pitch |
| **Hold ▲** (right button) | Increase throttle |
| **Hold ▼** (left button) | Decrease throttle |
| Tap **CALIBRATE** | Re-zero the neutral angle |
| Tap **BOOST** | Afterburner |
| Tap **II** | Pause |

**Calibration tip:** Hold the phone at your normal flying angle, then
tap CALIBRATE.  That angle becomes "straight and level".

---

### Config 3 — Gesture Pilot (Dual-Zone Touch)

Best for: experienced players, tablets, high-precision manoeuvres.

The screen is split into two zones.  No fixed joystick — a floating
ring appears exactly where you touch.

```
┌──────────────────┬───────────────────────────┐
│ [PRECISION: OFF] │                   [II]    │
│                  │                           │
│   ATTITUDE       │   THRUST              ┌──┐│
│   Touch & Drag   │   Swipe ↕         THR │▓▓││
│                  │   Dbl-Tap Boost        │  ││
│   ○ ← floating   │                        └──┘│
│     indicator    │   SWIPE ↕ THRUST           │
│                  │   DOUBLE-TAP BOOST         │
└──────────────────┴───────────────────────────┘
```

| Touch | Action |
|-------|--------|
| **Touch + drag** in left zone | Pitch & Roll (floating origin) |
| **Swipe up/down** in right zone | Throttle |
| **Double-tap** in right zone | Boost (+ haptic vibration) |
| **2-finger drag** anywhere | Orbit camera |
| Tap **PRECISION** | Reduce stick sensitivity by half |
| Tap **II** | Pause |

---

## Changing the Active Config

1. Open the game and tap/click the **PLAY** button on the main menu.
   *(Or wait until you are in the main menu.)*
2. Tap **OPTIONS** (or the options gear icon).
3. Scroll down to **Mobile Controls**.
4. Select your desired **Control Scheme** from the dropdown.
5. Tap **SAVE & APPLY**.
6. The new config takes effect on your **next flight** (after the
   spawn-point selection screen).

---

## Cesium Ion API Token

The terrain and globe imagery is powered by [Cesium Ion](https://ion.cesium.com).
The project ships with the default public token.  For production use
(or to avoid rate limits), register for a free account and get your
own token.

### For local development

Create a `.env` file in the project root:

```
CESIUM_ION_TOKEN=your_token_here
```

Then in `vite.config.js` add:

```js
import { defineConfig, loadEnv } from 'vite';
import cesium from 'vite-plugin-cesium';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [cesium()],
    define: {
      __CESIUM_TOKEN__: JSON.stringify(env.CESIUM_ION_TOKEN || '')
    }
  };
});
```

And at the top of `src/world/cesiumWorld.js`, before the viewer is
created:

```js
if (typeof __CESIUM_TOKEN__ !== 'undefined' && __CESIUM_TOKEN__) {
  Cesium.Ion.defaultAccessToken = __CESIUM_TOKEN__;
}
```

### For GitHub Pages (CI/CD)

1. Go to your repo → **Settings** → **Secrets and variables** →
   **Actions** → **New repository secret**.
2. Name: `CESIUM_ION_TOKEN`
3. Value: your token string.

The workflow already reads this secret and passes it as an environment
variable during the build.

---

## Troubleshooting

### Touch controls don't appear on my phone

- Make sure you opened the URL in the phone's browser (not a desktop
  remote-debug preview).
- Try enabling **Options → Force Touch Controls** and starting a new
  flight.
- Check that your browser is Chrome, Firefox, or Safari (mobile).

### Tilt controls don't work (Config 2)

- The site **must** be served over **HTTPS**.  `localhost` is an
  exception and works without HTTPS in Chrome.
- On iOS you must tap **ALLOW TILT** in the permission prompt.
- Some browsers (Firefox Android) do not expose `DeviceOrientationEvent`.
  Use Config 1 or Config 3 instead.

### The game feels sluggish on my phone

- In **Options → Graphics Quality**, choose **Low (High Perf)**.
- Disable **Anti-Aliasing (FXAA)** and **Fog Effects**.
- These settings dramatically reduce GPU load on mobile GPUs.

### The joystick / buttons are too small

- Rotate your phone to **landscape** orientation for a larger play area.
- On a tablet the controls are automatically scaled up.

### The deploy workflow failed

1. Go to your GitHub repo → **Actions** tab.
2. Click the failed run and expand the failing step.
3. Common causes:
   - `npm ci` fails — delete `node_modules` and `package-lock.json`,
     run `npm install` locally, commit the new lock file.
   - Pages not enabled — go to **Settings → Pages** and set source to
     **GitHub Actions**.
   - Missing `BASE_URL` variable — see the sub-path note above.
