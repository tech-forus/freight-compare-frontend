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
import ZoneSelectionWizard from '../components/ZoneSelectionWizard';
import DebugFloat from '../components/DebugFloat';
import ServiceabilityUpload from '../components/ServiceabilityUpload';
import type { ServiceabilityEntry, ZoneSummary } from '../components/ServiceabilityUpload';
import ZonePriceMatrixComponent from '../components/ZonePriceMatrixComponent';

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


// Icons (consolidated)
import {
  CheckCircleIcon,
  XCircleIcon,
  AlertTriangle,
  RefreshCw,
  FileText,
  EyeIcon,
  Save,
  ChevronRight,
  Loader2,
  Building2,
  Search,
  ChevronDown,
  CheckCircle2,
  MapPin,
  Tag,
  FileSpreadsheet,
  Upload,
  Sparkles,
  Cloud as CloudIcon,
  FileDown
} from 'lucide-react';

// Optional email validator
import isEmail from 'isemail';

// ScrollToTop helper (smooth scroll to ref when `when` changes)
import ScrollToTop from '../components/ScrollToTop';
import { VendorStepBar } from '../components/VendorStepBar';
import { VendorSidePanel } from '../components/VendorSidePanel';

import { debounce } from 'lodash';
import { motion, AnimatePresence } from 'framer-motion';

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
/** Lightweight search result for dropdown display */
interface VendorSearchResult {
  id: string;
  source: 'public' | 'temporary';
  isTemporary: boolean;
  companyName: string;
  legalCompanyName: string;
  displayName: string;
  vendorCode: string;
  rating: number;
  zones: string[];
}

/** Full vendor data returned by detail endpoint (used for autofill) */
interface VendorSuggestion {
  id: string;
  source?: string;
  isTemporary?: boolean;
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
  mode?: string;
  serviceMode?: string;
  rating: number;
  zones: string[];
  zoneConfigs?: Array<{
    zoneCode: string;
    zoneName: string;
    region: string;
    selectedStates: string[];
    selectedCities: string[];
    isComplete: boolean;
  }>;
  zoneMatrixStructure: Record<string, Record<string, string>>;
  volumetricUnit: string;
  divisor: number;
  cftFactor: number | null;
  charges?: Record<string, any>;
  priceChart?: Record<string, Record<string, number>>;
  invoiceValueCharges?: Record<string, any>;
  serviceability?: Array<{
    pincode: string;
    zone: string;
    state: string;
    city: string;
    isODA?: boolean;
    active?: boolean;
  }>;
  serviceabilityChecksum?: string;
  serviceabilitySource?: string;
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
  const [debugLogs] = useState<string[]>([]);

  // Invoice Value State (New)
  const [invoicePercentage, setInvoicePercentage] = useState<string>('');
  const [invoiceMinAmount, setInvoiceMinAmount] = useState<string>('');
  const [invoiceUseMax, setInvoiceUseMax] = useState<boolean>(false);
  const [invoiceManualOverride, setInvoiceManualOverride] = useState<boolean>(false);
  const [showInvoiceSection, setShowInvoiceSection] = useState<boolean>(false);

  // Save Mode: 'cloud' | 'cloud_utsf' | 'utsf' | 'draft' | 'active'
  const [saveMode, setSaveMode] = useState<'cloud' | 'cloud_utsf' | 'utsf' | 'draft' | 'active'>('active');

  // Zone Price Matrix (from wizard/localStorage)
  const [zpm, setZpm] = useState<ZonePriceMatrixLS | null>(null);

  // Zone configuration mode: 'wizard', 'upload', 'auto', or 'pincode' (new pincode-authoritative mode)
  const [zoneConfigMode, setZoneConfigMode] = useState<'wizard' | 'upload' | 'auto' | 'pincode' | 'matrix'>('pincode');

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
  // STEP WORKFLOW STATE
  // ============================================================================
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [vendorMode, setVendorMode] = useState<'existing' | 'new_with_pincodes' | 'new_without_pincodes' | null>(null);

