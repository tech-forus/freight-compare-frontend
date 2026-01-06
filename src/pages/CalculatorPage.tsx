// frontend/src/pages/CalculatorPage.tsx
import NewsRail from "../components/NewsRail";
import CalculatorHelpRail from "../components/CalculatorHelpRail";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Boxes,
  Calculator as CalculatorIcon,
  ChevronRight,
  Clock,
  IndianRupee,
  Loader2,
  Navigation,
  Package,
  PackageSearch,
  Plane,
  PlusCircle,
  Save,
  Star,
  Train,
  Trash2,
  Truck,
  Zap,
  Ship as ShipIcon,
  MapPin,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Cookies from "js-cookie";
import { createPortal } from "react-dom";

import { useAuth } from "../hooks/useAuth";
import {
  makeCompareKey,
  readCompareCacheByKey,
  writeCompareCache,
  loadFormState,
  saveFormState,
  readLastKey,
  clearStaleCache,
} from "../lib/compareCache";

// 🔽 Pincode UX/validation entirely from FE (Context + Hook + Autocomplete)
import PincodeAutocomplete from "../components/PincodeAutocomplete";

// 🔽 Verification badge for vendor status display
import VerificationBadge, { VerificationStatus } from "../components/VerificationBadge";

// 🔽 FTL + Wheelseye quotes from service (no inline vendor code)
import { buildFtlAndWheelseyeQuotes, getGoogleMapsDistance } from "../services/wheelseye";

// 🔽 Fetch vendor approval statuses from Super Admin system
import { getTemporaryTransporters } from "../services/api";

// 🔽 Business News Popup (shown during slow calculations)
import NewsPopup from "../components/NewsPopup";
import { incrementCalculatorUsageCount, shouldShowNewsPopup } from "../services/newsService";
import { div } from "framer-motion/client";

// -----------------------------------------------------------------------------
// Limits
// -----------------------------------------------------------------------------
const MAX_DIMENSION_LENGTH = 1500;
const MAX_DIMENSION_WIDTH = 300;
const MAX_DIMENSION_HEIGHT = 300;
const MAX_BOXES = 10000;
const MAX_WEIGHT = 20000;

// ✅ Invoice bounds (₹1 .. ₹10,00,00,000)
const INVOICE_MIN = 1;
const INVOICE_MAX = 100_000_000; // 10 crores

// Buy route
const BUY_ROUTE = "/buy-subscription-plan";

// -----------------------------------------------------------------------------
// Numeric + small helpers
// -----------------------------------------------------------------------------
const digitsOnly = (s: string) => s.replace(/\D/g, "");
const preventNonIntegerKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if ([".", ",", "e", "E", "+", "-"].includes(e.key)) e.preventDefault();
};
const sanitizeIntegerFromEvent = (raw: string, max?: number) => {
  const cleaned = digitsOnly(raw);
  if (cleaned === "") return "";
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return "";
  const clamped = typeof max === "number" ? Math.min(n, max) : n;
  return String(clamped);
};
const formatINR0 = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(
    Math.round(n / 10) * 10
  );

// Dimension unit conversion helpers
const convertInchToCm = (inches: number): number => inches * 2.54;
const convertCmToInch = (cm: number): number => cm / 2.54;

// ✅ robust price parsing (accepts numbers or strings like "₹ 5,300.50")
const coerceNumber = (v: any) => {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const cleaned = v.replace(/[^\d.]/g, ""); // keep digits + decimal
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  }
  return NaN;
};

// 🚫 helper: read price robustly (used in filters/sorts)
const getQuotePrice = (q: any) => {
  const candidates = [q?.totalCharges, q?.totalPrice, q?.price, q?.quote?.price];
  for (const c of candidates) {
    const n = coerceNumber(c);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return NaN;
};

// -----------------------------------------------------------------------------
// Small UI wrappers
// -----------------------------------------------------------------------------
const Card = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: "easeOut" }}
    className={`bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-slate-200/80 ${className}`}
  >
    {children}
  </motion.div>
);

const InputField = (
  props: React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    icon?: React.ReactNode;
    error?: string | null;
  }
) => (
  <div>
    {props.label && (
      <label
        htmlFor={props.id}
        className="block text-sm font-medium text-slate-600 mb-1.5"
      >
        {props.label}
      </label>
    )}
    <div className="relative">
      {props.icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400">
          {props.icon}
        </div>
      )}
      <input
        {...props}
        aria-invalid={props.error ? "true" : "false"}
        className={`block w-full py-2 bg-white border rounded-lg text-sm shadow-sm placeholder-slate-400 focus:outline-none focus:ring-1 transition ${props.icon ? "pl-10" : "px-4"
          } ${props.error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
            : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
          }`}
      />
    </div>
    {!!props.error && (
      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
        <AlertCircle size={14} />
        {props.error}
      </p>
    )}
  </div>
);

