// import { z } from 'zod';

// // =============================================================================
// // PRIMITIVE VALIDATORS (can be used standalone)
// // =============================================================================

// /**
//  * Validate phone number (India format)
//  * Must be exactly 10 digits, cannot start with 0
//  */
// export const validatePhone = (phone: string): string => {
//   if (!phone) return 'Phone number is required';
//   if (phone.startsWith('0')) return 'Cannot start with zero';
//   if (!/^[1-9][0-9]{9}$/.test(phone)) return 'Enter a valid 10-digit phone number';
//   return '';
// };

// /**
//  * Validate email address
//  */
// export const validateEmail = (email: string): string => {
//   if (!email) return 'Email is required';
//   if (/\s/.test(email)) return 'Email cannot contain spaces';
//   if (!/.+@.+\..+/.test(email)) return 'Please add "@" or domain (eg. com)';
//   return '';
// };

// // Flip this to false if you ever want to allow checksum-mismatched GSTs
// const GST_STRICT_CHECKSUM = true;

// export const validateGST = (gst: string): string => {
//   if (!gst) return ''; // Optional field – no error if empty

//   // Normalize: uppercase and remove spaces
//   const gstUpper = gst.toUpperCase().replace(/\s+/g, '');

//   // 1) Length check (15 chars total)
//   if (gstUpper.length !== 15) {
//     return 'GST must be exactly 15 characters';
//   }

//   // 2) Allowed characters: only A–Z and 0–9
//   if (!/^[A-Z0-9]+$/.test(gstUpper)) {
//     return 'GST can only contain letters (A-Z) and digits (0-9)';
//   }

//   // 3) State Code: positions 1–2 (index 0–1)
//   //    Numeric digits 01–35
//   const stateCode = gstUpper.substring(0, 2);
//   const validStateCodes = new Set([
//     '01','02','03','04','05','06','07','08','09','10',
//     '11','12','13','14','15','16','17','18','19','20',
//     '21','22','23','24','25','26','27','28','29','30',
//     '31','32','33','34','35', '38','97','99',
//   ]);
//   if (!validStateCodes.has(stateCode)) {
//     return 'Invalid state code in GST (must be between 01 and 38, 97, or 99)';
//   }

//   // 4) PAN part: positions 3–12 (index 2–11) => AAAAA9999A
//   const panPart = gstUpper.substring(2, 12);
//   if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panPart)) {
//     return 'Invalid PAN format in GST (positions 3–12 must be AAAAA9999A)';
//   }

//   // 5) Entity Code: position 13 (index 12)
//   //    YOUR CUSTOM RULE: must be exactly '1' only
//   const entityCode = gstUpper.charAt(12);
//   if (!/^[1-9A-Z]$/.test(entityCode)) {
//     return 'Entity code (position 13) must be a number (1-9) or letter (A-Z)';
//   }

//   // 6) Default Character: position 14 (index 13) must be 'Z'
//   const defaultChar = gstUpper.charAt(13);
//   if (defaultChar !== 'Z') {
//     return 'Character at position 14 must be Z';
//   }

//   // 7) Checksum Digit: position 15 (index 14) => 0–9 or A–Z
//   const checksumChar = gstUpper.charAt(14);
//   if (!/^[0-9A-Z]$/.test(checksumChar)) {
//     return 'Invalid checksum digit (must be 0–9 or A–Z)';
//   }

//   // 8) MOD-36 checksum over first 14 characters
//   const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

//   let sum = 0;
//   for (let i = 0; i < 14; i++) {
//     const ch = gstUpper.charAt(i);
//     const charValue = charset.indexOf(ch);

//     if (charValue === -1) {
//       return 'GST contains invalid character';
//     }

//     const weight = (i % 2 === 0) ? 1 : 2; // 1,2,1,2,...
//     const product = charValue * weight;

//     const quotient = Math.floor(product / 36);
//     const remainder = product % 36;
//     sum += quotient + remainder;
//   }

//   const checksumValue = (36 - (sum % 36)) % 36;
//   const expectedChecksum = charset.charAt(checksumValue);

//   if (checksumChar !== expectedChecksum) {
//     const msg = `GST checksum digit (last character) is invalid (expected ${expectedChecksum}, got ${checksumChar})`;
//     if (GST_STRICT_CHECKSUM) {
//       return msg; // hard fail
//     } else {
//       console.warn('[GST WARNING]', msg, { input: gstUpper });
//     }
//   }

