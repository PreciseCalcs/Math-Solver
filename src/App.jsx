import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AlgebraSolver from './tools/AlgebraSolver/AlgebraSolver';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AlgebraSolver />} />
        <Route path="/algebra-solver" element={<AlgebraSolver />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
