/**
 * useCharges hook
 * Manages both simple numeric charges and card-based charges with complex validation
 * UPDATED: Added daccCharges field support AND invoiceValueSurcharge
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Charges, validateFuel } from '../utils/validators';
import {
  ChargeCardData,
  validateChargeCard,
  validateFixedAmount,
  validateWeightThreshold,
  createDefaultChargeCard,
} from '../utils/chargeValidators';
import { toNumberOrZero, isNumberInRange } from '../utils/numbers';
import { persistDraft } from '../store/draftStore';
import { emitDebug } from '../utils/debug';

// =============================================================================
// TYPES
// =============================================================================

export interface ChargesErrors {
  // Simple charges
  docketCharges?: string;
  minWeightKg?: string;
  minCharges?: string;
  hamaliCharges?: string;
  greenTax?: string;
  miscCharges?: string;
  fuelSurchargePct?: string;
  daccCharges?: string;
  invoiceValueSurcharge?: string; // <-- ADDED THIS

  // Card-based charges (nested errors)
  handlingCharges?: Record<string, string>;
  rovCharges?: Record<string, string>;
  codCharges?: Record<string, string>;
  toPayCharges?: Record<string, string>;
  appointmentCharges?: Record<string, string>;
}

export interface UseChargesReturn {
  charges: Charges;
  errors: ChargesErrors;
  setCharge: (field: keyof Charges, value: string | number | null) => void;
  setCardField: (
    cardName: 'handlingCharges' | 'rovCharges' | 'codCharges' | 'toPayCharges' | 'appointmentCharges',
    field: keyof ChargeCardData,
    value: any
  ) => void;
  validateField: (field: keyof Charges) => boolean;
  validateCardField: (
    cardName: 'handlingCharges' | 'rovCharges' | 'codCharges' | 'toPayCharges' | 'appointmentCharges',
    field: keyof ChargeCardData
  ) => boolean;
  validateAll: () => { isValid: boolean; errors: ChargesErrors };
  reset: () => void;
  loadFromDraft: (draft: Partial<Charges>) => void;
  firstErrorRef: React.MutableRefObject<HTMLElement | null>;
}

// =============================================================================
// FIELD RANGES (for simple numeric charges)
// =============================================================================

const SIMPLE_CHARGE_RANGES: Record<string, { min: number; max: number }> = {
  docketCharges: { min: 0, max: 10000 }, // Changed min to 0 to match validator
  minWeightKg: { min: 0, max: 10000 },
  minCharges: { min: 0, max: 10000 },
  hamaliCharges: { min: 0, max: 10000 },
  greenTax: { min: 0, max: 10000 },
  miscCharges: { min: 0, max: 10000 },
  daccCharges: { min: 0, max: 10000 },

  // Percentages
  fuelSurchargePct: { min: 0, max: 50 },
  invoiceValueSurcharge: { min: 0, max: 100 }, // <-- ADDED THIS (Assuming it's a %)
};

// =============================================================================
// Helper: numeric-percentage validator
// =============================================================================

// allow numeric manual percentages (0-100, up to 2 decimals)
function validateCardPercentage(value: any): string | null {
  const s = value === undefined || value === null ? '' : String(value).trim();
  if (s === '') return 'Please choose a valid percentage range';

  // allow numbers like "4", "4.0", "0.3", "1.33"
  const num = Number(s);
  if (!Number.isFinite(num) || num < 0 || num > 100) {
    return 'Please choose a valid percentage range (0–100)';
  }

  // restrict to max 2 decimal places
  const match = s.match(/^\d+(?:\.(\d+))?$/);
  if (match && match[1] && match[1].length > 2) {
    return 'Maximum 2 decimal places allowed';
  }

  return null; // valid
}

// =============================================================================
// DEFAULT STATE
// =============================================================================

// =============================================================================
// DEFAULT STATE
// =============================================================================

const defaultCharges: Charges = {
  // Simple numeric charges - Default to null for blank inputs
  docketCharges: null, // was 0
  minWeightKg: null,
  minCharges: null,
  hamaliCharges: null,
  greenTax: null,
  miscCharges: null,
  fuelSurchargePct: null,
  daccCharges: null,
  invoiceValueSurcharge: null,

  // Card-based charges
  handlingCharges: createDefaultChargeCard(),
  rovCharges: createDefaultChargeCard(),
  codCharges: createDefaultChargeCard(),
  toPayCharges: createDefaultChargeCard(),
  appointmentCharges: createDefaultChargeCard(),
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing charges (mixed simple + card-based)
 */
