// src/components/TransportSection.tsx
import React from 'react';
import { useVolumetric } from '../hooks/useVolumetric';
import { useFormConfig } from '../hooks/useFormConfig';

type Mode = 'road' | 'air' | 'rail' | 'ship';

interface TransportModeOption {
  value: string;
  label: string;
  enabled?: boolean;
}

interface Props {
  transportMode: Mode;
  onTransportModeChange: (m: Mode) => void;
  volumetric: ReturnType<typeof useVolumetric>;
}

export const TransportSection: React.FC<Props> = ({
  transportMode,
  onTransportModeChange,
  volumetric,
}) => {
  const {
    state,
    volumetricDivisorOptions,
    cftFactorOptions,
    setUnit,
    setDynamicVolumetricValue,
  } = volumetric;

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM BUILDER CONFIG - Dynamic labels and options from MongoDB
  // ═══════════════════════════════════════════════════════════════════════════
  const { getField } = useFormConfig('add-vendor');

  // Helper: Get label with fallback
  const getLabel = (fieldId: string, fallback: string) =>
    getField(fieldId)?.label ?? fallback;

  // Helper: Check if required
  const isRequired = (fieldId: string) =>
    getField(fieldId)?.required ?? true;

  // Get transport mode options from form config (respects super admin toggle)
  const transportModeField = getField('transportMode');
  const transportModeOptions: TransportModeOption[] = transportModeField?.options || [
    { value: 'road', label: 'Road', enabled: true },
    { value: 'air', label: 'Air', enabled: false },
    { value: 'rail', label: 'Rail', enabled: false },
    { value: 'ship', label: 'Ship', enabled: false },
  ];

  const isCM = state.unit === 'cm';

  // Label + options switch based on unit
  const dynamicLabel = isCM ? 'Volumetric Divisor' : 'CFT Factor';
  const options = isCM ? volumetricDivisorOptions : cftFactorOptions;
  const selected = isCM ? state.volumetricDivisor : state.cftFactor;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        Transport & Volumetric Configuration
      </h2>

      {/* Transport Mode */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {getLabel('transportMode', 'Transport Mode')}
            {isRequired('transportMode') && <span className="text-red-500"> *</span>}
          </label>
          <select
            value={transportMode}
            onChange={(e) => onTransportModeChange(e.target.value as Mode)}
            className="w-full rounded-md border-slate-300 focus:ring-blue-500 focus:border-blue-500"
          >
            {transportModeOptions.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                disabled={opt.enabled === false}
                title={opt.enabled === false ? `${opt.label} — Coming soon` : undefined}
              >
                {opt.label}
                {opt.enabled === false ? ' — Coming soon' : ''}
              </option>
            ))}
          </select>
        </div>



        {/* Volumetric Unit Toggle */}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {getLabel('volumetricUnit', 'Volumetric Unit')}
            {isRequired('volumetricUnit') && <span className="text-red-500"> *</span>}
          </label>
          <div className="inline-flex rounded-md shadow-sm border border-slate-300">
            <button
              type="button"
              onClick={() => setUnit('cm')}
              className={
                'px-4 py-2 text-sm font-medium rounded-l-md ' +
                (isCM
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50')
              }
            >
              Centimeters (cm)
            </button>
            <button
              type="button"
              onClick={() => setUnit('in')}
              className={
                'px-4 py-2 text-sm font-medium rounded-r-md border-l border-slate-300 ' +
                (!isCM
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50')
              }
            >
              Inches (in)
            </button>
          </div>
        </div>
      </div>

      {/* SINGLE Dynamic Field */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-1">
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {getLabel('volumetricDivisor', dynamicLabel)}
            {isRequired('volumetricDivisor') && <span className="text-red-500"> *</span>}
          </label>
          <select
            value={selected ?? ''}
            onChange={(e) => setDynamicVolumetricValue(Number(e.target.value))}
            className="w-full rounded-md border-slate-300 focus:ring-blue-500 focus:border-blue-500"
          >
            {/* Placeholder to prevent manual text entry and enforce allowed list */}
            <option value="" disabled>
              Select {dynamicLabel}
            </option>
            {options.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
                {isCM ? '' : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">
            {isCM
              ? 'Volumetric weight = (L × W × H) / Divisor'
              : 'Volumetric weight = ((L × W × H) / 1728) × CFT Factor'}
          </p>
        </div>

        {/* Helper note (read-only) */}
        <div className="col-span-1">
          <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-3">
            <strong>Note:</strong> The divisor determines how much space is
            considered per unit of weight. This field changes based on the
            selected volumetric unit. When you switch units, the other value is
            cleared automatically to avoid ambiguity.
          </div>
        </div>
      </div>
    </section>
  );
};
