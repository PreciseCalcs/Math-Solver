// Polynomial machinery with exact step-by-step solutions
import {
  math, approxFrac, texFrac, fracPlain, trimNum, fmtVal,
  simplifyRadical, gcdInt, lcmInt, texComplex,
} from './utils';

// Extract ascending polynomial coefficients (as Fractions) from an expression string.
// Throws if not a polynomial (or rational expression reducible to one).
export function polyCoeffsFromExpr(exprStr, variable) {
  const res = math.rationalize(exprStr, {}, true);
  let coeffs = res.coefficients;
  let denomStr = null;
  if (res.denominator) {
    denomStr = res.denominator.toString();
    const inner = math.rationalize(res.numerator.toString(), {}, true);
    coeffs = inner.coefficients;
  }
  if (!coeffs || !coeffs.length) throw new Error('not polynomial');
  const fr = coeffs.map((c) => {
    const f = approxFrac(Number(c));
    if (!f) throw new Error('non-rational coefficient');
    return f;
  });
  while (fr.length > 1 && math.number(fr[fr.length - 1]) === 0) fr.pop();
  return { coeffs: fr, denomStr };
}

// Fractions -> primitive integer coefficients (same roots), positive leading coeff
export function integerizeFr(fr) {
  const dens = fr.map((f) => Number(f.d));
  const L = dens.reduce((a, b) => lcmInt(a, b), 1) || 1;
  let ints = fr.map((f) => Math.round(math.number(f) * L));
  const g = ints.reduce((a, b) => gcdInt(a, b), 0) || 1;
  ints = ints.map((x) => x / g);
  if (ints[ints.length - 1] < 0) ints = ints.map((x) => -x);
  return ints;
}

// Integer coefficients (ascending) -> LaTeX polynomial in descending order
export function polyTexFromInts(ints, v) {
  const terms = [];
  for (let i = ints.length - 1; i >= 0; i--) {
    const c = ints[i];
    if (c === 0) continue;
    const abs = Math.abs(c);
    let t;
    if (i === 0) t = `${abs}`;
    else {
      const coef = abs === 1 ? '' : `${abs}`;
      t = i === 1 ? `${coef}${v}` : `${coef}${v}^{${i}}`;
    }
    terms.push({ neg: c < 0, t });
  }
  if (!terms.length) return '0';
  return terms
    .map((x, idx) => (idx === 0 ? (x.neg ? '-' : '') + x.t : ` ${x.neg ? '-' : '+'} ${x.t}`))
    .join('');
}

// Fraction coefficients (ascending) -> LaTeX polynomial with TRUE (unscaled) coefficients
export function polyTexFromFracs(fracs, v) {
  const terms = [];
  for (let i = fracs.length - 1; i >= 0; i--) {
    const f = fracs[i];
    const num = math.number(f);
    if (num === 0) continue;
    const absTex = texFrac(math.abs(f));
    let t;
    if (i === 0) t = absTex;
    else {
      const coef = absTex === '1' ? '' : absTex;
      t = i === 1 ? `${coef}${v}` : `${coef}${v}^{${i}}`;
    }
    terms.push({ neg: num < 0, t });
  }
  if (!terms.length) return '0';
  return terms
    .map((x, idx) => (idx === 0 ? (x.neg ? '-' : '') + x.t : ` ${x.neg ? '-' : '+'} ${x.t}`))
    .join('');
}

function divisors(n) {
  n = Math.abs(n);
  const out = [];
  for (let i = 1; i * i <= n; i++) {
    if (n % i === 0) { out.push(i); if (i !== n / i) out.push(n / i); }
  }
  return out.sort((a, b) => a - b);
}

