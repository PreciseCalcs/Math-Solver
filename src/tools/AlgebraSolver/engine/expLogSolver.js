// Exponential & Logarithmic Equation Solver with teacher-grade derivations
import {
  math, approxFrac, texFrac, trimNum, fmtVal, texExpr,
} from './utils.js';
import { solveLinearEquation } from './linearSolver.js';
import { solveQuadraticEquation } from './quadraticSolver.js';

// Check if an integer n is a power of base b (e.g. 32 is 2^5, 27 is 3^3)
function getExactPower(n, b) {
  if (n <= 0 || b <= 1) return null;
  let p = 0;
  let cur = 1;
  while (cur < n && p < 40) {
    cur *= b;
    p++;
  }
  return cur === n ? p : null;
}

// Find base integer if both are powers of a small prime (2, 3, 5, 6, 7, 10)
function findCommonBase(b1, b2) {
  for (const p of [2, 3, 5, 6, 7, 10]) {
    const pow1 = getExactPower(b1, p);
    const pow2 = getExactPower(b2, p);
    if (pow1 !== null && pow2 !== null) {
      return { base: p, p1: pow1, p2: pow2 };
    }
  }
  return null;
}

// Detect exponential form: a^(f(x)) or exp(f(x))
export function findExpNode(node, v) {
  let expInfo = null;
  node.traverse((n) => {
    if (expInfo) return;
    if (n.isOperatorNode && n.op === '^') {
      const baseNode = n.args[0];
      const powNode = n.args[1];
      let hasVInPow = false;
      powNode.traverse((sn) => { if (sn.isSymbolNode && sn.name === v) hasVInPow = true; });
      let hasVInBase = false;
      baseNode.traverse((sn) => { if (sn.isSymbolNode && sn.name === v) hasVInBase = true; });

      if (hasVInPow && !hasVInBase) {
        expInfo = {
          base: baseNode.toString(),
          pow: powNode.toString(),
          node: n,
        };
      }
    } else if (n.isFunctionNode && n.fn.name === 'exp') {
      let hasV = false;
      n.args[0].traverse((sn) => { if (sn.isSymbolNode && sn.name === v) hasV = true; });
      if (hasV) {
        expInfo = {
          base: 'e',
          pow: n.args[0].toString(),
          node: n,
        };
      }
    }
  });
  return expInfo;
}

// Detect log form: log(arg), ln(arg), log10(arg), log2(arg)
export function findLogNodes(node, v) {
  const logs = [];
  node.traverse((n) => {
    if (n.isFunctionNode && ['log', 'ln', 'log10', 'log2'].includes(n.fn.name)) {
      let hasV = false;
      n.args[0].traverse((sn) => { if (sn.isSymbolNode && sn.name === v) hasV = true; });
      if (hasV) {
        let base = 10;
        if (n.fn.name === 'ln' || (n.fn.name === 'log' && n.args.length === 1)) {
          // In our preprocessor: ln -> log (mathjs natural log), log -> log10
          base = n.fn.name === 'ln' ? 'e' : 10;
        } else if (n.fn.name === 'log2') {
          base = 2;
        } else if (n.fn.name === 'log10') {
          base = 10;
        }
        logs.push({
          fn: n.fn.name,
          base,
          arg: n.args[0].toString(),
          node: n,
        });
      }
    }
  });
  return logs;
}

