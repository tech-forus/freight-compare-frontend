/**
 * Special Vendor Constants
 *
 * Special vendors are client-side injected vendors that don't exist in the database.
 * They have fixed string IDs that are recognized by both frontend and backend.
 *
 * These vendors:
 * - Wheelseye FTL: Our trusted FTL partner for pan-India full truck load services
 * - LOCAL FTL: Local FTL services with competitive pricing
 */

/**
 * Fixed string IDs for special vendors.
 * These must match the backend constants in vendorRatingModel.js
 */
export const SPECIAL_VENDOR_IDS = {
  WHEELSEYE_FTL: "wheelseye-ftl-transporter",
  LOCAL_FTL: "local-ftl-transporter",
} as const;

/**
 * Special vendor names (used for display and identification)
 */
export const SPECIAL_VENDOR_NAMES = {
  WHEELSEYE_FTL: "Wheelseye FTL",
  LOCAL_FTL: "LOCAL FTL",
} as const;

/**
 * Type for special vendor IDs
 */
export type SpecialVendorId = typeof SPECIAL_VENDOR_IDS[keyof typeof SPECIAL_VENDOR_IDS];

/**
 * Type for vendor types used in rating system
 */
export type VendorType = "regular" | "temporary" | "special";

/**
 * Check if a vendorId is a special vendor
 * @param vendorId - The vendor ID to check
 * @returns True if it's a special vendor ID
 */
export const isSpecialVendorId = (vendorId: string | undefined | null): boolean => {
  if (!vendorId) return false;
  return Object.values(SPECIAL_VENDOR_IDS).includes(vendorId as SpecialVendorId);
};

/**
 * Check if a company name is a special vendor
 * @param companyName - The company name to check
 * @returns True if it's a special vendor
 */
export const isSpecialVendorName = (companyName: string | undefined | null): boolean => {
  if (!companyName) return false;
  return Object.values(SPECIAL_VENDOR_NAMES).includes(companyName as any);
};

/**
 * Get the vendor ID for a special vendor by name
 * @param companyName - The company name
 * @returns The vendor ID or null if not a special vendor
 */
export const getSpecialVendorIdByName = (companyName: string | undefined | null): SpecialVendorId | null => {
  if (!companyName) return null;
  if (companyName === SPECIAL_VENDOR_NAMES.WHEELSEYE_FTL) return SPECIAL_VENDOR_IDS.WHEELSEYE_FTL;
  if (companyName === SPECIAL_VENDOR_NAMES.LOCAL_FTL) return SPECIAL_VENDOR_IDS.LOCAL_FTL;
  return null;
};

/**
 * Get the vendor name from a special vendor ID
 * @param vendorId - The vendor ID
 * @returns The vendor name or null if not a special vendor
 */
export const getSpecialVendorNameById = (vendorId: string | undefined | null): string | null => {
  if (!vendorId) return null;
  if (vendorId === SPECIAL_VENDOR_IDS.WHEELSEYE_FTL) return SPECIAL_VENDOR_NAMES.WHEELSEYE_FTL;
  if (vendorId === SPECIAL_VENDOR_IDS.LOCAL_FTL) return SPECIAL_VENDOR_NAMES.LOCAL_FTL;
  return null;
};

/**
 * Default rating for special vendors (used when no ratings exist yet)
 */
export const SPECIAL_VENDOR_DEFAULT_RATING = 4.6;
