// // // src/components/CompactChargeCard.tsx
// // import React, { useEffect, useRef, useState } from 'react';
// // import { InformationCircleIcon } from '@heroicons/react/24/outline';
// // import {
// //   ChargeCardData,
// //   Unit,
// //   Currency,
// //   Mode,
// //   UNIT_OPTIONS,
// // } from '../utils/chargeValidators';

// // interface CompactChargeCardProps {
// //   title: string;
// //   tooltip: string;
// //   cardName:
// //     | 'handlingCharges'
// //     | 'rovCharges'
// //     | 'codCharges'
// //     | 'toPayCharges'
// //     | 'appointmentCharges';
// //   data: ChargeCardData;
// //   errors: Record<string, string>;
// //   onFieldChange: (field: keyof ChargeCardData, value: any) => void;
// //   onFieldBlur: (field: keyof ChargeCardData) => void;
// //   allowVariable?: boolean;
// // }

// // const BLOCKED = new Set(['e', 'E', '+', '-']);
// // const PRESETS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

// // const zeroToBlank = (val: number | null | undefined): string | number => {
// //   if (val === 0 || val === null || val === undefined) return '';
// //   return val;
// // };


// // function sanitizeKeepDecimals(raw: string, precision = 2) {
// //   if (raw === undefined || raw === null) return '';
// //   let s = String(raw).replace(/,/g, '').replace(/[^\d.]/g, '');
// //   const parts = s.split('.');
// //   if (parts.length > 1) s = parts[0] + '.' + parts.slice(1).join('');
// //   if (s.includes('.')) {
// //     const [i, d] = s.split('.');
// //     s = `${i || '0'}${precision > 0 ? '.' + (d ?? '').slice(0, precision) : ''}`;
// //   }
// //   if (s.startsWith('.')) s = '0' + s;
// //   return s;
// // }

// // function ceilToStep(value: number, step = 0.1, decimals = 1) {
// //   if (!Number.isFinite(value)) return (0).toFixed(decimals);
// //   const multiplier = 1 / step;
// //   const ceiled = Math.ceil(value * multiplier) / multiplier;
// //   return ceiled.toFixed(decimals);
// // }

// // export const CompactChargeCard: React.FC<CompactChargeCardProps> = ({
// //   title,
// //   tooltip,
// //   cardName,
// //   data,
// //   errors,
// //   onFieldChange,
// //   onFieldBlur,
// //   allowVariable = true,
// // }) => {
// //   const [localVar, setLocalVar] = useState<string>(() => {
// //     const v = (data as any)?.variableRange;
// //     return v === undefined || v === null ? '' : String(v);
// //   });

// //   const [openPresets, setOpenPresets] = useState(false);
// //   const presetsRef = useRef<HTMLDivElement | null>(null);
// //   const toggleRef = useRef<HTMLButtonElement | null>(null);

// //   useEffect(() => {
// //     // keep localVar in sync if external data changes (e.g. loadFromDraft)
// //     const v = (data as any)?.variableRange;
// //     setLocalVar(v === undefined || v === null ? '' : String(v));
// //   }, [data?.variableRange]);

// //   useEffect(() => {
// //     function onDocClick(e: MouseEvent) {
// //       if (!presetsRef.current) return;
// //       const target = e.target as Node;
// //       if (
// //         presetsRef.current.contains(target) ||
// //         (toggleRef.current && toggleRef.current.contains(target))
// //       ) {
// //         return;
// //       }
// //       setOpenPresets(false);
// //     }
// //     function onKey(e: KeyboardEvent) {
// //       if (e.key === 'Escape') setOpenPresets(false);
// //     }
// //     document.addEventListener('click', onDocClick);
// //     document.addEventListener('keydown', onKey);
// //     return () => {
// //       document.removeEventListener('click', onDocClick);
// //       document.removeEventListener('keydown', onKey);
// //     };
// //   }, []);

// //   const isFixed = data.mode === 'FIXED';
// //   const isVariable = data.mode === 'VARIABLE';

// //   function updateVariableWhileTyping(v: string) {
// //     const sanitized = sanitizeKeepDecimals(v, 2);
// //     setLocalVar(sanitized);
// //     onFieldChange('variableRange', sanitized);
// //   }

