/**
 * Geofencing utilities using the Haversine formula
 */

const EARTH_RADIUS_METERS = 6371e3;

/** Convert degrees to radians */
function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculate the distance between two GPS coordinates using the Haversine formula
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lng2 - lng1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Check if a GPS coordinate is within a geofence
 */
export function isWithinGeofence(
  userLat: number,
  userLng: number,
  fenceLat: number,
  fenceLng: number,
  radiusMeters: number
): boolean {
  const distance = haversineDistance(userLat, userLng, fenceLat, fenceLng);
  return distance <= radiusMeters;
}

/**
 * Check if a user is within any of the provided geofences
 * @returns The matching project info or null
 */
export function findMatchingGeofence(
  userLat: number,
  userLng: number,
  geofences: Array<{
    projectId: number;
    lat: number;
    lng: number;
    radius: number;
  }>
): { projectId: number; distance: number } | null {
  for (const fence of geofences) {
    const distance = haversineDistance(userLat, userLng, fence.lat, fence.lng);
    if (distance <= fence.radius) {
      return { projectId: fence.projectId, distance };
    }
  }
  return null;
}
