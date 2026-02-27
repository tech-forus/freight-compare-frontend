// Auth tokens are now stored as httpOnly cookies set by the server.
// JavaScript cannot read httpOnly cookies — that is the security guarantee.
// Authentication is handled automatically: the browser sends the cookie on every
// request when `withCredentials: true` is set (configured in http.ts / axiosSetup.ts).

/**
 * Returns empty string — the raw JWT is no longer accessible from JavaScript.
 * Requests are authenticated via the httpOnly `authToken` cookie automatically.
 * @deprecated Do not use to build Authorization headers. Remove call sites over time.
 */
export function getAuthToken(): string {
    return '';
}

export function base64UrlToJson<T = any>(b64url: string): T | null {
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

/**
 * Returns the current customer's _id.
 * Reads from localStorage['authUser'] (set by AuthProvider after login).
 * Falls back to empty string if not authenticated.
 */
export function getCustomerIDFromToken(): string {
    try {
        const stored = localStorage.getItem('authUser');
        if (!stored) return '';
        const parsed = JSON.parse(stored);
        // AuthProvider wraps the customer in { customer: { ... } }
        const id =
            parsed?.customer?._id ||
            parsed?._id ||
            '';
        return id ? String(id) : '';
    } catch {
        return '';
    }
}