// //   function finalizeVariable(raw: string) {
// //     const sanitized = sanitizeKeepDecimals(raw, 3);
// //     if (sanitized === '' || sanitized === '.') {
// //       const out = '0.0';
// //       setLocalVar(out);
// //       onFieldChange('variableRange', out);
// //       onFieldBlur('variableRange');
// //       setOpenPresets(false);
// //       return;
// //     }
// //     const num = Number(sanitized);
// //     if (!Number.isFinite(num) || num < 0) {
// //       const out = '0.0';
// //       setLocalVar(out);
// //       onFieldChange('variableRange', out);
// //       onFieldBlur('variableRange');
// //       setOpenPresets(false);
// //       return;
// //     }
// //     // ceil to 0.1
// //     const out = ceilToStep(num, 0.1, 1);
// //     setLocalVar(out);
// //     onFieldChange('variableRange', out);
// //     onFieldBlur('variableRange');
// //     setOpenPresets(false);
// //   }

// //   function handlePresetClick(p: number) {
// //     const s = ceilToStep(p, 0.1, 1);
// //     setLocalVar(s);
// //     onFieldChange('variableRange', s);
// //     onFieldBlur('variableRange');
// //     setOpenPresets(false);
// //   }

// //   return (
// //     <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
// //       {/* Header */}
// //       <div className="mb-4">
// //         <div className="flex items-start justify-between mb-3">
// //           <div className="flex items-center gap-2">
// //             <h3 className="text-sm font-bold text-slate-800">{title}</h3>
// //             {tooltip && (
// //               <div className="group relative">
// //                 <InformationCircleIcon className="w-4 h-4 text-slate-400 cursor-help" />
// //                 <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
// //                   {tooltip}
// //                 </div>
// //               </div>
// //             )}
// //           </div>

// //           {cardName === 'handlingCharges' && (
// //             <select
// //               value={data.unit}
// //               onChange={(e) => onFieldChange('unit', e.target.value as Unit)}
// //               className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
// //             >
// //               {UNIT_OPTIONS.map((u) => (
// //                 <option key={u} value={u}>
// //                   {u}
// //                 </option>
// //               ))}
// //             </select>
// //           )}
// //         </div>

// //         <div className="inline-flex bg-slate-100 p-1 rounded-full mb-3">
// //           <button
// //             type="button"
// //             onClick={() => {
// //               onFieldChange('currency', 'INR' as Currency);
// //               onFieldChange('mode', 'FIXED' as Mode);
// //             }}
// //             className={`px-3 py-1 text-xs font-semibold rounded-full ${
// //               isFixed ? 'bg-indigo-600 text-white' : 'bg-transparent text-slate-600'
// //             }`}
// //           >
// //             Fixed ₹
// //           </button>

// //           {allowVariable && (
// //             <button
// //               type="button"
// //               onClick={() => {
// //                 onFieldChange('currency', 'PERCENT' as Currency);
// //                 onFieldChange('mode', 'VARIABLE' as Mode);
// //               }}
// //               className={`px-3 py-1 text-xs font-semibold rounded-full ${
// //                 isVariable ? 'bg-indigo-600 text-white' : 'bg-transparent text-slate-600'
// //               }`}
// //             >
// //               Variable %
// //             </button>
// //           )}
// //         </div>

// //         {/* Fixed rate UI */}
// //         {isFixed && (
// //           <div>
// //             <label className="block text-xs font-semibold text-slate-600 mb-1">
// //               Fixed Rate
// //               {cardName === 'handlingCharges' && <span className="text-red-500 ml-1">*</span>}
// //             </label>
// //             <div className="relative">
// //               <input
// //                 type="number"
// //                 value={zeroToBlank(data.fixedAmount ?? null)}
// //                 onChange={(e) => {
// //                   const val = Number(e.target.value || 0);
// //                   // Auto-clamp: for handling charges, min is 1, otherwise 0
// //                   const min = cardName === 'handlingCharges' ? 1 : 0;
// //                   const clamped = Math.min(Math.max(val, min), 5000);
// //                   onFieldChange('fixedAmount', clamped);
// //                 }}
// //                 onBlur={() => onFieldBlur('fixedAmount')}
// //                 className={`w-full border rounded-lg shadow-sm pl-3 pr-8 py-2 text-sm ${
// //                   errors.fixedAmount ? 'border-red-500' : 'border-slate-300'
// //                 }`}
// //                 placeholder=" "
// //                 onKeyDown={(e) => BLOCKED.has(e.key) && e.preventDefault()}
// //               />
// //               <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">₹</span>
// //             </div>
// //             {errors.fixedAmount && <p className="mt-1 text-xs text-red-600">{errors.fixedAmount}</p>}
// //             <p className="text-xs text-slate-500 mt-1">
// //               {cardName === 'handlingCharges' 
// //                 ? 'Range: ₹1-5,000 (auto-clamped)' 
// //                 : 'Max: ₹5,000 (auto-clamped)'}
// //             </p>
// //           </div>
// //         )}
// //       </div>

