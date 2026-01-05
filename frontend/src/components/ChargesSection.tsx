// // src/components/ChargesSection.tsx
// /**
//  * ChargesSection component
//  * COMPLETE IMPLEMENTATION - ALL 6 TODO ITEMS + NEW UPDATES:
//  * 1. ✅ All mandatory fields marked with red asterisk (*)
//  * 2. ✅ Fuel surcharge custom input with 0-50 validation
//  * 3. ✅ DACC Charges field added
//  * 4. ✅ Divider element "Handling & Additional Charges"
//  * 5. ✅ Layout reorganized as specified
//  * 6. ✅ FIXED: COD/DOD and To-Pay toggles now independent
//  * 
//  * ✅ NEW UPDATES:
//  * - Removed placeholder "0" from basic charge fields
//  * - Added indigo colored borders (border-2 border-indigo-500) for visibility
//  * - Added prominent ROV = Invoice Value info box
//  * 
//  * Layout:
//  * Row 1: Docket*, Min Weight*, Min Charges*
//  * Row 2: Hamali*, Green Tax*, Misc*
//  * Row 3: Fuel Surcharge* (custom), DACC Charges*, [empty]
//  * Row 4: ──────── DIVIDER ────────
//  * Row 5: Handling, ROV, COD
//  * Row 6: To-Pay, Appointment, [empty]
//  */

// import React, { useState } from 'react';
// import { UseChargesReturn } from '../hooks/useCharges';
// import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
// import { FUEL_SURCHARGE_OPTIONS, CHARGE_MAX, ChargeCardData } from '../utils/validators';
// import { CompactChargeCard } from './CompactChargeCard';

// // =============================================================================
// // PROPS
// // =============================================================================

// interface ChargesSectionProps {
//   charges: UseChargesReturn;
// }

// // =============================================================================
// // Helpers (sanitize / clamp decimals)
// // =============================================================================

// /**
//  * Keep only digits and at most one dot. Remove leading zeros (but keep single '0').
//  * Return a normalized string with at most `precision` decimal places.
//  * If integerOnly is true, only accept whole numbers (no decimals)
//  */

// const displayZeroAsBlank = (
//   val: string | number | null | undefined
// ): string => {
//   if (val === 0 || val === '0' || val === null || val === undefined) {
//     return '';
//   }
//   return String(val);
// };

// function sanitizeDecimalString(raw: string, precision = 2, integerOnly = false) {
//   if (!raw) return '';
//   let s = String(raw).trim();
//   s = s.replace(/,/g, '');

//   if (integerOnly) {
//     // Only allow digits, no decimal point
//     s = s.replace(/[^\d]/g, '');
//     // Remove leading zeros but keep single '0'
//     s = s.replace(/^0+([1-9])/, '$1');
//     if (s === '') return '';
//     return s;
//   }

//   s = s.replace(/[^\d.]/g, '');

//   const parts = s.split('.');
//   if (parts.length > 1) {
//     s = parts[0] + '.' + parts.slice(1).join('');
//   }

//   if (s.includes('.')) {
//     const [intPart, decPart] = s.split('.');
//     const dec = decPart.slice(0, precision);
//     s = `${intPart || '0'}${precision > 0 ? `.${dec}` : ''}`;
//   }

//   s = s.replace(/^0+([1-9])/, '$1');
//   if (s.startsWith('.')) s = '0' + s;
//   if (s === '') return '';

//   return s;
// }

// /**
//  * Clamp the numeric string to [min,max], return normalized string (without exponential notation).
//  */
// function clampDecimalString(raw: string, min: number, max: number, precision = 2) {
//   const sanitized = sanitizeDecimalString(raw, precision);
//   if (!sanitized) return '';

//   const n = Number(sanitized);
//   if (!Number.isFinite(n)) return '';

//   const clamped = Math.min(Math.max(n, min), max);

//   if (precision <= 0) return String(Math.round(clamped));
//   let fixed = clamped.toFixed(precision);
//   fixed = fixed.replace(/\.?0+$/, '');
//   return fixed;
// }

// const BLOCKED_KEYS = new Set(['e', 'E', '+', '-']);

// // =============================================================================
// // SUB-COMPONENTS
// // =============================================================================

// interface SimpleChargeFieldProps {
//   label: string;
//   name: string;
//   value: number;
//   onChange: (value: number) => void;
//   onBlur: () => void;
//   error?: string;
//   min?: number;
//   max?: number;
//   suffix?: string;
//   maxLength?: number;
//   precision?: number;
//   required?: boolean;
//   integerOnly?: boolean; // NEW: only allow whole numbers
// }

