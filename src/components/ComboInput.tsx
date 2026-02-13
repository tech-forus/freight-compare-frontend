// // // // src/components/ComboInput.tsx
// // // /**
// // //  * ComboInput - A hybrid input field with dropdown functionality
// // //  * Allows users to either type directly or select from dropdown options
// // //  * Features smooth dropdown arrow integration
// // //  */

// // // import React, { useState, useRef, useEffect } from 'react';
// // // import { ChevronDownIcon } from '@heroicons/react/24/outline';

// // // interface ComboInputProps {
// // //   value: string | number;
// // //   options: readonly number[];
// // //   onChange: (value: string) => void;
// // //   onBlur: () => void;
// // //   placeholder?: string;
// // //   suffix?: string;
// // //   maxLength?: number;
// // //   className?: string;
// // //   error?: string;
// // //   inputMode?: 'text' | 'numeric' | 'decimal';
// // //   onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
// // //   onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
// // //   formatOption?: (value: number) => string; // Custom format for dropdown options
// // //   disabled?: boolean;
// // // }

// // // export const ComboInput: React.FC<ComboInputProps> = ({
// // //   value,
// // //   options,
// // //   onChange,
// // //   onBlur,
// // //   placeholder = '',
// // //   suffix = '%',
// // //   maxLength,
// // //   className = '',
// // //   error,
// // //   inputMode = 'decimal',
// // //   onKeyDown,
// // //   onPaste,
// // //   formatOption = (val) => `${val}${suffix}`,
// // //   disabled = false,
// // // }) => {
// // //   const [isOpen, setIsOpen] = useState(false);
// // //   const [highlightedIndex, setHighlightedIndex] = useState(-1);
// // //   const dropdownRef = useRef<HTMLDivElement>(null);
// // //   const inputRef = useRef<HTMLInputElement>(null);

// // //   // Close dropdown when clicking outside
// // //   useEffect(() => {
// // //     const handleClickOutside = (event: MouseEvent) => {
// // //       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
// // //         setIsOpen(false);
// // //         setHighlightedIndex(-1);
// // //       }
// // //     };

// // //     const handleEscape = (event: KeyboardEvent) => {
// // //       if (event.key === 'Escape') {
// // //         setIsOpen(false);
// // //         setHighlightedIndex(-1);
// // //       }
// // //     };

// // //     if (isOpen) {
// // //       document.addEventListener('mousedown', handleClickOutside);
// // //       document.addEventListener('keydown', handleEscape);
// // //     }

// // //     return () => {
// // //       document.removeEventListener('mousedown', handleClickOutside);
// // //       document.removeEventListener('keydown', handleEscape);
// // //     };
// // //   }, [isOpen]);

// // //   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
// // //     onChange(e.target.value);
// // //   };

// // //   const handleInputBlur = () => {
// // //     // Delay to allow dropdown click to register
// // //     setTimeout(() => {
// // //       if (!isOpen) {
// // //         onBlur();
// // //       }
// // //     }, 150);
// // //   };

// // //   const handleOptionSelect = (option: number) => {
// // //     onChange(String(option));
// // //     setIsOpen(false);
// // //     setHighlightedIndex(-1);
// // //     onBlur();
// // //     inputRef.current?.focus();
// // //   };

// // //   const toggleDropdown = () => {
// // //     if (!disabled) {
// // //       setIsOpen(!isOpen);
// // //       setHighlightedIndex(-1);
// // //     }
// // //   };

// // //   const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
// // //     if (onKeyDown) {
// // //       onKeyDown(e);
// // //     }

// // //     // Arrow down opens dropdown
// // //     if (e.key === 'ArrowDown' && !isOpen) {
// // //       e.preventDefault();
// // //       setIsOpen(true);
// // //       setHighlightedIndex(0);
// // //     }

// // //     // Navigate dropdown with arrow keys when open
// // //     if (isOpen) {
// // //       if (e.key === 'ArrowDown') {
// // //         e.preventDefault();
// // //         setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
// // //       } else if (e.key === 'ArrowUp') {
// // //         e.preventDefault();
// // //         setHighlightedIndex((prev) => Math.max(prev - 1, 0));
// // //       } else if (e.key === 'Enter' && highlightedIndex >= 0) {
// // //         e.preventDefault();
// // //         handleOptionSelect(options[highlightedIndex]);
// // //       }
// // //     }
// // //   };

