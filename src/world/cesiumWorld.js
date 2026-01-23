import * as Cesium from 'cesium';

let viewer;

export function initCesium() {
	viewer = new Cesium.Viewer("cesiumContainer", {
		terrain: Cesium.Terrain.fromWorldTerrain(),
		timeline: false,
		animation: false,
		baseLayerPicker: false,
		geocoder: false,
		homeButton: false,
		infoBox: false,
		sceneModePicker: false,
		selectionIndicator: false,
		navigationHelpButton: false,
		fullscreenButton: false,
	});

	// Hide Cesium logo/credit for clean UI (optional but useful for games)
	viewer._cesiumWidget._creditContainer.style.display = "none";

	return viewer;
}

export function setCameraToPlane(lon, lat, alt, heading, pitch, roll) {
	if (!viewer) return;

	viewer.camera.setView({
		destination: Cesium.Cartesian3.fromDegrees(lon, lat, alt),
		orientation: {
			heading: Cesium.Math.toRadians(heading),
			pitch: Cesium.Math.toRadians(pitch),
			roll: Cesium.Math.toRadians(roll)
		}
	});
}

export function getViewer() {
	return viewer;
}
