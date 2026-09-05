import React from 'react';
import { Divide } from 'lucide-react';
import { StandaloneToolLayout } from '../StandaloneToolLayout';
import { PolynomialTab } from '../AlgebraSolver/tabs/PolynomialTab';

export default function PolynomialCalculator() {
  return (
    <StandaloneToolLayout
      toolKey="polynomial"
      title="Polynomial Calculator"
      subtitle="Polynomial long division P(x) ÷ D(x), synthetic division tableau for linear divisors (x - c), and polynomial FOIL multiplication with like-term consolidation."
      category="Algebra & Polynomials"
      icon={Divide}
      color="#d97706"
      badgeText="Standalone Calculator"
    >
      <PolynomialTab />
    </StandaloneToolLayout>
  );
}
