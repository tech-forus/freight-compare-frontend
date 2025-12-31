import { useCallback, useState } from "react";
import { usePincodes } from "../context/PincodeContext"; // ← your existing context
import { apiGetPincode } from "../services/api";            // ← see #2 below

export type Geo = { pincode?: string; state?: string; city?: string; district?: string; zone?: string; };

export function usePincodeLookup() {
  const { ready, getByPincode, suggestCities, suggestDistricts, suggestStates } = usePincodes();

  const [geo, setGeo] = useState<Geo>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => { setGeo({}); setError(null); setLoading(false); }, []);
  const loadFromDraft = useCallback((draft: Geo) => { setGeo(draft || {}); }, []);

  const setPincode = useCallback(async (pin: string) => {
    const cleaned = (pin || "").replace(/\D/g, "").slice(0, 6);
    if (cleaned.length !== 6) {
      setGeo((g) => ({ ...g, pincode: cleaned, state: undefined, city: undefined, district: undefined, zone: undefined }));
      return;
    }

    setLoading(true);
    setError(null);

    // 1) LOCAL first (instant, same as TestLab)
    let rec = getByPincode(cleaned) as { pincode: string; state: string; city: string; district?: string; zone?: string } | null;

    // 2) Backend fallback only if not found locally
    if (!rec) {
      const apiRec = await apiGetPincode(cleaned); // returns null on 404/network error
      if (apiRec) rec = { pincode: cleaned, state: apiRec.state, city: apiRec.city, district: (apiRec as any).district, zone: (apiRec as any).zone };
    }

    if (rec) setGeo({ pincode: rec.pincode, state: rec.state, city: rec.city, district: rec.district, zone: rec.zone });
    else { setGeo({ pincode: cleaned }); setError("Unknown pincode"); }

    setLoading(false);
  }, [getByPincode]);

  const validateGeo = useCallback(() => Boolean(geo.pincode && geo.pincode.length === 6 && geo.state && geo.city), [geo]);

  return { geo, loading, error, ready, setPincode, reset, loadFromDraft, validateGeo,
           suggestCities, suggestDistricts, suggestStates };
}
