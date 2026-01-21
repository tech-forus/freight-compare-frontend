// src/utils/pincodeEnrichment.ts
// Smart utility to derive zones, cities, and states from pincode data

import { zoneForPincode, cityForPincode, stateForPincode } from './pincodeZoneLookup';

export interface ServiceabilityEntry {
    pincode: string;
    zone: string;
    state: string;
    city: string;
    isODA?: boolean;
    active?: boolean;
}

export interface EnrichedZoneConfig {
    zoneCode: string;
    zoneName: string;
    region: string;
    selectedStates: string[];
    selectedCities: string[];
    pincodeCount: number;
    isComplete: boolean;
}

export interface EnrichmentResult {
    enrichedServiceability: ServiceabilityEntry[];
    zoneConfigs: EnrichedZoneConfig[];
    zoneCodes: string[];
    totalPincodes: number;
    enrichedPincodes: number;
    stats: {
        zonesFound: number;
        citiesFound: number;
        statesFound: number;
    };
}

/**
 * Enrich pincode data with zone/city/state information from the master database
 * This is the SMART autofill logic that auto-derives everything from pincodes
 */
export function enrichPincodeData(
    serviceability: ServiceabilityEntry[],
    existingZones?: string[]
): EnrichmentResult {
    console.group('🧠 [SmartEnrich] Starting pincode enrichment');
    console.log(`Input: ${serviceability.length} pincodes`);

    const enrichedServiceability: ServiceabilityEntry[] = [];
    const zoneDataMap = new Map<string, {
        states: Set<string>;
        cities: Set<string>;
        pincodes: Set<string>;
    }>();

    let enrichedCount = 0;

    // Process each pincode
    for (const entry of serviceability) {
        const pincode = String(entry.pincode).trim();
        if (!pincode || pincode.length !== 6) continue;

        // Try to get zone from entry first, then lookup
        let zone = entry.zone?.toUpperCase() || '';
        let state = entry.state || '';
        let city = entry.city || '';

        // If zone is missing, try to derive from pincode lookup
        if (!zone) {
            const lookupZone = zoneForPincode(pincode);
            if (lookupZone) {
                zone = String(lookupZone).toUpperCase();
            }
        }

        // If state is missing, try to derive
        if (!state) {
            const lookupState = stateForPincode(pincode);
            if (lookupState) {
                state = lookupState;
            }
        }

        // If city is missing, try to derive
        if (!city) {
            const lookupCity = cityForPincode(pincode);
            if (lookupCity) {
                city = lookupCity;
            }
        }

        // Only include if we have at least a zone
        if (zone) {
            enrichedCount++;

            // Add to zone data map
            if (!zoneDataMap.has(zone)) {
                zoneDataMap.set(zone, {
                    states: new Set(),
                    cities: new Set(),
                    pincodes: new Set()
                });
            }

            const zoneData = zoneDataMap.get(zone)!;
            zoneData.pincodes.add(pincode);
            if (state) zoneData.states.add(state);
            if (city) zoneData.cities.add(city);

            enrichedServiceability.push({
                pincode,
                zone,
                state,
                city,
                isODA: entry.isODA || false,
                active: entry.active !== false
            });
        }
    }

    // Build zone configs from accumulated data
    const zoneCodes = Array.from(zoneDataMap.keys()).sort();
    const zoneConfigs: EnrichedZoneConfig[] = zoneCodes.map(zoneCode => {
        const data = zoneDataMap.get(zoneCode)!;
        const states = Array.from(data.states);
        const cities = Array.from(data.cities);

        return {
            zoneCode,
            zoneName: zoneCode,
            region: zoneCode.startsWith('N') ? 'North' :
                zoneCode.startsWith('S') ? 'South' :
                    zoneCode.startsWith('E') ? 'East' :
                        zoneCode.startsWith('W') ? 'West' : 'Central',
            selectedStates: states,
            selectedCities: cities.map(c => `${c}||${states[0] || 'UNKNOWN'}`),
            pincodeCount: data.pincodes.size,
            isComplete: cities.length > 0  // Mark complete if we have city data
        };
    });

    const stats = {
        zonesFound: zoneCodes.length,
        citiesFound: zoneConfigs.reduce((sum, z) => sum + z.selectedCities.length, 0),
        statesFound: new Set(zoneConfigs.flatMap(z => z.selectedStates)).size
    };

    console.log(`✅ Enrichment complete:`);
    console.log(`   Zones: ${stats.zonesFound}`);
    console.log(`   Cities: ${stats.citiesFound}`);
    console.log(`   States: ${stats.statesFound}`);
    console.log(`   Enriched: ${enrichedCount}/${serviceability.length} pincodes`);
    console.groupEnd();

    return {
        enrichedServiceability,
        zoneConfigs,
        zoneCodes,
        totalPincodes: serviceability.length,
        enrichedPincodes: enrichedCount,
        stats
    };
}

/**
 * Check if vendor data is "rich" enough for smart autofill
 * Rich = has enough pincodes to derive zones/cities automatically
 */
export function isRichPincodeData(serviceability: ServiceabilityEntry[]): boolean {
    if (!serviceability || serviceability.length < 50) return false;

    // Check if we can derive zones for at least 50% of pincodes
    let derivableCount = 0;
    const sampleSize = Math.min(100, serviceability.length);

    for (let i = 0; i < sampleSize; i++) {
        const entry = serviceability[i];
        const pincode = String(entry.pincode).trim();
        if (entry.zone || zoneForPincode(pincode)) {
            derivableCount++;
        }
    }

    const derivablePercent = (derivableCount / sampleSize) * 100;
    console.log(`[SmartEnrich] Derivable: ${derivablePercent.toFixed(1)}% of sample`);

    return derivablePercent >= 50;
}