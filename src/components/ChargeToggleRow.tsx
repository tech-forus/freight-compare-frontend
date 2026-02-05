// src/components/ChargeToggleRow.tsx
import React from 'react';
import clsx from 'clsx';

export type ChargeRowProps = {
  id: string; // unique id for accessibility
  label: string;
  unit?: string | null; // e.g. "per kg" or null
  fixed: number | '' | null;
  variable: number | '' | null; // percent value (0-100) or '' 
  activeType: 'fixed' | 'variable';
  onChange: (patch: { fixed?: number | null; variable?: number | null; activeType?: 'fixed'|'variable' }) => void;
  placeholderFixed?: string;
  placeholderVariable?: string;
  min?: number;
  max?: number;
};

export const ChargeToggleRow: React.FC<ChargeRowProps> = ({
  id,
  label,
  unit,
  fixed,
  variable,
  activeType,
  onChange,
  placeholderFixed = '₹ 0.00',
  placeholderVariable = '% 0.0',
}) => {
  const onToggle = (t: 'fixed' | 'variable') => onChange({ activeType: t });

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-slate-900 truncate">{label}</h4>
            {unit && (
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {unit}
              </span>
            )}
            <div className="ml-2 text-xs text-slate-400"> </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Use fixed amount or percentage — toggle to choose.
          </p>
        </div>

        {/* Toggle / controls */}
        <div className="flex flex-col items-end gap-2">
          <div
            role="group"
            aria-label={`${label} toggle`}
            className="inline-flex items-center rounded-full p-0.5 bg-slate-100 border border-slate-200"
          >
            <button
              type="button"
              aria-pressed={activeType === 'fixed'}
              onClick={() => onToggle('fixed')}
              className={clsx(
                'px-3 py-1 text-sm rounded-full transition-all font-medium',
                activeType === 'fixed'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              ₹ Fixed
            </button>
            <button
              type="button"
              aria-pressed={activeType === 'variable'}
              onClick={() => onToggle('variable')}
              className={clsx(
                'px-3 py-1 text-sm rounded-full transition-all font-medium',
                activeType === 'variable'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              % Variable
            </button>
          </div>

          {/* Inputs */}
          <div className="w-72 grid grid-cols-2 gap-2">
            <input
              id={`${id}-fixed`}
              aria-label={`${label} fixed rate`}
              value={fixed ?? ''}
              onChange={(e) =>
                onChange({ fixed: e.target.value === '' ? null : Number(e.target.value) })
              }
              placeholder={placeholderFixed}
              className={clsx(
                'px-3 py-2 rounded border focus:outline-none text-sm',
                activeType === 'fixed'
                  ? 'border-blue-300 bg-white'
                  : 'border-slate-200 bg-slate-50 opacity-80'
              )}
              type="number"
              min={0}
            />
            <input
              id={`${id}-variable`}
              aria-label={`${label} variable percent`}
              value={variable ?? ''}
              onChange={(e) =>
                onChange({ variable: e.target.value === '' ? null : Number(e.target.value) })
              }
              placeholder={placeholderVariable}
              className={clsx(
                'px-3 py-2 rounded border focus:outline-none text-sm',
                activeType === 'variable'
                  ? 'border-blue-300 bg-white'
                  : 'border-slate-200 bg-slate-50 opacity-80'
              )}
              type="number"
              min={0}
              max={100}
              step={0.1}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChargeToggleRow;