// const SimpleChargeField: React.FC<SimpleChargeFieldProps> = ({
//   label,
//   name,
//   value,
//   onChange,
//   onBlur,
//   error,
//   min = 0,
//   max = CHARGE_MAX,
//   suffix = '₹',
//   maxLength,
//   precision = 2,
//   required = false,
//   integerOnly = false, // NEW
// }) => {
//     const displayed = displayZeroAsBlank(value);


//   const handleTextChange = (raw: string) => {
//     const sanitized = sanitizeDecimalString(raw, precision, integerOnly);
//     if (!sanitized) {
//       onChange(0);
//       return;
//     }

//     const num = Number(sanitized);
//     if (!Number.isFinite(num)) {
//       onChange(0);
//       return;
//     }

//     // Clamp to [min, max]
//     const clamped = Math.min(Math.max(num, min), max);
//     onChange(clamped);
//   };

//   const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     handleTextChange(e.target.value);
//   };

//   const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (BLOCKED_KEYS.has(e.key)) {
//       e.preventDefault();
//     }
//   };

//   const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
//     const pasted = e.clipboardData?.getData('text') ?? '';
//     e.preventDefault();
//     handleTextChange(pasted);
//   };

//   return (
//     <div>
//       <label
//         htmlFor={name}
//         className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
//       >
//         {label} {required && <span className="text-red-500">*</span>}
//       </label>

//       <div className="relative mt-1">
//         <input
//           type="text"
//           id={name}
//           name={name}
//           value={displayed}
//           onChange={onInputChange}
//           onBlur={onBlur}
//           inputMode="decimal"
//           maxLength={maxLength}
//           className={`block w-full border-2 rounded-lg shadow-sm pl-3 pr-8 py-2 text-sm text-slate-800 placeholder-slate-400
//                      focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition bg-slate-50/70
//                      ${error ? 'border-red-500 focus:border-red-600' : 'border-indigo-500 focus:border-indigo-600'}`}
//           placeholder=""
//           aria-invalid={!!error}
//           onKeyDown={onKeyDown}
//           onPaste={onPaste}
//         />
//         {suffix && (
//           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
//             {suffix}
//           </span>
//         )}
//       </div>

//       {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
//     </div>
//   );
// };

// // =============================================================================
// // MAIN COMPONENT
// // =============================================================================

// export const ChargesSection: React.FC<ChargesSectionProps> = ({ charges }) => {
//   const { charges: chargeValues, errors, setCharge, setCardField, validateField, validateCardField } = charges;

//   // State for custom fuel surcharge input
//   const [isCustomFuel, setIsCustomFuel] = useState(false);
//   const [customFuelValue, setCustomFuelValue] = useState('');

//   // Handle fuel surcharge dropdown change
//   const handleFuelDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//     const value = e.target.value;
//     if (value === '') {
//     // blank selection – keep it visually empty, but store 0
//     setIsCustomFuel(false);
//     setCharge('fuelSurchargePct', 0);
//     return;
//   }
//     if (value === 'custom') {
//       setIsCustomFuel(true);
//       setCustomFuelValue(String(chargeValues.fuelSurchargePct || ''));
//     } else {
//       setIsCustomFuel(false);
//       setCharge('fuelSurchargePct', Number(value));
//     }
//   };

//   // Handle custom fuel input change
//   const handleCustomFuelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const raw = e.target.value;
//     // Block typing values > 50
//     const sanitized = sanitizeDecimalString(raw, 0);
//     if (sanitized === '') {
//       setCustomFuelValue('');
//       setCharge('fuelSurchargePct', 0);
//       return;
//     }

//     const num = Number(sanitized);
//     if (num > 50) {
//       return; // Block typing
//     }

//     setCustomFuelValue(sanitized);
//     setCharge('fuelSurchargePct', num);
//   };

//   // Handle custom fuel paste
//   const handleCustomFuelPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
//     const pasted = e.clipboardData?.getData('text') ?? '';
//     e.preventDefault();

//     const sanitized = sanitizeDecimalString(pasted, 0);
//     if (sanitized === '') {
//       setCustomFuelValue('');
//       setCharge('fuelSurchargePct', 0);
//       return;
//     }

//     const num = Number(sanitized);
//     if (num > 50) {
//       return; // Block pasting values > 50
//     }

//     setCustomFuelValue(sanitized);
//     setCharge('fuelSurchargePct', num);
//   };

//   // Handle custom fuel blur - show error if > 50
//   const handleCustomFuelBlur = () => {
//     const num = Number(customFuelValue);
//     if (num > 50) {
//       // This shouldn't happen due to blocking, but as a safeguard
//       setCustomFuelValue('50');
//       setCharge('fuelSurchargePct', 50);
//     }
//     validateField('fuelSurchargePct');
//   };

