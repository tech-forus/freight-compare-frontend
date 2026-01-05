import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, AlertCircle, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePincodes } from "../context/PincodeContext";

interface PincodeSuggestion {
  pincode: string;
  city: string;
  state: string;
  district: string;
}

interface PincodeAutocompleteProps {
  label: string;
  id: string;
  value: string;
  placeholder: string;
  error?: string | null; // external page-level error (e.g. equality)
  onChange: (value: string) => void;
  onBlur?: () => void;
  onSelect?: (suggestion: PincodeSuggestion) => void;
  onValidationChange?: (isValid: boolean) => void;
  className?: string;
}

const PincodeAutocomplete: React.FC<PincodeAutocompleteProps> = ({
  label,
  id,
  value,
  placeholder,
  error,
  onChange,
  onBlur,
  onSelect,
  onValidationChange,
  className = '',
}) => {
  const { ready, search, getByPincode } = usePincodes();

  const [suggestions, setSuggestions] = useState<PincodeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // UX helpers
  const [lastValidValue, setLastValidValue] = useState('');
  const [hasAttemptedSelection, setHasAttemptedSelection] = useState(false);
  const [isUserSelected, setIsUserSelected] = useState(false);
  const [touched, setTouched] = useState(false); // <-- NEW: gate error UI

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<number | null>(null);

  // ---------- search ----------
  const fetchSuggestions = useCallback(
    (query: string) => {
      if (!ready || query.length < 3) {
        setSuggestions([]);
        return;
      }
      setIsLoading(true);
      const rows = search(query, 20);
      const mapped: PincodeSuggestion[] = rows.map(r => ({
        pincode: r.pincode,
        city: r.city,
        state: r.state,
        district: r.city,
      }));
      setSuggestions(mapped);
      setIsLoading(false);
    },
    [ready, search]
  );

  const debouncedSearch = useCallback((query: string) => {
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    debounceTimeoutRef.current = window.setTimeout(() => {
      fetchSuggestions(query);
    }, 250);
  }, [fetchSuggestions]);

  // ---------- handlers ----------
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 6);
    onChange(digitsOnly);
    setTouched(true);                 // mark interacted
    setHasAttemptedSelection(false);
    setIsUserSelected(false);

    if (digitsOnly.length >= 3) {
      setIsOpen(true);
      debouncedSearch(digitsOnly);
    } else {
      setIsOpen(false);
      setSuggestions([]);
    }
    setSelectedIndex(-1);

    // Auto-validate and select when 6 digits are entered
    if (digitsOnly.length === 6 && /^[1-9]\d{5}$/.test(digitsOnly)) {
      const exists = getByPincode(digitsOnly);
      if (exists) {
        setIsUserSelected(true);
        setLastValidValue(digitsOnly);
        setTimeout(() => {
          setIsOpen(false);
        }, 100);
      }
    }
  };

  const handleFocus = () => {
    if (value.length >= 3 && suggestions.length > 0) setIsOpen(true);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      setSelectedIndex(-1);

      if (value.length >= 3) setHasAttemptedSelection(true);

      // Just update last valid value if current is valid, but DON'T revert
      if (value && /^[1-9]\d{5}$/.test(value)) {
        const exists = getByPincode(value);
        if (exists) {
          setLastValidValue(value);
        }
      }

      setTouched(true);               // mark interacted on blur as well
      onBlur?.();
    }, 150);
  };

  const handleSuggestionSelect = (suggestion: PincodeSuggestion) => {
    onChange(suggestion.pincode);
    setLastValidValue(suggestion.pincode);
    setHasAttemptedSelection(false);
    setIsUserSelected(true);
    setTouched(true);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelect?.(suggestion);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      // If not open but user presses Enter with 6 valid digits, validate and select
      if (e.key === 'Enter' && value.length === 6 && /^[1-9]\d{5}$/.test(value)) {
        const exists = getByPincode(value);
        if (exists) {
          setIsUserSelected(true);
          setLastValidValue(value);
          setIsOpen(false);
          inputRef.current?.blur();
        }
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => prev < suggestions.length - 1 ? prev + 1 : prev);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        } else if (value.length === 6 && /^[1-9]\d{5}$/.test(value)) {
          // If no suggestion selected but 6 valid digits, validate and select
          const exists = getByPincode(value);
          if (exists) {
            setIsUserSelected(true);
            setLastValidValue(value);
            setIsOpen(false);
            inputRef.current?.blur();
          }
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // ---------- validation logic (unchanged) ----------
  const validatePincode = (pin: string): string | null => {
    if (!pin) return 'Pincode is required.';
    if (!/^\d{6}$/.test(pin)) return 'Enter a 6-digit pincode.';
    if (!/^[1-9]\d{5}$/.test(pin)) return 'Pincode cannot start with 0.';
    return null;
  };

  const isValidFormat = value && /^[1-9]\d{5}$/.test(value);
  const formatError = validatePincode(value); // computed, but we'll **not show** until touched

  const pincodeExists = value.length === 6 && !!getByPincode(value);

  const isInvalidPincode =
    hasAttemptedSelection &&
    value.length === 6 &&
    !pincodeExists &&
    !formatError &&
    !isUserSelected;

  const isPincodeValid =
    Boolean(isValidFormat) &&
    !formatError &&
    (isUserSelected || pincodeExists || !hasAttemptedSelection);

  // Bubble validity up
  useEffect(() => {
    onValidationChange?.(Boolean(isPincodeValid));
  }, [isPincodeValid, onValidationChange]);

  // cleanup
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
    };
  }, []);

  // close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ----------- UI gates -----------
  const shouldShowError = touched; // ⬅️ this is the "pause" before showing errors

  const inputHasErrorUI =
    shouldShowError && (Boolean(error) || Boolean(formatError) || isInvalidPincode);

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-600 mb-1.5">
          {label}
        </label>
      )}

      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400">
            <MapPin />
          </div>

          <input
            ref={inputRef}
            id={id}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            maxLength={6}
            inputMode="numeric"
            pattern="[1-9]\d{5}"
            autoComplete="off"
            aria-invalid={inputHasErrorUI}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            className={`block w-full py-2 pl-10 pr-10 bg-white border rounded-lg text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 transition ${
              inputHasErrorUI
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : (isPincodeValid && isUserSelected)
                ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'
            }`}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : (isPincodeValid && isUserSelected) ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : inputHasErrorUI ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : null}
          </div>
        </div>

        {/* Dropdown */}
        <AnimatePresence>
          {isOpen && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
              style={{ zIndex: 9999 }}
              role="listbox"
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.pincode}-${index}`}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${
                    index === selectedIndex
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{suggestion.pincode}</div>
                      <div className="text-xs text-slate-500">
                        {suggestion.city}, {suggestion.district}, {suggestion.state}
                      </div>
                    </div>
                    <MapPin className="h-4 w-4 text-slate-400" />
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* No suggestions */}
        <AnimatePresence>
          {isOpen && !isLoading && suggestions.length === 0 && value.length >= 3 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-4 text-center"
            >
              <div className="text-sm text-slate-500">
                No pincodes found for "{value}"
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Message rows respect the touched gate */}
      {shouldShowError && (error || validatePincode(value)) && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle size={14} />
          {error || validatePincode(value)}
        </p>
      )}

      {shouldShowError && isInvalidPincode && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle size={14} />
          Pincode does not exist. Please select a valid pincode from the list.
        </p>
      )}

      {/* Optional hint when typing but not a valid 6-digit yet – hidden until touched */}
      {shouldShowError && value && !isValidFormat && !isInvalidPincode && !validatePincode(value) && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle size={14} />
          Please select a valid Indian pincode from the list.
        </p>
      )}
    </div>
  );
};

export default PincodeAutocomplete;