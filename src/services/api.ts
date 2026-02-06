/**
 * API service layer for AddVendor v2
 * Handles all HTTP communication with typed contracts
 */

import { TemporaryTransporter } from '../utils/validators';
import { emitDebug, emitDebugError } from '../utils/debug';
import { API_BASE_URL } from '../config/api';

// =============================================================================
// TYPES
// =============================================================================

/** Success response from backend */
export interface ApiSuccessResponse {
  success: true;
  data: TemporaryTransporter & { _id: string };
}

/** Error response from backend */
export interface ApiErrorResponse {
  success: false;
  message: string;
  fieldErrors?: Record<string, string>;
}

/** Pincode lookup response */
export interface PincodeLookupResponse {
  pincode: string;
  state: string;
  city: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

// Use centralized API configuration
const API_BASE = API_BASE_URL;

// Log API config for debugging
if (typeof window !== 'undefined') {
  console.log('[API Config] Base URL:', API_BASE);
}

/** Read auth token from localStorage or cookies */
const getAuthToken = (): string | null => {
  const token = localStorage.getItem('token') || localStorage.getItem('authToken');
  if (token) return token;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'token' || name === 'authToken') return value;
  }
  return null;
};

/** Build headers (add Authorization; JSON content-type optional) */
const buildHeaders = (includeContentType: boolean = true): HeadersInit => {
  const headers: HeadersInit = {};
  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (includeContentType) headers['Content-Type'] = 'application/json';
  return headers;
};

/** Safely parse JSON, tolerate non-JSON (HTML error pages, etc.) */
const safeJson = async <T = unknown>(res: Response): Promise<T | null> => {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

/** Unwrap either an array payload or `{ success, data }` */
const unwrapArray = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && Array.isArray((payload as any).data)) {
    return (payload as any).data as T[];
  }
  return [];
};

// =============================================================================
// API METHODS
// =============================================================================

/**
 * Submit new vendor (Temporary Transporter)
 * POST /api/transporter/addtiedupcompanies
 */
export const postVendor = async (
  vendor: Omit<TemporaryTransporter, 'priceChartFileId'>,
  priceChartFile?: File
): Promise<ApiSuccessResponse | ApiErrorResponse> => {
  try {
    emitDebug('API_POST_VENDOR_START', {
      companyName: vendor.companyName,
      hasPriceChart: !!priceChartFile,
    });

    // Build FormData (let browser set multipart boundary)
    const formData = new FormData();
    formData.append('vendorJson', JSON.stringify(vendor));
    if (priceChartFile) {
      formData.append('priceChart', priceChartFile);
      emitDebug('API_POST_VENDOR_FILE_ATTACHED', {
        fileName: priceChartFile.name,
        fileSize: priceChartFile.size,
        fileType: priceChartFile.type,
      });
    }

    // Auth required
    const token = getAuthToken();
    if (!token) {
      emitDebugError('API_POST_VENDOR_NO_TOKEN');
      return { success: false, message: 'Authentication required. Please sign in.' };
    }

    const url = `${API_BASE}/api/transporter/addtiedupcompanies`;
    emitDebug('API_POST_VENDOR_REQUEST', { url });

    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }, // DO NOT set Content-Type for FormData
      body: formData,
    });

    emitDebug('API_POST_VENDOR_RESPONSE', {
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      if (response.status === 401) {
        emitDebugError('API_POST_VENDOR_UNAUTHORIZED');
        return { success: false, message: 'Session expired. Please sign in again.' };
      }
      const errorData = (await safeJson<ApiErrorResponse>(response)) ?? {
        success: false,
        message: `Server error: ${response.status} ${response.statusText}`,
      };
      emitDebugError('API_POST_VENDOR_ERROR', errorData);
      return errorData;
    }

    const data = (await safeJson<ApiSuccessResponse>(response))!;
    emitDebug('API_POST_VENDOR_SUCCESS', {
      vendorId: data?.data?._id,
      companyName: data?.data?.companyName,
    });
    return data;
  } catch (error) {
    emitDebugError('API_POST_VENDOR_EXCEPTION', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error. Please try again.',
    };
  }
};

/**
 * Pincode (backend) — used as a **fallback** only.
 * If your local PincodeContext resolves the pin, you don’t need this.
 */
