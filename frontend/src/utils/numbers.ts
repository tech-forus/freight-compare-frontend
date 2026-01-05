/**
 * Numeric utility functions for AddVendor v2
 * Handles conversion, rounding, and validation of numeric inputs
 */

/**
 * Check if a string matches the 2-decimal pattern
 * Allows: "123", "123.4", "123.45", ""
 * Rejects: "123.456", "abc", "12.3.4"
 *
 * @param s - String to validate
 * @returns true if valid 2-decimal format
 */
export const isTwoDecimal = (s: string): boolean => {
  return /^(\d+(\.\d{0,2})?)?$/.test(s);
};

/**
 * Round a value to 2 decimal places
 * Returns 0 for non-finite values
 *
 * @param v - Value to round (any type)
 * @returns Number rounded to 2 decimal places
 */
export const to2dp = (v: unknown): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
};

/**
 * Convert a value to number or return 0
 * Parses and rounds to 2 decimal places
 *
 * @param v - Value to convert
 * @returns Number rounded to 2dp, or 0 if invalid
 */
export const toNumberOrZero = (v: unknown): number => {
  const n = Number(v);
  if (!Number.isFinite(n) || isNaN(n)) return 0;
  return to2dp(n);
};

/**
 * Normalize zone rates matrix recursively
 * Ensures all values are numbers rounded to 2dp
 *
 * @param zoneRates - Zone rates object (can be nested)
 * @returns Normalized zone rates with all values as numbers
 */
export const normalizeZoneRates = (
  zoneRates: Record<string, unknown>
): Record<string, Record<string, number>> => {
  const result: Record<string, Record<string, number>> = {};

  for (const [fromZone, toZones] of Object.entries(zoneRates)) {
    if (typeof toZones === 'object' && toZones !== null && !Array.isArray(toZones)) {
      result[fromZone] = {};
      for (const [toZone, price] of Object.entries(toZones)) {
        result[fromZone][toZone] = to2dp(price);
      }
    }
  }

  return result;
};

/**
 * Format number for display with 2 decimal places
 *
 * @param v - Value to format
 * @returns Formatted string
 */
export const formatTo2dp = (v: unknown): string => {
  return to2dp(v).toFixed(2);
};

/**
 * Check if a value is a valid number within range
 *
 * @param v - Value to check
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @returns true if valid
 */
export const isNumberInRange = (
  v: unknown,
  min: number = 0,
  max: number = Infinity
): boolean => {
  const n = Number(v);
  if (!Number.isFinite(n) || isNaN(n)) return false;
  return n >= min && n <= max;
};

/**
 * Clamp a value to a range
 *
 * @param v - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 * @returns Clamped value
 */
export const clamp = (v: number, min: number, max: number): number => {
  return Math.min(Math.max(v, min), max);
};

/**
 * Convert inches to centimeters
 *
 * @param inches - Value in inches
 * @returns Value in centimeters
 */
export const convertInchToCm = (inches: number): number => {
  return to2dp(inches * 2.54);
};

/**
 * Convert centimeters to inches
 *
 * @param cm - Value in centimeters
 * @returns Value in inches
 */
export const convertCmToInch = (cm: number): number => {
  return to2dp(cm / 2.54);
};

/**
 * Parse a numeric string, allowing for common formatting
 * Strips whitespace and handles decimal points
 *
 * @param s - String to parse
 * @returns Parsed number or NaN
 */
export const parseNumeric = (s: string): number => {
  const cleaned = s.trim().replace(/,/g, '');
  return parseFloat(cleaned);
};

/**
 * Check if a string is empty or whitespace only
 *
 * @param s - String to check
 * @returns true if empty or whitespace
 */
export const isEmpty = (s: string): boolean => {
  return s.trim().length === 0;
};