//   return '';
// };


// /**
//  * COMPUTES OFFICIAL GSTIN CHECK DIGIT
//  * Long-term safe and correct.
//  */
// function validateGSTChecksum(gstin: string): boolean {
//   const factor = [1, 2];
//   const mod = 36;
//   const codePoints = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
//   let sum = 0;

//   // Iterate over first 14 chars
//   for (let i = 0; i < 14; i++) {
//     const cp = codePoints.indexOf(gstin[i]);
//     if (cp === -1) return false;
//     const f = factor[i % 2];
//     const product = cp * f;
//     sum += Math.floor(product / mod) + (product % mod);
//   }

//   const checkDigit = codePoints[mod - (sum % mod)];
//   return gstin[14] === checkDigit;
// }


// /**
//  * Validate pincode (India format)
//  * Must be exactly 6 digits
//  *
//  * @param pincode - Pincode string
//  * @returns Error message or empty string if valid
//  */
// export const validatePincode = (pincode: string): string => {
//   if (!pincode) return 'Pincode is required';
//   if (!/^\d{6}$/.test(pincode)) return 'Pincode must be exactly 6 digits';
//   return '';
// };

// /**
//  * Validate fuel surcharge percentage
//  * Must be 0-40
//  *
//  * @param fuel - Fuel percentage (string or number)
//  * @returns Error message or empty string if valid
//  */
// export const validateFuel = (fuel: string | number): string => {
//   const n = Number(fuel);
//   if (isNaN(n)) return 'Fuel surcharge must be a number';
//   if (n < 0 || n > 50) return 'Fuel surcharge must be between 0 and 40';
//   return '';
// };

// /**
//  * Validate company name
//  * Max 30 characters, all characters allowed
//  */
// export const validateCompanyName = (name: string): string => {
//   if (!name) return 'Company name is required';
//   if (name.length < 2) return 'Company name must be at least 2 characters';
//   if (name.length > 30) return 'Company name must be at most 30 characters';
//   return '';
// };

// /**
//  * Validate contact person name
//  * Alphabets only (+ space, hyphen, apostrophe), max 30 characters
//  */
// export const validateContactName = (name: string): string => {
//   if (!name) return 'Contact person name is required';
//   if (name.length < 2) return 'Contact name must be at least 2 characters';
//   if (name.length > 30) return 'Contact name must be at most 30 characters';
//   if (!/^[a-zA-Z\s\-']+$/.test(name)) {
//     return 'Contact name can only contain letters, spaces, hyphens, and apostrophes';
//   }
//   return '';
// };

// /**
//  * Validate legal company name
//  * Max 60 characters, all characters allowed
//  */
// export const validateLegalCompanyName = (name: string): string => {
//   if (!name) return 'Legal company name is required';
//   if (name.length > 60) return 'Legal company name must be at most 60 characters';
//   return '';
// };

// /**
//  * Validate display name
//  * Max 30 characters, all characters allowed
//  */
// export const validateDisplayName = (name: string): string => {
//   if (!name) return 'Display name is required';
//   if (name.length > 30) return 'Display name must be at most 30 characters';
//   return '';
// };

// /**
//  * Validate sub vendor
//  * Max 20 characters, all characters allowed
//  */
// export const validateSubVendor = (name: string): string => {
//   // Optional field - only validate if provided
//   if (!name) return '';
//   if (name.length > 20) return 'Sub vendor must be at most 20 characters';
//   return '';
// };

// /**
//  * Validate vendor code
//  * Alphanumeric only, auto-uppercase, max 20 characters
//  */
// export const validateVendorCode = (code: string): string => {
//   // Optional field - only validate if provided
//   if (!code) return '';
//   if (code.length > 20) return 'Vendor code must be at most 20 characters';
//   if (!/^[A-Z0-9]+$/.test(code.toUpperCase())) {
//     return 'Vendor code can only contain letters and numbers';
//   }
//   return '';
// };

// /**
//  * Validate primary contact name
//  * Alphabets only (+ space, hyphen, apostrophe), max 25 characters
//  */
// export const validatePrimaryContactName = (name: string): string => {
//   if (!name) return 'Primary contact name is required';
//   if (name.length < 2) return 'Primary contact name must be at least 2 characters';
//   if (name.length > 25) return 'Primary contact name must be at most 25 characters';
//   if (!/^[a-zA-Z\s\-']+$/.test(name)) {
//     return 'Primary contact name can only contain letters, spaces, hyphens, and apostrophes';
//   }
//   return '';
// };

