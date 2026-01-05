/**
 * useZoneRates hook
 * Manages zone rate matrix state and validation
 */

import { useState, useCallback, useEffect } from 'react';
import { ZoneRateMatrix, validateZoneRatesCompleteness } from '../utils/validators';
import { normalizeZoneRates, to2dp } from '../utils/numbers';
import { persistDraft } from '../store/draftStore';
import { emitDebug } from '../utils/debug';

// =============================================================================
// TYPES
// =============================================================================

export interface UseZoneRatesReturn {
  zoneRates: ZoneRateMatrix;
  error: string;
  setZoneRate: (fromZone: string, toZone: string, rate: number) => void;
  getZoneRate: (fromZone: string, toZone: string) => number | undefined;
  setAllRatesForFromZone: (fromZone: string, rates: Record<string, number>) => void;
  validateZoneRates: () => boolean;
  normalizeAndValidate: () => boolean;
  reset: () => void;
  loadFromDraft: (draft: Partial<ZoneRateMatrix>) => void;
  initializeZones: (fromZones: string[], toZones: string[]) => void;
  isEmpty: boolean;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing zone rate matrix
 *
 * @param onUpdate - Optional callback when state changes
 * @returns Zone rates state and methods
 */
export const useZoneRates = (
  onUpdate?: (zoneRates: ZoneRateMatrix) => void
): UseZoneRatesReturn => {
  const [zoneRates, setZoneRates] = useState<ZoneRateMatrix>({});
  const [error, setError] = useState('');

  // Throttled draft persistence
  useEffect(() => {
    const timer = setTimeout(() => {
      persistDraft({ zoneRates });
      emitDebug('ZONE_RATES_DRAFT_SAVED', {
        fromZoneCount: Object.keys(zoneRates).length,
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [zoneRates]);

  // Notify parent of updates
  useEffect(() => {
    if (onUpdate) {
      onUpdate(zoneRates);
    }
  }, [zoneRates, onUpdate]);

  /**
   * Check if zone rates are empty
   */
  const isEmpty = Object.keys(zoneRates).length === 0;

  /**
   * Initialize zone matrix with from/to zones
   */
  const initializeZones = useCallback(
    (fromZones: string[], toZones: string[]) => {
      const initialized: ZoneRateMatrix = {};

      fromZones.forEach((fromZone) => {
        initialized[fromZone] = {};
        toZones.forEach((toZone) => {
          initialized[fromZone][toZone] = 0;
        });
      });

      setZoneRates(initialized);
      emitDebug('ZONE_RATES_INITIALIZED', {
        fromZones,
        toZones,
        totalCells: fromZones.length * toZones.length,
      });
    },
    []
  );

  /**
   * Set a single zone rate
   */
  const setZoneRate = useCallback(
    (fromZone: string, toZone: string, rate: number) => {
      const normalizedRate = to2dp(rate);

      setZoneRates((prev) => {
        // Ensure fromZone object exists
        if (!prev[fromZone]) {
          prev[fromZone] = {};
        }

        return {
          ...prev,
          [fromZone]: {
            ...prev[fromZone],
            [toZone]: normalizedRate,
          },
        };
      });

      emitDebug('ZONE_RATE_SET', { fromZone, toZone, rate: normalizedRate });
      setError(''); // Clear error on successful set
    },
    []
  );

  /**
   * Get a single zone rate
   */
  const getZoneRate = useCallback(
    (fromZone: string, toZone: string): number | undefined => {
      return zoneRates[fromZone]?.[toZone];
    },
    [zoneRates]
  );

  /**
   * Set all rates for a from-zone at once
   */
  const setAllRatesForFromZone = useCallback(
    (fromZone: string, rates: Record<string, number>) => {
      const normalizedRates: Record<string, number> = {};
      for (const [toZone, rate] of Object.entries(rates)) {
        normalizedRates[toZone] = to2dp(rate);
      }

      setZoneRates((prev) => ({
        ...prev,
        [fromZone]: normalizedRates,
      }));

      emitDebug('ZONE_RATES_SET_ALL_FOR_FROM', {
        fromZone,
        toZoneCount: Object.keys(rates).length,
      });
      setError(''); // Clear error on successful set
    },
    []
  );

  /**
   * Validate zone rates
   */
  const validateZoneRates = useCallback((): boolean => {
    const validationError = validateZoneRatesCompleteness(zoneRates);
    if (validationError) {
      setError(validationError);
      emitDebug('ZONE_RATES_VALIDATION_FAILED', { error: validationError });
      return false;
    }

    setError('');
    emitDebug('ZONE_RATES_VALIDATION_PASSED');
    return true;
  }, [zoneRates]);

  /**
   * Normalize and validate zone rates
   * Ensures all values are numbers rounded to 2dp
   */
  const normalizeAndValidate = useCallback((): boolean => {
    const normalized = normalizeZoneRates(zoneRates);
    setZoneRates(normalized);

    emitDebug('ZONE_RATES_NORMALIZED', {
      fromZoneCount: Object.keys(normalized).length,
    });

    // Validate after normalization
    const validationError = validateZoneRatesCompleteness(normalized);
    if (validationError) {
      setError(validationError);
      emitDebug('ZONE_RATES_VALIDATION_FAILED_AFTER_NORMALIZE', {
        error: validationError,
      });
      return false;
    }

    setError('');
    emitDebug('ZONE_RATES_NORMALIZED_AND_VALIDATED');
    return true;
  }, [zoneRates]);

  /**
   * Reset to empty state
   */
  const reset = useCallback(() => {
    setZoneRates({});
    setError('');
    emitDebug('ZONE_RATES_RESET');
  }, []);

  /**
   * Load from draft
   */
  const loadFromDraft = useCallback((draft: Partial<ZoneRateMatrix>) => {
    setZoneRates(draft as ZoneRateMatrix);
    emitDebug('ZONE_RATES_LOADED_FROM_DRAFT', {
      fromZoneCount: Object.keys(draft).length,
    });
  }, []);

  return {
    zoneRates,
    error,
    setZoneRate,
    getZoneRate,
    setAllRatesForFromZone,
    validateZoneRates,
    normalizeAndValidate,
    reset,
    loadFromDraft,
    initializeZones,
    isEmpty,
  };
};
