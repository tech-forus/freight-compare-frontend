/**
 * Charge validators for individual charge cards
 * Implements strict validation rules without auto-clamping
 */

// =============================================================================
// CONSTANTS
// =============================================================================

export const UNIT_OPTIONS = ['per kg', 'per piece', 'per box', 'per shipment'] as const;
export type Unit = typeof UNIT_OPTIONS[number];

export const CURRENCY_OPTIONS = ['INR', 'PERCENT'] as const;
export type Currency = typeof CURRENCY_OPTIONS[number];

export const MODE_OPTIONS = ['FIXED', 'VARIABLE'] as const;
export type Mode = typeof MODE_OPTIONS[number];

export const VARIABLE_RANGES = [
  '0%',
  '0.1% - 1%',
  '1.25% - 2.5%',
  '3% - 4%',
  '4% - 5%',
] as const;

// Updated to support both old string format and new numeric format
export type VariableRange = typeof VARIABLE_RANGES[number] | number | string;

// =============================================================================
// CHARGE CARD DATA STRUCTURE
// =============================================================================

export interface ChargeCardData {
  unit: Unit;
  currency: Currency;
  mode: Mode;
  fixedAmount: number;
  variableRange: VariableRange;
  weightThreshold?: number; // Optional - only used in handlingCharges
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate fixed amount (when currency = INR and mode = FIXED)
 * Range: 1-5000 inclusive (OPTIONAL - all charge fields are now optional)
 */
export const validateFixedAmount = (value: number, isHandlingCharge: boolean = false): string => {
  // Allow empty/zero values (all fields are now optional)
  if (value === null || value === undefined || isNaN(value) || value === 0) {
    return '';
  }
  if (value < 1 || value > 5000) {
    return 'Enter amount between 1-5,000';
  }
  return '';
};

/**
 * Validate variable range selection (OPTIONAL)
 * Must be one of the allowed enum values if provided
 */
export const validateVariableRange = (value: string | number): string => {
  // Allow 0 as valid
  if (value === 0 || value === '0' || value === '0%') {
    return '';
  }

  // Allow empty values (field is now optional)
  if (!value && value !== 0) {
    return '';
  }
  
  // Handle numeric values (new format)
  if (typeof value === 'number') {
    if (value < 0 || value > 5) {
      return 'Percentage must be between 0-5%';
    }
    return '';
  }
  
  // Handle string values (could be old format or intermediate typing like "3.")
  if (typeof value === 'string') {
    // Allow intermediate decimal input during typing
    if (value.endsWith('.')) {
      const numPart = Number(value.slice(0, -1));
      if (Number.isFinite(numPart) && numPart >= 0 && numPart <= 5) {
        return '';
      }
    }
    
    // Check if it's a valid numeric string
    const num = Number(value);
    if (Number.isFinite(num)) {
      if (num < 0 || num > 5) {
        return 'Percentage must be between 0-5%';
      }
      return '';
    }
    
    // Check if it's old format (range strings)
    if (VARIABLE_RANGES.includes(value as any)) {
      return '';
    }
    
    return 'Please enter a valid percentage (0-5%)';
  }
  
  return 'Invalid value';
};

/**
 * Validate weight threshold (OPTIONAL for handling charges)
 * Range: 1-20000 inclusive (only validates if value is provided)
 */
export const validateWeightThreshold = (value: number): string => {
  // Allow empty/zero values (field is now optional)
  if (value === null || value === undefined || isNaN(value) || value === 0) {
    return '';
  }
  if (value < 1 || value > 20000) {
    return 'Enter amount between 1-20,000';
  }
  return '';
};

/**
 * Validate unit selection (OPTIONAL)
 */
export const validateUnit = (value: string): string => {
  // Allow empty values (field is now optional)
  if (!value) {
    return '';
  }
  if (!UNIT_OPTIONS.includes(value as Unit)) {
    return 'Invalid unit selection';
  }
  return '';
};

/**
 * Validate complete charge card data
 * @param data - Charge card data
 * @param validateWeight - Whether to validate weight threshold (only for handlingCharges)
 * @param isHandlingCharge - Whether this is a handling charge (affects validation)
 */
export const validateChargeCard = (
  data: ChargeCardData, 
  validateWeight: boolean = false,
  isHandlingCharge: boolean = false
): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Validate unit
  const unitError = validateUnit(data.unit);
  if (unitError) errors.unit = unitError;

  // Validate based on currency and mode
  if (data.currency === 'INR') {
    if (data.mode === 'FIXED') {
      const fixedError = validateFixedAmount(data.fixedAmount, isHandlingCharge);
      if (fixedError) errors.fixedAmount = fixedError;
    } else {
      const variableError = validateVariableRange(data.variableRange);
      if (variableError) errors.variableRange = variableError;
    }
  } else {
    // PERCENT only shows variable
    const variableError = validateVariableRange(data.variableRange);
    if (variableError) errors.variableRange = variableError;
  }

  // Validate weight threshold (MANDATORY if validateWeight is true, i.e., for handlingCharges)
  if (validateWeight) {
    const weightError = validateWeightThreshold(data.weightThreshold);
    if (weightError) errors.weightThreshold = weightError;
  }

  return errors;
};

/**
 * Create default charge card data
 */
export const createDefaultChargeCard = (): ChargeCardData => ({
  unit: 'per kg',
  currency: 'INR',
  mode: 'FIXED',
  fixedAmount: 0,
  variableRange: '0%',
  weightThreshold: null,
});