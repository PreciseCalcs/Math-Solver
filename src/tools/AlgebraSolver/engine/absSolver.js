// Absolute Value Equation Solver with two-case splitting and verification
import {
  math, approxFrac, texFrac, trimNum, fmtVal, texExpr,
} from './utils.js';
import { solveLinearEquation } from './linearSolver.js';
import { solveQuadraticEquation } from './quadraticSolver.js';

export function findAbsNode(node, v) {
  let absInfo = null;
  node.traverse((n) => {
    if (absInfo) return;
    if (n.isFunctionNode && n.fn.name === 'abs') {
      let hasV = false;
      n.args[0].traverse((sn) => {
        if (sn.isSymbolNode && sn.name === v) hasV = true;
      });
      if (hasV) {
        absInfo = {
          arg: n.args[0].toString(),
          node: n,
        };
      }
    }
  });
  return absInfo;
}

export function solveAbsEquation(L, R, v, decimal = false) {
  let nodeL, nodeR;
  try {
    nodeL = math.parse(L);
    nodeR = math.parse(R);
  } catch {
    return null;
  }

  const absL = findAbsNode(nodeL, v);
  const absR = findAbsNode(nodeR, v);
  if (!absL && !absR) return null;

  const steps = [];
  steps.push({
    title: 'Original absolute value equation',
    desc: 'An equation involving one or more absolute value expressions.',
    tex: `${texExpr(L)} = ${texExpr(R)}`,
  });

  // CASE 1: Absolute value on BOTH sides: |u| = |w|
  if (absL && absR && nodeL.isFunctionNode && nodeL.fn.name === 'abs' && nodeR.isFunctionNode && nodeR.fn.name === 'abs') {
    const u = absL.arg;
    const w = absR.arg;

    steps.push({
      title: 'Split into two branches: u = w or u = -w',
      desc: 'Two expressions have the same absolute value if and only if they are equal or exact opposites.',
      tex: `\\text{Case 1: } ${texExpr(u)} = ${texExpr(w)} \\quad\\text{or}\\quad \\text{Case 2: } ${texExpr(u)} = -\\left(${texExpr(w)}\\right)`,
    });

    const sol1 = solveLinearEquation(u, w, v, decimal) || solveQuadraticEquation(u, w, v, decimal);
    const sol2 = solveLinearEquation(u, `-(${w})`, v, decimal) || solveQuadraticEquation(u, `-(${w})`, v, decimal);

    const allAnswers = [];
    if (sol1?.answers) allAnswers.push(...sol1.answers);
    if (sol2?.answers) allAnswers.push(...sol2.answers);

    // Deduplicate by numeric value
    const uniqueAnswers = [];
    for (const ans of allAnswers) {
      if (!uniqueAnswers.some(u => Math.abs(u.num - ans.num) < 1e-6)) {
        uniqueAnswers.push(ans);
      }
    }

    const ansTex = uniqueAnswers.map(a => `${v} = ${a.tex}`).join(', \\quad ');
    steps.push({
      title: 'Combined solutions',
      desc: 'All solutions from both branches.',
      tex: ansTex || '\\text{No solution } (\\emptyset)',
    });

    return {
      steps,
      answerTex: ansTex || '\\text{No solution } (\\emptyset)',
      answerNote: null,
      answers: uniqueAnswers,
    };
  }

  // CASE 2: Single absolute value isolated or linear in |u|
  // Form: k*|u| + d = R  -> isolate |u| = C
  const primaryAbs = absL || absR;
  const absStr = primaryAbs.node.toString();
  const u = primaryAbs.arg;

  let isolatedC = null;
  let isolatedCTex = '';

  if (absL && !absR && nodeL.isFunctionNode && nodeL.fn.name === 'abs') {
    // Already |u| = R
    isolatedCTex = texExpr(R);
    try { isolatedC = Number(math.evaluate(R)); } catch {}
  } else if (!absL && absR && nodeR.isFunctionNode && nodeR.fn.name === 'abs') {
    // R is |u|, L is other
    isolatedCTex = texExpr(L);
    try { isolatedC = Number(math.evaluate(L)); } catch {}
  } else {
    // Isolate |u| algebraically
    try {
      const expr = `(${L}) - (${R})`;
      // Let T = abs(...)
      const replaced = expr.replace(absStr, '___T___');
      const lin = math.simplify(replaced);
      const d = math.derivative(lin, '___T___');
      const coeff = Number(math.evaluate(math.simplify(d).toString()));
      const constVal = Number(math.evaluate(lin.transform(n => n.isSymbolNode && n.name === '___T___' ? new math.ConstantNode(0) : n).toString()));

      if (coeff !== 0 && isFinite(coeff) && isFinite(constVal)) {
        const cVal = -constVal / coeff;
        isolatedC = cVal;
        const cFrac = approxFrac(cVal, 1000, 1e-9) || math.fraction(cVal);
        isolatedCTex = texFrac(cFrac);

        steps.push({
          title: 'Isolate the absolute value term',
          desc: 'Perform inverse operations (subtracting constants and dividing by coefficients) to isolate |u|.',
          tex: `|${texExpr(u)}| = ${isolatedCTex}`,
        });
      }
    } catch {}
  }

  if (isolatedC !== null && isFinite(isolatedC)) {
    // Check if C < 0
    if (isolatedC < 0) {
      steps.push({
        title: 'Analyze definition of absolute value (No Solution)',
        desc: `The absolute value of any real number represents distance and is always non-negative (|u| ≥ 0). Since the right side is negative (${isolatedCTex} < 0), this equation has no solution.`,
        tex: `|${texExpr(u)}| = ${isolatedCTex} < 0 \\quad\\implies\\quad \\text{False}`,
      });
      return {
        steps,
        answerTex: '\\text{No solution } (\\emptyset)',
        answerNote: 'Absolute value cannot equal a negative number.',
        answers: [],
      };
    }

    // Check if C === 0
    if (Math.abs(isolatedC) < 1e-12) {
      steps.push({
        title: 'Single branch for zero',
        desc: 'The only value whose absolute value is zero is zero itself: |u| = 0 ⇔ u = 0.',
        tex: `${texExpr(u)} = 0`,
      });
      const solZero = solveLinearEquation(u, '0', v, decimal) || solveQuadraticEquation(u, '0', v, decimal);
      if (solZero?.steps) solZero.steps.slice(1).forEach(s => steps.push(s));
      return {
        steps,
        answerTex: solZero?.answerTex || `${v} = 0`,
        answerNote: null,
        answers: solZero?.answers || [{ tex: '0', num: 0 }],
      };
    }

    // C > 0: Two branches: u = C or u = -C
    steps.push({
      title: 'Split into two cases based on definition of absolute value',
      desc: `Since |u| = ${isolatedCTex}, the quantity inside the bars must equal either +${isolatedCTex} or -${isolatedCTex}.`,
      tex: `\\text{Case 1: } ${texExpr(u)} = ${isolatedCTex} \\quad\\text{or}\\quad \\text{Case 2: } ${texExpr(u)} = -${isolatedCTex}`,
    });

    const sol1 = solveLinearEquation(u, String(isolatedC), v, decimal) || solveQuadraticEquation(u, String(isolatedC), v, decimal);
    const sol2 = solveLinearEquation(u, String(-isolatedC), v, decimal) || solveQuadraticEquation(u, String(-isolatedC), v, decimal);

    if (sol1?.steps) {
      steps.push({
        title: `Solve Case 1: ${texExpr(u)} = ${isolatedCTex}`,
        desc: 'Solve the positive branch for the variable.',
        tex: sol1.answerTex || '',
      });
    }

    if (sol2?.steps) {
      steps.push({
        title: `Solve Case 2: ${texExpr(u)} = -${isolatedCTex}`,
        desc: 'Solve the negative branch for the variable.',
        tex: sol2.answerTex || '',
      });
    }

    const combined = [];
    if (sol1?.answers) combined.push(...sol1.answers);
    if (sol2?.answers) combined.push(...sol2.answers);

    // Verification check step
    const checkLines = [];
    let compL = null, compR = null;
    try {
      compL = math.compile(L);
      compR = math.compile(R);
    } catch {}

    const verified = [];
    for (const ans of combined) {
      let lVal = NaN, rVal = NaN;
      try {
        lVal = compL.evaluate({ [v]: ans.num });
        rVal = compR.evaluate({ [v]: ans.num });
      } catch {}
      if (isFinite(lVal) && isFinite(rVal) && Math.abs(lVal - rVal) < 1e-5) {
        verified.push(ans);
        checkLines.push(`\\text{Check } ${v} = ${ans.tex}: \\quad |\\dots| = ${trimNum(lVal)} \\quad\\implies\\quad \\text{True } \\checkmark`);
      }
    }

    if (checkLines.length > 0) {
      steps.push({
        title: 'Verify both solutions in the original equation',
        desc: 'Confirm that both solutions satisfy the original absolute value equality.',
        tex: checkLines.join('\\\\'),
      });
    }

    const ansTex = verified.map(a => `${v} = ${a.tex}`).join(', \\quad ');
    return {
      steps,
      answerTex: ansTex,
      answerNote: null,
      answers: verified,
    };
  }

  return null;
}
