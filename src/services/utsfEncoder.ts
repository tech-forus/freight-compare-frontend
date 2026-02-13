/**
 * UTSF Encoder - TypeScript Port
 *
 * Converts vendor form data to Unified Transporter Save Format (UTSF) v2.0
 * Port of Python encoder from freight-compare-tester/unified_format/utsf_encoder.py
 */

// ============================================================================
// TYPES AND CONSTANTS
// ============================================================================

const UTSF_VERSION = '3.0';

const ALL_ZONES = [
  'N1', 'N2', 'N3', 'N4',
  'S1', 'S2', 'S3', 'S4',
  'E1', 'E2',
  'W1', 'W2', 'W3',
  'C1', 'C2',
  'NE1', 'NE2',
  'X1', 'X2', 'X3'
];

const REGIONS: Record<string, string[]> = {
  'North': ['N1', 'N2', 'N3', 'N4'],
  'South': ['S1', 'S2', 'S3', 'S4'],
  'East': ['E1', 'E2'],
  'West': ['W1', 'W2', 'W3'],
  'Central': ['C1', 'C2'],
  'North East': ['NE1', 'NE2'],
  'Special': ['X1', 'X2', 'X3']
};

const SPECIAL_ZONES = ['X1', 'X2', 'X3'];

export const ZoneCoverageMode = {
  FULL_ZONE: 'FULL_ZONE',
  FULL_MINUS_EXCEPTIONS: 'FULL_MINUS_EXCEPT',
  ONLY_SERVED: 'ONLY_SERVED',
  NOT_SERVED: 'NOT_SERVED'
} as const;

export type ZoneCoverageModeType = typeof ZoneCoverageMode[keyof typeof ZoneCoverageMode];

export interface PincodeRange {
  s: number;
  e: number;
}

export interface ChargeConfig {
  v: number;
  f: number;
  unit?: string;
}

export interface PincodeEntry {
  pincode: number;
  zone: string;
  state: string;
  city: string;
}

export interface ZoneRemap {
  vendorZone: string;
  masterZone: string;
  count: number;
  ranges: PincodeRange[];
  singles: number[];
}

export interface ZoneDiscrepancies {
  totalMismatched: number;
  remaps: ZoneRemap[];
}

export interface GovernanceUpdate {
  timestamp: string;
  editorId: string;
  reason: string;
  changeSummary: string;
  snapshot: string | null;
}

export interface VendorFormData {
  customerID?: string;
  companyName: string;
  contactPersonName?: string;
  vendorCode?: string;
  vendorPhone?: number;
  vendorEmail?: string;
  gstNo?: string;
  transportMode?: string;
  serviceMode?: string;
  address?: string;
  state?: string;
  pincode?: number;
  city?: string;
  rating?: number;
  vendorRatings?: {
    priceSupport: number;
    deliveryTime: number;
    tracking: number;
    salesSupport: number;
    damageLoss: number;
  };
  subVendor?: string;
  selectedZones?: string[];
  prices: {
    priceRate: any;
    priceChart: Record<string, Record<string, number>>;
  };
  serviceability?: Array<{
    pincode: number;
    zone: string;
    state: string;
    city: string;
    isODA?: boolean;
    active?: boolean;
  }>;
  invoiceValueCharges?: {
    enabled: boolean;
    percentage: number;
    minimumAmount: number;
    description?: string;
  };
}

// ============================================================================
// PINCODE MASTER CACHE
// ============================================================================

let masterPincodesCache: PincodeEntry[] | null = null;
let pincodesByZone: Map<string, number[]> = new Map();
let pincodeToZone: Map<number, string> = new Map();

async function loadMasterPincodes(): Promise<void> {
  if (masterPincodesCache) return; // Already loaded

  try {
    const response = await fetch('/pincodes.json');
    if (!response.ok) {
      throw new Error(`Failed to load pincodes.json: ${response.statusText}`);
    }

    const data = await response.json();
    masterPincodesCache = data;

    // Build indexes
    pincodesByZone.clear();
    pincodeToZone.clear();

    for (const entry of data) {
      const pincode = Number(entry.pincode);
      const zone = entry.zone?.toUpperCase() || '';

      if (zone) {
        pincodeToZone.set(pincode, zone);

        if (!pincodesByZone.has(zone)) {
          pincodesByZone.set(zone, []);
        }
        pincodesByZone.get(zone)!.push(pincode);
      }
    }

    // Sort each zone's pincodes
    for (const [zone, pins] of pincodesByZone.entries()) {
      pincodesByZone.set(zone, pins.sort((a, b) => a - b));
    }

    console.log(`[UTSF Encoder] Loaded ${data.length} pincodes across ${pincodesByZone.size} zones`);
  } catch (error) {
    console.error('[UTSF Encoder] Failed to load master pincodes:', error);
    throw error;
  }
}