// Rational Root Theorem search; returns Fraction root or null
export function findRationalRoot(ints) {
  const n = ints.length - 1;
  if (ints[0] === 0) return math.fraction(0);
  if (Math.abs(ints[0]) > 1e9 || Math.abs(ints[n]) > 1e9) return null;
  const ps = divisors(ints[0]).slice(0, 400);
  const qs = divisors(ints[n]).slice(0, 400);
  for (const q of qs) {
    for (const p of ps) {
      for (const sg of [1, -1]) {
        let acc = 0;
        for (let i = 0; i <= n; i++) acc += ints[i] * Math.pow(sg * p, i) * Math.pow(q, n - i);
        if (acc === 0) return math.fraction(sg * p, q);
      }
    }
  }
  return null;
}

// Divide polynomial (asc int coeffs) by (x - r); returns asc int coeffs of quotient
export function syntheticDivide(ints, r) {
  const n = ints.length - 1;
  const desc = [...ints].reverse().map((c) => math.fraction(c));
  const out = [desc[0]];
  for (let i = 1; i < n; i++) out.push(math.add(desc[i], math.multiply(out[i - 1], r)));
  return integerizeFr(out.reverse());
}

// Durand–Kerner: numeric roots of polynomial with asc int coeffs
export function durandKerner(ints) {
  const n = ints.length - 1;
  const c = ints.map((x) => x / ints[n]); // monic, ascending
  const evalP = (z) => {
    let acc = math.complex(1, 0); // leading coeff
    for (let i = n - 1; i >= 0; i--) acc = math.add(math.multiply(acc, z), math.complex(c[i], 0));
    return acc;
  };
  let roots = [];
  const seed = math.complex(0.4, 0.9);
  let cur = math.complex(1, 0);
  for (let k = 0; k < n; k++) { cur = math.multiply(cur, seed); roots.push(cur); }
  for (let iter = 0; iter < 300; iter++) {
    let maxDelta = 0;
    const next = roots.map((rk, k) => {
      let den = math.complex(1, 0);
      roots.forEach((rj, j) => { if (j !== k) den = math.multiply(den, math.subtract(rk, rj)); });
      const dm = math.abs(den);
      if (dm < 1e-14) return rk;
      const delta = math.divide(evalP(rk), den);
      maxDelta = Math.max(maxDelta, math.abs(delta));
      return math.subtract(rk, delta);
    });
    roots = next;
    if (maxDelta < 1e-13) break;
  }
  return roots.map((r) => {
    let re = r.re, im = r.im;
    if (Math.abs(im) < 1e-8) im = 0;
    if (Math.abs(re) < 1e-10) re = 0;
    if (Math.abs(re - Math.round(re)) < 1e-8) re = Math.round(re);
    if (Math.abs(im - Math.round(im)) < 1e-8) im = Math.round(im);
    return math.complex(re, im);
  });
}

