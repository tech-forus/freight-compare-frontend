import { API_BASE_URL } from '../config/api';
import { getAuthToken } from '../utils/authUtils';

export interface VendorDraftPayload {
    _id?: string;
    draftName?: string;
    payload?: any;
    updatedAt?: string;
}

const buildHeaders = (): HeadersInit => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };
    const token = getAuthToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

export const draftApi = {
    // Get all drafts for the logged-in user (max 2)
    getVendorDrafts: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/drafts/vendor`, {
                method: 'GET',
                headers: buildHeaders(),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return await response.json(); // { success: true, data: [...] }
        } catch (error) {
            console.error('Failed to fetch vendor drafts', error);
            throw error;
        }
    },

    // Save or update a vendor draft
    saveVendorDraft: async (draftName: string, payload: any, draftId?: string) => {
        try {
            const body: any = { draftName, payload };
            if (draftId) body.draftId = draftId;

            const response = await fetch(`${API_BASE_URL}/api/drafts/vendor`, {
                method: 'POST',
                headers: buildHeaders(),
                body: JSON.stringify(body),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to save vendor draft', error);
            throw error;
        }
    },

    // Delete a vendor draft
    deleteVendorDraft: async (draftId: string) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/drafts/vendor/${draftId}`, {
                method: 'DELETE',
                headers: buildHeaders(),
            });
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return await response.json();
        } catch (error) {
            console.error('Failed to delete vendor draft', error);
            throw error;
        }
    }
};
