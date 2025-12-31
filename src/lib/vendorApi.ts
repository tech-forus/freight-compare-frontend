// frontend/src/lib/vendorApi.ts

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

// Resolve API base from (1) explicit param, (2) Vite env, (3) CRA env, (4) localhost
function resolveApiBase(explicit?: string): string {
  if (explicit) return stripTrailingSlash(explicit);

  // Prefer VITE_API_URL, but also support old names
  let viteBase: string | undefined;
  // @ts-ignore
  if (typeof import.meta !== "undefined" && (import.meta as any).env) {
    // @ts-ignore
    const env = (import.meta as any).env;
    viteBase =
      env.VITE_API_URL ||
      env.VITE_API_BASE_URL ||    // legacy
      undefined;
  }
  if (viteBase) return stripTrailingSlash(String(viteBase));

  // CRA fallback
  // @ts-ignore
  const craBase = typeof process !== "undefined"
    ? (process as any)?.env?.REACT_APP_URL
    : undefined;
  if (craBase) return stripTrailingSlash(String(craBase));

  return "http://localhost:8000";
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
