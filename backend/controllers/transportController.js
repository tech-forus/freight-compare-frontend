
import mongoose from "mongoose";
import customerModel from "../model/customerModel.js";
import priceModel from "../model/priceModel.js";
import temporaryTransporterModel from "../model/temporaryTransporterModel.js";
import transporterModel from "../model/transporterModel.js";
import usertransporterrelationshipModel from "../model/usertransporterrelationshipModel.js";
import dotenv from "dotenv";
import packingModel from "../model/packingModel.js";
import ratingModel from "../model/ratingModel.js";
import PackingList from "../model/packingModel.js"; // Make sure model is imported
import { calculateDistanceBetweenPincode } from "../utils/distanceService.js";
import { zoneForPincode } from "../src/utils/pincodeZoneLookup.js";
import {
  validateZoneMatrix,
  sanitizeZoneCodes,
  validateGSTIN,
  validateEmail,
  validatePhone,
  validatePincode,
  sanitizeString,
} from "../utils/validators.js";
import { validateShipmentDetails } from "../utils/chargeableWeightService.js";

dotenv.config();

/** Helper: robust access to zoneRates whether Map or plain object */
// helper: safe get unit price from various chart shapes and zone key cases
// STRICT: Only returns price if explicit origin→destination or destination→origin rate exists
function getUnitPriceFromPriceChart(priceChart, originZoneCode, destZoneCode) {
  if (!priceChart || !originZoneCode || !destZoneCode) return null;
  const o = String(originZoneCode).trim().toUpperCase();
  const d = String(destZoneCode).trim().toUpperCase();

  // STRATEGY 1: Direct lookup - priceChart[originZone][destZone] or priceChart[destZone][originZone]
  const direct =
    (priceChart[o] && priceChart[o][d]) ??
    (priceChart[d] && priceChart[d][o]);
  if (direct != null) {
    return Number(direct);
  }

  // STRATEGY 2: Case-insensitive search on top level keys
  const keys = Object.keys(priceChart || {});
  for (const k of keys) {
    if (String(k).trim().toUpperCase() === o) {
      const row = priceChart[k] || {};
      const val = row[d] ?? row[String(destZoneCode)];
      if (val != null) return Number(val);
    }
    if (String(k).trim().toUpperCase() === d) {
      const row = priceChart[k] || {};
      const val = row[o] ?? row[String(originZoneCode)];
      if (val != null) return Number(val);
    }
  }

  // No direct rate found - vendor does not have explicit pricing for this route
  return null;
}

export const deletePackingList = async (req, res) => {
  try {
    const preset = await PackingList.findById(req.params.id);

    if (!preset) {
      return res.status(404).json({ message: "Preset not found" });
    }

    await preset.deleteOne();

    res.status(200).json({ message: "Preset deleted successfully" });
  } catch (error) {
    console.error("Error deleting preset:", error);
    res.status(500).json({ message: "Server error while deleting preset." });
  }
};

// -----------------------------
// Helpers for calculatePrice
// -----------------------------
function clampNumber(v, min, max) {
  let n = Number(v || 0);
  if (typeof min === "number" && Number.isFinite(min)) n = Math.max(n, min);
  if (typeof max === "number" && Number.isFinite(max)) n = Math.min(n, max);
  return Math.round(n); // return rupee-rounded integer
}
/**
 * ✅ NEW HELPER: Calculate invoice value based charges
 * Logic: MAX( (InvoiceValue * Percentage / 100), MinimumAmount )
 */
function calculateInvoiceValueCharge(invoiceValue, invoiceValueCharges) {
  // If not enabled or no invoice value, return 0
  if (!invoiceValueCharges?.enabled || !invoiceValue || invoiceValue <= 0) {
    return 0;
  }

  const { percentage, minimumAmount } = invoiceValueCharges;

  // Calculate percentage-based charge
  const percentageCharge = (invoiceValue * (percentage || 0)) / 100;

  // Return MAX of percentage charge or minimum amount
  const finalCharge = Math.max(percentageCharge, minimumAmount || 0);

  return Math.round(finalCharge); // Return rounded rupee amount
}
/**
 * applyInvoiceRule(ruleObject, invoiceValue, ctx)
 * - ruleObject: a small JSON DSL object stored on vendor/price doc (see examples below)
 * - invoiceValue: numeric invoice value (rupees)
 * - ctx: { mode, totalWeight, distance, chargeableWeight, etc. }
 *
 * Supported rule types: "percentage", "flat", "per_unit", "slab", "conditional", "composite"
 * This is purposely conservative and avoids eval() / insecure operations.
 */
