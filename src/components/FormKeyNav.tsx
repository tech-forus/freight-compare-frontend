/**
 * FormKeyNav
 *
 * Drop-in wrapper that enables keyboard-first form navigation:
 *   • Enter  → next field
 *   • Backspace on empty field → previous field
 *
 * Usage:
 *   <FormKeyNav>
 *     <input ... />
 *     <input ... />
 *   </FormKeyNav>
 *
 * Or with the hook directly for more control:
 *   const { containerRef, handleKeyDown } = useFormKeyNav();
 *   <div ref={containerRef} onKeyDown={handleKeyDown}>...</div>
 */
import React from 'react';
import { useFormKeyNav } from '../hooks/useFormKeyNav';

interface FormKeyNavProps {
  children: React.ReactNode;
  className?: string;
}

export const FormKeyNav: React.FC<FormKeyNavProps> = ({ children, className }) => {
  const { containerRef, handleKeyDown } = useFormKeyNav();
  return (
    <div ref={containerRef} onKeyDown={handleKeyDown} className={className}>
      {children}
    </div>
  );
};
