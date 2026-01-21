// src/hooks/useVendorAutofill.ts
import { useCallback } from 'react';

const ZPM_KEY = 'zonePriceMatrixData';

// =============================================================================
// INITIAL STATE CONSTANTS - Single source of truth for all form defaults
// =============================================================================

/**
 * Initial state for vendor basics (from useVendorBasics hook)
 * These are the default values that should be restored when Quick Lookup is used
 */
const INITIAL_VENDOR_BASICS = {
  companyName: '',
  legalCompanyName: '',
  contactPersonName: '',
  vendorPhoneNumber: '',
  vendorEmailAddress: '',
  gstin: '',
  transportMode: null,  // Will be set to 'road' by vendor or remain null
  displayName: '',
  subVendor: '',
  vendorCode: '',
  primaryContactName: '',
  primaryContactPhone: '',
  primaryContactEmail: '',
  address: '',
  serviceMode: null,  // Will be set to 'FTL'/'LTL' by vendor or remain null
  companyRating: 4,   // Default rating (preserve this default)
};

/**
 * Initial state for geo/pincode lookup (from usePincodeLookup hook)
 */
const INITIAL_GEO = {
  pincode: '',
  state: '',
  city: '',
  district: '',
  zone: '',
};

/**
 * Initial state for volumetric settings (from useVolumetric hook)
 */
const INITIAL_VOLUMETRIC = {
  unit: 'cm' as const,
  volumetricDivisor: 2800,
  cftFactor: null,
};

/**
 * Helper function to convert pincode array to city and state names
 * @param pincodes - Array of pincodes (strings like "110001")
 * @returns Promise<{cities: string[], states: string[]}> - Unique city and state names
 */
async function convertPincodesToCities(pincodes: string[]): Promise<{ cities: string[]; states: string[] }> {
  if (!pincodes || pincodes.length === 0) {
    return { cities: [], states: [] };
  }

  try {
    // Fetch pincodes.json from public directory
    const response = await fetch('/pincodes.json', { cache: 'force-cache' });
    if (!response.ok) {
      console.warn('[AutoFill] Failed to fetch pincodes.json:', response.status);
      return { cities: [], states: [] };
    }

    const pincodeData = await response.json();
    const pincodeMap = new Map<string, { city: string; state: string; zone: string }>();

    // Build lookup map
    pincodeData.forEach((row: any) => {
      if (row.pincode && row.city) {
        pincodeMap.set(String(row.pincode).trim(), {
          city: row.city,
          state: row.state || '',
          zone: row.zone || ''
        });
      }
    });

    // Convert pincodes to cities and states
    const cities = new Set<string>();
    const states = new Set<string>();

    pincodes.forEach(pin => {
      const pincode = String(pin).trim();
      const data = pincodeMap.get(pincode);
      if (data && data.city) {
        cities.add(data.city);
        if (data.state) states.add(data.state);
      }
    });

    return {
      cities: Array.from(cities),
      states: Array.from(states)
    };
  } catch (error) {
    console.error('[AutoFill] Error converting pincodes to cities:', error);
    return { cities: [], states: [] };
  }
}

/**
 * Check if a string array contains pincodes (6-digit numbers)
 */
