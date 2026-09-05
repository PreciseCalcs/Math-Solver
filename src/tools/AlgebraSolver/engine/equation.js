// Free-form equation / expression / inequality solver with step-by-step output
import {
  math, preprocess, texExpr, getVariables, containsSymbol,
  approxFrac, texFrac, trimNum, fmtVal,
} from './utils.js';
import { polyCoeffsFromExpr, integerizeFr, solvePolynomial, polyTexFromFracs } from './poly.js';
import { solveLinearEquation } from './linearSolver.js';
import { solveQuadraticEquation } from './quadraticSolver.js';
import { solveRationalEquation } from './rationalSolver.js';
import { solveRadicalEquation } from './radicalSolver.js';
import { solveAbsEquation } from './absSolver.js';
import { solveExpEquation, solveLogEquation } from './expLogSolver.js';
import { solveTrigEquation } from './trigSolver.js';
import { solveLiteralEquation, extractTargetVar } from './literalSolver.js';
import { solveInequality } from './inequalitySolver.js';

const SPECIAL_FUNCS = ['sqrt', 'abs', 'sin', 'cos', 'tan', 'log', 'log10', 'log2', 'exp'];

// ---------- helpers ----------

function makeVerifier(L, R, v) {
  let fl, fr;
  try { fl = math.compile(L); fr = math.compile(R); } catch { return () => true; }
  return (x) => {
    try {
      const a = fl.evaluate({ [v]: x });
      const b = fr.evaluate({ [v]: x });
      const na = typeof a === 'number' ? a : a?.re;
      const nb = typeof b === 'number' ? b : b?.re;
      if (!isFinite(na) || !isFinite(nb)) return false;
      return Math.abs(na - nb) < 1e-6 * Math.max(1, Math.abs(na), Math.abs(nb));
    } catch { return false; }
  };
}

// Try the polynomial route on exprStr = 0. Throws if not polynomial.
function solvePolyPath(exprStr, v, decimal) {
  const { coeffs, denomStr } = polyCoeffsFromExpr(exprStr, v);
  const ints = integerizeFr(coeffs);
  const res = solvePolynomial(ints, v, decimal);
  // exclude roots that make the denominator zero
  if (denomStr && res.answers?.length) {
    let dc;
    try { dc = math.compile(denomStr); } catch { dc = null; }
    if (dc) {
      const excluded = [];
      res.answers = res.answers.filter((a) => {
        if (typeof a.num !== 'number') return true;
        try {
          const dv = dc.evaluate({ [v]: a.num });
          if (Math.abs(typeof dv === 'number' ? dv : dv?.re ?? 1) < 1e-9) {
            excluded.push(a.tex);
            return false;
          }
        } catch { /* keep */ }
        return true;
      });
      if (excluded.length) {
        res.steps.push({
          title: 'Check the domain',
          desc: `The original equation has a denominator ${denomStr} which cannot be zero. Excluded value(s): ${excluded.join(', ')}.`,
          tex: `${texExpr(denomStr)} \\neq 0`,
        });
      }
    }
    if (denomStr && !res.steps.some((s) => s.title === 'Check the domain')) {
      res.steps.splice(1, 0, {
        title: 'Clear the denominator',
        desc: 'Multiply both sides by the denominator (noting it cannot equal zero) to get a polynomial equation.',
        tex: `${texExpr(denomStr)} \\neq 0`,
      });
    }
  }
  return res;
}

function answersToTex(answers, v) {
  if (!answers.length) return null;
  return answers.map((a) => `${v} = ${a.tex}`).join(', \\quad ');
}

