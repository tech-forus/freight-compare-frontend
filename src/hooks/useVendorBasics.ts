/**
 * useVendorBasics hook
 * Manages vendor basic information state and validation
 */

import { useState, useCallback, useEffect } from 'react';
import {
  validateCompanyName,
  validateContactName,
  validatePhone,
  validateEmail,
  validateGST,
  validateDisplayName,
  validateSubVendor,
  validateVendorCode,
  validatePrimaryContactName,
  validatePrimaryContactPhone,
  validatePrimaryContactEmail,
  validateAddress,
} from '../utils/validators';
import { VendorBasics, persistDraft } from '../store/draftStore';
import { emitDebug } from '../utils/debug';

// =============================================================================
// TYPES
// =============================================================================

export interface VendorBasicsErrors {
  companyName?: string;
  contactPersonName?: string;
  vendorPhoneNumber?: string;
  vendorEmailAddress?: string;
  gstin?: string;
  displayName?: string;
  subVendor?: string;
  vendorCode?: string;
  primaryContactName?: string;
  primaryContactPhone?: string;
  primaryContactEmail?: string;
  address?: string;
  // newly tracked errors
  transportMode?: string;
  serviceMode?: string;
  companyRating?: string;
}

export interface UseVendorBasicsReturn {
  basics: VendorBasics;
  errors: VendorBasicsErrors;
  // setField now accepts string | number | null to allow rating (number) and null defaults
  setField: (field: keyof VendorBasics, value: string | number | null) => void;
  validateField: (field: keyof VendorBasics) => boolean;
  validateAll: () => boolean;
  reset: () => void;
  loadFromDraft: (draft: Partial<VendorBasics>) => void;

  // 🔥 NEW: bulk setter for autofill (Quick Lookup, etc.)
  setBasics: (
    updater: VendorBasics | ((prev: VendorBasics) => VendorBasics)
  ) => void;
}

// =============================================================================
// DEFAULT STATE
// =============================================================================

