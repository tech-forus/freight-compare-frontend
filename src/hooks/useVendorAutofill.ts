// src/hooks/useVendorAutofill.ts
import { useCallback } from 'react';

const ZPM_KEY = 'zonePriceMatrixData';
type VendorSuggestion = {
  id?: string;
  displayName?: string;
  companyName?: string;
  legalCompanyName?: string;
  vendorCode?: string;
  vendorPhone?: number | string;
  vendorEmail?: string;
  contactPersonName?: string;
  gstNo?: string;
  subVendor?: string;
  address?: string;
  state?: string;
  city?: string;
  pincode?: string | number;
  mode?: string;
  rating?: number;
  zones?: string[];
  zoneConfigs?: Array<{
    zoneCode: string;
    zoneName: string;
    region: string;
    selectedStates: string[];
    selectedCities: string[];
    isComplete: boolean;
  }>;
  zoneMatrixStructure?: Record<string, Record<string, any>>;
  volumetricUnit?: string;
  // NOTE: divisor removed from root - now only in charges.divisor (prices.priceRate.divisor)
  cftFactor?: number | null;
  // NEW: Charges data for autofill
  charges?: {
    minWeight?: number;
    docketCharges?: number;
    fuel?: number;
    minCharges?: number;
    greenTax?: number;
    daccCharges?: number;
    miscellanousCharges?: number;
    divisor?: number;
    serviceMode?: string; // FTL/LTL/PTL service mode
    rovCharges?: { fixed?: number; variable?: number; unit?: string };
    insuaranceCharges?: { fixed?: number; variable?: number; unit?: string };
    odaCharges?: { fixed?: number; variable?: number; unit?: string };
    codCharges?: { fixed?: number; variable?: number; unit?: string };
    prepaidCharges?: { fixed?: number; variable?: number; unit?: string };
    topayCharges?: { fixed?: number; variable?: number; unit?: string };
    handlingCharges?: { fixed?: number; variable?: number; unit?: string };
    fmCharges?: { fixed?: number; variable?: number; unit?: string };
    appointmentCharges?: { fixed?: number; variable?: number; unit?: string };
  };
  priceChart?: Record<string, Record<string, number>>;
  invoiceValueCharges?: {
    enabled?: boolean;
    percentage?: number;
    minimumAmount?: number;
    description?: string;
  };
  // NEW: Serviceability data for rich price matrix
  serviceability?: Array<{
    pincode: string;
    zone: string;
    state: string;
    city: string;
    isODA?: boolean;
    active?: boolean;
  }>;
  serviceabilityChecksum?: string;
  serviceabilitySource?: string;
};

// Options to control what to autofill. Defaults are conservative.
export type AutofillOptions = {
  overwriteBasics?: boolean;       // default true
  overwriteGeo?: boolean;          // default true
  overwriteVolumetric?: boolean;   // default true
  overwriteZones?: boolean;        // default true
  overwriteCharges?: boolean;      // default true - NEW: autofill charges
  blankCellValue?: string | number | null; // default ''
  wizardStep?: number;             // step to set in vendorWizard.v1 (default 3)
  writeLegacyZpm?: boolean;        // write zonePriceMatrixData (default true)
};