function numericRoots(exprStr, v, lo = -100, hi = 100, N = 8000) {
  let f;
  try { f = math.compile(exprStr); } catch { return []; }
  const ev = (x) => {
    try {
      const r = f.evaluate({ [v]: x });
      if (typeof r === 'number') return r;
      if (r && typeof r.re === 'number') return Math.abs(r.im) < 1e-12 ? r.re : NaN;
      return NaN;
    } catch { return NaN; }
  };
  const roots = [];
  let prev = ev(lo), prevX = lo;
  for (let i = 1; i <= N; i++) {
    const x = lo + ((hi - lo) * i) / N;
    const val = ev(x);
    if (isFinite(prev) && isFinite(val)) {
      if (val === 0) roots.push(x);
      else if (prev * val < 0) {
        let a = prevX, b = x, fa = prev;
        for (let k = 0; k < 90; k++) {
          const mid = (a + b) / 2;
          const fm = ev(mid);
          if (!isFinite(fm)) break;
          if (fa * fm <= 0) b = mid; else { a = mid; fa = fm; }
        }
        roots.push((a + b) / 2);
      }
    }
    prev = val; prevX = x;
  }
  const out = [];
  roots.forEach((r) => {
    let rr = Math.abs(r) < 1e-9 ? 0 : r;
    if (Math.abs(rr - Math.round(rr)) < 1e-9) rr = Math.round(rr);
    if (!out.some((o) => Math.abs(o - rr) < 1e-6)) out.push(rr);
  });
  return out;
}

// Find outermost "special" sub-expressions (sqrt, abs, trig, log, x-in-exponent)
function findSpecial(node, v) {
  const hits = [];
  node.traverse((n) => {
    if (n.isFunctionNode && SPECIAL_FUNCS.includes(n.fn.name) && containsSymbol(n, v)) {
      hits.push({ kind: n.fn.name, node: n });
    }
    if (n.isOperatorNode && n.op === '^' && containsSymbol(n.args[1], v)) {
      hits.push({ kind: 'pow', node: n });
    }
  });
  const uniq = [];
  hits.forEach((h) => {
    const s = h.node.toString();
    if (!uniq.some((u) => u.str === s)) uniq.push({ ...h, str: s });
  });
  return uniq.filter((h) => !uniq.some((u) => u !== h && u.str.includes(h.str)));
}

// Decompose expr as A·t + B where t replaces the special sub-expression; null if not linear in t
function linearInT(node, specialStr) {
  const replaced = node.transform((n) =>
    n.toString() === specialStr ? new math.SymbolNode('tsub') : n
  );
  let dA;
  try { dA = math.derivative(replaced, 'tsub'); } catch { return null; }
  if (containsSymbol(dA, 'tsub')) return null;
  const zeroed = replaced.transform((n) =>
    n.isSymbolNode && n.name === 'tsub' ? new math.ConstantNode(0) : n
  );
  let A, B;
  try {
    A = math.simplify(dA).toString();
    B = math.simplify(zeroed).toString();
  } catch { return null; }
  return { A, B };
}

const evalConst = (str) => {
  try {
    const val = math.evaluate(str);
    return typeof val === 'number' && isFinite(val) ? val : null;
  } catch { return null; }
};

function piMultipleTex(x) {
  if (Math.abs(x) < 1e-12) return '0';
  const f = approxFrac(x / Math.PI, 24, 1e-9);
  if (!f) return null;
  const neg = math.number(f) < 0 ? '-' : '';
  const n = f.n.toString(), d = f.d.toString();
  if (d === '1') return `${neg}${n === '1' ? '' : n}\\pi`;
  return `${neg}\\frac{${n === '1' ? '' : n}\\pi}{${d}}`;
}

const niceTex = (x, decimal) => (!decimal && piMultipleTex(x)) || fmtVal(x, decimal);

// ---------- non-polynomial handlers ----------

function solveNonPolynomial(L, R, exprStr, v, decimal, steps) {
  const node = math.parse(exprStr);
  const verify = makeVerifier(L, R, v);
  const special = findSpecial(node, v);

  if (special.length === 1) {
    const S = special[0];
    const lin = linearInT(node, S.str);
    if (lin) {
      const { A, B } = lin;
      try {
        const handled = handleSpecial(S, A, B, v, decimal, steps, verify, exprStr);
        if (handled) return handled;
      } catch { /* fall through to numeric */ }
    }
  }

  return numericFallback(exprStr, v, decimal, steps, verify);
}

