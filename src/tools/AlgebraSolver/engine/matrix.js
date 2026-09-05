// Matrix algebra with exact fractions and step-by-step working
import { math, texFrac, fmtVal, trimNum, texComplex, gcdInt, lcmInt } from './utils';
import { integerizeFr, solvePolynomial } from './poly';

const isZero = (f) => math.number(f) === 0;

export function parseMatrix(cells) {
  if (!Array.isArray(cells) || cells.length === 0 || !Array.isArray(cells[0])) {
    throw new Error('Matrix must be a valid non-empty grid of rows and columns.');
  }
  return cells.map((row, r) =>
    row.map((val, c) => {
      const s = String(val ?? '').trim();
      if (!s) throw new Error(`Cell (${r + 1}, ${c + 1}) is empty.`);
      try {
        return math.fraction(s);
      } catch {
        throw new Error(`Cell (${r + 1}, ${c + 1}) — "${s}" is not a valid number or fraction.`);
      }
    })
  );
}

export function matTex(M, label = 'bmatrix') {
  const rows = M.map((row) => row.map((f) => texFrac(f)).join(' & ')).join(' \\\\ ');
  return `\\begin{${label}} ${rows} \\end{${label}}`;
}

export function vecTex(v, label = 'bmatrix') {
  return `\\begin{${label}} ${v.map((f) => texFrac(f)).join(' \\\\ ')} \\end{${label}}`;
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
    acc = j % 2 === 0 ? math.add(acc, cof) : math.subtract(acc, cof);
  }
  return acc;
}

// --------------------------------------------------------------------------
// 1. Determinant
// --------------------------------------------------------------------------
export function determinant(cells, decimal) {
  const M = parseMatrix(cells);
  const n = M.length;
  if (n !== M[0].length) return { error: `The determinant is defined only for square matrices (currently ${n}×${M[0].length}).` };
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
      title: 'Combine cofactor terms',
      desc: '',
      tex: `\\det(A) = ${[0, 1, 2].map((j) => `${j % 2 ? '-' : j ? '+' : ''}(${texFrac(M[0][j])})(${texFrac(minors[j])})`).join(' ')} = ${texFrac(d)}`,
    });
    return { steps, answerTex: `\\det(A) = ${fmtVal(d, decimal)}` };
  }
  // n >= 4: elimination to triangular form
  const W = clone(M);
  let sign = 1;
  for (let col = 0; col < n; col++) {
    let sel = -1;
    for (let r = col; r < n; r++) if (!isZero(W[r][col])) { sel = r; break; }
    if (sel === -1) {
      steps.push({ title: 'Zero column found', desc: `Column ${col + 1} has no pivot — the determinant is 0.`, tex: '\\det(A) = 0' });
      return { steps, answerTex: '\\det(A) = 0' };
    }
    if (sel !== col) {
      [W[sel], W[col]] = [W[col], W[sel]];
      sign = -sign;
    }
    for (let r = col + 1; r < n; r++) {
      if (isZero(W[r][col])) continue;
      const factor = math.divide(W[r][col], W[col][col]);
      for (let c = col; c < n; c++) W[r][c] = math.subtract(W[r][c], math.multiply(factor, W[col][c]));
    }
  }
  steps.push({
    title: 'Reduce to upper triangular form',
    desc: `Gaussian elimination (row swaps flip the sign; ${sign === 1 ? 'no net sign change' : 'net sign: −1'}). The determinant is the product of diagonal entries.`,
    tex: matTex(W),
  });
  let d = math.fraction(sign);
  for (let i = 0; i < n; i++) d = math.multiply(d, W[i][i]);
  steps.push({ title: 'Multiply the diagonal entries', desc: '', tex: `\\det(A) = ${sign === -1 ? '(-1)\\cdot' : ''}${W.map((row, i) => `(${texFrac(row[i])})`).join('')} = ${texFrac(d)}` });
  return { steps, answerTex: `\\det(A) = ${fmtVal(d, decimal)}` };
}

// --------------------------------------------------------------------------
// 2. Inverse
// --------------------------------------------------------------------------
export function inverse(cells, decimal) {
  const M = parseMatrix(cells);
  const n = M.length;
  if (n !== M[0].length) return { error: `Only square matrices can be inverted (currently ${n}×${M[0].length}).` };
  const steps = [{ title: 'Input matrix', desc: '', tex: `A = ${matTex(M)}` }];

  if (n === 2) {
    const d = det2(M);
    steps.push({ title: 'Compute determinant', desc: 'A 2×2 matrix is invertible iff det(A) ≠ 0.', tex: `\\det(A) = ${texFrac(d)}` });
    if (isZero(d)) return { steps, answerTex: '\\text{Singular matrix: not invertible (det = 0)}' };
    const inv = [
      [math.divide(M[1][1], d), math.divide(math.unaryMinus(M[0][1]), d)],
      [math.divide(math.unaryMinus(M[1][0]), d), math.divide(M[0][0], d)],
    ];
    steps.push({
      title: 'Apply 2×2 inverse formula',
      desc: 'Swap diagonal elements, negate off-diagonal elements, divide by det(A).',
      tex: `A^{-1} = \\frac{1}{${texFrac(d)}} ${matTex([[M[1][1], math.unaryMinus(M[0][1])], [math.unaryMinus(M[1][0]), M[0][0]]])} = ${matTex(inv)}`,
    });
    return { steps, answerTex: `A^{-1} = ${matTex(inv)}` };
  }

  // Gauss-Jordan on [A | I]
  const A = clone(M);
  const I = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => math.fraction(i === j ? 1 : 0))
  );
  steps.push({ title: 'Set up augmented matrix [A | I]', desc: 'Row-reduce until the left block becomes the identity; the right block is then A⁻¹.', tex: augTex(A, I) });

  for (let col = 0; col < n; col++) {
    let sel = -1;
    for (let r = col; r < n; r++) if (!isZero(A[r][col])) { sel = r; break; }
    if (sel === -1) {
      steps.push({ title: 'Singular matrix', desc: `No pivot found in column ${col + 1} — A is not invertible.`, tex: '\\det(A) = 0' });
      return { steps, answerTex: '\\text{Singular matrix: not invertible (det = 0)}' };
    }
    const ops = [];
    if (sel !== col) {
      [A[sel], A[col]] = [A[col], A[sel]];
      [I[sel], I[col]] = [I[col], I[sel]];
      ops.push(`R_{${col + 1}} \\leftrightarrow R_{${sel + 1}}`);
    }
    const piv = A[col][col];
    if (math.number(piv) !== 1) {
      for (let c = 0; c < n; c++) {
        A[col][c] = math.divide(A[col][c], piv);
        I[col][c] = math.divide(I[col][c], piv);
      }
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

// --------------------------------------------------------------------------
// 3. Transpose
// --------------------------------------------------------------------------
export function transpose(cells, decimal) {
  const M = parseMatrix(cells);
  const T = M[0].map((_, j) => M.map((row) => row[j]));
  return {
    steps: [
      { title: 'Input matrix', desc: `Dimension: ${M.length}×${M[0].length}`, tex: `A = ${matTex(M)}` },
      { title: 'Swap rows and columns', desc: 'Entry (i, j) of Aᵀ equals entry (j, i) of A.', tex: `A^{T} = ${matTex(T)}` },
    ],
    answerTex: `A^{T} = ${matTex(T)}`,
  };
}

// --------------------------------------------------------------------------
// Helper: RREF with detailed row steps
// --------------------------------------------------------------------------
export function rrefWithSteps(cellsM, steps) {
  const A = clone(cellsM);
  const rows = A.length, cols = A[0].length;
  let pr = 0;
  const pivots = []; // stores column index of each pivot
  const pivotRows = []; // stores row index of each pivot

  for (let col = 0; col < cols && pr < rows; col++) {
    let sel = -1;
    for (let r = pr; r < rows; r++) if (!isZero(A[r][col])) { sel = r; break; }
    if (sel === -1) continue;

    const ops = [];
    if (sel !== pr) {
      [A[sel], A[pr]] = [A[pr], A[sel]];
      ops.push(`R_{${pr + 1}} \\leftrightarrow R_{${sel + 1}}`);
    }
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
    if (steps) {
      steps.push({
        title: `Pivot in column ${col + 1} (Row ${pr + 1})`,
        desc: ops.length ? 'Elementary row operations applied:' : 'Column already normalized.',
        tex: `${ops.join(', \\quad ')} ${ops.length ? '\\;\\Rightarrow\\; ' : ''}${matTex(A)}`,
      });
    }
    pivots.push(col);
    pivotRows.push(pr);
    pr++;
  }
  return { A, pivots, pivotRows };
}

// --------------------------------------------------------------------------
// 4. RREF
// --------------------------------------------------------------------------
export function rref(cells, decimal) {
  const M = parseMatrix(cells);
  const steps = [{ title: 'Input matrix', desc: `Dimensions: ${M.length}×${M[0].length}`, tex: `A = ${matTex(M)}` }];
  const { A, pivots } = rrefWithSteps(M, steps);
  steps.push({
    title: 'Reduced Row Echelon Form (RREF) achieved',
    desc: `Pivots located in columns: ${pivots.map((p) => p + 1).join(', ') || 'None'}. Rank = ${pivots.length}.`,
    tex: `\\operatorname{RREF}(A) = ${matTex(A)}`,
  });
  return { steps, answerTex: `\\operatorname{RREF}(A) = ${matTex(A)}` };
}

// --------------------------------------------------------------------------
// 5. Rank
// --------------------------------------------------------------------------
export function rank(cells, decimal) {
  const M = parseMatrix(cells);
  const steps = [{ title: 'Input matrix', desc: `Dimensions: ${M.length}×${M[0].length}`, tex: `A = ${matTex(M)}` }];
  const { A, pivots } = rrefWithSteps(M, steps);
  steps.push({
    title: 'Count the pivot columns in RREF',
    desc: 'The rank of a matrix equals the number of non-zero rows (or leading 1s / pivot columns) in its RREF.',
    tex: `\\operatorname{RREF}(A) = ${matTex(A)} \\implies \\text{Pivots in columns: } ${pivots.map((p) => p + 1).join(', ') || 'none'}`,
  });
  return { steps, answerTex: `\\operatorname{rank}(A) = ${pivots.length}` };
}

// --------------------------------------------------------------------------
// 6. Trace
// --------------------------------------------------------------------------
export function trace(cells, decimal) {
  const M = parseMatrix(cells);
  const rows = M.length, cols = M[0].length;
  if (rows !== cols) {
    return { error: `Trace is defined only for square matrices (currently ${rows}×${cols}).` };
  }
  const steps = [{ title: 'Input matrix', desc: `Square matrix: ${rows}×${cols}`, tex: `A = ${matTex(M)}` }];
  const diags = [];
  let sum = math.fraction(0);
  for (let i = 0; i < rows; i++) {
    diags.push(M[i][i]);
    sum = math.add(sum, M[i][i]);
  }
  steps.push({
    title: 'Sum the main diagonal entries',
    desc: 'The trace tr(A) is defined as the sum of elements along the main diagonal: tr(A) = a₁₁ + a₂₂ + ... + aₙₙ.',
    tex: `\\operatorname{tr}(A) = \\sum_{i=1}^{${rows}} a_{ii} = ${diags.map((d) => `(${texFrac(d)})`).join(' + ')} = ${texFrac(sum)}`,
  });
  return { steps, answerTex: `\\operatorname{tr}(A) = ${fmtVal(sum, decimal)}` };
}

// --------------------------------------------------------------------------
// 7. Matrix Norms (Frobenius, 1-Norm, Infinity-Norm)
// --------------------------------------------------------------------------
export function matrixNorm(cells, decimal) {
  const M = parseMatrix(cells);
  const rows = M.length, cols = M[0].length;
  const steps = [{ title: 'Input matrix', desc: `Dimensions: ${rows}×${cols}`, tex: `A = ${matTex(M)}` }];

  // 1. Frobenius Norm: sqrt(sum(a_ij^2))
  let sumSq = math.fraction(0);
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      sumSq = math.add(sumSq, math.multiply(M[i][j], M[i][j]));
    }
  }
  const frobNum = Math.sqrt(math.number(sumSq));
  steps.push({
    title: '1. Frobenius Norm ||A||_F',
    desc: 'The square root of the sum of squares of all matrix elements: ||A||_F = √(Σ |aᵢⱼ|²).',
    tex: `\\|A\\|_F = \\sqrt{${texFrac(sumSq)}} \\approx ${trimNum(frobNum, 6)}`,
  });

  // 2. 1-Norm (Maximum Absolute Column Sum)
  const colSums = [];
  for (let j = 0; j < cols; j++) {
    let colSum = math.fraction(0);
    const parts = [];
    for (let i = 0; i < rows; i++) {
      const absVal = math.abs(M[i][j]);
      colSum = math.add(colSum, absVal);
      parts.push(texFrac(absVal));
    }
    colSums.push({ j, sum: colSum, parts });
  }
  let maxColSum = colSums[0].sum;
  for (const cs of colSums) {
    if (math.number(cs.sum) > math.number(maxColSum)) maxColSum = cs.sum;
  }
  steps.push({
    title: '2. Maximum Absolute Column Sum (1-Norm) ||A||₁',
    desc: 'Sum the absolute values in each column, then take the maximum.',
    tex: colSums.map((cs) => `\\text{Col } ${cs.j + 1}: ${cs.parts.join(' + ')} = ${texFrac(cs.sum)}`).join(' \\\\ ') +
      `\\\\ \\implies \\|A\\|_1 = \\max_{1 \\le j \\le ${cols}} \\sum_{i=1}^{${rows}} |a_{ij}| = ${texFrac(maxColSum)}`,
  });

  // 3. Infinity-Norm (Maximum Absolute Row Sum)
  const rowSums = [];
  for (let i = 0; i < rows; i++) {
    let rowSum = math.fraction(0);
    const parts = [];
    for (let j = 0; j < cols; j++) {
      const absVal = math.abs(M[i][j]);
      rowSum = math.add(rowSum, absVal);
      parts.push(texFrac(absVal));
    }
    rowSums.push({ i, sum: rowSum, parts });
  }
  let maxRowSum = rowSums[0].sum;
  for (const rs of rowSums) {
    if (math.number(rs.sum) > math.number(maxRowSum)) maxRowSum = rs.sum;
  }
  steps.push({
    title: '3. Maximum Absolute Row Sum (∞-Norm) ||A||_∞',
    desc: 'Sum the absolute values in each row, then take the maximum.',
    tex: rowSums.map((rs) => `\\text{Row } ${rs.i + 1}: ${rs.parts.join(' + ')} = ${texFrac(rs.sum)}`).join(' \\\\ ') +
      `\\\\ \\implies \\|A\\|_\\infty = \\max_{1 \\le i \\le ${rows}} \\sum_{j=1}^{${cols}} |a_{ij}| = ${texFrac(maxRowSum)}`,
  });

  return {
    steps,
    answerTex: `\\|A\\|_F = \\sqrt{${texFrac(sumSq)}} \\approx ${trimNum(frobNum, 6)}, \\;\\; \\|A\\|_1 = ${fmtVal(maxColSum, decimal)}, \\;\\; \\|A\\|_\\infty = ${fmtVal(maxRowSum, decimal)}`,
  };
}

// --------------------------------------------------------------------------
// 8. Null Space (Kernel)
// --------------------------------------------------------------------------
export function nullSpace(cells, decimal) {
  const M = parseMatrix(cells);
  const rows = M.length, cols = M[0].length;
  const steps = [{ title: 'Input matrix', desc: `Solve homogeneous system A·x = 0 for x ∈ ℝ^${cols}`, tex: `A = ${matTex(M)}` }];

  const { A: R, pivots, pivotRows } = rrefWithSteps(M, steps);
  const pivotSet = new Set(pivots);
  const freeCols = [];
  for (let c = 0; c < cols; c++) {
    if (!pivotSet.has(c)) freeCols.push(c);
  }

  const nullity = freeCols.length;
  steps.push({
    title: 'Classify pivot and free variables',
    desc: `Pivots are at columns: ${pivots.map((p) => `x_{${p + 1}}`).join(', ') || 'None'}. Free variables: ${freeCols.map((f) => `x_{${f + 1}}`).join(', ') || 'None'}.`,
    tex: `\\operatorname{RREF}(A) = ${matTex(R)}`,
  });

  if (nullity === 0) {
    steps.push({
      title: 'Trivial Null Space',
      desc: `Every column contains a pivot (rank = ${pivots.length} = n). The only solution is the zero vector x = 0.`,
      tex: `\\operatorname{Null}(A) = \\left\\{ \\mathbf{0} \\right\\}, \\quad \\operatorname{nullity}(A) = 0`,
    });
    return {
      steps,
      answerTex: `\\operatorname{Null}(A) = \\left\\{ \\mathbf{0} \\right\\}, \\quad \\operatorname{nullity}(A) = 0`,
    };
  }

  // Construct basis vectors for each free variable
  const basisVectors = [];
  const basisTexStrings = [];

  for (let fIdx = 0; fIdx < freeCols.length; fIdx++) {
    const fCol = freeCols[fIdx];
    const vec = Array.from({ length: cols }, () => math.fraction(0));
    vec[fCol] = math.fraction(1);

    for (let pIdx = 0; pIdx < pivots.length; pIdx++) {
      const pCol = pivots[pIdx];
      const pRow = pivotRows[pIdx];
      // Equation: x_p + R[pRow][fCol] * x_f = 0  => x_p = -R[pRow][fCol]
      vec[pCol] = math.unaryMinus(R[pRow][fCol]);
    }

    basisVectors.push(vec);
    basisTexStrings.push(vecTex(vec));
  }

  steps.push({
    title: 'Parametrize solution in terms of free variables',
    desc: `Setting each free variable to 1 and the others to 0 yields ${nullity} linearly independent basis vector${nullity > 1 ? 's' : ''}.`,
    tex: `\\mathbf{x} = ${freeCols.map((fCol, idx) => `t_{${idx + 1}} ${basisTexStrings[idx]}`).join(' + ')} \\quad (t_i \\in \\mathbb{R})`,
  });

  steps.push({
    title: 'Rank-Nullity Theorem verification',
    desc: 'dim(Col A) + dim(Null A) = n (number of columns).',
    tex: `\\operatorname{rank}(A) + \\operatorname{nullity}(A) = ${pivots.length} + ${nullity} = ${cols}`,
  });

  const spanTex = `\\operatorname{span}\\left( \\left\\{ ${basisTexStrings.join(',\\; ')} \\right\\} \\right)`;
  return {
    steps,
    answerTex: `\\operatorname{Null}(A) = ${spanTex}, \\quad \\operatorname{nullity}(A) = ${nullity}`,
  };
}

// --------------------------------------------------------------------------
// 9. Column Space (Image / Range)
// --------------------------------------------------------------------------
export function columnSpace(cells, decimal) {
  const M = parseMatrix(cells);
  const rows = M.length, cols = M[0].length;
  const steps = [{ title: 'Input matrix', desc: `Dimensions: ${rows}×${cols}`, tex: `A = ${matTex(M)}` }];

  const { A: R, pivots } = rrefWithSteps(M, steps);
  steps.push({
    title: 'Find pivot columns via RREF',
    desc: `The pivot columns of RREF indicate which columns of the ORIGINAL matrix A form a basis for Col(A).`,
    tex: `\\operatorname{RREF}(A) = ${matTex(R)} \\implies \\text{Pivots in columns: } ${pivots.map((p) => p + 1).join(', ') || 'none'}`,
  });

  if (pivots.length === 0) {
    return {
      steps,
      answerTex: `\\operatorname{Col}(A) = \\left\\{ \\mathbf{0} \\right\\}, \\quad \\dim(\\operatorname{Col}(A)) = 0`,
    };
  }

  // Extract corresponding original columns
  const basisVectors = pivots.map((pCol) => {
    return M.map((row) => row[pCol]);
  });
  const basisTexStrings = basisVectors.map((v) => vecTex(v));

  steps.push({
    title: 'Extract pivot columns from original matrix A',
    desc: `Crucial theorem: A basis for the column space is formed by the original columns of A corresponding to the pivot positions.`,
    tex: `\\text{Basis for } \\operatorname{Col}(A) = \\left\\{ ${basisTexStrings.join(',\\; ')} \\right\\}`,
  });

  const spanTex = `\\operatorname{span}\\left( \\left\\{ ${basisTexStrings.join(',\\; ')} \\right\\} \\right)`;
  return {
    steps,
    answerTex: `\\operatorname{Col}(A) = ${spanTex}, \\quad \\dim(\\operatorname{Col}(A)) = ${pivots.length}`,
  };
}

// --------------------------------------------------------------------------
// 10. Row Space
// --------------------------------------------------------------------------
export function rowSpace(cells, decimal) {
  const M = parseMatrix(cells);
  const rows = M.length, cols = M[0].length;
  const steps = [{ title: 'Input matrix', desc: `Dimensions: ${rows}×${cols}`, tex: `A = ${matTex(M)}` }];

  const { A: R, pivots } = rrefWithSteps(M, steps);
  const nonZeroRows = R.filter((row) => row.some((val) => !isZero(val)));

  steps.push({
    title: 'Non-zero rows of RREF form a canonical basis',
    desc: `Elementary row operations preserve the row space. The non-zero rows of RREF(A) are linearly independent and span Row(A).`,
    tex: `\\operatorname{RREF}(A) = ${matTex(R)}`,
  });

  const rowVecTexStrings = nonZeroRows.map((r) => `\\begin{bmatrix} ${r.map((val) => texFrac(val)).join(' & ')} \\end{bmatrix}`);
  const spanTex = `\\operatorname{span}\\left( \\left\\{ ${rowVecTexStrings.join(',\\; ')} \\right\\} \\right)`;

  return {
    steps,
    answerTex: `\\operatorname{Row}(A) = ${spanTex}, \\quad \\dim(\\operatorname{Row}(A)) = ${nonZeroRows.length}`,
  };
}

// --------------------------------------------------------------------------
// 11. Matrix Power / Exponent (A^k)
// --------------------------------------------------------------------------
export function matrixPower(cells, decimal, exponentVal = 2) {
  const M = parseMatrix(cells);
  const n = M.length;
  if (n !== M[0].length) {
    return { error: `Matrix powers A^k are defined only for square matrices (currently ${n}×${M[0].length}).` };
  }

  const k = parseInt(exponentVal, 10);
  if (isNaN(k)) {
    return { error: `Exponent must be a valid integer (received: "${exponentVal}").` };
  }
  if (k < -4 || k > 8) {
    return { error: `Exponent k=${k} is out of supported range [-4, 8] for exact rational calculation.` };
  }

  const steps = [{ title: 'Input matrix and exponent', desc: `Compute A^${k} for the ${n}×${n} matrix A.`, tex: `A = ${matTex(M)}, \\quad k = ${k}` }];

  // k = 0
  if (k === 0) {
    const I = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => math.fraction(i === j ? 1 : 0))
    );
    steps.push({ title: 'Zero exponent definition', desc: 'Any non-zero square matrix raised to power 0 is the identity matrix I.', tex: `A^{0} = I_{${n}} = ${matTex(I)}` });
    return { steps, answerTex: `A^{0} = ${matTex(I)}` };
  }

  // k = 1
  if (k === 1) {
    steps.push({ title: 'First power', desc: 'A¹ = A.', tex: `A^{1} = ${matTex(M)}` });
    return { steps, answerTex: `A^{1} = ${matTex(M)}` };
  }

  // k = -1 or negative: need inverse first
  if (k < 0) {
    const invRes = inverse(cells, decimal);
    if (invRes.error || invRes.answerTex.includes('Singular')) {
      return { steps, error: `Matrix is singular (det=0); negative power A^${k} does not exist.` };
    }
    steps.push({ title: 'Step 1: Compute matrix inverse A⁻¹', desc: 'Negative powers require finding the inverse matrix first: A⁻ᵏ = (A⁻¹)ᵏ.', tex: invRes.answerTex });
    if (k === -1) {
      return invRes;
    }
    // Now compute positive power of inverse
    const invCells = parseMatrix(invRes.steps[invRes.steps.length - 1].tex.split('=')[1].trim());
    return matrixPower(invCells, decimal, Math.abs(k));
  }

  // k >= 2: multiplication loop
  let current = clone(M);
  for (let p = 2; p <= k; p++) {
    const next = Array.from({ length: n }, () => Array.from({ length: n }, () => math.fraction(0)));
    const sampleCalculations = [];

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        let sum = math.fraction(0);
        const terms = [];
        for (let r = 0; r < n; r++) {
          const prod = math.multiply(current[i][r], M[r][j]);
          sum = math.add(sum, prod);
          terms.push(`(${texFrac(current[i][r])})(${texFrac(M[r][j])})`);
        }
        next[i][j] = sum;
        if (i < 2 && j < 2) {
          sampleCalculations.push(`c_{${i + 1}${j + 1}} = ${terms.join(' + ')} = ${texFrac(sum)}`);
        }
      }
    }

    steps.push({
      title: `Compute A^${p} = A^${p - 1} · A`,
      desc: `Entry-by-entry dot product calculation: cᵢⱼ = Σ (A^${p - 1})ᵢᵣ · Aᵣⱼ.${sampleCalculations.length ? ' Sample entries:' : ''}`,
      tex: `${matTex(current)} \\cdot ${matTex(M)} = ${matTex(next)}` +
        (sampleCalculations.length ? `\\\\ \\text{Calculations: } ${sampleCalculations.join(', \\quad ')}` : ''),
    });

    current = next;
  }

  return { steps, answerTex: `A^{${k}} = ${matTex(current)}` };
}

// --------------------------------------------------------------------------
// 12. LU Decomposition
// --------------------------------------------------------------------------
export function luDecomp(cells, decimal) {
  const M = parseMatrix(cells);
  const n = M.length;
  if (n !== M[0].length) {
    return { error: `LU decomposition is defined only for square matrices (currently ${n}×${M[0].length}).` };
  }

  const steps = [{ title: 'Input matrix', desc: `Decompose square matrix A into L (unit lower triangular) and U (upper triangular).`, tex: `A = ${matTex(M)}` }];

  const L = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => math.fraction(i === j ? 1 : 0))
  );
  const U = clone(M);
  const P = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => math.fraction(i === j ? 1 : 0))
  );
  let hasPermutation = false;

  for (let col = 0; col < n - 1; col++) {
    // Check if pivot is zero
    if (isZero(U[col][col])) {
      let swapRow = -1;
      for (let r = col + 1; r < n; r++) {
        if (!isZero(U[r][col])) {
          swapRow = r;
          break;
        }
      }
      if (swapRow !== -1) {
        // Swap rows in U and P
        [U[col], U[swapRow]] = [U[swapRow], U[col]];
        [P[col], P[swapRow]] = [P[swapRow], P[col]];
        // Swap subdiagonal entries of L
        for (let c = 0; c < col; c++) {
          [L[col][c], L[swapRow][c]] = [L[swapRow][c], L[col][c]];
        }
        hasPermutation = true;
        steps.push({
          title: `Row permutation R_${col + 1} ↔ R_${swapRow + 1}`,
          desc: `Zero pivot encountered on diagonal at (${col + 1}, ${col + 1}); permuting rows.`,
          tex: `P = ${matTex(P)}, \\quad U = ${matTex(U)}`,
        });
      } else {
        continue; // Singular column, proceed
      }
    }

    const pivot = U[col][col];
    const elimSteps = [];

    for (let r = col + 1; r < n; r++) {
      if (isZero(U[r][col])) continue;
      const factor = math.divide(U[r][col], pivot);
      L[r][col] = factor;

      for (let c = col; c < n; c++) {
        U[r][c] = math.subtract(U[r][c], math.multiply(factor, U[col][c]));
      }
      elimSteps.push(`l_{${r + 1}${col + 1}} = \\frac{${texFrac(U[r][col])}}{${texFrac(pivot)}} = ${texFrac(factor)}, \\quad R_{${r + 1}} \\to R_{${r + 1}} - (${texFrac(factor)})R_{${col + 1}}`);
    }

    if (elimSteps.length > 0) {
      steps.push({
        title: `Eliminate below diagonal in Column ${col + 1}`,
        desc: `Multipliers recorded into lower triangular matrix L:`,
        tex: `${elimSteps.join('; \\quad ')} \\\\ \\implies L = ${matTex(L)}, \\quad U = ${matTex(U)}`,
      });
    }
  }

  // Verification step: L · U
  steps.push({
    title: 'Verification',
    desc: hasPermutation ? 'Check that P · A = L · U:' : 'Check that A = L · U:',
    tex: hasPermutation
      ? `P \\cdot A = ${matTex(P)} \\cdot ${matTex(M)} = L \\cdot U = ${matTex(L)} \\cdot ${matTex(U)}`
      : `L \\cdot U = ${matTex(L)} \\cdot ${matTex(U)} = ${matTex(M)}`,
  });

  const answerTex = hasPermutation
    ? `P \\cdot A = L \\cdot U \\\\ P = ${matTex(P)}, \\quad L = ${matTex(L)}, \\quad U = ${matTex(U)}`
    : `A = L \\cdot U \\\\ L = ${matTex(L)}, \\quad U = ${matTex(U)}`;

  return { steps, answerTex };
}

// --------------------------------------------------------------------------
// 13. Matrix Addition (A + B)
// --------------------------------------------------------------------------
export function matrixAddition(cellsA, cellsB, decimal) {
  const A = parseMatrix(cellsA);
  const B = parseMatrix(cellsB);
  const rA = A.length, cA = A[0].length;
  const rB = B.length, cB = B[0].length;

  if (rA !== rB || cA !== cB) {
    return {
      error: `Matrix addition requires identical dimensions. Matrix A is ${rA}×${cA}, but Matrix B is ${rB}×${cB}.`,
    };
  }

  const steps = [
    { title: 'Input matrices', desc: `Both matrices have dimension ${rA}×${cA}.`, tex: `A = ${matTex(A)}, \\quad B = ${matTex(B)}` },
  ];

  const intermediate = [];
  const result = [];

  for (let i = 0; i < rA; i++) {
    const interRow = [];
    const resRow = [];
    for (let j = 0; j < cA; j++) {
      const sum = math.add(A[i][j], B[i][j]);
      interRow.push(`${texFrac(A[i][j])} + (${texFrac(B[i][j])})`);
      resRow.push(sum);
    }
    intermediate.push(interRow);
    result.push(resRow);
  }

  const interRowsTex = intermediate.map((row) => row.join(' & ')).join(' \\\\ ');
  steps.push({
    title: 'Element-wise addition',
    desc: 'Each element in the sum equals (A + B)ᵢⱼ = aᵢⱼ + bᵢⱼ.',
    tex: `A + B = \\begin{bmatrix} ${interRowsTex} \\end{bmatrix} = ${matTex(result)}`,
  });

  return { steps, answerTex: `A + B = ${matTex(result)}` };
}

// --------------------------------------------------------------------------
// 14. Matrix Subtraction (A - B)
// --------------------------------------------------------------------------
export function matrixSubtraction(cellsA, cellsB, decimal) {
  const A = parseMatrix(cellsA);
  const B = parseMatrix(cellsB);
  const rA = A.length, cA = A[0].length;
  const rB = B.length, cB = B[0].length;

  if (rA !== rB || cA !== cB) {
    return {
      error: `Matrix subtraction requires identical dimensions. Matrix A is ${rA}×${cA}, but Matrix B is ${rB}×${cB}.`,
    };
  }

  const steps = [
    { title: 'Input matrices', desc: `Both matrices have dimension ${rA}×${cA}.`, tex: `A = ${matTex(A)}, \\quad B = ${matTex(B)}` },
  ];

  const intermediate = [];
  const result = [];

  for (let i = 0; i < rA; i++) {
    const interRow = [];
    const resRow = [];
    for (let j = 0; j < cA; j++) {
      const diff = math.subtract(A[i][j], B[i][j]);
      interRow.push(`${texFrac(A[i][j])} - (${texFrac(B[i][j])})`);
      resRow.push(diff);
    }
    intermediate.push(interRow);
    result.push(resRow);
  }

  const interRowsTex = intermediate.map((row) => row.join(' & ')).join(' \\\\ ');
  steps.push({
    title: 'Element-wise subtraction',
    desc: 'Each element in the difference equals (A - B)ᵢⱼ = aᵢⱼ - bᵢⱼ.',
    tex: `A - B = \\begin{bmatrix} ${interRowsTex} \\end{bmatrix} = ${matTex(result)}`,
  });

  return { steps, answerTex: `A - B = ${matTex(result)}` };
}

// --------------------------------------------------------------------------
// 15. Matrix Multiplication (A · B)
// --------------------------------------------------------------------------
export function matrixMultiplication(cellsA, cellsB, decimal) {
  const A = parseMatrix(cellsA);
  const B = parseMatrix(cellsB);
  const rA = A.length, cA = A[0].length;
  const rB = B.length, cB = B[0].length;

  if (cA !== rB) {
    return {
      error: `Multiplication A·B requires the number of columns in A (${cA}) to equal the number of rows in B (${rB}). Currently A is ${rA}×${cA} and B is ${rB}×${cB}.`,
    };
  }

  const steps = [
    {
      title: 'Input matrices and dimension check',
      desc: `Matrix A is ${rA}×${cA}, Matrix B is ${rB}×${cB}. The resulting product matrix C = A·B has dimensions ${rA}×${cB}.`,
      tex: `A = ${matTex(A)}, \\quad B = ${matTex(B)} \\implies \\dim(A \\cdot B) = ${rA} \\times ${cB}`,
    },
  ];

  const result = Array.from({ length: rA }, () => Array.from({ length: cB }, () => math.fraction(0)));
  const dotCalculations = [];

  for (let i = 0; i < rA; i++) {
    for (let j = 0; j < cB; j++) {
      let sum = math.fraction(0);
      const terms = [];
      for (let r = 0; r < cA; r++) {
        const prod = math.multiply(A[i][r], B[r][j]);
        sum = math.add(sum, prod);
        terms.push(`(${texFrac(A[i][r])})(${texFrac(B[r][j])})`);
      }
      result[i][j] = sum;
      dotCalculations.push(`c_{${i + 1}${j + 1}} = ${terms.join(' + ')} = ${texFrac(sum)}`);
    }
  }

  steps.push({
    title: 'Dot product of Row i from A with Column j from B',
    desc: `Each element cᵢⱼ = Σ_{r=1}^{${cA}} aᵢᵣ · bᵣⱼ:`,
    tex: dotCalculations.join(' \\\\ '),
  });

  steps.push({
    title: 'Assemble final product matrix',
    desc: `Resulting ${rA}×${cB} product matrix:`,
    tex: `A \\cdot B = ${matTex(result)}`,
  });

  return { steps, answerTex: `A \\cdot B = ${matTex(result)}` };
}

// --------------------------------------------------------------------------
// 16. Scalar Multiplication (c · A)
// --------------------------------------------------------------------------
export function scalarMultiplication(cellsA, scalarVal, decimal) {
  const A = parseMatrix(cellsA);
  const rows = A.length, cols = A[0].length;
  let c;
  try {
    c = math.fraction(String(scalarVal ?? '1').trim() || '1');
  } catch {
    return { error: `Invalid scalar value: "${scalarVal}". Must be a valid number or fraction.` };
  }

  const steps = [
    { title: 'Input scalar and matrix', desc: `Scale matrix A (${rows}×${cols}) by scalar c = ${texFrac(c)}.`, tex: `c = ${texFrac(c)}, \\quad A = ${matTex(A)}` },
  ];

  const result = A.map((row) => row.map((val) => math.multiply(c, val)));
  steps.push({
    title: 'Multiply each element by the scalar',
    desc: 'Each element (c·A)ᵢⱼ = c · aᵢⱼ:',
    tex: `c \\cdot A = (${texFrac(c)}) ${matTex(A)} = ${matTex(result)}`,
  });

  return { steps, answerTex: `c \\cdot A = ${matTex(result)}` };
}

// --------------------------------------------------------------------------
// 17. Eigenvalues & Eigenvectors
// --------------------------------------------------------------------------
export function eigenvalues(cells, decimal) {
  const M = parseMatrix(cells);
  const n = M.length;
  if (n !== M[0].length) return { error: `Eigenvalues are defined only for square matrices (currently ${n}×${M[0].length}).` };
  const steps = [{ title: 'Input matrix', desc: `Find eigenvalues λ such that det(A − λI) = 0.`, tex: `A = ${matTex(M)}` }];
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
    const ans = res.answers.map((a) => `${L} = ${a.tex}`).join(', \\quad ');
    return { steps, answerTex: ans || '\\text{No real eigenvalues found}' };
  }

  if (n === 3) {
    const tr = math.add(math.add(M[0][0], M[1][1]), M[2][2]);
    const m2 = math.add(
      math.add(det2(minor(M, 2, 2)), det2(minor(M, 1, 1))),
      det2(minor(M, 0, 0))
    );
    const d = detRec(M);
    steps.push({
      title: 'Characteristic polynomial expansion',
      desc: 'det(A − λI) = 0 expands to λ³ − tr(A)λ² + (sum of principal 2×2 minors)λ − det(A) = 0.',
      tex: `${L}^3 - (${texFrac(tr)})${L}^2 + (${texFrac(m2)})${L} - (${texFrac(d)}) = 0`,
    });
    const ints = integerizeFr([math.unaryMinus(d), m2, math.unaryMinus(tr), math.fraction(1)]);
    const res = solvePolynomial(ints, L, decimal);
    steps.push(...res.steps);
    const ans = res.answers.map((a) => `${L} = ${a.tex}`).join(', \\quad ');
    return { steps, answerTex: ans || '\\text{No real eigenvalues found}' };
  }

  // n >= 4: numerical calculation
  try {
    const numeric = M.map((row) => row.map((f) => math.number(f)));
    const { values } = math.eigs(numeric);
    const vals = (values.toArray ? values.toArray() : values).map((zz) =>
      typeof zz === 'number' ? trimNum(zz) : texComplex(zz, true)
    );
    steps.push({
      title: 'Numeric eigenvalue computation',
      desc: `For ${n}×${n} matrices, eigenvalues are computed numerically via the QR decomposition algorithm.`,
      tex: vals.map((vv, i) => `${L}_{${i + 1}} \\approx ${vv}`).join(', \\quad '),
    });
    return { steps, answerTex: vals.map((vv, i) => `${L}_{${i + 1}} \\approx ${vv}`).join(', \\quad ') };
  } catch (e) {
    return { error: `Could not compute eigenvalues numerically: ${e.message}` };
  }
}

// --------------------------------------------------------------------------
// Registry of all Matrix Operations
// --------------------------------------------------------------------------
export const MATRIX_OPS = {
  // Arithmetic & Binary Operations
  addition: {
    label: 'A + B',
    title: 'Matrix Addition',
    category: 'arithmetic',
    binary: true,
    square: false,
    desc: 'Add two matrices element by element (dimensions must match)',
  },
  subtraction: {
    label: 'A − B',
    title: 'Matrix Subtraction',
    category: 'arithmetic',
    binary: true,
    square: false,
    desc: 'Subtract matrix B from matrix A element by element',
  },
  multiplication: {
    label: 'A × B',
    title: 'Matrix Multiplication',
    category: 'arithmetic',
    binary: true,
    square: false,
    desc: 'Dot product row-by-column multiplication (cols of A = rows of B)',
  },
  power: {
    label: 'Aᵏ (Power)',
    title: 'Matrix Power',
    category: 'arithmetic',
    power: true,
    square: true,
    desc: 'Raise square matrix A to integer power k (e.g. A², A³, A⁴, A⁻¹)',
  },
  scalar_mult: {
    label: 'c · A',
    title: 'Scalar Multiplication',
    category: 'arithmetic',
    scalar: true,
    square: false,
    desc: 'Multiply matrix A by a scalar constant c',
  },

  // Basic Matrix Properties & Transformations
  determinant: {
    label: 'det(A)',
    title: 'Determinant',
    category: 'analysis',
    square: true,
    desc: 'Compute determinant via cofactor expansion or triangular reduction',
  },
  inverse: {
    label: 'A⁻¹ (Inverse)',
    title: 'Matrix Inverse',
    category: 'analysis',
    square: true,
    desc: 'Compute inverse via Gauss-Jordan elimination on [A | I]',
  },
  transpose: {
    label: 'Aᵀ (Transpose)',
    title: 'Matrix Transpose',
    category: 'analysis',
    square: false,
    desc: 'Swap rows and columns so (i, j) becomes (j, i)',
  },
  trace: {
    label: 'tr(A) (Trace)',
    title: 'Matrix Trace',
    category: 'analysis',
    square: true,
    desc: 'Sum of the entries on the main diagonal',
  },
  norm: {
    label: '||A|| (Norms)',
    title: 'Matrix Norms',
    category: 'analysis',
    square: false,
    desc: 'Compute Frobenius, 1-Norm (column sum), and ∞-Norm (row sum)',
  },

  // Linear Subspaces & Reductions
  rref: {
    label: 'RREF',
    title: 'Reduced Row Echelon Form',
    category: 'spaces',
    square: false,
    desc: 'Step-by-step Gauss-Jordan reduction to RREF with row operations',
  },
  rank: {
    label: 'Rank',
    title: 'Matrix Rank',
    category: 'spaces',
    square: false,
    desc: 'Number of linearly independent rows / pivot columns',
  },
  null_space: {
    label: 'Null Space',
    title: 'Null Space (Kernel)',
    category: 'spaces',
    square: false,
    desc: 'Find all solutions to A·x = 0, basis vectors and nullity',
  },
  column_space: {
    label: 'Col Space',
    title: 'Column Space (Image)',
    category: 'spaces',
    square: false,
    desc: 'Basis for the column space using original pivot columns of A',
  },
  row_space: {
    label: 'Row Space',
    title: 'Row Space',
    category: 'spaces',
    square: false,
    desc: 'Basis for the row space from non-zero rows of RREF(A)',
  },

  // Decompositions
  lu_decomp: {
    label: 'LU Decomp',
    title: 'LU Decomposition',
    category: 'decomp',
    square: true,
    desc: 'Factor A into L (unit lower triangular) and U (upper triangular)',
  },
  eigenvalues: {
    label: 'Eigenvalues',
    title: 'Eigenvalues & Vectors',
    category: 'decomp',
    square: true,
    desc: 'Compute characteristic polynomial and eigenvalues λ',
  },
};
