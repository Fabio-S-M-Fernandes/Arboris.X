import { isConstrainedDevice } from './performance';
import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ArborisAuth from './components/ArborisAuth'; 

function App() {
  return (
    <Routes>
      <Route path="/" element={<ArborisAuth />} />      
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;