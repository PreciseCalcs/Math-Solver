import React from 'react';
import { Grid3x3 } from 'lucide-react';
import { StandaloneToolLayout } from '../StandaloneToolLayout';
import { MatrixTab } from '../AlgebraSolver/tabs/MatrixTab';

export default function MatrixCalculator() {
  return (
    <StandaloneToolLayout
      toolKey="matrix"
      title="Matrix Calculator"
      subtitle="Matrix arithmetic (A + B, A − B, A × B), scalar scaling, powers (Aᵏ), trace, matrix norms, null space, column & row spaces, LU decomposition, determinants, inverses, eigenvalues, rank, and RREF with complete step-by-step mathematical derivations."
      category="Linear Algebra"
      icon={Grid3x3}
      color="#4f46e5"
      badgeText="Standalone Calculator"
    >
      <MatrixTab />
    </StandaloneToolLayout>
  );
}
