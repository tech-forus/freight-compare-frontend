/**
 * Serviceability Processor
 * 
 * This processes vendor serviceability data (pincodes) the SAME WAY 
 * as ZoneMappingUpload processes Excel uploads:
 * - Uses pincodes.json to derive city/state for each pincode
 * - Groups pincodes by zone
 * - Builds complete zone configs with cities
 */

import type { ZoneConfig, RegionGroup, PincodeEntry } from '../types/wizard.types';

// Cache for pincodes.json data
let pincodeData: PincodeEntry[] | null = null;
let pincodeMap: Map<string, PincodeEntry> | null = null;

/**
 * Load pincodes.json and build lookup map
 */
async function loadPincodeData(): Promise<void> {
    if (pincodeData && pincodeMap) return;

    try {
        const url = `${import.meta.env.BASE_URL || '/'}pincodes.json`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch pincodes.json`);
        pincodeData = await response.json();

        // Build lookup map
        pincodeMap = new Map();
        pincodeData!.forEach(entry => {
            pincodeMap!.set(String(entry.pincode), entry);
        });

        console.log(`[ServiceabilityProcessor] Loaded ${pincodeData!.length} pincodes`);
    } catch (error) {
        console.error('[ServiceabilityProcessor] Failed to load pincodes.json:', error);
        throw error;
    }
}

/**
 * Get city/state/zone info for a pincode from pincodes.json
 */
function getPincodeInfo(pincode: string): { city: string; state: string; zone: string } | null {
    if (!pincodeMap) return null;
    const entry = pincodeMap.get(String(pincode).trim());
    if (!entry) return null;
    return {
        city: entry.city || '',
        state: entry.state || '',
        zone: (entry.zone || '').toUpperCase()  // Master zone from YOUR pincodes.json
    };
}

/**
 * Convert zone code to region
 */
function codeToRegion(code: string): RegionGroup {
    const upper = code.toUpperCase();
    if (upper.startsWith('NE')) return 'Northeast';
    const firstChar = upper.charAt(0);
    if (firstChar === 'N') return 'North';
    if (firstChar === 'S') return 'South';
    if (firstChar === 'E') return 'East';
    if (firstChar === 'W') return 'West';
    if (firstChar === 'C') return 'Central';
    if (firstChar === 'X') return 'Special' as RegionGroup;  // X1, X2, X3 - Special zones
    return 'North';
}

/**
 * City-State key format for selectedCities
 */
function csKey(city: string, state: string): string {
    return `${city}||${state}`;
}

export interface ServiceabilityEntry {
    pincode: string;
    zone: string;
    state?: string;
    city?: string;
    isODA?: boolean;
}

export interface ProcessedServiceability {
    zones: ZoneConfig[];
    priceMatrix: Record<string, Record<string, string | number>>;
    odaPincodes: string[];
    stats: {
        totalPincodes: number;
        enrichedPincodes: number;
        zonesFound: number;
        citiesFound: number;
    };
}

/**
 * Process serviceability data into zones and price matrix
 * This mirrors the logic in ZoneMappingUpload
 */
export async function processServiceability(
    serviceability: ServiceabilityEntry[],
    blankCellValue: string | number = ''
): Promise<ProcessedServiceability> {
    console.group('🧠 [ServiceabilityProcessor] Processing vendor serviceability');
    console.log(`Input: ${serviceability.length} pincodes`);

    // Load pincodes.json for enrichment
    await loadPincodeData();

    // Group by zone and collect city/state data
    const zoneDataMap = new Map<string, {
        pincodes: Set<string>;
        cities: Set<string>;  // "city||state" format
        states: Set<string>;
        odaPincodes: Set<string>;
    }>();

    let enrichedCount = 0;

    for (const entry of serviceability) {
        const pincode = String(entry.pincode || '').trim();
        if (!pincode || pincode.length !== 6) continue;

        // CRITICAL: Look up zone from YOUR master pincodes.json, NOT vendor's zone
        const pincodeInfo = getPincodeInfo(pincode);

        // Skip pincodes not found in your master data
        if (!pincodeInfo || !pincodeInfo.zone) {
            console.warn(`[ServiceabilityProcessor] Pincode ${pincode} not in master zone mapping, skipping`);
            continue;
        }

        // Use YOUR zone, city, state from master pincodes.json
        const zone = pincodeInfo.zone;
        const city = pincodeInfo.city || (entry.city || '').trim();
        const state = pincodeInfo.state || (entry.state || '').trim();
        enrichedCount++;

        // Initialize zone data if needed
        if (!zoneDataMap.has(zone)) {
            zoneDataMap.set(zone, {
                pincodes: new Set(),
                cities: new Set(),
                states: new Set(),
                odaPincodes: new Set()
            });
        }

        const zoneData = zoneDataMap.get(zone)!;
        zoneData.pincodes.add(pincode);

        if (city && state) {
            zoneData.cities.add(csKey(city.toUpperCase(), state));
            zoneData.states.add(state);
        }

        if (entry.isODA) {
            zoneData.odaPincodes.add(pincode);
        }
    }

    // Build zone configs (same format as ZoneMappingUpload output)
    const zoneCodes = Array.from(zoneDataMap.keys()).sort();

    const zones: ZoneConfig[] = zoneCodes.map(zoneCode => {
        const data = zoneDataMap.get(zoneCode)!;
        return {
            zoneCode,
            zoneName: zoneCode,
            region: codeToRegion(zoneCode),
            selectedStates: Array.from(data.states),
            selectedCities: Array.from(data.cities),
            isComplete: data.cities.size > 0 || data.pincodes.size >= 10
        };
    });

    // Build empty price matrix
    const priceMatrix: Record<string, Record<string, string | number>> = {};
    zoneCodes.forEach(from => {
        priceMatrix[from] = {};
        zoneCodes.forEach(to => {
            priceMatrix[from][to] = blankCellValue;
        });
    });

    // Collect ODA pincodes
    const odaPincodes: string[] = [];
    zoneDataMap.forEach(data => {
        data.odaPincodes.forEach(p => odaPincodes.push(p));
    });

    const totalCities = zones.reduce((sum, z) => sum + z.selectedCities.length, 0);

    console.log(`✅ Processing complete:`);
    console.log(`   Zones: ${zones.length}`);
    console.log(`   Cities derived: ${totalCities}`);
    console.log(`   Pincodes enriched: ${enrichedCount}/${serviceability.length}`);
    console.log(`   ODA pincodes: ${odaPincodes.length}`);
    console.groupEnd();

    return {
        zones,
        priceMatrix,
        odaPincodes,
        stats: {
            totalPincodes: serviceability.length,
            enrichedPincodes: enrichedCount,
            zonesFound: zones.length,
            citiesFound: totalCities
        }
    };
}

/**
 * Check if serviceability data is rich enough for smart processing
 */
export function isRichServiceability(serviceability: ServiceabilityEntry[]): boolean {
    if (!serviceability || serviceability.length < 50) return false;

    // Check how many have zone data
    const withZone = serviceability.filter(s => s.zone && s.zone.trim()).length;
    return withZone >= 30;  // At least 30 pincodes with zones
}