/**
 * Zone Assignment Service
 * 
 * This service handles the logic for assigning zones based on:
 * 1. zones_blueprint.json OR zones_data.json - Zone definitions, states, limited cities
 * 2. pincodes.json - Pincode to city/state mapping
 * 
 * Key Rules:
 * - Limited zones (NE1, N1, C1, E1, W1, S1) only apply to specific cities (capitalZones in blueprint)
 * - Full zones (NE2, N2, N3, C2, E2, W2, S2, S3, etc.) apply to entire states
 * - Siliguri (West Bengal) is a special case - can be in both NE1 and E1
 * - Zone selection must happen BEFORE city/state filling
 */

import type { ZoneConfig, RegionGroup, PincodeEntry } from '../types/wizard.types';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// New Blueprint format (from your Python script)
export interface ZoneBlueprint {
  meta: {
    source: string;
    version: string;
    generatedAt: string;
  };
  regions: Record<string, string[]>;
  zones: Record<string, ZoneBlueprintEntry>;
  stateIndex: Record<string, StateIndexEntry>;
}

export interface ZoneBlueprintEntry {
  region: string | null;
  rawEntries: Array<{
    state: string;
    cities: string[];
  }>;
}

export interface StateIndexEntry {
  zones: string[];
  capitalZones: string[]; // These are the "limited" zones for this state
}

// Legacy format (keeping for compatibility)
export interface ZoneData {
  meta: {
    version: string;
    generated: string;
    source: string;
  };
  regions: Record<string, string[]>;
  zones: Record<string, ZoneInfo>;
  states: Record<string, StateInfo>;
  zoneHierarchy: Record<string, string[]>;
  specialCases: Record<string, SpecialCityCase>;
}

export interface ZoneInfo {
  code: string;
  region: string;
  type: 'limited' | 'full' | 'special';
  remarks: string | null;
  states: string[];
  limitedCities: Record<string, string[]>;
}

export interface StateInfo {
  name: string;
  zones: string[];
  primaryZone: string;
}

export interface SpecialCityCase {
  state: string;
  city: string;
  zones: string[];
  note: string;
}

export interface ZoneSelectionResult {
  zoneCode: string;
  zoneName: string;
  region: RegionGroup;
  type: 'limited' | 'full' | 'special';
  applicableStates: string[];
  limitedCities: Record<string, string[]>;
}

export interface CityStateAssignment {
  city: string;
  state: string;
  zone: string;
  assignmentReason: 'limited_city' | 'full_state' | 'special_case';
}

// ============================================================================
// ZONE ASSIGNMENT SERVICE CLASS
// ============================================================================

export class ZoneAssignmentService {
  private blueprint: ZoneBlueprint | null = null;
  private zoneData: ZoneData | null = null;
  private pincodeData: PincodeEntry[] = [];
  private pincodeMap: Map<string, PincodeEntry> = new Map();
  private cityStateMap: Map<string, Set<string>> = new Map(); // state -> Set<city>
  private isLoaded = false;
  private useBlueprint = false; // Flag to track which format we're using

