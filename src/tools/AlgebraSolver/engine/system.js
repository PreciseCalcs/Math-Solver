// Linear system solver (up to 6 unknowns) — exact fractions, Gauss-Jordan with steps
import { math, preprocess, texExpr, texFrac, fmtVal, approxFrac } from './utils';

const F = (x) => math.fraction(x);
const isZero = (f) => math.number(f) === 0;

function augTex(M, nVars) {
  const cols = `${'c'.repeat(nVars)}|c`;
  const rows = M.map((row) => row.map((f) => texFrac(f)).join(' & ')).join(' \\\\ ');
  return `\\left[\\begin{array}{${cols}} ${rows} \\end{array}\\right]`;
}

export function solveSystem(varNamesRaw, eqStringsRaw, opts = {}) {
  const decimal = !!opts.decimal;
  try {
    const varNames = String(varNamesRaw)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!varNames.length) return { error: 'Enter at least one variable name, e.g. "x, y".' };
    if (varNames.length > 6) return { error: 'Up to 6 variables are supported.' };
    const eqStrings = eqStringsRaw.map((e) => String(e).trim()).filter(Boolean);
    if (!eqStrings.length) return { error: 'Enter at least one equation.' };

    const n = varNames.length;
    const steps = [];
    const M = [];

    for (const eqRaw of eqStrings) {
      const s = preprocess(eqRaw);
      const parts = s.split('=');
      if (parts.length !== 2) return { error: `Each equation needs exactly one "=" sign: "${eqRaw}"` };
      const expr = `(${parts[0]}) - (${parts[1]})`;
      let compiled;
      try { compiled = math.compile(expr); } catch { return { error: `Could not parse "${eqRaw}".` }; }
      const scope0 = Object.fromEntries(varNames.map((v) => [v, 0]));
      const ev = (scope) => {
        const r = compiled.evaluate(scope);
        if (typeof r !== 'number' || !isFinite(r)) throw new Error('non-numeric');
        return r;
      };
      let c0;
      try { c0 = ev(scope0); } catch { return { error: `Equation "${eqRaw}" must use only the declared variables (${varNames.join(', ')}).` }; }
      const coefs = [];
      for (const v of varNames) {
        const a1 = ev({ ...scope0, [v]: 1 }) - c0;
        const a2 = ev({ ...scope0, [v]: 2 }) - c0;
        if (Math.abs(a2 - 2 * a1) > 1e-9 * Math.max(1, Math.abs(a1))) {
          return { error: `Equation "${eqRaw}" is not linear in ${v}. The System tab handles linear systems only.` };
        }
        coefs.push(a1);
      }
      // cross-term linearity check
      const sumAll = ev(Object.fromEntries(varNames.map((v) => [v, 1])));
      if (Math.abs(sumAll - (c0 + coefs.reduce((a, b) => a + b, 0))) > 1e-8) {
        return { error: `Equation "${eqRaw}" contains nonlinear terms (e.g. products of variables).` };
      }
      const row = coefs.map((c) => {
        const f = approxFrac(c);
        if (!f) throw new Error('coef');
        return f;
      });
      const rhs = approxFrac(-c0);
      if (!rhs) throw new Error('coef');
      M.push([...row, rhs]);
    }

    steps.push({
      title: 'Write the augmented matrix',
      desc: `Each row holds the coefficients of ${varNames.join(', ')} and the constant term.`,
      tex: augTex(M, n),
    });

    // Gauss-Jordan elimination
    const rows = M.length;
    let pivotRow = 0;
    const pivotCols = [];
    for (let col = 0; col < n && pivotRow < rows; col++) {
      let sel = -1;
      for (let r = pivotRow; r < rows; r++) if (!isZero(M[r][col])) { sel = r; break; }
      if (sel === -1) continue;
      const ops = [];
      if (sel !== pivotRow) {
        [M[sel], M[pivotRow]] = [M[pivotRow], M[sel]];
        ops.push(`R_{${pivotRow + 1}} \\leftrightarrow R_{${sel + 1}}`);
      }
      const piv = M[pivotRow][col];
      if (math.number(piv) !== 1) {
        for (let c = 0; c <= n; c++) M[pivotRow][c] = math.divide(M[pivotRow][c], piv);
        ops.push(`R_{${pivotRow + 1}} \\to \\tfrac{1}{${texFrac(piv)}} R_{${pivotRow + 1}}`);
      }
      for (let r = 0; r < rows; r++) {
        if (r === pivotRow || isZero(M[r][col])) continue;
        const factor = M[r][col];
        for (let c = 0; c <= n; c++) {
          M[r][c] = math.subtract(M[r][c], math.multiply(factor, M[pivotRow][c]));
        }
        ops.push(`R_{${r + 1}} \\to R_{${r + 1}} - (${texFrac(factor)}) R_{${pivotRow + 1}}`);
      }
      steps.push({
        title: `Eliminate column ${col + 1} (pivot for ${varNames[col]})`,
        desc: 'Row operations applied:',
        tex: `${ops.join(', \\quad ')} \\;\\Rightarrow\\; ${augTex(M, n)}`,
      });
      pivotCols.push(col);
      pivotRow++;
    }

    // classify
    for (let r = 0; r < rows; r++) {
      const allZero = M[r].slice(0, n).every(isZero);
      if (allZero && !isZero(M[r][n])) {
        steps.push({
          title: 'Inconsistent system detected',
          desc: `Row ${r + 1} reads 0 = ${texFrac(M[r][n])}, which is impossible.`,
          tex: `0 = ${texFrac(M[r][n])}`,
        });
        return { steps, answerTex: '\\text{No solution — the system is inconsistent.}' };
      }
    }
    if (pivotCols.length < n) {
      const free = varNames.filter((_, i) => !pivotCols.includes(i));
      steps.push({
        title: 'Free variables present',
        desc: `Fewer pivots than unknowns — ${free.join(', ')} can take any value.`,
        tex: augTex(M, n),
      });
      return {
        steps,
        answerTex: '\\text{Infinitely many solutions}',
        answerNote: `Free variable(s): ${free.join(', ')}. The system is underdetermined.`,
      };
    }

    const sols = varNames.map((v, i) => {
      const r = pivotCols.indexOf(i);
      return { v, f: M[r][n] };
    });
    steps.push({
      title: 'Read off the solution',
      desc: 'The matrix is in reduced row-echelon form — each row now states the value of one variable.',
      tex: sols.map((s) => `${s.v} = ${texFrac(s.f)}`).join(', \\quad '),
    });
    const answerTex = sols.map((s) => `${s.v} = ${fmtVal(s.f, decimal)}`).join(', \\quad ');
    const note = decimal ? null : `Decimal: ${sols.map((s) => `${s.v} ≈ ${Number(math.number(s.f).toFixed(6))}`).join(', ')}`;
    return { steps, answerTex, answerNote: note };
  } catch (e) {
    return { error: `Could not solve the system. Check that every equation is linear and uses the declared variables. (${e.message})` };
  }
}
