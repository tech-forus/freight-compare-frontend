/**
 * ZoneSelectionWizard — Rebuilt as Zone → City → Pincode hierarchical selector
 *
 * Flow:
 *   Zone (North / South / East / West / Central / Northeast)
 *     └── City  (e.g. DELHI, MUMBAI)
 *           └── Pincodes  (e.g. 110001, 110002 …)
 *
 * On confirm → groups selected pincodes by their zone code from pincodes.json
 *            → builds ZoneConfig[] identical to the legacy wizard output
 *            → calls onComplete({ zones, priceMatrix }) — SAME SIGNATURE, no changes upstream
 *
 * ⚠️  DO NOT change the onComplete payload shape — it feeds handleZoneSelectionComplete
 *     in AddVendor.tsx which writes wizardData and switches to the price-matrix step.
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle,
  Search,
  X,
  Hash,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { ZoneConfig, RegionGroup } from '../types/wizard.types';

// ============================================================================
// TYPES
// ============================================================================

interface RawPincodeEntry {
  pincode: string;
  zone: string;
  state: string;
  city: string;
}

interface CityData {
  city: string;    // uppercase, as-is from pincodes.json  e.g. "CENTRAL"
  state: string;   // uppercase, as-is from pincodes.json  e.g. "DELHI"
  cityKey: string; // "CITY||STATE"  – used as stable key
  pincodes: string[];
  zone?: string; // Dominant zone for this city
}

interface ZoneDisplayData {
  zoneCode: string; // "N1"
  description?: string; // "Metro cities..."
  region: string; // "North"
  cities: CityData[];
  totalPincodes: number;
}

// Props are kept IDENTICAL to the old ZoneSelectionWizard so AddVendor.tsx
// needs zero changes.
interface ZoneSelectionWizardProps {
  onComplete: (config: {
    zones: ZoneConfig[];
    priceMatrix: Record<string, Record<string, string | number>>;
    serviceability: Array<{ pincode: string; zone: string; state: string; city: string; isODA: boolean; active: boolean }>;
  }) => void;
  /** Ignored in the new UI — kept for API compatibility */
  zones?: ZoneConfig[];
  initialSelectedZones?: string[];
  blankCellValue?: string | number;
}

// ============================================================================
// CONSTANTS & HELPERS
// ============================================================================



// Define zone order for sorting
const ZONE_ORDER: Record<string, number> = {
  // North
  N1: 1, N2: 2, N3: 3, N4: 4,
  // Central
  C1: 5, C2: 6,
  // East
  E1: 7, E2: 8,
  // West
  W1: 9, W2: 10,
  // South
  S1: 11, S2: 12, S3: 13, S4: 14,
  // Northeast
  NE1: 15, NE2: 16,
  // Special
  X1: 17, X2: 18, X3: 19
};

/** Derive display-region from a zone code (e.g. "N1" → "North") */
function zoneToRegion(code: string): string {
  if (!code) return 'Special';
  const c = code.toUpperCase();
  if (c.startsWith('NE')) return 'Northeast';
  if (c.startsWith('N')) return 'North';
  if (c.startsWith('S')) return 'South';
  if (c.startsWith('E')) return 'East';
  if (c.startsWith('W')) return 'West';
  if (c.startsWith('C')) return 'Central';
  return 'Special';
}