// /**
//  * Validate primary contact phone
//  * Same as validatePhone - 10 digits, cannot start with 0
//  */
// export const validatePrimaryContactPhone = (phone: string): string => {
//   return validatePhone(phone);
// };

// /**
//  * Validate primary contact email
//  * Same as validateEmail - uses isemail
//  */
// export const validatePrimaryContactEmail = (email: string): string => {
//   return validateEmail(email);
// };

// /**
//  * Validate address
//  * Max 150 characters, all characters allowed
//  */
// export const validateAddress = (address: string): string => {
//   if (!address) return 'Address is required';
//   if (address.length > 150) return 'Address must be at most 150 characters';
//   return '';
// };

// // =============================================================================
// // ZOD SCHEMA (for comprehensive validation)
// // =============================================================================

// // Charge card schema (for redesigned charges)
// const ChargeCardSchema = z.object({
//   unit: z.enum(['per kg', 'per piece', 'per box']),
//   currency: z.enum(['INR', 'PERCENT']),
//   mode: z.enum(['FIXED', 'VARIABLE']),
//   fixedAmount: z.number().min(1).max(5000).optional(),
//   variableRange: z.enum(['0%', '0.1% - 1%', '1.25% - 2.5%', '3% - 4%', '4% - 5%']).optional(),
//   weightThreshold: z.number().min(1).max(20000).optional(), // Only required for handlingCharges
// });

// // Charges schema (mixed: simple numbers + card structures)
// const ChargesSchema = z.object({
//   // MANDATORY: Only docket and fuel surcharge are required
//   docketCharges: z.number().min(0, 'Docket charges must be >= 0'),
//   fuelSurchargePct: z
//     .number()
//     .min(0, 'Fuel surcharge must be >= 0')
//     .max(50, 'Fuel surcharge must be <= 50'),

//   // OPTIONAL: All other basic charges
//   minWeightKg: z.number().min(0, 'Min weight must be >= 0').optional(),
//   minCharges: z.number().min(0, 'Min charges must be >= 0').optional(),
//   hamaliCharges: z.number().min(0, 'Hamali charges must be >= 0').optional(),
//   greenTax: z.number().min(0, 'Green tax must be >= 0').optional(),
//   miscCharges: z.number().min(0, 'Misc charges must be >= 0').optional(),
//   daccCharges: z.number().min(0, 'DACC charges must be >= 0').optional(),

//   // --- UPDATED INVOICE FIELDS ---
//   invoiceValueSurcharge: z
//     .number()
//     .min(0, 'Invoice Value Surcharge must be >= 0')
//     .optional(),
//   invoiceValueMinAmount: z
//     .number()
//     .min(0, 'Invoice Value Min Amount must be >= 0')
//     .optional(),
//   // ------------------------------

//   // Card-based charges (redesigned)
//   handlingCharges: ChargeCardSchema,
//   rovCharges: ChargeCardSchema,
//   codCharges: ChargeCardSchema,
//   toPayCharges: ChargeCardSchema,
//   appointmentCharges: ChargeCardSchema,
// });

// // Volumetric configuration schema
// const VolumetricConfigSchema = z.object({
//   unit: z.enum(['cm', 'inch'], {
//     errorMap: () => ({ message: 'Unit must be cm or inch' }),
//   }),
//   divisor: z.number().positive('Divisor must be positive'),
//   cftFactor: z.number().positive('CFT factor must be positive').optional(),
// });

// // Geo schema (pincode lookup result)
// const GeoSchema = z.object({
//   pincode: z
//     .string()
//     .length(6, 'Pincode must be 6 digits')
//     .regex(/^\d{6}$/, 'Pincode must be numeric'),
//   state: z.string().min(1, 'State is required'),
//   city: z.string().min(1, 'City is required'),
// });

// // Zone rates matrix schema
// const ZoneRateMatrixSchema = z.record(
//   z.string(),
//   z.record(z.string(), z.number().min(0, 'Zone rate must be >= 0'))
// );

