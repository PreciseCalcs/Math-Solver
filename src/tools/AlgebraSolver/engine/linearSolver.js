// Linear Equation Solver with teacher-grade step-by-step pedagogy
import {
  math, approxFrac, texFrac, trimNum, fmtVal, gcdInt, lcmInt, texExpr,
} from './utils.js';

// Helper: parse a linear expression as c * v + k (with exact fractions)
export function parseLinearCoeffs(str, v) {
  try {
    const node = math.parse(str);
    // test derivative
    const d = math.derivative(node, v);
    // If derivative contains v, it is NOT linear
    let foundV = false;
    d.traverse((n) => {
      if (n.isSymbolNode && n.name === v) foundV = true;
    });
    if (foundV) return null;

    // Evaluate slope / coefficient
    const dSimp = math.simplify(d);
    const cNum = Number(math.evaluate(dSimp.toString()));
    if (!isFinite(cNum)) return null;

    // Evaluate constant by substituting v = 0
    const zeroed = node.transform((n) =>
      n.isSymbolNode && n.name === v ? new math.ConstantNode(0) : n
    );
    const kNum = Number(math.evaluate(zeroed.toString()));
    if (!isFinite(kNum)) return null;

    const cFrac = approxFrac(cNum, 100000, 1e-10) || math.fraction(cNum);
    const kFrac = approxFrac(kNum, 100000, 1e-10) || math.fraction(kNum);

    return { coeff: cFrac, constant: kFrac, node };
  } catch {
    return null;
  }
}

// Find constant numeric denominators in expression
export function findConstantDenominators(node, v) {
  const dens = [];
  node.traverse((n, path, parent) => {
    if (n.isOperatorNode && n.op === '/') {
      const denomNode = n.args[1];
      // Check if denomNode does NOT contain v
      let hasV = false;
      denomNode.traverse((sn) => { if (sn.isSymbolNode && sn.name === v) hasV = true; });
      if (!hasV) {
        try {
          const val = Number(math.evaluate(denomNode.toString()));
          if (Number.isInteger(val) && val > 1 && val <= 1000) {
            dens.push(val);
          }
        } catch {}
      }
    }
  });
  return dens;
}

// Check if string contains parentheses like 2(x - 3) or (x + 1)
function hasParentheses(str) {
  return /\([^)]+\)/.test(str);
}

// Format linear expression: c*v + k
export function formatLinearSide(c, k, v) {
  const cNum = math.number(c);
  const kNum = math.number(k);
  if (cNum === 0 && kNum === 0) return '0';
  if (cNum === 0) return texFrac(k);

  let cTex = '';
  if (cNum === 1) cTex = v;
  else if (cNum === -1) cTex = `-${v}`;
  else cTex = `${texFrac(c)}${v}`;

  if (kNum === 0) return cTex;
  if (kNum > 0) return `${cTex} + ${texFrac(k)}`;
  return `${cTex} - ${texFrac(math.abs(k))}`;
}

