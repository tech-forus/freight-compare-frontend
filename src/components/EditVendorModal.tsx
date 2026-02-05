// // // // src/components/EditVendorModal.tsx

import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { InformationCircleIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import Cookies from 'js-cookie';
import PincodeAutocomplete from '../components/PincodeAutocomplete'; // adjust path as needed
import { usePincodeLookup } from '../hooks/usePincodeLookup';
import { useFormConfig } from '../hooks/useFormConfig';
import { API_BASE_URL } from '../config/api';



// ============================================================================
// BUILT-IN VALIDATORS (UNCHANGED)
// ============================================================================


// Use centralized API configuration
const API_BASE = API_BASE_URL;


const validatePhone = (phone: string): string => {
  if (!phone) return 'Phone number is required';
  if (phone.startsWith('0')) return 'Cannot start with zero';
  if (!/^[1-9][0-9]{9}$/.test(phone)) return 'Enter a valid 10-digit phone number';
  return '';
};

const validateEmail = (email: string): string => {
  if (!email) return 'Email is required';

  // Check for spaces
  if (/\s/.test(email)) {
    return 'Email cannot contain spaces';
  }

  // Check for @ symbol
  if (!email.includes('@')) {
    return 'Email must contain "@"';
  }

  // Check for valid domain (accepts all TLDs: .com, .in, .co.uk, etc.)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return 'Please enter a valid email with domain (e.g., .com, .in, .org)';
  }

  return '';
};

export const validateGST = (gst: string): string => {
  if (!gst) return '';
  const gstUpper = gst.toUpperCase().replace(/\s+/g, '');
  if (gstUpper.length !== 15) {
    return 'GST must be exactly 15 characters';
  }
  if (!/^[A-Z0-9]+$/.test(gstUpper)) {
    return 'GST can only contain letters (A-Z) and digits (0-9)';
  }
  const stateCode = gstUpper.substring(0, 2);
  const validStateCodes = new Set([
    '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
    '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
    '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
    '31', '32', '33', '34', '35', '36', '37', '38',
    '97', '99',
  ]);
  if (!validStateCodes.has(stateCode)) {
    return 'Invalid state code in GST (must be 01–38, 97 or 99)';
  }
  const panPart = gstUpper.substring(2, 12);
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panPart)) {
    return 'Invalid PAN format in GST (should be AAAAA9999A in positions 3–12)';
  }
  const entityCode = gstUpper.charAt(12);
  if (!/^[0-9]$/.test(entityCode)) {
    return 'Entity code (position 13) must be a digit from 0 to 9';
  }
  const defaultChar = gstUpper.charAt(13);
  if (defaultChar !== 'Z') {
    return 'Character at position 14 must be Z';
  }
  const checksumChar = gstUpper.charAt(14);
  if (!/^[0-9A-Z]$/.test(checksumChar)) {
    return 'Invalid checksum digit (must be 0–9 or A–Z)';
  }
  const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const ch = gstUpper.charAt(i);
    const charValue = charset.indexOf(ch);
    if (charValue === -1) {
      return 'GST contains invalid character';
    }
    const weight = (i % 2 === 0) ? 1 : 2;
    const product = charValue * weight;
    const quotient = Math.floor(product / 36);
    const remainder = product % 36;
    sum += quotient + remainder;
  }
  const checksumValue = (36 - (sum % 36)) % 36;
  const expectedChecksum = charset.charAt(checksumValue);
  if (checksumChar !== expectedChecksum) {
    return `GST checksum digit (last character) is invalid (expected ${expectedChecksum}, got ${checksumChar})`;
  }
  return '';
};

const validatePincode = (pincode: string): string => {
  if (!pincode) return 'Pincode is required';
  if (!/^\d{6}$/.test(pincode)) return 'Pincode must be exactly 6 digits';
  return '';
};

const validateCompanyName = (name: string): string => {
  if (!name) return 'Company name is required';
  if (name.length > 60) return 'Company name must be at most 60 characters';
  return '';
};

const validateContactName = (name: string): string => {
  if (!name) return 'Contact person name is required';
  if (name.length < 2) return 'Contact name must be at least 2 characters';
  if (name.length > 30) return 'Contact name must be at most 30 characters';
  if (!/^[a-zA-Z\s\-']+$/.test(name)) {
    return 'Contact name can only contain letters, spaces, hyphens, and apostrophes';
  }
  return '';
};

const validateSubVendor = (name: string): string => {
  if (!name) return 'Sub vendor is required';
  if (name.length > 20) return 'Sub vendor must be at most 20 characters';
  return '';
};

const validateVendorCode = (code: string): string => {
  if (!code) return 'Vendor code is required';
  if (code.length > 20) return 'Vendor code must be at most 20 characters';
  if (!/^[A-Z0-9]+$/.test(code.toUpperCase())) {
    return 'Vendor code can only contain letters and numbers';
  }
  return '';
};

const validateAddress = (address: string): string => {
  if (!address) return 'Address is required';
  if (address.length > 150) return 'Address must be at most 150 characters';
  return '';
};

// ============================================================================
// TYPES (UNCHANGED)
// ============================================================================

interface VendorBasics {
  companyName: string;
  contactPersonName: string;
  vendorPhoneNumber: string;
  vendorEmailAddress: string;
  gstin: string;
  subVendor: string;
  vendorCode: string;
  address: string;
  serviceMode: 'FTL' | 'LTL' | null;
  companyRating: number;
}

interface GeoData {
  pincode: string;
  state: string;
  city: string;
}

interface ChargeCardData {
  mode: 'FIXED' | 'VARIABLE';
  fixedAmount: number;
  variableRange: number;
  unit?: 'per kg' | 'per shipment' | 'per piece' | 'per box';
  weightThreshold?: number;
}

interface Charges {
  docketCharges: number;
  minChargeableWeight: number;
  minimumCharges: number;
  hamaliCharges: number;
  greenTax: number;
  miscCharges: number;
  fuelSurchargePct: number;
  daccCharges: number;
  handlingCharges: ChargeCardData;
  rovCharges: ChargeCardData;
  codCharges: ChargeCardData;
  toPayCharges: ChargeCardData;
  appointmentCharges: ChargeCardData;
}

interface Volumetric {
  unit: 'cm' | 'in';
  volumetricDivisor: number;
  cftFactor: number;
}

interface FormState {
  basics: VendorBasics;
  geo: GeoData;
  charges: Charges;
  volumetric: Volumetric;
  transportMode: 'road' | 'air' | 'rail' | 'ship';
}

interface EditVendorModalProps {
  vendor: any | null;
  onClose: () => void;
  onSave: (updatedVendor: any) => void;
}

// ============================================================================
// CONSTANTS - UPDATED
// ============================================================================

const VOLUMETRIC_DIVISOR_OPTIONS = [2800, 3000, 3200, 3500, 3800, 4000, 4200, 4500, 4720, 4750, 4800, 5000, 5200, 5500, 5800, 6000, 7000];
const CFT_FACTOR_OPTIONS = [4, 5, 6, 7, 8, 9, 10];

// ⭐ CHANGED: Fuel options now [0, 5, 10, 15, 20, 25, 30, 35, 40]
const FUEL_SURCHARGE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40] as const;

// ⭐ NEW: Variable percentage options for charge cards (0.1% to 5.0%)
const VARIABLE_PERCENTAGE_OPTIONS = [
  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0,
  1.25, 1.5, 1.75, 2.0, 2.25, 2.5,
  3.0, 3.5, 4.0, 4.5, 5.0,
] as const;

const PRESETS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const CHARGE_MAX = 10000;
const BLOCKED_KEYS = new Set(['e', 'E', '+', '-']);

// ============================================================================
// UTILITY FUNCTIONS (UNCHANGED)
// ============================================================================

