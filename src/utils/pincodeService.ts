export type PincodeRow = { pincode: string; zone: string; state: string; city: string };

export async function loadPincodes(): Promise<PincodeRow[]> {
  const res = await fetch('/pincodes.json');
  if (!res.ok) throw new Error('Failed to load pincodes.json');
  const data = (await res.json()) as PincodeRow[];
  // ensure normalized strings
  return data.map(r => ({
    pincode: String(r.pincode).trim(),
    zone: (r.zone ?? '').trim(),
    state: (r.state ?? '').trim(),
    city: (r.city ?? '').trim(),
  }));
}
