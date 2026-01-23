# 🛩️ Web Flight Simulator

A web-based flight simulator that allows you to control an aircraft using hand gestures via webcam, featuring a real-world 3D environment powered by CesiumJS.

## 🚀 Key Features

-   **Real-World 3D Environment**: Powered by **CesiumJS** to display an accurate 3D globe and real-world terrain.
-   **Hand Gesture Control**: Integration with **MediaPipe Hands** to detect hand movements as an alternative to a joystick or keyboard.
-   **Aircraft Rendering & HUD**: Uses **Three.js** for high-quality 3D aircraft models (GLTF) and a functional Heads-Up Display (HUD).
-   **Flight Physics**: Custom physics implementation for a responsive and flyable simulation experience.
-   **Vite**: Modern and ultra-fast frontend tooling for development.

## 🛠️ Technology Stack

-   [CesiumJS](https://cesium.com/platform/cesiumjs/) - 3D Globe & Maps
-   [Three.js](https://threejs.org/) - 3D Engine
-   [MediaPipe](https://google.github.io/mediapipe/) - AI Hand Tracking
-   [Vite](https://vitejs.dev/) - Frontend Tooling

## 📦 Installation

1.  Clone this repository:
    ```bash
    git clone https://github.com/username/web-flight-simulator.git
    cd web-flight-simulator
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open your browser and navigate to the address shown (usually `http://localhost:5173`).

## 🎮 How to Play

1.  Grant camera access when prompted by the browser.
2.  Wait for the hand tracking system to initialize.
3.  Use your hand movements to control the aircraft's *pitch*, *roll*, and *yaw*.
4.  Explore the world in real-time!

## 📂 Project Structure

-   `src/input`: Hand tracking logic and gesture mapping.
-   `src/plane`: Aircraft controller and physics calculations.
-   `src/world`: CesiumJS integration and world setup.
-   `src/ui`: HUD implementation and user interface components.

## 📝 License

This project is licensed under the [ISC License](LICENSE).
