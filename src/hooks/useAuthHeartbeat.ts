// src/hooks/useAuthHeartbeat.ts
// Silent auth check heartbeat — pings /api/auth/me every 60 seconds.
// If a 401 is returned (e.g. session replaced), triggers forceLogout.

import { useEffect, useRef } from 'react';
import http from '../lib/http';
import { forceLogout } from '../utils/forceLogout';

const HEARTBEAT_INTERVAL_MS = 60_000; // 60 seconds

/**
 * Mount this hook in a component that is only rendered when the user is
 * authenticated (e.g. inside the AuthProvider after isAuthenticated is true).
 *
 * The hook:
 * 1. Sets up a 60-second interval that calls GET /api/auth/me
 * 2. If the response is 401, calls forceLogout()
 * 3. Cleans up the interval on unmount
 */
export function useAuthHeartbeat(enabled: boolean = true): void {
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!enabled) return;

        const checkSession = async () => {
            try {
                await http.get('/api/auth/me');
                // Session is valid — do nothing
            } catch (err: any) {
                if (err?.response?.status === 401) {
                    const reason = err.response?.data?.reason;
                    const code = err.response?.data?.code;

                    if (reason === 'NEW_LOGIN_DETECTED' || code === 'SESSION_REPLACED') {
                        forceLogout('Another device logged in. You have been signed out.');
                    }
                    // Other 401s (token expired) are handled by the axios interceptor's
                    // silent refresh logic — don't force-logout for those.
                }
                // Network errors are silently ignored (user might be offline momentarily)
            }
        };

        intervalRef.current = setInterval(checkSession, HEARTBEAT_INTERVAL_MS);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [enabled]);
}