function getZoneForPincode(pincode: number): string | null {
  return pincodeToZone.get(pincode) || null;
}

function getPincodesForZone(zone: string): number[] {
  return pincodesByZone.get(zone.toUpperCase()) || [];
}

// ============================================================================
// PINCODE COMPRESSION UTILITIES
// ============================================================================

export function compressToRanges(
  pincodes: number[],
  threshold: number = 3
): { ranges: PincodeRange[]; singles: number[] } {
  if (!pincodes || pincodes.length === 0) {
    return { ranges: [], singles: [] };
  }

  const sorted = [...new Set(pincodes)].sort((a, b) => a - b);
  const ranges: PincodeRange[] = [];
  const singles: number[] = [];

  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    const pin = sorted[i];
    if (pin === end + 1) {
      end = pin;
    } else {
      // Gap detected - close current sequence
      if (end - start >= threshold - 1) {
        ranges.push({ s: start, e: end });
      } else {
        for (let p = start; p <= end; p++) {
          singles.push(p);
        }
      }
      start = pin;
      end = pin;
    }
  }

  // Handle last sequence
  if (end - start >= threshold - 1) {
    ranges.push({ s: start, e: end });
  } else {
    for (let p = start; p <= end; p++) {
      singles.push(p);
    }
  }

  return { ranges, singles: singles.sort((a, b) => a - b) };
}

export function expandFromRanges(ranges: PincodeRange[], singles: number[]): number[] {
  const result = new Set<number>();

  for (const r of ranges) {
    for (let pin = r.s; pin <= r.e; pin++) {
      result.add(pin);
    }
  }

  for (const pin of singles) {
    result.add(pin);
  }

  return Array.from(result).sort((a, b) => a - b);
}

// ============================================================================
// COVERAGE MODE DETERMINATION
// ============================================================================

function determineCoverageMode(
  servedPincodes: number[],
  totalZonePincodes: number[],
  thresholdPercent: number = 50.0
): { mode: ZoneCoverageModeType; pincodesToStore: number[] } {
  const servedSet = new Set(servedPincodes);
  const totalSet = new Set(totalZonePincodes);

  if (totalSet.size === 0) {
    return { mode: ZoneCoverageMode.NOT_SERVED, pincodesToStore: [] };
  }

  if (servedSet.size === 0) {
    return { mode: ZoneCoverageMode.NOT_SERVED, pincodesToStore: [] };
  }

  const coverage = (servedSet.size / totalSet.size) * 100;

  if (coverage >= 100.0) {
    return { mode: ZoneCoverageMode.FULL_ZONE, pincodesToStore: [] };
  }

  if (coverage > thresholdPercent) {
    // Store exceptions (pincodes NOT served)
    const exceptions = Array.from(totalSet).filter(p => !servedSet.has(p)).sort((a, b) => a - b);
    return { mode: ZoneCoverageMode.FULL_MINUS_EXCEPTIONS, pincodesToStore: exceptions };
  }

  // Store only served pincodes
  return { mode: ZoneCoverageMode.ONLY_SERVED, pincodesToStore: Array.from(servedSet).sort((a, b) => a - b) };
}

// ============================================================================
// ENCODER FUNCTIONS
// ============================================================================

