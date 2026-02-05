import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, AlertCircle, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePincodes } from '../../context/PincodeContext';

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
  error?: string | null;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onSelect?: (suggestion: PincodeSuggestion) => void;
  onValidationChange?: (isValid: boolean) => void;
  className?: string;
}

/**
 * PincodeAutocomplete Component
 * 
 * ARCHITECTURE (Industry Standard):
 * - LOCAL pincodes.json is the SINGLE SOURCE OF TRUTH for validation
 * - External API (postalpincode.in) is used ONLY for enhanced city/district info
 * - If external API fails or doesn't recognize a pincode, we still accept it if it exists locally
 * - This ensures 100% of our serviceable pincodes work, regardless of external API gaps
 */
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
  // ✅ LOCAL DATA SOURCE - This is the source of truth
  const { getByPincode, search, ready: pincodeDataReady } = usePincodes();

  const [suggestions, setSuggestions] = useState<PincodeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isUserSelected, setIsUserSelected] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const selectedPincodeRef = useRef<string | null>(null);

  /**
   * Fetch suggestions using a hybrid approach:
   * 1. First, get results from LOCAL pincodes.json (fast, reliable)
   * 2. Optionally enhance with external API for city/district names
   * 3. Local data always takes precedence
   */
  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3 || !pincodeDataReady) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);

    try {
      // ✅ STEP 1: Get suggestions from LOCAL data (source of truth)
      const localResults = search(query, 20);

      // Convert local results to suggestion format
      const localSuggestions: PincodeSuggestion[] = localResults.map(row => ({
        pincode: String(row.pincode),
        city: row.city || '',
        state: row.state || '',
        district: (row as any).district || row.city || '',
      }));

      // If we have exact pincode match in local, use that immediately
      if (query.length === 6 && /^\d{6}$/.test(query)) {
        const exactMatch = getByPincode(query);
        if (exactMatch) {
          // For exact 6-digit match, show just that pincode
          setSuggestions([{
            pincode: String(exactMatch.pincode),
            city: exactMatch.city || '',
            state: exactMatch.state || '',
            district: (exactMatch as any).district || exactMatch.city || '',
          }]);
          setIsLoading(false);
          return;
        }
      }

      // ✅ STEP 2: Try to enhance with external API (nice-to-have, not blocking)
      // Only for exact 6-digit pincodes to get better city/district names
      if (query.length === 6 && /^\d{6}$/.test(query)) {
        // Cancel previous request
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
          const response = await fetch(
            `https://api.postalpincode.in/pincode/${query}`,
            {
              signal: abortControllerRef.current.signal,
            }
          );

          if (response.ok) {
            const data = await response.json();

            if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice) {
              // External API has data - merge with local
              const apiSuggestions = data[0].PostOffice
                .map((office: any) => ({
                  pincode: office.Pincode,
                  city: office.Name,
                  state: office.State,
                  district: office.District,
                }))
                .filter((s: PincodeSuggestion, i: number, self: PincodeSuggestion[]) =>
                  i === self.findIndex(x => x.pincode === s.pincode)
                );

              setSuggestions(apiSuggestions);
              setIsLoading(false);
              return;
            }
          }
        } catch (apiError) {
          // External API failed - that's OK, we'll use local data
          console.log('External API unavailable, using local data');
        }
      }

      // ✅ STEP 3: Use local suggestions (fallback or primary)
      // Remove duplicates and limit
      const uniqueSuggestions = localSuggestions.filter(
        (s, i, self) => i === self.findIndex(x => x.pincode === s.pincode)
      ).slice(0, 10);

      setSuggestions(uniqueSuggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [pincodeDataReady, search, getByPincode]);

  // Debounced search
  const debouncedSearch = useCallback((query: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, 150); // Faster debounce since local data is instant
  }, [fetchSuggestions]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const digitsOnly = inputValue.replace(/\D/g, '').slice(0, 6);

    selectedPincodeRef.current = null;
    onChange(digitsOnly);
    setIsUserSelected(false);

    if (digitsOnly.length >= 3) {
      setIsOpen(true);
      debouncedSearch(digitsOnly);
    } else {
      setIsOpen(false);
      setSuggestions([]);
    }

    setSelectedIndex(-1);
  };

  // Handle input focus
  const handleFocus = () => {
    if (value.length >= 3 && suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  // Handle input blur
  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      setSelectedIndex(-1);
      onBlur?.();
    }, 150);
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: PincodeSuggestion) => {
    selectedPincodeRef.current = suggestion.pincode;
    onChange(suggestion.pincode);
    setIsUserSelected(true);
    setIsOpen(false);
    setSelectedIndex(-1);
    onSelect?.(suggestion);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  /**
   * ✅ VALIDATION LOGIC - Uses LOCAL data as source of truth
   * A pincode is valid if:
   * 1. It's a proper 6-digit format starting with 1-9
   * 2. AND it exists in our LOCAL pincodes.json
   * 
   * We DON'T care if the external API recognizes it or not!
   */
  const validatePincode = (pin: string): { isValid: boolean; error: string | null } => {
    if (!pin) {
      return { isValid: false, error: 'Pincode is required.' };
    }
    if (!/^\d{6}$/.test(pin)) {
      return { isValid: false, error: 'Enter a 6-digit pincode.' };
    }
    if (!/^[1-9]\d{5}$/.test(pin)) {
      return { isValid: false, error: 'Pincode cannot start with 0.' };
    }

    // ✅ SOURCE OF TRUTH: Check LOCAL data
    if (pincodeDataReady) {
      const localData = getByPincode(pin);
      if (!localData) {
        return { isValid: false, error: 'This pincode is not in our serviceable area.' };
      }
    }

    return { isValid: true, error: null };
  };

  // Compute validation state
  const validation = validatePincode(value);
  const isValid = validation.isValid;
  const formatError = validation.error;

  // A pincode is confirmed valid if it's valid AND (user selected it OR it's a complete 6-digit local pincode)
  const wasSelectedFromDropdown = selectedPincodeRef.current === value && value.length === 6;
  const isLocallyValid = value.length === 6 && pincodeDataReady && !!getByPincode(value);
  const isPincodeConfirmed = isValid && (wasSelectedFromDropdown || isUserSelected || isLocallyValid);

  // Notify parent about validation changes
  useEffect(() => {
    onValidationChange?.(isPincodeConfirmed);
  }, [isPincodeConfirmed, onValidationChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Close dropdown when clicking outside
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

  // Determine display state
  const showError = error || (formatError && value.length > 0 && !selectedPincodeRef.current);
  const showSuccess = isPincodeConfirmed && !showError;

  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-slate-600 mb-1.5"
        >
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
            aria-invalid={!!showError}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            className={`block w-full py-2 pl-10 pr-10 bg-white border rounded-lg text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 transition ${showError
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                : showSuccess
                  ? 'border-green-500 focus:border-green-500 focus:ring-green-500'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-indigo-500'
              }`}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : showSuccess ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : showError ? (
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
                  key={`${suggestion.pincode}-${suggestion.city}`}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  className={`px-4 py-3 cursor-pointer transition-colors ${index === selectedIndex
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        {suggestion.pincode}
                      </div>
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

        {/* No suggestions message - only show if external API failed AND local has no results */}
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

      {/* Error message */}
      {showError && (
        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
          <AlertCircle size={14} />
          {error || formatError}
        </p>
      )}
    </div>
  );
};

export default PincodeAutocomplete;