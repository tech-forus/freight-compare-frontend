// src/lib/http.ts
import axios from "axios";

function getEnv(name: string): string | undefined {
  try {
    // Vite
    // @ts-ignore
    if (typeof import.meta !== "undefined" && (import.meta as any).env) {
      // @ts-ignore
      const v = (import.meta as any).env[name];
      if (v) return String(v);
    }
  } catch { }
  try {
    // Node/process fallback (rare in browser)
    if (typeof process !== "undefined" && (process as any).env) {
      const v = (process as any).env[name];
      if (v) return String(v);
    }
  } catch { }
  return undefined;
}

// Preferred env name (compatible with earlier advice)
const configured =
  getEnv("VITE_API_BASE") ||
  getEnv("VITE_API_BASE_URL") || // keep backward-compat
  getEnv("REACT_APP_URL") ||     // older CRA name
  "https://freight-compare-backend-production.up.railway.app"; // final fallback

const rawNoSlash = String(configured).replace(/\/$/, "");

// Decide whether to use proxy in dev:
// - Default: DO NOT use proxy (baseURL will be the deployed backend).
// - If you explicitly want proxying during dev, set VITE_USE_PROXY=true in your .env
let baseURL = rawNoSlash;
try {
  // @ts-ignore
  if (typeof import.meta !== "undefined" && (import.meta as any).env) {
    const env: any = (import.meta as any).env;
    const useProxy = String(env.VITE_USE_PROXY ?? "false").toLowerCase() === "true";
    // Only set baseURL = '' if developer explicitly opts into proxying
    if (env.DEV && useProxy) {
      baseURL = "";
    }
  }
} catch (e) {
  // ignore and use rawNoSlash
}

// Configure axios - set withCredentials to true only if you use cookies for auth
const http = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});

// Helper to get cookie value by name
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

// 🔐 Attach Authorization token to every request (Super Admin actions need this)
http.interceptors.request.use(
  (config) => {
    try {
      // Check multiple sources for the token:
      // 1. localStorage (legacy/fallback)
      // 2. authToken cookie (current auth flow uses this)
      const token =
        localStorage.getItem("accessToken") ||
        localStorage.getItem("token") ||
        getCookie("authToken");

      if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // fail silently — auth will be handled by backend
    }

    return config;
  },
  (error) => Promise.reject(error)
);


// Helpful log to confirm what is being used at runtime
if (typeof window !== "undefined") {
  console.log("[http] baseURL =", http.defaults.baseURL);
}

export default http;