function handleSpecial(S, A, B, v, decimal, steps, verify) {
  const kind = S.kind;
  const isolatedTex = `${texExpr(S.str)} = ${texExpr(`-(${B})/(${A})`)}`;

  if (kind === 'sqrt') {
    const u = S.node.args[0].toString();
    steps.push({
      title: 'Isolate the radical',
      desc: 'Move all other terms so the square root stands alone on one side.',
      tex: isolatedTex,
    });
    steps.push({
      title: 'Square both sides',
      desc: 'Squaring removes the radical. This can introduce extraneous roots, so every candidate is checked in the original equation.',
      tex: `${texExpr(u)} = \\left(${texExpr(`-(${B})/(${A})`)}\\right)^2`,
    });
    const newExpr = `(${u})*((${A}))^2 - ((${B}))^2`;
    const inner = solvePolyPath(newExpr, v, decimal);
    steps.push(...inner.steps);
    const kept = [], dropped = [];
    inner.answers.forEach((a) => {
      if (typeof a.num === 'number' && verify(a.num)) kept.push(a);
      else dropped.push(a);
    });
    if (dropped.length) {
      steps.push({
        title: 'Check for extraneous roots',
        desc: `Substituting back into the original equation rejects: ${dropped.map((d) => d.tex).join(', ')}.`,
        tex: kept.length ? answersToTex(kept, v) : '\\text{no valid roots remain}',
      });
    }
    return {
      steps,
      answerTex: kept.length ? answersToTex(kept, v) : null,
      answerNote: kept.length ? null : 'No real solution — all candidates are extraneous.',
    };
  }

  if (kind === 'abs') {
    const u = S.node.args[0].toString();
    const cVal = evalConst(`-(${B})/(${A})`);
    if (cVal !== null && cVal < 0) {
      steps.push({
        title: 'Isolate the absolute value',
        desc: 'An absolute value can never be negative.',
        tex: `${texExpr(S.str)} = ${trimNum(cVal)} < 0`,
      });
      return { steps, answerTex: null, answerNote: 'No solution — an absolute value cannot equal a negative number.' };
    }
    steps.push({
      title: 'Split into two cases',
      desc: 'By definition |u| = c means u = c or u = −c.',
      tex: `${texExpr(u)} = ${texExpr(`-(${B})/(${A})`)} \\quad\\text{or}\\quad ${texExpr(u)} = ${texExpr(`(${B})/(${A})`)}`,
    });
    const all = [];
    [[`(${A})*(${u}) + (${B})`, 'Case 1'], [`(${A})*(${u}) - (${B})`, 'Case 2']].forEach(([ex, label]) => {
      try {
        const inner = solvePolyPath(ex, v, decimal);
        steps.push({ title: label, desc: '', tex: null });
        steps.push(...inner.steps);
        inner.answers.forEach((a) => {
          if (typeof a.num === 'number' && verify(a.num)) {
            if (!all.some((o) => typeof o.num === 'number' && Math.abs(o.num - a.num) < 1e-9)) all.push(a);
          }
        });
      } catch { /* skip case */ }
    });
    return {
      steps,
      answerTex: all.length ? answersToTex(all, v) : null,
      answerNote: all.length ? null : 'No real solution.',
    };
  }

  if (kind === 'sin' || kind === 'cos' || kind === 'tan') {
    const u = S.node.args[0].toString();
    const c = evalConst(`-(${B})/(${A})`);
    if (c === null) return null;
    steps.push({
      title: `Isolate ${kind}`,
      desc: '',
      tex: `\\${kind}\\left(${texExpr(u)}\\right) = ${niceTex(c, decimal)}`,
    });
    if ((kind === 'sin' || kind === 'cos') && Math.abs(c) > 1) {
      return { steps, answerTex: null, answerNote: `No real solution — ${kind} of a real number is always between −1 and 1.` };
    }
    // u must be linear in v: u = p*x + q
    let p = 1, q = 0;
    try {
      const { coeffs } = polyCoeffsFromExpr(u, v);
      if (coeffs.length > 2) return null;
      p = math.number(coeffs[1] ?? math.fraction(0));
      q = math.number(coeffs[0]);
      if (p === 0) return null;
    } catch { return null; }

    const inv = kind === 'sin' ? Math.asin(c) : kind === 'cos' ? Math.acos(c) : Math.atan(c);
    const invName = { sin: '\\arcsin', cos: '\\arccos', tan: '\\arctan' }[kind];
    steps.push({
      title: 'Apply the inverse function',
      desc: `The principal value is ${invName.replace('\\', '')}(${trimNum(c)}) ≈ ${trimNum(inv)} rad.`,
      tex: `${texExpr(u)} = ${niceTex(inv, decimal)}`,
    });

    const uSols = [];
    if (kind === 'sin') {
      uSols.push({ base: inv, tex: `${niceTex(inv, decimal)} + 2k\\pi` });
      uSols.push({ base: Math.PI - inv, tex: `\\pi - ${niceTex(inv, decimal)} + 2k\\pi` });
    } else if (kind === 'cos') {
      uSols.push({ base: inv, tex: `${niceTex(inv, decimal)} + 2k\\pi` });
      uSols.push({ base: -inv, tex: `-${niceTex(inv, decimal)} + 2k\\pi` });
    } else {
      uSols.push({ base: inv, tex: `${niceTex(inv, decimal)} + k\\pi` });
    }
    steps.push({
      title: 'General solution for the angle',
      desc: `${kind} is periodic, so there are infinitely many solutions (k is any integer).`,
      tex: uSols.map((s) => `${texExpr(u)} = ${s.tex}`).join(' \\quad\\text{or}\\quad '),
    });

    const period = (kind === 'tan' ? Math.PI : 2 * Math.PI) / Math.abs(p);
    const xParts = uSols.map((s) => {
      const x0 = (s.base - q) / p;
      return { x0, tex: `${niceTex(x0, decimal)} + k \\cdot ${niceTex(period, decimal)}` };
    });
    if (p !== 1 || q !== 0) {
      steps.push({
        title: `Solve for ${v}`,
        desc: '',
        tex: xParts.map((s) => `${v} = ${s.tex}`).join(' \\quad\\text{or}\\quad '),
      });
    }
    const principal = xParts.map((s) => trimNum(s.x0)).join(', ');
    return {
      steps,
      answerTex: xParts.map((s) => `${v} = ${s.tex}`).join(', \\quad '),
      answerNote: `k ∈ ℤ. Principal solutions: ${v} ≈ ${principal}`,
    };
  }

  if (kind === 'log' || kind === 'log10' || kind === 'log2') {
    const u = S.node.args.length > 1 ? S.node.args[0].toString() : S.node.args[0].toString();
    const baseVal = S.node.args.length > 1 ? evalConst(S.node.args[1].toString())
      : kind === 'log10' ? 10 : kind === 'log2' ? 2 : Math.E;
    const baseTex = baseVal === Math.E ? 'e' : trimNum(baseVal);
    const c = evalConst(`-(${B})/(${A})`);
    if (c === null || baseVal === null) return null;
    steps.push({
      title: 'Isolate the logarithm',
      desc: '',
      tex: `\\log_{${baseTex}}\\left(${texExpr(u)}\\right) = ${fmtVal(c, decimal)}`,
    });
    const target = Math.pow(baseVal, c);
    steps.push({
      title: 'Rewrite in exponential form',
      desc: 'log_b(u) = c is equivalent to u = bᶜ.',
      tex: `${texExpr(u)} = ${baseTex}^{${fmtVal(c, decimal)}} = ${trimNum(target)}`,
    });
    // if the target is irrational (e.g. e or e^2), format the sub-solution in decimals
    const fTarget = approxFrac(target, 1000, 1e-12);
    const exactTarget = !!fTarget && Math.abs(math.number(fTarget) - target) < 1e-10;
    const inner = solvePolyPath(`(${u}) - (${target})`, v, decimal || !exactTarget);
    if (exactTarget) steps.push(...inner.steps);
    else if (inner.answers.length) {
      steps.push({
        title: `Solve for ${v}`,
        desc: '',
        tex: inner.answers.map((a) => `${v} \\approx ${a.tex}`).join(', \\quad '),
      });
    }
    const kept = inner.answers.filter((a) => typeof a.num !== 'number' || verify(a.num));
    return {
      steps,
      answerTex: kept.length ? answersToTex(kept, v) : null,
      answerNote: kept.length
        ? (!exactTarget ? `Exact form: ${u} = ${baseVal === Math.E ? 'e' : trimNum(baseVal)}^${trimNum(c)}.` : null)
        : 'No solution in the logarithm domain.',
    };
  }

  if (kind === 'pow' || kind === 'exp') {
    const isExp = kind === 'exp';
    const baseStr = isExp ? 'e' : S.node.args[0].toString();
    const expoStr = isExp ? S.node.args[0].toString() : S.node.args[1].toString();
    const baseVal = isExp ? Math.E : evalConst(baseStr);
    if (baseVal === null || baseVal <= 0 || baseVal === 1) return null;
    const c = evalConst(`-(${B})/(${A})`);
    if (c === null) return null;
    steps.push({
      title: 'Isolate the exponential',
      desc: '',
      tex: `${texExpr(baseStr)}^{${texExpr(expoStr)}} = ${fmtVal(c, decimal)}`,
    });
    if (c <= 0) {
      return { steps, answerTex: null, answerNote: 'No real solution — a positive base raised to a real power is always positive.' };
    }
    const val = Math.log(c) / Math.log(baseVal);
    const exactInt = Math.abs(val - Math.round(val)) < 1e-10;
    steps.push({
      title: 'Take logarithms of both sides',
      desc: exactInt
        ? `${trimNum(c)} = ${trimNum(baseVal)}^${Math.round(val)}, so the exponent equals ${Math.round(val)}.`
        : 'Apply log to both sides and divide by log of the base.',
      tex: exactInt
        ? `${texExpr(expoStr)} = ${Math.round(val)}`
        : `${texExpr(expoStr)} = \\frac{\\ln(${trimNum(c)})}{\\ln(${texExpr(baseStr)})} \\approx ${trimNum(val)}`,
    });
    const inner = solvePolyPath(`(${expoStr}) - (${exactInt ? Math.round(val) : val})`, v, decimal || !exactInt);
    if (exactInt) steps.push(...inner.steps);
    else if (inner.answers.length) {
      steps.push({
        title: `Solve for ${v}`,
        desc: '',
        tex: inner.answers.map((a) => `${v} \\approx ${a.tex}`).join(', \\quad '),
      });
    }
    return {
      steps,
      answerTex: answersToTex(inner.answers, v),
      answerNote: exactInt ? null : `Exact form: ${expoStr} = ln(${trimNum(c)})/ln(${trimNum(baseVal)}).`,
    };
  }

  return null;
}