function getAuthTokenFromStorage(): string {
  return (
    Cookies.get('authToken') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    ''
  );
}

const displayZeroAsBlank = (val: string | number | null | undefined): string => {
  if (val === 0 || val === '0' || val === null || val === undefined) return '';
  return String(val);
};

function sanitizeDecimalString(raw: string, precision = 2) {
  if (!raw) return '';
  let s = String(raw).trim().replace(/,/g, '').replace(/[^\d.]/g, '');
  const parts = s.split('.');
  if (parts.length > 1) s = parts[0] + '.' + parts.slice(1).join('');
  if (s.includes('.')) {
    const [intPart, decPart] = s.split('.');
    const dec = decPart.slice(0, precision);
    s = `${intPart || '0'}${precision > 0 ? `.${dec}` : ''}`;
  }
  s = s.replace(/^0+([1-9])/, '$1');
  if (s.startsWith('.')) s = '0' + s;
  return s === '' ? '' : s;
}

function clampDecimalString(raw: string, min: number, max: number, precision = 2) {
  const sanitized = sanitizeDecimalString(raw, precision);
  if (!sanitized) return '';
  const n = Number(sanitized);
  if (!Number.isFinite(n)) return '';
  const clamped = Math.min(Math.max(n, min), max);
  if (precision <= 0) return String(Math.round(clamped));
  let fixed = clamped.toFixed(precision);
  fixed = fixed.replace(/\.?0+$/, '');
  return fixed;
}

function sanitizeKeepDecimals(raw: string, precision = 2) {
  if (raw === undefined || raw === null) return '';

  // Remove everything except digits and decimal point
  let s = String(raw).replace(/,/g, '').replace(/[^\d.]/g, '');

  // Allow only one decimal point
  const parts = s.split('.');
  if (parts.length > 1) {
    s = parts[0] + '.' + parts.slice(1).join('');
  }

  // ⭐ NEW: Restrict first digit to 0-4 for variable charges
  if (s.length > 0 && !s.startsWith('.')) {
    const firstDigit = parseInt(s.charAt(0));
    if (firstDigit > 4) {
      s = '4' + s.slice(1); // Auto-correct to 4
    }
  }

  // Handle decimal formatting
  if (s.includes('.')) {
    const [integer, decimal] = s.split('.');
    s = `${integer || '0'}${precision > 0 ? '.' + (decimal ?? '').slice(0, precision) : ''}`;
  }

  // Add leading zero if starts with decimal
  if (s.startsWith('.')) {
    s = '0' + s;
  }

  return s;
}

function ceilToStep(value: number, step = 0.1, decimals = 1) {
  if (!Number.isFinite(value)) return (0).toFixed(decimals);
  const multiplier = 1 / step;
  const ceiled = Math.ceil(value * multiplier) / multiplier;
  return ceiled.toFixed(decimals);
}

// ============================================================================
// ⭐ NEW: COMBO INPUT COMPONENT (for Fuel Surcharge and Variable %)
// ============================================================================

interface ComboInputProps {
  value: string | number;
  options: readonly number[];
  onChange: (value: string) => void;
  onBlur: () => void;
  placeholder?: string;
  suffix?: string;
  maxLength?: number;
  className?: string;
  error?: string;
  inputMode?: 'text' | 'numeric' | 'decimal';
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  formatOption?: (value: number) => string;
  disabled?: boolean;
}

const ComboInput: React.FC<ComboInputProps> = ({
  value,
  options,
  onChange,
  onBlur,
  placeholder = '',
  suffix = '%',
  maxLength,
  className = '',
  error,
  inputMode = 'decimal',
  onKeyDown,
  onPaste,
  formatOption = (val) => `${val}${suffix}`,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleInputBlur = () => {
    setTimeout(() => {
      if (!isOpen) {
        onBlur();
      }
    }, 150);
  };

  const handleOptionSelect = (option: number, e?: React.MouseEvent) => {
    if (e) e.preventDefault(); // Prevent input blur
    onChange(String(option));
    setIsOpen(false);
    setHighlightedIndex(-1);
    // Don't call onBlur here - let it happen naturally
    inputRef.current?.focus();
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent input blur
    if (!disabled) {
      setIsOpen(!isOpen);
      setHighlightedIndex(-1);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
    }

    if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(0);
    }

    if (isOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault();
        handleOptionSelect(options[highlightedIndex]);
      }
    }
  };

  const displayValue = value === 0 || value === '0' || value === null || value === undefined ? '' : String(value);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          onPaste={onPaste}
          inputMode={inputMode}
          maxLength={maxLength}
          placeholder={placeholder}
          disabled={disabled}
          className={`block w-full border-2 rounded-lg shadow-sm pl-3 pr-16 py-2 text-sm text-slate-800 placeholder-slate-400
                     focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition bg-slate-50/70
                     ${error ? 'border-red-500 focus:border-red-600' : 'border-indigo-500 focus:border-indigo-600'}
                     ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                     ${className}`}
        />

        {suffix && (
          <span className="absolute right-10 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
            {suffix}
          </span>
        )}

        <button
          type="button"
          onMouseDown={toggleDropdown}
          disabled={disabled}
          className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 transition-colors
                     ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                     ${isOpen ? 'bg-slate-100' : ''}`}
          tabIndex={-1}
        >
          <ChevronDownIcon
            className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.map((option, index) => (
            <button
              key={option}
              type="button"
              onMouseDown={(e) => handleOptionSelect(option, e)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full text-left px-4 py-2 text-sm transition-colors
                         ${highlightedIndex === index ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}
                         ${index === 0 ? 'rounded-t-lg' : ''}
                         ${index === options.length - 1 ? 'rounded-b-lg' : ''}`}
            >
              {formatOption(option)}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

// ============================================================================
// DEFAULT STATE (UNCHANGED)
// ============================================================================

const defaultFormState: FormState = {
  basics: {
    companyName: '',
    contactPersonName: '',
    vendorPhoneNumber: '',
    vendorEmailAddress: '',
    gstin: '',
    subVendor: '',
    vendorCode: '',
    address: '',
    serviceMode: null,
    companyRating: 3,
  },
  geo: {
    pincode: '',
    state: '',
    city: '',
  },
  charges: {
    docketCharges: 0,
    minChargeableWeight: 0,
    minimumCharges: 0,
    hamaliCharges: 0,
    greenTax: 0,
    miscCharges: 0,
    fuelSurchargePct: 0,
    daccCharges: 0,
    handlingCharges: {
      mode: 'FIXED',
      fixedAmount: 0,
      variableRange: 0,
      unit: 'per kg',
      weightThreshold: 0,
    },
    rovCharges: { mode: 'FIXED', fixedAmount: 0, variableRange: 0 },
    codCharges: { mode: 'FIXED', fixedAmount: 0, variableRange: 0 },
    toPayCharges: { mode: 'FIXED', fixedAmount: 0, variableRange: 0 },
    appointmentCharges: { mode: 'FIXED', fixedAmount: 0, variableRange: 0 },
  },
  volumetric: { unit: 'cm', volumetricDivisor: 0, cftFactor: 0 },
  transportMode: 'road',
};

// ============================================================================
// ⭐ UPDATED: COMPACT CHARGE CARD COMPONENT (Now uses ComboInput for Variable %)
// ============================================================================

interface CompactChargeCardEditProps {
  title: string;
  data: ChargeCardData;
  onChange: (field: keyof ChargeCardData, value: any) => void;
  showWeightThreshold?: boolean;
  showUnitSelector?: boolean;
}

