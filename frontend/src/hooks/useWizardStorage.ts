import { useCallback, useEffect, useState } from "react";
import type { WizardDataV1, PriceMatrix, ZoneConfig } from "../types/wizard.types";

const WIZARD_KEY = "vendorWizard.v1";

// Default empty wizard data
const getDefaultWizardData = (): WizardDataV1 => ({
  meta: {
    version: 1,
    updatedAt: new Date().toISOString(),
  },
  zones: [],
  priceMatrix: {},
  // 🔥 NEW: Initialize serviceability fields for pincode-authoritative uploads
  serviceability: [],
  serviceabilityChecksum: '',
  serviceabilitySource: '',
  oda: {
    enabled: false,
    pincodes: [],
    surcharge: { fixed: 0, variable: 0 },
  },
  other: {
    minWeight: 0,
    docketCharges: 0,
    fuel: 0,
    rovCharges: { variable: 0, fixed: 0 },
    codCharges: { variable: 0, fixed: 0 },
    topayCharges: { variable: 0, fixed: 0 },
    handlingCharges: { variable: 0, fixed: 0, threshholdweight: 0 },
    appointmentCharges: { variable: 0, fixed: 0 },
    divisor: null,
    cftFactor: null,
    minCharges: 0,
    greenTax: 0,
    daccCharges: 0,
    miscellanousCharges: 0,
    insuaranceCharges: { variable: 0, fixed: 0 },
    odaCharges: { variable: 0, fixed: 0 },
    prepaidCharges: { variable: 0, fixed: 0 },
    fmCharges: { variable: 0, fixed: 0 },
  },
});

export const useWizardStorage = () => {
  const [wizardData, setWizardData] = useState<WizardDataV1>(getDefaultWizardData());
  const [isLoaded, setIsLoaded] = useState(false);

  // Read from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(WIZARD_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as WizardDataV1;
        setWizardData(parsed);
      }
    } catch (error) {
      console.error("Failed to load wizard data:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Write to localStorage (merge with existing data)
  const writeWizard = useCallback((patch: Partial<WizardDataV1>) => {
    setWizardData((prev) => {
      const updated: WizardDataV1 = {
        ...prev,
        ...patch,
        meta: {
          version: 1,
          updatedAt: new Date().toISOString(),
        },
      };

      try {
        localStorage.setItem(WIZARD_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save wizard data:", error);
      }

      return updated;
    });
  }, []);

  // Clear wizard data
  const clearWizard = useCallback(() => {
    try {
      localStorage.removeItem(WIZARD_KEY);
      setWizardData(getDefaultWizardData());
    } catch (error) {
      console.error("Failed to clear wizard data:", error);
    }
  }, []);

  // Update zones
  const updateZones = useCallback(
    (zones: ZoneConfig[]) => {
      writeWizard({ zones });
    },
    [writeWizard]
  );

  // Update price matrix
  const updatePriceMatrix = useCallback(
    (priceMatrix: PriceMatrix) => {
      writeWizard({ priceMatrix });
    },
    [writeWizard]
  );

  // 🔥 NEW: Update serviceability data (from pincode-authoritative CSV upload)
  const updateServiceability = useCallback(
    (serviceability: any[] = [], checksum: string = '', source: string = 'excel') => {
      writeWizard({ serviceability, serviceabilityChecksum: checksum, serviceabilitySource: source });
    },
    [writeWizard]
  );

  // Check if price matrix exists and is valid
  const hasPriceMatrix = useCallback(() => {
    return (
      wizardData.priceMatrix &&
      Object.keys(wizardData.priceMatrix).length > 0 &&
      Object.values(wizardData.priceMatrix).some(
        (toZones) => Object.keys(toZones).length > 0
      )
    );
  }, [wizardData.priceMatrix]);

  return {
    wizardData,
    setWizardData,
    isLoaded,
    writeWizard,
    clearWizard,
    updateZones,
    updatePriceMatrix,
    updateServiceability,  // 🔥 NEW
    hasPriceMatrix,
  };
};