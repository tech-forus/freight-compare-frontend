// src/components/NumericInput.tsx
import React from 'react';
import { sanitizeDigitsOnly, clampNumericString } from '../utils/inputs';

type Props = {
  value: string | number;
  onChange: (next: string) => void; // always send string back
  min?: number;
  max?: number;
  digitLimit?: number;
  placeholder?: string;
  className?: string;
  id?: string;
  ariaLabel?: string;
  allowZeroLeading?: boolean; // if true, allow leading 0s (e.g., vendor code might be allowed)
};

export const NumericInput: React.FC<Props> = ({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  digitLimit,
  placeholder,
  className,
  id,
  ariaLabel,
  allowZeroLeading = false,
}) => {
  const strVal = value === undefined || value === null ? '' : String(value);

  const handleChange = (raw: string) => {
    // sanitize digits only
    const digits = sanitizeDigitsOnly(raw);

    // if allowZeroLeading is false and digits starts with 0, remove leading zeros for validation parsing
    const digitsForClamp = allowZeroLeading ? digits : digits.replace(/^0+/, '') || '0';

    const clamped = clampNumericString(digitsForClamp, min, max, digitLimit);

    // If we removed leading zeros but user typed '0' (and min 0), keep single zero
    const final = !allowZeroLeading && clamped === '' && digits.startsWith('0') ? '0' : clamped;

    onChange(final);
  };

  const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    handleChange(e.target.value);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    // Block non-digit characters that often bypass numeric inputs.
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
      return;
    }
    // allow ctrl/cmd combos and navigation keys
    if (e.ctrlKey || e.metaKey || e.altKey) return;
  };

  const onPaste: React.ClipboardEventHandler<HTMLInputElement> = (e) => {
    const pasted = e.clipboardData?.getData('text') ?? '';
    e.preventDefault();
    handleChange(pasted);
  };

  return (
    <input
      id={id}
      aria-label={ariaLabel}
      className={className}
      type="text" // use text so we control allowed characters precisely
      inputMode="numeric"
      pattern="\d*"
      value={strVal}
      placeholder={placeholder}
      onChange={onInputChange}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      maxLength={digitLimit}
      autoComplete="off"
    />
  );
};

export default NumericInput;
