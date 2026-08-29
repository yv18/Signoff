import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, setAccessToken, setSessionLostHandler, errorMessage } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const clear = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  // On first load, try to trade the refresh cookie for a session. A 401 here
  // just means nobody is signed in, which is not an error worth showing.
  useEffect(() => {
    setSessionLostHandler(clear);
    (async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        setUser(data.user);
      } catch {
        clear();
      } finally {
        setBooting(false);
      }
    })();
  }, [clear]);

  // Sign-up is two steps: request a code, then verify it.
  const registerStart = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register/start', payload);
    return data; // { ok, email, devCode? }
  }, []);

  const registerResend = useCallback(async (email) => {
    await api.post('/auth/register/resend', { email });
  }, []);

  const registerVerify = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register/verify', payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(async (payload) => {
    const { data } = await api.post('/auth/login', payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } finally { clear(); }
  }, [clear]);

  const value = useMemo(
    () => ({ user, booting, registerStart, registerResend, registerVerify, login, logout, errorMessage }),
    [user, booting, registerStart, registerResend, registerVerify, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
