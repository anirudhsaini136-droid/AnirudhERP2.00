import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { safeJsonParse } from '../shared-core';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || process.env.REACT_APP_API_URL || '';
const API = `${BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  const apiRef = useRef(null);

  const getToken = () => localStorage.getItem('access_token');
  const getRefreshToken = () => localStorage.getItem('refresh_token');

  const setTokens = (accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  };

  const clearTokens = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('original_admin_token');
  };

  if (!apiRef.current) {
    apiRef.current = axios.create({
      baseURL: API,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    apiRef.current.interceptors.request.use((config) => {
      const token = getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    apiRef.current.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          const refreshToken = getRefreshToken();
          if (refreshToken) {
            try {
              const response = await axios.post(`${API}/auth/refresh`, {
                refresh_token: refreshToken,
              });
              const { access_token, refresh_token } = response.data;
              setTokens(access_token, refresh_token);
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
              return apiRef.current(originalRequest);
            } catch (refreshError) {
              clearTokens();
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(error);
      }
    );
  }

  const api = apiRef.current;

  const fetchUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    const offlineNow = typeof navigator !== "undefined" ? !navigator.onLine : false;
    try {
      const response = await api.get('/auth/me');
      setUser(response.data.user);
      setBusiness(response.data.business);
      // Cache last known session so offline mode still works.
      try {
        localStorage.setItem('offline_cached_user', JSON.stringify(response.data.user));
        localStorage.setItem('offline_cached_business', JSON.stringify(response.data.business));
      } catch {}
      setImpersonating(response.data.impersonating || false);
    } catch (error) {
      if (offlineNow) {
        // Offline: keep cached session if available.
        try {
          const cachedUser = safeJsonParse(localStorage.getItem('offline_cached_user'), null);
          const cachedBusiness = safeJsonParse(localStorage.getItem('offline_cached_business'), null);
          if (cachedUser) setUser(cachedUser);
          if (cachedBusiness) setBusiness(cachedBusiness);
          return;
        } catch {}
      }
      clearTokens();
      setUser(null);
      setBusiness(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const d = response.data;
    if (d.otp_required === true) {
      const em = String(d.email || email || '')
        .trim()
        .toLowerCase();
      return { otpRequired: true, email: em };
    }
    const { access_token, refresh_token, user: userData } = d;
    if (!access_token || !refresh_token) {
      throw new Error('Unexpected login response. Please try again.');
    }
    setTokens(access_token, refresh_token);
    setUser(userData);
    await fetchUser();
    return { otpRequired: false, user: userData };
  };

  const verifyLoginOtp = async (email, otp, opts = {}) => {
    const body = {
      email: String(email || '')
        .trim()
        .toLowerCase(),
      otp: String(otp || '').trim(),
    };
    if (opts.rememberDevice && opts.newTrustedDeviceToken) {
      body.remember_device = true;
      body.new_trusted_device_token = String(opts.newTrustedDeviceToken).trim();
    }
    const response = await axios.post(`${API}/auth/verify-otp`, body, {
      headers: { 'Content-Type': 'application/json' },
    });
    const { access_token, refresh_token, user: userData } = response.data;
    if (!access_token || !refresh_token) {
      throw new Error('Unexpected verification response. Please try again.');
    }
    setTokens(access_token, refresh_token);
    setUser(userData);
    await fetchUser();
    return { user: userData };
  };

  /** Skip OTP when this browser was previously remembered (server validates token). */
  const verifyLoginTrustedDevice = async (email, trustedToken) => {
    const response = await axios.post(
      `${API}/auth/verify-otp`,
      {
        email: String(email || '')
          .trim()
          .toLowerCase(),
        trusted_device_token: String(trustedToken || '').trim(),
      },
      {
        headers: { 'Content-Type': 'application/json' },
      },
    );
    const { access_token, refresh_token, user: userData } = response.data;
    if (!access_token || !refresh_token) {
      throw new Error('Unexpected verification response. Please try again.');
    }
    setTokens(access_token, refresh_token);
    setUser(userData);
    await fetchUser();
    return { user: userData };
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setBusiness(null);
    setImpersonating(false);
    window.location.href = '/login';
  };

  const checkSubscription = async () => {
    try {
      const response = await api.get('/auth/check-subscription');
      return response.data;
    } catch (error) {
      return { is_valid: false, status: 'error' };
    }
  };

  const startImpersonation = async (businessId) => {
    try {
      const response = await api.post(`/super-admin/businesses/${businessId}/impersonate`);
      const { access_token, original_admin_token } = response.data;
      localStorage.setItem('original_admin_token', original_admin_token);
      localStorage.setItem('access_token', access_token);
      await fetchUser();
      return true;
    } catch (error) {
      console.error('Impersonation failed:', error);
      return false;
    }
  };

  const endImpersonation = async () => {
    try {
      const response = await api.post('/super-admin/end-impersonation');
      const { access_token } = response.data;
      localStorage.setItem('access_token', access_token);
      localStorage.removeItem('original_admin_token');
      await fetchUser();
      return true;
    } catch (error) {
      console.error('End impersonation failed:', error);
      return false;
    }
  };

  const value = {
    user,
    business,
    loading,
    impersonating,
    api,
    login,
    verifyLoginOtp,
    verifyLoginTrustedDevice,
    logout,
    checkSubscription,
    startImpersonation,
    endImpersonation,
    refreshUser: fetchUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
