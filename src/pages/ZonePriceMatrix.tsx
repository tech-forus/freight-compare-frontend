import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, ChevronRight, MapPin, Sparkles, AlertTriangle, Lock, Globe, Ban, FileSpreadsheet, X } from "lucide-react";
import { useWizardStorage } from "../hooks/useWizardStorage";
import type { ZoneConfig, RegionGroup, PincodeEntry } from "../types/wizard.types";
import DecimalInput from "../components/DecimalInput";

/* =========================================================
   LOCKED ZONE CONSTANTS
   ======================================================= */
const LOCKED_ZONE_ORDER = ['N1', 'N2', 'N3', 'N4', 'C1', 'C2', 'E1', 'E2', 'W1', 'W2', 'S1', 'S2', 'S3', 'S4', 'NE1', 'NE2', 'X1', 'X2', 'X3'];
const LOCKED_REGION_GROUPS: Record<RegionGroup, string[]> = {
  North: ["N1", "N2", "N3", "N4"], Central: ["C1", "C2"], East: ["E1", "E2"],
  West: ["W1", "W2"], South: ["S1", "S2", "S3", "S4"], Northeast: ["NE1", "NE2"], Special: ["X1", "X2", "X3"],
};

// Special zones can be selected in ANY order
const SPECIAL_ZONES = ["X1", "X2", "X3"];
const SPECIAL_ZONE_INFO: Record<string, string> = { 'X1': 'Andaman & Nicobar Islands', 'X2': 'Lakshadweep', 'X3': 'Leh Ladakh' };

const REGION_ORDER: RegionGroup[] = ["North", "Central", "East", "West", "South", "Northeast", "Special"];
const ZONE_TYPE_INFO: Record<string, { type: string; description: string }> = {
  'N1': { type: 'limited', description: 'Metro cities (Delhi NCR, Jaipur)' },
  'N2': { type: 'full', description: 'Tier 2 North' }, 'N3': { type: 'full', description: 'Extended North' },
  'N4': { type: 'full', description: 'Remote North' }, 'C1': { type: 'limited', description: 'Metro (Indore, Bhopal)' },
  'C2': { type: 'full', description: 'All MP & Chhattisgarh' }, 'E1': { type: 'limited', description: 'Metro (Kolkata, Patna)' },
  'E2': { type: 'full', description: 'All East' }, 'W1': { type: 'limited', description: 'Metro (Mumbai, Pune)' },
  'W2': { type: 'full', description: 'All West' }, 'S1': { type: 'limited', description: 'Metro (Bangalore, Chennai)' },
  'S2': { type: 'full', description: 'Tier 2 South' }, 'S3': { type: 'full', description: 'Kerala & TN' },
  'S4': { type: 'full', description: 'Remote Kerala' }, 'NE1': { type: 'limited', description: 'Metro (Guwahati)' },
  'NE2': { type: 'full', description: 'All NE states' }, 'X1': { type: 'special', description: 'Andaman Nicobar' },
  'X2': { type: 'special', description: 'Lakshadweep' }, 'X3': { type: 'special', description: 'Leh Ladakh' },
};
const MAX_ZONES = 19;

type WarningModalType = 'exhaustion' | 'no-cities-available' | 'zone-disabled-info' | 'empty-zone-continue';
interface WarningModalState { isOpen: boolean; type: WarningModalType; message: string; affectedZones: string[]; region: RegionGroup | null; stats: { totalCities: number; assignedCities: number; availableCities: number } | null; }
interface ZoneBlueprint { meta: any; regions: Record<string, string[]>; zoneOrder: string[]; zones: Record<string, { region: string; type: string; preference: number; rawEntries: Array<{ state: string; cities: string[] }> }>; stateIndex: Record<string, any>; }

/* =========================================================
   HELPER FUNCTIONS
   ======================================================= */
const codeToRegion = (code: string): RegionGroup => {
  if (code.startsWith("NE")) return "Northeast";
  if (code.startsWith("X")) return "Special";
  const c = code.charAt(0);
  if (c === "N") return "North"; if (c === "S") return "South"; if (c === "E") return "East";
  if (c === "W") return "West"; if (c === "C") return "Central";
  return "North";
};
const sortZonesByOrder = (zones: string[]): string[] => [...zones].sort((a, b) => LOCKED_ZONE_ORDER.indexOf(a) - LOCKED_ZONE_ORDER.indexOf(b));
const csKey = (city: string, state: string) => `${city}||${state}`;
const parseCsKey = (key: string) => { const i = key.lastIndexOf("||"); return { city: key.slice(0, i), state: key.slice(i + 2) }; };
const getSubzoneNumber = (zone: string): number => { const m = zone.match(/(\d+)$/); return m ? parseInt(m[1], 10) : 0; };

// Special zones can be selected in ANY order
const canSelectZoneInSequence = (zone: string, selectedZones: string[]): boolean => {
  if (SPECIAL_ZONES.includes(zone)) return true;
  const region = codeToRegion(zone);
  const regionZones = LOCKED_REGION_GROUPS[region];
  const selectedInRegion = selectedZones.filter(z => regionZones.includes(z));
  if (selectedInRegion.length === 0) return zone === regionZones[0];
  const maxIndex = Math.max(...selectedInRegion.map(z => regionZones.indexOf(z)));
  return regionZones.indexOf(zone) === maxIndex + 1;
};

// 🔥 BULLETPROOF: Check if zone has cities - handles all edge cases
const zoneHasCities = (zone: ZoneConfig | undefined | null): boolean => {
  if (!zone) return false;
  if (!zone.selectedCities) return false;
  if (!Array.isArray(zone.selectedCities)) return false;
  return zone.selectedCities.length > 0;
};

/* =========================================================
   MAIN COMPONENT
   ======================================================= */