// Quadratic ax^2+bx+c=0 (integers) with exact simplified radicals
export function solveQuadraticInt(a, b, c, v, decimal) {
  const steps = [];
  const answers = [];
  steps.push({
    title: 'Apply the quadratic formula',
    desc: 'For a quadratic equation, the roots are given by the quadratic formula.',
    tex: `${v} = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}, \\qquad a = ${a},\\; b = ${b},\\; c = ${c}`,
  });
  const D = b * b - 4 * a * c;
  steps.push({
    title: 'Compute the discriminant',
    desc: 'The discriminant Δ = b² − 4ac determines the nature of the roots.',
    tex: `\\Delta = (${b})^2 - 4(${a})(${c}) = ${D}`,
  });

  if (D === 0) {
    const r = math.fraction(-b, 2 * a);
    steps.push({
      title: 'One repeated real root',
      desc: 'Δ = 0, so the equation has exactly one (double) root.',
      tex: `${v} = \\frac{-(${b})}{2(${a})} = ${texFrac(r)}`,
    });
    answers.push({ tex: fmtVal(r, decimal), num: math.number(r) });
    return { steps, answers, note: 'double root' };
  }

  const { k, m } = simplifyRadical(Math.abs(D));
  const sqrtAbs = Math.sqrt(Math.abs(D));

  if (D > 0 && m === 1) {
    // perfect square -> rational roots
    const s = k;
    const r1 = math.fraction(-b + s, 2 * a);
    const r2 = math.fraction(-b - s, 2 * a);
    steps.push({
      title: 'Δ is a perfect square — two rational roots',
      desc: `√${D} = ${s}, so both roots are rational.`,
      tex: `${v} = \\frac{-(${b}) \\pm ${s}}{2(${a})}`,
    });
    steps.push({
      title: 'Factored form',
      desc: 'Since the roots are rational, the quadratic factors over the rationals.',
      tex: `${a === 1 ? '' : a}\\left(${v} - ${texFrac(r1)}\\right)\\left(${v} - ${texFrac(r2)}\\right) = 0`,
    });
    answers.push({ tex: fmtVal(r1, decimal), num: math.number(r1) });
    answers.push({ tex: fmtVal(r2, decimal), num: math.number(r2) });
    return { steps, answers };
  }

  if (D > 0) {
    // irrational roots: (-b ± k√m) / (2a), reduce by gcd
    const g = gcdInt(gcdInt(Math.abs(b), k), Math.abs(2 * a)) || 1;
    const nb = -b / g, kk = k / g, den = (2 * a) / g;
    const radTex = `${kk === 1 ? '' : kk}\\sqrt{${m}}`;
    let exactTex;
    if (den === 1) exactTex = `${nb === 0 ? '' : nb + ' '}\\pm ${radTex}`;
    else if (den === -1) exactTex = `${-nb === 0 ? '' : -nb + ' '}\\mp ${radTex}`;
    else exactTex = `\\frac{${nb} \\pm ${radTex}}{${den}}`;
    steps.push({
      title: 'Simplify the radical',
      desc: `√${D} = ${k === 1 ? `√${D}` : `${k}√${m}`}. Substitute into the formula and reduce.`,
      tex: `${v} = \\frac{-(${b}) \\pm \\sqrt{${D}}}{2(${a})} = ${exactTex}`,
    });
    const x1 = (-b + sqrtAbs) / (2 * a);
    const x2 = (-b - sqrtAbs) / (2 * a);
    steps.push({
      title: 'Decimal approximation',
      desc: '',
      tex: `${v}_1 \\approx ${trimNum(x1)}, \\qquad ${v}_2 \\approx ${trimNum(x2)}`,
    });
    if (decimal) {
      answers.push({ tex: trimNum(x1), num: x1 });
      answers.push({ tex: trimNum(x2), num: x2 });
    } else {
      answers.push({ tex: exactTex, num: x1, pairNum: x2, isPair: true });
    }
    return { steps, answers, numericRoots: [x1, x2] };
  }

  // D < 0: complex conjugate roots
  const g = gcdInt(gcdInt(Math.abs(b), k), Math.abs(2 * a)) || 1;
  const nb = -b / g, kk = k / g, den = (2 * a) / g;
  const reF = math.fraction(-b, 2 * a);
  const imTexCore = m === 1 ? (kk === 1 ? '' : `${kk}`) : `${kk === 1 ? '' : kk}\\sqrt{${m}}`;
  let exactTex;
  if (den === 1) exactTex = `${nb === 0 ? '' : nb + ' '}\\pm ${imTexCore}\\,i`;
  else exactTex = `\\frac{${nb} \\pm ${imTexCore}\\,i}{${den}}`;
  steps.push({
    title: 'Δ < 0 — complex conjugate roots',
    desc: `The discriminant is negative, so there are no real roots. Using √(${D}) = ${k === 1 && m === 1 ? '' : ''}${k}√${m}·i:`,
    tex: `${v} = \\frac{-(${b}) \\pm \\sqrt{${D}}}{2(${a})} = ${exactTex}`,
  });
  const rePart = math.number(reF);
  const imPart = Math.sqrt(-D) / (2 * a);
  if (decimal) {
    answers.push({ tex: `${trimNum(rePart)} \\pm ${trimNum(Math.abs(imPart))}i`, complex: true });
  } else {
    answers.push({ tex: exactTex, complex: true });
  }
  return { steps, answers, complex: true };
}

