// src/context/PincodeContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadPincodes, PincodeRow } from '../utils/pincodeService';

/** ---- helpers ---- */

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s]/g, ' ')    // punctuation -> space
    .replace(/\s+/g, ' ')
    .trim();

const starts = (a: string, b: string) => a.startsWith(b);
const contains = (a: string, b: string) => a.includes(b);

/** small, fast, capped edit distance. returns 0..cap, or cap+1 for “too far” */
const editCap = (a: string, b: string, cap = 3) => {
  if (a === b) return 0;
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > cap) return cap + 1;

  const dp = Array.from({ length: lb + 1 }, (_, j) => j);
  for (let i = 1; i <= la; i++) {
    let prev = i - 1;
    dp[0] = i;
    let bestRow = dp[0];
    for (let j = 1; j <= lb; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(
        dp[j] + 1,       // deletion
        dp[j - 1] + 1,   // insertion
        prev + cost      // substitution
      );
      prev = tmp;
      if (dp[j] < bestRow) bestRow = dp[j];
    }
    if (bestRow > cap) return cap + 1; // early exit
  }
  return Math.min(dp[lb], cap + 1);
};

/** aliases for common spellings / short forms */
const ALIASES: Record<string, string[]> = {
  // cities / districts
  'bhubaneswar': ['bhubaneshwar', 'bhubanewar', 'bhubaneswer', 'bhubneswar', 'bhuvaneshwar', 'bhuvaneswar'],
  'devbhumi dwarka': ['dwarka', 'dwaraka', 'dwraka', 'dvvarka', 'dvarka', 'dwarma', 'devbhumi', 'devbhoomi', 'devbhumi-dwarka'],
  'bengaluru': ['bangalore', 'blr'],
  'mumbai': ['bombay', 'bom'],
  'kolkata': ['calcutta'],
  'chennai': ['madras'],
  'thiruvananthapuram': ['trivandrum'],
  'prayagraj': ['allahabad'],
  'vadodara': ['baroda'],

  // states / UTs
  'odisha': ['orissa'],
  'puducherry': ['pondicherry'],
  'uttarakhand': ['uttaranchal'],
};

type Ctx = {
  ready: boolean;
  error: string | null;
  // lookups
  getByPincode: (pin: string) => PincodeRow | null;
  search: (q: string, limit?: number) => PincodeRow[];
  // convenience
  validatePincode: (pin: string) => boolean;
  suggestCities: (q: string, limit?: number) => string[];
  suggestDistricts: (q: string, limit?: number) => string[];
  suggestStates: (q: string, limit?: number) => string[];
  // “did you mean?” – top 1 fuzzy suggestion (or null)
  didYouMeanCity: (q: string) => string | null;
  didYouMeanDistrict: (q: string) => string | null;
  didYouMeanState: (q: string) => string | null;
};

const PincodeContext = createContext<Ctx | null>(null);