const CompactChargeCardEdit: React.FC<CompactChargeCardEditProps> = ({
  title,
  data,
  onChange,
  showWeightThreshold = false,
  showUnitSelector = false,
}) => {
  const [localVar, setLocalVar] = useState<string>(() => {
    const v = data?.variableRange;
    return v === undefined || v === null || v === 0 ? '' : String(v);
  });

  useEffect(() => {
    const v = data?.variableRange;
    setLocalVar(v === undefined || v === null || v === 0 ? '' : String(v));
  }, [data?.variableRange]);

  // Handle mode toggle - clear opposite value
  const handleModeChange = (newMode: 'FIXED' | 'VARIABLE') => {
    onChange('mode', newMode);
    if (newMode === 'FIXED') {
      // Switching to Fixed - clear Variable
      onChange('variableRange', 0);
      setLocalVar('');
    } else {
      // Switching to Variable - clear Fixed
      onChange('fixedAmount', 0);
    }
  };

  const handleVariableChange = (value: string) => {
    // ⭐ CHANGED: precision = 1 (only one decimal digit)
    const sanitized = sanitizeKeepDecimals(value, 1);
    setLocalVar(sanitized);

    if (sanitized === '') {
      onChange('variableRange', 0);
      return;
    }

    const num = Number(sanitized);
    if (Number.isFinite(num)) {
      onChange('variableRange', num);
    }
  };

  const handleVariableBlur = () => {
    const currentValue = data.variableRange;

    if (typeof currentValue === 'string') {
      const trimmed = currentValue.replace(/\.$/, '');
      const num = Number(trimmed);
      if (Number.isFinite(num)) {
        // ⭐ CHANGED: If value > 4.9, show error and clear
        if (num > 4.9) {
          toast.error(`${title}: Maximum value is 4.9%. Value cleared.`);
          onChange('variableRange', 0);
          setLocalVar('');
        } else {
          const clamped = Math.max(num, 0);
          onChange('variableRange', clamped);
        }
      } else {
        onChange('variableRange', 0);
      }
      return;
    }

    if (currentValue === null || currentValue === undefined || currentValue === '') {
      onChange('variableRange', 0);
      return;
    }

    const num = Number(currentValue);
    if (!Number.isFinite(num) || num < 0) {
      onChange('variableRange', 0);
    } else {
      // ⭐ CHANGED: If value > 4.9, show error and clear
      if (num > 4.9) {
        toast.error(`${title}: Maximum value is 4.9%. Value cleared.`);
        onChange('variableRange', 0);
        setLocalVar('');
      } else {
        onChange('variableRange', num);
      }
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-indigo-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-800">{title}</h4>
        {showUnitSelector && (
          <select
            value={data.unit || 'per kg'}
            onChange={(e) => onChange('unit', e.target.value as 'per kg' | 'per shipment' | 'per piece' | 'per box')}
            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-indigo-500"
          >
            <option value="per kg">per kg</option>
            <option value="per shipment">per shipment</option>
            <option value="per piece">per piece</option>
            <option value="per box">per box</option>
          </select>
        )}
      </div>

      {/* Fixed ₹ / Variable % Toggle */}
      <div className="flex gap-1 mb-3">
        <button
          type="button"
          onClick={() => handleModeChange('FIXED')}
          className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded transition ${data.mode === 'FIXED'
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
        >
          Fixed ₹
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('VARIABLE')}
          className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded transition ${data.mode === 'VARIABLE'
            ? 'bg-indigo-600 text-white'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
        >
          Variable %
        </button>
      </div>

      {/* Input Field */}
      {data.mode === 'FIXED' ? (
        <div>
          {/* ⭐ UPDATED: Inline unit dropdown with purple styling */}
          <div className="flex items-center gap-2 mb-1">
            <label className="text-xs font-medium text-slate-600">
              Fixed Rate
            </label>
            {showUnitSelector && (
              <select
                value={data.unit || 'per kg'}
                onChange={(e) => onChange('unit', e.target.value as 'per kg' | 'per shipment' | 'per piece' | 'per box')}
                className="text-xs bg-indigo-100 text-indigo-700 border border-indigo-300 rounded px-2 py-0.5 font-medium focus:ring-1 focus:ring-indigo-500 focus:bg-indigo-50"
              >
                <option value="per kg">per kg</option>
                <option value="per shipment">per shipment</option>
                <option value="per piece">per piece</option>
                <option value="per box">per box</option>
              </select>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={displayZeroAsBlank(data.fixedAmount)}
              onChange={(e) => {
                const raw = e.target.value;
                const clamped = clampDecimalString(raw, 0, CHARGE_MAX, 2);
                onChange('fixedAmount', clamped === '' ? 0 : Number(clamped));
              }}
              onKeyDown={(e) => BLOCKED_KEYS.has(e.key) && e.preventDefault()}
              className="w-full border border-slate-300 rounded px-3 py-2 pr-6 text-sm focus:ring-1 focus:ring-indigo-500"
              placeholder="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
          </div>
        </div>
      ) : (
        <div>
          {/* ⭐ UPDATED: Inline unit dropdown with purple styling */}
          <div className="flex items-center gap-2 mb-1">
            <label className="text-xs font-medium text-slate-600">
              Variable %
            </label>
            {showUnitSelector && (
              <select
                value={data.unit || 'per kg'}
                onChange={(e) => onChange('unit', e.target.value as 'per kg' | 'per shipment' | 'per piece' | 'per box')}
                className="text-xs bg-indigo-100 text-indigo-700 border border-indigo-300 rounded px-2 py-0.5 font-medium focus:ring-1 focus:ring-indigo-500 focus:bg-indigo-50"
              >
                <option value="per kg">per kg</option>
                <option value="per shipment">per shipment</option>
                <option value="per piece">per piece</option>
                <option value="per box">per box</option>
              </select>
            )}
          </div>
          <ComboInput
            value={localVar}
            options={VARIABLE_PERCENTAGE_OPTIONS}
            onChange={handleVariableChange}
            onBlur={handleVariableBlur}
            placeholder="Select or type 0-5"
            suffix="%"
            maxLength={4}
            inputMode="decimal"
            onKeyDown={(e) => {
              if (BLOCKED_KEYS.has(e.key)) {
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
          <p className="text-xs text-slate-500 mt-1">Max allowed is 5%</p>
        </div>
      )}

      {/* Weight Threshold (only for Handling) - UNCHANGED */}
      {showWeightThreshold && (
        <div className="mt-3">
          <label className="block text-xs font-medium text-slate-600 mb-1">Weight Threshold (KG)</label>
          <div className="relative">
            <input
              type="text"
              value={displayZeroAsBlank(data.weightThreshold)}
              onChange={(e) => {
                const raw = e.target.value;
                const clamped = clampDecimalString(raw, 0, 20000, 2);
                onChange('weightThreshold', clamped === '' ? 0 : Number(clamped));
              }}
              onKeyDown={(e) => BLOCKED_KEYS.has(e.key) && e.preventDefault()}
              className="w-full border border-slate-300 rounded px-3 py-2 pr-8 text-sm focus:ring-1 focus:ring-indigo-500"
              placeholder="0"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">KG</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN EDIT VENDOR MODAL
// ============================================================================

const EditVendorModal: React.FC<EditVendorModalProps> = ({ vendor, onClose, onSave }) => {
  const [formData, setFormData] = useState<FormState>(defaultFormState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ FIX: Pincode lookup state
  const [isLoadingPincode, setIsLoadingPincode] = useState(false);
  const [pincodeError, setPincodeError] = useState('');

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM BUILDER CONFIG - Dynamic labels, visibility, and options from MongoDB
  // ═══════════════════════════════════════════════════════════════════════════
  const { getField, getConstraint } = useFormConfig('add-vendor');

  // Helper: Get label with fallback
  const getLabel = (fieldId: string, fallback: string) =>
    getField(fieldId)?.label ?? fallback;

  // Helper: Check if field is required
  const isRequired = (fieldId: string) =>
    getField(fieldId)?.required ?? true;

  // Helper: Check if field is visible
  const isVisible = (fieldId: string) =>
    getField(fieldId)?.visible !== false;

  // Helper: Get transport mode options from config
  interface TransportModeOption {
    value: string;
    label: string;
    enabled?: boolean;
  }
  const transportModeField = getField('transportMode');
  const transportModeOptions: TransportModeOption[] = transportModeField?.options || [
    { value: 'road', label: 'Road', enabled: true },
    { value: 'air', label: 'Air', enabled: false },
    { value: 'rail', label: 'Rail', enabled: false },
    { value: 'ship', label: 'Ship', enabled: false },
  ];

  // ============================================================================
  // LOAD VENDOR DATA (UNCHANGED)
  // ============================================================================

  useEffect(() => {
    if (!vendor) {
      setFormData(defaultFormState);
      return;
    }

    const priceRate = vendor.prices?.priceRate || {};

    const determineMode = (fixed: number, variable: number): 'FIXED' | 'VARIABLE' => {
      if (fixed > 0 && variable > 0) return fixed >= variable ? 'FIXED' : 'VARIABLE';
      if (fixed > 0) return 'FIXED';
      if (variable > 0) return 'VARIABLE';
      return 'FIXED';
    };

    setFormData({
      basics: {
        companyName: vendor.companyName || '',
        contactPersonName: vendor.contactPersonName || '',
        vendorPhoneNumber: String(vendor.vendorPhone || ''),
        vendorEmailAddress: vendor.vendorEmail || '',
        gstin: vendor.gstNo || '',
        subVendor: vendor.subVendor || '',
        vendorCode: vendor.vendorCode || '',
        address: vendor.address || '',
        serviceMode: (priceRate.serviceMode as 'FTL' | 'LTL') || (vendor.serviceMode as 'FTL' | 'LTL') || null,
        companyRating: Number(vendor.rating ?? 4),
      },
      geo: {
        pincode: String(vendor.pincode || ''),
        state: vendor.state || '',
        city: vendor.city || '',
      },
      charges: {
        docketCharges: Number(priceRate.docketCharges || 0),
        minChargeableWeight: Number(priceRate.minWeight || 0),
        minimumCharges: Number(priceRate.minCharges || 0),
        hamaliCharges: Number(priceRate.hamaliCharges || 0),
        greenTax: Number(priceRate.greenTax || 0),
        miscCharges: Number(priceRate.miscellanousCharges || 0),
        fuelSurchargePct: Number(priceRate.fuel || 0),
        daccCharges: Number(priceRate.daccCharges || 0),
        handlingCharges: {
          mode: determineMode(
            Number(priceRate.handlingCharges?.fixed || 0),
            Number(priceRate.handlingCharges?.variable || 0)
          ),
          fixedAmount: Number(priceRate.handlingCharges?.fixed || 0),
          variableRange: Number(priceRate.handlingCharges?.variable || 0),
          unit: 'per kg',
          weightThreshold: Number(priceRate.handlingCharges?.threshholdweight || 0),
        },
        rovCharges: {
          mode: determineMode(
            Number(priceRate.rovCharges?.fixed || 0),
            Number(priceRate.rovCharges?.variable || 0)
          ),
          fixedAmount: Number(priceRate.rovCharges?.fixed || 0),
          variableRange: Number(priceRate.rovCharges?.variable || 0),
        },
        codCharges: {
          mode: determineMode(
            Number(priceRate.codCharges?.fixed || 0),
            Number(priceRate.codCharges?.variable || 0)
          ),
          fixedAmount: Number(priceRate.codCharges?.fixed || 0),
          variableRange: Number(priceRate.codCharges?.variable || 0),
        },
        toPayCharges: {
          mode: determineMode(
            Number(priceRate.topayCharges?.fixed || 0),
            Number(priceRate.topayCharges?.variable || 0)
          ),
          fixedAmount: Number(priceRate.topayCharges?.fixed || 0),
          variableRange: Number(priceRate.topayCharges?.variable || 0),
        },
        appointmentCharges: {
          mode: determineMode(
            Number(priceRate.appointmentCharges?.fixed || 0),
            Number(priceRate.appointmentCharges?.variable || 0)
          ),
          fixedAmount: Number(priceRate.appointmentCharges?.fixed || 0),
          variableRange: Number(priceRate.appointmentCharges?.variable || 0),
        },
      },
      volumetric: {
        unit: (priceRate.volumetricUnit || (priceRate.divisor ? 'cm' : priceRate.cftFactor ? 'in' : 'cm')) as 'cm' | 'in',
        volumetricDivisor: Number(priceRate.divisor || 2800),
        cftFactor: Number(priceRate.cftFactor || 0),
      },
      transportMode: (vendor.mode as 'road' | 'air' | 'rail' | 'ship') || 'road',
    });
  }, [vendor]);

  // ============================================================================
  // HANDLERS (UNCHANGED)
  // ============================================================================

  const setBasicField = (field: keyof VendorBasics, value: string | number | null) => {
    setFormData((prev) => ({
      ...prev,
      basics: { ...prev.basics, [field]: value },
    }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const setGeoField = (field: keyof GeoData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      geo: { ...prev.geo, [field]: value },
    }));
  };

  const setChargeField = (field: keyof Charges, value: number) => {
    setFormData((prev) => ({
      ...prev,
      charges: { ...prev.charges, [field]: value },
    }));
  };

  const setCardField = (
    cardName: keyof Pick<Charges, 'handlingCharges' | 'rovCharges' | 'codCharges' | 'toPayCharges' | 'appointmentCharges'>,
    field: keyof ChargeCardData,
    value: any
  ) => {
    setFormData((prev) => ({
      ...prev,
      charges: {
        ...prev.charges,
        [cardName]: {
          ...(prev.charges[cardName] as ChargeCardData),
          [field]: value,
        },
      },
    }));
  };

  // ⭐ NEW: Fuel surcharge handlers for ComboInput
  const handleFuelSurchargeChange = (value: string) => {
    const sanitized = sanitizeDecimalString(value, 0, true);
    if (sanitized === '') {
      setChargeField('fuelSurchargePct', 0);
      return;
    }

    const num = Number(sanitized);
    if (num > 50) {
      return; // Block typing values > 50
    }

    setChargeField('fuelSurchargePct', num);
  };

  const handleFuelSurchargeBlur = () => {
    const num = formData.charges.fuelSurchargePct;
    if (num > 50) {
      setChargeField('fuelSurchargePct', 50);
    }
  };

  // ============================================================================
  // ✅ FIX: PINCODE AUTOFILL FUNCTION
  // ============================================================================

  // Pincode autofill function (same as AddVendor)
  const fetchPincodeData = async (pincode: string) => {
    if (pincode.length !== 6) {
      return;
    }

    setIsLoadingPincode(true);
    setPincodeError('');

    try {
      //const API_URL = import.meta.env.VITE_API_URL || 'localhost:8000';
      const response = await fetch(`${API_BASE}/api/pincode/${pincode}`);

      if (!response.ok) {
        if (response.status === 404) {
          setPincodeError('Unknown pincode');
          setIsLoadingPincode(false);
          return;
        }
        throw new Error('Failed to fetch pincode data');
      }

      const data = await response.json();

      if (data && data.state && data.city) {
        setFormData(prev => ({
          ...prev,
          geo: {
            ...prev.geo,
            state: data.state,
            city: data.city,
          }
        }));

        // Clear any existing errors for state/city
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.state;
          delete newErrors.city;
          return newErrors;
        });
      } else {
        setPincodeError('Unable to fetch location details');
      }
    } catch (error) {
      console.error('Error fetching pincode:', error);
      setPincodeError('Failed to fetch location');
    } finally {
      setIsLoadingPincode(false);
    }
  };

  // ============================================================================
  // VALIDATION (UNCHANGED)
  // ============================================================================

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    const { basics, geo } = formData;

    const companyNameError = validateCompanyName(basics.companyName);
    if (companyNameError) newErrors.companyName = companyNameError;

    const contactError = validateContactName(basics.contactPersonName);
    if (contactError) newErrors.contactPersonName = contactError;

    const phoneError = validatePhone(basics.vendorPhoneNumber);
    if (phoneError) newErrors.vendorPhoneNumber = phoneError;

    const emailError = validateEmail(basics.vendorEmailAddress);
    if (emailError) newErrors.vendorEmailAddress = emailError;

    if (basics.gstin) {
      const gstError = validateGST(basics.gstin);
      if (gstError) newErrors.gstin = gstError;
    }

    const subVendorError = validateSubVendor(basics.subVendor);
    if (subVendorError) newErrors.subVendor = subVendorError;

    const vendorCodeError = validateVendorCode(basics.vendorCode);
    if (vendorCodeError) newErrors.vendorCode = vendorCodeError;

    const addressError = validateAddress(basics.address);
    if (addressError) newErrors.address = addressError;

    const pincodeError = validatePincode(geo.pincode);
    if (pincodeError) newErrors.pincode = pincodeError;

    if (!geo.state.trim()) newErrors.state = 'State is required';
    if (!geo.city.trim()) newErrors.city = 'City is required';

    if (!basics.serviceMode) newErrors.serviceMode = 'Please select a service mode';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ============================================================================
  // SUBMIT (UNCHANGED)
  // ============================================================================

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    //PUT REQUEST TO UPDATE VENDOR 
    setIsSubmitting(true);
    try {
      const vendorId = vendor?._id ?? vendor?.id;
      if (!vendorId) throw new Error('Missing vendor id');

      // ✅ Build complete payload with ALL required fields
      const payload = {
        // Basic company information
        companyName: formData.basics.companyName.trim(),
        contactPersonName: formData.basics.contactPersonName.trim(),
        vendorCode: formData.basics.vendorCode,
        vendorPhone: Number(formData.basics.vendorPhoneNumber.replace(/\D+/g, '')),
        vendorEmail: formData.basics.vendorEmailAddress.trim(),
        gstNo: formData.basics.gstin.toUpperCase(),
        subVendor: formData.basics.subVendor.trim(),

        // Address & location
        address: formData.basics.address.trim(),
        pincode: Number(formData.geo.pincode.replace(/\D+/g, '')),
        city: formData.geo.city,
        state: formData.geo.state,

        // Service details
        serviceMode: formData.basics.serviceMode,
        rating: formData.basics.companyRating,
        transportMode: formData.transportMode,

        // Volumetric configuration (root level - required for DB)
        volumetricUnit: formData.volumetric.unit,
        cftFactor: formData.volumetric.unit === 'in' ? formData.volumetric.cftFactor : null,

        // Pricing details
        prices: {
          priceRate: {
            minWeight: formData.charges.minChargeableWeight,
            docketCharges: formData.charges.docketCharges,
            fuel: formData.charges.fuelSurchargePct,
            minCharges: formData.charges.minimumCharges,
            greenTax: formData.charges.greenTax,
            daccCharges: formData.charges.daccCharges,
            miscellanousCharges: formData.charges.miscCharges,
            hamaliCharges: formData.charges.hamaliCharges,
            divisor: formData.volumetric.unit === 'cm' ? formData.volumetric.volumetricDivisor : 0,
            cftFactor: formData.volumetric.unit === 'in' ? formData.volumetric.cftFactor : 0,
            handlingCharges: {
              fixed: formData.charges.handlingCharges.fixedAmount,
              variable: Number(formData.charges.handlingCharges.variableRange),
              threshholdweight: formData.charges.handlingCharges.weightThreshold || 0,
              unit: formData.charges.handlingCharges.unit || 'per kg',
            },
            rovCharges: {
              fixed: formData.charges.rovCharges.fixedAmount,
              variable: Number(formData.charges.rovCharges.variableRange),
              unit: formData.charges.rovCharges.unit || 'per kg',
            },
            codCharges: {
              fixed: formData.charges.codCharges.fixedAmount,
              variable: Number(formData.charges.codCharges.variableRange),
              unit: formData.charges.codCharges.unit || 'per kg',
            },
            topayCharges: {
              fixed: formData.charges.toPayCharges.fixedAmount,
              variable: Number(formData.charges.toPayCharges.variableRange),
              unit: formData.charges.toPayCharges.unit || 'per kg',
            },
            appointmentCharges: {
              fixed: formData.charges.appointmentCharges.fixedAmount,
              variable: Number(formData.charges.appointmentCharges.variableRange),
              unit: formData.charges.appointmentCharges.unit || 'per kg',
            },
          },
          priceChart: vendor.prices?.priceChart || {},
        },
      };

      // 🔍 DEBUG: Log payload before sending
      console.log('📤 EditVendor Payload:', {
        companyName: payload.companyName,
        contactPersonName: payload.contactPersonName,
        volumetricUnit: payload.volumetricUnit,
        cftFactor: payload.cftFactor,
        serviceMode: payload.serviceMode,
        rating: payload.rating,
        transportMode: payload.transportMode,
        allFields: Object.keys(payload),
      });

      //onst API_URL = import.meta.env.VITE_API_URL || 'localhost:8000';
      const token = getAuthTokenFromStorage();

      if (!token) {
        toast.error('Not authenticated — please login and try again.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`${API_BASE}/api/transporter/update-vendor/${vendorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({} as any));

      if (response.status === 401) {
        toast.error('Unauthorized — please login and try again.');
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        throw new Error(result?.message || `Failed to update vendor (${response.status})`);
      }

      toast.success('Vendor updated successfully!');
      onSave(result.data ?? { ...formData, _id: vendorId });
      onClose();
    } catch (err: any) {
      console.error('❌ Error updating vendor:', err);
      toast.error(err?.message || 'Failed to update vendor. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!vendor) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg shadow-xl">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
            <p className="text-gray-700">Loading vendor data...</p>
          </div>
        </div>
      </div>
    );
  }

  const isCM = formData.volumetric.unit === 'cm';
  const volumetricOptions = isCM ? VOLUMETRIC_DIVISOR_OPTIONS : CFT_FACTOR_OPTIONS;
  const volumetricSelected = isCM ? formData.volumetric.volumetricDivisor : formData.volumetric.cftFactor;
  const volumetricLabel = isCM ? 'Volumetric Divisor' : 'CFT Factor';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl my-8 flex flex-col"
        style={{ maxHeight: 'calc(100vh - 4rem)' }}
      >
        {/* Header - UNCHANGED */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10 rounded-t-lg">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Vendor</h2>
            <p className="text-sm text-gray-500 mt-1">
              Update vendor information for {vendor.companyName ?? 'this vendor'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">

            {/* COMPANY & CONTACT INFORMATION - UNCHANGED */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <InformationCircleIcon className="w-5 h-5 text-blue-500" />
                Company & Contact Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* All basic fields remain exactly the same - not showing full code to save space */}
                {/* Legal Company Name, Contact Person, Phone, Email, GST, Sub Vendor, Vendor Code, Pincode */}
                {/* Address, State, City, Service Mode, Rating */}
                {/* ... keeping original implementation ... */}

                {/* Company Name */}
                {isVisible('companyName') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {getLabel('companyName', 'Company Name')} {isRequired('companyName') && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.basics.companyName}
                      onChange={(e) => setBasicField('companyName', e.target.value.slice(0, getConstraint('companyName', 'maxLength', 60) || 60))}
                      maxLength={getConstraint('companyName', 'maxLength', 60) || 60}
                      className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 transition bg-slate-50/70
                      ${errors.companyName ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
                      placeholder="Enter company name"
                      required={isRequired('companyName')}
                    />
                    {errors.companyName && (
                      <p className="mt-1 text-xs text-red-600">{errors.companyName}</p>
                    )}
                  </div>
                )}

                {/* Contact Person */}
                {isVisible('contactPersonName') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {getLabel('contactPersonName', 'Contact Person')} {isRequired('contactPersonName') && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.basics.contactPersonName}
                      onChange={(e) => {
                        const maxLen = getConstraint('contactPersonName', 'maxLength', 30) || 30;
                        const raw = e.target.value.replace(/[^a-zA-Z\s\-']/g, '').slice(0, maxLen);
                        setBasicField('contactPersonName', raw.toUpperCase());
                      }}
                      maxLength={getConstraint('contactPersonName', 'maxLength', 30) || 30}
                      className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 transition bg-slate-50/70
                      ${errors.contactPersonName ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
                      placeholder="Enter contact person name"
                      required={isRequired('contactPersonName')}
                    />
                    {errors.contactPersonName && (
                      <p className="mt-1 text-xs text-red-600">{errors.contactPersonName}</p>
                    )}
                  </div>
                )}

                {/* Phone Number */}
                {isVisible('vendorPhoneNumber') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {getLabel('vendorPhoneNumber', 'Phone Number')} {isRequired('vendorPhoneNumber') && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.basics.vendorPhoneNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setBasicField('vendorPhoneNumber', value);
                      }}
                      onBlur={() => {
                        // Validate on blur
                        const error = validatePhone(formData.basics.vendorPhoneNumber);
                        if (error) {
                          setErrors(prev => ({ ...prev, vendorPhoneNumber: error }));
                        } else {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.vendorPhoneNumber;
                            return newErrors;
                          });
                        }
                      }}
                      inputMode="numeric"
                      maxLength={10}
                      className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 transition bg-slate-50/70
      ${errors.vendorPhoneNumber ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
                      placeholder="10-digit phone number"
                      required={isRequired('vendorPhoneNumber')}
                    />
                    {errors.vendorPhoneNumber && (
                      <p className="mt-1 text-xs text-red-600">{errors.vendorPhoneNumber}</p>
                    )}
                  </div>
                )}

                {/* Email Address */}
                {isVisible('vendorEmailAddress') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {getLabel('vendorEmailAddress', 'Email Address')} {isRequired('vendorEmailAddress') && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="email"
                      value={formData.basics.vendorEmailAddress}
                      onChange={(e) => {
                        // Block spaces and convert to lowercase
                        const value = e.target.value.replace(/\s/g, '').toLowerCase();
                        setBasicField('vendorEmailAddress', value);
                      }}
                      onBlur={() => {
                        // Validate on blur (when user leaves the field)
                        const error = validateEmail(formData.basics.vendorEmailAddress);
                        if (error) {
                          setErrors(prev => ({ ...prev, vendorEmailAddress: error }));
                        } else {
                          setErrors(prev => {
                            const newErrors = { ...prev };
                            delete newErrors.vendorEmailAddress;
                            return newErrors;
                          });
                        }
                      }}
                      className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 transition bg-slate-50/70
      ${errors.vendorEmailAddress ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
                      placeholder="email@example.com"
                      required={isRequired('vendorEmailAddress')}
                    />
                    {errors.vendorEmailAddress && (
                      <p className="mt-1 text-xs text-red-600">{errors.vendorEmailAddress}</p>
                    )}
                  </div>
                )}

                {/* GST Number */}
                {isVisible('gstin') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {getLabel('gstin', 'GST Number')} {isRequired('gstin') && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.basics.gstin || ''}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
                        setBasicField('gstin', value);
                      }}
                      onBlur={() => {
                        // Validate on blur (only if GST is entered)
                        if (formData.basics.gstin) {
                          const error = validateGST(formData.basics.gstin);
                          if (error) {
                            setErrors(prev => ({ ...prev, gstin: error }));
                          } else {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.gstin;
                              return newErrors;
                            });
                          }
                        }
                      }}
                      maxLength={15}
                      className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 transition bg-slate-50/70
      ${errors.gstin ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
                      placeholder="15-character GST number"
                    />
                    {errors.gstin && <p className="mt-1 text-xs text-red-600">{errors.gstin}</p>}
                  </div>
                )}

                {/* Sub Vendor */}
                {isVisible('subVendor') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {getLabel('subVendor', 'Sub Vendor')} {isRequired('subVendor') && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.basics.subVendor}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^a-zA-Z\s\-']/g, '').slice(0, 20);
                        setBasicField('subVendor', raw.toUpperCase());
                      }}
                      maxLength={20}
                      className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 transition bg-slate-50/70
                      ${errors.subVendor ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
                      placeholder="Enter sub vendor (optional)"
                    />
                    {errors.subVendor && <p className="mt-1 text-xs text-red-600">{errors.subVendor}</p>}
                  </div>
                )}

                {/* Vendor Code */}
                {isVisible('vendorCode') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {getLabel('vendorCode', 'Vendor Code')} {isRequired('vendorCode') && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.basics.vendorCode}
                      onChange={(e) => {
                        const maxLen = getConstraint('vendorCode', 'maxLength', 20) || 20;
                        const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, maxLen);
                        setBasicField('vendorCode', value);
                      }}
                      maxLength={getConstraint('vendorCode', 'maxLength', 20) || 20}
                      className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 transition bg-slate-50/70
                      ${errors.vendorCode ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
                      placeholder="Enter vendor code (optional)"
                    />
                    {errors.vendorCode && <p className="mt-1 text-xs text-red-600">{errors.vendorCode}</p>}
                  </div>
                )}

                {/* Pincode */}
                {/* Pincode (with autocomplete + autofill) */}
                {isVisible('pincode') && (
                  <div>
                    <PincodeAutocomplete
                      label="Pincode *"
                      id="edit-vendor-pincode"
                      value={formData.geo.pincode}
                      placeholder="6-digit pincode"
                      error={errors.pincode || undefined}

                      onChange={async (pin) => {
                        // update pincode as user types
                        setGeoField('pincode', pin);

                        // ⭐ NEW: Auto-fill when 6 digits are entered
                        if (pin.length === 6 && /^\d{6}$/.test(pin)) {
                          try {
                            const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
                            const data = await response.json();
                            if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.[0]) {
                              const po = data[0].PostOffice[0];
                              setFormData(prev => ({
                                ...prev,
                                geo: {
                                  ...prev.geo,
                                  state: po.State || '',
                                  city: po.District || '',
                                },
                              }));
                            }
                          } catch (err) {
                            console.error('Pincode lookup failed:', err);
                          }
                        }

                        // clear state/city when pincode becomes incomplete
                        if (pin.length < 6) {
                          setFormData(prev => ({
                            ...prev,
                            geo: {
                              ...prev.geo,
                              state: '',
                              city: '',
                            },
                          }));
                        }

                        // clear field-level errors while typing
                        setErrors(prev => {
                          const copy = { ...prev };
                          delete copy.pincode;
                          delete copy.state;
                          delete copy.city;
                          return copy;
                        });
                      }}

                      onSelect={(s) => {
                        setFormData(prev => ({
                          ...prev,
                          geo: {
                            ...prev.geo,
                            pincode: s.pincode,
                            state: s.state,
                            city: s.city,
                          },
                        }));
                        setErrors(prev => {
                          const copy = { ...prev };
                          delete copy.pincode;
                          delete copy.state;
                          delete copy.city;
                          return copy;
                        });
                      }}
                      onBlur={async () => {
                        // ⭐ NEW: Auto-fill on blur if 6-digit pincode entered
                        const pin = formData.geo.pincode;
                        if (pin && pin.length === 6 && /^\d{6}$/.test(pin)) {
                          try {
                            const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
                            const data = await response.json();
                            if (data && data[0]?.Status === 'Success' && data[0]?.PostOffice?.[0]) {
                              const po = data[0].PostOffice[0];
                              setFormData(prev => ({
                                ...prev,
                                geo: {
                                  ...prev.geo,
                                  state: (po.State || '').toUpperCase(),
                                  city: (po.District || '').toUpperCase(),
                                },
                              }));
                              setErrors(prev => {
                                const copy = { ...prev };
                                delete copy.state;
                                delete copy.city;
                                return copy;
                              });
                            }
                          } catch (err) {
                            console.error('Pincode lookup failed:', err);
                          }
                        }
                      }}
                    />
                  </div>
                )}

              </div>

              {/* Address (Full Width) */}
              {isVisible('address') && (
                <div className="mt-4">
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {getLabel('address', 'Address')} {isRequired('address') && <span className="text-red-500">*</span>}
                  </label>
                  <textarea
                    value={formData.basics.address}
                    onChange={(e) => setBasicField('address', e.target.value.slice(0, getConstraint('address', 'maxLength', 150) || 150))}
                    maxLength={getConstraint('address', 'maxLength', 150) || 150}
                    rows={2}
                    className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 transition bg-slate-50/70
                    ${errors.address ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
                    placeholder="Enter complete address"
                    required={isRequired('address')}
                  />
                  {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
                </div>
              )}

              {/* State & City */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {isVisible('state') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {getLabel('state', 'State')} {isRequired('state') && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.geo.state}
                      readOnly
                      className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 transition bg-slate-50/70
                      ${errors.state ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
                      placeholder="State (auto-filled)"
                      required={isRequired('state')}
                    />
                    {errors.state && <p className="mt-1 text-xs text-red-600">{errors.state}</p>}
                  </div>
                )}

                {isVisible('city') && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                      {getLabel('city', 'City')} {isRequired('city') && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="text"
                      value={formData.geo.city}
                      readOnly
                      className={`mt-1 block w-full border rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 transition bg-slate-50/70
                      ${errors.city ? 'border-red-500 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
                      placeholder="City (auto-filled)"
                      required={isRequired('city')}
                    />
                    {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
                  </div>
                )}
              </div>
            </div>

            {/* Service Modes & Rating */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Service Mode */}
              {isVisible('serviceMode') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                    {getLabel('serviceMode', 'Service Modes')} {isRequired('serviceMode') && <span className="text-red-500">*</span>}
                  </label>
                  <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50/70 p-1 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setBasicField('serviceMode', 'FTL')}
                      className={`px-4 py-2 text-sm font-semibold rounded-md transition ${formData.basics.serviceMode === 'FTL'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-transparent text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                      FTL
                    </button>
                    <button
                      type="button"
                      onClick={() => setBasicField('serviceMode', 'LTL')}
                      className={`ml-1 px-4 py-2 text-sm font-semibold rounded-md transition ${formData.basics.serviceMode === 'LTL'
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-transparent text-slate-700 hover:bg-slate-100'
                        }`}
                    >
                      LTL
                    </button>
                  </div>
                  {errors.serviceMode && <p className="mt-1 text-xs text-red-600">{errors.serviceMode}</p>}
                </div>
              )}

              {/* Company Rating */}
              {isVisible('companyRating') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {getLabel('companyRating', 'Company Rating')} {isRequired('companyRating') && <span className="text-red-500">*</span>}
                  </label>
                  <div className="mt-2">
                    <input
                      type="range"
                      min={getConstraint('companyRating', 'min', 1) || 1}
                      max={getConstraint('companyRating', 'max', 5) || 5}
                      step={getConstraint('companyRating', 'step', 0.1) || 0.1}
                      value={formData.basics.companyRating}
                      onChange={(e) => setBasicField('companyRating', Number(e.target.value))}
                      className="w-full accent-blue-600"
                    />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-500">1.0</span>
                      <div className="flex items-center gap-2 text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-md">
                        <input
                          type="number"
                          min="1"
                          max="5"
                          step="0.1"
                          value={formData.basics.companyRating}
                          onChange={(e) => {
                            let val = parseFloat(e.target.value);
                            if (isNaN(val)) val = 0;
                            if (val > 5) val = 5;
                            // Don't clamp min to 1 here to allow typing
                            setBasicField('companyRating', val);
                          }}
                          className="w-16 bg-transparent border-b border-blue-300 focus:border-blue-600 focus:outline-none text-center"
                        />
                        <span>/ 5.0</span>
                      </div>
                      <span className="text-xs text-slate-500">5.0</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TRANSPORT & VOLUMETRIC CONFIGURATION - UNCHANGED */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              Transport & Volumetric Configuration
            </h2>

            {/* Transport Mode + Unit Toggle */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Transport Mode */}
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  {getLabel('transportMode', 'Transport Mode')} {isRequired('transportMode') && <span className="text-red-500">*</span>}
                </label>
                <select
                  value={formData.transportMode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      transportMode: e.target.value as 'road' | 'air' | 'rail' | 'ship',
                    }))
                  }
                  className="w-full border border-slate-300 rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 bg-slate-50/70 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {transportModeOptions.map((opt) => (
                    <option
                      key={opt.value}
                      value={opt.value}
                      disabled={opt.enabled === false}
                    >
                      {opt.label}{opt.enabled === false ? ' — Coming soon' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Volumetric Unit Toggle */}
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Volumetric Unit <span className="text-red-500">*</span>
                </label>
                <div className="inline-flex rounded-md shadow-sm border border-slate-300">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        volumetric: { ...prev.volumetric, unit: 'cm' },
                      }))
                    }
                    className={`px-4 py-2 text-sm font-medium rounded-l-md ${isCM
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    Centimeters (cm)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        volumetric: { ...prev.volumetric, unit: 'in' },
                      }))
                    }
                    className={`px-4 py-2 text-sm font-medium rounded-r-md border-l border-slate-300 ${!isCM
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                  >
                    Inches (in)
                  </button>
                </div>
              </div>
            </div>

            {/* SINGLE Dynamic Field (Dropdown for both) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  {volumetricLabel} <span className="text-red-500">*</span>
                </label>
                <select
                  value={volumetricSelected || ''}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setFormData((prev) => ({
                      ...prev,
                      volumetric: {
                        ...prev.volumetric,
                        ...(isCM ? { volumetricDivisor: value } : { cftFactor: value }),
                      },
                    }));
                  }}
                  className="w-full border border-slate-300 rounded-lg shadow-sm px-3 py-2 text-sm text-slate-800 bg-slate-50/70 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="" disabled>
                    Select {volumetricLabel}
                  </option>
                  {volumetricOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  {isCM
                    ? 'Volumetric weight = (L × W × H) / Divisor'
                    : 'Volumetric weight = ((L × W × H) / 1728) × CFT Factor'}
                </p>
              </div>

              {/* Helper note */}
              <div className="col-span-1">
                <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-md p-3">
                  <strong>Note:</strong> The divisor determines how much space is considered per unit of weight. This field changes based on the selected volumetric unit. When you switch units, the other value is cleared automatically to avoid ambiguity.
                </div>
              </div>
            </div>
          </div>

          {/* ⭐ BASIC CHARGES - UPDATED (Only Docket & Fuel mandatory, Fuel uses ComboInput) */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Basic Charges
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Row 1 */}
              {isVisible('docketCharges') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    {getLabel('docketCharges', 'Docket Charges')} {isRequired('docketCharges') && <span className="text-red-500">*</span>}
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={displayZeroAsBlank(formData.charges.docketCharges)}
                      onChange={(e) => {
                        const clamped = clampDecimalString(e.target.value, 0, CHARGE_MAX, 2);
                        setChargeField('docketCharges', clamped === '' ? 0 : Number(clamped));
                      }}
                      onKeyDown={(e) => BLOCKED_KEYS.has(e.key) && e.preventDefault()}
                      className="block w-full border-2 border-indigo-500 rounded-lg shadow-sm px-3 py-2 pr-6 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition bg-slate-50/70"
                      placeholder=""
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                  </div>
                </div>
              )}

              <div>
                {/* ⭐ CHANGED: Removed red asterisk */}
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Min Chargeable Weight
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={displayZeroAsBlank(formData.charges.minChargeableWeight)}
                    onChange={(e) => {
                      const clamped = clampDecimalString(e.target.value, 0, CHARGE_MAX, 2);
                      setChargeField('minChargeableWeight', clamped === '' ? 0 : Number(clamped));
                    }}
                    onKeyDown={(e) => BLOCKED_KEYS.has(e.key) && e.preventDefault()}
                    className="block w-full border-2 border-indigo-500 rounded-lg shadow-sm px-3 py-2 pr-8 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition bg-slate-50/70"
                    placeholder=""
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">KG</span>
                </div>
              </div>

              <div>
                {/* ⭐ CHANGED: Removed red asterisk */}
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Minimum Charges
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={displayZeroAsBlank(formData.charges.minimumCharges)}
                    onChange={(e) => {
                      const clamped = clampDecimalString(e.target.value, 0, CHARGE_MAX, 2);
                      setChargeField('minimumCharges', clamped === '' ? 0 : Number(clamped));
                    }}
                    onKeyDown={(e) => BLOCKED_KEYS.has(e.key) && e.preventDefault()}
                    className="block w-full border-2 border-indigo-500 rounded-lg shadow-sm px-3 py-2 pr-6 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition bg-slate-50/70"
                    placeholder=""
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                </div>
              </div>

              {/* Row 2 */}
              <div>
                {/* ⭐ CHANGED: Removed red asterisk */}
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Hamali Charges
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={displayZeroAsBlank(formData.charges.hamaliCharges)}
                    onChange={(e) => {
                      const clamped = clampDecimalString(e.target.value, 0, CHARGE_MAX, 2);
                      setChargeField('hamaliCharges', clamped === '' ? 0 : Number(clamped));
                    }}
                    onKeyDown={(e) => BLOCKED_KEYS.has(e.key) && e.preventDefault()}
                    className="block w-full border-2 border-indigo-500 rounded-lg shadow-sm px-3 py-2 pr-6 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition bg-slate-50/70"
                    placeholder=""
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                </div>
              </div>

              <div>
                {/* ⭐ CHANGED: Removed red asterisk */}
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Green Tax / NGT
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={displayZeroAsBlank(formData.charges.greenTax)}
                    onChange={(e) => {
                      const clamped = clampDecimalString(e.target.value, 0, CHARGE_MAX, 2);
                      setChargeField('greenTax', clamped === '' ? 0 : Number(clamped));
                    }}
                    onKeyDown={(e) => BLOCKED_KEYS.has(e.key) && e.preventDefault()}
                    className="block w-full border-2 border-indigo-500 rounded-lg shadow-sm px-3 py-2 pr-6 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition bg-slate-50/70"
                    placeholder=""
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                </div>
              </div>

              <div>
                {/* ⭐ CHANGED: Removed red asterisk */}
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  MISC / AOC Charges
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={displayZeroAsBlank(formData.charges.miscCharges)}
                    onChange={(e) => {
                      const clamped = clampDecimalString(e.target.value, 0, CHARGE_MAX, 2);
                      setChargeField('miscCharges', clamped === '' ? 0 : Number(clamped));
                    }}
                    onKeyDown={(e) => BLOCKED_KEYS.has(e.key) && e.preventDefault()}
                    className="block w-full border-2 border-indigo-500 rounded-lg shadow-sm px-3 py-2 pr-6 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition bg-slate-50/70"
                    placeholder=""
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                </div>
              </div>

              {/* Row 3 */}
              <div>
                {/* ⭐ CHANGED: Now uses ComboInput instead of dropdown/custom toggle */}
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                  Fuel Surcharge <span className="text-red-500">*</span>
                </label>
                <ComboInput
                  value={formData.charges.fuelSurchargePct}
                  options={FUEL_SURCHARGE_OPTIONS}
                  onChange={handleFuelSurchargeChange}
                  onBlur={handleFuelSurchargeBlur}
                  placeholder="Select or type 0-50"
                  suffix="%"
                  maxLength={2}
                  inputMode="numeric"
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
                <p className="text-xs text-slate-500 mt-1">Max allowed is 50%</p>
              </div>

              <div>
                {/* ⭐ CHANGED: Removed red asterisk */}
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  DACC Charges
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={displayZeroAsBlank(formData.charges.daccCharges)}
                    onChange={(e) => {
                      const clamped = clampDecimalString(e.target.value, 0, CHARGE_MAX, 2);
                      setChargeField('daccCharges', clamped === '' ? 0 : Number(clamped));
                    }}
                    onKeyDown={(e) => BLOCKED_KEYS.has(e.key) && e.preventDefault()}
                    className="block w-full border-2 border-indigo-500 rounded-lg shadow-sm px-3 py-2 pr-6 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition bg-slate-50/70"
                    placeholder=""
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                </div>
              </div>
            </div>

            {/* Divider - UNCHANGED */}
            <div className="relative flex items-center my-6">
              <div className="flex-grow border-t border-slate-300"></div>
              <span className="flex-shrink mx-4 text-sm font-medium text-slate-600">
                Handling & Additional Charges
              </span>
              <div className="flex-grow border-t border-slate-300"></div>
            </div>

            {/* ⭐ Charge Cards - Now use updated CompactChargeCardEdit with ComboInput */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {isVisible('handlingCharges') && (
                <CompactChargeCardEdit
                  title={getLabel('handlingCharges', 'Handling')}
                  data={formData.charges.handlingCharges}
                  onChange={(field, value) => setCardField('handlingCharges', field, value)}
                  showWeightThreshold={true}
                  showUnitSelector={true}
                />
              )}
              {isVisible('rovCharges') && (
                <CompactChargeCardEdit
                  title={getLabel('rovCharges', 'ROV / FOV')}
                  data={formData.charges.rovCharges}
                  onChange={(field, value) => setCardField('rovCharges', field, value)}
                />
              )}
              {isVisible('codCharges') && (
                <CompactChargeCardEdit
                  title={getLabel('codCharges', 'COD / DOD')}
                  data={formData.charges.codCharges}
                  onChange={(field, value) => setCardField('codCharges', field, value)}
                />
              )}
              {isVisible('toPayCharges') && (
                <CompactChargeCardEdit
                  title={getLabel('toPayCharges', 'To-Pay')}
                  data={formData.charges.toPayCharges}
                  onChange={(field, value) => setCardField('toPayCharges', field, value)}
                />
              )}
              {isVisible('appointmentCharges') && (
                <CompactChargeCardEdit
                  title={getLabel('appointmentCharges', 'Appointment')}
                  data={formData.charges.appointmentCharges}
                  onChange={(field, value) => setCardField('appointmentCharges', field, value)}
                />
              )}
            </div>
          </div>

          {/* Footer - UNCHANGED */}
          <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex gap-3 rounded-b-lg mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVendorModal;