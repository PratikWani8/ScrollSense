import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OverviewDashboard } from './pages/OverviewDashboard';
import { SessionHistoryPage } from './pages/SessionHistoryPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { GoalsPage } from './pages/GoalsPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { SettingsPrivacyPage } from './pages/SettingsPrivacyPage';
import { AIInsightsPage } from './pages/AIInsightsPage';
import { PublicPrivacyPage } from './pages/PublicPrivacyPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Protected Route wrapper with Dashboard shell layout
const ProtectedShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950 text-slate-400 text-xs">
        <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col font-sans">
      <Navbar />
      <div className="flex-1">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/privacy" element={<PublicPrivacyPage />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedShell>
                <OverviewDashboard />
              </ProtectedShell>
            }
          />
          <Route
            path="/sessions"
            element={
              <ProtectedShell>
                <SessionHistoryPage />
              </ProtectedShell>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedShell>
                <AnalyticsPage />
              </ProtectedShell>
            }
          />
          <Route
            path="/insights"
            element={
              <ProtectedShell>
                <AIInsightsPage />
              </ProtectedShell>
            }
          />
          <Route
            path="/goals"
            element={
              <ProtectedShell>
                <GoalsPage />
              </ProtectedShell>
            }
          />
          <Route
            path="/devices"
            element={
              <ProtectedShell>
                <OnboardingPage />
              </ProtectedShell>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedShell>
                <SettingsPrivacyPage />
              </ProtectedShell>
            }
          />

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </div>
  );
};

export default App;