function encodePricing(data: VendorFormData): any {
  const pricingData = data.prices || { priceRate: {}, priceChart: {} };
  const priceRateData = pricingData.priceRate || {};
  const zoneRatesData = pricingData.priceChart || {};

  // Helper to extract charge config
  const getChargeConfig = (obj: any, key: string): ChargeConfig => {
    const config = obj?.[key];
    if (config && typeof config === 'object') {
      return {
        v: Number(config.variable || config.v || 0),
        f: Number(config.fixed || config.f || 0),
        unit: config.unit || 'per kg'
      };
    }
    return { v: 0, f: 0, unit: 'per kg' };
  };

  const priceRate = {
    minWeight: Number(priceRateData.minWeight || 0),
    docketCharges: Number(priceRateData.docketCharges || 0),
    fuel: Number(priceRateData.fuel || 0),
    divisor: Number(priceRateData.divisor || 5000),
    kFactor: Number(priceRateData.kFactor || priceRateData.divisor || 5000),
    minCharges: Number(priceRateData.minCharges || 0),
    greenTax: Number(priceRateData.greenTax || 0),
    daccCharges: Number(priceRateData.daccCharges || 0),
    miscCharges: Number(priceRateData.miscCharges || priceRateData.miscellanousCharges || 0),
    rovCharges: getChargeConfig(priceRateData, 'rovCharges'),
    insuranceCharges: getChargeConfig(priceRateData, priceRateData.insuaranceCharges ? 'insuaranceCharges' : 'insuranceCharges'),
    odaCharges: getChargeConfig(priceRateData, 'odaCharges'),
    codCharges: getChargeConfig(priceRateData, 'codCharges'),
    prepaidCharges: getChargeConfig(priceRateData, 'prepaidCharges'),
    topayCharges: getChargeConfig(priceRateData, 'topayCharges'),
    handlingCharges: {
      ...getChargeConfig(priceRateData, 'handlingCharges'),
      thresholdWeight: Number(priceRateData.handlingCharges?.threshholdweight || priceRateData.handlingCharges?.thresholdWeight || 0)
    },
    fmCharges: getChargeConfig(priceRateData, 'fmCharges'),
    appointmentCharges: getChargeConfig(priceRateData, 'appointmentCharges'),
    invoiceValueCharges: data.invoiceValueCharges || null
  };

  // Normalize zone rates (uppercase keys)
  const zoneRates: Record<string, Record<string, number>> = {};
  for (const [origin, dests] of Object.entries(zoneRatesData)) {
    const originUpper = origin.toUpperCase();
    zoneRates[originUpper] = {};
    if (dests && typeof dests === 'object') {
      for (const [dest, rate] of Object.entries(dests)) {
        zoneRates[originUpper][dest.toUpperCase()] = Number(rate);
      }
    }
  }

  return {
    priceRate,
    zoneRates
  };
}