//   return (
//     <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
//       <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
//         <CurrencyDollarIcon className="w-5 h-5 text-blue-500" />
//         Basic Charges
//       </h2>

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//         {/* ═══════════════════════════════════════════════════════════════ */}
//         {/* ROW 1: Docket*, Min Weight*, Min Charges* */}
//         {/* ═══════════════════════════════════════════════════════════════ */}

//         <SimpleChargeField
//           label="Docket Charges"
//           name="docketCharges"
//           value={chargeValues.docketCharges}
//           onChange={(val) => setCharge('docketCharges', val)}
//           onBlur={() => validateField('docketCharges')}
//           error={errors.docketCharges}
//           suffix="₹"
//           max={CHARGE_MAX}
//           maxLength={10}
//           precision={0}
//           required={true}
//           integerOnly={true}
//         />

//         <SimpleChargeField
//           label="Min Chargeable Weight"
//           name="minWeightKg"
//           value={chargeValues.minWeightKg}
//           onChange={(val) => setCharge('minWeightKg', val)}
//           onBlur={() => validateField('minWeightKg')}
//           error={errors.minWeightKg}
//           suffix="KG"
//           max={CHARGE_MAX}
//           maxLength={7}
//           precision={0}
//           required={false}
//           integerOnly={true}
//         />

//         <SimpleChargeField
//           label="Minimum Charges"
//           name="minCharges"
//           value={chargeValues.minCharges}
//           onChange={(val) => setCharge('minCharges', val)}
//           onBlur={() => validateField('minCharges')}
//           error={errors.minCharges}
//           suffix="₹"
//           max={CHARGE_MAX}
//           maxLength={10}
//           precision={0}
//           required={false}
//           integerOnly={true}
//         />

//         {/* ═══════════════════════════════════════════════════════════════ */}
//         {/* ROW 2: Hamali*, Green Tax*, Misc* */}
//         {/* ═══════════════════════════════════════════════════════════════ */}

//         <SimpleChargeField
//           label="Hamali Charges"
//           name="hamaliCharges"
//           value={chargeValues.hamaliCharges}
//           onChange={(val) => setCharge('hamaliCharges', val)}
//           onBlur={() => validateField('hamaliCharges')}
//           error={errors.hamaliCharges}
//           suffix="₹"
//           max={CHARGE_MAX}
//           maxLength={10}
//           precision={0}
//           required={false}
//           integerOnly={true}
//         />

//         <SimpleChargeField
//           label="Green Tax / NGT"
//           name="greenTax"
//           value={chargeValues.greenTax}
//           onChange={(val) => setCharge('greenTax', val)}
//           onBlur={() => validateField('greenTax')}
//           error={errors.greenTax}
//           suffix="₹"
//           max={CHARGE_MAX}
//           maxLength={10}
//           precision={0}
//           required={false}
//           integerOnly={true}
//         />

//         <SimpleChargeField
//           label="Misc / AOC Charges"
//           name="miscCharges"
//           value={chargeValues.miscCharges}
//           onChange={(val) => setCharge('miscCharges', val)}
//           onBlur={() => validateField('miscCharges')}
//           error={errors.miscCharges}
//           suffix="₹"
//           max={CHARGE_MAX}
//           maxLength={10}
//           precision={0}
//           required={false}
//           integerOnly={true}
//         />

//         {/* ═══════════════════════════════════════════════════════════════ */}
//         {/* ROW 3: Fuel Surcharge* (custom), DACC Charges*, [empty] */}
//         {/* ═══════════════════════════════════════════════════════════════ */}

//         {/* Fuel Surcharge - Dropdown OR Custom Input */}
//         <div>
//           <label
//             htmlFor="fuelSurchargePct"
//             className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
//           >
//             Fuel Surcharge <span className="text-red-500">*</span>
//           </label>

//           {!isCustomFuel ? (
//             // Dropdown mode
//             <div className="relative mt-1">
//            <select
//   id="fuelSurchargePct"
//   name="fuelSurchargePct"
//  value={
//     chargeValues.fuelSurchargePct === 0 ||

//     chargeValues.fuelSurchargePct === null ||
//     chargeValues.fuelSurchargePct === undefined
//       ? ''
//       : String(chargeValues.fuelSurchargePct)
//   }
//   onChange={handleFuelDropdownChange}
//   onBlur={() => validateField('fuelSurchargePct')}
//   className={`block w-full border border-indigo-400 rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800
//              focus:outline-none focus:ring-1 transition bg-slate-50/70
//              ${
//                errors.fuelSurchargePct
//                  ? 'border-red-500 focus:ring-red-500'
//                  : 'focus:ring-indigo-500'
//              }`}
// >

