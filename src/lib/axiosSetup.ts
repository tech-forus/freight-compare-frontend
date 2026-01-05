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

// Optional: surface 401s consistently
axios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // Keep behavior minimal; caller handles messaging.
      // You may add global toast or redirect to login here if desired.
    }
    return Promise.reject(err);
  }
);