export const useCharges = (
  onUpdate?: (charges: Charges) => void
): UseChargesReturn => {
  const [charges, setCharges] = useState<Charges>(defaultCharges);
  const [errors, setErrors] = useState<ChargesErrors>({});
  const firstErrorRef = useRef<HTMLElement | null>(null);

  // Throttled draft persistence
  useEffect(() => {
    const timer = setTimeout(() => {
      persistDraft({ charges });
      emitDebug('CHARGES_DRAFT_SAVED', charges);
    }, 400);

    return () => clearTimeout(timer);
  }, [charges]);

  // Notify parent of updates
  useEffect(() => {
    if (onUpdate) {
      onUpdate(charges);
    }
  }, [charges, onUpdate]);

  /**
   * Set a simple numeric charge field
   */
  const setCharge = useCallback(
    (field: keyof Charges, value: string | number | null) => {
      // Only handle simple numeric fields
      if (field in SIMPLE_CHARGE_RANGES) {
        let numValue: number | null = null;

        if (value === null || value === '') {
          numValue = null;
        } else {
          numValue = toNumberOrZero(value);
        }

        setCharges((prev) => {
          const updated = { ...prev, [field]: numValue };
          emitDebug('CHARGE_FIELD_CHANGED', { field, value: numValue });
          return updated;
        });

        // Clear error for this field
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated[field as keyof ChargesErrors];
          return updated;
        });
      }
    },
    []
  );

  /**
   * Set a field within a card-based charge
   */
  const setCardField = useCallback(
    (
      cardName: 'handlingCharges' | 'rovCharges' | 'codCharges' | 'toPayCharges' | 'appointmentCharges',
      field: keyof ChargeCardData,
      value: any
    ) => {
      setCharges((prev) => {
        const cardData = prev[cardName] as ChargeCardData;
        const updated = {
          ...prev,
          [cardName]: {
            ...cardData,
            [field]: value,
          },
        };
        emitDebug('CARD_FIELD_CHANGED', { cardName, field, value });
        return updated;
      });

      // Clear error for this specific field
      setErrors((prev) => {
        const cardErrors = prev[cardName] || {};
        const updatedCardErrors = { ...cardErrors };
        delete updatedCardErrors[field];

        return {
          ...prev,
          [cardName]: Object.keys(updatedCardErrors).length > 0 ? updatedCardErrors : undefined,
        };
      });
    },
    []
  );

  /**
   * Validate a simple numeric charge field
   */
  const validateField = useCallback(
    (field: keyof Charges): boolean => {
      // Only validate simple numeric fields
      if (!(field in SIMPLE_CHARGE_RANGES)) {
        return true;
      }

      const value = charges[field] as number | null;
      // Treat null as 0 for validation purposes if we want to enforce range,
      // OR skip validation if optional?
      // For now, let's treat null as "no value".
      // If it's mandatory (like docketCharges), we might want to flag it?
      // But user demand is just appearance.
      // Let's assume 0 is a safe fallback for validation min/max checks, 
      // or strictly check null.

      const range = SIMPLE_CHARGE_RANGES[field];

      if (value === null) {
        // If field is mandatory, this should be an error?
        // For now, let's allow it to start blank.
        return true;
      }

      // Special validation for fuel surcharge
      if (field === 'fuelSurchargePct') {
        const fuelError = validateFuel(value);
        if (fuelError) {
          setErrors((prev) => ({
            ...prev,
            fuelSurchargePct: fuelError,
          }));
          return false;
        }
      }

      // Check if in range
      if (value !== null && value !== undefined && !isNumberInRange(value, range.min, range.max)) {
        let errorMsg = 'Enter amount between 1-10,000';
        if (field === 'fuelSurchargePct') errorMsg = `Must be between ${range.min} and ${range.max}`;
        if (field === 'invoiceValueSurcharge') errorMsg = `Must be between ${range.min} and ${range.max}`;

        setErrors((prev) => ({
          ...prev,
          [field]: errorMsg,
        }));
        return false;
      }

      // Clear error if valid
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field as keyof ChargesErrors];
        return updated;
      });

      return true;
    },
    [charges]
  );

  /**
   * Validate a single field within a card-based charge
   */
  const validateCardField = useCallback(
    (
      cardName: 'handlingCharges' | 'rovCharges' | 'codCharges' | 'toPayCharges' | 'appointmentCharges',
      field: keyof ChargeCardData
    ): boolean => {
      const cardData = charges[cardName] as ChargeCardData;
      let error = '';

      // Validate based on field type
      if (field === 'fixedAmount' && cardData.currency === 'INR' && cardData.mode === 'FIXED') {
        error = validateFixedAmount(cardData.fixedAmount, cardName === 'handlingCharges');
      } else if (field === 'weightThreshold') {
        // Only validate weightThreshold for handlingCharges - it's MANDATORY
        if (cardName === 'handlingCharges') {
          error = validateWeightThreshold(cardData.weightThreshold ?? 0);
        }
      }

      if (error) {
        setErrors((prev) => ({
          ...prev,
          [cardName]: {
            ...(prev[cardName] || {}),
            [field]: error,
          },
        }));
        return false;
      }

      // Additional validation for Variable % fields when editing variableRange
      if (field === 'variableRange' && cardData.currency === 'PERCENT' && cardData.mode === 'VARIABLE') {
        const varVal = cardData.variableRange;
        const percentErr = validateCardPercentage(varVal);
        if (percentErr) {
          setErrors((prev) => ({
            ...prev,
            [cardName]: {
              ...(prev[cardName] || {}),
              [field]: percentErr,
            },
          }));
          return false;
        } else {
          // Clear any variable error for this field if valid
          setErrors((prev) => {
            const cardErrors = { ...(prev[cardName] || {}) };
            delete cardErrors[field];
            return {
              ...prev,
              [cardName]: Object.keys(cardErrors).length > 0 ? cardErrors : undefined,
            };
          });
          return true;
        }
      }

      // Clear error
      setErrors((prev) => {
        const cardErrors = { ...(prev[cardName] || {}) };
        delete cardErrors[field];
        return {
          ...prev,
          [cardName]: Object.keys(cardErrors).length > 0 ? cardErrors : undefined,
        };
      });

      return true;
    },
    [charges]
  );

  /**
   * Validate all fields (simple + cards)
   */
  const validateAll = useCallback((): { isValid: boolean; errors: ChargesErrors } => {
    let isValid = true;
    const newErrors: ChargesErrors = {};
    firstErrorRef.current = null;

    // Validate simple numeric charges
    Object.keys(SIMPLE_CHARGE_RANGES).forEach((field) => {
      const value = charges[field as keyof Charges] as number | null;
      const range = SIMPLE_CHARGE_RANGES[field];

      if (field === 'fuelSurchargePct') {
        const fuelError = validateFuel(value || 0);
        if (fuelError) {
          newErrors.fuelSurchargePct = fuelError;
          isValid = false;
          return;
        }
      }

      if (value !== null && value !== undefined) {
        // Safe check with explicit cast (value is number here)
        if (!isNumberInRange(value as number, range.min, range.max)) {
          newErrors[field as keyof ChargesErrors] = (field === 'fuelSurchargePct' || field === 'invoiceValueSurcharge')
            ? `Must be between ${range.min} and ${range.max}`
            : 'Enter amount between 0-10,000';
          isValid = false;
        }
      }
    });

    // Validate card-based charges
    const cardNames: Array<'handlingCharges' | 'rovCharges' | 'codCharges' | 'toPayCharges' | 'appointmentCharges'> = [
      'handlingCharges',
      'rovCharges',
      'codCharges',
      'toPayCharges',
      'appointmentCharges',
    ];

    cardNames.forEach((cardName) => {
      const cardData = charges[cardName] as ChargeCardData;
      // Only validate weightThreshold for handlingCharges
      const shouldValidateWeight = cardName === 'handlingCharges';
      const isHandlingCharge = cardName === 'handlingCharges';

      // run the existing validator first
      let cardErrors: Record<string, string> = validateChargeCard(cardData, shouldValidateWeight, isHandlingCharge) || {};

      // If the card is VARIABLE % (currency PERCENT + mode VARIABLE), allow numeric values
      try {
        const isVariablePercentCard =
          (cardData.currency === 'PERCENT' || (cardData as any).currency === 'PERCENT') &&
          (cardData.mode === 'VARIABLE' || (cardData as any).mode === 'VARIABLE');

        if (isVariablePercentCard) {
          const varVal = cardData.variableRange;
          const percentErr = validateCardPercentage(varVal);
          if (percentErr) {
            // ensure we keep existing cardErrors but override/set variableRange error
            cardErrors = { ...cardErrors, variableRange: percentErr };
          } else {
            // if validator earlier set an error for variableRange but our numeric check passes, remove it
            if (cardErrors.variableRange) {
              const { variableRange, ...rest } = cardErrors;
              cardErrors = rest;
            }
          }
        }
      } catch (err) {
        // ignore and fall back to cardErrors
      }

      if (Object.keys(cardErrors).length > 0) {
        (newErrors as any)[cardName] = cardErrors;
        isValid = false;
      }
    });

    setErrors(newErrors);

    if (!isValid) {
      emitDebug('CHARGES_VALIDATION_FAILED', newErrors);
    } else {
      emitDebug('CHARGES_VALIDATION_PASSED');
    }

    return { isValid, errors: newErrors };
  }, [charges]);

  /**
   * Reset to default state
   */
  const reset = useCallback(() => {
    setCharges(defaultCharges);
    setErrors({});
    firstErrorRef.current = null;
    emitDebug('CHARGES_RESET');
  }, []);

  /**
   * Load from draft
   */
  const loadFromDraft = useCallback((draft: Partial<Charges>) => {
    setCharges((prev) => ({
      ...prev,
      ...draft,
    }));
    emitDebug('CHARGES_LOADED_FROM_DRAFT', draft);
  }, []);

  return {
    charges,
    errors,
    setCharge,
    setCardField,
    validateField,
    validateCardField,
    validateAll,
    reset,
    loadFromDraft,
    firstErrorRef,
  };
};

export default useCharges;