import axios from 'axios';
import pinMap from '../src/utils/pincodeMap.js';

// In-memory cache: { "110020-560060": { estTime, distance, timestamp } }
const distanceCache = new Map();
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * 🎯 SINGLE SOURCE OF TRUTH for Distance Calculation
 *
 * ⚠️ CRITICAL: This is the ONLY place distance calculation should be implemented.
 * ⚠️ DO NOT copy this function to other files
 * ⚠️ DO NOT create local distance calculation functions
 * ⚠️ ALWAYS import from this file
 *
 * Uses Google Maps Distance Matrix API with 30-day in-memory cache.
 * NO haversine fallback - throws error if no road route exists.
 *
 * @example
 * import { calculateDistanceBetweenPincode } from '../utils/distanceService.js';
 * const { estTime, distance, distanceKm } = await calculateDistanceBetweenPincode('110020', '560060');
 * // Returns: { estTime: "6", distance: "2100 km", distanceKm: 2100 }
 *
 * @param {string|number} originPincode - Origin pincode (e.g., "110020")
 * @param {string|number} destinationPincode - Destination pincode (e.g., "560060")
 * @returns {Promise<{estTime: string, distance: string, distanceKm: number}>}
 * @throws {Error} NO_ROAD_ROUTE - No direct road connection exists (e.g., islands)
 * @throws {Error} PINCODE_NOT_FOUND - Pincode doesn't exist in database
 * @throws {Error} API_KEY_MISSING - GOOGLE_MAP_API_KEY not configured
 * @throws {Error} GOOGLE_API_ERROR - Google Maps API returned error
 * @throws {Error} API_TIMEOUT - Request took >8 seconds
 */
export const calculateDistanceBetweenPincode = async (originPincode, destinationPincode) => {
  const origin = String(originPincode);
  const destination = String(destinationPincode);

  // Check cache first
  const cacheKey = `${origin}-${destination}`;
  const cached = distanceCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    return { estTime: cached.estTime, distance: cached.distance, distanceKm: cached.distanceKm };
  }

  // Validate pincodes exist
  if (!pinMap[origin]) {
    const err = new Error(`Origin pincode ${origin} not found in database`);
    err.code = 'PINCODE_NOT_FOUND';
    err.field = 'origin';
    throw err;
  }
  if (!pinMap[destination]) {
    const err = new Error(`Destination pincode ${destination} not found in database`);
    err.code = 'PINCODE_NOT_FOUND';
    err.field = 'destination';
    throw err;
  }

  // Check API key
  const key = process.env.GOOGLE_MAP_API_KEY;
  if (!key) {
    const err = new Error('GOOGLE_MAP_API_KEY not configured');
    err.code = 'API_KEY_MISSING';
    throw err;
  }

  // Call Google Maps API
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${key}&mode=driving&region=in`;
    const { data } = await axios.get(url, { timeout: 8000 });

    if (data.status !== 'OK') {
      const err = new Error(`Google Maps API error: ${data.status}`);
      err.code = 'GOOGLE_API_ERROR';
      throw err;
    }

    const element = data.rows?.[0]?.elements?.[0];
    if (!element) {
      const err = new Error('No route data from API');
      err.code = 'NO_ROUTE_DATA';
      throw err;
    }

    // Check if road route exists
    if (element.status === 'ZERO_RESULTS' || element.status === 'NOT_FOUND') {
      const err = new Error(`No direct road route exists between ${origin} and ${destination}. These locations cannot be connected by road transport.`);
      err.code = 'NO_ROAD_ROUTE';
      err.origin = origin;
      err.destination = destination;
      throw err;
    }

    if (element.status !== 'OK') {
      const err = new Error(`Route error: ${element.status}`);
      err.code = 'ROUTE_ERROR';
      throw err;
    }

    const distanceMeters = element.distance?.value;
    if (!distanceMeters) {
      const err = new Error('Distance not found in API response');
      err.code = 'DISTANCE_NOT_FOUND';
      throw err;
    }

    const distanceKm = Math.round(distanceMeters / 1000);
    const estTime = String(Math.max(1, Math.ceil(distanceKm / 400)));

    // Cache result
    const result = { estTime, distance: `${distanceKm} km`, distanceKm, timestamp: Date.now() };
    distanceCache.set(cacheKey, result);

    console.log(`✅ Distance: ${origin}→${destination} = ${distanceKm} km (${estTime} days)`);
    return { estTime, distance: `${distanceKm} km`, distanceKm };

  } catch (err) {
    // Rethrow custom errors
    if (err.code && (err.code.startsWith('PINCODE_') || err.code === 'NO_ROAD_ROUTE' || err.code === 'API_KEY_MISSING' || err.code.startsWith('GOOGLE_') || err.code.startsWith('ROUTE_') || err.code.startsWith('DISTANCE_'))) {
      throw err;
    }
    // Network errors
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      const newErr = new Error('Google Maps API request timed out');
      newErr.code = 'API_TIMEOUT';
      throw newErr;
    }
    // Generic error
    console.error('Distance calculation failed:', err.message);
    const newErr = new Error(`Failed to calculate distance: ${err.message}`);
    newErr.code = 'CALC_ERROR';
    throw newErr;
  }
};

/**
 * Get coordinates for a pincode
 * @param {string|number} pincode - The pincode to get coordinates for
 * @returns {Object|null} Object with lat and lng, or null if not found
 */
export const getPincodeCoordinates = (pincode) => {
  const pincodeStr = String(pincode);
  return pinMap[pincodeStr] || null;
};