// //       {/* Variable input - Fuel surcharge style dropdown + custom */}
// //       {isVariable && (
// //         <div className="mb-4">
// //           <label className="block text-xs font-semibold text-slate-600 mb-1">
// //             Percentage (%)
// //             {cardName === 'handlingCharges' && <span className="text-red-500 ml-1">*</span>}
// //           </label>

// //           {!openPresets ? (
// //             // Dropdown mode
// //             <div className="relative">
// //               <select
// //                 value={localVar || ''}
// //                 onChange={(e) => {
// //                   const value = e.target.value;
// //                   if (value === '') {
// //                     setLocalVar('');
// //                     onFieldChange('variableRange', null);
// //                     return;
// //                   }
// //                   if (value === 'custom') {
// //                     setOpenPresets(true);
// //                     setLocalVar(String(data.variableRange || ''));
// //                   } else {
// //                     setLocalVar(value);
// //                     onFieldChange('variableRange', Number(value));
// //                     onFieldBlur('variableRange');
// //                   }
// //                 }}
// //                 className={`w-full border rounded-lg shadow-sm px-3 py-2 text-sm ${
// //                   errors.variableRange ? 'border-red-500' : 'border-slate-300'
// //                 }`}
// //               >
// //                 <option value="">Select percentage</option>
// //                 {PRESETS.map((preset) => (
// //                   <option key={preset} value={preset}>
// //                     {preset.toFixed(1)}%
// //                   </option>
// //                 ))}
// //                 <option value="custom">Custom</option>
// //               </select>
// //             </div>
// //           ) : (
// //             // Custom input mode
// //             <div className="space-y-2">
// //               <div className="relative">
// //                 <input
// //                   type="text"
// //                   inputMode="decimal"
// //                   value={localVar}
// //                   onChange={(e) => updateVariableWhileTyping(e.target.value)}
// //                   onBlur={() => finalizeVariable(localVar)}
// //                   placeholder="e.g. 2.5"
// //                   className={`w-full border rounded-lg shadow-sm pl-3 pr-10 py-2 text-sm ${
// //                     errors.variableRange ? 'border-red-500' : 'border-slate-300'
// //                   }`}
// //                   onKeyDown={(e) => BLOCKED.has(e.key) && e.preventDefault()}
// //                 />
// //                 <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">%</span>
// //               </div>
// //               <button
// //                 type="button"
// //                 onClick={() => {
// //                   setOpenPresets(false);
// //                   setLocalVar('');
// //                 }}
// //                 className="text-xs text-blue-600 hover:text-blue-800 underline"
// //               >
// //                 ← Back to dropdown
// //               </button>
// //             </div>
// //           )}

// //           {errors.variableRange && <p className="mt-1 text-xs text-red-600">{errors.variableRange}</p>}
// //           {openPresets && !errors.variableRange && (
// //             <p className="text-xs text-slate-500 mt-1">
// //               Values will be rounded <strong>up</strong> to nearest 0.1 on blur (e.g. 1.33 → 1.4).
// //             </p>
// //           )}
// //         </div>
// //       )}

