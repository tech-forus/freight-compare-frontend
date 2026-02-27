// Global axios configuration for cookie-based auth.
// The httpOnly `authToken` cookie is sent automatically by the browser on every
// request because `withCredentials: true` is set. No manual Authorization header needed.
import axios from 'axios';

axios.defaults.withCredentials = true;
axios.defaults.headers.common['Accept'] = 'application/json';

// --- Transparent token refresh on 401 ---
// When the 15-minute access token expires the server returns 401.
// We silently call /api/auth/refresh (which uses the 7-day refreshToken cookie),
// get a new authToken cookie, then replay the original request.
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason: any) => void }> = [];

const processQueue = (error: any) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(undefined);
    }
  });
  failedQueue = [];
};

axios.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err?.response?.status === 401) {
      const code = err.response?.data?.code;

      // SESSION_REPLACED = user logged in elsewhere; force logout
      if (code === 'SESSION_REPLACED') {
        localStorage.removeItem('authUser');
        alert('You have been logged out because your account was signed into another device.');
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/signin')) {
          window.location.href = '/';
        }
        return Promise.reject(err);
      }

      // Avoid infinite loop if the refresh call itself fails
      if (originalRequest._retry) {
        processQueue(err);
        localStorage.removeItem('authUser');
        if (typeof window !== 'undefined') window.location.href = '/signin';
        return Promise.reject(err);
      }

      if (isRefreshing) {
        // Queue this request until the in-flight refresh finishes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => axios(originalRequest)).catch((e) => Promise.reject(e));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Attempt to get a new access token using the refreshToken cookie
        await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        processQueue(null);
        return axios(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        localStorage.removeItem('authUser');
        if (typeof window !== 'undefined') window.location.href = '/signin';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);
