// Trigonometric Equation Solver with unit circle exact angles and periodic solutions
import {
  math, approxFrac, texFrac, trimNum, fmtVal, texExpr,
} from './utils.js';
import { solveLinearEquation } from './linearSolver.js';

// Special unit circle values: ratio -> { radTex, val }
const SPECIAL_SIN_COS = [
  { val: 0, radTex: '0' },
  { val: 0.5, radTex: '\\frac{\\pi}{6}' },
  { val: Math.SQRT1_2, radTex: '\\frac{\\pi}{4}' }, // ~0.707106
  { val: Math.sqrt(3) / 2, radTex: '\\frac{\\pi}{3}' }, // ~0.866025
  { val: 1, radTex: '\\frac{\\pi}{2}' },
];

const SPECIAL_TAN = [
  { val: 0, radTex: '0' },
  { val: 1 / Math.sqrt(3), radTex: '\\frac{\\pi}{6}' },
  { val: 1, radTex: '\\frac{\\pi}{4}' },
  { val: Math.sqrt(3), radTex: '\\frac{\\pi}{3}' },
];

function matchUnitCircle(val, isTan = false) {
  const table = isTan ? SPECIAL_TAN : SPECIAL_SIN_COS;
  const absVal = Math.abs(val);
  for (const item of table) {
    if (Math.abs(absVal - item.val) < 1e-4) {
      return { matched: true, refTex: item.radTex, refVal: item.val };
    }
  }
  return { matched: false, refTex: null, refVal: null };
}

export function findTrigNode(node, v) {
  let trigInfo = null;
  node.traverse((n) => {
    if (trigInfo) return;
    if (n.isFunctionNode && ['sin', 'cos', 'tan', 'asin', 'acos', 'atan'].includes(n.fn.name)) {
      let hasV = false;
      n.args[0].traverse((sn) => { if (sn.isSymbolNode && sn.name === v) hasV = true; });
      if (hasV) {
        trigInfo = {
          fn: n.fn.name,
          arg: n.args[0].toString(),
          node: n,
        };
      }
    }
  });
  return trigInfo;
}