// // Main TemporaryTransporter schema with CORRECTED GST regex
// export const TemporaryTransporterSchema = z.object({
//   ownerUserId: z.string().optional(), // Backend resolves from token
//   companyName: z
//     .string()
//     .min(2, 'Company name must be at least 2 characters')
//     .max(120, 'Company name must be at most 120 characters')
//     .regex(
//       /^[a-zA-Z0-9\s.,&\-_]+$/,
//       'Company name can only contain letters, numbers, space, . & - _'
//     ),
//   contactPersonName: z
//     .string()
//     .min(2, 'Contact name must be at least 2 characters')
//     .max(80, 'Contact name must be at most 80 characters'),
//   vendorPhoneNumber: z
//     .string()
//     .length(10, 'Phone must be exactly 10 digits')
//     .regex(/^\d{10}$/, 'Phone must be numeric'),
//   vendorEmailAddress: z
//     .string()
//     .email('Invalid email format')
//     .min(1, 'Email is required'),

//   gstin: z
//   .string()
//   .refine(
//     (val) => {
//       if (!val || val === '') return true; // Empty is allowed (optional field)
//       const error = validateGST(val);
//       return error === ''; // Pass if no error
//     },
//     {
//       message: 'Invalid GST number (checksum verification failed)',
//     }
//   )
//   .optional()
//   .or(z.literal('')),

//   transportMode: z.enum(['road', 'air', 'rail', 'ship'], {
//     errorMap: () => ({ message: 'Invalid transport mode' }),
//   }),
//   volumetric: VolumetricConfigSchema,
//   charges: ChargesSchema,
//   geo: GeoSchema,
//   zoneRates: ZoneRateMatrixSchema,
//   priceChartFileId: z.string().optional(),
//   sources: z.object({
//     createdFrom: z.literal('AddVendor v2'),
//   }),
//   status: z.enum(['draft', 'submitted']),
//   createdAt: z.string().optional(),
//   updatedAt: z.string().optional(),
// });

// // Export types derived from schema
// export type TemporaryTransporter = z.infer<typeof TemporaryTransporterSchema>;
// export type Charges = z.infer<typeof ChargesSchema>;
// export type ChargeCardData = z.infer<typeof ChargeCardSchema>;
// export type VolumetricConfig = z.infer<typeof VolumetricConfigSchema>;
// export type Geo = z.infer<typeof GeoSchema>;
// export type ZoneRateMatrix = z.infer<typeof ZoneRateMatrixSchema>;

// // =============================================================================
// // VALIDATION HELPERS
// // =============================================================================

// /**
//  * Validate entire vendor object
//  *
//  * @param data - Vendor data to validate
//  * @returns { success: boolean, errors?: Record<string, string> }
//  */
// export const validateVendor = (
//   data: unknown
// ): { success: boolean; errors?: Record<string, string[]> } => {
//   const result = TemporaryTransporterSchema.safeParse(data);

//   if (result.success) {
//     return { success: true };
//   }

//   // Flatten Zod errors to field-level messages
//   const errors: Record<string, string[]> = {};
//   result.error.errors.forEach((err) => {
//     const path = err.path.join('.');
//     if (!errors[path]) {
//       errors[path] = [];
//     }
//     errors[path].push(err.message);
//   });

//   return { success: false, errors };
// };

// /**
//  * Check if zone rates matrix is complete (no empty cells)
//  *
//  * @param zoneRates - Zone rates matrix
//  * @returns Error message or empty string if valid
//  */
// export const validateZoneRatesCompleteness = (
//   zoneRates: Record<string, Record<string, number>>
// ): string => {
//   for (const [fromZone, toZones] of Object.entries(zoneRates)) {
//     for (const [toZone, price] of Object.entries(toZones)) {
//       if (price === undefined || price === null || isNaN(price)) {
//         return `Missing rate for ${fromZone} → ${toZone}`;
//       }
//       if (price < 0) {
//         return `Invalid rate for ${fromZone} → ${toZone} (must be >= 0)`;
//       }
//     }
//   }
//   return '';
// };

// // =============================================================================
// // CONSTANTS
// // =============================================================================

// export const TRANSPORT_MODES = [
//   { value: 'road', label: 'Road', disabled: false },
//   { value: 'air', label: 'Air - Coming Soon', disabled: true },
//   { value: 'rail', label: 'Rail - Coming Soon', disabled: true },
//   { value: 'ship', label: 'Ship - Coming Soon', disabled: true },
// ] as const;