// //       {/* Handling threshold */}
// //       {cardName === 'handlingCharges' && (
// //         <div>
// //           <label className="block text-xs font-semibold text-slate-600 mb-1">
// //             Weight Threshold (KG) <span className="text-red-500">*</span>
// //           </label>
// //           <div className="relative">
// //             <input
// //               type="number"
// //               value={zeroToBlank(data.weightThreshold ?? null)}
// //               onChange={(e) => {
// //                 const val = Number(e.target.value || 0);
// //                 // Auto-clamp: min 1 (mandatory), max 20000
// //                 const clamped = Math.min(Math.max(val, 1), 20000);
// //                 onFieldChange('weightThreshold', clamped);
// //               }}
// //               onBlur={() => onFieldBlur('weightThreshold')}
// //               className={`w-full border rounded-lg shadow-sm pl-3 pr-10 py-2 text-sm ${
// //                 errors.weightThreshold ? 'border-red-500' : 'border-slate-300'
// //               }`}
// //               placeholder=" "
// //             />
// //             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">KG</span>
// //           </div>
// //           {errors.weightThreshold && <p className="mt-1 text-xs text-red-600">{errors.weightThreshold}</p>}
// //           <p className="text-xs text-slate-500 mt-1">Range: 1-20,000 KG (auto-clamped)</p>
// //         </div>
// //       )}
// //     </div>
// //   );
// // };

// // export default CompactChargeCard;


// // src/components/CompactChargeCard.tsx
// import React from 'react';
// import { InformationCircleIcon } from '@heroicons/react/24/outline';
// import {
//   ChargeCardData,
//   Unit,
//   Currency,
//   Mode,
//   UNIT_OPTIONS,
// } from '../utils/chargeValidators';
// import { VARIABLE_PERCENTAGE_OPTIONS } from '../utils/validators';
// import { ComboInput } from './ComboInput';

// interface CompactChargeCardProps {
//   title: string;
//   tooltip: string;
//   cardName:
//     | 'handlingCharges'
//     | 'rovCharges'
//     | 'codCharges'
//     | 'toPayCharges'
//     | 'appointmentCharges';
//   data: ChargeCardData;
//   errors: Record<string, string>;
//   onFieldChange: (field: keyof ChargeCardData, value: any) => void;
//   onFieldBlur: (field: keyof ChargeCardData) => void;
//   allowVariable?: boolean;
// }

// const BLOCKED = new Set(['e', 'E', '+', '-']);

// const zeroToBlank = (val: number | null | undefined): string | number => {
//   if (val === 0 || val === null || val === undefined) return '';
//   return val;
// };

// function sanitizeDecimalString(raw: string, precision = 2) {
//   if (raw === undefined || raw === null) return '';
//   let s = String(raw).replace(/,/g, '').replace(/[^\d.]/g, '');
//   const parts = s.split('.');
//   if (parts.length > 1) s = parts[0] + '.' + parts.slice(1).join('');
//   if (s.includes('.')) {
//     const [i, d] = s.split('.');
//     const dec = (d ?? '').slice(0, precision);
//     s = `${i || '0'}${precision > 0 ? '.' + dec : ''}`;
//   }
//   if (s.startsWith('.')) s = '0' + s;
//   return s;
// }

// export const CompactChargeCard: React.FC<CompactChargeCardProps> = ({
//   title,
//   tooltip,
//   cardName,
//   data,
//   errors,
//   onFieldChange,
//   onFieldBlur,
//   allowVariable = true,
// }) => {
//   const isFixed = data.mode === 'FIXED';
//   const isVariable = data.mode === 'VARIABLE';

//   // Handler for variable percentage - allows decimal typing like "3.6"
//   const handleVariableChange = (rawValue: string) => {
//     // Allow empty input
//     if (rawValue === '') {
//       onFieldChange('variableRange', 0);
//       return;
//     }

//     const sanitized = sanitizeDecimalString(rawValue, 2);

//     // Allow just decimal point or trailing decimal during typing
//     if (sanitized === '.' || sanitized.endsWith('.')) {
//       // For display purposes, keep the number part
//       const numPart = sanitized === '.' ? 0 : Number(sanitized.slice(0, -1));
//       if (Number.isFinite(numPart) && numPart <= 5) {
//         // Store as string temporarily to preserve the decimal point
//         onFieldChange('variableRange', sanitized === '.' ? '0.' : sanitized);
//         return;
//       }
//     }

//     const num = Number(sanitized);
//     if (!Number.isFinite(num) || num < 0) {
//       onFieldChange('variableRange', 0);
//       return;
//     }