function numericFallback(exprStr, v, decimal, steps, verify) {
  const roots = numericRoots(exprStr, v).filter((r) => verify(r));
  steps.push({
    title: 'Numeric root finding',
    desc: 'The equation mixes function types that have no closed algebraic form, so roots are located numerically (sign-change scan + bisection on [−100, 100]).',
    tex: roots.length
      ? roots.map((r) => `${v} \\approx ${trimNum(r)}`).join(', \\quad ')
      : '\\text{no real roots found in } [-100, 100]',
  });
  return {
    steps,
    answerTex: roots.length ? roots.map((r) => `${v} \\approx ${trimNum(r)}`).join(', \\quad ') : null,
    answerNote: roots.length ? 'Solved numerically (10-digit precision).' : 'No real roots found in the search range [−100, 100].',
  };
}

// ---------- expression analysis (no '=' sign) ----------

function analyzeExpression(s, decimal) {
  const steps = [];
  const node = math.parse(s);
  steps.push({ title: 'Parsed expression', desc: '', tex: node.toTex({ implicit: 'hide' }) });
  const vars = getVariables(node);

  if (vars.length === 0) {
    const val = math.evaluate(s);
    const num = typeof val === 'number' ? val : null;
    const tex = num !== null ? fmtVal(num, decimal) : math.format(val);
    steps.push({
      title: 'Evaluate numerical value',
      desc: 'The expression contains no variables, so it simplifies directly to a numerical value.',
      tex: `${node.toTex({ implicit: 'hide' })} = ${tex}`,
    });
    const extra = num !== null && !decimal && !Number.isInteger(num) ? ` \\approx ${trimNum(num)}` : '';
    return { steps, answerTex: `${tex}${extra}` };
  }

  let simplified;
  try { simplified = math.simplify(node); } catch { simplified = node; }
  steps.push({
    title: 'Simplify algebraic expression',
    desc: 'Combine like terms, distribute operations, and reduce.',
    tex: simplified.toTex({ implicit: 'hide' }),
  });
  let answerTex = simplified.toTex({ implicit: 'hide' });

  if (vars.length === 1) {
    const v = vars[0];
    try {
      const { coeffs, denomStr } = polyCoeffsFromExpr(s, v);
      if (!denomStr) {
        const expandedTex = polyTexFromFracs(coeffs, v);
        if (expandedTex !== answerTex) {
          steps.push({ title: 'Expanded polynomial form', desc: 'Standard descending order form.', tex: expandedTex });
          answerTex = expandedTex;
        }

        // If quadratic, show factoring & zeros
        if (coeffs.length === 3) {
          const qRes = solveQuadraticEquation(s, '0', v, decimal);
          if (qRes && qRes.steps) {
            steps.push({
              title: 'Zeros / roots of the polynomial (P(x) = 0)',
              desc: 'Values of the variable that make the expression equal to zero.',
              tex: qRes.answerTex,
            });
          }
        }
      }
    } catch { /* not polynomial */ }
  }
  return { steps, answerTex };
}

