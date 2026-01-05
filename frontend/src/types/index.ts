// src/types/index.ts

// ───────────────────────────────────────────────────────────
//  Shipment / Calculator core types
// ───────────────────────────────────────────────────────────

// Transport mode used in your calculator form
export type TransportMode = 'Road' | 'Rail' | 'Air' | 'Ship';

// (NEW) Category of freight for display/quoting (keeps TransportMode unchanged)
export type FreightCategory = 'Parcel' | 'FTL';

// (NEW) Slab info coming back from FTL server pricing
export interface VendorSlabInfo {
  weightKg: number;
  distanceKm: number;
}

// For the main calculator form - Shipment Overview
export interface ShipmentOverviewType {
  // invoiceNumber?: string; // Optional if needed later
  date: string;
  shipperLocation: string;   // Origin Pincode
  destination: string;       // Destination Pincode
  modeOfTransport: TransportMode;
  totalBoxes: number;        // Typically calculated/display-only
  totalWeight: number;       // Typically calculated/display-only
  actualWeight?: number;     // User override for chargeable weight
}

// For individual box entries
export interface BoxDetails {
  id: string;            // Unique ID (e.g., UUID)
  serialNo: number;      // Display sequence
  numberOfBoxes: number;
  qtyPerBox: number;     // If applicable
  totalQty: number;      // numberOfBoxes * qtyPerBox
  length: number;        // In cm or consistent unit
  width: number;         // In cm or consistent unit
  height: number;        // In cm or consistent unit
  weightPerBox: number;  // Actual weight of one box
  totalWeight: number;   // numberOfBoxes * weightPerBox
  description: string;
  uom: string;           // Unit of Measure for dimensions (e.g., "cm", "inch")
  volumetricWeight: number; // Calculated for this box line item
}

// Defines the detailed rate structure for a single vendor
// Align with what admins input and what the backend stores/sends
export interface VendorRateConfig {
  baseFare?: {
    Road?: number;
    Rail?: number;
    Air?: number;
    Ship?: number;
  };
  perKmCharge?: {
    Road?: number;
    Rail?: number;
    Air?: number;
    Ship?: number;
  };
  perKgCharge?: {
    Road?: number;
    Rail?: number;
    Air?: number;
    Ship?: number;
  };
  volumetricWeightDivisor?: { // e.g., 5000, 6000
    Road?: number;
    Rail?: number;
    Air?: number;
    Ship?: number;
  };
  expressSurchargePercent?: number;   // e.g., 0.20 means 20%
  fragileSurchargeAbsolute?: number;  // e.g., 50 flat fee
  // Add any other specific parameters you might need later
  // minChargeableWeight?: { Road?: number; Rail?: number; Air?: number; Ship?: number };
}

// For the data coming from the backend for each vendor (public listing for calculator)
export interface ApiVendorType {
  id: string; // From database
  name: string;
  rateConfig: VendorRateConfig;     // The specific rate structure for this vendor
  serviceablePincodes?: string[];   // List of pincodes they serve
  odaOffered?: boolean;             // Out of Delivery Area assistance offered
  odaDetails?: string;              // Notes about their ODA policy
  // logoUrl?: string;
}

// For displaying calculated quotes to the user
export interface VendorQuote {
  vendorName: string;        // Display name (e.g., "Wheelseye FTL", "BlueDart")
  deliveryTime: string;      // e.g., "2-3 days"
  chargeableWeight: number;
  totalCost: number;         // Final price

  // Optional breakdowns (used by parcel vendors today)
  baseFare?: number;
  distanceCharge?: number;
  weightCharge?: number;
  handling?: number;         // e.g., fragile handling fee
  surcharges?: number;       // e.g., express surcharge amount

  // ── NEW: harmless, optional fields to support FTL quotes ──
  category?: FreightCategory;   // "FTL" for FTL quotes; omit/undefined for parcel
  distanceKm?: number;          // Returned by server for FTL
  weightKg?: number;            // Returned by server for FTL
  slab?: VendorSlabInfo;        // { weightKg, distanceKm } from server

  // ── VERIFICATION STATUS: optional fields for vendor verification badges ──
  approvalStatus?: 'pending' | 'approved' | 'rejected';  // From Super Admin approval system
  isSpecialVendor?: boolean;    // True for LOCAL FTL, Wheelseye FTL (client-side injected vendors)

  // (Optional UI niceties)
  rating?: number;
  badges?: string[];
}

// This Location type might still be used for dropdowns,
// but pincodes will be key for filtering/distance
export interface Location {
  id: string;        // Could be pincode itself if unique
  name: string;      // City / Area name
  pincode: string;   // Explicit pincode field
  state?: string;
  // code?: string;
}
