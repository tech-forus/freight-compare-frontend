// src/components/ChargesSection.tsx
/**
 * ChargesSection component
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

import React, { useState } from 'react';
import { UseChargesReturn, CustomSurcharge, SurchargeFormula } from '../hooks/useCharges';
import { CurrencyDollarIcon, InformationCircleIcon, PlusIcon, TrashIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { CHARGE_MAX, FUEL_SURCHARGE_OPTIONS } from '../utils/validators';
import { ChargeCardData, createDefaultChargeCard } from '../utils/chargeValidators';
import { CompactChargeCard } from './CompactChargeCard';
import { ComboInput } from './ComboInput';
import { useFormConfig } from '../hooks/useFormConfig';
import { FormKeyNav } from './FormKeyNav';

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
  if (val === null || val === undefined) {
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
  if (parts.length > 2) { // Allow only one dot
    s = parts[0] + '.' + parts.slice(1).join('');
  } else if (parts.length > 1) {
    s = parts[0] + '.' + parts[1];
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



const BLOCKED_KEYS = new Set(['e', 'E', '+', '-']);

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface SimpleChargeFieldProps {
  label: string;
  name: string;
  value: number | null;
  onChange: (value: number | null) => void;
  onBlur: () => void;
  error?: string;
  min?: number;
  max?: number;
  suffix?: string;
  maxLength?: number;
  precision?: number;
  required?: boolean;
  integerOnly?: boolean;
  tooltip?: string;
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
  integerOnly = false,
  tooltip,
}) => {
  const displayed = displayZeroAsBlank(value);

  const handleTextChange = (raw: string) => {
    const sanitized = sanitizeDecimalString(raw, precision, integerOnly);
    if (!sanitized) {
      onChange(null);
      return;
    }

    const num = Number(sanitized);
    if (!Number.isFinite(num)) {
      onChange(null);
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
    <div className="mb-4">
      {/* Label */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <label htmlFor={name} className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
          {tooltip && (
            <div className="group relative">
              <InformationCircleIcon className="w-3.5 h-3.5 text-slate-400 cursor-help" />
              <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                {tooltip}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        <input
          type="text"
          id={name}
          name={name}
          value={displayed}
          onChange={onInputChange}
          onBlur={onBlur}
          inputMode="decimal"
          maxLength={maxLength}
          className={`block w-full border border-slate-300 rounded-md shadow-sm pl-3 pr-8 py-1.5 text-sm text-slate-700 placeholder-slate-400
focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white
                     ${error ? 'border-red-500 focus:border-red-600' : ''} `}
          placeholder=""
          aria-invalid={!!error}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">
            {suffix}
          </span>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

// =============================================================================
// FORMULA METADATA
// =============================================================================

const FORMULA_OPTIONS: { value: SurchargeFormula; label: string; hint: string; hasValue2: boolean }[] = [
  { value: 'PCT_OF_BASE',     label: '% of Base Freight',   hint: 'Applied on base freight only',            hasValue2: false },
  { value: 'PCT_OF_SUBTOTAL', label: '% of Subtotal',       hint: 'Applied after all standard charges',      hasValue2: false },
  { value: 'FLAT',            label: 'Flat Amount (₹)',     hint: 'Fixed amount per shipment',               hasValue2: false },
  { value: 'PER_KG',          label: 'Per Kg (₹/kg)',       hint: 'Fixed rate × chargeable weight',          hasValue2: false },
  { value: 'MAX_FLAT_PKG',    label: 'Max(Flat, ₹/kg)',     hint: 'Higher of flat amount or per-kg rate',    hasValue2: true  },
];

const formulaMeta = (f: SurchargeFormula) =>
  FORMULA_OPTIONS.find((o) => o.value === f) ?? FORMULA_OPTIONS[0];

// =============================================================================
// CUSTOM SURCHARGES PANEL
// =============================================================================

interface CustomSurchargesPanelProps {
  surcharges: CustomSurcharge[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<CustomSurcharge>) => void;
}

// Shared grid template: badge | name | formula | val | per-kg | preview | toggle | del
const ROW_GRID = 'grid grid-cols-[20px_1fr_168px_80px_80px_148px_36px_24px] items-center gap-x-2';

const CustomSurchargesPanel: React.FC<CustomSurchargesPanelProps> = ({
  surcharges,
  onAdd,
  onRemove,
  onUpdate,
}) => {
  const [expanded, setExpanded] = useState(false);

  React.useEffect(() => {
    if (surcharges.length > 0) setExpanded(true);
  }, [surcharges.length]);

  const getPreview = (s: CustomSurcharge): string => {
    const v = s.value || 0;
    const v2 = s.value2 || 0;
    switch (s.formula) {
      case 'PCT_OF_BASE':
      case 'PCT_OF_SUBTOTAL': return `${v}%`;
      case 'FLAT':            return `₹${v}`;
      case 'PER_KG':          return `₹${v}/kg`;
      case 'MAX_FLAT_PKG':    return `max(₹${v}, ₹${v2}/kg)`;
      default:                return '';
    }
  };

  const activeCount = surcharges.filter(s => s.enabled).length;

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white overflow-hidden">

      {/* ── Collapsible header ── */}
      <button
        type="button"
        onClick={() => setExpanded(x => !x)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 font-bold text-sm select-none shrink-0 border border-indigo-100">
            +
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              Carrier-Specific Surcharges
              {activeCount > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-600 tracking-wide">
                  {activeCount} active
                </span>
              )}
            </p>
            <p className="text-xs text-slate-400 mt-0.5 font-normal">
              {surcharges.length === 0
                ? 'Any additional carrier charges not listed above? e.g. IDC, CAF, re-attempt fees'
                : `${surcharges.length} charge${surcharges.length > 1 ? 's' : ''} configured — applied after standard charges`}
            </p>
          </div>
        </div>
        <ChevronDownIcon
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* ── Body ── */}
      {expanded && (
        <div className="border-t border-slate-200 px-5 pt-3 pb-5 overflow-x-auto">

          {surcharges.length === 0 ? (
            <p className="text-xs text-slate-400 italic mb-3 px-1">
              Examples: IDC (5% of base freight), CAF (flat ₹50), Re-attempt (₹2/kg), Surface handling min…
            </p>
          ) : (
            /* ── Column headers ── */
            <div className={`${ROW_GRID} mb-1 px-2`}>
              <span />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Charge Name</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Formula</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Value</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Per Kg</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Preview</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide text-center">On</span>
              <span />
            </div>
          )}

          {/* ── Rows ── */}
          <div className="space-y-1.5">
            {surcharges.map((s, idx) => {
              const meta      = formulaMeta(s.formula);
              const isPct     = s.formula === 'PCT_OF_BASE' || s.formula === 'PCT_OF_SUBTOTAL';
              const needsV2   = meta.hasValue2;
              const dimmed    = !s.enabled;
              const inputBase = `block w-full border rounded-md px-2 py-[5px] text-sm focus:outline-none focus:ring-1 transition-colors ${
                dimmed
                  ? 'border-slate-100 bg-slate-50 text-slate-400 placeholder-slate-300'
                  : 'border-slate-200 bg-white text-slate-700 placeholder-slate-300 focus:ring-indigo-400 focus:border-indigo-400'
              }`;

              return (
                <div
                  key={s.id}
                  className={`${ROW_GRID} rounded-lg px-2 py-1.5 border transition-all ${
                    dimmed
                      ? 'border-slate-100 bg-slate-50/50'
                      : 'border-slate-200 bg-white shadow-sm'
                  }`}
                >
                  {/* Badge */}
                  <div className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold select-none ${
                    dimmed ? 'bg-slate-100 text-slate-300' : 'bg-indigo-50 text-indigo-400'
                  }`}>
                    {idx + 1}
                  </div>

                  {/* Name */}
                  <input
                    type="text"
                    value={s.label}
                    onChange={e => onUpdate(s.id, { label: e.target.value })}
                    placeholder="IDC, CAF, Re-attempt…"
                    maxLength={60}
                    className={inputBase}
                  />

                  {/* Formula dropdown */}
                  <div className="relative">
                    <select
                      value={s.formula}
                      onChange={e => onUpdate(s.id, { formula: e.target.value as SurchargeFormula })}
                      title={meta.hint}
                      className={`${inputBase} appearance-none pr-6 cursor-pointer`}
                    >
                      {FORMULA_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <ChevronDownIcon className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Value (primary) */}
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={isPct ? 0.01 : 0.5}
                      value={s.value || ''}
                      onChange={e => onUpdate(s.id, { value: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                      className={`${inputBase} pr-6`}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                      {isPct ? '%' : '₹'}
                    </span>
                  </div>

                  {/* Per-kg (value2) — always visible; only editable for MAX_FLAT_PKG */}
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={needsV2 ? (s.value2 || '') : ''}
                      onChange={e => onUpdate(s.id, { value2: parseFloat(e.target.value) || 0 })}
                      placeholder={needsV2 ? '0' : '—'}
                      disabled={!needsV2}
                      title={needsV2 ? 'Per-kg rate for Max(Flat, ₹/kg)' : 'Only used with Max(Flat, ₹/kg) formula'}
                      className={`block w-full border rounded-md px-2 py-[5px] text-sm focus:outline-none transition-colors pr-5 ${
                        !needsV2
                          ? 'border-slate-100 bg-slate-50 text-slate-300 placeholder-slate-200 cursor-not-allowed'
                          : dimmed
                            ? 'border-slate-100 bg-slate-50 text-slate-400 placeholder-slate-300'
                            : 'border-slate-200 bg-white text-slate-700 placeholder-slate-300 focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400'
                      }`}
                    />
                    <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none ${needsV2 ? 'text-slate-400' : 'text-slate-200'}`}>
                      ₹
                    </span>
                  </div>

                  {/* Preview */}
                  <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap truncate ${
                    dimmed
                      ? 'bg-slate-100 text-slate-400'
                      : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {s.label ? `${s.label}: ${getPreview(s)}` : getPreview(s) || '—'}
                  </span>

                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => onUpdate(s.id, { enabled: !s.enabled })}
                    title={s.enabled ? 'Disable this charge' : 'Enable this charge'}
                    className={`relative inline-flex h-5 w-9 mx-auto items-center rounded-full transition-colors focus:outline-none shrink-0 ${
                      s.enabled ? 'bg-indigo-500' : 'bg-slate-200'
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                      s.enabled ? 'translate-x-[18px]' : 'translate-x-[2px]'
                    }`} />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => onRemove(s.id)}
                    title="Remove"
                    className="flex items-center justify-center w-6 h-6 rounded-full text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                  >
                    <TrashIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add button */}
          <button
            type="button"
            onClick={onAdd}
            className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-indigo-500 hover:text-indigo-700 py-1.5 px-3 rounded-lg border border-dashed border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50/60 transition-all"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add Carrier Charge
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const ChargesSection: React.FC<ChargesSectionProps> = ({ charges }) => {
  const {
    charges: chargeValues,
    errors,
    setCharge,
    setCardField,
    validateField,
    validateCardField,
    surcharges,
    addSurcharge,
    removeSurcharge,
    updateSurcharge,
  } = charges;

  const { getField } = useFormConfig('add-vendor');
  const getLabel = (fieldId: string, fallback: string) =>
    getField(fieldId)?.label ?? fallback;
  const isRequired = (fieldId: string) =>
    getField(fieldId)?.required ?? false;

  const handleFuelSurchargeChange = (rawValue: string) => {
    const sanitized = sanitizeDecimalString(rawValue, 0, true);
    if (sanitized === '') {
      setCharge('fuelSurchargePct', null);
      return;
    }
    const num = Number(sanitized);
    if (!Number.isFinite(num)) {
      setCharge('fuelSurchargePct', null);
      return;
    }
    const clamped = Math.min(Math.max(num, 0), 50);
    setCharge('fuelSurchargePct', clamped);
  };

  return (
    <FormKeyNav className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">

      <div className="flex flex-col lg:flex-row gap-8">

        {/* ════════ LEFT PANEL: BASIC CHARGES (40%) ════════ */}
        <div className="w-full lg:w-5/12">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <CurrencyDollarIcon className="w-5 h-5 text-blue-500" />
            Basic & Core Charges
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <SimpleChargeField
              label={getLabel('docketCharges', 'Docket Charges')}
              name="docketCharges"
              value={chargeValues.docketCharges ?? null}
              onChange={(val) => setCharge('docketCharges', val)}
              onBlur={() => validateField('docketCharges')}
              error={errors.docketCharges}
              suffix="₹"
              max={CHARGE_MAX}
              maxLength={10}
              precision={0}
              required={isRequired('docketCharges')}
              integerOnly={true}
              tooltip="Fixed charge per docket/booking"
            />

            <SimpleChargeField
              label="Min Chargeable Wt"
              name="minWeightKg"
              value={chargeValues.minWeightKg ?? null}
              onChange={(val) => setCharge('minWeightKg', val)}
              onBlur={() => validateField('minWeightKg')}
              error={errors.minWeightKg}
              suffix="KG"
              max={CHARGE_MAX}
              maxLength={7}
              precision={0}
              required={isRequired('minWeightKg')}
              integerOnly={true}
              tooltip="Minimum weight charged per shipment"
            />

            <SimpleChargeField
              label={getLabel('minimumCharges', 'Minimum Charges')}
              name="minCharges"
              value={chargeValues.minCharges ?? null}
              onChange={(val) => setCharge('minCharges', val)}
              onBlur={() => validateField('minCharges')}
              error={errors.minCharges}
              suffix="₹"
              max={CHARGE_MAX}
              maxLength={10}
              precision={0}
              required={isRequired('minimumCharges')}
              integerOnly={true}
              tooltip="Minimum base freight amount"
            />

            {/* Fuel Surcharge (ComboInput) */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <label
                    htmlFor="fuelSurchargePct"
                    className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide"
                  >
                    {getLabel('fuelSurchargePct', 'Fuel Surcharge')}
                    {isRequired('fuelSurchargePct') && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <div className="group relative">
                    <InformationCircleIcon className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      Fuel surcharge percentage applied on freight
                    </div>
                  </div>
                </div>
              </div>

              <div className="w-full">
                <ComboInput
                  value={chargeValues.fuelSurchargePct ?? 0}
                  options={FUEL_SURCHARGE_OPTIONS}
                  onChange={handleFuelSurchargeChange}
                  onBlur={() => validateField('fuelSurchargePct')}
                  placeholder="0-50"
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
              </div>
              {!errors.fuelSurchargePct && (
                <p className="mt-1 text-xs text-slate-500">Max allowed is 50%</p>
              )}
            </div>

            <SimpleChargeField
              label={getLabel('hamaliCharges', 'Hamali Charges')}
              name="hamaliCharges"
              value={chargeValues.hamaliCharges ?? null}
              onChange={(val) => setCharge('hamaliCharges', val)}
              onBlur={() => validateField('hamaliCharges')}
              error={errors.hamaliCharges}
              suffix="₹"
              max={CHARGE_MAX}
              maxLength={10}
              precision={0}
              required={isRequired('hamaliCharges')}
              integerOnly={true}
              tooltip="Loading/Unloading charges per unit"
            />

            <SimpleChargeField
              label={getLabel('greenTax', 'Green Tax / NGT')}
              name="greenTax"
              value={chargeValues.greenTax ?? null}
              onChange={(val) => setCharge('greenTax', val)}
              onBlur={() => validateField('greenTax')}
              error={errors.greenTax}
              suffix="₹"
              max={CHARGE_MAX}
              maxLength={10}
              precision={0}
              required={isRequired('greenTax')}
              integerOnly={true}
              tooltip="Green Tax or NGT charges"
            />

            <SimpleChargeField
              label={getLabel('miscCharges', 'Misc / AOC Charges')}
              name="miscCharges"
              value={chargeValues.miscCharges ?? null}
              onChange={(val) => setCharge('miscCharges', val)}
              onBlur={() => validateField('miscCharges')}
              error={errors.miscCharges}
              suffix="₹"
              max={CHARGE_MAX}
              maxLength={10}
              precision={0}
              required={isRequired('miscCharges')}
              integerOnly={true}
              tooltip="Miscellaneous or AOC charges"
            />

            <SimpleChargeField
              label={getLabel('daccCharges', 'DACC Charges')}
              name="daccCharges"
              value={chargeValues.daccCharges ?? null}
              onChange={(val) => setCharge('daccCharges', val)}
              onBlur={() => validateField('daccCharges')}
              error={errors.daccCharges}
              suffix="₹"
              max={10000}
              maxLength={10}
              precision={0}
              required={isRequired('daccCharges')}
              integerOnly={true}
              tooltip="Delivery Area Congestion Charges"
            />
          </div>
        </div>

        {/* ════════ DIVIDER ════════ */}
        <div className="hidden lg:block w-px bg-slate-200 self-stretch"></div>

        {/* ════════ RIGHT PANEL: HANDLING & OTHER (60%) ════════ */}
        <div className="w-full lg:w-7/12">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            Handling & Other Charges
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-min">
            {/* Row 1: Appointment | ROV/FOV */}
            <CompactChargeCard
              title="Appointment"
              tooltip="Scheduled delivery appointment charges"
              cardName="appointmentCharges"
              data={{ ...createDefaultChargeCard(), ...(chargeValues.appointmentCharges || {}) } as ChargeCardData}
              errors={errors.appointmentCharges || {}}
              onFieldChange={(field, value) => setCardField('appointmentCharges', field, value)}
              onFieldBlur={(field) => validateCardField('appointmentCharges', field)}
              required={isRequired('appointmentCharges')}
            />

            <CompactChargeCard
              title="ROV / FOV"
              tooltip="Risk of Value / Freight on Value charges for high-value shipments"
              cardName="rovCharges"
              data={{ ...createDefaultChargeCard(), ...(chargeValues.rovCharges || {}) } as ChargeCardData}
              errors={errors.rovCharges || {}}
              onFieldChange={(field, value) => setCardField('rovCharges', field, value)}
              onFieldBlur={(field) => validateCardField('rovCharges', field)}
              required={isRequired('rovCharges')}
            />

            {/* Row 2: COD/DOD | To-Pay */}
            <CompactChargeCard
              title="COD / DOD"
              tooltip="Cash on Delivery / Delivery on Demand service charges"
              cardName="codCharges"
              data={{
                ...createDefaultChargeCard(),
                ...(chargeValues.codCharges || {}),
                mode: (chargeValues.codCharges as any)?.mode ?? 'FIXED',
                currency: (chargeValues.codCharges as any)?.currency ?? 'INR',
              } as ChargeCardData}
              errors={errors.codCharges || {}}
              onFieldChange={(field, value) => setCardField('codCharges', field, value)}
              onFieldBlur={(field) => validateCardField('codCharges', field)}
              required={isRequired('codCharges')}
              allowVariable={true}
            />

            <CompactChargeCard
              title="To-Pay"
              tooltip="Charges for to-pay shipments"
              cardName="toPayCharges"
              data={{
                ...createDefaultChargeCard(),
                ...(chargeValues.toPayCharges || {}),
                mode: (chargeValues.toPayCharges as any)?.mode ?? 'FIXED',
                currency: (chargeValues.toPayCharges as any)?.currency ?? 'INR',
              } as ChargeCardData}
              errors={errors.toPayCharges || {}}
              onFieldChange={(field, value) => setCardField('toPayCharges', field, value)}
              onFieldBlur={(field) => validateCardField('toPayCharges', field)}
              required={isRequired('toPayCharges')}
              allowVariable={true}
            />

            {/* Row 3: Handling */}
            <CompactChargeCard
              title="Handling"
              tooltip="Material handling and processing charges"
              cardName="handlingCharges"
              data={{ ...createDefaultChargeCard(), ...(chargeValues.handlingCharges || {}) } as ChargeCardData}
              errors={errors.handlingCharges || {}}
              onFieldChange={(field, value) => setCardField('handlingCharges', field, value)}
              onFieldBlur={(field) => validateCardField('handlingCharges', field)}
              required={isRequired('handlingCharges')}
            />

          </div>
        </div>

      </div>

      {/* ════════ CUSTOM SURCHARGES ════════ */}
      <CustomSurchargesPanel
        surcharges={surcharges}
        onAdd={addSurcharge}
        onRemove={removeSurcharge}
        onUpdate={updateSurcharge}
      />
    </FormKeyNav>
  );
};

export default ChargesSection;