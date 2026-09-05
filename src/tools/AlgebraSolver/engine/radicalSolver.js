// Radical Equation Solver with full teacher derivations and extraneous root checks
import {
  math, approxFrac, texFrac, trimNum, fmtVal, texExpr,
} from './utils.js';
import { solveLinearEquation } from './linearSolver.js';
import { solveQuadraticEquation } from './quadraticSolver.js';

// Detect if an expression contains sqrt, cbrt, or nthRoot of v
export function findRadicalNode(node, v) {
  let radInfo = null;
  node.traverse((n) => {
    if (radInfo) return;
    if (n.isFunctionNode) {
      if (['sqrt', 'cbrt'].includes(n.fn.name)) {
        let hasV = false;
        n.args[0].traverse((sn) => {
          if (sn.isSymbolNode && sn.name === v) hasV = true;
        });
        if (hasV) {
          radInfo = {
            fn: n.fn.name,
            arg: n.args[0].toString(),
            index: n.fn.name === 'cbrt' ? 3 : 2,
            node: n,
          };
        }
      } else if (n.fn.name === 'nthRoot') {
        let hasV = false;
        n.args[0].traverse((sn) => {
          if (sn.isSymbolNode && sn.name === v) hasV = true;
        });
        if (hasV) {
          let idx = 2;
          try { idx = Number(math.evaluate(n.args[1].toString())) || 2; } catch {}
          radInfo = {
            fn: 'nthRoot',
            arg: n.args[0].toString(),
            index: idx,
            node: n,
          };
        }
      }
    }
  });
  return radInfo;
}

