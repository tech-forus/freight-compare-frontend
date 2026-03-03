// src/utils/forceLogout.ts
// Centralized force-logout utility for session invalidation scenarios.
// Uses `fetch` (not axios) to avoid triggering the axios interceptor loop.

import toast from 'react-hot-toast';

/**
 * Force-logout the current user.
 * Clears localStorage, calls the logout endpoint to clear httpOnly cookies,
 * shows a toast notification, and redirects to /signin.
 *
 * @param message – user-facing explanation shown in the toast
 */
export function forceLogout(message: string = 'Session expired. Please sign in again.'): void {
    // 1. Clear client-side auth state
    localStorage.removeItem('authUser');

    // 2. Clear httpOnly cookies via the logout endpoint (fire-and-forget)
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => { });

    // 3. Show toast notification
    toast.error(message, { duration: 5000 });

    // 4. Redirect to sign-in (hard redirect to fully reset React state)
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/signin')) {
        window.location.href = '/signin';
    }
}