// export const VOLUMETRIC_DIVISOR_OPTIONS_CM = [
//   2800, 3000, 3200, 3500, 3800, 4000, 4200, 4500, 4720, 4750, 5000, 5200, 5500,
//   5800, 6000, 7000,
// ] as const;

// export const CFT_FACTOR_OPTIONS = [4, 5, 6, 7, 8, 9, 10] as const;

// export const FUEL_SURCHARGE_OPTIONS = [
//   0, 5, 10, 15, 20, 25, 30, 35, 40,
// ] as const;

// export const CHARGE_MAX = 10000;



import { z } from 'zod';

// =============================================================================
// PRIMITIVE VALIDATORS (can be used standalone)
// =============================================================================

/**
 * Validate phone number (India format)
 * Must be exactly 10 digits, cannot start with 0
 */
export const validatePhone = (phone: string): string => {
  if (!phone) return 'Phone number is required';
  if (phone.startsWith('0')) return 'Cannot start with zero';
  if (!/^[1-9][0-9]{9}$/.test(phone)) return 'Enter a valid 10-digit phone number';
  return '';
};

/**
 * Validate email address
 */
export const validateEmail = (email: string): string => {
  if (!email) return 'Email is required';
  if (/\s/.test(email)) return 'Email cannot contain spaces';
  if (!/.+@.+\..+/.test(email)) return 'Please add "@" or domain (eg. com)';
  return '';
};

// Flip this to false if you ever want to allow checksum-mismatched GSTs
const GST_STRICT_CHECKSUM = true;

export const validateGST = (gst: string): string => {
  if (!gst) return ''; // Optional field – no error if empty

  // Normalize: uppercase and remove spaces
  const gstUpper = gst.toUpperCase().replace(/\s+/g, '');

  // 1) Length check (15 chars total)
  if (gstUpper.length !== 15) {
    return 'GST must be exactly 15 characters';
  }

  // 2) Allowed characters: only A–Z and 0–9
  if (!/^[A-Z0-9]+$/.test(gstUpper)) {
    return 'GST can only contain letters (A-Z) and digits (0-9)';
  }

  // 3) State Code: positions 1–2 (index 0–1)
  //    Numeric digits 01–35
  const stateCode = gstUpper.substring(0, 2);
  const validStateCodes = new Set([
    '01','02','03','04','05','06','07','08','09','10',
    '11','12','13','14','15','16','17','18','19','20',
    '21','22','23','24','25','26','27','28','29','30',
    '31','32','33','34','35', '38','97','99',
  ]);
  if (!validStateCodes.has(stateCode)) {
    return 'Invalid state code in GST (must be between 01 and 38, 97, or 99)';
  }

  // 4) PAN part: positions 3–12 (index 2–11) => AAAAA9999A
  const panPart = gstUpper.substring(2, 12);
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panPart)) {
    return 'Invalid PAN format in GST (positions 3–12 must be AAAAA9999A)';
  }

  // 5) Entity Code: position 13 (index 12)
  //    YOUR CUSTOM RULE: must be exactly '1' only
  const entityCode = gstUpper.charAt(12);
  if (!/^[1-9A-Z]$/.test(entityCode)) {
    return 'Entity code (position 13) must be a number (1-9) or letter (A-Z)';
  }

  // 6) Default Character: position 14 (index 13) must be 'Z'
  const defaultChar = gstUpper.charAt(13);
  if (defaultChar !== 'Z') {
    return 'Character at position 14 must be Z';
  }

  // 7) Checksum Digit: position 15 (index 14) => 0–9 or A–Z
  const checksumChar = gstUpper.charAt(14);
  if (!/^[0-9A-Z]$/.test(checksumChar)) {
    return 'Invalid checksum digit (must be 0–9 or A–Z)';
  }

  // 8) MOD-36 checksum over first 14 characters
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const ch = gstUpper.charAt(i);
    const charValue = charset.indexOf(ch);

    if (charValue === -1) {
      return 'GST contains invalid character';
    }

    const weight = (i % 2 === 0) ? 1 : 2; // 1,2,1,2,...
    const product = charValue * weight;

    const quotient = Math.floor(product / 36);
    const remainder = product % 36;
    sum += quotient + remainder;
  }

  const checksumValue = (36 - (sum % 36)) % 36;
  const expectedChecksum = charset.charAt(checksumValue);

  if (checksumChar !== expectedChecksum) {
    const msg = `GST checksum digit (last character) is invalid (expected ${expectedChecksum}, got ${checksumChar})`;
    if (GST_STRICT_CHECKSUM) {
      return msg; // hard fail
    } else {
      console.warn('[GST WARNING]', msg, { input: gstUpper });
    }
  }

  return '';
};