// The hook expects callers to pass the hooks/setters from the AddVendor context.
// Keep the hook simple: it performs mapping and writes storage + calls setters.
export function useVendorAutofill(params: {
  vendorBasics: any;
  pincodeLookup: any;
  volumetric: any;
  charges?: any;  // NEW: useCharges() hook for autofilling charges
  setWizardData?: (fn: any) => void;
  setZpm?: (z: any) => void;
  setIsAutoFilled?: (b: boolean) => void;
  setAutoFilledFromName?: (s: string | null) => void;
  setAutoFilledFromId?: (s: string | null) => void;
  setWizardValidation?: (v: any) => void;
  setWizardStatus?: (s: any) => void;
  validateWizardData?: (d: any) => any;
  getWizardStatus?: (d: any) => any;
  setServiceabilityData?: (data: any) => void;  // NEW: For serviceability autofill
}) {
  const {
    vendorBasics,
    pincodeLookup,
    volumetric,
    charges: chargesHook,  // NEW: destructure charges hook
    setWizardData,
    setZpm,
    setIsAutoFilled,
    setAutoFilledFromName,
    setAutoFilledFromId,
    setWizardValidation,
    setWizardStatus,
    validateWizardData,
    getWizardStatus,
    setServiceabilityData,  // NEW: serviceability setter
  } = params;

  const applyVendorAutofill = useCallback(
    (vendor: VendorSuggestion, opts?: AutofillOptions) => {
      const o: AutofillOptions = {
        overwriteBasics: true,
        overwriteGeo: true,
        overwriteVolumetric: true,
        overwriteZones: true,
        overwriteCharges: false,  // DISABLED: User wants charges left blank for manual entry
        blankCellValue: '',
        wizardStep: 3,
        writeLegacyZpm: true,
        ...(opts || {}),
      };

      console.log('[AutoFill] Applying vendor data:', {
        id: vendor.id,
        name: vendor.companyName,
        zones: vendor.zones,
        zoneConfigs: vendor.zoneConfigs,
        hasCharges: !!vendor.charges,
        hasPriceChart: !!vendor.priceChart,
      });

      // 1) Basics - map ALL fields from API response
      if (o.overwriteBasics && vendorBasics?.setBasics) {
        console.log('[AutoFill] Applying basics:', {
          companyName: vendor.companyName,
          contactPersonName: vendor.contactPersonName,
          transportMode: vendor.transportMode,
          vendorCode: vendor.vendorCode,
        });

        vendorBasics.setBasics((prev: any) => ({
          ...prev,
          // Company info
          legalCompanyName: vendor.legalCompanyName || vendor.companyName || prev.legalCompanyName || '',
          companyName: vendor.companyName || vendor.legalCompanyName || prev.companyName || '',
          // Contact person
          contactPersonName: vendor.contactPersonName || prev.contactPersonName || '',
          // Vendor contact
          vendorPhoneNumber: String(vendor.vendorPhone ?? prev.vendorPhoneNumber ?? ''),
          vendorEmailAddress: vendor.vendorEmail ?? prev.vendorEmailAddress ?? '',
          vendorCode: vendor.vendorCode ?? prev.vendorCode ?? '',
          // GST and sub-vendor
          gstin: vendor.gstNo ?? prev.gstin ?? '',
          subVendor: vendor.subVendor ?? prev.subVendor ?? '',
          // Address
          address: vendor.address ?? prev.address ?? '',
          // Transport mode (Road/Air/Rail) - from DB 'mode' field
          transportMode: vendor.mode || prev.transportMode || 'road',
          // Service mode (FTL/LTL/PTL) - from prices.priceRate.serviceMode or default to FTL
          serviceMode: vendor.charges?.serviceMode?.toUpperCase() ||
            (vendor.mode?.toUpperCase() === 'ROAD' || vendor.mode?.toUpperCase() === 'AIR' || vendor.mode?.toUpperCase() === 'RAIL'
              ? 'FTL'  // If mode contains transport type, default to FTL
              : prev.serviceMode || 'FTL'),
          // Rating
          companyRating: vendor.rating ?? prev.companyRating ?? 3,
        }));
      }

      // 2) Geo
      if (o.overwriteGeo && pincodeLookup) {
        const pincodeStr = vendor.pincode ? String(vendor.pincode) : '';
        if (pincodeStr && typeof pincodeLookup.setPincode === 'function') pincodeLookup.setPincode(pincodeStr);
        if (vendor.state && typeof pincodeLookup.setState === 'function') pincodeLookup.setState(vendor.state);
        if (vendor.city && typeof pincodeLookup.setCity === 'function') pincodeLookup.setCity(vendor.city);
      }

      // 3) Volumetric - map from API response to useVolumetric state
      if (o.overwriteVolumetric && volumetric?.setState) {
        // Normalize unit value: 'cm', 'in', 'inches', 'Inches' all map correctly
        const rawUnit = vendor.volumetricUnit || 'cm';
        const normalizedUnit = rawUnit.toLowerCase().startsWith('in') ? 'in' : 'cm';

        console.log('[AutoFill] Applying volumetric:', {
          rawUnit,
          normalizedUnit,
          divisor: vendor.charges?.divisor,  // Now in prices.priceRate.divisor
          cftFactor: vendor.cftFactor,
        });

        volumetric.setState((prev: any) => ({
          ...prev,
          unit: normalizedUnit,
          // FIX: Read divisor from charges (prices.priceRate.divisor) - single source of truth
          volumetricDivisor: normalizedUnit === 'cm' ? (vendor.charges?.divisor ?? prev.volumetricDivisor ?? 5000) : null,
          cftFactor: normalizedUnit === 'in' ? (vendor.cftFactor ?? prev.cftFactor ?? 6) : null,
        }));
      }

      // 4) Charges - map DB charge fields to useCharges hook format
      if (o.overwriteCharges && chargesHook?.loadFromDraft && vendor.charges) {
        const dbCharges = vendor.charges;
        console.log('[AutoFill] Applying charges from DB:', dbCharges);

        // Helper to convert DB charge object {fixed, variable, unit} to ChargeCardData format
        const mapChargeCard = (dbCharge: { fixed?: number; variable?: number; unit?: string } | undefined) => {
          if (!dbCharge) return undefined;
          const hasFixed = (dbCharge.fixed ?? 0) > 0;
          const hasVariable = (dbCharge.variable ?? 0) > 0;
          return {
            mode: hasVariable ? 'VARIABLE' : 'FIXED',
            currency: hasVariable ? 'PERCENT' : 'INR',
            fixedAmount: dbCharge.fixed ?? 0,
            variableRange: hasVariable ? String(dbCharge.variable) : '0-0.5',
            variable: dbCharge.variable ?? 0,
            weightThreshold: 0,
            unit: dbCharge.unit || 'per kg',
          };
        };

        // Build the charges draft object matching useCharges hook structure
        const chargesDraft: any = {
          // Simple numeric charges
          docketCharges: dbCharges.docketCharges ?? 0,
          minWeightKg: dbCharges.minWeight ?? 0,
          minCharges: dbCharges.minCharges ?? 0,
          fuelSurchargePct: dbCharges.fuel ?? 0,
          greenTax: dbCharges.greenTax ?? 0,
          miscCharges: dbCharges.miscellanousCharges ?? 0,
          daccCharges: dbCharges.daccCharges ?? 0,
        };

        // Card-based charges (map from DB format to hook format)
        const rovCard = mapChargeCard(dbCharges.rovCharges);
        if (rovCard) chargesDraft.rovCharges = rovCard;

        const codCard = mapChargeCard(dbCharges.codCharges);
        if (codCard) chargesDraft.codCharges = codCard;

        const toPayCard = mapChargeCard(dbCharges.topayCharges);
        if (toPayCard) chargesDraft.toPayCharges = toPayCard;

        const handlingCard = mapChargeCard(dbCharges.handlingCharges);
        if (handlingCard) chargesDraft.handlingCharges = handlingCard;

        const appointmentCard = mapChargeCard(dbCharges.appointmentCharges);
        if (appointmentCard) chargesDraft.appointmentCharges = appointmentCard;

        // Apply charges via loadFromDraft
        chargesHook.loadFromDraft(chargesDraft);
      }

      // 5) Zones -> Use zoneConfigs if available, otherwise build from zones array
      const hasZoneConfigs = Array.isArray(vendor.zoneConfigs) && vendor.zoneConfigs.length > 0;
      const hasZones = Array.isArray(vendor.zones) && vendor.zones.length > 0;

      if (o.overwriteZones && (hasZoneConfigs || hasZones)) {
        const blank = o.blankCellValue;

        // Build empty price matrix
        const zoneCodes = hasZoneConfigs
          ? vendor.zoneConfigs!.map(z => z.zoneCode)
          : vendor.zones!;

        const emptyPriceMatrix: Record<string, Record<string, any>> = {};
        for (const fromZone of zoneCodes) {
          emptyPriceMatrix[fromZone] = {};
          for (const toZone of zoneCodes) {
            emptyPriceMatrix[fromZone][toZone] = blank;
          }
        }

        // Build wizard zones array - use full zoneConfigs if available
        const wizardZones = hasZoneConfigs
          ? vendor.zoneConfigs!.map(z => ({
            zoneCode: z.zoneCode,
            zoneName: z.zoneName || z.zoneCode,
            region: z.region || 'North',
            selectedStates: z.selectedStates || [],
            selectedCities: z.selectedCities || [],
            isComplete: z.isComplete || (z.selectedCities && z.selectedCities.length > 0),
          }))
          : vendor.zones!.map((z) => ({
            zoneCode: z,
            zoneName: z,
            region: 'North' as const,
            selectedStates: [],
            selectedCities: [],
            isComplete: false,
          }));

        console.log('[AutoFill] Built wizard zones:', wizardZones);

        // For legacy selectedZones format
        const selectedZonesForWizard = zoneCodes.map((z) => ({ zoneCode: z, zoneName: z }));

        // Write legacy zpm (optional)
        if (o.writeLegacyZpm) {
          try {
            const zpmData = { zones: zoneCodes, priceMatrix: emptyPriceMatrix, timestamp: new Date().toISOString() };
            localStorage.setItem(ZPM_KEY, JSON.stringify(zpmData));
            if (typeof setZpm === 'function') setZpm(zpmData);
          } catch (err) {
            console.warn('autofill: failed writing ZPM_KEY', err);
          }
        }

        // Write wizard state with full zone configs
        try {
          const wizardKey = 'vendorWizard.v1';
          let wizardState: any = {};
          const raw = localStorage.getItem(wizardKey);
          if (raw) {
            try { wizardState = JSON.parse(raw); } catch { wizardState = {}; }
          }
          wizardState = {
            ...wizardState,
            selectedZones: selectedZonesForWizard,
            zones: wizardZones,  // Full zone configs with cities/states
            priceMatrix: emptyPriceMatrix,
            step: o.wizardStep,
            lastUpdated: new Date().toISOString(),
            autoFilledFrom: { vendorId: vendor.id, vendorName: vendor.displayName || vendor.companyName || '' },
          };
          localStorage.setItem(wizardKey, JSON.stringify(wizardState));

          if (typeof setWizardData === 'function') {
            setWizardData((prev: any) => ({
              ...(prev || {}),
              selectedZones: selectedZonesForWizard,
              zones: wizardZones,
              priceMatrix: emptyPriceMatrix,
            }));
          }

          // validation/status refresh if available
          if (validateWizardData && getWizardStatus && setWizardValidation && setWizardStatus) {
            const validation = validateWizardData(wizardState);
            const status = getWizardStatus(wizardState);
            setWizardValidation(validation);
            setWizardStatus(status);
          }
        } catch (err) {
          console.warn('autofill: failed writing vendorWizard.v1', err);
        }
      }

      // 6) Serviceability - populate if available from cloned vendor
      if (vendor.serviceability && Array.isArray(vendor.serviceability) && vendor.serviceability.length > 0) {
        console.log('[AutoFill] Applying serviceability data:', {
          count: vendor.serviceability.length,
          checksum: vendor.serviceabilityChecksum,
          source: vendor.serviceabilitySource,
        });

        // Build zone summary from serviceability for compatibility
        const zoneSummaryMap = new Map<string, any>();
        vendor.serviceability.forEach((entry: any) => {
          if (!zoneSummaryMap.has(entry.zone)) {
            zoneSummaryMap.set(entry.zone, {
              zoneCode: entry.zone,
              region: entry.zone.startsWith('N') ? 'North' :
                entry.zone.startsWith('S') ? 'South' :
                  entry.zone.startsWith('E') ? 'East' :
                    entry.zone.startsWith('W') ? 'West' :
                      entry.zone.startsWith('C') ? 'Central' : 'Other',
              pincodeCount: 0,
              states: new Set<string>(),
              cities: new Set<string>(),
              odaCount: 0,
            });
          }
          const summary = zoneSummaryMap.get(entry.zone)!;
          summary.pincodeCount++;
          if (entry.state) summary.states.add(entry.state);
          if (entry.city) summary.cities.add(entry.city);
          if (entry.isODA) summary.odaCount++;
        });

        const zoneSummary = Array.from(zoneSummaryMap.values()).map(z => ({
          ...z,
          states: Array.from(z.states),
          cities: Array.from(z.cities),
        }));

        if (typeof setServiceabilityData === 'function') {
          setServiceabilityData({
            serviceability: vendor.serviceability,
            zoneSummary: zoneSummary,
            checksum: vendor.serviceabilityChecksum || '',
            source: 'cloned' as const,
          });
        }
      }

      // 7) Tracking flags + toast handled by caller (so hook is pure)
      if (typeof setIsAutoFilled === 'function') setIsAutoFilled(true);
      if (typeof setAutoFilledFromName === 'function') setAutoFilledFromName(vendor.displayName || vendor.companyName || vendor.legalCompanyName || null);
      if (typeof setAutoFilledFromId === 'function') setAutoFilledFromId(vendor.id ?? null);

    },
    [
      vendorBasics,
      pincodeLookup,
      volumetric,
      chargesHook,  // NEW: charges hook dependency
      setWizardData,
      setZpm,
      setIsAutoFilled,
      setAutoFilledFromName,
      setAutoFilledFromId,
      setWizardValidation,
      setWizardStatus,
      validateWizardData,
      getWizardStatus,
      setServiceabilityData,  // NEW: serviceability dependency
    ]
  );

  return { applyVendorAutofill };
}