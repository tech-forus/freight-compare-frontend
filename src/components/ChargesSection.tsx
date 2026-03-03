// src/components/ChargesSection.tsx

import React, { useState, useEffect } from 'react';
import { UseChargesReturn } from '../hooks/useCharges';
import { CurrencyDollarIcon, InformationCircleIcon, ChevronDownIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
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

const displayZeroAsBlank = (
  val: string | number | null | undefined
): string => {
  if (val === null || val === undefined) return '';
  return String(val);
};

function sanitizeDecimalString(raw: string, precision = 2, integerOnly = false) {
  if (!raw) return '';
  let s = String(raw).trim().replace(/,/g, '');

  if (integerOnly) {
    s = s.replace(/[^\d]/g, '');
    s = s.replace(/^0+([1-9])/, '$1');
    return s || '';
  }

  s = s.replace(/[^\d.]/g, '');
  const parts = s.split('.');
  if (parts.length > 2) s = parts[0] + '.' + parts.slice(1).join('');
  else if (parts.length > 1) s = parts[0] + '.' + parts[1];

  if (s.includes('.')) {
    const [intPart, decPart] = s.split('.');
    const dec = decPart.slice(0, precision);
    s = `${intPart || '0'}${precision > 0 ? `.${dec}` : ''}`;
  }

  s = s.replace(/^0+([1-9])/, '$1');
  if (s.startsWith('.')) s = '0' + s;
  return s || '';
}

const BLOCKED_KEYS = new Set(['e', 'E', '+', '-']);

// =============================================================================
// SimpleChargeField
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
  label, name, value, onChange, onBlur, error,
  min = 0, max = CHARGE_MAX, suffix = '₹', maxLength,
  precision = 2, required = false, integerOnly = false, tooltip,
}) => {
  const displayed = displayZeroAsBlank(value);

  const handleTextChange = (raw: string) => {
    const sanitized = sanitizeDecimalString(raw, precision, integerOnly);
    if (!sanitized) { onChange(null); return; }
    const num = Number(sanitized);
    if (!Number.isFinite(num)) { onChange(null); return; }
    onChange(Math.min(Math.max(num, min), max));
  };

  return (
    <div className="mb-3">
      <div className="flex items-center gap-1.5 mb-1">
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

      <div className="relative">
        <input
          type="text" id={name} name={name} value={displayed}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={onBlur} inputMode="decimal" maxLength={maxLength}
          className={`block w-full border border-slate-300 rounded-md shadow-sm pl-3 pr-8 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white ${error ? 'border-red-500 focus:border-red-600' : ''}`}
          placeholder="" aria-invalid={!!error}
          onKeyDown={(e) => BLOCKED_KEYS.has(e.key) && e.preventDefault()}
          onPaste={(e) => { e.preventDefault(); handleTextChange(e.clipboardData?.getData('text') ?? ''); }}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">{suffix}</span>
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
  const {
    charges: chargeValues, errors,
    setCharge, setCardField, validateField, validateCardField,
  } = charges;

  const { getField } = useFormConfig('add-vendor');
  const getLabel = (fieldId: string, fallback: string) => getField(fieldId)?.label ?? fallback;
  const isRequired = (fieldId: string) => getField(fieldId)?.required ?? false;

  const [optionalSectionOpen, setOptionalSectionOpen] = useState(false);
  const [optionalsEnabled, setOptionalsEnabled] = useState({
    toPay: false, cod: false, appointment: false, dacc: false,
  });

  useEffect(() => {
    setOptionalsEnabled({
      toPay: !!(chargeValues.toPayCharges?.fixedAmount || chargeValues.toPayCharges?.variableRange),
      cod: !!(chargeValues.codCharges?.fixedAmount || chargeValues.codCharges?.variableRange),
      appointment: !!(chargeValues.appointmentCharges?.fixedAmount || chargeValues.appointmentCharges?.variableRange),
      dacc: !!chargeValues.daccCharges,
    });
  }, [
    chargeValues.toPayCharges?.fixedAmount, chargeValues.toPayCharges?.variableRange,
    chargeValues.codCharges?.fixedAmount, chargeValues.codCharges?.variableRange,
    chargeValues.appointmentCharges?.fixedAmount, chargeValues.appointmentCharges?.variableRange,
    chargeValues.daccCharges,
  ]);

  const handleOptionalToggle = (key: keyof typeof optionalsEnabled, checked: boolean) => {
    setOptionalsEnabled(prev => ({ ...prev, [key]: checked }));
    if (!checked) {
      if (key === 'toPay') { setCardField('toPayCharges', 'fixedAmount', null); setCardField('toPayCharges', 'variableRange', null); }
      if (key === 'cod') { setCardField('codCharges', 'fixedAmount', null); setCardField('codCharges', 'variableRange', null); }
      if (key === 'appointment') { setCardField('appointmentCharges', 'fixedAmount', null); setCardField('appointmentCharges', 'variableRange', null); }
      if (key === 'dacc') { setCharge('daccCharges', null); }
    }
  };

  const handleFuelSurchargeChange = (rawValue: string) => {
    const sanitized = sanitizeDecimalString(rawValue, 0, true);
    if (sanitized === '') { setCharge('fuelSurchargePct', null); return; }
    const num = Number(sanitized);
    if (!Number.isFinite(num)) { setCharge('fuelSurchargePct', null); return; }
    setCharge('fuelSurchargePct', Math.min(Math.max(num, 0), 50));
  };

  /* Reusable checkbox-controlled wrapper for optional charges */
  const OptionalWrapper = ({
    label, enabledKey, children,
  }: {
    label: string; enabledKey: keyof typeof optionalsEnabled; children: React.ReactNode;
  }) => {
    const enabled = optionalsEnabled[enabledKey];
    return (
      <div className={`rounded-xl border transition-colors ${enabled ? 'border-indigo-200 bg-indigo-50/20' : 'border-slate-200 bg-slate-50'}`}>
        <div className="px-3 py-2 border-b border-slate-200/50 flex items-center gap-2">
          <input
            type="checkbox" checked={enabled}
            onChange={(e) => handleOptionalToggle(enabledKey, e.target.checked)}
            className="w-3.5 h-3.5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
            id={`chk-${enabledKey}`}
          />
          <label htmlFor={`chk-${enabledKey}`} className={`text-xs font-semibold cursor-pointer select-none ${enabled ? 'text-indigo-900' : 'text-slate-500'}`}>
            {label}
          </label>
        </div>
        <div className={`px-3 py-3 transition-opacity ${enabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          {children}
        </div>
      </div>
    );
  };

  return (
    <FormKeyNav className="flex flex-col gap-6">

      {/* ════════ SECTION 1: BASIC CHARGES ════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
          <CurrencyDollarIcon className="w-5 h-5 text-blue-500" />
          Basic Charges
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── LEFT BOX: Core fields ── */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <SimpleChargeField
                label={getLabel('docketCharges', 'Docket Charges')}
                name="docketCharges"
                value={chargeValues.docketCharges ?? null}
                onChange={(val) => setCharge('docketCharges', val)}
                onBlur={() => validateField('docketCharges')}
                error={errors.docketCharges}
                suffix="₹" max={CHARGE_MAX} maxLength={10} precision={0}
                required={isRequired('docketCharges')} integerOnly
                tooltip="Fixed charge per docket/booking"
              />

              {/* Fuel Surcharge (ComboInput) */}
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                    {getLabel('fuelSurchargePct', 'Fuel Surcharge')}
                    {isRequired('fuelSurchargePct') && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  <div className="group relative">
                    <InformationCircleIcon className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 w-56 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                      Fuel surcharge percentage applied on freight
                    </div>
                  </div>
                </div>
                <ComboInput
                  value={chargeValues.fuelSurchargePct ?? 0}
                  options={FUEL_SURCHARGE_OPTIONS}
                  onChange={handleFuelSurchargeChange}
                  onBlur={() => validateField('fuelSurchargePct')}
                  placeholder="0-50" suffix="%" maxLength={2} inputMode="numeric"
                  error={errors.fuelSurchargePct}
                  onKeyDown={(e) => { if (BLOCKED_KEYS.has(e.key)) e.preventDefault(); }}
                  onPaste={(e) => { e.preventDefault(); handleFuelSurchargeChange(e.clipboardData?.getData('text') ?? ''); }}
                />
                {!errors.fuelSurchargePct && <p className="mt-0.5 text-[10px] text-slate-400">Max 50%</p>}
              </div>

              <SimpleChargeField
                label="Min Chargeable Wt"
                name="minWeightKg"
                value={chargeValues.minWeightKg ?? null}
                onChange={(val) => setCharge('minWeightKg', val)}
                onBlur={() => validateField('minWeightKg')}
                error={errors.minWeightKg}
                suffix="KG" max={CHARGE_MAX} maxLength={7} precision={0}
                required={isRequired('minWeightKg')} integerOnly
                tooltip="Minimum weight charged per shipment"
              />

              <SimpleChargeField
                label={getLabel('minimumCharges', 'Minimum Charges')}
                name="minCharges"
                value={chargeValues.minCharges ?? null}
                onChange={(val) => setCharge('minCharges', val)}
                onBlur={() => validateField('minCharges')}
                error={errors.minCharges}
                suffix="₹" max={CHARGE_MAX} maxLength={10} precision={0}
                required={isRequired('minimumCharges')} integerOnly
                tooltip="Minimum base freight amount"
              />
            </div>
          </div>

          {/* ── RIGHT BOX: ROV, Handling & ODA ── */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <CompactChargeCard
                title="ODA Charges"
                tooltip="Out of Delivery Area charges"
                cardName="odaCharges"
                data={{ ...createDefaultChargeCard(), ...(chargeValues.odaCharges || {}), unit: "per kg" } as ChargeCardData}
                errors={errors.odaCharges || {}}
                onFieldChange={(field, value) => setCardField('odaCharges', field, value)}
                onFieldBlur={(field) => validateCardField('odaCharges', field)}
                required={isRequired('odaCharges')}
              />
            </div>
          </div>

        </div>
      </div>

      {/* ════════ SECTION 2: ADDITIONAL CHARGES ════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
          <DocumentPlusIcon className="w-5 h-5 text-indigo-500" />
          Additional Charges
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-3">
            <SimpleChargeField
              label={getLabel('greenTax', 'Green Tax / NGT')}
              name="greenTax"
              value={chargeValues.greenTax ?? null}
              onChange={(val) => setCharge('greenTax', val)}
              onBlur={() => validateField('greenTax')}
              error={errors.greenTax}
              suffix="₹" max={CHARGE_MAX} maxLength={10} precision={0}
              required={isRequired('greenTax')} integerOnly
              tooltip="Green Tax or NGT charges"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-3">
            <SimpleChargeField
              label={getLabel('hamaliCharges', 'Hamali Charges')}
              name="hamaliCharges"
              value={chargeValues.hamaliCharges ?? null}
              onChange={(val) => setCharge('hamaliCharges', val)}
              onBlur={() => validateField('hamaliCharges')}
              error={errors.hamaliCharges}
              suffix="₹" max={CHARGE_MAX} maxLength={10} precision={0}
              required={isRequired('hamaliCharges')} integerOnly
              tooltip="Loading/Unloading charges per unit"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-3">
            <SimpleChargeField
              label={getLabel('miscCharges', 'Misc / AOC Charges')}
              name="miscCharges"
              value={chargeValues.miscCharges ?? null}
              onChange={(val) => setCharge('miscCharges', val)}
              onBlur={() => validateField('miscCharges')}
              error={errors.miscCharges}
              suffix="₹" max={CHARGE_MAX} maxLength={10} precision={0}
              required={isRequired('miscCharges')} integerOnly
              tooltip="Miscellaneous or AOC charges"
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/30 px-3 py-3">
            <SimpleChargeField
              label="Cheque Handling"
              name="chequeHandlingCharges"
              value={chargeValues.chequeHandlingCharges ?? null}
              onChange={(val) => setCharge('chequeHandlingCharges', val)}
              onBlur={() => validateField('chequeHandlingCharges')}
              error={errors.chequeHandlingCharges}
              suffix="₹" max={CHARGE_MAX} maxLength={10} precision={0}
              integerOnly tooltip="Charges for cheque handling"
            />
          </div>
        </div>
      </div>

      {/* ════════ SECTION 3: OPTIONAL CHARGES ════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setOptionalSectionOpen(!optionalSectionOpen)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-800">Optional Charges</h2>
            <span className="text-[10px] text-slate-400 font-normal">(To-Pay, COD, Appointment, DACC)</span>
          </div>
          <ChevronDownIcon className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${optionalSectionOpen ? 'rotate-180' : ''}`} />
        </button>

        {optionalSectionOpen && (
          <div className="px-5 pb-5 border-t border-slate-200 bg-slate-50/50 pt-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

              <OptionalWrapper label="To-Pay" enabledKey="toPay">
                <CompactChargeCard
                  title="To-Pay" tooltip="Charges for to-pay shipments" cardName="toPayCharges"
                  data={{ ...createDefaultChargeCard(), ...(chargeValues.toPayCharges || {}), mode: (chargeValues.toPayCharges as any)?.mode ?? 'FIXED', currency: (chargeValues.toPayCharges as any)?.currency ?? 'INR' } as ChargeCardData}
                  errors={errors.toPayCharges || {}}
                  onFieldChange={(field, value) => setCardField('toPayCharges', field, value)}
                  onFieldBlur={(field) => validateCardField('toPayCharges', field)}
                  required={isRequired('toPayCharges')} allowVariable
                />
              </OptionalWrapper>

              <OptionalWrapper label="COD / DOD" enabledKey="cod">
                <CompactChargeCard
                  title="COD / DOD" tooltip="Cash on Delivery / Delivery on Demand" cardName="codCharges"
                  data={{ ...createDefaultChargeCard(), ...(chargeValues.codCharges || {}), mode: (chargeValues.codCharges as any)?.mode ?? 'FIXED', currency: (chargeValues.codCharges as any)?.currency ?? 'INR' } as ChargeCardData}
                  errors={errors.codCharges || {}}
                  onFieldChange={(field, value) => setCardField('codCharges', field, value)}
                  onFieldBlur={(field) => validateCardField('codCharges', field)}
                  required={isRequired('codCharges')} allowVariable
                />
              </OptionalWrapper>

              <OptionalWrapper label="Appointment" enabledKey="appointment">
                <CompactChargeCard
                  title="Appointment" tooltip="Scheduled delivery appointment charges" cardName="appointmentCharges"
                  data={{ ...createDefaultChargeCard(), ...(chargeValues.appointmentCharges || {}) } as ChargeCardData}
                  errors={errors.appointmentCharges || {}}
                  onFieldChange={(field, value) => setCardField('appointmentCharges', field, value)}
                  onFieldBlur={(field) => validateCardField('appointmentCharges', field)}
                  required={isRequired('appointmentCharges')}
                />
              </OptionalWrapper>

              <OptionalWrapper label="DACC" enabledKey="dacc">
                <SimpleChargeField
                  label={getLabel('daccCharges', 'DACC Charges')}
                  name="daccCharges"
                  value={chargeValues.daccCharges ?? null}
                  onChange={(val) => setCharge('daccCharges', val)}
                  onBlur={() => validateField('daccCharges')}
                  error={errors.daccCharges}
                  suffix="₹" max={10000} maxLength={10} precision={0}
                  required={isRequired('daccCharges')} integerOnly
                  tooltip="Delivery Area Congestion Charges"
                />
              </OptionalWrapper>

            </div>
          </div>
        )}
      </div>

    </FormKeyNav>
  );
};

export default ChargesSection;