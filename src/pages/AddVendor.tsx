// src/pages/AddVendor.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import { persistDraft } from '../store/draftStore';
// Hooks (keep your originals)
import { useVendorAutofill } from '../hooks/useVendorAutofill';

import { useVendorBasics } from '../hooks/useVendorBasics';
import { usePincodeLookup } from '../hooks/usePincodeLookup';
import { useVolumetric } from '../hooks/useVolumetric';
import { useCharges } from '../hooks/useCharges';

// ✅ Wizard storage hook
import { useWizardStorage } from '../hooks/useWizardStorage';

// Components (keep your originals)
import { CompanySection } from '../components/CompanySection';
import { TransportSection } from '../components/TransportSection';
import { ChargesSection } from '../components/ChargesSection';
import { PriceChartUpload } from '../components/PriceChartUpload';
import { SavedVendorsTable } from '../components/SavedVendorsTable';
import ZoneMappingUpload from '../components/ZoneMappingUpload';
import { VendorRating, calculateOverallRating } from '../components/VendorRating';
import ZoneSelectionWizard from '../components/ZoneSelectionWizard';
import ServiceabilityUpload from '../components/ServiceabilityUpload';
import type { ServiceabilityEntry, ZoneSummary } from '../components/ServiceabilityUpload';

// Utils (unchanged)
import { readDraft, clearDraft } from '../store/draftStore';
import { emitDebug, emitDebugError } from '../utils/debug';

// New numeric helpers
import { sanitizeDigitsOnly, clampNumericString } from '../utils/inputs';
import { validateGST } from '../utils/validators';

// Wizard validation utilities
import {
  validateWizardData,
  getWizardStatus,
  type ValidationResult,
  type WizardStatus,
} from '../utils/wizardValidation';


// Icons
import { CheckCircleIcon, XCircleIcon, AlertTriangle, RefreshCw, FileText, EyeIcon } from 'lucide-react';

// Optional email validator
import isEmail from 'isemail';

// ScrollToTop helper (smooth scroll to ref when `when` changes)
import ScrollToTop from '../components/ScrollToTop'; // adjust path if needed

import { debounce } from 'lodash';
import {
  Search,
  Building2,
  Loader2,
  ChevronDown,
  CheckCircle2,
  MapPin,
  Tag,
  FileSpreadsheet,
  Upload,
  Sparkles,
  Download,
  Eye,
  UploadCloud
} from 'lucide-react';

// UTSF encoder
import { generateUTSF, downloadUTSF, validateUTSF } from '../services/utsfEncoder';
// ============================================================================
// CONFIG / HELPERS
// ============================================================================

// ---------------- CHARGES NORMALIZATION HELPERS ----------------

/**
 * Generic parser for a single charge group with mode:
 * group = { mode: 'FIXED' | 'VARIABLE', fixed, fixedAmount, variable, variablePercent, unit, ... }
 * Returns exactly one of (fixed, variable) as non-zero based on mode, plus the unit.
 */
function normalizeChargeGroup(group: any): { fixed: number; variable: number; unit?: string } {
  if (!group) return { fixed: 0, variable: 0 };

  const rawMode =
    (group.mode ||
      group.chargeMode ||     // adjust if you use different key
      '').toString().toUpperCase();

  const fixedRaw =
    group.fixedAmount ??
    group.fixedRate ??
    group.fixed ??
    group.amount ??
    0;

  const variableRaw =
    group.variableRange ??
    group.variablePct ??
    group.variablePercent ??
    group.variable ??
    0;

  const fixed = Number(fixedRaw) || 0;
  const variable = Number(variableRaw) || 0;
  const unit = group.unit || 'per kg'; // Default to 'per kg' if not specified

  if (rawMode === 'FIXED') {
    return { fixed, variable: 0, unit };
  }
  if (rawMode === 'VARIABLE') {
    return { fixed: 0, variable, unit };
  }

  // Fallback: if mode is missing, send both as-is (you can tighten this later)
  return { fixed, variable, unit };
}

/**
 * Read a simple numeric charge from charges root, with multiple key options.
 * You will adjust key names here ONCE if your hook uses different ones.
 */
function readSimpleCharge(root: any, ...keys: string[]): number {
  if (!root) return 0;
  for (const key of keys) {
    if (root[key] !== undefined && root[key] !== null && root[key] !== '') {
      const num = Number(root[key]);
      if (!Number.isNaN(num)) return num;
    }
  }
  return 0;
}



// Use centralized API configuration
import { API_BASE_URL } from '../config/api';
const API_BASE = API_BASE_URL;

const ZPM_KEY = 'zonePriceMatrixData';

type PriceMatrix = Record<string, Record<string, number>>;
type ZonePriceMatrixLS = {
  zones: unknown[];
  priceMatrix: PriceMatrix;
  timestamp: string;
};
interface VendorSuggestion {
  id: string;
  displayName: string;
  companyName: string;
  legalCompanyName: string;
  vendorCode: string;
  vendorPhone: number | string;
  vendorEmail: string;
  contactPersonName: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  gstNo: string;
  subVendor: string;
  address: string;
  state: string;
  city: string;
  pincode: string | number;
  transportMode: string;
  rating: number;
  zones: string[];
  zoneMatrixStructure: Record<string, Record<string, string>>;
  volumetricUnit: string;
  divisor: number;
  cftFactor: number | null;
}
function getAuthToken(): string {
  return (
    Cookies.get('authToken') ||
    localStorage.getItem('authToken') ||
    localStorage.getItem('token') ||
    ''
  );
}