function encodeServiceability(data: VendorFormData): {
  serviceability: Record<string, any>;
  servedByZone: Map<string, number[]>;
  zoneDiscrepancies: ZoneDiscrepancies;
  zoneOverrides: Record<number, string>;
  complianceScore: number;
} {
  const serviceabilityData = data.serviceability || [];

  // Group served pincodes by MASTER zone (not vendor zone)
  const servedByZone = new Map<string, number[]>();

  // Track vendor-zone != master-zone discrepancies
  // Key: "vendorZone->masterZone", Value: list of pincodes
  const discrepancyMap = new Map<string, number[]>();

  // === ZONE OVERRIDES: Track pincodes where transporter zone differs from master ===
  const zoneOverrides: Record<number, string> = {};

  // If no explicit serviceability data but we have selectedZones,
  // derive serviceability from master pincodes for those zones.
  // This handles the wizard-only flow (zones + prices, no CSV upload).
  if (serviceabilityData.length === 0 && data.selectedZones && data.selectedZones.length > 0) {
    console.log(`[UTSF Encoder] No serviceability array — deriving from ${data.selectedZones.length} selected zones`);
    for (const zone of data.selectedZones) {
      const zoneUpper = zone.toUpperCase();
      const zonePincodes = getPincodesForZone(zoneUpper);
      if (zonePincodes.length > 0) {
        servedByZone.set(zoneUpper, [...zonePincodes]);
        console.log(`[UTSF Encoder]   Zone ${zoneUpper}: ${zonePincodes.length} pincodes from master`);
      }
    }
  } else {
    // Normal path: use explicit serviceability entries
    for (const entry of serviceabilityData) {
      const pincode = Number(entry.pincode);
      const vendorZone = entry.zone?.toUpperCase() || '';

      // Always look up master zone first
      const masterZone = getZoneForPincode(pincode) || '';
      // Use master zone for filing; fall back to vendor zone only if master unknown
      const fileZone = masterZone || vendorZone;

      if (fileZone && pincode) {
        if (!servedByZone.has(fileZone)) {
          servedByZone.set(fileZone, []);
        }
        servedByZone.get(fileZone)!.push(pincode);

        // Track discrepancy if vendor zone differs from master zone
        if (vendorZone && masterZone && vendorZone !== masterZone) {
          const key = `${vendorZone}->${masterZone}`;
          if (!discrepancyMap.has(key)) {
            discrepancyMap.set(key, []);
          }
          discrepancyMap.get(key)!.push(pincode);

          // === ZONE OVERRIDE: Store the transporter's zone mapping ===
          zoneOverrides[pincode] = vendorZone;
        }
      }
    }
  }

  // Build zoneDiscrepancies section
  let totalMismatched = 0;
  const remaps: ZoneRemap[] = [];
  for (const [key, pincodes] of discrepancyMap.entries()) {
    const [vendorZone, masterZone] = key.split('->');
    const { ranges, singles } = compressToRanges(pincodes);
    const count = new Set(pincodes).size;
    totalMismatched += count;
    remaps.push({ vendorZone, masterZone, count, ranges, singles });
  }
  // Sort by count descending for readability
  remaps.sort((a, b) => b.count - a.count);
  const zoneDiscrepancies: ZoneDiscrepancies = { totalMismatched, remaps };

  // Build serviceability for each zone
  const serviceability: Record<string, any> = {};

  // === STRICT DELTA TRACKING for compliance score ===
  let totalMasterPincodes = 0;
  let totalForcedExceptions = 0;

  for (const zone of ALL_ZONES) {
    const zoneMaster = getPincodesForZone(zone);
    const zoneServed = servedByZone.get(zone) || [];

    const totalInZone = zoneMaster.length;
    const servedSet = new Set(zoneServed.map(p => Number(p)));
    const servedCount = servedSet.size;

    if (totalInZone === 0) {
      continue; // Zone not in master
    }

    totalMasterPincodes += totalInZone;

    // === STRICT SET INTERSECTION ===
    // Any pincode in Master_Zone_Z but NOT in Transporter data → forced exception
    const missingFromTransporter: number[] = [];
    if (zoneServed.length > 0) {
      // Only check if transporter claims to serve this zone at all
      for (const masterPin of zoneMaster) {
        if (!servedSet.has(Number(masterPin))) {
          missingFromTransporter.push(Number(masterPin));
        }
      }
    }

    totalForcedExceptions += missingFromTransporter.length;

    const coveragePercent = totalInZone > 0 ? (servedCount / totalInZone * 100) : 0;

    // Determine optimal encoding mode
    const { mode, pincodesToStore } = determineCoverageMode(zoneServed, zoneMaster, 50.0);

    // === STRICT DELTA: For FULL_ZONE mode, if there are missing pincodes,
    // force upgrade to FULL_MINUS_EXCEPTIONS and inject them ===
    let finalMode = mode;
    let finalPincodesToStore = pincodesToStore;
    if (mode === 'FULL_ZONE' && missingFromTransporter.length > 0) {
      finalMode = ZoneCoverageMode.FULL_MINUS_EXCEPTIONS;
      finalPincodesToStore = missingFromTransporter;
      console.log(`[UTSF Encoder] STRICT DELTA: Zone ${zone} forced FULL_ZONE → FULL_MINUS_EXCEPT (${missingFromTransporter.length} missing pincodes)`);
    }

    // Compress pincodes to ranges
    const { ranges, singles } = compressToRanges(finalPincodesToStore);

    const coverage: any = {
      mode: finalMode,
      totalInZone,
      servedCount,
      coveragePercent: Math.round(coveragePercent * 100) / 100
    };

    // Add special zone metadata
    if (SPECIAL_ZONES.includes(zone)) {
      coverage.type = 'special';
    }

    if (finalMode === ZoneCoverageMode.FULL_MINUS_EXCEPTIONS) {
      coverage.exceptRanges = ranges;
      coverage.exceptSingles = singles;
    } else if (finalMode === ZoneCoverageMode.ONLY_SERVED) {
      coverage.servedRanges = ranges;
      coverage.servedSingles = singles;
    }

    serviceability[zone] = coverage;
  }

  // === COMPLIANCE SCORE: 1.0 = perfect match, 0.0 = all forced ===
  const complianceScore = totalMasterPincodes > 0
    ? Math.round((1.0 - (totalForcedExceptions / totalMasterPincodes)) * 10000) / 10000
    : 1.0;

  console.log(`[UTSF Encoder] Compliance Score: ${complianceScore} (${totalForcedExceptions} forced exceptions / ${totalMasterPincodes} total master pincodes)`);
  console.log(`[UTSF Encoder] Zone Overrides: ${Object.keys(zoneOverrides).length} pincodes mapped differently by transporter`);

  return { serviceability, servedByZone, zoneDiscrepancies, zoneOverrides, complianceScore };
}

