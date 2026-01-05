// src/hooks/useVolumetric.ts
import { useCallback, useMemo, useState } from 'react';

export type VolumetricUnit = 'cm' | 'in';

export interface VolumetricState {
  unit: VolumetricUnit;
  volumetricDivisor: number | null; // used only when unit === 'cm'
  cftFactor: number | null;         // used only when unit === 'in'
}

export interface VolumetricDraft {
  unit?: VolumetricUnit;
  volumetricDivisor?: number | null;
  cftFactor?: number | null;
}

export function useVolumetric() {
  // default to centimeters with a sensible industry default (2800 cm³ shown in your UI)
  const [state, setState] = useState<VolumetricState>({
    unit: 'cm',
    volumetricDivisor: 2800,
    cftFactor: null,
  });

  // Reuse your existing divisors list (you can expand if needed)
  const volumetricDivisorOptions = useMemo<number[]>(
    () => [2800, 3000, 3200, 3500, 3800, 4000, 4200, 4500, 4720, 4750, 4800, 5000, 5200, 5500, 5800, 6000, 7000],
    []
  );

  // For inches, restrict strictly to integers 4..10
  const cftFactorOptions = useMemo<number[]>(
    () => [4, 5, 6, 7, 8, 9, 10],
    []
  );

  const setUnit = useCallback((unit: VolumetricUnit) => {
    setState((prev) => {
      if (unit === 'cm') {
        return {
          unit: 'cm',
          volumetricDivisor: prev.volumetricDivisor ?? 2800,
          cftFactor: null, // clear when switching to cm
        };
      }
      return {
        unit: 'in',
        volumetricDivisor: null, // clear when switching to in
        cftFactor: prev.cftFactor ?? 6, // a common default CFT factor
      };
    });
  }, []);

  // Single “dynamic” setter for the one UI field (depends on current unit)
  const setDynamicVolumetricValue = useCallback((value: number) => {
    setState((prev) => {
      if (prev.unit === 'cm') {
        return { ...prev, volumetricDivisor: value, cftFactor: null };
      }
      return { ...prev, cftFactor: value, volumetricDivisor: null };
    });
  }, []);

  const validateVolumetric = useCallback(() => {
    if (state.unit === 'cm') {
      return !!state.volumetricDivisor;
    }
    // unit === 'in'
    return !!state.cftFactor;
  }, [state.unit, state.volumetricDivisor, state.cftFactor]);

  const reset = useCallback(() => {
    setState({
      unit: 'cm',
      volumetricDivisor: 2800,
      cftFactor: null,
    });
  }, []);

  const loadFromDraft = useCallback((draft: VolumetricDraft) => {
    setState((prev) => {
      const nextUnit = draft?.unit ?? prev.unit;
      if (nextUnit === 'cm') {
        return {
          unit: 'cm',
          volumetricDivisor:
            draft?.volumetricDivisor ?? prev.volumetricDivisor ?? 2800,
          cftFactor: null,
        };
      }
      return {
        unit: 'in',
        volumetricDivisor: null,
        cftFactor: draft?.cftFactor ?? prev.cftFactor ?? 6,
      };
    });
  }, []);

  // Shape you submit along with the vendor
  const volumetric = useMemo(
    () => ({
      unit: state.unit,
      volumetricDivisor: state.unit === 'cm' ? state.volumetricDivisor : null,
      cftFactor: state.unit === 'in' ? state.cftFactor : null,
    }),
    [state]
  );

  return {
    // raw state
    state,
    setState,  // NEW: expose setState for autofill
    // derived submit payload
    volumetric,
    // options for UI
    volumetricDivisorOptions,
    cftFactorOptions,
    // actions
    setUnit,
    setDynamicVolumetricValue,
    validateVolumetric,
    loadFromDraft,
    reset,
  };
}
