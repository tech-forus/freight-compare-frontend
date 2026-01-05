/**
 * Debug utility for AddVendor v2
 * Provides gated logging that only emits when in dev mode or localStorage.debug='1'
 */

/**
 * Check if debug mode is enabled
 */
export const isDebugEnabled = (): boolean => {
  if (import.meta.env.DEV) return true;
  if (typeof window !== 'undefined') {
    return localStorage.getItem('debug') === '1';
  }
  return false;
};

/**
 * Emit debug log with step marker and detail
 * Only logs when debug is enabled
 *
 * @param step - Step identifier (e.g., 'PINCODE_LOOKUP', 'SUBMIT_START')
 * @param detail - Additional context (object will be stringified)
 */
export const emitDebug = (step: string, detail?: unknown): void => {
  if (!isDebugEnabled()) return;

  const timestamp = new Date().toISOString();
  const prefix = `[AddVendor v2] [${timestamp}] [${step}]`;

  if (detail === undefined) {
    console.log(prefix);
    return;
  }

  // Pretty print objects
  if (typeof detail === 'object' && detail !== null) {
    console.log(prefix, JSON.stringify(detail, null, 2));
  } else {
    console.log(prefix, detail);
  }
};

/**
 * Emit debug warning
 */
export const emitDebugWarn = (step: string, detail?: unknown): void => {
  if (!isDebugEnabled()) return;

  const timestamp = new Date().toISOString();
  const prefix = `[AddVendor v2] [${timestamp}] [${step}]`;

  if (detail === undefined) {
    console.warn(prefix);
    return;
  }

  if (typeof detail === 'object' && detail !== null) {
    console.warn(prefix, JSON.stringify(detail, null, 2));
  } else {
    console.warn(prefix, detail);
  }
};

/**
 * Emit debug error
 */
export const emitDebugError = (step: string, detail?: unknown): void => {
  if (!isDebugEnabled()) return;

  const timestamp = new Date().toISOString();
  const prefix = `[AddVendor v2] [${timestamp}] [${step}]`;

  if (detail === undefined) {
    console.error(prefix);
    return;
  }

  if (typeof detail === 'object' && detail !== null) {
    console.error(prefix, JSON.stringify(detail, null, 2));
  } else {
    console.error(prefix, detail);
  }
};
