// src/data/wheelseyeEngineData.ts
import rawData from "./wheelseye_pricing_engine.json";

export type VehicleId =
  | "TATA_ACE"
  | "PICKUP"
  | "TEN_FT"
  | "EICHER_14"
  | "EICHER_19"
  | "EICHER_20"
  | "CONTAINER_32";

export interface BaseVehicle {
  vehicleId: VehicleId;
  label: string;
  lengthFt: number;
  slabWeightKg: number;
  prices: Record<string, number>; // keys are stringified km, e.g. "60","100"
}

export interface WeightBucket {
  min: number;
  max: number;
  slabWeightKg: number;
}

export interface ComboComponent {
  vehicleId: VehicleId;
  count: number;
}

export interface ComboOption {
  components: ComboComponent[];
}

export interface ComboDef {
  comboWeightKg: number;
  options: ComboOption[];
}

interface EngineRaw {
  distanceSlabs: number[];
  baseVehicles: BaseVehicle[];
  weightBuckets: WeightBucket[];
  combos: ComboDef[];
}

const DATA = rawData as EngineRaw;

export const WHEELSEYE_DISTANCE_SLABS = DATA.distanceSlabs;
export const WHEELSEYE_BASE_VEHICLES = DATA.baseVehicles;
export const WHEELSEYE_WEIGHT_BUCKETS = DATA.weightBuckets;
export const WHEELSEYE_COMBOS = DATA.combos;
