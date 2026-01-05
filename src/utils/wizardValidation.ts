import type { WizardDataV1, PriceMatrix } from "../types/wizard.types";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface WizardStatus {
  hasZones: boolean;
  hasPriceMatrix: boolean;
  hasODA: boolean;
  hasOtherCharges: boolean;
  zoneCount: number;
  matrixDimension: string; // e.g., "4×4"
  completionPercentage: number;
}

/**
 * Validate price matrix structure and content
 */
export const validatePriceMatrix = (priceMatrix: PriceMatrix): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if matrix exists
  if (!priceMatrix || typeof priceMatrix !== "object") {
    errors.push("Price matrix is missing or invalid");
    return { isValid: false, errors, warnings };
  }

  const fromZones = Object.keys(priceMatrix);
  
  // Check if matrix is empty
  if (fromZones.length === 0) {
    errors.push("Price matrix is empty - no zones configured");
    return { isValid: false, errors, warnings };
  }

  // Validate matrix structure
  fromZones.forEach((fromZone) => {
    const toZones = priceMatrix[fromZone];
    
    if (!toZones || typeof toZones !== "object") {
      errors.push(`Invalid price data for zone ${fromZone}`);
      return;
    }

    // Check if all zones have prices to all other zones
    const toZoneKeys = Object.keys(toZones);
    if (toZoneKeys.length !== fromZones.length) {
      warnings.push(`Zone ${fromZone} has incomplete price mappings`);
    }

    // Check for invalid prices
    Object.entries(toZones).forEach(([toZone, price]) => {
      // Convert string prices to numbers
      let numPrice: number | null = null;
      if (typeof price === "number") {
        numPrice = price;
      } else if (typeof price === "string" && price.trim() !== "") {
        numPrice = parseFloat(price);
        if (isNaN(numPrice)) {
          errors.push(`Invalid price for ${fromZone} → ${toZone}: must be a number`);
          return;
        }
      } else if (typeof price === "string" && price.trim() === "") {
        errors.push(`Invalid price for ${fromZone} → ${toZone}: must be a number`);
        return;
      }

      if (numPrice === null) {
        errors.push(`Invalid price for ${fromZone} → ${toZone}: must be a number`);
        return;
      }

      if (numPrice < 0) {
        errors.push(`Invalid price for ${fromZone} → ${toZone}: cannot be negative`);
      } else if (numPrice > 999999) {
        errors.push(`Invalid price for ${fromZone} → ${toZone}: exceeds maximum (999999)`);
      }
      
      // Warning for zero prices
      if (numPrice === 0) {
        warnings.push(`Price for ${fromZone} → ${toZone} is zero`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate zones configuration
 */
export const validateZones = (wizardData: WizardDataV1): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check zones array
  if (!wizardData.zones || !Array.isArray(wizardData.zones)) {
    errors.push("Zones configuration is missing or invalid");
    return { isValid: false, errors, warnings };
  }

  if (wizardData.zones.length === 0) {
    errors.push("No zones configured - please configure at least one zone");
    return { isValid: false, errors, warnings };
  }

  // Validate each zone
  wizardData.zones.forEach((zone) => {
    if (!zone.zoneCode || typeof zone.zoneCode !== "string") {
      errors.push(`Zone ${zone.zoneName || "unknown"} has invalid zone code`);
    }

    if (!zone.selectedCities || zone.selectedCities.length === 0) {
      errors.push(`Zone ${zone.zoneCode} has no cities selected`);
    }

    if (!zone.isComplete) {
      warnings.push(`Zone ${zone.zoneCode} is marked as incomplete`);
    }
  });

  // Check for duplicate zone codes
  const zoneCodes = wizardData.zones.map((z) => z.zoneCode);
  const duplicates = zoneCodes.filter((code, index) => zoneCodes.indexOf(code) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate zone codes found: ${duplicates.join(", ")}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate ODA configuration
 */
export const validateODA = (wizardData: WizardDataV1): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!wizardData.oda) {
    warnings.push("ODA configuration is missing");
    return { isValid: true, errors, warnings };
  }

  // If ODA is enabled, validate it
  if (wizardData.oda.enabled) {
    if (!wizardData.oda.pincodes || wizardData.oda.pincodes.length === 0) {
      warnings.push("ODA is enabled but no pincodes are configured");
    }

    // Validate surcharge
    if (wizardData.oda.surcharge.fixed < 0 || wizardData.oda.surcharge.variable < 0) {
      errors.push("ODA surcharge values cannot be negative");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Validate other charges configuration
 * NOTE: This is OPTIONAL - if not present, just warn don't error
 */
export const validateOtherCharges = (wizardData: WizardDataV1): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // If other charges not configured, that's OK - it's optional
  if (!wizardData.other) {
    // Just a warning, not an error - user can configure later or skip
    return { isValid: true, errors, warnings };
  }

  const other = wizardData.other;

  // Check for negative values
  const numericFields = [
    "minWeight",
    "docketCharges",
    "fuel",
    "minCharges",
    "greenTax",
    "daccCharges",
    "miscellanousCharges",
  ];

  numericFields.forEach((field) => {
    const value = other[field as keyof typeof other];
    if (typeof value === "number" && value < 0) {
      errors.push(`${field} cannot be negative`);
    }
  });

  // Validate divisor/cftFactor (mutually exclusive)
  if (other.divisor !== null && other.cftFactor !== null) {
    warnings.push("Both divisor and cftFactor are set - they should be mutually exclusive");
  }

  // Validate charge objects
  const chargeFields = [
    "rovCharges",
    "codCharges",
    "topayCharges",
    "handlingCharges",
    "appointmentCharges",
    "insuaranceCharges",
    "odaCharges",
    "prepaidCharges",
    "fmCharges",
  ];

  chargeFields.forEach((field) => {
    const charge = other[field as keyof typeof other];
    if (typeof charge === "object" && charge !== null) {
      if ("variable" in charge && typeof charge.variable === "number" && charge.variable < 0) {
        errors.push(`${field}.variable cannot be negative`);
      }
      if ("fixed" in charge && typeof charge.fixed === "number" && charge.fixed < 0) {
        errors.push(`${field}.fixed cannot be negative`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

/**
 * Comprehensive wizard validation
 */
export const validateWizardData = (wizardData: WizardDataV1 | null): ValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if wizard data exists
  if (!wizardData) {
    errors.push("Wizard data is missing - please configure zones and pricing");
    return { isValid: false, errors, warnings };
  }

  // Validate zones
  const zonesValidation = validateZones(wizardData);
  errors.push(...zonesValidation.errors);
  warnings.push(...zonesValidation.warnings);

  // Validate price matrix (REQUIRED)
  const matrixValidation = validatePriceMatrix(wizardData.priceMatrix);
  errors.push(...matrixValidation.errors);
  warnings.push(...matrixValidation.warnings);

  // Validate ODA (optional, but validate if present)
  const odaValidation = validateODA(wizardData);
  errors.push(...odaValidation.errors);
  warnings.push(...odaValidation.warnings);

  // Validate other charges (REQUIRED)
  const otherValidation = validateOtherCharges(wizardData);
  errors.push(...otherValidation.errors);
  warnings.push(...otherValidation.warnings);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

// /**
//  * Get wizard status for UI display
//  */
// export const getWizardStatus = (wizardData: WizardDataV1 | null): WizardStatus => {
//   if (!wizardData) {
//     return {
//       hasZones: false,
//       hasPriceMatrix: false,
//       hasODA: false,
//       hasOtherCharges: false,
//       zoneCount: 0,
//       matrixDimension: "0×0",
//       completionPercentage: 0,
//     };
//   }

//   const hasZones = wizardData.zones && wizardData.zones.length > 0;
//   const hasPriceMatrix =
//     wizardData.priceMatrix && Object.keys(wizardData.priceMatrix).length > 0;
//   const hasODA = wizardData.oda && wizardData.oda.enabled;
//   const hasOtherCharges = wizardData.other !== null;

//   const zoneCount = wizardData.zones ? wizardData.zones.length : 0;
//   const matrixRows = wizardData.priceMatrix ? Object.keys(wizardData.priceMatrix).length : 0;
//   const matrixDimension = `${matrixRows}×${zoneCount}`;

//   // Calculate completion percentage
//   let completionScore = 0;

  
//   if (hasZones) completionScore += 25;
//   if (hasCompleteZones) completionScore += 25;
//   if (hasPriceMatrix) completionScore += 25;
//   if (hasPricesEntered) completionScore += 25;

//   return {
//     hasZones,
//     hasPriceMatrix,
//     hasODA,
//     hasOtherCharges,
//     zoneCount,
//     matrixDimension,
//     completionPercentage: completionScore,
//   };
// };

export const getWizardStatus = (
  wizardData: WizardDataV1 | null
): WizardStatus => {
  // No data at all → everything false / 0
  if (!wizardData) {
    return {
      hasZones: false,
      hasPriceMatrix: false,
      hasODA: false,
      hasOtherCharges: false,
      zoneCount: 0,
      matrixDimension: "0×0",
      completionPercentage: 0,
    };
  }

  // ---- Base flags ----
  const hasZones =
    Array.isArray(wizardData.zones) && wizardData.zones.length > 0;

  const hasCompleteZones =
    hasZones &&
    wizardData.zones.every((z) => z && z.isComplete === true);

  const hasPriceMatrix =
    !!wizardData.priceMatrix &&
    typeof wizardData.priceMatrix === "object" &&
    Object.keys(wizardData.priceMatrix).length > 0;

  const hasPricesEntered =
    hasPriceMatrix &&
    Object.values(wizardData.priceMatrix).some((toZones) =>
      toZones && typeof toZones === "object"
        ? Object.values(toZones).some(
            (price) => typeof price === "number" && price > 0
          )
        : false
    );

  const hasODA = !!wizardData.oda && wizardData.oda.enabled === true;
  const hasOtherCharges = wizardData.other != null;

  // ---- Dimension info for UI ----
  const zoneCount = hasZones ? wizardData.zones.length : 0;
  const matrixRows = hasPriceMatrix
    ? Object.keys(wizardData.priceMatrix).length
    : 0;
  const matrixDimension = `${matrixRows}×${zoneCount}`;

  // ---- Progress (0 / 25 / 50 / 75 / 100) ----
  let completionScore = 0;
  if (hasZones) completionScore += 25;          // zones selected
  if (hasCompleteZones) completionScore += 25;  // zones fully configured
  if (hasPriceMatrix) completionScore += 25;    // matrix generated
  if (hasPricesEntered) completionScore += 25;  // at least one price > 0

  return {
    hasZones,
    hasPriceMatrix,
    hasODA,
    hasOtherCharges,
    zoneCount,
    matrixDimension,
    completionPercentage: completionScore,
  };
};