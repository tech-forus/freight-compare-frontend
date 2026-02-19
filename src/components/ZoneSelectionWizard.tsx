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
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle,
  Search,
  X,
  Globe,
  Building2,
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
}

interface RegionData {
  region: string;
  totalPincodes: number;
  cities: CityData[];
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

const REGION_ORDER: string[] = [
  'North',
  'Central',
  'East',
  'West',
  'South',
  'Northeast',
  'Special',
];

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
  const [regions, setRegions] = useState<RegionData[]>([]);
  // Fast pincode → raw entry lookup (needed for building ZoneConfig output)
  const [pincodeIndex, setPincodeIndex] = useState<
    Map<string, RawPincodeEntry>
  >(new Map());

  // ── Selection ────────────────────────────────────────────────────────────
  const [selectedPincodes, setSelectedPincodes] = useState<Set<string>>(
    new Set(),
  );

  // ── UI state ─────────────────────────────────────────────────────────────
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(
    new Set(),
  );
  const [expandedCities, setExpandedCities] = useState<Set<string>>(new Set());
  // Cities showing ALL their pincodes (beyond PINCODE_SHOW_LIMIT)
  const [cityShowAll, setCityShowAll] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  // ── Pre-compute flat pincode list per region (for fast select-all) ────────
  const regionPincodeList = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of regions) {
      m.set(r.region, r.cities.flatMap(c => c.pincodes));
    }
    return m;
  }, [regions]);

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

        // Build index + region→city→pincodes hierarchy in a single pass
        const index = new Map<string, RawPincodeEntry>();
        // regionName → cityKey → pincodes[]
        const regionMap = new Map<string, Map<string, string[]>>();

        for (const entry of data) {
          const pc = String(entry.pincode);
          index.set(pc, entry);

          const region = zoneToRegion(entry.zone);
          const cityKey = `${(entry.city ?? '').toUpperCase()}||${(
            entry.state ?? ''
          ).toUpperCase()}`;

          if (!regionMap.has(region)) regionMap.set(region, new Map());
          const cmap = regionMap.get(region)!;
          if (!cmap.has(cityKey)) cmap.set(cityKey, []);
          cmap.get(cityKey)!.push(pc);
        }

        // Materialise sorted RegionData[]
        const builtRegions: RegionData[] = [];
        for (const regionName of REGION_ORDER) {
          const cmap = regionMap.get(regionName);
          if (!cmap || cmap.size === 0) continue;

          const cities: CityData[] = [];
          for (const [ck, pcs] of cmap.entries()) {
            const [city, state] = ck.split('||');
            cities.push({
              city,
              state,
              cityKey: ck,
              pincodes: pcs.sort(),
            });
          }
          cities.sort((a, b) => a.city.localeCompare(b.city));

          builtRegions.push({
            region: regionName,
            totalPincodes: cities.reduce((s, c) => s + c.pincodes.length, 0),
            cities,
          });
        }

        setRegions(builtRegions);
        setPincodeIndex(index);

        // Auto-expand the first region
        if (builtRegions.length > 0) {
          setExpandedRegions(new Set([builtRegions[0].region]));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[ZoneSelectionWizard] Load failed:', err);
          setLoadError('Failed to load pincode data. Please refresh the page.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Derived selection states ──────────────────────────────────────────────

  const getRegionState = useCallback(
    (regionName: string): 'none' | 'some' | 'all' => {
      const list = regionPincodeList.get(regionName) ?? [];
      if (!list.length) return 'none';
      const n = list.filter(p => selectedPincodes.has(p)).length;
      if (n === 0) return 'none';
      return n === list.length ? 'all' : 'some';
    },
    [regionPincodeList, selectedPincodes],
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

  const toggleRegion = useCallback(
    (name: string, selectAll: boolean) => {
      const list = regionPincodeList.get(name) ?? [];
      setSelectedPincodes(prev => {
        const next = new Set(prev);
        list.forEach(p => (selectAll ? next.add(p) : next.delete(p)));
        return next;
      });
    },
    [regionPincodeList],
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

  const toggleExpandRegion = useCallback((name: string) => {
    setExpandedRegions(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
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
    zones.sort((a, b) => a.zoneCode.localeCompare(b.zoneCode));

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

  // ── Search filter ─────────────────────────────────────────────────────────

  const filteredRegions = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q) return regions;
    return regions
      .map(r => ({
        ...r,
        cities: r.cities.filter(
          c =>
            c.city.includes(q) ||
            c.state.includes(q) ||
            c.pincodes.some(p => p.startsWith(q)),
        ),
      }))
      .filter(r => r.cities.length > 0);
  }, [regions, search]);

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
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4
                               text-slate-400 pointer-events-none" />
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

      {/* ══ REGION ACCORDIONS ═════════════════════════════════════════════ */}
      <div className="space-y-2">
        {filteredRegions.length === 0 && search && (
          <div className="text-center py-14 text-slate-400">
            <MapPin className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No results for &ldquo;{search}&rdquo;</p>
          </div>
        )}

        {filteredRegions.map(regionData => {
          const isExpanded =
            search.trim() !== '' || expandedRegions.has(regionData.region);
          const rState = getRegionState(regionData.region);
          const selInRegion = (regionPincodeList.get(regionData.region) ?? [])
            .filter(p => selectedPincodes.has(p)).length;

          return (
            <div
              key={regionData.region}
              className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs"
            >
              {/* ── Region header ──────────────────────────────────────── */}
              <div
                className={`flex items-center gap-3 px-4 py-3 transition-colors select-none
                  ${isExpanded
                    ? 'bg-slate-100 border-b border-slate-200'
                    : 'bg-slate-50 hover:bg-slate-100'
                  }`}
              >
                {/* Zone checkbox */}
                <IndeterminateCheckbox
                  state={rState}
                  onClick={e => {
                    e.stopPropagation();
                    toggleRegion(regionData.region, rState !== 'all');
                  }}
                />

                {/* Zone label — click expands */}
                <button
                  type="button"
                  onClick={() => toggleExpandRegion(regionData.region)}
                  className="flex items-center gap-2 flex-1 text-left min-w-0"
                >
                  <Globe className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <span className="font-semibold text-slate-900">
                    {regionData.region}
                  </span>
                  <span className="text-xs text-slate-400 truncate">
                    {regionData.cities.length} cities
                    &nbsp;·&nbsp;
                    {regionData.totalPincodes.toLocaleString()} pincodes
                  </span>
                  {selInRegion > 0 && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700
                                     text-xs font-medium rounded-full flex-shrink-0">
                      {selInRegion.toLocaleString()} selected
                    </span>
                  )}
                </button>

                {/* Quick-action buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      toggleRegion(regionData.region, true);
                    }}
                    className="text-xs px-2.5 py-1 bg-white border border-slate-200
                               text-blue-700 rounded-md hover:bg-blue-50 hover:border-blue-300
                               transition-colors"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      toggleRegion(regionData.region, false);
                    }}
                    className="text-xs px-2.5 py-1 bg-white border border-slate-200
                               text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleExpandRegion(regionData.region)}
                    className="p-1.5 rounded hover:bg-slate-200 transition-colors"
                  >
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-slate-500" />
                      : <ChevronRight className="w-4 h-4 text-slate-500" />
                    }
                  </button>
                </div>
              </div>

              {/* ── Cities list ────────────────────────────────────────── */}
              {isExpanded && (
                <div className="divide-y divide-slate-50">
                  {regionData.cities.map(cityData => {
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
                      <div key={cityData.cityKey}>

                        {/* ── City row ───────────────────────────────── */}
                        <div
                          className={`flex items-center gap-2.5 px-4 py-2.5 group
                                      transition-colors
                            ${isCityOpen
                              ? 'bg-blue-50/30'
                              : 'hover:bg-slate-50/60'
                            }`}
                        >
                          {/* indent spacer aligns with region chevron */}
                          <span className="w-4 flex-shrink-0" />

                          {/* City checkbox */}
                          <IndeterminateCheckbox
                            state={cState}
                            size="sm"
                            onClick={e => {
                              e.stopPropagation();
                              toggleCity(cityData, cState !== 'all');
                            }}
                          />

                          {/* City label */}
                          <button
                            type="button"
                            onClick={() => toggleExpandCity(cityData.cityKey)}
                            className="flex items-center gap-2 flex-1 text-left min-w-0"
                          >
                            <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-sm font-medium text-slate-800 truncate">
                              {cityData.city}
                            </span>
                            <span className="text-xs text-slate-400 flex-shrink-0">
                              {cityData.state}
                            </span>
                            <span className="text-xs text-slate-300 flex-shrink-0">
                              · {cityData.pincodes.length}
                            </span>
                            {selInCity > 0 && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700
                                               text-xs rounded-full flex-shrink-0">
                                {selInCity}/{cityData.pincodes.length}
                              </span>
                            )}
                          </button>

                          {/* City quick-actions (show on hover) */}
                          <div className="flex items-center gap-1
                                          opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                toggleCity(cityData, true);
                              }}
                              className="text-xs px-1.5 py-0.5 text-blue-600
                                         hover:bg-blue-50 rounded transition-colors"
                            >
                              All
                            </button>
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                toggleCity(cityData, false);
                              }}
                              className="text-xs px-1.5 py-0.5 text-slate-500
                                         hover:bg-slate-100 rounded transition-colors"
                            >
                              None
                            </button>
                          </div>

                          {/* Expand toggle */}
                          <button
                            type="button"
                            onClick={() => toggleExpandCity(cityData.cityKey)}
                            className="p-0.5 rounded hover:bg-slate-200 transition-colors flex-shrink-0"
                          >
                            {isCityOpen
                              ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            }
                          </button>
                        </div>

                        {/* ── Pincodes grid ──────────────────────────── */}
                        {isCityOpen && (
                          <div className="pl-[3.75rem] pr-4 pb-3 pt-2 bg-slate-50/40">

                            {/* Select all / none for this city */}
                            <div className="flex gap-2 mb-2">
                              <button
                                type="button"
                                onClick={() => toggleCity(cityData, true)}
                                className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700
                                           border border-blue-200 rounded-md
                                           hover:bg-blue-100 transition-colors"
                              >
                                Select all pincodes
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleCity(cityData, false)}
                                className="text-xs px-2 py-0.5 bg-white text-slate-500
                                           border border-slate-200 rounded-md
                                           hover:bg-slate-100 transition-colors"
                              >
                                Clear
                              </button>
                            </div>

                            {/* Pincode chips */}
                            <div className="flex flex-wrap gap-1.5">
                              {visiblePincodes.map(pc => {
                                const isSel = selectedPincodes.has(pc);
                                return (
                                  <button
                                    key={pc}
                                    type="button"
                                    onClick={() => togglePincode(pc)}
                                    className={`text-xs px-2.5 py-1 rounded-md border font-mono
                                                transition-all duration-100
                                      ${isSel
                                        ? 'border-blue-400 bg-blue-500 text-white shadow-sm'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                                      }`}
                                  >
                                    {isSel && (
                                      <Check className="inline w-3 h-3 mr-0.5 -mt-0.5" />
                                    )}
                                    {pc}
                                  </button>
                                );
                              })}

                              {/* Show more / show less */}
                              {hiddenCount > 0 && !showAll && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCityShowAll(prev => {
                                      const n = new Set(prev);
                                      n.add(cityData.cityKey);
                                      return n;
                                    })
                                  }
                                  className="text-xs px-2.5 py-1 rounded-md border border-dashed
                                             border-slate-300 text-slate-500 hover:bg-slate-100
                                             transition-colors"
                                >
                                  +{hiddenCount} more…
                                </button>
                              )}
                              {showAll && hiddenCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setCityShowAll(prev => {
                                      const n = new Set(prev);
                                      n.delete(cityData.cityKey);
                                      return n;
                                    })
                                  }
                                  className="text-xs px-2.5 py-1 rounded-md border border-dashed
                                             border-slate-300 text-slate-500 hover:bg-slate-100
                                             transition-colors"
                                >
                                  Show less
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ══ BOTTOM CONFIRM (mirrors top bar for long lists) ═══════════════ */}
      {selectedCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3
                        bg-blue-50 border border-blue-200 rounded-xl">
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
            Apply &amp; Continue →
          </button>
        </div>
      )}
    </div>
  );
};

export default ZoneSelectionWizard;
