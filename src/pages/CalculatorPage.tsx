// frontend/src/pages/CalculatorPage.tsx
import CoverageCounter from "../components/CoverageCounter";
import NetworkCoverageMap from "../components/NetworkCoverageMap";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    AlertCircle,
    Calculator as CalculatorIcon,
    Loader2,
    Package,
    PlusCircle,
    Star,
    Clock,
    IndianRupee,
    Zap,
    Trash2,
    PackageSearch,
    Save,
    Check,
    ChevronRight,
    Truck,
    Plane,
    Train,
    Ship,
    Download,
    MapPin,
    Navigation,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "react-hot-toast";
import { createPortal } from "react-dom";

import { useAuth } from "../hooks/useAuth";
import { useKeyboardNavigation } from "../hooks/useKeyboardNavigation";
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

// 🔽 Rating components for vendor ratings display and submission
import RatingBreakdownTooltip from "../components/RatingBreakdownTooltip";
import RatingFormModal from "../components/RatingFormModal";

// 🔽 FTL + Wheelseye quotes from service (no inline vendor code)
import { buildFtlAndWheelseyeQuotes } from "../services/wheelseye";

// 🔽 Special vendor constants for Wheelseye FTL and LOCAL FTL
import {
    SPECIAL_VENDOR_IDS,
    SPECIAL_VENDOR_NAMES,
    isSpecialVendorId,
    isSpecialVendorName,
    getSpecialVendorIdByName,
    VendorType
} from "../constants/specialVendors";

// 🔽 Fetch vendor approval statuses from Super Admin system
import { getTemporaryTransporters, getRegularTransporters, saveSearchHistory, apiGetPincode } from "../services/api";

// 🔽 Business News Popup (shown during slow calculations)
// import NewsPopup from "../components/NewsPopup";
import { incrementCalculatorUsageCount, shouldShowNewsPopup } from "../services/newsService";

// 🔽 Centralized API configuration
import { API_BASE_URL } from "../config/api";

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
type CardProps = {
    children: React.ReactNode;
    className?: string;
};

const Card = ({ children, className = "" }: CardProps) => (
    <div
        className={`bg-white rounded-xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] hover:shadow-blue-100 border border-slate-100/80 p-4 transition-all duration-300 ${className}`}
    >
        {children}
    </div>
);