function applyInvoiceRule(rule, invoiceValue, ctx = {}) {
  if (!rule) return 0;
  try {
    const type = (rule.type || "").toString().toLowerCase();
    switch (type) {
      case "percentage": {
        const pct = Number(rule.percent || rule.percentage || 0);
        const raw = invoiceValue * (pct / 100);
        return clampNumber(raw, rule.min, rule.max);
      }
      case "flat": {
        return clampNumber(Number(rule.amount || 0), rule.min, rule.max);
      }
      case "per_unit": {
        const unit = Number(rule.unit || rule.unitAmount || 1);
        const amt = Number(rule.amount_per_unit || rule.amount || 0);
        if (unit <= 0) return 0;
        // default: round up units
        const units = rule.round_up
          ? Math.ceil(invoiceValue / unit)
          : Math.floor(invoiceValue / unit);
        const raw = units * amt;
        return clampNumber(raw, rule.min, rule.max);
      }
      case "slab": {
        const slabs = Array.isArray(rule.slabs) ? rule.slabs : [];
        const found = slabs.find((s) => {
          const min = s.min ?? -Infinity;
          const max = s.max ?? Infinity;
          return invoiceValue >= min && invoiceValue <= max;
        });
        if (!found) return 0;
        const pct = Number(found.percent || 0);
        const raw = invoiceValue * (pct / 100);
        return clampNumber(raw, rule.min ?? found.min, rule.max ?? found.max);
      }
      case "conditional": {
        const conds = Array.isArray(rule.conditions) ? rule.conditions : [];
        for (const c of conds) {
          let ok = true;
          const checks = c.if || {};
          for (const k of Object.keys(checks)) {
            if (ctx[k] == null) {
              ok = false;
              break;
            }
            if (String(ctx[k]) !== String(checks[k])) {
              ok = false;
              break;
            }
          }
          if (ok) return applyInvoiceRule(c.rule, invoiceValue, ctx);
        }
        return applyInvoiceRule(rule.default, invoiceValue, ctx);
      }
      case "composite": {
        const parts = Array.isArray(rule.parts) ? rule.parts : [];
        let total = 0;
        for (const p of parts) total += applyInvoiceRule(p, invoiceValue, ctx);
        return clampNumber(total, rule.min, rule.max);
      }
      default:
        return 0;
    }
  } catch (e) {
    console.warn("applyInvoiceRule error:", e?.message || e);
    return 0;
  }
}
// -----------------------------
// Replace your existing calculatePrice with this entire block
// -----------------------------
export const calculatePrice = async (req, res) => {
  try {
    // PERFORMANCE: Minimal logging in hot path
    const startTime = Date.now();
    const {
      customerID,
      userogpincode,
      modeoftransport,
      fromPincode,
      toPincode,
      noofboxes,
      length,
      width,
      height,
      weight,
      shipment_details,
      invoiceValue: invoiceValueRaw, // NEW: invoiceValue from FE
    } = req.body;

    const INVOICE_MIN = 1;
    const INVOICE_MAX = 100_000_000; // configurable upper bound

    const rid = req.id || "no-reqid";

    // Validate invoiceValue - allow missing/empty values (default to 1)
    let invoiceValue = INVOICE_MIN; // Default value
    if (invoiceValueRaw !== undefined && invoiceValueRaw !== null && invoiceValueRaw !== '') {
      const parsedInvoice = Number(invoiceValueRaw);
      if (!Number.isFinite(parsedInvoice) || parsedInvoice < INVOICE_MIN || parsedInvoice > INVOICE_MAX) {
        // DEBUG LOG REMOVED
        invoiceValue = INVOICE_MIN;
      } else {
        invoiceValue = parsedInvoice;
      }
    }
    // DEBUG LOG REMOVED
    let actualWeight;
    if (Array.isArray(shipment_details) && shipment_details.length > 0) {
      actualWeight = shipment_details.reduce(
        (sum, b) => sum + (b.weight || 0) * (b.count || 0),
        0
      );
    } else {
      actualWeight = (weight || 0) * (noofboxes || 0);
    }

    const hasLegacy =
      noofboxes !== undefined &&
      length !== undefined &&
      width !== undefined &&
      height !== undefined &&
      weight !== undefined;

    if (
      !customerID ||
      !userogpincode ||
      !modeoftransport ||
      !fromPincode ||
      !toPincode ||
      (!(Array.isArray(shipment_details) && shipment_details.length > 0) &&
        !hasLegacy)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields. Provide shipment_details or legacy weight/box parameters.",
      });
    }

    // DIMENSION VALIDATION: Reject zero/negative dimensions to prevent volumetric bypass
    // This prevents undercharging for bulky but light items
    if (Array.isArray(shipment_details) && shipment_details.length > 0) {
      const validation = validateShipmentDetails(shipment_details);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          message: `Invalid shipment details: ${validation.error}`,
          error: 'INVALID_DIMENSIONS',
        });
      }
    } else if (hasLegacy) {
      // Validate legacy parameters
      if (length <= 0 || width <= 0 || height <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Dimensions (length, width, height) must be positive numbers',
          error: 'INVALID_DIMENSIONS',
        });
      }
      if (weight < 0) {
        return res.status(400).json({
          success: false,
          message: 'Weight must be a non-negative number',
          error: 'INVALID_WEIGHT',
        });
      }
      if (noofboxes <= 0 || !Number.isInteger(noofboxes)) {
        return res.status(400).json({
          success: false,
          message: 'Number of boxes must be a positive integer',
          error: 'INVALID_BOX_COUNT',
        });
      }
    }

    // Calculate distance using Google Maps API (throws error if no route)
    let distData;
    try {
      distData = await calculateDistanceBetweenPincode(fromPincode, toPincode);
    } catch (error) {
      // Handle NO_ROAD_ROUTE error
      if (error.code === 'NO_ROAD_ROUTE') {
        return res.status(400).json({
          success: false,
          message: error.message,
          error: 'NO_ROAD_ROUTE',
          fromPincode,
          toPincode
        });
      }
      // Handle PINCODE_NOT_FOUND error
      if (error.code === 'PINCODE_NOT_FOUND') {
        return res.status(400).json({
          success: false,
          message: error.message,
          error: 'PINCODE_NOT_FOUND',
          field: error.field
        });
      }
      // Handle API errors
      if (error.code === 'API_KEY_MISSING' || error.code === 'GOOGLE_API_ERROR' || error.code === 'API_TIMEOUT') {
        return res.status(500).json({
          success: false,
          message: 'Distance calculation service unavailable. Please try again.',
          error: error.code
        });
      }
      // Generic error
      console.error('Distance calculation error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to calculate distance',
        error: 'CALCULATION_FAILED'
      });
    }

    const estTime = distData.estTime;
    const dist = distData.distance;

    // canonical values for DB vs lookups
    const fromPinNum = Number(fromPincode);
    const toPinNum = Number(toPincode);
    const fromPinStr = String(fromPincode).trim();
    const toPinStr = String(toPincode).trim();

    try {
      // PERFORMANCE: Run all 3 DB queries in PARALLEL instead of sequential
      console.time(`[${rid}] DB_PARALLEL`);
      const [tiedUpCompanies, customerData, transporterData] = await Promise.all([
        // Query 1: Tied-up companies - OPTIMIZED: Only fetch the 2 pincodes we need from serviceability
        // This reduces data from potentially 30,000+ entries per vendor to just 2
        temporaryTransporterModel.aggregate([
          {
            $match: {
              customerID: new mongoose.Types.ObjectId(customerID),
              $or: [
                { approvalStatus: "approved" },
                { approvalStatus: { $exists: false } }
              ]
            }
          },
          {
            $project: {
              customerID: 1,
              companyName: 1,
              prices: 1,
              selectedZones: 1,
              zoneConfig: 1,
              invoiceValueCharges: 1,
              approvalStatus: 1,
              // CRITICAL OPTIMIZATION: Only fetch the 2 pincodes we need
              serviceability: {
                $filter: {
                  input: { $ifNull: ["$serviceability", []] },
                  as: "s",
                  cond: { $in: ["$$s.pincode", [fromPinStr, toPinStr]] }
                }
              }
            }
          }
        ]).option({ maxTimeMS: 20000 }),

        // Query 2: Customer data
        customerModel
          .findById(customerID)
          .select("isSubscribed")
          .lean()
          .maxTimeMS(15000),

        // Query 3: Public transporters (only select minimal needed fields)
        transporterModel
          .find({})
          .select('_id companyName servicableZones')
          .lean()
          .maxTimeMS(10000)
          .exec()
      ]);
      console.timeEnd(`[${rid}] DB_PARALLEL`);

      if (!customerData) {
        return res
          .status(404)
          .json({ success: false, message: "Customer not found" });
      }
      const isSubscribed = !!customerData.isSubscribed;

      // Zone lookup (fast - uses in-memory map)
      const fromZoneRaw = zoneForPincode(fromPinStr);
      const toZoneRaw = zoneForPincode(toPinStr);
      const fromZone = fromZoneRaw ? String(fromZoneRaw).trim().toUpperCase() : null;
      const toZone = toZoneRaw ? String(toZoneRaw).trim().toUpperCase() : null;

      if (!fromZone || !toZone) {
        return res.status(400).json({
          success: false,
          message: "Invalid pincodes - could not determine zones",
        });
      }

      let l1 = Number.MAX_SAFE_INTEGER;

      // ===== PERFORMANCE: Pre-build serviceability Maps ONCE (not per vendor) =====
      console.time(`[${rid}] PREBUILD_SERVICEABILITY_MAPS`);
      const serviceabilityMaps = new Map(
        tiedUpCompanies.map(tuc => {
          if (!Array.isArray(tuc.serviceability) || tuc.serviceability.length === 0) {
            return [tuc._id, null];
          }

          // Build pincode → entry Map for O(1) lookup instead of O(n) find()
          const pincodeMap = new Map();
          for (const entry of tuc.serviceability) {
            if (entry.active !== false) {
              pincodeMap.set(String(entry.pincode), entry);
            }
          }
          return [tuc._id, pincodeMap];
        })
      );
      console.timeEnd(`[${rid}] PREBUILD_SERVICEABILITY_MAPS`);

      // Tied-up companies (customer-specific vendors)
      console.time(`[${rid}] BUILD tiedUpResult`);
      const tiedUpRaw = await Promise.all(
        tiedUpCompanies.map(async (tuc) => {
          const companyName = tuc.companyName;
          if (!companyName) return null;

          const priceChart = tuc.prices?.priceChart;
          if (!priceChart || !Object.keys(priceChart).length) return null;

          // use already-normalised zones
          const originZone = fromZone;
          const destZone = toZone;
          if (!originZone || !destZone) return null;

          // ============================================================
          // PERFORMANCE: Use pre-built Map for O(1) pincode lookup
          // ============================================================
          const pincodeMap = serviceabilityMaps.get(tuc._id);

          let effectiveOriginZone = originZone;
          let effectiveDestZone = destZone;
          let destIsOda = false;

          if (pincodeMap) {
            // O(1) Map lookup instead of O(n) find()
            const originEntry = pincodeMap.get(fromPinStr);
            const destEntry = pincodeMap.get(toPinStr);

            // Check if both pincodes are serviceable
            if (!originEntry || !destEntry) {
              return null;
            }

            // Use the zones from serviceability
            effectiveOriginZone = originEntry.zone?.toUpperCase() || originZone;
            effectiveDestZone = destEntry.zone?.toUpperCase() || destZone;
            destIsOda = destEntry.isODA === true;
          } else {
            // Legacy zone-based check
            const relSelected = Array.isArray(tuc.selectedZones)
              ? tuc.selectedZones.map((z) => String(z).toUpperCase())
              : [];

            // Debug: Log zone check for vendors with special zones (X1, X2, X3) - only when needed
            // PERF: Removed verbose per-vendor logging

            // Zone-based check: vendor must have both origin and destination zones selected
            if (relSelected.length > 0 &&
              (!relSelected.includes(originZone) || !relSelected.includes(destZone))
            ) {
              // vendor does not serve one of the zones selected
              return null;
            }
          }

          // Get unit price using effective zones (from serviceability or fallback)
          let unitPrice = getUnitPriceFromPriceChart(
            priceChart,
            effectiveOriginZone,
            effectiveDestZone
          );
          if (unitPrice == null) {
            // No price for this route - skip silently for performance
            return null;
          }

          const pr = tuc.prices.priceRate || {};

          // 🔍 DEBUG: Log vendor pricing data for any vendor with "jan" in name (case insensitive)
          if (tuc.companyName && tuc.companyName.toLowerCase().includes('jan')) {
            console.log('🔍 [DEBUG ADD JAN] =====================================');
            console.log(`🔍 [DEBUG] Vendor: "${tuc.companyName}" (_id: ${tuc._id})`);
            console.log(`🔍 [DEBUG] Route: ${effectiveOriginZone} → ${effectiveDestZone}`);
            console.log(`🔍 [DEBUG] unitPrice from priceChart: ₹${unitPrice}/kg`);
            console.log(`🔍 [DEBUG] priceChart content:`, JSON.stringify(tuc.prices?.priceChart));
            console.log(`🔍 [DEBUG] priceRate.docketCharges: ₹${pr.docketCharges}`);
            console.log(`🔍 [DEBUG] priceRate.fuel: ${pr.fuel}%`);
            console.log(`🔍 [DEBUG] priceRate.greenTax: ₹${pr.greenTax}`);
            console.log(`🔍 [DEBUG] priceRate.daccCharges: ₹${pr.daccCharges}`);
            console.log(`🔍 [DEBUG] priceRate.miscellanousCharges: ₹${pr.miscellanousCharges}`);
            console.log(`🔍 [DEBUG] priceRate.minCharges: ₹${pr.minCharges}`);
            console.log(`🔍 [DEBUG] priceRate.rovCharges:`, pr.rovCharges);
            console.log(`🔍 [DEBUG] priceRate.handlingCharges:`, pr.handlingCharges);
            console.log(`🔍 [DEBUG] priceRate.appointmentCharges:`, pr.appointmentCharges);
            console.log(`🔍 [DEBUG] priceRate.divisor/kFactor: ${pr.divisor ?? pr.kFactor ?? 'default 5000'}`);
            console.log('🔍 [DEBUG ADD JAN] =====================================');
          }
          const kFactor = pr.kFactor ?? pr.divisor ?? 5000;

          let volumetricWeight = 0;
          if (Array.isArray(shipment_details) && shipment_details.length > 0) {
            volumetricWeight = shipment_details.reduce((sum, item) => {
              const volWeightForItem =
                ((item.length || 0) *
                  (item.width || 0) *
                  (item.height || 0) *
                  (item.count || 0)) /
                kFactor;
              return sum + Math.ceil(volWeightForItem);
            }, 0);
          } else {
            const volWeightForLegacy =
              ((length || 0) * (width || 0) * (height || 0) * (noofboxes || 0)) /
              kFactor;
            volumetricWeight = Math.ceil(volWeightForLegacy);
          }

          const chargeableWeight = Math.max(volumetricWeight, actualWeight);
          const baseFreight = unitPrice * chargeableWeight;
          const docketCharge = pr.docketCharges || 0;
          const minCharges = pr.minCharges || 0;
          const greenTax = pr.greenTax || 0;
          const daccCharges = pr.daccCharges || 0;
          const miscCharges = pr.miscellanousCharges || 0;
          const fuelCharges = ((pr.fuel || 0) / 100) * baseFreight;
          const rovCharges = Math.max(
            ((pr.rovCharges?.variable || 0) / 100) * baseFreight,
            pr.rovCharges?.fixed || 0
          );
          const insuaranceCharges = Math.max(
            ((pr.insuaranceCharges?.variable || 0) / 100) * baseFreight,
            pr.insuaranceCharges?.fixed || 0
          );
          const odaCharges = destIsOda
            ? (pr.odaCharges?.fixed || 0) +
            chargeableWeight * ((pr.odaCharges?.variable || 0) / 100)
            : 0;
          const handlingCharges =
            (pr.handlingCharges?.fixed || 0) +
            chargeableWeight * ((pr.handlingCharges?.variable || 0) / 100);
          const fmCharges = Math.max(
            ((pr.fmCharges?.variable || 0) / 100) * baseFreight,
            pr.fmCharges?.fixed || 0
          );
          const appointmentCharges = Math.max(
            ((pr.appointmentCharges?.variable || 0) / 100) * baseFreight,
            pr.appointmentCharges?.fixed || 0
          );

          // FIX: minCharges is a FLOOR constraint, not an additive fee
          // effectiveBaseFreight ensures freight is never below minimum
          const effectiveBaseFreight = Math.max(baseFreight, minCharges);

          const totalChargesBeforeAddon =
            effectiveBaseFreight +
            docketCharge +
            // minCharges removed - now enforced as floor via effectiveBaseFreight
            greenTax +
            daccCharges +
            miscCharges +
            fuelCharges +
            rovCharges +
            insuaranceCharges +
            odaCharges +
            handlingCharges +
            fmCharges +
            appointmentCharges;

          // 🔍 DEBUG: Log CALCULATED values for "Add Jan"
          if (tuc.companyName && tuc.companyName.toLowerCase().includes('jan')) {
            console.log('🧮 [DEBUG CALC] =====================================');
            console.log(`🧮 [DEBUG] actualWeight: ${actualWeight} kg`);
            console.log(`🧮 [DEBUG] volumetricWeight: ${volumetricWeight} kg`);
            console.log(`🧮 [DEBUG] chargeableWeight: ${chargeableWeight} kg`);
            console.log(`🧮 [DEBUG] baseFreight: ₹${baseFreight} (${unitPrice} × ${chargeableWeight})`);
            console.log(`🧮 [DEBUG] effectiveBaseFreight: ₹${effectiveBaseFreight}`);
            console.log(`🧮 [DEBUG] fuelCharges: ₹${fuelCharges.toFixed(2)}`);
            console.log(`🧮 [DEBUG] docketCharge: ₹${docketCharge}`);
            console.log(`🧮 [DEBUG] rovCharges: ₹${rovCharges}`);
            console.log(`🧮 [DEBUG] handlingCharges: ₹${handlingCharges}`);
            console.log(`🧮 [DEBUG] appointmentCharges: ₹${appointmentCharges}`);
            console.log(`🧮 [DEBUG] totalChargesBeforeAddon: ₹${totalChargesBeforeAddon.toFixed(2)}`);
            console.log('🧮 [DEBUG CALC] =====================================');
          }

          l1 = Math.min(l1, totalChargesBeforeAddon);

          // --- NEW: invoice addon detection points (try multiple common paths)
          const possibleRule =
            tuc.invoice_rule ||
            tuc.invoiceRule ||
            (tuc.prices &&
              (tuc.prices.invoice_rule || tuc.prices.invoiceRule)) ||
            null;

          // ✅ Use our simple invoiceValueCharges field from schema
          const invoiceAddon = calculateInvoiceValueCharge(
            invoiceValue,
            tuc.invoiceValueCharges
          );

          // PERF: Removed verbose invoiceRule logging

          return {
            companyId: tuc._id,
            companyName: companyName,
            originPincode: fromPincode,
            destinationPincode: toPincode,
            estimatedTime: estTime,
            distance: dist,
            actualWeight: parseFloat(actualWeight.toFixed(2)),
            volumetricWeight: parseFloat(volumetricWeight.toFixed(2)),
            chargeableWeight: parseFloat(chargeableWeight.toFixed(2)),
            unitPrice,
            baseFreight,
            docketCharge,
            minCharges,
            greenTax,
            daccCharges,
            miscCharges,
            fuelCharges,
            rovCharges,
            insuaranceCharges,
            odaCharges,
            handlingCharges,
            fmCharges,
            appointmentCharges,

            // 🔥 NEW FIELDS (needed for UI)
            invoiceValue,                              // What user entered
            invoiceAddon: Math.round(invoiceAddon),    // Calculated surcharge
            invoiceValueCharge: Math.round(invoiceAddon),

            totalCharges: Math.round(totalChargesBeforeAddon + invoiceAddon),
            totalChargesWithoutInvoiceAddon: Math.round(totalChargesBeforeAddon),

            isHidden: false,
            isTemporaryTransporter: true,
            // Zone configuration for Service Zones modal
            selectedZones: tuc.selectedZones || [],
            zoneConfig: tuc.zoneConfig || {},
            priceChart: tuc.prices?.priceChart || {},
            // Approval status for UI display
            approvalStatus: tuc.approvalStatus || 'approved', // Default to approved for legacy vendors
          };

        })
      );
      const tiedUpResult = tiedUpRaw.filter((r) => r);
      console.timeEnd(`[${rid}] BUILD tiedUpResult`);
      // DEBUG LOG REMOVED
      // PERFORMANCE FIX: Removed duplicate DB query and 220 lines of redundant processing
      // The tiedUpCompanies query above already fetches all approved vendors with pricing
      // This saves ~300-500ms per request
      const temporaryTransporterResult = [];

      // ===== PERFORMANCE OPTIMIZATION: Batch fetch all prices (eliminates N+1 query) =====
      // BEFORE: 50 transporters = 50 separate DB queries (10-15 seconds)
      // AFTER: 1 batch query for all transporters (0.5-1 second)
      console.time(`[${rid}] BATCH_FETCH_PRICES`);
      const transporterIds = transporterData.map(t => t._id);
      const allPrices = await priceModel
        .find({ companyId: { $in: transporterIds } })
        .select("companyId priceRate zoneRates invoiceValueCharges")
        .lean()
        .maxTimeMS(15000);

      // Build Map for O(1) lookup instead of O(n) array.find
      const priceMap = new Map(
        allPrices.map(p => [String(p.companyId), p])
      );
      console.timeEnd(`[${rid}] BATCH_FETCH_PRICES`);
      console.log(`[${rid}] Fetched ${allPrices.length} price records for ${transporterIds.length} transporters`);
      // ===== END OPTIMIZATION =====

      // Public transporter results (unchanged except invoice addon)
      console.time(`[${rid}] BUILD transporterResult`);
      const transporterRaw = await Promise.all(
        transporterData.map(async (data) => {
          try {
            // DEBUG LOG REMOVED
            // ========== UNIFIED ZONE LOOKUP (Same as Temporary) ==========

            // PERFORMANCE: Only use fast global zone lookup (O(1) Map lookup)
            // Removed slow Try 2 (zoneConfig loops) and Try 3 (service array loops)
            const originZone = zoneForPincode(String(fromPincode));
            const destZone = zoneForPincode(String(toPincode));

            // REJECT if zones not found
            if (!originZone || !destZone) {
              return null;
            }

            // Normalize zones
            const normalizedOriginZone = String(originZone).toUpperCase();
            const normalizedDestZone = String(destZone).toUpperCase();

            // Public transporters don't have pincode-level ODA data in fast lookup
            const isDestOda = false;

            // ========== PRICING LOOKUP (FIRST) ==========
            // Industry best practice: Check if vendor has pricing for this route BEFORE checking servicableZones
            // Reason: Pricing is the source of truth - if they have a price, they can service it

            // PERFORMANCE: Use pre-fetched Map instead of DB query
            const priceData = priceMap.get(String(data._id));

            if (!priceData) {
              // DEBUG LOG REMOVED
              return null;
            }

            const pr = priceData.priceRate || {};
            const unitPrice = getUnitPriceFromPriceChart(
              priceData.zoneRates,
              normalizedOriginZone,
              normalizedDestZone
            );
            if (!unitPrice) {
              return null;
            }

            // CHECK: Does vendor serve these zones?
            const vendorZones = (data.servicableZones || []).map(z => String(z).toUpperCase());
            if (vendorZones.length > 0 && (!vendorZones.includes(normalizedOriginZone) || !vendorZones.includes(normalizedDestZone))) {
              return null;
            }

            const kFactor = pr.kFactor ?? pr.divisor ?? 5000;

            let volumetricWeight = 0;
            if (Array.isArray(shipment_details) && shipment_details.length > 0) {
              volumetricWeight = shipment_details.reduce((sum, item) => {
                const volWeightForItem =
                  ((item.length || 0) *
                    (item.width || 0) *
                    (item.height || 0) *
                    (item.count || 0)) /
                  kFactor;
                return sum + Math.ceil(volWeightForItem);
              }, 0);
            } else {
              const volWeightForLegacy =
                ((length || 0) * (width || 0) * (height || 0) * (noofboxes || 0)) /
                kFactor;
              volumetricWeight = Math.ceil(volWeightForLegacy);
            }

            const chargeableWeight = Math.max(volumetricWeight, actualWeight);
            const baseFreight = unitPrice * chargeableWeight;
            const docketCharge = pr.docketCharges || 0;
            const minCharges = pr.minCharges || 0;
            const greenTax = pr.greenTax || 0;
            const daccCharges = pr.daccCharges || 0;
            const miscCharges = pr.miscellanousCharges || 0;
            const fuelCharges = ((pr.fuel || 0) / 100) * baseFreight;
            const rovCharges = Math.max(
              ((pr.rovCharges?.variable || 0) / 100) * baseFreight,
              pr.rovCharges?.fixed || 0
            );
            const insuaranceCharges = Math.max(
              ((pr.insuaranceCharges?.variable || 0) / 100) * baseFreight,
              pr.insuaranceCharges?.fixed || 0
            );
            const odaCharges = isDestOda
              ? (pr.odaCharges?.fixed || 0) +
              chargeableWeight * ((pr.odaCharges?.variable || 0) / 100)
              : 0;
            const handlingCharges =
              (pr.handlingCharges?.fixed || 0) +
              chargeableWeight * ((pr.handlingCharges?.variable || 0) / 100);
            const fmCharges = Math.max(
              ((pr.fmCharges?.variable || 0) / 100) * baseFreight,
              pr.fmCharges?.fixed || 0
            );
            const appointmentCharges = Math.max(
              ((pr.appointmentCharges?.variable || 0) / 100) * baseFreight,
              pr.appointmentCharges?.fixed || 0
            );

            // FIX: minCharges is a FLOOR constraint, not an additive fee
            // effectiveBaseFreight ensures freight is never below minimum
            const effectiveBaseFreight = Math.max(baseFreight, minCharges);

            const totalChargesBeforeAddon =
              effectiveBaseFreight +
              docketCharge +
              // minCharges removed - now enforced as floor via effectiveBaseFreight
              greenTax +
              daccCharges +
              miscCharges +
              fuelCharges +
              rovCharges +
              insuaranceCharges +
              odaCharges +
              handlingCharges +
              fmCharges +
              appointmentCharges;

            // PERF: Removed verbose per-vendor success logging

            // NOTE: Removed l1 filter - public vendors should always show regardless of tied-up vendor prices


            // ✅ NEW LOGIC: Calculate Invoice Charges
            const invoiceAddon = calculateInvoiceValueCharge(
              invoiceValue,
              priceData.invoiceValueCharges || {}
            );

            if (!isSubscribed) {
              // Return hidden quote with charges
              return {
                totalCharges: Math.round(totalChargesBeforeAddon + invoiceAddon),
                totalChargesWithoutInvoiceAddon:
                  Math.round(totalChargesBeforeAddon),
                invoiceAddon: Math.round(invoiceAddon),
                invoiceValueCharge: Math.round(invoiceAddon),
                isHidden: true,
              };
            }
            // DEBUG LOG REMOVED
            return {
              companyId: data._id,
              companyName: data.companyName,
              originPincode: fromPincode,
              destinationPincode: toPincode,
              estimatedTime: estTime,
              distance: dist,
              actualWeight: parseFloat(actualWeight.toFixed(2)),
              volumetricWeight: parseFloat(volumetricWeight.toFixed(2)),
              chargeableWeight: parseFloat(chargeableWeight.toFixed(2)),
              unitPrice,
              baseFreight,
              docketCharge,
              minCharges,
              greenTax,
              daccCharges,
              miscCharges,
              fuelCharges,
              rovCharges,
              insuaranceCharges,
              odaCharges,
              handlingCharges,
              fmCharges,
              appointmentCharges,
              totalCharges: Math.round(totalChargesBeforeAddon + invoiceAddon),
              totalChargesWithoutInvoiceAddon: Math.round(totalChargesBeforeAddon),
              invoiceAddon: Math.round(invoiceAddon),
              invoiceValueCharge: Math.round(invoiceAddon),
              isHidden: false,
              isTemporaryTransporter: true,
              // Zone configuration for Service Zones modal
              selectedZones: data.servicableZones || data.serviceZones || [],
              zoneConfig: data.zoneConfig || {},
              // Pass actual pincode count from vendor's service array
              servicePincodeCount: data.service?.length || 0,
            };
          } catch (error) {
            console.error(`  [ERROR] Failed processing ${data.companyName}:`, error.message);
            return null;
          }
        })
      );
      const transporterResult = transporterRaw.filter((r) => r);
      console.timeEnd(`[${rid}] BUILD transporterResult`);
      // DEBUG LOG REMOVED
      const allTiedUpResults = [...tiedUpResult, ...temporaryTransporterResult];

      // Add debugging summary when no results found
      if (allTiedUpResults.length === 0 && transporterResult.length === 0) {
        // DEBUG LOG REMOVED
        // DEBUG LOG REMOVED
        // DEBUG LOG REMOVED
        // DEBUG LOG REMOVED
        // DEBUG LOG REMOVED
      }

      // PERFORMANCE: Log total processing time
      console.log(`[PERF] calculatePrice completed in ${Date.now() - startTime}ms`);

      return res.status(200).json({
        success: true,
        message: allTiedUpResults.length > 0 || transporterResult.length > 0
          ? "Price calculated successfully"
          : "No vendors found for this route. Check if vendors have pricing configured for these zones.",
        tiedUpResult: allTiedUpResults,
        companyResult: transporterResult,
        // PERFORMANCE FIX: Return distance so frontend doesn't need separate API call
        distanceKm: distData.distanceKm || parseFloat(String(dist).replace(/[^0-9.]/g, '')) || 0,
        distanceText: dist,
        estimatedDays: estTime,
        // Debug info to help frontend understand why no results
        debug: {
          originZone: fromZone,
          destinationZone: toZone,
          totalTiedUpVendors: tiedUpCompanies.length,
          totalPublicTransporters: transporterData.length,
          matchedTiedUp: allTiedUpResults.length,
          matchedPublic: transporterResult.length,
          processingTimeMs: Date.now() - startTime,
        }
      });
    } catch (err) {
      console.error("An error occurred in calculatePrice:", err);
      console.error("Stack trace:", err.stack);
      return res.status(500).json({
        success: false,
        message: "An internal server error occurred.",
      });
    }
  } catch (outerErr) {
    console.error("OUTER ERROR in calculatePrice:", outerErr);
    console.error("Stack:", outerErr.stack);
    return res.status(500).json({
      success: false,
      message: "Fatal error",
    });
  }
};

