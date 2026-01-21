/**
 * Centralized API Configuration
 * =============================
 * 
 * This file is the SINGLE SOURCE OF TRUTH for all API base URL configuration.
 * 
 * IMPORTANT: Do NOT define API_BASE_URL anywhere else in the codebase!
 * Always import from this file:
 * 
 *   import { API_BASE_URL } from '@/config/api';
 *   // or
 *   import { API_BASE_URL } from '../config/api';
 * 
 * Environment Variable:
 *   VITE_API_BASE_URL - Set this in Vercel/local .env for your backend URL
 * 
 * Fallback Chain:
 *   1. VITE_API_BASE_URL (preferred - set in Vercel dashboard)
 *   2. Production Railway URL (fallback for safety)
 */

// Production backend URL - used as fallback when env var not set
const PRODUCTION_BACKEND = 'https://freight-compare-backend-production.up.railway.app';

/**
 * Safely read environment variable (handles SSR edge cases)
 */
const getEnvVar = (key: string): string | undefined => {
  try {
    // Vite environment - use type assertion for compatibility
    const env = (import.meta as unknown as { env?: Record<string, string> }).env;
    if (env && env[key]) {
      return env[key];
    }
  } catch {
    // Silent fail
  }
  return undefined;
};

/**
 * Get the API base URL - strips trailing slashes for consistency
 */
export const getApiBaseUrl = (): string => {
  const envUrl = getEnvVar('VITE_API_BASE_URL');
  const baseUrl = (envUrl || PRODUCTION_BACKEND).replace(/\/+$/, '');
  return baseUrl;
};

/**
 * Pre-computed API base URL for direct imports
 * Use this for simple cases:
 * 
 *   fetch(`${API_BASE_URL}/api/users`)
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Build a full API endpoint URL
 * 
 * @param path - The API path (e.g., '/api/transporter/calculate')
 * @returns Full URL (e.g., 'https://backend.../api/transporter/calculate')
 * 
 * Example:
 *   apiUrl('/api/users') => 'https://backend.../api/users'
 *   apiUrl('api/users')  => 'https://backend.../api/users'
 */
export const apiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${cleanPath}`;
};

/**
 * Check if we're running in development mode
 */
export const isDevelopment = (): boolean => {
  return import.meta.env.DEV === true;
};

/**
 * Check if we're using the production backend
 */
export const isUsingProductionBackend = (): boolean => {
  return API_BASE_URL === PRODUCTION_BACKEND;
};

// Log configuration on startup (helps debug deployment issues)
if (typeof window !== 'undefined') {
  const envSource = getEnvVar('VITE_API_BASE_URL') ? 'VITE_API_BASE_URL env var' : 'fallback (production)';
  console.log(`[API Config] Base URL: ${API_BASE_URL} (source: ${envSource})`);
}

export default API_BASE_URL;