export function solveRadicalEquation(L, R, v, decimal = false) {
  let nodeL, nodeR;
  try {
    nodeL = math.parse(L);
    nodeR = math.parse(R);
  } catch {
    return null;
  }

  const radL = findRadicalNode(nodeL, v);
  const radR = findRadicalNode(nodeR, v);
  if (!radL && !radR) return null;

  const steps = [];
  steps.push({
    title: 'Original radical equation',
    desc: 'An equation where the unknown variable appears under a radical sign.',
    tex: `${texExpr(L)} = ${texExpr(R)}`,
  });

  // Primary radical info
  const primaryRad = radL || radR;
  const index = primaryRad.index;

  if (index % 2 === 0) {
    steps.push({
      title: 'Domain condition for real roots',
      desc: `The expression under an even radical (index ${index}) must be non-negative: radicand ≥ 0.`,
      tex: `${texExpr(primaryRad.arg)} \\ge 0`,
    });
  }

  // Isolate the radical term:
  // Move non-radical terms to other side: (L) - (R) = 0 -> Rad = RHS
  // Or test if single radical is already on one side
  let radSide = '';
  let otherSide = '';

  if (radL && !radR) {
    // If L is just the radical
    if (nodeL.isFunctionNode && ['sqrt', 'cbrt', 'nthRoot'].includes(nodeL.fn.name)) {
      radSide = L;
      otherSide = R;
    } else {
      // Isolate radical: subtract non-radical parts from L
      try {
        const radStr = primaryRad.node.toString();
        const nonRad = math.simplify(`(${L}) - (${radStr})`).toString();
        radSide = radStr;
        otherSide = math.simplify(`(${R}) - (${nonRad})`).toString();
        steps.push({
          title: 'Isolate the radical on one side',
          desc: 'Move all non-radical terms to the opposite side of the equation.',
          tex: `${texExpr(radSide)} = ${texExpr(otherSide)}`,
        });
      } catch {
        radSide = L;
        otherSide = R;
      }
    }
  } else if (!radL && radR) {
    if (nodeR.isFunctionNode && ['sqrt', 'cbrt', 'nthRoot'].includes(nodeR.fn.name)) {
      radSide = R;
      otherSide = L;
    } else {
      try {
        const radStr = primaryRad.node.toString();
        const nonRad = math.simplify(`(${R}) - (${radStr})`).toString();
        radSide = radStr;
        otherSide = math.simplify(`(${L}) - (${nonRad})`).toString();
        steps.push({
          title: 'Isolate the radical on one side',
          desc: 'Move all non-radical terms to the opposite side of the equation.',
          tex: `${texExpr(radSide)} = ${texExpr(otherSide)}`,
        });
      } catch {
        radSide = R;
        otherSide = L;
      }
    }
  } else {
    // Both sides contain radicals, e.g. sqrt(x+7) = sqrt(x) + 1
    radSide = L;
    otherSide = R;
  }

  // Step: Raise both sides to the power of index
  const powerWord = index === 2 ? 'Square' : index === 3 ? 'Cube' : `Raise to the power of ${index}`;
  steps.push({
    title: `${powerWord} both sides to eliminate the radical`,
    desc: `Apply the power property of equality: (√[${index}]{u})^${index} = u.`,
    tex: `\\left(${texExpr(radSide)}\\right)^${index} = \\left(${texExpr(otherSide)}\\right)^${index}`,
  });

  // Expand after squaring
  let polyAfterPower = '';
  try {
    const isLRad = radSide === L;
    let lhsSquared = `(${radSide})^${index}`;
    let rhsSquared = `(${otherSide})^${index}`;

    // If radSide is exactly the radical function, (sqrt(arg))^2 = arg
    if (radSide === L && primaryRad === radL) {
      lhsSquared = `(${primaryRad.arg})`;
    } else if (radSide === R && primaryRad === radR) {
      lhsSquared = `(${primaryRad.arg})`;
    }

    polyAfterPower = math.rationalize(`(${lhsSquared}) - (${rhsSquared})`, {}, false).toString();
  } catch (err) {
    return null;
  }

  // If another radical still remains (two radicals equation), we can repeat or fall back
  if (polyAfterPower.includes('sqrt') || polyAfterPower.includes('cbrt')) {
    // Second radical isolation
    steps.push({
      title: 'A second radical remains',
      desc: 'Isolate the remaining radical term and square both sides again.',
      tex: `${texExpr(polyAfterPower)} = 0`,
    });
  } else {
    steps.push({
      title: 'Polynomial equation after clearing radical',
      desc: 'Expand both sides and collect all terms to one side.',
      tex: `${texExpr(polyAfterPower)} = 0`,
    });
  }

  // Solve the resulting polynomial
  let innerSol = solveLinearEquation(polyAfterPower, '0', v, decimal);
  if (!innerSol) {
    innerSol = solveQuadraticEquation(polyAfterPower, '0', v, decimal);
  }
  if (!innerSol) return null;

  if (innerSol.steps && innerSol.steps.length > 1) {
    innerSol.steps.slice(1).forEach((s) => steps.push(s));
  }

  // Candidate solutions
  const candidates = innerSol.answers || [];
  const validAnswers = [];
  const extraneousAnswers = [];

  // Check each candidate in original L and R
  let cL = null, cR = null;
  try {
    cL = math.compile(L);
    cR = math.compile(R);
  } catch {}

  for (const cand of candidates) {
    if (isNaN(cand.num)) continue;
    let evalL = NaN, evalR = NaN;
    try {
      evalL = cL.evaluate({ [v]: cand.num });
      evalR = cR.evaluate({ [v]: cand.num });
    } catch {}

    const isValid = isFinite(evalL) && isFinite(evalR) && Math.abs(evalL - evalR) < 1e-5;
    if (isValid) {
      validAnswers.push({ ...cand, evalL, evalR });
    } else {
      extraneousAnswers.push({ ...cand, evalL, evalR });
    }
  }

  // Step: Extraneous root verification
  const checkTexLines = [];
  for (const vAns of validAnswers) {
    checkTexLines.push(
      `\\text{Check } ${v}: \\quad \\text{LHS} = ${trimNum(vAns.evalL)}, \\; \\text{RHS} = ${trimNum(vAns.evalR)} \\quad\\implies\\quad \\text{Valid } \\checkmark`
    );
  }
  for (const eAns of extraneousAnswers) {
    const lStr = isNaN(eAns.evalL) ? '\\text{undefined}' : trimNum(eAns.evalL);
    const rStr = isNaN(eAns.evalR) ? '\\text{undefined}' : trimNum(eAns.evalR);
    checkTexLines.push(
      `\\text{Check } ${v} = ${eAns.tex}: \\quad \\text{LHS} = ${lStr}, \\; \\text{RHS} = ${rStr} \\quad\\implies\\quad \\text{Extraneous (Reject) } \\boldsymbol{\\times}`
    );
  }

  steps.push({
    title: 'Extraneous root check in original equation',
    desc: 'Squaring both sides can introduce extraneous (false) solutions. Substitute each candidate back into the original equation to verify.',
    tex: checkTexLines.join('\\\\'),
  });

  if (validAnswers.length === 0) {
    steps.push({
      title: 'Conclusion',
      desc: 'All candidate roots were extraneous. The equation has no real solution.',
      tex: '\\text{No solution } (\\emptyset)',
    });
    return {
      steps,
      answerTex: '\\text{No solution } (\\emptyset)',
      answerNote: 'Candidate root(s) failed verification in the original radical equation.',
    };
  }

  const validTex = validAnswers.map((va) => `${v} = ${va.tex}`).join(', \\quad ');
  steps.push({
    title: 'Final valid solution(s)',
    desc: 'The verified solution(s) to the radical equation.',
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
