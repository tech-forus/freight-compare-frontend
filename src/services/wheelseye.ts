// src/services/wheelseye.ts
import { computeWheelseyePrice } from "./wheelseyeEngine";
import { parseDistanceToKm } from "../utils/distanceParser";
import { SPECIAL_VENDOR_IDS, SPECIAL_VENDOR_NAMES, fetchSpecialVendorRating } from "../constants/specialVendors";
import { API_BASE_URL } from "../config/api";

import axios from "axios";

/** --- Types you already use on the page --- */
export type ShipmentBox = {
  count: number;
  length: number;
  width: number;
  height: number;
  weight: number;
};

export type QuoteAny = {
  companyName: string;
  price: number;
  totalCharges: number;
  total: number;
  totalPrice: number;
  isTiedUp?: boolean;
  [k: string]: any;
};

export type WheelseyeBreakdown = {
  price: number;
  weightBreakdown?: {
    actualWeight: number;
    volumetricWeight: number;
    chargeableWeight: number;
  };
  vehicle?: string;
  vehicleLength?: number | string;
  matchedWeight?: number;
  matchedDistance?: number;
  vehiclePricing?: Array<{
    vehicleType: string;
    weight: number;
    maxWeight: number;
    wheelseyePrice: number;
    ftlPrice: number;
  }>;
  vehicleCalculation?: { totalVehiclesRequired?: number };
  loadSplit?: any;
  vehicleBreakdown?: any;
};

/** --- New Pricing Data Types --- */
export type DistanceRange = {
  min: number;
  max: number;
};

export type WeightRange = {
  min: number;
  max: number;
};

export type PricingEntry = {
  distanceRange: DistanceRange;
  price: number;
  _id: string;
};

export type VehiclePricingData = {
  _id: string;
  vehicleType: string;
  weightRange: WeightRange;
  distanceRange: DistanceRange;
  vehicleLength: number;
  pricing: PricingEntry[];
  createdAt: string;
  updatedAt: string;
  __v: number;
};

/** --- Config (use centralized API configuration) --- */
const BASE_URL = API_BASE_URL;

const AUTH_HEADER = (token?: string) =>
  token ? { Authorization: `Bearer ${token}` } : undefined;


/**
 * Calculate pricing using local pricing data instead of API calls
 */
/**
 * Calculate pricing using local pricing data instead of API calls
 * (now uses our JSON + engine instead of WHEELSEYE_PRICING_DATA)
 * 
 * NOTE: chargeableWeight parameter should ALREADY be max(actual, volumetric)
 * This function uses it directly for pricing/vehicle selection
 */
export function calculateLocalWheelseyePrice(
  chargeableWeight: number,
  distanceKm: number,
  shipment: ShipmentBox[]
): WheelseyeBreakdown {
  // PERF: Removed verbose logging

  // Use chargeableWeight for engine calculation (vehicle selection + pricing)
  const engineResult = computeWheelseyePrice(chargeableWeight, distanceKm);

  // Calculate weights from boxes for the breakdown (informational only)
  let totalVolumetricWeight = 0;
  let totalActualWeight = 0;

  shipment.forEach((box) => {
    const volumetric =
      (box.length * box.width * box.height * box.count) / 5000;
    totalVolumetricWeight += volumetric;
    totalActualWeight += box.weight * box.count;
  });

  // finalChargeableWeight should match what was passed in
  const finalChargeableWeight = Math.max(
    totalActualWeight,
    totalVolumetricWeight
  );

  const totalVehiclesRequired = engineResult.vehicles.reduce(
    (sum, v) => sum + v.count,
    0
  );

  // build nice labels: "2 x Eicher 19 ft + Tata Ace"
  const vehicleLabel = engineResult.vehicles
    .map((v) =>
      v.count > 1 ? `${v.count} x ${v.label}` : v.label
    )
    .join(" + ");

  const vehicleLengthLabel = engineResult.vehicles
    .map((v) =>
      v.count > 1 ? `${v.count} x ${v.lengthFt} ft` : `${v.lengthFt} ft`
    )
    .join(" + ");

  const price = engineResult.totalPrice;

  // PERF: Removed verbose logging

  // Detailed per-vehicle pricing (optionally used by UI)
  const vehiclePricing =
    engineResult.vehicles.map((v) => ({
      vehicleType: v.label,
      weight: v.slabWeightKg,
      maxWeight: v.slabWeightKg,
      wheelseyePrice: v.totalPrice, // this type's total
      ftlPrice: Math.round((v.totalPrice * 1.2) / 10) * 10,
    })) || undefined;

  const vehicleBreakdown = engineResult.vehicles;

  return {
    price,
    weightBreakdown: {
      actualWeight: totalActualWeight,
      volumetricWeight: totalVolumetricWeight,
      chargeableWeight: finalChargeableWeight,
    },
    vehicle: vehicleLabel,
    vehicleLength: vehicleLengthLabel,
    matchedWeight: engineResult.chosenWeight,
    matchedDistance: distanceKm,
    vehiclePricing,
    vehicleCalculation: { totalVehiclesRequired },
    loadSplit: null,
    vehicleBreakdown,
  };

}




