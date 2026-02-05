// src/utils/inputs.ts
export function sanitizeDigitsOnly(raw: string): string {
  return raw.replace(/\D+/g, ''); // remove non-digit chars
}

/**
 * Clamp numeric string to [min,max]. Returns '' for empty input.
 * Also optionally enforce a maximum number of digits (digitLimit).
 */
export function clampNumericString(raw: string, min: number, max: number, digitLimit?: number): string {
  const digits = sanitizeDigitsOnly(raw);
  if (digits === '') return '';
  const limited = typeof digitLimit === 'number' ? digits.slice(0, digitLimit) : digits;
  const n = Number(limited);
  if (Number.isNaN(n)) return '';
  const clamped = Math.min(Math.max(n, min), max);
  return String(clamped);
}