export async function apiGetPincode(
  pincode: string
): Promise<{ state: string; city: string } | null> {
  if (!/^\d{6}$/.test(pincode)) return null;
  if (!API_BASE) return null;

  try {
    const url = `${API_BASE}/api/geo/pincode/${pincode}`;
    const res = await fetch(url, { headers: buildHeaders() });
    if (!res.ok) return null;
    const data = await safeJson<PincodeLookupResponse>(res);
    if (!data?.state || !data?.city) return null;
    return { state: data.state, city: data.city };
  } catch {
    return null;
  }
}

/**
 * (Kept for compatibility) Direct pincode call returning PincodeLookupResponse | null
 * This wraps `apiGetPincode` so existing callers still work.
 */
export const getPincode = async (
  pincode: string
): Promise<PincodeLookupResponse | null> => {
  emitDebug('API_GET_PINCODE_START', { pincode });
  const hit = await apiGetPincode(pincode);
  if (hit) {
    const resp: PincodeLookupResponse = { pincode, state: hit.state, city: hit.city };
    emitDebug('API_GET_PINCODE_SUCCESS', resp);
    return resp;
  } else {
    emitDebugError('API_GET_PINCODE_NOT_FOUND', { pincode });
    return null;
  }
};

/**
 * Fetch list of temporary transporters (for SavedVendorsTable)
 * Prefer new endpoint, then gracefully fall back to legacy.
 * NEW:  GET /api/transporter/temporary[?customerID=...]
 * LEGACY: GET /api/transporter/gettemporarytransporters?customerID=...
 */
