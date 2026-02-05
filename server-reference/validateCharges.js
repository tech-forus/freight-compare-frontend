/**
 * Backend Validation Middleware for Charges
 *
 * REFERENCE IMPLEMENTATION
 * Copy this to your backend project (e.g., server/middleware/validateCharges.js)
 *
 * Usage:
 *   const { validateCharges } = require('./middleware/validateCharges');
 *   router.post('/api/vendors', validateCharges, createVendor);
 */

// =============================================================================
// CONSTANTS
// =============================================================================

const UNIT_OPTIONS = ['per kg', 'per piece', 'per box'];
const CURRENCY_OPTIONS = ['INR', 'PERCENT'];
const MODE_OPTIONS = ['FIXED', 'VARIABLE'];
const VARIABLE_RANGES = ['0%', '0.1% - 1%', '1.25% - 2.5%', '3% - 4%', '4% - 5%'];

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate unit selection
 */
function validateUnit(unit) {
  if (!unit) {
    return 'This field is required';
  }
  if (!UNIT_OPTIONS.includes(unit)) {
    return 'Invalid unit selection';
  }
  return null;
}

/**
 * Validate fixed amount (when currency = INR and mode = FIXED)
 * Range: 1-5000 inclusive
 */
function validateFixedAmount(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'This field is required';
  }
  const num = Number(value);
  if (num < 1 || num > 5000) {
    return 'Enter amount between 1-5,000';
  }
  return null;
}

/**
 * Validate variable range selection
 * Must be one of the allowed enum values
 */
function validateVariableRange(value) {
  if (!value) {
    return 'This field is required';
  }
  if (!VARIABLE_RANGES.includes(value)) {
    return 'Please choose a valid percentage range';
  }
  return null;
}

/**
 * Validate weight threshold
 * Range: 1-20000 inclusive
 */
function validateWeightThreshold(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'This field is required';
  }
  const num = Number(value);
  if (num < 1 || num > 20000) {
    return 'Enter amount between 1-20,000';
  }
  return null;
}

/**
 * Validate simple numeric charge
 */
function validateSimpleCharge(value, fieldName) {
  if (value === null || value === undefined) {
    return `${fieldName} is required`;
  }
  const num = Number(value);
  if (isNaN(num)) {
    return `${fieldName} must be a number`;
  }
  if (num < 1 || num > 10000) {
    return 'Enter amount between 1-10,000';
  }
  return null;
}

/**
 * Validate a complete charge card object
 * @param {object} cardData - The charge card data
 * @param {string} cardName - Name of the card (e.g., 'handlingCharges')
 * @param {boolean} validateWeight - Whether to validate weight threshold (only for handlingCharges)
 */
function validateChargeCard(cardData, cardName, validateWeight = false) {
  const errors = {};

  // Validate unit
  const unitError = validateUnit(cardData.unit);
  if (unitError) {
    errors[`${cardName}.unit`] = unitError;
  }

  // Validate currency
  if (!CURRENCY_OPTIONS.includes(cardData.currency)) {
    errors[`${cardName}.currency`] = 'Invalid currency';
  }

  // Validate mode
  if (!MODE_OPTIONS.includes(cardData.mode)) {
    errors[`${cardName}.mode`] = 'Invalid mode';
  }

  // Validate based on currency and mode
  if (cardData.currency === 'INR') {
    if (cardData.mode === 'FIXED') {
      const fixedError = validateFixedAmount(cardData.fixedAmount);
      if (fixedError) {
        errors[`${cardName}.fixedAmount`] = fixedError;
      }
    } else if (cardData.mode === 'VARIABLE') {
      const variableError = validateVariableRange(cardData.variableRange);
      if (variableError) {
        errors[`${cardName}.variableRange`] = variableError;
      }
    }
  } else if (cardData.currency === 'PERCENT') {
    const variableError = validateVariableRange(cardData.variableRange);
    if (variableError) {
      errors[`${cardName}.variableRange`] = variableError;
    }
  }

  // Validate weight threshold (only if validateWeight is true, i.e., for handlingCharges)
  if (validateWeight && cardData.weightThreshold !== undefined) {
    const weightError = validateWeightThreshold(cardData.weightThreshold);
    if (weightError) {
      errors[`${cardName}.weightThreshold`] = weightError;
    }
  }

  // Reject weightThreshold for non-handling cards
  if (!validateWeight && cardData.weightThreshold !== undefined) {
    errors[`${cardName}.weightThreshold`] = 'Weight threshold is only allowed for handling charges';
  }

  return errors;
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Express middleware to validate charges data
 */
function validateCharges(req, res, next) {
  const errors = {};
  const charges = req.body.charges;

  if (!charges) {
    return res.status(400).json({
      success: false,
      message: 'Charges data is required',
      errors: { charges: 'This field is required' },
    });
  }

  // Validate simple numeric charges
  const simpleCharges = [
    'docketCharges',
    'minWeightKg',
    'minCharges',
    'hamaliCharges',
    'greenTax',
    'miscCharges',
  ];

  simpleCharges.forEach((field) => {
    const error = validateSimpleCharge(charges[field], field);
    if (error) {
      errors[field] = error;
    }
  });

  // Validate fuel surcharge (special case: 0-40)
  if (charges.fuelSurchargePct !== undefined) {
    const num = Number(charges.fuelSurchargePct);
    if (isNaN(num) || num < 0 || num > 40) {
      errors.fuelSurchargePct = 'Fuel surcharge must be between 0 and 40';
    }
  }

  // Validate card-based charges
  const cardNames = ['handlingCharges', 'rovCharges', 'codCharges', 'toPayCharges', 'appointmentCharges'];

  cardNames.forEach((cardName) => {
    if (!charges[cardName]) {
      errors[cardName] = `${cardName} is required`;
      return;
    }

    // Only validate weightThreshold for handlingCharges
    const shouldValidateWeight = cardName === 'handlingCharges';
    const cardErrors = validateChargeCard(charges[cardName], cardName, shouldValidateWeight);
    Object.assign(errors, cardErrors);
  });

  // If there are errors, return 400
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  // Validation passed, continue
  next();
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  validateCharges,
  validateUnit,
  validateFixedAmount,
  validateVariableRange,
  validateWeightThreshold,
  validateSimpleCharge,
  validateChargeCard,
};

/**
 * EXAMPLE USAGE IN YOUR BACKEND:
 *
 * const express = require('express');
 * const { validateCharges } = require('./middleware/validateCharges');
 * const router = express.Router();
 *
 * // POST /api/vendors - Create new vendor
 * router.post('/vendors', validateCharges, async (req, res) => {
 *   try {
 *     const vendor = await Vendor.create(req.body);
 *     res.json({ success: true, data: vendor });
 *   } catch (error) {
 *     res.status(500).json({ success: false, message: error.message });
 *   }
 * });
 *
 * // PUT /api/vendors/:id - Update vendor
 * router.put('/vendors/:id', validateCharges, async (req, res) => {
 *   try {
 *     const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true });
 *     res.json({ success: true, data: vendor });
 *   } catch (error) {
 *     res.status(500).json({ success: false, message: error.message });
 *   }
 * });
 *
 * module.exports = router;
 */