  /**
   * Initialize the service by loading data files
   */
  async initialize(): Promise<void> {
    if (this.isLoaded) return;

    try {
      // Try loading blueprint format first (your new format)
      try {
        const blueprintResponse = await fetch(`${import.meta.env.BASE_URL || '/'}zones_blueprint.json`);
        if (blueprintResponse.ok) {
          this.blueprint = await blueprintResponse.json();
          this.useBlueprint = true;
          console.log('[ZoneAssignmentService] Using zones_blueprint.json format');
        }
      } catch (e) {
        console.log('[ZoneAssignmentService] zones_blueprint.json not found, trying legacy format');
      }

      // Fall back to legacy zones_data.json
      if (!this.useBlueprint) {
        const zonesResponse = await fetch(`${import.meta.env.BASE_URL || '/'}zones_data.json`);
        this.zoneData = await zonesResponse.json();
        console.log('[ZoneAssignmentService] Using zones_data.json format');
      }

      // Load pincodes data
      const pincodesResponse = await fetch(`${import.meta.env.BASE_URL || '/'}pincodes.json`);
      this.pincodeData = await pincodesResponse.json();

      // Build lookup maps
      this.buildLookupMaps();
      this.isLoaded = true;

      console.log('[ZoneAssignmentService] Initialized:', {
        format: this.useBlueprint ? 'blueprint' : 'legacy',
        zones: this.useBlueprint 
          ? Object.keys(this.blueprint?.zones || {}).length 
          : Object.keys(this.zoneData?.zones || {}).length,
        states: this.useBlueprint
          ? Object.keys(this.blueprint?.stateIndex || {}).length
          : Object.keys(this.zoneData?.states || {}).length,
        pincodes: this.pincodeData.length,
      });
    } catch (error) {
      console.error('[ZoneAssignmentService] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Build lookup maps for fast access
   */
  private buildLookupMaps(): void {
    // Pincode map
    this.pincodeData.forEach(entry => {
      this.pincodeMap.set(String(entry.pincode), entry);
      
      // Build city-state map
      const state = this.normalizeStateName(entry.state);
      if (!this.cityStateMap.has(state)) {
        this.cityStateMap.set(state, new Set());
      }
      this.cityStateMap.get(state)!.add(entry.city.toUpperCase());
    });
  }

  /**
   * Normalize state names to match between pincodes.json and zones data
   */
  normalizeStateName(name: string): string {
    if (!name) return '';
    
    const normalized = name.trim().toUpperCase();
    
    const mappings: Record<string, string> = {
      'TAMILNADU': 'Tamil Nadu',
      'TAMIL NADU': 'Tamil Nadu',
      'CHATTISGARH': 'Chhattisgarh',
      'CHHATTISGARH': 'Chhattisgarh',
      'PUDDUCHERRY': 'Puducherry',
      'PUDUCHERRY': 'Puducherry',
      'PONDICHERRY': 'Puducherry',
      'JAMMU & KASHMIR': 'Jammu and Kashmir',
      'JAMMU AND KASHMIR': 'Jammu and Kashmir',
      'DAMAN & DIU': 'Daman and Diu',
      'DAMAN AND DIU': 'Daman and Diu',
      'DADRA & NAGAR HAVELI': 'Dadra and Nagar Haveli',
      'DADRA AND NAGAR HAVELI': 'Dadra and Nagar Haveli',
      'DADRA NAGAR HAVELI': 'Dadra and Nagar Haveli',
      'ANDAMAN & NICOBAR': 'Andaman and Nicobar',
      'ANDAMAN AND NICOBAR': 'Andaman and Nicobar',
      'ANDAMAN NICOBAR': 'Andaman and Nicobar',
      'LAKSHADWEEP': 'Lakshadweep',
      'LAKSHADEEP': 'Lakshadweep',
      'NCT OF DELHI': 'Delhi',
      'NEW DELHI': 'Delhi',
      'DELHI': 'Delhi',
      'ORISSA': 'Odisha',
      'ODISHA': 'Odisha',
    };

    // Check exact match first
    if (mappings[normalized]) {
      return mappings[normalized];
    }

    // Title case the original
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Normalize city name for matching
   */
  normalizeCityName(name: string): string {
    if (!name) return '';
    
    const normalized = name.trim().toUpperCase();
    
    // Common city name variations
    const mappings: Record<string, string> = {
      'BENGALURU': 'BANGALORE',
      'BANGALORE': 'BANGALORE',
      'BOMBAY': 'MUMBAI',
      'MUMBAI': 'MUMBAI',
      'CALCUTTA': 'KOLKATA',
      'KOLKATA': 'KOLKATA',
      'MADRAS': 'CHENNAI',
      'CHENNAI': 'CHENNAI',
      'GURUGRAM': 'GURUGRAM',
      'GURGAON': 'GURUGRAM',
      'BHUBANESWAR': 'BHUBANESHWAR',
      'BHUBANESHWAR': 'BHUBANESHWAR',
    };

    return mappings[normalized] || normalized;
  }

  /**
   * Get all available regions
   */
  getRegions(): Record<string, string[]> {
    if (this.useBlueprint && this.blueprint) {
      return this.blueprint.regions;
    }
    return this.zoneData?.regions || {};
  }

  /**
   * Get zone info by code (adapts to both formats)
   */
  getZoneInfo(zoneCode: string): ZoneInfo | null {
    if (this.useBlueprint && this.blueprint) {
      const bpZone = this.blueprint.zones[zoneCode];
      if (!bpZone) return null;
      
      // Convert blueprint format to ZoneInfo
      const states: string[] = [];
      const limitedCities: Record<string, string[]> = {};
      let isLimited = false;
      
      bpZone.rawEntries.forEach(entry => {
        if (entry.state === 'Limited Cities') {
          isLimited = true;
          return;
        }
        if (entry.state === 'Within City' || entry.state === '34 States') {
          return; // Skip special markers
        }
        
        const normalizedState = this.normalizeStateName(entry.state);
        if (!states.includes(normalizedState)) {
          states.push(normalizedState);
        }
        
        if (entry.cities && entry.cities.length > 0) {
          limitedCities[normalizedState] = entry.cities;
        }
      });
      
      // Also check stateIndex for capitalZones to determine if this is a limited zone
      const statesWithThisAsCapital = Object.entries(this.blueprint.stateIndex)
        .filter(([_, info]) => info.capitalZones.includes(zoneCode))
        .map(([state]) => state);
      
      if (statesWithThisAsCapital.length > 0) {
        isLimited = true;
      }
      
      return {
        code: zoneCode,
        region: bpZone.region || this.getRegionFromCode(zoneCode),
        type: isLimited ? 'limited' : (zoneCode === 'ROI' || zoneCode === 'A' ? 'special' : 'full'),
        remarks: isLimited ? 'Limited Cities' : null,
        states,
        limitedCities,
      };
    }
    
    return this.zoneData?.zones[zoneCode] || null;
  }

  /**
   * Infer region from zone code
   */
  private getRegionFromCode(code: string): string {
    if (code.startsWith('NE')) return 'North East';
    if (code.startsWith('N')) return 'North';
    if (code.startsWith('S')) return 'South';
    if (code.startsWith('E')) return 'East';
    if (code.startsWith('W')) return 'West';
    if (code.startsWith('C')) return 'Central';
    return 'Other';
  }

  /**
   * Get all zones for a region
   */
  getZonesForRegion(region: string): ZoneInfo[] {
    const zoneCodes = this.getRegions()[region] || [];
    return zoneCodes.map(code => this.getZoneInfo(code)).filter(Boolean) as ZoneInfo[];
  }

  /**
   * Get states for a zone
   */
  getStatesForZone(zoneCode: string): string[] {
    const zoneInfo = this.getZoneInfo(zoneCode);
    return zoneInfo?.states || [];
  }

  /**
   * Check if a zone is limited (city-specific)
   */
  isLimitedZone(zoneCode: string): boolean {
    const zoneInfo = this.getZoneInfo(zoneCode);
    return zoneInfo?.type === 'limited';
  }

  /**
   * Get limited cities for a zone
   */
  getLimitedCitiesForZone(zoneCode: string): Record<string, string[]> {
    const zoneInfo = this.getZoneInfo(zoneCode);
    return zoneInfo?.limitedCities || {};
  }

  /**
   * Get all cities from pincodes.json for a given state
   */
  getCitiesForState(state: string): string[] {
    const normalizedState = this.normalizeStateName(state);
    const cities = new Set<string>();
    
    this.pincodeData.forEach(entry => {
      if (this.normalizeStateName(entry.state) === normalizedState) {
        cities.add(entry.city);
      }
    });

    return Array.from(cities).sort();
  }

  /**
   * Get all pincodes for a city+state combination
   */
  getPincodesForCity(city: string, state: string): string[] {
    const normalizedState = this.normalizeStateName(state);
    const normalizedCity = this.normalizeCityName(city);
    
    return this.pincodeData
      .filter(entry => 
        this.normalizeStateName(entry.state) === normalizedState &&
        this.normalizeCityName(entry.city) === normalizedCity
      )
      .map(entry => String(entry.pincode));
  }

  /**
   * Check if a city is valid for a zone (for limited zones)
   */
  isCityValidForZone(city: string, state: string, zoneCode: string): boolean {
    const zoneInfo = this.getZoneInfo(zoneCode);
    if (!zoneInfo) return false;

    // Full zones accept any city in their states
    if (zoneInfo.type === 'full') {
      const normalizedState = this.normalizeStateName(state);
      return zoneInfo.states.some(s => 
        this.normalizeStateName(s) === normalizedState
      );
    }

    // Limited zones only accept specific cities
    if (zoneInfo.type === 'limited') {
      const normalizedCity = this.normalizeCityName(city);
      const limitedCities = zoneInfo.limitedCities;
      
      for (const [zoneState, cities] of Object.entries(limitedCities)) {
        if (this.normalizeStateName(zoneState) === this.normalizeStateName(state)) {
          const normalizedLimitedCities = cities.map(c => this.normalizeCityName(c));
          if (normalizedLimitedCities.includes(normalizedCity)) {
            return true;
          }
        }
      }
      return false;
    }

    return false;
  }

  /**
   * Get the appropriate zone for a city+state using blueprint's stateIndex
   */
  getZoneForCityState(city: string, state: string): { zone: string; reason: string } | null {
    const normalizedState = this.normalizeStateName(state);
    const normalizedCity = this.normalizeCityName(city);
    const upperState = normalizedState.toUpperCase();
    
    // Special case: Siliguri
    if (normalizedCity === 'SILIGURI' && upperState.includes('WEST BENGAL')) {
      return { 
        zone: 'NE1', // or E1, user can choose
        reason: 'Special case: Siliguri can be in NE1 or E1' 
      };
    }

    if (this.useBlueprint && this.blueprint) {
      const stateInfo = this.blueprint.stateIndex[upperState];
      if (!stateInfo) return null;
      
      // Check if this city is in a capitalZone (limited zone)
      for (const capitalZone of stateInfo.capitalZones) {
        const zoneInfo = this.getZoneInfo(capitalZone);
        if (zoneInfo?.limitedCities[normalizedState]) {
          const zoneCities = zoneInfo.limitedCities[normalizedState].map(c => this.normalizeCityName(c));
          if (zoneCities.includes(normalizedCity)) {
            return {
              zone: capitalZone,
              reason: `Limited zone match: ${city} is a capital city in ${capitalZone}`
            };
          }
        }
      }
      
      // Fall back to first non-capital zone
      const fallbackZone = stateInfo.zones.find(z => !stateInfo.capitalZones.includes(z));
      if (fallbackZone) {
        return {
          zone: fallbackZone,
          reason: `Full zone: ${state} → ${fallbackZone}`
        };
      }
      
      // Use first zone as last resort
      return {
        zone: stateInfo.zones[0],
        reason: `Primary zone for ${state}`
      };
    }

    // Legacy format handling
    const stateInfo = this.zoneData?.states[normalizedState];
    if (!stateInfo) return null;

    // Check limited zones first
    for (const zoneCode of stateInfo.zones) {
      const zoneInfo = this.getZoneInfo(zoneCode);
      if (zoneInfo?.type === 'limited') {
        if (this.isCityValidForZone(city, state, zoneCode)) {
          return { 
            zone: zoneCode, 
            reason: `Limited zone match: ${city} is in ${zoneCode}` 
          };
        }
      }
    }

    // Fall back to first full zone
    for (const zoneCode of stateInfo.zones) {
      const zoneInfo = this.getZoneInfo(zoneCode);
      if (zoneInfo?.type === 'full') {
        return { 
          zone: zoneCode, 
          reason: `Full zone: ${state} → ${zoneCode}` 
        };
      }
    }

    return { 
      zone: stateInfo.primaryZone, 
      reason: `Primary zone for ${state}` 
    };
  }

  /**
   * Get all zones available for a state (from blueprint's stateIndex)
   */
  getZonesForState(state: string): { zones: string[]; capitalZones: string[] } {
    const upperState = state.toUpperCase();
    
    if (this.useBlueprint && this.blueprint) {
      const stateInfo = this.blueprint.stateIndex[upperState];
      if (stateInfo) {
        return {
          zones: stateInfo.zones,
          capitalZones: stateInfo.capitalZones
        };
      }
    }
    
    // Legacy fallback
    const normalizedState = this.normalizeStateName(state);
    const stateInfo = this.zoneData?.states[normalizedState];
    if (stateInfo) {
      return {
        zones: stateInfo.zones,
        capitalZones: stateInfo.zones.filter(z => this.isLimitedZone(z))
      };
    }
    
    return { zones: [], capitalZones: [] };
  }

  /**
   * Build zone configuration for selected zones
   * This populates cities/states based on zone selection
   */
  buildZoneConfig(selectedZoneCodes: string[]): ZoneConfig[] {
    const configs: ZoneConfig[] = [];

    for (const zoneCode of selectedZoneCodes) {
      const zoneInfo = this.getZoneInfo(zoneCode);
      if (!zoneInfo) continue;

      const config: ZoneConfig = {
        zoneCode,
        zoneName: zoneCode,
        region: zoneInfo.region as RegionGroup,
        selectedStates: [],
        selectedCities: [], // Format: "city||state"
        isComplete: false,
      };

      // For limited zones, only add the specific cities
      if (zoneInfo.type === 'limited') {
        for (const [state, cities] of Object.entries(zoneInfo.limitedCities)) {
          const normalizedState = this.normalizeStateName(state);
          config.selectedStates.push(normalizedState);
          
          for (const city of cities) {
            config.selectedCities.push(`${city}||${normalizedState}`);
          }
        }
        config.isComplete = config.selectedCities.length > 0;
      }
      // For full zones, add all cities from all states
      else if (zoneInfo.type === 'full') {
        for (const state of zoneInfo.states) {
          const normalizedState = this.normalizeStateName(state);
          config.selectedStates.push(normalizedState);
          
          // Get all cities for this state from pincodes
          const cities = this.getCitiesForState(normalizedState);
          for (const city of cities) {
            config.selectedCities.push(`${city}||${normalizedState}`);
          }
        }
        config.isComplete = config.selectedCities.length > 0;
      }

      configs.push(config);
    }

    return configs;
  }

  /**
   * Get recommended zones based on user's selected regions
   */
  getRecommendedZones(selectedRegions: string[]): string[] {
    const recommended: string[] = [];
    const regions = this.getRegions();
    
    for (const region of selectedRegions) {
      const zones = regions[region] || [];
      recommended.push(...zones);
    }

    return recommended;
  }

  /**
   * Validate zone selection - ensure no state conflicts
   */
  validateZoneSelection(selectedZones: string[]): { 
    isValid: boolean; 
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check for overlapping states
    const stateAssignments: Map<string, string[]> = new Map();
    
    for (const zoneCode of selectedZones) {
      const states = this.getStatesForZone(zoneCode);
      for (const state of states) {
        if (!stateAssignments.has(state)) {
          stateAssignments.set(state, []);
        }
        stateAssignments.get(state)!.push(zoneCode);
      }
    }

    // Check for states in multiple zones
    for (const [state, zones] of stateAssignments.entries()) {
      if (zones.length > 1) {
        const hasLimited = zones.some(z => this.isLimitedZone(z));
        const hasFull = zones.some(z => !this.isLimitedZone(z));
        
        if (hasLimited && hasFull) {
          warnings.push(`${state} is in both limited (${zones.filter(z => this.isLimitedZone(z)).join(', ')}) and full (${zones.filter(z => !this.isLimitedZone(z)).join(', ')}) zones. Limited zone cities will be prioritized.`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors,
    };
  }

  /**
   * Get data export for debugging
   */
  getDebugData(): { blueprint: ZoneBlueprint | null; zoneData: ZoneData | null; pincodeCount: number; useBlueprint: boolean } {
    return {
      blueprint: this.blueprint,
      zoneData: this.zoneData,
      pincodeCount: this.pincodeData.length,
      useBlueprint: this.useBlueprint,
    };
  }
}

// Export singleton instance
export const zoneAssignmentService = new ZoneAssignmentService();
