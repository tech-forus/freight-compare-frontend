// Shared type definitions for the wizard system

export type PriceMatrix = Record
  string /*fromZone*/,
  Record<string /*toZone*/, number>
>;

export type RegionGroup =
  | "North"
  | "South"
  | "East"
  | "West"
  | "Northeast"
  | "Central"
  | "Special";

export interface ZoneConfig {
  zoneCode: string; // e.g., "N1"
  zoneName: string;
  region: RegionGroup;
  selectedStates: string[];
  selectedCities: string[]; // Format: "city||state"
  isComplete: boolean;
}

// 🔥 NEW: Serviceability entry from pincode-authoritative CSV upload
export interface ServiceabilityEntry {
  pincode: string;
  zone: string;
  state: string;
  city: string;
  isODA: boolean;
  active: boolean;
}

export interface WizardDataV1 {
  meta: {
    version: 1;
    updatedAt: string;
  };
  zones: ZoneConfig[];
  priceMatrix: PriceMatrix;
  // 🔥 NEW: Serviceability data from CSV (pincode-authoritative)
  serviceability?: ServiceabilityEntry[];
  serviceabilityChecksum?: string;
  serviceabilitySource?: string; // 'excel', 'wizard', 'manual', etc.
  oda: {
    enabled: boolean;
    pincodes: string[];
    surcharge: { fixed: number; variable: number };
  };
  other: {
    minWeight: number;
    docketCharges: number;
    fuel: number;
    rovCharges: { variable: number; fixed: number };
    codCharges: { variable: number; fixed: number };
    topayCharges: { variable: number; fixed: number };
    handlingCharges: {
      variable: number;
      fixed: number;
      threshholdweight: number;
    };
    appointmentCharges: { variable: number; fixed: number };
    divisor: number | null;
    cftFactor: number | null;
    minCharges: number;
    greenTax: number;
    daccCharges: number;
    miscellanousCharges: number;
    insuaranceCharges: { variable: number; fixed: number };
    odaCharges: { variable: number; fixed: number };
    prepaidCharges: { variable: number; fixed: number };
    fmCharges: { variable: number; fixed: number };
  };
}

export interface PincodeEntry {
  pincode: string;
  state: string;
  city: string;
  zone?: string;
}

export interface YellowPool {
  [region: string]: {
    [cityKey: string]: {
      sources: string[];
    };
  };
}