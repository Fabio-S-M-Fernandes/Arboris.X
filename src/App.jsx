import { Routes, Route, Navigate } from 'react-router-dom';
import AutenticacaoArboris from './componentes/AutenticacaoArboris/AutenticacaoArboris'; 
import Dashboard from './componentes/Dashboard/DashboardPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AutenticacaoArboris />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;