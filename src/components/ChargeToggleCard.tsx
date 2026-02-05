// src/components/ChargeToggleCard.tsx
import React from 'react';

type ActiveType = 'fixed' | 'variable';

export interface ChargeToggleCardProps {
  title: string;
  tooltip?: string;
  cardName: string; // name used when calling onFieldChange/onFieldBlur
  data: {
    fixed?: number | null;
    variable?: number | null;
    threshholdweight?: number | null;
    activeType?: ActiveType;
  } | null | undefined;
  errors?: Record<string, string>;
  onFieldChange: (field: string, value: number | null) => void;
  onFieldBlur?: (field: string) => void;
}

/**
 * A compact card with:
 * - title + optional tooltip
 * - two segmented toggle buttons (₹ Fixed / % Variable)
 * - two inputs (fixed amount, variable %) with visual emphasis on the active one
 * - optional threshold input (used for handling)
 *
 * Uses the same callbacks shape as your existing CompactChargeCard:
 * onFieldChange(field, value) and onFieldBlur(field)
 */
export const ChargeToggleCard: React.FC<ChargeToggleCardProps> = ({
  title,
  tooltip,
  cardName,
  data,
  errors = {},
  onFieldChange,
  onFieldBlur,
}) => {
  const fixed = data?.fixed ?? null;
  const variable = data?.variable ?? null;
  const threshold = (data as any)?.threshholdweight ?? null;
  const activeType = (data?.activeType as ActiveType) ?? (fixed ? 'fixed' : 'variable') ?? 'fixed';

  const setActive = (t: ActiveType) => {
    // Save active type as string for UI persistence if your hooks store it
    onFieldChange('activeType', t === 'fixed' ? 1 : 0); // optional: the hook may ignore this field
    // keep existing numeric values untouched
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-slate-900 truncate">{title}</h4>
            {tooltip && (
              <span className="text-xs text-slate-400 italic" title={tooltip}>
                ⓘ
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Toggle to apply as fixed amount or percentage.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="inline-flex items-center rounded-full p-0.5 bg-slate-100 border border-slate-200">
            <button
              type="button"
              aria-pressed={activeType === 'fixed'}
              onClick={() => setActive('fixed')}
              className={`px-3 py-1 text-sm rounded-full transition font-medium ${activeType === 'fixed' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              ₹ Fixed
            </button>
            <button
              type="button"
              aria-pressed={activeType === 'variable'}
              onClick={() => setActive('variable')}
              className={`px-3 py-1 text-sm rounded-full transition font-medium ${activeType === 'variable' ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              % Variable
            </button>
          </div>

          <div className="w-72 grid grid-cols-2 gap-2">
            <input
              aria-label={`${cardName}-fixed`}
              value={fixed ?? ''}
              onChange={(e) =>
                onFieldChange('fixed', e.target.value === '' ? null : Number(e.target.value))
              }
              onBlur={() => onFieldBlur?.('fixed')}
              placeholder="₹ 0.00"
              type="number"
              min={0}
              className={`px-3 py-2 rounded border text-sm focus:outline-none ${
                activeType === 'fixed' ? 'border-blue-300 bg-white' : 'border-slate-200 bg-slate-50 opacity-80'
              }`}
            />
            <input
              aria-label={`${cardName}-variable`}
              value={variable ?? ''}
              onChange={(e) =>
                onFieldChange('variable', e.target.value === '' ? null : Number(e.target.value))
              }
              onBlur={() => onFieldBlur?.('variable')}
              placeholder="% 0.0"
              type="number"
              min={0}
              max={100}
              step={0.1}
              className={`px-3 py-2 rounded border text-sm focus:outline-none ${
                activeType === 'variable' ? 'border-blue-300 bg-white' : 'border-slate-200 bg-slate-50 opacity-80'
              }`}
            />
          </div>

          {/* optional threshold for handling card */}
          {'threshholdweight' in (data ?? {}) && (
            <input
              aria-label={`${cardName}-threshold`}
              value={threshold ?? ''}
              onChange={(e) =>
                onFieldChange('threshholdweight', e.target.value === '' ? null : Number(e.target.value))
              }
              onBlur={() => onFieldBlur?.('threshholdweight')}
              placeholder="Weight threshold (kg)"
              type="number"
              min={0}
              className="mt-2 px-3 py-2 rounded border border-slate-200 bg-slate-50 text-sm focus:outline-none"
            />
          )}
        </div>
      </div>

      {/* show small field-level errors if present */}
      <div className="mt-2 text-xs text-red-600">
        {errors && (errors.fixed || errors.variable || errors.threshholdweight) ? (
          <>
            {errors.fixed && <div>{errors.fixed}</div>}
            {errors.variable && <div>{errors.variable}</div>}
            {(errors.threshholdweight as string) && <div>{errors.threshholdweight}</div>}
          </>
        ) : null}
      </div>
    </div>
  );
};

export default ChargeToggleCard;