// // //   const displayValue = value === 0 || value === '0' || value === null || value === undefined ? '' : String(value);

// // //   return (
// // //     <div className="relative" ref={dropdownRef}>
// // //       <div className="relative">
// // //         <input
// // //           ref={inputRef}
// // //           type="text"
// // //           value={displayValue}
// // //           onChange={handleInputChange}
// // //           onBlur={handleInputBlur}
// // //           onKeyDown={handleInputKeyDown}
// // //           onPaste={onPaste}
// // //           inputMode={inputMode}
// // //           maxLength={maxLength}
// // //           placeholder={placeholder}
// // //           disabled={disabled}
// // //           className={`block w-full border-2 rounded-lg shadow-sm pl-3 pr-16 py-2 text-sm text-slate-800 placeholder-slate-400
// // //                      focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition bg-slate-50/70
// // //                      ${error ? 'border-red-500 focus:border-red-600' : 'border-indigo-500 focus:border-indigo-600'}
// // //                      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
// // //                      ${className}`}
// // //         />

// // //         {/* Suffix (%, ₹, KG, etc.) */}
// // //         {suffix && (
// // //           <span className="absolute right-10 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
// // //             {suffix}
// // //           </span>
// // //         )}

// // //         {/* Dropdown toggle button */}
// // //         <button
// // //           type="button"
// // //           onClick={toggleDropdown}
// // //           disabled={disabled}
// // //           className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 transition-colors
// // //                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
// // //                      ${isOpen ? 'bg-slate-100' : ''}`}
// // //           tabIndex={-1}
// // //         >
// // //           <ChevronDownIcon 
// // //             className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
// // //           />
// // //         </button>
// // //       </div>

// // //       {/* Dropdown menu */}
// // //       {isOpen && (
// // //         <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
// // //           {options.map((option, index) => (
// // //             <button
// // //               key={option}
// // //               type="button"
// // //               onClick={() => handleOptionSelect(option)}
// // //               onMouseEnter={() => setHighlightedIndex(index)}
// // //               className={`w-full text-left px-4 py-2 text-sm transition-colors
// // //                          ${highlightedIndex === index ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}
// // //                          ${index === 0 ? 'rounded-t-lg' : ''}
// // //                          ${index === options.length - 1 ? 'rounded-b-lg' : ''}`}
// // //             >
// // //               {formatOption(option)}
// // //             </button>
// // //           ))}
// // //         </div>
// // //       )}

// // //       {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
// // //     </div>
// // //   );
// // // };

// // // export default ComboInput;

// // // src/components/ComboInput.tsx
// // /**
// //  * ComboInput - A hybrid input field with dropdown functionality
// //  * Allows users to either type directly or select from dropdown options
// //  * Features smooth dropdown arrow integration
// //  */

// // import React, { useState, useRef, useEffect } from 'react';
// // import { ChevronDownIcon } from '@heroicons/react/24/outline';

// // interface ComboInputProps {
// //   value: string | number;
// //   options: readonly number[];
// //   onChange: (value: string) => void;
// //   onBlur: () => void;
// //   placeholder?: string;
// //   suffix?: string;
// //   maxLength?: number;
// //   className?: string;
// //   error?: string;
// //   inputMode?: 'text' | 'numeric' | 'decimal';
// //   onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
// //   onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
// //   formatOption?: (value: number) => string; // Custom format for dropdown options
// //   disabled?: boolean;
// // }

// // export const ComboInput: React.FC<ComboInputProps> = ({
// //   value,
// //   options,
// //   onChange,
// //   onBlur,
// //   placeholder = '',
// //   suffix = '%',
// //   maxLength,
// //   className = '',
// //   error,
// //   inputMode = 'decimal',
// //   onKeyDown,
// //   onPaste,
// //   formatOption = (val) => `${val}${suffix}`,
// //   disabled = false,
// // }) => {
// //   const [isOpen, setIsOpen] = useState(false);
// //   const [highlightedIndex, setHighlightedIndex] = useState(-1);
// //   const dropdownRef = useRef<HTMLDivElement>(null);
// //   const inputRef = useRef<HTMLInputElement>(null);