//   <option value="">{''}</option>

//                 {FUEL_SURCHARGE_OPTIONS.map((option) => (
//                   <option key={option} value={option}>
//                     {option}%
//                   </option>
//                 ))}
//                 <option value="custom">Custom</option>
//               </select>
//             </div>
//           ) : (
//             // Custom input mode
//             <div className="mt-1 space-y-2">
//               <div className="relative">
//                 <input
//   type="text"
//   id="fuelSurchargePct"
//   name="fuelSurchargePct"
//   value={customFuelValue}
//   onChange={handleCustomFuelChange}
//   onBlur={handleCustomFuelBlur}
//   onPaste={handleCustomFuelPaste}
//   onKeyDown={(e) => {
//     if (BLOCKED_KEYS.has(e.key)) {
//       e.preventDefault();
//     }
//   }}
//   inputMode="numeric"
//   maxLength={2}
//   className={`block w-full border border-indigo-400 rounded-lg shadow-sm pl-3 pr-8 py-2 text-sm text-slate-800 placeholder-slate-400
//              focus:outline-none focus:ring-1 transition bg-slate-50/70
//              ${
//                errors.fuelSurchargePct
//                  ? 'border-red-500 focus:ring-red-500'
//                  : 'focus:ring-indigo-500'
//              }`}
//   placeholder="Enter 0-50"
// />

//                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
//                   %
//                 </span>
//               </div>
//               <button
//                 type="button"
//                 onClick={() => {
//                   setIsCustomFuel(false);
//                   setCustomFuelValue('');
//                 }}
//                 className="text-xs text-blue-600 hover:text-blue-800 underline"
//               >
//                 ← Back to dropdown
//               </button>
//             </div>
//           )}

//           {errors.fuelSurchargePct && (
//             <p className="mt-1 text-xs text-red-600">{errors.fuelSurchargePct}</p>
//           )}
//           {isCustomFuel && !errors.fuelSurchargePct && (
//             <p className="mt-1 text-xs text-slate-500">Max allowed is 50%</p>
//           )}
//         </div>

//         {/* DACC Charges - NEW FIELD */}
//         <SimpleChargeField
//           label="DACC Charges"
//           name="daccCharges"
//           value={chargeValues.daccCharges}
//           onChange={(val) => setCharge('daccCharges', val)}
//           onBlur={() => validateField('daccCharges')}
//           error={errors.daccCharges}
//           suffix="₹"
//           max={10000}
//           maxLength={10}
//           precision={0}
//           required={false}
//           integerOnly={true}
//         />

//         {/* Empty cell for 3-column grid alignment */}
//         <div></div>

//         {/* ═══════════════════════════════════════════════════════════════ */}
//         {/* ROW 4: DIVIDER */}
//         {/* ═══════════════════════════════════════════════════════════════ */}

//         <div className="md:col-span-2 lg:col-span-3 my-4">
//           <div className="relative">
//             <div className="absolute inset-0 flex items-center">
//               <div className="w-full border-t border-slate-300"></div>
//             </div>
//             <div className="relative flex justify-center">
//               <span className="bg-white px-4 text-sm font-semibold text-slate-600">
//                 Handling & Additional Charges
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* ═══════════════════════════════════════════════════════════════ */}
//         {/* ROW 5: Handling, ROV, COD */}
//         {/* ═══════════════════════════════════════════════════════════════ */}

//         <CompactChargeCard
//           title="Handling"
//           tooltip="Material handling and processing charges"
//           cardName="handlingCharges"
//           data={chargeValues.handlingCharges as ChargeCardData}
//           errors={errors.handlingCharges || {}}
//           onFieldChange={(field, value) => setCardField('handlingCharges', field, value)}
//           onFieldBlur={(field) => validateCardField('handlingCharges', field)}
//         />

//         <CompactChargeCard
//           title="ROV / FOV"
//           tooltip="Risk of Value / Freight on Value charges for high-value shipments"
//           cardName="rovCharges"
//           data={chargeValues.rovCharges as ChargeCardData}
//           errors={errors.rovCharges || {}}
//           onFieldChange={(field, value) => setCardField('rovCharges', field, value)}
//           onFieldBlur={(field) => validateCardField('rovCharges', field)}
//         />

//         {/* COD / DOD - FIXED: Now uses correct currency reference */}
//         <CompactChargeCard
//           title="COD / DOD"
//           tooltip="Cash on Delivery / Delivery on Demand service charges"
//           cardName="codCharges"
//           data={{
//             ...(chargeValues.codCharges as ChargeCardData || {}),
//             mode: (chargeValues.codCharges as ChargeCardData)?.mode ?? 'FIXED',
//             currency: (chargeValues.codCharges as ChargeCardData)?.currency ?? 'INR',
//           }}
//           errors={errors.codCharges || {}}
//           onFieldChange={(field, value) => setCardField('codCharges', field, value)}
//           onFieldBlur={(field) => validateCardField('codCharges', field)}
//           required={true}
//           allowVariable={true}
//         />

