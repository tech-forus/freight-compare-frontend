// frontend/src/lib/vendorApi.ts
import { API_BASE_URL } from "../config/api";

// Types for server responses
export interface WheelseyeSlabInfo {
  weightKg: number;
  distanceKm: number;
}

export interface WheelseyePriceResponse {
  vendor: string;              // "Wheelseye FTL"
  mode: "FTL";
  price: number;
  distanceKm: number;
  weightKg: number;
  slab: WheelseyeSlabInfo;
  breakdown: Record<string, number>;
}

export interface WheelseyeDistanceResponse {
  distanceKm: number;
  raw?: unknown;
}

function stripTrailingSlash(url: string) {
  return url.replace(/\/+$/, "");
}

// Resolve API base from (1) explicit param, (2) centralized config
function resolveApiBase(explicit?: string): string {
  if (explicit) return stripTrailingSlash(explicit);

  // Use centralized API configuration
  return API_BASE_URL;
}

// Shared fetch wrapper
async function jsonOrThrow<T>(resp: Response): Promise<T> {
  if (resp.ok) return (resp.json() as Promise<T>);
  let msg = `HTTP ${resp.status}`;
  try {
    const j = await resp.json();
    if ((j as any)?.error) msg = (j as any).error;
  } catch {
    // ignore parse errors
  }
  throw new Error(msg);
}

/**
 * Get Wheelseye FTL price from server (client supplies weight & distance).
 * Server path: POST /api/vendor/wheelseye-pricing
 */
export async function fetchWheelseyePrice(
  weightKg: number,
  distanceKm: number,
  apiBase?: string
): Promise<WheelseyePriceResponse> {
  const base = resolveApiBase(apiBase);
  const resp = await fetch(`${base}/api/vendor/wheelseye-pricing`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weightKg, distanceKm }),
    credentials: "include",
  });
  return jsonOrThrow<WheelseyePriceResponse>(resp);
}

/**
 * Ask server to compute distance (Google/other). Sends both key styles.
 * Server path: POST /api/vendor/wheelseye-distance
 */
export async function fetchWheelseyeDistance(
  origin: string,        // e.g., "110001"
  destination: string,   // e.g., "560001"
  apiBase?: string
): Promise<WheelseyeDistanceResponse> {
  const base = resolveApiBase(apiBase);
  const body = {
    origin,
    destination,
    // also send pincode aliases in case the server expects these names
    originPincode: origin,
    destinationPincode: destination,
  };

  const resp = await fetch(`${base}/api/vendor/wheelseye-distance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  return jsonOrThrow<WheelseyeDistanceResponse>(resp);
}