export function solveLinearEquation(L, R, v, decimal = false) {
  const steps = [];
  const origTex = `${texExpr(L)} = ${texExpr(R)}`;
  steps.push({
    title: 'Original linear equation',
    desc: 'Solve for the unknown variable.',
    tex: origTex,
  });

  const parsedL = parseLinearCoeffs(L, v);
  const parsedR = parseLinearCoeffs(R, v);
  if (!parsedL || !parsedR) return null; // Not linear

  let curL = L;
  let curR = R;

  // Step A: Clear fractions if constant denominators exist
  const densL = findConstantDenominators(parsedL.node, v);
  const densR = findConstantDenominators(parsedR.node, v);
  const allDens = [...new Set([...densL, ...densR])];

  if (allDens.length > 0) {
    const lcd = allDens.reduce((acc, d) => lcmInt(acc, d), 1);
    if (lcd > 1) {
      steps.push({
        title: 'Clear fractions using the Least Common Denominator (LCD)',
        desc: `The denominators in the equation are ${allDens.join(', ')}. Multiply both sides by the LCD (${lcd}) to clear all fractions.`,
        tex: `${lcd} \\cdot \\left(${texExpr(curL)}\\right) = ${lcd} \\cdot \\left(${texExpr(curR)}\\right)`,
      });

      try {
        const clearedL = math.rationalize(`${lcd} * (${curL})`, {}, false).toString();
        const clearedR = math.rationalize(`${lcd} * (${curR})`, {}, false).toString();
        curL = clearedL;
        curR = clearedR;
        steps.push({
          title: 'Equation with denominators cleared',
          desc: 'All fractional terms are now converted to integer multiples.',
          tex: `${texExpr(curL)} = ${texExpr(curR)}`,
        });
      } catch {}
    }
  }

  // Step B: Distributive property (expand parentheses if any)
  if (hasParentheses(curL) || hasParentheses(curR)) {
    try {
      const expL = math.rationalize(curL, {}, false).toString();
      const expR = math.rationalize(curR, {}, false).toString();
      if (expL !== curL || expR !== curR) {
        steps.push({
          title: 'Apply the Distributive Property',
          desc: 'Multiply factors across parentheses and expand all grouped terms: a(b + c) = ab + ac.',
          tex: `${texExpr(expL)} = ${texExpr(expR)}`,
        });
        curL = expL;
        curR = expR;
      }
    } catch {}
  }

  // Current coefficients on both sides
  const cL = parseLinearCoeffs(curL, v);
  const cR = parseLinearCoeffs(curR, v);
  if (!cL || !cR) return null;

  let leftC = cL.coeff;
  let leftK = cL.constant;
  let rightC = cR.coeff;
  let rightK = cR.constant;

  // Step C: Combine like terms on both sides if not already in c*v + k form
  const sideLTex = formatLinearSide(leftC, leftK, v);
  const sideRTex = formatLinearSide(rightC, rightK, v);
  if (`${sideLTex} = ${sideRTex}` !== `${texExpr(curL)} = ${texExpr(curR)}`) {
    steps.push({
      title: 'Combine like terms on each side',
      desc: 'Combine variable terms and constant numbers on both sides separately.',
      tex: `${sideLTex} = ${sideRTex}`,
    });
  }

  // Step D: Move variable terms to the left side
  if (math.number(rightC) !== 0) {
    const oppC = math.multiply(rightC, -1);
    const newLeftC = math.subtract(leftC, rightC);
    const signWord = math.number(rightC) > 0 ? 'Subtract' : 'Add';
    const valTex = math.number(math.abs(rightC)) === 1 ? v : `${texFrac(math.abs(rightC))}${v}`;

    steps.push({
      title: 'Move variable terms to the left side',
      desc: `${signWord} ${valTex} from both sides so all variable terms are gathered on the left.`,
      tex: `${formatLinearSide(newLeftC, leftK, v)} = ${formatLinearSide(math.fraction(0), rightK, v)}`,
    });

    leftC = newLeftC;
    rightC = math.fraction(0);
  }

  // Step E: Move constant terms to the right side
  if (math.number(leftK) !== 0) {
    const newRightK = math.subtract(rightK, leftK);
    const signWord = math.number(leftK) > 0 ? 'Subtract' : 'Add';
    const valTex = texFrac(math.abs(leftK));

    steps.push({
      title: 'Move constant terms to the right side',
      desc: `${signWord} ${valTex} from both sides so all constant numbers are gathered on the right.`,
      tex: `${formatLinearSide(leftC, math.fraction(0), v)} = ${texFrac(newRightK)}`,
    });

    leftK = math.fraction(0);
    rightK = newRightK;
  }

  // Step F: Analyze the reduced form: A*v = B
  const coeffNum = math.number(leftC);
  const constNum = math.number(rightK);

  // Case 1: Identity (0 = 0)
  if (coeffNum === 0 && constNum === 0) {
    steps.push({
      title: 'Identity: Infinitely Many Solutions',
      desc: 'Both sides simplify to identical values (0 = 0). The equation is an identity and holds true for every real value of the variable.',
      tex: '0 = 0 \\quad\\implies\\quad x \\in \\mathbb{R}',
    });
    return {
      steps,
      answerTex: `${v} \\in \\mathbb{R} \\quad \\text{(All real numbers)}`,
      answerNote: 'Infinite number of solutions: any real number satisfies this identity.',
    };
  }

  // Case 2: Contradiction (0 = B where B != 0)
  if (coeffNum === 0 && constNum !== 0) {
    steps.push({
      title: 'Contradiction: No Solution',
      desc: `The equation simplifies to 0 = ${texFrac(rightK)}, which is impossible and false for all values of ${v}.`,
      tex: `0 = ${texFrac(rightK)} \\quad\\implies\\quad \\text{False}`,
    });
    return {
      steps,
      answerTex: '\\text{No solution } (\\emptyset)',
      answerNote: 'Contradiction: no real number satisfies this equation.',
    };
  }

  // Case 3: Unique solution (A*v = B with A != 0)
  const rootFrac = math.divide(rightK, leftC);
  const rootNum = math.number(rootFrac);

  if (coeffNum !== 1) {
    steps.push({
      title: 'Isolate the variable',
      desc: coeffNum === -1
        ? `Multiply or divide both sides by -1 to isolate ${v}.`
        : `Divide both sides by the coefficient ${texFrac(leftC)} to isolate ${v}.`,
      tex: `${v} = \\frac{${texFrac(rightK)}}{${texFrac(leftC)}} = ${texFrac(rootFrac)}`,
    });
  }

  // Step G: Verification check step
  try {
    const fl = math.compile(L);
    const fr = math.compile(R);
    const evalL = fl.evaluate({ [v]: rootNum });
    const evalR = fr.evaluate({ [v]: rootNum });
    if (isFinite(evalL) && isFinite(evalR) && Math.abs(evalL - evalR) < 1e-6) {
      steps.push({
        title: 'Check the solution in the original equation',
        desc: `Substitute ${v} = ${texFrac(rootFrac)} back into both sides of the original equation to verify.`,
        tex: `\\text{LHS} = ${trimNum(evalL)}, \\quad \\text{RHS} = ${trimNum(evalR)} \\quad\\implies\\quad \\text{Valid } \\checkmark`,
      });
    }
  } catch {}

  const ansTex = decimal
    ? `${v} = ${trimNum(rootNum)}`
    : `${v} = ${texFrac(rootFrac)}`;

  const extraNote = !decimal && !Number.isInteger(rootNum)
    ? `Decimal approximation: ${v} ≈ ${trimNum(rootNum)}`
    : null;

  return {
    steps,
    answerTex: ansTex,
    answerNote: extraNote,
    answers: [{ tex: fmtVal(rootFrac, decimal), num: rootNum }],
  };
}
