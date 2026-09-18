import { Routes, Route, Navigate } from 'react-router-dom';
import AutenticacaoArboris from './componentes/AutenticacaoArboris/AutenticacaoArboris'; 



function App() {
  return (
    <Routes>
      <Route path="/" element={<AutenticacaoArboris />} />      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;