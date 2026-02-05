/**
 * Draft persistence store for AddVendor v2
 * Manages localStorage-based draft saving and loading
 */

import { Charges, Geo, VolumetricConfig, ZoneRateMatrix } from '../utils/validators';
import { emitDebug, emitDebugError } from '../utils/debug';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Vendor basics (company and contact info)
 */
/**
 * Individual vendor rating parameters (1-5 scale)
 */
export interface VendorRatings {
  priceSupport: number;
  deliveryTime: number;
  tracking: number;
  salesSupport: number;
  damageLoss: number;
}

export interface VendorBasics {
  companyName: string;
  contactPersonName: string;
  vendorPhoneNumber: string;
  vendorEmailAddress: string;
  gstin?: string;
  transportMode: 'road' | 'air' | 'rail' | 'ship';
  displayName: string;
  subVendor: string;
  vendorCode: string;
  primaryContactName: string;
  primaryContactPhone: string;
  primaryContactEmail: string;
  address: string;
  serviceMode: 'FTL' | 'LTL' | null;
  companyRating: number | null;
  // Individual rating parameters
  vendorRatings: VendorRatings;
}

/**
 * Complete draft structure
 */
export interface VendorDraft {
  basics?: Partial<VendorBasics>;
  geo?: Partial<Geo>;
  volumetric?: Partial<VolumetricConfig>;
  charges?: Partial<Charges>;
  zoneRates?: Partial<ZoneRateMatrix>;
  lastSaved?: string; // ISO timestamp
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DRAFT_KEY = 'addVendorV2_draft';
const CACHE_KEY = 'addVendorV2_cache';

// =============================================================================
// DRAFT OPERATIONS
// =============================================================================

/**
 * Read draft from localStorage
 *
 * @returns Draft object or null if not found
 */
export const readDraft = (): VendorDraft | null => {
  try {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (!stored) return null;

    const draft: VendorDraft = JSON.parse(stored);
    emitDebug('DRAFT_READ', {
      hasBasics: !!draft.basics,
      hasGeo: !!draft.geo,
      hasVolumetric: !!draft.volumetric,
      hasCharges: !!draft.charges,
      hasZoneRates: !!draft.zoneRates,
      lastSaved: draft.lastSaved,
    });

    return draft;
  } catch (error) {
    emitDebugError('DRAFT_READ_ERROR', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

/**
 * Write draft to localStorage
 *
 * @param draft - Draft object to save
 */
export const writeDraft = (draft: VendorDraft): void => {
  try {
    draft.lastSaved = new Date().toISOString();
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    emitDebug('DRAFT_WRITE', {
      hasBasics: !!draft.basics,
      hasGeo: !!draft.geo,
      hasVolumetric: !!draft.volumetric,
      hasCharges: !!draft.charges,
      hasZoneRates: !!draft.zoneRates,
      timestamp: draft.lastSaved,
    });
  } catch (error) {
    emitDebugError('DRAFT_WRITE_ERROR', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Persist partial draft (merge with existing)
 *
 * @param patch - Partial draft to merge
 */
export const persistDraft = (patch: Partial<VendorDraft>): void => {
  try {
    const existing = readDraft() || {};
    const merged: VendorDraft = {
      ...existing,
      ...patch,
      lastSaved: new Date().toISOString(),
    };

    // Deep merge for nested objects
    if (patch.basics) {
      merged.basics = { ...existing.basics, ...patch.basics };
    }
    if (patch.geo) {
      merged.geo = { ...existing.geo, ...patch.geo };
    }
    if (patch.volumetric) {
      merged.volumetric = { ...existing.volumetric, ...patch.volumetric };
    }
    if (patch.charges) {
      merged.charges = { ...existing.charges, ...patch.charges };
    }
    if (patch.zoneRates) {
      merged.zoneRates = { ...existing.zoneRates, ...patch.zoneRates };
    }

    writeDraft(merged);
  } catch (error) {
    emitDebugError('DRAFT_PERSIST_ERROR', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Clear draft from localStorage
 */
export const clearDraft = (): void => {
  try {
    localStorage.removeItem(DRAFT_KEY);
    emitDebug('DRAFT_CLEARED');
  } catch (error) {
    emitDebugError('DRAFT_CLEAR_ERROR', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

// =============================================================================
// CACHE OPERATIONS (for pincode lookups, etc.)
// =============================================================================

/**
 * Pincode cache entry
 */
interface PincodeCacheEntry {
  pincode: string;
  state: string;
  city: string;
  timestamp: number;
}

/**
 * Pincode cache (in-memory + localStorage)
 */
const pincodeCache = new Map<string, PincodeCacheEntry>();

/**
 * Load pincode cache from localStorage
 */
const loadPincodeCache = (): void => {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (!stored) return;

    const data: PincodeCacheEntry[] = JSON.parse(stored);
    const now = Date.now();
    const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

    data.forEach((entry) => {
      // Only load entries that aren't stale
      if (now - entry.timestamp < MAX_AGE) {
        pincodeCache.set(entry.pincode, entry);
      }
    });

    emitDebug('CACHE_LOADED', { count: pincodeCache.size });
  } catch (error) {
    emitDebugError('CACHE_LOAD_ERROR', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Save pincode cache to localStorage
 */
const savePincodeCache = (): void => {
  try {
    const data = Array.from(pincodeCache.values());
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    emitDebug('CACHE_SAVED', { count: data.length });
  } catch (error) {
    emitDebugError('CACHE_SAVE_ERROR', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Get pincode from cache
 *
 * @param pincode - Pincode to lookup
 * @returns Cache entry or null if not found
 */
export const getCachedPincode = (
  pincode: string
): Omit<PincodeCacheEntry, 'timestamp'> | null => {
  if (!pincodeCache.size) {
    loadPincodeCache();
  }

  const entry = pincodeCache.get(pincode);
  if (!entry) return null;

  // Check if stale (7 days)
  const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - entry.timestamp > MAX_AGE) {
    pincodeCache.delete(pincode);
    return null;
  }

  emitDebug('CACHE_HIT', { pincode });
  return {
    pincode: entry.pincode,
    state: entry.state,
    city: entry.city,
  };
};

/**
 * Cache pincode lookup result
 *
 * @param pincode - Pincode
 * @param state - State name
 * @param city - City name
 */
export const cachePincode = (
  pincode: string,
  state: string,
  city: string
): void => {
  pincodeCache.set(pincode, {
    pincode,
    state,
    city,
    timestamp: Date.now(),
  });

  emitDebug('CACHE_SET', { pincode, state, city });

  // Throttle saves (don't save on every cache set)
  // In a real app, you might debounce this
  savePincodeCache();
};

/**
 * Clear pincode cache
 */
export const clearPincodeCache = (): void => {
  pincodeCache.clear();
  localStorage.removeItem(CACHE_KEY);
  emitDebug('CACHE_CLEARED');
};