// ---------- inequalities ----------

function solveInequalityEntry(s, opts) {
  const decimal = !!opts?.decimal;
  const m = s.match(/(<=|>=|<|>)/);
  const op = m[1];
  const [Lr, Rr] = s.split(op);
  if (!Lr?.trim() || !Rr?.trim()) return { error: 'Both sides of the inequality must be non-empty.' };

  let node;
  try { node = math.parse(`(${Lr}) - (${Rr})`); } catch { node = null; }
  const vars = node ? getVariables(node) : [];
  const v = vars[0] || 'x';

  const ineqRes = solveInequality(Lr.trim(), Rr.trim(), op, v, decimal);
  if (ineqRes) return ineqRes;

  const steps = [];
  const opTex = { '<': '<', '>': '>', '<=': '\\le', '>=': '\\ge' }[op];
  steps.push({ title: 'Original inequality', desc: '', tex: `${texExpr(Lr)} ${opTex} ${texExpr(Rr)}` });

  const exprStr = `(${Lr}) - (${Rr})`;
  if (vars.length !== 1) return { error: 'Inequalities are supported with exactly one variable.' };

  let res;
  try {
    res = solvePolyPath(exprStr, v, decimal);
  } catch {
    return { error: 'Inequalities are currently supported for polynomial and rational expressions only.' };
  }
  steps.push({
    title: 'Find boundary points',
    desc: `Solve f(${v}) = 0 where f is everything moved to the left side. These roots split the number line into test intervals.`,
    tex: `${texExpr(math.simplify(exprStr).toString())} ${opTex} 0`,
  });
  steps.push(...res.steps);

  const roots = res.answers
    .filter((a) => typeof a.num === 'number')
    .flatMap((a) => (a.isPair ? [a.num, a.pairNum] : [a.num]))
    .sort((x, y) => x - y)
    .filter((r, i, arr) => i === 0 || Math.abs(r - arr[i - 1]) > 1e-9);

  const f = math.compile(exprStr);
  const ev = (x) => { try { const r = f.evaluate({ [v]: x }); return typeof r === 'number' ? r : NaN; } catch { return NaN; } };
  const strict = op === '<' || op === '>';
  const wantPositive = op === '>' || op === '>=';

  const points = [-Infinity, ...roots, Infinity];
  const intervals = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    const t = a === -Infinity ? (b === Infinity ? 0 : b - 1) : b === Infinity ? a + 1 : (a + b) / 2;
    const val = ev(t);
    const ok = wantPositive ? val > 0 : val < 0;
    intervals.push({ a, b, ok, test: t, val });
  }

  const fmtPt = (x) => (x === -Infinity ? '-\\infty' : x === Infinity ? '\\infty' : fmtVal(x, decimal));
  steps.push({
    title: 'Sign chart',
    desc: intervals.map((iv) =>
      `On (${iv.a === -Infinity ? '−∞' : trimNum(iv.a)}, ${iv.b === Infinity ? '∞' : trimNum(iv.b)}): test ${v} = ${trimNum(iv.test)} → f = ${trimNum(iv.val)} (${iv.val > 0 ? 'positive' : iv.val < 0 ? 'negative' : 'zero'})`
    ).join('  |  '),
    tex: null,
  });

  const sols = [];
  intervals.forEach((iv) => {
    if (!iv.ok) return;
    const last = sols[sols.length - 1];
    if (!strict && last && Math.abs(last.b - iv.a) < 1e-12) last.b = iv.b;
    else sols.push({ a: iv.a, b: iv.b });
  });
  if (!sols.length) {
    const eqRoots = !strict && roots.length ? roots : [];
    if (eqRoots.length) {
      return { steps, answerTex: eqRoots.map((r) => `${v} = ${fmtVal(r, decimal)}`).join(', \\quad '), answerNote: 'Only the boundary point(s) satisfy the inequality.' };
    }
    return { steps, answerTex: '\\text{No solution}', answerNote: 'The inequality is never satisfied.' };
  }
  const intervalTex = sols
    .map((sv) => {
      const lo = strict || sv.a === -Infinity ? '(' : '[';
      const hi = strict || sv.b === Infinity ? ')' : ']';
      return `${lo}${fmtPt(sv.a)},\\, ${fmtPt(sv.b)}${hi}`;
    })
    .join(' \\cup ');
  return {
    steps,
    answerTex: `${v} \\in ${intervalTex}`,
    answerNote: strict ? 'Boundary points excluded (strict inequality).' : 'Boundary points included.',
  };
}

