import React from 'react';
import { Compass } from 'lucide-react';
import { UpcomingToolPreview } from '../UpcomingToolPreview';

export default function NumericalMethodsCalculator() {
  return (
    <UpcomingToolPreview
      title="Numerical Methods Calculator"
      subtitle="Iterative root finding algorithms (Newton-Raphson, Bisection, Secant), numerical integration (Simpson's, Trapezoidal), and ODE solvers (Euler, Runge-Kutta RK4) with convergence tables."
      category="Computational Mathematics"
      icon={Compass}
      color="#059669"
      plannedFeatures={[
        { name: 'Root Finding Algorithms', desc: 'Newton-Raphson (x_{n+1} = x_n - f(x_n)/f\'(x_n)), Bisection method with bracketing intervals, and Secant method.' },
        { name: 'Numerical Quadrature', desc: 'Trapezoidal rule, Simpson’s 1/3 and 3/8 rules, Gaussian quadrature with error tolerance specifications.' },
        { name: 'Ordinary Differential Equations (ODEs)', desc: 'Initial value solvers including Forward Euler, Modified Euler / Heun’s method, and 4th-order Runge-Kutta (RK4).' },
        { name: 'Interpolation & Curve Fitting', desc: 'Lagrange interpolating polynomials, Newton divided differences, and least-squares regression.' },
        { name: 'Iterative Linear Solvers', desc: 'Jacobi and Gauss-Seidel relaxation algorithms for large sparse linear systems with spectral radius verification.' },
      ]}
      exampleFormulas={[
        { label: 'Newton-Raphson', tex: 'x_{n+1} = x_n - \\frac{f(x_n)}{f\'(x_n)},\\quad \\varepsilon_a = \\left|\\frac{x_{n+1} - x_n}{x_{n+1}}\\right|' },
        { label: 'Runge-Kutta RK4', tex: 'y_{n+1} = y_n + \\frac{h}{6}\\left( k_1 + 2k_2 + 2k_3 + k_4 \\right)' },
        { label: 'Simpson’s Rule', tex: '\\int_a^b f(x)\\,dx \\approx \\frac{h}{3}\\left[ f(x_0) + 4\\sum f(x_{\\text{odd}}) + 2\\sum f(x_{\\text{even}}) + f(x_n) \\right]' },
      ]}
      relatedActiveTools={[
        { title: 'System of Equations Solver', path: '/system-of-equations' },
        { title: 'Matrix Calculator', path: '/matrix' },
        { title: 'Algebra & Equation Solver', path: '/equations' },
      ]}
    />
  );
}
