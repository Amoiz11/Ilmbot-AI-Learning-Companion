import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import ParticleBackground from './ParticleBackground';
import IlmBotLogo from './IlmBotLogo';

import { Navigate } from 'react-router-dom';

export default function LoginScreen({ onLogin }) {
  const navigate = useNavigate();
  const { login, authStatus } = useAuth();
  const [isExiting, setIsExiting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // If already authenticated and not in active login flow, redirect immediately
  useEffect(() => {
    if (authStatus === 'authenticated' && !isLoggingIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [authStatus, isLoggingIn, navigate]);

  if (authStatus === 'authenticated' && !isLoggingIn) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSuccess = async (credentialResponse) => {
    setIsLoggingIn(true);
    setIsLoading(true);
    setErrorMessage(null);
    try {
      login(credentialResponse);
      setIsExiting(true);
      setTimeout(() => {
        if (onLogin) {
          onLogin();
        } else {
          navigate('/welcome', { replace: true });
        }
      }, 260);
    } catch (err) {
      setIsLoggingIn(false);
      setIsLoading(false);
      setErrorMessage(err.message || 'Something went wrong signing you in. Please try again.');
    }
  };

  const handleError = () => {
    setIsLoading(false);
    setErrorMessage('Something went wrong signing you in. Please try again.');
  };

  return (
    <div className={`full-screen-container login-screen ${isExiting ? 'fade-exit' : 'fade-enter'}`}>
      <ParticleBackground count={28} />

      <div className="glass-panel glass-login-card">
        {/* Logo as main visual */}
        <div className="login-logo-header">
          <IlmBotLogo size={180} showGlow={true} fetchPriority="high" loading="eager" />
        </div>

        <div className="login-text-block">
          <span className="login-eyebrow">Welcome to</span>
          <h1 className="login-wordmark">ILMBOT</h1>
          <p className="login-subtitle">Your Personal AI Learning Companion</p>
        </div>

        {errorMessage && (
          <div className="login-error-banner" style={{
            color: '#FF6B6B',
            backgroundColor: 'rgba(255, 107, 107, 0.12)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
            textAlign: 'center',
            marginBottom: '16px',
            maxWidth: '320px',
            lineHeight: '1.4'
          }}>
            {errorMessage}
          </div>
        )}

        <div className="google-login-wrapper" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justify: 'center',
          position: 'relative',
          minHeight: '44px',
          gap: '12px'
        }}>
          {isLoading ? (
            <div className="google-login-btn-disabled" style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              gap: '10px',
              padding: '12px 24px',
              borderRadius: '24px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: 'var(--text-muted, #94A3B8)',
              fontSize: '14px',
              cursor: 'not-allowed'
            }}>
              <span className="btn-spinner" style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderTop: '2px solid var(--green-primary, #00E699)',
                borderRadius: '50%',
                display: 'inline-block',
                animation: 'spin 0.8s linear infinite'
              }}></span>
              Signing in...
            </div>
          ) : (
            <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
              <GoogleLogin
                onSuccess={handleSuccess}
                onError={handleError}
                theme="filled_black"
                shape="pill"
                size="large"
                text="continue_with"
                width="280"
              />
            </GoogleOAuthProvider>
          )}
        </div>

      </div>
    </div>
  );
}