export const getTemporaryTransporters = async (
  ownerId?: string
): Promise<Array<TemporaryTransporter & { _id: string }>> => {
  try {
    console.log('[API] getTemporaryTransporters START - ownerId:', ownerId);
    emitDebug('API_GET_TEMP_TRANSPORTERS_START', { ownerId });

    // Try NEW endpoint first
    const token = getAuthToken();
    console.log('[API] Auth token exists:', !!token);
    const headers = buildHeaders();
    const newUrl = `${API_BASE}/api/transporter/temporary${ownerId ? `?customerID=${ownerId}` : ''}`;
    console.log('[API] Fetching from:', newUrl);
    const r1 = await fetch(newUrl, { method: 'GET', headers });
    console.log('[API] Response status:', r1.status, r1.statusText);

    if (r1.ok) {
      const json = await safeJson<any>(r1);
      console.log('[API] Response JSON:', json);
      const arr = unwrapArray<TemporaryTransporter & { _id: string }>(json);
      console.log('[API] Unwrapped array length:', arr.length);
      emitDebug('API_GET_TEMP_TRANSPORTERS_SUCCESS_NEW', { count: arr.length });
      return arr;
    }

    // If unauthorized, bubble up early
    if (r1.status === 401) {
      emitDebugError('API_GET_TEMP_TRANSPORTERS_UNAUTHORIZED');
      return [];
    }

    // Fallback to LEGACY if we have an ownerId and the new one failed (404 etc.)
    if (ownerId) {
      const legacyUrl = `${API_BASE}/api/transporter/gettemporarytransporters?customerID=${ownerId}`;
      const r2 = await fetch(legacyUrl, { method: 'GET', headers });
      if (r2.ok) {
        const json = await safeJson<any>(r2);
        const arr = unwrapArray<TemporaryTransporter & { _id: string }>(json);
        emitDebug('API_GET_TEMP_TRANSPORTERS_SUCCESS_LEGACY', { count: arr.length });
        return arr;
      }
    }

    emitDebugError('API_GET_TEMP_TRANSPORTERS_ERROR', { status: r1.status });
    return [];
  } catch (error) {
    emitDebugError('API_GET_TEMP_TRANSPORTERS_EXCEPTION', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
};

/**
 * Get a single temporary transporter by ID
 * NEW: GET /api/transporter/temporary/:id
 */
export const getTemporaryTransporterById = async (
  id: string
): Promise<(TemporaryTransporter & { _id: string }) | null> => {
  try {
    console.log('[API] getTemporaryTransporterById START - id:', id);
    emitDebug('API_GET_TEMP_TRANSPORTER_BY_ID_START', { id });

    const headers = buildHeaders();
    const url = `${API_BASE}/api/transporter/temporary/${id}`;
    console.log('[API] Fetching from:', url);
    const response = await fetch(url, { method: 'GET', headers });
    console.log('[API] Response status:', response.status);

    if (!response.ok) {
      if (response.status === 404) {
        console.log('[API] Temporary transporter not found (404)');
        emitDebugError('API_GET_TEMP_TRANSPORTER_BY_ID_NOT_FOUND', { id });
        return null;
      }
      if (response.status === 401) {
        console.log('[API] Unauthorized (401)');
        emitDebugError('API_GET_TEMP_TRANSPORTER_BY_ID_UNAUTHORIZED');
        return null;
      }
      console.log('[API] Error:', response.status, response.statusText);
      emitDebugError('API_GET_TEMP_TRANSPORTER_BY_ID_ERROR', { status: response.status });
      return null;
    }

    // Backend returns { success: true, data: {...} }
    const json = await safeJson<{ success: boolean; data: TemporaryTransporter & { _id: string } }>(response);
    console.log('[API] Response JSON:', json?.success, json?.data?.companyName);

    if (json?.success && json.data) {
      emitDebug('API_GET_TEMP_TRANSPORTER_BY_ID_SUCCESS', { id, companyName: json.data.companyName });
      return json.data;
    }

    return null;
  } catch (error) {
    console.error('[API] Exception:', error);
    emitDebugError('API_GET_TEMP_TRANSPORTER_BY_ID_EXCEPTION', {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};


/**
 * Get regular transporter by ID (from transporters collection)
 * GET /api/transporter/gettransporterdetails/:id
 */
export const getTransporterById = async (
  id: string
): Promise<any | null> => {
  try {
    emitDebug('API_GET_TRANSPORTER_START', { id });

    const url = `${API_BASE}/api/transporter/gettransporterdetails/${id}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(false),
    });

    if (!res.ok) {
      emitDebugError('API_GET_TRANSPORTER_FAILED', {
        status: res.status,
        statusText: res.statusText,
      });
      return null;
    }

    const json = await safeJson<{ success: boolean; data: any }>(res);

    if (json?.success && json.data) {
      emitDebug('API_GET_TRANSPORTER_SUCCESS', {
        companyName: json.data.companyName,
      });
      return json.data;
    }

    return null;
  } catch (err) {
    emitDebugError('API_GET_TRANSPORTER_ERROR', err);
    return null;
  }
};

/**
 * Delete temporary transporter
 * NEW:    DELETE /api/transporter/temporary/:id
 * LEGACY: DELETE /api/transporter/deletetemporary/:id   (if you have it)
 */
export const deleteTemporaryTransporter = async (id: string): Promise<boolean> => {
  try {
    emitDebug('API_DELETE_TEMP_TRANSPORTER_START', { id });

    // Try NEW endpoint
    const urlNew = `${API_BASE}/api/transporter/temporary/${id}`;
    let res = await fetch(urlNew, { method: 'DELETE', headers: buildHeaders() });

    // Fallback: try legacy route if 404
    if (!res.ok && res.status === 404) {
      const urlLegacy = `${API_BASE}/api/transporter/deletetemporary/${id}`;
      res = await fetch(urlLegacy, { method: 'DELETE', headers: buildHeaders() });
    }

    emitDebug('API_DELETE_TEMP_TRANSPORTER_RESPONSE', { status: res.status });

    if (!res.ok) {
      emitDebugError('API_DELETE_TEMP_TRANSPORTER_ERROR', { status: res.status });
      return false;
    }

    emitDebug('API_DELETE_TEMP_TRANSPORTER_SUCCESS', { id });
    return true;
  } catch (error) {
    emitDebugError('API_DELETE_TEMP_TRANSPORTER_EXCEPTION', {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};

/**
 * Update temporary transporter
 * NEW: PUT /api/transporter/temporary/:id
 *
 * Updates vendor details (company name, contact info, address, etc.)
 * Used by TransporterManagementPage for editing vendor data
 */
export const updateTemporaryTransporter = async (
  id: string,
  updateData: Partial<TemporaryTransporter>
): Promise<ApiSuccessResponse | ApiErrorResponse> => {
  try {
    emitDebug('API_UPDATE_TEMP_TRANSPORTER_START', { id, fields: Object.keys(updateData) });

    const url = `${API_BASE}/api/transporter/temporary/${id}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(updateData),
    });

    emitDebug('API_UPDATE_TEMP_TRANSPORTER_RESPONSE', { status: res.status });

    if (!res.ok) {
      if (res.status === 404) {
        emitDebugError('API_UPDATE_TEMP_TRANSPORTER_NOT_FOUND', { id });
        return {
          success: false,
          message: 'Vendor not found. It may have been deleted.',
        };
      }
      if (res.status === 401) {
        emitDebugError('API_UPDATE_TEMP_TRANSPORTER_UNAUTHORIZED');
        return {
          success: false,
          message: 'Unauthorized. Please log in again.',
        };
      }

      const errorData = await safeJson<ApiErrorResponse>(res);
      return errorData || {
        success: false,
        message: `Failed to update vendor (${res.status})`,
      };
    }

    const data = await safeJson<ApiSuccessResponse>(res);
    emitDebug('API_UPDATE_TEMP_TRANSPORTER_SUCCESS', { id });

    return data || {
      success: true,
      data: updateData as TemporaryTransporter & { _id: string },
    };
  } catch (error) {
    emitDebugError('API_UPDATE_TEMP_TRANSPORTER_EXCEPTION', {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error. Please try again.',
    };
  }
};

// =============================================================================
// ADMIN MANAGEMENT API METHODS
// =============================================================================

/**
 * Get all users for admin management
 * GET /api/admin/management/admins
 */
export const getAllAdmins = async (search?: string) => {
  try {
    const url = `${API_BASE}/api/admin/management/admins${search ? `?search=${search}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch admins: ${response.statusText}`);
    }

    const data = await safeJson(response);
    return data;
  } catch (error) {
    console.error('API Error (getAllAdmins):', error);
    throw error;
  }
};

/**
 * Approve user as admin
 * PUT /api/admin/management/admins/:id/approve
 */
export const approveUserAsAdmin = async (userId: string) => {
  try {
    const url = `${API_BASE}/api/admin/management/admins/${userId}/approve`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: buildHeaders(),
    });

    if (!response.ok) {
      const errorData = await safeJson(response);
      throw new Error(errorData?.message || `Failed to approve admin: ${response.statusText}`);
    }

    const data = await safeJson(response);
    return data;
  } catch (error) {
    console.error('API Error (approveUserAsAdmin):', error);
    throw error;
  }
};

/**
 * Revoke admin access
 * PUT /api/admin/management/admins/:id/revoke
 */
export const revokeAdminAccess = async (userId: string) => {
  try {
    const url = `${API_BASE}/api/admin/management/admins/${userId}/revoke`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: buildHeaders(),
    });

    if (!response.ok) {
      const errorData = await safeJson(response);
      throw new Error(errorData?.message || `Failed to revoke admin: ${response.statusText}`);
    }

    const data = await safeJson(response);
    return data;
  } catch (error) {
    console.error('API Error (revokeAdminAccess):', error);
    throw error;
  }
};

/**
 * Update admin permissions
 * PUT /api/admin/management/admins/:id/permissions
 */
export const updateAdminPermissions = async (
  userId: string,
  permissions: {
    formBuilder: boolean;
    dashboard: boolean;
    vendorApproval: boolean;
    userManagement: boolean;
  }
) => {
  try {
    const url = `${API_BASE}/api/admin/management/admins/${userId}/permissions`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(permissions),
    });

    if (!response.ok) {
      const errorData = await safeJson(response);
      throw new Error(errorData?.message || `Failed to update permissions: ${response.statusText}`);
    }

    const data = await safeJson(response);
    return data;
  } catch (error) {
    console.error('API Error (updateAdminPermissions):', error);
    throw error;
  }
};

// =============================================================================
// REGULAR TRANSPORTER VERIFICATION API METHODS
// =============================================================================

/** Regular transporter type (from transporters collection) */
export interface RegularTransporter {
  _id: string;
  companyName: string;
  phone: number;
  email: string;
  gstNo: string;
  address: string;
  state: string;
  pincode: number;
  deliveryMode?: string;
  rating?: number;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Fetch all regular transporters (for super admin)
 * GET /api/transporter/regular
 */
export const getRegularTransporters = async (): Promise<RegularTransporter[]> => {
  try {
    console.log('[API] getRegularTransporters START');
    emitDebug('API_GET_REGULAR_TRANSPORTERS_START', {});

    const headers = buildHeaders();
    const url = `${API_BASE}/api/transporter/regular`;
    console.log('[API] Fetching from:', url);
    const response = await fetch(url, { method: 'GET', headers });
    console.log('[API] Response status:', response.status);

    if (!response.ok) {
      if (response.status === 401) {
        emitDebugError('API_GET_REGULAR_TRANSPORTERS_UNAUTHORIZED');
        return [];
      }
      emitDebugError('API_GET_REGULAR_TRANSPORTERS_ERROR', { status: response.status });
      return [];
    }

    const json = await safeJson<{ success: boolean; data: RegularTransporter[] }>(response);
    const arr = json?.data || [];
    console.log('[API] Fetched regular transporters:', arr.length);
    emitDebug('API_GET_REGULAR_TRANSPORTERS_SUCCESS', { count: arr.length });
    return arr;
  } catch (error) {
    emitDebugError('API_GET_REGULAR_TRANSPORTERS_EXCEPTION', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
};

/**
 * Update regular transporter approval status
 * PUT /api/transporter/regular/:id/status
 */
export const updateTransporterStatus = async (
  id: string,
  status: 'pending' | 'approved' | 'rejected'
): Promise<{ success: boolean; message?: string }> => {
  try {
    console.log('[API] updateTransporterStatus:', id, status);
    const url = `${API_BASE}/api/transporter/regular/${id}/status`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const errorData = await safeJson<{ message?: string }>(response);
      return { success: false, message: errorData?.message || 'Failed to update status' };
    }

    return { success: true };
  } catch (error) {
    console.error('API Error (updateTransporterStatus):', error);
    return { success: false, message: 'Network error' };
  }
};

/**
 * Toggle regular transporter verification status
 * PUT /api/transporter/regular/:id/verification
 */
export const toggleTransporterVerification = async (
  id: string,
  isVerified: boolean
): Promise<{ success: boolean; message?: string }> => {
  try {
    console.log('[API] toggleTransporterVerification:', id, isVerified);
    const url = `${API_BASE}/api/transporter/regular/${id}/verification`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify({ isVerified }),
    });

    if (!response.ok) {
      const errorData = await safeJson<{ message?: string }>(response);
      return { success: false, message: errorData?.message || 'Failed to update verification' };
    }

    return { success: true };
  } catch (error) {
    console.error('API Error (toggleTransporterVerification):', error);
    return { success: false, message: 'Network error' };
  }
};

// =============================================================================
// BOX LIBRARY API METHODS (Sync across devices)
// =============================================================================

/** Box item within a library */
export interface BoxLibraryItem {
  _id?: string;
  name: string;
  weight: number;
  length?: number;
  width?: number;
  height?: number;
  quantity: number;
}

/** Box library structure from backend */
export interface BoxLibrary {
  _id: string;
  customerId: string;
  name: string;
  category: string;
  boxes: BoxLibraryItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Fetch all box libraries for authenticated user
 * GET /api/transporter/box-libraries
 */
export const getBoxLibraries = async (): Promise<BoxLibrary[]> => {
  try {
    const url = `${API_BASE}/api/transporter/box-libraries`;
    const response = await fetch(url, {
      method: 'GET',
      headers: buildHeaders(),
    });

    if (!response.ok) {
      console.error('[API] getBoxLibraries failed:', response.status);
      return [];
    }

    const json = await safeJson<{ success: boolean; data: BoxLibrary[] }>(response);
    return json?.data || [];
  } catch (error) {
    console.error('[API] getBoxLibraries error:', error);
    return [];
  }
};

/**
 * Create a new box library
 * POST /api/transporter/box-libraries
 */
export const createBoxLibrary = async (
  name: string,
  category: string = 'general',
  boxes: BoxLibraryItem[] = []
): Promise<BoxLibrary | null> => {
  try {
    const url = `${API_BASE}/api/transporter/box-libraries`;
    const response = await fetch(url, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ name, category, boxes }),
    });

    if (!response.ok) {
      console.error('[API] createBoxLibrary failed:', response.status);
      return null;
    }

    const json = await safeJson<{ success: boolean; data: BoxLibrary }>(response);
    return json?.data || null;
  } catch (error) {
    console.error('[API] createBoxLibrary error:', error);
    return null;
  }
};

/**
 * Update a box library
 * PUT /api/transporter/box-libraries/:id
 */
export const updateBoxLibrary = async (
  id: string,
  updates: { name?: string; category?: string; boxes?: BoxLibraryItem[] }
): Promise<BoxLibrary | null> => {
  try {
    const url = `${API_BASE}/api/transporter/box-libraries/${id}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: buildHeaders(),
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      console.error('[API] updateBoxLibrary failed:', response.status);
      return null;
    }

    const json = await safeJson<{ success: boolean; data: BoxLibrary }>(response);
    return json?.data || null;
  } catch (error) {
    console.error('[API] updateBoxLibrary error:', error);
    return null;
  }
};

/**
 * Delete a box library
 * DELETE /api/transporter/box-libraries/:id
 */
export const deleteBoxLibrary = async (id: string): Promise<boolean> => {
  try {
    const url = `${API_BASE}/api/transporter/box-libraries/${id}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: buildHeaders(),
    });

    if (!response.ok) {
      console.error('[API] deleteBoxLibrary failed:', response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[API] deleteBoxLibrary error:', error);
    return false;
  }
};