// //   // Close dropdown when clicking outside
// //   useEffect(() => {
// //     const handleClickOutside = (event: MouseEvent) => {
// //       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
// //         setIsOpen(false);
// //         setHighlightedIndex(-1);
// //       }
// //     };

// //     const handleEscape = (event: KeyboardEvent) => {
// //       if (event.key === 'Escape') {
// //         setIsOpen(false);
// //         setHighlightedIndex(-1);
// //       }
// //     };

// //     if (isOpen) {
// //       document.addEventListener('mousedown', handleClickOutside);
// //       document.addEventListener('keydown', handleEscape);
// //     }

// //     return () => {
// //       document.removeEventListener('mousedown', handleClickOutside);
// //       document.removeEventListener('keydown', handleEscape);
// //     };
// //   }, [isOpen]);

// //   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
// //     onChange(e.target.value);
// //   };

// //   const handleInputBlur = () => {
// //     // Delay to allow dropdown click to register
// //     setTimeout(() => {
// //       if (!isOpen) {
// //         onBlur();
// //       }
// //     }, 150);
// //   };

// //   const handleOptionSelect = (option: number) => {
// //     onChange(String(option));
// //     setIsOpen(false);
// //     setHighlightedIndex(-1);
// //     onBlur();
// //     inputRef.current?.focus();
// //   };

// //   const toggleDropdown = () => {
// //     if (!disabled) {
// //       setIsOpen(!isOpen);
// //       setHighlightedIndex(-1);
// //     }
// //   };

// //   const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
// //     if (onKeyDown) {
// //       onKeyDown(e);
// //     }

// //     // Arrow down opens dropdown
// //     if (e.key === 'ArrowDown' && !isOpen) {
// //       e.preventDefault();
// //       setIsOpen(true);
// //       setHighlightedIndex(0);
// //     }

// //     // Navigate dropdown with arrow keys when open
// //     if (isOpen) {
// //       if (e.key === 'ArrowDown') {
// //         e.preventDefault();
// //         setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
// //       } else if (e.key === 'ArrowUp') {
// //         e.preventDefault();
// //         setHighlightedIndex((prev) => Math.max(prev - 1, 0));
// //       } else if (e.key === 'Enter' && highlightedIndex >= 0) {
// //         e.preventDefault();
// //         handleOptionSelect(options[highlightedIndex]);
// //       }
// //     }
// //   };

// //   const displayValue = value === 0 || value === '0' || value === null || value === undefined ? '' : String(value);

// //   return (
// //     <div className="relative" ref={dropdownRef}>
// //       <div className="relative">
// //         <input
// //           ref={inputRef}
// //           type="text"
// //           value={displayValue}
// //           onChange={handleInputChange}
// //           onBlur={handleInputBlur}
// //           onKeyDown={handleInputKeyDown}
// //           onPaste={onPaste}
// //           inputMode={inputMode}
// //           maxLength={maxLength}
// //           placeholder={placeholder}
// //           disabled={disabled}
// //           className={`block w-full border-2 rounded-lg shadow-sm pl-3 pr-16 py-2 text-sm text-slate-800 placeholder-slate-400
// //                      focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition bg-slate-50/70
// //                      ${error ? 'border-red-500 focus:border-red-600' : 'border-indigo-500 focus:border-indigo-600'}
// //                      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
// //                      ${className}`}
// //         />

// //         {/* Suffix (%, ₹, KG, etc.) */}
// //         {suffix && (
// //           <span className="absolute right-10 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
// //             {suffix}
// //           </span>
// //         )}

// //         {/* Dropdown toggle button */}
// //         <button
// //           type="button"
// //           onClick={toggleDropdown}
// //           disabled={disabled}
// //           className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 transition-colors
// //                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
// //                      ${isOpen ? 'bg-slate-100' : ''}`}
// //           tabIndex={-1}
// //         >
// //           <ChevronDownIcon 
// //             className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
// //           />
// //         </button>
// //       </div>

