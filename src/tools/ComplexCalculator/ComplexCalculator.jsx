import React from 'react';
import { Hash } from 'lucide-react';
import { StandaloneToolLayout } from '../StandaloneToolLayout';
import { ComplexTab } from '../AlgebraSolver/tabs/ComplexTab';

export default function ComplexCalculator() {
  return (
    <StandaloneToolLayout
      toolKey="complex"
      title="Complex Numbers Calculator"
      subtitle="Complex number arithmetic, conjugate, absolute value / modulus, argument, polar form (r ∠ θ), exponential representation, De Moivre powers, and roots of unity."
      category="Arithmetic & Complex Analysis"
      icon={Hash}
      color="#7c3aed"
      badgeText="Standalone Calculator"
    >
      <ComplexTab />
    </StandaloneToolLayout>
  );
}
