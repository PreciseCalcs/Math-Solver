import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ToolsHub from './tools/ToolsHub/ToolsHub';
import MatrixCalculator from './tools/MatrixCalculator/MatrixCalculator';
import SystemSolver from './tools/SystemSolver/SystemSolver';
import ComplexCalculator from './tools/ComplexCalculator/ComplexCalculator';
import SeriesCalculator from './tools/SeriesCalculator/SeriesCalculator';
import PolynomialCalculator from './tools/PolynomialCalculator/PolynomialCalculator';
import EquationSolver from './tools/EquationSolver/EquationSolver';
import AlgebraSolver from './tools/AlgebraSolver/AlgebraSolver';
import CalculusCalculator from './tools/CalculusCalculator/CalculusCalculator';
import VectorCalculator from './tools/VectorCalculator/VectorCalculator';
import NumericalMethodsCalculator from './tools/NumericalMethods/NumericalMethodsCalculator';
import TrigonometryCalculator from './tools/TrigonometryCalculator/TrigonometryCalculator';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Tools Hub / Directory */}
        <Route path="/" element={<ToolsHub />} />
        <Route path="/tools" element={<ToolsHub />} />

        {/* Standalone Active Calculators */}
        <Route path="/matrix" element={<MatrixCalculator />} />
        <Route path="/matrix-calculator" element={<MatrixCalculator />} />

        <Route path="/system-of-equations" element={<SystemSolver />} />
        <Route path="/system" element={<SystemSolver />} />
        <Route path="/systems" element={<SystemSolver />} />

        <Route path="/complex" element={<ComplexCalculator />} />
        <Route path="/complex-numbers" element={<ComplexCalculator />} />
        <Route path="/complex-calculator" element={<ComplexCalculator />} />

        <Route path="/series" element={<SeriesCalculator />} />
        <Route path="/series-calculator" element={<SeriesCalculator />} />

        <Route path="/polynomial" element={<PolynomialCalculator />} />
        <Route path="/polynomial-calculator" element={<PolynomialCalculator />} />

        <Route path="/equations" element={<EquationSolver />} />
        <Route path="/equation" element={<EquationSolver />} />
        <Route path="/equation-solver" element={<EquationSolver />} />

        {/* Multi-Tab Unified Solver */}
        <Route path="/algebra-solver" element={<AlgebraSolver />} />

        {/* Upcoming Mathematical Modules */}
        <Route path="/calculus" element={<CalculusCalculator />} />
        <Route path="/vectors" element={<VectorCalculator />} />
        <Route path="/numerical-methods" element={<NumericalMethodsCalculator />} />
        <Route path="/trigonometry" element={<TrigonometryCalculator />} />

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
