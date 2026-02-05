// src/hooks/usePincodeData.ts
import { useEffect, useMemo, useRef, useState } from "react";

export type PincodeRow = {
  pincode: string;            // "560001"
  zone: string;               // e.g. "S1", "N3"
  state: string;              // "Karnataka"
  city: string;               // "Bengaluru"
  district: string;           // "Bengaluru Urban"
};

type Indexes = {
  byPin: Map<string, PincodeRow>;
  byCity: Map<string, PincodeRow[]>;
  byDistrict: Map<string, PincodeRow[]>;
  byState: Map<string, PincodeRow[]>;
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export function usePincodeData() {
  const [rows, setRows] = useState<PincodeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<number | null>(null);
  const buildTimeMS = useRef<number>(0);

  useEffect(() => {
    let isMounted = true;
    const t0 = performance.now();

    fetch("/pincodes.json", { cache: "force-cache" })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to fetch pincodes.json (${r.status})`);
        return r.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const arr: PincodeRow[] = Array.isArray(data) ? data : data?.data ?? [];
        setRows(arr);
        setLoadedAt(Date.now());
      })
      .catch((e) => {
        if (!isMounted) return;
        console.error(e);
        setError(String(e?.message || e));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const indexes: Indexes | null = useMemo(() => {
    if (!rows) return null;
    const t0 = performance.now();

    const byPin = new Map<string, PincodeRow>();
    const byCity = new Map<string, PincodeRow[]>();
    const byDistrict = new Map<string, PincodeRow[]>();
    const byState = new Map<string, PincodeRow[]>();

    for (const r of rows) {
      if (r?.pincode) byPin.set(String(r.pincode), r);

      const cityKey = normalize(r.city || "");
      if (cityKey) {
        const arr = byCity.get(cityKey) || [];
        arr.push(r);
        byCity.set(cityKey, arr);
      }

      const distKey = normalize(r.district || "");
      if (distKey) {
        const arr = byDistrict.get(distKey) || [];
        arr.push(r);
        byDistrict.set(distKey, arr);
      }

      const stateKey = normalize(r.state || "");
      if (stateKey) {
        const arr = byState.get(stateKey) || [];
        arr.push(r);
        byState.set(stateKey, arr);
      }
    }

    buildTimeMS.current = Math.round(performance.now() - t0);
    return { byPin, byCity, byDistrict, byState };
  }, [rows]);

  function lookupByPincode(pin: string) {
    const p = pin.replace(/\D/g, "").slice(0, 6);
    if (!indexes) return null;
    return indexes.byPin.get(p) || null;
  }

  // simple “startsWith” style search over city/district/state
  function search(query: string, scope: "city"|"district"|"state" = "city", limit = 20) {
    if (!indexes) return [];
    const q = normalize(query);
    if (!q) return [];
    const source =
      scope === "city" ? indexes.byCity :
      scope === "district" ? indexes.byDistrict :
      indexes.byState;

    const out: PincodeRow[] = [];
    for (const [key, list] of source.entries()) {
      if (key.startsWith(q)) {
        for (const r of list) {
          out.push(r);
          if (out.length >= limit) return out;
        }
      }
    }
    return out;
  }

  return {
    rows,
    error,
    loadedAt,
    buildTimeMS: buildTimeMS.current,
    ready: Boolean(indexes),
    lookupByPincode,
    search,
  };
}