// //       {/* Dropdown menu */}
// //       {isOpen && (
// //         <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
// //           {options.map((option, index) => (
// //             <button
// //               key={option}
// //               type="button"
// //               onClick={() => handleOptionSelect(option)}
// //               onMouseEnter={() => setHighlightedIndex(index)}
// //               className={`w-full text-left px-4 py-2 text-sm transition-colors
// //                          ${highlightedIndex === index ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}
// //                          ${index === 0 ? 'rounded-t-lg' : ''}
// //                          ${index === options.length - 1 ? 'rounded-b-lg' : ''}`}
// //             >
// //               {formatOption(option)}
// //             </button>
// //           ))}
// //         </div>
// //       )}

// //       {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
// //     </div>
// //   );
// // };

// // export default ComboInput;



// import React, { useState, useRef, useEffect } from 'react';
// import { ChevronDownIcon } from '@heroicons/react/24/outline';

// interface ComboInputProps {
//   value: string | number;
//   options: readonly number[];
//   onChange: (value: string) => void;
//   onBlur: () => void;
//   placeholder?: string;
//   suffix?: string;
//   maxLength?: number;
//   className?: string;
//   error?: string;
//   inputMode?: 'text' | 'numeric' | 'decimal';
//   onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
//   onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
//   formatOption?: (value: number) => string; // Custom format for dropdown options
//   disabled?: boolean;
// }

// export const ComboInput: React.FC<ComboInputProps> = ({
//   value,
//   options,
//   onChange,
//   onBlur,
//   placeholder = '',
//   suffix = '%',
//   maxLength,
//   className = '',
//   error,
//   inputMode = 'decimal',
//   onKeyDown,
//   onPaste,
//   formatOption = (val) => `${val}${suffix}`,
//   disabled = false,
// }) => {
//   const [isOpen, setIsOpen] = useState(false);
//   const [highlightedIndex, setHighlightedIndex] = useState(-1);
//   const dropdownRef = useRef<HTMLDivElement>(null);
//   const inputRef = useRef<HTMLInputElement>(null);

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
//         setIsOpen(false);
//         setHighlightedIndex(-1);
//       }
//     };

//     const handleEscape = (event: KeyboardEvent) => {
//       if (event.key === 'Escape') {
//         setIsOpen(false);
//         setHighlightedIndex(-1);
//       }
//     };

//     if (isOpen) {
//       document.addEventListener('mousedown', handleClickOutside);
//       document.addEventListener('keydown', handleEscape);
//     }

//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//       document.removeEventListener('keydown', handleEscape);
//     };
//   }, [isOpen]);

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     onChange(e.target.value);
//   };

//   const handleInputBlur = () => {
//     // Delay to allow dropdown click to register
//     setTimeout(() => {
//       if (!isOpen) {
//         onBlur();
//       }
//     }, 150);
//   };

//   const handleOptionSelect = (option: number) => {
//     onChange(String(option));
//     setIsOpen(false);
//     setHighlightedIndex(-1);

//     // ✅ FIX: Delay onBlur to allow onChange state update to complete
//     // This fixes the race condition where blur handler fires before onChange completes
//     setTimeout(() => {
//       onBlur();
//     }, 50);

//     inputRef.current?.focus();
//   };

//   const toggleDropdown = () => {
//     if (!disabled) {
//       setIsOpen(!isOpen);
//       setHighlightedIndex(-1);
//     }
//   };

//   const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (onKeyDown) {
//       onKeyDown(e);
//     }

//     // Arrow down opens dropdown
//     if (e.key === 'ArrowDown' && !isOpen) {
//       e.preventDefault();
//       setIsOpen(true);
//       setHighlightedIndex(0);
//     }

//     // Navigate dropdown with arrow keys when open
//     if (isOpen) {
//       if (e.key === 'ArrowDown') {
//         e.preventDefault();
//         setHighlightedIndex((prev) => Math.min(prev + 1, options.length - 1));
//       } else if (e.key === 'ArrowUp') {
//         e.preventDefault();
//         setHighlightedIndex((prev) => Math.max(prev - 1, 0));
//       } else if (e.key === 'Enter' && highlightedIndex >= 0) {
//         e.preventDefault();
//         handleOptionSelect(options[highlightedIndex]);
//       }
//     }
//   };