/**
 * Get vehicle type by weight (fallback function)
 * NOTE: weight parameter should be chargeableWeight (max of actual, volumetric)
 */
function getVehicleByWeight(weight: number): string {
  if (weight <= 1000) return "Tata Ace";
  if (weight <= 1200) return "Pickup";
  if (weight <= 1500) return "10 ft Truck";
  if (weight <= 4000) return "Eicher 14 ft";
  if (weight <= 7000) return "Eicher 19 ft";
  if (weight <= 10000) return "Eicher 20 ft";
  if (weight <= 18000) return "Container 32 ft MXL";
  return "Container 32 ft MXL + Additional Vehicle";
}

/**
 * Get vehicle length by weight (fallback function)
 * NOTE: weight parameter should be chargeableWeight (max of actual, volumetric)
 */
function getVehicleLengthByWeight(weight: number): number {
  if (weight <= 1000) return 7;
  if (weight <= 1200) return 8;
  if (weight <= 1500) return 10;
  if (weight <= 4000) return 14;
  if (weight <= 7000) return 19;
  if (weight <= 10000) return 20;
  return 32;
}

/**
 * Try multiple POST endpoints in order until one succeeds (non-404/400).
 * You can override the first item with VITE_* envs if the backend route is known.
 */
async function postFirstAvailable<T>(
  paths: string[],
  body: any,
  token?: string
): Promise<T> {
  const headers = AUTH_HEADER(token);
  let lastErr: any = null;
  for (const p of paths) {
    try {
      const url = `${BASE_URL}${p}`;
      const res = await axios.post(url, body, { headers });
      return res.data as T;
    } catch (err: any) {
      const status = err?.response?.status;
      // keep trying on 404/400; bubble up other statuses (401/500 etc)
      if (status !== 404 && status !== 400) throw err;
      lastErr = err;
      // continue to next candidate
    }
  }
  throw lastErr ?? new Error("No matching endpoint found");
}

/**
 * Get distance using Google Maps Distance Matrix API via backend
 * This is the ONLY distance calculation method - no fallbacks
 */
export async function getGoogleMapsDistance(
  fromPincode: string,
  toPincode: string,
  token?: string
): Promise<number> {
  // Use centralized API configuration

  // PERF: Removed verbose logging - this function is now rarely called

  const response = await fetch(`${API_BASE_URL}/api/vendor/wheelseye-distance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    },
    body: JSON.stringify({
      origin: fromPincode,
      destination: toPincode
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Google Maps Distance API failed: ${response.status}`, errorText);
    throw new Error(`Google Maps Distance API failed: ${response.status}`);
  }

  const data = await response.json();

  if (typeof data.distanceKm !== 'number' || data.distanceKm <= 0) {
    console.error('❌ Invalid distance received from Google Maps API:', data);
    throw new Error('Invalid distance from Google Maps API');
  }

  // PERF: Removed verbose success logging
  return data.distanceKm;
}