function encodeOda(data: VendorFormData, servedByZone: Map<string, number[]>): Record<string, any> {
  const serviceabilityData = data.serviceability || [];

  // Group ODA pincodes by MASTER zone (consistent with encodeServiceability)
  const odaByZone = new Map<string, number[]>();

  for (const entry of serviceabilityData) {
    const isOda = entry.isODA || entry.isOda || false;
    if (isOda) {
      const pincode = Number(entry.pincode);
      const vendorZone = entry.zone?.toUpperCase() || '';

      // Always use master zone; fall back to vendor zone
      const masterZone = getZoneForPincode(pincode) || '';
      const fileZone = masterZone || vendorZone;

      if (fileZone && pincode) {
        if (!odaByZone.has(fileZone)) {
          odaByZone.set(fileZone, []);
        }
        odaByZone.get(fileZone)!.push(pincode);
      }
    }
  }

  // Build ODA section
  const oda: Record<string, any> = {};

  for (const zone of servedByZone.keys()) {
    const zoneOda = odaByZone.get(zone) || [];
    const { ranges, singles } = compressToRanges(zoneOda);

    oda[zone] = {
      odaRanges: ranges,
      odaSingles: singles,
      odaCount: new Set(zoneOda).size
    };
  }

  return oda;
}

function calculateStats(
  serviceability: Record<string, any>,
  oda: Record<string, any>,
  data: VendorFormData
): any {
  let totalPincodes = 0;
  let totalZones = 0;
  let totalOda = 0;
  const coverageByRegion: Record<string, number> = {};
  const coveragePercents: number[] = [];

  // Initialize regions
  for (const region of Object.keys(REGIONS)) {
    coverageByRegion[region] = 0;
  }

  for (const [zone, coverage] of Object.entries(serviceability)) {
    const served = coverage.servedCount || 0;
    totalPincodes += served;

    if (served > 0) {
      totalZones += 1;
    }

    coveragePercents.push(coverage.coveragePercent || 0);

    // Add to region
    for (const [region, zones] of Object.entries(REGIONS)) {
      if (zones.includes(zone)) {
        coverageByRegion[region] += served;
        break;
      }
    }
  }

  // Total ODA
  for (const odaData of Object.values(oda)) {
    totalOda += odaData.odaCount || 0;
  }

  // Data completeness
  const completeness = calculateCompleteness(data);

  const avgCoverage = coveragePercents.length > 0
    ? coveragePercents.reduce((a, b) => a + b, 0) / coveragePercents.length
    : 0;

  return {
    totalPincodes,
    totalZones,
    odaCount: totalOda,
    coverageByRegion,
    avgCoveragePercent: Math.round(avgCoverage * 100) / 100,
    dataCompleteness: completeness
  };
}

function calculateCompleteness(data: VendorFormData): number {
  const requiredFields: Array<[string, number]> = [
    ['companyName', 10],
    ['prices.priceRate', 30],
    ['prices.priceChart', 30],
    ['serviceability', 30]
  ];

  const totalWeight = requiredFields.reduce((sum, [_, weight]) => sum + weight, 0);
  let achieved = 0;

  for (const [fieldPath, weight] of requiredFields) {
    const parts = fieldPath.split('.');
    let value: any = data;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        value = null;
        break;
      }
    }

    if (value) {
      achieved += weight;
    }
  }

  return Math.round((achieved / totalWeight) * 100 * 10) / 10;
}

// ============================================================================
// MAIN ENCODER FUNCTION
// ============================================================================

