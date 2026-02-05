import { useId } from "react";

type Props = {
  name: string;
  label: string;
  value?: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  tooltip?: React.ReactNode;
  max?: number;
  min?: number;
  step?: number;
  suffix?: string;
  dropdown?: React.ReactNode; // e.g., a button+menu for preset values
  error?: string;
  required?: boolean;
};

export default function UniversalNumberField({
  name, label, value, onChange, onKeyDown,
  tooltip, max, min = 0, step, suffix, dropdown, error, required = true
}: Props) {
  const id = useId();
  return (
    <div className="relative" data-tooltip-container>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="mt-1 relative">
        <input
          id={id}
          name={name}
          value={value ?? ""}
          onChange={onChange}
          onKeyDown={onKeyDown}
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          className={`block w-full bg-slate-50/70 border rounded-lg shadow-sm px-3 py-2 pr-10 text-sm
            ${error ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'}
          `}
          required={required}
        />
        {(suffix || dropdown) && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {suffix && <span className="text-xs text-slate-500">{suffix}</span>}
            {dropdown}
          </div>
        )}
      </div>
      {tooltip}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
