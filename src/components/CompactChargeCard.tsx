
// src/components/CompactChargeCard.tsx
import React, { useState } from 'react';
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
  title: React.ReactNode;
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

const zeroToBlank = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return '';
  return String(val);
};

// Helper to parse integer-only change
const handleIntegerChange = (
  raw: string,
  onFieldChange: (field: any, value: any) => void,
  field: string,
  min: number,
  max: number
) => {
  // Strip all non-digits
  const stripped = raw.replace(/[^\d]/g, '');
  if (stripped === '') {
    onFieldChange(field, null);
    return;
  }
  // Remove leading zeros, but keep a single zero
  const clean = stripped.replace(/^0+([1-9])/, '$1');
  const num = parseInt(clean, 10);
  if (isNaN(num)) {
    onFieldChange(field, null);
    return;
  }
  const clamped = Math.min(Math.max(num, min), max);
  onFieldChange(field, clamped);
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
  const [hasTypedFixed, setHasTypedFixed] = useState(false);
  const [hasTypedWeight, setHasTypedWeight] = useState(false);

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
      <div className="flex flex-wrap items-center justify-between gap-y-2 mb-3">
        <div className="flex items-center gap-1.5 pr-2">
          <h3 className="text-[10px] font-bold text-slate-700 uppercase tracking-wide leading-tight">{title}</h3>
          {tooltip && (
            <div className="group relative">
              <InformationCircleIcon className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                {tooltip}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Toggle Switch */}
          <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
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
              type="text"
              inputMode="numeric"
              value={(!hasTypedFixed && (data.fixedAmount === 0 || data.fixedAmount === null || data.fixedAmount as any === '0')) ? '' : zeroToBlank(data.fixedAmount)}
              onChange={(e) => {
                setHasTypedFixed(true);
                handleIntegerChange(
                  e.target.value,
                  onFieldChange,
                  'fixedAmount',
                  cardName === 'handlingCharges' ? 1 : 0,
                  5000
                );
              }}
              onBlur={() => onFieldBlur('fixedAmount')}
              className={`w-full border rounded-md shadow-sm pl-3 pr-8 py-1.5 text-sm text-slate-700 placeholder-slate-400
                focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white
                ${errors.fixedAmount ? 'border-red-500 focus:border-red-600' : 'border-slate-300'}`}
              placeholder=""
              onKeyDown={(e) => (BLOCKED.has(e.key) || e.key === '.') && e.preventDefault()}
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
              value={(!hasTypedWeight && (data.weightThreshold === 0 || data.weightThreshold === null || data.weightThreshold as any === '0')) ? '' : zeroToBlank(data.weightThreshold ?? null)}
              onChange={(e) => {
                setHasTypedWeight(true);
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