//     // Don't clamp during typing to allow entering values
//     if (num <= 5) {
//       onFieldChange('variableRange', num);
//     } else {
//       // Only clamp if exceeding max
//       onFieldChange('variableRange', 5);
//     }
//   };

//   // Handler for blur - finalizes value
//   const handleVariableBlur = () => {
//     const currentValue = data.variableRange;

//     // Handle string values (from decimal typing like "3.")
//     if (typeof currentValue === 'string') {
//       const trimmed = currentValue.replace(/\.$/, ''); // Remove trailing decimal
//       const num = Number(trimmed);
//       if (Number.isFinite(num)) {
//         const clamped = Math.min(Math.max(num, 0), 5);
//         onFieldChange('variableRange', clamped);
//       } else {
//         onFieldChange('variableRange', 0);
//       }
//       onFieldBlur('variableRange');
//       return;
//     }

//     // Handle empty or invalid
//     if (currentValue === null || currentValue === undefined || currentValue === '') {
//       onFieldChange('variableRange', 0);
//       onFieldBlur('variableRange');
//       return;
//     }

//     const num = Number(currentValue);
//     if (!Number.isFinite(num) || num < 0) {
//       onFieldChange('variableRange', 0);
//     } else {
//       // Final clamp to 0-5
//       const clamped = Math.min(Math.max(num, 0), 5);
//       onFieldChange('variableRange', clamped);
//     }
//     onFieldBlur('variableRange');
//   };

//   return (
//     <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
//       {/* Header */}
//       <div className="mb-4">
//         <div className="flex items-start justify-between mb-3">
//           <div className="flex items-center gap-2">
//             <h3 className="text-sm font-bold text-slate-800">{title}</h3>
//             {tooltip && (
//               <div className="group relative">
//                 <InformationCircleIcon className="w-4 h-4 text-slate-400 cursor-help" />
//                 <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
//                   {tooltip}
//                 </div>
//               </div>
//             )}
//           </div>

//           {cardName === 'handlingCharges' && (
//             <select
//               value={data.unit}
//               onChange={(e) => onFieldChange('unit', e.target.value as Unit)}
//               className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
//             >
//               {UNIT_OPTIONS.map((u) => (
//                 <option key={u} value={u}>
//                   {u}
//                 </option>
//               ))}
//             </select>
//           )}
//         </div>

//         <div className="inline-flex bg-slate-100 p-1 rounded-full mb-3">
//           <button
//             type="button"
//             onClick={() => {
//               onFieldChange('currency', 'INR' as Currency);
//               onFieldChange('mode', 'FIXED' as Mode);
//             }}
//             className={`px-3 py-1 text-xs font-semibold rounded-full ${
//               isFixed ? 'bg-indigo-600 text-white' : 'bg-transparent text-slate-600'
//             }`}
//           >
//             Fixed ₹
//           </button>

//           {allowVariable && (
//             <button
//               type="button"
//               onClick={() => {
//                 onFieldChange('currency', 'PERCENT' as Currency);
//                 onFieldChange('mode', 'VARIABLE' as Mode);
//               }}
//               className={`px-3 py-1 text-xs font-semibold rounded-full ${
//                 isVariable ? 'bg-indigo-600 text-white' : 'bg-transparent text-slate-600'
//               }`}
//             >
//               Variable %
//             </button>
//           )}
//         </div>

