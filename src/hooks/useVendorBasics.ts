/**
 * useVendorBasics hook
 * Manages vendor basic information state and validation
 */

import { useState, useCallback, useEffect } from 'react';
import {
  validatePhone,
  validateEmail,
  validateGST,
  validatePrimaryContactName,
  validatePrimaryContactPhone,
  validatePrimaryContactEmail,
} from '../utils/validators';
import { VendorBasics, VendorRatings, persistDraft } from '../store/draftStore';
import { emitDebug } from '../utils/debug';
import { useFormConfig } from './useFormConfig';

// =============================================================================
// HELPER: Dynamic Length Validator
// =============================================================================

/**
 * Validates field length dynamically based on form config constraints
 * @param value - Field value to validate
 * @param fieldLabel - Human-readable field name for error messages
 * @param minLength - Minimum length (optional, from form config)
 * @param maxLength - Maximum length (optional, from form config)
 * @param isRequired - Whether field is required
 * @returns Error message or empty string if valid
 */
const validateDynamicLength = (
  value: string,
  fieldLabel: string,
  minLength?: number | null,
  maxLength?: number | null,
  isRequired?: boolean
): string => {
  // If required and empty, show error
  if (!value && isRequired) return `${fieldLabel} is required`;

  // If optional and empty, skip validation
  if (!value) return '';

  // Validate minimum length (only if field has a value)
  if (minLength != null && value.length < minLength) {
    return `${fieldLabel} must be at least ${minLength} character${minLength !== 1 ? 's' : ''}`;
  }

  // Validate maximum length
  if (maxLength != null && value.length > maxLength) {
    return `${fieldLabel} must be at most ${maxLength} character${maxLength !== 1 ? 's' : ''}`;
  }

  return '';
};

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
  // Individual rating errors
  vendorRatings?: string;
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

  // Individual rating setter
  setVendorRating: (field: keyof VendorRatings, value: number) => void;
}

// =============================================================================
// DEFAULT STATE
// =============================================================================

