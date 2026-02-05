// src/pages/TestLab.tsx
import React, { useMemo, useState } from "react";
import {
  MapPin,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Compass,
  DatabaseZap,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePincodes } from "../context/PincodeContext";

type Row = {
  pincode: string;
  city: string;
  district: string;
  state: string;
  zone: string;
};

export default function TestLab() {
  const {
    ready,
    error,
    getByPincode,
    search,
    suggestCities,
    suggestDistricts,
    suggestStates,
    didYouMeanCity,
    didYouMeanDistrict,
    didYouMeanState,
  } = usePincodes();

  const [pin, setPin] = useState("");
  const [cityQ, setCityQ] = useState("");
  const [distQ, setDistQ] = useState("");
  const [stateQ, setStateQ] = useState("");

  const pinResult = useMemo(
    () => (pin.length === 6 ? getByPincode(pin) : null),
    [pin, getByPincode]
  );

  // Suggestions (local only)
  const cityOpts = useMemo(
    () => (cityQ.trim().length >= 2 ? suggestCities(cityQ, 25) : []),
    [cityQ, suggestCities]
  );
  const distOpts = useMemo(
    () => (distQ.trim().length >= 2 ? suggestDistricts(distQ, 25) : []),
    [distQ, suggestDistricts]
  );
  const stateOpts = useMemo(
    () => (stateQ.trim().length >= 2 ? suggestStates(stateQ, 25) : []),
    [stateQ, suggestStates]
  );

  // Results table uses whichever field has text (priority: city > district > state)
  const query = cityQ || distQ || stateQ;
  const results: Row[] = useMemo(() => {
    if (query.trim().length < 2) return [];
    return search(query, 50) as Row[];
  }, [query, search]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header className="flex items-center gap-3">
        <DatabaseZap className="h-6 w-6 text-indigo-600" />
        <h1 className="text-2xl font-semibold">Test Lab</h1>
      </header>

      {/* Status */}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          title="Dataset"
          value={ready ? "Loaded" : "Loading…"}
          sub={error ? "Failed to load" : "From /public/pincodes.json"}
          ok={ready && !error}
        />
        <StatCard
          title="Index build"
          value={ready ? "OK" : "—"}
          sub="In-memory maps for instant lookups"
          ok={ready}
        />
        <StatCard
          title="Health"
          value={error ? "Error" : ready ? "Ready" : "Initializing"}
          sub={error ?? ""}
          ok={!error}
        />
      </div>

      {/* PIN → autofill */}
      <section className="p-5 rounded-2xl border bg-white shadow-sm space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5" /> Pincode → Autofill
        </h2>

        <div className="flex gap-3 items-start">
          <input
            value={pin}
            onChange={(e) =>
              setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="Enter 6-digit pincode"
            className="w-48 rounded-lg border px-3 py-2 text-sm"
            inputMode="numeric"
            maxLength={6}
          />
          {pin && pin.length === 6 && !pinResult && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" /> Unknown pincode
            </div>
          )}
        </div>

        <AnimatePresence>
          {pinResult && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="grid sm:grid-cols-5 gap-3 text-sm"
            >
              <Field label="Pincode" value={pinResult.pincode} />
              <Field label="City" value={pinResult.city} />
              <Field
                label="District"
                value={(pinResult as any).district ?? pinResult.city}
              />
              <Field label="State" value={pinResult.state} />
              <Field label="Zone" value={pinResult.zone} />
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Autocomplete */}
      <section className="p-5 rounded-2xl border bg-white shadow-sm space-y-5">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Search className="h-5 w-5" /> Local Autocomplete (no network)
        </h2>

        <SuggestBox
          label="City"
          placeholder="Try: dwarka, devbhu, bhubaneshwar, bengaluru…"
          value={cityQ}
          onChange={setCityQ}
          options={cityOpts}
          onPick={setCityQ}
          didYouMean={(q) => (q.trim().length >= 2 ? didYouMeanCity(q) : null)}
        />

        <SuggestBox
          label="District"
          placeholder="Type a district…"
          value={distQ}
          onChange={setDistQ}
          options={distOpts}
          onPick={setDistQ}
          didYouMean={(q) =>
            q.trim().length >= 2 ? didYouMeanDistrict(q) : null
          }
        />

        <SuggestBox
          label="State"
          placeholder="Type a state…"
          value={stateQ}
          onChange={setStateQ}
          options={stateOpts}
          onPick={setStateQ}
          didYouMean={(q) =>
            q.trim().length >= 2 ? didYouMeanState(q) : null
          }
        />

        {/* Results */}
        <div className="mt-4">
          <div className="text-sm text-slate-500 mb-2">
            Results for{" "}
            <span className="font-medium">{query.trim() || "…"}</span>
          </div>
          {results.length ? (
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left w-24">Pincode</th>
                    <th className="px-3 py-2 text-left">City</th>
                    <th className="px-3 py-2 text-left">District</th>
                    <th className="px-3 py-2 text-left">State</th>
                    <th className="px-3 py-2 text-left w-20">Zone</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr
                      key={`${r.pincode}-${r.city}`}
                      className="border-t border-slate-100"
                    >
                      <td className="px-3 py-2 font-mono">{r.pincode}</td>
                      <td className="px-3 py-2">{r.city}</td>
                      <td className="px-3 py-2">
                        {(r as any).district ?? r.city}
                      </td>
                      <td className="px-3 py-2">{r.state}</td>
                      <td className="px-3 py-2">{r.zone}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-slate-500">No results yet.</div>
          )}
        </div>
      </section>

      {/* Future distance demo placeholder */}
      <section className="p-5 rounded-2xl border bg-white shadow-sm space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Compass className="h-5 w-5" /> Distance logic (placeholder)
        </h2>
        <p className="text-sm text-slate-600">
          Stub for later lat/lng or vendor distance API wiring.
        </p>
      </section>
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
  ok,
}: {
  title: string;
  value: string;
  sub?: string;
  ok: boolean;
}) {
  return (
    <div className="p-4 rounded-2xl border bg-white shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="text-lg font-medium flex items-center gap-2">
        {ok ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-500" />
        )}
        {value}
      </div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl border bg-slate-50">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
}

function SuggestBox({
  label,
  placeholder,
  value,
  onChange,
  options,
  onPick,
  didYouMean,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  onPick: (v: string) => void;
  /** returns top-1 guess or null */
  didYouMean?: (q: string) => string | null;
}) {
  const loading = false; // local-only
  const showList = value.trim().length >= 2;

  const dym = useMemo(
    () => (showList && options.length === 0 && didYouMean ? didYouMean(value) : null),
    [showList, options.length, didYouMean, value]
  );

  return (
    <div>
      <div className="text-sm text-slate-600 mb-1">{label}</div>
      <div className="relative">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <div className="absolute right-2 top-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
        </div>
      </div>

      {/* Suggestions */}
      {showList ? (
        options.length ? (
          <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onPick(opt)}
                className="block w-full text-left px-3 py-2 hover:bg-slate-50"
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500 mt-2 flex items-center gap-2">
            No matches.{` `}
            {dym && (
              <button
                type="button"
                onClick={() => onPick(dym)}
                className="inline-flex items-center gap-1 text-indigo-600 hover:underline"
                title="Apply suggestion"
              >
                <Sparkles className="h-4 w-4" />
                Did you mean <span className="font-medium">{dym}</span>?
              </button>
            )}
          </div>
        )
      ) : (
        <div className="text-sm text-slate-400 mt-2">Type ≥ 2 characters…</div>
      )}
    </div>
  );
}