//         {/* ═══════════════════════════════════════════════════════════════ */}
//         {/* ROW 6: To-Pay, Appointment, [empty] */}
//         {/* ═══════════════════════════════════════════════════════════════ */}

//         {/* To-Pay - FIXED: Now uses correct currency reference */}
//         <CompactChargeCard
//           title="To-Pay"
//           tooltip="Charges for to-pay shipments"
//           cardName="toPayCharges"
//           data={{
//             ...(chargeValues.toPayCharges as ChargeCardData || {}),
//             mode: (chargeValues.toPayCharges as ChargeCardData)?.mode ?? 'FIXED',
//             currency: (chargeValues.toPayCharges as ChargeCardData)?.currency ?? 'INR',
//           }}
//           errors={errors.toPayCharges || {}}
//           onFieldChange={(field, value) => setCardField('toPayCharges', field, value)}
//           onFieldBlur={(field) => validateCardField('toPayCharges', field)}
//           required={true}
//           allowVariable={true}
//         />

//         <CompactChargeCard
//           title="Appointment"
//           tooltip="Scheduled delivery appointment charges"
//           cardName="appointmentCharges"
//           data={chargeValues.appointmentCharges as ChargeCardData}
//           errors={errors.appointmentCharges || {}}
//           onFieldChange={(field, value) => setCardField('appointmentCharges', field, value)}
//           onFieldBlur={(field) => validateCardField('appointmentCharges', field)}
//         />

//         {/* Empty cell for 3-column grid alignment */}
//         <div></div>

//         {/* ═══════════════════════════════════════════════════════════════ */}
//         {/* ✅ NEW: ROV = INVOICE VALUE INFO BOX */}
//         {/* ═══════════════════════════════════════════════════════════════ */}

//         <div className="md:col-span-2 lg:col-span-3 mt-4">
//           <div className="p-4 bg-blue-50 border-2 border-blue-500 rounded-lg">
//             <div className="flex items-start gap-3">
//               <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
//                 i
//               </div>
//               <div className="flex-1">
//                 <h4 className="font-semibold text-blue-900 text-sm mb-1">
//                   ROV/FOV = Invoice Value Charges
//                 </h4>
//                 <p className="text-xs text-blue-800 leading-relaxed">
//                   The ROV (Risk of Value) charges you configure above will automatically be used 
//                   for invoice value calculations. The <strong>Variable (%)</strong> becomes the invoice percentage, 
//                   and <strong>Fixed (₹)</strong> becomes the minimum invoice amount. These values will be applied 
//                   to shipment invoice values when calculating total freight costs.
//                 </p>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default ChargesSection;

// src/components/ChargesSection.tsx
/**
 * ChargesSection component
 * COMPLETE IMPLEMENTATION - ALL 6 TODO ITEMS + NEW UPDATES:
 * 1. ✅ All mandatory fields marked with red asterisk (*)
 * 2. ✅ Fuel surcharge custom input with 0-50 validation
 * 3. ✅ DACC Charges field added
 * 4. ✅ Divider element "Handling & Additional Charges"
 * 5. ✅ Layout reorganized as specified
 * 6. ✅ FIXED: COD/DOD and To-Pay toggles now independent
 * 
 * ✅ NEW UPDATES:
 * - Removed placeholder "0" from basic charge fields
 * - Added indigo colored borders (border-2 border-indigo-500) for visibility
 * - Added prominent ROV = Invoice Value info box
 * 
 * Layout:
 * Row 1: Docket*, Min Weight*, Min Charges*
 * Row 2: Hamali*, Green Tax*, Misc*
 * Row 3: Fuel Surcharge* (custom), DACC Charges*, [empty]
 * Row 4: ──────── DIVIDER ────────
 * Row 5: Handling, ROV, COD
 * Row 6: To-Pay, Appointment, [empty]
 */

import React from 'react';
import { UseChargesReturn } from '../hooks/useCharges';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { FUEL_SURCHARGE_OPTIONS, CHARGE_MAX, ChargeCardData } from '../utils/validators';
import { CompactChargeCard } from './CompactChargeCard';
import { ComboInput } from './ComboInput';
import { useFormConfig } from '../hooks/useFormConfig';

// =============================================================================
// PROPS
// =============================================================================

interface ChargesSectionProps {
  charges: UseChargesReturn;
}