export function solveExpEquation(L, R, v, decimal = false) {
  let nodeL, nodeR;
  try {
    nodeL = math.parse(L);
    nodeR = math.parse(R);
  } catch {
    return null;
  }

  const expL = findExpNode(nodeL, v);
  const expR = findExpNode(nodeR, v);
  if (!expL && !expR) return null;

  const steps = [];
  steps.push({
    title: 'Original exponential equation',
    desc: 'An equation where the unknown variable appears in an exponent.',
    tex: `${texExpr(L)} = ${texExpr(R)}`,
  });

  const primary = expL || expR;
  const baseStr = primary.base;
  const powStr = primary.pow;

  // Case A: Isolated b^(f(x)) = C
  let cVal = null;
  let cTex = '';
  if (expL && !expR && nodeL.isOperatorNode && nodeL.op === '^') {
    cTex = texExpr(R);
    try { cVal = Number(math.evaluate(R)); } catch {}
  } else if (!expL && expR && nodeR.isOperatorNode && nodeR.op === '^') {
    cTex = texExpr(L);
    try { cVal = Number(math.evaluate(L)); } catch {}
  }

  if (cVal !== null && isFinite(cVal)) {
    if (cVal <= 0) {
      steps.push({
        title: 'Analyze range of exponential function (No Solution)',
        desc: `For any positive base b, b^(f(x)) is strictly positive for all real numbers (b^u > 0). Since the other side is ${cVal} ≤ 0, no real solution exists.`,
        tex: `${texExpr(baseStr)}^{${texExpr(powStr)}} = ${cVal} \\le 0 \\quad\\implies\\quad \\text{False}`,
      });
      return {
        steps,
        answerTex: '\\text{No real solution } (\\emptyset)',
        answerNote: 'Exponential functions with positive bases never equal zero or negative numbers.',
        answers: [],
      };
    }

    // Check common integer base
    let baseNum = NaN;
    try { baseNum = Number(math.evaluate(baseStr)); } catch {}

    if (Number.isInteger(baseNum) && Number.isInteger(cVal)) {
      const common = findCommonBase(baseNum, cVal);
      if (common) {
        const { base: bInt, p1, p2 } = common;
        steps.push({
          title: 'Express both sides using a common base',
          desc: `Notice that ${baseNum} = ${bInt}^${p1} and ${cVal} = ${bInt}^${p2}. Rewrite both sides with base ${bInt}.`,
          tex: `\\left(${bInt}^${p1}\\right)^{${texExpr(powStr)}} = ${bInt}^${p2} \\quad\\implies\\quad ${bInt}^{${p1}\\cdot(${texExpr(powStr)})} = ${bInt}^${p2}`,
        });

        steps.push({
          title: 'Apply the One-to-One Property of Exponents',
          desc: 'Since the bases are equal (b^u = b^w ⇔ u = w), equate the exponents.',
          tex: `${p1 > 1 ? `${p1} \\cdot \\left(${texExpr(powStr)}\\right)` : texExpr(powStr)} = ${p2}`,
        });

        const newL = p1 > 1 ? `${p1} * (${powStr})` : powStr;
        const innerSol = solveLinearEquation(newL, String(p2), v, decimal) || solveQuadraticEquation(newL, String(p2), v, decimal);
        if (innerSol?.steps) innerSol.steps.slice(1).forEach(s => steps.push(s));
        return {
          steps,
          answerTex: innerSol?.answerTex || '',
          answerNote: null,
          answers: innerSol?.answers || [],
        };
      }
    }

    // General: Take natural log of both sides
    const lnBase = baseStr === 'e' ? '1' : `\\ln(${baseStr})`;
    steps.push({
      title: 'Take the natural logarithm (ln) of both sides',
      desc: 'Use logarithms to bring the variable down from the exponent: ln(b^u) = u · ln(b).',
      tex: `\\ln\\left(${texExpr(baseStr)}^{${texExpr(powStr)}}\\right) = \\ln\\left(${cTex}\\right)`,
    });

    if (baseStr === 'e') {
      steps.push({
        title: 'Apply inverse property: ln(e^u) = u',
        desc: 'The natural logarithm and the exponential base e are inverse operations.',
        tex: `${texExpr(powStr)} = \\ln(${cTex})`,
      });
      const rhsVal = Math.log(cVal);
      const innerSol = solveLinearEquation(powStr, String(rhsVal), v, decimal);
      if (innerSol?.steps) innerSol.steps.slice(1).forEach(s => steps.push(s));

      const ansTex = decimal
        ? `${v} \\approx ${trimNum(innerSol?.answers?.[0]?.num ?? rhsVal)}`
        : `${v} = \\ln(${cTex})`;
      return {
        steps,
        answerTex: ansTex,
        answerNote: !decimal ? `Decimal: ${v} ≈ ${trimNum(Math.log(cVal))}` : null,
        answers: [{ tex: `\\ln(${cTex})`, num: Math.log(cVal) }],
      };
    } else {
      steps.push({
        title: 'Apply the Power Property of Logarithms',
        desc: 'Bring the exponent in front as a multiplier: ln(b^u) = u · ln(b).',
        tex: `\\left(${texExpr(powStr)}\\right) \\cdot \\ln(${baseStr}) = \\ln(${cTex})`,
      });

      steps.push({
        title: 'Divide by ln(base)',
        desc: `Divide both sides by ln(${baseStr}) to isolate the exponent.`,
        tex: `${texExpr(powStr)} = \\frac{\\ln(${cTex})}{\\ln(${baseStr})}`,
      });

      const logRatio = Math.log(cVal) / Math.log(baseNum);
      const innerSol = solveLinearEquation(powStr, String(logRatio), v, decimal);
      if (innerSol?.steps) innerSol.steps.slice(1).forEach(s => steps.push(s));

      const finalVal = innerSol?.answers?.[0]?.num ?? logRatio;
      const ansTex = decimal
        ? `${v} \\approx ${trimNum(finalVal)}`
        : `${v} = \\frac{\\ln(${cTex})}{\\ln(${baseStr})}`;

      return {
        steps,
        answerTex: ansTex,
        answerNote: !decimal ? `Decimal approximation: ${v} ≈ ${trimNum(finalVal)}` : null,
        answers: [{ tex: ansTex, num: finalVal }],
      };
    }
  }

  return null;
}

