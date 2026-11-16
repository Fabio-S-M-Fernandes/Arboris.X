import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AutenticacaoArboris from './components/AutenticacaoArboris/AutenticacaoArboris';
import RequireSession from './components/RequireSession';
import InitialBootSplash from './components/InitialBootSplash';
import { BootGateProvider } from './components/BootGate';
import { AuthTransitionProvider } from './components/AutenticacaoArboris/AuthTransitionController';

const AuthCallback = lazy(() => import('./components/AutenticacaoArboris/AuthCallback'));
const AuthConfirm = lazy(() => import('./components/AutenticacaoArboris/AuthCallback').then((module) => ({ default: module.AuthConfirm })));
const Dashboard = lazy(() => import('./components/Dashboard/DashboardPage'));

function App() {
  return (
    <BootGateProvider>
    <AuthTransitionProvider>
      {/* O destino renderiza por tras; o boot so fica por cima e controla a saida. */}
      <div className="app-stage">
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<AutenticacaoArboris />}>
              <Route index element={null} />
              <Route path="login" element={null} />
              <Route path="cadastro" element={null} />
            </Route>
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/confirm" element={<AuthConfirm />} />
            <Route path="/dashboard" element={<RequireSession><Dashboard /></RequireSession>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </div>
      <InitialBootSplash />
    </AuthTransitionProvider>
    </BootGateProvider>
  );
}

export default App;