const InputField = ({
    label,
    icon,
    error,
    className: passedClassName,
    placeholder,
    ...inputProps
}: React.InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    icon?: React.ReactNode;
    error?: string | null;
}) => {
    return (
        <div className="relative">
            {label && (
                <label
                    htmlFor={inputProps.id}
                    className="block text-sm font-medium text-slate-600 mb-1.5"
                >
                    {label}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400">
                        {icon}
                    </div>
                )}
                <input
                    {...inputProps}
                    placeholder={placeholder}
                    aria-invalid={error ? "true" : "false"}
                    className={`block w-full py-2 bg-white border rounded-lg text-sm shadow-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 transition ${icon ? "pl-10" : passedClassName?.includes("px-") ? "" : "px-4"
                        } ${error
                            ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                            : "border-slate-300 focus:border-blue-600 focus:ring-blue-600"
                        } ${passedClassName || ""}`}
                />
            </div>
            {!!error && (
                <p className="absolute left-0 top-full mt-0.5 text-xs text-red-600 flex items-center gap-1 whitespace-nowrap">
                    <AlertCircle size={14} />
                    {error}
                </p>
            )}
        </div>
    );
};

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
            ? "bg-slate-900 border-slate-900 text-white shadow-md"
            : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
            }`}
    >
        {icon}
        <span>{label}</span>
    </button>
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
    length?: number;
    width?: number;
    height?: number;
    weight: number;
    modeoftransport: "Road" | "Air" | "Rail" | "Ship";
    description?: string;
    dimensionUnit?: "cm" | "inch";
};

type BoxDetails = {
    id: string;
    count: number | undefined;
    length?: number | undefined;
    width?: number | undefined;
    height?: number | undefined;
    weight: number | undefined;
    description: string;
    weightMode?: 'actual' | 'volumetric';
};

type PresetSaveState = "idle" | "saving" | "success" | "exists" | "error";

// -----------------------------------------------------------------------------
// Calculator Page
// -----------------------------------------------------------------------------
const CalculatorPage: React.FC = (): JSX.Element => {
    const { user, isSuperAdmin, loading } = useAuth();
    const token = Cookies.get("authToken");
    const navigate = useNavigate();

    // Helper to safely get customer data regardless of user object structure
    // After useAuth fetches from /api/auth/me, user becomes the customer directly
    // But from JWT decode, user has { customer: {...} } structure
    const getCustomer = () => {
        if (!user) return null;
        const u = user as any;
        // If user.customer exists, use it; otherwise user IS the customer
        return u.customer || u;
    };

    // UI state
    const [sortBy, setSortBy] = useState<"price" | "time" | "rating">("price");
    const [isCalculating, setIsCalculating] = useState(false);
    const [calculationProgress, setCalculationProgress] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Results
    const [data, setData] = useState<QuoteAny[] | null>(null);
    const [hiddendata, setHiddendata] = useState<QuoteAny[] | null>(null);

    // NEW: Shipment Type Selector ("Heavy" vs "Light")
    const [shipmentType, setShipmentType] = useState<"Heavy" | "Light">("Light");
    const [dimensionUnit, setDimensionUnit] = useState<"cm" | "inch">("cm");

    // Real-time vendor approval status (synced from Super Admin)
    const [vendorStatusMap, setVendorStatusMap] = useState<Record<string, { approvalStatus: 'pending' | 'approved' | 'rejected'; isVerified: boolean }>>({});

    // Nearest serviceable pincode state
    const [nearestPincodeInfo, setNearestPincodeInfo] = useState<{
        nearestPincode: string;
        originalPincode: string;
        distance: number;
        servedBy: string[];
    } | null>(null);
    const [isSearchingNearest, setIsSearchingNearest] = useState(false);
    const [showingNearestResults, setShowingNearestResults] = useState(false);

    // Form state
    // Form state initialized with storage data to prevent race conditions
    const [modeOfTransport, setModeOfTransport] = useState<"Road" | "Air" | "Rail" | "Ship">(() => {
        const form = loadFormState();
        return form?.modeOfTransport || "Road";
    });
    const [fromPincode, setFromPincode] = useState(() => {
        const form = loadFormState();
        return form?.fromPincode || "";
    });
    const [toPincode, setToPincode] = useState(() => {
        const form = loadFormState();
        return form?.toPincode || "";
    });
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

    const [boxes, setBoxes] = useState<BoxDetails[]>(() => {
        const form = loadFormState();
        if (form && Array.isArray(form.boxes) && form.boxes.length > 0) {
            return form.boxes.map((b: any) => ({
                ...b,
                id: b.id || `box-${Date.now()}-${Math.random()}`,
            }));
        }
        return [{
            id: `box-${Date.now()}-${Math.random()}`,
            count: undefined,
            weight: undefined,
            description: "",
        }];
    });

    // Track which box fields have been touched (for showing validation errors)
    const [boxFieldsTouched, setBoxFieldsTouched] = useState<Record<string, { count?: boolean; weight?: boolean; length?: boolean; width?: boolean; height?: boolean }>>({});

    const markBoxFieldTouched = (boxId: string, field: 'count' | 'weight' | 'length' | 'width' | 'height') => {
        setBoxFieldsTouched(prev => ({
            ...prev,
            [boxId]: { ...prev[boxId], [field]: true }
        }));
    };

    const [calculationTarget, setCalculationTarget] = useState<"all" | number>(
        "all"
    );



    // Presets & dropdowns
    const [savedBoxes, setSavedBoxes] = useState<SavedBox[]>([]);
    const [openPresetDropdownIndex, setOpenPresetDropdownIndex] =
        useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const presetRefs = useRef<(HTMLDivElement | null)[]>([]);
    const boxFormRefs = useRef<(HTMLDivElement | null)[]>([]);
    const formContainerRef = useRef<HTMLDivElement>(null);

    // Inline Save-Preset status (per box)
    const [presetStatusByBoxId, setPresetStatusByBoxId] = useState<
        Record<string, PresetSaveState>
    >({});

    // Fine-tune modal
    const [isFineTuneOpen, setIsFineTuneOpen] = useState(false);
    const [maxPrice, setMaxPrice] = useState(10_000_000);
    const [maxTime, setMaxTime] = useState(300);
    const [minRating, setMinRating] = useState(0);

    // Rating modal state (lifted to page level to prevent multiple instances)
    const [ratingModalState, setRatingModalState] = useState<{
        isOpen: boolean;
        vendorId: string;
        vendorName: string;
        isTemporaryVendor: boolean;
        vendorType?: VendorType;
        onRatingSubmitted?: (newRating: number, vendorRatings: {
            priceSupport: number;
            deliveryTime: number;
            tracking: number;
            salesSupport: number;
            damageLoss: number;
        }) => void;
    }>({
        isOpen: false,
        vendorId: '',
        vendorName: '',
        isTemporaryVendor: false,
        vendorType: 'regular',
    });

    const openRatingModal = (config: {
        vendorId: string;
        vendorName: string;
        isTemporaryVendor: boolean;
        vendorType?: VendorType;
        onRatingSubmitted?: (newRating: number, vendorRatings: {
            priceSupport: number;
            deliveryTime: number;
            tracking: number;
            salesSupport: number;
            damageLoss: number;
        }) => void;
    }) => {
        setRatingModalState({
            isOpen: true,
            ...config,
        });
    };

    const closeRatingModal = () => {
        setRatingModalState(prev => ({
            ...prev,
            isOpen: false,
        }));
    };

    // Recent Routes State
    interface RecentRoute {
        id: string;
        fromPincode: string;
        toPincode: string;
        invoiceValue: string;
        timestamp: number;
    }

    const [recentRoutes, setRecentRoutes] = useState<RecentRoute[]>([]);

    // Load recent routes from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('freight_recent_routes');
        if (saved) {
            try {
                setRecentRoutes(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse recent routes:', e);
            }
        }
    }, []);

    // Save a new recent route
    const saveRecentRoute = () => {
        if (!fromPincode || !toPincode) return;

        const newRoute: RecentRoute = {
            id: Date.now().toString(),
            fromPincode,
            toPincode,
            invoiceValue: invoiceValue || '50000',
            timestamp: Date.now()
        };

        const updated = [newRoute, ...recentRoutes]
            .filter((route, index, self) =>
                // Remove duplicates (same origin + destination)
                index === self.findIndex(r =>
                    r.fromPincode === route.fromPincode &&
                    r.toPincode === route.toPincode
                )
            )
            .slice(0, 4); // Keep only last 4 routes

        setRecentRoutes(updated);
        localStorage.setItem('freight_recent_routes', JSON.stringify(updated));
    };

    // Load a recent route
    const loadRecentRoute = (route: RecentRoute) => {
        setFromPincode(route.fromPincode);
        setToPincode(route.toPincode);
        setInvoiceValue(route.invoiceValue);
        setFromPinTouched(true);
        setToPinTouched(true);
    };

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

    // Check if any box is missing required fields (quantity or weight)
    const hasBoxValidationErrors = useMemo(
        () => boxes.some((box) => {
            const basicInvalid = !box.count || box.count <= 0 || !box.weight || box.weight <= 0;
            if (basicInvalid) return true;

            // For Light (volumetric) shipments, dimensions are required
            if (shipmentType === "Light") {
                return !box.length || !box.width || !box.height;
            }
            return false;
        }),
        [boxes, shipmentType]
    );

    // 🔧 Clear error when user fills in required fields
    useEffect(() => {
        if (error && !hasBoxValidationErrors && !hasPincodeIssues) {
            setError("");
        }
    }, [boxes, hasBoxValidationErrors, hasPincodeIssues]);

    // 🔧 Clear error when user fills in required fields
    useEffect(() => {
        if (error && !hasBoxValidationErrors && !hasPincodeIssues) {
            setError("");
        }
    }, [boxes, hasBoxValidationErrors, hasPincodeIssues]);

    // ---------------------------------------------------------------------------
    // Effects
    // ---------------------------------------------------------------------------
    // ✅ Autofill only once per mount (or first render), not after user clears
    const didAutofillFromProfile = React.useRef(false);

    useEffect(() => {
        if (didAutofillFromProfile.current) return;
        const pin = getCustomer()?.pincode;
        if (pin && (fromPincode === "" || fromPincode == null)) {
            setFromPincode(String(pin));
            didAutofillFromProfile.current = true;
        }
        // purposely NOT depending on fromPincode to avoid re-autofill loops
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);


    useEffect(() => {
        clearStaleCache();
        // State is now hydrated in useState initializers to avoid race conditions with saveFormState

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
                console.log('[Real-time Sync] Fetching all transporters...');

                // Fetch BOTH temporary and regular transporters in parallel
                const [tempVendors, regularVendors] = await Promise.all([
                    getTemporaryTransporters(undefined) as Promise<any[]>,
                    getRegularTransporters() as Promise<any[]>
                ]);

                console.log('[Real-time Sync] Temporary vendors:', tempVendors.length);
                console.log('[Real-time Sync] Regular vendors:', regularVendors.length);

                const statusMap: Record<string, { approvalStatus: 'pending' | 'approved' | 'rejected'; isVerified: boolean }> = {};

                // Add temporary transporters to map
                tempVendors.forEach(vendor => {
                    if (vendor.companyName && vendor.approvalStatus) {
                        const normalizedName = vendor.companyName.trim().toLowerCase();
                        statusMap[normalizedName] = {
                            approvalStatus: vendor.approvalStatus as 'pending' | 'approved' | 'rejected',
                            isVerified: vendor.isVerified === true
                        };
                    }
                });

                // Add regular transporters to map (will override temporary if same name exists)
                regularVendors.forEach(vendor => {
                    if (vendor.companyName) {
                        const normalizedName = vendor.companyName.trim().toLowerCase();
                        statusMap[normalizedName] = {
                            approvalStatus: vendor.approvalStatus || 'approved', // Default approved for regular
                            isVerified: vendor.isVerified === true
                        };
                    }
                });

                setVendorStatusMap(statusMap);
                console.log('[Real-time Sync] Total vendor statuses updated:', Object.keys(statusMap).length);
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
        if (loading) return;
        fetchSavedBoxes();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading, user, token]);

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


    const createNewBox = (): BoxDetails => ({
        id: `box-${Date.now()}-${Math.random()}`,
        count: undefined,
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
        setBoxes(boxes.filter((_, j) => j !== i));
        setCalculationTarget("all");
    };
    const editBox = (index: number) => {
        const el = boxFormRefs.current[index];
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    // Presets
    const fetchSavedBoxes = async () => {
        if (!token) {
            console.warn("[Presets] Skipping fetch: missing auth token");
            setSavedBoxes([]);
            return;
        }

        const customerId = getCustomer()?._id;
        if (!customerId) {
            if (!isSuperAdmin) {
                console.warn("[Presets] Skipping fetch: missing customerId (likely admin user)");
            }
            setSavedBoxes([]);
            return;
        }
        try {
            const response = await axios.get(
                `${API_BASE_URL}/api/transporter/getpackinglist`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const list = (response as any)?.data?.data;
            setSavedBoxes(Array.isArray(list) ? list : []);
        } catch (err: any) {
            console.error("Failed to fetch saved boxes:", {
                status: err?.response?.status,
                data: err?.response?.data,
                message: err?.message,
            });
            setSavedBoxes([]);
            setError(
                `Could not load presets: ${err.response?.data?.message || err.message}`
            );
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
                    `${API_BASE_URL}/api/transporter/deletepackinglist/${presetId}`,
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
            count: 0, // 🔧 Set to 0 so placeholder shows instead of "1"
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

        const customerId = getCustomer()?._id;
        if (!customerId) {
            setError("Unable to identify user. Please log in again.");
            return;
        }

        setError(null);
        setPresetStatus(boxId, "saving");

        const payload = {
            name,
            description: name,
            customerId,
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
                `${API_BASE_URL}/api/transporter/savepackinglist`,
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
            // Validation based on Shipment Type
            if (shipmentType === "Heavy") {
                // Heavy Mode: Only check Count and Weight
                if (!box.count || !box.weight) {
                    const name = box.description || `Box Type ${boxes.indexOf(box) + 1}`;
                    setError(`Please fill in Qty and Weight for "${name}".`);
                    setIsCalculating(false);
                    return;
                }
                // Push payload with dummy dimensions (1x1x1) for backend compatibility
                shipmentPayload.push({
                    count: box.count,
                    length: 1,
                    width: 1,
                    height: 1,
                    weight: box.weight,
                });
            } else {
                // Light Mode: Check Count, Weight, and Dimensions
                if (
                    !box.count ||
                    !box.weight ||
                    !box.length ||
                    !box.width ||
                    !box.height
                ) {
                    const name = box.description || `Box Type ${boxes.indexOf(box) + 1}`;
                    setError(`Please fill in Qty, Weight and Dimensions for "${name}".`);
                    setIsCalculating(false);
                    return;
                }
                // Convert dimensions to cm if user selected inches
                let len = Number(box.length);
                let wid = Number(box.width);
                let ht = Number(box.height);

                if (dimensionUnit === "inch") {
                    len = len * 2.54;
                    wid = wid * 2.54;
                    ht = ht * 2.54;
                }

                shipmentPayload.push({
                    count: box.count,
                    length: len,
                    width: wid,
                    height: ht,
                    weight: box.weight, // Send actual weight; backend computes max(actual, volumetric)
                });
            }
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

        // API_BASE_URL imported from ../config/api - no need to redefine

        try {
            // PERF: Minimal logging in hot path
            const calcStartTime = performance.now();

            const customer = getCustomer();
            const resp = await axios.post(
                `${API_BASE_URL}/api/transporter/calculate`,
                {
                    customerID: customer?._id,
                    userogpincode: customer?.pincode,
                    modeoftransport: modeOfTransport,
                    fromPincode,
                    toPincode,
                    shipment_details: shipmentPayload,
                    invoiceValue: inv,
                },
                { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
            );

            // ❌ Check for route not found error from backend
            if (resp.data.error === 'NO_ROUTE_FOUND' || resp.data.error === 'NO_ROAD_ROUTE') {
                setError(`No road route exists between ${fromPincode} and ${toPincode}. This may be because the destination is an island or otherwise unreachable by road.`);
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
                    // FIXED: Use backend's isTiedUp flag to distinguish user's own vendors from others
                    // Backend sets isTiedUp based on: vendor.customerID === loggedInUser.customerID
                    isTiedUp: typeof q.isTiedUp === 'boolean' ? q.isTiedUp : true,
                    // Extract verification status from transporter data if available
                    approvalStatus: q.transporterData?.approvalStatus || q.approvalStatus,
                })),
                ...(resp.data.companyResult || []).map((q: QuoteAny) => ({
                    ...q,
                    // Public transporters are always "available" (not tied to specific users)
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

            // DEBUG: Log vendor categorization (helps verify isTiedUp flag is working)
            console.log('[VENDOR DEBUG] Total vendors:', all.length);
            console.log('[VENDOR DEBUG] Tied-up vendors:', all.filter(q => q.isTiedUp).map(q => q.companyName));
            console.log('[VENDOR DEBUG] Available vendors:', all.filter(q => !q.isTiedUp).map(q => q.companyName));

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

            // Note: Test/dummy transporter filtering is now handled in the backend
            // See backend/controllers/transportController.js - filters applied to all queries

            // ---------- Optional: price rounding for tied-up vendors ----------
            tied.forEach((quote) => {
                if (quote.companyName === "DP World") return;
                const round5 = (x: number) => Math.round(x / 5) * 5;
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

            // Save search history to backend (fire-and-forget)
            (async () => {
                try {
                    const allQuotes = [...tied, ...others]
                        .filter((q: any) => Number.isFinite(q.totalCharges) && q.totalCharges > 0)
                        .sort((a: any, b: any) => a.totalCharges - b.totalCharges)
                        .slice(0, 5)
                        .map((q: any) => ({
                            companyName: q.companyName || "Unknown",
                            totalCharges: q.totalCharges,
                            estimatedTime: q.estimatedTime || 0,
                            chargeableWeight: q.chargeableWeight || 0,
                            isTiedUp: !!q.isTiedUp,
                        }));

                    const [fromGeo, toGeo] = await Promise.all([
                        apiGetPincode(fromPincode),
                        apiGetPincode(toPincode),
                    ]);

                    await saveSearchHistory({
                        fromPincode,
                        fromCity: fromGeo?.city || "",
                        fromState: fromGeo?.state || "",
                        toPincode,
                        toCity: toGeo?.city || "",
                        toState: toGeo?.state || "",
                        modeOfTransport,
                        distanceKm: distanceKmOverride || 0,
                        boxes: boxes.map((b) => ({
                            count: b.count || 1,
                            length: b.length || 0,
                            width: b.width || 0,
                            height: b.height || 0,
                            weight: b.weight || 0,
                            description: b.description || "",
                        })),
                        totalBoxes: boxes.reduce((sum, b) => sum + (b.count || 1), 0),
                        totalWeight,
                        invoiceValue: inv,
                        topQuotes: allQuotes,
                    });
                } catch (err) {
                    console.error("[SearchHistory] Failed to save:", err);
                }
            })();
        } catch (e: any) {
            if (e.response?.status === 401) {
                setError("Authentication failed. Please log out and log back in.");
            } else if (e.response?.status === 400 && (e.response?.data?.error === 'NO_ROUTE_FOUND' || e.response?.data?.error === 'NO_ROAD_ROUTE')) {
                setError(`No road route exists between ${fromPincode} and ${toPincode}. This may be because the destination is an island or otherwise unreachable by road.`);
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

            // 📰 Auto-scroll to results after every calculation
            // Wait for render + animation to complete before scrolling
            setTimeout(() => {
                // Try to scroll to first-results (tied-up vendors), fallback to results container
                const firstResults = document.getElementById("first-results");
                const resultsContainer = document.getElementById("results");
                const scrollTarget = firstResults || resultsContainer;

                scrollTarget?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }, 300);
        }
    };

    // -------------------- Centralized Keyboard Navigation --------------------
    useKeyboardNavigation({
        containerRef: formContainerRef,
        shipmentType,
        boxCount: boxes.length,
        onAddBox: addBoxType,
        onCalculate: () => {
            saveRecentRoute();
            calculateQuotes();
        },
    });

    // -------------------- Excel Download Helper --------------------
    const downloadPackingListAsExcel = () => {
        if (boxes.length === 0) return;

        // Create CSV content (simple Excel-compatible format)
        const headers = ['Box Name', 'Quantity', 'Weight (kg)', 'Length (cm)', 'Width (cm)', 'Height (cm)'];
        const rows = boxes.map(box => [
            box.description || 'Unnamed Box',
            box.count || 0,
            box.weight || 0,
            box.length || '-',
            box.width || '-',
            box.height || '-',
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Download as CSV (opens in Excel)
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `packing-list-${fromPincode}-to-${toPincode}-${Date.now()}.csv`;
        link.click();
    };

    // -------------------- Render --------------------
    const equalityError =
        isSamePincode && isFromPincodeValid && isToPincodeValid
            ? "Origin and Destination cannot be the same."
            : null;

    return (
        <div className="min-h-screen relative pb-20 w-full font-sans text-slate-600 overflow-x-hidden">
            {/* Background Layers */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {/* Base Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-slate-50" />
                {/* Truck Background Image - Subtle Overlay */}
                <div
                    className="absolute inset-0 bg-cover bg-center bg-fixed opacity-[0.7]"
                    style={{ backgroundImage: "url('/panoramic_trucks_v3.png')" }}
                />
            </div>

            {/* Main Content */}
            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-3 pb-4 origin-top" style={{ transform: 'scale(1.10)', transformOrigin: 'top center' }}>
                {/* PAGE HEADER - Minimal */}
                <header className="mb-3 flex items-center justify-between">
                    <h1 className="text-3xl font-extrabold text-black tracking-tight">Freight Calculator</h1>
                </header>

                {/* TWO-COLUMN LAYOUT (68% - 32%) */}
                <div className="grid grid-cols-1 lg:grid-cols-[68%_32%] gap-3 items-start">

                    {/* LEFT COLUMN - Calculator Flow */}
                    <div className="space-y-2" ref={formContainerRef}>
                        <div className="flex flex-col gap-2">
                            {/* Route Definition - Primary Input Area */}
                            <Card className="p-0">
                                {/* Transport Mode - Minimal Tab Bar */}
                                <div className="flex items-center bg-slate-50 border-b border-slate-200 px-1">
                                    {[
                                        { name: "Road", icon: <Truck size={16} />, isAvailable: true },
                                        { name: "Air", icon: <Plane size={16} />, isAvailable: false },
                                        { name: "Rail", icon: <Train size={16} />, isAvailable: false },
                                        { name: "Ship", icon: <Ship size={16} />, isAvailable: false },
                                    ].map((mode) => (
                                        <button
                                            key={mode.name}
                                            onClick={() => (mode.isAvailable ? setModeOfTransport(mode.name as any) : null)}
                                            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${modeOfTransport === mode.name
                                                ? "text-blue-700 bg-blue-50/50 border-t-2 border-blue-600 -mb-px font-bold shadow-sm"
                                                : mode.isAvailable
                                                    ? "text-slate-500 hover:text-slate-700"
                                                    : "text-slate-300 cursor-not-allowed"
                                                }`}
                                            disabled={!mode.isAvailable}
                                        >
                                            {mode.icon}
                                            <span>{mode.name}</span>
                                        </button>
                                    ))}
                                </div>

                                {/* Route Inputs - Dominant Visual Weight */}
                                <div className="p-4">
                                    {/* Primary: Origin → Destination + Invoice (Single Row) */}
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <PincodeAutocomplete
                                                label="Origin Pincode"
                                                id="fromPincode"
                                                value={fromPincode}
                                                placeholder="400001"
                                                error={fromPinTouched ? (fromPinError || equalityError) : null}
                                                onChange={(value: string) => {
                                                    setFromPincode(value);
                                                    setFromPinTouched(true);
                                                    setFromPinError(null);
                                                }}
                                                onBlur={() => setFromPinTouched(true)}
                                                onSelect={() => { }}
                                                onValidationChange={setIsFromPincodeValid}
                                            />
                                        </div>
                                        <div className="flex items-center justify-center w-6 h-9 shrink-0 text-slate-300">
                                            <ChevronRight size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <PincodeAutocomplete
                                                label="Destination Pincode"
                                                id="toPincode"
                                                value={toPincode}
                                                placeholder="110001"
                                                error={toPinTouched ? (toPinError || equalityError) : null}
                                                onChange={(value: string) => {
                                                    setToPincode(value);
                                                    setToPinTouched(true);
                                                    setToPinError(null);
                                                }}
                                                onBlur={() => setToPinTouched(true)}
                                                onSelect={() => { }}
                                                onValidationChange={setIsToPincodeValid}
                                            />
                                        </div>
                                        {/* Invoice Value - Inline */}
                                        <div className="flex-1 min-w-0">
                                            <label className="block text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1.5 whitespace-nowrap">Invoice Value</label>
                                            <div className="relative group">
                                                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 font-medium text-xs">₹</span>
                                                <input
                                                    id="invoiceValue"
                                                    type="text"
                                                    inputMode="numeric"
                                                    pattern="\d*"
                                                    placeholder="50000"
                                                    value={invoiceValue}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/\D/g, "");
                                                        if (value === "") {
                                                            setInvoiceValue("");
                                                            setInvoiceError(null);
                                                            return;
                                                        }
                                                        const num = Number(value);
                                                        if (num > INVOICE_MAX) {
                                                            setInvoiceValue(String(INVOICE_MAX));
                                                            setInvoiceError(`Max ₹${INVOICE_MAX.toLocaleString("en-IN")}`);
                                                        } else {
                                                            setInvoiceValue(String(num));
                                                            setInvoiceError(null);
                                                        }
                                                    }}
                                                    onBlur={(e) => {
                                                        const raw = e.currentTarget.value.replace(/\D/g, "");
                                                        if (raw === "") return;
                                                        let num = Number(raw);
                                                        if (num < INVOICE_MIN) num = INVOICE_MIN;
                                                        if (num > INVOICE_MAX) num = INVOICE_MAX;
                                                        setInvoiceValue(String(num));
                                                    }}
                                                    className={`w-full py-1.5 pl-3 pr-1 text-sm bg-transparent border-b border-slate-200 focus:border-blue-600 focus:outline-none transition-colors placeholder-slate-300 font-medium text-slate-700 ${invoiceError ? 'border-red-300' : ''}`}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recent Routes - Hidden for now */}
                                    {false && recentRoutes.length > 0 && (
                                        <div className="flex items-center gap-3 pt-3 mt-3 border-t border-slate-100">
                                            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Recent Routes:</span>
                                            <div className="flex gap-2 flex-wrap">
                                                {recentRoutes.slice(0, 4).map((route) => (
                                                    <button
                                                        key={route.id}
                                                        type="button"
                                                        onClick={() => loadRecentRoute(route)}
                                                        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors bg-slate-50 hover:bg-blue-50 px-2 py-1 rounded border border-slate-100 hover:border-blue-100"
                                                        title={`${route.fromPincode} → ${route.toPincode}`}
                                                    >
                                                        <Clock size={10} />
                                                        <span>{route.fromPincode}→{route.toPincode}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>

                            {/* Packing Details */}
                            <Card className="p-0 overflow-visible">
                                {/* Header Row */}
                                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Packing</span>

                                        {/* Mode Toggle - Styled as segmented control */}
                                        <div className="flex text-[11px]">
                                            <button
                                                onClick={() => setShipmentType("Light")}
                                                className={`px-3 py-1.5 font-semibold border transition-all duration-300 ${shipmentType === "Light"
                                                    ? "bg-slate-800 text-white border-slate-800 shadow-md transform scale-105 z-10"
                                                    : "bg-white text-slate-500 border-slate-200 hover:text-blue-600 hover:border-blue-200 hover:bg-slate-50"
                                                    } rounded-l-lg`}
                                            >
                                                Light (by volume)
                                            </button>
                                            <button
                                                onClick={() => setShipmentType("Heavy")}
                                                className={`px-3 py-1.5 font-semibold border-t border-b border-r transition-all duration-300 ${shipmentType === "Heavy"
                                                    ? "bg-slate-800 text-white border-slate-800 shadow-md transform scale-105 z-10"
                                                    : "bg-white text-slate-500 border-slate-200 hover:text-blue-600 hover:border-blue-200 hover:bg-slate-50"
                                                    } rounded-r-lg`}
                                            >
                                                Heavy (by weight)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Unit Toggle - Only for Light mode */}
                                    {shipmentType === "Light" && (
                                        <div className="flex text-[10px]">
                                            <button
                                                onClick={() => setDimensionUnit("cm")}
                                                className={`px-2 py-0.5 font-medium border ${dimensionUnit === "cm"
                                                    ? "bg-slate-700 text-white border-slate-700"
                                                    : "bg-white text-slate-400 border-slate-200"
                                                    } rounded-l`}
                                            >
                                                CM
                                            </button>
                                            <button
                                                onClick={() => setDimensionUnit("inch")}
                                                className={`px-2 py-0.5 font-medium border-t border-b border-r ${dimensionUnit === "inch"
                                                    ? "bg-slate-700 text-white border-slate-700"
                                                    : "bg-white text-slate-400 border-slate-200"
                                                    } rounded-r`}
                                            >
                                                IN
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="m-3 p-3 space-y-2 bg-slate-50 border border-slate-200 rounded-lg">
                                    {/* Table Header - shares exact same grid template as rows */}
                                    <div className={`hidden sm:grid gap-2 py-1.5 text-[10px] font-medium text-slate-500 uppercase tracking-wide ${shipmentType === "Light" ? "sm:grid-cols-[3fr_1fr_1.5fr_1.2fr_1.2fr_1.2fr_1.5fr]" : "sm:grid-cols-[3fr_1fr_2fr_6fr]"}`}>
                                        <div className="whitespace-nowrap">Name / Preset</div>
                                        <div className="text-center whitespace-nowrap">Qty</div>
                                        {shipmentType === "Heavy" ? (
                                            <div className="text-center whitespace-nowrap">Weight (kg)</div>
                                        ) : (
                                            <>
                                                <div className="text-center whitespace-nowrap">Wt (kg)</div>
                                                <div className="text-center whitespace-nowrap">L ({dimensionUnit})</div>
                                                <div className="text-center whitespace-nowrap">W ({dimensionUnit})</div>
                                                <div className="text-center whitespace-nowrap">H ({dimensionUnit})</div>
                                            </>
                                        )}
                                        <div></div>
                                    </div>

                                    <AnimatePresence>
                                        {boxes.map((box, index) => (
                                            <motion.div
                                                key={box.id}
                                                layout
                                                initial={{ opacity: 0, y: -10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.15 }}
                                                className="py-2"
                                                ref={(el) => (boxFormRefs.current[index] = el)}
                                            >
                                                {/* Single Row Layout - same grid template as header */}
                                                <div className={`grid grid-cols-12 gap-2 items-start ${shipmentType === "Light" ? "sm:grid-cols-[3fr_1fr_1.5fr_1.2fr_1.2fr_1.2fr_1.5fr]" : "sm:grid-cols-[3fr_1fr_2fr_6fr]"}`}>
                                                    {/* 1. Box Name */}
                                                    <div className="col-span-12 sm:col-span-1">
                                                        <div
                                                            className="relative text-sm"
                                                            ref={(el) => {
                                                                if (el) presetRefs.current[index] = el;
                                                            }}
                                                        >
                                                            <InputField
                                                                id={`preset-${index}`}
                                                                placeholder="Search..."
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
                                                                onBlur={() => {
                                                                    // Delay so dropdown item clicks register before close
                                                                    setTimeout(() => setOpenPresetDropdownIndex(null), 150);
                                                                }}
                                                                icon={<PackageSearch size={14} />}
                                                                className="text-sm py-1.5"
                                                                autoComplete="off"
                                                            />
                                                            <AnimatePresence>
                                                                {openPresetDropdownIndex === index && (
                                                                    <motion.ul
                                                                        initial={{ opacity: 0, y: -5 }}
                                                                        animate={{ opacity: 1, y: 0 }}
                                                                        exit={{ opacity: 0, y: -5 }}
                                                                        className="absolute z-50 w-full mt-1 border border-slate-200 rounded-lg max-h-40 overflow-y-auto bg-white shadow-lg"
                                                                    >
                                                                        {displayableBoxes.length > 0 ? (
                                                                            displayableBoxes.map((preset) => (
                                                                                <li
                                                                                    key={preset._id}
                                                                                    onClick={() => handleSelectPresetForBox(index, preset)}
                                                                                    className="group flex justify-between items-center px-3 py-1.5 hover:bg-blue-50 cursor-pointer text-slate-700 text-xs transition-colors"
                                                                                >
                                                                                    <span>{preset.name}</span>
                                                                                    <button
                                                                                        onClick={(e) => handleDeletePreset(preset._id, e)}
                                                                                        className="p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-100 rounded-full transition-all duration-200"
                                                                                        title={`Delete "${preset.name}"`}
                                                                                    >
                                                                                        <Trash2 size={12} />
                                                                                    </button>
                                                                                </li>
                                                                            ))
                                                                        ) : (
                                                                            <li className="px-3 py-2 italic text-xs text-slate-500">
                                                                                {savedBoxes.length === 0
                                                                                    ? "No presets saved yet."
                                                                                    : "No matches found."}
                                                                            </li>
                                                                        )}
                                                                    </motion.ul>
                                                                )}
                                                            </AnimatePresence>
                                                        </div>
                                                    </div>

                                                    {/* 2. Quantity */}
                                                    <div className="col-span-6 sm:col-span-1">
                                                        <InputField
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
                                                            onBlur={() => markBoxFieldTouched(box.id, 'count')}
                                                            placeholder="1"
                                                            className="py-1.5 px-2 text-center"
                                                            error={boxFieldsTouched[box.id]?.count && (!box.count || box.count <= 0) ? "Required" : null}
                                                        />
                                                    </div>

                                                    {/* 3. DYNAMIC MIDDLE: Weight OR Dimensions */}
                                                    {shipmentType === "Heavy" ? (
                                                        /* --- HEAVY MODE: Single Weight Input --- */
                                                        <div className="col-span-6 sm:col-span-1">
                                                            <InputField
                                                                id={`weight-${index}`}
                                                                placeholder="Kg"
                                                                value={box.weight ?? ""}
                                                                onKeyDown={preventNonIntegerKeys}
                                                                onChange={(e) => {
                                                                    const next = sanitizeIntegerFromEvent(e.target.value);
                                                                    if (next === "") updateBox(index, "weight", undefined);
                                                                    else if (Number(next) <= MAX_WEIGHT)
                                                                        updateBox(index, "weight", Number(next));
                                                                }}
                                                                onBlur={() => markBoxFieldTouched(box.id, 'weight')}
                                                                className="py-1.5"
                                                                error={boxFieldsTouched[box.id]?.weight && (!box.weight || box.weight <= 0) ? "Required" : null}
                                                            />
                                                        </div>
                                                    ) : (
                                                        /* --- LIGHT MODE: Weight + L x W x H Inputs --- */
                                                        <>
                                                            {/* Weight Input for Light Mode (after Qty) */}
                                                            <div className="col-span-6 sm:col-span-1">
                                                                <InputField
                                                                    id={`weight-light-${index}`}
                                                                    placeholder="Kg"
                                                                    value={box.weight ?? ""}
                                                                    onKeyDown={preventNonIntegerKeys}
                                                                    onChange={(e) => {
                                                                        const next = sanitizeIntegerFromEvent(e.target.value);
                                                                        if (next === "") updateBox(index, "weight", undefined);
                                                                        else if (Number(next) <= MAX_WEIGHT)
                                                                            updateBox(index, "weight", Number(next));
                                                                    }}
                                                                    className="py-1.5 px-2 text-center"
                                                                />
                                                            </div>
                                                            {/* L, W, H as individual grid cells matching header col-span-1 */}
                                                            {(['length', 'width', 'height'] as const).map((dim) => (
                                                                <div key={dim} className="col-span-4 sm:col-auto">
                                                                    <InputField
                                                                        id={`${dim}-${index}`}
                                                                        placeholder={dim === 'length' ? 'L' : dim === 'width' ? 'W' : 'H'}
                                                                        value={box[dim as keyof BoxDetails] ?? ""}
                                                                        onKeyDown={preventNonIntegerKeys}
                                                                        onChange={(e) => {
                                                                            const next = sanitizeIntegerFromEvent(e.target.value);
                                                                            if (next === "") {
                                                                                updateBox(index, dim as keyof BoxDetails, undefined);
                                                                            } else {
                                                                                const maxVal = dim === 'length' ? MAX_DIMENSION_LENGTH : dim === 'width' ? MAX_DIMENSION_WIDTH : MAX_DIMENSION_HEIGHT;
                                                                                if (Number(next) <= maxVal) updateBox(index, dim as keyof BoxDetails, Number(next));
                                                                            }
                                                                        }}
                                                                        onBlur={() => markBoxFieldTouched(box.id, dim as any)}
                                                                        className="py-1.5 px-2 text-center placeholder:text-slate-400"
                                                                        error={
                                                                            boxFieldsTouched[box.id]?.[dim as 'length' | 'width' | 'height'] &&
                                                                                (!box[dim as keyof BoxDetails] || Number(box[dim as keyof BoxDetails]) <= 0)
                                                                                ? "!"
                                                                                : null
                                                                        }
                                                                    />
                                                                </div>
                                                            ))}
                                                        </>
                                                    )}

                                                    {/* 4. ACTIONS (Save + Trash) */}
                                                    <div className="col-span-12 sm:col-span-1 flex items-center gap-2 sm:mt-1.5">
                                                        {/* Actions - Subdued styling */}
                                                        <div className="flex items-center gap-1.5 justify-end">
                                                            {(() => {
                                                                const st = presetStatusByBoxId[box.id] || "idle";
                                                                return (
                                                                    <button
                                                                        onClick={() => saveBoxPresetInline(index)}
                                                                        className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors ${st === "saving"
                                                                            ? "text-slate-400 cursor-wait"
                                                                            : st === "success"
                                                                                ? "text-green-600"
                                                                                : st === "exists"
                                                                                    ? "text-amber-600"
                                                                                    : st === "error"
                                                                                        ? "text-red-600"
                                                                                        : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                                                            }`}
                                                                        disabled={st === "saving"}
                                                                        title="Save as preset"
                                                                    >
                                                                        {st === "saving" ? (
                                                                            <Loader2 size={12} className="animate-spin" />
                                                                        ) : st === "success" ? (
                                                                            <Check size={12} />
                                                                        ) : (
                                                                            <Save size={12} />
                                                                        )}
                                                                        <span className="hidden lg:inline">
                                                                            {st === "success" ? "Saved" : st === "exists" ? "Exists" : "Save"}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            })()}
                                                            <button
                                                                onClick={() => {
                                                                    if (boxes.length > 1) removeBox(index);
                                                                    else setBoxes([createNewBox()]);
                                                                }}
                                                                title={boxes.length > 1 ? "Remove" : "Clear"}
                                                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>

                                    {/* Error messages */}
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="inline-flex items-center gap-3 bg-red-100 text-red-800 font-semibold px-4 py-3 rounded-xl shadow-sm w-full"
                                        >
                                            <AlertCircle size={20} />
                                            {error}
                                        </motion.div>
                                    )}

                                    {/* Add Box Button + Download - Inside Card */}
                                    <div className="flex items-center justify-between mt-1">
                                        <button
                                            id="add-box-button"
                                            onClick={addBoxType}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                                        >
                                            <PlusCircle size={14} /> Add another box
                                        </button>
                                    {/* Add Box Button + Download - Inside Card */}
                                    <div className="flex items-center justify-between mt-1">
                                        <button
                                            id="add-box-button"
                                            onClick={addBoxType}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                                        >
                                            <PlusCircle size={14} /> Add another box
                                        </button>

                                        <button
                                            onClick={downloadPackingListAsExcel}
                                            disabled={boxes.length === 0 || !boxes.some(b => b.count && b.weight)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${boxes.length === 0 || !boxes.some(b => b.count && b.weight)
                                                ? 'text-slate-300 cursor-not-allowed bg-slate-50'
                                                : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                                                }`}
                                            title={boxes.length === 0 || !boxes.some(b => b.count && b.weight) ? "Add boxes with quantity and weight to download" : "Download packing list as Excel"}
                                        >
                                            <Download size={16} /> Download Packing List
                                        </button>
                                    </div>

                                        <button
                                            onClick={downloadPackingListAsExcel}
                                            disabled={boxes.length === 0 || !boxes.some(b => b.count && b.weight)}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${boxes.length === 0 || !boxes.some(b => b.count && b.weight)
                                                ? 'text-slate-300 cursor-not-allowed bg-slate-50'
                                                : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
                                                }`}
                                            title={boxes.length === 0 || !boxes.some(b => b.count && b.weight) ? "Add boxes with quantity and weight to download" : "Download packing list as Excel"}
                                        >
                                            <Download size={16} /> Download Packing List
                                        </button>
                                    </div>

                                </div>
                            </Card>
                        </div>
                        {/* END OF VERTICALLY STACKED SECTIONS */}

                        {/* Action Row - Calculate Button */}
                        <div className="flex flex-col items-center justify-center pt-2 px-1 gap-3">

                            <button
                                id="calculate-button"
                                type="button"
                                onClick={() => {
                                    // Auth gate: if not logged in, show sign-in modal
                                    if (!user) {
                                        setShowAuthModal(true);
                                        return;
                                    }
                                    saveRecentRoute();
                                    calculateQuotes();
                                }}
                                disabled={isCalculating}
                                className={`flex items-center gap-3 px-10 py-3.5 rounded-full text-base font-bold shadow-md transition-all ${isCalculating
                                    ? "bg-slate-100 text-slate-400 cursor-wait"
                                    : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-300 hover:shadow-lg active:transform active:scale-95"
                                    }`}
                            >
                                {isCalculating ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span>Calculating...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Calculate Freight Cost</span>
                                        <ChevronRight size={20} className="opacity-60" />
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Auth Gate Modal - Non-dismissable */}
                        <AnimatePresence>
                            {showAuthModal && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
                                >
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                        className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center relative"
                                    >
                                        {/* Close button */}
                                        <button
                                            onClick={() => setShowAuthModal(false)}
                                            className="absolute top-3 right-3 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                            aria-label="Close"
                                        >
                                            <XIcon size={20} />
                                        </button>

                                        {/* Icon */}
                                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
                                            <Package size={32} className="text-blue-600" />
                                        </div>

                                        <h3 className="text-xl font-bold text-slate-800 mb-2">
                                            Sign in to Continue
                                        </h3>
                                        <p className="text-sm text-slate-500 mb-6">
                                            Create an account or sign in to compare freight rates from multiple vendors instantly.
                                        </p>

                                        {/* CTA Buttons */}
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => {
                                                    setShowAuthModal(false);
                                                    navigate('/signin');
                                                }}
                                                className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                                            >
                                                Sign In
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowAuthModal(false);
                                                    navigate('/userselect');
                                                }}
                                                className="w-full py-3 px-6 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-colors border border-slate-200"
                                            >
                                                Get Started — Create Account
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Controls + Results - only shown to logged-in users */}
                        {user && (data || hiddendata) && (
                            <>
                                <Card className="p-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-base font-bold text-slate-800 mb-0.5 flex items-start">
                                                <Star size={18} className="mr-2 text-blue-600" /> Sort & Filter
                                            </h2>
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
                                                            !(isActualWeightSufficient ||
                                                                isVolumetricWeightSufficient)
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

                                                    // Apply all filters consistently to both tied-up and available vendors
                                                    // P1 FIX: Use getQuotePrice() for consistent price filtering (was: q.totalCharges ?? Infinity)
                                                    // ROLLBACK: Change getQuotePrice(q) back to (q.totalCharges ?? Infinity)
                                                    return (
                                                        getQuotePrice(q) <= maxPrice &&
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

                                            // 🎯 Special tied-up vendors for Uttam Goyal (forus@gmail.com)
                                            // ONLY these 4 vendors appear in "Your Tied-Up Vendors" section
                                            // All other vendors (including backend tied-up) go to "Our Available Vendors"
                                            // EXACT companyName values from DB:
                                            const SPECIAL_TIEDUP_VENDORS = [
                                                'Safexpress',
                                                'DTDC',
                                                'Delhivery (Shipshopy)',
                                                'TCI Freight'
                                            ];
                                            const customerEmail = getCustomer()?.email?.toLowerCase();
                                            const isUttamGoyal = customerEmail === 'forus@gmail.com';

                                            // Helper to check if vendor name matches special list (exact match, case-insensitive)
                                            const isSpecialTiedUpVendor = (q: any): boolean => {
                                                const name = (q.companyName || q.transporterName || '').trim();
                                                return SPECIAL_TIEDUP_VENDORS.some(v => v.toLowerCase() === name.toLowerCase());
                                            };

                                            // Combine all vendors from both sources for unified processing
                                            const allVendorsRaw = [...tiedUpVendorsRaw, ...otherVendorsRaw];

                                            let tiedUpVendorsFinal: typeof allVendorsRaw = [];
                                            let otherVendorsFinal: typeof allVendorsRaw = [];

                                            // Sorting comparator that respects the sortBy state
                                            const sortComparator = (a: any, b: any): number => {
                                                switch (sortBy) {
                                                    case "time":
                                                        if (a.isHidden && !b.isHidden) return 1;
                                                        if (!a.isHidden && b.isHidden) return -1;
                                                        return (a.estimatedTime ?? Infinity) - (b.estimatedTime ?? Infinity);
                                                    case "rating": {
                                                        const ratingA = (a?.transporterData?.rating ?? a?.rating ?? a?.transporterData?.ratingAverage ?? 0) as number;
                                                        const ratingB = (b?.transporterData?.rating ?? b?.rating ?? b?.transporterData?.ratingAverage ?? 0) as number;
                                                        return ratingB - ratingA;
                                                    }
                                                    case "price":
                                                    default:
                                                        return getQuotePrice(a) - getQuotePrice(b);
                                                }
                                            };

                                            if (isUttamGoyal) {
                                                // For Uttam Goyal: ONLY special 4 vendors in tied-up, ALL others in available
                                                tiedUpVendorsFinal = allVendorsRaw.filter(q => isSpecialTiedUpVendor(q));
                                                otherVendorsFinal = allVendorsRaw.filter(q => !isSpecialTiedUpVendor(q));

                                                // Re-sort after filtering to maintain correct order based on sortBy selection
                                                tiedUpVendorsFinal.sort(sortComparator);
                                                otherVendorsFinal.sort(sortComparator);
                                            } else {
                                                // For other users: use original backend categorization
                                                tiedUpVendorsFinal = tiedUpVendorsRaw;
                                                otherVendorsFinal = otherVendorsRaw;
                                            }

                                            // Deduplicate tied-up vendors
                                            const tiedUpVendors = tiedUpVendorsFinal.filter(q => {
                                                const key = vendorKey(q);
                                                if (!key) return true;
                                                if (seenVendors.has(key)) return false;
                                                seenVendors.add(key);
                                                return true;
                                            });

                                            // Deduplicate other vendors (don't re-sort - processQuotes already sorted)
                                            const otherVendors = otherVendorsFinal.filter(q => {
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

                                            // Detect if user vendors are only FTL/WheelsEye (i.e. no "real" tied-up vendors)
                                            const FTL_NAMES = ['LOCAL FTL', 'Wheelseye FTL', 'wheelseye', 'local ftl', 'ftl transporter', 'local-ftl'];
                                            const isFtlOrWheel = (q: any) => {
                                                const name = (q.companyName || q.transporterName || '').toLowerCase();
                                                return FTL_NAMES.some(f => name.includes(f.toLowerCase()));
                                            };
                                            const realTiedUpVendors = tiedUpVendors.filter(q => !isFtlOrWheel(q));
                                            const hasNoRealTiedUp = realTiedUpVendors.length === 0;

                                            // For "Our Vendors" — always include FTL/Wheelseye there
                                            const ftlFromTied = tiedUpVendors.filter(q => isFtlOrWheel(q));
                                            const combinedOtherVendors = [...ftlFromTied, ...otherVendors];

                                            // Helper: search nearest serviceable pincode
                                            const handleFindNearest = async () => {
                                                setIsSearchingNearest(true);
                                                try {
                                                    const customerId = getCustomer()?._id || getCustomer()?.id;
                                                    const res = await axios.get(`${API_BASE_URL}/api/utsf/nearest-serviceable`, {
                                                        params: { pincode: toPincode, fromPincode, customerId },
                                                        headers: { Authorization: `Bearer ${token}` }
                                                    });
                                                    if (res.data.success && res.data.nearestPincode) {
                                                        setNearestPincodeInfo(res.data);
                                                        setShowingNearestResults(true);
                                                        // Swap destination and recalculate
                                                        setToPincode(res.data.nearestPincode);
                                                        // Wait for state update, then calculate + scroll to results
                                                        setTimeout(async () => {
                                                            await calculateQuotes();
                                                            // Scroll to results after calculation completes
                                                            setTimeout(() => {
                                                                const target = document.getElementById("first-results") || document.getElementById("results");
                                                                target?.scrollIntoView({ behavior: "smooth", block: "start" });
                                                            }, 350);
                                                        }, 100);
                                                    } else {
                                                        toast.error(res.data.message || 'No serviceable pincode found nearby');
                                                    }
                                                } catch (err: any) {
                                                    console.error('[Nearest Pincode]', err);
                                                    toast.error('Failed to search for nearest pincode');
                                                } finally {
                                                    setIsSearchingNearest(false);
                                                }
                                            };

                                            return (
                                                <>
                                                    {/* Nearest Pincode Banner */}
                                                    {showingNearestResults && nearestPincodeInfo && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            className="mb-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3"
                                                        >
                                                            <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                                                                <Navigation size={20} className="text-amber-600" />
                                                            </div>
                                                            <div className="flex-grow">
                                                                <p className="text-sm font-semibold text-amber-900">
                                                                    Showing results for nearest serviceable pincode
                                                                </p>
                                                                <p className="text-xs text-amber-700 mt-0.5">
                                                                    <span className="font-bold text-amber-900">{nearestPincodeInfo.nearestPincode}</span>
                                                                    {' '}instead of{' '}
                                                                    <span className="line-through text-amber-500">{nearestPincodeInfo.originalPincode}</span>
                                                                    <span className="ml-2 text-amber-500">(±{nearestPincodeInfo.distance} away)</span>
                                                                </p>
                                                                {nearestPincodeInfo.servedBy.length > 0 && (
                                                                    <p className="text-[11px] text-amber-600 mt-1">
                                                                        Served by: {nearestPincodeInfo.servedBy.join(', ')}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={() => {
                                                                    setShowingNearestResults(false);
                                                                    setNearestPincodeInfo(null);
                                                                    setToPincode(nearestPincodeInfo.originalPincode);
                                                                    setTimeout(() => calculateQuotes(), 100);
                                                                }}
                                                                className="text-xs text-amber-700 hover:text-amber-900 underline flex-shrink-0"
                                                            >
                                                                Reset to original
                                                            </button>
                                                        </motion.div>
                                                    )}

                                                    {/* YOUR VENDORS SECTION */}
                                                    <section id="first-results">
                                                        <h2 className="text-2xl font-extrabold text-slate-900 mb-5 border-l-[6px] border-blue-600 pl-4 py-2 bg-blue-50/50 rounded-r-lg">
                                                            Your Vendors
                                                        </h2>

                                                        {realTiedUpVendors.length > 0 ? (
                                                            <div className="space-y-4">
                                                                {realTiedUpVendors.map((item, index) => (
                                                                    <VendorResultCard
                                                                        key={`tied-${index}`}
                                                                        quote={item}
                                                                        isBestValue={processedBestValueQuotes.includes(item)}
                                                                        isFastest={item === fastestQuote}
                                                                        vendorStatusMap={vendorStatusMap}
                                                                        onOpenRatingModal={openRatingModal}
                                                                    />
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            /* EMPTY STATE: No user vendors serve this pincode */
                                                            <motion.div
                                                                initial={{ opacity: 0, y: 10 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                className="bg-gradient-to-br from-slate-50 to-blue-50/30 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center"
                                                            >
                                                                <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                                                    <MapPin size={28} className="text-blue-500" />
                                                                </div>
                                                                <h3 className="text-lg font-bold text-slate-800">
                                                                    None of your vendors serve pincode <span className="text-blue-600 font-mono">{toPincode}</span>
                                                                </h3>
                                                                <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
                                                                    Your added vendors don't have coverage for this destination.
                                                                    You can add a vendor that serves this area, or check if a nearby pincode is covered.
                                                                </p>

                                                                <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
                                                                    <button
                                                                        onClick={handleFindNearest}
                                                                        disabled={isSearchingNearest}
                                                                        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${isSearchingNearest
                                                                            ? 'bg-slate-100 text-slate-400 cursor-wait'
                                                                            : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95'
                                                                            }`}
                                                                    >
                                                                        {isSearchingNearest ? (
                                                                            <><Loader2 size={16} className="animate-spin" /> Searching...</>
                                                                        ) : (
                                                                            <><Navigation size={16} /> Find nearest serviceable pincode</>
                                                                        )}
                                                                    </button>

                                                                    <Link
                                                                        to="/my-vendors"
                                                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                                                                    >
                                                                        <PlusCircle size={16} /> Add a vendor
                                                                    </Link>
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </section>

                                                    {/* OUR VENDORS SECTION */}
                                                    {combinedOtherVendors.length > 0 && (() => {
                                                        const isSubscribed = getCustomer()?.isSubscribed;
                                                        return (
                                                            <section>
                                                                <h2 className="text-2xl font-extrabold text-slate-900 mb-5 border-l-[6px] border-slate-500 pl-4 py-2 bg-slate-50/50 rounded-r-lg">
                                                                    Our Vendors
                                                                </h2>

                                                                <div className="space-y-4">
                                                                    {combinedOtherVendors.map((item, index) => (
                                                                        <VendorResultCard
                                                                            key={`other-${index}`}
                                                                            quote={{ ...item, isHidden: !isSubscribed || (item as any).isHidden }}
                                                                            isBestValue={processedBestValueQuotes.includes(item)}
                                                                            isFastest={item === fastestQuote}
                                                                            vendorStatusMap={vendorStatusMap}
                                                                            onOpenRatingModal={openRatingModal}
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

                                                    {realTiedUpVendors.length === 0 && combinedOtherVendors.length === 0 && (
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

                                                            <button
                                                                onClick={handleFindNearest}
                                                                disabled={isSearchingNearest}
                                                                className={`mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${isSearchingNearest
                                                                    ? 'bg-slate-100 text-slate-400 cursor-wait'
                                                                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95'
                                                                    }`}
                                                            >
                                                                {isSearchingNearest ? (
                                                                    <><Loader2 size={16} className="animate-spin" /> Searching...</>
                                                                ) : (
                                                                    <><Navigation size={16} /> Find nearest serviceable pincode</>
                                                                )}
                                                            </button>
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

                    {/* RIGHT COLUMN (30%) - Summary Panel */}
                    <div className="hidden lg:flex flex-col sticky top-4 gap-3">
                        {/* Pincode Coverage */}
                        <CoverageCounter />

                        {/* Shipment Summary - Always shows data */}
                        <div className="bg-white rounded-lg border border-slate-200">
                            <div className="px-3 py-2 border-b border-slate-100">
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Summary</span>
                            </div>

                            <div className="p-3 space-y-3">
                                {/* Key Metrics - Progressive Disclosure */}
                                {totalWeight > 0 ? (
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                                            <div className="text-2xl font-extrabold text-slate-800 tabular-nums tracking-tight">
                                                {totalWeight.toLocaleString('en-IN')}
                                            </div>
                                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Total kg</div>
                                        </div>
                                        <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                                            <div className="text-2xl font-extrabold text-slate-800 tabular-nums tracking-tight">
                                                {totalBoxes.toLocaleString('en-IN')}
                                            </div>
                                            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">Boxes</div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="py-8 text-center border-2 border-dashed border-slate-100 rounded-lg mb-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-2 text-slate-300">
                                            <Package size={14} />
                                        </div>
                                        <p className="text-xs font-medium text-slate-400">Add boxes to see totals</p>
                                    </div>
                                )}

                                {/* Route Info */}
                                <div className="text-xs space-y-1.5">
                                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                        <span className="text-slate-500">Mode</span>
                                        <span className="font-medium text-slate-700">{modeOfTransport}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                        <span className="text-slate-500">Origin</span>
                                        <span className="font-medium text-slate-700 font-mono">{fromPincode || '—'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                                        <span className="text-slate-500">Destination</span>
                                        <span className="font-medium text-slate-700 font-mono">{toPincode || '—'}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1">
                                        <span className="text-slate-500">Shipment type</span>
                                        <span className="font-medium text-slate-700">{shipmentType}</span>
                                    </div>
                                </div>

                                {/* Box Types List - Only if boxes have data */}
                                {boxes.some(b => b.count && b.count > 0) && (
                                    <div className="pt-2 border-t border-slate-100">
                                        <div className="text-[10px] font-medium text-slate-500 mb-1.5">Box types</div>
                                        <div className="space-y-1 max-h-32 overflow-y-auto">
                                            {boxes.filter(b => b.count && b.count > 0).map((box, index) => (
                                                <div key={box.id} className="flex justify-between items-center text-[11px] text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                    <div className="flex items-center gap-1.5 overflow-hidden">
                                                        <span className="font-semibold text-slate-400 bg-white border border-slate-200 rounded px-1 min-w-[1.5rem] text-center">{box.count}x</span>
                                                        <span className="truncate max-w-[120px]">{box.description || `Box ${index + 1}`}</span>
                                                    </div>
                                                    <span className="text-slate-400 font-mono tracking-tight shrink-0">
                                                        {shipmentType === "Heavy"
                                                            ? `${box.weight}kg`
                                                            : `${box.length}x${box.width}x${box.height}`}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Network Coverage Map - Visual Confirmation */}
                        <NetworkCoverageMap fromPincode={fromPincode} toPincode={toPincode} />
                    </div>
                </div>
            </div >



            {/* Single Rating Modal at Page Level - prevents multiple instances and z-index/overflow issues */}
            < RatingFormModal
                isOpen={ratingModalState.isOpen}
                onClose={closeRatingModal}
                vendorId={ratingModalState.vendorId}
                vendorName={ratingModalState.vendorName}
                isTemporaryVendor={ratingModalState.isTemporaryVendor}
                vendorType={ratingModalState.vendorType}
                onRatingSubmitted={(newRating, vendorRatings) => {
                    if (ratingModalState.onRatingSubmitted) {
                        ratingModalState.onRatingSubmitted(newRating, vendorRatings);
                    }
                }}
            />
        </div >
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
            className="fixed inset-0 z-[9999] bg-black/30 flex items-center justify-center"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-96 bg-white rounded-xl shadow-2xl border border-slate-200 p-6 space-y-5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-2">
                    <h3 className="text-lg font-bold text-slate-800">Fine-Tune Filters</h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        ✕
                    </button>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <label htmlFor="maxPrice" className="font-semibold text-slate-700">
                            Max Price
                        </label>
                        <span className="font-bold text-blue-600">₹ {formatPrice(filters.maxPrice)}</span>
                    </div>
                    <input
                        id="maxPrice"
                        type="range"
                        min={1000}
                        max={10000000}
                        step={1000}
                        value={filters.maxPrice}
                        onChange={(e) => onFilterChange.setMaxPrice(e.currentTarget.valueAsNumber)}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <label htmlFor="maxTime" className="font-semibold text-slate-700">
                            Max Delivery Time
                        </label>
                        <span className="font-bold text-blue-600">{formatTime(filters.maxTime)}</span>
                    </div>
                    <input
                        id="maxTime"
                        type="range"
                        min={1}
                        max={300}
                        step={1}
                        value={filters.maxTime}
                        onChange={(e) => onFilterChange.setMaxTime(e.currentTarget.valueAsNumber)}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <label htmlFor="minRating" className="font-semibold text-slate-700">
                            Min Vendor Rating
                        </label>
                        <span className="font-bold text-blue-600">{filters.minRating.toFixed(1)} / 5.0</span>
                    </div>
                    <input
                        id="minRating"
                        type="range"
                        min={0}
                        max={5}
                        step={0.1}
                        value={filters.minRating}
                        onChange={(e) => onFilterChange.setMinRating(e.currentTarget.valueAsNumber)}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>

                <div className="flex justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
        // NOTE: Minimum Charges removed from display - it's a floor constraint (effectiveBaseFreight = MAX(baseFreight, minCharges)), not an additive fee
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
                            <span className="font-semibold text-blue-900">
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
                            <h5 className="text-amber-950 font-bold text-lg mb-3 flex items-center gap-2">
                                🚛 Vehicle Details
                            </h5>

                            {vehicleBreakdown && vehicleBreakdown.length > 0 ? (
                                <div className="space-y-3">
                                    {/* Summary */}
                                    <div className="flex items-center gap-2 text-amber-900 font-semibold">
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
                                                {quote.companyName === "LOCAL FTL" && (
                                                    <tr>
                                                        <td colSpan={6} className="py-1 px-2 text-right">
                                                            <span className="text-xs text-slate-500 italic">
                                                                * Local Charges: 20%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )}
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
    statusMap: Record<string, { approvalStatus: 'pending' | 'approved' | 'rejected'; isVerified: boolean }> = {}
): VerificationStatus => {
    // Check by company name first
    const companyName = (quote.companyName || '').trim().toLowerCase();

    // Removed forced override - verification status now comes purely from database

    // Special vendors (client-side injected) are always verified
    if (quote.isSpecialVendor) {
        return 'verified';
    }

    // Check by company name (fallback for special vendors)
    if (companyName === 'local ftl' || companyName === 'wheelseye ftl') {
        return 'verified';
    }

    // ✨ PRIORITY 1: Check real-time status map first (updated every 30s via polling)
    // This ensures verification changes reflect immediately across pages
    const realtimeStatus = statusMap[companyName];
    if (realtimeStatus) {
        // isVerified === true means admin explicitly marked as verified
        if (realtimeStatus.isVerified === true) {
            return 'verified';
        }
        // If approved but not explicitly verified -> unverified
        if (realtimeStatus.approvalStatus === 'approved') {
            return 'unverified';
        }
        // pending/rejected -> unverified
        if (realtimeStatus.approvalStatus === 'pending' || realtimeStatus.approvalStatus === 'rejected') {
            return 'unverified';
        }
    }

    // PRIORITY 2: Fallback to quote data (from initial calculation)
    // isVerified === true means admin explicitly marked as verified
    if (quote.isVerified === true) {
        return 'verified';
    }

    // If approved but not explicitly verified -> unverified
    if (quote.approvalStatus === 'approved') {
        return 'unverified';
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
    onOpenRatingModal,
}: {
    quote: any;
    isBestValue?: boolean;
    isFastest?: boolean;
    vendorStatusMap: Record<string, { approvalStatus: 'pending' | 'approved' | 'rejected'; isVerified: boolean }>;
    onOpenRatingModal: (config: {
        vendorId: string;
        vendorName: string;
        isTemporaryVendor: boolean;
        vendorType?: VendorType;
        onRatingSubmitted?: (newRating: number, vendorRatings: {
            priceSupport: number;
            deliveryTime: number;
            tracking: number;
            salesSupport: number;
            damageLoss: number;
        }) => void;
    }) => void;
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [currentRating, setCurrentRating] = useState<number>(
        quote.rating ?? quote.transporterData?.rating ?? 4
    );
    // Local state for vendor ratings breakdown (updated after user submits a rating)
    const [currentVendorRatings, setCurrentVendorRatings] = useState<{
        priceSupport: number;
        deliveryTime: number;
        tracking: number;
        salesSupport: number;
        damageLoss: number;
    } | undefined>(quote.vendorRatings || quote.transporterData?.vendorRatings);
    const [totalRatings, setTotalRatings] = useState<number>(quote.totalRatings || 0);

    // Sync rating state with quote prop when new data comes from API (after Calculate button)
    // Without this, useState only initializes once and ignores updated quote data
    useEffect(() => {
        setCurrentRating(quote.rating ?? quote.transporterData?.rating ?? 4);
        setCurrentVendorRatings(quote.vendorRatings || quote.transporterData?.vendorRatings);
        setTotalRatings(quote.totalRatings || 0);
    }, [quote.rating, quote.transporterData?.rating, quote.vendorRatings, quote.transporterData?.vendorRatings, quote.totalRatings]);

    const { user } = useAuth();
    const navigate = useNavigate();

    // Helper to safely get customer data regardless of user object structure
    const getCustomerData = () => {
        if (!user) return null;
        const u = user as any;
        return u.customer || u;
    };

    // Owner check: only 'Uttam Goyal' sees full vendor details
    const customerData = getCustomerData();
    const isOwner = (customerData?.name || '').toLowerCase().trim() === 'uttam goyal';

    // --- Subscription logic commented out per requirement ---
    // const isSubscribed = Boolean(getCustomerData()?.isSubscribed);
    const isSubscribed = true; // Treat everyone as subscribed for now
    const isSpecialVendor =
        quote.companyName === "LOCAL FTL" || quote.companyName === "Wheelseye FTL";

    // Detect test/dummy vendors - these get white background instead of yellow
    const isTestVendor = /^(TESTER|DUMMY|testvendor|Vellore Institute)/i.test(quote.companyName || "");

    // Debug: Check if this is a temporary transporter
    console.log(`[VendorCard] ${quote.companyName}: isTemporaryTransporter=${quote.isTemporaryTransporter}, selectedZones=${quote.selectedZones?.length || 0}, priceChart=${JSON.stringify(quote.priceChart)}`);

    const cardPrice = getQuotePrice(quote);
    if (!Number.isFinite(cardPrice) || cardPrice <= 0) return null;

    // Dynamic CTA label + click logic
    // --- Subscription CTA logic commented out ---
    // const ctaLabel = isSubscribed ? "Contact Now" : "Subscribe to Get Details";
    const ctaLabel = isOwner ? "Contact Now" : "View Details";
    const handleCtaClick = () => {
        // Non-owner users get "Coming Soon" popup
        if (!isOwner) {
            toast('🚀 Coming Soon! Contact details will be available shortly.', { duration: 2500 });
            return;
        }

        // Owner flow (Uttam Goyal)
        // Debug: Log the entire quote object to see its structure
        console.log("=== QUOTE DATA DEBUG ===");
        console.log("Full quote object:", quote);
        console.log("companyName:", quote.companyName);
        console.log("companyId:", quote.companyId);
        console.log("isTemporaryTransporter:", quote.isTemporaryTransporter);
        console.log("isTiedUp:", quote.isTiedUp);

        const companyName = quote.companyName || quote.transporterName;

        // SPECIAL VENDORS: Wheelseye FTL and LOCAL FTL
        if (companyName === "Wheelseye FTL" || companyName === "LOCAL FTL") {
            console.log("Special vendor detected:", companyName);
            navigate(`/vendor/special`, {
                state: {
                    quoteData: quote,
                    isSpecialVendor: true,
                    vendorInfo: {
                        companyName: companyName,
                        vendorPhoneNumber: companyName === "Wheelseye FTL"
                            ? "+91 9876543210"
                            : "+91 8800123456",
                        vendorEmail: companyName === "Wheelseye FTL"
                            ? "support@wheelseye.com"
                            : "ftl@freightcompare.ai",
                        contactPerson: companyName === "Wheelseye FTL"
                            ? "Wheelseye Support"
                            : "FreightCompare FTL Team",
                        description: companyName === "Wheelseye FTL"
                            ? "Our trusted FTL partner for pan-India full truck load services"
                            : "Local FTL services with competitive pricing",
                        rating: 4.6,
                        approvalStatus: "approved",
                    }
                }
            });
            return;
        }

        const transporterId = quote.companyId || quote.transporterData?._id || quote.transporterID || quote._id;
        const isTemporaryVendor = quote.isTiedUp === true;

        if (!transporterId) {
            console.error("No transporter ID found in quote:", quote);
            alert("Sorry, the transporter details could not be retrieved.");
            return;
        }

        if (companyName) {
            console.log("Navigating with companyName:", companyName, "and ID:", transporterId);
            if (isTemporaryVendor) {
                navigate(`/vendor/${transporterId}`, {
                    state: { quoteData: quote }
                });
            } else {
                navigate(`/transporter/${transporterId}`, {
                    state: { quoteData: quote }
                });
            }
        } else {
            console.error("Company name missing. Quote data:", quote);
            alert("Sorry, the transporter details could not be retrieved.");
        }
    };

    // --- Hidden card subscription logic commented out ---
    // if (quote.isHidden && !isSubscribed) { ... }
    // All cards now show normally; vendor names are blurred for non-owners instead

    // Check if this is Wheelseye FTL for the partner ribbon
    const isWheelseyePartner = quote.companyName === "Wheelseye FTL";

    // Normal (visible) card - ALL vendors get yellow styling
    return (
        <div
            className={`relative p-5 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 shadow-lg overflow-hidden ${isSpecialVendor ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-slate-200'}`}
        >
            {/* Curvy Diagonal Ribbon for Wheelseye FTL Partner */}
            {isWheelseyePartner && (
                <div
                    className="absolute -right-12 top-5 z-10 pointer-events-none"
                    style={{
                        transform: 'rotate(45deg)',
                    }}
                >
                    {/* Curvy ribbon with wave effect */}
                    <div className="relative">
                        {/* Main ribbon body */}
                        <div
                            className="px-10 py-1.5 text-white text-xs font-bold tracking-wide shadow-lg"
                            style={{
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a855f7 100%)',
                                clipPath: 'polygon(0% 20%, 5% 0%, 95% 0%, 100% 20%, 100% 80%, 95% 100%, 5% 100%, 0% 80%)',
                            }}
                        >
                            OUR PARTNER
                        </div>
                        {/* Left fold shadow */}
                        <div
                            className="absolute -left-2 top-1/2 -translate-y-1/2 w-2 h-4"
                            style={{
                                background: 'linear-gradient(to right, transparent, rgba(99, 102, 241, 0.4))',
                                transform: 'translateY(-50%) skewY(-15deg)',
                            }}
                        />
                        {/* Right fold shadow */}
                        <div
                            className="absolute -right-2 top-1/2 -translate-y-1/2 w-2 h-4"
                            style={{
                                background: 'linear-gradient(to left, transparent, rgba(168, 85, 247, 0.4))',
                                transform: 'translateY(-50%) skewY(15deg)',
                            }}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 items-center gap-3 lg:gap-4">
                {/* Vendor + badges */}
                <div className="md:col-span-5">
                    <div className="flex items-center flex-wrap gap-2">
                        <h3 className="font-bold text-lg text-slate-800 truncate max-w-[200px]">
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

                        {/* Internal Rating - show for all vendors including special vendors */}
                        <span className="inline-flex items-center gap-1 text-sm text-slate-600">
                            <span>Rating:</span>
                            <strong className="text-slate-800">
                                {currentRating.toFixed(1)}
                            </strong>
                            <span className="text-yellow-500">★</span>
                            {/* Rating Info Icon with Tooltip */}
                            <RatingBreakdownTooltip
                                vendorRatings={currentVendorRatings}
                                totalRatings={totalRatings}
                                overallRating={currentRating}
                                vendorId={isSpecialVendor
                                    ? (quote.transporterData?._id || getSpecialVendorIdByName(quote.companyName))
                                    : (quote.companyId || quote.transporterData?._id || quote._id)}
                                isTemporaryVendor={quote.isTiedUp === true || quote.isTemporaryTransporter === true}
                                vendorType={isSpecialVendor ? "special" : (quote.isTiedUp === true || quote.isTemporaryTransporter === true ? "temporary" : "regular")}
                            />
                        </span>

                        {/* Rate Button - show for all vendors including special vendors (partner styling for special vendors) */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                // Determine the correct vendorId for rating
                                const vendorIdForRating = isSpecialVendor
                                    ? (quote.transporterData?._id || getSpecialVendorIdByName(quote.companyName))
                                    : (quote.companyId || quote.transporterData?._id || quote._id);

                                // Determine vendorType
                                const vendorTypeForRating: VendorType = isSpecialVendor
                                    ? "special"
                                    : (quote.isTiedUp === true || quote.isTemporaryTransporter === true ? "temporary" : "regular");

                                onOpenRatingModal({
                                    vendorId: vendorIdForRating,
                                    vendorName: quote.companyName,
                                    isTemporaryVendor: quote.isTiedUp === true || quote.isTemporaryTransporter === true || isSpecialVendor,
                                    vendorType: vendorTypeForRating,
                                    onRatingSubmitted: (newRating, vendorRatings) => {
                                        setCurrentRating(newRating);
                                        setCurrentVendorRatings(vendorRatings);
                                        setTotalRatings(prev => prev + 1);
                                    },
                                });
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full transition-colors border ${isSpecialVendor
                                ? "text-amber-700 hover:text-amber-900 hover:bg-amber-100 border-amber-300 hover:border-amber-400"
                                : "text-blue-600 hover:text-blue-800 hover:bg-blue-50 border-blue-200 hover:border-blue-300"
                                }`}
                            title="Rate this vendor"
                        >
                            <Star size={12} />
                            <span>Rate</span>
                        </button>
                    </div>
                </div>

                {/* ETA */}
                <div className="md:col-span-2 text-center md:text-left min-w-0">
                    <div className="flex items-center justify-center md:justify-start gap-2 font-semibold text-slate-700 text-base lg:text-lg">
                        <Clock size={16} className="text-slate-500 flex-shrink-0" />
                        <span className="whitespace-nowrap">
                            {Math.ceil(quote.estimatedTime ?? 1)}{" "}
                            {Math.ceil(quote.estimatedTime ?? 1) === 1 ? "Day" : "Days"}
                        </span>
                    </div>
                    <div className="text-xs text-slate-500 -mt-1 truncate">Estimated Delivery</div>
                </div>

                {/* Price and CTA - now in same flex container, right-aligned */}
                <div className="md:col-span-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-end min-w-0" style={{ gap: 'clamp(0.5rem, 1vw, 0.75rem)' }}>
                    {/* Price (always visible) */}
                    <div className="text-right min-w-0 flex-shrink-0">
                        <div className="flex items-center justify-end gap-1 font-bold text-slate-900 min-w-0">
                            <IndianRupee size={18} className="text-slate-600 flex-shrink-0" />
                            <span
                                className="truncate"
                                style={{
                                    maxWidth: 'clamp(120px, 12vw, 200px)',
                                    fontSize: formatINR0(cardPrice).length > 7 ? 'clamp(1.25rem, 2vw, 1.5rem)' : 'clamp(1.5rem, 2.5vw, 1.875rem)'
                                }}
                                title={`₹${formatINR0(cardPrice)}`}
                            >
                                {formatINR0(cardPrice)}
                            </span>
                        </div>

                        <button
                            onClick={() => setIsExpanded((v) => !v)}
                            className="mt-1 inline-flex items-center gap-0.5 text-blue-600 font-semibold hover:text-blue-800 transition-colors whitespace-nowrap"
                            style={{ fontSize: 'clamp(0.7rem, 1.2vw, 0.875rem)' }}
                        >
                            <span className="hidden md:inline">{isExpanded ? "Hide" : "Breakup"}</span>
                            <span className="md:hidden">{isExpanded ? "Hide" : "Price"}</span>
                            <ChevronRight
                                size={12}
                                className={`transition-transform duration-300 ${isExpanded ? "rotate-90" : "rotate-0"
                                    }`}
                            />
                        </button>
                    </div>

                    {/* CTA Button */}
                    <button
                        onClick={handleCtaClick}
                        className="bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors whitespace-nowrap flex-shrink-0"
                        style={{
                            padding: 'clamp(0.5rem, 1vw, 0.625rem) clamp(0.875rem, 2vw, 1.25rem)',
                            fontSize: 'clamp(0.8rem, 1.3vw, 1rem)'
                        }}
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