//         {/* Fixed rate UI */}
//         {isFixed && (
//           <div>
//             <label className="block text-xs font-semibold text-slate-600 mb-1">
//               Fixed Rate
//               {cardName === 'handlingCharges' && <span className="text-red-500 ml-1">*</span>}
//             </label>
//             <div className="relative">
//               <input
//                 type="number"
//                 value={zeroToBlank(data.fixedAmount ?? null)}
//                 onChange={(e) => {
//                   const val = Number(e.target.value || 0);
//                   // Auto-clamp: for handling charges, min is 1, otherwise 0
//                   const min = cardName === 'handlingCharges' ? 1 : 0;
//                   const clamped = Math.min(Math.max(val, min), 5000);
//                   onFieldChange('fixedAmount', clamped);
//                 }}
//                 onBlur={() => onFieldBlur('fixedAmount')}
//                 className={`w-full border rounded-lg shadow-sm pl-3 pr-8 py-2 text-sm ${
//                   errors.fixedAmount ? 'border-red-500' : 'border-slate-300'
//                 }`}
//                 placeholder=" "
//                 onKeyDown={(e) => BLOCKED.has(e.key) && e.preventDefault()}
//               />
//               <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">₹</span>
//             </div>
//             {errors.fixedAmount && <p className="mt-1 text-xs text-red-600">{errors.fixedAmount}</p>}
//             <div className="flex items-center justify-between mt-1">
//               <p className="text-xs text-slate-500">
//                 {cardName === 'handlingCharges' 
//                   ? 'Range: ₹1-5,000 (auto-clamped)' 
//                   : 'Max: ₹5,000 (auto-clamped)'}
//               </p>
//               {cardName === 'handlingCharges' && data.unit && (
//                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-600 text-white">
//                   {data.unit}
//                 </span>
//               )}
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Variable input - Combo Input (Type or Select) */}
//       {isVariable && (
//         <div className="mb-4">
//           <label className="block text-xs font-semibold text-slate-600 mb-1">
//             Percentage (%)
//             {cardName === 'handlingCharges' && <span className="text-red-500 ml-1">*</span>}
//           </label>

//           <ComboInput
//             value={data.variableRange ?? 0}
//             options={VARIABLE_PERCENTAGE_OPTIONS}
//             onChange={handleVariableChange}
//             onBlur={handleVariableBlur}
//             placeholder="Select or type 0-5"
//             suffix="%"
//             maxLength={4}
//             inputMode="decimal"
//             error={errors.variableRange}
//             onKeyDown={(e) => {
//               if (BLOCKED.has(e.key)) {
//                 e.preventDefault();
//               }
//             }}
//             onPaste={(e) => {
//               const pasted = e.clipboardData?.getData('text') ?? '';
//               e.preventDefault();
//               handleVariableChange(pasted);
//             }}
//             formatOption={(val) => `${val.toFixed(2)}%`}
//           />

//           {!errors.variableRange && (
//             <div className="flex items-center gap-2 mt-1">
//               <p className="text-xs text-slate-500">
//                 Max allowed is 5%
//               </p>
//               {cardName === 'handlingCharges' && data.unit && (
//                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-600 text-white">
//                   {data.unit}
//                 </span>
//               )}
//             </div>
//           )}
//         </div>
//       )}

//       {/* Handling threshold */}
//       {cardName === 'handlingCharges' && (
//         <div>
//           <label className="block text-xs font-semibold text-slate-600 mb-1">
//             Weight Threshold (KG) <span className="text-red-500">*</span>
//           </label>
//           <div className="relative">
//             <input
//               type="number"
//               value={zeroToBlank(data.weightThreshold ?? null)}
//               onChange={(e) => {
//                 const val = Number(e.target.value || 0);
//                 // Auto-clamp: min 1 (mandatory), max 20000
//                 const clamped = Math.min(Math.max(val, 1), 20000);
//                 onFieldChange('weightThreshold', clamped);
//               }}
//               onBlur={() => onFieldBlur('weightThreshold')}
//               className={`w-full border rounded-lg shadow-sm pl-3 pr-10 py-2 text-sm ${
//                 errors.weightThreshold ? 'border-red-500' : 'border-slate-300'
//               }`}
//               placeholder=" "
//             />
//             <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">KG</span>
//           </div>
//           {errors.weightThreshold && <p className="mt-1 text-xs text-red-600">{errors.weightThreshold}</p>}
//           <p className="text-xs text-slate-500 mt-1">Range: 1-20,000 KG (auto-clamped)</p>
//         </div>
//       )}
//     </div>
//   );
// };

// export default CompactChargeCard;



// src/components/CompactChargeCard.tsx
import React from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import {
  ChargeCardData,
  Unit,
  Currency,
  Mode,
  UNIT_OPTIONS,
} from '../utils/chargeValidators';
import { VARIABLE_PERCENTAGE_OPTIONS } from '../utils/validators';
import { ComboInput } from './ComboInput';