// Solve polynomial = 0 from ascending integer coefficients, with steps
export function solvePolynomial(ints, v, decimal) {
  const steps = [];
  let deg = ints.length - 1;
  steps.push({
    title: 'Standard form',
    desc: 'Write the equation as a polynomial set equal to zero.',
    tex: `${polyTexFromInts(ints, v)} = 0`,
  });

  if (deg === 0) {
    if (ints[0] === 0) return { steps, answers: [], identity: true };
    return { steps, answers: [], contradiction: true };
  }

  if (deg === 1) {
    const a = ints[1], b = ints[0];
    if (b !== 0) {
      steps.push({
        title: 'Isolate the variable term',
        desc: `Move the constant to the right side.`,
        tex: `${a === 1 ? '' : a === -1 ? '-' : a}${v} = ${-b}`,
      });
    }
    const r = math.fraction(-b, a);
    steps.push({
      title: 'Divide both sides by the coefficient',
      desc: a === 1 ? '' : `Divide both sides by ${a}.`,
      tex: `${v} = \\frac{${-b}}{${a}} = ${texFrac(r)}`,
    });
    return { steps, answers: [{ tex: fmtVal(r, decimal), num: math.number(r) }] };
  }

  if (deg === 2) {
    const q = solveQuadraticInt(ints[2], ints[1], ints[0], v, decimal);
    steps.push(...q.steps);
    return { steps, answers: q.answers, complex: q.complex };
  }

  // degree >= 3: peel off rational roots
  let work = [...ints];
  const answers = [];
  while (work.length - 1 > 2) {
    const r = findRationalRoot(work);
    if (!r) break;
    const q = syntheticDivide(work, r);
    steps.push({
      title: `Rational root found: ${v} = ${fracPlain(r)}`,
      desc: 'By the Rational Root Theorem (testing divisors of the constant and leading coefficients), this value makes the polynomial zero. Divide it out by synthetic division.',
      tex: `${polyTexFromInts(work, v)} = 0 \\;\\Rightarrow\\; \\left(${v} - ${texFrac(r)}\\right) \\cdot \\left[\\,${polyTexFromInts(q, v)}\\,\\right] = 0`,
    });
    answers.push({ tex: fmtVal(r, decimal), num: math.number(r) });
    work = q;
  }

  const remDeg = work.length - 1;
  if (remDeg === 1) {
    const r = math.fraction(-work[0], work[1]);
    steps.push({
      title: 'Solve the remaining linear factor',
      desc: '',
      tex: `${polyTexFromInts(work, v)} = 0 \\;\\Rightarrow\\; ${v} = ${texFrac(r)}`,
    });
    answers.push({ tex: fmtVal(r, decimal), num: math.number(r) });
  } else if (remDeg === 2) {
    steps.push({
      title: 'Solve the remaining quadratic factor',
      desc: 'The remaining factor is quadratic — apply the quadratic formula.',
      tex: `${polyTexFromInts(work, v)} = 0`,
    });
    const q = solveQuadraticInt(work[2], work[1], work[0], v, decimal);
    steps.push(...q.steps);
    answers.push(...q.answers);
  } else if (remDeg >= 3) {
    steps.push({
      title: 'No more rational roots — numeric method',
      desc: `The remaining factor of degree ${remDeg} has no rational roots. Roots are computed numerically (Durand–Kerner iteration).`,
      tex: `${polyTexFromInts(work, v)} = 0`,
    });
    const roots = durandKerner(work);
    roots.forEach((z) => {
      if (z.im === 0) answers.push({ tex: fmtVal(z.re, decimal), num: z.re, approx: true });
      else answers.push({ tex: texComplex(z, true), complex: true, approx: true });
    });
  }

  return { steps, answers };
}