const SortOptionButton = ({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center justify-center gap-2 flex-1 p-3 rounded-lg text-sm font-semibold transition-all duration-300 border-2 ${selected
      ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
      : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
      }`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

// Unit Switch Component
const UnitSwitch = ({
  currentUnit,
  onUnitChange,
}: {
  currentUnit: "cm" | "inch";
  onUnitChange: (unit: "cm" | "inch") => void;
}) => (
  <div className="flex items-center gap-2">
    <span className="text-sm font-medium text-slate-600">Units:</span>
    <div className="flex bg-slate-100 rounded-lg p-1">
      <button
        type="button"
        onClick={() => onUnitChange("cm")}
        className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${currentUnit === "cm"
          ? "bg-blue-600 text-white shadow-sm"
          : "text-slate-600 hover:text-slate-900"
          }`}
      >
        cm
      </button>
      <button
        type="button"
        onClick={() => onUnitChange("inch")}
        className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${currentUnit === "inch"
          ? "bg-blue-600 text-white shadow-sm"
          : "text-slate-600 hover:text-slate-900"
          }`}
      >
        inch
      </button>
    </div>
  </div>
);

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type QuoteAny = any;

type SavedBox = {
  _id: string;
  name: string;
  originPincode: number;
  destinationPincode: number;
  quantity: number;
  noofboxes: number;
  length: number;
  width: number;
  height: number;
  weight: number;
  modeoftransport: "Road" | "Air" | "Rail" | "Ship";
  description?: string;
  dimensionUnit?: "cm" | "inch";
};

type BoxDetails = {
  id: string;
  count: number | undefined;
  length: number | undefined;
  width: number | undefined;
  height: number | undefined;
  weight: number | undefined;
  description: string;
};

type PresetSaveState = "idle" | "saving" | "success" | "exists" | "error";

// -----------------------------------------------------------------------------
// Calculator Page
// -----------------------------------------------------------------------------
const CalculatorPage: React.FC = (): JSX.Element => {
  const { user, isSuperAdmin } = useAuth();
  const token = Cookies.get("authToken");
  const navigate = useNavigate();

  // UI state
  const [sortBy, setSortBy] = useState<"price" | "time" | "rating">("price");
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationProgress, setCalculationProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Results
  const [data, setData] = useState<QuoteAny[] | null>(null);
  const [hiddendata, setHiddendata] = useState<QuoteAny[] | null>(null);

  // Real-time vendor approval status (synced from Super Admin)
  const [vendorStatusMap, setVendorStatusMap] = useState<Record<string, 'pending' | 'approved' | 'rejected'>>({});

  // Form state
  const [modeOfTransport, setModeOfTransport] = useState<
    "Road" | "Air" | "Rail" | "Ship"
  >("Road");
  const [fromPincode, setFromPincode] = useState("");
  const [toPincode, setToPincode] = useState("");
  const [invoiceValue, setInvoiceValue] = useState("");
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  // Field errors + validity (frontend-only)
  const [fromPinError, setFromPinError] = useState<string | null>(null);
  const [toPinError, setToPinError] = useState<string | null>(null);
  const [isFromPincodeValid, setIsFromPincodeValid] = useState(false);
  const [isToPincodeValid, setIsToPincodeValid] = useState(false);

  // 🔒 Guards to avoid re-select loops when auto-selecting on 6 digits
  const fromAutoSelectedRef = useRef(false);
  const toAutoSelectedRef = useRef(false);

  // 🎯 Track if user has interacted with pincode fields
  const [fromPinTouched, setFromPinTouched] = useState(false);
  const [toPinTouched, setToPinTouched] = useState(false);

  const [boxes, setBoxes] = useState<BoxDetails[]>([
    {
      id: `box-${Date.now()}-${Math.random()}`,
      count: undefined,
      length: undefined,
      width: undefined,
      height: undefined,
      weight: undefined,
      description: "",
    },
  ]);
  const [calculationTarget, setCalculationTarget] = useState<"all" | number>(
    "all"
  );

  // Unit state for dimensions
  const [dimensionUnit, setDimensionUnit] = useState<"cm" | "inch">("cm");

  // Presets & dropdowns
  const [savedBoxes, setSavedBoxes] = useState<SavedBox[]>([]);
  const [openPresetDropdownIndex, setOpenPresetDropdownIndex] =
    useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const presetRefs = useRef<(HTMLDivElement | null)[]>([]);
  const boxFormRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Inline Save-Preset status (per box)
  const [presetStatusByBoxId, setPresetStatusByBoxId] = useState<
    Record<string, PresetSaveState>
  >({});

  // Fine-tune modal
  const [isFineTuneOpen, setIsFineTuneOpen] = useState(false);
  const [maxPrice, setMaxPrice] = useState(10_000_000);
  const [maxTime, setMaxTime] = useState(300);
  const [minRating, setMinRating] = useState(0);

  // 📰 News Popup State (smart engagement during long calculations)
  const [showNewsPopup, setShowNewsPopup] = useState(false);
  const [resultsReady, setResultsReady] = useState(false);
  const newsTimerRef = useRef<number | null>(null);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const isAnyDimensionExceeded = useMemo(
    () =>
      boxes.some(
        (box) =>
          (box.length ?? 0) > MAX_DIMENSION_LENGTH ||
          (box.width ?? 0) > MAX_DIMENSION_WIDTH ||
          (box.height ?? 0) > MAX_DIMENSION_HEIGHT ||
          (box.count ?? 0) > MAX_BOXES ||
          (box.weight ?? 0) > MAX_WEIGHT
      ),
    [boxes]
  );
  const totalWeight = boxes.reduce(
    (sum, b) => sum + (b.weight || 0) * (b.count || 0),
    0
  );
  const totalBoxes = boxes.reduce((sum, b) => sum + (b.count || 0), 0);
  const displayableBoxes = savedBoxes.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🚫 Same pincode cannot be used
  const isSamePincode =
    fromPincode.length === 6 &&
    toPincode.length === 6 &&
    fromPincode === toPincode;

  const hasPincodeIssues =
    !!fromPinError ||
    !!toPinError ||
    !isFromPincodeValid ||
    !isToPincodeValid ||
    isSamePincode;

  // ---------------------------------------------------------------------------
  // Effects
  // ---------------------------------------------------------------------------
  // ✅ Autofill only once per mount (or first render), not after user clears
  const didAutofillFromProfile = React.useRef(false);

  useEffect(() => {
    if (didAutofillFromProfile.current) return;
    const pin = (user as any)?.customer?.pincode;
    if (pin && (fromPincode === "" || fromPincode == null)) {
      setFromPincode(String(pin));
      didAutofillFromProfile.current = true;
    }
    // purposely NOT depending on fromPincode to avoid re-autofill loops
  }, [user]);


  useEffect(() => {
    clearStaleCache();

    const form = loadFormState();
    if (form) {
      if (form.fromPincode) setFromPincode(form.fromPincode);
      if (form.toPincode) setToPincode(form.toPincode);
      if (form.modeOfTransport) setModeOfTransport(form.modeOfTransport);
      if (Array.isArray(form.boxes) && form.boxes.length) {
        setBoxes(
          form.boxes.map((b: any) => ({
            ...b,
            id: b.id || `box-${Date.now()}-${Math.random()}`,
          }))
        );
      }
    }

    const lastKey = readLastKey();
    if (lastKey) {
      const cached = readCompareCacheByKey(lastKey);
      if (cached) {
        setData(cached.data || null);
        setHiddendata(cached.hiddendata || null);
      }
    }
  }, []);

  useEffect(() => {
    saveFormState({ fromPincode, toPincode, modeOfTransport, boxes });
  }, [fromPincode, toPincode, modeOfTransport, boxes]);

  // ============================================================================
  // Real-time Vendor Status Sync (polling every 30s when results visible)
  // ============================================================================
  useEffect(() => {
    // Only poll if we have results to update
    if (!data && !hiddendata) return;

    // Initial fetch
    const fetchVendorStatuses = async () => {
      try {
        console.log('[Real-time Sync] Fetching all temporary transporters...');
        const allVendors = await getTemporaryTransporters(undefined) as any[];
        console.log('[Real-time Sync] Total vendors fetched from API:', allVendors.length);
        console.log('[Real-time Sync] Vendor list:', allVendors.map(v => ({
          name: v.companyName,
          status: v.approvalStatus,
          id: v._id
        })));

        const statusMap = allVendors.reduce((map, vendor) => {
          if (vendor.companyName && vendor.approvalStatus) {
            const normalizedName = vendor.companyName.trim().toLowerCase();
            map[normalizedName] = vendor.approvalStatus as 'pending' | 'approved' | 'rejected';
          }
          return map;
        }, {} as Record<string, 'pending' | 'approved' | 'rejected'>);

        setVendorStatusMap(statusMap);
        console.log('[Real-time Sync] Vendor statuses updated:', Object.keys(statusMap).length);
        console.log('[Real-time Sync] Status map:', statusMap);
      } catch (error) {
        console.warn('[Real-time Sync] Failed to fetch vendor statuses:', error);
      }
    };

    // Initial fetch
    fetchVendorStatuses();

    // Poll every 30 seconds
    const interval = setInterval(fetchVendorStatuses, 30000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [data, hiddendata]); // Re-run when results change

  useEffect(() => {
    const onClickOutside = (ev: MouseEvent) => {
      if (
        openPresetDropdownIndex !== null &&
        presetRefs.current[openPresetDropdownIndex] &&
        !presetRefs.current[openPresetDropdownIndex]!.contains(
          ev.target as Node
        )
      ) {
        setOpenPresetDropdownIndex(null);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [openPresetDropdownIndex]);

  useEffect(() => {
    fetchSavedBoxes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(user as any)?.customer?._id, token]);

  useEffect(() => {
    if (
      fromPincode.length === 6 &&
      isFromPincodeValid &&
      !fromAutoSelectedRef.current
    ) {
      setFromPinError(null);
      fromAutoSelectedRef.current = true;
    }
    if (fromPincode.length !== 6 || !isFromPincodeValid) {
      fromAutoSelectedRef.current = false;
    }
  }, [fromPincode, isFromPincodeValid]);

  useEffect(() => {
    if (
      toPincode.length === 6 &&
      isToPincodeValid &&
      !toAutoSelectedRef.current
    ) {
      setToPinError(null);
      toAutoSelectedRef.current = true;
    }
    if (toPincode.length !== 6 || !isToPincodeValid) {
      toAutoSelectedRef.current = false;
    }
  }, [toPincode, isToPincodeValid]);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const handleDimensionChange = (
    index: number,
    field: "length" | "width" | "height",
    rawValue: string,
    maxDigits: number
  ) => {
    const cleaned = digitsOnly(rawValue).slice(0, maxDigits);
    if (cleaned === "") {
      updateBox(index, field, undefined);
      return;
    }
    const n = Number(cleaned);

    // Convert to centimeters if input is in inches
    const valueInCm = dimensionUnit === "inch" ? convertInchToCm(n) : n;

    const actualMax =
      field === "length"
        ? MAX_DIMENSION_LENGTH
        : field === "width"
          ? MAX_DIMENSION_WIDTH
          : MAX_DIMENSION_HEIGHT;

    // Always store in centimeters
    updateBox(index, field, Math.min(valueInCm, actualMax));
  };

  // Get display value for dimensions (convert from stored cm to current unit)
  const getDisplayValue = (valueInCm: number | undefined): string => {
    if (valueInCm === undefined) return "";
    return dimensionUnit === "inch"
      ? Math.round(convertCmToInch(valueInCm)).toString()
      : Math.round(valueInCm).toString();
  };

  // Handle unit change and convert existing values
  const handleUnitChange = (newUnit: "cm" | "inch") => {
    setDimensionUnit(newUnit);
    // No need to convert existing values as they're stored in cm
    // The display will automatically update via getDisplayValue
  };

  const createNewBox = (): BoxDetails => ({
    id: `box-${Date.now()}-${Math.random()}`,
    count: undefined,
    length: undefined,
    width: undefined,
    height: undefined,
    weight: undefined,
    description: "",
  });

  const addBoxType = () => setBoxes((prev) => [...prev, createNewBox()]);
  const updateBox = (i: number, field: keyof BoxDetails, v: any) => {
    setBoxes((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [field]: v };
      return copy;
    });
  };
  const removeBox = (i: number) => {
    if (boxes.length <= 1) return;
    if (window.confirm("Are you sure you want to delete this box type?")) {
      setBoxes(boxes.filter((_, j) => j !== i));
      setCalculationTarget("all");
    }
  };
  const editBox = (index: number) => {
    const el = boxFormRefs.current[index];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // Presets
  const fetchSavedBoxes = async () => {
    if (!user || !token) return;
    try {
      const response = await axios.get(
        `https://freight-compare-backend-production.up.railway.app/api/transporter/getpackinglist?customerId=${(user as any).customer._id
        }`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSavedBoxes(
        Array.isArray(response.data.data) ? response.data.data : []
      );
    } catch (err) {
      console.error("Failed to fetch saved boxes:", err);
    }
  };

  const handleDeletePreset = async (
    presetId: string,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (window.confirm("Delete this preset permanently?")) {
      try {
        await axios.delete(
          `https://freight-compare-backend-production.up.railway.app/api/transporter/deletepackinglist/${presetId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        await fetchSavedBoxes();
      } catch (err: any) {
        console.error("Failed to delete preset:", err);
        setError(
          `Could not delete preset: ${err.response?.data?.message || err.message
          }`
        );
      }
    }
  };

  const handleSelectPresetForBox = (index: number, boxPreset: SavedBox) => {
    const updated = [...boxes];
    updated[index] = {
      ...updated[index],
      length: boxPreset.length,
      width: boxPreset.width,
      height: boxPreset.height,
      weight: boxPreset.weight,
      description: boxPreset.name,
    };
    setBoxes(updated);

    // Change unit switch to match the preset's saved unit
    if (boxPreset.dimensionUnit) {
      setDimensionUnit(boxPreset.dimensionUnit);
    }

    // 🐛 BUG FIX: Only auto-fill origin pincode if user hasn't entered one yet
    // Previously this would overwrite user input when selecting a preset
    if (index === 0) {
      // Only set origin pincode if field is currently empty
      if (!fromPincode || fromPincode.trim() === "") {
        setFromPincode(boxPreset.originPincode.toString());
      }
      // Mode of transport can still be updated (less critical)
      setModeOfTransport(boxPreset.modeoftransport);
    }
    setOpenPresetDropdownIndex(null);
    setSearchTerm("");
  };

  // -------------------- Frontend Pincode validation --------------------
  const validatePincodeFormat = (pin: string): string | null => {
    if (!pin) return "Pincode is required.";
    if (!/^\d{6}$/.test(pin)) return "Enter a 6-digit pincode.";
    if (!/^[1-9]\d{5}$/.test(pin)) return "Pincode cannot start with 0.";
    return null;
  };

  const validatePincodeField = async (which: "from" | "to") => {
    const pin = which === "from" ? fromPincode : toPincode;
    const setErr = which === "from" ? setFromPinError : setToPinError;
    const msg = validatePincodeFormat(pin);
    if (msg) {
      setErr(msg);
      return false;
    }
    setErr(null);
    return true;
  };

  // -------------------- Inline Save-as-Preset --------------------
  const setPresetStatus = (boxId: string, s: PresetSaveState) =>
    setPresetStatusByBoxId((prev) => ({ ...prev, [boxId]: s }));

  const saveBoxPresetInline = async (index: number) => {
    const box = boxes[index];
    const boxId = box.id;
    const name = (box.description || "").trim();

    // Basic checks
    if (!name) {
      setError("Please enter a Box Name before saving.");
      return;
    }
    if (!box.length || !box.width || !box.height || !box.weight) {
      setError(
        "Please fill in all dimensions and weight for the box before saving."
      );
      editBox(index);
      return;
    }
    if (
      !fromPincode ||
      fromPincode.length !== 6 ||
      !toPincode ||
      toPincode.length !== 6
    ) {
      setError(
        "Please enter valid 6-digit Origin and Destination pincodes before saving a preset."
      );
      return;
    }
    if (!isFromPincodeValid || !isToPincodeValid) {
      setError("Selected pincodes are not serviceable.");
      return;
    }

    // Uniqueness (case-insensitive)
    const exists = savedBoxes.some(
      (p) => p.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      setPresetStatus(boxId, "exists");
      setTimeout(() => setPresetStatus(boxId, "idle"), 1600);
      return;
    }

    if (!user || !token) {
      setError("You are not authenticated. Please log in again.");
      return;
    }

    setError(null);
    setPresetStatus(boxId, "saving");

    const payload = {
      name,
      description: name,
      customerId: (user as any).customer._id,
      originPincode: Number(fromPincode),
      destinationPincode: Number(toPincode),
      length: box.length!,
      width: box.width!,
      height: box.height!,
      weight: box.weight!,
      modeoftransport: modeOfTransport,
      noofboxes: box.count || 1,
      quantity: box.count || 1,
      dimensionUnit: dimensionUnit,
    };

    try {
      await axios.post(
        `https://freight-compare-backend-production.up.railway.app/api/transporter/savepackinglist`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setPresetStatus(boxId, "success");
      await fetchSavedBoxes(); // refresh dropdown data
      setTimeout(() => setPresetStatus(boxId, "idle"), 1200);
    } catch (err: any) {
      console.error("Failed to save preset:", err);
      setError(
        `Could not save preset: ${err.response?.data?.message || err.message}`
      );
      setPresetStatus(boxId, "error");
      setTimeout(() => setPresetStatus(boxId, "idle"), 1600);
    }
  };

  // -------------------- Calculate Quotes (with CACHE) --------------------
  const calculateQuotes = async () => {
    if (isCalculating) return;

    // 📰 Smart News Popup: Shows unless user clicked "Don't show again"
    // Google News RSS has unlimited requests, so no usage limits needed
    const shouldShowNews = shouldShowNewsPopup();

    // Increment counter for analytics (still tracked but not used for limits)
    const currentUsage = incrementCalculatorUsageCount();
    console.log('[News] Calculator usage count:', currentUsage, '| Should show news:', shouldShowNews);

    setIsCalculating(true);
    setError(null);
    setData(null);
    setHiddendata(null);
    setResultsReady(false); // Reset results ready state

    // 📰 Clear any existing timer
    if (newsTimerRef.current) {
      clearTimeout(newsTimerRef.current);
      newsTimerRef.current = null;
    }

    // 📰 Start 3-second timer: Auto-open news popup if calculation takes too long (first 5 uses only)

    if (shouldShowNews) {
      newsTimerRef.current = setTimeout(() => {
        console.log('[News] 3 seconds passed, opening news popup...');
        setShowNewsPopup(true);
      }, 3000);
    }

    const boxesToCalc =
      calculationTarget === "all" ? boxes : [boxes[calculationTarget]];

    const shipmentPayload: any[] = [];
    for (const box of boxesToCalc) {
      if (
        !box.count ||
        !box.length ||
        !box.width ||
        !box.height ||
        !box.weight
      ) {
        const name = box.description || `Box Type ${boxes.indexOf(box) + 1}`;
        setError(`Please fill in all details for "${name}".`);
        setIsCalculating(false);
        return;
      }
      shipmentPayload.push({
        count: box.count,
        length: box.length,
        width: box.width,
        height: box.height,
        weight: box.weight,
      });
    }

    const [okFrom, okTo] = await Promise.all([
      validatePincodeField("from"),
      validatePincodeField("to"),
    ]);
    if (!okFrom || !okTo || !isFromPincodeValid || !isToPincodeValid) {
      setIsCalculating(false);
      if (!okFrom && !okTo) setError("Origin and Destination pincodes are invalid.");
      else if (!okFrom) setError("Origin pincode is invalid.");
      else if (!okTo) setError("Destination pincode is invalid.");
      else setError("Selected pincodes are not serviceable.");
      return;
    }

    // 🚫 Same pincode check
    if (isSamePincode) {
      setIsCalculating(false);
      setError("Origin and Destination pincodes cannot be the same.");
      return;
    }

    // ✅ Invoice value: allow blank (use minimum value of 1), only validate limits if user entered something
    let inv = INVOICE_MIN; // Default to minimum (1) when blank
    if (invoiceValue.trim() !== "") {
      inv = Number(invoiceValue);
      if (!Number.isFinite(inv)) {
        setIsCalculating(false);
        setInvoiceError("Invoice value must be a number");
        setError("Invoice value must be a number");
        return;
      }
      if (inv < INVOICE_MIN) {
        setIsCalculating(false);
        setInvoiceError(`Minimum invoice value is ₹${INVOICE_MIN}`);
        setError(`Minimum invoice value is ₹${INVOICE_MIN}`);
        return;
      }
      if (inv > INVOICE_MAX) {
        setIsCalculating(false);
        setInvoiceError(
          `Maximum invoice value is ₹${INVOICE_MAX.toLocaleString(
            "en-IN"
          )} (10 crores)`
        );
        setError(
          `Maximum invoice value is ₹${INVOICE_MAX.toLocaleString(
            "en-IN"
          )} (10 crores)`
        );
        return;
      }
    }

    const requestParams = {
      modeoftransport: modeOfTransport,
      fromPincode,
      toPincode,
      shipment_details: shipmentPayload,
    };

    const cacheKey = makeCompareKey(requestParams);

    // helper to normalize ETA to integer days, min 1
    const normalizeETA = (q: any) => {
      const raw = Number(q?.estimatedTime ?? q?.transitDays ?? q?.eta ?? 0);
      const normalized = Math.max(
        1,
        Math.ceil(Number.isFinite(raw) ? raw : 0)
      );
      return { ...q, estimatedTime: normalized };
    };

    // Centralized API base URL with production fallback
    const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://freight-compare-backend-production.up.railway.app').replace(/\/+$/, '');

    try {
      // PERF: Minimal logging in hot path
      const calcStartTime = performance.now();

      const resp = await axios.post(
        `${API_BASE_URL}/api/transporter/calculate`,
        {
          customerID: (user as any).customer._id,
          userogpincode: (user as any).customer.pincode,
          modeoftransport: modeOfTransport,
          fromPincode,
          toPincode,
          shipment_details: shipmentPayload,
          invoiceValue: inv,
        },
        { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
      );

      // ❌ Check for route not found error from backend
      if (resp.data.error === 'NO_ROUTE_FOUND') {
        setError(`No direct road route found between ${fromPincode} and ${toPincode}. Please verify the pincodes or contact support.`);
        return;
      }

      if (resp.data.error === 'CALCULATION_FAILED') {
        setError(`Unable to calculate distance between ${fromPincode} and ${toPincode}. Please try again later.`);
        return;
      }

      // PERFORMANCE FIX: Use distance from backend response (eliminates separate Google Maps API call)
      // Backend now returns distanceKm directly - saves 1-2 seconds per request
      const distanceKmOverride: number = resp.data.distanceKm || 0;

      // Log performance metrics (minimal)
      console.log(`[PERF] Calculate API: ${resp.data.debug?.processingTimeMs || 'N/A'}ms, distance: ${distanceKmOverride}km, tied: ${resp.data.tiedUpResult?.length || 0}, public: ${resp.data.companyResult?.length || 0}`);

      const all: QuoteAny[] = [
        ...(resp.data.tiedUpResult || []).map((q: QuoteAny) => ({
          ...q,
          isTiedUp: true,
          // Extract verification status from transporter data if available
          approvalStatus: q.transporterData?.approvalStatus || q.approvalStatus,
        })),
        ...(resp.data.companyResult || []).map((q: QuoteAny) => ({
          ...q,
          isTiedUp: false,
          // Extract verification status from transporter data if available
          approvalStatus: q.transporterData?.approvalStatus || q.approvalStatus,
        })),
      ];

      // Update all quotes with the distance from backend
      if (distanceKmOverride && distanceKmOverride > 0) {
        all.forEach((quote: any) => {
          quote.distanceKm = distanceKmOverride;
          quote.distance = `${Math.round(distanceKmOverride)} km`;
        });
      }

      // Move all 'DP World' quotes out of tied-up into other vendors
      const dpWorldQuotes = all.filter(
        (q) => (q.companyName || "").trim().toLowerCase() === "dp world"
      );
      const nonDpWorldQuotes = all.filter(
        (q) => (q.companyName || "").trim().toLowerCase() !== "dp world"
      );
      const cheapestDPWorld =
        dpWorldQuotes.length > 0
          ? dpWorldQuotes.reduce((cheapest, current) =>
            current.totalCharges < cheapest.totalCharges
              ? current
              : cheapest
          )
          : null;

      let tied = [...nonDpWorldQuotes.filter((q) => q.isTiedUp)];
      let others = [
        ...(nonDpWorldQuotes.filter((q) => !q.isTiedUp) || []),
        ...(cheapestDPWorld ? [{ ...cheapestDPWorld, isTiedUp: false }] : []),
      ];

      // ---------- Approval Status: Now included in calculate response ----------
      // PERFORMANCE FIX: approvalStatus is now returned directly from /api/transporter/calculate
      // No separate API call needed - saves ~300ms per request
      // The backend includes approvalStatus in tiedUpResult (see transportController.js line 577)

      // ---------- Inject Local FTL + Wheelseye via SERVICE ----------
      // PERFORMANCE FIX: Use distanceKmOverride from backend (no separate distance API call needed)
      const { ftlQuote, wheelseyeQuote } = await buildFtlAndWheelseyeQuotes({
        fromPincode,
        toPincode,
        shipment: shipmentPayload,
        totalWeight,
        token,
        isWheelseyeServiceArea: (pin: string) => /^\d{6}$/.test(pin),
        distanceKmOverride, // Use distance from backend - eliminates redundant API call
      });

      // Log total frontend processing time
      console.log(`[PERF] Total frontend processing: ${Math.round(performance.now() - calcStartTime)}ms`);

      // Mark special vendors as verified (client-side injected, always trusted)
      if (ftlQuote) others.unshift({ ...ftlQuote, isSpecialVendor: true });
      if (wheelseyeQuote) others.unshift({ ...wheelseyeQuote, isSpecialVendor: true });

      // Remove specific vendor(s) from tied-up view
      tied = tied.filter(
        (q) => (q.companyName || "").trim().toLowerCase() !== "testvendor1"
      );

      // Filter out test/dummy PUBLIC transporters from results (only applies to 'others', not tied-up)
      const excludedNamePatterns = ['tester', 'dummy', 'vellore'];
      const isExcludedVendor = (name: string): boolean => {
        const lowerName = (name || "").trim().toLowerCase();
        return excludedNamePatterns.some(pattern => lowerName.includes(pattern));
      };

      // Only filter public transporters, NOT tied-up vendors
      others = others.filter((q) => !isExcludedVendor(q.companyName || ""));

      // ---------- Optional: price rounding for tied-up vendors ----------
      tied.forEach((quote) => {
        if (quote.companyName === "DP World") return;
        const round5 = (x: number) => Math.round((x * 5.0) / 10) * 10;
        if (typeof quote.totalCharges === "number")
          quote.totalCharges = round5(quote.totalCharges);
        if (typeof quote.price === "number") quote.price = round5(quote.price);
        if (typeof quote.total === "number") quote.total = round5(quote.total);
        if (typeof quote.totalPrice === "number")
          quote.totalPrice = round5(quote.totalPrice);
        if (typeof quote.baseFreight === "number")
          quote.baseFreight = round5(quote.baseFreight);
        if (typeof quote.docketCharge === "number")
          quote.docketCharge = round5(quote.docketCharge);
        if (typeof quote.fuelCharges === "number")
          quote.fuelCharges = round5(quote.fuelCharges);
        if (typeof quote.handlingCharges === "number")
          quote.handlingCharges = round5(quote.handlingCharges);
        if (typeof quote.greenTax === "number")
          quote.greenTax = round5(quote.greenTax);
        if (typeof quote.appointmentCharges === "number")
          quote.appointmentCharges = round5(quote.appointmentCharges);
        if (typeof quote.minCharges === "number")
          quote.minCharges = round5(quote.minCharges);
        if (typeof quote.rovCharges === "number")
          quote.rovCharges = round5(quote.rovCharges);
      });

      // ✅ Normalize ETA for ALL quotes: integer days, minimum 1
      tied = tied.map(normalizeETA);
      others = others.map(normalizeETA);

      // Batch state updates
      setData(tied);
      setHiddendata(others);

      // update cache (async)
      setTimeout(() => {
        writeCompareCache(cacheKey, {
          params: requestParams,
          data: tied,
          hiddendata: others,
          form: { fromPincode, toPincode, modeOfTransport, boxes },
        });
      }, 0);
    } catch (e: any) {
      if (e.response?.status === 401) {
        setError("Authentication failed. Please log out and log back in.");
      } else if (e.response?.status === 400 && e.response?.data?.error === 'NO_ROUTE_FOUND') {
        setError(`No direct road route found between ${fromPincode} and ${toPincode}. Please verify the pincodes or contact support.`);
      } else if (e.response?.data?.message) {
        setError(e.response.data.message);
      } else {
        setError(`Failed to get rates. Error: ${e.message}`);
      }
    } finally {
      // 📰 FIXED: If calculation finishes before 3 seconds AND news should show, open it immediately
      // Don't just cancel the timer - show the popup anyway!
      if (newsTimerRef.current) {
        clearTimeout(newsTimerRef.current);
        newsTimerRef.current = null;

        // If timer was still pending and news should be shown, show it now
        if (shouldShowNews && !showNewsPopup) {
          console.log('[News] Calculation finished quickly, showing news popup immediately');
          setShowNewsPopup(true);
          setResultsReady(true); // Results are ready now!
        }
      }

      // 📰 If news popup is open, show blinking "View Results" button
      if (showNewsPopup) {
        setResultsReady(true);
      }

      setCalculationProgress("");
      setIsCalculating(false);

      // 📰 Only auto-scroll if news popup is NOT open (user will click button to scroll)
      if (!showNewsPopup) {
        setTimeout(() => {
          document.getElementById("results")?.scrollIntoView({
            behavior: "smooth",
          });
        }, 50);
      }
    }
  };

  // -------------------- Keyboard Event Handler --------------------
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey) {
      const hasValidPincodes =
        fromPincode.length === 6 &&
        toPincode.length === 6 &&
        isFromPincodeValid &&
        isToPincodeValid &&
        !isSamePincode;
      const hasValidBoxes = boxes.every(
        (box) =>
          box.count &&
          box.length &&
          box.width &&
          box.height &&
          box.weight
      );
      if (hasValidPincodes && hasValidBoxes && !isCalculating) {
        e.preventDefault();
        calculateQuotes();
      }
    }
  };

  // -------------------- Render --------------------
  const equalityError =
    isSamePincode && isFromPincodeValid && isToPincodeValid
      ? "Origin and Destination cannot be the same."
      : null;

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans" onKeyDown={handleKeyDown}>
      <div
        className="absolute top-0 left-0 w-full h-80 bg-gradient-to-br from-indigo-50 to-purple-50"
        style={{ clipPath: "polygon(0 0, 100% 0, 100% 65%, 0% 100%)" }}
      />
      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6 items-start">
          {/* LEFT: News Rail - Hidden on smaller screens */}
          <div className="hidden xl:block w-64 flex-shrink-0 sticky top-8">
            <NewsRail />
          </div>

          {/* CENTER: Calculator */}
          <div className="flex-1 min-w-0 max-w-4xl mx-auto space-y-8">
            <header className="text-center py-8">

              <motion.h1
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight"
              >
                Freight Rate Calculator
              </motion.h1>
              <motion.p
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto"
              >
                Instantly compare quotes from multiple vendors to find the best rate for your shipment.
              </motion.p>
            </header>

            {/* Mode & Route */}
            <Card>
              <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center">
                <Navigation size={22} className="mr-3 text-indigo-500" /> Mode & Route
              </h2>
              <p className="text-sm text-slate-500 mb-6">Select your mode of transport.</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: "Road", icon: Truck, isAvailable: true },
                  { name: "Air", icon: Plane, isAvailable: false },
                  { name: "Rail", icon: Train, isAvailable: false },
                  { name: "Ship", icon: ShipIcon, isAvailable: false },
                ].map((mode) => (
                  <button
                    key={mode.name}
                    onClick={() => (mode.isAvailable ? setModeOfTransport(mode.name as any) : null)}
                    className={`relative group w-full p-4 rounded-xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 focus-visible:ring-indigo-500 ${modeOfTransport === mode.name
                      ? "bg-indigo-600 text-white shadow-lg"
                      : mode.isAvailable
                        ? "bg-white text-slate-700 border border-slate-300 hover:border-indigo-500 hover:text-indigo-600"
                        : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      }`}
                    disabled={!mode.isAvailable}
                  >
                    <div
                      className={`flex flex-col items-center justify-center gap-2 transition-all duration-300 ${!mode.isAvailable && "opacity-50"
                        }`}
                    >
                      <mode.icon size={24} className="mx-auto" />
                      <span className="text-sm font-semibold">{mode.name}</span>
                    </div>
                    {!mode.isAvailable && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-slate-800/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-[2px]">
                        <span className="text-xs font-bold text-white uppercase tracking-wider bg-slate-800/70 px-3 py-1 rounded-full">
                          Coming Soon
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </Card>

            {/* Pincode Input — FE validation + autofill */}
            <Card>
              <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center">
                <Navigation size={22} className="mr-3 text-indigo-500" /> Pickup & Destination
              </h2>
              <p className="text-sm text-slate-500 mb-6">Enter the pickup and destination pincodes.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PincodeAutocomplete
                  label="Origin Pincode"
                  id="fromPincode"
                  value={fromPincode}
                  placeholder="e.g., 400001"
                  error={fromPinTouched ? (fromPinError || equalityError) : null}
                  onChange={(value: string) => {
                    setFromPincode(value);
                    setFromPinTouched(true);
                    setFromPinError(null);
                  }}
                  onBlur={() => {
                    setFromPinTouched(true);
                    // ✅ RACE CONDITION FIX: Don't call validatePincodeField here!
                    // It reads from stale state. Let PincodeAutocomplete's onValidationChange handle it.
                  }}
                  onSelect={() => { }}
                  onValidationChange={setIsFromPincodeValid}
                />
                <PincodeAutocomplete
                  label="Destination Pincode"
                  id="toPincode"
                  value={toPincode}
                  placeholder="e.g., 110001"
                  error={toPinTouched ? (toPinError || equalityError) : null}
                  onChange={(value: string) => {
                    setToPincode(value);
                    setToPinTouched(true);
                    setToPinError(null);
                  }}
                  onBlur={() => {
                    setToPinTouched(true);
                    // ✅ RACE CONDITION FIX: Don't call validatePincodeField here!
                    // It reads from stale state. Let PincodeAutocomplete's onValidationChange handle it.
                  }}
                  onSelect={() => { }}
                  onValidationChange={setIsToPincodeValid}
                />
              </div>

              <div className="mt-6">
                <InputField
                  label="Invoice Value (₹)"
                  id="invoiceValue"
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  placeholder="Enter invoice value (optional)"
                  icon={<IndianRupee size={16} />}
                  value={invoiceValue}
                  onChange={(e) => {
                    // Keep only digits; clamp to ≤ 10 crores
                    const value = e.target.value.replace(/\D/g, "");
                    if (value === "") {
                      setInvoiceValue("");
                      setInvoiceError(null);
                      return;
                    }
                    const num = Number(value);
                    if (num > INVOICE_MAX) {
                      setInvoiceValue(String(INVOICE_MAX));
                      setInvoiceError(
                        `Maximum invoice value is ₹${INVOICE_MAX.toLocaleString("en-IN")} (10 crores)`
                      );
                    } else {
                      setInvoiceValue(String(num));
                      setInvoiceError(null);
                    }
                  }}
                  onBlur={(e) => {
                    const raw = e.currentTarget.value.replace(/\D/g, "");
                    if (raw === "") return;
                    let num = Number(raw);
                    if (num < INVOICE_MIN) {
                      num = INVOICE_MIN;
                      setInvoiceError(`Minimum invoice value is ₹${INVOICE_MIN}`);
                    }
                    if (num > INVOICE_MAX) {
                      num = INVOICE_MAX;
                      setInvoiceError(
                        `Maximum invoice value is ₹${INVOICE_MAX.toLocaleString("en-IN")} (10 crores)`
                      );
                    }
                    setInvoiceValue(String(num));
                  }}
                  error={invoiceError}
                />
                <p className="mt-1 text-xs text-slate-500">
                  Optional: Leave blank or enter ₹{INVOICE_MIN.toLocaleString("en-IN")} – ₹
                  {INVOICE_MAX.toLocaleString("en-IN")} (10 crores)
                </p>
              </div>
            </Card>

            {/* Shipment Details */}
            <Card>
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Boxes size={22} className="text-indigo-500" /> Shipment Details
                  </h2>
                  <p className="text-sm text-slate-500">
                    Enter dimensions and weight, or select a saved preset to auto-fill.
                  </p>
                </div>
                <UnitSwitch
                  currentUnit={dimensionUnit}
                  onUnitChange={handleUnitChange}
                />
              </div>

              <div className="space-y-6">
                <AnimatePresence>
                  {boxes.map((box, index) => (
                    <motion.div
                      key={box.id}
                      layout
                      initial={{ opacity: 0, y: -20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -50, scale: 0.9 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className="p-5 bg-slate-50 border border-slate-200 rounded-xl relative"
                      ref={(el) => (boxFormRefs.current[index] = el)}
                    >
                      <button
                        onClick={() => {
                          if (boxes.length > 1) removeBox(index);
                          else setBoxes([createNewBox()]);
                        }}
                        title={boxes.length > 1 ? "Remove this box type" : "Clear all fields"}
                        className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        {/* Preset selector / Box Name */}
                        <div
                          className="relative text-sm"
                          ref={(el) => {
                            if (el) presetRefs.current[index] = el;
                          }}
                        >
                          <InputField
                            label="Box Name"
                            id={`preset-${index}`}
                            placeholder="Select or type to search..."
                            value={
                              box.description ||
                              (openPresetDropdownIndex === index ? searchTerm : "")
                            }
                            onChange={(e) => {
                              updateBox(index, "description", e.target.value);
                              setSearchTerm(e.target.value);
                            }}
                            onFocus={() => {
                              setOpenPresetDropdownIndex(index);
                              setSearchTerm("");
                            }}
                            icon={<PackageSearch size={16} />}
                            className="text-sm"
                            autoComplete="off"
                            required
                          />
                          <AnimatePresence>
                            {openPresetDropdownIndex === index && (
                              <motion.ul
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute z-50 w-full mt-1 border border-slate-200 rounded-lg max-h-48 overflow-y-auto bg-white shadow-lg"
                              >
                                {displayableBoxes.length > 0 ? (
                                  displayableBoxes.map((preset) => (
                                    <li
                                      key={preset._id}
                                      onClick={() => handleSelectPresetForBox(index, preset)}
                                      className="group flex justify-between items-center px-3 py-2 hover:bg-indigo-50 cursor-pointer text-slate-700 text-sm transition-colors"
                                    >
                                      <span>{preset.name}</span>
                                      <button
                                        onClick={(e) => handleDeletePreset(preset._id, e)}
                                        className="p-1.5 text-slate-400 opacity-0 group-hover:opacity-100 hover:!opacity-100 hover:text-red-600 hover:bg-red-100 rounded-full transition-all duration-200"
                                        title={`Delete "${preset.name}"`}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </li>
                                  ))
                                ) : (
                                  <li className="px-4 py-2 italic text-sm text-slate-500">
                                    {savedBoxes.length === 0
                                      ? "No presets saved yet."
                                      : "No matches found."}
                                  </li>
                                )}
                              </motion.ul>
                            )}
                          </AnimatePresence>
                          {presetStatusByBoxId[box.id] === "exists" && (
                            <p className="mt-1 text-xs text-amber-700">
                              A preset with this name already exists.
                            </p>
                          )}
                        </div>

                        <div>
                          <InputField
                            label="Number of Boxes"
                            id={`count-${index}`}
                            type="text"
                            inputMode="numeric"
                            pattern="\d*"
                            maxLength={5}
                            value={box.count ?? ""}
                            onKeyDown={preventNonIntegerKeys}
                            onChange={(e) => {
                              const next = sanitizeIntegerFromEvent(e.target.value);
                              if (next === "") updateBox(index, "count", undefined);
                              else if (Number(next) <= MAX_BOXES)
                                updateBox(index, "count", Number(next));
                            }}
                            onPaste={(e) => {
                              e.preventDefault();
                              const pasted =
                                (e.clipboardData || (window as any).clipboardData).getData("text");
                              const next = sanitizeIntegerFromEvent(pasted);
                              if (next === "" || Number(next) > MAX_BOXES) return;
                              updateBox(index, "count", Number(next));
                            }}
                            placeholder="e.g., 10"
                            required
                          />
                          {(box.count ?? 0) > MAX_BOXES && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle size={14} /> Max boxes is {MAX_BOXES}.
                            </p>
                          )}
                        </div>

                        <div>
                          <InputField
                            label="Weight (kg)"
                            id={`weight-${index}`}
                            type="text"
                            inputMode="numeric"
                            pattern="\d*"
                            maxLength={5}
                            value={box.weight ?? ""}
                            onKeyDown={preventNonIntegerKeys}
                            onChange={(e) => {
                              const next = sanitizeIntegerFromEvent(e.target.value);
                              if (next === "") updateBox(index, "weight", undefined);
                              else if (Number(next) <= MAX_WEIGHT)
                                updateBox(index, "weight", Number(next));
                            }}
                            onPaste={(e) => {
                              e.preventDefault();
                              const pasted =
                                (e.clipboardData || (window as any).clipboardData).getData("text");
                              const next = sanitizeIntegerFromEvent(pasted);
                              if (next === "" || Number(next) > MAX_WEIGHT) return;
                              updateBox(index, "weight", Number(next));
                            }}
                            placeholder="e.g., 5"
                            required
                          />
                          {(box.weight ?? 0) > MAX_WEIGHT && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle size={14} /> Max weight is {MAX_WEIGHT} kg.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Dimensions */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <InputField
                            label={`Length (${dimensionUnit})`}
                            id={`length-${index}`}
                            type="text"
                            inputMode="numeric"
                            pattern="\d*"
                            value={getDisplayValue(box.length)}
                            onKeyDown={preventNonIntegerKeys}
                            onChange={(e) =>
                              handleDimensionChange(index, "length", e.target.value, 4)
                            }
                            placeholder="Length"
                            required
                          />
                          {(box.length ?? 0) > MAX_DIMENSION_LENGTH && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle size={14} /> Max length is {MAX_DIMENSION_LENGTH} cm.
                            </p>
                          )}
                        </div>

                        <div>
                          <InputField
                            label={`Width (${dimensionUnit})`}
                            id={`width-${index}`}
                            type="text"
                            inputMode="numeric"
                            pattern="\d*"
                            value={getDisplayValue(box.width)}
                            onKeyDown={preventNonIntegerKeys}
                            onChange={(e) =>
                              handleDimensionChange(index, "width", e.target.value, 3)
                            }
                            placeholder="Width"
                            required
                          />
                          {(box.width ?? 0) > MAX_DIMENSION_WIDTH && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle size={14} /> Max width is {MAX_DIMENSION_WIDTH} cm.
                            </p>
                          )}
                        </div>

                        <div>
                          <InputField
                            label={`Height (${dimensionUnit})`}
                            id={`height-${index}`}
                            type="text"
                            inputMode="numeric"
                            pattern="\d*"
                            value={getDisplayValue(box.height)}
                            onKeyDown={preventNonIntegerKeys}
                            onChange={(e) =>
                              handleDimensionChange(index, "height", e.target.value, 3)
                            }
                            placeholder="Height"
                            required
                          />
                          {(box.height ?? 0) > MAX_DIMENSION_HEIGHT && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle size={14} /> Max height is {MAX_DIMENSION_HEIGHT} cm.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        {(() => {
                          const st = presetStatusByBoxId[box.id] || "idle";
                          const base =
                            "inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
                          const cls =
                            st === "saving"
                              ? `${base} bg-indigo-200 text-indigo-700 cursor-wait`
                              : st === "success"
                                ? `${base} bg-green-600 text-white`
                                : st === "exists"
                                  ? `${base} bg-amber-100 text-amber-800`
                                  : st === "error"
                                    ? `${base} bg-red-100 text-red-700`
                                    : `${base} bg-indigo-100 text-indigo-700 hover:bg-indigo-200 focus-visible:ring-indigo-500`;

                          return (
                            <button
                              onClick={() => saveBoxPresetInline(index)}
                              className={cls}
                              title={
                                st === "exists"
                                  ? "A preset with this name already exists."
                                  : "Save this box configuration as a new preset"
                              }
                              disabled={st === "saving"}
                            >
                              {st === "saving" ? (
                                <>
                                  <Loader2 size={14} className="animate-spin" />
                                  Saving…
                                </>
                              ) : st === "success" ? (
                                <>
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    className="fill-current"
                                  >
                                    <path d="M20.285 6.709l-11.025 11.025-5.545-5.545 1.414-1.414 4.131 4.131 9.611-9.611z" />
                                  </svg>
                                  Saved
                                </>
                              ) : st === "exists" ? (
                                <>
                                  <AlertCircle size={14} />
                                  Name exists
                                </>
                              ) : st === "error" ? (
                                <>
                                  <AlertCircle size={14} />
                                  Failed
                                </>
                              ) : (
                                <>
                                  <Save size={14} />
                                  Save as Preset
                                </>
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <div className="flex justify-between items-center pt-6 border-t border-slate-200">
                  <button
                    onClick={addBoxType}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-100 text-indigo-700 font-semibold rounded-lg hover:bg-indigo-200 transition-colors"
                  >
                    <PlusCircle size={18} /> Add Another Box Type
                  </button>

                  {totalWeight > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5 }}
                      className="text-right"
                    >
                      <p className="text-sm font-medium text-slate-500">Total Weight</p>
                      <p className="text-2xl font-bold text-slate-800">
                        {totalWeight.toFixed(2)}
                        <span className="text-base font-semibold text-slate-600 ml-1">kg</span>
                      </p>
                    </motion.div>
                  )}
                </div>

                <div className="text-center pt-6 mt-6 border-t border-slate-200">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="inline-flex items-center gap-3 bg-red-100 text-red-800 font-semibold px-4 py-3 rounded-xl mb-6 shadow-sm"
                    >
                      <AlertCircle size={20} />
                      {error}
                    </motion.div>
                  )}
                  {isAnyDimensionExceeded && !error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="inline-flex items-center gap-3 bg-yellow-100 text-yellow-800 font-semibold px-4 py-3 rounded-xl mb-6 shadow-sm"
                    >
                      <AlertCircle size={20} />
                      One or more box dimensions exceed the allowed limit. Please correct them to proceed.
                    </motion.div>
                  )}
                  <button
                    onClick={calculateQuotes}
                    disabled={isCalculating || isAnyDimensionExceeded || hasPincodeIssues}
                    className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white text-lg font-bold rounded-full shadow-lg shadow-indigo-500/50 hover:bg-indigo-700 transition-all duration-200 disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                  >
                    {isCalculating ? <Loader2 className="animate-spin" /> : <CalculatorIcon />}
                    {isCalculating ? calculationProgress || "Calculating Rates..." : "Calculate Freight Cost"}
                  </button>
                </div>
              </div>
            </Card>

            {/* Summary */}
            {totalBoxes > 0 && (
              <Card>
                <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Package size={22} className="mr-3 text-indigo-500" /> Shipment Summary
                </h2>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-100 rounded-t-lg">
                      <tr>
                        <th className="px-4 py-3">Description</th>
                        <th className="px-4 py-3">Quantity</th>
                        <th className="px-4 py-3">Total Weight</th>
                        <th className="px-4 py-3">Volume (cm³)</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {boxes.map((box, index) => {
                          const qty = box.count || 0;
                          const totalW = ((box.weight || 0) * qty).toFixed(2);
                          const totalV = (
                            (box.length || 0) *
                            (box.width || 0) *
                            (box.height || 0) *
                            qty
                          ).toLocaleString();
                          return (
                            <motion.tr
                              key={box.id}
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0, x: -30 }}
                              className="bg-white border-b border-slate-200 hover:bg-slate-50"
                            >
                              <td className="px-4 py-3">{box.description || `Type ${index + 1}`}</td>
                              <td className="px-4 py-3">{qty}</td>
                              <td className="px-4 py-3">{totalW} kg</td>
                              <td className="px-4 py-3">{totalV} cm³</td>
                              <td className="px-4 py-3 flex justify-end items-center gap-2">
                                <button
                                  onClick={() => removeBox(index)}
                                  disabled={boxes.length <= 1}
                                  title="Delete"
                                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </AnimatePresence>
                    </tbody>
                    <tfoot>
                      <tr className="font-semibold text-slate-800 bg-slate-50">
                        <td colSpan={1} className="px-4 py-3">
                          Grand Total
                        </td>
                        <td className="px-4 py-3">{totalBoxes} Boxes</td>
                        <td className="px-4 py-3">{totalWeight.toFixed(2)} kg</td>
                        <td className="px-4 py-3">
                          {boxes
                            .reduce(
                              (sum, b) =>
                                sum +
                                (b.length || 0) *
                                (b.width || 0) *
                                (b.height || 0) *
                                (b.count || 0),
                              0
                            )
                            .toLocaleString()}{" "}
                          cm³
                        </td>
                        <td className="px-4 py-3"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            )}

            {/* Controls + Results */}
            {(data || hiddendata) && (
              <>
                <Card>
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 mb-2 flex items-center">
                        <Star size={22} className="mr-3 text-indigo-500" /> Sort & Filter Results
                      </h2>
                      <p className="text-sm text-slate-500 mb-6">
                        Quickly organize quotes by price, speed, or vendor rating.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="flex-grow w-full grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <SortOptionButton
                        label="Lowest Price"
                        icon={<IndianRupee size={16} />}
                        selected={sortBy === "price"}
                        onClick={() => setSortBy("price")}
                      />
                      <SortOptionButton
                        label="Fastest"
                        icon={<Zap size={16} />}
                        selected={sortBy === "time"}
                        onClick={() => setSortBy("time")}
                      />
                      <SortOptionButton
                        label="Highest Rated"
                        icon={<Star size={16} />}
                        selected={sortBy === "rating"}
                        onClick={() => setSortBy("rating")}
                      />
                    </div>
                    <div className="relative w-full sm:w-auto">
                      <button
                        onClick={() => setIsFineTuneOpen((prev) => !prev)}
                        className="w-full px-5 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors border border-slate-300"
                      >
                        Fine-Tune Sort
                      </button>
                      <AnimatePresence>
                        {isFineTuneOpen && (
                          <FineTuneModal
                            isOpen={isFineTuneOpen}
                            onClose={() => setIsFineTuneOpen(false)}
                            filters={{ maxPrice, maxTime, minRating }}
                            onFilterChange={{ setMaxPrice, setMaxTime, setMinRating }}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </Card>

                <div id="results" className="space-y-12">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="space-y-8"
                  >
                    {(() => {
                      // 🚫 remove service-not-available & zero/invalid prices
                      const allQuotes = [...(data || []), ...(hiddendata || [])].filter((q) => {
                        if (q?.message === "service not available") return false;
                        const p = getQuotePrice(q);
                        return Number.isFinite(p) && p > 0;
                      });

                      const unlocked = allQuotes.filter(
                        (q) => !q.isHidden && typeof q.estimatedTime === "number"
                      );
                      const fastestQuote =
                        unlocked.length > 0
                          ? unlocked.reduce((prev, current) =>
                            (prev.estimatedTime ?? Infinity) <
                              (current.estimatedTime ?? Infinity)
                              ? prev
                              : current
                          )
                          : null;

                      const processQuotes = (quotes: QuoteAny[] | null) => {
                        if (!quotes) return [];
                        const filtered = quotes.filter((q) => {
                          // 🚫 hide 0 / invalid
                          const price = getQuotePrice(q);
                          if (!Number.isFinite(price) || price <= 0) return false;

                          const rating = (q?.transporterData?.rating ??
                            q?.rating ??
                            q?.transporterData?.ratingAverage ??
                            0) as number;

                          // Weight-based filtering for FTLs
                          if (
                            q.companyName === "LOCAL FTL" ||
                            q.companyName === "Wheelseye FTL"
                          ) {
                            const effectiveActualWeight =
                              q.actualWeight ?? totalWeight;
                            const effectiveVolumetricWeight =
                              q.volumetricWeight ?? totalWeight;
                            const isActualWeightSufficient =
                              effectiveActualWeight >= 500;
                            const isVolumetricWeightSufficient =
                              effectiveVolumetricWeight >= 500;

                            if (
                              q.companyName === "LOCAL FTL" &&
                              (!isActualWeightSufficient ||
                                !isVolumetricWeightSufficient)
                            ) {
                              return false;
                            }
                            if (
                              q.companyName === "Wheelseye FTL" &&
                              !(isActualWeightSufficient ||
                                isVolumetricWeightSufficient)
                            ) {
                              return false;
                            }
                          }

                          if (q.isHidden) return (q.totalCharges ?? Infinity) <= maxPrice;
                          return (
                            (q.totalCharges ?? Infinity) <= maxPrice &&
                            (q.estimatedTime ?? Infinity) <= maxTime &&
                            rating >= minRating
                          );
                        });

                        return filtered.sort((a, b) => {
                          switch (sortBy) {
                            case "time":
                              if (a.isHidden && !b.isHidden) return 1;
                              if (!a.isHidden && b.isHidden) return -1;
                              return (
                                (a.estimatedTime ?? Infinity) -
                                (b.estimatedTime ?? Infinity)
                              );
                            case "rating": {
                              const ratingA =
                                (a?.transporterData?.rating ??
                                  a?.rating ??
                                  a?.transporterData?.ratingAverage ??
                                  0) as number;
                              const ratingB =
                                (b?.transporterData?.rating ??
                                  b?.rating ??
                                  b?.transporterData?.ratingAverage ??
                                  0) as number;
                              return ratingB - ratingA;
                            }
                            case "price":
                            default: {
                              const priceA = getQuotePrice(a);
                              const priceB = getQuotePrice(b);
                              if (priceA === priceB) {
                                const nameA = (
                                  a.companyName || a.transporterName || ""
                                ).toLowerCase();
                                const nameB = (
                                  b.companyName || b.transporterName || ""
                                ).toLowerCase();
                                const parts1 = nameA.split(/(\d+)/);
                                const parts2 = nameB.split(/(\d+)/);
                                const maxLen = Math.max(
                                  parts1.length,
                                  parts2.length
                                );
                                for (let i = 0; i < maxLen; i++) {
                                  const p1 = parts1[i] || "";
                                  const p2 = parts2[i] || "";
                                  const isNum1 = /^\d+$/.test(p1);
                                  const isNum2 = /^\d+$/.test(p2);
                                  if (isNum1 && isNum2) {
                                    const n1 = parseInt(p1, 10);
                                    const n2 = parseInt(p2, 10);
                                    if (n1 !== n2) return n1 - n2;
                                  } else {
                                    const cmp = p1.localeCompare(p2);
                                    if (cmp !== 0) return cmp;
                                  }
                                }
                                return 0;
                              }
                              return priceA - priceB;
                            }
                          }
                        });
                      };

                      const tiedUpVendorsRaw = processQuotes(data);
                      const otherVendorsRaw = processQuotes(hiddendata);

                      const vendorKey = (q: any) =>
                        (q.transporterData?._id ||
                          q.transporterID ||
                          q.companyName ||
                          q.transporterName ||
                          ""
                        )
                          .toString()
                          .toLowerCase();

                      const seenVendors = new Set<string>();

                      const tiedUpVendors = tiedUpVendorsRaw.filter(q => {
                        const key = vendorKey(q);
                        if (!key) return true;
                        if (seenVendors.has(key)) return false;
                        seenVendors.add(key);
                        return true;
                      });

                      const otherVendors = otherVendorsRaw.filter(q => {
                        const key = vendorKey(q);
                        if (!key) return true;
                        if (seenVendors.has(key)) return false;
                        seenVendors.add(key);
                        return true;
                      });

                      const allProcessedQuotes = [...tiedUpVendors, ...otherVendors];

                      const priced = allProcessedQuotes
                        .map((q) => getQuotePrice(q))
                        .filter((n) => Number.isFinite(n) && n > 0);
                      const processedLowestPrice = priced.length
                        ? Math.min(...priced)
                        : Infinity;

                      const processedBestValueQuotes = allProcessedQuotes.filter(
                        (q) => {
                          const price = getQuotePrice(q);
                          return (
                            Number.isFinite(price) &&
                            Math.abs(price - processedLowestPrice) < 0.01
                          );
                        }
                      );

                      if (isCalculating) return null;

                      return (
                        <>
                          {tiedUpVendors.length > 0 && (
                            <section>
                              <h2 className="text-2xl font-bold text-slate-800 mb-5 border-l-4 border-indigo-500 pl-4">
                                Your Tied-Up Vendors
                              </h2>
                              <div className="space-y-4">
                                {tiedUpVendors.map((item, index) => (
                                  <VendorResultCard
                                    key={`tied-${index}`}
                                    quote={item}
                                    isBestValue={processedBestValueQuotes.includes(item)}
                                    isFastest={item === fastestQuote}
                                    vendorStatusMap={vendorStatusMap}
                                  />
                                ))}
                              </div>
                            </section>
                          )}

                          {otherVendors.length > 0 && (() => {
                            const isSubscribed = (user as any)?.customer?.isSubscribed;
                            return (
                              <section>
                                <h2 className="text-2xl font-bold text-slate-800 mb-5 border-l-4 border-slate-400 pl-4">
                                  Our Available Vendors
                                </h2>

                                {/* No container-level blur. Each card decides what to blur. */}
                                <div className="space-y-4">
                                  {otherVendors.map((item, index) => (
                                    <VendorResultCard
                                      key={`other-${index}`}
                                      quote={{ ...item, isHidden: !isSubscribed || (item as any).isHidden }}
                                      isBestValue={processedBestValueQuotes.includes(item)}
                                      isFastest={item === fastestQuote}
                                      vendorStatusMap={vendorStatusMap}
                                    />
                                  ))}
                                </div>

                                {!isSubscribed && (
                                  <p className="mt-3 text-center text-sm text-slate-500">
                                    Prices are visible. Subscribe to view vendor names & contact details.
                                  </p>
                                )}
                              </section>
                            );
                          })()}

                          {tiedUpVendors.length === 0 && otherVendors.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-300">
                              <PackageSearch className="mx-auto h-12 w-12 text-slate-400" />
                              <h3 className="mt-4 text-xl font-semibold text-slate-700">
                                No Quotes Available
                              </h3>
                              <p className="mt-1 text-base text-slate-500">
                                We couldn't find vendors for the details provided. This may happen if:
                              </p>
                              <ul className="mt-2 text-sm text-slate-500 text-left max-w-md mx-auto list-disc pl-6">
                                <li>
                                  No vendors have pricing configured for this route (zones: {fromPincode} → {toPincode})
                                </li>
                                <li>
                                  The origin or destination pincode is not in any vendor's service area
                                </li>
                                <li>
                                  Try adding vendors in "My Vendors" with zone pricing for these areas
                                </li>
                              </ul>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </motion.div>
                </div>
              </>
            )}
          </div>

          {/* RIGHT: Help Rail - Hidden on smaller screens */}
          <div className="hidden xl:block w-64 flex-shrink-0 sticky top-8">
            <CalculatorHelpRail />
          </div>
        </div>
      </div>
    </div>
  );
};


// -----------------------------------------------------------------------------
// Rating stars
// -----------------------------------------------------------------------------
const StarRating = ({ value }: { value: number }) => {
  const full = Math.floor(value);
  const capped = Math.max(0, Math.min(5, full));
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={16}
          className={i < capped ? "text-yellow-400 fill-yellow-400" : "text-slate-300"}
        />
      ))}
      <span className="text-xs text-slate-500 ml-1">
        ({(Number.isFinite(value) ? value : 0).toFixed(1)})
      </span>
    </div>
  );
};

// -----------------------------------------------------------------------------
// FineTune Modal
// -----------------------------------------------------------------------------
const FineTuneModal = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: { maxPrice: number; maxTime: number; minRating: number };
  onFilterChange: {
    setMaxPrice: (val: number) => void;
    setMaxTime: (val: number) => void;
    setMinRating: (val: number) => void;
  };
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const formatPrice = (value: number) => {
    if (value >= 10000000) return "Any";
    if (value >= 100000) return `${(value / 100000).toFixed(1)} Lakh`;
    return new Intl.NumberFormat("en-IN").format(value);
  };
  const formatTime = (value: number) => (value >= 300 ? "Any" : `${value} Days`);

  if (!isOpen) return null;

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/30"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute right-4 top-20 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 p-5 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <label htmlFor="maxPrice" className="font-semibold text-slate-700">
              Max Price
            </label>
            <span className="font-bold text-indigo-600">₹ {formatPrice(filters.maxPrice)}</span>
          </div>
          <input
            id="maxPrice"
            type="range"
            min={1000}
            max={10000000}
            step={1000}
            value={filters.maxPrice}
            onChange={(e) => onFilterChange.setMaxPrice(e.currentTarget.valueAsNumber)}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <label htmlFor="maxTime" className="font-semibold text-slate-700">
              Max Delivery Time
            </label>
            <span className="font-bold text-indigo-600">{formatTime(filters.maxTime)}</span>
          </div>
          <input
            id="maxTime"
            type="range"
            min={1}
            max={300}
            step={1}
            value={filters.maxTime}
            onChange={(e) => onFilterChange.setMaxTime(e.currentTarget.valueAsNumber)}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <label htmlFor="minRating" className="font-semibold text-slate-700">
              Min Vendor Rating
            </label>
            <span className="font-bold text-indigo-600">{filters.minRating.toFixed(1)} / 5.0</span>
          </div>
          <input
            id="minRating"
            type="range"
            min={0}
            max={5}
            step={0.1}
            value={filters.minRating}
            onChange={(e) => onFilterChange.setMinRating(e.currentTarget.valueAsNumber)}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
        </div>

        <div className="flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
};

// -----------------------------------------------------------------------------
// Bifurcation Details (with Invoice Value + Invoice Charges)
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// FIXED BifurcationDetails Component
// Replace the existing BifurcationDetails in your CalculatorPage.tsx with this
// -----------------------------------------------------------------------------

const BifurcationDetails = ({ quote }: { quote: any }) => {
  const formatCurrency = (value: number | undefined) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round((value || 0) / 10) * 10);

  const chargeItems = [
    { label: "Base Freight", keys: ["baseFreight", "base_freight", "freight"] },
    { label: "Docket Charge", keys: ["docketCharge", "docket_charge", "docket"] },
    { label: "DACC Charges", keys: ["daccCharges", "dacc_charges", "dacc"] },
    { label: "ODA Charges", keys: ["odaCharges", "oda_charges", "oda"] },
    { label: "Fuel Surcharge", keys: ["fuelCharges", "fuel_surcharge", "fuel"] },
    { label: "Handling Charges", keys: ["handlingCharges", "handling_charges", "handling"] },
    { label: "Insurance Charges", keys: ["insuaranceCharges", "insuranceCharges", "insurance_charges", "insurance"] },
    { label: "Green Tax", keys: ["greenTax", "green_tax", "green"] },
    { label: "Appointment Charges", keys: ["appointmentCharges", "appointment_charges", "appointment"] },
    { label: "Minimum Charges", keys: ["minCharges", "minimum_charges", "minimum"] },
    { label: "ROV Charges", keys: ["rovCharges", "rov_charges", "rov"] },
    { label: "FM Charges", keys: ["fmCharges", "fm_charges", "fm"] },
    { label: "Miscellaneous Charges", keys: ["miscCharges", "miscellaneous_charges", "misc"] },
    { label: "Invoice Value Charges", keys: ["invoiceAddon", "invoiceValueCharge"] },
  ];

  const getChargeValue = (keys: string[]) => {
    for (const key of keys) {
      if (quote[key] !== undefined && quote[key] > 0) {
        return quote[key];
      }
    }
    return 0;
  };

  const isFTLVendor =
    quote.companyName === "FTL" ||
    quote.companyName === "Wheelseye FTL" ||
    quote.companyName === "LOCAL FTL";

  // ✅ Extract vehicle breakdown from all possible locations
  const getVehicleBreakdown = (): any[] | null => {
    // Priority 1: Direct vehicleBreakdown array (from wheelseyeEngine)
    if (Array.isArray(quote.vehicleBreakdown) && quote.vehicleBreakdown.length > 0) {
      console.log("✅ Found vehicleBreakdown directly on quote:", quote.vehicleBreakdown);
      return quote.vehicleBreakdown;
    }
    // Priority 2: Nested in vehicleCalculation
    if (Array.isArray(quote.vehicleCalculation?.vehicleBreakdown) && quote.vehicleCalculation.vehicleBreakdown.length > 0) {
      console.log("✅ Found vehicleBreakdown in vehicleCalculation:", quote.vehicleCalculation.vehicleBreakdown);
      return quote.vehicleCalculation.vehicleBreakdown;
    }
    // Priority 3: loadSplit.vehicles (legacy)
    if (Array.isArray(quote.loadSplit?.vehicles) && quote.loadSplit.vehicles.length > 0) {
      console.log("✅ Found vehicles in loadSplit:", quote.loadSplit.vehicles);
      return quote.loadSplit.vehicles;
    }
    // Priority 4: vehiclePricing array
    if (Array.isArray(quote.vehiclePricing) && quote.vehiclePricing.length > 0) {
      console.log("✅ Found vehiclePricing, converting:", quote.vehiclePricing);
      return quote.vehiclePricing.map((v: any) => ({
        label: v.vehicleType,
        count: 1,
        slabWeightKg: v.maxWeight || v.weight,
        totalPrice: v.wheelseyePrice || v.ftlPrice,
        lengthFt: null,
      }));
    }

    console.log("❌ No vehicleBreakdown found in quote:", {
      vehicleBreakdown: quote.vehicleBreakdown,
      vehicleCalculation: quote.vehicleCalculation,
      loadSplit: quote.loadSplit,
      vehiclePricing: quote.vehiclePricing,
    });
    return null;
  };

  const vehicleBreakdown = getVehicleBreakdown();

  // Calculate total vehicles
  const totalVehicles = vehicleBreakdown
    ? vehicleBreakdown.reduce((sum: number, v: any) => sum + (v.count ?? 1), 0)
    : 0;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      {/* Cost breakdown (only for normal LTL vendors) */}
      {!isFTLVendor && (
        <div className="border-t border-slate-200 mt-4 pt-4">
          <h4 className="font-semibold text-slate-700 mb-3">Cost Breakdown</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            {chargeItems.map((item) => {
              const value = getChargeValue(item.keys);
              return value > 0 ? (
                <div key={item.label} className="flex justify-between">
                  <span className="text-slate-500">{item.label}:</span>
                  <span className="font-medium text-slate-800">
                    {formatCurrency(value)}
                  </span>
                </div>
              ) : null;
            })}
          </div>

          {typeof quote.invoiceValue === "number" && quote.invoiceValue > 0 && (
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-slate-500">Invoice Value (used for charges):</span>
              <span className="font-semibold text-slate-900">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(quote.invoiceValue)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Shipment Info */}
      <div className="border-t border-slate-200 mt-4 pt-4">
        <h4 className="font-semibold text-slate-700 mb-3">Shipment Info</h4>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Chargeable Wt:</span>
            <span className="font-medium text-slate-800">
              {(() => {
                const weight =
                  quote.chargeableWeight ?? quote.actualWeight ?? quote.weight ?? 0;
                return typeof weight === "number" && isFinite(weight)
                  ? Math.ceil(weight).toLocaleString()
                  : "0";
              })()}{" "}
              Kg
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Distance:</span>
            <span className="font-medium text-slate-800">
              {quote.distance
                ? quote.distance
                : quote.distanceKm
                  ? `${Math.round(quote.distanceKm)} km`
                  : "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Origin:</span>
            <span className="font-medium text-slate-800">
              {quote.originPincode ?? quote.origin ?? "-"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Destination:</span>
            <span className="font-medium text-slate-800">
              {quote.destinationPincode ?? quote.destination ?? "-"}
            </span>
          </div>
        </div>

        {/* ✅ VEHICLE DETAILS SECTION FOR FTL VENDORS */}
        {isFTLVendor && (
          <div className="mt-4">
            <div className="bg-yellow-100 border-2 border-yellow-500 rounded-lg p-4">
              <h5 className="text-black font-bold text-lg mb-3 flex items-center gap-2">
                🚛 Vehicle Details
              </h5>

              {vehicleBreakdown && vehicleBreakdown.length > 0 ? (
                <div className="space-y-3">
                  {/* Summary */}
                  <div className="flex items-center gap-2 text-black font-semibold">
                    <span>Total Vehicles Required:</span>
                    <span className="bg-yellow-200 px-3 py-1 rounded-full text-lg">
                      {totalVehicles}
                    </span>
                  </div>

                  {/* Detailed breakdown table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-yellow-300">
                          <th className="text-left py-2 px-2 text-black font-semibold">Qty</th>
                          <th className="text-left py-2 px-2 text-black font-semibold">Vehicle Type</th>
                          <th className="text-left py-2 px-2 text-black font-semibold">Length</th>
                          <th className="text-left py-2 px-2 text-black font-semibold">Capacity</th>
                          <th className="text-right py-2 px-2 text-black font-semibold">Price/Vehicle</th>
                          <th className="text-right py-2 px-2 text-black font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {vehicleBreakdown.map((v: any, idx: number) => {
                          // Properties from wheelseyeEngine.ts EngineVehicleComponent
                          const count = v.count ?? 1;
                          const label = v.label || v.vehicle || v.vehicleType || v.name || "Vehicle";
                          const lengthFt = v.lengthFt || v.vehicleLength || "-";
                          const capacity = v.slabWeightKg || v.maxWeight || v.weight || "-";
                          const pricePerVehicle = v.pricePerVehicle || v.price || 0;
                          const totalPrice = v.totalPrice || (pricePerVehicle * count) || 0;

                          return (
                            <tr key={idx} className="border-b border-yellow-200 hover:bg-yellow-50">
                              <td className="py-2 px-2 text-black font-medium">{count}×</td>
                              <td className="py-2 px-2 text-black font-medium">{label}</td>
                              <td className="py-2 px-2 text-black">
                                {typeof lengthFt === "number" ? `${lengthFt} ft` : lengthFt}
                              </td>
                              <td className="py-2 px-2 text-black">
                                {typeof capacity === "number" ? `${capacity.toLocaleString()} kg` : capacity}
                              </td>
                              <td className="py-2 px-2 text-black text-right">
                                {pricePerVehicle > 0 ? `₹${pricePerVehicle.toLocaleString()}` : "-"}
                              </td>
                              <td className="py-2 px-2 text-black text-right font-medium">
                                {totalPrice > 0 ? `₹${totalPrice.toLocaleString()}` : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-yellow-400 bg-yellow-50">
                          <td colSpan={5} className="py-3 px-2 text-black font-bold text-right">
                            Grand Total:
                          </td>
                          <td className="py-3 px-2 text-black font-bold text-right text-xl">
                            ₹{(quote.totalCharges || quote.price || 0).toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                /* Fallback when no breakdown array - use quote.vehicle / quote.vehicleLength */
                <div className="space-y-3 text-black">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="text-sm text-yellow-700 font-medium">Vehicle Type</div>
                      <div className="text-lg font-bold">{quote.vehicle || "Full Truck Load"}</div>
                    </div>
                    {quote.vehicleLength && (
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <div className="text-sm text-yellow-700 font-medium">Vehicle Length</div>
                        <div className="text-lg font-bold">{quote.vehicleLength}</div>
                      </div>
                    )}
                  </div>
                  {quote.chargeableWeight && (
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="text-sm text-yellow-700 font-medium">Carrying Weight</div>
                      <div className="text-lg font-bold">
                        {Math.ceil(quote.chargeableWeight).toLocaleString()} kg
                      </div>
                    </div>
                  )}
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="text-sm text-yellow-700 font-medium">Total Price</div>
                    <div className="text-xl font-bold text-green-700">
                      ₹{(quote.totalCharges || quote.price || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Legacy loadSplit display (if present and not already shown) */}
        {!isFTLVendor && quote.loadSplit?.vehicles && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <h6 className="font-semibold text-black mb-3">Load Split Details:</h6>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-yellow-200">
                    <th className="text-left py-2 text-black font-semibold">Vehicle</th>
                    <th className="text-left py-2 text-black font-semibold">Type</th>
                    <th className="text-left py-2 text-black font-semibold">Max Weight</th>
                    <th className="text-left py-2 text-black font-semibold">Carrying Weight</th>
                    <th className="text-right py-2 text-black font-semibold">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.loadSplit.vehicles.map((v: any, idx: number) => (
                    <tr key={idx} className="border-b border-yellow-100">
                      <td className="py-2 text-black">Vehicle {idx + 1}</td>
                      <td className="py-2 text-black">{v.vehicle || v.vehicleType}</td>
                      <td className="py-2 text-black">{(v.maxWeight || 0).toLocaleString()} kg</td>
                      <td className="py-2 text-black">{(v.weight || 0).toLocaleString()} kg</td>
                      <td className="py-2 text-black text-right">₹{(v.price || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Don't forget to import motion from framer-motion at the top of your file:
// import { motion, AnimatePresence } from "framer-motion";

// -----------------------------------------------------------------------------
// Verification Status Helper
// -----------------------------------------------------------------------------
/**
 * Determines the verification status of a vendor for displaying the appropriate badge.
 * 
 * Logic:
 * - Special vendors (LOCAL FTL, Wheelseye FTL) are always verified
 * - Check real-time status map first (synced via polling every 30s)
 * - Fallback to quote's approvalStatus from initial calculation
 * - Vendors with approvalStatus === 'pending' or 'rejected' are unverified
 * - Vendors with missing/unknown approvalStatus show as 'unknown'
 */
const getVerificationStatus = (
  quote: any,
  statusMap: Record<string, 'pending' | 'approved' | 'rejected'> = {}
): VerificationStatus => {
  // Special vendors (client-side injected) are always verified
  if (quote.isSpecialVendor) {
    return 'verified';
  }

  // Check by company name (fallback for special vendors)
  const companyName = (quote.companyName || '').trim().toLowerCase();
  if (companyName === 'local ftl' || companyName === 'wheelseye ftl') {
    return 'verified';
  }

  // ✨ Real-time sync: Check status map first (updated every 30s via polling)
  const realtimeStatus = statusMap[companyName];
  if (realtimeStatus === 'approved') return 'verified';
  if (realtimeStatus === 'pending' || realtimeStatus === 'rejected') return 'unverified';

  // Fallback: Check approval status from quote data (from initial calculation)
  if (quote.approvalStatus === 'approved') {
    return 'verified';
  }

  if (quote.approvalStatus === 'pending' || quote.approvalStatus === 'rejected') {
    return 'unverified';
  }

  // Default to unknown if status is not present
  return 'unknown';
};


// -----------------------------------------------------------------------------
// Result Card
// -----------------------------------------------------------------------------
const VendorResultCard = ({
  quote,
  isBestValue,
  isFastest,
  vendorStatusMap,
}: {
  quote: any;
  isBestValue?: boolean;
  isFastest?: boolean;
  vendorStatusMap: Record<string, 'pending' | 'approved' | 'rejected'>;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSubscribed = Boolean((user as any)?.customer?.isSubscribed);
  const isSpecialVendor =
    quote.companyName === "LOCAL FTL" || quote.companyName === "Wheelseye FTL";

  // Detect test/dummy vendors - these get white background instead of yellow
  const isTestVendor = /^(TESTER|DUMMY|testvendor|Vellore Institute)/i.test(quote.companyName || "");

  // Debug: Check if this is a temporary transporter
  console.log(`[VendorCard] ${quote.companyName}: isTemporaryTransporter=${quote.isTemporaryTransporter}, selectedZones=${quote.selectedZones?.length || 0}, priceChart=${JSON.stringify(quote.priceChart)}`);

  const cardPrice = getQuotePrice(quote);
  if (!Number.isFinite(cardPrice) || cardPrice <= 0) return null;

  // Dynamic CTA label + click logic
  const ctaLabel = isSubscribed ? "Contact Now" : "Subscribe to Get Details";
  const handleCtaClick = () => {
    if (isSubscribed) {
      // Debug: Log the entire quote object to see its structure
      console.log("=== QUOTE DATA DEBUG ===");
      console.log("Full quote object:", quote);
      console.log("companyName:", quote.companyName);
      console.log("transporterData:", quote.transporterData);
      console.log("transporterData._id:", quote.transporterData?._id);
      console.log("transporterID:", quote.transporterID);
      console.log("_id:", quote._id);
      console.log("isTiedUp:", quote.isTiedUp);

      // Use company name as identifier (will be used to fetch from DB)
      // Use a dummy ID but pass the quote data which contains the company name
      const companyName = quote.companyName || quote.transporterName;
      const transporterId = quote.transporterData?._id || quote.transporterID || quote._id || 'temp';

      if (companyName) {
        console.log("Navigating with companyName:", companyName, "and ID:", transporterId);
        // Pass the entire quote data as state - VendorDetailsPage will use companyName to find vendor
        navigate(`/transporterdetails/${transporterId}`, {
          state: { quoteData: quote }
        });
      } else {
        console.error("Company name missing. Quote data:", quote);
        alert("Sorry, the transporter details could not be retrieved.");
      }
    } else {
      navigate(BUY_ROUTE);
    }
  };

  // Hidden card (LEFT side blurred; price + CTA visible)
  // Hidden card (LEFT side blurred; price + CTA visible) - ALL vendors get yellow styling
  // ⬇️ Replace your current hidden-card return with this one
  if (quote.isHidden && !isSubscribed) {
    return (
      <div
        className={`relative p-5 rounded-2xl border-2 transition-all duration-300 shadow-lg ${isSpecialVendor ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-slate-200'}`}
      >
        {/* Best Value badge stays visible (not blurred) */}
        {isBestValue && (
          <div className="absolute -top-2 -left-2">
            <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-bold px-3 py-1.5 rounded-full shadow">
              Best Value
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4">
          {/* LEFT: blurred / anonymized vendor info */}
          <div className="md:col-span-6 select-none">
            <div className="h-6 w-52 rounded bg-slate-200/70 blur-[2px]" />
            <p className="mt-2 text-sm text-slate-400 line-clamp-1 select-none">
              ▓▒░ ▓▒░ ▓▒░ ▓▒░ ▓▒░ ▓▒░ ▓▒░ ▓▒░ ▓▒░
            </p>
          </div>

          {/* ETA placeholder stays blurred */}
          <div className="md:col-span-2">
            <div className="h-5 w-24 rounded bg-slate-200/70 blur-[2px]" />
            <div className="text-xs text-slate-400 mt-1 select-none">▓ ▒ ░</div>
          </div>

          {/* Price and CTA - now in same flex container, right-aligned */}
          <div className="md:col-span-4 flex items-center justify-end gap-4">
            {/* RIGHT: price visible */}
            <div className="text-right">
              <div className="flex items-center justify-end gap-1 font-bold text-3xl text-slate-900">
                <IndianRupee size={22} className="text-slate-600" />
                <span>{formatINR0(cardPrice)}</span>
              </div>
            </div>

            {/* CTA visible with "Subscribe to Get Details" */}
            <Link
              to={BUY_ROUTE}
              className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors whitespace-nowrap"
              aria-label="Subscribe to Get Details"
            >
              Subscribe to Get Details
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Normal (visible) card - ALL vendors get yellow styling
  return (
    <div
      className={`p-5 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 shadow-lg ${isSpecialVendor ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-slate-200'}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-4">
        {/* Vendor + badges */}
        <div className="md:col-span-6">
          <div className="flex items-center flex-wrap gap-2">
            <h3 className="font-bold text-lg text-slate-800 truncate">
              {quote.companyName}
            </h3>

            {/* Verification Badge - placed before other badges */}
            <VerificationBadge status={getVerificationStatus(quote, vendorStatusMap)} />

            <div className="flex items-center gap-2">
              {(isFastest ||
                quote.companyName === "Wheelseye FTL" ||
                quote.companyName === "LOCAL FTL") &&
                (quote.companyName || "").trim().toLowerCase() !== "dp world" && (
                  <span className="inline-flex items-center gap-1.5 bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1.5 rounded-full">
                    <Zap size={14} /> Fastest Delivery
                  </span>
                )}
              {isBestValue && (
                <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-xs font-bold px-3 py-1.5 rounded-full">
                  Best Value
                </span>
              )}
            </div>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            {/* Google Review - show if URL exists in quote data */}
            {(quote.googleReviewUrl || quote.transporterData?.googleReviewUrl) && (
              <a
                href={quote.googleReviewUrl || quote.transporterData?.googleReviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <span>Google Review</span>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-500">
                    {"★".repeat(Math.floor(quote.googleReviewRating || quote.transporterData?.googleReviewRating || 0))}
                  </span>
                  <span className="text-gray-300">
                    {"★".repeat(5 - Math.floor(quote.googleReviewRating || quote.transporterData?.googleReviewRating || 0))}
                  </span>
                  <span className="text-gray-600 ml-1">
                    ({(quote.googleReviewRating || quote.transporterData?.googleReviewRating || 0).toFixed(1)})
                  </span>
                </div>
              </a>
            )}

            {/* Internal Rating - show for all vendors except LOCAL FTL */}
            {quote.companyName !== "LOCAL FTL" && (
              <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                <span>Rating:</span>
                <strong className="text-slate-800">
                  {quote.rating || quote.transporterData?.rating || 4}
                </strong>
                <span className="text-yellow-500">★</span>
              </span>
            )}
          </div>
        </div>

        {/* ETA */}
        <div className="md:col-span-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 font-semibold text-slate-700 text-lg">
            <Clock size={16} className="text-slate-500" />
            <span>
              {Math.ceil(quote.estimatedTime ?? 1)}{" "}
              {Math.ceil(quote.estimatedTime ?? 1) === 1 ? "Day" : "Days"}
            </span>
          </div>
          <div className="text-xs text-slate-500 -mt-1">Estimated Delivery</div>
        </div>

        {/* Price and CTA - now in same flex container, right-aligned */}
        <div className="md:col-span-4 flex items-center justify-end gap-4">
          {/* Price (always visible) */}
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 font-bold text-3xl text-slate-900">
              <IndianRupee size={22} className="text-slate-600" />
              <span>{formatINR0(cardPrice)}</span>
            </div>

            <button
              onClick={() => setIsExpanded((v) => !v)}
              className="mt-2 inline-flex items-center gap-1.5 text-indigo-600 font-semibold text-sm hover:text-indigo-800 transition-colors"
            >
              {isExpanded ? "Hide Price Breakup" : "Price Breakup"}
              <ChevronRight
                size={16}
                className={`transition-transform duration-300 ${isExpanded ? "rotate-90" : "rotate-0"
                  }`}
              />
            </button>
          </div>

          {/* CTA (dynamic) */}
          <button
            onClick={handleCtaClick}
            className="px-5 py-2.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors whitespace-nowrap"
          >
            {ctaLabel}
          </button>
        </div>
      </div>


      <AnimatePresence>
        {isExpanded && <BifurcationDetails quote={quote} />}
      </AnimatePresence>
    </div>
  );
};

export default CalculatorPage;