const defaultVendorRatings: VendorRatings = {
  priceSupport: 0,
  deliveryTime: 0,
  tracking: 0,
  salesSupport: 0,
  damageLoss: 0,
};

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
  companyRating: null, // Will be calculated from vendorRatings
  // Individual rating parameters
  vendorRatings: defaultVendorRatings,
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

  // Get dynamic form configuration for field constraints
  const { getField, getConstraint } = useFormConfig('add-vendor');

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
          // Use dynamic validation with form config constraints
          error = validateDynamicLength(
            basics.companyName,
            'Company name',
            getConstraint('companyName', 'minLength', 1) as number,
            getConstraint('companyName', 'maxLength', 60) as number,
            getField('companyName')?.required ?? true
          );
          break;
        case 'contactPersonName':
          // Use dynamic validation + alphabetic check
          error = validateDynamicLength(
            basics.contactPersonName,
            'Contact person name',
            getConstraint('contactPersonName', 'minLength', 1) as number,
            getConstraint('contactPersonName', 'maxLength', 30) as number,
            getField('contactPersonName')?.required ?? true
          );
          // Additional alphabetic validation
          if (!error && basics.contactPersonName && !/^[a-zA-Z\s\-']+$/.test(basics.contactPersonName)) {
            error = 'Contact name can only contain letters, spaces, hyphens, and apostrophes';
          }
          break;
        case 'vendorPhoneNumber':
          // Phone validation remains hardcoded (must be exactly 10 digits)
          error = validatePhone(basics.vendorPhoneNumber);
          break;
        case 'vendorEmailAddress':
          // Email validation remains hardcoded (format validation)
          error = validateEmail(basics.vendorEmailAddress);
          break;
        case 'gstin':
          // GST validation remains hardcoded (15 chars + checksum by law)
          error = validateGST(basics.gstin || '');
          break;
        case 'displayName':
          // Use dynamic validation
          error = validateDynamicLength(
            basics.displayName,
            'Display name',
            getConstraint('displayName', 'minLength', null) as number,
            getConstraint('displayName', 'maxLength', 30) as number,
            getField('displayName')?.required ?? false
          );
          break;
        case 'subVendor':
          // Use dynamic validation (optional field, validate only if has value)
          error = validateDynamicLength(
            basics.subVendor,
            'Sub transporter',
            getConstraint('subVendor', 'minLength', null) as number,
            getConstraint('subVendor', 'maxLength', 20) as number,
            getField('subVendor')?.required ?? false
          );
          break;
        case 'vendorCode':
          // Use dynamic validation + alphanumeric check
          error = validateDynamicLength(
            basics.vendorCode,
            'Vendor code',
            getConstraint('vendorCode', 'minLength', null) as number,
            getConstraint('vendorCode', 'maxLength', 20) as number,
            getField('vendorCode')?.required ?? false
          );
          // Additional alphanumeric validation (only if field has value)
          if (!error && basics.vendorCode && !/^[A-Z0-9]+$/.test(basics.vendorCode.toUpperCase())) {
            error = 'Vendor code can only contain letters and numbers';
          }
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
          // Use dynamic validation
          error = validateDynamicLength(
            basics.address,
            'Address',
            getConstraint('address', 'minLength', 1) as number,
            getConstraint('address', 'maxLength', 150) as number,
            getField('address')?.required ?? true
          );
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
    [basics, getField, getConstraint]
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
          // Use dynamic validation with form config constraints
          error = validateDynamicLength(
            basics.companyName,
            'Company name',
            getConstraint('companyName', 'minLength', 1) as number,
            getConstraint('companyName', 'maxLength', 60) as number,
            getField('companyName')?.required ?? true
          );
          break;
        case 'contactPersonName':
          // Use dynamic validation + alphabetic check
          error = validateDynamicLength(
            basics.contactPersonName,
            'Contact person name',
            getConstraint('contactPersonName', 'minLength', 1) as number,
            getConstraint('contactPersonName', 'maxLength', 30) as number,
            getField('contactPersonName')?.required ?? true
          );
          // Additional alphabetic validation
          if (!error && basics.contactPersonName && !/^[a-zA-Z\s\-']+$/.test(basics.contactPersonName)) {
            error = 'Contact name can only contain letters, spaces, hyphens, and apostrophes';
          }
          break;
        case 'vendorPhoneNumber':
          // Phone validation remains hardcoded (must be exactly 10 digits)
          error = validatePhone(basics.vendorPhoneNumber);
          break;
        case 'vendorEmailAddress':
          // Email validation remains hardcoded (format validation)
          error = validateEmail(basics.vendorEmailAddress);
          break;
        case 'gstin':
          // GST validation remains hardcoded (15 chars + checksum by law)
          error = validateGST(basics.gstin || '');
          break;
        case 'displayName':
          // Use dynamic validation
          error = validateDynamicLength(
            basics.displayName,
            'Display name',
            getConstraint('displayName', 'minLength', null) as number,
            getConstraint('displayName', 'maxLength', 30) as number,
            getField('displayName')?.required ?? false
          );
          break;
        case 'subVendor':
          // Use dynamic validation (optional field, validate only if has value)
          error = validateDynamicLength(
            basics.subVendor,
            'Sub transporter',
            getConstraint('subVendor', 'minLength', null) as number,
            getConstraint('subVendor', 'maxLength', 20) as number,
            getField('subVendor')?.required ?? false
          );
          break;
        case 'vendorCode':
          // Use dynamic validation + alphanumeric check
          error = validateDynamicLength(
            basics.vendorCode,
            'Vendor code',
            getConstraint('vendorCode', 'minLength', null) as number,
            getConstraint('vendorCode', 'maxLength', 20) as number,
            getField('vendorCode')?.required ?? false
          );
          // Additional alphanumeric validation (only if field has value)
          if (!error && basics.vendorCode && !/^[A-Z0-9]+$/.test(basics.vendorCode.toUpperCase())) {
            error = 'Vendor code can only contain letters and numbers';
          }
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
          // Use dynamic validation
          error = validateDynamicLength(
            basics.address,
            'Address',
            getConstraint('address', 'minLength', 1) as number,
            getConstraint('address', 'maxLength', 150) as number,
            getField('address')?.required ?? true
          );
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
  }, [basics, getField, getConstraint]);

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

  /**
   * Set individual vendor rating and auto-calculate overall rating
   */
  const setVendorRating = useCallback(
    (field: keyof VendorRatings, value: number) => {
      setBasics((prev) => {
        const updatedRatings = {
          ...prev.vendorRatings,
          [field]: value,
        };

        // Calculate overall rating (simple average)
        const values = Object.values(updatedRatings);
        const validValues = values.filter((v) => v > 0);
        let overallRating: number | null = null;

        if (validValues.length === 5) {
          // All ratings provided - calculate average
          const sum = validValues.reduce((acc, val) => acc + val, 0);
          overallRating = Math.round((sum / 5) * 10) / 10; // Round to 1 decimal
        }

        emitDebug('VENDOR_RATING_CHANGED', { field, value, overallRating });

        return {
          ...prev,
          vendorRatings: updatedRatings,
          companyRating: overallRating,
        };
      });

      // Clear rating error
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated.vendorRatings;
        delete updated.companyRating;
        return updated;
      });
    },
    []
  );

  return {
    basics,
    errors,
    setField,
    validateField,
    validateAll,
    reset,
    loadFromDraft,
    setBasics: setBasicsBulk, // 👈 NEW bulk setter exposed to AddVendor
    setVendorRating, // 👈 NEW individual rating setter
  };
};