export async function generateUTSF(vendorData: VendorFormData): Promise<any> {
  // Ensure master pincodes are loaded
  await loadMasterPincodes();

  const now = new Date().toISOString();

  // Determine transporter type
  const isTemporary = !!(vendorData.customerID && vendorData.customerID.trim());
  const transporterType = isTemporary ? 'temporary' : 'regular';

  // Build meta section with v3.0 governance headers
  const meta = {
    id: '', // Will be assigned by backend
    companyName: vendorData.companyName || 'Unknown',
    vendorCode: vendorData.vendorCode || null,
    customerID: isTemporary ? vendorData.customerID : null,
    transporterType,
    transportMode: vendorData.transportMode || vendorData.serviceMode || 'LTL',
    serviceMode: vendorData.serviceMode || 'FTL',
    gstNo: vendorData.gstNo || null,
    address: vendorData.address || null,
    state: vendorData.state || null,
    city: vendorData.city || null,
    pincode: vendorData.pincode ? String(vendorData.pincode) : null,
    contactPersonName: vendorData.contactPersonName || null,
    vendorPhone: vendorData.vendorPhone || null,
    vendorEmail: vendorData.vendorEmail || null,
    rating: Number(vendorData.rating || 4.0),
    vendorRatings: vendorData.vendorRatings || {
      priceSupport: 0,
      deliveryTime: 0,
      tracking: 0,
      salesSupport: 0,
      damageLoss: 0
    },
    isVerified: false,
    approvalStatus: 'pending',
    // === v3.0 GOVERNANCE HEADERS ===
    created: {
      by: 'WEBAPP_USER',
      at: now,
      source: 'FE'
    },
    version: '3.0.0',
    updateCount: 0,
    createdAt: now,
    updatedAt: now
  };

  // Build pricing section
  const pricing = encodePricing(vendorData);

  // Build serviceability section with strict delta + zoneOverrides + compliance
  const { serviceability, servedByZone, zoneDiscrepancies, zoneOverrides, complianceScore } = encodeServiceability(vendorData);

  // Build ODA section
  const oda = encodeOda(vendorData, servedByZone);

  // Build stats section
  const stats = calculateStats(serviceability, oda, vendorData);
  stats.zoneDiscrepancyCount = zoneDiscrepancies.totalMismatched;
  stats.complianceScore = complianceScore;

  // Assemble UTSF v3.0
  const utsf: any = {
    version: UTSF_VERSION,
    generatedAt: now,
    sourceFormat: 'webapp',
    meta,
    pricing,
    serviceability,
    oda,
    stats,
    // === v3.0 AUDIT TRAIL ===
    updates: [] as GovernanceUpdate[],
  };

  // Include zone overrides if any exist
  if (Object.keys(zoneOverrides).length > 0) {
    utsf.zoneOverrides = zoneOverrides;
  }

  // Include zone discrepancies if any exist
  if (zoneDiscrepancies.totalMismatched > 0) {
    utsf.zoneDiscrepancies = zoneDiscrepancies;
  }

  // Validate before returning
  const { isValid, errors } = validateUTSF(utsf);
  if (!isValid) {
    console.warn('[UTSF Encoder] Validation warnings:', errors);
  }

  return utsf;
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validateUTSF(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.version) {
    errors.push('Missing version field');
  }

  const requiredSections = ['meta', 'pricing', 'serviceability', 'stats'];
  for (const section of requiredSections) {
    if (!data[section]) {
      errors.push(`Missing required section: ${section}`);
    }
  }

  if (data.meta) {
    const requiredMeta = ['companyName', 'transporterType'];
    for (const field of requiredMeta) {
      if (!data.meta[field]) {
        errors.push(`Meta missing required field: ${field}`);
      }
    }
  }

  if (data.pricing) {
    if (!data.pricing.priceRate) {
      errors.push('Pricing missing priceRate');
    }
    if (!data.pricing.zoneRates) {
      errors.push('Pricing missing zoneRates');
    }
  }

  if (data.serviceability) {
    for (const [zone, coverage] of Object.entries<any>(data.serviceability)) {
      if (!coverage.mode) {
        errors.push(`Zone ${zone} missing coverage mode`);
      } else {
        const mode = coverage.mode;
        if (mode === ZoneCoverageMode.FULL_MINUS_EXCEPTIONS) {
          if (!coverage.exceptRanges && !coverage.exceptSingles) {
            errors.push(`Zone ${zone} FULL_MINUS mode but no exceptions`);
          }
        } else if (mode === ZoneCoverageMode.ONLY_SERVED) {
          if (!coverage.servedRanges && !coverage.servedSingles) {
            errors.push(`Zone ${zone} ONLY_SERVED mode but no served data`);
          }
        }
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

// ============================================================================
// DOWNLOAD HELPER
// ============================================================================

export function downloadUTSF(utsfData: any, filename?: string): void {
  const name = filename || `${utsfData.meta.companyName.replace(/[^a-zA-Z0-9]/g, '_')}.utsf.json`;
  const json = JSON.stringify(utsfData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  console.log(`[UTSF Encoder] Downloaded: ${name} (${(json.length / 1024).toFixed(1)} KB)`);
}
