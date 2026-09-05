import React from 'react';
import { FunctionSquare } from 'lucide-react';
import { StandaloneToolLayout } from '../StandaloneToolLayout';
import { EquationTab } from '../AlgebraSolver/tabs/EquationTab';

export default function EquationSolver() {
  return (
    <StandaloneToolLayout
      toolKey="equation"
      title="Algebra & Equation Solver"
      subtitle="Solve linear, quadratic, cubic, rational, radical, absolute value, exponential, and inequality expressions with step-by-step transformations and interactive coordinate graphing."
      category="Algebra & Equations"
      icon={FunctionSquare}
      color="#c8522a"
      badgeText="Standalone Solver"
    >
      <EquationTab />
    </StandaloneToolLayout>
  );
}
