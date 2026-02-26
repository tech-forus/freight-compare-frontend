import Cookies from 'js-cookie';

export function getAuthToken(): string {
    return (
        Cookies.get('authToken') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('token') ||
        ''
    );
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

export function getCustomerIDFromToken(): string {
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
