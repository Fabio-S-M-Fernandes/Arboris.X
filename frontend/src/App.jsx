import { Routes, Route, Navigate } from 'react-router-dom';
import AutenticacaoArboris from './components/AutenticacaoArboris/AutenticacaoArboris';
import Dashboard from './components/Dashboard/DashboardPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AutenticacaoArboris />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/operacoes" element={<Dashboard initialSection="Operações" />} />
      <Route path="/dashboard/alertas" element={<Dashboard initialSection="Alertas" />} />
      <Route path="/dashboard/impacto" element={<Dashboard initialSection="Impacto" />} />
      <Route path="/dashboard/relatorios" element={<Dashboard initialSection="Relatórios" />} />
      <Route path="/dashboard/administracao" element={<Dashboard initialSection="Administração" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
