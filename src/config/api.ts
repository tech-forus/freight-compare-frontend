/**
 * Centralized API Configuration
 * 
 * This file provides a single source of truth for API base URL.
 * Import this instead of hardcoding URLs throughout the codebase.
 * 
 * Usage:
 *   import { API_BASE_URL } from '../config/api';
 *   const response = await fetch(`${API_BASE_URL}/api/transporter/calculate`, ...)
 */

// The production backend URL - fallback if env var is not set
const PRODUCTION_BACKEND = 'https://freight-compare-backend-production.up.railway.app';

/**
 * Get the API base URL from environment or use production fallback
 * Strips trailing slashes for consistency
 */
export const getApiBaseUrl = (): string => {
  // Try VITE_API_BASE_URL first (most common)
  const envUrl =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_BASE ||
    import.meta.env.REACT_APP_URL;

  const baseUrl = (envUrl || PRODUCTION_BACKEND).replace(/\/+$/, '');
  return baseUrl;
};

/**
 * Pre-computed API base URL for simple imports
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Build a full API endpoint URL
 * @param path - The API path (e.g., '/api/transporter/calculate')
 * @returns Full URL (e.g., 'https://backend.../api/transporter/calculate')
 */
export const apiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

// Log the API base URL on import (helpful for debugging)
if (typeof window !== 'undefined') {
  console.log('[API Config] Base URL:', API_BASE_URL);
}

export default API_BASE_URL;
