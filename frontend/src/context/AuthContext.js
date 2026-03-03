import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';

const AuthContext = createContext(null);
const API_BASE_URL = process.env.REACT_APP_API_URL;
const TOKEN_KEY = 'bootcamp_token';
const USER_KEY = 'bootcamp_user';

const resolvePrimaryRole = (roles = [], role = 'user') => {
  const list = Array.isArray(roles) && roles.length > 0 ? roles : [role || 'user'];
  if (list.includes('admin')) return 'admin';
  if (list.includes('trainer')) return 'trainer';
  return 'user';
};

const normalizeUser = (user) => {
  const roles = Array.isArray(user?.roles) && user.roles.length > 0 ? user.roles : [user?.role || 'user'];
  const primaryRole = resolvePrimaryRole(roles, user?.role);

  return {
    ...user,
    roles,
    role: primaryRole,
    status: user?.status || 'active',
    documentNumber: user?.documentNumber || '',
    forcePasswordChange: Boolean(user?.forcePasswordChange),
    plan: user?.plan || 'none',
    classesLeft: user?.plan === 'libre' ? 'Ilimitadas' : (user?.classesLeft ?? 0),
    nextClass: user?.nextClass ?? null,
    avatar: user?.avatar ?? null,
    memberSince: user?.memberSince
      ? String(user.memberSince).slice(0, 10)
      : new Date().toISOString().split('T')[0]
  };
};

const getApiErrorMessage = (data, fallback) => {
  if (data?.message) return data.message;
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    return data.errors[0]?.msg || fallback;
  }
  return fallback;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bootstrapSession = async () => {
      try {
        const token = localStorage.getItem(TOKEN_KEY);
        const savedUser = localStorage.getItem(USER_KEY);

        if (savedUser) {
          setUser(normalizeUser(JSON.parse(savedUser)));
        }

        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setUser(null);
          setLoading(false);
          return;
        }

        const data = await response.json();
        const normalized = normalizeUser(data.user);
        setUser(normalized);
        localStorage.setItem(USER_KEY, JSON.stringify(normalized));
      } catch (_error) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrapSession();
  }, []);

  const login = async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(getApiErrorMessage(data, 'No se pudo iniciar sesion'));
    }

    const normalized = normalizeUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    setUser(normalized);
    return normalized;
  };

  const register = async (userData) => {
    const payload = {
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      password: userData.password,
      plan: userData.plan,
      weight: userData.weight ? Number(userData.weight) : null,
      height: userData.height ? Number(userData.height) : null
    };

    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(getApiErrorMessage(data, 'No se pudo registrar usuario'));
    }

    const normalized = normalizeUser(data.user);
    localStorage.setItem(TOKEN_KEY, data.token);
    localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    setUser(normalized);
    return normalized;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const updateUser = (updates) => {
    const updated = normalizeUser({ ...user, ...updates });
    setUser(updated);
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
  };

  const value = useMemo(
    () => ({ user, login, logout, register, updateUser, loading }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);