function base64UrlToJson<T = any>(b64url: string): T | null {
  try {
    const b64 = b64url
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(b64url.length / 4) * 4, '=');
    const json = atob(b64);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function getCustomerIDFromToken(): string {
  const token = getAuthToken();
  if (!token || token.split('.').length < 2) return '';
  const payload = base64UrlToJson<Record<string, any>>(token.split('.')[1]) || {};
  const id =
    payload?.customer?._id ||
    payload?.user?._id ||
    payload?._id ||
    payload?.id ||
    payload?.customerId ||
    payload?.customerID ||
    '';
  return id || '';
}

/** Capitalize every word (auto-capitalize) */
function capitalizeWords(s: string): string {
  return s
    .split(/\s+/)
    .map((w) => (w.length ? w[0].toUpperCase() + w.slice(1) : ''))
    .join(' ')
    .trim();
}

/** GSTIN regex (standard government format) */
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;

/** Simple email fallback regex */
const EMAIL_FALLBACK_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Safe getters */
function safeGetField(obj: any, ...keys: string[]): string {
  if (!obj) return '';
  for (const key of keys) {
    const val = obj[key];
    if (val !== undefined && val !== null) {
      return String(val);
    }
  }
  return '';
}
function safeGetNumber(obj: any, defaultVal: number, ...keys: string[]): number {
  if (!obj) return defaultVal;
  for (const key of keys) {
    const val = obj[key];
    if (val !== undefined && val !== null) {
      const num = Number(val);
      if (!isNaN(num)) return num;
    }
  }
  return defaultVal;
}

/** LocalStorage loader (legacy - for backwards compatibility) */
function safeLoadZPM(): ZonePriceMatrixLS | null {
  try {
    const raw = localStorage.getItem(ZPM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.priceMatrix && typeof parsed.priceMatrix === 'object') return parsed;
    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const AddVendor: React.FC = () => {
  // Hooks (manage sub-section state/UI)
  const vendorBasics = useVendorBasics();
  const pincodeLookup = usePincodeLookup();
  const volumetric = useVolumetric();
  const charges = useCharges();

  // Wizard storage hook
  const { wizardData, isLoaded: wizardLoaded, clearWizard, setWizardData } = useWizardStorage();

  // Page-level state
  const [transportMode, setTransportMode] = useState<'road' | 'air' | 'rail' | 'ship'>('road');
  const [priceChartFile, setPriceChartFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // UTSF generation mode state
  const [outputMode, setOutputMode] = useState<'cloud' | 'cloud+utsf' | 'utsf'>('cloud');
  const [showUtsfPreview, setShowUtsfPreview] = useState(false);
  const [utsfData, setUtsfData] = useState<any>(null);

  // Overlay + ScrollToTop state (ADDED)
  const [showSubmitOverlay, setShowSubmitOverlay] = useState(false);
  const [submitOverlayStage, setSubmitOverlayStage] =
    useState<'loading' | 'success'>('loading');
  // 👉 for ScrollToTop
  const topRef = useRef<HTMLDivElement | null>(null);
  const [scrollKey, setScrollKey] = useState<number | string>(0);

  // Invoice Value State (New)
  const [invoicePercentage, setInvoicePercentage] = useState<string>('');
  const [invoiceMinAmount, setInvoiceMinAmount] = useState<string>('');
  const [invoiceUseMax, setInvoiceUseMax] = useState<boolean>(false);
  const [invoiceManualOverride, setInvoiceManualOverride] = useState<boolean>(false);
  const [showInvoiceSection, setShowInvoiceSection] = useState<boolean>(false);

  // Zone Price Matrix (from wizard/localStorage)
  const [zpm, setZpm] = useState<ZonePriceMatrixLS | null>(null);

  // Zone configuration mode: 'wizard', 'upload', 'auto', or 'pincode' (new pincode-authoritative mode)
  const [zoneConfigMode, setZoneConfigMode] = useState<'wizard' | 'upload' | 'auto' | 'pincode'>('pincode');

  // NEW: Pincode-authoritative serviceability state
  const [serviceabilityData, setServiceabilityData] = useState<{
    serviceability: ServiceabilityEntry[];
    zoneSummary: ZoneSummary[];
    checksum: string;
    source: 'excel' | 'manual' | 'cloned';
  } | null>(null);

  // Wizard validation state
  const [wizardValidation, setWizardValidation] = useState<ValidationResult | null>(null);
  const [wizardStatus, setWizardStatus] = useState<WizardStatus | null>(null);

  const navigate = useNavigate();
  // ============================================================================
  // VENDOR AUTOCOMPLETE STATE
  // ============================================================================
  const [suggestions, setSuggestions] = useState<VendorSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [autoFilledFromName, setAutoFilledFromName] = useState<string | null>(null);
  const [autoFilledFromId, setAutoFilledFromId] = useState<string | null>(null);
  const [legalCompanyNameInput, setLegalCompanyNameInput] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ----------------------------------------------------------------------------
  // Initialize vendor autofill helper (drop this after your hooks/state are defined)
  // ----------------------------------------------------------------------------
  const { applyVendorAutofill } = useVendorAutofill({
    vendorBasics,
    pincodeLookup,
    volumetric,
    charges,                     // NEW: pass charges hook for autofill
    setWizardData,               // from useWizardStorage()
    setZpm,                      // state setter for zpm: const [zpm, setZpm] = useState(...)
    setIsAutoFilled,             // state setter already defined in file
    setAutoFilledFromName,       // state setter already defined in file
    setAutoFilledFromId,         // state setter already defined in file
    setWizardValidation,         // state setter already defined in file
    setWizardStatus,             // state setter already defined in file
    validateWizardData,          // imported utility function
    getWizardStatus,             // imported utility function
    setServiceabilityData,       // ✅ FIX: Pass serviceability setter for autofill
  });

  // ============================================================================
  // VENDOR AUTOCOMPLETE FUNCTIONS
  // ============================================================================

  // Search function (debounced)
  const searchTransporters = useMemo(
    () =>
      debounce(async (query: string) => {
        // Early exit for short queries - DON'T reset loading here
        // Let the finally block handle it to ensure spinner shows until debounce completes
        if (!query || query.length < 2) {
          setSuggestions([]);
          return;
        }

        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        setIsSearching(true);

        try {
          const customerID = getCustomerIDFromToken();
          if (!customerID) {
            setSuggestions([]);
            return;
          }

          const token = getAuthToken();
          const url = `${API_BASE}/api/transporter/search-transporters?query=${encodeURIComponent(query)}&customerID=${encodeURIComponent(customerID)}&limit=10`;

          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            signal: abortControllerRef.current.signal
          });

          if (!response.ok) throw new Error(`Search failed: ${response.status}`);

          const data = await response.json();

          if (data.success && data.data?.length > 0) {
            setSuggestions(data.data);
            setShowDropdown(true);
          } else {
            // No results found - show popup notification
            setSuggestions([]);
            toast.error(`No transporters found for "${query}"`, {
              duration: 3000,
              icon: '🔍',
            });
          }
        } catch (error: any) {
          if (error.name !== 'AbortError') {
            console.error('[Autocomplete] Search error:', error);
            setSuggestions([]);
          }
        } finally {
          // Always reset loading state here - ensures consistent behavior
          setIsSearching(false);
        }
      }, 300),
    []
  );

  // Auto-select handler (FIXED – sync wrapper)
  const handleVendorAutoSelect = useCallback(
    (vendor: VendorSuggestion) => {
      console.log('[AutoFill] selecting vendor', vendor);

      // 🔑 IMPORTANT: keep handler sync, run async logic inside
      (async () => {
        try {
          await applyVendorAutofill(vendor, { blankCellValue: '' });

          // UI bookkeeping (AFTER autofill completes)
          setIsAutoFilled(true);
          setAutoFilledFromName(
            vendor.displayName || vendor.companyName || vendor.legalCompanyName || ''
          );
          setAutoFilledFromId(vendor.id || null);
          setShowDropdown(false);
          setSuggestions([]);
          setHighlightedIndex(-1);

          // Auto-select Wizard tab when results are found
          setZoneConfigMode('wizard');

          toast.success(
            `Auto-filled from "${vendor.displayName || vendor.companyName}". ${vendor.zones?.length || 0
            } zones loaded (prices blank).`,
            { duration: 5000 }
          );
        } catch (err) {
          console.error('[AutoFill] Auto-fill failed', err);
          toast.error('Failed to auto-fill vendor');
        }
      })();
    },
    [
      applyVendorAutofill,
      setIsAutoFilled,
      setAutoFilledFromName,
      setAutoFilledFromId,
      setShowDropdown,
      setSuggestions,
      setHighlightedIndex,
    ]
  );


  // Clear auto-fill
  const clearAutoFill = useCallback(() => {
    setIsAutoFilled(false);
    setAutoFilledFromName(null);
    setAutoFilledFromId(null);
  }, []);
  // Prevent double-run in React StrictMode / dev double-mounts
  const mountRan = useRef(false);

  // Load zone data from localStorage (legacy method)
  const loadZoneData = useCallback(() => {
    const data = safeLoadZPM();
    setZpm(data);
    emitDebug('ZPM_LOADED', { hasData: !!data, data });
    if (!data && (!wizardData || !wizardData.priceMatrix)) {
      toast.error('No zone matrix found. Open the wizard to create one.', {
        duration: 2200,
        id: 'zpm-missing',
      });
    } else if (data) {
      toast.success('Zone matrix loaded from browser', {
        duration: 1400,
        id: 'zpm-loaded',
      });
    }
  }, [wizardData]);

  // Handle zone mapping upload (from CSV/Excel)
  const handleZoneMappingUpload = useCallback((data: {
    zones: Array<{
      zoneCode: string;
      zoneName: string;
      region: string;
      selectedStates: string[];
      selectedCities: string[];
      isComplete: boolean;
    }>;
    priceMatrix: Record<string, Record<string, string | number>>;
    odaPincodes?: string[];
  }) => {
    console.log('[ZoneMapping] Received uploaded data:', data);

    // Build zone codes list
    const zoneCodes = data.zones.map(z => z.zoneCode);

    // Write to wizard storage
    try {
      const wizardKey = 'vendorWizard.v1';
      let wizardState: any = {};
      const raw = localStorage.getItem(wizardKey);
      if (raw) {
        try { wizardState = JSON.parse(raw); } catch { wizardState = {}; }
      }

      wizardState = {
        ...wizardState,
        selectedZones: zoneCodes.map(z => ({ zoneCode: z, zoneName: z })),
        zones: data.zones,
        priceMatrix: data.priceMatrix,
        step: 3, // Jump to price matrix step
        lastUpdated: new Date().toISOString(),
        uploadedFromCSV: true,
      };

      localStorage.setItem(wizardKey, JSON.stringify(wizardState));

      // Also write legacy ZPM format
      const zpmData = {
        zones: zoneCodes,
        priceMatrix: data.priceMatrix,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(ZPM_KEY, JSON.stringify(zpmData));
      setZpm(zpmData);

      // Update wizard data state
      if (typeof setWizardData === 'function') {
        setWizardData((prev: any) => ({
          ...(prev || {}),
          selectedZones: zoneCodes.map(z => ({ zoneCode: z, zoneName: z })),
          zones: data.zones,
          priceMatrix: data.priceMatrix,
        }));
      }

      // Validate and update status
      const validation = validateWizardData(wizardState);
      const status = getWizardStatus(wizardState);
      setWizardValidation(validation);
      setWizardStatus(status);

      // Mark as auto-filled
      setIsAutoFilled(true);
      setAutoFilledFromName('CSV/Excel Upload');

      toast.success(`Zone mapping applied! ${data.zones.length} zones configured. Now fill in prices.`, {
        duration: 5000,
      });

    } catch (err) {
      console.error('[ZoneMapping] Failed to save:', err);
      toast.error('Failed to apply zone mapping');
    }
  }, [setWizardData, validateWizardData, getWizardStatus]);

  // Handle zone selection wizard completion (auto-assign mode)
  const handleZoneSelectionComplete = useCallback((data: {
    zones: Array<{
      zoneCode: string;
      zoneName: string;
      region: string;
      selectedStates: string[];
      selectedCities: string[];
      isComplete: boolean;
    }>;
    priceMatrix: Record<string, Record<string, string | number>>;
  }) => {
    console.log('[ZoneSelection] Received from wizard:', data);

    // Build zone codes list
    const zoneCodes = data.zones.map(z => z.zoneCode);

    // Write to wizard storage
    try {
      const wizardKey = 'vendorWizard.v1';
      let wizardState: any = {};
      const raw = localStorage.getItem(wizardKey);
      if (raw) {
        try { wizardState = JSON.parse(raw); } catch { wizardState = {}; }
      }

      wizardState = {
        ...wizardState,
        selectedZones: zoneCodes.map(z => ({ zoneCode: z, zoneName: z })),
        zones: data.zones,
        priceMatrix: data.priceMatrix,
        step: 3, // Jump to price matrix step
        lastUpdated: new Date().toISOString(),
        autoAssigned: true,
      };

      localStorage.setItem(wizardKey, JSON.stringify(wizardState));

      // Also write legacy ZPM format
      const zpmData = {
        zones: zoneCodes,
        priceMatrix: data.priceMatrix,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(ZPM_KEY, JSON.stringify(zpmData));
      setZpm(zpmData);

      // Update wizard data state
      if (typeof setWizardData === 'function') {
        setWizardData((prev: any) => ({
          ...(prev || {}),
          selectedZones: zoneCodes.map(z => ({ zoneCode: z, zoneName: z })),
          zones: data.zones,
          priceMatrix: data.priceMatrix,
        }));
      }

      // Validate and update status
      const validation = validateWizardData(wizardState);
      const status = getWizardStatus(wizardState);
      setWizardValidation(validation);
      setWizardStatus(status);

      // Mark as auto-filled
      setIsAutoFilled(true);
      setAutoFilledFromName('Auto Zone Assignment');

      // Calculate total cities
      const totalCities = data.zones.reduce((sum, z) => sum + z.selectedCities.length, 0);

      toast.success(`Auto-assigned ${data.zones.length} zones with ${totalCities} cities! Now fill in prices.`, {
        duration: 5000,
      });

    } catch (err) {
      console.error('[ZoneSelection] Failed to save:', err);
      toast.error('Failed to apply zone selection');
    }
  }, [setWizardData, validateWizardData, getWizardStatus]);

  // NEW: Handle pincode-authoritative serviceability upload
  const handleServiceabilityReady = useCallback((data: {
    serviceability: ServiceabilityEntry[];
    zoneSummary: ZoneSummary[];
    checksum: string;
    source: 'excel' | 'manual';
  }) => {
    console.log('✅ [ServiceabilityUpload] Received:', data);
    console.log('✅ Serviceability count:', data.serviceability.length);
    console.log('✅ First entry:', data.serviceability[0]);

    // Store the serviceability data in local state
    setServiceabilityData(data);
    console.log('✅ State setter called - serviceabilityData should now be populated');

    // 🔥 CRITICAL FIX: Also persist to wizardData via updateServiceability
    // This ensures CSV data survives if user switches tabs or page refreshes
    if (typeof setWizardData === 'function') {
      setWizardData((prev: any) => ({
        ...(prev || {}),
        serviceability: data.serviceability,
        serviceabilityChecksum: data.checksum,
        serviceabilitySource: data.source,
      }));
      console.log('✅ [FIX] Saved serviceability to wizardData for persistence');
    }

    // Build zone configs from summary for compatibility with existing wizard flow
    const zoneConfigs = data.zoneSummary.map(z => ({
      zoneCode: z.zoneCode,
      zoneName: z.zoneCode,
      region: z.region as any,
      selectedStates: z.states,
      selectedCities: z.cities.map(c => `${c}||${z.states[0] || 'UNKNOWN'}`),
      isComplete: true,
    }));

    // Build a price matrix with blank cells (user will fill in prices later or use pricing upload)
    const zoneCodes = data.zoneSummary.map(z => z.zoneCode);
    const priceMatrix: Record<string, Record<string, string | number>> = {};
    for (const fromZone of zoneCodes) {
      priceMatrix[fromZone] = {};
      for (const toZone of zoneCodes) {
        priceMatrix[fromZone][toZone] = 0;
      }
    }

    // Store in wizard format for compatibility
    const wizardKey = 'vendorWizard.v1';
    const wizardState = {
      selectedZones: zoneCodes.map(z => ({ zoneCode: z, zoneName: z })),
      zones: zoneConfigs,
      priceMatrix,
      step: 3,
      lastUpdated: new Date().toISOString(),
      pincodeAuthoritative: true,
      serviceabilityChecksum: data.checksum,
      serviceability: data.serviceability,
    };

    localStorage.setItem(wizardKey, JSON.stringify(wizardState));

    // Update legacy ZPM format
    const zpmData = {
      zones: zoneCodes,
      priceMatrix,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(ZPM_KEY, JSON.stringify(zpmData));
    setZpm(zpmData);

    // Update wizard data state
    if (typeof setWizardData === 'function') {
      setWizardData((prev: any) => ({
        ...(prev || {}),
        ...wizardState,
      }));
    }

    // Update validation state
    const validation = validateWizardData(wizardState);
    const status = getWizardStatus(wizardState);
    setWizardValidation(validation);
    setWizardStatus(status);

    // Mark as auto-filled
    setIsAutoFilled(true);
    setAutoFilledFromName('Pincode Upload');

    toast.success(
      `Serviceability loaded: ${data.serviceability.length} pincodes across ${data.zoneSummary.length} zones`,
      { duration: 5000 }
    );
  }, [setWizardData, validateWizardData, getWizardStatus]);

  // Validate wizard data when loaded
  useEffect(() => {
    if (wizardLoaded && wizardData) {
      const validation = validateWizardData(wizardData);
      const status = getWizardStatus(wizardData);
      setWizardValidation(validation);
      setWizardStatus(status);
      emitDebug('WIZARD_VALIDATION', { validation, status });
    }
  }, [wizardLoaded, wizardData]);

  const matrixSize = useMemo(() => {
    // Prioritize wizard data, fallback to legacy localStorage
    const matrix = wizardData?.priceMatrix || zpm?.priceMatrix || {};
    const rows = Object.keys(matrix).length;
    const cols = rows ? Object.keys(Object.values(matrix)[0] ?? {}).length : 0;
    return { rows, cols };
  }, [zpm, wizardData]);

  // Load draft + zone matrix on mount
  useEffect(() => {
    if (mountRan.current) return;
    mountRan.current = true;

    const draft = readDraft();
    if (draft) {
      emitDebug('DRAFT_LOADED_ON_MOUNT', draft);
      try {
        if (draft.basics && typeof vendorBasics.loadFromDraft === 'function') {
          vendorBasics.loadFromDraft(draft.basics);
          if (draft.basics.transportMode) setTransportMode(draft.basics.transportMode);
        }
        if (draft.geo && typeof pincodeLookup.loadFromDraft === 'function') {
          pincodeLookup.loadFromDraft(draft.geo);
        }
        if (draft.volumetric && typeof volumetric.loadFromDraft === 'function') {
          volumetric.loadFromDraft(draft.volumetric);
        }
        if (draft.charges && typeof charges.loadFromDraft === 'function') {
          charges.loadFromDraft(draft.charges);
        }
        toast.success('Draft restored', { duration: 1600, id: 'draft-restored' });
      } catch (err) {
        emitDebugError('DRAFT_LOAD_ERROR', { err });
        toast.error('Failed to restore draft completely');
      }
    }
    loadZoneData(); // also load zone matrix from localStorage (legacy)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  //useffect for auto-fill of invoice value charges//
  useEffect(() => {
    // Don't overwrite if user manually changed invoice fields
    if (invoiceManualOverride) return;

    // Defensive read of rov data from charges hook
    const rov = (charges && (charges.charges || (charges as any)))?.rovCharges || (charges && (charges as any)?.rov) || null;
    if (!rov) return;

    const mode = (rov.mode || (rov.currency === 'INR' ? 'FIXED' : rov.currency === 'PERCENT' ? 'VARIABLE' : '') || '').toString().toUpperCase();

    const toStr = (v: any) => (v === undefined || v === null ? '' : String(v));

    if (mode === 'FIXED') {
      // when ROV is fixed -> invoice min := fixed amount, percentage := 0.0001, useMax := true
      const fixedVal = rov.fixedAmount ?? rov.fixed ?? rov.fixedRate ?? 0;
      const fixedStr = String(Number(fixedVal) || 0);
      setInvoiceMinAmount(fixedStr);
      setInvoicePercentage('0.0001');
      setInvoiceUseMax(true);
    } else if (mode === 'VARIABLE') {
      // when ROV is variable -> invoice percentage := rov variable, min := 0, useMax := true
      const varVal = rov.variableRange ?? rov.variable ?? rov.variablePct ?? rov.variablePercent ?? '';
      const varStr = toStr(varVal);
      setInvoicePercentage(varStr);
      setInvoiceMinAmount('0');
      setInvoiceUseMax(true);
    }
  }, [
    // watch the rov object specifically so the effect runs only when ROV changes
    charges?.charges?.rovCharges,
    // include manual override so we bail out if it changes
    invoiceManualOverride,
  ]);
  // 🔥 Auto-persist pincode so it doesn't disappear when returning from Wizard
  useEffect(() => {
    if (!pincodeLookup?.geo?.pincode) return;

    persistDraft({
      geo: {
        pincode: pincodeLookup.geo.pincode,
        state: pincodeLookup.geo.state,
        city: pincodeLookup.geo.city,
      },
    });
  }, [
    pincodeLookup?.geo?.pincode,
    pincodeLookup?.geo?.state,
    pincodeLookup?.geo?.city,
  ]);

  // 🔥 Auto-persist volumetric configuration so it doesn't reset when returning from Wizard
  useEffect(() => {
    if (!volumetric?.state) return;

    persistDraft({
      volumetric: {
        unit: volumetric.state.unit,
        volumetricDivisor: volumetric.state.volumetricDivisor,
        cftFactor: volumetric.state.cftFactor,
      },
    });
  }, [
    volumetric?.state?.unit,
    volumetric?.state?.volumetricDivisor,
    volumetric?.state?.cftFactor,
  ]);

  // ===== Local validation for basics =====
  const validateVendorBasicsLocal = (): { ok: boolean; errs: string[] } => {
    const errs: string[] = [];
    const b = vendorBasics.basics || {};
    const geo = pincodeLookup.geo || {};

    // ---- map to new company section fields ----
    const legalName = capitalizeWords(
      safeGetField(b, 'legalCompanyName', 'name', 'companyName', 'company')
    ).slice(0, 60);

    const contactPerson = capitalizeWords(
      safeGetField(b, 'contactPersonName')
    ).slice(0, 30);

    const subVendor = capitalizeWords(
      safeGetField(b, 'subVendor', 'sub_vendor')
    ).slice(0, 20);

    // ✅ FIXED: Use 'b' not 'basics' - allow alphanumeric
    const vendorCode = safeGetField(b, 'vendorCode', 'vendor_code')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 9);

    // ✅ FIXED: Use 'b' instead of 'basics'
    const vendorPhone = sanitizeDigitsOnly(
      safeGetField(b, 'vendorPhoneNumber', 'vendorPhone', 'primaryContactPhone')
    ).slice(0, 10);

    const vendorEmail = safeGetField(
      b,
      'vendorEmailAddress',
      'vendorEmail',
      'primaryContactEmail'
    ).trim();

    const gstin = safeGetField(b, 'gstin', 'gst', 'gstNo')
      .toUpperCase()
      .replace(/\s+/g, '')
      .slice(0, 15);
    if (gstin) {
      const gstError = validateGST(gstin);
      if (gstError) errs.push(gstError);
    }
    const address = safeGetField(b, 'address').trim().slice(0, 150);

    // ---- basic text length and required checks ----
    if (!legalName || legalName.trim().length === 0) {
      errs.push('Legal Transporter name is required (max 60 chars).');
    }
    if (legalName.trim().length > 60) {
      errs.push('Legal Transporter name must be at most 60 characters.');
    }

    if (!contactPerson || contactPerson.trim().length === 0) {
      errs.push('Contact person is required (max 30 chars).');
    }
    if (contactPerson.trim().length > 30) {
      errs.push('Contact person must be at most 30 characters.');
    }

    if (subVendor && subVendor.trim().length > 20) {
      errs.push('Sub vendor must be at most 20 characters.');
    }

    // ✅ FIXED: Allow alphanumeric vendor codes
    if (!/^[A-Za-z0-9]{1,9}$/.test(vendorCode)) {
      errs.push('Vendor code must be 1 to 9 characters, letters and digits only.');
    }

    if (!/^[1-9][0-9]{9}$/.test(vendorPhone)) {
      errs.push('Contact number must be 10 digits and cannot start with 0.');
    }

    // ---- email validation (unchanged logic) ----
    let emailOk = false;
    try {
      emailOk = !!(
        vendorEmail &&
        (isEmail.validate ? isEmail.validate(vendorEmail) : isEmail(vendorEmail))
      );
    } catch {
      emailOk = EMAIL_FALLBACK_RE.test(vendorEmail);
    }
    if (!emailOk) {
      errs.push('Invalid email address (must include a domain and a dot).');
    }

    // ---- GST validation (same regex) ----
    if (!GST_REGEX.test(gstin)) {
      errs.push('GST number must be a valid 15-character GSTIN.');
    }

    // ---- address ----
    if (!address || address.trim().length === 0) {
      errs.push('Address is required (max 150 chars).');
    }
    if (address.trim().length > 150) {
      errs.push('Address must be at most 150 characters.');
    }

    // ---- fuel surcharge (unchanged) ----
    try {
      const c = charges.charges || {};
      const fuel = safeGetNumber(c, 0, 'fuelSurcharge', 'fuel');
      if (!Number.isFinite(fuel) || fuel < 0 || fuel > 50) {
        errs.push('Fuel surcharge must be between 0 and 50.');
      }
    } catch {
      /* ignore */
    }

    // ---- pincode from geo: must be exactly 6 digits ----
    const pincodeStr = String(geo.pincode ?? '')
      .replace(/\D+/g, '')
      .slice(0, 6);
    if (pincodeStr && pincodeStr.length !== 6) {
      errs.push('Pincode looks invalid (must be exactly 6 digits).');
    }

    // ---- serviceMode & companyRating (new fields) ----
    const serviceMode = (b as any).serviceMode;
    if (!serviceMode || (serviceMode !== 'FTL' && serviceMode !== 'LTL')) {
      errs.push('Please select a service mode.');
    }

    // Validate individual vendor ratings (all 5 must be provided)
    const vendorRatings = (b as any).vendorRatings;
    if (!vendorRatings) {
      errs.push('Please provide vendor ratings.');
    } else {
      const ratingFields = ['priceSupport', 'deliveryTime', 'tracking', 'salesSupport', 'damageLoss'];
      const missingRatings = ratingFields.filter(field => !vendorRatings[field] || vendorRatings[field] < 1);
      if (missingRatings.length > 0) {
        errs.push(`Please rate all 5 vendor parameters (missing: ${missingRatings.join(', ')}).`);
      }
    }

    return { ok: errs.length === 0, errs };
  };


  // ===== GLOBAL VALIDATION (with detailed debug + toasts + bypassValidation) =====
  // ===== GLOBAL VALIDATION (EXACT ERROR REPORTING) =====
  const validateAll = (): boolean => {
    // We use a Set to automatically remove duplicate error messages
    const uniqueErrors = new Set<string>();

    console.debug('[VALIDATION] Starting exact validation checks');

    // 1. EXACT LOCAL CHECKS (Run these FIRST to get specific messages)
    try {
      const local = validateVendorBasicsLocal();
      if (!local.ok) {
        local.errs.forEach(e => uniqueErrors.add(e));
      }
    } catch (err) {
      console.error('[VALIDATION] validateVendorBasicsLocal threw', err);
      uniqueErrors.add('Error checking specific company details (check console).');
    }

    // 2. WIZARD / ZONE CHECKS (Extract specific zone errors)
    if (wizardData && !wizardValidation?.isValid) {
      if (wizardValidation?.errors && wizardValidation.errors.length > 0) {
        // Add specific errors like "Zone NE2 is incomplete"
        wizardValidation.errors.forEach(e => uniqueErrors.add(e));
      } else {
        uniqueErrors.add('Wizard configuration is invalid (check Zone setup).');
      }
    }

    // 3. HOOK STATE CHECKS (Trigger Red Borders)
    // We still run these functions because they turn the input borders red in the UI,
    // but we only add a message if we haven't already caught a specific error for that section.

    // Vendor Basics (UI Red Borders)
    const vbOk = typeof vendorBasics.validateAll === 'function' ? vendorBasics.validateAll() : true;
    // Note: We rely on 'validateVendorBasicsLocal' (step 1) for the text message, so we don't push a generic one here.

    // Pincode (UI Red Borders + Message)
    const plOk = typeof pincodeLookup.validateGeo === 'function' ? pincodeLookup.validateGeo() : true;
    if (!plOk) uniqueErrors.add('Location/Pincode information is incomplete.');

    // Volumetric (UI Red Borders + Message)
    const volOk = typeof volumetric.validateVolumetric === 'function' ? volumetric.validateVolumetric() : true;
    if (!volOk) uniqueErrors.add('Volumetric configuration is invalid.');

    // Charges (UI Red Borders + Message)
    const chOk = typeof charges.validateAll === 'function' ? charges.validateAll() : true;
    if (!chOk) uniqueErrors.add('Charges configuration is invalid.');

    // 4. Matrix Check (Essential)
    const hasWizardMatrix = wizardData?.priceMatrix && Object.keys(wizardData.priceMatrix).length > 0;
    const hasLegacyMatrix = zpm?.priceMatrix && Object.keys(zpm.priceMatrix).length > 0;

    // ✅ NEW: Also accept pincode-authoritative serviceability as valid
    const hasServiceability = serviceabilityData?.serviceability && serviceabilityData.serviceability.length > 0;

    if (!hasWizardMatrix && !hasLegacyMatrix && !hasServiceability) {
      uniqueErrors.add('Zone/Serviceability data is missing. Upload pincodes or configure zones via wizard.');
    }

    // 5. BYPASS CHECK
    const urlParams = new URLSearchParams(window.location.search);
    const bypass = urlParams.get('bypassValidation') === '1';

    if (bypass && uniqueErrors.size > 0) {
      console.warn('[VALIDATION] Bypassing errors:', Array.from(uniqueErrors));
      toast.success('Validation bypassed (Dev Mode)', { icon: '⚠️' });
      return true;
    }

    // 6. FINAL VERDICT
    if (uniqueErrors.size > 0) {
      // Convert Set back to Array and show toasts
      Array.from(uniqueErrors).forEach((msg) => {
        toast.error(msg, { duration: 5000 });
      });

      emitDebugError('VALIDATION_FAILED', { errs: Array.from(uniqueErrors) });
      return false;
    }

    return true;
  };





  // ===== Build API payload (uses wizard data OR legacy localStorage) =====
  const buildPayloadForApi = () => {
    // 🔍 DEBUG: Log raw form state BEFORE processing
    console.log('📋 RAW FORM STATE (before buildPayloadForApi):', {
      'vendorBasics.basics': vendorBasics.basics,
      'charges.charges': charges.charges,
      'volumetric.state': volumetric.state,
      'pincodeLookup.geo': pincodeLookup.geo,
    });

    const basics = vendorBasics.basics || {};
    const geo = pincodeLookup.geo || {};

    const name = capitalizeWords(safeGetField(basics, 'name', 'companyName')).slice(0, 60);
    const displayName = capitalizeWords(
      safeGetField(basics, 'displayName', 'display_name'),
    ).slice(0, 30);
    const companyName = capitalizeWords(
      safeGetField(basics, 'companyName', 'company_name'),
    ).slice(0, 60);
    const primaryCompanyName = capitalizeWords(
      safeGetField(basics, 'primaryCompanyName', 'primaryCompany'),
    ).slice(0, 25);
    const subVendor = capitalizeWords(safeGetField(basics, 'subVendor', 'sub_vendor')).slice(
      0,
      20,
    );

    // ✅ FIX 1: Extract contactPersonName
    const contactPerson = capitalizeWords(
      safeGetField(basics, 'contactPersonName', 'primaryContactName')
    ).slice(0, 100);

    // ✅ FIXED: Use 'basics' not 'b' - allow alphanumeric
    const vendorCode = safeGetField(basics, 'vendorCode', 'vendor_code')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')   // keep only A–Z and 0–9
      .slice(0, 9);

    const vendorPhoneStr = sanitizeDigitsOnly(
      safeGetField(basics, 'vendorPhoneNumber', 'vendorPhone', 'primaryContactPhone'),
    ).slice(0, 10);
    const vendorPhoneNum = Number(
      clampNumericString(vendorPhoneStr, 1000000000, 9999999999, 10) || 0,
    );

    const vendorEmail = safeGetField(
      basics,
      'vendorEmailAddress',
      'vendorEmail',
      'primaryContactEmail',
    ).trim();
    const gstNo = safeGetField(basics, 'gstin', 'gstNo', 'gst')
      .toUpperCase()
      .replace(/\s+/g, '')
      .slice(0, 15);
    const address = safeGetField(basics, 'address').trim().slice(0, 150);

    // ✅ FIX 2: Extract city from geo
    const city = String(geo.city ?? '').trim().slice(0, 50);

    // ✅ FIX 3: Extract rating from basics (calculated from vendorRatings)
    // Use companyRating which is auto-calculated from the 5 individual ratings
    const rating = Number(basics.companyRating) || calculateOverallRating(basics.vendorRatings || {
      priceSupport: 0, deliveryTime: 0, tracking: 0, salesSupport: 0, damageLoss: 0
    }) || 4;

    // ✅ FIX 4: Extract service mode (FTL/LTL)
    const serviceMode = safeGetField(basics, 'serviceMode', 'service_mode') || 'FTL';

    // ✅ FIXED: Direct access to volumetric.state
    const volState = volumetric.state || {};
    const volUnit = volState.unit || 'cm';

    emitDebug('VOLUMETRIC_DATA_DEBUG', {
      volState,
      volUnit,
      fullVolumetricHook: volumetric,
    });

    const volumetricBits =
      volUnit === 'cm'
        ? {
          divisor: volState.volumetricDivisor || null,
          cftFactor: null as number | null,
        }
        : {
          divisor: null as number | null,
          cftFactor: volState.cftFactor || null,
        };

    emitDebug('VOLUMETRIC_BITS_MAPPED', volumetricBits);

    // ✅ FIXED: Preserve decimals instead of stripping them
    const parseCharge = (
      val: any,
      min = 0,
      max = 100000,
      digitLimit?: number,
    ): number => {
      if (val === undefined || val === null || val === '') return 0;

      // Convert to number directly (preserves decimals)
      const num = Number(val);

      // Return 0 if NaN
      if (isNaN(num)) return 0;

      // Clamp to min/max
      const clamped = Math.min(Math.max(num, min), max);

      // Round to 2 decimal places to avoid floating point issues
      return Math.round(clamped * 100) / 100;
    };

    const c = charges.charges || {};

    // 🔍 Normalize all toggle-based groups ONCE using your helper
    const rovNorm = normalizeChargeGroup(c.rovCharges);
    const codNorm = normalizeChargeGroup(c.codCharges);
    const topayNorm = normalizeChargeGroup(c.toPayCharges);  // ✅ Capital P
    const handlingNorm = normalizeChargeGroup(c.handlingCharges);
    const appointNorm = normalizeChargeGroup(c.appointmentCharges);
    const insuranceNorm = normalizeChargeGroup(c.insuranceCharges || c.insuaranceCharges);
    const odaNorm = normalizeChargeGroup(c.odaCharges);
    const prepaidNorm = normalizeChargeGroup(c.prepaidCharges);
    const fmNorm = normalizeChargeGroup(c.fmCharges);

    // ✅ serviceMode + volumetricUnit + all simple numeric charges
    const priceRate = {
      serviceMode: serviceMode,
      volumetricUnit: volUnit,

      // simple one–value fields
      minWeight: parseCharge(
        safeGetNumber(c, 0, 'minWeightKg'),  // ✅ Correct field name
        0,
        10000,
        5,
      ),
      docketCharges: parseCharge(
        safeGetNumber(c, 0, 'docketCharges'),
        0,
        10000,
        5,
      ),
      fuel: parseCharge(
        safeGetNumber(c, 0, 'fuelSurchargePct'),  // ✅ Correct field name
        0,
        50,
        2,
      ),

      // 🔁 ROV / COD / To-Pay etc – use normalized values
      rovCharges: {
        fixed: parseCharge(rovNorm.fixed, 0, 100000),
        variable: parseCharge(rovNorm.variable, 0, 100000),
        unit: rovNorm.unit || 'per kg',
      },
      codCharges: {
        fixed: parseCharge(codNorm.fixed, 0, 100000),
        variable: parseCharge(codNorm.variable, 0, 100000),
        unit: codNorm.unit || 'per kg',
      },
      topayCharges: {
        fixed: parseCharge(topayNorm.fixed, 0, 100000),
        variable: parseCharge(topayNorm.variable, 0, 100000),
        unit: topayNorm.unit || 'per kg',
      },
      handlingCharges: {
        fixed: parseCharge(handlingNorm.fixed, 0, 100000),
        variable: parseCharge(handlingNorm.variable, 0, 100000),
        unit: handlingNorm.unit || 'per kg',
        threshholdweight: parseCharge(
          safeGetNumber(
            c.handlingCharges || c,
            0,
            'threshholdweight',
            'handlingThresholdWeight',
            'thresholdWeight',
          ),
          0,
          100000,
        ),
      },
      appointmentCharges: {
        fixed: parseCharge(appointNorm.fixed, 0, 100000),
        variable: parseCharge(appointNorm.variable, 0, 100000),
        unit: appointNorm.unit || 'per kg',
      },

      // ====== volumetric (see next section) ======
      ...volumetricBits,

      // basic numeric add-ons
      minCharges: parseCharge(
        safeGetNumber(c, 0, 'minimumCharges', 'minCharges'),
        0,
        100000,
      ),
      greenTax: parseCharge(
        safeGetNumber(c, 0, 'greenTax', 'ngt'),
        0,
        100000,
      ),
      daccCharges: parseCharge(
        safeGetNumber(c, 0, 'daccCharges'),
        0,
        100000,
      ),
      miscellanousCharges: parseCharge(
        safeGetNumber(c, 0, 'miscCharges', 'miscellanousCharges'),
        0,
        100000,
      ),

      insuaranceCharges: {
        fixed: parseCharge(insuranceNorm.fixed, 0, 100000),
        variable: parseCharge(insuranceNorm.variable, 0, 100000),
        unit: insuranceNorm.unit || 'per kg',
      },
      odaCharges: {
        fixed: parseCharge(odaNorm.fixed, 0, 100000),
        variable: parseCharge(odaNorm.variable, 0, 100000),
        unit: odaNorm.unit || 'per kg',
      },
      prepaidCharges: {
        fixed: parseCharge(prepaidNorm.fixed, 0, 100000),
        variable: parseCharge(prepaidNorm.variable, 0, 100000),
        unit: prepaidNorm.unit || 'per kg',
      },
      fmCharges: {
        fixed: parseCharge(fmNorm.fixed, 0, 100000),
        variable: parseCharge(fmNorm.variable, 0, 100000),
        unit: fmNorm.unit || 'per kg',
      },

      hamaliCharges: parseCharge(
        safeGetNumber(c, 0, 'hamaliCharges', 'hamali'),
        0,
        100000,
      ),
    };



    // Use wizard data if available, fallback to legacy localStorage
    // Use wizard data if available, fallback to legacy localStorage
    const priceChart = (wizardData?.priceMatrix || zpm?.priceMatrix || {}) as PriceMatrix;

    // ✅ Extract selected zones from wizard (just zone codes)
    const selectedZones = wizardData?.zones?.map((z: any) => z.zoneCode) || zpm?.selectedZones || [];

    // ✅ NEW: Extract full zone configurations with city mappings for DB storage
    const zoneConfigurations = wizardData?.zones || [];

    const pincodeStr = String(geo.pincode ?? '')
      .replace(/\D+/g, '')
      .slice(0, 6);
    const pincodeNum = Number(pincodeStr || 0);

    // ✅ AUTO-ENABLE if user entered any values
    const hasInvoicePercentage = invoicePercentage && Number(invoicePercentage) > 0;
    const hasInvoiceMinAmount = invoiceMinAmount && Number(invoiceMinAmount) > 0;
    const invoiceAutoEnabled = hasInvoicePercentage || hasInvoiceMinAmount;

    // ✅ FIX: SOLUTION #2 - Consolidate all serviceability sources
    // Priority: CSV upload > Wizard data > Empty
    let serviceabilityArray: any[] = [];
    let serviceabilityChecksum: string = '';
    let serviceabilitySource: string = '';

    if (serviceabilityData?.serviceability && Array.isArray(serviceabilityData.serviceability) && serviceabilityData.serviceability.length > 0) {
      serviceabilityArray = serviceabilityData.serviceability;
      serviceabilityChecksum = serviceabilityData.checksum || '';
      serviceabilitySource = serviceabilityData.source || 'excel';
      console.log('✅ [Payload] Using CSV serviceability:', serviceabilityArray.length, 'pincodes');
    } else if (wizardData?.serviceability && Array.isArray(wizardData.serviceability) && wizardData.serviceability.length > 0) {
      serviceabilityArray = wizardData.serviceability;
      serviceabilityChecksum = wizardData.serviceabilityChecksum || '';
      serviceabilitySource = 'wizard';
      console.log('✅ [Payload] Using Wizard serviceability:', serviceabilityArray.length, 'pincodes');
    } else {
      console.warn('⚠️ [Payload] No serviceability data found (CSV or Wizard empty)');
      serviceabilityChecksum = '';
      serviceabilitySource = '';
    }

    console.log('🔍 SERVICEABILITY DEBUG:', {
      hasServiceabilityData: !!serviceabilityData,
      serviceabilityDataKeys: serviceabilityData ? Object.keys(serviceabilityData) : null,
      serviceabilityArrayLength: serviceabilityArray.length,
      firstEntry: serviceabilityArray[0],
      checksum: serviceabilityChecksum,
      source: serviceabilitySource
    });

    const payloadForApi = {
      customerID: getCustomerIDFromToken(),
      companyName: companyName.trim(),
      contactPersonName: contactPerson,      // ✅ NEW - at root level
      vendorCode: vendorCode,
      vendorPhone: vendorPhoneNum,
      vendorEmail: vendorEmail,
      gstNo,
      transportMode: transportMode || 'road',
      serviceMode: serviceMode || '',
      address,
      state: String(geo.state ?? '').toUpperCase(),
      pincode: pincodeNum,
      city: city,                         // ✅ NEW - at root level
      rating: rating,                     // ✅ Overall rating (calculated from individual ratings)
      vendorRatings: basics.vendorRatings || {
        priceSupport: 0,
        deliveryTime: 0,
        tracking: 0,
        salesSupport: 0,
        damageLoss: 0,
      }, // ✅ NEW - Individual rating parameters
      subVendor: subVendor,               // ✅ NEW - at root level (not nested)
      selectedZones: selectedZones,       // ✅ NEW - at root level
      zoneConfigurations: zoneConfigurations,  // ✅ ADD THIS LINE
      human: { name, displayName, primaryCompanyName },  // Removed subVendor from here
      prices: { priceRate, priceChart },
      zones: zoneConfigurations,  // ✅ ADD THIS LINE TOO

      // ✅ NEW: Pincode-authoritative serviceability (the canonical truth)
      serviceability: serviceabilityArray,
      serviceabilityChecksum: serviceabilityChecksum,
      serviceabilitySource: serviceabilitySource,

      invoiceValueCharges: {
        enabled: invoiceAutoEnabled,
        percentage: Number(invoicePercentage || 0),
        minimumAmount: Number(invoiceMinAmount || 0),
        description: 'Invoice Value Handling Charges',
      },
    };

    console.log('🔍 FINAL PAYLOAD:', payloadForApi);
    console.log('🔍 SERVICEABILITY:', {
      count: serviceabilityArray.length,
      checksum: serviceabilityChecksum,
      source: serviceabilityData?.source,
    });
    console.log('🔍 CHARGES IN PAYLOAD:', {
      'priceRate.codCharges': payloadForApi.prices.priceRate.codCharges,
      'priceRate.topayCharges': payloadForApi.prices.priceRate.topayCharges,
      'priceRate.rovCharges': payloadForApi.prices.priceRate.rovCharges,
      'priceRate.prepaidCharges': payloadForApi.prices.priceRate.prepaidCharges,
    });
    return payloadForApi;
  };

  // ===== Submit =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    emitDebug('SUBMIT_STARTED');
    console.debug('[SUBMIT] clicked - start');
    console.log('[STEP 0] handleSubmit fired, outputMode =', outputMode);

    // 🔥 FIX: SOLUTION #1 - Calculate priceChart first before validation
    const priceChart = (wizardData?.priceMatrix || zpm?.priceMatrix || {}) as Record<string, Record<string, number>>;

    // 🔥 FIX: SOLUTION #1 - Validate serviceability is loaded BEFORE building payload
    const hasServiceabilityFromCSV = serviceabilityData?.serviceability && Array.isArray(serviceabilityData.serviceability) && serviceabilityData.serviceability.length > 0;
    const hasServiceabilityFromWizard = wizardData?.serviceability && Array.isArray(wizardData.serviceability) && wizardData.serviceability.length > 0;
    const hasPriceChart = priceChart && typeof priceChart === 'object' && Object.keys(priceChart).length > 0;
    const hasZPM = zpm?.priceMatrix && Object.keys(zpm.priceMatrix).length > 0;

    console.log('[STEP 1] Data check:', {
      hasServiceabilityFromCSV: hasServiceabilityFromCSV ? `YES (${serviceabilityData.serviceability.length})` : 'NO',
      hasServiceabilityFromWizard: hasServiceabilityFromWizard ? `YES (${(wizardData?.serviceability || []).length})` : 'NO',
      hasPriceChart: hasPriceChart ? `YES (${Object.keys(priceChart).length} zones)` : 'NO',
      hasZPM: hasZPM ? 'YES' : 'NO',
    });

    // Ensure we have at least serviceability OR price chart
    if (!hasServiceabilityFromCSV && !hasServiceabilityFromWizard && !hasPriceChart && !hasZPM) {
      toast.error('[STEP 1 FAIL] Missing data: No CSV pincodes, no Wizard data, no price chart', { duration: 5000 });
      return;
    }

    // Validate (logs inside validateAll will tell us what failed)
    console.log('[STEP 2] Running validateAll...');
    const ok = validateAll();
    console.log('[STEP 2] validateAll result =', ok);
    if (!ok) {
      emitDebugError('VALIDATION_FAILED_ON_SUBMIT');
      toast.error('[STEP 2 FAIL] Form validation failed - check console for details', { duration: 5000 });
      return;
    }

    setIsSubmitting(true);

    // Show full-screen overlay loading immediately
    setShowSubmitOverlay(true);
    setSubmitOverlayStage('loading');

    try {
      console.log('[STEP 3] Building payload...');
      const payloadForApi = buildPayloadForApi();
      console.log('[STEP 3] Payload built OK, companyName =', payloadForApi.companyName);

      // UTSF MODE: Generate UTSF file instead of saving to cloud
      if (outputMode === 'utsf') {
        console.log('[STEP 4-UTSF] Generating UTSF file...');

        try {
          const utsf = await generateUTSF(payloadForApi);
          console.log('[STEP 4-UTSF] UTSF generated OK');

          // Validate
          const { isValid, errors } = validateUTSF(utsf);
          if (!isValid) {
            console.warn('[STEP 4-UTSF] Validation warnings:', errors);
            toast.error(`UTSF validation warnings: ${errors.join(', ')}`, { duration: 5000 });
          }

          // Show preview dialog
          setUtsfData(utsf);
          setShowUtsfPreview(true);
          setIsSubmitting(false);
          setShowSubmitOverlay(false);

          toast.success('UTSF file generated! Review and download below.', { duration: 3000 });
          return;
        } catch (error: any) {
          console.error('[STEP 4-UTSF FAIL]', error);
          toast.error(`[STEP 4] UTSF generation failed: ${error.message}`, { duration: 5000 });
          setIsSubmitting(false);
          setShowSubmitOverlay(false);
          return;
        }
      }

      // CLOUD / CLOUD+UTSF MODE: Save to cloud first
      console.log('[STEP 4-CLOUD] Building FormData...');

      // Debug: Log the 3 specific fields we're tracking
      console.log('📤 Sending Fields:', {
        contactPersonName: payloadForApi.contactPersonName || '(empty)',
        subVendor: payloadForApi.subVendor || '(empty)',
        codCharges: payloadForApi.prices?.priceRate?.codCharges,
        topayCharges: payloadForApi.prices?.priceRate?.topayCharges,
      });

      emitDebug('SUBMIT_PAYLOAD_FOR_API', payloadForApi);

      const fd = new FormData();
      fd.append('customerID', String(payloadForApi.customerID || ''));
      fd.append('companyName', payloadForApi.companyName);
      fd.append('contactPersonName', payloadForApi.contactPersonName);
      fd.append('vendorCode', payloadForApi.vendorCode);
      fd.append('vendorPhone', String(payloadForApi.vendorPhone));
      fd.append('vendorEmail', payloadForApi.vendorEmail);
      fd.append('gstNo', payloadForApi.gstNo);
      fd.append('transportMode', payloadForApi.transportMode);
      fd.append('serviceMode', payloadForApi.serviceMode || '');
      fd.append('address', payloadForApi.address);
      fd.append('state', payloadForApi.state);
      fd.append('pincode', String(payloadForApi.pincode));
      fd.append('city', payloadForApi.city);
      fd.append('rating', String(payloadForApi.rating));
      fd.append('vendorRatings', JSON.stringify(payloadForApi.vendorRatings));
      fd.append('subVendor', payloadForApi.subVendor || '');

      const volUnit = volumetric.state.unit || 'cm';
      fd.append('volumetricUnit', volUnit);
      fd.append('volumetricDivisor', String(volumetric.state.volumetricDivisor || ''));
      fd.append('cftFactor', String(volumetric.state.cftFactor || ''));
      fd.append('selectedZones', JSON.stringify(payloadForApi.selectedZones));
      fd.append('zoneConfigurations', JSON.stringify(payloadForApi.zoneConfigurations));
      fd.append('priceRate', JSON.stringify(payloadForApi.prices.priceRate));
      fd.append('priceChart', JSON.stringify(payloadForApi.prices.priceChart));
      if (priceChartFile) fd.append('priceChart', priceChartFile);

      if (payloadForApi.serviceability && payloadForApi.serviceability.length > 0) {
        fd.append('serviceability', JSON.stringify(payloadForApi.serviceability));
        fd.append('serviceabilityChecksum', payloadForApi.serviceabilityChecksum || '');
        fd.append('serviceabilitySource', payloadForApi.serviceabilitySource || 'excel');
      }

      fd.append('vendorJson', JSON.stringify(payloadForApi));

      const token = getAuthToken();
      const url = `${API_BASE}/api/transporter/addtiedupcompanies`;
      console.log('[STEP 5] Sending cloud save to', url, '| hasToken:', !!token);

      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      const json = await res.json().catch(() => ({} as any));
      console.log('[STEP 5] Cloud response:', res.status, json?.success, json?.message);

      if (!res.ok || !json?.success) {
        emitDebugError('SUBMIT_ERROR', { status: res.status, json });
        toast.error(`[STEP 5 FAIL] Cloud save failed (${res.status}): ${json?.message || 'Unknown error'}`, {
          duration: 5200,
        });
        setIsSubmitting(false);
        setShowSubmitOverlay(false);
        return;
      }

      toast.success('Vendor created successfully!', { duration: 800 });
      console.log('[STEP 5] Cloud save OK!');

      // Cloud+UTSF mode: also generate and upload UTSF after successful cloud save
      if (outputMode === 'cloud+utsf') {
        console.log('[STEP 6] Starting UTSF generation for cloud+utsf mode...');
        try {
          const utsf = await generateUTSF(payloadForApi);
          console.log('[STEP 6] UTSF generated OK, stats:', utsf.stats);

          // Use the ID from the cloud response if available
          if (json?.data?._id) {
            utsf.meta.id = json.data._id;
            console.log('[STEP 6] Set UTSF ID from cloud response:', json.data._id);
          } else {
            console.log('[STEP 6] No _id in cloud response, UTSF will get auto-ID. Response data keys:', Object.keys(json?.data || json || {}));
          }

          console.log('[STEP 7] Uploading UTSF to /api/utsf/upload-json...');
          const utsfToken = getAuthToken();
          const utsfRes = await fetch(`${API_BASE}/api/utsf/upload-json`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${utsfToken}`
            },
            body: JSON.stringify(utsf)
          });

          console.log('[STEP 7] UTSF upload response:', utsfRes.status, utsfRes.statusText);

          if (utsfRes.ok) {
            const utsfJson = await utsfRes.json().catch(() => ({}));
            console.log('[STEP 7] UTSF upload OK:', utsfJson);
            toast.success('UTSF file also saved to server!', { duration: 3000 });
          } else {
            const utsfErr = await utsfRes.json().catch(() => ({ message: utsfRes.statusText }));
            console.error('[STEP 7 FAIL] UTSF upload failed:', utsfRes.status, utsfErr);
            toast(`[STEP 7] UTSF upload failed (${utsfRes.status}): ${utsfErr?.message || 'Unknown'}`, { icon: '⚠️', duration: 6000 });
          }
        } catch (utsfError: any) {
          console.error('[STEP 6 FAIL] UTSF error:', utsfError);
          toast(`[STEP 6] UTSF failed: ${utsfError.message}`, { icon: '⚠️', duration: 6000 });
        }
      }

      // show success tick in overlay
      setSubmitOverlayStage('success');

      // reset the form as you already do
      clearDraft();
      clearWizard();
      localStorage.removeItem(ZPM_KEY);
      try {
        if (typeof vendorBasics.reset === 'function') vendorBasics.reset();
        if (typeof pincodeLookup.reset === 'function') pincodeLookup.reset();
        if (typeof volumetric.reset === 'function') volumetric.reset();
        if (typeof charges.reset === 'function') charges.reset();
      } catch (err) {
        emitDebugError('RESET_HOOKS_ERROR', { err });
      }
      setPriceChartFile(null);
      setTransportMode('road');
      setInvoicePercentage('');
      setInvoiceMinAmount('');
      setInvoiceUseMax(false);
      setInvoiceManualOverride(false);
      setZpm(null);
      setWizardValidation(null);
      setWizardStatus(null);
      setRefreshTrigger((x) => x + 1);
      setLegalCompanyNameInput('');
      setIsAutoFilled(false);
      setAutoFilledFromName(null);
      setAutoFilledFromId(null);
      setSuggestions([]);
      setServiceabilityData(null);  // ✅ NEW: Reset serviceability data
      // trigger smooth scroll to top (ScrollToTop listens on this)
      setScrollKey(Date.now());
    } catch (err) {
      emitDebugError('SUBMIT_EXCEPTION', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      toast.error('Unexpected error. Please try again.', { duration: 5200 });
      setShowSubmitOverlay(false); // 👈 hide overlay on unexpected exception
    } finally {
      setIsSubmitting(false);
      // NOTE: Do not auto-hide overlay here — success state should show until user clicks action.
    }
  };




  // ===== Reset =====
  const handleReset = () => {
    if (!confirm('Reset the form? Unsaved changes will be lost.')) return;
    try {
      if (typeof vendorBasics.reset === 'function') vendorBasics.reset();
      if (typeof pincodeLookup.reset === 'function') pincodeLookup.reset();
      if (typeof volumetric.reset === 'function') volumetric.reset();
      if (typeof charges.reset === 'function') charges.reset();
    } catch (err) {
      emitDebugError('RESET_HOOKS_ERROR', { err });
    }
    setPriceChartFile(null);
    setTransportMode('road');
    setInvoicePercentage('');
    setInvoiceMinAmount('');
    setInvoiceUseMax(false);
    setInvoiceManualOverride(false);
    setLegalCompanyNameInput('');
    setIsAutoFilled(false);
    setAutoFilledFromName(null);
    setAutoFilledFromId(null);
    setSuggestions([]);
    setServiceabilityData(null);  // ✅ NEW: Reset serviceability data
    clearDraft();
    clearWizard(); // ADD THIS
    toast.success('Form reset', { duration: 1200 });
  };

  // ========================================================================
  // PAGE UI (your preferred UI)
  // ========================================================================
  return (
    <div
      ref={topRef}
      className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200"
    >
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 backdrop-blur bg-white/70 border-b border-slate-200">
        <div className="w-full px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white grid place-items-center font-bold shadow-sm">
              F
            </div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Add Vendor</h1>
              <p className="text-xs text-slate-600">
                Freight Cost Calculator · Transporter Setup
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-8 py-6">
        <form id="add-vendor-form" onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 gap-0 divide-y divide-slate-200">
              <div className="p-6 md:p-8">
                {/* VENDOR AUTOCOMPLETE SECTION */}
                <div className="p-6 md:p-8 bg-gradient-to-r from-blue-50 to-slate-50">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Search className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-slate-900">Quick Lookup</h3>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">NEW</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleReset}
                        className="px-4 py-2 rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300"
                      >
                        Reset
                      </button>
                      <button
                        type="submit"
                        form="add-vendor-form"
                        disabled={isSubmitting}
                        className={`px-4 py-2 rounded-lg text-white disabled:opacity-50 ${
                          outputMode === 'cloud' ? 'bg-blue-600 hover:bg-blue-700' :
                          outputMode === 'cloud+utsf' ? 'bg-emerald-600 hover:bg-emerald-700' :
                          'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        {isSubmitting ? 'Saving…' :
                         outputMode === 'cloud' ? 'Save to Cloud' :
                         outputMode === 'cloud+utsf' ? 'Cloud + UTSF' :
                         'Generate UTSF'}
                      </button>
                    </div>
                  </div>

                  <div ref={dropdownRef} className="relative max-w-2xl">
                    <div className="relative">
                      <input
                        type="text"
                        value={legalCompanyNameInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          setLegalCompanyNameInput(value);
                          setIsAutoFilled(false);

                          // Show loading immediately if query is long enough
                          if (value.length >= 2) {
                            setIsSearching(true);
                          }

                          searchTransporters(value);
                        }}
                        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                        onKeyDown={(e) => {
                          if (!showDropdown || !suggestions.length) return;
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setHighlightedIndex(p => p < suggestions.length - 1 ? p + 1 : 0);
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setHighlightedIndex(p => p > 0 ? p - 1 : suggestions.length - 1);
                          } else if (e.key === 'Enter' && highlightedIndex >= 0) {
                            e.preventDefault();
                            handleVendorAutoSelect(suggestions[highlightedIndex]);
                          } else if (e.key === 'Escape') {
                            setShowDropdown(false);
                          }
                        }}
                        placeholder="Search existing transporters or enter new company name..."
                        className={`w-full px-4 py-3.5 pl-12 pr-10 border-2 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 ${isAutoFilled ? 'border-green-400 bg-green-50' : 'border-slate-300 hover:border-slate-400'}`}
                      />
                      <div className="absolute left-4 top-1/2 -translate-y-1/2">
                        {isSearching ? <Loader2 className="w-5 h-5 text-blue-500 animate-spin" /> : isAutoFilled ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Search className="w-5 h-5 text-slate-400" />}
                      </div>
                    </div>

                    {showDropdown && suggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-2 bg-white border-2 border-slate-200 rounded-xl shadow-2xl overflow-hidden max-h-72">
                        <div className="px-4 py-2 border-b bg-slate-50 text-xs font-semibold text-slate-600">
                          {suggestions.length} transporter{suggestions.length !== 1 ? 's' : ''} found
                        </div>
                        <div className="overflow-y-auto max-h-60">
                          {suggestions.map((v, i) => (
                            <button
                              key={v.id}
                              type="button"
                              onClick={() => handleVendorAutoSelect(v)}
                              onMouseEnter={() => setHighlightedIndex(i)}
                              className={`w-full px-4 py-3 text-left flex items-center gap-3 border-b border-slate-100 ${highlightedIndex === i ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                            >
                              <Building2 className={`w-8 h-8 p-1.5 rounded-lg text-white ${highlightedIndex === i ? 'bg-blue-500' : 'bg-slate-400'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{v.legalCompanyName || v.companyName}</p>
                                <div className="flex gap-1.5 mt-1">
                                  {v.vendorCode && <span className="text-xs px-1.5 py-0.5 bg-slate-100 rounded">{v.vendorCode}</span>}
                                  {v.zones?.length > 0 && <span className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 rounded">{v.zones.length} zones</span>}
                                </div>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded ${highlightedIndex === i ? 'bg-blue-500 text-white' : 'bg-slate-100'}`}>Select</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isAutoFilled && <p className="mt-2 text-xs text-slate-500">💡 Type 2+ characters to search existing transporters</p>}

                  {isAutoFilled && (
                    <div className="mt-3 flex items-center justify-between bg-green-100 border border-green-300 px-4 py-3 rounded-xl text-green-800">
                      <span><CheckCircle2 className="w-4 h-4 inline mr-2" />Auto-filled from <strong>{autoFilledFromName}</strong>. Fill in prices.</span>
                      <button type="button" onClick={clearAutoFill} className="text-xs underline">Clear</button>
                    </div>
                  )}
                </div>

                <CompanySection
                  vendorBasics={vendorBasics}
                  pincodeLookup={pincodeLookup}
                />
              </div>

              {/* Vendor Rating Section */}
              <div className="p-6 md:p-8 bg-slate-50/60">
                <VendorRating
                  ratings={vendorBasics.basics.vendorRatings || {
                    priceSupport: 0,
                    deliveryTime: 0,
                    tracking: 0,
                    salesSupport: 0,
                    damageLoss: 0,
                  }}
                  onChange={(field, value) => vendorBasics.setVendorRating(field, value)}
                  errors={{}}
                />
              </div>

              <div className="p-6 md:p-8">
                <TransportSection
                  volumetric={volumetric}
                  transportMode={transportMode}
                  onTransportModeChange={(m) => setTransportMode(m)}
                />
              </div>

              <div className="p-6 md:p-8">
                <ChargesSection charges={charges} />
              </div>

              {/* Invoice Value Charges Section (Placed Intelligently here) */}
              {showInvoiceSection && (
                <div className="p-6 md:p-8 bg-slate-50/60 border-t border-slate-200">
                  <div className="w-full">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-slate-900">
                        Invoice Value Configuration
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Percentage Input */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Invoice Value Percentage (%)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={invoicePercentage}
                            onChange={(e) => {
                              // Allow numbers and one dot
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              if ((val.match(/\./g) || []).length <= 1) {
                                setInvoicePercentage(val);
                                setInvoiceManualOverride(true);
                              }
                            }}
                            placeholder="0.00"
                            className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 pl-3 pr-8"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-slate-400 text-sm">%</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Numeric values only.</p>
                      </div>

                      {/* Min Amount Input */}
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Minimum Amount (₹)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={invoiceMinAmount}
                            onChange={(e) => {
                              const val = sanitizeDigitsOnly(e.target.value);
                              setInvoiceMinAmount(val);
                              setInvoiceManualOverride(true);
                            }}
                            placeholder="0"
                            className="w-full rounded-lg border-slate-300 focus:border-blue-500 focus:ring-blue-500 pl-3 pr-8"
                          />
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-slate-400 text-sm">₹</span>
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Numeric values only.</p>
                      </div>
                    </div>

                    {/* UI Matching Toggle */}
                    <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex-1">
                        <span className="text-sm font-semibold text-slate-900">Calculation Method</span>
                        <p className="text-xs text-slate-500 mt-1">
                          Use the maximum of the percentage value and the minimum amount?
                        </p>
                      </div>
                      <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setInvoiceUseMax(true)}
                          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all shadow-sm ${invoiceUseMax ? 'bg-white text-blue-600 ring-1 ring-black/5' : 'bg-transparent text-slate-500 hover:text-slate-700 shadow-none'
                            }`}
                        >
                          Yes, Use Max
                        </button>
                        <button
                          type="button"
                          onClick={() => setInvoiceUseMax(false)}
                          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all shadow-sm ${!invoiceUseMax ? 'bg-white text-slate-900 ring-1 ring-black/5' : 'bg-transparent text-slate-500 hover:text-slate-700 shadow-none'
                            }`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Zone Price Matrix section with validation */}
              <div className="p-6 md:p-8 bg-slate-50/60">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  {/* Header with mode toggle */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <h3 className="text-lg font-semibold text-slate-900">
                      Serviceability & Pricing
                    </h3>

                    {/* Mode Toggle - 4 options with Pincode Upload as default */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setZoneConfigMode('pincode')}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${zoneConfigMode === 'pincode'
                          ? 'bg-white text-green-600 shadow-sm ring-1 ring-black/5'
                          : 'bg-transparent text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 inline mr-1" />
                        Pincode Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoneConfigMode('wizard')}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${zoneConfigMode === 'wizard'
                          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                          : 'bg-transparent text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        <MapPin className="w-3.5 h-3.5 inline mr-1" />
                        Wizard
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoneConfigMode('auto')}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${zoneConfigMode === 'auto'
                          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                          : 'bg-transparent text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                        Auto Assign
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoneConfigMode('upload')}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-all ${zoneConfigMode === 'upload'
                          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                          : 'bg-transparent text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        <Upload className="w-3.5 h-3.5 inline mr-1" />
                        Zone CSV
                      </button>
                    </div>
                  </div>

                  {/* NEW: Pincode Upload Mode (RECOMMENDED - PINCODE AUTHORITATIVE) */}
                  {zoneConfigMode === 'pincode' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-green-900">
                              Recommended: Pincode-Authoritative Upload
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                              Upload your pincode list. Zones are auto-assigned from our master database.
                              <br />
                              <strong>This is the most reliable method</strong> - pincodes are the source of truth, zones are derived automatically.
                            </p>
                          </div>
                        </div>
                      </div>

                      <ServiceabilityUpload
                        onServiceabilityReady={handleServiceabilityReady}
                        onError={(errors) => {
                          console.error('[ServiceabilityUpload] Errors:', errors);
                        }}
                      />

                      {/* Show status after upload */}
                      {serviceabilityData && serviceabilityData.serviceability.length > 0 && (
                        <div className="mt-4 p-4 rounded-lg border-2 border-green-300 bg-green-50">
                          <div className="flex items-center gap-3">
                            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-900">
                                Serviceability Ready: {serviceabilityData.serviceability.length} pincodes
                              </p>
                              <p className="text-xs text-green-700">
                                {serviceabilityData.zoneSummary.length} zones detected • Checksum: {serviceabilityData.checksum}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Wizard Mode Content */}
                  {zoneConfigMode === 'wizard' && (
                    <>
                      {/* Wizard Actions */}
                      <div className="flex gap-2 mb-4">
                        <button
                          type="button"
                          onClick={() => navigate('/zone-price-matrix')}
                          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${isAutoFilled && wizardStatus?.hasPriceMatrix
                              ? 'bg-gradient-to-r from-blue-600 to-green-600 text-white hover:from-blue-700 hover:to-green-700 shadow-lg animate-pulse ring-2 ring-green-400 ring-offset-2'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                          {wizardStatus?.hasPriceMatrix ? 'Edit Wizard' : 'Open Wizard'}
                        </button>
                        <button
                          type="button"
                          onClick={loadZoneData}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 transition-colors"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Reload Data
                        </button>
                      </div>

                      {/* Status Display */}
                      <div className="space-y-3">
                        {/* Primary Status */}
                        <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 bg-slate-50">
                          {wizardStatus?.hasPriceMatrix ? (
                            <>
                              <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-green-900">
                                  Zone data loaded ({matrixSize.rows}×{matrixSize.cols})
                                </p>
                                <p className="text-xs text-green-700">
                                  {wizardStatus.zoneCount} zones configured
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <XCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-red-900">
                                  No zone data configured
                                </p>
                                <p className="text-xs text-red-700">
                                  Open the wizard or upload a CSV to configure zones
                                </p>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Validation Errors */}
                        {wizardValidation &&
                          !wizardValidation.isValid &&
                          wizardValidation.errors.length > 0 && (
                            <div className="p-4 rounded-lg border-2 border-red-300 bg-red-50">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-red-900 mb-2">
                                    Configuration Issues:
                                  </p>
                                  <ul className="space-y-1 text-sm text-red-800">
                                    {wizardValidation.errors.map((error, idx) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <span className="text-red-600 mt-0.5">•</span>
                                        <span>{error}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}

                        {/* Validation Warnings */}
                        {wizardValidation &&
                          wizardValidation.isValid &&
                          wizardValidation.warnings.length > 0 && (
                            <div className="p-4 rounded-lg border-2 border-yellow-300 bg-yellow-50">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-yellow-900 mb-2">
                                    Warnings:
                                  </p>
                                  <ul className="space-y-1 text-sm text-yellow-800">
                                    {wizardValidation.warnings.map((warning, idx) => (
                                      <li key={idx} className="flex items-start gap-2">
                                        <span className="text-yellow-600 mt-0.5">•</span>
                                        <span>{warning}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}

                        {/* Success State */}
                        {wizardValidation &&
                          wizardValidation.isValid &&
                          wizardValidation.warnings.length === 0 &&
                          wizardStatus?.hasPriceMatrix && (
                            <div className="p-4 rounded-lg border-2 border-green-300 bg-green-50">
                              <div className="flex items-center gap-3">
                                <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                                <p className="text-sm text-green-800">
                                  Configuration is complete and valid
                                </p>
                              </div>
                            </div>
                          )}

                        {/* Progress Bar */}
                        {wizardStatus && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-slate-700">
                                Configuration Progress
                              </span>
                              <span className="text-xs font-semibold text-slate-900">
                                {wizardStatus.hasPriceMatrix ? 100 : wizardStatus.completionPercentage}%
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-blue-600 to-green-600 transition-all duration-500"
                                style={{
                                  width: `${wizardStatus.hasPriceMatrix ? 100 : wizardStatus.completionPercentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Info Note */}
                        <p className="text-xs text-slate-600 leading-relaxed">
                          The wizard saves data in your browser under{' '}
                          <code className="px-1.5 py-0.5 bg-slate-100 rounded font-mono text-slate-800">
                            vendorWizard.v1
                          </code>
                          . After configuring zones and pricing, click{' '}
                          <strong className="text-slate-900">Reload Data</strong> to load it
                          here.
                        </p>
                      </div>
                    </>
                  )}

                  {/* Upload Mode Content */}
                  {zoneConfigMode === 'upload' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <FileSpreadsheet className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-amber-900">
                              Don't have an existing vendor to copy from?
                            </p>
                            <p className="text-xs text-amber-700 mt-1">
                              Upload a CSV/Excel file with your pincode-to-zone mappings.
                              We'll auto-configure zones and create an empty price matrix for you to fill in.
                            </p>
                          </div>
                        </div>
                      </div>

                      <ZoneMappingUpload
                        onDataParsed={handleZoneMappingUpload}
                        blankCellValue={0}
                      />

                      {/* Show status after upload */}
                      {wizardStatus?.hasPriceMatrix && (
                        <div className="mt-4 p-4 rounded-lg border-2 border-green-300 bg-green-50">
                          <div className="flex items-center gap-3">
                            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-900">
                                Zone data loaded ({matrixSize.rows}×{matrixSize.cols})
                              </p>
                              <p className="text-xs text-green-700">
                                {wizardStatus.zoneCount} zones configured from upload.
                                <button
                                  type="button"
                                  onClick={() => navigate('/zone-price-matrix')}
                                  className="ml-1 underline hover:no-underline"
                                >
                                  Open wizard to fill prices →
                                </button>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Auto Assign Mode Content */}
                  {zoneConfigMode === 'auto' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-blue-900">
                              Auto Zone Assignment
                            </p>
                            <p className="text-xs text-blue-700 mt-1">
                              Select zones and we'll automatically assign cities/states based on official zone rules.
                              <br />
                              <strong>Limited zones (X1)</strong>: Only specific metro cities.
                              <strong className="ml-2">Full zones (X2, X3...)</strong>: All cities in states.
                            </p>
                          </div>
                        </div>
                      </div>

                      <ZoneSelectionWizard
                        onComplete={handleZoneSelectionComplete}
                        blankCellValue={0}
                      />

                      {/* Show status after auto-assign */}
                      {wizardStatus?.hasPriceMatrix && (
                        <div className="mt-4 p-4 rounded-lg border-2 border-green-300 bg-green-50">
                          <div className="flex items-center gap-3">
                            <CheckCircleIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-green-900">
                                Zone data loaded ({matrixSize.rows}×{matrixSize.cols})
                              </p>
                              <p className="text-xs text-green-700">
                                {wizardStatus.zoneCount} zones auto-configured.
                                <button
                                  type="button"
                                  onClick={() => navigate('/zone-price-matrix')}
                                  className="ml-1 underline hover:no-underline"
                                >
                                  Open wizard to fill prices →
                                </button>
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Keep file upload for CSV/Excel import */}
              <div className="p-6 md:p-8">
                <PriceChartUpload
                  file={priceChartFile}
                  onFileChange={setPriceChartFile}
                />
              </div>

              {/* Save Mode Selector + Footer actions */}
              <div className="p-6 md:p-8 space-y-4">
                {/* Three-way save mode selector */}
                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <span className="text-sm font-medium text-gray-700 mr-1">Save Mode:</span>
                  <button
                    type="button"
                    onClick={() => setOutputMode('cloud')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      outputMode === 'cloud'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    <UploadCloud className="w-4 h-4 inline mr-1.5" />
                    Save to Cloud
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutputMode('cloud+utsf')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      outputMode === 'cloud+utsf'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 inline mr-1.5" />
                    Cloud + UTSF
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutputMode('utsf')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      outputMode === 'utsf'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                    }`}
                  >
                    <FileText className="w-4 h-4 inline mr-1.5" />
                    UTSF Only
                  </button>
                  {outputMode !== 'cloud' && (
                    <span className="text-xs text-indigo-700 bg-indigo-100 px-3 py-1 rounded-full ml-auto">
                      {outputMode === 'cloud+utsf' ? 'Saves to both cloud & UTSF file' : 'Compact single-file format (90% smaller)'}
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-5 py-3 bg-slate-200 text-slate-800 font-medium rounded-xl hover:bg-slate-300 transition-colors"
                  >
                    <span className="inline-flex items-center gap-2">
                      <XCircleIcon className="w-5 h-5" />
                      Reset Form
                    </span>
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (wizardValidation && !wizardValidation.isValid)}
                    className={`px-5 py-3 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                      outputMode === 'cloud' ? 'bg-blue-600 hover:bg-blue-700' :
                      outputMode === 'cloud+utsf' ? 'bg-emerald-600 hover:bg-emerald-700' :
                      'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon className="w-5 h-5" />
                          {outputMode === 'cloud' ? 'Save to Cloud' :
                           outputMode === 'cloud+utsf' ? 'Save Cloud + UTSF' :
                           'Generate UTSF'}
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>


      </div>

      {/* Full-screen submit overlay */}
      {showSubmitOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl px-10 py-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm w-[90%]">
            {submitOverlayStage === 'loading' ? (
              <>
                <div className="w-16 h-16 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
                <p className="text-sm text-slate-700 font-medium">
                  Creating vendor, please wait…
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircleIcon className="w-10 h-10 text-green-600" />
                </div>
                <p className="text-sm text-slate-800 font-semibold">
                  Vendor added successfully!
                </p>
                <p className="text-xs text-slate-500">
                  Add another vendor?
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      // overlay is already on success, form already reset
                      setShowSubmitOverlay(false);
                      // ensure we’re at the top
                      setScrollKey(Date.now());
                    }}
                    className="mt-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                  >
                    Add another vendor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSubmitOverlay(false);
                      navigate('/my-vendors');
                    }}
                    className="mt-1 px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium hover:bg-slate-50"
                  >
                    Go to Vendor list
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Smooth scroll helper after success */}
      <ScrollToTop targetRef={topRef} when={scrollKey} offset={80} />

      {/* UTSF Preview Dialog */}
      {showUtsfPreview && utsfData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-50 to-blue-50">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">UTSF File Preview</h2>
                <p className="text-sm text-slate-600">
                  {utsfData.meta.companyName} • v{utsfData.version} • {(JSON.stringify(utsfData).length / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => setShowUtsfPreview(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Stats Summary */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{utsfData.stats.totalPincodes.toLocaleString()}</div>
                  <div className="text-xs text-slate-600">Pincodes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{utsfData.stats.totalZones}</div>
                  <div className="text-xs text-slate-600">Zones</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{utsfData.stats.avgCoveragePercent}%</div>
                  <div className="text-xs text-slate-600">Avg Coverage</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{utsfData.stats.odaCount}</div>
                  <div className="text-xs text-slate-600">ODA Pincodes</div>
                </div>
              </div>
            </div>

            {/* JSON Preview */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <pre className="text-xs font-mono bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                {JSON.stringify(utsfData, null, 2)}
              </pre>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="text-xs text-slate-600">
                Validation: {validateUTSF(utsfData).isValid ? (
                  <span className="text-green-600 font-medium">✓ Valid</span>
                ) : (
                  <span className="text-red-600 font-medium">⚠ {validateUTSF(utsfData).errors.length} warnings</span>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUtsfPreview(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => downloadUTSF(utsfData)}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download UTSF
                </button>
                <button
                  onClick={async () => {
                    try {
                      const token = getAuthToken();
                      const response = await fetch(`${API_BASE}/api/utsf/upload-json`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(utsfData)
                      });

                      if (response.ok) {
                        toast.success('UTSF uploaded to server successfully!', { duration: 3000 });
                        setShowUtsfPreview(false);
                        setRefreshTrigger(prev => prev + 1); // Refresh vendor list
                      } else {
                        const error = await response.json();
                        toast.error(`Upload failed: ${error.message || response.statusText}`, { duration: 5000 });
                      }
                    } catch (error) {
                      toast.error(`Upload failed: ${error.message}`, { duration: 5000 });
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  Upload to Server
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddVendor;