/** Title-case a state string from ALL_CAPS (e.g. "WEST BENGAL" → "West Bengal") */
function titleCase(s: string): string {
  if (!s) return s;
  return s
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

// Max pincode chips shown per city before a "show more" link appears.
const PINCODE_SHOW_LIMIT = 120;

// ============================================================================
// INDETERMINATE CHECKBOX
// ============================================================================

interface ICBProps {
  state: 'none' | 'some' | 'all';
  onClick: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md';
}

const IndeterminateCheckbox: React.FC<ICBProps> = ({
  state,
  onClick,
  size = 'md',
}) => {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === 'some';
    }
  }, [state]);

  const dim = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <span className="flex-shrink-0 cursor-pointer" onClick={onClick}>
      <input
        ref={ref}
        type="checkbox"
        checked={state === 'all'}
        readOnly
        // Handle clicks via the parent span
        onChange={() => { }}
        className={`${dim} rounded border-slate-300 text-blue-600 cursor-pointer pointer-events-none
                    focus:ring-1 focus:ring-blue-400 focus:ring-offset-0`}
      />
    </span>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ZoneSelectionWizard: React.FC<ZoneSelectionWizardProps> = ({
  onComplete,
  blankCellValue = '',
}) => {
  // ── Data ────────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allZones, setAllZones] = useState<ZoneDisplayData[]>([]);
  // Fast pincode → raw entry lookup
  const [pincodeIndex, setPincodeIndex] = useState<Map<string, RawPincodeEntry>>(new Map());

  // ── Selection ────────────────────────────────────────────────────────────
  const [selectedPincodes, setSelectedPincodes] = useState<Set<string>>(new Set());

  // ── UI state ─────────────────────────────────────────────────────────────
  const [expandedZones, setExpandedZones] = useState<Set<string>>(new Set());
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  const [cityShowAll, setCityShowAll] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [activeRegionFilter, setActiveRegionFilter] = useState<string>('North');

  // ── Pre-compute flat pincode list per ZONE (for fast select-all) ────────
  const zonePincodeList = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const z of allZones) {
      m.set(z.zoneCode, z.cities.flatMap(c => c.pincodes));
    }
    return m;
  }, [allZones]);

  // ── Load pincodes.json ───────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const base = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${base}pincodes.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: RawPincodeEntry[] = await res.json();
        if (cancelled) return;

        // Build index + region→city→pincodes hierarchy
        const index = new Map<string, RawPincodeEntry>();
        const zoneBuckets = new Map<string, CityData[]>();

        for (const entry of data) {
          const pc = String(entry.pincode);
          index.set(pc, entry);
          const zone = entry.zone || 'Uncategorized';

          if (!zoneBuckets.has(zone)) zoneBuckets.set(zone, []);

          // We need to aggregate pincodes per city per zone
          // But here we are iterating pincodes.
          // Let's do a two-pass or simpler: just collect raw entries first?
          // Actually the previous logic was fine, just adapted.
        }

        // Re-implementing the bucketing logic for flat zones
        const tempCityMap = new Map<string, { city: string, state: string, zone: string, pincodes: string[] }>();

        for (const entry of data) {
          const pc = String(entry.pincode);
          const zone = entry.zone || 'Uncategorized';
          const cityKey = `${(entry.city ?? '').toUpperCase()}||${(entry.state ?? '').toUpperCase()}||${zone}`;

          if (!tempCityMap.has(cityKey)) {
            tempCityMap.set(cityKey, {
              city: (entry.city ?? '').toUpperCase(),
              state: (entry.state ?? '').toUpperCase(),
              zone,
              pincodes: []
            });
          }
          tempCityMap.get(cityKey)!.pincodes.push(pc);
        }

        // Group cities by zone
        const zoneGroups = new Map<string, CityData[]>();
        for (const [key, val] of tempCityMap.entries()) {
          if (!zoneGroups.has(val.zone)) zoneGroups.set(val.zone, []);
          zoneGroups.get(val.zone)!.push({
            city: val.city,
            state: val.state,
            cityKey: key, // unique key including zone to avoid conflicts
            pincodes: val.pincodes.sort(),
            zone: val.zone
          });
        }

        // Fetch blueprint
        let blueprintZones: Record<string, any> = {};
        try {
          const bpRes = await fetch(`${base}zones_blueprint.json`);
          if (bpRes.ok) {
            const bpJson = await bpRes.json();
            blueprintZones = bpJson.zones || {};
          }
        } catch (e) { console.warn(e); }

        // Build flat list sorted by ZONE_ORDER
        const flatZones: ZoneDisplayData[] = [];
        const sortedCodes = Array.from(zoneGroups.keys()).sort((a, b) => {
          const zA = ZONE_ORDER[a] ?? 999;
          const zB = ZONE_ORDER[b] ?? 999;
          return zA - zB;
        });

        for (const code of sortedCodes) {
          const cities = zoneGroups.get(code)!;
          cities.sort((a, b) => a.city.localeCompare(b.city));
          flatZones.push({
            zoneCode: code,
            region: zoneToRegion(code),
            description: blueprintZones[code]?.description || '',
            cities,
            totalPincodes: cities.reduce((sum, c) => sum + c.pincodes.length, 0)
          });
        }

        setAllZones(flatZones);
        setPincodeIndex(index);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setLoadError('Failed to load data.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Derived selection states ──────────────────────────────────────────────

  // ── Derived selection states ──────────────────────────────────────────────

  const getZoneState = useCallback(
    (zCode: string): 'none' | 'some' | 'all' => {
      const list = zonePincodeList.get(zCode) ?? [];
      if (!list.length) return 'none';
      const n = list.filter(p => selectedPincodes.has(p)).length;
      if (n === 0) return 'none';
      return n === list.length ? 'all' : 'some';
    },
    [zonePincodeList, selectedPincodes],
  );

  const getCityState = useCallback(
    (city: CityData): 'none' | 'some' | 'all' => {
      if (!city.pincodes.length) return 'none';
      const n = city.pincodes.filter(p => selectedPincodes.has(p)).length;
      if (n === 0) return 'none';
      return n === city.pincodes.length ? 'all' : 'some';
    },
    [selectedPincodes],
  );

  // ── Handlers ─────────────────────────────────────────────────────────────

  const toggleZone = useCallback(
    (zCode: string, selectAll: boolean) => {
      const list = zonePincodeList.get(zCode) ?? [];
      setSelectedPincodes(prev => {
        const next = new Set(prev);
        list.forEach(p => (selectAll ? next.add(p) : next.delete(p)));
        return next;
      });
    },
    [zonePincodeList],
  );

  const toggleCity = useCallback(
    (city: CityData, selectAll: boolean) => {
      setSelectedPincodes(prev => {
        const next = new Set(prev);
        city.pincodes.forEach(p => (selectAll ? next.add(p) : next.delete(p)));
        return next;
      });
    },
    [],
  );

  const togglePincode = useCallback((pc: string) => {
    setSelectedPincodes(prev => {
      const next = new Set(prev);
      next.has(pc) ? next.delete(pc) : next.add(pc);
      return next;
    });
  }, []);



  const toggleExpandZone = useCallback((zCode: string) => {
    setExpandedZones(prev => {
      const next = new Set(prev);
      next.has(zCode) ? next.delete(zCode) : next.add(zCode);
      return next;
    });
  }, []);

  const toggleExpandCity = useCallback((ck: string) => {
    setExpandedCities(prev => {
      const next = new Set(prev);
      next.has(ck) ? next.delete(ck) : next.add(ck);
      return next;
    });
  }, []);

  // ── Build output & call onComplete ───────────────────────────────────────

  const handleConfirm = useCallback(() => {
    if (selectedPincodes.size === 0) {
      toast.error('Please select at least one pincode');
      return;
    }

    // Group selected pincodes by zone code (from pincodes.json)
    const zoneGroups = new Map<
      string,
      { cities: Set<string>; states: Set<string> }
    >();

    for (const pc of selectedPincodes) {
      const entry = pincodeIndex.get(pc);
      if (!entry) continue;
      const zone = entry.zone;
      if (!zoneGroups.has(zone))
        zoneGroups.set(zone, { cities: new Set(), states: new Set() });
      const g = zoneGroups.get(zone)!;
      // Match the legacy "city||state" format produced by ZoneAssignmentService.buildZoneConfig
      g.cities.add(`${entry.city}||${titleCase(entry.state)}`);
      g.states.add(titleCase(entry.state));
    }

    // Build ZoneConfig[] — same shape as before
    const zones: ZoneConfig[] = [];
    for (const [zoneCode, g] of zoneGroups.entries()) {
      zones.push({
        zoneCode,
        zoneName: zoneCode,
        region: zoneToRegion(zoneCode) as RegionGroup,
        selectedStates: Array.from(g.states),
        selectedCities: Array.from(g.cities),
        isComplete: true,
      });
    }
    zones.sort((a, b) => {
      const zA = ZONE_ORDER[a.zoneCode] ?? 999;
      const zB = ZONE_ORDER[b.zoneCode] ?? 999;
      return zA - zB;
    });

    // Empty price matrix (to be filled in the price-matrix step)
    const zoneCodes = zones.map(z => z.zoneCode);
    const priceMatrix: Record<string, Record<string, string | number>> = {};
    for (const from of zoneCodes) {
      priceMatrix[from] = {};
      for (const to of zoneCodes) priceMatrix[from][to] = blankCellValue;
    }

    // Build serviceability array from selected pincodes (for calculator compatibility)
    const serviceability = Array.from(selectedPincodes).map(pc => {
      const entry = pincodeIndex.get(pc);
      return {
        pincode: pc,
        zone: entry?.zone || '',
        state: entry?.state || '',
        city: entry?.city || '',
        isODA: false,
        active: true,
      };
    }).filter(e => e.zone); // drop any entries without a valid zone

    onComplete({ zones, priceMatrix, serviceability });
    toast.success(
      `${selectedPincodes.size.toLocaleString()} pincodes → ${zones.length} zones configured!`,
      { duration: 4000 },
    );
  }, [selectedPincodes, pincodeIndex, blankCellValue, onComplete]);

  // ── Search & Filter ─────────────────────────────────────────────────────────

  const filteredZones = useMemo(() => {
    const q = search.trim().toUpperCase();

    // If search is active, search GLOBALLY (ignore region filter)
    // Otherwise, apply the active region filter
    let base = allZones;
    if (!q && activeRegionFilter !== 'All') {
      base = base.filter(z => z.region === activeRegionFilter);
    }

    if (!q) return base;

    // Filter by search term
    return base
      .map(z => ({
        ...z,
        cities: z.cities.filter(
          c =>
            c.city.includes(q) ||
            c.state.includes(q) ||
            c.pincodes.some(p => p.startsWith(q)),
        ),
      }))
      .filter(z => z.cities.length > 0);
  }, [allZones, search, activeRegionFilter]);

  // ── Early returns ─────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-sm">Loading pincode data…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
        <XCircle className="w-5 h-5 flex-shrink-0" />
        <span className="text-sm">{loadError}</span>
      </div>
    );
  }

  const selectedCount = selectedPincodes.size;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="w-full space-y-3">
      {/* ══ STICKY TOP BAR ════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Selection counter */}
          <div className="flex items-center gap-2 min-w-fit">
            <Hash className="w-4 h-4 text-blue-500 flex-shrink-0" />
            <span className="text-xl font-bold text-blue-600 tabular-nums">
              {selectedCount.toLocaleString()}
            </span>
            <span className="text-sm text-slate-500">pincodes selected</span>
            {selectedCount > 0 && (
              <button
                type="button"
                onClick={() => setSelectedPincodes(new Set())}
                className="ml-1 text-xs text-slate-400 hover:text-red-500 transition-colors
                           flex items-center gap-0.5"
              >
                <X className="w-3 h-3" />
                clear all
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-40 max-w-sm">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4
                               text-slate-400 pointer-events-none"
            />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search city, state or pincode…"
              className="w-full pl-9 pr-7 py-1.5 text-sm border border-slate-200 rounded-lg
                         focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none
                         bg-slate-50 focus:bg-white transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600" />
              </button>
            )}
          </div>

          {/* Confirm CTA */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={selectedCount === 0}
            className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-semibold
                       rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors
                       disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed
                       flex items-center gap-2 whitespace-nowrap shadow-sm"
          >
            <CheckCircle className="w-4 h-4" />
            Apply Selection
          </button>
        </div>
      </div>

      {/* ══ NAVIGATION CHIPS ══════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 pb-2 overflow-x-auto no-scrollbar mask-linear-fade">
        <button
          onClick={() => setActiveRegionFilter('All')}
          className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all whitespace-nowrap
                ${activeRegionFilter === 'All'
              ? 'bg-slate-800 text-white border-slate-800 shadow-md'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:bg-slate-50'
            }`}
        >
          All Zones
        </button>
        {['North', 'South', 'East', 'West', 'Central', 'Northeast', 'Special'].map(r => (
          <button
            key={r}
            onClick={() => setActiveRegionFilter(r)}
            className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all whitespace-nowrap
                    ${activeRegionFilter === r
                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
              }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* ══ ZONES LIST ════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        {filteredZones.length === 0 && (
          <div className="text-center py-14 text-slate-400">
            <MapPin className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No zones found</p>
          </div>
        )}

        {filteredZones.map(zoneData => {
          const isExpanded =
            search.trim() !== '' || expandedZones.has(zoneData.zoneCode);
          const zState = getZoneState(zoneData.zoneCode);

          // "Flashy" styles based on region
          const regionColor =
            {
              North: 'border-red-200 shadow-red-500/10',
              South: 'border-blue-200 shadow-blue-500/10',
              East: 'border-green-200 shadow-green-500/10',
              West: 'border-orange-200 shadow-orange-500/10',
              Central: 'border-purple-200 shadow-purple-500/10',
              Northeast: 'border-teal-200 shadow-teal-500/10',
              Special: 'border-indigo-200 shadow-indigo-500/10',
            }[zoneData.region] || 'border-slate-200';

          const headerColor =
            {
              North: 'from-red-50 to-white text-red-700',
              South: 'from-blue-50 to-white text-blue-700',
              East: 'from-green-50 to-white text-green-700',
              West: 'from-orange-50 to-white text-orange-700',
              Central: 'from-purple-50 to-white text-purple-700',
              Northeast: 'from-teal-50 to-white text-teal-700',
              Special: 'from-indigo-50 to-white text-indigo-700',
            }[zoneData.region] || 'from-slate-50 to-white text-slate-700';

          const badgeColor =
            {
              North: 'bg-red-100 text-red-800',
              South: 'bg-blue-100 text-blue-800',
              East: 'bg-green-100 text-green-800',
              West: 'bg-orange-100 text-orange-800',
              Central: 'bg-purple-100 text-purple-800',
              Northeast: 'bg-teal-100 text-teal-800',
              Special: 'bg-indigo-100 text-indigo-800',
            }[zoneData.region] || 'bg-slate-200 text-slate-700';

          return (
            <div
              key={zoneData.zoneCode}
              className={`bg-white border rounded-xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md ${regionColor}`}
            >
              {/* CARD HEADER */}
              <div
                onClick={() => toggleExpandZone(zoneData.zoneCode)}
                className={`px-3 py-2 bg-gradient-to-r ${headerColor} cursor-pointer flex items-center justify-between border-b border-slate-100/50 relative overflow-hidden`}
              >
                {/* Interactive "Select All" Checkbox for Zone */}
                <div className="flex items-center gap-2 z-10">
                  <IndeterminateCheckbox
                    state={zState}
                    onClick={e => {
                      e.stopPropagation();
                      toggleZone(zoneData.zoneCode, zState !== 'all');
                    }}
                  />

                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black px-1.5 py-0.5 rounded-md ${badgeColor} shadow-sm`}>
                        {zoneData.zoneCode}
                      </span>
                      {zoneData.description && <span className="text-xs font-semibold opacity-90">{zoneData.description}</span>}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 font-bold tracking-wide uppercase">
                      {zoneData.region} • {zoneData.cities.length} Cities
                    </span>
                  </div>
                </div>

                {/* Expand Icon */}
                <div
                  className={`p-1.5 rounded-full bg-white/50 backdrop-blur-sm transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''
                    }`}
                >
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </div>
              </div>

              {/* CARD CONTENT (Cities) */}
              <div
                className={`transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
              >
                <div className="divide-y divide-slate-50">
                  {zoneData.cities.map(cityData => {
                    const cState = getCityState(cityData);
                    const isCityOpen = expandedCities.has(cityData.cityKey);
                    const selInCity = cityData.pincodes.filter(p =>
                      selectedPincodes.has(p),
                    ).length;
                    const showAll = cityShowAll.has(cityData.cityKey);
                    const visiblePincodes = showAll
                      ? cityData.pincodes
                      : cityData.pincodes.slice(0, PINCODE_SHOW_LIMIT);
                    const hiddenCount =
                      cityData.pincodes.length - PINCODE_SHOW_LIMIT;

                    return (
                      <div key={cityData.cityKey} className="bg-slate-50/5">
                        {/* City Row */}
                        <div
                          className={`flex items-center gap-2 px-3 py-1.5 transition-colors cursor-pointer group
                                    ${isCityOpen ? 'bg-blue-50/40' : 'hover:bg-slate-50'}`}
                          onClick={() => toggleExpandCity(cityData.cityKey)}
                        >
                          <IndeterminateCheckbox
                            state={cState}
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              toggleCity(cityData, cState !== 'all');
                            }}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2">
                              <span className="text-sm font-semibold text-slate-700 truncate">
                                {cityData.city}
                              </span>
                              <span className="text-xs text-slate-400 truncate">
                                {cityData.state}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] font-medium text-slate-500">
                                {cityData.pincodes.length} pincodes
                              </span>
                              {selInCity > 0 && (
                                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-1.5 rounded-full">
                                  {selInCity} selected
                                </span>
                              )}
                            </div>
                          </div>

                          <ChevronRight
                            className={`w-3.5 h-3.5 text-slate-300 transition-transform ${isCityOpen ? 'rotate-90' : ''
                              }`}
                          />
                        </div>

                        {/* Pincodes Grid */}
                        {isCityOpen && (
                          <div className="px-3 pb-3 pt-2 bg-slate-50/50 border-t border-dashed border-slate-200 ml-6 border-l-2 border-slate-200">
                            <div className="flex flex-wrap gap-1.5">
                              {visiblePincodes.map(pc => {
                                const isSel = selectedPincodes.has(pc);
                                return (
                                  <button
                                    key={pc}
                                    onClick={(e) => { e.stopPropagation(); togglePincode(pc); }}
                                    className={`text-xs font-medium px-2.5 py-1 rounded border shadow-sm transition-all
                                                        ${isSel ? 'bg-blue-600 text-white border-blue-600 ring-1 ring-blue-600' : 'bg-white border-slate-300 text-slate-700 hover:border-blue-400 hover:text-blue-600 hover:shadow-md'}`}
                                  >
                                    {pc}
                                  </button>
                                )
                              })}
                              {hiddenCount > 0 && !showAll && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCityShowAll(s => new Set(s).add(cityData.cityKey));
                                  }}
                                  className="text-xs font-medium text-blue-600 hover:underline px-2"
                                >
                                  +{hiddenCount} more...
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ══ BOTTOM CONFIRM (mirrors top bar for long lists) ═══════════════ */}
      {/* ══ BOTTOM CONFIRM (mirrors top bar for long lists) ═══════════════ */}
      {
        selectedCount > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800 font-medium">
              <span className="font-bold">{selectedCount.toLocaleString()}</span>
              &nbsp;pincodes ready to apply
            </p>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold
                           rounded-lg hover:bg-blue-700 transition-colors
                           flex items-center gap-2 shadow-sm"
            >
              <CheckCircle className="w-4 h-4" />
              Apply & Continue →
            </button>
          </div>
        )
      }
    </div >
  );
};

export default ZoneSelectionWizard;
