// Ensure all axios requests include Authorization from cookie when available
import axios from 'axios';
import Cookies from 'js-cookie';

// Always send cookies when same-site; some endpoints may rely on it
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Accept'] = 'application/json';

// Attach Authorization dynamically from cookie at request time
axios.interceptors.request.use((config) => {
  try {
    const token = Cookies.get('authToken');
    if (token) {
      config.headers = {
        ...(config.headers || {}),
        Authorization: `Bearer ${token}`,
      } as any;
    }
  } catch {
    // no-op
  }
  return config;
});

// Handle 401s — specifically detect SESSION_REPLACED for single-session enforcement
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      const code = err.response?.data?.code;

      if (code === 'SESSION_REPLACED') {
        // Clear all auth data
        Cookies.remove('authToken');
        localStorage.removeItem('authUser');
        localStorage.removeItem('token');

        // Notify user and redirect to login
        alert('You have been logged out because your account was signed into another device.');

        // Redirect to home/login page
        if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(err);
  }
);