export function solveTrigEquation(L, R, v, decimal = false) {
  let nodeL, nodeR;
  try {
    nodeL = math.parse(L);
    nodeR = math.parse(R);
  } catch {
    return null;
  }

  const trigL = findTrigNode(nodeL, v);
  const trigR = findTrigNode(nodeR, v);
  if (!trigL && !trigR) return null;

  const primary = trigL || trigR;
  const fn = primary.fn;
  const arg = primary.arg;

  const steps = [];
  steps.push({
    title: 'Original trigonometric equation',
    desc: 'An equation involving trigonometric functions of the unknown variable.',
    tex: `${texExpr(L)} = ${texExpr(R)}`,
  });

  // Isolate trig function: fn(arg) = C
  let cVal = null;
  let cTex = '';
  if (trigL && !trigR && nodeL.isFunctionNode && nodeL.fn.name === fn) {
    cTex = texExpr(R);
    try { cVal = Number(math.evaluate(R)); } catch {}
  } else if (!trigL && trigR && nodeR.isFunctionNode && nodeR.fn.name === fn) {
    cTex = texExpr(L);
    try { cVal = Number(math.evaluate(L)); } catch {}
  } else {
    // Isolate via linear substitution
    try {
      const expr = `(${L}) - (${R})`;
      const trigStr = primary.node.toString();
      const replaced = expr.replace(trigStr, '___T___');
      const lin = math.simplify(replaced);
      const d = math.derivative(lin, '___T___');
      const coeff = Number(math.evaluate(math.simplify(d).toString()));
      const constVal = Number(math.evaluate(lin.transform(n => n.isSymbolNode && n.name === '___T___' ? new math.ConstantNode(0) : n).toString()));
      if (coeff !== 0 && isFinite(coeff) && isFinite(constVal)) {
        cVal = -constVal / coeff;
        const f = approxFrac(cVal, 1000, 1e-6) || math.fraction(cVal);
        cTex = texFrac(f);
        steps.push({
          title: `Isolate ${fn}(${v})`,
          desc: 'Use inverse operations to isolate the trigonometric function.',
          tex: `\\${fn}\\left(${texExpr(arg)}\\right) = ${cTex}`,
        });
      }
    } catch {}
  }

  if (cVal === null || !isFinite(cVal)) return null;

  // Range check for sin and cos
  if (['sin', 'cos'].includes(fn)) {
    if (Math.abs(cVal) > 1 + 1e-7) {
      steps.push({
        title: 'Range verification (No Real Solution)',
        desc: `The range of \\${fn}(θ) is restricted to [-1, 1] for all real θ. Since |${trimNum(cVal)}| > 1, no real solution exists.`,
        tex: `-1 \\le \\${fn}(\\theta) \\le 1 \\quad\\implies\\quad \\text{No real solution } (\\emptyset)`,
      });
      return {
        steps,
        answerTex: '\\text{No real solution } (\\emptyset)',
        answerNote: `The value ${trimNum(cVal)} falls outside the possible range [-1, 1] of \\${fn}.`,
        answers: [],
      };
    }
  }

  // Find exact unit circle angles in [0, 2π)
  const isTan = fn === 'tan';
  const unitMatch = matchUnitCircle(cVal, isTan);

  let primaryAngles = [];
  let periodTex = isTan ? 'k\\pi' : '2k\\pi';

  if (fn === 'sin') {
    if (Math.abs(cVal) < 1e-7) {
      primaryAngles = ['0', '\\pi'];
    } else if (Math.abs(cVal - 1) < 1e-7) {
      primaryAngles = ['\\frac{\\pi}{2}'];
    } else if (Math.abs(cVal + 1) < 1e-7) {
      primaryAngles = ['\\frac{3\\pi}{2}'];
    } else if (unitMatch.matched) {
      const ref = unitMatch.refTex;
      if (cVal > 0) {
        // Quadrants I and II
        primaryAngles = [
          ref,
          ref === '\\frac{\\pi}{6}' ? '\\frac{5\\pi}{6}' :
          ref === '\\frac{\\pi}{4}' ? '\\frac{3\\pi}{4}' :
          ref === '\\frac{\\pi}{3}' ? '\\frac{2\\pi}{3}' : `\\pi - ${ref}`,
        ];
      } else {
        // Quadrants III and IV
        primaryAngles = [
          ref === '\\frac{\\pi}{6}' ? '\\frac{7\\pi}{6}' :
          ref === '\\frac{\\pi}{4}' ? '\\frac{5\\pi}{4}' :
          ref === '\\frac{\\pi}{3}' ? '\\frac{4\\pi}{3}' : `\\pi + ${ref}`,
          ref === '\\frac{\\pi}{6}' ? '\\frac{11\\pi}{6}' :
          ref === '\\frac{\\pi}{4}' ? '\\frac{7\\pi}{4}' :
          ref === '\\frac{\\pi}{3}' ? '\\frac{5\\pi}{3}' : `2\\pi - ${ref}`,
        ];
      }
    } else {
      const p1 = Math.asin(cVal);
      const p2 = Math.PI - p1;
      primaryAngles = [`${trimNum(p1)}`, `${trimNum(p2)}`];
    }
  } else if (fn === 'cos') {
    if (Math.abs(cVal) < 1e-7) {
      primaryAngles = ['\\frac{\\pi}{2}', '\\frac{3\\pi}{2}'];
    } else if (Math.abs(cVal - 1) < 1e-7) {
      primaryAngles = ['0'];
    } else if (Math.abs(cVal + 1) < 1e-7) {
      primaryAngles = ['\\pi'];
    } else if (unitMatch.matched) {
      const ref = unitMatch.refTex;
      if (cVal > 0) {
        // Quadrants I and IV
        primaryAngles = [
          ref,
          ref === '\\frac{\\pi}{6}' ? '\\frac{11\\pi}{6}' :
          ref === '\\frac{\\pi}{4}' ? '\\frac{7\\pi}{4}' :
          ref === '\\frac{\\pi}{3}' ? '\\frac{5\\pi}{3}' : `2\\pi - ${ref}`,
        ];
      } else {
        // Quadrants II and III
        primaryAngles = [
          ref === '\\frac{\\pi}{6}' ? '\\frac{5\\pi}{6}' :
          ref === '\\frac{\\pi}{4}' ? '\\frac{3\\pi}{4}' :
          ref === '\\frac{\\pi}{3}' ? '\\frac{2\\pi}{3}' : `\\pi - ${ref}`,
          ref === '\\frac{\\pi}{6}' ? '\\frac{7\\pi}{6}' :
          ref === '\\frac{\\pi}{4}' ? '\\frac{5\\pi}{4}' :
          ref === '\\frac{\\pi}{3}' ? '\\frac{4\\pi}{3}' : `\\pi + ${ref}`,
        ];
      }
    } else {
      const p1 = Math.acos(cVal);
      const p2 = 2 * Math.PI - p1;
      primaryAngles = [`${trimNum(p1)}`, `${trimNum(p2)}`];
    }
  } else if (fn === 'tan') {
    if (Math.abs(cVal) < 1e-7) {
      primaryAngles = ['0'];
    } else if (unitMatch.matched) {
      const ref = unitMatch.refTex;
      primaryAngles = [
        cVal > 0 ? ref :
        ref === '\\frac{\\pi}{6}' ? '\\frac{5\\pi}{6}' :
        ref === '\\frac{\\pi}{4}' ? '\\frac{3\\pi}{4}' :
        ref === '\\frac{\\pi}{3}' ? '\\frac{2\\pi}{3}' : `\\pi - ${ref}`,
      ];
    } else {
      const p1 = Math.atan(cVal);
      primaryAngles = [`${trimNum(p1 < 0 ? p1 + Math.PI : p1)}`];
    }
  }

  steps.push({
    title: 'Find solutions in the primary interval [0, 2π)',
    desc: `Evaluate the inverse trigonometric function and reference angles on the unit circle.`,
    tex: primaryAngles.map(a => `${texExpr(arg)} = ${a}`).join(', \\quad '),
  });

  // General solutions accounting for periodicity
  const generalLines = primaryAngles.map(a => `${texExpr(arg)} = ${a} + ${periodTex}`);
  steps.push({
    title: 'General solutions (Accounting for Periodicity)',
    desc: `Trigonometric functions are periodic (period 2π for sin and cos, π for tan). Add integer multiples k ∈ ℤ.`,
    tex: generalLines.join(', \\quad ') + ' \\quad (k \\in \\mathbb{Z})',
  });

  // If argument is just v, answers are primaryAngles
  let finalAnsTex = '';
  if (arg === v) {
    finalAnsTex = generalLines.map(g => `${v} = ${g.split('=')[1].trim()}`).join(', \\quad ') + ' \\quad (k \\in \\mathbb{Z})';
  } else {
    // If arg is a*v + b, e.g. 2x
    finalAnsTex = generalLines.join(', \\quad ') + ' \\quad (k \\in \\mathbb{Z})';
  }

  return {
    steps,
    answerTex: finalAnsTex,
    answerNote: `Primary interval [0, 2π): ${primaryAngles.map(a => `${v} = ${a}`).join(', ')}`,
    answers: primaryAngles.map(a => ({ tex: a, num: NaN })),
  };
}
