import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { googleLogout } from '@react-oauth/google';

const AuthContext = createContext(null);

const STORAGE_KEY = 'ilmbot_google_token';

function getInitialAuthState() {
  try {
    const token = localStorage.getItem(STORAGE_KEY);
    if (token) {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;

      if (decoded.exp && decoded.exp > currentTime) {
        return {
          user: {
            name: decoded.name || 'Learner',
            email: decoded.email || '',
            picture: decoded.picture || '',
            sub: decoded.sub || '',
            ...decoded
          },
          authStatus: 'authenticated'
        };
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch (err) {
    console.error('Error restoring auth state from token:', err);
    localStorage.removeItem(STORAGE_KEY);
  }
  return { user: null, authStatus: 'unauthenticated' };
}

export function AuthProvider({ children }) {
  const [initialState] = useState(getInitialAuthState);
  const [authStatus, setAuthStatus] = useState(initialState.authStatus);
  const [user, setUser] = useState(initialState.user);
  const [dbUser, setDbUser] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Restore dbUser from backend on mount if authenticated
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (token && authStatus === 'authenticated' && !dbUser) {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      fetch(`${apiBaseUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setDbUser(data);
          } else {
            console.warn('Initial GET /users/me returned non-ok status:', res.status);
          }
        })
        .catch((err) => {
          console.warn('Failed to fetch /users/me on init:', err);
        });
    }
  }, [authStatus]);

  const login = (credentialResponse) => {
    try {
      setAuthError(null);
      const idToken = credentialResponse?.credential;
      if (!idToken) {
        throw new Error('No credential ID token received from Google sign-in.');
      }

      const decoded = jwtDecode(idToken);
      const currentTime = Date.now() / 1000;

      if (decoded.exp && decoded.exp <= currentTime) {
        throw new Error('Received token has already expired.');
      }

      localStorage.setItem(STORAGE_KEY, idToken);

      const userData = {
        name: decoded.name || 'Learner',
        email: decoded.email || '',
        picture: decoded.picture || '',
        sub: decoded.sub || '',
        ...decoded
      };

      setUser(userData);
      setAuthStatus('authenticated');

      // Non-blocking sync call to /auth/google endpoint
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      fetch(`${apiBaseUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          google_id: userData.sub,
          name: userData.name,
          email: userData.email,
          picture: userData.picture,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            console.warn('Backend /auth/google error response:', res.status, errBody);
          } else {
            const data = await res.json();
            console.log('Backend /auth/google sync successful:', data);
            setDbUser(data);
          }
        })
        .catch((syncErr) => {
          console.warn('Failed to sync user with backend (backend may be down):', syncErr);
        });

      return userData;
    } catch (err) {
      console.error('Login error:', err);
      setAuthError(err.message || 'Something went wrong signing you in. Please try again.');
      setAuthStatus('unauthenticated');
      throw err;
    }
  };

  const logout = () => {
    try {
      googleLogout();
    } catch (err) {
      console.error('Google logout error:', err);
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setDbUser(null);
      setAuthError(null);
      setAuthStatus('unauthenticated');
    }
  };

  const value = {
    user,
    token: localStorage.getItem(STORAGE_KEY),
    dbUser,
    setDbUser,
    authStatus,
    authError,
    setAuthError,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