interface CompactChargeCardProps {
  title: string;
  tooltip: string;
  cardName:
  | 'handlingCharges'
  | 'rovCharges'
  | 'codCharges'
  | 'toPayCharges'
  | 'appointmentCharges';
  data: ChargeCardData;
  errors: Record<string, string>;
  onFieldChange: (field: keyof ChargeCardData, value: any) => void;
  onFieldBlur: (field: keyof ChargeCardData) => void;
  allowVariable?: boolean;
  required?: boolean;
}

const BLOCKED = new Set(['e', 'E', '+', '-']);

const zeroToBlank = (val: number | null | undefined): string | number => {
  if (val === 0 || val === null || val === undefined) return '';
  return val;
};

function sanitizeDecimalString(raw: string, precision = 2) {
  if (raw === undefined || raw === null) return '';
  let s = String(raw).replace(/,/g, '').replace(/[^\d.]/g, '');
  const parts = s.split('.');
  if (parts.length > 1) s = parts[0] + '.' + parts.slice(1).join('');
  if (s.includes('.')) {
    const [i, d] = s.split('.');
    const dec = (d ?? '').slice(0, precision);
    s = `${i || '0'}${precision > 0 ? '.' + dec : ''}`;
  }
  if (s.startsWith('.')) s = '0' + s;
  return s;
}

