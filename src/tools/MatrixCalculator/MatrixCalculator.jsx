import React from 'react';
import { Grid3x3 } from 'lucide-react';
import { StandaloneToolLayout } from '../StandaloneToolLayout';
import { MatrixTab } from '../AlgebraSolver/tabs/MatrixTab';

export default function MatrixCalculator() {
  return (
    <StandaloneToolLayout
      toolKey="matrix"
      title="Matrix Calculator"
      subtitle="Matrix operations, determinants, matrix inverse, eigenvalues & eigenvectors, rank, trace, RREF, LU decomposition, and powers with step-by-step mathematical derivations."
      category="Linear Algebra"
      icon={Grid3x3}
      color="#4f46e5"
      badgeText="Standalone Calculator"
    >
      <MatrixTab />
    </StandaloneToolLayout>
  );
}