/**
 * Distance provider (optional).
 * NOTE: We DO NOT call any distance endpoint unless an explicit env path is provided.
 * Prefer passing distanceKmOverride to the builder instead.
 */
export async function getDistanceKmByAPI(
  fromPin: string,
  toPin: string,
  token?: string
): Promise<number> {
  const explicit = import.meta.env.VITE_DISTANCE_ENDPOINT; // e.g. "/api/transporter/distance"
  if (!explicit) {
    // No explicit distance endpoint configured — avoid calling loose ends.
    throw new Error("No distance endpoint configured (VITE_DISTANCE_ENDPOINT).");
  }

  const candidates = [
    explicit,                                 // take env first if provided
    "/api/transporter/distance",
    "/api/transporter/getDistance",
    "/api/distance",
    "/distance",
  ].filter(Boolean) as string[];

  const data: any = await postFirstAvailable<any>(
    candidates,
    { fromPincode: fromPin, toPincode: toPin },
    token
  );

  const km =
    Number(
      data?.distanceKm ??
      data?.data?.distanceKm ??
      data?.result?.distanceKm
    ) || 0;

  if (!km) throw new Error("No distance in response");
  return km;
}

/** 
 * Wheelseye price — use local pricing data first, fallback to API 
 * NOTE: chargeableWeight should ALREADY be max(actual, volumetric)
 */
export async function getWheelseyePriceFromDB(
  chargeableWeight: number,
  distanceKm: number,
  shipment: ShipmentBox[],
  token?: string
): Promise<WheelseyeBreakdown> {
  // First, try to calculate using local pricing data
  try {
    // PERF: Removed verbose logging
    const localResult = calculateLocalWheelseyePrice(chargeableWeight, distanceKm, shipment);
    return localResult;
  } catch (localError) {
    // Fallback to API call if local calculation fails - keep warning as this is unusual
    console.warn(`⚠️ Local pricing calculation failed, falling back to API:`, localError);

    // Fallback to API call if local calculation fails
    const explicit = import.meta.env.VITE_WHEELS_PRICE_ENDPOINT; // e.g. "/api/vendor/wheelseye-pricing"
    const candidates = [
      explicit,                                   // env wins if set
      "/api/vendor/wheelseye-pricing",           // correct endpoint
      "/api/wheelseye/pricing",                  // alternative endpoint
    ].filter(Boolean) as string[];

    try {
      const data = await postFirstAvailable<WheelseyeBreakdown>(
        candidates,
        { weight: chargeableWeight, distance: distanceKm, shipment_details: shipment },
        token
      );
      return data;
    } catch (apiError) {
      console.error(`❌ Both local and API pricing calculations failed:`, apiError);

      // Final fallback with basic calculation - use chargeableWeight
      const fallbackPrice = Math.max(3000, Math.round(distanceKm * 25 + chargeableWeight * 2));

      // Calculate weights from shipment for breakdown
      let totalVolumetricWeight = 0;
      let totalActualWeight = 0;
      shipment.forEach((box) => {
        const volumetric = (box.length * box.width * box.height * box.count) / 5000;
        totalVolumetricWeight += volumetric;
        totalActualWeight += box.weight * box.count;
      });

      return {
        price: fallbackPrice,
        weightBreakdown: {
          actualWeight: totalActualWeight,
          volumetricWeight: totalVolumetricWeight,
          chargeableWeight: chargeableWeight
        },
        vehicle: getVehicleByWeight(chargeableWeight),
        vehicleLength: getVehicleLengthByWeight(chargeableWeight),
        matchedWeight: chargeableWeight,
        matchedDistance: distanceKm
      };
    }
  }
}

