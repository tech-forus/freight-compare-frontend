// src/hooks/useVendorAutofill.ts
import { useCallback } from 'react';

const ZPM_KEY = 'zonePriceMatrixData';

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
        // Priority: Use vendor.zones as authoritative source, enrich with serviceability data
        let wizardZones: any[] = [];

        // 🔥 FIX: Build zone enrichment map from serviceability (if available)
        // This is used to add city/state data to zones, but NOT to determine which zones exist
        const zoneEnrichmentMap = new Map<string, { cities: Set<string>; states: Set<string>; pincodes: Set<string> }>();

        if (vendor.serviceability && Array.isArray(vendor.serviceability) && vendor.serviceability.length > 0) {
          console.log('[AutoFill] Building enrichment map from serviceability:', vendor.serviceability.length, 'entries');

          // Check if serviceability has city data or needs pincodes.json enrichment
          const hasCityData = vendor.serviceability.some((s: any) => s.city && s.city.trim());
          console.log('[AutoFill] Serviceability has city data:', hasCityData);

          // Load pincodes.json for enrichment if needed
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

          // Build enrichment map grouped by zone
          vendor.serviceability.forEach((entry: any) => {
            if (!entry.zone) return;

            if (!zoneEnrichmentMap.has(entry.zone)) {
              zoneEnrichmentMap.set(entry.zone, {
                cities: new Set(),
                states: new Set(),
                pincodes: new Set()
              });
            }

            const zoneData = zoneEnrichmentMap.get(entry.zone)!;

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

          console.log('[AutoFill] Built enrichment map for zones:', Array.from(zoneEnrichmentMap.keys()));
        }

        // 🔥 KEY FIX: Use zoneCodes (from vendor.zones) as the authoritative source
        // DO NOT override zoneCodes from serviceability - that was the bug!
        // Now we build wizardZones from ALL zoneCodes, enriching with serviceability where available

        if (hasZoneConfigs && vendor.zoneConfigs!.some(z => z.selectedCities?.length > 0)) {
          // PRIORITY 1: Use zoneConfigs if they have city data
          console.log('[AutoFill] Using zoneConfigs with city data (Priority 1)');

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
              }

              return {
                zoneCode: z.zoneCode,
                zoneName: z.zoneName || z.zoneCode,
                region: z.region || (z.zoneCode.startsWith('NE') ? 'Northeast' :
                  z.zoneCode.startsWith('N') ? 'North' :
                    z.zoneCode.startsWith('S') ? 'South' :
                      z.zoneCode.startsWith('E') ? 'East' :
                        z.zoneCode.startsWith('W') ? 'West' :
                          z.zoneCode.startsWith('X') ? 'Special' :
                            z.zoneCode.startsWith('C') ? 'Central' : 'Other'),
                selectedStates: states,
                selectedCities: cities,
                isComplete: cities.length > 0,
              };
            })
          );
        } else {
          // PRIORITY 2: Build from zoneCodes (vendor.zones), enrich with serviceability
          console.log('[AutoFill] Building zones from zoneCodes, enriching with serviceability');
          console.log('[AutoFill] Zone codes to use:', zoneCodes);

          wizardZones = zoneCodes.map((z) => {
            const enrichment = zoneEnrichmentMap.get(z);
            return {
              zoneCode: z,
              zoneName: z,
              region: z.startsWith('NE') ? 'Northeast' :
                z.startsWith('N') ? 'North' :
                  z.startsWith('S') ? 'South' :
                    z.startsWith('E') ? 'East' :
                      z.startsWith('W') ? 'West' :
                        z.startsWith('X') ? 'Special' :
                          z.startsWith('C') ? 'Central' : 'Other',
              selectedStates: enrichment ? Array.from(enrichment.states) : [],
              selectedCities: enrichment ? Array.from(enrichment.cities) : [],
              isComplete: enrichment ? enrichment.cities.size > 0 : false,
            };
          });
        }

        console.log('[AutoFill] Final wizard zones built:', {
          totalZones: wizardZones.length,
          zonesWithCities: wizardZones.filter((z: any) => z.selectedCities?.length > 0).length,
          zonesEmpty: wizardZones.filter((z: any) => !z.selectedCities?.length).length,
          zoneCodes: wizardZones.map((z: any) => z.zoneCode),
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