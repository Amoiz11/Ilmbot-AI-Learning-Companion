import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import IntroScreen from './components/IntroScreen';
import ParticleBackground from './components/ParticleBackground';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import CardsGrid from './components/CardsGrid';
import FooterQuote from './components/FooterQuote';
import ProtectedRoute from './components/ProtectedRoute';
import { ConversationProvider } from './context/ConversationContext';
import { scrollToTop } from './utils/scrollToTop';

// Route-level code splitting via React.lazy
const LoginScreen = lazy(() => import('./components/LoginScreen'));
const WelcomeScreen = lazy(() => import('./components/WelcomeScreen'));
const LearningCoach = lazy(() => import('./components/LearningCoach'));
const CodingCoach = lazy(() => import('./components/CodingCoach'));
const SmartRevision = lazy(() => import('./components/SmartRevision'));
const ProfileScreen = lazy(() => import('./components/ProfileScreen'));

function PageLoadingFallback() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '16px',
        color: '#94A3B8',
        animation: 'pageFadeIn 0.3s ease-out'
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          border: '3px solid rgba(0, 242, 254, 0.15)',
          borderTopColor: '#00F2FE',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      <span style={{ fontSize: '13px', fontWeight: 500, letterSpacing: '0.04em', color: 'rgba(255, 255, 255, 0.6)' }}>
        Loading...
      </span>
    </div>
  );
}

function ScrollToTopOnNavigation() {
  const location = useLocation();

  useEffect(() => {
    scrollToTop();
  }, [location.pathname]);

  return null;
}

function AppShell({ page }) {
  return (
    <div className="app-container">
      {/* Full-screen ambient floating glowing particle background */}
      <ParticleBackground count={26} opacity={0.75} />

      {/* Decorative top-right circuit-line pattern overlay */}
      <div className="top-right-circuit-pattern"></div>

      {/* Main 2-column app shell */}
      <Sidebar />

      <main key={page} className="main-content page-fade-in">
        {page === 'dashboard' && (
          <>
            <TopBar currentScreen="dashboard" />
            <CardsGrid />
            <FooterQuote />
          </>
        )}

        <Suspense fallback={<PageLoadingFallback />}>
          {page === 'learning-coach' && <LearningCoach />}
          {page === 'coding-coach' && <CodingCoach />}
          {page === 'smart-revision' && <SmartRevision />}
          {page === 'profile' && <ProfileScreen />}
        </Suspense>
      </main>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();

  return (
    <ConversationProvider>
      <ScrollToTopOnNavigation />
      <Routes>
        {/* Entry Flow Routes */}
        <Route path="/" element={<IntroScreen onComplete={() => navigate('/login')} />} />
        <Route path="/intro" element={<IntroScreen onComplete={() => navigate('/login')} />} />
        <Route
          path="/login"
          element={
            <Suspense fallback={<PageLoadingFallback />}>
              <LoginScreen onLogin={() => navigate('/welcome')} />
            </Suspense>
          }
        />
        <Route
          path="/welcome"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoadingFallback />}>
                <WelcomeScreen onComplete={() => navigate('/dashboard')} />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Protected App Shell Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppShell page="dashboard" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/learning-coach"
          element={
            <ProtectedRoute>
              <AppShell page="learning-coach" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coding-coach"
          element={
            <ProtectedRoute>
              <AppShell page="coding-coach" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/smart-revision"
          element={
            <ProtectedRoute>
              <AppShell page="smart-revision" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/smart-revision/:sessionId"
          element={
            <ProtectedRoute>
              <AppShell page="smart-revision" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/smart-revision/:sessionId/quiz"
          element={
            <ProtectedRoute>
              <AppShell page="smart-revision" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <AppShell page="profile" />
            </ProtectedRoute>
          }
        />

        {/* Fallback Catch-All */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ConversationProvider>
  );
}
