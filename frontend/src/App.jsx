import { Routes, Route, Navigate } from 'react-router-dom';
import AutenticacaoArboris from './components/AutenticacaoArboris/AutenticacaoArboris';
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
        <Route path="/" element={<AutenticacaoArboris mode="login" />} />
        <Route path="/login" element={<AutenticacaoArboris mode="login" />} />
        <Route path="/cadastro" element={<AutenticacaoArboris mode="cadastro" />} />
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