// =============================================================================
// Helpers (sanitize / clamp decimals)
// =============================================================================

/**
 * Keep only digits and at most one dot. Remove leading zeros (but keep single '0').
 * Return a normalized string with at most `precision` decimal places.
 * If integerOnly is true, only accept whole numbers (no decimals)
 */

const displayZeroAsBlank = (
  val: string | number | null | undefined
): string => {
  if (val === 0 || val === '0' || val === null || val === undefined) {
    return '';
  }
  return String(val);
};

function sanitizeDecimalString(raw: string, precision = 2, integerOnly = false) {
  if (!raw) return '';
  let s = String(raw).trim();
  s = s.replace(/,/g, '');

  if (integerOnly) {
    // Only allow digits, no decimal point
    s = s.replace(/[^\d]/g, '');
    // Remove leading zeros but keep single '0'
    s = s.replace(/^0+([1-9])/, '$1');
    if (s === '') return '';
    return s;
  }

  s = s.replace(/[^\d.]/g, '');

  const parts = s.split('.');
  if (parts.length > 1) {
    s = parts[0] + '.' + parts.slice(1).join('');
  }

  if (s.includes('.')) {
    const [intPart, decPart] = s.split('.');
    const dec = decPart.slice(0, precision);
    s = `${intPart || '0'}${precision > 0 ? `.${dec}` : ''}`;
  }

  s = s.replace(/^0+([1-9])/, '$1');
  if (s.startsWith('.')) s = '0' + s;
  if (s === '') return '';

  return s;
}

/**
 * Clamp the numeric string to [min,max], return normalized string (without exponential notation).
 */
function clampDecimalString(raw: string, min: number, max: number, precision = 2) {
  const sanitized = sanitizeDecimalString(raw, precision);
  if (!sanitized) return '';

  const n = Number(sanitized);
  if (!Number.isFinite(n)) return '';

  const clamped = Math.min(Math.max(n, min), max);

  if (precision <= 0) return String(Math.round(clamped));
  let fixed = clamped.toFixed(precision);
  fixed = fixed.replace(/\.?0+$/, '');
  return fixed;
}

const BLOCKED_KEYS = new Set(['e', 'E', '+', '-']);

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SimpleChargeFieldProps {
  label: string;
  name: string;
  value: number;
  onChange: (value: number) => void;
  onBlur: () => void;
  error?: string;
  min?: number;
  max?: number;
  suffix?: string;
  maxLength?: number;
  precision?: number;
  required?: boolean;
  integerOnly?: boolean; // NEW: only allow whole numbers
}