// ---------- main entry ----------

export function solveEquation(raw, opts = {}) {
  const decimal = !!opts.decimal;
  try {
    if (!raw || !String(raw).trim()) return { error: 'Enter an equation or expression first.' };

    // 1. Literal equation directive check (e.g. "solve for x: 2x + 3y = 6" or "2x + 3y = 6, y")
    const { targetVar, cleanInput } = extractTargetVar(raw);
    const s = preprocess(cleanInput);

    // 2. Inequality check (<=, >=, <, >)
    if (/(<=|>=|<|>)/.test(s)) return solveInequalityEntry(s, opts);

    // 3. Expression without '=' sign
    if (!s.includes('=')) return analyzeExpression(s, decimal);

    const parts = s.split('=');
    if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) {
      return { error: 'Use exactly one "=" sign with expressions on both sides, e.g. 2x + 3 = 11.' };
    }
    const [L, R] = [parts[0].trim(), parts[1].trim()];
    const exprStr = `(${L}) - (${R})`;
    const node = math.parse(exprStr);
    const vars = getVariables(node);

    // 4. Multiple variables -> Literal Equation / Formula
    if (vars.length > 1) {
      const chosenVar = targetVar && vars.includes(targetVar)
        ? targetVar
        : (vars.includes('y') ? 'y' : vars.includes('x') ? 'x' : vars[0]);
      const litRes = solveLiteralEquation(L, R, chosenVar);
      if (litRes) return litRes;
      return { error: `Multiple variables detected (${vars.join(', ')}). Specify which variable to solve for (e.g. ", solve for ${vars[0]}") or use the System tab for simultaneous equations.` };
    }

    // 5. Zero variables -> Arithmetic Identity or Contradiction
    if (vars.length === 0) {
      const lv = math.evaluate(L), rv = math.evaluate(R);
      const eq = Math.abs(Number(lv) - Number(rv)) < 1e-12;
      const steps = [
        { title: 'Original equation', desc: '', tex: `${texExpr(L)} = ${texExpr(R)}` },
        {
          title: 'Evaluate both sides',
          desc: '',
          tex: `${trimNum(Number(lv))} ${eq ? '=' : '\\neq'} ${trimNum(Number(rv))}`,
        },
      ];
      return { steps, answerTex: eq ? '\\text{True (identity)}' : '\\text{False (contradiction)}' };
    }

    const v = vars[0];

    // 6. Absolute Value Equation
    const absRes = solveAbsEquation(L, R, v, decimal);
    if (absRes) return absRes;

    // 7. Radical Equation (sqrt, cbrt, nthRoot)
    const radRes = solveRadicalEquation(L, R, v, decimal);
    if (radRes) return radRes;

    // 8. Logarithmic Equation (log, ln, log10, log2)
    const logRes = solveLogEquation(L, R, v, decimal);
    if (logRes) return logRes;

    // 9. Exponential Equation (b^(f(x)) = C or e^(f(x)) = C)
    const expRes = solveExpEquation(L, R, v, decimal);
    if (expRes) return expRes;

    // 10. Trigonometric Equation (sin, cos, tan)
    const trigRes = solveTrigEquation(L, R, v, decimal);
    if (trigRes) return trigRes;

    // 11. Rational Equation (fractions with variable in denominator)
    const ratRes = solveRationalEquation(L, R, v, decimal);
    if (ratRes) return ratRes;

    // 12. Linear Equation (LCD clearing, distributive property, variable isolation, verification)
    const linRes = solveLinearEquation(L, R, v, decimal);
    if (linRes) return linRes;

    // 13. Quadratic Equation (standard form, factoring / square root / quadratic formula / complex roots)
    const quadRes = solveQuadraticEquation(L, R, v, decimal);
    if (quadRes) return quadRes;

    // 14. Higher-Degree Polynomial (Cubic, Quartic, Durand-Kerner)
    try {
      const res = solvePolyPath(exprStr, v, decimal);
      const steps = [{ title: 'Original equation', desc: '', tex: `${texExpr(L)} = ${texExpr(R)}` }];
      steps.push(...res.steps);
      if (res.identity) return { steps, answerTex: '\\text{All real numbers (identity)}' };
      if (res.contradiction) return { steps, answerTex: '\\text{No solution (contradiction)}' };
      if (!res.answers.length) return { steps, answerTex: '\\text{No solution}' };
      return {
        steps,
        answerTex: answersToTex(res.answers, v),
        answerNote: res.answers.some((a) => a.approx) ? 'Roots marked numerically are accurate to ~10 digits.' : null,
      };
    } catch {}

    // 15. Non-polynomial fallback / numerical roots
    const steps = [{ title: 'Original equation', desc: '', tex: `${texExpr(L)} = ${texExpr(R)}` }];
    return solveNonPolynomial(L, R, exprStr, v, decimal, steps);
  } catch (e) {
    return { error: `Could not parse the input. Check the syntax — e.g. use 2x + 3 = 11 or x^2 - 5x + 6 = 0. (${e.message})` };
  }
}
