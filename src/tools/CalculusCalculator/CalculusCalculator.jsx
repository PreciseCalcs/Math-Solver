import React from 'react';
import { TrendingUp } from 'lucide-react';
import { UpcomingToolPreview } from '../UpcomingToolPreview';

export default function CalculusCalculator() {
  return (
    <UpcomingToolPreview
      title="Calculus Calculator"
      subtitle="Symbolic and numerical differentiation, definite & indefinite integrals, multivariable partial derivatives, limits with L'Hôpital's rule, and Taylor/Maclaurin series."
      category="Calculus & Analysis"
      icon={TrendingUp}
      color="#e11d48"
      plannedFeatures={[
        { name: 'Symbolic Differentiation', desc: 'Compute first, second, and higher-order derivatives with product, quotient, and chain rule step expansions.' },
        { name: 'Indefinite & Definite Integrals', desc: 'Evaluate integrals via substitution, integration by parts, partial fractions, and trigonometric substitutions.' },
        { name: 'Limits & Asymptotes', desc: 'Compute one-sided and two-sided limits, limits at infinity, and apply L’Hôpital’s rule for indeterminate forms 0/0 and ∞/∞.' },
        { name: 'Multivariable Calculus', desc: 'Gradient vectors ∇f, directional derivatives, curl, divergence, and double/triple integrals.' },
        { name: 'Taylor & Maclaurin Expansions', desc: 'Expand arbitrary functions about x = c with order n approximations and Lagrange remainder bounds.' },
      ]}
      exampleFormulas={[
        { label: 'Derivative', tex: '\\frac{d}{dx}\\left[ x^3 e^{2x} \\sin(x) \\right] = e^{2x}\\left( 3x^2 \\sin x + 2x^3 \\sin x + x^3 \\cos x \\right)' },
        { label: 'Definite Integral', tex: '\\int_{0}^{\\pi} x \\sin(x)\\, dx = \\left[ -x \\cos x + \\sin x \\right]_{0}^{\\pi} = \\pi' },
        { label: 'Limit', tex: '\\lim_{x \\to 0} \\frac{\\sin(3x)}{x} = 3' },
      ]}
      relatedActiveTools={[
        { title: 'Algebra & Equation Solver', path: '/equations' },
        { title: 'Series & Sequences Calculator', path: '/series' },
        { title: 'Polynomial Calculator', path: '/polynomial' },
      ]}
    />
  );
}
