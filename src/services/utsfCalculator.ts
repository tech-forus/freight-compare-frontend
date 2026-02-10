/**
 * UTSF Calculator Service - Client-Side UTSF Price Calculation
 *
 * Provides client-side UTSF calculation for guest users or as fallback.
 * Mirrors the backend utsfService.js logic.
 */

import { API_BASE_URL } from '../config/api';

export interface UTSFPriceResult {
  transporterId: string;
  companyName: string;
  totalCharges: number;
  unitPrice: number;
  originZone: string;
  destZone: string;
  breakdown: {
    baseFreight: number;
    effectiveBaseFreight: number;
    docketCharge: number;
    greenTax: number;
    daccCharges: number;
    miscCharges: number;
    fuelCharges: number;
    rovCharges: number;
    insuaranceCharges: number;
    odaCharges: number;
    handlingCharges: number;
    fmCharges: number;
    appointmentCharges: number;
  };
  rating: number;
  isVerified: boolean;
  isOda: boolean;
  source: 'utsf';
}

export interface CalculateParams {
  fromPincode: string | number;
  toPincode: string | number;
  weight: number;
  length: number;
  width: number;
  height: number;
  noofboxes: number;
  shipment_details?: Array<{
    weight: number;
    length: number;
    width: number;
    height: number;
    count: number;
  }>;
  invoiceValue?: number;
}

/**
 * Calculate prices using backend UTSF API
 */
export async function calculateUTSFPrices(
  params: CalculateParams
): Promise<{ success: boolean; results?: UTSFPriceResult[]; error?: string; chargeableWeight?: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/utsf/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        error: errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: data.message || 'UTSF calculation failed',
      };
    }

    return {
      success: true,
      results: data.results || [],
      chargeableWeight: data.chargeableWeight,
    };
  } catch (error) {
    console.error('[UTSF Calculator] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Check serviceability for a pincode
 */
export async function checkServiceability(
  pincode: string | number,
  transporterId?: string
): Promise<{
  success: boolean;
  transporters?: Array<{
    id: string;
    companyName: string;
    isServiceable: boolean;
    zone: string;
    isOda: boolean;
    reason: string;
  }>;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/utsf/serviceability`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pincode, transporterId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        error: errorData?.message || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: data.message || 'Serviceability check failed',
      };
    }

    return {
      success: true,
      transporters: data.transporters || [],
    };
  } catch (error) {
    console.error('[UTSF Calculator] Serviceability error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Get all UTSF transporters
 */
export async function getUTSFTransporters(): Promise<{
  success: boolean;
  transporters?: Array<{
    id: string;
    companyName: string;
    rating: number;
    isVerified: boolean;
    totalPincodes: number;
  }>;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/utsf/transporters`);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        error: data.message || 'Failed to fetch transporters',
      };
    }

    return {
      success: true,
      transporters: data.transporters || [],
    };
  } catch (error) {
    console.error('[UTSF Calculator] Error fetching transporters:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}