const ZonePriceMatrix: React.FC = () => {
  const navigate = useNavigate();
  const { wizardData, updateZones, updatePriceMatrix, isLoaded } = useWizardStorage();
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: "smooth" }); }, []);

  const [pincodeData, setPincodeData] = useState<PincodeEntry[]>([]);
  const [blueprint, setBlueprint] = useState<ZoneBlueprint | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [currentStep, setCurrentStep] = useState<"select-zones" | "configure-zones" | "price-matrix">("select-zones");
  const [selectedZoneCodes, setSelectedZoneCodes] = useState<string[]>([]);
  const [zoneConfigs, setZoneConfigs] = useState<ZoneConfig[]>([]);
  const [currentZoneIndex, setCurrentZoneIndex] = useState(0);
  const [activeStateByZone, setActiveStateByZone] = useState<Record<string, string | null>>({});
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [warningModal, setWarningModal] = useState<WarningModalState>({ isOpen: false, type: 'exhaustion', message: '', affectedZones: [], region: null, stats: null });
  const warningResolverRef = useRef<((result: 'continue' | 'delete' | 'cancel' | 'back') => void) | null>(null);
  const [bulkPasteModal, setBulkPasteModal] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");

  /* -------------------- Load Data -------------------- */
  useEffect(() => {
    const loadData = async () => {
      try {
        const pRes = await fetch(`${import.meta.env.BASE_URL || "/"}pincodes.json`);
        const pJson = await pRes.json();
        const filtered = (Array.isArray(pJson) ? pJson : []).filter((e: PincodeEntry) => e.state && e.city && e.state !== "NAN" && e.city !== "NAN" && e.pincode && /^\d{6}$/.test(String(e.pincode)));
        setPincodeData(filtered);
        const bRes = await fetch(`${import.meta.env.BASE_URL || "/"}zones_blueprint.json`);
        setBlueprint(await bRes.json());
      } catch (err) { console.error("Load error:", err); }
      finally { setIsLoadingData(false); }
    };
    loadData();
  }, []);

  /* -------------------- Load from Storage -------------------- */
  useEffect(() => {
    if (!isLoaded) return;
    if (wizardData.zones?.length > 0) {
      const sorted = [...wizardData.zones].sort((a, b) => LOCKED_ZONE_ORDER.indexOf(a.zoneCode) - LOCKED_ZONE_ORDER.indexOf(b.zoneCode));
      setZoneConfigs(sorted);
      setSelectedZoneCodes(sorted.map(z => z.zoneCode));

      // 🔥 SMART: Check if we should go to price matrix
      if (wizardData.priceMatrix && Object.keys(wizardData.priceMatrix).length > 0) {
        // Already has price matrix - go directly to price matrix
        setCurrentStep("price-matrix");
      } else {
        // Check if Quick Lookup data is complete (all zones have selectedCities)
        const allZonesHaveData = sorted.length > 0 && sorted.every(z => z.isComplete && zoneHasCities(z));

        if (allZonesHaveData) {
          // Quick Lookup completed - skip manual configuration and go to price matrix
          console.log('🔥 [Smart Step Detection] Quick Lookup data detected - all zones are complete');
          setCurrentStep("price-matrix");
        } else if (sorted.some(z => z.isComplete && zoneHasCities(z))) {
          // Some zones configured - show configuration view
          setCurrentStep("configure-zones");
        }
      }
    }
  }, [isLoaded, wizardData]);

  /* -------------------- Derived Data -------------------- */
  const byStateByRegion = useMemo(() => {
    const map = new Map<RegionGroup, Map<string, Set<string>>>();
    REGION_ORDER.forEach(r => map.set(r, new Map()));
    for (const e of pincodeData) {
      const region = codeToRegion(e.zone || "");
      const stateMap = map.get(region);
      // Normalize state names to UPPERCASE for consistent lookups
      const normalizedState = e.state?.toUpperCase().trim() || e.state;
      const normalizedCity = e.city?.toUpperCase().trim() || e.city;
      if (stateMap) {
        if (!stateMap.has(normalizedState)) stateMap.set(normalizedState, new Set());
        stateMap.get(normalizedState)!.add(normalizedCity);
      }
    }
    return map;
  }, [pincodeData]);

  const getAllCityKeysForState = useCallback((state: string, region: RegionGroup): string[] => {
    const cities = byStateByRegion.get(region)?.get(state);
    return cities ? Array.from(cities).map(c => csKey(c, state)) : [];
  }, [byStateByRegion]);

  // NEW: Get all cities for a state, but only from the specified zone (for special zones)
  const getAllCitiesForStateInZone = useCallback((stateName: string, zoneCode: string): string[] => {
    const normalizedStateName = stateName.toUpperCase().trim();
    const results: string[] = [];
    const seenCities = new Set<string>(); // Prevent duplicates

    console.log('[Special Zone Debug] Looking for state:', stateName, 'in zone:', zoneCode, '(normalized:', normalizedStateName, ')');

    // Get the zone's expected region
    const zoneRegion = codeToRegion(zoneCode);
    const stateMap = byStateByRegion.get(zoneRegion);

    if (!stateMap) {
      console.log('[Special Zone Debug] No states found in region:', zoneRegion);
      return results;
    }

    // First: try EXACT match in the zone's region
    if (stateMap.has(stateName)) {
      const cities = stateMap.get(stateName)!;
      console.log(`[Special Zone Debug] EXACT match in ${zoneRegion}: "${stateName}" has ${cities.size} cities`);
      cities.forEach(city => {
        const key = csKey(city, stateName);
        if (!seenCities.has(key)) {
          results.push(key);
          seenCities.add(key);
        }
      });
      return results;
    }

    // Second: try case-insensitive exact match in the zone's region
    for (const [state, cities] of stateMap.entries()) {
      if (state.toUpperCase().trim() === normalizedStateName) {
        console.log(`[Special Zone Debug] CASE-INSENSITIVE match in ${zoneRegion}: "${state}" has ${cities.size} cities`);
        cities.forEach(city => {
          const key = csKey(city, state);
          if (!seenCities.has(key)) {
            results.push(key);
            seenCities.add(key);
          }
        });
        return results;
      }
    }

    console.log('[Special Zone Debug] Total cities found:', results.length);
    return results;
  }, [byStateByRegion]);

  // OLD: Get all cities for a state by searching ALL regions (for special zones) - kept for backward compatibility
  const getAllCitiesForStateAnyRegion = useCallback((stateName: string): string[] => {
    const normalizedStateName = stateName.toUpperCase().trim();
    const results: string[] = [];
    const seenCities = new Set<string>(); // Prevent duplicates

    console.log('[Special Zone Debug] Looking for state:', stateName, '(normalized:', normalizedStateName, ')');

    // First: try EXACT match (the stateName might already be the exact key)
    for (const [region, stateMap] of byStateByRegion.entries()) {
      if (stateMap.has(stateName)) {
        const cities = stateMap.get(stateName)!;
        console.log(`[Special Zone Debug] EXACT match in ${region}: "${stateName}" has ${cities.size} cities`);
        cities.forEach(city => {
          const key = csKey(city, stateName);
          if (!seenCities.has(key)) {
            results.push(key);
            seenCities.add(key);
          }
        });
        return results;
      }
    }

    // Second: try case-insensitive exact match
    for (const [region, stateMap] of byStateByRegion.entries()) {
      for (const [state, cities] of stateMap.entries()) {
        if (state.toUpperCase().trim() === normalizedStateName) {
          console.log(`[Special Zone Debug] CASE-INSENSITIVE match in ${region}: "${state}" has ${cities.size} cities`);
          cities.forEach(city => {
            const key = csKey(city, state);
            if (!seenCities.has(key)) {
              results.push(key);
              seenCities.add(key);
            }
          });
          // Return after first case-insensitive match to avoid duplicates
          return results;
        }
      }
    }

    // Third: fuzzy match as last resort (but don't let it accumulate duplicates)
    for (const [region, stateMap] of byStateByRegion.entries()) {
      for (const [state, cities] of stateMap.entries()) {
        const stateNormalized = state.toUpperCase().trim();
        if (stateNormalized.includes(normalizedStateName.split(' ')[0]) ||
          normalizedStateName.includes(stateNormalized.split(' ')[0])) {
          console.log(`[Special Zone Debug] FUZZY match in ${region}: "${state}" has ${cities.size} cities`);
          cities.forEach(city => {
            const key = csKey(city, state);
            if (!seenCities.has(key)) {
              results.push(key);
              seenCities.add(key);
            }
          });
        }
      }
    }

    console.log('[Special Zone Debug] Total cities found:', results.length);
    return results;
  }, [byStateByRegion]);

  const getUsedCities = useCallback((excludeIdx?: number): Set<string> => {
    const used = new Set<string>();
    zoneConfigs.forEach((z, idx) => { if (idx !== excludeIdx && z.selectedCities) z.selectedCities.forEach(c => used.add(c)); });
    return used;
  }, [zoneConfigs]);

  const getAvailableCityKeys = useCallback((state: string, region: RegionGroup, zoneIdx: number): string[] => {
    const all = getAllCityKeysForState(state, region);
    const used = getUsedCities(zoneIdx);
    return all.filter(k => !used.has(k));
  }, [getAllCityKeysForState, getUsedCities]);

  const currentConfig = zoneConfigs[currentZoneIndex];

  const getTotalCitiesInRegion = useCallback((region: RegionGroup): number => {
    const sm = byStateByRegion.get(region); let t = 0; sm?.forEach(c => t += c.size); return t;
  }, [byStateByRegion]);

  const getAssignedCitiesInRegion = useCallback((region: RegionGroup): number => {
    const used = new Set<string>();
    zoneConfigs.forEach(z => { if (codeToRegion(z.zoneCode) === region && z.selectedCities) z.selectedCities.forEach(c => used.add(c)); });
    return used.size;
  }, [zoneConfigs]);

  const availableStates = useMemo(() => {
    if (!currentConfig) return [];

    // For special zones (X1, X2, X3), show ALL states with cities (no filtering by used)
    if (SPECIAL_ZONES.includes(currentConfig.zoneCode)) {
      const zoneInfo = blueprint?.zones[currentConfig.zoneCode];
      // Try blueprint first, then fall back to SPECIAL_ZONE_INFO
      const specialStateName = zoneInfo?.rawEntries?.[0]?.state || SPECIAL_ZONE_INFO[currentConfig.zoneCode];

      if (specialStateName) {
        // Normalize state name for matching
        const normalizedState = specialStateName.toUpperCase().trim();

        // 🔥 IMPROVED: Get cities from blueprint, then search in byStateByRegion for the actual state key
        const blueprintCities = zoneInfo?.rawEntries?.[0]?.cities || [];
        const matchedStates = new Set<string>();

        console.log(`[availableStates Debug] Zone ${currentConfig.zoneCode}, looking for state: "${specialStateName}" (normalized: "${normalizedState}")`);
        console.log(`[availableStates Debug] Blueprint cities count: ${blueprintCities.length}`);

        // First: look for exact match in byStateByRegion (across ALL regions for special zones)
        for (const [region, stateMap] of byStateByRegion.entries()) {
          if (stateMap.has(normalizedState)) {
            const citiesInState = stateMap.get(normalizedState)?.size || 0;
            console.log(`[availableStates Debug] EXACT match in ${region}: has ${citiesInState} cities`);
            matchedStates.add(normalizedState);
          }
          // Then: look for case-insensitive match
          for (const [state, cities] of stateMap.entries()) {
            if (state.toUpperCase().trim() === normalizedState) {
              console.log(`[availableStates Debug] CASE-INSENSITIVE match in ${region}: "${state}" has ${cities.size} cities`);
              matchedStates.add(state);
            }
          }
        }

        console.log(`[availableStates Debug] Final matched states:`, Array.from(matchedStates));
        // Return matched states (usually just 1, the correct one)
        return Array.from(matchedStates).sort();
      }
      return [];
    }

    // For regular zones, show all states in the region
    const sm = byStateByRegion.get(currentConfig.region);
    if (!sm) return [];
    const states: string[] = [];
    sm.forEach((_, state) => { if (getAvailableCityKeys(state, currentConfig.region, currentZoneIndex).length > 0) states.push(state); });
    return states.sort();
  }, [currentConfig, byStateByRegion, currentZoneIndex, getAvailableCityKeys, blueprint]);

  // 🔥 BULLETPROOF: Active vs inactive zones with explicit checks
  const activeZones = useMemo(
    () => zoneConfigs.filter(z => zoneHasCities(z)),
    [zoneConfigs]
  );

  const inactiveZones = useMemo(
    () => zoneConfigs.filter(z => !zoneHasCities(z)),
    [zoneConfigs]
  );

  // 🔥 BULLETPROOF: Check if zone is empty
  const isZoneEmpty = useCallback((code: string): boolean => {
    const cfg = zoneConfigs.find(z => z.zoneCode === code);
    return !zoneHasCities(cfg);
  }, [zoneConfigs]);

  // 🔥 BULLETPROOF: Get active zone codes set for fast lookup
  const activeZoneCodes = useMemo(
    () => new Set(activeZones.map(z => z.zoneCode)),
    [activeZones]
  );

  /* -------------------- Warning Modal -------------------- */
  const showWarning = useCallback((type: WarningModalType, zones: string[], region: RegionGroup): Promise<'continue' | 'delete' | 'cancel' | 'back'> => {
    return new Promise(resolve => {
      const total = getTotalCitiesInRegion(region), assigned = getAssignedCitiesInRegion(region);
      let msg = type === 'empty-zone-continue' ? `${zones.length} zone(s) have no cities and will be excluded from pricing.` : `Zone(s) ${zones.join(', ')} have no cities.`;
      warningResolverRef.current = resolve;
      setWarningModal({ isOpen: true, type, message: msg, affectedZones: zones, region, stats: { totalCities: total, assignedCities: assigned, availableCities: total - assigned } });
    });
  }, [getTotalCitiesInRegion, getAssignedCitiesInRegion]);

  const closeWarningModal = useCallback((result: 'continue' | 'delete' | 'cancel' | 'back') => {
    setWarningModal(p => ({ ...p, isOpen: false }));
    if (warningResolverRef.current) { warningResolverRef.current(result); warningResolverRef.current = null; }
  }, []);

  /* -------------------- Zone Selection -------------------- */
  const toggleZoneSelection = useCallback((code: string) => {
    const isSelected = selectedZoneCodes.includes(code);
    if (isSelected) {
      if (!SPECIAL_ZONES.includes(code)) {
        const region = codeToRegion(code);
        const regionZones = LOCKED_REGION_GROUPS[region];
        const selInReg = selectedZoneCodes.filter(z => regionZones.includes(z));
        const indices = selInReg.map(z => regionZones.indexOf(z)).sort((a, b) => a - b);
        if (regionZones.indexOf(code) !== Math.max(...indices)) {
          alert("Can only deselect from end of sequence.");
          return;
        }
      }
      setSelectedZoneCodes(sortZonesByOrder(selectedZoneCodes.filter(c => c !== code)));
      setZoneConfigs(old => old.filter(z => z.zoneCode !== code));
    } else {
      if (!canSelectZoneInSequence(code, selectedZoneCodes)) {
        alert("Select zones in order within each region. (Special zones X1/X2/X3 can be selected in any order)");
        return;
      }
      setSelectedZoneCodes(sortZonesByOrder([...selectedZoneCodes, code]));
      setZoneConfigs(old => {
        if (old.find(z => z.zoneCode === code)) return old;
        return [...old, { zoneCode: code, zoneName: code, region: codeToRegion(code), selectedStates: [], selectedCities: [], isComplete: false }].sort((a, b) => LOCKED_ZONE_ORDER.indexOf(a.zoneCode) - LOCKED_ZONE_ORDER.indexOf(b.zoneCode));
      });
    }
  }, [selectedZoneCodes]);

  const selectAllInRegion = useCallback((region: RegionGroup) => {
    const rz = LOCKED_REGION_GROUPS[region];
    const others = selectedZoneCodes.filter(z => !rz.includes(z));
    setSelectedZoneCodes(sortZonesByOrder([...others, ...rz]));
    setZoneConfigs(old => {
      const existing = old.filter(z => !rz.includes(z.zoneCode));
      const newZones = rz.map(code => old.find(z => z.zoneCode === code) || { zoneCode: code, zoneName: code, region: codeToRegion(code), selectedStates: [], selectedCities: [], isComplete: false });
      return [...existing, ...newZones].sort((a, b) => LOCKED_ZONE_ORDER.indexOf(a.zoneCode) - LOCKED_ZONE_ORDER.indexOf(b.zoneCode));
    });
  }, [selectedZoneCodes]);

  const deselectAllInRegion = useCallback((region: RegionGroup) => {
    setSelectedZoneCodes(sortZonesByOrder(selectedZoneCodes.filter(z => !LOCKED_REGION_GROUPS[region].includes(z))));
    setZoneConfigs(old => old.filter(z => !LOCKED_REGION_GROUPS[region].includes(z.zoneCode)));
  }, [selectedZoneCodes]);

  const selectAllZones = useCallback(() => {
    setSelectedZoneCodes([...LOCKED_ZONE_ORDER]);
    setZoneConfigs(LOCKED_ZONE_ORDER.map(code => zoneConfigs.find(z => z.zoneCode === code) || { zoneCode: code, zoneName: code, region: codeToRegion(code), selectedStates: [], selectedCities: [], isComplete: false }));
  }, [zoneConfigs]);

  const deselectAllZones = useCallback(() => { setSelectedZoneCodes([]); setZoneConfigs([]); }, []);

  const proceedToConfiguration = useCallback(() => {
    if (selectedZoneCodes.length === 0) { alert("Select at least one zone"); return; }
    setCurrentStep("configure-zones");
    setCurrentZoneIndex(0);
  }, [selectedZoneCodes]);

  /* -------------------- Zone Configuration -------------------- */
  const setActiveState = useCallback((state: string | null) => { if (currentConfig) setActiveStateByZone(p => ({ ...p, [currentConfig.zoneCode]: state })); }, [currentConfig]);
  const getActiveState = useCallback((): string | null => currentConfig ? activeStateByZone[currentConfig.zoneCode] || null : null, [currentConfig, activeStateByZone]);

  const toggleCity = useCallback((cityKey: string) => {
    if (!currentConfig) return;
    setZoneConfigs(prev => prev.map((z, idx) => {
      if (idx !== currentZoneIndex) return z;
      const isSel = z.selectedCities?.includes(cityKey);
      const selectedCities = isSel ? (z.selectedCities || []).filter(k => k !== cityKey) : [...(z.selectedCities || []), cityKey];
      const selectedStates = [...new Set(selectedCities.map(k => parseCsKey(k).state))].sort();
      return { ...z, selectedCities, selectedStates };
    }));
  }, [currentConfig, currentZoneIndex]);

  const selectAllInState = useCallback((state: string) => {
    if (!currentConfig) return;
    const avail = getAvailableCityKeys(state, currentConfig.region, currentZoneIndex);
    if (avail.length === 0) return;
    setZoneConfigs(prev => prev.map((z, idx) => {
      if (idx !== currentZoneIndex) return z;
      const selectedCities = [...new Set([...(z.selectedCities || []), ...avail])];
      const selectedStates = [...new Set(selectedCities.map(k => parseCsKey(k).state))].sort();
      return { ...z, selectedCities, selectedStates };
    }));
  }, [currentConfig, currentZoneIndex, getAvailableCityKeys]);

  const clearState = useCallback((state: string) => {
    if (!currentConfig) return;
    setZoneConfigs(prev => prev.map((z, idx) => {
      if (idx !== currentZoneIndex) return z;
      const selectedCities = (z.selectedCities || []).filter(k => parseCsKey(k).state !== state);
      const selectedStates = [...new Set(selectedCities.map(k => parseCsKey(k).state))].sort();
      return { ...z, selectedCities, selectedStates };
    }));
  }, [currentConfig, currentZoneIndex]);

  const selectAllStates = useCallback(() => {
    if (!currentConfig) return;
    const all: string[] = [];
    availableStates.forEach(st => all.push(...getAvailableCityKeys(st, currentConfig.region, currentZoneIndex)));
    if (all.length === 0) return;
    setZoneConfigs(prev => prev.map((z, idx) => {
      if (idx !== currentZoneIndex) return z;
      const selectedCities = [...new Set([...(z.selectedCities || []), ...all])];
      const selectedStates = [...new Set(selectedCities.map(k => parseCsKey(k).state))].sort();
      return { ...z, selectedCities, selectedStates };
    }));
  }, [currentConfig, currentZoneIndex, availableStates, getAvailableCityKeys]);

  const clearAllStates = useCallback(() => {
    if (!currentConfig) return;
    setZoneConfigs(prev => prev.map((z, idx) => idx !== currentZoneIndex ? z : { ...z, selectedCities: [], selectedStates: [] }));
  }, [currentConfig, currentZoneIndex]);

  /* -------------------- Auto Fill -------------------- */
  const autoFillZonesInOrder = useCallback(async () => {
    if (!blueprint) { alert("Blueprint not loaded."); return; }
    setIsAutoFilling(true);

    const zonesByRegion: Record<string, string[]> = {};
    selectedZoneCodes.forEach(z => { const r = codeToRegion(z); if (!zonesByRegion[r]) zonesByRegion[r] = []; zonesByRegion[r].push(z); });
    Object.keys(zonesByRegion).forEach(r => zonesByRegion[r].sort((a, b) => getSubzoneNumber(a) - getSubzoneNumber(b)));

    const assignedCities = new Set<string>();
    const newConfigs: ZoneConfig[] = [];

    for (const region of REGION_ORDER) {
      const regionZones = zonesByRegion[region as string];
      if (!regionZones?.length) continue;

      const stateMap = byStateByRegion.get(region as RegionGroup);
      if (!stateMap) continue;

      const stateCities: Map<string, Set<string>> = new Map();
      stateMap.forEach((cities, state) => stateCities.set(state, new Set(cities)));

      for (const zoneCode of regionZones) {
        const zoneInfo = blueprint.zones[zoneCode];
        const existing = zoneConfigs.find(z => z.zoneCode === zoneCode);
        const config: ZoneConfig = {
          zoneCode,
          zoneName: zoneCode,
          region: region as RegionGroup,
          selectedStates: existing?.selectedStates || [],
          selectedCities: existing?.selectedCities || [],
          isComplete: false
        };

        if (config.selectedCities && config.selectedCities.length > 0) {
          config.selectedCities.forEach(c => assignedCities.add(c));
          config.isComplete = true;
          newConfigs.push(config);
          continue;
        }

        // Special zones: auto-assign from pincode data
        if (SPECIAL_ZONES.includes(zoneCode)) {
          const specialState = zoneInfo?.rawEntries?.[0]?.state;
          if (specialState) {
            const allPincodesForState = pincodeData.filter(p => {
              const normalizedState = p.state?.toUpperCase().trim();
              const targetState = specialState.toUpperCase().trim();
              return normalizedState === targetState ||
                normalizedState.includes(targetState) ||
                targetState.includes(normalizedState);
            });

            const citiesSet = new Set<string>();
            allPincodesForState.forEach(p => {
              if (p.city && p.city !== "NAN") citiesSet.add(p.city);
            });

            // Use UPPERCASE state name to match byStateByRegion map
            const normalizedStateName = specialState.toUpperCase().trim();

            citiesSet.forEach(city => {
              const k = csKey(city, normalizedStateName);
              if (!assignedCities.has(k)) {
                config.selectedCities.push(k);
                assignedCities.add(k);
                if (!config.selectedStates.includes(normalizedStateName)) {
                  config.selectedStates.push(normalizedStateName);
                }
              }
            });
          }
        }
        else if (zoneInfo?.rawEntries) {
          for (const entry of zoneInfo.rawEntries) {
            const st = entry.state;
            const stSet = stateCities.get(st);
            if (!stSet) continue;

            if (zoneInfo.type === 'limited' && entry.cities?.length > 0) {
              for (const city of entry.cities) {
                const match = Array.from(stSet).find(c => c.toUpperCase() === city.toUpperCase());
                if (match) {
                  const k = csKey(match, st);
                  if (!assignedCities.has(k)) {
                    config.selectedCities.push(k);
                    assignedCities.add(k);
                    if (!config.selectedStates.includes(st)) config.selectedStates.push(st);
                  }
                }
              }
            } else {
              stSet.forEach(city => {
                const k = csKey(city, st);
                if (!assignedCities.has(k)) {
                  config.selectedCities.push(k);
                  assignedCities.add(k);
                  if (!config.selectedStates.includes(st)) config.selectedStates.push(st);
                }
              });
            }
          }
        }

        config.isComplete = config.selectedCities.length > 0;
        newConfigs.push(config);
      }
    }

    newConfigs.sort((a, b) => LOCKED_ZONE_ORDER.indexOf(a.zoneCode) - LOCKED_ZONE_ORDER.indexOf(b.zoneCode));
    setZoneConfigs(newConfigs);
    setIsAutoFilling(false);

    const filled = newConfigs.filter(c => zoneHasCities(c)).length;
    const empty = newConfigs.filter(c => !zoneHasCities(c)).length;
    alert(`Auto-fill complete!\n${filled} zones filled, ${empty} zones empty.\nEmpty zones will be EXCLUDED from pricing.`);
  }, [blueprint, selectedZoneCodes, byStateByRegion, zoneConfigs, pincodeData]);

  /* -------------------- Save & Finalize -------------------- */
  const saveCurrentZone = useCallback(async () => {
    if (!currentConfig) return;
    setZoneConfigs(prev => {
      const updated = prev.map((z, idx) => idx === currentZoneIndex ? { ...z, isComplete: true } : z);
      const next = updated.findIndex((z, idx) => idx > currentZoneIndex && !z.isComplete);
      if (next !== -1) setTimeout(() => setCurrentZoneIndex(next), 0);
      return updated;
    });
  }, [currentConfig, currentZoneIndex]);

  const finalizeConfiguration = useCallback(async () => {
    const emptyZones = zoneConfigs.filter(z => !zoneHasCities(z));
    if (emptyZones.length > 0) {
      const result = await showWarning('empty-zone-continue', emptyZones.map(z => z.zoneCode), emptyZones[0].region);
      if (result === 'cancel') return;
    }

    const final = zoneConfigs.map(z => ({ ...z, isComplete: true }));
    updateZones(final);

    // 🔥 SMART MATRIX: Only build for zones WITH cities
    const zonesWithCities = final.filter(z => zoneHasCities(z));
    const matrix: Record<string, Record<string, number>> = {};
    zonesWithCities.forEach(f => {
      matrix[f.zoneCode] = {};
      zonesWithCities.forEach(t => {
        matrix[f.zoneCode][t.zoneCode] = 0;
      });
    });

    updatePriceMatrix(matrix);
    setCurrentStep("price-matrix");
  }, [zoneConfigs, showWarning, updateZones, updatePriceMatrix]);

  /* -------------------- Price Matrix -------------------- */
  // 🔥 SMART: Only active zones in the matrix - sorted
  const zonesForMatrix = useMemo(
    () => [...activeZones].sort((a, b) => LOCKED_ZONE_ORDER.indexOf(a.zoneCode) - LOCKED_ZONE_ORDER.indexOf(b.zoneCode)),
    [activeZones]
  );

  // 🔥 BULLETPROOF: Block ALL price updates for empty zones
  const updatePrice = useCallback((from: string, to: string, val: number | null) => {
    // Double check using the Set for O(1) lookup
    if (!activeZoneCodes.has(from) || !activeZoneCodes.has(to)) {
      console.warn(`BLOCKED price update: ${from} → ${to} (empty zone)`);
      return;
    }
    const upd = { ...wizardData.priceMatrix };
    if (!upd[from]) upd[from] = {};
    upd[from][to] = val ?? 0;
    updatePriceMatrix(upd);
  }, [wizardData.priceMatrix, updatePriceMatrix, activeZoneCodes]);

  const getPrice = useCallback((from: string, to: string): number | null => {
    return wizardData.priceMatrix?.[from]?.[to] ?? null;
  }, [wizardData.priceMatrix]);

  const savePriceMatrixAndReturn = useCallback(() => {
    // 🔥 CLEAN: Rebuild matrix with ONLY active zones before saving
    const cleanMatrix: Record<string, Record<string, number>> = {};
    activeZones.forEach(f => {
      cleanMatrix[f.zoneCode] = {};
      activeZones.forEach(t => {
        cleanMatrix[f.zoneCode][t.zoneCode] = wizardData.priceMatrix?.[f.zoneCode]?.[t.zoneCode] ?? 0;
      });
    });
    updatePriceMatrix(cleanMatrix);
    navigate("/addvendor", { replace: true });
  }, [navigate, activeZones, wizardData.priceMatrix, updatePriceMatrix]);

  /* -------------------- Bulk Paste Handler -------------------- */
  const handleBulkPaste = useCallback(() => {
    try {
      // Parse tab/newline separated values from Excel paste
      const lines = bulkPasteText.trim().split('\n');
      const parsedData: number[][] = [];

      for (const line of lines) {
        // Split by tab (Excel default) or comma (CSV)
        const values = line.split(/[\t,]/).map(v => {
          const num = parseFloat(v.trim());
          return isNaN(num) ? 0 : num;
        });
        parsedData.push(values);
      }

      // Validate dimensions
      if (parsedData.length !== zonesForMatrix.length) {
        alert(`Error: Expected ${zonesForMatrix.length} rows, got ${parsedData.length}`);
        return;
      }

      const expectedCols = zonesForMatrix.length;
      for (let i = 0; i < parsedData.length; i++) {
        if (parsedData[i].length !== expectedCols) {
          alert(`Error: Row ${i + 1} has ${parsedData[i].length} columns, expected ${expectedCols}`);
          return;
        }
      }

      // Apply to price matrix
      const newMatrix = { ...wizardData.priceMatrix };
      zonesForMatrix.forEach((fromZone, fromIdx) => {
        if (!newMatrix[fromZone.zoneCode]) newMatrix[fromZone.zoneCode] = {};
        zonesForMatrix.forEach((toZone, toIdx) => {
          newMatrix[fromZone.zoneCode][toZone.zoneCode] = parsedData[fromIdx][toIdx];
        });
      });

      updatePriceMatrix(newMatrix);
      setBulkPasteModal(false);
      setBulkPasteText("");
      alert(`Success! ${zonesForMatrix.length}x${zonesForMatrix.length} prices updated.`);
    } catch (error) {
      console.error('Bulk paste error:', error);
      alert('Error parsing pasted data. Please ensure you copied the correct format from Excel.');
    }
  }, [bulkPasteText, zonesForMatrix, wizardData.priceMatrix, updatePriceMatrix]);

  /* -------------------- Warning Modal -------------------- */
  const WarningModal = () => {
    if (!warningModal.isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Empty Zones Detected</h3>
              <p className="text-sm text-slate-700">{warningModal.message}</p>
            </div>
          </div>
          {warningModal.affectedZones.length > 0 && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex flex-wrap gap-2">
                {warningModal.affectedZones.map(z => (
                  <span key={z} className="px-2 py-1 bg-orange-200 text-orange-800 rounded text-sm">{z}</span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2 mt-6">
            <button onClick={() => closeWarningModal('cancel')} className="flex-1 px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300">Cancel</button>
            <button onClick={() => closeWarningModal('continue')} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Continue</button>
          </div>
          <p className="text-xs text-slate-500 mt-4 text-center">Empty zones will be excluded from pricing entirely.</p>
        </div>
      </div>
    );
  };

  /* -------------------- Bulk Paste Modal -------------------- */
  const BulkPasteModal = () => {
    if (!bulkPasteModal) return null;
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <FileSpreadsheet className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Bulk Paste from Excel</h3>
                <p className="text-sm text-slate-600">Paste your price matrix data here</p>
              </div>
            </div>
            <button onClick={() => { setBulkPasteModal(false); setBulkPasteText(""); }} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-900 font-semibold mb-2">Instructions:</p>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Open your Excel file with the price matrix</li>
              <li>Select all price values (WITHOUT the From/To headers)</li>
              <li>Copy (Ctrl+C or Cmd+C)</li>
              <li>Paste in the box below</li>
              <li>Click "Apply Prices"</li>
            </ol>
            <p className="text-xs text-blue-700 mt-2">Expected format: {zonesForMatrix.length} rows × {zonesForMatrix.length} columns (tab-separated values)</p>
          </div>

          <textarea
            value={bulkPasteText}
            onChange={(e) => setBulkPasteText(e.target.value)}
            placeholder={`Paste your ${zonesForMatrix.length}x${zonesForMatrix.length} price matrix here...\n\nExample:\n5.4\t6.5\t8.1\t9.5\n6.0\t5.85\t8.1\t9.5\n...`}
            className="w-full h-64 p-4 border border-slate-300 rounded-xl font-mono text-sm resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            autoFocus
          />

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => { setBulkPasteModal(false); setBulkPasteText(""); }}
              className="flex-1 px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkPaste}
              disabled={!bulkPasteText.trim()}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold ${bulkPasteText.trim()
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-slate-300 text-slate-500 cursor-not-allowed"
                }`}
            >
              Apply Prices
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* =========================================================
     RENDER
     ======================================================= */
  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  /* ---------- STEP 1: SELECT ZONES ---------- */
  if (currentStep === "select-zones") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full px-8 py-8">
          <button onClick={() => navigate("/addvendor")} className="mb-6 inline-flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-extrabold text-slate-900">Select Zones</h1>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full flex items-center gap-1">
                    <Lock className="h-3 w-3" /> Locked
                  </span>
                </div>
                <p className="mt-1 text-slate-600">{MAX_ZONES} zones. Sequential selection required (X1/X2/X3 can be any order).</p>
              </div>
              <div className="flex gap-3">
                <button onClick={selectAllZones} disabled={selectedZoneCodes.length === LOCKED_ZONE_ORDER.length} className={`px-6 py-3 text-sm font-semibold rounded-xl ${selectedZoneCodes.length === LOCKED_ZONE_ORDER.length ? "bg-slate-200 text-slate-400" : "bg-green-500 text-white hover:bg-green-600"}`}>Select All</button>
                <button onClick={deselectAllZones} disabled={selectedZoneCodes.length === 0} className={`px-6 py-3 text-sm font-semibold rounded-xl ${selectedZoneCodes.length === 0 ? "bg-slate-200 text-slate-400" : "bg-red-500 text-white hover:bg-red-600"}`}>Clear All</button>
              </div>
            </div>
            <div className="mt-6 space-y-6">
              {REGION_ORDER.map(region => {
                const rz = LOCKED_REGION_GROUPS[region], sel = selectedZoneCodes.filter(z => rz.includes(z));
                const isSpecialRegion = region === "Special";
                return (
                  <div key={region} className="border border-slate-200 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {isSpecialRegion ? <Globe className="h-6 w-6 text-purple-600" /> : <MapPin className="h-6 w-6 text-blue-600" />}
                        <h3 className="text-xl font-semibold">{region}</h3>
                        <span className="text-sm text-slate-500">({sel.length}/{rz.length})</span>
                        {isSpecialRegion && <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">Any order OK</span>}
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => selectAllInRegion(region)} disabled={sel.length === rz.length} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${sel.length === rz.length ? "bg-slate-100 text-slate-400" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>All</button>
                        <button onClick={() => deselectAllInRegion(region)} disabled={sel.length === 0} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${sel.length === 0 ? "bg-slate-100 text-slate-400" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>Clear</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {rz.map(zone => {
                        const isSel = selectedZoneCodes.includes(zone);
                        const canSel = canSelectZoneInSequence(zone, selectedZoneCodes);
                        const info = ZONE_TYPE_INFO[zone];
                        const isSpec = isSpecialRegion;
                        return (
                          <div key={zone} onClick={() => toggleZoneSelection(zone)} className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${isSel ? (isSpec ? "bg-purple-50 border-purple-500" : "bg-blue-50 border-blue-500") : canSel ? "bg-white border-slate-200 hover:border-slate-300" : "bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed"}`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-lg font-bold ${isSel ? (isSpec ? "text-purple-700" : "text-blue-700") : "text-slate-700"}`}>{zone}</span>
                              {isSel && <CheckCircle className={`h-5 w-5 ${isSpec ? "text-purple-500" : "text-blue-500"}`} />}
                            </div>
                            {info && (
                              <div>
                                <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded ${info.type === 'limited' ? "bg-orange-100 text-orange-700" : info.type === 'special' ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"}`}>{info.type}</span>
                                <p className="text-xs text-slate-500 mt-1">{info.description}</p>
                              </div>
                            )}
                            {isSpec && SPECIAL_ZONE_INFO[zone] && <p className="mt-1 text-xs font-medium text-purple-600">{SPECIAL_ZONE_INFO[zone]}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 flex justify-between items-center">
              <p className="text-sm text-slate-500">{selectedZoneCodes.length}/{LOCKED_ZONE_ORDER.length} selected</p>
              <button onClick={proceedToConfiguration} disabled={selectedZoneCodes.length === 0} className={`px-8 py-3 text-lg font-bold rounded-xl ${selectedZoneCodes.length === 0 ? "bg-slate-300 text-slate-500" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
                Continue <ChevronRight className="inline h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        <WarningModal />
      </div>
    );
  }

  /* ---------- STEP 2: CONFIGURE ZONES ---------- */
  if (currentStep === "configure-zones") {
    const activeState = getActiveState();
    // For special zones, show ALL cities (not just unused) so users can select any
    const isSpecialZone = currentConfig && SPECIAL_ZONES.includes(currentConfig.zoneCode);
    const citiesForActiveState = activeState
      ? (isSpecialZone
        ? getAllCitiesForStateInZone(activeState, currentConfig?.zoneCode || "")  // Search in zone's region only
        : getAvailableCityKeys(activeState, currentConfig?.region || "North", currentZoneIndex))
      : [];
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="w-full px-8 py-8">
          <div className="mb-6 flex justify-between items-center">
            <button onClick={() => setCurrentStep("select-zones")} className="inline-flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button onClick={autoFillZonesInOrder} disabled={isAutoFilling} className={`px-6 py-2 rounded-xl font-semibold flex items-center gap-2 ${isAutoFilling ? "bg-slate-300 text-slate-500" : "bg-purple-500 text-white hover:bg-purple-600"}`}>
              <Sparkles className="h-4 w-4" />{isAutoFilling ? "Auto-filling..." : "Auto-fill (In Order)"}
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900 mb-2">Configure Zones ({currentZoneIndex + 1}/{zoneConfigs.length})</h2>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl">
                {zoneConfigs.map((z, idx) => {
                  const has = zoneHasCities(z), cur = idx === currentZoneIndex;
                  return (
                    <button key={z.zoneCode} onClick={() => setCurrentZoneIndex(idx)} className={`px-4 py-2 rounded-lg text-sm font-medium ${cur ? "bg-blue-600 text-white" : has ? "bg-green-100 text-green-700" : "bg-white text-slate-600 border"}`}>
                      {z.zoneCode}{has && !cur && <CheckCircle className="inline h-3 w-3 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
            {currentConfig && (
              <div>
                <div className="flex items-center justify-between mb-4 p-4 bg-gradient-to-r from-blue-50 to-slate-50 rounded-xl border border-blue-100">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold">{currentConfig.zoneCode}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">{currentConfig.region}</span>
                      {SPECIAL_ZONES.includes(currentConfig.zoneCode) && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">Special Zone</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{ZONE_TYPE_INFO[currentConfig.zoneCode]?.description}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{currentConfig.selectedCities?.length || 0}</div>
                    <div className="text-xs text-slate-500">cities</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-slate-700">States</h4>
                      <div className="flex gap-2">
                        <button onClick={selectAllStates} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">All</button>
                        <button onClick={clearAllStates} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Clear</button>
                      </div>
                    </div>
                    {availableStates.length === 0 ? (
                      <div className="p-6 bg-orange-50 rounded-xl text-center">
                        <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
                        <p className="text-sm text-orange-700">No cities available</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {availableStates.map(state => {
                          // 🔥 FIX: For special zones, search in zone's region only
                          const isSpecialZone = SPECIAL_ZONES.includes(currentConfig.zoneCode);
                          const avail = isSpecialZone
                            ? getAllCitiesForStateInZone(state, currentConfig.zoneCode).length
                            : getAvailableCityKeys(state, currentConfig.region, currentZoneIndex).length;
                          // Debug log for special zones
                          if (isSpecialZone) {
                            console.log(`[Count Debug] Zone: ${currentConfig.zoneCode}, State: ${state}, isSpecialZone: ${isSpecialZone}, avail: ${avail}`);
                          }
                          const selFrom = (currentConfig.selectedCities || []).filter(k => parseCsKey(k).state === state).length;
                          return (
                            <div key={state} onClick={() => setActiveState(state)} className={`p-3 rounded-lg cursor-pointer transition-all ${activeState === state ? "bg-blue-100 border-2 border-blue-500" : selFrom > 0 ? "bg-green-50 border border-green-200" : "bg-white border border-slate-200"}`}>
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{state}</span>
                                <span className={`text-xs ${selFrom > 0 ? "text-green-600" : "text-slate-400"}`}>{selFrom}/{avail}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="lg:col-span-2">
                    {activeState ? (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">Cities in {activeState}</h4>
                          <div className="flex gap-2">
                            <button onClick={() => selectAllInState(activeState)} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">All</button>
                            <button onClick={() => clearState(activeState)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Clear</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-96 overflow-y-auto p-2 bg-slate-50 rounded-xl">
                          {citiesForActiveState.map(cityKey => {
                            const { city } = parseCsKey(cityKey), isSel = (currentConfig.selectedCities || []).includes(cityKey);
                            return (
                              <div key={cityKey} onClick={() => toggleCity(cityKey)} className={`p-2 rounded-lg text-sm cursor-pointer ${isSel ? "bg-blue-500 text-white" : "bg-white border border-slate-200 hover:border-blue-300"}`}>{city}</div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <div className="text-center p-8">
                          <MapPin className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                          <p className="text-slate-500">Select a state</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex justify-between items-center pt-4 border-t">
                  <button onClick={() => setCurrentZoneIndex(Math.max(0, currentZoneIndex - 1))} disabled={currentZoneIndex === 0} className={`px-4 py-2 rounded-lg font-medium ${currentZoneIndex === 0 ? "bg-slate-100 text-slate-400" : "bg-slate-200 text-slate-700"}`}>← Previous</button>
                  <div className="flex gap-3">
                    <button onClick={saveCurrentZone} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">Save & Next</button>
                    <button onClick={finalizeConfiguration} className="px-6 py-2 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600">Finalize All →</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <WarningModal />
      </div>
    );
  }

  /* ---------- STEP 3: SMART PRICE MATRIX ---------- */
  if (currentStep === "price-matrix") {
    return (
      <div className="h-[calc(100vh-64px)] w-full flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
          <div className="flex items-center justify-between shrink-0 mb-4">
            <button onClick={() => setCurrentStep("configure-zones")} className="inline-flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 bg-white rounded-lg shadow-sm border border-slate-200 text-sm font-medium">
              <ArrowLeft className="h-4 w-4" /> Back to Config
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => setBulkPasteModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 flex items-center gap-2 shadow-sm"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Bulk Paste
              </button>
              <button onClick={savePriceMatrixAndReturn} className="px-6 py-2 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 shadow-sm">Save & Continue</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden max-h-full w-full">
            {/* Header Section - Fixed */}
            <div className="p-4 border-b border-slate-100 shrink-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-xl font-extrabold text-slate-900">Zone Price Matrix</h1>
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wide rounded-full">Smart Mode</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">Enter prices for active zones (empty zones excluded).</p>
                </div>

                {/* Legend - Inline Compact */}
                <div className="flex gap-4 text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-blue-100 border border-blue-400 rounded-sm"></span>Active</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-purple-100 border border-purple-400 rounded-sm"></span>Special</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-100 border border-green-400 rounded-sm"></span>Same Zone</span>
                </div>
              </div>

              {/* Excluded Zones Badges - If Any */}
              {inactiveZones.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-[10px] text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-100 inline-flex">
                  <Ban className="h-3 w-3" />
                  <span className="font-semibold">Excluded ({inactiveZones.length}):</span>
                  <span className="text-orange-800 font-mono">{inactiveZones.map(z => z.zoneCode).join(', ')}</span>
                </div>
              )}
            </div>

            {/* Scrollable Matrix Area */}
            <div className="overflow-auto p-0 relative bg-slate-50/50">
              {zonesForMatrix.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-center p-8">
                  <AlertTriangle className="h-12 w-12 text-orange-400 mb-3 opacity-50" />
                  <h3 className="text-sm font-semibold text-slate-700">No Active Zones</h3>
                  <p className="text-xs text-slate-500 mt-1">Go back and add cities to zones.</p>
                </div>
              ) : (
                <div className="inline-block min-w-full align-middle">
                  <table className="border-collapse w-full">
                    <thead className="bg-white sticky top-0 z-20 shadow-sm">
                      <tr>
                        <th className="p-2 border-b border-r border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky left-0 z-30 w-[60px] min-w-[60px]">To →<br /><span className="text-[9px] font-normal normal-case">From ↓</span></th>
                        {zonesForMatrix.map(zone => {
                          const isSpec = zone.region === "Special";
                          return (
                            <th key={zone.zoneCode} className={`p-1.5 border-b border-r border-slate-200 text-[10px] font-bold min-w-[64px] text-center ${isSpec ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`} title={`${zone.zoneCode}: ${zone.selectedCities?.length || 0} cities`}>
                              {zone.zoneCode}
                              <span className="block text-[9px] font-normal opacity-70">{zone.selectedCities?.length || 0}c</span>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      {zonesForMatrix.map((fromZone, rIdx) => {
                        const fromSpec = fromZone.region === "Special";
                        return (
                          <tr key={fromZone.zoneCode} className="hover:bg-slate-50 transition-colors">
                            <td className={`p-1.5 border-b border-r border-slate-200 text-[10px] font-bold text-center sticky left-0 z-10 w-[60px] min-w-[60px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${fromSpec ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700"}`}>
                              {fromZone.zoneCode}
                            </td>
                            {zonesForMatrix.map((toZone, cIdx) => {
                              const isDiagonal = fromZone.zoneCode === toZone.zoneCode;
                              return (
                                <td key={toZone.zoneCode} className={`p-0.5 border-b border-r border-slate-200 relative ${isDiagonal ? "bg-green-50/50" : ""}`}>
                                  <DecimalInput
                                    value={getPrice(fromZone.zoneCode, toZone.zoneCode)}
                                    onChange={val => updatePrice(fromZone.zoneCode, toZone.zoneCode, val)}
                                    placeholder="-"
                                    className={`w-full h-7 text-center text-xs bg-transparent border-0 focus:ring-2 focus:ring-inset focus:ring-blue-500 font-medium ${!getPrice(fromZone.zoneCode, toZone.zoneCode) ? "text-slate-300" : "text-slate-900"}`}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Summary - Fixed */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-500 flex justify-between items-center shrink-0">
              <div>
                <span className="font-semibold text-slate-700">{zonesForMatrix.length}×{zonesForMatrix.length} Matrix</span>
                <span className="mx-2 text-slate-300">|</span>
                <span>{activeZones.reduce((s, z) => s + (z.selectedCities?.length || 0), 0)} Cities Covered</span>
              </div>
              <div className="italic opacity-70">
                Tab to navigate • Auto-saves
              </div>
            </div>
          </div>
        </div>
        <WarningModal />
        <BulkPasteModal />
      </div>
    );
  }

  return null;
};

export default ZonePriceMatrix;