  const goToStep = useCallback((step: 1 | 2 | 3 | 4) => {
    setCurrentStep(step);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const goNext = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, 4) as 1 | 2 | 3 | 4);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const goBack = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 1) as 1 | 2 | 3 | 4);
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // ============================================================================
  // VENDOR AUTOCOMPLETE STATE
  // ============================================================================
  const [suggestions, setSuggestions] = useState<VendorSearchResult[]>([]);
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

  // Search function (debounced) - returns lightweight results for dropdown
  const searchTransporters = useMemo(
    () =>
      debounce(async (query: string) => {
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

          console.time('[Search] API call');
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            signal: abortControllerRef.current.signal
          });
          console.timeEnd('[Search] API call');

          if (!response.ok) throw new Error(`Search failed: ${response.status}`);

          const data = await response.json();
          if (data.meta?.timeMs) {
            console.log(`[Search] Backend took ${data.meta.timeMs}ms`);
          }

          if (data.success && data.data?.length > 0) {
            setSuggestions(data.data);
            setShowDropdown(true);
          } else {
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
          setIsSearching(false);
        }
      }, 200),  // Reduced from 300ms - search is now lightweight
    []
  );

  // Auto-select handler: fetches full detail, then auto-fills form
  const handleVendorAutoSelect = useCallback(
    (searchResult: VendorSearchResult) => {
      console.log('[AutoFill] selecting vendor (lightweight):', searchResult.id, searchResult.companyName);

      // Close dropdown immediately for responsive feel
      setShowDropdown(false);
      setHighlightedIndex(-1);

      (async () => {
        try {
          // Step 1: Fetch full vendor detail from new endpoint
          const token = getAuthToken();
          const customerID = getCustomerIDFromToken();
          const detailUrl = `${API_BASE}/api/transporter/search-transporters/${searchResult.id}?source=${encodeURIComponent(searchResult.source)}&customerID=${encodeURIComponent(customerID)}`;

          console.time('[AutoFill] detail-fetch');
          const detailRes = await fetch(detailUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          console.timeEnd('[AutoFill] detail-fetch');

          if (!detailRes.ok) throw new Error(`Detail fetch failed: ${detailRes.status}`);

          const detailData = await detailRes.json();
          if (!detailData.success || !detailData.data) {
            throw new Error('No detail data returned');
          }

          const vendor = detailData.data as VendorSuggestion;

          // Step 2: Apply autofill with full data
          await applyVendorAutofill(vendor, { blankCellValue: '' });

          // UI bookkeeping (AFTER autofill completes)
          setIsAutoFilled(true);
          setAutoFilledFromName(
            vendor.displayName || vendor.companyName || vendor.legalCompanyName || ''
          );
          setAutoFilledFromId(vendor.id || null);
          setSuggestions([]);

          // Auto-select Wizard and switch to matrix if data exists
          if ((vendor.zones && vendor.zones.length > 0) || (vendor.zoneMatrixStructure && Object.keys(vendor.zoneMatrixStructure).length > 0)) {
            setZoneConfigMode('matrix');
          } else {
            // Even if zones are initially empty, we might have successfully autofilled serviceability
            // which will generate zones. So we FORCE matrix mode here to meet user request "show matrix directly".
            setZoneConfigMode('matrix');
          }

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
      setZoneConfigMode('matrix');
    }
  }, [wizardData]);

  // ROBUST AUTO-SWITCH: If we have zones (and auto-filled), go to matrix
  useEffect(() => {
    if (isAutoFilled && wizardData.zones && wizardData.zones.length > 0) {
      if (zoneConfigMode !== 'matrix') {
        console.log('[AutoSwitch] Switching to Matrix mode because zones are loaded');
        setZoneConfigMode('matrix');
      }
    }
  }, [isAutoFilled, wizardData.zones, zoneConfigMode]);

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

      // Switch to Price Matrix mode immediately
      setZoneConfigMode('matrix');

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

    // ✅ Set default save mode to "Cloud + UTSF" as recommended
    setSaveMode('cloud_utsf');

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
      const fixedVal = rov.fixedAmount ?? (rov as any).fixed ?? (rov as any).fixedRate ?? 0;
      const fixedStr = String(Number(fixedVal) || 0);
      setInvoiceMinAmount(fixedStr);
      setInvoicePercentage('0.0001');
      setInvoiceUseMax(true);
    } else if (mode === 'VARIABLE') {
      // when ROV is variable -> invoice percentage := rov variable, min := 0, useMax := true
      const varVal = rov.variableRange ?? (rov as any).variable ?? (rov as any).variablePct ?? (rov as any).variablePercent ?? '';
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

    // Vendor rating validation removed


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
    const rating = Number(basics.companyRating) || 4;

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

    // Calculate priceChart first before validation
    const priceChart = (wizardData?.priceMatrix || zpm?.priceMatrix || {}) as Record<string, Record<string, number>>;

    // Validate serviceability is loaded BEFORE building payload
    const hasServiceabilityFromCSV = serviceabilityData?.serviceability && Array.isArray(serviceabilityData.serviceability) && serviceabilityData.serviceability.length > 0;
    const hasServiceabilityFromWizard = wizardData?.serviceability && Array.isArray(wizardData.serviceability) && wizardData.serviceability.length > 0;
    const hasPriceChart = priceChart && typeof priceChart === 'object' && Object.keys(priceChart).length > 0;
    const hasZPM = zpm?.priceMatrix && Object.keys(zpm.priceMatrix).length > 0;

    console.log('[SUBMIT] Serviceability status check:', {
      hasServiceabilityFromCSV: hasServiceabilityFromCSV ? `✅ ${serviceabilityData!.serviceability.length} pincodes` : '❌ No CSV data',
      hasServiceabilityFromWizard: hasServiceabilityFromWizard ? `✅ ${(wizardData?.serviceability || []).length} pincodes` : '❌ No Wizard data',
      hasPriceChart: hasPriceChart ? '✅ Yes' : '❌ No',
      hasZPM: hasZPM ? '✅ Yes' : '❌ No',
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

    // Show full-screen overlay loading immediately
    setIsSubmitting(true);
    setShowSubmitOverlay(true);
    setSubmitOverlayStage('loading');

    try {
      console.log('[STEP 3] Building payload...');
      const payloadForApi = buildPayloadForApi();

      // Debug: Log the fields we're tracking
      console.log('📤 Sending Fields:', {
        contactPersonName: payloadForApi.contactPersonName || '(empty)',
        subVendor: payloadForApi.subVendor || '(empty)',
        codCharges: payloadForApi.prices?.priceRate?.codCharges,
        topayCharges: payloadForApi.prices?.priceRate?.topayCharges,
      });

      emitDebug('SUBMIT_PAYLOAD_FOR_API', payloadForApi);

      // ========== CLOUD SAVE ==========
      if (['cloud', 'cloud_utsf', 'active', 'draft'].includes(saveMode)) {
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

        // Volumetric fields
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
        emitDebug('SUBMITTING_TO_API', { url, hasToken: !!token });
        console.log(`[SUBMIT] Saving to Cloud (Mode: ${saveMode})`);

        const res = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });

        const json = await res.json().catch(() => ({} as any));
        emitDebug('API_RESPONSE', { status: res.status, json });

        if (!res.ok || !json?.success) {
          emitDebugError('SUBMIT_ERROR', { status: res.status, json });
          throw new Error(json?.message || `Cloud save failed (${res.status})`);
        }
        console.log('[SUBMIT] Cloud save successful');
      }

      // ========== UTSF SAVE ==========
      if (saveMode === 'utsf' || saveMode === 'cloud_utsf') {
        console.log(`[SUBMIT] Saving to UTSF (Mode: ${saveMode})`);

        const utsfPayload = {
          version: '1.0',
          meta: {
            id: payloadForApi.vendorCode,
            name: payloadForApi.companyName,
            contact: {
              person: payloadForApi.contactPersonName,
              phone: payloadForApi.vendorPhone,
              email: payloadForApi.vendorEmail,
            },
            gst: payloadForApi.gstNo,
            address: {
              street: payloadForApi.address,
              city: payloadForApi.city,
              state: payloadForApi.state,
              pincode: payloadForApi.pincode,
            },
            transportMode: payloadForApi.transportMode,
          },
          pricing: payloadForApi.prices,
          serviceability: payloadForApi.serviceability || [],
          raw: payloadForApi,
        };

        const token = getAuthToken();
        const utsfUrl = `${API_BASE}/api/utsf/upload-json`;

        const utsfRes = await fetch(utsfUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(utsfPayload),
        });

        const utsfJson = await utsfRes.json().catch(() => ({} as any));
        if (!utsfRes.ok || !utsfJson?.success) {
          console.error('[SUBMIT] UTSF save failed', utsfJson);
          throw new Error(utsfJson?.message || 'UTSF save failed');
        }
        console.log('[SUBMIT] UTSF save successful');
      }

      // ========== SUCCESS ==========
      toast.success('Vendor created successfully!', { duration: 800 });
      setSubmitOverlayStage('success');

      // Reset the form
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
      setServiceabilityData(null);
      setCurrentStep(1);
      setVendorMode(null);
      setScrollKey(Date.now());
    } catch (err) {
      emitDebugError('SUBMIT_EXCEPTION', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      toast.error(err instanceof Error ? err.message : 'Unexpected error. Please try again.', { duration: 5200 });
      setShowSubmitOverlay(false);
    } finally {
      setIsSubmitting(false);
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
    setCurrentStep(1);           // Reset step workflow
    setVendorMode(null);         // Reset vendor mode
    clearDraft();
    clearWizard(); // ADD THIS
    toast.success('Form reset', { duration: 1200 });
  };

  // ========================================================================
  // COMPUTED VALUES FOR SIDE PANEL & STEP BAR
  // ========================================================================
  const sidePanelProps = useMemo(() => {
    const b = vendorBasics.basics;
    const c = charges.charges;
    return {
      vendorName: b.companyName || legalCompanyNameInput || undefined,
      vendorCode: b.vendorCode || undefined,
      transportMode: transportMode || undefined,
      serviceMode: b.serviceMode || undefined,
      pincodeCount: serviceabilityData?.serviceability?.length ?? 0,
      hasCompanyInfo: !!(b.companyName && b.companyName.length >= 2),
      hasContactInfo: !!(b.contactPersonName || b.primaryContactName),
      hasGST: !!(b.gstin && b.gstin.length >= 15),
      hasCharges: !!(c && (
        c.docketCharges > 0 ||
        c.minWeightKg > 0 ||
        c.fuelSurchargePct > 0
      )),
    };
  }, [vendorBasics.basics, legalCompanyNameInput, transportMode, serviceabilityData, charges.charges]);

  const sideWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (matrixSize.rows === 0) warnings.push('No zones configured');
    if (!sidePanelProps.hasCompanyInfo) warnings.push('Company name missing');
    if (!sidePanelProps.hasGST) warnings.push('GST not provided');
    return warnings;
  }, [matrixSize.rows, sidePanelProps.hasCompanyInfo, sidePanelProps.hasGST]);

  // ========================================================================
  // PAGE UI (your preferred UI)
  // ========================================================================
  return (
    <div
      ref={topRef}
      className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200"
    >
      {/* ═══ STICKY STEP BAR ═══ */}
      <div className="mt-4">
        <VendorStepBar
          currentStep={currentStep}
          onStepChange={goToStep}
          vendorName={sidePanelProps.vendorName}
          transportMode={transportMode}
          zonesCount={matrixSize.rows}
          pricingReady={!!(wizardStatus?.hasPriceMatrix || (serviceabilityData?.serviceability?.length ?? 0) > 0)}
          onReset={handleReset}
        />
      </div>

      {/* ═══ UNIFIED WHITE CARD: Content + Side Panel ═══ */}
      <div className="mx-4 md:mx-6 mt-4 mb-6 bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
        <div className="flex gap-0 min-h-[calc(100vh-140px)]">
          {/* LEFT: Main Content */}
          <div className="flex-1 min-w-0 p-6">
            <form id="add-vendor-form" onSubmit={handleSubmit} className="space-y-3">

              {/* ════════════════════════════════════════════════ */}
              {/* STEP 1: FIND VENDOR (REDESIGNED)                */}
              {/* ════════════════════════════════════════════════ */}
              <div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-3xl mx-auto pt-10"
                >

                  {/* HERO HEADING */}
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-slate-800 mb-2">Find Your Vendor</h2>
                    <p className="text-slate-500">Search for an existing partner or create a new profile.</p>
                  </div>

                  {/* SEARCH CONTAINER */}
                  <div ref={dropdownRef} className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden relative z-10">
                    <div className="p-1">
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          {isSearching ? <Loader2 className="h-6 w-6 text-blue-500 animate-spin" /> : <Search className="h-6 w-6 text-slate-400 group-focus-within:text-blue-500 transition-colors" />}
                        </div>
                        <input
                          type="text"
                          className="block w-full pl-12 pr-4 py-4 text-lg border-none focus:ring-0 focus:outline-none placeholder:text-slate-300 transition-all bg-transparent"
                          placeholder="Type vendor name..."
                          value={legalCompanyNameInput}
                          onChange={(e) => {
                            const value = e.target.value;
                            setLegalCompanyNameInput(value);
                            setIsAutoFilled(false);
                            if (value.length >= 2) setIsSearching(true);
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
                        />
                        {/* Clear Button */}
                        {legalCompanyNameInput.length > 0 && !isAutoFilled && (
                          <button
                            type="button"
                            onClick={() => { setLegalCompanyNameInput(''); setSuggestions([]); setShowDropdown(false); }}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center"
                          >
                            <XCircleIcon className="h-5 w-5 text-slate-300 hover:text-slate-500 transition-colors" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* DROPDOWN RESULTS */}
                    <AnimatePresence>
                      {showDropdown && suggestions.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-100 bg-slate-50/50 max-h-60 overflow-y-auto"
                        >
                          {suggestions.map((v, i) => (
                            <div
                              key={v.id}
                              onClick={() => handleVendorAutoSelect(v)}
                              onMouseEnter={() => setHighlightedIndex(i)}
                              className={`px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors ${highlightedIndex === i ? 'bg-blue-50' : 'hover:bg-white'}`}
                            >
                              <div className={`p-2 rounded-lg ${v.isTemporary ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                <Building2 className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold text-slate-800 text-sm">{v.legalCompanyName || v.companyName}</h4>
                                <div className="flex gap-2 text-xs text-slate-500 mt-0.5">
                                  {v.vendorCode && <span className="bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">{v.vendorCode}</span>}
                                  {v.zones?.length > 0 && <span>• {v.zones.length} zones active</span>}
                                </div>
                              </div>
                              <div className="text-slate-400">
                                <CheckCircleIcon className="w-5 h-5 text-slate-300 hover:text-blue-500" />
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* ══ CASE 1: VENDOR AUTO-FILLED (SUCCESS) ══ */}
                  <AnimatePresence>
                    {isAutoFilled && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-6 bg-emerald-50 border border-emerald-100 rounded-xl p-5 shadow-sm"
                      >
                        <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
                          <div className="flex items-center gap-4">
                            <div className="bg-emerald-100 p-2 rounded-full">
                              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-emerald-900">Vendor Loaded</h4>
                              <p className="text-sm text-emerald-700">
                                Data auto-filled from <strong>{autoFilledFromName}</strong>
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-3 w-full md:w-auto">
                            <button
                              type="button"
                              onClick={clearAutoFill}
                              className="flex-1 md:flex-none px-4 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-50"
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={() => { setVendorMode('existing'); goNext(); }}
                              className="flex-1 md:flex-none px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-2"
                            >
                              Continue <ChevronDown className="w-4 h-4 -rotate-90" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* ══ CASE 2: VENDOR NOT FOUND (BRANCHING) ══ */}
                  {/* Show this if: Not auto-filled AND (Search is empty OR No results found) */}
                  {!isAutoFilled && (legalCompanyNameInput.length === 0 || suggestions.length === 0) && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="mt-12"
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <div className="h-px bg-slate-200 flex-1"></div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Or Create New</span>
                        <div className="h-px bg-slate-200 flex-1"></div>
                      </div>

                      <p className="text-center text-slate-600 mb-6 font-medium">Do you have a pincode serviceability list?</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* OPTION A: HAS PINCODES (EXCEL) */}
                        <button
                          type="button"
                          onClick={() => { setVendorMode('new_with_pincodes'); setZoneConfigMode('pincode'); goNext(); }}
                          className="group relative bg-white border-2 border-slate-100 hover:border-green-500 rounded-2xl p-6 text-left transition-all hover:shadow-xl hover:-translate-y-1"
                        >
                          <div className="absolute top-4 right-4 text-slate-300 group-hover:text-green-500 transition-colors">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <FileSpreadsheet className="w-6 h-6" />
                          </div>
                          <h3 className="font-bold text-slate-800 text-lg group-hover:text-green-700">Yes, I have an Excel file</h3>
                          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                            Upload your pincode list (Excel/CSV). We will maximize coverage automatically.
                          </p>
                        </button>

                        {/* OPTION B: MANUAL (WIZARD) */}
                        <button
                          type="button"
                          onClick={() => { setVendorMode('new_without_pincodes'); setZoneConfigMode('wizard'); goNext(); }}
                          className="group relative bg-white border-2 border-slate-100 hover:border-blue-500 rounded-2xl p-6 text-left transition-all hover:shadow-xl hover:-translate-y-1"
                        >
                          <div className="absolute top-4 right-4 text-slate-300 group-hover:text-blue-500 transition-colors">
                            <MapPin className="w-6 h-6" />
                          </div>
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-700">No, select manually</h3>
                          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                            Use the Zone Wizard to select states, cities, and regions manually.
                          </p>
                        </button>
                      </div>
                    </motion.div>
                  )}

                </motion.div>
              </div>{/* close rounded-xl */}
              {/* END STEP 1 */}

              {/* ════════════════════════════════════════════════ */}
              {/* STEP 3: COMPANY DETAILS                         */}
              {/* ════════════════════════════════════════════════ */}
              <div style={{ display: currentStep === 3 ? 'block' : 'none' }}>
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
                  <div className="p-5">
                    <CompanySection
                      vendorBasics={vendorBasics}
                      pincodeLookup={pincodeLookup}
                    />
                  </div>
                  <div className="p-5">
                    <TransportSection
                      volumetric={volumetric}
                      transportMode={transportMode}
                      onTransportModeChange={(m) => setTransportMode(m)}
                    />
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button type="button" onClick={goBack} className="px-4 py-2 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors">
                    ← Back to Pricing
                  </button>
                  <button type="button" onClick={goNext} className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors">
                    Next: Charges & Save →
                  </button>
                </div>
              </div>{/* END STEP 3 */}

              {/* ════════════════════════════════════════════════ */}
              {/* STEP 4: CHARGES & SAVE                          */}
              {/* ════════════════════════════════════════════════ */}
              <div style={{ display: currentStep === 4 ? 'block' : 'none' }}>
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden divide-y divide-slate-100">
                  <div className="p-5">
                    <ChargesSection charges={charges} />
                  </div>

                  {/* Invoice Value Charges Section */}
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


                </div>{/* close Step 4 charges card */}
              </div>{/* close Step 4 first block (charges+invoice) */}

              {/* ════════════════════════════════════════════════ */}
              {/* STEP 2: PRICING SETUP (REDESIGNED)              */}
              {/* ════════════════════════════════════════════════ */}
              <div style={{ display: currentStep === 2 ? 'block' : 'none' }}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="max-w-4xl mx-auto"
                >

                  {/* Header & Tabs */}
                  <div className="flex flex-col items-center mb-8">
                    <h3 className="text-2xl font-bold text-slate-800 mb-6">Serviceability & Pricing</h3>

                    {/* Segmented Control */}
                    <div className="bg-slate-100 p-1.5 rounded-xl flex items-center shadow-inner">
                      {[
                        { id: 'pincode', label: 'Pincode Upload', icon: FileSpreadsheet },
                        { id: 'wizard', label: 'Zone Wizard', icon: MapPin },
                        { id: 'auto', label: 'Auto Assign', icon: Sparkles },
                        //     { id: 'upload', label: 'Zone CSV', icon: Upload }, // Hidden as per user preference likely, or keep it? Keeping for now.
                      ].map((m) => {
                        const isActive = zoneConfigMode === m.id;
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setZoneConfigMode(m.id as any)}
                            className={`relative px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${isActive
                              ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                              : 'text-slate-500 hover:text-slate-700'
                              }`}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-white rounded-lg shadow-sm ring-1 ring-black/5"
                                initial={false}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                              <Icon className="w-4 h-4" />
                              {m.label}
                            </span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setZoneConfigMode('upload')}
                        className={`relative px-4 py-2 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${zoneConfigMode === 'upload'
                          ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                          : 'text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          CSV
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[400px]">
                    <AnimatePresence mode="wait">

                      {/* MODE: PINCODE UPLOAD */}
                      {zoneConfigMode === 'pincode' && (
                        <motion.div
                          key="pincode"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="space-y-6"
                        >
                          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-4">
                            <div className="p-2 bg-emerald-100 rounded-full shrink-0">
                              <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-emerald-900 text-lg">Recommended Method</h4>
                              <p className="text-emerald-700 mt-1 leading-relaxed text-sm">
                                Upload your pincode serviceability list. We will automatically map them to zones
                                and generate the price matrix structure for you. <strong>This is the source of truth.</strong>
                              </p>
                            </div>
                          </div>

                          <ServiceabilityUpload
                            onServiceabilityReady={handleServiceabilityReady}
                            onError={(errors) => console.error(errors)}
                          />

                          {serviceabilityData && serviceabilityData.serviceability.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                              className="p-4 border-2 border-green-100 bg-green-50/50 rounded-xl flex items-center justify-between"
                            >
                              <div>
                                <p className="font-bold text-green-800 flex items-center gap-2">
                                  <CheckCircleIcon className="w-5 h-5" />
                                  {serviceabilityData.serviceability.length} Pincodes Processed
                                </p>
                                <p className="text-sm text-green-600 pl-7">
                                  Mapped to {serviceabilityData.zoneSummary.length} zones
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={goNext}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 shadow-sm"
                              >
                                Save & Continue
                              </button>
                            </motion.div>
                          )}
                          <button
                            type="button"
                            onClick={() => navigate('/zone-price-matrix')}
                            className="ml-1 underline hover:no-underline"
                          >
                            Open wizard to fill prices →
                          </button>
                        </motion.div>
                      )}

                      {/* MODE: WIZARD */}
                      {zoneConfigMode === 'wizard' && (
                        <motion.div
                          key="wizard"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-6"
                        >
                          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-4">
                            <div className="p-2 bg-blue-100 rounded-full shrink-0">
                              <CheckCircle2 className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-bold text-blue-900 text-lg">Zone Wizard</h4>
                              <p className="text-blue-700 mt-1 leading-relaxed text-sm">
                                Manually select states and cities to define your zones. Note that pincode mapping will be approximate.
                              </p>
                            </div>
                          </div>

                          <ZoneSelectionWizard
                            onComplete={handleZoneSelectionComplete}
                          />
                        </motion.div>
                      )}

                      {/* MODE: PRICE MATRIX (NEW INLINE) */}
                      {zoneConfigMode === 'matrix' && (
                        <motion.div
                          key="matrix"
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="space-y-6"
                        >
                          <ZonePriceMatrixComponent
                            wizardData={wizardData}
                            onUpdatePriceMatrix={(matrix) => {
                              if (typeof setWizardData === 'function') {
                                setWizardData((prev: any) => ({
                                  ...(prev || {}),
                                  priceMatrix: matrix,
                                }));
                              }
                            }}
                            onBack={() => setZoneConfigMode('wizard')}
                            onSave={() => {
                              // Proceed to Company Details (Step 3)
                              goNext();
                              toast.success('Price matrix saved! Proceeding to Company Details.');
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div >

                  {/* Navigation Buttons for Step 2 */}
                  <div className="mt-8 flex items-center justify-between">
                    <button type="button" onClick={goBack} className="text-slate-400 hover:text-slate-600 font-medium text-sm transition-colors">
                      ← Back to Search
                    </button>
                    <button
                      type="button"
                      onClick={goNext}
                      disabled={!wizardStatus?.hasPriceMatrix && !serviceabilityData}
                      className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-slate-200 transition-all"
                    >
                      Next: Company Details →
                    </button>
                  </div >

                </motion.div >
              </div > {/* END STEP 2 */}

              {/* ════════════════════════════════════════════════ */}
              {/* STEP 3: COMPANY DETAILS                         */}
              {/* ════════════════════════════════════════════════ */}


              {/* ════════════════════════════════════════════════ */}
              {/* STEP 4: CHARGES & SAVE                          */}
              {/* ════════════════════════════════════════════════ */}


              {currentStep === 4 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  {/* STEP 4b: SAVE ACTIONS (Moved Here) */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 md:p-8 bg-slate-50 border-b border-slate-100">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                          <Save className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Finalize & Save</h3>
                      </div>
                      <p className="text-slate-600 ml-11">
                        Review your configuration. You can save as a draft to edit later, or publish immediately.
                      </p>
                    </div>

                    <div className="p-6 md:p-8 space-y-8">
                      {/* Save Mode Selection */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label
                          onClick={() => setSaveMode('draft')}
                          className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-slate-50 ${saveMode === 'draft' ? 'border-amber-400 bg-amber-50/30' : 'border-slate-200'
                            }`}
                        >
                          <input
                            type="radio"
                            name="saveMode"
                            checked={saveMode === 'draft'}
                            onChange={() => setSaveMode('draft')}
                            className="mt-1 w-4 h-4 text-amber-500 focus:ring-amber-500 border-slate-300"
                          />
                          <div>
                            <span className="block font-bold text-slate-900">Save as Draft</span>
                            <span className="text-sm text-slate-500 mt-1 block">
                              Vendor will be saved but <strong>kept hidden</strong>. Use this if you need to add more details later.
                            </span>
                          </div>
                        </label>

                        <label
                          onClick={() => setSaveMode('active')}
                          className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:bg-slate-50 ${saveMode === 'active' ? 'border-green-500 bg-green-50/30' : 'border-slate-200'
                            }`}
                        >
                          <input
                            type="radio"
                            name="saveMode"
                            checked={saveMode === 'active'}
                            onChange={() => setSaveMode('active')}
                            className="mt-1 w-4 h-4 text-green-600 focus:ring-green-500 border-slate-300"
                          />
                          <div>
                            <span className="block font-bold text-slate-900">Publish Vendor</span>
                            <span className="text-sm text-slate-500 mt-1 block">
                              Vendor will be <strong>live</strong> and available for calculations immediately.
                            </span>
                          </div>
                        </label>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={goBack}
                          className="text-slate-500 font-medium hover:text-slate-800 transition-colors"
                        >
                          ← Back to Details
                        </button>

                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          className={`
                               relative overflow-hidden group px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl
                               ${isSubmitting
                              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                              : 'bg-slate-900 text-white hover:bg-black'
                            }
                            `}
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            {isSubmitting ? (
                              <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Saving Provider...
                              </>
                            ) : (
                              <>
                                {saveMode === 'active' ? 'Create Live Provider' : 'Save Draft'}
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                              </>
                            )}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}




            </form >
          </div > {/* close flex-1 main content */}

          {/* ═══ RIGHT SIDE PANEL (inside white card) ═══ */}
          <div className="w-[280px] shrink-0 border-l border-slate-100 bg-slate-50/50">
            <VendorSidePanel
              currentStep={currentStep}
              vendorName={sidePanelProps.vendorName}
              vendorCode={sidePanelProps.vendorCode}
              transportMode={sidePanelProps.transportMode}
              serviceMode={sidePanelProps.serviceMode}
              zonesCount={matrixSize.rows}
              pincodeCount={sidePanelProps.pincodeCount}
              matrixSize={matrixSize}
              hasCompanyInfo={sidePanelProps.hasCompanyInfo}
              hasContactInfo={sidePanelProps.hasContactInfo}
              hasGST={sidePanelProps.hasGST}
              hasCharges={sidePanelProps.hasCharges}
              hasPricing={!!(wizardStatus?.hasPriceMatrix || (serviceabilityData?.serviceability?.length ?? 0) > 0)}
              isAutoFilled={isAutoFilled}
              autoFilledFrom={autoFilledFromName}
              vendorMode={vendorMode}
              warnings={sideWarnings}
            />
          </div>
        </div> {/* close flex */}
      </div> {/* close white card */}

      {/* Full-screen submit overlay */}
      {
        showSubmitOverlay && (
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
                        setShowSubmitOverlay(false);
                        setCurrentStep(1);
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
        )
      }

      {/* Debug Panel */}
      <DebugFloat logs={debugLogs} />
      <ScrollToTop targetRef={topRef} when={scrollKey} offset={80} />
    </div >
  );
};

export default AddVendor;
