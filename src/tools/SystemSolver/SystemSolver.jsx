import React from 'react';
import { Rows3 } from 'lucide-react';
import { StandaloneToolLayout } from '../StandaloneToolLayout';
import { SystemTab } from '../AlgebraSolver/tabs/SystemTab';

export default function SystemSolver() {
  return (
    <StandaloneToolLayout
      toolKey="system"
      title="System of Equations Solver"
      subtitle="Solve linear and non-linear simultaneous systems using Gauss-Jordan elimination, Cramer’s rule, substitution, and matrix inversion with 2D geometric intersection graphs."
      category="Algebra & Systems"
      icon={Rows3}
      color="#0d9488"
      badgeText="Standalone Solver"
    >
      <SystemTab />
    </StandaloneToolLayout>
  );
}
