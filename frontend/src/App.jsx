import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AutenticacaoArboris from './components/AutenticacaoArboris/AutenticacaoArboris';
import RequireSession from './components/RequireSession';
import InitialBootSplash from './components/InitialBootSplash';
import { BootGateProvider } from './components/BootGate';
import { AuthTransitionProvider, useAuthTransition } from './components/AutenticacaoArboris/AuthTransitionController';
import { DashboardPreferencesProvider } from './lib/dashboardPreferences';
import { HomePage, LegalPage } from './components/PublicPages';

const AuthCallback = lazy(() => import('./components/AutenticacaoArboris/AuthCallback'));
const AuthConfirm = lazy(() => import('./components/AutenticacaoArboris/AuthCallback').then((module) => ({ default: module.AuthConfirm })));
const Dashboard = lazy(() => import('./components/Dashboard/DashboardPage'));

function AppContent() {
  const { foregroundActive, hideAppStage } = useAuthTransition();
  return <>
      <div className="app-stage" data-foreground-hidden={hideAppStage} inert={foregroundActive} aria-hidden={foregroundActive}>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/privacidade" element={<LegalPage type="privacy" />} />
            <Route path="/termos" element={<LegalPage type="terms" />} />
            <Route path="/cookies" element={<LegalPage type="cookies" />} />
            <Route path="/login" element={<AutenticacaoArboris />} />
            <Route path="/cadastro" element={<AutenticacaoArboris />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/confirm" element={<AuthConfirm />} />
            <Route path="/dashboard" element={<RequireSession><Dashboard /></RequireSession>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      <InitialBootSplash />
    </>;
}

function App() {
  return (
    <DashboardPreferencesProvider>
    <BootGateProvider>
    <AuthTransitionProvider>
      <AppContent />
    </AuthTransitionProvider>
    </BootGateProvider>
    </DashboardPreferencesProvider>
  );
}

export default App;