/**
 * End-to-end builder:
 * - DOES NOT call any distance route unless distanceKmOverride is missing *and* VITE_DISTANCE_ENDPOINT is set.
 * - Prefer passing distance from your /calculate response via distanceKmOverride.
 * 
 * VOLUMETRIC WEIGHT FIX:
 * - Computes chargeableWeight = max(actualWeight, volumetricWeight) BEFORE any pricing calls
 * - All pricing, vehicle selection, and load-split logic uses chargeableWeight
 * - UI values (actualWeight, volumetricWeight) are still returned separately
 */
export async function buildFtlAndWheelseyeQuotes(opts: {
  fromPincode: string;
  toPincode: string;
  shipment: ShipmentBox[];
  totalWeight: number;
  token?: string;
  ekartFallback?: number;
  isWheelseyeServiceArea: (pin: string) => boolean;
  distanceKmOverride?: number; // <── Prefer this; avoids any distance API call
}) {
  const {
    fromPincode,
    toPincode,
    shipment,
    totalWeight,
    token,
    ekartFallback = 32000,
    isWheelseyeServiceArea,
    distanceKmOverride,
  } = opts;

  // 1) Distance: Use provided distance OR call Google Maps API (no fallbacks)
  let distanceKm = parseDistanceToKm(distanceKmOverride);

  // If no valid distance provided, get it from Google Maps API
  if (distanceKm <= 0) {
    console.log('📍 No distance provided, getting from Google Maps API...');
    try {
      distanceKm = await getGoogleMapsDistance(fromPincode, toPincode, token);
    } catch (error) {
      console.error('❌ Failed to get distance from Google Maps API:', error);
      return {
        distanceKm: 0,
        ftlQuote: null,
        wheelseyeQuote: null,
        numbers: { ftlPrice: 0, wheelseyePrice: 0, actualWeight: 0, volumetricWeight: 0, chargeableWeight: 0 },
      };
    }
  } else {
    console.log(`✅ Using provided distance: ${distanceKm} km`);
  }

  // ============================================================================
  // 2) VOLUMETRIC WEIGHT FIX: Compute weights FIRST, before any pricing calls
  // ============================================================================

  // Calculate volumetric weight from shipment boxes
  let totalVolumetricWeight = 0;
  shipment.forEach((box) => {
    const volumetric = (box.length * box.width * box.height * box.count) / 5000;
    totalVolumetricWeight += volumetric;
  });

  // actualWeight = totalWeight passed from caller (sum of box weights)
  // volumetricWeight = calculated from dimensions
  // chargeableWeight = MAX of the two (this is what determines pricing & vehicle)
  const actualWeight = totalWeight;
  const volumetricWeight = totalVolumetricWeight;
  const chargeableWeight = Math.max(actualWeight, volumetricWeight);

  // PERF: Removed verbose weight logging

  // ============================================================================
  // 3) Compute Wheelseye + FTL using CHARGEABLE weight
  // ============================================================================

  let ftlPrice = 0;
  let wheelseyePrice = 0;
  let wheelseyeResult: WheelseyeBreakdown | null = null;

  try {
    // PERF: Removed verbose logging

    // CRITICAL FIX: Use chargeableWeight instead of totalWeight
    wheelseyeResult = await getWheelseyePriceFromDB(
      chargeableWeight,  // ← FIXED: was totalWeight
      distanceKm,
      shipment,
      token
    );

    // Engine now handles ALL weight ranges including >18T
    // No need for manual splitting here
    wheelseyePrice = wheelseyeResult.price;
    ftlPrice = Math.round((wheelseyePrice * 1.2) / 10) * 10;
  } catch (e) {
    console.warn("Wheelseye pricing failed, using fallback:", e);
    ftlPrice = Math.round((ekartFallback * 1.1) / 10) * 10;
    wheelseyePrice = Math.round((ekartFallback * 0.95) / 10) * 10;
  }

  // Check if load is too light for FTL (use chargeableWeight for this check too)
  const tooLight = chargeableWeight < 500;

  // Vehicle selection helpers - use chargeableWeight
  const makeVehicleByWeight = (w: number) =>
    w > 18000
      ? "Container 32 ft MXL + Additional Vehicle"
      : w <= 1000
        ? "Tata Ace"
        : w <= 1500
          ? "Pickup"
          : w <= 2000
            ? "10 ft Truck"
            : w <= 4000
              ? "Eicher 14 ft"
              : w <= 7000
                ? "Eicher 19 ft"
                : w <= 10000
                  ? "Eicher 20 ft"
                  : "Container 32 ft MXL";

  const makeVehicleLen = (w: number) =>
    w > 18000
      ? "32 ft + Additional"
      : w <= 1000
        ? 7
        : w <= 1500
          ? 8
          : w <= 2000
            ? 10
            : w <= 4000
              ? 14
              : w <= 7000
                ? 19
                : w <= 10000
                  ? 20
                  : 32;

  const etaDays = (km: number) => Math.ceil(km / 400);

  // Base quote object - includes all weight values for UI
  const base = {
    actualWeight,
    volumetricWeight,
    chargeableWeight,
    matchedWeight: wheelseyeResult?.matchedWeight ?? chargeableWeight,
    matchedDistance: wheelseyeResult?.matchedDistance ?? distanceKm,
    distance: `${Math.round(distanceKm)} km`,
    originPincode: fromPincode,
    destinationPincode: toPincode,
    isTiedUp: false,
  };

  // ============================================================================
  // 4) Fetch REAL ratings for special vendors from DB (parallel for performance)
  // ============================================================================
  const [localFtlRating, wheelseyeFtlRating] = await Promise.all([
    fetchSpecialVendorRating(SPECIAL_VENDOR_IDS.LOCAL_FTL),
    fetchSpecialVendorRating(SPECIAL_VENDOR_IDS.WHEELSEYE_FTL),
  ]);

  // Build FTL quote - vehicle selection based on chargeableWeight
  const ftlQuote =
    !tooLight && isWheelseyeServiceArea(fromPincode)
      ? {
        ...base,
        message: "",
        isHidden: false,
        transporterData: {
          _id: SPECIAL_VENDOR_IDS.LOCAL_FTL,
          rating: localFtlRating.rating,
          name: SPECIAL_VENDOR_NAMES.LOCAL_FTL,
          type: "FTL"
        },
        companyName: SPECIAL_VENDOR_NAMES.LOCAL_FTL,
        transporterName: SPECIAL_VENDOR_NAMES.LOCAL_FTL,
        category: SPECIAL_VENDOR_NAMES.LOCAL_FTL,
        // Rating fields at quote level for consistency with other vendors
        rating: localFtlRating.rating,
        vendorRatings: localFtlRating.vendorRatings,
        totalRatings: localFtlRating.totalRatings,
        totalCharges: ftlPrice,
        price: ftlPrice,
        total: ftlPrice,
        totalPrice: ftlPrice,
        estimatedTime: etaDays(distanceKm),
        estimatedDelivery: `${etaDays(distanceKm)} Day${etaDays(distanceKm) > 1 ? "s" : ""
          }`,
        deliveryTime: `${etaDays(distanceKm)} Day${etaDays(distanceKm) > 1 ? "s" : ""
          }`,
        // Vehicle selection uses chargeableWeight
        vehicle:
          wheelseyeResult?.vehicle ?? makeVehicleByWeight(chargeableWeight),
        vehicleLength:
          wheelseyeResult?.vehicleLength ?? makeVehicleLen(chargeableWeight),
        loadSplit: wheelseyeResult?.loadSplit ?? null,
        vehicleBreakdown: (wheelseyeResult as any)?.vehicleBreakdown ?? null,
      }
      : null;

  // PERF: Removed verbose logging

  // Normalise vehicle breakdown & vehicleCalculation from wheelseyeResult
  const rawVehicleBreakdown =
    Array.isArray((wheelseyeResult as any)?.vehicleBreakdown)
      ? (wheelseyeResult as any).vehicleBreakdown
      : Array.isArray((wheelseyeResult as any)?.vehicleCalculation?.vehicleBreakdown)
        ? (wheelseyeResult as any).vehicleCalculation.vehicleBreakdown
        : [];

  const normalisedVehicleBreakdown = rawVehicleBreakdown.map((v: any) => ({
    ...v,
    count: v.count ?? 1,
  }));

  const totalVehiclesRequired = normalisedVehicleBreakdown.length
    ? normalisedVehicleBreakdown.reduce(
      (sum: number, v: any) => sum + (v.count ?? 1),
      0
    )
    : undefined;

  const totalVehiclePrice = normalisedVehicleBreakdown.length
    ? normalisedVehicleBreakdown.reduce(
      (sum: number, v: any) => sum + (Number(v.price) || 0),
      0
    )
    : undefined;

  // Build Wheelseye quote - vehicle selection based on chargeableWeight
  const wheelseyeQuote =
    !tooLight && isWheelseyeServiceArea(fromPincode)
      ? {
        ...base,
        message: "",
        isHidden: false,
        transporterData: {
          _id: SPECIAL_VENDOR_IDS.WHEELSEYE_FTL,
          rating: wheelseyeFtlRating.rating,
          name: SPECIAL_VENDOR_NAMES.WHEELSEYE_FTL,
          type: "FTL",
        },
        companyName: SPECIAL_VENDOR_NAMES.WHEELSEYE_FTL,
        transporterName: SPECIAL_VENDOR_NAMES.WHEELSEYE_FTL,
        category: SPECIAL_VENDOR_NAMES.WHEELSEYE_FTL,
        // Rating fields at quote level for consistency with other vendors
        rating: wheelseyeFtlRating.rating,
        vendorRatings: wheelseyeFtlRating.vendorRatings,
        totalRatings: wheelseyeFtlRating.totalRatings,

        totalCharges: wheelseyePrice,
        price: wheelseyePrice,
        total: wheelseyePrice,
        totalPrice: wheelseyePrice,

        estimatedTime: etaDays(distanceKm),
        estimatedDelivery: `${etaDays(distanceKm)} Day${etaDays(distanceKm) > 1 ? "s" : ""
          }`,
        deliveryTime: `${etaDays(distanceKm)} Day${etaDays(distanceKm) > 1 ? "s" : ""
          }`,

        // Vehicle selection uses chargeableWeight
        vehicle:
          wheelseyeResult?.vehicle ?? makeVehicleByWeight(chargeableWeight),
        vehicleLength:
          wheelseyeResult?.vehicleLength ??
          makeVehicleLen(chargeableWeight),

        // Legacy LTL-style splitting (will only be used when no FTL combo)
        loadSplit: wheelseyeResult?.loadSplit ?? null,

        // Flat vehicleBreakdown for UI
        vehicleBreakdown:
          normalisedVehicleBreakdown.length > 0
            ? normalisedVehicleBreakdown
            : null,

        // Nested vehicleCalculation for UI + future logic
        vehicleCalculation: {
          ...(wheelseyeResult as any)?.vehicleCalculation,
          vehicleBreakdown: normalisedVehicleBreakdown,
          totalVehiclesRequired:
            totalVehiclesRequired ??
            (wheelseyeResult as any)?.vehicleCalculation
              ?.totalVehiclesRequired,
          totalPrice: totalVehiclePrice ?? wheelseyePrice,
        },
      }
      : null;

  // PERF: Removed verbose debug logging

  return {
    distanceKm,
    ftlQuote,
    wheelseyeQuote,
    numbers: {
      ftlPrice,
      wheelseyePrice,
      actualWeight,
      volumetricWeight,
      chargeableWeight,
    },
    wheelseyeRaw: wheelseyeResult,
  };
}