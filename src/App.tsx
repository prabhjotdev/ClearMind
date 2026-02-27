import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { SyncProvider } from './contexts/SyncContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { KeyboardShortcutsProvider } from './contexts/KeyboardShortcutsContext';
import AppShell from './components/layout/AppShell';
import LoginPage from './components/auth/LoginPage';
import SignupPage from './components/auth/SignupPage';
import ResetPasswordPage from './components/auth/ResetPasswordPage';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import './styles/global.css';

// Lazy-load the heavy route views to reduce initial bundle
const DayView = lazy(() => import('./components/views/DayView'));
const WeekView = lazy(() => import('./components/views/WeekView'));
const MonthView = lazy(() => import('./components/views/MonthView'));
const SettingsView = lazy(() => import('./components/views/SettingsView'));
const EmergencyFundView = lazy(() => import('./components/views/EmergencyFundView'));

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#FAFAFA',
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1F2937', marginBottom: '8px' }}>
          ClearMind
        </h1>
        <p style={{ fontSize: '14px', color: '#9CA3AF' }}>Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, userProfile, loading } = useAuth();
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  if (loading) return <LoadingScreen />;
  if (!currentUser) return <Navigate to="/login" replace />;

  // Show onboarding for new users
  if (userProfile && !userProfile.onboardingCompleted && !onboardingDismissed) {
    return <OnboardingFlow onComplete={() => setOnboardingDismissed(true)} />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (currentUser) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignupPage /></PublicRoute>} />
        <Route path="/reset-password" element={<PublicRoute><ResetPasswordPage /></PublicRoute>} />

        {/* Protected routes inside AppShell */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/" element={<DayView />} />
          <Route path="/week" element={<WeekView />} />
          <Route path="/month" element={<MonthView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="/emergency-fund" element={<EmergencyFundView />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <SyncProvider>
            <SettingsProvider>
              <KeyboardShortcutsProvider>
                <AppRoutes />
              </KeyboardShortcutsProvider>
            </SettingsProvider>
          </SyncProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
