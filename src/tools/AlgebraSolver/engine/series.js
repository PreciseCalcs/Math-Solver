// Sequences & series: arithmetic, geometric, summation, binomial expansion
import { math, preprocess, texExpr, fmtVal, trimNum, approxFrac, texFrac, getVariables } from './utils';
import { polyCoeffsFromExpr, polyTexFromFracs } from './poly';

const parseNum = (s, name) => {
  const v = Number(math.evaluate(preprocess(String(s))));
  if (!isFinite(v)) throw new Error(`"${name}" is not a valid number.`);
  return v;
};

export function arithmeticSeries({ a1, d, n }, opts = {}) {
  const decimal = !!opts.decimal;
  try {
    const A = parseNum(a1, 'first term'), D = parseNum(d, 'common difference');
    const N = Math.round(parseNum(n, 'n'));
    if (N < 1 || N > 100000) return { error: 'n must be between 1 and 100000.' };
    const steps = [];
    const terms = [];
    for (let i = 0; i < Math.min(N, 6); i++) terms.push(A + i * D);
    steps.push({
      title: 'Identify the sequence',
      desc: `Arithmetic sequence with first term a₁ = ${trimNum(A)} and common difference d = ${trimNum(D)}.`,
      tex: `${terms.map((t) => trimNum(t)).join(',\\; ')}${N > 6 ? ',\\; \\dots' : ''}`,
    });
    const an = A + (N - 1) * D;
    steps.push({
      title: `Compute the ${N}th term`,
      desc: 'Use aₙ = a₁ + (n − 1)d.',
      tex: `a_{${N}} = ${trimNum(A)} + (${N} - 1)(${trimNum(D)}) = ${fmtVal(an, decimal)}`,
    });
    const sum = (N / 2) * (2 * A + (N - 1) * D);
    steps.push({
      title: 'Compute the sum',
      desc: 'Use Sₙ = n/2 · (2a₁ + (n − 1)d) = n/2 · (a₁ + aₙ).',
      tex: `S_{${N}} = \\frac{${N}}{2}\\left(${trimNum(A)} + ${trimNum(an)}\\right) = ${fmtVal(sum, decimal)}`,
    });
    return { steps, answerTex: `a_{${N}} = ${fmtVal(an, decimal)}, \\qquad S_{${N}} = ${fmtVal(sum, decimal)}` };
  } catch (e) { return { error: e.message }; }
}

export function geometricSeries({ a1, r, n }, opts = {}) {
  const decimal = !!opts.decimal;
  try {
    const A = parseNum(a1, 'first term'), R = parseNum(r, 'common ratio');
    const N = Math.round(parseNum(n, 'n'));
    if (N < 1 || N > 1000) return { error: 'n must be between 1 and 1000.' };
    const steps = [];
    const terms = [];
    for (let i = 0; i < Math.min(N, 6); i++) terms.push(A * Math.pow(R, i));
    steps.push({
      title: 'Identify the sequence',
      desc: `Geometric sequence with first term a₁ = ${trimNum(A)} and common ratio r = ${trimNum(R)}.`,
      tex: `${terms.map((t) => trimNum(t)).join(',\\; ')}${N > 6 ? ',\\; \\dots' : ''}`,
    });
    const an = A * Math.pow(R, N - 1);
    steps.push({
      title: `Compute the ${N}th term`,
      desc: 'Use aₙ = a₁ · rⁿ⁻¹.',
      tex: `a_{${N}} = ${trimNum(A)} \\cdot (${trimNum(R)})^{${N - 1}} = ${fmtVal(an, decimal)}`,
    });
    let sum;
    if (R === 1) {
      sum = A * N;
      steps.push({ title: 'Compute the sum', desc: 'r = 1, so every term equals a₁ and Sₙ = n·a₁.', tex: `S_{${N}} = ${N} \\cdot ${trimNum(A)} = ${fmtVal(sum, decimal)}` });
    } else {
      sum = (A * (1 - Math.pow(R, N))) / (1 - R);
      steps.push({
        title: 'Compute the sum',
        desc: 'Use Sₙ = a₁(1 − rⁿ)/(1 − r).',
        tex: `S_{${N}} = \\frac{${trimNum(A)}\\left(1 - (${trimNum(R)})^{${N}}\\right)}{1 - (${trimNum(R)})} = ${fmtVal(sum, decimal)}`,
      });
    }
    let answerTex = `a_{${N}} = ${fmtVal(an, decimal)}, \\qquad S_{${N}} = ${fmtVal(sum, decimal)}`;
    let answerNote = null;
    if (Math.abs(R) < 1) {
      const sInf = A / (1 - R);
      steps.push({
        title: 'Infinite sum (|r| < 1)',
        desc: 'Since |r| < 1, the series converges as n → ∞.',
        tex: `S_{\\infty} = \\frac{a_1}{1 - r} = \\frac{${trimNum(A)}}{1 - (${trimNum(R)})} = ${fmtVal(sInf, decimal)}`,
      });
      answerTex += `, \\qquad S_{\\infty} = ${fmtVal(sInf, decimal)}`;
    } else {
      answerNote = '|r| ≥ 1, so the infinite series diverges.';
    }
    return { steps, answerTex, answerNote };
  } catch (e) { return { error: e.message }; }
}

