// src/lib/compareCache.ts
// Lightweight compare-page cache with sessionStorage + in-memory Map

// ---------- Types ----------
export type Mode = "Road" | "Rail" | "Air" | "Ship";

export type FormState = {
  fromPincode: string;
  toPincode: string;
  modeOfTransport: Mode;
  boxes: any[];
  // NEW: persist invoice value (store as number; null/undefined = empty)
  invoiceValue?: number | null;
};

type CachedValue = {
  params: any;
  data: any[] | null;
  hiddendata: any[] | null;
  timestamp: number;
  form?: FormState;
};

// ---------- Constants & Helpers ----------
const TTL_MS = 30 * 60 * 1000; // 30 minutes

function getUserId(): string {
  try {
    const raw = localStorage.getItem("authUser");
    if (!raw) return "guest";
    const parsed = JSON.parse(raw);
    return parsed?.customer?._id || parsed?._id || "guest";
  } catch {
    return "guest";
  }
}

function getPrefix(): string { return `fc:cmp:${getUserId()}:`; }
function getFormKey(): string { return `fc:form:${getUserId()}`; }
function getLastKey(): string { return `fc:last:${getUserId()}`; }

const mem = new Map<string, CachedValue>();

function normalize(obj: any): any {
  if (Array.isArray(obj)) return obj.map(normalize);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.keys(obj)
        .sort()
        .map((k) => [k, normalize(obj[k])])
    );
  }
  return obj;
}

// ---------- Compare cache (results) ----------
export function makeCompareKey(params: any): string {
  const normalized = normalize(params);
  const str = JSON.stringify(normalized);
  try {
    return btoa(unescape(encodeURIComponent(str))); // compact key
  } catch {
    return str; // fallback (rare)
  }
}

export function writeCompareCache(
  key: string,
  payload: Omit<CachedValue, "timestamp">
) {
  const value: CachedValue = { ...payload, timestamp: Date.now() };
  const memKey = getPrefix() + key;
  mem.set(memKey, value);
  try {
    sessionStorage.setItem(memKey, JSON.stringify(value));
    sessionStorage.setItem(getLastKey(), key);
  } catch { }
}

export function readCompareCacheByKey(key: string): CachedValue | null {
  const now = Date.now();
  const memKey = getPrefix() + key;
  const inMem = mem.get(memKey);
  if (inMem) {
    if (now - inMem.timestamp > TTL_MS) {
      mem.delete(memKey);
      try {
        sessionStorage.removeItem(memKey);
      } catch { }
      return null;
    }
    return inMem;
  }
  try {
    const raw = sessionStorage.getItem(memKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedValue;
    if (now - parsed.timestamp > TTL_MS) {
      sessionStorage.removeItem(memKey);
      return null;
    }
    mem.set(memKey, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function readLastKey(): string | null {
  try {
    return sessionStorage.getItem(getLastKey());
  } catch {
    return null;
  }
}

// ---------- Form cache (persist user inputs) ----------
export function loadFormState(): FormState | null {
  try {
    const s = sessionStorage.getItem(getFormKey());
    return s ? (JSON.parse(s) as FormState) : null;
  } catch {
    return null;
  }
}

/**
 * Save (merge) form state.
 * - Accepts a partial patch OR a function(prev) => patch
 * - Merges onto existing state so other fields aren’t wiped
 */
export function saveFormState(
  next:
    | Partial<FormState>
    | ((prev: FormState | null) => Partial<FormState> | FormState)
) {
  try {
    const prev = loadFormState();
    const patch =
      typeof next === "function" ? (next as any)(prev) : next;
    const merged = { ...(prev ?? {}), ...(patch ?? {}) } as FormState;
    sessionStorage.setItem(getFormKey(), JSON.stringify(merged));
  } catch { }
}

// ---------- Vacuum old result entries ----------
export function clearStaleCache() {
  try {
    const now = Date.now();
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)!;
      // We check if it starts with "fc:cmp:" which covers all namespaces for cleanup
      if (k && k.startsWith("fc:cmp:")) {
        const raw = sessionStorage.getItem(k);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw) as CachedValue;
          if (now - parsed.timestamp > TTL_MS) {
            sessionStorage.removeItem(k);
            mem.delete(k);
          }
        } catch { }
      }
    }
  } catch { }
}
