// src/utils/mapProjection.ts
// Shared map projection utilities for converting lat/lng to SVG coordinates

// =============================================================================
// India Geographic Bounds (WGS84)
// =============================================================================
export const INDIA_GEO_BOUNDS = {
  minLat: 8.0,    // Kanyakumari (southernmost)
  maxLat: 37.5,   // Jammu & Kashmir / Ladakh (northernmost)
  minLng: 68.0,   // Gujarat (westernmost)
  maxLng: 97.5,   // Arunachal Pradesh (easternmost)
} as const;

// =============================================================================
// SVG ViewBox Dimensions (matches india_paths.ts)
// =============================================================================
export const INDIA_SVG_VIEWBOX = {
  width: 612,
  height: 696,
} as const;

// =============================================================================
// Type Definitions
// =============================================================================
export interface LatLng {
  lat: number;
  lng: number;
}

export interface SvgPoint {
  x: number;
  y: number;
}

export interface CentroidEntry {
  pincode: string;
  lat: number;
  lng: number;
}

// =============================================================================
// Core Projection Function
// =============================================================================
/**
 * Converts geographic coordinates (lat/lng) to SVG pixel coordinates.
 * Uses linear interpolation with Y-axis inversion (SVG y=0 is top, lat increases upward).
 *
 * Formula:
 *   x = ((lng - minLng) / (maxLng - minLng)) * svgWidth
 *   y = ((maxLat - lat) / (maxLat - minLat)) * svgHeight
 */
export function latLngToSvg(
  lat: number,
  lng: number,
  viewBox = INDIA_SVG_VIEWBOX,
  geoBounds = INDIA_GEO_BOUNDS
): SvgPoint {
  // Clamp to India's bounds to prevent points outside the map
  const clampedLat = Math.max(geoBounds.minLat, Math.min(geoBounds.maxLat, lat));
  const clampedLng = Math.max(geoBounds.minLng, Math.min(geoBounds.maxLng, lng));

  // Normalize and scale
  const x = ((clampedLng - geoBounds.minLng) / (geoBounds.maxLng - geoBounds.minLng)) * viewBox.width;
  const y = ((geoBounds.maxLat - clampedLat) / (geoBounds.maxLat - geoBounds.minLat)) * viewBox.height;

  return { x, y };
}

/**
 * Overload accepting LatLng object
 */
export function latLngToSvgFromCoords(
  coords: LatLng,
  viewBox = INDIA_SVG_VIEWBOX,
  geoBounds = INDIA_GEO_BOUNDS
): SvgPoint {
  return latLngToSvg(coords.lat, coords.lng, viewBox, geoBounds);
}

// =============================================================================
// Centroid Cache & Lookup
// =============================================================================
let centroidMap: Map<string, LatLng> | null = null;
let loadPromise: Promise<Map<string, LatLng>> | null = null;

/**
 * Loads pincode centroids from the public JSON file.
 * Returns a Map for O(1) lookup. Caches result for subsequent calls.
 */
export async function loadCentroids(): Promise<Map<string, LatLng>> {
  if (centroidMap) return centroidMap;

  if (loadPromise) return loadPromise;

  loadPromise = fetch('/pincode_centroids.json', { cache: 'force-cache' })
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load centroids: ${res.status}`);
      return res.json();
    })
    .then((data: CentroidEntry[]) => {
      const map = new Map<string, LatLng>();
      for (const entry of data) {
        if (entry.pincode && typeof entry.lat === 'number' && typeof entry.lng === 'number') {
          map.set(entry.pincode, { lat: entry.lat, lng: entry.lng });
        }
      }
      centroidMap = map;
      console.log(`✅ Centroids loaded: ${map.size} pincodes`);
      return map;
    })
    .catch(err => {
      console.error('Failed to load pincode centroids:', err);
      loadPromise = null;
      return new Map<string, LatLng>();
    });

  return loadPromise;
}

/**
 * Synchronous lookup - returns null if centroids not yet loaded or pincode not found.
 * Use after loadCentroids() has resolved.
 */
export function getCentroid(pincode: string): LatLng | null {
  if (!centroidMap) return null;
  return centroidMap.get(pincode) || null;
}

/**
 * Gets SVG coordinates for a pincode. Returns null if pincode not found.
 */
export function getPincodeSvgPoint(
  pincode: string,
  viewBox = INDIA_SVG_VIEWBOX
): SvgPoint | null {
  const coords = getCentroid(pincode);
  if (!coords) return null;
  return latLngToSvg(coords.lat, coords.lng, viewBox);
}

// =============================================================================
// Fallback: Prefix-based approximation (for cases where exact pincode not found)
// =============================================================================
const REGION_CENTERS: Record<string, LatLng> = {
  '1': { lat: 28.7, lng: 77.1 },   // North (Delhi NCR, Punjab, Haryana)
  '2': { lat: 27.0, lng: 80.0 },   // UP, Uttarakhand
  '3': { lat: 25.5, lng: 73.5 },   // Rajasthan
  '4': { lat: 19.5, lng: 75.5 },   // Maharashtra, Goa
  '5': { lat: 16.5, lng: 79.5 },   // Andhra, Telangana, Karnataka
  '6': { lat: 11.0, lng: 78.0 },   // Tamil Nadu, Kerala
  '7': { lat: 23.0, lng: 87.5 },   // West Bengal, Odisha
  '8': { lat: 25.5, lng: 85.5 },   // Bihar, Jharkhand
  '9': { lat: 26.0, lng: 92.0 },   // Northeast
};

/**
 * Fallback lookup using first digit of pincode when exact match not found.
 */
export function getCentroidWithFallback(pincode: string): LatLng | null {
  // Try exact match first
  const exact = getCentroid(pincode);
  if (exact) return exact;

  // Fallback to region center based on first digit
  if (pincode.length > 0) {
    const firstDigit = pincode.charAt(0);
    return REGION_CENTERS[firstDigit] || null;
  }

  return null;
}

/**
 * Gets SVG point with fallback to region centers.
 */
export function getPincodeSvgPointWithFallback(
  pincode: string,
  viewBox = INDIA_SVG_VIEWBOX
): SvgPoint | null {
  const coords = getCentroidWithFallback(pincode);
  if (!coords) return null;
  return latLngToSvg(coords.lat, coords.lng, viewBox);
}