function isPincodeArray(arr: string[]): boolean {
  if (!arr || arr.length === 0) return false;
  // Check if at least 50% of entries are 6-digit numbers
  const pincodePattern = /^\d{6}$/;
  const pincodeCount = arr.filter(item => pincodePattern.test(String(item))).length;
  return pincodeCount >= arr.length * 0.5;
}
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
    async (vendor: VendorSuggestion, opts?: AutofillOptions) => {
      // =======================================================================
      // 🔥 FIX: Quick Lookup Clear Previous Data Issue
      // =======================================================================
      // Problem: When selecting vendor A, then vendor B, fields from vendor A
      //          remained if vendor B didn't have those fields (e.g., email, gstin)
      //
      // Solution: Reset all form sections to INITIAL state before applying
      //           vendor data. This ensures:
      //           1. Vendor data overwrites existing values
      //           2. Missing vendor data results in BLANK fields (not previous vendor's data)
      //           3. Default values (like companyRating: 4) are preserved
      //
      // Implementation: Each section now uses INITIAL_* constants instead of
      //                 prev fallbacks, ensuring clean state on every Quick Lookup
      // =======================================================================

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

      // 🔥 FIX: Reset to initial state, then apply ONLY vendor data (single state update)
      // Strategy: Start with INITIAL_VENDOR_BASICS, then overwrite with vendor data
      // No fallback to prev - prevents leftover data from previous Quick Lookup
      if (o.overwriteBasics && vendorBasics?.setBasics) {
        console.log('[AutoFill] Applying basics (with initial state reset):', {
          companyName: vendor.companyName,
          contactPersonName: vendor.contactPersonName,
          transportMode: vendor.transportMode,
          vendorCode: vendor.vendorCode,
        });

        vendorBasics.setBasics({
          ...INITIAL_VENDOR_BASICS,
          // Company info - use vendor data or empty string (no prev fallback)
          legalCompanyName: vendor.legalCompanyName || vendor.companyName || '',
          companyName: vendor.companyName || vendor.legalCompanyName || '',
          // Contact person
          contactPersonName: vendor.contactPersonName || '',
          // Vendor contact
          vendorPhoneNumber: String(vendor.vendorPhone ?? ''),
          vendorEmailAddress: vendor.vendorEmail ?? '',
          vendorCode: vendor.vendorCode ?? '',
          // GST and sub-vendor
          gstin: vendor.gstNo ?? '',
          subVendor: vendor.subVendor ?? '',
          // Address
          address: vendor.address ?? '',
          // Transport mode (Road/Air/Rail) - from DB 'mode' field
          transportMode: vendor.mode || 'road',
          // Service mode (FTL/LTL/PTL) - from prices.priceRate.serviceMode or default to FTL
          serviceMode: vendor.charges?.serviceMode?.toUpperCase() ||
            (vendor.mode?.toUpperCase() === 'ROAD' || vendor.mode?.toUpperCase() === 'AIR' || vendor.mode?.toUpperCase() === 'RAIL'
              ? 'FTL'  // If mode contains transport type, default to FTL
              : 'FTL'),
          // Rating - use vendor rating or keep initial default (4)
          companyRating: vendor.rating ?? INITIAL_VENDOR_BASICS.companyRating,
        });
      }

      // 2) Geo - Reset to initial, then apply vendor geo data
      if (o.overwriteGeo && pincodeLookup) {
        // Reset geo to initial state first
        if (typeof pincodeLookup.reset === 'function') {
          pincodeLookup.reset();
        }

        // Then apply vendor geo data if available
        const pincodeStr = vendor.pincode ? String(vendor.pincode) : '';
        if (pincodeStr && typeof pincodeLookup.setPincode === 'function') {
          pincodeLookup.setPincode(pincodeStr);
        }
        // Note: setPincode will auto-lookup city/state, so we don't need to set them manually
        // unless the vendor has different data than what pincode lookup returns
      }

      // 3) Volumetric - Reset to initial, then apply vendor volumetric data
      if (o.overwriteVolumetric && volumetric?.setState) {
        // Normalize unit value: 'cm', 'in', 'inches', 'Inches' all map correctly
        const rawUnit = vendor.volumetricUnit || 'cm';
        const normalizedUnit = rawUnit.toLowerCase().startsWith('in') ? 'in' : 'cm';

        console.log('[AutoFill] Applying volumetric (with initial reset):', {
          rawUnit,
          normalizedUnit,
          divisor: vendor.charges?.divisor,
          cftFactor: vendor.cftFactor,
        });

        // Start with initial state, then apply vendor data
        volumetric.setState({
          ...INITIAL_VOLUMETRIC,
          unit: normalizedUnit,
          // FIX: Read divisor from charges (prices.priceRate.divisor) - no prev fallback
          volumetricDivisor: normalizedUnit === 'cm' ? (vendor.charges?.divisor ?? INITIAL_VOLUMETRIC.volumetricDivisor) : null,
          cftFactor: normalizedUnit === 'in' ? (vendor.cftFactor ?? 6) : null,
        });
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
      const hasExistingPriceChart = vendor.priceChart && Object.keys(vendor.priceChart).length > 0;

      if (o.overwriteZones && (hasZoneConfigs || hasZones || hasExistingPriceChart)) {
        const blank = o.blankCellValue;

        // 🔥 FIX: Use priceChart keys as zone source if zones array is empty
        let zoneCodes: string[] = [];
        if (hasZoneConfigs) {
          zoneCodes = vendor.zoneConfigs!.map(z => z.zoneCode);
        } else if (hasZones) {
          zoneCodes = vendor.zones!;
        } else if (hasExistingPriceChart) {
          // Derive zones from priceChart keys
          zoneCodes = Object.keys(vendor.priceChart!);
        }

        // 🔥 FIXED: ALWAYS create blank matrix - NEVER copy prices from vendor
        // Rule: Every vendor has unique prices - structure only, no values
        let finalPriceMatrix: Record<string, Record<string, any>> = {};

        // Create completely empty matrix for all zone combinations
        for (const fromZone of zoneCodes) {
          finalPriceMatrix[fromZone] = {};
          for (const toZone of zoneCodes) {
            finalPriceMatrix[fromZone][toZone] = blank;  // Always empty ('')
          }
        }

        console.log('[AutoFill] Created EMPTY price matrix structure:', {
          zoneCodes,
          totalCells: zoneCodes.length * zoneCodes.length,
          sampleValue: blank,
          note: 'Prices NEVER copied - user must fill manually'
        });

        // 🔥 COMPLETE FALLBACK CHAIN: Convert pincodes → cities with multiple data sources
        // Priority: serviceability > zoneConfigs > zones > fallback
        let wizardZones: any[] = [];

        // PRIORITY 1: Use serviceability data (most complete - has pincode→city mapping)
        if (vendor.serviceability && Array.isArray(vendor.serviceability) && vendor.serviceability.length > 0) {
          console.log('[AutoFill] Using serviceability data (Priority 1):', vendor.serviceability.length, 'entries');

          // 🔥 FIX: Check if serviceability has empty city/state (public transporters issue)
          // If so, we need to enrich from pincodes.json
          const hasCityData = vendor.serviceability.some((s: any) => s.city && s.city.trim());
          console.log('[AutoFill] Serviceability has city data:', hasCityData);

          // Group by zone to build zone configs
          const zoneMap = new Map<string, { cities: Set<string>; states: Set<string>; pincodes: Set<string> }>();

          // 🔥 FIX: If no city data, fetch pincodes.json to enrich
          let pincodeEnrichmentMap: Map<string, { city: string; state: string }> | null = null;
          if (!hasCityData) {
            console.log('[AutoFill] No city data in serviceability - loading pincodes.json for enrichment...');
            try {
              const response = await fetch('/pincodes.json', { cache: 'force-cache' });
              if (response.ok) {
                const pincodeData = await response.json();
                pincodeEnrichmentMap = new Map();
                pincodeData.forEach((row: any) => {
                  if (row.pincode && row.city) {
                    pincodeEnrichmentMap!.set(String(row.pincode).trim(), {
                      city: row.city,
                      state: row.state || ''
                    });
                  }
                });
                console.log('[AutoFill] Loaded', pincodeEnrichmentMap.size, 'pincodes for enrichment');
              }
            } catch (err) {
              console.warn('[AutoFill] Failed to load pincodes.json for enrichment:', err);
            }
          }

          vendor.serviceability.forEach((entry: any) => {
            if (!entry.zone) return;

            if (!zoneMap.has(entry.zone)) {
              zoneMap.set(entry.zone, {
                cities: new Set(),
                states: new Set(),
                pincodes: new Set()
              });
            }

            const zoneData = zoneMap.get(entry.zone)!;

            // Get city/state from entry, or enrich from pincodes.json if missing
            let city = entry.city || '';
            let state = entry.state || '';

            if ((!city || !state) && pincodeEnrichmentMap && entry.pincode) {
              const enriched = pincodeEnrichmentMap.get(String(entry.pincode).trim());
              if (enriched) {
                if (!city) city = enriched.city;
                if (!state) state = enriched.state;
              }
            }

            if (city) zoneData.cities.add(city);
            if (state) zoneData.states.add(state);
            if (entry.pincode) zoneData.pincodes.add(entry.pincode);
          });

          wizardZones = Array.from(zoneMap.entries()).map(([zoneCode, data]) => ({
            zoneCode,
            zoneName: zoneCode,
            region: zoneCode.startsWith('N') ? 'North' :
              zoneCode.startsWith('S') ? 'South' :
                zoneCode.startsWith('E') ? 'East' :
                  zoneCode.startsWith('W') ? 'West' :
                    zoneCode.startsWith('C') ? 'Central' : 'Other',
            selectedStates: Array.from(data.states),
            selectedCities: Array.from(data.cities),
            isComplete: data.cities.size > 0,
          }));

          // 🔥 FIX: Also update zoneCodes from enriched serviceability
          if (wizardZones.length > 0) {
            zoneCodes = wizardZones.map(z => z.zoneCode);
            console.log('[AutoFill] Updated zoneCodes from serviceability:', zoneCodes);
          }

          console.log('[AutoFill] Built zones from serviceability:', wizardZones.map(z => ({
            code: z.zoneCode,
            cities: z.selectedCities.length,
            states: z.selectedStates.length,
            isComplete: z.isComplete
          })));
        }
        // PRIORITY 2: Use zoneConfigs with pincode conversion
        else if (hasZoneConfigs) {
          console.log('[AutoFill] Using zoneConfigs (Priority 2) - converting pincodes to cities');

          wizardZones = await Promise.all(
            vendor.zoneConfigs!.map(async (z) => {
              let cities = z.selectedCities || [];
              let states = z.selectedStates || [];

              // Check if selectedCities contains pincodes (6-digit numbers)
              if (isPincodeArray(cities)) {
                console.log(`[AutoFill] Zone ${z.zoneCode}: Converting ${cities.length} pincodes to cities`);
                const converted = await convertPincodesToCities(cities);
                cities = converted.cities;
                states = converted.states;
                console.log(`[AutoFill] Zone ${z.zoneCode}: Converted to ${cities.length} cities, ${states.length} states`);
              }

              return {
                zoneCode: z.zoneCode,
                zoneName: z.zoneName || z.zoneCode,
                region: z.region || (z.zoneCode.startsWith('N') ? 'North' :
                  z.zoneCode.startsWith('S') ? 'South' :
                    z.zoneCode.startsWith('E') ? 'East' :
                      z.zoneCode.startsWith('W') ? 'West' :
                        z.zoneCode.startsWith('C') ? 'Central' : 'Other'),
                selectedStates: states,
                selectedCities: cities,
                isComplete: cities.length > 0,
              };
            })
          );

          console.log('[AutoFill] Built zones from zoneConfigs after conversion:', wizardZones);
        }
        // PRIORITY 3 & 4: Use zones array OR zone code fallback
        else {
          console.log('[AutoFill] Using zone codes only (Priority 3/4) - creating zone structure with regional fallback');

          wizardZones = zoneCodes.map((z) => ({
            zoneCode: z,
            zoneName: `${z} Zone`,
            region: z.startsWith('N') ? 'North' :
              z.startsWith('S') ? 'South' :
                z.startsWith('E') ? 'East' :
                  z.startsWith('W') ? 'West' :
                    z.startsWith('C') ? 'Central' : 'Other',
            selectedStates: [],
            selectedCities: [],
            isComplete: false,  // No cities - user must fill manually
          }));

          console.log('[AutoFill] Built zones from zone codes (fallback):', wizardZones);
        }

        console.log('[AutoFill] Final wizard zones:', {
          totalZones: wizardZones.length,
          zonesWithCities: wizardZones.filter(z => z.selectedCities.length > 0).length,
          zonesEmpty: wizardZones.filter(z => z.selectedCities.length === 0).length,
          zones: wizardZones.map(z => ({
            code: z.zoneCode,
            cities: z.selectedCities.length,
            states: z.selectedStates.length
          }))
        });

        // For legacy selectedZones format
        const selectedZonesForWizard = zoneCodes.map((z) => ({ zoneCode: z, zoneName: z }));

        // Write legacy zpm (optional)
        if (o.writeLegacyZpm) {
          try {
            const zpmData = { zones: zoneCodes, priceMatrix: finalPriceMatrix, timestamp: new Date().toISOString() };
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
            priceMatrix: finalPriceMatrix,
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
              priceMatrix: finalPriceMatrix,
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

        // 🔥 FIX: Check if we need to enrich with city/state from pincodes.json
        const hasCityDataForSummary = vendor.serviceability.some((s: any) => s.city && s.city.trim());
        let enrichmentMap: Map<string, { city: string; state: string }> | null = null;

        if (!hasCityDataForSummary) {
          console.log('[AutoFill] Enriching serviceability summary from pincodes.json...');
          try {
            const response = await fetch('/pincodes.json', { cache: 'force-cache' });
            if (response.ok) {
              const pincodeData = await response.json();
              enrichmentMap = new Map();
              pincodeData.forEach((row: any) => {
                if (row.pincode && row.city) {
                  enrichmentMap!.set(String(row.pincode).trim(), {
                    city: row.city,
                    state: row.state || ''
                  });
                }
              });
            }
          } catch (err) {
            console.warn('[AutoFill] Failed to load pincodes.json for serviceability summary:', err);
          }
        }

        // Build zone summary from serviceability for compatibility
        const zoneSummaryMap = new Map<string, any>();

        // Also build enriched serviceability array for submission
        const enrichedServiceability: any[] = [];

        vendor.serviceability.forEach((entry: any) => {
          // Enrich the entry if needed
          let city = entry.city || '';
          let state = entry.state || '';

          if ((!city || !state) && enrichmentMap && entry.pincode) {
            const enriched = enrichmentMap.get(String(entry.pincode).trim());
            if (enriched) {
              if (!city) city = enriched.city;
              if (!state) state = enriched.state;
            }
          }

          // Add enriched entry to the array
          enrichedServiceability.push({
            ...entry,
            city,
            state,
          });

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
          if (state) summary.states.add(state);
          if (city) summary.cities.add(city);
          if (entry.isODA) summary.odaCount++;
        });

        const zoneSummary = Array.from(zoneSummaryMap.values()).map(z => ({
          ...z,
          states: Array.from(z.states),
          cities: Array.from(z.cities),
        }));

        console.log('[AutoFill] Enriched serviceability:', {
          totalEntries: enrichedServiceability.length,
          entriesWithCities: enrichedServiceability.filter(e => e.city).length,
          zones: zoneSummary.map(z => ({ code: z.zoneCode, cities: z.cities.length }))
        });

        if (typeof setServiceabilityData === 'function') {
          setServiceabilityData({
            serviceability: enrichedServiceability,  // 🔥 FIX: Use enriched data
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