export function summation({ expr, varName, from, to }, opts = {}) {
  const decimal = !!opts.decimal;
  try {
    const v = (varName || 'k').trim();
    const a = Math.round(parseNum(from, 'lower limit'));
    const b = Math.round(parseNum(to, 'upper limit'));
    if (b < a) return { error: 'The upper limit must be ≥ the lower limit.' };
    if (b - a > 100000) return { error: 'At most 100000 terms are supported.' };
    const s = preprocess(expr);
    const compiled = math.compile(s);
    const term = (k) => {
      const r = compiled.evaluate({ [v]: k });
      if (typeof r !== 'number' || !isFinite(r)) throw new Error(`Term at ${v} = ${k} is not a finite number.`);
      return r;
    };
    const steps = [];
    steps.push({
      title: 'Set up the summation',
      desc: '',
      tex: `\\sum_{${v}=${a}}^{${b}} ${texExpr(s)}`,
    });
    const shown = [];
    for (let k = a; k <= Math.min(a + 3, b); k++) shown.push(`${trimNum(term(k))}`);
    const more = b > a + 4 ? `\\; + \\dots + \\; ${trimNum(term(b))}` : b === a + 4 ? `\\; + \\; ${trimNum(term(b))}` : '';
    steps.push({
      title: 'Expand the first terms',
      desc: `Substitute ${v} = ${a}, ${a + 1}, … into the expression.`,
      tex: `${shown.join(' + ')}${more}`,
    });
    let total = 0;
    let fracTotal = math.fraction(0);
    let exactOk = true;
    for (let k = a; k <= b; k++) {
      const t = term(k);
      total += t;
      if (exactOk) {
        const f = approxFrac(t);
        if (f) fracTotal = math.add(fracTotal, f); else exactOk = false;
      }
    }
    const exactClose = exactOk && Math.abs(math.number(fracTotal) - total) < 1e-6 * Math.max(1, Math.abs(total));
    const ansTex = !decimal && exactClose ? texFrac(fracTotal) : trimNum(total);
    steps.push({
      title: 'Add all the terms',
      desc: `Sum of ${b - a + 1} terms.`,
      tex: `\\sum_{${v}=${a}}^{${b}} ${texExpr(s)} = ${ansTex}`,
    });
    return { steps, answerTex: ansTex, answerNote: !decimal && exactClose && !Number.isInteger(total) ? `Decimal: ≈ ${trimNum(total)}` : null };
  } catch (e) { return { error: e.message }; }
}

export function binomialExpansion({ a, b, n }, opts = {}) {
  try {
    const N = Math.round(Number(n));
    if (!isFinite(N) || N < 0 || N > 20) return { error: 'The exponent n must be an integer between 0 and 20.' };
    const aS = preprocess(a || 'x');
    const bS = preprocess(b || '1');
    const aTex = texExpr(aS), bTex = texExpr(bS);
    const pairTex = bTex.trim().startsWith('-') ? `${aTex} ${bTex}` : `${aTex} + ${bTex}`;
    const steps = [];
    steps.push({
      title: 'Binomial theorem',
      desc: 'Each term uses a binomial coefficient C(n, k) = n! / (k!(n−k)!).',
      tex: `\\left(${pairTex}\\right)^{${N}} = \\sum_{k=0}^{${N}} \\binom{${N}}{k} \\left(${aTex}\\right)^{${N}-k} \\left(${bTex}\\right)^{k}`,
    });
    const coeffs = [];
    for (let k = 0; k <= N; k++) coeffs.push(math.combinations(N, k));
    steps.push({
      title: `Binomial coefficients (row ${N} of Pascal's triangle)`,
      desc: '',
      tex: coeffs.map((c, k) => `\\binom{${N}}{${k}} = ${c}`).join(', \\quad '),
    });
    // simplify each term independently to keep natural descending order
    const termTexs = [];
    const termStrs = [];
    for (let k = 0; k <= N; k++) {
      const t = `(${coeffs[k]}) * (${aS})^(${N - k}) * (${bS})^(${k})`;
      termStrs.push(t);
      let tex;
      try { tex = math.simplify(t).toTex({ implicit: 'hide' }); } catch { tex = texExpr(t); }
      termTexs.push(tex);
    }
    let expandedTex = null;
    // univariate polynomial -> clean descending form via exact coefficients
    try {
      const full = termStrs.join(' + ');
      const vars = getVariables(math.parse(full));
      if (vars.length === 1) {
        const { coeffs: pc, denomStr } = polyCoeffsFromExpr(full, vars[0]);
        if (!denomStr) expandedTex = polyTexFromFracs(pc, vars[0]);
      }
    } catch { /* fall back below */ }
    if (!expandedTex) {
      expandedTex = termTexs
        .map((t, i) => {
          const tt = t.trim();
          if (i === 0) return tt;
          return tt.startsWith('-') ? ` - ${tt.replace(/^-\\left\(/, '').replace(/\\right\)$/, '').replace(/^-/, '')}` : ` + ${tt}`;
        })
        .join('');
    }
    steps.push({
      title: 'Write out and simplify every term',
      desc: '',
      tex: `\\left(${pairTex}\\right)^{${N}} = ${expandedTex}`,
    });
    return { steps, answerTex: expandedTex };
  } catch (e) { return { error: e.message }; }
}