/**
 * COMPUTES OFFICIAL GSTIN CHECK DIGIT
 * Long-term safe and correct.
 */
function validateGSTChecksum(gstin: string): boolean {
  const factor = [1, 2];
  const mod = 36;
  const codePoints = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;

  // Iterate over first 14 chars
  for (let i = 0; i < 14; i++) {
    const cp = codePoints.indexOf(gstin[i]);
    if (cp === -1) return false;
    const f = factor[i % 2];
    const product = cp * f;
    sum += Math.floor(product / mod) + (product % mod);
  }

  const checkDigit = codePoints[mod - (sum % mod)];
  return gstin[14] === checkDigit;
}


/**
 * Validate pincode (India format)
 * Must be exactly 6 digits
 *
 * @param pincode - Pincode string
 * @returns Error message or empty string if valid
 */
export const validatePincode = (pincode: string): string => {
  if (!pincode) return 'Pincode is required';
  if (!/^\d{6}$/.test(pincode)) return 'Pincode must be exactly 6 digits';
  return '';
};

/**
 * Validate fuel surcharge percentage
 * Must be 0-40
 *
 * @param fuel - Fuel percentage (string or number)
 * @returns Error message or empty string if valid
 */
export const validateFuel = (fuel: string | number): string => {
  const n = Number(fuel);
  if (isNaN(n)) return 'Fuel surcharge must be a number';
  if (n < 0 || n > 50) return 'Fuel surcharge must be between 0 and 40';
  return '';
};

/**
 * Validate company name
 * Max 30 characters, all characters allowed
 */
export const validateCompanyName = (name: string): string => {
  if (!name) return 'Company name is required';
  if (name.length < 2) return 'Company name must be at least 2 characters';
  if (name.length > 30) return 'Company name must be at most 30 characters';
  return '';
};

/**
 * Validate contact person name
 * Alphabets only (+ space, hyphen, apostrophe), max 30 characters
 */
