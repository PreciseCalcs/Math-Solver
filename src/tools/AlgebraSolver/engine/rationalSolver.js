// Rational Equation Solver with domain restrictions and extraneous root verification
import {
  math, approxFrac, texFrac, trimNum, fmtVal, gcdInt, lcmInt, texExpr,
} from './utils.js';
import { solveLinearEquation } from './linearSolver.js';
import { solveQuadraticEquation } from './quadraticSolver.js';

// Extract all denominator expressions containing variable v from an AST node
export function extractVariableDenominators(node, v) {
  const denoms = [];
  node.traverse((n) => {
    if (n.isOperatorNode && n.op === '/') {
      const denomNode = n.args[1];
      let hasV = false;
      denomNode.traverse((sn) => {
        if (sn.isSymbolNode && sn.name === v) hasV = true;
      });
      if (hasV) {
        denoms.push(denomNode.toString());
      }
    }
  });
  return [...new Set(denoms)];
}

export function solveRationalEquation(L, R, v, decimal = false) {
  let nodeL, nodeR;
  try {
    nodeL = math.parse(L);
    nodeR = math.parse(R);
  } catch {
    return null;
  }

  const denomsL = extractVariableDenominators(nodeL, v);
  const denomsR = extractVariableDenominators(nodeR, v);
  const allDenoms = [...new Set([...denomsL, ...denomsR])];

  // If no variable in denominator, not a rational equation
  if (allDenoms.length === 0) return null;

  const steps = [];
  steps.push({
    title: 'Original rational equation',
    desc: 'An equation containing variable terms in one or more denominators.',
    tex: `${texExpr(L)} = ${texExpr(R)}`,
  });

  // Step 1: Find domain restrictions (excluded values)
  const excludedValues = [];
  const excludedTexArr = [];
  for (const denomStr of allDenoms) {
    try {
      const dSub = math.rationalize(denomStr).toString();
      // Test simple linear denominator dSub = 0
      const lin = math.simplify(dSub);
      const d = math.derivative(lin, v);
      const coeff = Number(math.evaluate(math.simplify(d).toString()));
      const constVal = Number(math.evaluate(lin.transform(n => n.isSymbolNode && n.name === v ? new math.ConstantNode(0) : n).toString()));
      if (coeff !== 0 && isFinite(coeff) && isFinite(constVal)) {
        const root = -constVal / coeff;
        excludedValues.push(root);
        const f = approxFrac(root, 1000, 1e-9) || math.fraction(root);
        excludedTexArr.push(`${v} \\neq ${texFrac(f)}`);
      }
    } catch {}
  }

  if (excludedTexArr.length > 0) {
    steps.push({
      title: 'Determine domain restrictions (Excluded Values)',
      desc: 'Division by zero is undefined. Set each denominator equal to zero to identify values that the variable cannot equal.',
      tex: excludedTexArr.join(', \\quad '),
    });
  }

  // Step 2: Multiply by LCD
  // If single denominator:
  let lcdStr = allDenoms.join(' * ');
  if (allDenoms.length === 1) {
    lcdStr = allDenoms[0];
  }

  steps.push({
    title: 'Multiply both sides by the Common Denominator',
    desc: `Multiply every term by (${allDenoms.map(d => texExpr(d)).join(')(')}) to eliminate fractions from the equation.`,
    tex: `\\left(${texExpr(lcdStr)}\\right) \\cdot \\left(${texExpr(L)}\\right) = \\left(${texExpr(lcdStr)}\\right) \\cdot \\left(${texExpr(R)}\\right)`,
  });

  // Clear fractions algebraically:
  // (L) - (R) = 0  -> rationalize into P(x) / Q(x) = 0 -> P(x) = 0
  let numPolyStr = '';
  try {
    const diff = `(${L}) - (${R})`;
    const rat = math.rationalize(diff, {}, true);
    if (!rat || !rat.numerator) return null;
    numPolyStr = rat.numerator.toString();
  } catch {
    return null;
  }

  steps.push({
    title: 'Simplify to standard polynomial equation',
    desc: 'Expand and combine all like terms to set the resulting polynomial equal to zero.',
    tex: `${texExpr(numPolyStr)} = 0`,
  });

  // Solve the resulting numerator polynomial
  let innerSol = solveLinearEquation(numPolyStr, '0', v, decimal);
  if (!innerSol) {
    innerSol = solveQuadraticEquation(numPolyStr, '0', v, decimal);
  }

  if (!innerSol) {
    return null;
  }

  // Add the solving steps from inner solver (skipping its original equation title)
  if (innerSol.steps && innerSol.steps.length > 1) {
    innerSol.steps.slice(1).forEach((s) => steps.push(s));
  }

  // Check candidate answers against excluded values
  const candidateAnswers = innerSol.answers || [];
  const validAnswers = [];
  const extraneousAnswers = [];

  for (const cand of candidateAnswers) {
    const isExtraneous = excludedValues.some((ex) => Math.abs(ex - cand.num) < 1e-7);
    if (isExtraneous) {
      extraneousAnswers.push(cand);
    } else {
      validAnswers.push(cand);
    }
  }

  if (extraneousAnswers.length > 0) {
    steps.push({
      title: 'Extraneous root verification',
      desc: `Check candidate solution(s) against the domain restrictions. Any value that makes an original denominator zero must be rejected.`,
      tex: extraneousAnswers.map((ea) => `${v} = ${ea.tex} \\quad\\implies\\quad \\text{Extraneous (division by zero)} \\quad \\boldsymbol{\\times}`).join('\\\\'),
    });
  }

  if (validAnswers.length === 0) {
    steps.push({
      title: 'Conclusion',
      desc: 'All candidate solutions are extraneous because they cause division by zero. The equation has no solution.',
      tex: '\\text{No solution } (\\emptyset)',
    });
    return {
      steps,
      answerTex: '\\text{No solution } (\\emptyset)',
      answerNote: 'All candidate solutions were extraneous due to division by zero in the original equation.',
    };
  }

  const validTex = validAnswers.map((va) => `${v} = ${va.tex}`).join(', \\quad ');
  steps.push({
    title: 'Final valid solution(s)',
    desc: 'The valid solution(s) satisfy the original equation and the domain requirements.',
    tex: validTex,
  });

  return {
    steps,
    answerTex: validTex,
    answerNote: extraneousAnswers.length > 0
      ? `Rejected extraneous root(s): ${extraneousAnswers.map((e) => `${v} = ${e.tex}`).join(', ')}`
      : null,
    answers: validAnswers,
  };
}
