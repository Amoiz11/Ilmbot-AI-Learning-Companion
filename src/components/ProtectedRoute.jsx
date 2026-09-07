import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { authStatus } = useAuth();

  if (authStatus === 'loading') {
    return (
      <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 9999, pointerEvents: 'none' }}>
        <div
          style={{
            width: '20px',
            height: '20px',
            border: '2px solid rgba(0, 230, 153, 0.2)',
            borderTop: '2px solid var(--green-primary, #00E699)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }}
        />
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  return children;
}