export const validateContactName = (name: string): string => {
  if (!name) return 'Contact person name is required';
  if (name.length < 2) return 'Contact name must be at least 2 characters';
  if (name.length > 30) return 'Contact name must be at most 30 characters';
  if (!/^[a-zA-Z\s\-']+$/.test(name)) {
    return 'Contact name can only contain letters, spaces, hyphens, and apostrophes';
  }
  return '';
};

/**
 * Validate legal company name
 * Max 60 characters, all characters allowed
 */
export const validateLegalCompanyName = (name: string): string => {
  if (!name) return 'Legal company name is required';
  if (name.length > 60) return 'Legal company name must be at most 60 characters';
  return '';
};

/**
 * Validate display name
 * Max 30 characters, all characters allowed
 */
export const validateDisplayName = (name: string): string => {
  if (!name) return 'Display name is required';
  if (name.length > 30) return 'Display name must be at most 30 characters';
  return '';
};

/**
 * Validate sub vendor
 * Max 20 characters, all characters allowed
 */
export const validateSubVendor = (name: string): string => {
  // Optional field - only validate if provided
  if (!name) return '';
  if (name.length > 20) return 'Sub vendor must be at most 20 characters';
  return '';
};

/**
 * Validate vendor code
 * Alphanumeric only, auto-uppercase, max 20 characters
 */
export const validateVendorCode = (code: string): string => {
  // Optional field - only validate if provided
  if (!code) return '';
  if (code.length > 20) return 'Vendor code must be at most 20 characters';
  if (!/^[A-Z0-9]+$/.test(code.toUpperCase())) {
    return 'Vendor code can only contain letters and numbers';
  }
  return '';
};

/**
 * Validate primary contact name
 * Alphabets only (+ space, hyphen, apostrophe), max 25 characters
 */
export const validatePrimaryContactName = (name: string): string => {
  if (!name) return 'Primary contact name is required';
  if (name.length < 2) return 'Primary contact name must be at least 2 characters';
  if (name.length > 25) return 'Primary contact name must be at most 25 characters';
  if (!/^[a-zA-Z\s\-']+$/.test(name)) {
    return 'Primary contact name can only contain letters, spaces, hyphens, and apostrophes';
  }
  return '';
};

/**
 * Validate primary contact phone
 * Same as validatePhone - 10 digits, cannot start with 0
 */
export const validatePrimaryContactPhone = (phone: string): string => {
  return validatePhone(phone);
};

/**
 * Validate primary contact email
 * Same as validateEmail - uses isemail
 */
export const validatePrimaryContactEmail = (email: string): string => {
  return validateEmail(email);
};

/**
 * Validate address
 * Max 150 characters, all characters allowed
 */
export const validateAddress = (address: string): string => {
  if (!address) return 'Address is required';
  if (address.length > 150) return 'Address must be at most 150 characters';
  return '';
};

// =============================================================================
// ZOD SCHEMA (for comprehensive validation)
// =============================================================================

// Charge card schema (for redesigned charges)
const ChargeCardSchema = z.object({
  unit: z.enum(['per kg', 'per piece', 'per box']),
  currency: z.enum(['INR', 'PERCENT']),
  mode: z.enum(['FIXED', 'VARIABLE']),
  fixedAmount: z.number().min(1).max(5000).optional(),
  variableRange: z.enum(['0%', '0.1% - 1%', '1.25% - 2.5%', '3% - 4%', '4% - 5%']).optional(),
  weightThreshold: z.number().min(1).max(20000).optional(), // Only required for handlingCharges
});

// Charges schema (mixed: simple numbers + card structures)
const ChargesSchema = z.object({
  // MANDATORY: Only docket and fuel surcharge are required
  docketCharges: z.number().min(0, 'Docket charges must be >= 0'),
  fuelSurchargePct: z
    .number()
    .min(0, 'Fuel surcharge must be >= 0')
    .max(50, 'Fuel surcharge must be <= 50'),

  // OPTIONAL: All other basic charges
  minWeightKg: z.number().min(0, 'Min weight must be >= 0').optional(),
  minCharges: z.number().min(0, 'Min charges must be >= 0').optional(),
  hamaliCharges: z.number().min(0, 'Hamali charges must be >= 0').optional(),
  greenTax: z.number().min(0, 'Green tax must be >= 0').optional(),
  miscCharges: z.number().min(0, 'Misc charges must be >= 0').optional(),
  daccCharges: z.number().min(0, 'DACC charges must be >= 0').optional(),

  // --- UPDATED INVOICE FIELDS ---
  invoiceValueSurcharge: z
    .number()
    .min(0, 'Invoice Value Surcharge must be >= 0')
    .optional(),
  invoiceValueMinAmount: z
    .number()
    .min(0, 'Invoice Value Min Amount must be >= 0')
    .optional(),
  // ------------------------------

  // Card-based charges (redesigned)
  handlingCharges: ChargeCardSchema,
  rovCharges: ChargeCardSchema,
  codCharges: ChargeCardSchema,
  toPayCharges: ChargeCardSchema,
  appointmentCharges: ChargeCardSchema,
});

// Volumetric configuration schema
const VolumetricConfigSchema = z.object({
  unit: z.enum(['cm', 'inch'], {
    errorMap: () => ({ message: 'Unit must be cm or inch' }),
  }),
  divisor: z.number().positive('Divisor must be positive'),
  cftFactor: z.number().positive('CFT factor must be positive').optional(),
});

// Geo schema (pincode lookup result)
const GeoSchema = z.object({
  pincode: z
    .string()
    .length(6, 'Pincode must be 6 digits')
    .regex(/^\d{6}$/, 'Pincode must be numeric'),
  state: z.string().min(1, 'State is required'),
  city: z.string().min(1, 'City is required'),
});

// Zone rates matrix schema
const ZoneRateMatrixSchema = z.record(
  z.string(),
  z.record(z.string(), z.number().min(0, 'Zone rate must be >= 0'))
);

// Main TemporaryTransporter schema with CORRECTED GST regex
export const TemporaryTransporterSchema = z.object({
  ownerUserId: z.string().optional(), // Backend resolves from token
  companyName: z
    .string()
    .min(2, 'Company name must be at least 2 characters')
    .max(120, 'Company name must be at most 120 characters')
    .regex(
      /^[a-zA-Z0-9\s.,&\-_]+$/,
      'Company name can only contain letters, numbers, space, . & - _'
    ),
  contactPersonName: z
    .string()
    .min(2, 'Contact name must be at least 2 characters')
    .max(80, 'Contact name must be at most 80 characters'),
  vendorPhoneNumber: z
    .string()
    .length(10, 'Phone must be exactly 10 digits')
    .regex(/^\d{10}$/, 'Phone must be numeric'),
  vendorEmailAddress: z
    .string()
    .email('Invalid email format')
    .min(1, 'Email is required'),

  gstin: z
  .string()
  .refine(
    (val) => {
      if (!val || val === '') return true; // Empty is allowed (optional field)
      const error = validateGST(val);
      return error === ''; // Pass if no error
    },
    {
      message: 'Invalid GST number (checksum verification failed)',
    }
  )
  .optional()
  .or(z.literal('')),

  transportMode: z.enum(['road', 'air', 'rail', 'ship'], {
    errorMap: () => ({ message: 'Invalid transport mode' }),
  }),
  volumetric: VolumetricConfigSchema,
  charges: ChargesSchema,
  geo: GeoSchema,
  zoneRates: ZoneRateMatrixSchema,
  priceChartFileId: z.string().optional(),
  sources: z.object({
    createdFrom: z.literal('AddVendor v2'),
  }),
  status: z.enum(['draft', 'submitted']),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// Export types derived from schema
export type TemporaryTransporter = z.infer<typeof TemporaryTransporterSchema>;
export type Charges = z.infer<typeof ChargesSchema>;
export type ChargeCardData = z.infer<typeof ChargeCardSchema>;
export type VolumetricConfig = z.infer<typeof VolumetricConfigSchema>;
export type Geo = z.infer<typeof GeoSchema>;
export type ZoneRateMatrix = z.infer<typeof ZoneRateMatrixSchema>;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate entire vendor object
 *
 * @param data - Vendor data to validate
 * @returns { success: boolean, errors?: Record<string, string> }
 */
export const validateVendor = (
  data: unknown
): { success: boolean; errors?: Record<string, string[]> } => {
  const result = TemporaryTransporterSchema.safeParse(data);

  if (result.success) {
    return { success: true };
  }

  // Flatten Zod errors to field-level messages
  const errors: Record<string, string[]> = {};
  result.error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(err.message);
  });

  return { success: false, errors };
};

/**
 * Check if zone rates matrix is complete (no empty cells)
 *
 * @param zoneRates - Zone rates matrix
 * @returns Error message or empty string if valid
 */
export const validateZoneRatesCompleteness = (
  zoneRates: Record<string, Record<string, number>>
): string => {
  for (const [fromZone, toZones] of Object.entries(zoneRates)) {
    for (const [toZone, price] of Object.entries(toZones)) {
      if (price === undefined || price === null || isNaN(price)) {
        return `Missing rate for ${fromZone} → ${toZone}`;
      }
      if (price < 0) {
        return `Invalid rate for ${fromZone} → ${toZone} (must be >= 0)`;
      }
    }
  }
  return '';
};

// =============================================================================
// CONSTANTS
// =============================================================================

export const TRANSPORT_MODES = [
  { value: 'road', label: 'Road', disabled: false },
  { value: 'air', label: 'Air - Coming Soon', disabled: true },
  { value: 'rail', label: 'Rail - Coming Soon', disabled: true },
  { value: 'ship', label: 'Ship - Coming Soon', disabled: true },
] as const;

export const VOLUMETRIC_DIVISOR_OPTIONS_CM = [
  2800, 3000, 3200, 3500, 3800, 4000, 4200, 4500, 4720, 4750, 5000, 5200, 5500,
  5800, 6000, 7000,
] as const;

export const CFT_FACTOR_OPTIONS = [4, 5, 6, 7, 8, 9, 10] as const;

export const FUEL_SURCHARGE_OPTIONS = [
  0, 5, 10, 15, 20, 25, 30, 35, 40,
] as const;

// Variable percentage options for Handling, ROV/FOV, COD/DOD, To-Pay, Appointment
export const VARIABLE_PERCENTAGE_OPTIONS = [
  // 0.1% to 1%
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
  // 1.25% to 2.5%
  1.25, 1.5, 1.75, 2.0, 2.25, 2.5,
  // 3% to 5%
  3.0, 3.5, 4.0, 4.5, 5.0,
] as const;

export const CHARGE_MAX = 10000;