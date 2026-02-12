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

      {/* Flex: Inputs (left) + Note (right) */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Left: Input Fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 flex-1">

          {/* Transport Mode */}
          <div>
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

          {/* Volumetric Divisor */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {getLabel('volumetricDivisor', dynamicLabel)}
              {isRequired('volumetricDivisor') && <span className="text-red-500"> *</span>}
            </label>
            <select
              value={selected ?? ''}
              onChange={(e) => setDynamicVolumetricValue(Number(e.target.value))}
              className="w-full rounded-md border-slate-300 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" disabled>
                Select {dynamicLabel}
              </option>
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Volumetric Unit */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {getLabel('volumetricUnit', 'Volumetric Unit')}
              {isRequired('volumetricUnit') && <span className="text-red-500"> *</span>}
            </label>
            <div className="inline-flex rounded-md shadow-sm border border-slate-300 w-full">
              <button
                type="button"
                onClick={() => setUnit('cm')}
                className={
                  'flex-1 px-4 py-2 text-sm font-medium rounded-l-md ' +
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
                  'flex-1 px-4 py-2 text-sm font-medium rounded-r-md border-l border-slate-300 ' +
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

        {/* Right: Note (expands vertically) */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="bg-yellow-100 border border-yellow-200 rounded-md p-3 text-xs text-yellow-800 font-bold h-full flex items-center">
            Note: Volumetric weight = (L × W × H) / Divisor. The divisor determines how much space is
            considered per unit of weight. This field changes based on the selected volumetric unit.
          </div>
        </div>
      </div>
    </section>
  );
};