export const addTiedUpCompany = async (req, res) => {
  try {
    let {
      customerID,
      vendorCode,
      vendorPhone,
      vendorEmail,
      gstNo,
      transportMode,
      address,
      state,
      city,
      pincode,
      rating,
      companyName,
      contactPersonName,
      subVendor,
      priceRate,
      priceChart,
      selectedZones,
      vendorJson, // ⬅️ NEW: grab vendorJson if FE sends it
      invoiceValueCharges, // ⬅️ optional direct field support
      // NEW: Serviceability data (pincode-authoritative)
      serviceability,
      serviceabilityChecksum,
      serviceabilitySource,
      // NEW FIELDS for Quick Lookup autofill support:
      serviceMode,
      volumetricUnit,
      volumetricDivisor,
      cftFactor,
    } = req.body;

    // Debug: Log received values to verify they're coming through
    console.log('📥 Received vendor data:', {
      companyName,
      contactPersonName: contactPersonName || '(empty)',
      subVendor: subVendor || '(empty)',
      hasPriceRate: !!priceRate,
      priceRateKeys: priceRate ? Object.keys(priceRate) : [],
      serviceabilityCount: Array.isArray(serviceability) ? serviceability.length :
        (typeof serviceability === 'string' ? 'STRING' : 'NONE'),
      serviceabilityChecksum: serviceabilityChecksum || '(none)',
      serviceabilitySource: serviceabilitySource || '(none)',
      codChargesReceived: priceRate?.codCharges ? {
        fixed: priceRate.codCharges.fixed,
        variable: priceRate.codCharges.variable,
      } : 'NOT PRESENT',
      topayChargesReceived: priceRate?.topayCharges ? {
        fixed: priceRate.topayCharges.fixed,
        variable: priceRate.topayCharges.variable,
      } : 'NOT PRESENT',
    });

    // Parse JSON strings if they come from FormData
    if (typeof priceRate === "string") {
      try {
        priceRate = JSON.parse(priceRate);
      } catch (e) {
        console.error("Failed to parse priceRate:", e);
      }
    }

    if (typeof priceChart === "string") {
      try {
        priceChart = JSON.parse(priceChart);
      } catch (e) {
        console.error("Failed to parse priceChart:", e);
      }
    }

    if (typeof selectedZones === "string") {
      try {
        selectedZones = JSON.parse(selectedZones);
      } catch (e) {
        console.error("Failed to parse selectedZones:", e);
      }
    }

    // NEW: Parse serviceability if it's a JSON string (from FormData)
    if (typeof serviceability === "string") {
      try {
        serviceability = JSON.parse(serviceability);
      } catch (e) {
        console.error("Failed to parse serviceability:", e);
        serviceability = [];
      }
    }

    // 🔹 NEW: parse vendorJson if it's a JSON string
    let parsedVendorJson = null;
    if (vendorJson) {
      try {
        parsedVendorJson =
          typeof vendorJson === "string" ? JSON.parse(vendorJson) : vendorJson;
      } catch (e) {
        console.error("Failed to parse vendorJson:", e);
      }
    }

    // Extract serviceability from vendorJson if not provided directly
    if ((!serviceability || !Array.isArray(serviceability) || serviceability.length === 0) && parsedVendorJson?.serviceability) {
      serviceability = parsedVendorJson.serviceability;
      serviceabilityChecksum = serviceabilityChecksum || parsedVendorJson.serviceabilityChecksum || '';
      serviceabilitySource = serviceabilitySource || parsedVendorJson.serviceabilitySource || 'wizard';
    }

    // 🔹 NEW: build invoiceValueCharges from either vendorJson or direct body
    const defaultInvoiceValueCharges = {
      enabled: false,
      percentage: 0,
      minimumAmount: 0,
      description: "Invoice Value Handling Charges",
    };

    const invoiceFromVendorJson =
      parsedVendorJson && parsedVendorJson.invoiceValueCharges
        ? parsedVendorJson.invoiceValueCharges
        : null;

    const invoiceFromBody =
      invoiceValueCharges && typeof invoiceValueCharges === "object"
        ? invoiceValueCharges
        : null;

    const finalInvoiceValueCharges = {
      ...defaultInvoiceValueCharges,
      ...(invoiceFromVendorJson || {}),
      ...(invoiceFromBody || {}),
    };

    // ============================================================
    // VALIDATION: Check for required fields
    // ============================================================
    // If serviceability is provided, priceChart can be empty (we'll build it from zones)
    const hasServiceability = Array.isArray(serviceability) && serviceability.length > 0;
    const hasPriceChart = priceChart && typeof priceChart === 'object' && Object.keys(priceChart).length > 0;

    // Basic required field validation
    if (
      !customerID ||
      !vendorCode ||
      !vendorPhone ||
      !vendorEmail ||
      !gstNo ||
      !transportMode ||
      !address ||
      !state ||
      !pincode ||
      !rating ||
      !companyName ||
      !priceRate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "customerID, companyName, and priceRate are required",
      });
    }

    // Must have either serviceability or priceChart
    if (!hasServiceability && !hasPriceChart) {
      return res.status(400).json({
        success: false,
        message: "Either serviceability data or priceChart is required",
      });
    }

    // Enhanced companyName validation
    if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Company name must be at least 2 characters",
      });
    }

    // Input validation and sanitization
    const validationErrors = [];

    if (!validateEmail(vendorEmail)) {
      validationErrors.push("Invalid email format");
    }

    if (!validatePhone(vendorPhone)) {
      validationErrors.push(
        "Invalid phone number format (must be 10 digits, cannot start with 0)"
      );
    }

    if (!validateGSTIN(gstNo)) {
      validationErrors.push("Invalid GSTIN format");
    }

    if (!validatePincode(pincode)) {
      validationErrors.push("Invalid pincode format (must be 6 digits)");
    }

    if (
      selectedZones &&
      Array.isArray(selectedZones) &&
      selectedZones.length > 0
    ) {
      const sanitizedZones = sanitizeZoneCodes(selectedZones);
      const matrixValidation = validateZoneMatrix(priceChart, sanitizedZones);

      if (!matrixValidation.valid) {
        validationErrors.push(...matrixValidation.errors);
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Sanitize inputs
    const sanitizedCompanyName = sanitizeString(companyName, 100);
    const sanitizedContactPersonName = contactPersonName ? sanitizeString(contactPersonName, 50) : "";
    const sanitizedAddress = sanitizeString(address, 200);
    const sanitizedState = sanitizeString(state, 50);
    const sanitizedCity = city ? sanitizeString(city, 50) : "";
    const sanitizedSubVendor = subVendor ? sanitizeString(subVendor, 50) : "";
    const sanitizedZones = selectedZones ? sanitizeZoneCodes(selectedZones) : [];

    // Check duplicate temp vendor
    const existingTempVendor = await temporaryTransporterModel.findOne({
      customerID: customerID,
      companyName: sanitizedCompanyName,
      vendorCode: vendorCode,
    });

    if (existingTempVendor) {
      return res.status(400).json({
        success: false,
        message: "This vendor already exists for your account",
      });
    }

    // ============================================================
    // BUILD zoneConfig from serviceability data
    // This creates a map: { zone: [pincode1, pincode2, ...] }
    // ============================================================
    const zoneConfigMap = new Map();
    const validServiceability = [];

    if (Array.isArray(serviceability) && serviceability.length > 0) {
      for (const entry of serviceability) {
        if (entry.pincode && entry.zone) {
          // Add to zoneConfig map
          if (!zoneConfigMap.has(entry.zone)) {
            zoneConfigMap.set(entry.zone, []);
          }
          zoneConfigMap.get(entry.zone).push(String(entry.pincode));

          // Normalize and validate the entry
          validServiceability.push({
            pincode: String(entry.pincode),
            zone: String(entry.zone).toUpperCase(),
            state: entry.state || '',
            city: entry.city || '',
            isODA: Boolean(entry.isODA),
            active: entry.active !== false, // default to true
          });
        }
      }

      console.log('📋 Built zoneConfig from serviceability:', {
        zonesCount: zoneConfigMap.size,
        zones: Array.from(zoneConfigMap.keys()),
        totalPincodes: validServiceability.length,
      });
    }

    // Update selectedZones from serviceability if not provided
    const finalSelectedZones = sanitizedZones.length > 0
      ? sanitizedZones
      : Array.from(zoneConfigMap.keys());

    // 🧨 KEY PART: now we actually save invoiceValueCharges
    // Debug: Log what we're about to save
    console.log('💾 Saving to DB:', {
      companyName: sanitizedCompanyName,
      contactPersonName: sanitizedContactPersonName || '(empty)',
      subVendor: sanitizedSubVendor || '(empty)',
      serviceabilityCount: validServiceability.length,
      zoneConfigZones: Array.from(zoneConfigMap.keys()),
      selectedZones: finalSelectedZones,
      codCharges: priceRate?.codCharges || 'NOT IN PRICERATE',
      topayCharges: priceRate?.topayCharges || 'NOT IN PRICERATE',
      rovCharges: priceRate?.rovCharges || 'NOT IN PRICERATE',
      prepaidCharges: priceRate?.prepaidCharges || 'NOT IN PRICERATE',
      fullPriceRate: priceRate ? 'HAS DATA' : 'MISSING',
    });

    const tempData = await new temporaryTransporterModel({
      customerID: customerID,
      companyName: sanitizedCompanyName,
      contactPersonName: sanitizedContactPersonName,
      vendorCode: vendorCode,
      vendorPhone: Number(vendorPhone),
      vendorEmail: vendorEmail.trim().toLowerCase(),
      gstNo: gstNo.trim().toUpperCase(),
      transportMode: transportMode,
      address: sanitizedAddress,
      state: sanitizedState,
      city: sanitizedCity,
      pincode: Number(pincode),
      rating: Number(rating) || 3,
      subVendor: sanitizedSubVendor,
      // NEW: Additional fields for autofill
      serviceMode: serviceMode || '',
      volumetricUnit: volumetricUnit || 'cm',
      // NOTE: divisor is now ONLY in prices.priceRate.divisor (single source of truth)
      // Removed root-level divisor to fix Quick Lookup autofill inconsistency
      cftFactor: cftFactor ? Number(cftFactor) : null,
      selectedZones: finalSelectedZones,
      // NEW: zoneConfig built from serviceability
      zoneConfig: Object.fromEntries(zoneConfigMap),
      // NEW: Serviceability array (pincode-authoritative)
      serviceability: validServiceability,
      serviceabilityChecksum: serviceabilityChecksum || '',
      serviceabilitySource: serviceabilitySource || (validServiceability.length > 0 ? 'excel' : ''),
      prices: {
        priceRate: priceRate,
        priceChart: priceChart || {},
      },
      invoiceValueCharges: finalInvoiceValueCharges,
    }).save();

    if (tempData) {
      return res.status(201).json({
        success: true,
        message: "Vendor added successfully to your tied-up vendors",
        data: tempData,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to save vendor",
      });
    }
  } catch (err) {
    console.error("Error in addTiedUpCompany:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

export const getTiedUpCompanies = async (req, res) => {
  try {
    const userid = await req.query;
    const data = await usertransporterrelationshipModel.findOne({
      customerID: userid,
    });
    return res.status(200).json({
      success: true,
      message: "Tied up companies fetched successfully",
      data: data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getTemporaryTransporters = async (req, res) => {
  try {
    const { customerID } = req.query;
    // DEBUG LOG REMOVED
    // If no customerID, return all temporary transporters (for super admin)
    const query = customerID ? { customerID: customerID } : {};
    // DEBUG LOG REMOVED
    // Fetch ALL transporters without any limit
    const temporaryTransporters = await temporaryTransporterModel.find(query).select('-serviceability -zoneConfig').lean();
    // DEBUG LOG REMOVED
    // Detailed logging to help debug
    // DEBUG LOG REMOVED
    temporaryTransporters.forEach((vendor, index) => {
      // DEBUG LOG REMOVED
    });

    return res.status(200).json({
      success: true,
      message: "Temporary transporters fetched successfully",
      data: temporaryTransporters,
    });
  } catch (error) {
    console.error("[BACKEND] Error fetching temporary transporters:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const updateTemporaryTransporterStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be pending, approved, or rejected",
      });
    }

    const updatedTransporter = await temporaryTransporterModel.findByIdAndUpdate(
      id,
      { approvalStatus: status },
      { new: true }
    );

    if (!updatedTransporter) {
      return res.status(404).json({
        success: false,
        message: "Temporary transporter not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Vendor ${status} successfully`,
      data: updatedTransporter,
    });
  } catch (error) {
    console.error("Error updating temporary transporter status:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getTransporters = async (req, res) => {
  try {
    const { search } = req.query;
    if (!search || typeof search !== "string" || !search.trim()) {
      return res.status(400).json([]);
    }
    const regex = new RegExp("^" + search, "i");
    const companies = await transporterModel
      .find({ companyName: { $regex: regex } })
      .limit(10)
      .select("companyName");
    res.json(companies.map((c) => c.companyName));
  } catch (err) {
    console.error("Fetch companies error:", err);
    res.status(500).json([]);
  }
};

export const getAllTransporters = async (req, res) => {
  try {
    const transporters = await transporterModel
      .find()
      .select("-password -servicableZones -service");
    if (transporters.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No transporters found",
      });
    }
    return res.status(200).json({
      success: true,
      message: "Transporters fetched successfully",
      data: transporters,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Remove a tied-up vendor for a specific customer by company name (case-insensitive)
export const removeTiedUpVendor = async (req, res) => {
  try {
    // DEBUG LOG REMOVED
    console.log("📦 req.body:", JSON.stringify(req.body, null, 2));
    console.log("📥 req.params:", JSON.stringify(req.params, null, 2));
    console.log("📤 req.query:", JSON.stringify(req.query, null, 2));
    // DEBUG LOG REMOVED
    // DEBUG LOG REMOVED
    // DEBUG LOG REMOVED
    // Get data from body (preserve original extraction)
    let { customerID, companyName, vendorId } = req.body || {};
    // DEBUG LOG REMOVED
    // DEBUG LOG REMOVED
    // DEBUG LOG REMOVED
    // DEBUG LOG REMOVED
    // Accept id from URL/query if not present in body
    if (!vendorId) {
      if (req.params && req.params.id) {
        vendorId = req.params.id;
        // DEBUG LOG REMOVED
      } else if (req.query && (req.query.vendorId || req.query.id)) {
        vendorId = req.query.vendorId || req.query.id;
        // DEBUG LOG REMOVED
      }
    }

    // FALLBACK: Get customerID from auth middleware if not in body
    if (!customerID) {
      customerID =
        req.customer?._id ||
        req.customer?.id ||
        req.user?._id ||
        req.user?.id;
      // DEBUG LOG REMOVED
    }
    // DEBUG LOG REMOVED
    // DEBUG LOG REMOVED
    // DEBUG LOG REMOVED
    // DEBUG LOG REMOVED
    // DEBUG LOG REMOVED
    // DEBUG LOG REMOVED
    // VALIDATION
    if (!customerID || (!companyName && !vendorId)) {
      // DEBUG LOG REMOVED
      // DEBUG LOG REMOVED
      // DEBUG LOG REMOVED
      // DEBUG LOG REMOVED
      return res.status(400).json({
        success: false,
        message: "customerID and either companyName or vendorId are required",
        debug:
          process.env.NODE_ENV === "development"
            ? {
              receivedCustomerID: !!customerID,
              receivedCompanyName: !!companyName,
              receivedVendorId: !!vendorId,
            }
            : undefined,
      });
    }
    // DEBUG LOG REMOVED
    let relDeleted = 0;
    let tempDeleted = 0;

    // DELETE BY VENDOR ID (preferred)
    if (vendorId) {
      // DEBUG LOG REMOVED
      const tempRes = await temporaryTransporterModel.deleteOne({
        _id: vendorId,
        customerID: customerID,
      });

      tempDeleted = tempRes?.deletedCount || 0;
      console.log(`  ✓ Deleted ${tempDeleted} temporary transporter(s)`);
    }
    // DELETE BY COMPANY NAME (fallback)
    else if (companyName) {
      // DEBUG LOG REMOVED
      const nameRegex = new RegExp(`^${companyName}$`, "i");

      // Find transporter by name to remove relationships
      const transporter = await transporterModel
        .findOne({
          companyName: nameRegex,
        })
        .select("_id");

      if (transporter?._id) {
        // DEBUG LOG REMOVED
        const relRes = await usertransporterrelationshipModel.deleteMany({
          customerID,
          transporterId: transporter._id,
        });

        relDeleted = relRes?.deletedCount || 0;
        console.log(`  ✓ Deleted ${relDeleted} relationship(s)`);
      } else {
        // DEBUG LOG REMOVED
      }

      // Remove any temporary transporters added for this customer
      const tempRes = await temporaryTransporterModel.deleteMany({
        customerID,
        companyName: nameRegex,
      });

      tempDeleted = tempRes?.deletedCount || 0;
      console.log(`  ✓ Deleted ${tempDeleted} temporary transporter(s)`);
    }
    // DEBUG LOG REMOVED
    // DEBUG LOG REMOVED
    // DEBUG LOG REMOVED
    // DEBUG LOG REMOVED
    if (tempDeleted > 0 || relDeleted > 0) {
      // DEBUG LOG REMOVED
      return res.status(200).json({
        success: true,
        message: "Vendor removed successfully",
        removedRelationships: relDeleted,
        removedTemporary: tempDeleted,
      });
    } else {
      // DEBUG LOG REMOVED
      return res.status(404).json({
        success: false,
        message: "Vendor not found or already deleted",
      });
    }
  } catch (err) {
    console.error("💥 ERROR in removeTiedUpVendor:", err);
    console.error("Stack trace:", err.stack);

    return res.status(500).json({
      success: false,
      message: "Server error",
      error:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

export const savePckingList = async (req, res) => {
  try {
    const {
      customerId,
      name,
      modeoftransport,
      originPincode,
      destinationPincode,
      noofboxes,
      quantity,
      length,
      width,
      height,
      weight,
    } = req.body;
    if (
      !customerId ||
      !name ||
      !modeoftransport ||
      !originPincode ||
      !destinationPincode ||
      !noofboxes ||
      !length ||
      !width ||
      !height ||
      !weight
    ) {
      return res.status(400).json({
        success: false,
        message: "Please fill all the fields",
      });
    }
    const data = await new packingModel({
      customerId,
      name,
      modeoftransport,
      originPincode,
      destinationPincode,
      noofboxes,
      length,
      width,
      height,
      weight,
    }).save();
    if (data) {
      return res.status(200).json({
        success: true,
        message: "Packing list saved successfully",
      });
    }
  } catch (error) {
    // DEBUG LOG REMOVED
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getPackingList = async (req, res) => {
  try {
    const { customerId } = req.query;
    const data = await packingModel.find({ customerId });
    if (data) {
      return res.status(200).json({
        success: true,
        message: "Packing list found successfully",
        data: data,
      });
    } else {
      return res.status(404).json({
        success: false,
        message: "Packing list not found",
      });
    }
  } catch (error) {
    // DEBUG LOG REMOVED
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export const getTrasnporterDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const details = await transporterModel
      .findOne({ _id: id })
      .select("-password -servicableZones -service");
    if (details) {
      return res.status(200).json({
        success: true,
        data: details,
      });
    }
  } catch (error) {
    // DEBUG LOG REMOVED
    return res.status(500).json({
      success: true,
      message: "Server Error",
    });
  }
};

export const updateVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const customerID = req.customer?._id;

    if (!customerID) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Verify vendor belongs to customer
    const vendor = await temporaryTransporterModel.findOne({
      _id: id,
      customerID: customerID,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found or access denied",
      });
    }

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.customerID;
    // ✅ REMOVED: Don't delete prices - allow updating prices
    // delete updateData.prices;

    const updatedVendor = await temporaryTransporterModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedVendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      data: updatedVendor,
    });
  } catch (error) {
    console.error("Error updating vendor:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating vendor",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get zone matrix for a vendor
 * GET /api/transporter/zone-matrix/:vendorId
 */
export const getZoneMatrix = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const customerID = req.customer?._id;

    if (!customerID) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const vendor = await temporaryTransporterModel.findOne({
      _id: vendorId,
      customerID: customerID,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found or access denied",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Zone matrix retrieved successfully",
      data: {
        vendorId: vendor._id,
        companyName: vendor.companyName,
        priceChart: vendor.prices?.priceChart || {},
        selectedZones: vendor.selectedZones || [],
      },
    });
  } catch (error) {
    console.error("Error retrieving zone matrix:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while retrieving zone matrix",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Update zone matrix for a vendor
 * PUT /api/transporter/zone-matrix/:vendorId
 */
export const updateZoneMatrix = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { priceChart, selectedZones } = req.body;
    const customerID = req.customer?._id;

    if (!customerID) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!priceChart) {
      return res.status(400).json({
        success: false,
        message: "priceChart is required",
      });
    }

    // Verify vendor belongs to customer
    const vendor = await temporaryTransporterModel.findOne({
      _id: vendorId,
      customerID: customerID,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found or access denied",
      });
    }

    // Validate zone matrix if selectedZones provided
    const validationErrors = [];
    if (
      selectedZones &&
      Array.isArray(selectedZones) &&
      selectedZones.length > 0
    ) {
      const sanitizedZones = sanitizeZoneCodes(selectedZones);
      const matrixValidation = validateZoneMatrix(priceChart, sanitizedZones);

      if (!matrixValidation.valid) {
        validationErrors.push(...matrixValidation.errors);
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Update zone matrix
    const sanitizedZones = selectedZones
      ? sanitizeZoneCodes(selectedZones)
      : vendor.selectedZones;

    const updatedVendor = await temporaryTransporterModel.findByIdAndUpdate(
      vendorId,
      {
        "prices.priceChart": priceChart,
        selectedZones: sanitizedZones,
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Zone matrix updated successfully",
      data: {
        vendorId: updatedVendor._id,
        companyName: updatedVendor.companyName,
        priceChart: updatedVendor.prices.priceChart,
        selectedZones: updatedVendor.selectedZones,
      },
    });
  } catch (error) {
    console.error("Error updating zone matrix:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating zone matrix",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Delete zone matrix for a vendor (resets to empty)
 * DELETE /api/transporter/zone-matrix/:vendorId
 */
export const deleteZoneMatrix = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const customerID = req.customer?._id;

    if (!customerID) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Verify vendor belongs to customer
    const vendor = await temporaryTransporterModel.findOne({
      _id: vendorId,
      customerID: customerID,
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found or access denied",
      });
    }

    // Reset zone matrix
    const updatedVendor = await temporaryTransporterModel.findByIdAndUpdate(
      vendorId,
      {
        "prices.priceChart": {},
        selectedZones: [],
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Zone matrix deleted successfully",
      data: {
        vendorId: updatedVendor._id,
        companyName: updatedVendor.companyName,
        priceChart: updatedVendor.prices.priceChart,
        selectedZones: updatedVendor.selectedZones,
      },
    });
  } catch (error) {
    console.error("Error deleting zone matrix:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while deleting zone matrix",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Save wizard data to backend
 * POST /api/vendor/wizard-data
 */
export const saveWizardData = async (req, res) => {
  try {
    const { zones, priceMatrix, oda, other } = req.body;
    const customerID = req.customer?._id;

    if (!customerID) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Validate price matrix if provided
    if (priceMatrix && zones && Array.isArray(zones) && zones.length > 0) {
      const selectedZones = zones.map((z) => z.zoneCode).filter(Boolean);
      if (selectedZones.length > 0) {
        const matrixValidation = validateZoneMatrix(priceMatrix, selectedZones);
        if (!matrixValidation.valid) {
          return res.status(400).json({
            success: false,
            message: "Invalid zone matrix structure",
            errors: matrixValidation.errors,
          });
        }
      }
    }

    // For now, just acknowledge save; storage strategy can be plugged in later
    return res.status(200).json({
      success: true,
      message: "Wizard data saved successfully",
      data: {
        saved: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Error saving wizard data:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while saving wizard data",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get wizard data from backend
 * GET /api/vendor/wizard-data
 */
export const getWizardData = async (req, res) => {
  try {
    const customerID = req.customer?._id;

    if (!customerID) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Placeholder empty structure
    return res.status(200).json({
      success: true,
      message: "Wizard data retrieved successfully",
      data: {
        zones: [],
        priceMatrix: {},
        oda: {
          enabled: false,
          pincodes: [],
          surcharge: { fixed: 0, variable: 0 },
        },
        other: {
          minWeight: 0,
          docketCharges: 0,
          fuel: 0,
          // ... other fields
        },
      },
    });
  } catch (error) {
    console.error("Error retrieving wizard data:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while retrieving wizard data",
      error:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ============================================================================
// DEBUG ENDPOINT - Check companyName field presence
// ============================================================================
export const debugVendorFields = async (req, res) => {
  try {
    const { customerID } = req.query;

    if (!customerID) {
      return res.status(400).json({
        success: false,
        message: "customerID is required"
      });
    }

    const vendors = await temporaryTransporterModel.find({
      customerID: customerID
    });

    const report = vendors.map(v => ({
      _id: v._id,
      hasCompanyName: !!(v.companyName && v.companyName.trim()),
      companyName: v.companyName || 'MISSING',
      vendorCode: v.vendorCode || 'N/A',
      vendorEmail: v.vendorEmail || 'N/A',
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));

    const missing = report.filter(r => !r.hasCompanyName);
    const present = report.filter(r => r.hasCompanyName);

    res.json({
      success: true,
      summary: {
        total: vendors.length,
        withCompanyName: present.length,
        missingCompanyName: missing.length,
        percentageGood: vendors.length > 0
          ? ((present.length / vendors.length) * 100).toFixed(1) + '%'
          : 'N/A'
      },
      allVendors: report,
      missingCompanyNameVendors: missing.length > 0 ? missing : null,
    });
  } catch (error) {
    console.error('Error in debugVendorFields:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Update temporary transporter/vendor details
 * PUT /api/transporter/temporary/:id
 * Super Admin only
 */
export const updateTemporaryTransporter = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    // DEBUG LOG REMOVED
    // DEBUG LOG REMOVED
    console.log("  - Update fields:", Object.keys(updates));

    // Remove fields that shouldn't be updated via this endpoint
    delete updates._id;
    delete updates.customerID;
    delete updates.createdAt;
    delete updates.updatedAt;

    // Check if vendor exists first
    const existingVendor = await temporaryTransporterModel.findById(id);
    // DEBUG LOG REMOVED
    if (existingVendor) {
      // DEBUG LOG REMOVED
    }

    // Find and update the vendor
    const updatedVendor = await temporaryTransporterModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedVendor) {
      // DEBUG LOG REMOVED
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }
    // DEBUG LOG REMOVED
    return res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      data: updatedVendor,
    });
  } catch (error) {
    console.error("Error updating temporary transporter:", error);

    // Validation error handling
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        fieldErrors: error.errors
      });
    }

    // Generic error
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update vendor",
    });
  }
};

// ==============================================================================
// SEARCH TRANSPORTERS - For Quick Lookup on Add Vendor page
// Searches both public transporters AND temporary transporters (tied-up vendors)
// ==============================================================================
export const searchTransporters = async (req, res) => {
  try {
    const { query, customerID, limit = 10 } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters"
      });
    }

    const searchRegex = new RegExp(query, 'i');
    const limitNum = Math.min(parseInt(limit) || 10, 50);

    // DEBUG: Log search parameters
    console.log('[searchTransporters] Search params:', { query, customerID, limitNum });

    // Build search criteria - search across multiple fields (case-insensitive)
    const searchOr = [
      { companyName: searchRegex },
      { vendorCode: searchRegex },
      { vendorEmail: searchRegex },
      { displayName: searchRegex }
    ];

    // Build temp transporter query with proper $and combination
    const tempQuery = customerID
      ? { $and: [{ $or: searchOr }, { customerID: customerID }] }
      : { $or: searchOr };

    // Search both collections in parallel
    const [publicTransporters, tempTransporters] = await Promise.all([
      // 1. Public transporters (transporterModel)
      transporterModel
        .find({ $or: searchOr })
        .select('companyName displayName vendorCode vendorPhone vendorEmail gstNo address state city pincode rating selectedZones zoneConfig')
        .limit(limitNum)
        .lean(),

      // 2. Temporary transporters (tied-up vendors) - filter by customerID
      // Only show vendors that belong to the current logged-in user
      temporaryTransporterModel
        .find(tempQuery)
        .select('companyName contactPersonName displayName vendorCode vendorPhone vendorEmail gstNo subVendor address state city pincode transportMode serviceMode volumetricUnit cftFactor rating selectedZones zoneConfig zoneConfigurations approvalStatus prices serviceability serviceabilityChecksum serviceabilitySource')
        .limit(limitNum)
        .lean()
    ]);

    // DEBUG: Log search results count
    console.log('[searchTransporters] Results:', {
      publicCount: publicTransporters.length,
      tempCount: tempTransporters.length,
      tempNames: tempTransporters.map(t => t.companyName)
    });

    // Transform and combine results
    const results = [];

    // Add public transporters with source tag
    publicTransporters.forEach(t => {
      results.push({
        id: t._id?.toString(),
        source: 'public',
        companyName: t.companyName,
        displayName: t.displayName || t.companyName,
        vendorCode: t.vendorCode,
        vendorPhone: t.vendorPhone,
        vendorEmail: t.vendorEmail,
        gstNo: t.gstNo,
        address: t.address,
        state: t.state,
        city: t.city,
        pincode: t.pincode,
        rating: t.rating,
        zones: t.selectedZones || [],
        zoneConfigs: t.zoneConfig ? Object.keys(t.zoneConfig).map(z => ({
          zoneCode: z,
          zoneName: z,
          region: 'North',
          selectedStates: [],
          selectedCities: [],
          isComplete: false
        })) : []
      });
    });

    // Add temporary transporters with source tag - include ALL fields for autofill
    tempTransporters.forEach(t => {
      results.push({
        id: t._id?.toString(),
        source: 'temporary',
        companyName: t.companyName,
        displayName: t.displayName || t.companyName,
        contactPersonName: t.contactPersonName || '',  // ✅ FIX: Send as contactPersonName (not primaryContactName)
        vendorCode: t.vendorCode,
        vendorPhone: t.vendorPhone,
        vendorEmail: t.vendorEmail,
        gstNo: t.gstNo,
        subVendor: t.subVendor || '',
        address: t.address,
        state: t.state,
        city: t.city,
        pincode: t.pincode,
        // Transport mode (Road/Surface/Air/Rail) - send as 'mode' for frontend compatibility
        mode: t.transportMode || 'Road',  // ✅ FIX: Send as 'mode' (frontend expects this field)
        // Service mode (FTL/LTL/PTL)
        serviceMode: t.serviceMode || '',
        rating: t.rating,
        approvalStatus: t.approvalStatus || 'pending',
        zones: t.selectedZones || [],
        zoneConfigs: t.zoneConfigurations || (t.zoneConfig ? Object.keys(t.zoneConfig).map(z => ({
          zoneCode: z,
          zoneName: z,
          region: 'North',
          selectedStates: [],
          selectedCities: [],
          isComplete: false
        })) : []),
        // Volumetric settings
        volumetricUnit: t.volumetricUnit || 'cm',
        // NOTE: divisor is now ONLY in prices.priceRate.divisor (removed root-level fallback)
        divisor: t.prices?.priceRate?.divisor || 5000,
        cftFactor: t.cftFactor || null,
        // Charges data for autofill
        charges: t.prices?.priceRate || {},
        priceChart: t.prices?.priceChart || {},
        invoiceValueCharges: t.prices?.invoiceValueCharges || {},
        // ✅ FIX: Include serviceability data for autofill
        serviceability: t.serviceability || [],
        serviceabilityChecksum: t.serviceabilityChecksum || '',
        serviceabilitySource: t.serviceabilitySource || '',
      });
    });

    // Sort by relevance (exact match first, then starts with, then contains)
    const lowerQuery = query.toLowerCase();
    results.sort((a, b) => {
      const aName = (a.companyName || '').toLowerCase();
      const bName = (b.companyName || '').toLowerCase();

      // Exact match first
      if (aName === lowerQuery && bName !== lowerQuery) return -1;
      if (bName === lowerQuery && aName !== lowerQuery) return 1;

      // Starts with second
      if (aName.startsWith(lowerQuery) && !bName.startsWith(lowerQuery)) return -1;
      if (bName.startsWith(lowerQuery) && !aName.startsWith(lowerQuery)) return 1;

      // Alphabetical
      return aName.localeCompare(bName);
    });

    // Limit final results
    const finalResults = results.slice(0, limitNum);

    return res.status(200).json({
      success: true,
      data: finalResults,
      meta: {
        total: finalResults.length,
        publicCount: publicTransporters.length,
        tempCount: tempTransporters.length,
        query
      }
    });

  } catch (error) {
    console.error('[searchTransporters] Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || "Search failed"
    });
  }
};