//   const displayValue = value === 0 || value === '0' || value === null || value === undefined ? '' : String(value);

//   return (
//     <div className="relative" ref={dropdownRef}>
//       <div className="relative">
//         <input
//           ref={inputRef}
//           type="text"
//           value={displayValue}
//           onChange={handleInputChange}
//           onBlur={handleInputBlur}
//           onKeyDown={handleInputKeyDown}
//           onPaste={onPaste}
//           inputMode={inputMode}
//           maxLength={maxLength}
//           placeholder={placeholder}
//           disabled={disabled}
//           className={`block w-full border-2 rounded-lg shadow-sm pl-3 pr-16 py-2 text-sm text-slate-800 placeholder-slate-400
//                      focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition bg-slate-50/70
//                      ${error ? 'border-red-500 focus:border-red-600' : 'border-indigo-500 focus:border-indigo-600'}
//                      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
//                      ${className}`}
//         />

//         {/* Suffix (%, ₹, KG, etc.) */}
//         {suffix && (
//           <span className="absolute right-10 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
//             {suffix}
//           </span>
//         )}

//         {/* Dropdown toggle button */}
//         <button
//           type="button"
//           onClick={toggleDropdown}
//           disabled={disabled}
//           className={`absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-slate-100 transition-colors
//                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
//                      ${isOpen ? 'bg-slate-100' : ''}`}
//           tabIndex={-1}
//         >
//           <ChevronDownIcon 
//             className={`w-4 h-4 text-slate-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
//           />
//         </button>
//       </div>

//       {/* Dropdown menu */}
//       {isOpen && (
//         <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
//           {options.map((option, index) => (
//             <button
//               key={option}
//               type="button"
//               onClick={() => handleOptionSelect(option)}
//               onMouseEnter={() => setHighlightedIndex(index)}
//               className={`w-full text-left px-4 py-2 text-sm transition-colors
//                          ${highlightedIndex === index ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}
//                          ${index === 0 ? 'rounded-t-lg' : ''}
//                          ${index === options.length - 1 ? 'rounded-b-lg' : ''}`}
//             >
//               {formatOption(option)}
//             </button>
//           ))}
//         </div>
//       )}

//       {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
//     </div>
//   );
// };

// export default ComboInput;


import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

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
  formatOption?: (value: number) => string; // Custom format for dropdown options
  disabled?: boolean;
}

export const ComboInput: React.FC<ComboInputProps> = ({
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

  // Close dropdown when clicking outside
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
    // Delay to allow dropdown click to register
    setTimeout(() => {
      if (!isOpen) {
        onBlur();
      }
    }, 150);
  };

  const handleOptionSelect = (option: number) => {
    onChange(String(option));
    setIsOpen(false);
    setHighlightedIndex(-1);

    // ✅ FIX: Don't call onBlur here - causes race condition
    // onBlur will fire naturally when input loses focus or via handleInputBlur
    // This gives React time to update state before validation

    inputRef.current?.focus();

    // ✅ FIX: Trigger blur after a delay to ensure state has updated
    // This mimics natural blur behavior but with proper timing
    setTimeout(() => {
      inputRef.current?.blur();
    }, 100);
  };

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setHighlightedIndex(-1);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (onKeyDown) {
      onKeyDown(e);
    }

    // Arrow down opens dropdown
    if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(0);
    }

    // Navigate dropdown with arrow keys when open
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
          className={`block w-full border border-slate-300 rounded-md shadow-sm pl-3 pr-16 py-1.5 text-sm text-slate-700 placeholder-slate-400
                     focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition bg-white
                     ${error ? 'border-red-500 focus:border-red-600' : 'border-slate-300'}
                     ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                     ${className}`}
        />

        {/* Suffix (%, ₹, KG, etc.) */}
        {suffix && (
          <span className="absolute right-10 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none">
            {suffix}
          </span>
        )}

        {/* Dropdown toggle button */}
        <button
          type="button"
          onClick={toggleDropdown}
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

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.map((option, index) => (
            <button
              key={option}
              type="button"
              onClick={() => handleOptionSelect(option)}
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

export default ComboInput;



