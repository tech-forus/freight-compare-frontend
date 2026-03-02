/**
 * useFormKeyNav
 *
 * Keyboard navigation for dense forms:
 *   • Enter  → move focus to the next tabbable field
 *   • Backspace on empty field → move focus to the previous tabbable field
 *
 * Apply by spreading the returned props on any container <div>.
 * Elements with tabIndex={-1} (toggle buttons, unit selectors) are
 * automatically skipped because the CSS selector excludes them.
 */
import { useRef, useCallback } from 'react';

/** Selector for genuinely focusable form fields — excludes tabIndex=-1 elements */
const TABBABLE =
  'input:not([tabindex="-1"]):not([disabled]):not([type="hidden"])' +
  ':not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]),' +
  'select:not([tabindex="-1"]):not([disabled]),' +
  'textarea:not([tabindex="-1"]):not([disabled])';

/** Input types where Enter should advance to the next field */
const TEXT_TYPES = new Set([
  'text', 'number', 'email', 'tel', 'search', 'url', 'password', '',
]);

function getTabbables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(TABBABLE));
}

export function useFormKeyNav() {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const tag = target.tagName.toLowerCase();

    // Only act on text-like inputs
    if (tag !== 'input' && tag !== 'textarea') return;
    if (tag === 'input') {
      const type = (target as HTMLInputElement).type ?? '';
      if (!TEXT_TYPES.has(type)) return;
    }
    // Skip textareas for Enter (Enter = new line there)
    if (tag === 'textarea' && e.key === 'Enter') return;

    const container = containerRef.current;
    if (!container) return;

    const fields = getTabbables(container);
    const idx = fields.indexOf(target);
    if (idx === -1) return;

    if (e.key === 'Enter') {
      // If the event was already handled by a child (ComboInput dropdown), skip
      if (e.defaultPrevented) return;
      const next = fields[idx + 1];
      if (next) {
        e.preventDefault();
        next.focus();
      }
    } else if (e.key === 'Backspace') {
      const value = (target as HTMLInputElement).value ?? '';
      if (value.length === 0) {
        const prev = fields[idx - 1];
        if (prev) {
          e.preventDefault();
          prev.focus();
        }
      }
    }
  }, []);

  return { containerRef, handleKeyDown } as const;
}