const SimpleChargeField: React.FC<SimpleChargeFieldProps> = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  min = 0,
  max = CHARGE_MAX,
  suffix = '₹',
  maxLength,
  precision = 2,
  required = false,
  integerOnly = false, // NEW
}) => {
  const displayed = displayZeroAsBlank(value);


  const handleTextChange = (raw: string) => {
    const sanitized = sanitizeDecimalString(raw, precision, integerOnly);
    if (!sanitized) {
      onChange(0);
      return;
    }

    const num = Number(sanitized);
    if (!Number.isFinite(num)) {
      onChange(0);
      return;
    }

    // Clamp to [min, max]
    const clamped = Math.min(Math.max(num, min), max);
    onChange(clamped);
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleTextChange(e.target.value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (BLOCKED_KEYS.has(e.key)) {
      e.preventDefault();
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData?.getData('text') ?? '';
    e.preventDefault();
    handleTextChange(pasted);
  };

  return (
    <div>
      <label
        htmlFor={name}
        className="block text-xs font-semibold text-slate-600 uppercase tracking-wider"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative mt-1">
        <input
          type="text"
          id={name}
          name={name}
          value={displayed}
          onChange={onInputChange}
          onBlur={onBlur}
          inputMode="decimal"
          maxLength={maxLength}
          className={`block w-full border-2 rounded-lg shadow-sm pl-3 pr-8 py-2 text-sm text-slate-800 placeholder-slate-400
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition bg-slate-50/70
                     ${error ? 'border-red-500 focus:border-red-600' : 'border-indigo-500 focus:border-indigo-600'}`}
          placeholder=""
          aria-invalid={!!error}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ChargesSection: React.FC<ChargesSectionProps> = ({ charges }) => {
  const { charges: chargeValues, errors, setCharge, setCardField, validateField, validateCardField } = charges;

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM BUILDER CONFIG - Dynamic labels from MongoDB
  // ═══════════════════════════════════════════════════════════════════════════
  const { getField } = useFormConfig('add-vendor');

  // Helper: Get label with fallback
  const getLabel = (fieldId: string, fallback: string) =>
    getField(fieldId)?.label ?? fallback;

  // Helper: Check if required
  const isRequired = (fieldId: string) =>
    getField(fieldId)?.required ?? false;

  // Handler for fuel surcharge with 0-50 validation
  const handleFuelSurchargeChange = (rawValue: string) => {
    const sanitized = sanitizeDecimalString(rawValue, 0, true); // integer only
    if (sanitized === '') {
      setCharge('fuelSurchargePct', 0);
      return;
    }

    const num = Number(sanitized);
    if (!Number.isFinite(num)) {
      setCharge('fuelSurchargePct', 0);
      return;
    }

    // Clamp to 0-50
    const clamped = Math.min(Math.max(num, 0), 50);
    setCharge('fuelSurchargePct', clamped);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <CurrencyDollarIcon className="w-5 h-5 text-blue-500" />
        Basic Charges
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ROW 1: Docket*, Min Weight*, Min Charges* */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        <SimpleChargeField
          label={getLabel('docketCharges', 'Docket Charges')}
          name="docketCharges"
          value={chargeValues.docketCharges}
          onChange={(val) => setCharge('docketCharges', val)}
          onBlur={() => validateField('docketCharges')}
          error={errors.docketCharges}
          suffix="₹"
          max={CHARGE_MAX}
          maxLength={10}
          precision={0}
          required={isRequired('docketCharges')}
          integerOnly={true}
        />

        <SimpleChargeField
          label={getLabel('minWeightKg', 'Min Chargeable Weight')}
          name="minWeightKg"
          value={chargeValues.minWeightKg}
          onChange={(val) => setCharge('minWeightKg', val)}
          onBlur={() => validateField('minWeightKg')}
          error={errors.minWeightKg}
          suffix="KG"
          max={CHARGE_MAX}
          maxLength={7}
          precision={0}
          required={isRequired('minWeightKg')}
          integerOnly={true}
        />

        <SimpleChargeField
          label={getLabel('minimumCharges', 'Minimum Charges')}
          name="minCharges"
          value={chargeValues.minCharges}
          onChange={(val) => setCharge('minCharges', val)}
          onBlur={() => validateField('minCharges')}
          error={errors.minCharges}
          suffix="₹"
          max={CHARGE_MAX}
          maxLength={10}
          precision={0}
          required={isRequired('minimumCharges')}
          integerOnly={true}
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ROW 2: Hamali*, Green Tax*, Misc* */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        <SimpleChargeField
          label={getLabel('hamaliCharges', 'Hamali Charges')}
          name="hamaliCharges"
          value={chargeValues.hamaliCharges}
          onChange={(val) => setCharge('hamaliCharges', val)}
          onBlur={() => validateField('hamaliCharges')}
          error={errors.hamaliCharges}
          suffix="₹"
          max={CHARGE_MAX}
          maxLength={10}
          precision={0}
          required={isRequired('hamaliCharges')}
          integerOnly={true}
        />

        <SimpleChargeField
          label={getLabel('greenTax', 'Green Tax / NGT')}
          name="greenTax"
          value={chargeValues.greenTax}
          onChange={(val) => setCharge('greenTax', val)}
          onBlur={() => validateField('greenTax')}
          error={errors.greenTax}
          suffix="₹"
          max={CHARGE_MAX}
          maxLength={10}
          precision={0}
          required={isRequired('greenTax')}
          integerOnly={true}
        />

        <SimpleChargeField
          label={getLabel('miscCharges', 'Misc / AOC Charges')}
          name="miscCharges"
          value={chargeValues.miscCharges}
          onChange={(val) => setCharge('miscCharges', val)}
          onBlur={() => validateField('miscCharges')}
          error={errors.miscCharges}
          suffix="₹"
          max={CHARGE_MAX}
          maxLength={10}
          precision={0}
          required={isRequired('miscCharges')}
          integerOnly={true}
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ROW 3: Fuel Surcharge* (combo input), DACC Charges*, [empty] */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        {/* Fuel Surcharge - Combo Input (Type or Select) */}
        <div>
          <label
            htmlFor="fuelSurchargePct"
            className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1"
          >
            {getLabel('fuelSurchargePct', 'Fuel Surcharge')}
            {isRequired('fuelSurchargePct') && <span className="text-red-500"> *</span>}
          </label>

          <ComboInput
            value={chargeValues.fuelSurchargePct}
            options={FUEL_SURCHARGE_OPTIONS}
            onChange={handleFuelSurchargeChange}
            onBlur={() => validateField('fuelSurchargePct')}
            placeholder="Select or type 0-50"
            suffix="%"
            maxLength={2}
            inputMode="numeric"
            error={errors.fuelSurchargePct}
            onKeyDown={(e) => {
              if (BLOCKED_KEYS.has(e.key)) {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData?.getData('text') ?? '';
              e.preventDefault();
              handleFuelSurchargeChange(pasted);
            }}
          />

          {!errors.fuelSurchargePct && (
            <p className="mt-1 text-xs text-slate-500">Max allowed is 50%</p>
          )}
        </div>

        {/* DACC Charges */}
        <SimpleChargeField
          label={getLabel('daccCharges', 'DACC Charges')}
          name="daccCharges"
          value={chargeValues.daccCharges}
          onChange={(val) => setCharge('daccCharges', val)}
          onBlur={() => validateField('daccCharges')}
          error={errors.daccCharges}
          suffix="₹"
          max={10000}
          maxLength={10}
          precision={0}
          required={isRequired('daccCharges')}
          integerOnly={true}
        />

        {/* Empty cell for 3-column grid alignment */}
        <div></div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ROW 4: DIVIDER */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        <div className="md:col-span-2 lg:col-span-3 my-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-sm font-semibold text-slate-600">
                Handling & Additional Charges
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ROW 5: Handling, ROV, COD */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        <CompactChargeCard
          title="Handling"
          tooltip="Material handling and processing charges"
          cardName="handlingCharges"
          data={chargeValues.handlingCharges as ChargeCardData}
          errors={errors.handlingCharges || {}}
          onFieldChange={(field, value) => setCardField('handlingCharges', field, value)}
          onFieldBlur={(field) => validateCardField('handlingCharges', field)}
        />

        <CompactChargeCard
          title="ROV / FOV"
          tooltip="Risk of Value / Freight on Value charges for high-value shipments"
          cardName="rovCharges"
          data={chargeValues.rovCharges as ChargeCardData}
          errors={errors.rovCharges || {}}
          onFieldChange={(field, value) => setCardField('rovCharges', field, value)}
          onFieldBlur={(field) => validateCardField('rovCharges', field)}
        />

        {/* COD / DOD - FIXED: Now uses correct currency reference */}
        <CompactChargeCard
          title="COD / DOD"
          tooltip="Cash on Delivery / Delivery on Demand service charges"
          cardName="codCharges"
          data={{
            ...(chargeValues.codCharges as ChargeCardData || {}),
            mode: (chargeValues.codCharges as ChargeCardData)?.mode ?? 'FIXED',
            currency: (chargeValues.codCharges as ChargeCardData)?.currency ?? 'INR',
          }}
          errors={errors.codCharges || {}}
          onFieldChange={(field, value) => setCardField('codCharges', field, value)}
          onFieldBlur={(field) => validateCardField('codCharges', field)}
          required={true}
          allowVariable={true}
        />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ROW 6: To-Pay, Appointment, [empty] */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        {/* To-Pay - FIXED: Now uses correct currency reference */}
        <CompactChargeCard
          title="To-Pay"
          tooltip="Charges for to-pay shipments"
          cardName="toPayCharges"
          data={{
            ...(chargeValues.toPayCharges as ChargeCardData || {}),
            mode: (chargeValues.toPayCharges as ChargeCardData)?.mode ?? 'FIXED',
            currency: (chargeValues.toPayCharges as ChargeCardData)?.currency ?? 'INR',
          }}
          errors={errors.toPayCharges || {}}
          onFieldChange={(field, value) => setCardField('toPayCharges', field, value)}
          onFieldBlur={(field) => validateCardField('toPayCharges', field)}
          required={true}
          allowVariable={true}
        />

        <CompactChargeCard
          title="Appointment"
          tooltip="Scheduled delivery appointment charges"
          cardName="appointmentCharges"
          data={chargeValues.appointmentCharges as ChargeCardData}
          errors={errors.appointmentCharges || {}}
          onFieldChange={(field, value) => setCardField('appointmentCharges', field, value)}
          onFieldBlur={(field) => validateCardField('appointmentCharges', field)}
        />

        {/* Empty cell for 3-column grid alignment */}
        <div></div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ✅ NEW: ROV = INVOICE VALUE INFO BOX */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        <div className="md:col-span-2 lg:col-span-3 mt-4">
          <div className="p-4 bg-blue-50 border-2 border-blue-500 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                i
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-blue-900 text-sm mb-1">
                  ROV/FOV = Invoice Value Charges
                </h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  The ROV (Risk of Value) charges you configure above will automatically be used
                  for invoice value calculations. The <strong>Variable (%)</strong> becomes the invoice percentage,
                  and <strong>Fixed (₹)</strong> becomes the minimum invoice amount. These values will be applied
                  to shipment invoice values when calculating total freight costs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChargesSection;