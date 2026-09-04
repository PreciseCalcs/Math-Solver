// Matrix algebra with exact fractions and step-by-step working
import { math, texFrac, fmtVal, trimNum, texComplex } from './utils';
import { integerizeFr, solvePolynomial } from './poly';

const isZero = (f) => math.number(f) === 0;

export function parseMatrix(cells) {
  return cells.map((row, r) =>
    row.map((val, c) => {
      const s = String(val ?? '').trim();
      if (!s) throw new Error(`Cell (${r + 1}, ${c + 1}) is empty.`);
      try { return math.fraction(s); } catch { throw new Error(`Cell (${r + 1}, ${c + 1}) — "${s}" is not a valid number.`); }
    })
  );
}

export function matTex(M, label = 'bmatrix') {
  const rows = M.map((row) => row.map((f) => texFrac(f)).join(' & ')).join(' \\\\ ');
  return `\\begin{${label}} ${rows} \\end{${label}}`;
}

function augTex(A, B) {
  const n = A[0].length;
  const cols = `${'c'.repeat(n)}|${'c'.repeat(B[0].length)}`;
  const rows = A.map((row, i) => [...row, ...B[i]].map((f) => texFrac(f)).join(' & ')).join(' \\\\ ');
  return `\\left[\\begin{array}{${cols}} ${rows} \\end{array}\\right]`;
}

const clone = (M) => M.map((r) => [...r]);

function det2(M) {
  return math.subtract(math.multiply(M[0][0], M[1][1]), math.multiply(M[0][1], M[1][0]));
}

function minor(M, i, j) {
  return M.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j));
}

function detRec(M) {
  const n = M.length;
  if (n === 1) return M[0][0];
  if (n === 2) return det2(M);
  let acc = math.fraction(0);
  for (let j = 0; j < n; j++) {
    if (isZero(M[0][j])) continue;
    const cof = math.multiply(M[0][j], detRec(minor(M, 0, j)));
    acc = (j % 2 === 0) ? math.add(acc, cof) : math.subtract(acc, cof);
  }
  return acc;
}

export function determinant(cells, decimal) {
  const M = parseMatrix(cells);
  const n = M.length;
  if (n !== M[0].length) return { error: 'The determinant is defined only for square matrices.' };
  const steps = [{ title: 'Input matrix', desc: '', tex: `A = ${matTex(M)}` }];

  if (n === 1) {
    return { steps, answerTex: `\\det(A) = ${fmtVal(M[0][0], decimal)}` };
  }
  if (n === 2) {
    const d = det2(M);
    steps.push({
      title: 'Apply the 2×2 formula',
      desc: 'det(A) = ad − bc for the matrix [[a, b], [c, d]].',
      tex: `\\det(A) = (${texFrac(M[0][0])})(${texFrac(M[1][1])}) - (${texFrac(M[0][1])})(${texFrac(M[1][0])}) = ${texFrac(d)}`,
    });
    return { steps, answerTex: `\\det(A) = ${fmtVal(d, decimal)}` };
  }
  if (n === 3) {
    steps.push({
      title: 'Cofactor expansion along row 1',
      desc: 'det(A) = a₁₁·M₁₁ − a₁₂·M₁₂ + a₁₃·M₁₃, where each Mᵢⱼ is a 2×2 minor.',
      tex: `\\det(A) = ${[0, 1, 2].map((j) => `${j % 2 ? '-' : j ? '+' : ''}(${texFrac(M[0][j])})\\cdot\\det${matTex(minor(M, 0, j))}`).join(' ')}`,
    });
    const minors = [0, 1, 2].map((j) => det2(minor(M, 0, j)));
    steps.push({
      title: 'Evaluate the 2×2 minors',
      desc: '',
      tex: minors.map((m, j) => `M_{1${j + 1}} = ${texFrac(m)}`).join(', \\quad '),
    });
    const d = detRec(M);
    steps.push({
      title: 'Combine',
      desc: '',
      tex: `\\det(A) = ${[0, 1, 2].map((j) => `${j % 2 ? '-' : j ? '+' : ''}(${texFrac(M[0][j])})(${texFrac(minors[j])})`).join(' ')} = ${texFrac(d)}`,
    });
    return { steps, answerTex: `\\det(A) = ${fmtVal(d, decimal)}` };
  }
  // n >= 4: elimination to triangular
  const W = clone(M);
  let sign = 1;
  for (let col = 0; col < n; col++) {
    let sel = -1;
    for (let r = col; r < n; r++) if (!isZero(W[r][col])) { sel = r; break; }
    if (sel === -1) {
      steps.push({ title: 'Zero column found', desc: `Column ${col + 1} has no pivot — the determinant is 0.`, tex: '\\det(A) = 0' });
      return { steps, answerTex: '\\det(A) = 0' };
    }
    if (sel !== col) { [W[sel], W[col]] = [W[col], W[sel]]; sign = -sign; }
    for (let r = col + 1; r < n; r++) {
      if (isZero(W[r][col])) continue;
      const factor = math.divide(W[r][col], W[col][col]);
      for (let c = col; c < n; c++) W[r][c] = math.subtract(W[r][c], math.multiply(factor, W[col][c]));
    }
  }
  steps.push({
    title: 'Reduce to upper triangular form',
    desc: `Gaussian elimination (row swaps flip the sign; ${sign === 1 ? 'no net sign change' : 'net sign: −1'}). The determinant is the product of the diagonal.`,
    tex: matTex(W),
  });
  let d = math.fraction(sign);
  for (let i = 0; i < n; i++) d = math.multiply(d, W[i][i]);
  steps.push({ title: 'Multiply the diagonal', desc: '', tex: `\\det(A) = ${sign === -1 ? '(-1)\\cdot' : ''}${W.map((row, i) => `(${texFrac(row[i])})`).join('')} = ${texFrac(d)}` });
  return { steps, answerTex: `\\det(A) = ${fmtVal(d, decimal)}` };
}

export function inverse(cells, decimal) {
  const M = parseMatrix(cells);
  const n = M.length;
  if (n !== M[0].length) return { error: 'Only square matrices can be inverted.' };
  const steps = [{ title: 'Input matrix', desc: '', tex: `A = ${matTex(M)}` }];

  if (n === 2) {
    const d = det2(M);
    steps.push({ title: 'Compute the determinant', desc: 'A 2×2 matrix is invertible iff ad − bc ≠ 0.', tex: `\\det(A) = ${texFrac(d)}` });
    if (isZero(d)) return { steps, answerTex: '\\text{Not invertible (det = 0)}' };
    const inv = [
      [math.divide(M[1][1], d), math.divide(math.unaryMinus(M[0][1]), d)],
      [math.divide(math.unaryMinus(M[1][0]), d), math.divide(M[0][0], d)],
    ];
    steps.push({
      title: 'Apply the 2×2 inverse formula',
      desc: 'Swap the diagonal entries, negate the off-diagonal entries, divide by det(A).',
      tex: `A^{-1} = \\frac{1}{${texFrac(d)}} ${matTex([[M[1][1], math.unaryMinus(M[0][1])], [math.unaryMinus(M[1][0]), M[0][0]]])} = ${matTex(inv)}`,
    });
    return { steps, answerTex: `A^{-1} = ${matTex(inv)}` };
  }

  // Gauss-Jordan on [A | I]
  const A = clone(M);
  const I = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => math.fraction(i === j ? 1 : 0))
  );
  steps.push({ title: 'Set up the augmented matrix [A | I]', desc: 'Row-reduce until the left block becomes the identity; the right block is then A⁻¹.', tex: augTex(A, I) });

  for (let col = 0; col < n; col++) {
    let sel = -1;
    for (let r = col; r < n; r++) if (!isZero(A[r][col])) { sel = r; break; }
    if (sel === -1) {
      steps.push({ title: 'Singular matrix', desc: `No pivot in column ${col + 1} — A is not invertible.`, tex: '\\det(A) = 0' });
      return { steps, answerTex: '\\text{Not invertible (det = 0)}' };
    }
    const ops = [];
    if (sel !== col) { [A[sel], A[col]] = [A[col], A[sel]]; [I[sel], I[col]] = [I[col], I[sel]]; ops.push(`R_{${col + 1}} \\leftrightarrow R_{${sel + 1}}`); }
    const piv = A[col][col];
    if (math.number(piv) !== 1) {
      for (let c = 0; c < n; c++) { A[col][c] = math.divide(A[col][c], piv); I[col][c] = math.divide(I[col][c], piv); }
      ops.push(`R_{${col + 1}} \\to \\tfrac{1}{${texFrac(piv)}} R_{${col + 1}}`);
    }
    for (let r = 0; r < n; r++) {
      if (r === col || isZero(A[r][col])) continue;
      const factor = A[r][col];
      for (let c = 0; c < n; c++) {
        A[r][c] = math.subtract(A[r][c], math.multiply(factor, A[col][c]));
        I[r][c] = math.subtract(I[r][c], math.multiply(factor, I[col][c]));
      }
      ops.push(`R_{${r + 1}} \\to R_{${r + 1}} - (${texFrac(factor)}) R_{${col + 1}}`);
    }
    steps.push({ title: `Pivot column ${col + 1}`, desc: 'Row operations:', tex: `${ops.join(', \\quad ')} \\;\\Rightarrow\\; ${augTex(A, I)}` });
  }
  return { steps, answerTex: `A^{-1} = ${matTex(I)}` };
}

export function transpose(cells, decimal) {
  const M = parseMatrix(cells);
  const T = M[0].map((_, j) => M.map((row) => row[j]));
  return {
    steps: [
      { title: 'Input matrix', desc: '', tex: `A = ${matTex(M)}` },
      { title: 'Swap rows and columns', desc: 'Entry (i, j) of Aᵀ equals entry (j, i) of A.', tex: `A^{T} = ${matTex(T)}` },
    ],
    answerTex: `A^{T} = ${matTex(T)}`,
  };
}

function rrefWithSteps(cellsM, steps) {
  const A = clone(cellsM);
  const rows = A.length, cols = A[0].length;
  let pr = 0;
  const pivots = [];
  for (let col = 0; col < cols && pr < rows; col++) {
    let sel = -1;
    for (let r = pr; r < rows; r++) if (!isZero(A[r][col])) { sel = r; break; }
    if (sel === -1) continue;
    const ops = [];
    if (sel !== pr) { [A[sel], A[pr]] = [A[pr], A[sel]]; ops.push(`R_{${pr + 1}} \\leftrightarrow R_{${sel + 1}}`); }
    const piv = A[pr][col];
    if (math.number(piv) !== 1) {
      for (let c = 0; c < cols; c++) A[pr][c] = math.divide(A[pr][c], piv);
      ops.push(`R_{${pr + 1}} \\to \\tfrac{1}{${texFrac(piv)}} R_{${pr + 1}}`);
    }
    for (let r = 0; r < rows; r++) {
      if (r === pr || isZero(A[r][col])) continue;
      const factor = A[r][col];
      for (let c = 0; c < cols; c++) A[r][c] = math.subtract(A[r][c], math.multiply(factor, A[pr][c]));
      ops.push(`R_{${r + 1}} \\to R_{${r + 1}} - (${texFrac(factor)}) R_{${pr + 1}}`);
    }
    steps.push({ title: `Pivot in column ${col + 1}`, desc: 'Row operations:', tex: `${ops.join(', \\quad ')} \\;\\Rightarrow\\; ${matTex(A)}` });
    pivots.push(col);
    pr++;
  }
  return { A, pivots };
}

export function rref(cells, decimal) {
  const M = parseMatrix(cells);
  const steps = [{ title: 'Input matrix', desc: '', tex: `A = ${matTex(M)}` }];
  const { A } = rrefWithSteps(M, steps);
  return { steps, answerTex: `\\operatorname{RREF}(A) = ${matTex(A)}` };
}

export function rank(cells, decimal) {
  const M = parseMatrix(cells);
  const steps = [{ title: 'Input matrix', desc: '', tex: `A = ${matTex(M)}` }];
  const { A, pivots } = rrefWithSteps(M, steps);
  steps.push({
    title: 'Count the pivot rows',
    desc: 'The rank equals the number of non-zero rows in the reduced form.',
    tex: `\\operatorname{RREF}(A) = ${matTex(A)}`,
  });
  return { steps, answerTex: `\\operatorname{rank}(A) = ${pivots.length}` };
}

export function eigenvalues(cells, decimal) {
  const M = parseMatrix(cells);
  const n = M.length;
  if (n !== M[0].length) return { error: 'Eigenvalues are defined only for square matrices.' };
  const steps = [{ title: 'Input matrix', desc: '', tex: `A = ${matTex(M)}` }];
  const L = '\\lambda';

  if (n === 2) {
    const tr = math.add(M[0][0], M[1][1]);
    const d = det2(M);
    steps.push({
      title: 'Characteristic polynomial',
      desc: 'For a 2×2 matrix: λ² − tr(A)·λ + det(A) = 0.',
      tex: `${L}^2 - (${texFrac(tr)})${L} + (${texFrac(d)}) = 0`,
    });
    const ints = integerizeFr([d, math.unaryMinus(tr), math.fraction(1)]);
    const res = solvePolynomial(ints, L, decimal);
    steps.push(...res.steps);
    const ans = res.answers.map((a) => (a.isPair || a.complex ? `${L} = ${a.tex}` : `${L} = ${a.tex}`)).join(', \\quad ');
    return { steps, answerTex: ans || '\\text{No eigenvalues found}' };
  }

  if (n === 3) {
    const tr = math.add(math.add(M[0][0], M[1][1]), M[2][2]);
    const m2 = math.add(
      math.add(det2(minor(M, 2, 2)), det2(minor(M, 1, 1))),
      det2(minor(M, 0, 0))
    );
    const d = detRec(M);
    steps.push({
      title: 'Characteristic polynomial',
      desc: 'det(A − λI) = 0 expands to λ³ − tr(A)λ² + (sum of principal 2×2 minors)λ − det(A) = 0.',
      tex: `${L}^3 - (${texFrac(tr)})${L}^2 + (${texFrac(m2)})${L} - (${texFrac(d)}) = 0`,
    });
    const ints = integerizeFr([math.unaryMinus(d), m2, math.unaryMinus(tr), math.fraction(1)]);
    const res = solvePolynomial(ints, L, decimal);
    steps.push(...res.steps);
    const ans = res.answers.map((a) => `${L} = ${a.tex}`).join(', \\quad ');
    return { steps, answerTex: ans || '\\text{No eigenvalues found}' };
  }

  // n >= 4: numeric
  try {
    const numeric = M.map((row) => row.map((f) => math.number(f)));
    const { values } = math.eigs(numeric);
    const vals = (values.toArray ? values.toArray() : values).map((zz) =>
      typeof zz === 'number' ? trimNum(zz) : texComplex(zz, true)
    );
    steps.push({
      title: 'Numeric eigenvalue computation',
      desc: `For ${n}×${n} matrices, eigenvalues are computed numerically (QR algorithm).`,
      tex: vals.map((vv, i) => `${L}_{${i + 1}} \\approx ${vv}`).join(', \\quad '),
    });
    return { steps, answerTex: vals.map((vv, i) => `${L}_{${i + 1}} \\approx ${vv}`).join(', \\quad ') };
  } catch (e) {
    return { error: `Could not compute eigenvalues numerically: ${e.message}` };
  }
}

export const MATRIX_OPS = {
  determinant: { label: 'Determinant', fn: determinant, square: true },
  inverse: { label: 'Inverse', fn: inverse, square: true },
  transpose: { label: 'Transpose', fn: transpose, square: false },
  rank: { label: 'Rank', fn: rank, square: false },
  rref: { label: 'RREF', fn: rref, square: false },
  eigenvalues: { label: 'Eigenvalues', fn: eigenvalues, square: true },
};