const defaultBasics: VendorBasics = {
  companyName: '',
  contactPersonName: '',
  vendorPhoneNumber: '',
  vendorEmailAddress: '',
  gstin: '',
  // keep transportMode but set to null if you want no preselected option
  transportMode: null as any,
  displayName: '',
  subVendor: '',
  vendorCode: '',
  primaryContactName: '',
  primaryContactPhone: '',
  primaryContactEmail: '',
  address: '',
  // NEW keys: explicitly set to null (one-time defaults)
  serviceMode: null as any,   // possible values: 'FTL' | 'LTL' | null
  companyRating: 4, // number 1-5 or null
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for managing vendor basics
 *
 * @param onUpdate - Optional callback when state changes
 * @returns Vendor basics state and methods
 */
export const useVendorBasics = (
  onUpdate?: (basics: VendorBasics) => void
): UseVendorBasicsReturn => {
  const [basics, setBasics] = useState<VendorBasics>(defaultBasics);
  const [errors, setErrors] = useState<VendorBasicsErrors>({});

  // Throttled draft persistence
  useEffect(() => {
    const timer = setTimeout(() => {
      persistDraft({ basics });
      emitDebug('BASICS_DRAFT_SAVED', basics);
    }, 400);

    return () => clearTimeout(timer);
  }, [basics]);

  // Notify parent of updates
  useEffect(() => {
    if (onUpdate) {
      onUpdate(basics);
    }
  }, [basics, onUpdate]);

  /**
   * 🔥 NEW: Bulk setter so we can update many fields at once
   * Used by Quick Lookup autofill, but keeps old behavior intact.
   */
  const setBasicsBulk = useCallback(
    (updater: VendorBasics | ((prev: VendorBasics) => VendorBasics)) => {
      setBasics((prev) => {
        const next =
          typeof updater === 'function'
            ? (updater as (p: VendorBasics) => VendorBasics)(prev)
            : updater;

        emitDebug('BASICS_BULK_SET', next);
        return next;
      });

      // Optional: clear all field errors on bulk set
      setErrors({});
    },
    []
  );

  /**
   * Set a single field value
   */
  const setField = useCallback(
    (field: keyof VendorBasics, value: string | number | null) => {
      setBasics((prev) => {
        const updated = { ...prev, [field]: value } as VendorBasics;
        emitDebug('BASICS_FIELD_CHANGED', { field, value });
        return updated;
      });

      // Clear error for this field
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field as keyof VendorBasicsErrors];
        return updated;
      });
    },
    []
  );

  /**
   * Validate a single field
   */
  const validateField = useCallback(
    (field: keyof VendorBasics): boolean => {
      let error = '';

      switch (field) {
        case 'companyName':
          error = validateCompanyName(basics.companyName);
          break;
        case 'contactPersonName':
          error = validateContactName(basics.contactPersonName);
          break;
        case 'vendorPhoneNumber':
          error = validatePhone(basics.vendorPhoneNumber);
          break;
        case 'vendorEmailAddress':
          error = validateEmail(basics.vendorEmailAddress);
          break;
        case 'gstin':
          error = validateGST(basics.gstin || '');
          break;
        case 'displayName':
          error = validateDisplayName(basics.displayName);
          break;
        case 'subVendor':
          error = validateSubVendor(basics.subVendor);
          break;
        case 'vendorCode':
          error = validateVendorCode(basics.vendorCode);
          break;
        case 'primaryContactName':
          error = validatePrimaryContactName(basics.primaryContactName);
          break;
        case 'primaryContactPhone':
          error = validatePrimaryContactPhone(basics.primaryContactPhone);
          break;
        case 'primaryContactEmail':
          error = validatePrimaryContactEmail(basics.primaryContactEmail);
          break;
        case 'address':
          error = validateAddress(basics.address);
          break;

        case 'transportMode':
          if (!basics.transportMode) {
            error = 'Transport Mode is required';
          }
          break;

        // NEW: basic validation for serviceMode & companyRating
        case 'serviceMode': {
          const v = (basics as any).serviceMode;
          if (!v || (v !== 'FTL' && v !== 'LTL')) {
            error = 'Please select a service mode';
          }
          break;
        }

        case 'companyRating': {
          const r = (basics as any).companyRating;
          if (r !== null && r !== undefined) {
            const n = Number(r);
            if (!Number.isFinite(n) || n < 1 || n > 5) {
              error = 'Rating must be between 1 and 5';
            }
          }
          break;
        }
      }

      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }));
        emitDebug('BASICS_VALIDATION_ERROR', { field, error });
        return false;
      }

      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field as keyof VendorBasicsErrors];
        return updated;
      });

      return true;
    },
    [basics]
  );

  /**
   * Validate all fields
   */
  const validateAll = useCallback((): boolean => {
    const fields: (keyof VendorBasics)[] = [
      'legalCompanyName',
      'contactPersonName',
      'vendorPhoneNumber',
      'vendorEmailAddress',
      'subVendor',
      'vendorCode',
      'address',
      'transportMode',
      'serviceMode',
    ];

    // Validate GSTIN if present
    if (basics.gstin) {
      fields.push('gstin');
    }

    // companyRating is optional — validate only if present
    if (
      (basics as any).companyRating !== null &&
      (basics as any).companyRating !== undefined
    ) {
      fields.push('companyRating');
    }

    let isValid = true;
    const newErrors: VendorBasicsErrors = {};

    fields.forEach((field) => {
      let error = '';

      switch (field) {
        case 'companyName':
          error = validateCompanyName(basics.companyName);
          break;
        case 'contactPersonName':
          error = validateContactName(basics.contactPersonName);
          break;
        case 'vendorPhoneNumber':
          error = validatePhone(basics.vendorPhoneNumber);
          break;
        case 'vendorEmailAddress':
          error = validateEmail(basics.vendorEmailAddress);
          break;
        case 'gstin':
          error = validateGST(basics.gstin || '');
          break;
        case 'displayName':
          error = validateDisplayName(basics.displayName);
          break;
        case 'subVendor':
          error = validateSubVendor(basics.subVendor);
          break;
        case 'vendorCode':
          error = validateVendorCode(basics.vendorCode);
          break;
        case 'primaryContactName':
          error = validatePrimaryContactName(basics.primaryContactName);
          break;
        case 'primaryContactPhone':
          error = validatePrimaryContactPhone(basics.primaryContactPhone);
          break;
        case 'primaryContactEmail':
          error = validatePrimaryContactEmail(basics.primaryContactEmail);
          break;
        case 'address':
          error = validateAddress(basics.address);
          break;

        case 'transportMode':
          if (!basics.transportMode) {
            error = 'Please select a transport mode';
          }
          break;

        case 'serviceMode': {
          const v = (basics as any).serviceMode;
          if (!v || (v !== 'FTL' && v !== 'LTL')) {
            error = 'Please select a service mode';
          }
          break;
        }

        case 'companyRating': {
          const r = (basics as any).companyRating;
          if (r !== null && r !== undefined) {
            const n = Number(r);
            if (!Number.isFinite(n) || n < 1 || n > 5) {
              error = 'Rating must be between 1 and 5';
            }
          }
          break;
        }
      }

      if (error) {
        newErrors[field as keyof VendorBasicsErrors] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);

    if (!isValid) {
      emitDebug('BASICS_VALIDATION_FAILED', newErrors);
    } else {
      emitDebug('BASICS_VALIDATION_PASSED');
    }

    return isValid;
  }, [basics]);

  /**
   * Reset to default state
   */
  const reset = useCallback(() => {
    setBasics(defaultBasics);
    setErrors({});
    emitDebug('BASICS_RESET');
  }, []);

  /**
   * Load from draft
   */
  const loadFromDraft = useCallback((draft: Partial<VendorBasics>) => {
    setBasics((prev) => ({
      ...prev,
      ...draft,
    }));
    emitDebug('BASICS_LOADED_FROM_DRAFT', draft);
  }, []);

  return {
    basics,
    errors,
    setField,
    validateField,
    validateAll,
    reset,
    loadFromDraft,
    setBasics: setBasicsBulk, // 👈 NEW bulk setter exposed to AddVendor
  };
};