export function solveLogEquation(L, R, v, decimal = false) {
  let nodeL, nodeR;
  try {
    nodeL = math.parse(L);
    nodeR = math.parse(R);
  } catch {
    return null;
  }

  const logsL = findLogNodes(nodeL, v);
  const logsR = findLogNodes(nodeR, v);
  const allLogs = [...logsL, ...logsR];
  if (allLogs.length === 0) return null;

  const steps = [];
  steps.push({
    title: 'Original logarithmic equation',
    desc: 'An equation containing logarithmic terms of the unknown variable.',
    tex: `${texExpr(L)} = ${texExpr(R)}`,
  });

  // Step 1: Domain restrictions: argument > 0
  const domConditions = allLogs.map(l => `${texExpr(l.arg)} > 0`);
  steps.push({
    title: 'Domain restrictions for logarithms',
    desc: 'The argument of every logarithm must be strictly positive (greater than zero).',
    tex: domConditions.join(', \\quad '),
  });

  // CASE 1: Single log: log_b(f(x)) = C
  if (allLogs.length === 1 && (logsL.length === 1 && !logsR.length)) {
    const lg = logsL[0];
    const base = lg.base === 'e' ? 'e' : lg.base;
    const arg = lg.arg;

    // Check if RHS is a constant
    let rhsVal = null;
    try { rhsVal = Number(math.evaluate(R)); } catch {}

    if (rhsVal !== null && isFinite(rhsVal)) {
      steps.push({
        title: 'Convert to exponential form',
        desc: `Apply the fundamental definition: log_b(A) = C ⇔ A = b^C.`,
        tex: `${texExpr(arg)} = ${base}^{${texExpr(R)}}`,
      });

      const bNum = base === 'e' ? Math.E : Number(base);
      const expVal = Math.pow(bNum, rhsVal);

      let innerSol = solveLinearEquation(arg, String(expVal), v, decimal);
      if (!innerSol) innerSol = solveQuadraticEquation(arg, String(expVal), v, decimal);

      if (innerSol?.steps) innerSol.steps.slice(1).forEach(s => steps.push(s));

      const candidates = innerSol?.answers || [];
      const valid = [];
      const extraneous = [];

      // Check arg > 0
      const cArg = math.compile(arg);
      for (const cand of candidates) {
        let aVal = NaN;
        try { aVal = cArg.evaluate({ [v]: cand.num }); } catch {}
        if (aVal > 1e-9) valid.push(cand);
        else extraneous.push(cand);
      }

      if (extraneous.length > 0) {
        steps.push({
          title: 'Extraneous root check',
          desc: 'Reject any candidate solution that makes the argument non-positive (≤ 0).',
          tex: extraneous.map(e => `${v} = ${e.tex} \\quad\\implies\\quad \\text{Argument } \\le 0 \\text{ (Reject)} \\quad \\boldsymbol{\\times}`).join('\\\\'),
        });
      }

      const ansTex = valid.map(a => `${v} = ${a.tex}`).join(', \\quad ');
      return {
        steps,
        answerTex: ansTex || '\\text{No solution } (\\emptyset)',
        answerNote: null,
        answers: valid,
      };
    }
  }

  // CASE 2: Sum of two logs: log(A) + log(B) = C -> log(A * B) = C
  if (logsL.length === 2 && logsR.length === 0) {
    const l1 = logsL[0];
    const l2 = logsL[1];
    if (l1.base === l2.base) {
      const base = l1.base === 'e' ? 'e' : l1.base;
      steps.push({
        title: 'Apply the Product Property of Logarithms',
        desc: 'Condense the sum of logarithms into the logarithm of a product: log_b(A) + log_b(B) = log_b(A · B).',
        tex: `\\log_{${base}}\\left((${texExpr(l1.arg)}) \\cdot (${texExpr(l2.arg)})\\right) = ${texExpr(R)}`,
      });

      let rhsVal = null;
      try { rhsVal = Number(math.evaluate(R)); } catch {}

      if (rhsVal !== null && isFinite(rhsVal)) {
        const bNum = base === 'e' ? Math.E : Number(base);
        const expVal = Math.pow(bNum, rhsVal);

        steps.push({
          title: 'Convert to exponential form',
          desc: 'Rewrite as an algebraic polynomial equation.',
          tex: `(${texExpr(l1.arg)}) \\cdot (${texExpr(l2.arg)}) = ${base}^{${texExpr(R)}} = ${trimNum(expVal)}`,
        });

        const prodStr = `(${l1.arg}) * (${l2.arg})`;
        let innerSol = solveLinearEquation(prodStr, String(expVal), v, decimal) ||
                       solveQuadraticEquation(prodStr, String(expVal), v, decimal);

        if (innerSol?.steps) innerSol.steps.slice(1).forEach(s => steps.push(s));

        const candidates = innerSol?.answers || [];
        const valid = [];
        const extraneous = [];

        const c1 = math.compile(l1.arg);
        const c2 = math.compile(l2.arg);

        for (const cand of candidates) {
          let a1 = NaN, a2 = NaN;
          try {
            a1 = c1.evaluate({ [v]: cand.num });
            a2 = c2.evaluate({ [v]: cand.num });
          } catch {}

          if (a1 > 1e-9 && a2 > 1e-9) valid.push(cand);
          else extraneous.push(cand);
        }

        if (extraneous.length > 0) {
          steps.push({
            title: 'Extraneous root check against domain',
            desc: 'Arguments of original logarithms must be strictly positive. Discard any solution where an argument ≤ 0.',
            tex: extraneous.map(e => `${v} = ${e.tex} \\quad\\implies\\quad \\text{Argument } \\le 0 \\text{ (Reject)} \\quad \\boldsymbol{\\times}`).join('\\\\'),
          });
        }

        const ansTex = valid.map(a => `${v} = ${a.tex}`).join(', \\quad ');
        return {
          steps,
          answerTex: ansTex || '\\text{No solution } (\\emptyset)',
          answerNote: null,
          answers: valid,
        };
      }
    }
  }

  return null;
}