export const PincodeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rows, setRows] = useState<PincodeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const byPinRef = useRef<Map<string, PincodeRow> | null>(null);

  // for suggestions: unique originals keyed by normalized
  const cityIndexRef = useRef<Map<string, string> | null>(null);
  const districtIndexRef = useRef<Map<string, string> | null>(null);
  const stateIndexRef = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    let mounted = true;
    loadPincodes()
      .then((d) => {
        if (!mounted) return;
        setRows(d);

        byPinRef.current = new Map(d.map((r) => [String(r.pincode).trim(), r]));

        const cityIdx = new Map<string, string>();
        const distIdx = new Map<string, string>();
        const stateIdx = new Map<string, string>();

        for (const r of d) {
          if (r.city) {
            const nc = norm(r.city);
            if (!cityIdx.has(nc)) cityIdx.set(nc, r.city);
          }
          const district = (r as any).district ?? r.city;
          if (district) {
            const nd = norm(String(district));
            if (!distIdx.has(nd)) distIdx.set(nd, String(district));
          }
          if (r.state) {
            const ns = norm(r.state);
            if (!stateIdx.has(ns)) stateIdx.set(ns, r.state);
          }
        }
        cityIndexRef.current = cityIdx;
        districtIndexRef.current = distIdx;
        stateIndexRef.current = stateIdx;
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || 'Failed to load pincodes');
      });
    return () => { mounted = false; };
  }, []);

  const getByPincode = (pin: string) => {
    const idx = byPinRef.current;
    if (!idx) return null;
    return idx.get(String(pin).trim()) ?? null;
  };

  /** smart search across pincode/city/district/state with fuzzy */
  const search = (q: string, limit = 10) => {
    const data = rows ?? [];
    let s = norm(q);

    if (!s) return data.slice(0, limit);

    // If numeric → prioritize pincode startsWith
    if (/^\d+$/.test(s)) {
      const startsArr: PincodeRow[] = [];
      const others: PincodeRow[] = [];
      for (const r of data) {
        if (String(r.pincode).startsWith(s)) startsArr.push(r);
        else if (r.pincode.includes(s)) others.push(r);
        if (startsArr.length >= limit) break;
      }
      return startsArr.concat(others).slice(0, limit);
    }

    // expand aliases
    const variants = new Set<string>([s]);
    for (const [canonical, alist] of Object.entries(ALIASES)) {
      if (canonical === s || alist.some(a => norm(a) === s)) {
        variants.add(norm(canonical));
        alist.forEach(a => variants.add(norm(a)));
      }
    }

    const tokens = s.split(' ');
    const scored: Array<{ r: PincodeRow; score: number }> = [];

    for (const r of data) {
      const city = norm(r.city);
      const district = norm((r as any).district ?? r.city);
      const state = norm(r.state);

      let best = 0;

      // alias variants
      for (const v of variants) {
        // strong hits
        if (starts(city, v)) best = Math.max(best, 100);
        if (starts(district, v)) best = Math.max(best, 95);
        // mid hits
        if (contains(city, v)) best = Math.max(best, 75);
        if (contains(district, v)) best = Math.max(best, 70);
        if (contains(state, v)) best = Math.max(best, 55);

        // fuzzy up to distance 3
        const d1 = editCap(city, v, 3);
        const d2 = editCap(district, v, 3);
        const d3 = editCap(state, v, 3);
        if (d1 <= 3) best = Math.max(best, 78 - d1 * 12);
        if (d2 <= 3) best = Math.max(best, 72 - d2 * 12);
        if (d3 <= 3) best = Math.max(best, 56 - d3 * 12);
      }

      // token boosts (multi-word partials)
      for (const t of tokens) {
        if (!t) continue;
        if (starts(city, t)) best += 8;
        else if (contains(city, t)) best += 5;

        if (starts(district, t)) best += 7;
        else if (contains(district, t)) best += 4;

        if (contains(state, t)) best += 2;
      }

      if (best > 0) scored.push({ r, score: best });
    }

    scored.sort((a, b) => b.score - a.score || a.r.pincode.localeCompare(b.r.pincode));
    return scored.slice(0, limit).map(s => s.r);
  };

  const validatePincode = (pin: string) => !!getByPincode(pin);

  /** generic suggester with fuzzy fallback */
  const makeSuggest =
    (indexRef: React.MutableRefObject<Map<string, string> | null>) =>
    (q: string, limit = 10) => {
      const idx = indexRef.current;
      if (!idx) return [];
      const s = norm(q);
      const items = Array.from(idx.entries()); // [normalized, original]
      if (!s) return items.slice(0, limit).map(([, original]) => original);

      // score normalized keys against query, prefer starts/contains, then fuzzy
      const scored: Array<{ k: string; v: string; score: number }> = [];
      for (const [k, v] of items) {
        let score = 0;
        if (starts(k, s)) score = 100;
        else if (contains(k, s)) score = 80;
        else {
          const d = editCap(k, s, 3);
          if (d <= 3) score = 65 - d * 12;
        }
        if (score > 0) scored.push({ k, v, score });
      }
      scored.sort((a, b) => b.score - a.score || a.v.localeCompare(b.v));

      // If nothing scored (e.g., heavy typo like "dwarma"), do a pure fuzzy fallback
      if (scored.length === 0 && s.length >= 3) {
        const fuzz: Array<{ k: string; v: string; score: number }> = [];
        for (const [k, v] of items) {
          const d = editCap(k, s, 3);
          if (d <= 3) fuzz.push({ k, v, score: 50 - d * 10 });
        }
        fuzz.sort((a, b) => b.score - a.score || a.v.localeCompare(b.v));
        return fuzz.slice(0, limit).map(x => x.v);
      }

      return scored.slice(0, limit).map((x) => x.v);
    };

  const suggestCities = makeSuggest(cityIndexRef);
  const suggestDistricts = makeSuggest(districtIndexRef);
  const suggestStates = makeSuggest(stateIndexRef);

  // “did you mean?” convenience: top 1 or null
  const top1 = (arr: string[]) => (arr && arr.length ? arr[0] : null);
  const didYouMeanCity = (q: string) => top1(suggestCities(q, 1));
  const didYouMeanDistrict = (q: string) => top1(suggestDistricts(q, 1));
  const didYouMeanState = (q: string) => top1(suggestStates(q, 1));

  const value = useMemo<Ctx>(
    () => ({
      ready: !!rows && !error,
      error,
      getByPincode,
      search,
      validatePincode,
      suggestCities,
      suggestDistricts,
      suggestStates,
      didYouMeanCity,
      didYouMeanDistrict,
      didYouMeanState,
    }),
    [rows, error]
  );

  return <PincodeContext.Provider value={value}>{children}</PincodeContext.Provider>;
};

export function usePincodes() {
  const ctx = useContext(PincodeContext);
  if (!ctx) throw new Error('usePincodes must be used inside <PincodeProvider>');
  return ctx;
}
