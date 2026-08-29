import axios from 'axios';

/**
 * The access token lives in memory only. It is never written to localStorage,
 * so an XSS payload cannot read it back out later. The refresh token lives in
 * an httpOnly cookie the JavaScript here cannot touch at all.
 */
let accessToken = null;
let onSessionLost = () => {};

export const setAccessToken = (t) => { accessToken = t; };
export const getAccessToken = () => accessToken;
export const setSessionLostHandler = (fn) => { onSessionLost = fn; };

/**
 * Same-origin by default: in dev, Vite proxies `/api`; in the Docker setup,
 * nginx does. Set VITE_API_BASE_URL at build time only if the client and API
 * are on different origins (e.g. signoff.app + api.signoff.app) — then the
 * server also needs CLIENT_ORIGIN set for CORS + cookies.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    const isRefreshCall = original?.url?.includes('/auth/refresh');

    if (status === 401 && !original._retried && !isRefreshCall) {
      original._retried = true;
      try {
        refreshing = refreshing || api.post('/auth/refresh');
        const { data } = await refreshing;
        refreshing = null;
        setAccessToken(data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        setAccessToken(null);
        onSessionLost();
        return Promise.reject(e);
      }
    }

    return Promise.reject(error);
  }
);

/** Pull a readable message out of whatever the server sent back. */
export function errorMessage(err, fallback = 'Something went wrong.') {
  const data = err?.response?.data;
  if (data?.details?.length) return data.details[0].message;
  return data?.error || err?.message || fallback;
}
