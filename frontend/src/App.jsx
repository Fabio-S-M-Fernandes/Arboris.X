import { Routes, Route, Navigate } from 'react-router-dom';
import AutenticacaoArboris from './components/AutenticacaoArboris/AutenticacaoArboris';
import AuthCallback, { AuthConfirm } from './components/AutenticacaoArboris/AuthCallback';
import RequireSession from './components/RequireSession';
import Dashboard from './components/Dashboard/DashboardPage';
import InitialBootSplash from './components/InitialBootSplash';
import { BootGateProvider } from './components/BootGate';
import { AuthTransitionProvider } from './components/AutenticacaoArboris/AuthTransitionController';

function App() {
  return (
    <BootGateProvider>
    <AuthTransitionProvider>
      {/* O destino renderiza por tras; o boot so fica por cima e controla a saida. */}
      <div className="app-stage">
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
      </div>
      <InitialBootSplash />
    </AuthTransitionProvider>
    </BootGateProvider>
  );
}

export default App;