export const CompactChargeCard: React.FC<CompactChargeCardProps> = ({
  title,
  tooltip,
  cardName,
  data,
  errors,
  onFieldChange,
  onFieldBlur,
  allowVariable = true,
  required = false,
}) => {
  const isFixed = data.mode === 'FIXED';
  const isVariable = data.mode === 'VARIABLE';

  // Handler for variable percentage - allows decimal typing like "3.6"
  const handleVariableChange = (rawValue: string) => {
    // Allow empty input
    if (rawValue === '') {
      onFieldChange('variableRange', 0);
      return;
    }

    const sanitized = sanitizeDecimalString(rawValue, 2);

    // Allow just decimal point or trailing decimal during typing
    if (sanitized === '.' || sanitized.endsWith('.')) {
      // For display purposes, keep the number part
      const numPart = sanitized === '.' ? 0 : Number(sanitized.slice(0, -1));
      if (Number.isFinite(numPart) && numPart <= 5) {
        // Store as string temporarily to preserve the decimal point
        onFieldChange('variableRange', sanitized === '.' ? '0.' : sanitized);
        return;
      }
    }

    const num = Number(sanitized);
    if (!Number.isFinite(num) || num < 0) {
      onFieldChange('variableRange', 0);
      return;
    }

    // Don't clamp during typing to allow entering values
    if (num <= 5) {
      onFieldChange('variableRange', num);
    } else {
      // Only clamp if exceeding max
      onFieldChange('variableRange', 5);
    }
  };

  // Handler for blur - finalizes value
  const handleVariableBlur = () => {
    const currentValue = data.variableRange as any;

    // Handle string values (from decimal typing like "3.")
    if (typeof currentValue === 'string') {
      const trimmed = currentValue.replace(/\.$/, ''); // Remove trailing decimal
      const num = Number(trimmed);
      if (Number.isFinite(num)) {
        const clamped = Math.min(Math.max(num, 0), 5);
        // ✅ FIX: Only update if value actually changed
        if (clamped !== num) {
          onFieldChange('variableRange', clamped);
        }
      } else {
        onFieldChange('variableRange', 0);
      }
      onFieldBlur('variableRange');
      return;
    }

    // Handle empty or invalid
    if (currentValue === null || currentValue === undefined || currentValue === '') {
      onFieldChange('variableRange', 0);
      onFieldBlur('variableRange');
      return;
    }

    const num = Number(currentValue);
    if (!Number.isFinite(num) || num < 0) {
      onFieldChange('variableRange', 0);
      onFieldBlur('variableRange');
      return;
    }

    // ✅ FIX: Calculate final value but only update if different
    const clamped = Math.min(Math.max(num, 0), 5);
    if (clamped !== currentValue) {
      onFieldChange('variableRange', clamped);
    }
    // Always call onFieldBlur for validation
    onFieldBlur('variableRange');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 h-full">
      {/* Header: Title + Tooltip | Toggle + Unit Select */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">{title}</h3>
          {tooltip && (
            <div className="group relative">
              <InformationCircleIcon className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                {tooltip}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Switch */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => {
                onFieldChange('currency', 'INR' as Currency);
                onFieldChange('mode', 'FIXED' as Mode);
              }}
              className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-all ${isFixed
                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200'
                : 'bg-transparent text-slate-500 hover:text-slate-700'
                }`}
            >
              Fixed
            </button>
            {allowVariable && (
              <button
                type="button"
                onClick={() => {
                  onFieldChange('currency', 'PERCENT' as Currency);
                  onFieldChange('mode', 'VARIABLE' as Mode);
                }}
                className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-all ${isVariable
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200'
                  : 'bg-transparent text-slate-500 hover:text-slate-700'
                  }`}
              >
                Variable
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Handling Unit Selector Row */}
      {cardName === 'handlingCharges' && (
        <div className="flex justify-end mb-3">
          <select
            value={data.unit}
            onChange={(e) => onFieldChange('unit', e.target.value as Unit)}
            className="text-xs border border-slate-200 rounded-md px-2 py-0.5 bg-slate-50 text-slate-700 h-[26px] focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
          >
            {UNIT_OPTIONS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      )}

      {/* Fixed rate UI */}
      {isFixed && (
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Fixed Rate
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <div className="relative">
            <input
              type="number"
              value={zeroToBlank(data.fixedAmount ?? null)}
              onChange={(e) => {
                const val = Number(e.target.value || 0);
                const min = cardName === 'handlingCharges' ? 1 : 0;
                const clamped = Math.min(Math.max(val, min), 5000);
                onFieldChange('fixedAmount', clamped);
              }}
              onBlur={() => onFieldBlur('fixedAmount')}
              className={`w-full border rounded-md shadow-sm pl-3 pr-8 py-1.5 text-sm text-slate-700 placeholder-slate-400
                focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white
                ${errors.fixedAmount ? 'border-red-500 focus:border-red-600' : 'border-slate-300'}`}
              placeholder=" "
              onKeyDown={(e) => BLOCKED.has(e.key) && e.preventDefault()}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">₹</span>
          </div>
          {errors.fixedAmount && <p className="mt-1 text-xs text-red-600">{errors.fixedAmount}</p>}
        </div>
      )}

      {/* Variable input - Combo Input (Type or Select) */}
      {isVariable && (
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Percentage (%)
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>

          <ComboInput
            value={data.variableRange ?? 0}
            options={VARIABLE_PERCENTAGE_OPTIONS}
            onChange={handleVariableChange}
            onBlur={handleVariableBlur}
            placeholder="Select or type 0-5"
            suffix="%"
            maxLength={4}
            inputMode="decimal"
            error={errors.variableRange}
            onKeyDown={(e) => {
              if (BLOCKED.has(e.key)) {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData?.getData('text') ?? '';
              e.preventDefault();
              handleVariableChange(pasted);
            }}
            formatOption={(val) => `${val.toFixed(2)}%`}
          />

          {!errors.variableRange && (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-slate-500">
                Max allowed is 5%
              </p>
              {cardName === 'handlingCharges' && data.unit && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-600 text-white">
                  {data.unit}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Handling threshold */}
      {cardName === 'handlingCharges' && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Weight Threshold (KG)
          </label>
          <div className="relative">
            <input
              type="number"
              value={zeroToBlank(data.weightThreshold ?? null)}
              onChange={(e) => {
                const val = Number(e.target.value || 0);
                // Auto-clamp: max 20000 (optional field)
                const clamped = val > 20000 ? 20000 : val;
                onFieldChange('weightThreshold', clamped);
              }}
              onBlur={() => onFieldBlur('weightThreshold')}
              className={`w-full border rounded-md shadow-sm pl-3 pr-10 py-1.5 text-sm text-slate-700 placeholder-slate-400
                focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white
                ${errors.weightThreshold ? 'border-red-500 focus:border-red-600' : 'border-slate-300'}`}
              placeholder=" "
              onKeyDown={(e) => BLOCKED.has(e.key) && e.preventDefault()}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">KG</span>
          </div>
          {errors.weightThreshold && <p className="mt-1 text-xs text-red-600">{errors.weightThreshold}</p>}
        </div>
      )}
    </div>
  );
};

export default CompactChargeCard;