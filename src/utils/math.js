import * as Cesium from 'cesium';

/**
 * Calculates a new position based on distance and bearing
 */
export function movePosition(lon, lat, alt, heading, pitch, distance) {
	const headingRad = Cesium.Math.toRadians(heading);
	const pitchRad = Cesium.Math.toRadians(pitch);

	// Simplified movement for small distances (Cartesian approximation)
	// In a real globe, this would use ellipsoidal math, but for frame-by-frame it's usually okay
	// if we convert back to degrees properly.

	// For now, let's use a simple approach:
	// Change in longitude: distance * sin(heading) / (cos(lat) * EarthRadius)
	// Change in latitude: distance * cos(heading) / EarthRadius

	const R = 6371000; // Earth radius in meters

	const dLat = (distance * Math.cos(headingRad) * Math.cos(pitchRad)) / R;
	const dLon = (distance * Math.sin(headingRad) * Math.cos(pitchRad)) / (R * Math.cos(Cesium.Math.toRadians(lat)));
	const dAlt = distance * Math.sin(pitchRad);

	return {
		lon: lon + Cesium.Math.toDegrees(dLon),
		lat: lat + Cesium.Math.toDegrees(dLat),
		alt: alt + dAlt
	};
}
