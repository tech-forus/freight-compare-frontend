// src/lib/http.ts
import axios from "axios";
import { API_BASE_URL } from "../config/api";

// Use the centralized API configuration
const rawNoSlash = API_BASE_URL;

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


// Configure axios - withCredentials ensures the httpOnly auth cookies are sent
// automatically on every request. No manual Authorization header is needed.
const http = axios.create({
  baseURL,
  withCredentials: true,
  headers: { "Content-Type": "application/json", Accept: "application/json" },
});


// Helpful log to confirm what is being used at runtime
if (typeof window !== "undefined") {
  console.log("[http] baseURL =", http.defaults.baseURL);
}

export default http;
