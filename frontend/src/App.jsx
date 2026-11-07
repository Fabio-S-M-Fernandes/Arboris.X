import { Routes, Route, Navigate } from 'react-router-dom';
import AutenticacaoArboris from './components/AutenticacaoArboris/AutenticacaoArboris';
import Dashboard from './components/Dashboard/DashboardPage';
import { DASHBOARD_ROUTES } from './routes/dashboardRoutes';
import InitialBootSplash from './components/InitialBootSplash';
import { BootGateProvider } from './components/BootGate';
import { AuthTransitionProvider } from './components/AutenticacaoArboris/AuthTransitionController';

function LoginPage() {
  return <AutenticacaoArboris mode="login" />;
}

function CadastroPage() {
  return <AutenticacaoArboris mode="cadastro" />;
}

function App() {
  return (
    <BootGateProvider>
    <AuthTransitionProvider>
      {/* O destino renderiza por tras; o boot so fica por cima e controla a saida. */}
      <div className="app-stage">
        <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/cadastro" element={<CadastroPage />} />
        {DASHBOARD_ROUTES.map(({ path }) => <Route key={path} path={path} element={<Dashboard />} />)}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <InitialBootSplash />
    </AuthTransitionProvider>
    </BootGateProvider>
  );
}

export default App;
