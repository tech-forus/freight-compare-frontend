import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

// API base URL
const API_BASE = API_BASE_URL;

// Field config type
export interface FieldConstraints {
    maxLength?: number | null;
    minLength?: number | null;
    min?: number | null;
    max?: number | null;
    step?: number | null;
    pattern?: string | null;
    patternMessage?: string | null;
}

export interface FieldOption {
    value: string;
    label: string;
}

export interface FieldConfig {
    fieldId: string;
    label: string;
    placeholder: string;
    type: 'text' | 'number' | 'email' | 'textarea' | 'dropdown' | 'slider' | 'buttons';
    required: boolean;
    visible: boolean;
    gridSpan: number;
    order: number;
    constraints: FieldConstraints;
    options?: FieldOption[];
    inputMode?: 'text' | 'numeric' | 'email' | 'tel' | null;
    autoCapitalize?: 'none' | 'words' | 'characters' | 'uppercase' | null;
}

export interface FormConfig {
    pageId: string;
    pageName: string;
    description: string;
    fields: FieldConfig[];
    lastModifiedAt?: string;
}

// Default field configs (fallback if API fails)
const DEFAULT_ADD_VENDOR_FIELDS: FieldConfig[] = [
    { fieldId: 'companyName', label: 'Company Name', placeholder: 'Enter company name', type: 'text', required: true, visible: true, gridSpan: 1, order: 1, constraints: { maxLength: 60, minLength: 1 } },
    { fieldId: 'contactPersonName', label: 'Contact Person', placeholder: 'Enter contact person name', type: 'text', required: true, visible: true, gridSpan: 1, order: 2, constraints: { maxLength: 30, minLength: 1 }, autoCapitalize: 'uppercase' },
    { fieldId: 'vendorPhoneNumber', label: 'Phone Number', placeholder: '10-digit phone number', type: 'text', required: true, visible: true, gridSpan: 1, order: 3, constraints: { maxLength: 10, minLength: 10, pattern: '^[1-9][0-9]{9}$', patternMessage: 'Must be 10 digits, cannot start with 0' }, inputMode: 'numeric' },
    { fieldId: 'vendorEmailAddress', label: 'Email Address', placeholder: 'email@example.com', type: 'email', required: true, visible: true, gridSpan: 1, order: 4, constraints: {} },
    { fieldId: 'gstin', label: 'GST Number', placeholder: '15-character GST number', type: 'text', required: false, visible: true, gridSpan: 1, order: 5, constraints: { maxLength: 15, minLength: 15 }, autoCapitalize: 'uppercase' },
    { fieldId: 'subVendor', label: 'Sub Transporter', placeholder: 'Enter sub vendor (optional)', type: 'text', required: false, visible: true, gridSpan: 1, order: 6, constraints: { maxLength: 20 }, autoCapitalize: 'uppercase' },
    { fieldId: 'vendorCode', label: 'Transporter Code', placeholder: 'Enter vendor code (optional)', type: 'text', required: false, visible: true, gridSpan: 1, order: 7, constraints: { maxLength: 20 }, autoCapitalize: 'uppercase' },
    { fieldId: 'pincode', label: 'Pincode', placeholder: '6-digit pincode', type: 'text', required: true, visible: true, gridSpan: 1, order: 8, constraints: { maxLength: 6, minLength: 6 }, inputMode: 'numeric' },
    { fieldId: 'address', label: 'Address', placeholder: 'Enter complete address', type: 'textarea', required: true, visible: true, gridSpan: 2, order: 9, constraints: { maxLength: 150, minLength: 1 } },
    { fieldId: 'state', label: 'State', placeholder: 'State (auto-filled)', type: 'text', required: true, visible: true, gridSpan: 1, order: 10, constraints: {} },
    { fieldId: 'city', label: 'City', placeholder: 'City (auto-filled)', type: 'text', required: true, visible: true, gridSpan: 1, order: 11, constraints: {} },
    { fieldId: 'serviceMode', label: 'Service Mode', placeholder: '', type: 'buttons', required: true, visible: true, gridSpan: 1, order: 12, constraints: {}, options: [{ value: 'FTL', label: 'FTL' }, { value: 'LTL', label: 'LTL' }] },
    { fieldId: 'companyRating', label: 'Company Rating', placeholder: '', type: 'slider', required: true, visible: true, gridSpan: 1, order: 13, constraints: { min: 1, max: 5, step: 0.1 } },
];

const DEFAULTS: Record<string, FormConfig> = {
    'add-vendor': {
        pageId: 'add-vendor',
        pageName: 'Add Vendor',
        description: 'Vendor registration form',
        fields: DEFAULT_ADD_VENDOR_FIELDS,
    },
};

// Cache TTL (30 seconds - balances performance with quick updates)
const CACHE_TTL = 30 * 1000;

/**
 * Hook to fetch form configuration from API with caching and fallback
 */
export function useFormConfig(pageId: string) {
    const [config, setConfig] = useState<FormConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch config from API
    const fetchConfig = useCallback(async (skipCache = false) => {
        setLoading(true);
        setError(null);

        // Check cache first
        if (!skipCache) {
            try {
                const cached = sessionStorage.getItem(`formConfig:${pageId}`);
                if (cached) {
                    const { data, timestamp } = JSON.parse(cached);
                    if (Date.now() - timestamp < CACHE_TTL) {
                        setConfig(data);
                        setLoading(false);
                        return;
                    }
                }
            } catch {
                // Ignore cache errors
            }
        }

        // Fetch from API
        try {
            const response = await fetch(`${API_BASE}/api/form-config/${pageId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const result = await response.json();
            if (result.success && result.data) {
                setConfig(result.data);
                // Cache the result
                try {
                    sessionStorage.setItem(
                        `formConfig:${pageId}`,
                        JSON.stringify({ data: result.data, timestamp: Date.now() })
                    );
                } catch {
                    // Ignore cache write errors
                }
            } else {
                throw new Error(result.message || 'Failed to fetch config');
            }
        } catch (err: any) {
            console.warn(`[useFormConfig] API failed for ${pageId}, using defaults:`, err.message);
            // Use hardcoded defaults as fallback
            const fallback = DEFAULTS[pageId] || null;
            setConfig(fallback);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [pageId]);

    // Initial fetch
    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    // Helper to get a specific field config
    const getField = useCallback(
        (fieldId: string): FieldConfig | undefined => {
            return config?.fields.find((f) => f.fieldId === fieldId);
        },
        [config]
    );

    // Helper to get field constraint with fallback
    const getConstraint = useCallback(
        <K extends keyof FieldConstraints>(
            fieldId: string,
            key: K,
            fallback: FieldConstraints[K]
        ): FieldConstraints[K] => {
            const field = getField(fieldId);
            return field?.constraints?.[key] ?? fallback;
        },
        [getField]
    );

    // Refresh config (clears cache)
    const refresh = useCallback(() => {
        sessionStorage.removeItem(`formConfig:${pageId}`);
        fetchConfig(true);
    }, [pageId, fetchConfig]);

    return {
        config,
        loading,
        error,
        getField,
        getConstraint,
        refresh,
    };
}

export default useFormConfig;
